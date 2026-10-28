#!/usr/bin/env node
// Applies db/seed/*.sql in order, each in a transaction. Seeds are idempotent.
//   npm run db:seed            (uses DATABASE_URL_UNPOOLED)
//   node db/seed.mjs --url postgres://...

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

export const SEED_DIR = join(import.meta.dirname, "seed");

export async function seed(url, { log = console.log } = {}) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const f of readdirSync(SEED_DIR).filter((x) => x.endsWith(".sql")).sort()) {
      await client.query("begin");
      try {
        await client.query(readFileSync(join(SEED_DIR, f), "utf8"));
        await client.query("commit");
        log(`seed: applied ${f}`);
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${f}: ${e.message}`);
      }
    }
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
  seed(url).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
