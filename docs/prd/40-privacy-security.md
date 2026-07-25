<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 8, 9). Load only the slice a phase needs. -->

## 8. Privacy engineering & the compliance voice of the site

### 8.1 Rules of construction

Data minimization everywhere; no third-party trackers, fonts (self-host), CDNs for personal-data pages, or embeds that phone home; Umami only (cookie-less, self-hosted — no consent banner needed for analytics, and don't add a decorative one); calculator inputs never leave the browser (§6.4); TLS 1.2+; encryption at rest for the DB volume; secrets in env/secret store only.

### 8.2 `/legal/data-protection` — a first-class trust page

Write it in plain English with a "for clinicians and IT departments" tone, covering: where data lives (**servers located in Saudi Arabia — Gulf region**); what we collect per feature and why (a simple table); what we deliberately don't collect (calculator inputs, cookies for tracking, patient data in v1); security posture summary (encryption in transit/at rest, access control + 2FA, audit logging, backups); retention per data type; how to reach us / request deletion at `[CONTACT_EMAIL]`; sub-processors (list the real ones only — hosting, email — once chosen).

### 8.3 Approved compliance wording (use this framing verbatim in spirit — overclaiming is prohibited)

> _"TowardPCC is hosted on servers located in Saudi Arabia and operates in alignment with the Saudi Personal Data Protection Law (PDPL). For the upcoming PICU registry, deployments will be configured to comply with the data-protection requirements of each participating Gulf country — including data-residency, consent, and governance requirements — in coordination with each institution."_
> Permitted claims: KSA hosting/residency; PDPL-aligned practices; per-country configurability for the registry; the concrete practices we actually do (client-side calculators, minimization, encryption, 2FA, audit logs). **Prohibited claims:** "PDPL/GDPR/HIPAA certified", "fully compliant with [law]" as a blanket badge, ISO/SOC certifications not held, or any regulator endorsement. Add `<!-- TODO:counsel-review -->` on the legal pages: final text gets a lawyer's pass before launch.

### 8.4 Where privacy notes must appear in the UI

Every calculator (client-side line) · every form (one sentence: what's collected, why, where stored, link to policy) · /data (residency + registry commitments, prominent) · /services ("no patient-identifiable data in requests") · footer trust line · /legal pages. Retention defaults: contact/interest submissions 24 months then purge; audit logs 12 months; document and enforce with a scheduled job.
---

## 9. Security baseline (build-time requirements; plugins are the gate)

Headers/CSP: strict Content-Security-Policy (nonce-based scripts; document the exact carve-outs the R3F hero needs and no more), HSTS, X-Content-Type-Options, Referrer-Policy `strict-origin-when-cross-origin`, restrictive Permissions-Policy, frame-ancestors `none`. Target an A grade from `sec-web`.
AppSec: Zod validation on every input server-side; Prisma parameterization only (no raw SQL); output encoding (no `dangerouslySetInnerHTML` except a sanitized, justified allowlist); CSRF protection on all mutations; rate limiting on every form/API POST (per-IP + global) with honeypot + time-trap; authz enforced server-side on all `/admin` and `/api/v1` handlers (BOLA/BFLA checks per `sec-api`); Argon2id password hashing; session cookies `HttpOnly; Secure; SameSite=Lax`; login throttling + lockout; TOTP mandatory; upload endpoints (if any ship) type-sniffed, size-capped, stored outside web root, served with `Content-Disposition`.
Ops: dependency audit + lockfile integrity in CI (`sec-supplychain` posture); gitleaks pre-commit and in CI; pinned, non-root, minimal Docker images with HEALTHCHECK (`sec-container` clean); automated encrypted DB backups with a **tested** restore runbook; error pages leak nothing (no stack traces, no framework fingerprints); structured logs with no PII; `SECURITY.md` with a responsible-disclosure contact.
Gates (mandatory, in order, before any deploy): `sec-threatmodel` after Phase 1 → module-level adversarial reviews on auth, forms, admin during build → full `security-pan-check:security-audit` → fix criticals/highs → `prod-ready:audit --ci` must pass → `sec-report` archived in `docs/`.
---
