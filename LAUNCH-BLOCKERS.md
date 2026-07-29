# Launch Blockers

<!--
  A STRUCTURAL CONSTRAINT, learned the hard way twice.

  Do not put multiple paragraphs inside a `- [ ]` item, especially after a bold
  lead-in like `**Outstanding:** …`. Prettier's markdown printer is NOT
  idempotent on that shape: each run indents the continuation further, so
  `pnpm format` appears to succeed while `pnpm format:check` fails, and CI goes
  red on a file nobody meaningfully changed.

  When an item needs more than a sentence or two, promote it to a `###`
  subsection with a one-line checkbox and the prose underneath, as below.
-->

Running list of everything that must be resolved before public launch.
Working agreement §16.1: every placeholder on the site is marked in code
AND listed here.

## 🚀 DEPLOYED — https://towardpcc.com (2026-07-26)

Live on the founder's OCI host (me-riyadh-1, KSA) as a **Coolify application**
behind Traefik — see `docs/runbooks/deploy-production.md`. Verified live: valid
Let's Encrypt cert, all pages 200, `/api/v1/ready` green (DB reachable), full
security-header set, HTTP→HTTPS redirect, `www` served.

Resolved by the deploy: DB least-privilege role (**SPC-DB-001**) and DB-enforced
append-only audit log (**SPC-DB-003**) are live and verified in production; the
apex previously returned HTTP 525 (broken origin) and now serves the site.

Also done post-deploy: **push-to-deploy** (GitHub webhook → Coolify; merging to
`main` builds and deploys, gated on the container healthcheck) and **backups with
a passed restore drill** (nightly, offsite to OCI Object Storage in-region).

**Immediately outstanding (see the per-item entries below):** SMTP relay for form
notifications (submissions are stored but send no email), a secondary on-call
contact, and counsel review of the legal pages.

## 🎨 REDESIGN — live (2026-07-27)

Merged to `main` and deployed. A follow-up polish pass then shipped on top of
it — see "POLISH PASS" below. Spec:
`docs/superpowers/specs/2026-07-27-site-redesign-design.md`.

- [x] **R1 foundation** — warmed palette (crimson `#CF1F3D`, coral secondary,
      cream grounds), type scale, gradients, motion tokens. Contrast is now
      asserted automatically by `packages/ui/src/tokens.test.ts`, and
      ADR-design-direction carries the Part 4 revision.
- [x] **R2 chrome** — utility bar, sticky shrinking header, registry-driven
      mega-menu (22 scores, 8 categories), mobile drawer, breadcrumbs,
      back-to-top, fat footer.
- [x] **R3 home** — gradient hero, feature strip, mission split, animated
      counters (marketing figures only), pillar cards, evidence carousel,
      founder section, CTA band.
- [x] **R4 pillars + about** — the three stub pages are now full pages;
      `/about` carries the vision, the founder, and the brand story; all
      stale "in development / launching soon" copy corrected.
- [x] **Merged to main and live** on towardpcc.com.

## ✨ POLISH PASS — live (2026-07-27)

Five slices, deployed together. Spec:
`docs/superpowers/specs/2026-07-27-site-polish-design.md`.

- [x] **Depth system** — the redesign shipped a surface FILL token as a border
      in 38 places, 1.056:1 against the page, so every card edge and section
      rule was invisible. Three tiers by intent now, plus warm elevation. The
      token guard enumerates instead of listing pairings by hand, which is how
      it was missed, and a usage guard blocks the class of mistake.
- [x] **Images** — `aspect-4/3.4` is not a valid Tailwind class, so it compiled
      to nothing and four photographs lost 74–80%. Every image now sits at its
      native ratio; screenshots render whole in window chrome. Guarded by an
      e2e spec that measures each rendered image against its source.
- [x] **Hero** — the animation was gated behind `pointer: coarse` being false
      and never ran on a touchscreen. Rebuilt in Canvas 2D, gated only on
      reduced motion, three.js removed.
- [x] **Calculator pages** — the sticky result had 11px of travel on
      two-input scores; reference prose collapsed into tabs; ranges moved into
      the fields; the interpretation table and two previously-discarded fields
      (`Reference.note`, `ChangelogEntry.reason`) now render.
- [x] **Canonical host** — apex 308s to `www`; every page carries a canonical.

Verification: 712 unit tests, 59 e2e assertions (was 40), all routes inside the
170 KB budget.

**Still needed from the founder:** the four counter figures (PICU physicians in
the pilot, countries, research requests supported, publications), a portrait
photograph, and the mission/library/registry images. Placeholders ship until
then — no figure is invented.

## Variables (founder-provided 2026-07-25)

- [x] `[CONTACT_EMAIL]` = info@towardpcc.com (SECURITY.md, /contact updated).
      **Remaining:** verify the mailbox actually exists and receives mail
      before launch — a dead contact address is a trust failure.
- [x] `[ADMIN_EMAIL]` = ahmedsk2@gmail.com ("for now") — used as the form
      notification recipient env value in P5; never hardcoded in public code.
- [x] `[HOSTING_TARGET]` = founder's Oracle OCI tenancy; default region
      confirmed `me-riyadh-1` (Riyadh, Saudi Arabia) from local OCI config.
      **Remaining (P8):** verify the actual deployment resources are created
      in me-riyadh-1/me-jeddah-1 before DNS — the residency claim depends on
      the deployed region, not the config default.
- [x] `[ORG_LEGAL_NAME]` = Toward Pediatric Critical Care (footer updated).
      Legal pages (P6) still get `TODO:counsel-review`.
- [x] PedsCC Library repo — founder provided github.com/ahmedsk2/pedscc-library
      (2026-07-25); read-only feature audit done
      (docs/research/pedscc-library-audit.md), informs /knowledge.

## Environment

- [x] Docker Desktop installed and the compose stack **verified 2026-07-25**
      (Docker 29.6.2, linux/aarch64): `docker compose config` valid; postgres
      healthy with both the app DB and the auto-created `umami` DB (init
      script's safe `:'pw'` quoting works); mailpit UI 200; minio health 200.
      The `web` service image build (multi-stage Dockerfile) was not built in
      this pass — do that before staging deploy (P8). Note: dev machine is
      ARM64, so prod image builds must target the KSA host's architecture.
- [ ] Pre-commit secret scanning deferred: `gitleaks protect --staged` needs a
      local gitleaks binary this machine doesn't have. Secrets are caught in CI
      (pinned, checksum-verified CLI). Install gitleaks locally by P5 (forms =
      first real secrets risk) and add it to `.husky/pre-commit`.
- [x] **Database backup + tested restore drill (P8, prod-readiness HIGH)** —
      **DONE 2026-07-26.** `towardpcc` added to the Coolify nightly shared-postgres
      job (`0 3 * * *`), offsite copy verified in OCI Object Storage bucket
      `coolify-backups` (me-riyadh-1, in-region). **Restore drill passed**: the
      dump restored into a scratch database with all 7 tables, row counts matching
      source, admin row intact; scratch dropped. Procedure in
      docs/runbooks/deploy-production.md. Re-run the drill after schema changes.
- [x] **Container image build + scan in CI (P8)** — **DONE 2026-07-27.** The
      `container` job lints with hadolint, builds the image, scans with Trivy
      (gating on HIGH/CRITICAL only — gating on MEDIUM base-image noise trains
      people to ignore the job), and then asserts two things that have actually
      bitten this project: the image does not run as root, and Prisma's WASM
      query compiler shipped. All action pins are 40-char commit SHAs.
- [x] **Structured request logging** — DONE (polish pass): pino JSON logger
      (apps/web/lib/logger.ts) with PII redaction; wired at submission-stored /
      rate-limited / admin-login outcomes. Error telemetry (Sentry/GlitchTip
      DSN) is still a deploy-time config (P8).
- [x] GitHub remote — approved by founder 2026-07-24; created during P0
      (private, https://github.com/ahmedsk2/towardpcc). Note: `corepack enable`
      fails without admin on this machine (EPERM in Program Files); pnpm is
      installed via `npm i -g pnpm@10.34.5`, documented in README.

## Security (from docs/security/threat-model.md, 2026-07-24)

- [~] **Domain trust program (TM-008, high/firm)** — **verified against the
  registry 2026-07-27, and more of it is already done than this item
  credited.** RDAP reports registrar GoDaddy with the full client-side lock
  set — `clientDelete`, `clientRenew`, `clientTransfer` and `clientUpdate`
  prohibited — and expiry 2028-07-20, so the lapsed-domain-gets-squatted
  scenario has roughly two years of runway.

      **Genuinely missing, confirmed by live DNS:** DNSSEC is off
      (`delegationSigned: false`, no DS at `com`); there are **zero CAA
      records**, so any CA in the world may issue for this domain. Also still
      open and not verifiable from the repo: registry lock proper (no `server*`
      status codes), org-owned auto-renew payment, a two-owner renewal
      calendar, CT-log and lookalike monitoring, defensive registrations.

### SMTP relay (TM-008) — needs one credential

- [ ] Enter the `mail.towardpicu.com` mailbox password at `/admin/settings`,
      with the host, user and `MAIL_FROM`. Founder-only: it is a credential.

Everything on the engineering side is done. Settings are editable in the admin
area, stored encrypted, and override the environment. The transport is keyed on
a fingerprint of them, so a saved change takes effect without a redeploy, and a
**Send a test email** button proves the relay end to end.

`SMTP_HOST` is the gate — nothing sends while it is blank, so every other field
is safe to fill in first.

**Do NOT widen towardpcc.com's SPF.** Earlier guidance here and in the runbook
said to; it was wrong under both candidate relays. `From:` is on towardpicu.com,
whose SPF already authorises this relay, and towardpcc.com still sends nothing —
so `v=spf1 -all` with `p=reject` stays exactly as it is, which is the strongest
posture available and costs nothing.

Residual, non-blocking: towardpicu.com publishes no DKIM key, so SPF alone
carries authentication and breaks on forwarding, and its DMARC is `p=none` with
no `rua=`.

### KSA-only processing (ADR-0004)

- [~] **Edge migration — STAGED AND PROVEN 2026-07-29, not cut over.** An OCI
  flexible load balancer at `145.241.110.213` serves the whole site
  correctly over HTTPS with a Let's Encrypt certificate, with an HTTP→HTTPS
  redirect and a healthy backend. Verified with `curl --resolve` while
  Cloudflare continued serving every real visitor, and confirmed live
  throughout that neither the site nor the co-tenant's application was
  affected. The shared security list was never touched — ingress came from
  two NSGs, which are additive to it.
- [ ] **Cutover is blocked on client IP, and this is not a detail.** Traefik has
      no `forwardedHeaders.trustedIPs` and the app publishes no host port, so it
      rewrites `X-Forwarded-For` from the peer — which after a cutover is the
      load balancer. Every visitor would collapse into one bucket and the per-IP
      rate limiter and abuse hash would both stop meaning anything. Three
      options with their costs are in `docs/runbooks/edge-migration-ksa.md`;
      one must be chosen and proven first.
- [ ] Attach the regional WAF policy to the LB's HTTPS listener, and add a
      certificate-renewal hook that re-uploads to the load balancer — without it
      the staged path breaks 90 days after issuance.

Settled 2026-07-28: scope is plaintext PII **and** metadata for everything the
platform controls, with written carve-outs for recipient-chosen mail delivery
and zero-PII infrastructure. The submitter acknowledgement is removed (done),
and `ADMIN_EMAIL` stays on Gmail as a recorded exception.

**Cloudflare Enterprise was ruled out on the merits, not on cost.** Customer
Metadata Boundary supports only EU or US, so visitor IPs — personal data under
PDPL — would still leave the Kingdom at roughly $3–5k/month.

**The relay is a written carve-out** (ADR-0004 decision 5):
`mail.towardpicu.com` is a SiteGround host in the US. Defensible only because
the sole message it carries is the admin notification — a submission type and a
link, no submitter data — to a mailbox already outside the Kingdom. Reinstating
any submitter-facing mail breaks it.

Order matters, and two of the four are done:

1. `client-ip.ts` trust boundary — **DONE 2026-07-28.** Dual-path resolver; the
   edge path takes the rightmost XFF hop, never reads `cf-connecting-ip`, and is
   unreachable while `EDGE_SHARED_SECRET` is unset.
2. Co-tenant agreement — **RESOLVED 2026-07-28: the founder owns every
   application on this host.** Still needs care rather than speed: one subnet,
   one security list, and `endorsement` holds real patient data with a registry
   app to come.
3. Stand the LB up and prove it **while Cloudflare still serves**. Never flip
   DNS first.
4. Move DNS, wait out the TTL, then narrow the old ingress **last**. Only then
   rewrite the public residency copy.

### Inbound mail is outside KSA

- [ ] Move MX off SiteGround to a KSA-hosted mail provider.

`towardpcc.com`'s MX points at SiteGround's SpamExperts filter on Google Cloud,
which reads every message sent to `info@towardpcc.com` — the address printed on
`/contact`, named in `/legal/data-protection` as the deletion contact, and used
in `security.txt`. OCI Email Delivery is outbound-only and does nothing for it.

Microsoft 365 and Google Workspace are both ruled out: neither offers a Saudi
data region at any price. Zoho has a real Saudi datacentre; self-hosting inbound
on the existing OCI instance is also viable, since receiving needs no sending
reputation.

### Monitoring (taskmanager 9.3)

- [x] **Uptime Kuma deployed 2026-07-29**, self-hosted in me-riyadh-1 so it adds
      no out-of-Kingdom processor. Running and healthy in Coolify project
      `admin-tools`.
- [x] **Basic auth applied and verified** — 401 without credentials, 302 with,
      through Cloudflare.
- [x] **`uptime.towardpcc.com` live**, proxied, hostname set with its `:3001`
      container-port suffix.
- [ ] Create the monitors and point alerting at the SMTP relay.

Full sequence, credential location and the four monitors worth having:
`docs/runbooks/uptime-monitoring.md`.

**Error tracking is deliberately skipped**, not forgotten. GlitchTip is five
containers including its own Postgres and Redis, on a host that also runs an
application holding real patient data. Errors already go to structured logs with
PII redaction. If it is ever added it takes server-side errors only — a browser
SDK would transmit from pages that promise they transmit nothing.

### Integrity monitoring (TM-012)

- [x] **DONE 2026-07-29.** `scripts/check-integrity.mjs`, run daily by
      `.github/workflows/residency.yml`. Twelve checks: calculator pages still
      carry their own score name and validation status, /trust still makes its
      claims, no third-party script on a calculator page, security headers
      present, and the `/api/v1` surface is still exactly health and ready —
      which is ADR-0005's commitment checked against the running system rather
      than trusted to memory.

### Residency has to be checked, not asserted

- [x] **DONE 2026-07-28.** `scripts/check-residency.mjs`, run daily by
      `.github/workflows/residency.yml`, asserts the TLS terminator, the MX, the
      apex SPF and DMARC, and the presence of a CAA record — failing loudly on
      drift in either direction.
- [x] **CAA records applied 2026-07-29** via the Cloudflare API. The residency
      check now passes 5/5. Nine records were created; DNS returns thirteen —
      Cloudflare silently added `comodoca.com` and `digicert.com` itself, which
      is documented behaviour and means the dashboard is not the source of truth
      for CAA on this zone. Verified afterwards that the edge certificate is
      still valid and every route still 200s.
- [~] **DNSSEC — Cloudflare side done, registrar side outstanding.** The zone is
  signed and `pending`; nothing validates until a DS record is published at
  GoDaddy, which needs registrar access I do not have. The exact DS is in
  `docs/runbooks/dns-hardening.md`. **This is the one DNS change that can
  take the domain offline**, so verify immediately after publishing it.
- [ ] Back the single-region claim with an IAM policy or quota. The tenancy is
      subscribed to one region today, but that is state, not a control: an
      admin can add a region in one click and OCI never allows unsubscribing.

- [ ] **HSTS preload-list submission (P8)** — **the precondition is now met.**
      Checked 2026-07-27: hstspreload.org reports the domain **preloadable with
      zero errors and zero warnings**, and has never been submitted
      (`status: unknown`). The item's own gate — HTTPS confirmed on the apex and
      every subdomain — holds: the apex 308s to www over HTTPS, and the only
      other live subdomain, `next.towardpcc.com`, serves 200 over HTTPS.
      Remains deliberately un-submitted because it is genuinely hard to reverse:
      once preloaded, any future subdomain that cannot do HTTPS is unreachable
      in browsers for months. A founder decision, not an engineering one.
- [~] **CSP + security headers ship WITH P5** (TM-005). DONE: strict static
  security headers (HSTS, nosniff, Referrer-Policy, X-Frame-Options, a
  restrictive Permissions-Policy, COOP) + a two-tier CSP in
  apps/web/proxy.ts — verified the app hydrates under it
  (docs/decisions/ADR-security-headers.md). **The `/admin` nonce tier is also
  DONE** — verified live 2026-07-27: `/admin/login` returns
  `script-src 'self' 'nonce-…' 'strict-dynamic'` with no `unsafe-inline`, and
  it is regression-guarded by `e2e/security-headers.spec.ts`. **Remaining:**
  only re-run `sec-web` against the live URL and record the grade. Public pages
  keep scoped `script-src 'unsafe-inline'` (SSG constraint; no injection
  surface there) — tracked separately as SPC-WEB-001.
- [~] **Privacy-invariant test suite (TM-001)** — DONE in P3: Playwright
  zero-network/airplane-mode calculator compute test (apps/web/e2e/
  calculator-privacy.spec.ts, CI `e2e` job) + static grep-guards (no
  useSearchParams/searchParams/"use server" under calculator routes,
  apps/web/content/privacy-invariant.test.ts, runs under `pnpm test`).
  **Remaining (P5, when analytics lands):** configure Umami to strip
  query/hash from collected URLs — deferred because Umami is not yet
  integrated into the app.

## Content / legal

- [ ] Legal pages need counsel review (`TODO:counsel-review` markers, P6)
- [ ] Calculator validator slots empty by design — badge shows
      "Independent clinical validation: pending" until real names provided
- [x] Tier-B instrument IP checks done (docs/decisions/ADR-tier-b-ip.md,
      2026-07-25): all 8 stay unbuilt in v1 — 5 need permission (COMFORT-B,
      CAPD, SOS-PD, FLACC, Bedside PEWS), 4 need legal review. To build any,
      the founder must obtain written permission (FLACC/CAPD are the cleanest
      routes). Not a launch blocker for v1 (v1 ships the IP-clean scores).
- [x] PWA raster PNG icons (192/512 + maskable) — DONE (polish pass): generated
      from the SVGs via Playwright/Chromium (sharp has no ARM64 dev binary),
      committed to public/, and wired into manifest.ts. Regenerate with
      `node apps/web/scripts/generate-icons.mjs`.

## Security audit findings (2026-07-25)

Full report: `docs/security/security-audit-2026-07-25.md` (static pass — 0
critical, 1 high, 14 medium, 14 low, 5 info). Two findings fixed in-repo; the
rest are deploy-entangled or consequential and tracked here for pre-launch.

- [x] **SPC-CODE-001** — account lockout now re-arms after each window
      (apps/web/lib/auth/lockout.ts + regression test). Fixed.
- [x] **SPC-SUP-001** — gitleaks CI job no longer persists GITHUB_TOKEN. Fixed.
- [x] **SPC-DB-001 (high)** — **VERIFIED LIVE 2026-07-28.** The least-privilege
      `towardpcc_app` role is real, not merely prepared:
      `has_schema_privilege('towardpcc_app','public','CREATE')` returns **false**,
      and `public` is owned by `towardpcc_owner`. So the application cannot create,
      alter or drop anything — migrations must run as the owner, which is why the
      `AppSetting` migration had to grant DML on its new table explicitly.
- [x] **SPC-DB-003** — **VERIFIED LIVE 2026-07-28.** `AuditLog` is append-only
      at the database level: `towardpcc_app` holds **only INSERT and SELECT** on it,
      against full INSERT/SELECT/UPDATE/DELETE on `Submission`. A compromised
      application cannot erase its own trail.

  This resolves a contradiction that stood in this file for three days — the
  deploy header above declared both controls "live and verified in production"
  while these two entries still carried "remaining: apply + verify live". Both
  are now checked against the live database rather than against a SQL file that
  was written to apply them.

  **Consequence, and it is not cosmetic:** `packages/db/scripts/purge-retention.mjs`
  deletes from `AuditLog`, so it CANNOT run as the app role. Do not grant the
  app DELETE to make the purge work — append-only is the point. Point that job
  at `towardpcc_owner`.

- [ ] **SPC-DB-002 — reframed 2026-07-27, see below.** The original item
      (enforce `sslmode=verify-full`) assumed the risk was eavesdropping on the
      app→Postgres link. Checking production changed that in both directions.

#### SPC-DB-002 in detail

_Good news:_ the Postgres container holds **only** `towardpcc`. The other
tenants on the box — including the patient-data application — run MySQL and
MariaDB in separate containers, so changing this Postgres has no blast radius
beyond this app. The runbook's "shared-services Postgres" wording overstates
the coupling.

_Less good:_ `ssl = off`, and the container sits on Coolify's shared `coolify`
Docker network alongside other tenants' application containers. Sniffing a
bridge needs host-level privilege, so eavesdropping is not the live threat —
but **reachability** is: a compromised neighbour container can open a
connection to the database port. Password auth and the least-privilege
`towardpcc_app` role are what stand in front of it.

So the higher-value fix is **network segmentation** (a dedicated network for
web↔postgres, which the threat model already asked for at §2.5), with TLS
second. Both touch Coolify-managed infrastructure and can be reverted by a
Coolify redeploy, so neither is a drive-by change; do them deliberately, with
the restore drill re-run afterwards.

- [ ] **SPC-WEB-001** — remove public-tier CSP `script-src 'unsafe-inline'` (hash
      the Next bootstrap or render dynamically) + a CI sink guard. Documented SSG
      tradeoff; fix needs hydration testing.
- [~] **SPC-CON-001..008** — container hardening. See the subsection below;
  most of what this item claimed as done has never taken effect in production.
- [x] **SPC-API-001** — DONE 2026-07-27: per-IP throttle in front of the admin credentials
      flow (reuse `apps/web/lib/rate-limit.ts`), scope lockout to account+IP or
      add a challenge, to blunt targeted auth-DoS + credential stuffing.
      **Unblocked 2026-07-27** — build it on `resolveClientIp()` from
      `apps/web/lib/client-ip.ts`, never on a raw header read. On the old
      behaviour this throttle would have been worse than nothing: every
      attacker and every legitimate admin shared a Cloudflare edge bucket, so
      an unrelated visitor could trip the lockout while a targeted attacker
      simply rotated edges.
- [x] **Client IP is Cloudflare's, not the visitor's** (found and fixed
      2026-07-27). Traefik has no `forwardedHeaders.trustedIPs`, so it
      overwrote forwarded headers with the connecting peer — a Cloudflare edge
      node. `apps/web/lib/client-ip.ts` now prefers `CF-Connecting-IP`, with 10
      unit tests. Safe only because the OCI security list admits 80/443 from
      Cloudflare alone; **widening those rules re-opens CWE-348 and means
      revisiting that file**. Do not "fix" anything here by turning Cloudflare
      proxying off — the origin is locked to Cloudflare and grey-clouding takes
      the site fully offline (ADR-0003).
- [ ] Lower-severity items (SPC-WEB-002/003/004, SPC-API-002/004/005,
      SPC-DB-004/005, SPC-TM-001/002/003, SPC-CON-009/010, SPC-SUP-002) — see the
      report's remediation tiers.

### Container hardening is written but NOT applied

Checked against the running container on 2026-07-28, not against the file that
was supposed to configure it:

```
ReadonlyRootfs : false        CapDrop     : (none)
SecurityOpt    : (none)       Memory      : 0  (unlimited)
NanoCpus       : 0            PidsLimit   : (none)
User           : app          Networks    : coolify  (one flat shared network)
```

Everything `docker-compose.prod.yml` specifies — `cap_drop: [ALL]`,
`no-new-privileges`, CPU/memory/PID limits, the edge/data network split — is
**inert**, because production does not use that compose file. Coolify builds
from `apps/web/Dockerfile` and runs the container with its own options. The
hardening was real work; it was just written into a file nothing reads.

Two things ARE real, and both come from the Dockerfile, which IS used: the
container runs as the non-root `app` user, and the `HEALTHCHECK` is active and
reporting healthy — Coolify observes it, so the rolling-update gate the deploy
runbook describes does hold.

**Applied 2026-07-28:** memory 1G, swap 1G, CPU 2 cores, set through Coolify so
they survive redeploys. Sized against measurement rather than guesswork — the
container's steady state is **48 MB**, so this is roughly 20× headroom. The
reason to bother at such low usage is the neighbour: this host also runs
`endorsement`, which holds real patient data, and nothing on the box had a
memory limit at all. An unbounded leak here could have exhausted host memory and
taken down a clinical application.

**Also applied 2026-07-28:** `cap_drop: ALL`, via Coolify's custom docker run
options. A Node process binding port 3000 needs no Linux capabilities at all —
the port is above 1024 and nothing in the image is setuid — so this is free.
Verified on the running container: `CapDrop: [ALL]`, health `healthy`, every
route still 200.

**`no-new-privileges` cannot be set through Coolify 4.1.2.** Not a
configuration mistake — a parser limitation, found by reading its source at
`bootstrap/helpers/docker.php:994`:

```php
preg_match_all('/(--\w+(?:-\w+)*)(?:\s|=)?([^\s-]+)?/', $custom_docker_run_options, ...)
```

The value group is `[^\s-]+`, which **excludes hyphens**. So `--cap-drop=ALL`
parses fine, while `--security-opt no-new-privileges:true` captures the value as
just `no`, emitting an invalid `security_opt` that Docker rejects. The container
then fails to start and the healthcheck gate keeps the old one — which is
exactly what happened on the first attempt, silently and with no downtime. The
flag is on Coolify's own allowlist at line 998; it simply cannot be expressed.

The residual risk is small and worth stating rather than leaving as an unclosed
box. `no_new_privs` stops a process gaining privileges through a setuid binary.
With `cap_drop: ALL` already applied, a setuid escalation would arrive at a root
that holds no capabilities, and the image contains no setuid binaries. The
options to close it properly are a host-wide `"no-new-privileges": true` in
`/etc/docker/daemon.json` — which would apply to every container on this host,
including other applications, so it is not ours to set — or a Coolify upgrade.

**Still not applied**, in order of value:

- Read-only rootfs with tmpfs mounts. Needs testing: Next.js writes to its cache
  directory and `/tmp`, so this one genuinely can break the app and must not be
  applied blind.
- Network segmentation. Every container on this host shares one flat `coolify`
  bridge, including other applications' databases. This is a Coolify-managed
  concern and cannot be fixed from this repository alone.
- Secrets via Docker `secrets:`/`_FILE`, which needs an app entrypoint.

**The lesson worth keeping:** hardening asserted in a file that production does
not read is indistinguishable from no hardening, and it is worse than nothing in
one specific way — it makes a checklist look finished. Verify against the
running container.

## Production readiness (2026-07-25)

Full report: `docs/ops/production-readiness-review-2026-07-25.md` (78/100 —
NEEDS FIXES; one real blocker, now cleared). The remainder is the acknowledged
P8 deploy-gated go-live checklist.

- [x] **TST-02 (high, the one real blocker)** — auth crypto + submission rate
      limiter now unit-tested with an apps/web coverage gate (100%
      lines/stmts/funcs on the gated modules).
- [x] Resilience/hygiene: DB + SMTP timeouts (RES-01), `/api/v1/ready` probe
      (OBS-07), clipboard catch (TST-10), incident SEV tiers (OPS-04), LOG_LEVEL
      (CFG-06), CHANGELOG (DOC-05), README runbooks line (DOC-09), legal TODO
      marker (UX-02).
- [ ] **OPS-02** — name a secondary on-call / escalation contact + route alerts
      to a pager before launch (bus-factor-1). Requires a real person → founder.
- [ ] P8 deploy-gated (verify at go-live, not codebase defects): backup restore
      drill; CI image build + SBOM + signed provenance + scan; error tracker DSN + Uptime Kuma monitors + SLOs; branch protection + required review on main + a SAST job; OCI Vault for secrets + at-rest volume encryption; DPAs +
      PDPL breach clock + counsel privacy-policy review.
