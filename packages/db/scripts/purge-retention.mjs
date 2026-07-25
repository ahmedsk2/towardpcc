/* global process, console */
/**
 * Retention purge (PRD §8.4 / ADR-data-model): submissions are kept 24 months,
 * audit logs 12 months, then deleted. Parameterized deleteMany only — no raw
 * SQL. Run on a schedule (P8 ops); pass --dry-run to report counts without
 * deleting. Requires DATABASE_URL (via --env-file).
 *
 *   node --env-file=.env.local scripts/purge-retention.mjs [--dry-run]
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

const [submissionsDue, auditDue] = await Promise.all([
  db.submission.count({ where: { createdAt: { lt: submissionCutoff } } }),
  db.auditLog.count({ where: { ts: { lt: auditCutoff } } }),
]);

if (DRY_RUN) {
  console.log(
    `[dry-run] submissions older than ${submissionCutoff.toISOString()}: ${submissionsDue}`,
  );
  console.log(`[dry-run] audit logs older than ${auditCutoff.toISOString()}: ${auditDue}`);
} else {
  const [s, a] = await Promise.all([
    db.submission.deleteMany({ where: { createdAt: { lt: submissionCutoff } } }),
    db.auditLog.deleteMany({ where: { ts: { lt: auditCutoff } } }),
  ]);
  console.log(
    `Purged ${s.count} submissions (>${SUBMISSION_MONTHS}mo) and ${a.count} audit logs (>${AUDIT_MONTHS}mo).`,
  );
}

await db.$disconnect();
