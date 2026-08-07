/* global process, console, Buffer */
/**
 * Prepare the throwaway database for the login spec, when there is one.
 *
 * OPTIONAL ON PURPOSE, AND LOUD ABOUT IT. The rest of the suite needs no
 * database — the calculators are client-side, which is the whole point of this
 * project — so requiring Postgres would make `pnpm test:e2e` fail on a fresh
 * clone for a reason unrelated to what someone was changing. Instead: if
 * `E2E_DATABASE_URL` is set, the schema is pushed and the admin seeded; if it is
 * not, this prints why the login spec will skip.
 *
 * A silently-skipped test is the failure mode this project spent 2026-08-07
 * fixing in the integrity canary, so the skip is announced here AND asserted in
 * CI: `.github/workflows/ci.yml` provides a Postgres service, so a skip there
 * means something is broken rather than absent.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dbPackage = join(here, "..", "..", "..", "packages", "db");

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) {
    console.log(
      "[e2e] E2E_DATABASE_URL is not set — the admin-login spec will SKIP.\n" +
        "[e2e] To run it locally, start a throwaway Postgres and set e.g.\n" +
        "[e2e]   E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/towardpcc_e2e",
    );
    return;
  }

  // `db push` rather than `migrate deploy`: this database is discarded after the
  // run, so migration history is irrelevant and pushing is markedly faster.
  /*
   * A single command string, not an args array: passing an array alongside a
   * shell trips Node's DEP0190, and on Windows `pnpm` is a .cmd that cannot be
   * spawned without one. Every value here is a literal.
   *
   * NO FLAGS, deliberately, and both omissions were learned the hard way:
   *
   * - `--skip-generate` does not exist in Prisma 7. It reports "Specify a
   *   schema", which sends you hunting for a schema path that was never the
   *   problem.
   * - `--schema` is unnecessary — `prisma.config.ts` supplies it.
   * - `--accept-data-loss` is NOT used. Prisma 7 gates it behind an explicit
   *   human-consent environment variable, and on a database created moments ago
   *   there is nothing to lose, so the plain form succeeds. If this ever starts
   *   demanding the flag, the database was not disposable and that is the bug.
   */
  execSync("pnpm exec prisma db push", {
    cwd: dbPackage,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  // Run as a child process, not an import: the seeder needs Prisma and
  // hash-wasm, which resolve in packages/db and NOT from apps/web under pnpm's
  // strict node_modules layout.
  execSync("node scripts/seed-e2e-admin.mjs", {
    cwd: dbPackage,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      TOTP_ENC_KEY: process.env.TOTP_ENC_KEY ?? Buffer.alloc(32, 7).toString("base64"),
    },
    stdio: "inherit",
  });
}
