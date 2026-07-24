#!/bin/sh
set -eu
# Quoted heredoc + psql variable interpolation: the password value is passed
# as a safely-escaped literal (:'pw'), never spliced into the SQL text.
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -v pw="$UMAMI_DB_PASSWORD" <<'SQL'
CREATE USER umami WITH PASSWORD :'pw';
CREATE DATABASE umami OWNER umami;
SQL
