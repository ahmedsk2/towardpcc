# Security Audit — Consolidated Report (RPT)

- **Target:** TowardPCC — pre-launch pediatric-critical-care web app
- **Date:** 2026-07-25
- **Domain:** `report` (aggregation of 7 domain envelopes)
- **Sources merged:** `code`, `web`, `api`, `container`, `database`, `supply-chain`, `threat-model`
- **Boundary:** This is a **static-analysis roll-up of candidates**, not a pentest, certification, or compliance attestation. No dynamic evidence was added. Items marked `tentative` require the named dynamic tool to confirm. "Coverage %" below is **check coverage**, never a pass/fail compliance claim. Secrets remain masked.

---

## 1. Executive summary

| Severity               | Count  |
| ---------------------- | ------ |
| Critical               | 0      |
| High                   | 1      |
| Medium                 | 14     |
| Low                    | 14     |
| Info                   | 5      |
| **Total (post-dedup)** | **34** |

Raw findings across all domains: **40**. After cross-domain de-duplication (6 collapsed): **34**.

**Overall risk rating: MEDIUM.** No critical and no live/exposed secret. Risk is concentrated in (a) one **high** database least-privilege defect, (b) an authentication brute-force throttle that self-disables after one cycle, and (c) a broad band of container/DB/supply-chain hardening gaps that are individually medium but collectively material for a healthcare-adjacent PII target.

### Top 5 priorities (severity × exploitability × reachability)

1. **SPC-DB-001 — App connects to PostgreSQL as superuser/owner** (high, firm). Any web-app compromise or future raw-query path = full DBMS control, including erasing the audit trail. Reachable from the internet-facing app. _Immediate._
2. **SPC-CODE-001 — Account lockout never re-armed after first window** (medium, firm). The primary online brute-force control (PRD §9) is permanently defeated after the first 15-min lockout; TOTP is then the only barrier. Deterministic static logic. _Immediate._
3. **SPC-DB-003 — AuditLog append-only is convention-only, not DB-enforced** (medium, firm; corroborated by `database` + `threat-model`). Because the app is DB superuser, a hijacked admin session or SQL foothold can rewrite/erase forensic history. _Short-term._
4. **SPC-WEB-001 — Public-tier CSP ships `script-src 'unsafe-inline'`** (medium, firm; corroborated by `web` + `code` + `threat-model`). Removes CSP as the last-line structural barrier protecting the calculator "nothing is transmitted" privacy invariant against a compromised dependency. _Short-term._
5. **SPC-CON-001 — Production secrets injected as plain env vars** (medium, firm). `AUTH_SECRET` + `TOTP_ENC_KEY` (the admin-auth crypto root) are readable via `docker inspect` / `/proc/<pid>/environ` and inherited by child processes. _Short-term._

### Launch-blocker call

- **Blocker: SPC-DB-001 (high).** Least-privilege DB role should land before public launch for a PII-handling healthcare-adjacent app.
- **Blocker: SPC-CODE-001 (medium but auth-critical).** The intended brute-force throttle is inert after one cycle; fix is a few lines + one test.
- **Strongly recommended pre-launch:** SPC-DB-003, SPC-WEB-001, SPC-CON-001. The remaining container hardening (caps, no-new-privileges, read-only, resource limits, image scan gate) should be a fast pre-launch batch but is not individually gating.

### "Not assessed" headline

This pass is **entirely static** (no `trivy`/`grype`/`gitleaks --all`/`osv-scanner`/`hadolint`/live HTTP/live DB). The biggest unclosed gaps: **no dependency/image CVE scan or SBOM was run**, **git secret-history was not scanned**, **no live-wire header/TLS/cookie verification**, and **no runtime access-control test** of `/admin` (incl. the Next.js middleware-bypass CVE-2025-29927 class). Full union in §6.

---

## 2. De-duplication ledger

Identity key = normalized(path) + line-range + CWE class + symbol. On merge: keep highest severity, strongest confidence, union sources/refs, note corroboration.

| Merged ID   | Root cause                                                   | Collapsed from                                                                                   | Result                                        |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| SPC-WEB-001 | Public-tier CSP `script-src 'unsafe-inline'` (proxy.ts:23)   | web (med/firm, CWE-79) + code (low/tent, CWE-1021) + threat-model (low/tent, CWE-1021)           | **medium / firm**, corroborated by 3 scanners |
| SPC-DB-003  | AuditLog append-only not enforced by DB grants               | database (schema.prisma:90, med/firm, CWE-778) + threat-model (audit.ts:16, med/tent, CWE-284)   | **medium / firm**, corroborated by 2          |
| SPC-API-002 | Client-IP `x-real-ip` trusted as rate-limit key              | api (submissions.ts:113, low/tent) + threat-model (submissions.ts:111, med/tent), CWE-348        | **medium / tentative**, corroborated by 2     |
| SPC-API-003 | Submission rate limiter in-memory + fixed global DoS ceiling | api (submissions.ts:64, med/tent, CWE-770) + threat-model (submissions.ts:60, med/tent, CWE-770) | **medium / tentative**, corroborated by 2     |
| SPC-CON-006 | Third-party images on floating/mutable tags                  | container (dc.prod.yml:84, low/firm) + supply-chain (dc.prod.yml:84, med/firm), CWE-1357         | **medium / firm**, corroborated by 2          |

**Kept distinct (shared file, different defect):** SPC-CODE-001 (lockout never re-arms, auth.ts:32) vs SPC-API-001 (no per-IP throttle / lockout-as-DoS, auth.ts:54) — same file & CWE-307, different symbol and root cause; cross-referenced, not merged.

---

## 3. Findings (sorted: severity ↓, confidence ↓, reachability ↓)

> Confidence legend: `confirmed` > `firm` > `tentative`. Every `tentative` names the dynamic tool that would confirm it.

### HIGH

#### SPC-DB-001 — Application connects to PostgreSQL as superuser / DB owner

- **Severity:** high · **Confidence:** firm · **Source:** database
- **Location:** `docker-compose.prod.yml:31` (also :70; `docker-compose.yml:15`)
- **CWE:** CWE-250 / CWE-269 · **OWASP:** A04:2021 Insecure Design / A01:2021 Broken Access Control
- **Evidence:** `DATABASE_URL=postgresql://${POSTGRES_USER}:...@postgres:5432/${POSTGRES_DB}`; `POSTGRES_USER` is the `postgres:16-alpine` bootstrap **superuser** and owner of the DB. Only umami gets a scoped role. App runtime does plain CRUD via Prisma but holds superuser.
- **Impact:** Web-app compromise (or any future raw-query path) executes with full DBMS control: read/write every table, read the co-located umami DB, disable RLS, alter roles, DROP/TRUNCATE, and delete the audit trail. Superuser bypasses any table-level GRANT hardening, so append-only/retention cannot be enforced against the app.
- **Remediation:** Create a least-privilege `towardpcc_app` role (CONNECT/USAGE + SELECT/INSERT/UPDATE/DELETE on tables, USAGE on sequences, matching default privileges); keep DDL under a separate owner role used only by the `migrate` profile. Grant-by-grant rollback; never re-point the app at superuser.
- **Confirm (dynamic):** `SELECT rolsuper FROM pg_roles` on an authorized instance.

### MEDIUM

#### SPC-CODE-001 — Account lockout never re-armed after the first window expires

- **Severity:** medium · **Confidence:** firm · **Source:** code
- **Location:** `apps/web/auth.ts:32`
- **CWE:** CWE-307 · **OWASP:** A07:2025 Identification and Authentication Failures
- **Evidence:** `bumpFailure()` re-lock is gated on `!updated.lockedUntil`; after the first lockout `lockedUntil` holds a non-null **past** date, only cleared by `resetData` on a successful login (auth.ts:92). So `!updated.lockedUntil` is permanently false and the account never re-locks while `failedLoginCount` keeps incrementing with no effect.
- **Impact:** After one 15-min window, unlimited online guessing against Argon2id + 6-digit TOTP. Mandatory TOTP raises the bar (~10^6/skew window) but the intended per-account throttle (PRD §9) is defeated.
- **Remediation:** Re-arm when threshold crossed AND (`!lockedUntil` OR lock in the past); reset counter on stale-lock observation. Add a unit test asserting a second lockout triggers after the first expires.
- **Related:** SPC-API-001 (missing per-IP throttle compounds this).

#### SPC-WEB-001 — Public-tier CSP allows `script-src 'unsafe-inline'` (XSS defense-in-depth waived)

- **Severity:** medium · **Confidence:** firm · **Source:** web (+ code, threat-model) — corroborated by 3 scanners
- **Location:** `apps/web/proxy.ts:23`
- **CWE:** CWE-79 / CWE-1021 · **OWASP:** A03:2025 Injection / A04:2021 Insecure Design
- **Evidence:** `buildCsp()` with no nonce (every non-`/admin` path) emits `script-src 'self' 'unsafe-inline'`, applied to all public + calculator routes.
- **Impact:** Today's injection surface is low (SSG static content, no `dangerouslySetInnerHTML`, calculator routes barred from `searchParams` by `content/privacy-invariant.test.ts`, user content only under strict `/admin` nonce tier). But a future reflected/DOM sink **or a compromised build-time dependency** injecting inline script faces no CSP barrier — and on calculator pages `connect-src 'self'` becomes the _only_ structural barrier to the "nothing is transmitted" privacy invariant. `base-uri 'none'`/`object-src 'none'` partially contain it.
- **Remediation:** Hash the known Next inline bootstrap (`__next_f`) scripts on SSG pages, or render those pages dynamically so the existing nonce path applies; drop `'unsafe-inline'`. Add a CI guard that fails if any public route gains a user-controlled render sink while `'unsafe-inline'` is present. Keep time-boxed in `ADR-security-headers.md`.
- **Confirm (dynamic):** ZAP / CSP-bypass reachability against an authorized URL.

#### SPC-DB-002 — TLS not enforced on the app→PostgreSQL connection

- **Severity:** medium · **Confidence:** firm · **Source:** database
- **Location:** `packages/db/src/index.ts:23` (DATABASE_URLs: dc.prod.yml:31,70,87; dc.yml:15; .env.example:12)
- **CWE:** CWE-319 (client verification CWE-295) · **OWASP:** A02:2021 Cryptographic Failures
- **Evidence:** `new PrismaPg({ connectionString })` with no TLS options; no `?sslmode=` on any URL. node-postgres defaults to **no SSL**, so submission PII, admin password/TOTP writes, and query traffic cross the link in cleartext.
- **Impact:** A sniffer on the container/host network (another compromised container, misconfigured overlay, or future DB-host split) reads PII and credential material in flight. Blast radius limited today by single-VM internal Docker network → medium not high.
- **Remediation:** `?sslmode=verify-full&sslrootcert=...` (or `ssl` object to PrismaPg); server `ssl=on` + `hostssl ... scram-sha-256`. `prefer` as interim if cert-chain blocks startup.
- **Confirm (dynamic):** `SELECT ssl_is_used()` / `openssl s_client`.

#### SPC-DB-003 — AuditLog append-only / tamper-evidence is convention-only, not DB-enforced

- **Severity:** medium · **Confidence:** firm · **Source:** database + threat-model — corroborated by 2 scanners
- **Location:** `packages/db/prisma/schema.prisma:90`; `apps/web/lib/admin/audit.ts:16`
- **CWE:** CWE-778 / CWE-284 · **OWASP:** A09:2021 Logging & Monitoring Failures / A04:2021 Insecure Design
- **Evidence:** Schema/`audit.ts` assert "code never updates or deletes" and "tamper-evident by construction", but there is **no** REVOKE UPDATE/DELETE, no trigger, no hash-chain; migrations are CREATE-only. Because the app is DB owner/superuser (SPC-DB-001) it can freely UPDATE/DELETE audit rows. `scripts/purge-retention.mjs:43` also `deleteMany()`s AuditLog, so "never deletes" is already untrue in code.
- **Impact:** A hijacked admin session or SQL foothold can rewrite/erase audit history, defeating non-repudiation for a healthcare-adjacent trust target (PRD §9).
- **Remediation:** Grant runtime role INSERT/SELECT only on AuditLog (REVOKE UPDATE/DELETE); run retention purge under a separate maintenance role. Optional prior-row hash chain for tamper-evidence.
- **Confirm (dynamic):** GRANT/REVOKE state against the live DB.

#### SPC-API-001 — No per-IP / global rate limit on admin auth; lockout is remotely triggerable (DoS)

- **Severity:** medium · **Confidence:** tentative · **Source:** api
- **Location:** `apps/web/auth.ts:54` (lockout consts auth.ts:14; loginAction admin/login/actions.ts)
- **CWE:** CWE-307 · **OWASP:** API2:2023 Broken Authentication / A07:2025
- **Evidence:** Credentials `authorize` and `/api/auth/[...nextauth]` have only per-account lockout (MAX_FAILED=5 / 15min), no per-IP/global throttle — unlike the public forms' `rateLimit()`.
- **Impact:** (1) Anyone knowing an admin email can lock that admin for 15 min on demand and rotate across all admins (targeted auth DoS); (2) no IP throttle → credential-stuffing hits the DB+Argon2id path at full rate. Mandatory TOTP limits actual takeover → availability/abuse, not bypass.
- **Remediation:** Per-IP (+ modest global) limit in front of the credentials flow (reuse the submissions.ts sliding window, keyed on hashed IP), before the DB lookup. Prefer soft/self-resetting throttle or CAPTCHA over hard lockout for the DoS case, or scope lockout to (account+IP). Confirm Caddy also rate-limits `/api/auth`.
- **Confirm (dynamic):** Burp Intruder / schemathesis against an authorized target.

#### SPC-API-003 — Submission rate limiter in-memory + fixed global DoS ceiling, no per-identity cap

- **Severity:** medium · **Confidence:** tentative · **Source:** api + threat-model — corroborated by 2 scanners
- **Location:** `apps/web/lib/submissions.ts:60,64`
- **CWE:** CWE-770 · **OWASP:** API4:2023 Unrestricted Resource Consumption / A04:2025 / A04:2021
- **Evidence:** `ipHits Map` + `globalHits[]` back PER_IP 5/10min and GLOBAL 300/10min; per-instance (resets on restart, unsound across replicas — acknowledged as P8). No per-email/per-payload cap; Turnstile off by default with no in-code activation trigger. Honeypot+time-trap stop only naive bots.
- **Impact:** With >1 replica the per-IP and global ceilings multiply by replica count (also multiplying outbound admin-notification email). A distributed botnet with unique IPs can exhaust the 300/10min accepted-write ceiling to deny clinician submissions; a restart wipes abuse state.
- **Remediation:** Shared store (Redis/Upstash sliding window) or gateway enforcement before scaling past one replica; pin to a single replica as a launch constraint until then. Add per-email + payload-size caps, queue-depth/accepted-rate alerting, and a written threshold runbook to flip Turnstile on. Keep record-on-accept.
- **Confirm (dynamic):** load test / Burp Intruder; replica count in prod.

#### SPC-API-002 — Client-IP derivation trusts `x-real-ip` / rightmost XFF (spoofable off-proxy)

- **Severity:** medium · **Confidence:** tentative · **Source:** api + threat-model — corroborated by 2 scanners
- **Location:** `apps/web/lib/submissions.ts:111-124` (hash 126-129)
- **CWE:** CWE-348 · **OWASP:** API4:2023 / A04:2021 Insecure Design
- **Evidence:** `clientIp()` returns `x-real-ip` first unconditionally, else rightmost XFF hop; this value is both the per-IP rate-limit key and the seed for the forensic `ipHash`. Safe only behind a single proxy that overwrites `x-real-ip` — a deployment property, not enforced in code.
- **Impact:** If the Next container is reachable off-proxy (published port, in-network SSRF, compose/firewall misconfig), an attacker rotates `x-real-ip` per request for a fresh rate-limit bucket (bypassing per-IP; global still applies) and poisons the forensic trail.
- **Remediation:** Only trust `x-real-ip` from the known proxy (allowlist / injected shared-secret header); bind app to internal network, publish only 80/443; ensure Caddy overwrites `x-real-ip` and strips inbound client XFF/x-real-ip.
- **Confirm (dynamic):** reachability analyzer against prod compose + Caddyfile.

#### SPC-TM-001 — Authentication lifecycle events never reach the tamper-evident audit trail

- **Severity:** medium · **Confidence:** tentative · **Source:** threat-model
- **Location:** `apps/web/auth.ts:84` (also 27-38, 89)
- **CWE:** CWE-778 · **OWASP:** A04:2021 Insecure Design
- **Evidence:** `authorize()` logs login success/failure only via pino to stdout; `bumpFailure`/lockout call no `recordAudit`. Every _mutation_ is audited but the auth surface is not. `logger.redact` scrubs email/name so stdout auth logs are also low-attribution.
- **Impact:** No durable, tamper-evident record of failed-login bursts, lockouts, new-device or successful admin sign-ins — only ephemeral stdout an on-host attacker can rotate away. Cripples ATO/credential-stuffing investigation.
- **Remediation:** Write auth events (login success, failed password/TOTP, lockout set, recovery-code used) to AuditLog; alert ADMIN_EMAIL on failed-login bursts / new-device logins. Pairs with SPC-DB-003.
- **Confirm (dynamic):** facilitated threat-model session; verify audit rows on a live login harness.

#### SPC-CON-001 — Production secrets passed as plain env vars (not Docker secrets / `_FILE`)

- **Severity:** medium · **Confidence:** firm · **Source:** container
- **Location:** `docker-compose.prod.yml:29` (AUTH_SECRET :32, TOTP_ENC_KEY :33, SUBMISSION_IP_SALT :34, SMTP_PASSWORD :40, POSTGRES_PASSWORD :31/52/103, UMAMI_APP_SECRET :89)
- **CWE:** CWE-532 · **OWASP:** A05:2021 Security Misconfiguration
- **Evidence:** High-value secrets delivered via `environment:` (sourced from host env, then materialized as container env).
- **Impact:** Readable via `docker inspect` / `/proc/<pid>/environ`, inherited by child processes (pg backup shell, umami node), leak into crash dumps/verbose logs. TOTP AES key + AUTH_SECRET are the admin-auth crypto root.
- **Remediation:** Move to Compose `secrets:` (file-backed) + `_FILE` convention (native `POSTGRES_PASSWORD_FILE`; app reads mounted file at startup). Refs: CIS Docker 5.x, NIST 800-190 §3.1.3.

#### SPC-CON-002 — Containers retain full default Linux capability set (no `cap_drop: ALL`)

- **Severity:** medium · **Confidence:** firm · **Source:** container
- **Location:** `docker-compose.prod.yml:26` (all services)
- **CWE:** CWE-250 · **OWASP:** A05:2021
- **Evidence:** No `cap_drop:` anywhere; Docker's default ~14-cap set (CHOWN, SETUID, NET_RAW, MKNOD…) granted to each.
- **Impact:** An app RCE in internet-facing web/Caddy inherits NET_RAW (spoof/sniff), SETUID, etc., widening post-exploitation/escape surface.
- **Remediation:** `cap_drop: [ALL]` on every service; `cap_add` back the minimum (typically none for Next.js; NET_BIND_SERVICE for Caddy if needed). Refs: CIS Docker 5.3.

#### SPC-CON-003 — `no-new-privileges` security option not set

- **Severity:** medium · **Confidence:** firm · **Source:** container
- **Location:** `docker-compose.prod.yml:26`
- **CWE:** CWE-250 · **OWASP:** A05:2021
- **Evidence:** No `security_opt: ["no-new-privileges:true"]` on any service.
- **Impact:** A setuid/setgid binary in any layer (or added via compromised dep) can re-escalate inside the container, undermining the non-root `USER app` posture.
- **Remediation:** Add `security_opt: [no-new-privileges:true]` to each service. Refs: CIS Docker 5.25.

#### SPC-CON-004 — Writable container root filesystem (no `read_only`)

- **Severity:** medium · **Confidence:** firm · **Source:** container
- **Location:** `docker-compose.prod.yml:26`
- **CWE:** CWE-732 · **OWASP:** A05:2021
- **Evidence:** No `read_only: true` and no scoped `tmpfs` on web/caddy/umami/uptime-kuma.
- **Impact:** Code-exec attacker can drop tools, tamper binaries, persist.
- **Remediation:** `read_only: true` on stateless services (web, caddy) + `tmpfs:` for required write paths (`/tmp`, Next cache). Refs: CIS Docker 5.12; NIST 800-190 §4.2.

#### SPC-CON-005 — No Dockerfile lint or image vulnerability scan gate in CI

- **Severity:** medium · **Confidence:** firm · **Source:** container
- **Location:** `.github/workflows/ci.yml:1`
- **CWE:** CWE-1104 · **OWASP:** A06:2021 Vulnerable & Outdated Components
- **Evidence:** No trivy/hadolint/dockle/grype/scout or `docker build` in `.github`. CI runs gitleaks/quality/deps/e2e/lighthouse but never builds/lints/scans the image.
- **Impact:** Prod image (base OS + bundled Node deps) reaches the single-VM host with no automated CVE gate or Dockerfile lint. **This is also the gap behind the whole "not assessed" CVE posture.**
- **Remediation:** CI job to build + `hadolint --failure-threshold warning` + `trivy image --exit-code 1 --severity HIGH,CRITICAL --format sarif`, upload SARIF. Refs: NIST SSDF PW.7/PW.8.

#### SPC-CON-006 — Third-party images pinned by floating/mutable tag, not digest

- **Severity:** medium · **Confidence:** firm · **Source:** container + supply-chain — corroborated by 2 scanners
- **Location:** `docker-compose.prod.yml:84` (umami `:postgresql-latest`; also caddy:2-alpine :11, postgres:16-alpine :48, postgres-backup-local:16-alpine :97, uptime-kuma:1 :116)
- **CWE:** CWE-1357 · **OWASP:** A08:2021 Software & Data Integrity / SLSA build-integrity
- **Evidence:** No `@sha256` digest on any non-app image; `postgresql-latest` is a mutable `latest` tag. (App image base IS digest-pinned — good.)
- **Impact:** A moved/re-pushed tag silently swaps layers under the running stack — distribution-layer tampering vector; non-reproducible deploys.
- **Remediation:** Pin each by immutable digest; bump via Dependabot/Renovate; optionally `cosign verify` before pull. Refs: CIS Docker 4.2; SLSA.

### LOW

#### SPC-WEB-002 — `style-src 'unsafe-inline'` applied unconditionally, incl. the strict /admin tier

- low · firm · web · `apps/web/proxy.ts:32` · CWE-79 · A03:2025
- Constant directive in `buildCsp()`, so even the /admin nonce tier allows arbitrary inline styles → CSS exfiltration (attribute-selector + `background:url()`) / UI redressing. Residual risk low (admin content is React-escaped plain text). **Fix:** nonce/hash styles (reuse the proxy.ts:53 nonce for style-src on /admin) or extract to static CSS.

#### SPC-WEB-003 — Auth.js session-cookie Secure flag / `__Secure-`/`__Host-` prefix implicit, not explicit

- low · tentative · web · `apps/web/auth.ts:47` · CWE-614 · A05:2025
- No `cookies`/`useSecureCookies` block; Secure + prefix derived at runtime from `X-Forwarded-Proto` (via `trustHost:true`). Caddy terminates TLS and proxies plain HTTP, so Secure depends on Caddy forwarding the header. A proxy/header regression would silently issue the admin cookie without Secure/prefix. **Fix:** pin `useSecureCookies` in prod and/or an explicit `__Host-authjs.session-token` cookies block. **Confirm:** live authenticated Set-Cookie capture.

#### SPC-WEB-004 — Analytics/status subdomains bypass the app's hardened header layer

- low · tentative · web · `docker/Caddyfile:20` · CWE-1021 · OWASP Secure Headers
- `analytics.*`→umami and `status.*`→uptime-kuma are proxied directly by Caddy, receiving no CSP/XFO/nosniff/Referrer/Permissions from the app layer. Clickjacking / missing-CSP on owned subdomains. **Fix:** shared Caddy `header {}` snippet on those blocks + access restriction (IP allowlist/auth). **Confirm:** curl/Observatory on the subdomains.

#### SPC-API-004 — AdminRole tier (OWNER/EDITOR) carried in JWT but never enforced

- low · tentative · api · `apps/web/lib/auth/guard.ts:19` · CWE-862 · API5:2023 BFLA / A01:2025
- `requireRole()` exists but is never imported; all protected pages/actions call only `requireAdmin()`, so an EDITOR = OWNER for every action. Inert two-tier model; latent gap the moment an OWNER-only action is added. **Fix:** wrap OWNER-only actions with `requireRole('OWNER')`, or remove the enum plumbing; add a test rejecting EDITOR. **Confirm:** authenticated Burp/ZAP access-control test (incl. CVE-2025-29927 middleware-bypass class).

#### SPC-DB-004 — Submission.payload stores contact PII as cleartext JSONB; at-rest protection infra-dependent

- low · tentative · database · `packages/db/prisma/schema.prisma:64` · CWE-311/312 · A02:2021 / GDPR Art.32
- name/email/message/affiliation/unit/country, retained 24 months, cleartext, no column encryption; confidentiality rests on the unverifiable "mount on ENCRYPTED block volume" note. No special-category PII → low. **Fix:** confirm pgdata + `./backups` on KMS-backed encrypted storage + encrypted `pg_dump`; consider pgcrypto/app-layer envelope encryption of the free-text field. **Confirm:** OCI infra inspection.

#### SPC-DB-005 — Retention purge exists but has no scheduler; 24mo/12mo deletion unproven

- low · tentative · database · `packages/db/scripts/purge-retention.mjs:4` · CWE-212 · A04:2021 / GDPR Art.5(1)(e)
- Correct parameterized `deleteMany` with 24mo (Submission)/12mo (AuditLog) cutoffs, but "run on a schedule (P8 ops)" with no cron/timer/compose artifact → PII may be retained indefinitely. Minor: `setMonth` end-of-month rollover drift. **Fix:** scheduled runner + failure alert; anchor cutoff to first-of-month. **Confirm:** prod scheduler presence.

#### SPC-CON-007 — No CPU/memory/PID resource limits on any service

- low · firm · container · `docker-compose.prod.yml:26` · CWE-400 · A05:2021
- No `mem_limit`/`cpus`/`pids_limit`/`deploy.resources.limits`; on a single shared VM a leak/fork-bomb/DoS against web/caddy can starve postgres. **Fix:** per-service limits sized to the OCI VM. Refs: CIS Docker 5.10/5.11/5.28.

#### SPC-CON-008 — Flat single network — no tier segmentation (edge/app/data)

- low · tentative · container · `docker-compose.prod.yml:121` · CWE-668 · A05:2021
- No `networks:`; all services share the default bridge and can reach postgres:5432. Host-port exposure is minimal (only caddy) but east-west is unrestricted. **Fix:** segmented `edge`/`data` networks, mark `data` `internal: true`. Cross-ref /sec-iac. Refs: CIS Docker 5.29.

#### SPC-CON-009 — `dumb-init` installed without a pinned version

- low · firm · container · `apps/web/Dockerfile:25` · CWE-1104 · A08:2021
- `apk add --no-cache dumb-init` unpinned (Hadolint DL3018). Low (base digest-pinned) but a rebuild after repo update could change it. **Fix:** `dumb-init=1.2.5-r3`.

#### SPC-CON-010 — Prisma WASM query-compiler bundling into standalone image not build-verified

- low · tentative · container · `apps/web/next.config.ts:9` · CWE-1395 · A06:2021
- Confirmed statically: `engineType="client"` + `@prisma/adapter-pg` → **no native engine ships** (positive: no engine-CVE surface). But `output:standalone` has no `outputFileTracingIncludes`/`serverExternalPackages`; if nft omits `query_compiler_bg.postgresql.wasm`, first DB query fails in prod. **Fix:** verify `.next/standalone` contains the `.wasm`; add tracing include if missing. **Confirm:** `next build --webpack` + exercise a DB path in the migrate/web container.

#### SPC-SUP-001 — gitleaks CI checkout persists GITHUB_TOKEN (missing `persist-credentials: false`)

- low · firm · supply-chain · `.github/workflows/ci.yml:94` · CWE-522 · A03:2025 Supply Chain / CICD-SEC-6
- gitleaks checkout omits `persist-credentials: false` (unlike the other 4 jobs), writing the token to `.git/config` for the job — read by the externally-fetched gitleaks binary. Blast radius limited (`contents: read`). **Fix:** add `persist-credentials: false` to the gitleaks checkout.

#### SPC-SUP-002 — Deployed web image has no build provenance, SBOM, or signature verification

- low · tentative · supply-chain · `docker-compose.prod.yml:27` (also :67) · CWE-1357 · A03:2025 / SLSA L1-L3 / NIST SSDF PS.2
- `image: ${WEB_IMAGE}` is an opaque externally-built ref; no CI build/publish, no cosign, no syft/CycloneDX SBOM, no SLSA/gh-attestation. Image can't be tied to the reviewed commit; no inventory for CVE-response. **Fix:** build in CI from the reviewed commit, generate CycloneDX SBOM (syft), signed SLSA provenance, cosign keyless sign+verify, pin WEB_IMAGE to a digest. **Confirm:** `cosign verify-attestation` / `slsa-verifier` against the real registry.

#### SPC-TM-002 — Admin JWT session has no idle timeout and no server-side revocation

- low · tentative · threat-model · `apps/web/auth.ts:48` · CWE-613 · A04:2021
- `session:{strategy:'jwt', maxAge:8h}` = absolute lifetime only; stateless JWT can't be revoked before expiry. A stolen token stays valid up to 8h. **Fix:** 30-min sliding idle timeout + a `sessionEpoch`/token-version claim compared per request (or DB session strategy) for force-logout.

#### SPC-TM-003 — Salted-truncated IP hash brute-forceable to re-identification if the static salt leaks

- low · tentative · threat-model · `apps/web/lib/submissions.ts:126` · CWE-329 · A04:2021
- `HMAC-SHA256(salt, ip)` truncated to 24 hex, single static salt across all rows. IPv4 = ~2^32 candidates; anyone holding a DB copy + the salt re-identifies every `ipHash` near-instantly. IPs are personal data (PDPL/GDPR). **Fix:** keep salt in strictly separate custody from DB/backups; document per-window salt rotation; set explicit `ipHash` retention/purge. Inherent to hashing low-entropy identifiers — salt custody is the real control.

### INFO

#### SPC-API-005 — Unauthenticated health endpoint discloses internal engine version

- info · **confirmed** · api · `apps/web/app/api/v1/health/route.ts:9` · CWE-200 · API9:2023 / A05:2025
- `GET /api/v1/health` returns `engine: ENGINE_VERSION` unauthenticated. Minor fingerprinting; no PII/creds. **Fix:** return only `{status:'ok'}` publicly; gate version to an internal readiness endpoint.

#### SPC-WEB-005 — Web security header scorecard (config-derived): Grade B

- info · firm · web · `apps/web/next.config.ts:14` · CWE-693 · OWASP Secure Headers
- Strong: HSTS preload; /admin nonce+strict-dynamic CSP; frame-ancestors none + XFO DENY; nosniff; Referrer-Policy; Permissions-Policy; COOP same-origin; `poweredByHeader:false`. Held below A by public-tier `script-src 'unsafe-inline'` (SPC-WEB-001) and unconditional `style-src 'unsafe-inline'` (SPC-WEB-002); no COEP/CORP; implicit cookie flags. **Confirm:** Mozilla Observatory / securityheaders.com once a URL is authorized.

#### SPC-WEB-006 — No explicit `no-store` cache directive on authenticated /admin responses

- info · tentative · web · `apps/web/app/admin/(protected)/submissions/[id]/page.tsx:14` · CWE-525 · A05:2025
- Admin relies on `dynamic='force-dynamic'`; no explicit `Cache-Control: no-store` on responses rendering submission PII. Real risk low (no shared CDN, Caddy no cache) but inferred. **Fix:** `Cache-Control: no-store, private` via next.config headers() for `/admin/:path*`. **Confirm:** on the wire.

#### SPC-WEB-007 — COEP and CORP not set

- info · firm · web · `apps/web/next.config.ts:31` · CWE-200 · OWASP Secure Headers
- COOP same-origin set; no COEP/CORP. Informational for the public tier; CORP would add value only on /admin + /api (Spectre-class). **Fix (optional):** `Cross-Origin-Resource-Policy: same-origin` scoped to /admin + /api.

#### SPC-DB-006 — `.env.example` ships a weak placeholder DB password reused across services

- info · firm · database · `.env.example:10` · CWE-1392 · A07:2021
- `POSTGRES_PASSWORD=change-me-dev-only` reused for UMAMI/MINIO/S3. Template only; real `.env` untracked (git ls-files shows only `.env.example`), compose enforces `${VAR:?}`. Documentation hygiene, **not a committed live secret**. **Fix:** obviously-invalid placeholders + a preflight rejecting the literal when `NODE_ENV!=development`.

---

## 4. Remediation tiers

### Immediate (0–7 days)

- **SPC-DB-001** — least-privilege DB role (blocks superuser blast radius + enables append-only enforcement).
- **SPC-CODE-001** — re-arm account lockout + regression test (auth-critical, trivial fix).

### Short-term (1–4 weeks)

- **SPC-DB-003** — DB-enforced append-only AuditLog (INSERT/SELECT only) + separate purge role.
- **SPC-WEB-001** — remove public-tier `script-src 'unsafe-inline'` (hash bootstrap or dynamic render) + CI sink guard.
- **SPC-CON-001** — move secrets to Docker `secrets:`/`_FILE`.
- **SPC-DB-002** — enforce TLS (`sslmode=verify-full`) app→postgres.
- **SPC-API-001** — per-IP throttle on admin auth; scope lockout to account+IP / CAPTCHA.
- **SPC-CON-002/003/004/005** — cap_drop ALL, no-new-privileges, read_only rootfs, CI image scan+lint gate.
- **SPC-CON-006** — digest-pin third-party images.
- **SPC-TM-001** — audit auth lifecycle events + failed-login alerting.

### Medium-term (1–3 months)

- **SPC-API-002/003** — trusted-proxy IP handling; shared-store rate limiter before scaling; per-email/payload caps + Turnstile trigger runbook.
- **SPC-WEB-002/003/004** — nonce/hash styles; pin cookie Secure/prefix; header snippet on analytics/status subdomains.
- **SPC-API-004** — enforce or remove OWNER/EDITOR role boundary + test.
- **SPC-DB-004/005** — verify at-rest encryption; wire the retention scheduler.
- **SPC-CON-007/008** — resource limits; network segmentation.
- **SPC-SUP-001/002** — persist-credentials:false; CI build + SBOM + SLSA provenance + cosign.
- **SPC-TM-002** — session idle timeout + revocation claim.

### Long-term (3–6 months, hardening / defense-in-depth)

- **SPC-CON-009/010** — pin dumb-init; verify Prisma WASM bundling.
- **SPC-WEB-006/007** — explicit no-store on /admin; COEP/CORP on /admin+/api.
- **SPC-TM-003** — IP-hash salt custody + rotation + purge.
- **SPC-API-005 / SPC-DB-006** — trim health-endpoint version; harden `.env.example` placeholder + preflight.

---

## 5. Compliance snapshot (best-effort **check coverage**, not a pass/fail attestation)

> Coverage = requirements with ≥1 corresponding check ÷ total. Un-checked requirements are **"not assessed,"** not "passed." This is a static candidate roll-up.

### OWASP Top 10 — 2021 / 2025 (mapped from findings)

| Category                                         | Checked?         | Findings                                                                           |
| ------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------- |
| A01 Broken Access Control                        | Checked          | SPC-DB-001, SPC-API-004                                                            |
| A02 Cryptographic Failures                       | Checked          | SPC-DB-002, SPC-DB-004                                                             |
| A03 Injection / 2025 (CSP/XSS)                   | Checked          | SPC-WEB-001, SPC-WEB-002                                                           |
| A04 Insecure Design                              | Checked          | SPC-API-003, SPC-TM-001/002/003, SPC-API-002                                       |
| A05 Security Misconfiguration                    | Checked          | SPC-CON-001..008, SPC-WEB-003/006/007                                              |
| A06 Vulnerable & Outdated Components             | **Partial**      | SPC-CON-005, SPC-CON-010 (config gaps flagged; **no CVE scan run — not assessed**) |
| A07 Ident. & Auth Failures                       | Checked          | SPC-CODE-001, SPC-API-001, SPC-DB-006                                              |
| A08 Software & Data Integrity                    | Checked          | SPC-CON-006, SPC-SUP-002                                                           |
| A09 Logging & Monitoring Failures                | Checked          | SPC-DB-003, SPC-TM-001                                                             |
| A10 SSRF (2021) / A10 Config-of-3rd-party (2025) | **Not assessed** | No SSRF sink analysis in this pass                                                 |
| A02:2025 Security Misconfiguration (relabel)     | Checked          | (see A05)                                                                          |

### OWASP API Top 10 2023

| Category                                             | Checked?         | Findings                                                  |
| ---------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| API1 BOLA                                            | **Not assessed** | No object-level authz test (needs authenticated Burp/ZAP) |
| API2 Broken Authentication                           | Checked          | SPC-API-001, SPC-CODE-001                                 |
| API3 BOPLA                                           | Not assessed     | —                                                         |
| API4 Unrestricted Resource Consumption               | Checked          | SPC-API-002, SPC-API-003                                  |
| API5 BFLA                                            | Checked          | SPC-API-004                                               |
| API6 Unrestricted Access to Sensitive Business Flows | Partial          | SPC-API-003 (submission flooding)                         |
| API7 SSRF                                            | Not assessed     | —                                                         |
| API8 Security Misconfiguration                       | Checked          | SPC-WEB-_, SPC-CON-_                                      |
| API9 Improper Inventory Management                   | Checked          | SPC-API-005                                               |
| API10 Unsafe Consumption of APIs                     | Not assessed     | —                                                         |

### CWE Top 25 (2023) — observed

Present in findings: CWE-79, CWE-250, CWE-307, CWE-862, CWE-732, CWE-311/312, CWE-522, CWE-200, CWE-770, CWE-400, CWE-319 (adjacent). Not evidence of absence for unlisted CWEs — this is candidate coverage only.

### Frameworks referenced but **not assessed** here (no corresponding dynamic check run)

- **Dependency/image CVE posture (osv-scanner/trivy/grype), SBOM** — no scan or SBOM produced → **SBOM: not assessed** (see §7).
- **CIS Docker Benchmark** — findings cite CIS 4.2/5.3/5.10-5.29 by pattern; **no docker-bench-security run**.
- **SLSA / NIST SSDF provenance** — SPC-SUP-002 flags absence; not verified against a registry.
- **PCI-DSS / HIPAA / SOC 2 / GDPR** — **no CHD/PHI in scope**; only GDPR Art.32/Art.5 touchpoints (SPC-DB-004/005, SPC-TM-003). No formal matrix computed — not an attestation.

---

## 6. Not assessed (union of all domains — honest coverage gaps)

**Cross-cutting:** entire pass is static; no scanner binaries available on the Windows-ARM64 box (semgrep/gitleaks/trivy/grype/hadolint/dockle/osv-scanner absent; gitleaks/`pnpm audit --prod` run in CI only).

- **Dependency & image CVE walk** — npm/pnpm audit, osv-scanner, trivy/grype not run; `pnpm-lock.yaml` present but unaudited; no OS/package CVE list, no EOL-base check, no node:24-alpine digest content verification.
- **Git secret HISTORY** — `gitleaks --log-opts=--all` not run; `.env` confirmed untracked and `.env.example` holds placeholders, but prior-commit leakage unscanned.
- **Live HTTP** — response headers/ordering/proxy-stripping, negotiated TLS protocol+cipher+cert chain, HTTP request-smuggling across the Caddy→Next HTTP/1.1 hop, runtime Set-Cookie flags, effective `Cache-Control` on /admin, header posture of analytics._/status._ subdomains (confirm: curl/Observatory/nuclei/testssl.sh/SSL Labs/smuggler.py/Burp).
- **Runtime access control** — that /admin + Server Actions are truly unreachable without a session (proxy.ts is NOT the auth boundary; guard lives in layout + each action); Next.js middleware-bypass CVE-2025-29927 class (confirm: authenticated Burp/ZAP).
- **Auth internals** — Auth.js CSRF/Origin enforcement for Server Actions (trusted by design); end-to-end confirmation the stale-`lockedUntil` path re-opens brute force (needs a live login harness).
- **CSP runtime delivery** — whether Next actually consumes the nonce on dynamic /admin pages.
- **Rate-limit/DoS runtime** — multi-replica behavior of the in-memory limiter, honeypot/time-trap effectiveness, whether Caddy overwrites x-real-ip / strips client XFF, whether prod runs >1 replica, email-amplification under sustained accepted-submission volume.
- **Container/host runtime** — actual seccomp/AppArmor profile, live capability set, real container UID; Prisma WASM tracing (`next build --webpack`); whether the host secret store feeding compose `${VARS}` is itself secured.
- **Database runtime** — live `rolsuper` of POSTGRES_USER; whether TLS is negotiated (`ssl_is_used()`); pgdata on an encrypted OCI block volume; exact postgres:16-alpine patch level + CVE exposure; contents of gitignored `.env`/`.env.local`; whether the retention purge is actually scheduled; backup encryption/key custody.
- **Supply chain** — public-registry claimability of `@towardpcc/*` (moot: all `private:true`, `workspace:*`); transitive postinstall behavior (pnpm 10 blocks build scripts by default; needs Socket/`--ignore-scripts` clean-room); branch protection / required reviews / signed commits (GitHub settings); GITHUB_TOKEN/secret scoping; live SCA/CVE walk; whether WEB_IMAGE is built/signed with provenance (`cosign verify`/`slsa-verifier`/`gh attestation verify`).
- **Threat model** — deployed network topology / off-proxy reachability; SMTP SPF/DKIM/DMARC alignment for towardpcc.com; future cross-origin analytics beacon reopening the privacy-invariant exfil path; live DB grants on AuditLog; end-to-end exploitability of every hypothesis (facilitated session + Burp/ZAP + schemathesis); backup encryption/key custody off-VM and log rotation.

---

## 7. SBOM

**Not assessed.** No input carried component/version/license/CVE inventory (supply-chain and container passes ran pattern-fallback only; no `syft`/`trivy`/`pnpm audit` output). No SBOM is fabricated. Generate a CycloneDX SBOM in CI (syft over the built web image + `pnpm-lock.yaml`) to close this — tracked under SPC-CON-005 / SPC-SUP-002.

---

## 8. Guidance-only boundary

This report is a static-analysis roll-up of **candidates**, not a pentest, certification, or compliance attestation. Every `tentative` item names the dynamic tool that would confirm it (ZAP / Burp / schemathesis / smuggler.py / testssl.sh / trivy / grype / osv-scanner / hadolint / cosign / slsa-verifier / a live login harness / a live psql session). "Coverage %" is **check coverage**, never a compliance pass. Absent domains (`/sec-iac`, `/sec-mobile`, `/sec-ai`) were **not assessed**. No fix was auto-applied; secrets remain masked.
