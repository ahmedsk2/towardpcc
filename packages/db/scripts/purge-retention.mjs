/* global process, console */
/**
 * Retention purge (PRD §8.4 / ADR-data-model): submissions are kept 24 months,
 * audit logs 12 months, then deleted. Pass --dry-run to report counts without
 * deleting, and --skip-audit to purge submissions only.
 *
 *   node --env-file=.env.local scripts/purge-retention.mjs [--dry-run] [--skip-audit]
 *
 * WHY THIS USES `pg` DIRECTLY AND NOT PRISMA.
 *
 * It has to run in production, and the production image cannot load Prisma.
 * Next bundles `@prisma/client`, `@prisma/adapter-pg` and `pg` into
 * `.next/server/chunks/*.js`; the single `@prisma/client` entry surviving on
 * disk holds one WASM file and zero JavaScript, and `/app/node_modules` contains
 * nothing but `.pnpm` with no top-level symlinks. Verified in the running
 * container on 2026-08-07 — a Prisma import there dies immediately.
 *
 * Shipping a self-contained Prisma runtime beside the app was the alternative:
 * 23 packages, ~88 MB on every image, and a second dependency manifest that
 * silently drifts from `pnpm-lock.yaml` the moment one moves without the other.
 * That is a lot of machinery for four statements. This job does two counts and
 * two deletes, each filtering one indexed date column, so `pg` — already a
 * direct dependency of this package — expresses it exactly.
 *
 * The previous header said "Parameterized deleteMany only — no raw SQL". The
 * safety property it was reaching for is preserved: every value below is bound
 * as `$1`, never interpolated, so this is parameterised SQL rather than
 * constructed SQL.
 *
 * What IS genuinely lost is Prisma's compile-time knowledge of the identifiers:
 * a renamed column now fails at runtime instead of at build. `packages/db`
 * defines no test script, so nothing in the gate covers this file — the honest
 * mitigation is that both statements were run against the live schema on
 * 2026-08-07 and both resolved, and that `--dry-run` executes exactly the same
 * SELECTs, so a schema drift surfaces on a harmless run rather than a deleting
 * one. Run it with `--dry-run` after any migration touching these tables.
 *
 * WHICH DATABASE ROLE THIS NEEDS, AND WHY IT IS NOT THE APPLICATION'S.
 *
 * The two tables need different privileges, and that is deliberate rather than
 * an oversight:
 *
 *   Submission  the app role has full DML — it already deletes on request.
 *   AuditLog    the app role has ONLY INSERT and SELECT. Verified in production
 *               2026-07-28 and again 2026-08-07. That is SPC-DB-003: the audit
 *               trail is append-only at the database level, so a compromised
 *               application cannot erase its own tracks.
 *
 * So running this as `towardpcc_app` purges submissions and then fails on the
 * audit log with "permission denied". That is correct behaviour, not a bug to
 * work around — do NOT grant the app DELETE on AuditLog to make this script
 * pass. Retention deletion is a maintenance action by a more privileged
 * identity, which is exactly the distinction append-only is drawing.
 *
 * `--skip-audit` exists for that split. The scheduled job runs inside the app
 * container, on the app credential, and would otherwise fail the audit half
 * every night — a permanently red task nobody reads. So the scheduled run does
 * submissions only, which is the half the public promise actually covers
 * (/legal/data-protection says "24 months, then deleted"; for audit logs it says
 * "12 months" and does not promise deletion). Purging audit logs stays a
 * privileged action run deliberately with `DATABASE_URL` pointed at
 * `towardpcc_owner`.
 *
 * The tables are handled independently and sequentially. An earlier version ran
 * both in Promise.all, so the expected permission error on the audit log would
 * reject the whole script — after the submission delete had already committed,
 * concurrently. That reports total failure for a run that did half its work, and
 * tells you nothing about which half.
 */
import pg from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_AUDIT = process.argv.includes("--skip-audit");
const SUBMISSION_MONTHS = 24;
const AUDIT_MONTHS = 12;

function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

/**
 * Table and column are baked into each statement rather than passed in.
 *
 * Identifiers cannot be parameterised in SQL — only values can — so accepting
 * them as arguments would mean building the statement by concatenation, which
 * is the thing parameterisation exists to avoid. Two literal statements are
 * duller and cannot be called with anything unexpected.
 */
const TARGETS = [
  {
    label: "submissions",
    months: SUBMISSION_MONTHS,
    count: 'SELECT count(*)::int AS n FROM "Submission" WHERE "createdAt" < $1',
    remove: 'DELETE FROM "Submission" WHERE "createdAt" < $1',
  },
  {
    label: "audit logs",
    months: AUDIT_MONTHS,
    privileged: true,
    count: 'SELECT count(*)::int AS n FROM "AuditLog" WHERE "ts" < $1',
    remove: 'DELETE FROM "AuditLog" WHERE "ts" < $1',
  },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let failed = false;

/** Reports per table rather than aborting, so one failure does not hide the
 *  other's result — and so a permission error names the table it applies to. */
async function purge({ label, months, count, remove }) {
  const cutoff = monthsAgo(months);
  const { rows } = await client.query(count, [cutoff]);
  const due = rows[0].n;

  if (DRY_RUN) {
    console.log(`[dry-run] ${label} older than ${cutoff.toISOString()}: ${due}`);
    return;
  }
  if (due === 0) {
    console.log(`${label}: nothing due.`);
    return;
  }
  try {
    const res = await client.query(remove, [cutoff]);
    console.log(`${label}: purged ${res.rowCount} older than ${cutoff.toISOString()}.`);
  } catch (error) {
    failed = true;
    console.error(`${label}: FAILED to purge ${due} due rows — ${String(error)}`);
    if (String(error).includes("permission denied")) {
      console.error(
        `${label}: this role lacks DELETE. AuditLog is append-only for the application by design (SPC-DB-003) — run this job as towardpcc_owner rather than granting the app DELETE, or pass --skip-audit if this is the scheduled app-role run.`,
      );
    }
  }
}

for (const target of TARGETS) {
  if (target.privileged && SKIP_AUDIT) {
    console.log(`${target.label}: skipped (--skip-audit).`);
    continue;
  }
  await purge(target);
}

await client.end();

// Non-zero exit so a scheduler surfaces the failure. Retention is a published
// commitment on /legal/data-protection ("24 months, then deleted"), so a purge
// that silently stops running turns that sentence into a false claim.
if (failed) process.exit(1);
