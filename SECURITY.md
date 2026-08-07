# Security Policy

TowardPCC treats security as a launch requirement, not a feature. The
platform is healthcare-adjacent: it hosts clinical calculators (all
computation client-side; no inputs transmitted) and collects minimal
contact/request data through forms.

## Reporting a vulnerability

Email **info@towardpicu.com** with details and
reproduction steps. We aim to acknowledge within 72 hours. Please do not
open public issues for security reports, and allow reasonable time for a
fix before disclosure.

## Scope

towardpcc.com and this repository. The separate PedsCC Library codebase has
its own process.

## Practices

**In place today:** secret scanning of the full git history (gitleaks,
pinned and checksum-verified) in CI · lockfile-frozen installs · non-root,
healthchecked containers · commit-signing-ready history hygiene.

**v1 launch gate (built and verified across P5–P8, before any public
deploy):** strict CSP and security headers · server-side Zod validation on
every input · Prisma parameterization only · CSRF protection and rate
limiting on all mutations · Argon2id password hashing with mandatory TOTP
for admin · audit logging of admin actions · dependency audit in CI ·
encrypted backups with a tested restore runbook. Progress is tracked in
`LAUNCH-BLOCKERS.md`.
