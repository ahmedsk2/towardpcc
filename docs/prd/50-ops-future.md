<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 11, 12). Load only the slice a phase needs. -->

## 11. Deployment & operations

Everything containerized; `docker-compose.prod.yml` for a single-VM KSA deployment (web + postgres + umami + backups) behind Caddy or Nginx with automated TLS. Write `docs/runbooks/deploy.md`, `backup-restore.md` (with a rehearsed restore), and `incident.md` in the operations-runbook style: exact commands, rollback steps, escalation. Configure uptime monitoring (self-hosted Uptime Kuma or provider equivalent) and error tracking (self-hosted Sentry/GlitchTip — keep PII out of events). Environments: local (compose) → staging → production; `.env.example` always current. When `[HOSTING_TARGET]` is chosen, verify the region is actually in Saudi Arabia before pointing DNS — the residency claim on the site depends on it.
---

## 12. Future-proofing (build the doors now, walk through later)

**Mobile apps (Android/iOS):** the plan is React Native/Expo consuming the same `/api/v1` (OpenAPI-typed client) and importing `packages/scoring-engine` unchanged — so: keep the engine free of DOM/browser APIs (CI-enforced), keep all business logic behind the API rather than in page components, and keep auth token-ready even while v1 is admin-only. The PWA (§6.5) serves mobile users until then.
**Arabic later:** all strings already live in the `content/` dictionary layer; adding `next-intl` + RTL styling later is additive, not a rewrite. Build no switcher now.
**Registry (year two):** lands on `Organization/Unit` + the scoring engine + the audit-log pattern; nothing in v1 may contradict that path (write ADRs when in doubt).
**Events module (deferred to last):** keep the door open architecturally (Submission pattern generalizes) but build and mention nothing.
**PedsCC Library convergence:** if/when the library moves under towardpcc.com or shared SSO, that's a fresh ADR + plan — not an ad-hoc merge.
---
