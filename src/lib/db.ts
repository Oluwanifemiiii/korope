import "server-only";
import pg from "pg";
import { serverEnv } from "@/lib/env";

/**
 * Postgres access. One pool per server instance over Neon's pooled (PgBouncer,
 * transaction mode) endpoint, so every helper here runs inside a transaction.
 *
 * - `asUser(userId, fn)`: the normal path. Switches to the `authenticated` role with the
 *   user id in request.jwt.claims, so RLS and auth.uid() apply exactly as in the SQL tests.
 * - `asAnon(fn)`: public reads under RLS as `anon`.
 * - `asService(fn)`: owner connection, bypasses RLS. Only for webhooks, ingestion,
 *   auth internals and service checks. Never reachable from client input without validation.
 */
const globalForPool = globalThis as unknown as { koropePool?: pg.Pool };

export function pool(): pg.Pool {
  globalForPool.koropePool ??= new pg.Pool({
    connectionString: serverEnv().DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  return globalForPool.koropePool;
}

type Tx = pg.PoolClient;

async function inTx<T>(setup: (c: Tx) => Promise<void>, fn: (c: Tx) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await setup(client);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export function asUser<T>(userId: string, fn: (c: Tx) => Promise<T>): Promise<T> {
  return inTx(async (c) => {
    await c.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await c.query("set local role authenticated");
  }, fn);
}

export function asAnon<T>(fn: (c: Tx) => Promise<T>): Promise<T> {
  return inTx(async (c) => {
    await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    await c.query("set local role anon");
  }, fn);
}

export function asService<T>(fn: (c: Tx) => Promise<T>): Promise<T> {
  return inTx(async () => {}, fn);
}

/** Fixed-window rate limit backed by Postgres (D-013). Returns true when allowed. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  return asService(async (c) => {
    const { rows } = await c.query<{ ok: boolean }>(
      "select private.rate_limit($1, $2, make_interval(secs => $3)) as ok",
      [key, max, windowSeconds],
    );
    return rows[0].ok;
  });
}
