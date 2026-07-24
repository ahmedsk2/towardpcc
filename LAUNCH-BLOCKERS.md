# Launch Blockers

Running list of everything that must be resolved before public launch.
Working agreement §16.1: every placeholder on the site is marked in code
AND listed here.

## Variables pending from founder

- [ ] `[CONTACT_EMAIL]` — public contact address (SECURITY.md, /contact, legal pages)
- [ ] `[ADMIN_EMAIL]` — form notification recipient (needed by P5)
- [ ] `[HOSTING_TARGET]` — KSA-region host; verify region physically before DNS (P8).
      Note: Infomaniak (connected MCP) is Swiss-hosted — does not satisfy residency.
- [ ] `[ORG_LEGAL_NAME]` — footer/terms; "TowardPCC" placeholder marked `TODO:legal`
- [ ] Path to the PedsCC Library repo on this machine (needed by P5 feature audit)

## Environment

- [ ] Docker Desktop not installed on the dev machine — compose stack authored
      but unverified; when it lands: `cp .env.example .env`, fill secrets, then
      `docker compose config` and `docker compose up -d --build`, and verify
      the unverified-by-design healthcheck endpoints (umami `/api/heartbeat`,
      mailpit `/livez`, minio `mc ready local`). WAMP does not cover this
      (no containers, no PostgreSQL).
- [ ] Pre-commit secret scanning deferred: `gitleaks protect --staged` needs a
      local gitleaks binary this machine doesn't have. Secrets are caught in CI
      (pinned, checksum-verified CLI). Install gitleaks locally by P5 (forms =
      first real secrets risk) and add it to `.husky/pre-commit`.
- [x] GitHub remote — approved by founder 2026-07-24; created during P0
      (private, https://github.com/ahmedsk2/towardpcc). Note: `corepack enable`
      fails without admin on this machine (EPERM in Program Files); pnpm is
      installed via `npm i -g pnpm@10.34.5`, documented in README.

## Content / legal

- [ ] Legal pages need counsel review (`TODO:counsel-review` markers, P6)
- [ ] Calculator validator slots empty by design — badge shows
      "Independent clinical validation: pending" until real names provided
- [ ] Tier-B instruments blocked on per-instrument IP checks (P3+)
