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

  I broke this rule myself on 2026-07-29, two days after writing it, and CI went
  red for exactly the predicted reason. The pull is real: you are mid-thought,
  the detail belongs with the item, and adding a blank line feels harmless.
  It is not.
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

### Push-to-deploy does not work — verify every deploy by hand

- [ ] **Merging to `main` does not reliably deploy. Confirmed twice.**

Treat push-to-deploy as broken, not flaky, and check the deployed SHA after
every merge.

**2026-08-03.** PRs #35 and #36 merged three minutes apart. Both webhook
deliveries returned 200 OK (GitHub hook 657319469, 04:10:33 and 04:13:29),
Coolify's `/api/v1/deployments` was empty, and the app reported
`running:healthy` — every signal said the site was current. It was not: the
running container was tagged `3ec4350` (the #35 merge) and #36 never deployed.
The reading at the time was that Coolify was mid-build when the second event
arrived and discarded it rather than queueing.

**2026-08-04, and that explanation does not cover it.** PRs #37 and #39 merged
about ninety seconds apart to `805cc25`. The container stayed on `6f9945b` —
the #36 merge, up 33 hours — so _neither_ merge deployed, and no build was in
flight for the first one to collide with. `running:healthy` again reported a
site three commits stale. A manual `/api/v1/deploy` produced `805cc25`.

So the trigger is not a build-collision race, and the queueing theory is at
best incomplete.

**Coolify's status field is not a deploy gate in either direction.**
Immediately after the rolling update the API said `running:unhealthy` while
Docker's own healthcheck said `healthy` and both `/api/v1/health` and
`/api/v1/ready` returned OK. Comparing the container image tag against
`origin/main` is the only signal that has been right every time:

```bash
sudo docker ps --filter name=gpsokvxzncr7ks1vzqz7wkr4 --format '{{.Image}}'
```

Worth teaching `scripts/check-integrity.mjs` to assert a deployed commit rather
than only page content — a stale-but-healthy deploy is exactly the failure a
content canary cannot see.

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

- [x] **DONE 2026-07-29.** Relay configured at `/admin/settings`:
      `mail.towardpicu.com`, port 465 with `SMTP_SECURE=true` (the correct
      pairing for implicit TLS), sending as `@towardpicu.com` — the domain that
      can authenticate. Proven end to end by an Uptime Kuma alert arriving,
      which also confirms SMTP AUTH.

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
- [x] **Client IP SOLVED 2026-07-29.** Traefik now trusts the LB subnet, the LB
      injects a secret `x-via-edge`, and `client-ip.ts` resolves from
      `x-real-ip`. The first implementation counted hops and was wrong — the
      measured chain has TWO trusted proxies, so it would have resolved every
      visitor to the load balancer's own address, silently. Caught by measuring
      the live chain with a temporary echo service, not by reasoning.
- [~] **Certificate renewal — deadline now monitored, not automated.** The LB's
  certificate expires **2026-10-27** and nothing renews it. The daily
  production check now fails 21 days out with the exact reissue steps, so it
  cannot pass unnoticed; verified by lowering the threshold and watching it
  go red.

      Deliberately NOT automated yet. Doing so means an OCI API key with
      load-balancer write access sitting on a host that also runs an application
      holding real patient data, to keep a certificate alive on a path serving
      nobody. That trade is worth making at cutover and not before. When it is
      made, use a dedicated OCI user with a narrow policy rather than the
      tenancy admin key.

- [x] **WAF attached and INSPECTING, 2026-07-29.** Applied through the OCI
      Console after `create-for-load-balancer` returned silently on this CLI
      build. Verified rather than assumed: normal routes still 200, while XSS,
      boolean SQL injection and UNION SELECT probes all return **403**. It has
      no geographic component — it blocks on attack signature, not origin, so
      visitors inside and outside Saudi Arabia are treated identically, and it
      protects nothing until cutover since DNS still points at Cloudflare.

- [ ] Rewrite the residency copy in the SAME deploy as the DNS cutover.

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
- [x] **Monitors created and passing 2026-07-29** — site, readiness, apex
      redirect and calculators, all wired to the email notification. SMTP is
      configured, so alerts have somewhere to go.
- [x] **Alert path proven 2026-07-29** — the founder tested the Uptime Kuma
      notification and the email arrived. That also proves the relay,
      credentials and AUTH work, which no check from this side could.
- [x] **Application test send confirmed 2026-07-29.** Kuma proved the relay;
      this proves the application's own transport, which resolves its settings
      through a different path. Both mail paths are now verified end to end.

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
- [x] **HSTS preload submitted 2026-07-29** — 0 errors, 0 warnings, status
      pending; ships with the next browser release cycle. Every subdomain was
      confirmed HTTPS-capable first, because `includeSubDomains` binds them all.
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

- [x] **HSTS preload SUBMITTED 2026-07-29** — hstspreload.org reports 0 errors
      and 0 warnings, status `pending`; it ships with the next browser release
      cycle. Every subdomain was confirmed HTTPS-capable first, because
      `includeSubDomains` binds all of them, and the commitment is effectively
      irreversible on any useful timescale.
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

### An unidentified e2e flake, roughly 1 run in 5

Observed three times on 2026-07-29: a full local suite reports one failure while
the line reporter's last output names `evidence-rail.spec.ts:82`. That name is
weak evidence — the line reporter prints the _running_ test, and with
`workers: 1` that only bounds where it happened. Six consecutive isolated runs
of that spec and five consecutive full suites all passed, so it is not
reproducible on demand and no cause has been established.

**It does not turn CI red.** `playwright.config.ts` sets `retries: 2` under CI
and `0` locally, so the flake is absorbed there and appears only on a developer
machine. That is why CI has been green throughout while local runs occasionally
were not.

Deliberately not "fixed": two genuine flakes were found and repaired this
session by identifying the actual race — a fixed sleep against a smooth scroll,
and a layout measured before webfonts settled. Guessing at a third without
evidence would more likely add a pointless wait than remove a race. Left open,
with what is known, for whoever next sees it fail and can capture the output.

## Content / legal

- [ ] Legal pages need counsel review (`TODO:counsel-review` markers, P6)
- [ ] Calculator validator slots empty by design — badge shows
      "Independent clinical validation: pending" until real names provided
- [x] Tier-B instrument IP checks done (docs/decisions/ADR-tier-b-ip.md,
      2026-07-25): 7 of 8 stay unbuilt in v1 — 5 need permission (COMFORT-B,
      CAPD, SOS-PD, FLACC, Bedside PEWS), 3 need legal review. To build any,
      the founder must obtain written permission (FLACC/CAPD are the cleanest
      routes). Not a launch blocker for v1 (v1 ships the IP-clean scores).
      PRISM III / PRISM IV is the eighth and is now BUILT and published
      (2026-07-31): its patent expired in 2015 and PRISM IV was placed in the
      public domain by its own authors, so the review it was waiting on had
      already been answered by the primary sources. See the ADR addendum. The
      "needs legal review" rating had been inherited from secondary sources
      that were never revised after the patent lapsed.
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
- [x] **SPC-WEB-003 done 2026-07-29** — the session cookie's Secure flag and
      `__Secure-` prefix are pinned to NODE_ENV rather than inferred from
      `X-Forwarded-Proto`. More urgent than when it was filed: a second proxy
      path now exists, and the failure was silent — a cookie issued without
      Secure, under a different name, on a login that appears to work.
- [x] **SPC-WEB-006 / SPC-WEB-007 done** — `no-store` and
      `Cross-Origin-Resource-Policy: same-origin` on `/admin` and `/api`, with
      e2e asserting the public tier does NOT carry them so the scoping stays
      meaningful.
- [x] **SPC-API-004 done** — `requireRole("OWNER")` now guards the two actions
      that write a credential or send mail. It had never been called, so the
      two-tier model granted nothing and an EDITOR equalled an OWNER. A
      structural test fails the build if either guard weakens.
- [x] **SPC-API-005 done** — `/api/v1/health` returns `{status:"ok"}` and no
      longer publishes the engine version to anonymous callers.
- [x] **SPC-CON-010 done earlier** — CI asserts the Prisma WASM query compiler
      ships in the image.
- [ ] **SPC-DB-004 accepted, not fixed.** Submission payloads are cleartext
      JSONB. Column encryption would mean the application holding a key to data
      it must search and display, on a database whose disk is already encrypted
      and whose app role is least-privilege. The honest mitigation is the
      24-month retention purge, which needs the scheduler below.
- [ ] **SPC-DB-005** — the retention purge still has no scheduler, and must run
      as `towardpcc_owner` because AuditLog is append-only to the app role.
- [ ] SPC-WEB-002 (`style-src 'unsafe-inline'` on the admin tier),
      SPC-API-002, SPC-TM-001/002/003, SPC-CON-009 (unpinned `dumb-init`),
      SPC-SUP-002 — see the report's remediation tiers.

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

## Triage of every remaining item (2026-08-01)

Each open item was re-read against the code by one reviewer and then
adversarially re-checked by a second. **Six of six proposed in-repo fixes were
refuted**, each on a specific production breakage — so the honest status of this
section is not "small tasks nobody got to" but "changes that need real work and
must not be done drive-by".

The pattern worth naming: several items were filed against line numbers and
rationales that no longer hold, and two rest on claims that are simply false. An
audit item nobody re-reads decays into folklore.

### The shared-secret exposure — mostly closed 2026-08-01

The preview environment (§4.1 of `docs/standards/security-and-privacy.md`) was
recorded as "closed" because the container had been stopped. It was not closed.
**The Coolify application record still existed**, status `exited`, still bound to
`https://next.towardpcc.com`, and still holding its own copies of `AUTH_SECRET`,
`DATABASE_URL`, `TOTP_ENC_KEY` and `SUBMISSION_IP_SALT` — exactly the state that
document warned a single Deploy click would restore.

Done, verified against the running system:

- [x] **Preview application deleted**, not stopped — record, environment
      variables and the `next.towardpcc.com` binding. Its non-secret config
      (git repo, branch `redesign/site-v2`, build pack) is snapshotted at
      `~/backups/towardpcc-preview-config-2026-08-01.json` (mode 600) on the
      host, so a properly isolated preview can be rebuilt per §7.3 — its own
      database, role and `AUTH_SECRET`.
- [x] **`AUTH_SECRET` and `SUBMISSION_IP_SALT` rotated.** Coolify stores each
      variable twice, once for production and once for its preview-deployments
      feature, and both rows held the **same** value; they now hold two
      different new values, so a future Coolify preview cannot share production
      secrets either. Applied with a `restart_only` deployment rather than a
      redeploy: `origin/main` has moved past the running image, so a rebuild
      would have shipped unrelated code changes as a side effect of a secret
      rotation. Container recreated, healthy, new values confirmed live;
      `/`, a calculator, `/admin/login`, `/api/v1/health` and `/api/v1/ready`
      all 200 afterwards.

The two that needed care rather than speed, both now done:

- [x] **`TOTP_ENC_KEY` ROTATED 2026-08-01, and verified against the running
      system.** It seals admin TOTP secrets **and** the stored SMTP settings,
      so it can never be swapped in the environment alone —
      `packages/db/scripts/rotate-totp-enc-key.mjs` re-encrypts both, verifying
      each new box in memory before anything is written. Two rows moved
      (`AdminUser.totpSecret`, `AppSetting.SMTP_PASSWORD`) in one transaction,
      then the variable was updated on both Coolify rows and the container
      recreated. **Proof, not inference:** the values were read back out of the
      database and opened with the key the running container now holds — the
      TOTP secret decrypts to valid base32 and is unchanged, so existing
      authenticator apps keep working, and the SMTP password opens. Site 200
      across `/`, a calculator, `/admin/login`, `/api/v1/health`,
      `/api/v1/ready`. Old and new key material shredded from the host.
      **Fixed alongside it:** `auth.ts` decrypted the TOTP secret _before_
      considering a recovery code, so a wrong key threw inside `authorize()`
      and killed the whole login path — taking down recovery codes, which are
      hashed and do not depend on that key at all. A failed decrypt now fails
      that attempt and logs at error.
      **A detail worth keeping:** the rotation could not use the script's own
      Prisma path. `packages/db` is not in the production image, the host has
      no Node, and inside the container Prisma sits in a pnpm store path with
      `pg` never traced in. So the script gained a `--filter` mode — values
      move by `psql`, only the crypto runs in the container on Node's built-in
      `crypto` — which kept one tested implementation instead of a second copy
      improvised against a live database. `cap_drop: ALL` also means even root
      in that container cannot `chown`, so staged files must be written as the
      app user rather than `docker cp`ed in.
- [x] **`DATABASE_URL` ROTATED 2026-08-01.** The preview held production
      database credentials, so the `towardpcc_app` password was changed
      (`ALTER ROLE`, SQL over stdin so it never reached a process list), the
      variable updated on both Coolify rows, and the container recreated.
      **Proved both directions from inside the Postgres container:** the old
      credential now returns `FATAL: password authentication failed`, the new
      one returns `1`, and `/api/v1/ready` — which runs `SELECT 1` — is 200.
      `towardpcc_owner` was deliberately **not** rotated: it appears only in
      `towardpcc-secrets.env` on the host, never in the application
      environment, and was never in the preview, so it is not part of this
      exposure. **Re-run the restore drill** at the next convenient point; the
      dump is taken by Coolify's own job, which does not use this credential.
- [x] **The on-host seed file was stale and dangerous, now fixed.**
      `/home/ubuntu/towardpcc-secrets.env` is documented as the source of truth
      used to seed Coolify's variables, and after the earlier rotations it
      still held the PRE-rotation `AUTH_SECRET`, `TOTP_ENC_KEY` and
      `SUBMISSION_IP_SALT` — so re-seeding from it would have quietly restored
      three exposed secrets. It is now re-synced from Coolify's live values,
      with `DATABASE_URL_OWNER` left untouched. This was not on anyone's list;
      it surfaced only because the file was opened while rotating something
      else.

The severity of the salt exposure is unchanged and worth restating: the stored
value is `HMAC-SHA256(salt, ip)` truncated to 96 bits and kept 24 months. IPv4
is 2^32 candidates — minutes on one GPU — and 96 bits leaves no collision
ambiguity, so a matched candidate is a certain re-identification.
`ADR-data-model.md:43` claims "truncation defeats reversal", which is false for a
32-bit preimage space and is why this was originally rated low. Hashes written
before 2026-08-01 remain under the old, exposed salt until the 24-month purge.

- [x] **Cloudflare edge injection — FOUND AND REMOVED 2026-08-01.** Two
      injections were live on every calculator page:
      `static.cloudflareinsights.com/beacon.min.js` (Real User Measurements,
      third-party, blocked by `script-src 'self'` so it had never collected
      anything) and `/cdn-cgi/scripts/.../email-decode.min.js` (Email Address
      Obfuscation / Scrape Shield, same-origin, CSP-permitted, and it **did**
      execute). Both disabled in the dashboard — zone _settings_, so founder
      action: the Cloudflare token available to tooling carries only
      `#dns_records:edit` / `#zone:read`. Verified from the outside with
      cache-busted requests, and the canary's edge-script allowlist is now
      **empty**, so anything the edge injects from here fails the check.
      Found by the integrity canary on the first run in which it could reach
      the site at all — which is the argument for fixing a broken monitor
      promptly rather than muting it. It had been red for two days for an
      unrelated reason, and this was sitting underneath.

### The daily production check had been red for the wrong reason

Fixed 2026-08-01. Node's `fetch` sends no browser User-Agent and Cloudflare
answered GitHub's runners with 403, so the canary never reached the site while
reporting that four calculator pages had lost their names. Three checks also
reported PASS off the same 403, treating any `status >= 400` as proof of
absence. Both fixed, plus a preflight that reports BLOCKED rather than inventing
an integrity incident out of its own blindness. **Still to verify:** whether the
named User-Agent is actually allowed through from GitHub's IP ranges — only a
run after this merges can establish that.

### SPC-WEB-001 — keep `'unsafe-inline'`, and say so

- [ ] Re-grade to low and record the waiver instead of tracking it as a to-do.

Both reviewers agreed on the outcome. The built output settles it: `/` contains
**101 bare inline `<script>` elements** (all `self.__next_f.push`), 1,077 across
38 prerendered files. Nonces cannot reach prerendered HTML without making all 38
routes dynamic — `/`'s flight payload is 304 KB per request on a single Riyadh
origin, and a cacheable nonce is a CSP bypass by construction. Hashes are
buildable but cost a 5.5 KB `script-src` header on `/`, a pinned build ID and a
two-pass Docker build whose failure mode is a **dead site**: one stale hash and
React never hydrates, invisible to `next build` and to any header check.

The audit's rationale is also wrong. It argues the directive is the only barrier
against "a compromised build-time dependency" — but such a dependency ships
inside the first-party bundle served from `'self'`, which no nonce or hash policy
constrains. `connect-src 'self'` is the barrier either way.

Corrections: the literal is at `proxy.ts:59`, not `proxy.ts:23`. The audit's "no
`dangerouslySetInnerHTML`" is false — three uses exist (`app/layout.tsx:69`,
`app/calculators/[slug]/page.tsx:183`, `components/calculator/score-tabs.tsx:59`),
all build-time constant, so the conclusion survives but the evidence does not.
`ADR-security-headers.md:16` says "~17 inline scripts" per page; `/` has 101.

### SPC-WEB-002 — the one that looked easy, and is not

- [ ] Dropping `style-src 'unsafe-inline'` on the /admin tier needs
      `app/global-error.tsx` fixed first.

The first pass found exactly one inline `<style>` reaching /admin and called it
near-zero risk. The re-check refuted that: `app/global-error.tsx` is the **root**
error boundary, it replaces the root layout for every route, there is no
admin-local `error.tsx`, and it is entirely inline-styled. Tightening the
directive would strip the styling from the one screen that renders when
everything else has already failed.

Corrections: the directive is at `proxy.ts:68`, the nonce at `proxy.ts:92-94`.
`ADR-security-headers.md:41` justifies it with "React sets a few inline style
attributes", false for the admin subtree. Note CSP3 `style-src` **does** govern
`style=` attributes, via the `style-src-attr` fallback.

### SPC-DB-005 — worse than "no scheduler"

- [ ] The retention purge cannot run in production at all as things stand.

`packages/db/scripts/purge-retention.mjs` is correct and parameterised, but
`apps/web/Dockerfile` copies only `.next/standalone`, `.next/static` and
`public`. The script is imported by nothing, so Next never traces it and **it is
not in the production image** — `docker exec` into the running container cannot
run it under any schedule. `packages/db/package.json` has no purge script either.

The safest scheduler is a root systemd timer on the OCI VM reusing the existing
`docker run --network coolify --env-file ...` pattern that already runs
migrations as owner. GitHub Actions must be rejected: it would put
`towardpcc_owner` credentials into a cloud CI secret store, a larger exposure
than the retention gap it closes.

### SPC-TM-002 — sessions renew forever

- [ ] Idle timeout and revocation. Higher severity than filed.

`auth.ts:49` is `{ strategy: "jwt", maxAge: 8h }` with no adapter and no session
model in the Prisma schema, so nothing server-side can invalidate a token. The
audit calls this "absolute lifetime only" — wrong: `@auth/core` re-signs the JWT
with a fresh `exp` and re-sets the cookie on **every** `GET /api/auth/session`,
never consulting `updateAge` on the JWT path. Anyone holding the cookie can renew
it indefinitely; the only reason a legitimate operator is logged out at 8h is
that this app has no `SessionProvider` and never calls that endpoint. The same
staleness voids `lockedUntil` and the OWNER/EDITOR role for a token's life.

The proposed fix was refuted as producing an **infinite redirect loop on its
normal path**: `app/admin/login/page.tsx:10` redirects an authenticated session
to `/admin`, while the guard redirected back to `/admin/login` without clearing
the cookie.

### SPC-TM-001 — auth events still never reach the audit trail

- [ ] Record login success, failure, TOTP replay, recovery-code burn, lockout
      and logout in `AuditLog`.

`recordAudit` is called from exactly four content-mutation server actions and
from nothing in the auth path; `auth.ts` has zero references. These events exist
only as pino lines on stdout, and `lib/logger.ts:15` redacts `*.email`, so even
that record is low-attribution. No migration, grant or env var is needed — the
app role already holds INSERT on `AuditLog`.

The proposed fix was refuted: it computed the IP hash at statement level outside
any try/catch, so a missing `SUBMISSION_IP_SALT` would become **100% admin login
failure** rather than a missing audit row. (The audit's `auth.ts:84` pin is
stale — that is now the cookie block.)

### SPC-CON-009 — decided and written down, 2026-08-01

- [x] `dumb-init` stays unpinned. The decision is recorded at the suppression
      itself in `.github/workflows/ci.yml`, so the next reader meets it there
      rather than re-litigating it.

The item was never really "pin it or not" — CI had already decided by
suppressing hadolint `DL3018`, the rule that catches exactly this, while two
documents still tracked it as open. What was missing was a written reason, and
the reason that WAS written was wrong: both said "base is digest-pinned,
therefore reproducible". The digest pins the layers already in the base image;
`apk add` resolves against the live Alpine index at build time, so the installed
revision is precisely what the digest does not fix. That rationale originated in
the CI comment and was inherited by the audit.

The real reason to leave it unpinned: a pinned apk version is dropped from the
index when the Alpine branch moves on, which turns a security update into a hard
build failure at an unpredictable moment. `dumb-init` is a PID-1 reaper with no
network surface, running before the image drops to the non-root `app` user. What
actually covers it is the Trivy scan on every code commit, which is where a
vulnerable or substituted package would be caught.

Unlike `docker-compose.prod.yml`, this Dockerfile is genuinely in effect —
Coolify builds from it. The audit's `Dockerfile:25` locator is stale; it is
line 53.

### SPC-SUP-002 — one third done, and signing would attest to the wrong artefact

- [ ] Provenance and signing, only after the builder moves.

The SBOM exists (`ci.yml:228-241`, anchore/sbom-action to SPDX-JSON), so the
audit's "no SBOM" is stale. But CI never runs `docker push`: the image is built
into an ephemeral runner's daemon, scanned and destroyed, while **Coolify builds
its own image on the OCI host**. Signing the CI image would attest to an artefact
that never existed in production and whose digest differs from the deployed one.
Cosign without moving the builder is theatre.

### SPC-API-002 — the rewrite relocated the trust rather than removing it

- [ ] Anti-forgery on the client-IP resolver.

`resolveClientIp` validates nothing on the Cloudflare path, which serves 100% of
live traffic today, and stakes the edge path entirely on one hand-observed
infrastructure behaviour with no in-code check. The "Client IP is Cloudflare's"
item above is ticked, but its own caveat — "widening those rules re-opens
CWE-348 and means revisiting that file" — was triggered by the KSA migration work
and never acted on.

### Gitleaks pre-commit

- [ ] Add a graceful-degradation hook; installing the binary needs a human.

`.husky/pre-commit` is one line (`pnpm exec lint-staged`) with no secret scan.
The hook is writable today and would stay inert-but-loud until a binary exists;
what is blocked is installing gitleaks on this box (Windows 11 ARM64; no go,
scoop or choco — only winget).

The proposed hook was refuted for reproducing the bug it claimed to fix: it
treated **any** non-zero gitleaks exit as a leak, and gitleaks exits non-zero for
usage, config-parse and git errors too.

`docs/prd/40-privacy-security.md:27` claims "gitleaks pre-commit and in CI" as
the current posture. Only the CI half exists; `SECURITY.md:22` is the honest one.
