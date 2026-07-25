# Runbook: database backup & restore

Scope: the Postgres database (the only stateful store — submissions, admin
users, calculator meta, audit log). The calculators hold no state. Servers are
in Saudi Arabia (OCI); backups must stay in-region.

**Status:** procedure defined here; the scheduled job and a tested restore
drill are executed on the deployed infrastructure at P8 (tracked in
LAUNCH-BLOCKERS). Do not go live without a _tested_ restore.

## What to back up

- The `postgres` data (the app DB `towardpcc`, plus the `umami` analytics DB).
- The environment/secret material needed to bring the stack up (kept in the
  secret store, backed up separately from the DB dump — never in the same blob).

## Backup

Nightly logical dump, encrypted, copied to in-region OCI Object Storage:

```bash
# On the DB host (or a sidecar with network access to postgres):
pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" \
  | gpg --encrypt --recipient "$BACKUP_GPG_KEY" \
  > "towardpcc-$(date -u +%Y%m%dT%H%M%SZ).dump.gpg"
# Upload to an in-region (me-riyadh-1 / me-jeddah-1) OCI Object Storage bucket
# with server-side encryption and lifecycle rules (below).
```

- **Encryption:** GPG (public-key) before the dump leaves the host; the private
  key is held only in the secret store, not on the DB host.
- **Schedule:** nightly (cron / OCI scheduled job). For tighter RPO, add
  Postgres WAL archiving (PITR) on top of the nightly base dump.
- **Retention:** 30 daily + 12 monthly, enforced by a bucket lifecycle rule.
  (Independent of the _application_ retention purge, which trims aged rows
  in the live DB — see ADR-data-model / scripts/purge-retention.mjs.)
- **Residency:** the bucket and any replica stay in the KSA region — the
  data-residency claim depends on it.

## Restore

```bash
gpg --decrypt towardpcc-YYYYMMDDTHHMMSSZ.dump.gpg > restore.dump
# Into a FRESH database (never restore over a live one):
createdb towardpcc_restore
pg_restore --no-owner --dbname=towardpcc_restore restore.dump
# Verify row counts / a known record, then cut over (or promote).
```

## Restore drill (must pass before launch, then quarterly)

1. Take a backup with the real pipeline.
2. Restore it into a throwaway DB on a non-prod host.
3. Point a scratch app instance at it; sign in to `/admin`, open a submission,
   confirm the audit log and calculator-meta rows survived.
4. Record the wall-clock restore time (your RTO) and the backup timestamp
   (your RPO) in the incident log. A backup that has never been restored is
   not a backup.

## Related

- Retention purge (live DB trimming): `packages/db/scripts/purge-retention.mjs`
- Data model + retention periods: `docs/decisions/ADR-data-model.md`
