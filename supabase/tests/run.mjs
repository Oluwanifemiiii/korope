#!/usr/bin/env node
// Runs the pgTAP-style SQL tests against a throwaway database on a local Postgres
// that has PostGIS. CI uses the real Supabase stack with `supabase test db` instead.
//
//   TEST_DATABASE_URL=postgres://localhost:54329/postgres npm run test:sql
//
// The URL names the server; the runner creates and drops `korope_test` on it.

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const base = process.env.TEST_DATABASE_URL ?? "postgres://localhost:54329/postgres";
const testDb = new URL(base);
testDb.pathname = "/korope_test";

const psql = (url, args) =>
  execFileSync("psql", [url, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-At", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const run = (label, fn) => {
  try {
    return fn();
  } catch (e) {
    console.error(`\n${label} failed:\n${e.stderr || e.message}`);
    process.exit(1);
  }
};

run("reset database", () => {
  psql(base, ["-c", "drop database if exists korope_test with (force)"]);
  psql(base, ["-c", "create database korope_test"]);
});

const url = testDb.toString();
run("supabase shim", () => psql(url, ["-f", join(here, "local/supabase-shim.sql")]));
run("pgtap shim", () => psql(url, ["-f", join(here, "local/pgtap-shim.sql")]));

const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const m of migrations) run(`migration ${m}`, () => psql(url, ["-f", join(root, "migrations", m)]));

const files = readdirSync(join(here, "database")).filter((f) => f.endsWith(".test.sql")).sort();
let failed = 0;
let passed = 0;
for (const f of files) {
  let out;
  try {
    out = psql(url, ["-f", join(here, "database", f)]);
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
    for (const l of lines) if (l.startsWith("not ok") || l.startsWith("#")) console.log(`  ${l}`);
  } else {
    console.log(`✓ ${f} (${ok})`);
  }
}

if (!process.env.KEEP_TEST_DB) psql(base, ["-c", "drop database if exists korope_test with (force)"]);
console.log(`\n${passed} assertions passed, ${failed} file(s) failed`);
process.exit(failed ? 1 : 0);
