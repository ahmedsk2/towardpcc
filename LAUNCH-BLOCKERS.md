# Launch Blockers

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

- [ ] **Domain trust program (TM-008, high/firm)** — registrar + registry lock,
      org-owned auto-renew payment method and contact email, renewal calendar
      with two owners, DNSSEC, CAA records, CT-log + lookalike monitoring,
      defensive typo/sibling registrations, dangling-DNS hygiene. The Saudi
      Critical Care Society's lapsed domain is squatted by a gambling site —
      that exact fate must be impossible for towardpcc.com. (P8, before DNS)
- [ ] **SMTP relay + email authentication (TM-008)** — the app side is done:
      `lib/mail-config.ts` reports what is missing, the admin inbox banners it,
      and the relay is specified in `docs/runbooks/email-delivery.md` (OCI
      Email Delivery, `me-riyadh-1` — chosen to keep mail bodies in-region
      rather than widening ADR-0003 further). **Outstanding, and owner-only
      because it mints a credential:** create the email domain + DKIM selector + approved sender in the OCI console, generate SMTP credentials, add
      SPF/DKIM/DMARC as grey-cloud DNS records, set the four `SMTP_*` values in
      Coolify. Start DMARC at `p=none` and move to `p=quarantine` once reports
      show legitimate mail passing — publishing `p=reject` before the first
      send is how a domain blackholes its own mail. (Before any form
      notification.)
- [ ] **HSTS preload-list submission (P8)** — the `Strict-Transport-Security`
      header already sets `preload`, but do NOT submit the domain to the browser
      preload list until HTTPS is confirmed working on the apex AND every
      subdomain — preload is hard to reverse and would break any plain-HTTP
      subdomain.
- [~] **CSP + security headers ship WITH P5** (TM-005). DONE: strict static
  security headers (HSTS, nosniff, Referrer-Policy, X-Frame-Options, a
  restrictive Permissions-Policy, COOP) + a two-tier CSP in
  apps/web/proxy.ts — verified the app hydrates under it
  (docs/decisions/ADR-security-headers.md). **Remaining:** the `/admin`
  strict nonce+strict-dynamic CSP tier (wired with the admin build), then
  re-run `sec-web` and record the grade. Public pages use scoped
  `script-src 'unsafe-inline'` (SSG constraint; no injection surface there).
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
- [~] **SPC-DB-001 (high)** — **prepared:** least-privilege `towardpcc_app` role
  (CRUD-only via default privileges) created in `docker/postgres-init`, and
  the prod web service now connects as it while `migrate` keeps the owner
  (docker-compose.prod.yml). **Remaining:** verify the grants against the live
  DB during bring-up (deploy.md §3b has the check).
- [~] **SPC-DB-003** — **prepared:** `docker/sql/10-audit-append-only.sql` revokes
  UPDATE/DELETE on `AuditLog` from the app role; deploy.md §3b applies it and
  notes the retention purge must run under the owner. **Remaining:** apply +
  verify live.
- [ ] **SPC-DB-002 — reframed 2026-07-27 after checking production.** The
      original item (enforce `sslmode=verify-full`) assumed the risk was
      eavesdropping on the app→Postgres link. Two things found on the host
      change that:

      _Good news:_ the Postgres container holds **only** `towardpcc`. The other
          tenants on the box — including the patient-data application — run MySQL
          and MariaDB in separate containers, so changing this Postgres has no
          blast radius beyond this app. The runbook's "shared-services Postgres"
          wording overstates the coupling.

          _Less good:_ `ssl = off`, and the container sits on Coolify's shared
          `coolify` Docker network alongside other tenants' application containers.
          Sniffing a bridge needs host-level privilege so eavesdropping is not the
          live threat — but **reachability** is: a compromised neighbour container
          can open a connection to the database port. Password auth and the
          least-privilege `towardpcc_app` role are what stand in front of it.

          So the higher-value fix is **network segmentation** (a dedicated network
          for web↔postgres, which the threat model already asked for at §2.5),
          with TLS second. Both touch Coolify-managed infrastructure and can be
          reverted by a Coolify redeploy, so neither is a drive-by change; do them
          deliberately, with the restore drill re-run afterwards.

- [ ] **SPC-WEB-001** — remove public-tier CSP `script-src 'unsafe-inline'` (hash
      the Next bootstrap or render dynamically) + a CI sink guard. Documented SSG
      tradeoff; fix needs hydration testing.
- [~] **SPC-CON-001..008** — container hardening. **Done in-repo:** `cap_drop:
[ALL]` (+ minimal `cap_add` per service), `no-new-privileges`, per-service
  CPU/memory/PID limits, edge/data network split (`data` internal), and all
  third-party images digest-pinned (docker-compose.prod.yml). **Remaining:**
  secrets via Docker `secrets:`/`_FILE` (needs an app entrypoint), read-only
  rootfs + tmpfs (verify live), and a CI image build + Trivy/hadolint gate.
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
