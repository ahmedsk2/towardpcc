# P7 hardening & audit report

- Date: 2026-07-25
- Scope: full-stack audit of the whole application (P0–P6), across three
  independent read-only reviews — application security (SAST + secrets + deps),
  software supply chain / CI-CD, and production readiness — followed by
  remediation. Complements the P5 module review (docs/security/p5-security-report.md),
  which covered the auth/forms/admin surface in depth.

## Headline

**The application is fundamentally sound.** The reviews confirmed CLEAN on every
high-severity code-injection class: hardcoded secrets (none; `.env` never in
git history), unsafe deserialization, SSRF, path traversal / upload / zip-slip,
prototype pollution, ReDoS, `eval`/`new Function`/`innerHTML`/`dangerouslySetInnerHTML`
(none), insecure randomness (all CSPRNG), SQL injection (Prisma parameterized
only), and admin authorization (server-side re-guard on every page and action).
The CI/CD pipeline was already hardened (SHA-pinned actions, least-privilege
token, frozen installs, disabled dependency build-scripts, checksum-verified
gitleaks). Findings were hardening, not fundamental flaws.

## Findings and disposition — all fixed or tracked

| #   | Sev                   | Area         | Finding                                                                                                                                                               | Disposition                                                                                     |
| --- | --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | MED                   | Code         | Service worker cached authenticated `/admin` pages (submitter PII) via the defaultCache catch-all — offline-servable on a shared device / readable via `caches.match` | **Fixed** — NetworkOnly rule for `/admin`, matched before defaultCache (`app/sw.ts`)            |
| 2   | (High CVE, low reach) | Deps         | `sharp`/libvips + `postcss` known-vulnerable transitively via `next` (build-time / no untrusted-image path)                                                           | **Fixed** — pnpm overrides `postcss ≥8.5.18`, `sharp ≥0.35.0`; prod audit now zero              |
| 3   | MED                   | Supply-chain | No dependency-vulnerability gate in CI                                                                                                                                | **Fixed** — `deps` job gates `pnpm audit --prod --audit-level=high`                             |
| 4   | HIGH                  | Prod-ready   | DB backup + tested restore not defined/tracked                                                                                                                        | **Fixed (procedure) + tracked (P8 drill)** — docs/runbooks/backup-restore.md + LAUNCH-BLOCKERS  |
| 5   | MED                   | Prod-ready   | Base image not digest-pinned; no graceful shutdown; Dockerfile missing packages/db                                                                                    | **Fixed** — digest-pinned base, `dumb-init` PID 1, packages/db copied                           |
| 6   | MED                   | Prod-ready   | No robots/sitemap (and `/admin` crawlable)                                                                                                                            | **Fixed** — robots.ts (disallow /admin) + sitemap.ts                                            |
| 7   | LOW                   | Supply-chain | SHA-pinned actions frozen; no auto-update; checkout persists token; no job timeouts                                                                                   | **Fixed** — dependabot.yml; `persist-credentials:false` on build jobs; `timeout-minutes`        |
| 8   | LOW                   | Prod-ready   | No RFC 9116 security.txt; stale middleware→proxy comment                                                                                                              | **Fixed** — .well-known/security.txt; comment corrected                                         |
| 9   | INFO                  | Both         | dev-only dep advisories (brace-expansion, tmp, uuid); HSTS-preload before TLS; structured logging; container build/scan in CI                                         | **Tracked** — dev-only excluded from the gate; the rest are P8/pre-launch LAUNCH-BLOCKERS items |

## Verified clean (no change needed)

CSP two-tier (strict nonce on /admin, documented scoped unsafe-inline on SSG
public pages with no injection surface); error pages leak nothing; `X-Powered-By`
off; secrets untracked with only placeholders in `.env.example`; compose binds
to 127.0.0.1; SECURITY.md present. Code quality: zero `any`/`as any` in source,
no `@ts-ignore`/`@ts-expect-error` in app code, no stray TODOs.

## Coverage & honesty notes

- The SAST review ran without `gitleaks`/`semgrep`/`osv-scanner` installed on the
  dev box (targeted Read/Grep + `pnpm audit`); the authoritative secret sweep is
  the pinned gitleaks CI job over full history.
- Finding #1's shared-device serving and the CVE reachability calls were reasoned
  from source; confirm #1 at runtime (DevTools → Cache Storage after visiting
  `/admin` in a production build) during the P8 staging validation.
- The full `prod-ready:audit --ci` and a container image scan run at P8 against
  the built image (tracked).
