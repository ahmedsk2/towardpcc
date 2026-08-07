-- Let the audit trail record an authentication event that has NO known account,
-- so a failed login can be written whether or not the address exists.
--
-- WHY THIS IS NOT A WEAKENING. `authorize()` already runs Argon2id against a
-- dummy hash when no user matches, specifically so a wrong address and a wrong
-- password cost the same. Auditing only the attempts against REAL accounts would
-- have handed that signal straight back: one extra INSERT on exactly one of the
-- two paths is a user-enumeration oracle. A nullable actor lets the write happen
-- unconditionally, so the paths stay indistinguishable.
--
-- Hand-written rather than generated, per the 20260728170000_app_settings
-- precedent: this machine has no shadow database. The statements below are the
-- verbatim output of `prisma migrate diff` against the working schema, plus the
-- CHECK and the REVOKE, which Prisma cannot express.

-- Catalog-only: no table rewrite, no backfill, existing rows keep their actorId.
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- Reviewing an attack means "show me every failed login, newest first".
--
-- Plain CREATE INDEX, deliberately. CONCURRENTLY cannot run inside a
-- transaction block and `prisma migrate deploy` wraps each migration file in
-- one, so the concurrent form fails outright rather than degrading. The SHARE
-- lock is irrelevant here: this table is days old and single-operator.
CREATE INDEX "AuditLog_action_ts_idx" ON "AuditLog"("action", "ts");

-- The converse of the comment above, enforced as a database rule rather than a
-- convention: a null actor is only ever allowed on an authentication event.
-- Without it, nothing stops a future code path writing an unattributed MUTATION,
-- which is exactly the property the append-only trail exists to provide.
--
-- No NOT VALID needed — the column was NOT NULL until the statement above, so
-- zero existing rows can violate this and validation is guaranteed to pass.
--
-- The action list is closed. Adding an auth action that writes a null actor
-- WITHOUT adding it here makes that INSERT throw, which is why the failure-path
-- audit call is wrapped in try/catch: a constraint violation must never turn
-- into a failed login.
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_null_actor_is_auth_event"
  CHECK (
    "actorId" IS NOT NULL
    OR "action" IN ('admin.login.failed', 'admin.login.locked', 'admin.login.replay')
  );

-- Least privilege, while we are in here. Nothing in the application deletes an
-- admin user: the only `adminUser.delete` in the repo is in the e2e seeder,
-- which refuses to run against anything but a throwaway database and connects as
-- the superuser there. Production's ALTER DEFAULT PRIVILEGES granted the app
-- role full CRUD on every table and only "AuditLog" was ever narrowed, so this
-- privilege exists purely by inheritance.
--
-- Guarded on the role existing, so the migration still applies on a developer
-- machine and in CI, where it does not.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'towardpcc_app') THEN
    REVOKE DELETE ON TABLE "AdminUser" FROM towardpcc_app;
  END IF;
END
$$;
