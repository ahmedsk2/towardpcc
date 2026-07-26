# Runbook: deploy (design — NOT what production runs)

> 🔴 **Superseded for production.** The live site is deployed as a **Coolify
> application behind Traefik** on a shared multi-site OCI host, not with this
> standalone stack. See **`deploy-production.md`** for the real procedure.
> This document is kept as the self-contained design (and the reference if
> TowardPCC ever moves to a dedicated VM).

Target: a single VM in an OCI **Saudi Arabia** region (me-riyadh-1 or
me-jeddah-1). Stack: `docker-compose.prod.yml` (Caddy + web + postgres + umami +
backup + uptime-kuma). The residency claim on the site depends on the region —
**verify the region is actually in KSA before pointing DNS**.

> ⚠️ Provisioning OCI resources and pointing DNS spend money and expose the
> service publicly. Per working-agreement §16.2 these require the founder's
> explicit go-ahead. This runbook is the procedure; it is not a licence to run
> it unattended.

## 0. One-time prerequisites (gated on founder go-ahead)

1. Provision an OCI VM in me-riyadh-1/me-jeddah-1 with an **encrypted block
   volume** for `pgdata` (encryption at rest, §8.1). Confirm the region.
2. Install Docker + compose on the VM. Open only 80/443 in the security list.
3. Register the domain and configure the domain-trust controls (TM-008:
   registrar + registry lock, DNSSEC, CAA, auto-renew, monitoring) — see
   LAUNCH-BLOCKERS.
4. Configure email authentication (SPF, DKIM, DMARC p=reject, MTA-STS) BEFORE
   the first form notification (TM-008).
5. Put the production secrets in the host environment / OCI secret store — never
   a committed file. Generate: `AUTH_SECRET`, `TOTP_ENC_KEY` (both
   `openssl rand -base64 32`), `SUBMISSION_IP_SALT` (`openssl rand -hex 16`),
   `POSTGRES_PASSWORD` (DB owner), `POSTGRES_APP_PASSWORD` (least-privilege app
   role, `openssl rand -hex 24`), and `UMAMI_DB_PASSWORD` / `UMAMI_APP_SECRET`.
   Set `SITE_DOMAIN`, `WEB_IMAGE`, and the SMTP_* vars. The app connects as the
   scoped `towardpcc_app` role (CRUD only); only the `migrate` profile and the
   retention purge use the owner (`POSTGRES_USER` / `POSTGRES_PASSWORD`).

## 1. Build & push the image

```bash
# On CI or a build host matching the VM architecture:
docker build -f apps/web/Dockerfile -t "$WEB_IMAGE" .
docker push "$WEB_IMAGE"
```

## 2. Bring up data services

```bash
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml ps   # wait for postgres healthy
```

## 3. Run migrations (one-shot)

```bash
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

## 3b. Lock the audit trail to append-only (once, after the first migrate)

The init script already scoped `towardpcc_app` to CRUD via default privileges;
now narrow `AuditLog` so the runtime role can INSERT/SELECT but never UPDATE or
DELETE (SPC-DB-003):

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < docker/sql/10-audit-append-only.sql
```

Verify least-privilege took hold: `towardpcc_app` should be non-superuser with no
DELETE on `AuditLog`.

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT has_table_privilege('towardpcc_app','\"AuditLog\"','DELETE') AS can_delete_audit, \
          has_table_privilege('towardpcc_app','\"Submission\"','UPDATE') AS can_update_submissions;"
# expect: can_delete_audit = f, can_update_submissions = t
```

> The scheduled retention purge (`packages/db/scripts/purge-retention.mjs`) DELETEs
> old `AuditLog`/`Submission` rows, so it must run under the OWNER role — give the
> purge job the owner `DATABASE_URL`, not the app role's.

## 4. Create the first admin

```bash
ADMIN_BOOTSTRAP_PASSWORD='<strong>' docker compose -f docker-compose.prod.yml \
  run --rm -e ADMIN_BOOTSTRAP_PASSWORD web \
  node packages/db/scripts/create-admin.mjs you@towardpcc.com OWNER
# Save the printed TOTP URI + recovery codes offline. They are shown once.
```

## 5. Start the app + proxy

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 6. Verify (before DNS cutover if possible)

- `curl -sf https://$SITE_DOMAIN/api/v1/health` → `{"status":"ok",...}`
- Home, a calculator, and a form load; a test submission reaches the admin inbox.
- `sec-web` grade on the live URL; confirm HSTS/CSP present.
- Confirm the backup service wrote a dump (`./backups`), then run the
  **restore drill** (docs/runbooks/backup-restore.md) — do not go live without it.

## Rollback

```bash
# Re-deploy the previous image tag:
WEB_IMAGE=registry/towardpcc-web:<previous-sha> \
  docker compose -f docker-compose.prod.yml up -d web
```

Migrations are additive/forward-only in v1; if a migration must be reverted,
restore from the pre-deploy backup (backup-restore.md) rather than editing the
DB by hand. Keep the previous image tag until the new one is confirmed healthy.
