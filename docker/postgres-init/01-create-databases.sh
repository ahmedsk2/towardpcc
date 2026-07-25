#!/bin/sh
set -eu
# Runs once, on first cluster init, as the superuser ($POSTGRES_USER), against
# the main app DB. Quoted heredoc + psql :'var' interpolation passes each secret
# as a safely-escaped literal, never spliced into SQL text.
#
# Creates:
#   1. the Umami analytics role + its own database (separate from the app DB);
#   2. `towardpcc_app` — the least-privilege runtime role (SPC-DB-001). It logs
#      in and does CRUD ONLY; DDL stays with the owner ($POSTGRES_USER), used
#      solely by the migrate profile. ALTER DEFAULT PRIVILEGES grants CRUD on the
#      tables the owner creates LATER (via `prisma migrate deploy`) plus sequence
#      usage — so no table-by-table grant is needed. AuditLog is then narrowed to
#      append-only after migration (docs/sql/10-audit-append-only.sql).
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v umami_pw="$UMAMI_DB_PASSWORD" -v app_pw="$POSTGRES_APP_PASSWORD" -v db="$POSTGRES_DB" <<'SQL'
-- Umami analytics: its own role + database.
CREATE USER umami WITH PASSWORD :'umami_pw';
CREATE DATABASE umami OWNER umami;

-- Least-privilege application role for the main DB.
CREATE ROLE towardpcc_app WITH LOGIN PASSWORD :'app_pw';
GRANT CONNECT ON DATABASE :"db" TO towardpcc_app;
GRANT USAGE ON SCHEMA public TO towardpcc_app;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO towardpcc_app;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO towardpcc_app;
SQL
