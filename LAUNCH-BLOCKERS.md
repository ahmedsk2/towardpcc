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
- [ ] **SPC-DB-002** — enforce TLS on the app→Postgres link (`sslmode=verify-full`).
      Deferred: single-host internal `data` network (now `internal: true`), medium
      severity; needs a postgres server cert. Follow-up during/after bring-up.
- [ ] **SPC-WEB-001** — remove public-tier CSP `script-src 'unsafe-inline'` (hash
      the Next bootstrap or render dynamically) + a CI sink guard. Documented SSG
      tradeoff; fix needs hydration testing.
- [~] **SPC-CON-001..008** — container hardening. **Done in-repo:** `cap_drop:
    [ALL]` (+ minimal `cap_add` per service), `no-new-privileges`, per-service
  CPU/memory/PID limits, edge/data network split (`data` internal), and all
  third-party images digest-pinned (docker-compose.prod.yml). **Remaining:**
  secrets via Docker `secrets:`/`_FILE` (needs an app entrypoint), read-only
  rootfs + tmpfs (verify live), and a CI image build + Trivy/hadolint gate.
- [ ] **SPC-API-001** — add a per-IP throttle in front of the admin credentials
      flow (reuse `apps/web/lib/rate-limit.ts`), scope lockout to account+IP or
      add a challenge, to blunt targeted auth-DoS + credential stuffing.
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
