# Launch Blockers

Running list of everything that must be resolved before public launch.
Working agreement §16.1: every placeholder on the site is marked in code
AND listed here.

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
- [ ] **Database backup + tested restore drill (P8, prod-readiness HIGH)** —
      procedure written (docs/runbooks/backup-restore.md); the scheduled
      encrypted, in-region backup and a _tested_ restore must be stood up on the
      deployed OCI infra before launch. A backup never restored is not a backup.
- [ ] **Container image build + scan in CI (P8)** — the Dockerfile is hardened
      (non-root, healthcheck, digest-pinned base, dumb-init) and now copies
      packages/db, but the image is not built/scanned in CI. Add a
      `docker build` + Trivy/hadolint job before staging. Verify the standalone
      output ships Prisma's WASM query compiler (driver-adapter runtime).
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
- [ ] **Email authentication before first send (TM-008)** — SPF, DKIM,
      DMARC `p=reject`, MTA-STS. (P8, before any form notification)
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
