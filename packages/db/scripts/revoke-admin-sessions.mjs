/* global process, console */
/**
 * Revoke admin sessions — the operator end of SPC-TM-002.
 *
 *   node --env-file=.env.local scripts/revoke-admin-sessions.mjs --email a@b.com
 *   node --env-file=.env.local scripts/revoke-admin-sessions.mjs --all
 *   node --env-file=.env.local scripts/revoke-admin-sessions.mjs --email a@b.com --dry-run
 *
 * The allow-list is only worth having if revoking is something a person can
 * actually do at 3am. Deleting a row logs that session out on its very next
 * request; there is no cache and no propagation delay.
 *
 * WHEN TO USE `--all`: a stolen laptop, a suspected token leak, or an operator
 * departure. It does NOT rotate credentials — the password and TOTP secret are
 * untouched, so the same person can log straight back in. That is the point:
 * it is a "sign everyone out" lever, not an account lock.
 *
 * Raw `pg`, not Prisma, matching purge-retention.mjs. It keeps the script
 * runnable anywhere a connection string exists — including a throwaway node
 * container against production, which is how scripts reach that database (see
 * docs/runbooks/deploy-production.md).
 *
 * The equivalent when even this is unavailable, straight from psql:
 *
 *   DELETE FROM "AdminSession" WHERE "userId" =
 *     (SELECT id FROM "AdminUser" WHERE email = 'a@b.com');
 */
import pg from "pg";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ALL = args.includes("--all");
const emailIdx = args.indexOf("--email");
const email = emailIdx !== -1 ? args[emailIdx + 1] : undefined;

if (!ALL && !email) {
  console.error(
    "Specify --email <address> or --all.\n" +
      "Refusing to guess: --all signs every operator out, which is not a default.",
  );
  process.exit(2);
}
if (ALL && email) {
  console.error("--all and --email are mutually exclusive.");
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  let where = "";
  let params = [];
  let scope = "";

  if (ALL) {
    where = "";
    scope = "every operator";
  } else {
    // Resolved separately so an unknown address is reported as such rather than
    // silently deleting nothing and looking like a success.
    const { rows } = await client.query('SELECT id, email FROM "AdminUser" WHERE email = $1', [
      email,
    ]);
    if (rows.length === 0) {
      console.error(`No admin user with email ${email}. Nothing revoked.`);
      process.exit(1);
    }
    where = ' WHERE "userId" = $1';
    params = [rows[0].id];
    scope = rows[0].email;
  }

  const { rows: counted } = await client.query(
    `SELECT count(*)::int AS n FROM "AdminSession"${where}`,
    params,
  );
  const due = counted[0].n;

  if (DRY_RUN) {
    console.log(`[dry-run] would revoke ${due} session(s) for ${scope}.`);
  } else if (due === 0) {
    console.log(`No live sessions for ${scope}.`);
  } else {
    const res = await client.query(`DELETE FROM "AdminSession"${where}`, params);
    console.log(`Revoked ${res.rowCount} session(s) for ${scope}.`);
    console.log("They take effect on the next request — there is no cache to wait for.");
  }
} finally {
  await client.end();
}
