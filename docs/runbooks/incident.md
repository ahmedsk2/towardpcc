# Runbook: incident response

Fast paths for the common failures of the single-VM prod stack
(`docker-compose.prod.yml`). Escalation contact: the founder
(ahmedsk2@gmail.com). Security disclosures: info@towardpcc.com (SECURITY.md).

## Severity classification

Declare a severity first — it drives how fast to escalate and whether to pull in
help. The calculators are client-side, so a backend outage is at most **SEV2**
for already-loaded/PWA users; weigh that when classifying.

| Sev      | Criteria                                                                                       | Response                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **SEV1** | Data loss, suspected breach / PII exposure, or full outage of forms + admin                    | Drop everything, escalate immediately, preserve logs + `AuditLog`, start a written timeline |
| **SEV2** | Degraded service (elevated errors, slow/unhealthy DB, mail delivery failing) with a workaround | Same-day: mitigate, then fix; note it in the timeline                                       |
| **SEV3** | Minor / cosmetic, single-user, or self-recovering                                              | Next business day; batch with routine work                                                  |

## First 5 minutes (any incident)

```bash
docker compose -f docker-compose.prod.yml ps            # what's down
docker compose -f docker-compose.prod.yml logs --tail=200 <service>
curl -sf https://$SITE_DOMAIN/api/v1/health
```

Note: the **calculators keep working entirely client-side** — a backend outage
never affects the core clinical tool for already-loaded/PWA users. Prioritise
data safety over uptime.

## Web service down / crash-looping

1. `logs web` — look for a boot error (missing env var, DB unreachable).
2. If a bad deploy: **roll back** to the previous image (deploy.md → Rollback).
3. If DB-related: see below; the web container retries once postgres is healthy.

## Database unreachable / unhealthy

1. `logs postgres`, `docker compose ... ps` (health).
2. Disk full is the usual cause — check volume free space; the retention purge
   (`packages/db/scripts/purge-retention.mjs`) and backup rotation bound growth.
3. **Do not** delete the volume. If corruption is suspected, stop the app,
   snapshot the volume, and restore into a fresh DB (backup-restore.md).

## TLS / certificate errors

1. `logs caddy` — Let's Encrypt rate limits or a DNS/records mismatch are typical.
2. Confirm the domain still resolves to this host and CAA allows Let's Encrypt.
3. Caddy renews automatically; a manual reload: `docker compose ... restart caddy`.

## Elevated errors / abuse

1. Check Uptime Kuma + error tracker for the spike's onset and shape.
2. Form abuse: the pipeline rate-limits per IP + globally and drops bot traffic
   (honeypot/time-trap); if a flood persists, tighten the limits in
   `apps/web/lib/submissions.ts` (or add a challenge) and redeploy.
3. Suspected compromise: rotate `AUTH_SECRET` (invalidates all admin sessions),
   review the append-only `AuditLog`, and rotate DB credentials if warranted.

## Data-deletion / retention request

A submitter's deletion request → find the row in the admin inbox and delete it,
or run a targeted deletion; the scheduled purge handles time-based retention.

## Escalation

- Data loss or suspected breach (SEV1) → founder immediately; preserve logs +
  the AuditLog; do not destroy evidence.
- Prolonged outage (> 30 min) with no clear cause → roll back to last-known-good
  image and restore the latest verified backup.
- **Secondary contact (pre-launch requirement):** name a second person who can
  respond when the founder is unavailable, record them here and in CODEOWNERS,
  and route Uptime Kuma alerts to a pager (email/SMS). The current bus-factor of
  one is a tracked launch item (LAUNCH-BLOCKERS.md).
