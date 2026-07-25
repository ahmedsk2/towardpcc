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
- [ ] Path to the PedsCC Library repo on this machine (needed by P5 feature audit)

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
- [ ] **CSP + security headers ship WITH P5**, not P7 (TM-005) — forms and
      admin never run without them.
- [ ] **Privacy-invariant test suite (TM-001)** — Playwright zero-network
      calculator compute test + CI grep-guards (no useSearchParams /
      "use server" under calculator routes) + Umami configured to strip
      query/hash. Lands with P3 e2e and runs in CI forever.

## Content / legal

- [ ] Legal pages need counsel review (`TODO:counsel-review` markers, P6)
- [ ] Calculator validator slots empty by design — badge shows
      "Independent clinical validation: pending" until real names provided
- [x] Tier-B instrument IP checks done (docs/decisions/ADR-tier-b-ip.md,
      2026-07-25): all 8 stay unbuilt in v1 — 5 need permission (COMFORT-B,
      CAPD, SOS-PD, FLACC, Bedside PEWS), 4 need legal review. To build any,
      the founder must obtain written permission (FLACC/CAPD are the cleanest
      routes). Not a launch blocker for v1 (v1 ships the IP-clean scores).
- [ ] PWA raster PNG icons (192/512 + maskable) — currently SVG-only, which
      installs in modern browsers; generate PNGs before launch for maximum
      Android/Lighthouse compatibility (sharp unavailable on this ARM dev box).
