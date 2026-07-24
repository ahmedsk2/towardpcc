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
      but unverified; run `docker compose --env-file .env.example config` then
      `docker compose up -d --build` the moment it lands (P0 gap). WAMP does
      not cover this (no containers, no PostgreSQL).
- [x] GitHub remote — approved by founder 2026-07-24; created during P0.

## Content / legal

- [ ] Legal pages need counsel review (`TODO:counsel-review` markers, P6)
- [ ] Calculator validator slots empty by design — badge shows
      "Independent clinical validation: pending" until real names provided
- [ ] Tier-B instruments blocked on per-instrument IP checks (P3+)
