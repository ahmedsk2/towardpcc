# Changelog

All notable changes to TowardPCC are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project uses
[Conventional Commits](https://www.conventionalcommits.org/). The scoring engine
carries its own `ENGINE_VERSION` (bumped whenever a score's formula, bands, or
citations change — see `CONTRIBUTING`).

## [Unreleased] — pre-launch

Baseline for the first public launch (P0–P8 build complete; deployment/
infrastructure is the remaining P8 work tracked in `LAUNCH-BLOCKERS.md`).

### Added

- **Calculators** — 22 Tier-A pediatric-critical-care scores (scoring engine
  `ENGINE_VERSION` 0.2.0), each citing its source, with a 100% line+branch
  coverage gate and worked-example verification. Compute entirely client-side;
  nothing entered is transmitted or stored (airplane-mode e2e).
- **Home + pillar pages + forms** — signature hero, four-pillar bento, and the
  contact/services/knowledge/data forms (Zod-validated, honeypot + time-trap,
  per-IP + global rate limiting, salted IP hashing).
- **Admin** — Auth.js + Argon2id + mandatory replay-protected TOTP + per-account
  lockout; submission inbox, triage, append-only audit log.
- **Platform** — Serwist PWA, pino structured logging (PII-redacted), two-tier
  CSP + full static security-header set, hardened Docker/Caddy prod stack.

### Security

- Re-armed the per-account brute-force lockout after each window (SPC-CODE-001)
  and unit-tested the auth crypto + submission rate limiter with a coverage gate
  (TST-02). See `docs/security/security-audit-2026-07-25.md` and
  `docs/ops/production-readiness-review-2026-07-25.md`.

### Accessibility

- WCAG 2.2 AA pass (non-color state cues, focus idiom, table scopes,
  decorative-glyph `aria-hidden`); audit + whole-app sweep found zero genuine
  failures.
