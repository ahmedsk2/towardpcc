# Security Policy

TowardPCC treats security as a launch requirement, not a feature. The
platform is healthcare-adjacent: it hosts clinical calculators (all
computation client-side; no inputs transmitted) and collects minimal
contact/request data through forms.

## Reporting a vulnerability

Email **[CONTACT_EMAIL] <!-- TODO:variable -->** with details and
reproduction steps. We aim to acknowledge within 72 hours. Please do not
open public issues for security reports, and allow reasonable time for a
fix before disclosure.

## Scope

towardpcc.com and this repository. The separate PedsCC Library codebase has
its own process.

## Practices (v1 baseline)

Strict CSP and security headers · server-side Zod validation on every input
· Prisma parameterization only · CSRF protection and rate limiting on all
mutations · Argon2id password hashing, mandatory TOTP for admin · audit
logging of admin actions · dependency audit + gitleaks in CI · encrypted
backups with a tested restore runbook.
