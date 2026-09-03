# Runbook: incident response

Fast paths for the common failures of the single-VM prod stack
(`docker-compose.prod.yml`). Escalation contact: the founder
(ahmedsk2@gmail.com). Security disclosures: info@towardpicu.com (SECURITY.md).

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

## Regulatory notification (PDPL) — the 72-hour clock

**Research, not legal advice.** Every figure below is sourced; counsel confirms.
Source unless stated otherwise: SDAIA, _Personal Data Breach Incidents
Procedural Guide_, Issue 1.0, October 2024 (classification: Public), giving
effect to PDPL Art. 20 (Royal Decree M/19, amended M/148) and Art. 24 of the
Implementing Regulations.

**The clock starts when you become AWARE, not when the breach happened.**

| Duty                 | Deadline                              | Trigger                                                                                                              |
| -------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Notify SDAIA         | **within 72 hours** of becoming aware | the incident is _expected to harm_ the data or the data subjects, or conflicts with their rights or interests        |
| Notify data subjects | **without undue delay** — NOT 72h     | it _results in_ damage to their data, rights or interests (the guide names stalking, assault, fraud, identity theft) |

Two things about the threshold that are easy to get wrong. There is **no size
floor** — "only a few records" does not exempt you. But there **is** a
qualitative trigger: the harm test above. Both are true at once, and the test is
expectational and low, so anything touching a submission body clears it.

**There is no encryption carve-out.** GDPR Art. 34(3)(a) lets encryption excuse
notifying data subjects; PDPL has no equivalent. "It was encrypted at rest"
mitigates and does not exempt.

### How to notify — it is a portal, not a contact

Not an email address or a phone number, which is what earlier drafts of this
project assumed. It is an e-service: **National Data Governance Platform**
(`dgp.sdaia.gov.sa`) → sign in → Electronic Services → Personal Data Breach
Notification. **Registration is a prerequisite and cannot be done inside the 72
hours** — see the open item in `LAUNCH-BLOCKERS.md`.

The notice has five mandatory fields. Draft them in this order:

1. Description of the breach — including when and how it happened, and when you
   became aware.
2. Category of data subjects, the actual or approximate **number** affected, and
   the type and nature of the data.
3. The risk, the remedial action taken, and what will prevent recurrence.
4. Whether data subjects have been or will be notified.
5. Contact details for the Controller, or the DPO **if any** — TowardPCC has
   appointed none and plausibly meets none of the mandatory criteria, so "no DPO
   appointed" is a legitimate answer rather than a gap to fix under pressure.

Retain the incident documentation afterwards (Stage Three of the guide).

### Two caveats this project has not previously recorded

- **SDAIA notification discharges nothing owed to the NCA.** The guide opens
  "without prejudice to submitting any report… pursuant to Regulations issued by
  the National Cybersecurity Authority". Likely out of scope for a private
  clinical site — but that is a question for counsel, not an assumption to make
  here.
- **A processor who tells you late burns your clock.** The guide requires
  processors to follow the notice requirements in coordination with the
  Controller, but nothing contractual obliges ours to be prompt: there are three
  disclosed sub-processors (OCI, Cloudflare, the non-KSA mail relay) and **no
  executed DPAs**. That makes the tracked DPA item load-bearing for this clock,
  not paperwork.

## Escalation

- Data loss or suspected breach (SEV1) → founder immediately; preserve logs +
  the AuditLog; do not destroy evidence.
- **A suspected personal-data breach starts a 72-hour regulatory clock** (above).
  Contact counsel the same day. **Counsel is not yet named** (2026-09-03; an
  earlier wording here named the founder by mistake) — until it is, the
  founder is the contact and the hour-60 default is NOT settled. The open
  decision and its recommendation are in `LAUNCH-BLOCKERS.md`; do not
  improvise it at hour 60, escalate to the founder.
- Prolonged outage (> 30 min) with no clear cause → roll back to last-known-good
  image and restore the latest verified backup.
- **Secondary contact (pre-launch requirement):** name a second person who can
  respond when the founder is unavailable, record them here and in CODEOWNERS,
  and route Uptime Kuma alerts to a pager (email/SMS). The current bus-factor of
  one is a tracked launch item (LAUNCH-BLOCKERS.md).
