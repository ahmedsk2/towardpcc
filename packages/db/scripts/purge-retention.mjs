/* global process, console */
/**
 * Retention purge (PRD §8.4 / ADR-data-model): submissions are kept 24 months,
 * audit logs 12 months, then deleted. Parameterized deleteMany only — no raw
 * SQL. Pass --dry-run to report counts without deleting.
 *
 *   node --env-file=.env.local scripts/purge-retention.mjs [--dry-run]
 *
 * WHICH DATABASE ROLE THIS NEEDS, AND WHY IT IS NOT THE APPLICATION'S.
 *
 * The two tables need different privileges, and that is deliberate rather than
 * an oversight:
 *
 *   Submission  the app role has full DML — it already deletes on request.
 *   AuditLog    the app role has ONLY INSERT and SELECT. Verified in production
 *               2026-07-28. That is SPC-DB-003: the audit trail is append-only
 *               at the database level, so a compromised application cannot
 *               erase its own tracks.
 *
 * So running this as `towardpcc_app` purges submissions and then fails on the
 * audit log with "permission denied". That is correct behaviour, not a bug to
 * work around — do NOT grant the app DELETE on AuditLog to make this script
 * pass. Retention deletion is a maintenance action by a more privileged
 * identity, which is exactly the distinction append-only is drawing.
 *
 * Point DATABASE_URL at `towardpcc_owner` (or another role holding DELETE on
 * AuditLog) when scheduling this.
 *
 * The tables are handled independently and sequentially. The previous version
 * ran both in Promise.all, so the expected permission error on the audit log
 * would reject the whole script — after the submission delete had already
 * committed, concurrently. That reports total failure for a run that did half
 * its work, and tells you nothing about which half.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");
const SUBMISSION_MONTHS = 24;
const AUDIT_MONTHS = 12;

function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const submissionCutoff = monthsAgo(SUBMISSION_MONTHS);
const auditCutoff = monthsAgo(AUDIT_MONTHS);

let failed = false;

/** Reports per table rather than aborting, so one failure does not hide the
 *  other's result — and so a permission error names the table it applies to. */
async function purge(label, cutoff, count, remove) {
  const due = await count();
  if (DRY_RUN) {
    console.log(`[dry-run] ${label} older than ${cutoff.toISOString()}: ${due}`);
    return;
  }
  if (due === 0) {
    console.log(`${label}: nothing due.`);
    return;
  }
  try {
    const { count: n } = await remove();
    console.log(`${label}: purged ${n} older than ${cutoff.toISOString()}.`);
  } catch (error) {
    failed = true;
    console.error(`${label}: FAILED to purge ${due} due rows — ${String(error)}`);
    if (String(error).includes("permission denied")) {
      console.error(
        `${label}: this role lacks DELETE. AuditLog is append-only for the application by design (SPC-DB-003) — run this job as towardpcc_owner rather than granting the app DELETE.`,
      );
    }
  }
}

await purge(
  "submissions",
  submissionCutoff,
  () => db.submission.count({ where: { createdAt: { lt: submissionCutoff } } }),
  () => db.submission.deleteMany({ where: { createdAt: { lt: submissionCutoff } } }),
);

await purge(
  "audit logs",
  auditCutoff,
  () => db.auditLog.count({ where: { ts: { lt: auditCutoff } } }),
  () => db.auditLog.deleteMany({ where: { ts: { lt: auditCutoff } } }),
);

await db.$disconnect();

// Non-zero exit so a scheduler surfaces the failure. Retention is a published
// commitment on /legal/data-protection ("24 months, then deleted"), so a purge
// that silently stops running turns that sentence into a false claim.
if (failed) process.exit(1);
