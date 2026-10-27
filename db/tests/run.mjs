#!/usr/bin/env node
// Runs the pgTAP SQL tests in a throwaway `korope_test` database on the given server:
// creates it, applies every migration, runs db/tests/database/*.test.sql, drops it.
// Works on local Postgres (with PostGIS) and on a Neon branch.
//
//   TEST_DATABASE_URL=postgres://localhost:54329/postgres npm run test:sql
//   TEST_DATABASE_URL=<Neon ci branch, unpooled> npm run test:sql
//
// Uses pgTAP when the server has it (Neon does), else a small local shim.

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { migrate } from "../migrate.mjs";

const here = import.meta.dirname;
const base = process.env.TEST_DATABASE_URL ?? "postgres://localhost:54329/postgres";
const testUrl = new URL(base);
testUrl.pathname = "/korope_test";
const url = testUrl.toString();

async function admin(sql) {
  const c = new pg.Client({ connectionString: base });
  await c.connect();
  try {
    return await c.query(sql);
  } finally {
    await c.end();
  }
}

const psql = (args) =>
  execFileSync("psql", [url, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-At", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

await admin("drop database if exists korope_test with (force)");
await admin("create database korope_test");

try {
  await migrate(url, { log: () => {} });

  const hasPgtap = (
    await (async () => {
      const c = new pg.Client({ connectionString: url });
      await c.connect();
      try {
        return (await c.query("select 1 from pg_available_extensions where name = 'pgtap'")).rowCount > 0;
      } finally {
        await c.end();
      }
    })()
  );
  if (hasPgtap) psql(["-c", "create extension if not exists pgtap"]);
  else psql(["-f", join(here, "local/pgtap-shim.sql")]);

  const files = readdirSync(join(here, "database")).filter((f) => f.endsWith(".test.sql")).sort();
  let failed = 0;
  let passed = 0;
  for (const f of files) {
    let out;
    try {
      out = psql(["-f", join(here, "database", f)]);
    } catch (e) {
      failed++;
      console.log(`✗ ${f}\n${e.stdout ?? ""}${e.stderr ?? e.message}`);
      continue;
    }
    const lines = out.split("\n").filter(Boolean);
    const bad = lines.filter((l) => l.startsWith("not ok") || l.startsWith("#"));
    const ok = lines.filter((l) => l.startsWith("ok ")).length;
    passed += ok;
    if (bad.length) {
      failed++;
      console.log(`✗ ${f}`);
      for (const l of bad) console.log(`  ${l}`);
    } else {
      console.log(`✓ ${f} (${ok})`);
    }
  }
  console.log(`\n${passed} assertions passed, ${failed} file(s) failed (${hasPgtap ? "pgTAP" : "local shim"})`);
  process.exitCode = failed ? 1 : 0;
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  if (!process.env.KEEP_TEST_DB) await admin("drop database if exists korope_test with (force)");
}
