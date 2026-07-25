-- Run ONCE, right after `prisma migrate deploy`, as the owner ($POSTGRES_USER).
-- Enforces AuditLog append-only at the database (SPC-DB-003): the runtime role
-- may INSERT and SELECT audit rows but never UPDATE or DELETE them, so a hijacked
-- app session or SQL foothold cannot rewrite or erase forensic history.
--
-- The application only ever inserts audit rows, so this does not affect runtime.
-- The retention purge (packages/db/scripts/purge-retention.mjs) DELETEs old
-- AuditLog rows and must therefore run under the OWNER role (a separate
-- DATABASE_URL), never the app role — see docs/runbooks/deploy.md.
--
-- Deploy step:
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
--     < docker/sql/10-audit-append-only.sql

REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM towardpcc_app;
