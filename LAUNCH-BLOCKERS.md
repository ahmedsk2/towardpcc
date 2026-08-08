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
      **Changed to `info@towardpicu.com` on 2026-08-07** — that mailbox is
      confirmed working, and `towardpcc.com` publishes `v=spf1 -all`, so an
      address there can receive but can never legitimately reply.
      **Remaining:** verify the mailbox actually exists and receives mail
      before launch — a dead contact address is a trust failure.
- [x] `[ADMIN_EMAIL]` = ahmedsk2@gmail.com ("for now") — used as the form
      notification recipient env value in P5; never hardcoded in public code.
- [x] `[HOSTING_TARGET]` = founder's Oracle OCI tenancy. **Deployed region
      VERIFIED 2026-08-08**, closing the P8 gap below.

#### Deployed region: verified from instance metadata, not from config

The open question here was specifically that a config default proves nothing —
the residency claim depends on where the resources actually live. Asked the
running instance itself, which is the authority:

```bash
curl -s -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/instance/
```

Returns `region: me-riyadh-1`, `canonicalRegionName: me-riyadh-1`,
`availabilityDomain: rvud:ME-RIYADH-1-AD-1`. So compute is in Riyadh as claimed,
and the daily `check-residency.mjs` canary already asserts the serving path.

Backups were separately confirmed in-region (OCI Object Storage
`coolify-backups`, me-riyadh-1). **Still unverified by this check:** the OCI load
balancer staged for the edge migration, which is not yet serving traffic — worth
confirming at cutover, when it starts to matter.

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
- [x] **Pre-commit secret scanning — DONE.** gitleaks 8.24.3 was installed
      2026-08-07 (winget, hash-verified) and `.husky/pre-commit` runs
      `gitleaks protect --staged --redact --no-banner`, blocking the commit on a
      hit. Observed working on every commit through 2026-08-08. The hook still
      warns rather than fails when the binary is absent, deliberately, so a fresh
      clone is not bricked — CI remains the authority.
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

### Push-to-deploy: RESOLVED — it was working, and the diagnosis was wrong

- [x] **Closed 2026-08-07.** Merging to `main` deploys. No manual step is needed.

**This entry previously claimed four failures. One was real.** The correction is
recorded rather than deleted, because the mistake it describes is the more
useful artefact.

**What the evidence actually shows.** Coolify's own deployment queue
(`application_deployment_queues`, 156 rows) has an `is_webhook=true` deployment
for every single `main` push, and all of them reached `finished` with the
correct commit. Every "manual fix" in the history sits **one minute after** a
webhook deployment that had already been queued and went on to finish with the
same commit — the manual deploys were redundant and then took the credit.

**Why it looked broken.** Builds take **125–308 seconds** (measured across eight
webhook deploys) and Coolify performs a rolling update, so the previous
container keeps serving until the new one passes its healthcheck. The tag was
being checked about thirty seconds after each merge, which shows the old commit
every time and proves nothing. `Up 29 hours` on the old container was read as
"the deploy never happened" when it meant "the replacement is still building".

**The one real failure: 2026-08-03 04:13**, deploying `6f9945b` after PRs #35
and #36 merged three minutes apart. Its log ends
`Error response from daemon: No such container: z12fitlh15n9ir4zjlwxeviq` — the
helper container disappeared mid-build. So the original collision theory was
roughly right about the mechanism and wrong about the frequency: it has happened
once, under two merges in quick succession, not four times.

**What to do instead.** Merge and leave it. Check the image tag once, after the
build has had time (five minutes is comfortable), against `origin/main`:

```bash
sudo docker ps --filter name=gpsokvxzncr7ks1vzqz7wkr4 --format '{{.Image}}'
```

Deploy by hand only when a deployment genuinely reports `failed`. Coolify's
`status` field stays useless as a gate in either direction — it read
`running:healthy` over a stale container and `running:unhealthy` over one Docker
and both probes called healthy.

- [x] **The canary asserts the deployed commit**, 2026-08-08. `/api/v1/health`
      publishes `x-build-fingerprint` — a truncated `sha256(commit)`, NOT the
      commit, because that route deliberately says almost nothing (SPC-API-005)
      and a SHA is exactly the precise version string it had one removed from.
      The canary recomputes the digest from the SHA it checked out and compares.
      Skips rather than fails when no expected SHA is available, so a manual run
      raises no false alarm.

A stale-but-healthy deploy is exactly the failure a content canary cannot see,
and the one genuine 2026-08-03 failure went unnoticed until someone compared
tags by hand.

## Security (from docs/security/threat-model.md, 2026-07-24)

### TM-013 — calculator inputs reached the Cloudflare edge (CLOSED)

- [x] **Fixed, deployed, and no notification owed.** Founder decision,
      2026-08-07: the historical exposure requires no notification.

The leak is fixed and live (2026-08-05, `339b3fd`). The full account — what
happened, how it was measured, and why every existing guard missed it — is in
the ADR-0005 addendum and §2.3 of the threat model, which is where it belongs.

For the record on the notification question, since it was open for two days: the
values were clinical observations carrying no identifiers, the recipient was
Cloudflare acting as an infrastructure processor, and the scope could not be
reconstructed because there is no analytics and no server-side record of
calculator use — by design.

The dated retraction that stood on `/trust` was removed on 2026-08-07 on the
founder's instruction, once the notification question was settled. The record is
not thinner for it: the technical account is permanent in the ADR-0005 addendum
and §2.3 of the threat model, and the fix is enforced by the TM-013 cases in
`e2e/calculator-privacy.spec.ts`. What `/trust` states today is the claim as it
now stands, which is true and tested.

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

- [x] **Rewrite the residency copy in the SAME deploy as the DNS cutover** —
      done 2026-08-08. The claim did NOT become absolute: email still leaves in
      both directions, so the caveat moved from the CDN to the mail path rather
      than disappearing, and `privacy-claims.test.ts` still passes on all five.

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
which reads every message sent to `info@towardpicu.com` — the address printed on
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
- [x] **Back the single-region claim with a control** — done 2026-08-08. Quota
      `ksa-data-residency` zeroes ten data-bearing families wherever
      `request.region != me-riyadh-1`. A quota rather than an IAM policy because
      quotas fail closed and a deny policy has to enumerate services. Verified
      Riyadh itself was untouched (`standard-a1-core-count` still 41), since a
      wrong `!=` would have zeroed production's own region.

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

- [x] **SPC-WEB-001 — investigated 2026-08-08, deliberately NOT changed.** See
      `docs/decisions/ADR-csp-public-tier.md`. Hashing is buildable but costs a
      per-route manifest of 63 digests regenerated every deploy, and a single
      stale hash blocks hydration — a blank calculator, not an error. A partial
      migration is worse than none: per CSP3 any hash-source makes
      `'unsafe-inline'` ignored, so hashing our two scripts would break Next's
      seventeen `__next_f` blocks. The public tier has no injection point, and
      since the DNS cutover no third-party script executes at all — the strongest
      argument for hardening it was Cloudflare's unremovable injection, which is
      now gone. Revisit if a public route renders user content, or if a
      governance review requires it.
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
- [x] **SPC-DB-005 — scheduler created 2026-08-08.** Coolify task
      `retention-purge` runs `node /app/purge/purge-retention.mjs --skip-audit`
      daily at 03:00 in the app container. Verified against production with
      `--dry-run`: 0 submissions and 0 expired sessions due, audit correctly
      skipped. The `--skip-audit` half is the design, not a gap — AuditLog stays
      append-only to the app role (SPC-DB-003), so purging it remains a
      deliberate privileged action run as `towardpcc_owner`, never a nightly job
      that would need DELETE granted to the application.
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
- [x] **OPS-02 — DECLINED by the founder, 2026-08-07.** No secondary on-call
      contact will be named; bus-factor-one is an accepted operating condition.

If he is unreachable during an incident, nothing happens until he is reachable.
What makes that tolerable is that the calculators are client-side — a backend
outage never touches the core clinical tool — so the exposure is the submission
pipeline and the admin surface, not the bedside. Recorded as a decision so the
absence is not later read as an oversight.

- [ ] P8 deploy-gated (verify at go-live, not codebase defects): backup restore
      drill; CI image build + SBOM + signed provenance + scan; error tracker DSN + Uptime Kuma monitors + SLOs; branch protection + required review on main + a SAST job; OCI Vault for secrets + at-rest volume encryption; DPAs +
      PDPL breach clock + counsel privacy-policy review.

### PDPL breach clock — sourced 2026-08-07; two things left, both founder-only

- [x] **The duty is now written down**, in `docs/runbooks/incident.md` under
      "Regulatory notification (PDPL)", with sources.
- [ ] **Register on the National Data Governance Platform, before you need it.**
- [ ] **Name counsel who answers inside 72 hours, and settle the hour-60
      default now.**

`CMP-03` asked for "the PDPL 72h breach clock + SDAIA contact". The number turned
out to be right, and it was in the repo only as an unsourced open question — it is
now sourced to SDAIA's _Personal Data Breach Incidents Procedural Guide_, Issue
1.0, October 2024. **72 hours to notify SDAIA from becoming aware**, on a harm
test with no size floor; a separate and looser "without undue delay" duty to
notify data subjects; and no encryption carve-out, unlike GDPR.

**"SDAIA contact" was the wrong shape of question.** There is no contact to find:
notification is an e-service on the National Data Governance Platform, and
registration is a prerequisite that **cannot be completed inside the 72 hours**.
That is why registering is its own item rather than a step in the runbook.

**The hour-60 decision.** The patient-data runbook says to get counsel the same
day and not to notify on your own initiative. Against a hard deadline that is
incomplete, because silence from counsel at hour 60 is itself a decision. Settle
it in advance and record it here. The recommendation is to notify — the notice
carries no admission and late notice is the sanctionable failure — but it is the
founder's call to own, not the runbook's to assume.

**One coupling worth seeing.** The missing DPAs stop being paperwork here: a
processor who tells us late burns our own 72 hours, and there are three disclosed
sub-processors with no executed agreement.

### Admin lockout — CLOSED 2026-08-07, and the alarm was wrong

- [x] **Recoverable, with a two-command break-glass now documented.**

`docs/go-live-checklist.md` called this failure "unrecoverable", which was false.
Verified against production: one `OWNER` admin, all ten recovery codes present
and unconsumed, successful TOTP login that morning, clock NTP-synced. A fresh
recovery code can be minted with `psql` alone, because the stored hash is plain
`sha256(lowercased)` and Postgres yields a byte-identical digest — the statement
was dry-run on production inside a rolled-back transaction. Procedure is in
`docs/runbooks/deploy-production.md`.

The one credential genuinely worth protecting is the **`/admin` password**:
Argon2id cannot be recomputed on the host, so losing it costs about an hour of
re-seeding over an SSH tunnel. Worth a ten-second check that it is in a password
manager; nothing more.

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

### SPC-WEB-001 — WAIVED, and the live grade is recorded

- [x] **Waiver accepted 2026-08-07.** `'unsafe-inline'` stays in `script-src` on
      the public tier. This is a recorded decision, not an open item.
- [x] **Live grade measured the same day: A− public tier, A+ `/admin` tier.**

The A−/A+ split is caused by exactly this waiver and nothing else. Every other
header a scanner looks at is present at its strong value: HSTS
`max-age=63072000; includeSubDomains; preload`, `x-frame-options: DENY` alongside
`frame-ancestors 'none'`, `nosniff`, `referrer-policy:
strict-origin-when-cross-origin`, and a Permissions-Policy denying camera,
microphone and geolocation. `/admin` carries the strict nonce policy, so the
mechanism works where it can be applied.

The reasoning below is unchanged and is why the waiver is correct rather than
merely convenient.

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

### LB certificate expiry — 2026-10-27, and it is NOT what the runbook says

- [x] **Done 2026-08-07 — acme.sh installed and renewal automated, root's
      crontab provably untouched.**
- [x] **Push the renewed cert to the load balancer** — done 2026-08-08.
      `lb-cert-push.sh` runs after every daily acme pass, authenticating by
      instance principals so no API key exists on the host. Idempotent by
      certificate fingerprint and therefore self-healing.

Two corrections to the recorded state, both found 2026-08-07:

- **acme.sh is not installed on the host at all.** Only its config home survives
  at `/opt/acme-staging` (`account.conf`, `ca/`, `http.header`,
  `towardpcc.com_ecc/`). It was clearly run once from a temp location with
  `--config-home` and then removed. So this was never "no cron" — there is
  nothing to cron.
- **The description is in the wrong file.** It lives in
  `docs/runbooks/edge-migration-ksa.md` (lines ~164-169), not
  `deploy-production.md`, whose ACME mention is Traefik's separate and working
  HTTP-01 renewal for the Coolify domains.

The 2026-10-27 expiry is correct, verified three independent ways. Nothing is
blocking renewal: the **Cloudflare DNS-01 token is still present and still
valid**, so renewal works the moment acme.sh exists again.

**THE CO-TENANT HAZARD, and how it was handled.** root's crontab contains
exactly one job: the co-tenant's `backup-mylibrary-sqlite.sh` at 03:30 — the
off-site backup of an application holding real patient data. **acme.sh's
installer writes to root's crontab by default.** So it was installed with
`--nocron`, and the crontab SHA-256 captured before and after: byte-identical
(`5489fe46…9560`), re-checked after enabling the timer.

Renewal now runs as `acme-towardpcc.timer`, daily at 04:15 UTC with jitter —
clear of the Coolify backups at 03:00 and the co-tenant's at 03:30. acme.sh
3.1.4 was taken as a pinned release tarball rather than piped from a URL. The
service was run once: exit 0, reached Let's Encrypt, correctly skipped, next
renewal 2026-09-27.

**What is still manual: the upload to the load balancer.** The OCI CLI is not on
the host and was not installed there — it lives on the dev machine. A renewal
that never reaches the load balancer looks like success and fails at the edge
anyway, so this must be automated or diarised before any cutover.

Not urgent by date, but it gates the DNS cutover: cutting over with a cert that
nobody renews just moves the outage.

### SPC-DB-005 — investigated 2026-08-07; the plan changed twice

- [x] **Script rewritten onto `pg` and `--skip-audit` added**, 2026-08-07. No
      Prisma runtime is needed in the image at all.
- [x] **Script in the image, scheduled task created** — done 2026-08-08. The
      purge runtime ships with its own pinned `pg` tree, and the Coolify task
      `retention-purge` runs `node /app/purge/purge-retention.mjs --skip-audit`
      daily at 03:00. Verified against production with `--dry-run`: 0 submissions
      and 0 expired sessions due, audit correctly skipped.

**Nothing is due, and nothing can be until 2027-07-29.** `Submission` holds **0
rows**; `AuditLog` holds 3, the oldest dated 2026-07-29. This is a
claim-correctness problem — four public forms promise 24-month deletion with no
mechanism behind it — not a live retention breach. There is room to do it right.

**Coolify scheduled tasks work and are API-creatable**, so the mechanism is
settled. Two premises behind the earlier plan were wrong:

- **No co-tenant precedent.** The `scheduled_tasks` table is empty, so there is
  no house style to follow here.
- **The standalone image cannot run the script at all.** Next bundles
  `@prisma/client`, `@prisma/adapter-pg` and `pg` into `.next/server/chunks/*.js`.
  The one `@prisma/client` entry left on disk contains a single WASM file and
  zero JavaScript, and `/app/node_modules` holds nothing but `.pnpm` with no
  top-level symlinks. `node purge-retention.mjs` dies at its first import. It
  **needed** a small self-contained runtime shipped beside it — ~88 MB with an
  explicit three-dependency manifest, and `pnpm deploy` was worse at 323 MB
  including the Prisma CLI and Studio. **Resolved by removing the requirement
  instead:** the job does two counts and two deletes, each on one indexed date
  column, so it now uses `pg` directly — already a direct dependency of
  `packages/db`. Nothing extra ships. Both statements were run against the live
  schema on 2026-08-07 and resolved.

**The blocker nobody had flagged, and the reason this is not a one-liner.** A
Coolify task runs inside the **app** container, which holds `DATABASE_URL` for
`towardpcc_app` — and that role has INSERT + SELECT only on `AuditLog`, exactly
as SPC-DB-003 intends. The script would purge submissions, then fail the
audit-log half with `permission denied` and exit 1 — nightly, with retries.
Giving the web container owner credentials would mean a server-side RCE gains
DELETE on the append-only audit trail, which defeats the control outright.

So the work splits along the privilege boundary rather than fighting it:

- **Submissions (24 months — the actual public promise)** run from the app
  container on the existing credential. `towardpcc_app` already holds DELETE on
  `Submission`. No new secret anywhere.
- **Audit logs (12 months — and note the site says only "12 months", never "then
  deleted")** stay a privileged maintenance action, off the web container.

That needs a `--skip-audit` flag on the script, which is repo-visible and
testable. Without it the nightly job is permanently red.

Schedule at **03:30 UTC**, not 03:00 — Coolify's database backups all fire at
03:00, and the co-tenant's backup job is in root's crontab at 03:30, so neither
should be crowded. Create the task with `--dry-run` first and read one execution
before switching it live.

### SPC-DB-005 — worse than "no scheduler"

- [x] **The retention purge now runs in production** — 2026-08-08. The blocker
      was that the standalone image carried no `pg`; it now ships a separate
      pinned runtime at `/app/purge`, proven by running the script in the live
      container against the live database.

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

### Round-4 registry findings applied to PIM3 — 2026-08-08

- [x] **Liver-transplant divergence, plausibility bounds and the sentinel trap**
      all recorded in `pim3.ts` v1.2.3. Nothing computed changed.

The open liver-transplant decision is resolved by showing it **cannot** be
resolved from the paper: ANZPICR (Jan 2019) excludes post-transplant recovery
admissions and flags the difference from PIM2, PICANet (v5.4) includes them, and
both jointly supplied the derivation data. The score follows ANZPICR and shows
both.

PICANet's published per-field ranges give the input bounds a citable source for
the first time, in an expected/validation two-tier shape. Recorded with its own
structural negative: neither registry publishes ranges for platelets, bilirubin,
creatinine or MAP, because neither collects them.

And the 999-sentinel trap is written down before it can bite — this platform
parses no registry export today, so it is a note rather than a guard, to be
guarded in the same change as any import path.

### SPC-TM-002 — sessions renew forever

- [x] **Revocation and a real absolute expiry**, 2026-08-08, via a JWT
      allow-list. Detail below, including why the obvious fix was wrong.

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

#### Closed 2026-08-08 by a JWT allow-list — and the obvious fix was wrong first

**An adapter-shaped `Session` model was written, reviewed and removed before it
shipped.** It would have been **inert**: the table would have stayed empty
forever while the item looked closed, which is worse than leaving it open.
`@auth/prisma-adapter` appears in no `package.json`; the adapter calls
`prisma.user` where this schema has `AdminUser`, so `@@map` cannot help because
the client property comes from the model name; and Auth.js does not support
database sessions on the Credentials provider at all — `ADR-admin-auth.md:38`
already said exactly that.

**What shipped instead keeps `strategy: "jwt"` and adds an allow-list.**
`authorize()` mints a 256-bit random id, writes an `AdminSession` row holding
only `sha256(id)`, and returns the id in the user object. The `jwt` callback
looks the row up and returns `null` when it is missing or past `expiresAt`.
Revoking is deleting the row; it takes effect on that session's next request,
with no cache to wait for.

Both halves of the item close. Revocation works, and `expiresAt` is written once
at sign-in and never rewritten, so the renew-forever path leads to a dead session
after eight hours regardless of what the token's own `exp` claims.

##### Verified against the installed Auth.js, not against its documentation

Three links in the chain, each read in `node_modules` rather than assumed:

`auth()` does reach the callback — `next-auth/lib/index.js` builds a Request to
the session action and calls `Auth()` with the same callbacks, so the check runs
on every admin request rather than only at sign-in.

Returning `null` does invalidate — `@auth/core/lib/actions/session.js` guards the
session response with `if (token !== null)`, and its `else` branch calls
`sessionStore.clean()`, so a rejected token has its cookie cleared as well as
being refused.

The renew-forever claim is real — the same file re-signs the token with a fresh
expiry (`jwt.encode`, `newExpires`) on every session read, which is precisely why
an absolute column that nothing rewrites was needed.

##### Three things deliberately decided

The raw id is never stored, only `sha256` of it. It is a bearer credential that
bypasses both the Argon2id password and mandatory TOTP, and nightly `pg_dump`
plus routine operator `psql` access would otherwise each hand over live admin
sessions. A fast hash is correct here and a KDF is not: the input is 256 bits of
CSPRNG output, so there is no guessable space to make expensive, and Argon2 would
add cost to every admin request for nothing.

The id is minted with `randomBytes(32)`, not `cuid()` like every other id in the
schema. cuid is built for collision resistance and sortability, not
unpredictability, and guessing this value is a full admin session.

Tokens issued before this shipped carry no session id and are refused. That signs
current operators out once on deploy. Accepting them would have left a permanent
bypass — every pre-existing cookie unrevocable for its whole life, which is the
bug being closed.

##### Operating it

`packages/db/scripts/revoke-admin-sessions.mjs --email <address>` or `--all`,
with `--dry-run` to look first. It does not touch the password or TOTP secret, so
it is a "sign out everywhere" lever and not an account lock. The psql equivalent
is in the script header and the deploy runbook.

### SPC-TM-001 — logins reach the audit trail, successes and failures

- [x] **Login successes recorded**, 2026-08-07, with the second factor used and
      the remaining recovery-code count.
- [x] **Failures, lockouts, replays and unknown addresses recorded**, 2026-08-08,
      once the schema change that unblocked them landed.

`auth.ts` had zero references to `recordAudit`; successful logins now write
`admin.login` with `{ method, role }` and, on the recovery-code path,
`recoveryCodesRemaining`. A recovery-code login means the authenticator was
unavailable, which is worth seeing afterwards, and the remaining count makes
depletion legible before it becomes a lockout. No email, code or token enters
`diff`. A failed audit write logs loudly and lets the login proceed, because
locking the platform's only operator out is the worse failure.

**How failures were unblocked, 2026-08-08.** `AuditLog.actorId` was a required FK
to `AdminUser`, so a row could only be written when the account existed. Writing
one on a failed attempt against a REAL address and not against an unknown one
costs an extra INSERT on exactly one of those paths — restoring the
user-enumeration oracle `authorize()` is built to deny, since it runs Argon2id
against a dummy hash when no user exists precisely to keep the two costs equal.

`20260808120000_audit_nullable_actor` makes the column nullable so the write
happens unconditionally. `auditFailedLogin` in `auth.ts` now runs on every
rejection — bad credentials, lockout, TOTP replay, and the lost side of a
concurrent-login race — with a null actor when the address is unknown. Verified
end to end against a live database: both a real and an unknown address produce a
row, so there is no delta to measure.

The attempted address is stored as a salted HMAC, never in plaintext. It is
attacker-controlled unbounded personal data, and the scheduled purge runs
`--skip-audit`, so a raw address would sit in a table the app cannot delete from
until the 12-month sweep. Row growth is bounded by the per-IP throttle, which
rejects before any of this runs.

#### Two traps the database-security-scanner caught here

Both were verified by reproducing them, not by reading the diff.

Making the relation optional silently rewrote the foreign key to
`ON DELETE SET NULL` — Prisma's default for an optional relation, emitted by
`migrate diff` with no comment. Referential actions run outside the invoking
role's privileges, so that is a write path INTO the append-only table that
SPC-DB-003's `REVOKE` does not cover: as `towardpcc_app` with UPDATE and DELETE
both revoked, one `DELETE FROM "AdminUser"` blanked `actorId` across the trail.
Pinning `onDelete: Restrict` collapses the migration to a single
`ALTER COLUMN … DROP NOT NULL` and blocks the delete instead.

A nullable actor also needs a rule saying WHEN null is legitimate, or a future
code path could write an unattributed mutation. `AuditLog_null_actor_is_auth_event`
permits null only on the auth action allow-list; an unattributed
`submission.update` is rejected by the database. Proven by making it fail, not by
assuming it works.

An earlier proposed fix was refuted for an unrelated reason worth keeping: it
computed the IP hash at statement level outside any try/catch, so a missing
`SUBMISSION_IP_SALT` would have become **100% admin login failure** rather than a
missing audit row. (The audit's `auth.ts:84` pin is stale — that is now the
cookie block.)

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

### SPC-API-002 — chain A now validates too, 2026-08-07

- [x] **Shape-checking applied to every chain-A source.**

`isIpLiteral()` guarded chain B only, and the asymmetry was not deliberate:
`cf-connecting-ip`, `x-real-ip` and the rightmost forwarded hop were all returned
verbatim on the path serving 100% of live traffic. All three are checked now, and
a rejected value falls through to the next source rather than failing the
request — worst case `unknown`, which is a shared rate-limit bucket and the
documented fallback, rather than a poisoned forensic hash.

The argument was already in the file, written for chain B: a value is only
trustworthy if a proxy we trust actually wrote it. Chain A's safety rests on the
OCI security list admitting 80/443 only from Cloudflare's ranges, which
`client-ip.ts` itself calls "a DEPENDENCY, not an invariant" — so validation is
what holds on the day that dependency stops, rather than the day someone notices.

Six tests added, and proven to bite before landing: with the validation reverted,
five of the six fail. The sixth is a positive control (a valid IPv6 address is
still accepted) and passes either way, which is the point of including it.

**Still true, and not addressed here:** the edge path stakes chain-B detection on
one hand-observed infrastructure behaviour — that Traefik overwrites a
client-supplied `x-real-ip` once it trusts the upstream. That was verified by
sending a forged one against the running system, but it remains an observation
about topology rather than something the code can check.

The argument was already in the file, written for chain B: a value is only
trustworthy if a proxy we trust actually wrote it. Chain A's safety rests on the
OCI security list admitting 80/443 only from Cloudflare's ranges, which
`client-ip.ts` itself calls "a DEPENDENCY, not an invariant" — so validation is
what holds on the day that dependency stops, rather than the day someone notices.

Six tests added, and proven to bite before landing: with the validation reverted,
five of the six fail. The sixth is a positive control (a valid IPv6 address is
still accepted) and passes either way, which is the point of including it.

**Still true, and not addressed here:** the edge path stakes chain-B detection on
one hand-observed infrastructure behaviour — that Traefik overwrites a
client-supplied `x-real-ip` once it trusts the upstream. That was verified by
sending a forged one against the running system, but it remains an observation
about topology rather than something the code can check.

### Gitleaks pre-commit — DONE 2026-08-07

- [x] **Graceful-degradation hook added.** `.husky/pre-commit` runs
      `gitleaks protect --staged --redact` when the binary is present, and
      prints a one-line notice when it is not. Verified both branches.
- [x] **Binary installed 2026-08-07**, version 8.24.3 via winget with a verified
      installer hash. The hook now enforces.

Proven rather than assumed: staging a GitHub PAT pattern makes gitleaks exit 1
and the hook exit 1, blocking the commit. Note gitleaks allowlists the well-known
AWS _documentation_ example key, so that specific string will not trip it — real
credential patterns do. It resolves in any newly-opened terminal (winget updates
the User PATH).

Two things the previous entry had wrong. winget **does** carry gitleaks as a
portable (zip) install needing no admin rights, and it offers **the exact
CI-pinned 8.24.3** — its installer SHA256 was checked against the upstream
`gitleaks_8.24.3_checksums.txt` and matches. So this was never blocked on
anything but someone running it.

The hook warns rather than fails when the binary is absent, deliberately.
gitleaks is a Go binary and cannot be a repo dependency, so requiring it would
break `git commit` on a fresh clone — and a hook that blocks work it cannot
perform gets disabled with `--no-verify`, after which it protects nothing. CI
remains the authority either way: it installs a pinned, checksum-verified copy
and scans full history.

The proposed hook was refuted for reproducing the bug it claimed to fix: it
treated **any** non-zero gitleaks exit as a leak, and gitleaks exits non-zero for
usage, config-parse and git errors too.

`docs/prd/40-privacy-security.md:27` claims "gitleaks pre-commit and in CI" as
the current posture. Only the CI half exists; `SECURITY.md:22` is the honest one.
