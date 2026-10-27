#!/usr/bin/env node
// Applies db/migrations/*.sql in order, each in its own transaction, recording them in
// public.schema_migrations. Uses the unpooled (direct) Neon URL because migrations
// need session features the pooler doesn't offer.
//
//   DATABASE_URL_UNPOOLED=postgres://... node db/migrate.mjs
//   node db/migrate.mjs --url postgres://... [--dry-run]

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

export const MIGRATIONS_DIR = join(import.meta.dirname, "migrations");

export async function migrate(url, { log = console.log, dryRun = false } = {}) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);
    const { rows } = await client.query("select name from public.schema_migrations");
    const done = new Set(rows.map((r) => r.name));
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    const pending = files.filter((f) => !done.has(f));
    if (!pending.length) log("migrations: up to date");
    for (const f of pending) {
      if (dryRun) {
        log(`migrations: would apply ${f}`);
        continue;
      }
      const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public.schema_migrations (name) values ($1)", [f]);
        await client.query("commit");
        log(`migrations: applied ${f}`);
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${f}: ${e.message}`);
      }
    }
    return pending;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--url");
  const url = i >= 0 ? args[i + 1] : process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    console.error("Set DATABASE_URL_UNPOOLED or pass --url");
    process.exit(1);
  }
  migrate(url, { dryRun: args.includes("--dry-run") }).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
