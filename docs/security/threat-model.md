# TowardPCC v1 Threat Model

**Status:** Gate artifact for P5 (forms + admin). Produced 2026-07-24 on branch `p1/design-system`, per PRD §9 ("`sec-threatmodel` after Phase 1") and §15.
**Scope:** v1 architecture as specified in `.taskmanager/docs/prd.md` — implemented P0/P1 code plus planned P2–P8 components modeled as designed.
**Method:** STRIDE-per-element over a code-derived DFD; abuse cases for a healthcare-adjacent trust target; mitigations mapped to delivery phases.
**Honesty note:** this is advisory static reasoning. Most findings are `tentative` hypotheses to be confirmed by the P5 module-level adversarial reviews, the P7 `security-pan-check:security-audit`, and dynamic testing (ZAP/Burp on forms and admin, schemathesis on `/api/v1`). It complements — never replaces — the code-level scanners.

**Stack detected (implemented):** TypeScript strict, Next.js 16.2.11 App Router (standalone output, `poweredByHeader: false`, **no `headers()`/CSP yet**), pnpm 10 monorepo, `packages/scoring-engine` (pure TS, zero runtime deps), Tailwind v4, self-hosted fonts via `@fontsource` (§8.1 already real in `apps/web/app/layout.tsx`), docker-compose dev stack (postgres:16-alpine, `umami:postgresql-latest`, `mailpit:latest`, `minio:latest` — all loopback-bound, `${VAR:?}` fail-fast), non-root Dockerfile with HEALTHCHECK, GitHub Actions CI with SHA-pinned actions + checksum-verified gitleaks + `permissions: contents: read`. Only live API: `GET /api/v1/health`.

---

## 1. Data-flow model (v1 as specified)

### External entities

| ID  | Entity                                      | Notes                                                         |
| --- | ------------------------------------------- | ------------------------------------------------------------- |
| E1  | Anonymous visitor (clinician, bot, scraper) | Uses calculators client-side; submits public forms (§6.6–6.8) |
| E2  | Admin user (TowardPCC team)                 | Auth.js credentials + mandatory TOTP (§3, §6.9)               |
| E3  | Future mobile app (React Native)            | Consumes `/api/v1` per OpenAPI contract (§12)                 |
| E4  | SMTP provider / `[ADMIN_EMAIL]` recipient   | Provider-agnostic Nodemailer (§3); Mailpit in dev             |
| E5  | GitHub + npm registry                       | Source, Actions, dependency supply chain                      |
| E6  | DNS registrar / CA (Caddy ACME)             | towardpcc.com + sibling domains (§1, §10)                     |
| E7  | PedsCC Library (separate codebase)          | Linked out only; no integration in v1 (§1, §12)               |

### Processes / entry points

| ID  | Process                                                                                       | Phase           |
| --- | --------------------------------------------------------------------------------------------- | --------------- |
| P1  | Next.js web app — SSG/ISR public pages                                                        | live (P0/P1)    |
| P2  | Public form pipeline — server actions/route handlers, Zod, honeypot, time-trap, rate limit    | P5              |
| P3  | Admin app `/admin/*` — Auth.js + TOTP, inboxes, calculator meta, CSV export, audit log        | P5              |
| P4  | `/api/v1/*` REST — today only `/api/v1/health`; future mobile contract                        | live skeleton   |
| P5  | Client-side calculator runtime — scoring-engine bundle, URL-fragment share state, Serwist PWA | P2–P3           |
| P6  | Umami analytics service (separate container, cookie-less)                                     | live in compose |
| P7  | Mailer (Nodemailer → SMTP)                                                                    | P5              |
| P8  | Retention purge job (§8.4)                                                                    | P6              |
| P9  | Backup job (encrypted DB dumps, §9/§11)                                                       | P8              |
| P10 | CI/CD — GitHub Actions → Docker image → single VM                                             | live skeleton   |
| P11 | Reverse proxy Caddy/Nginx, automated TLS (§11)                                                | P8              |

### Data stores

| ID  | Store                                                                                                         | Sensitive contents                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Postgres (app DB)                                                                                             | `AdminUser` (Argon2id hash, **totpSecret**), `Submission` JSONB (PII, possibly accidental patient data), `CalculatorMeta`, `AuditLog`, dormant `Organization/Unit` (§7) |
| D2  | Umami DB (same Postgres instance, separate `umami` user/DB per `docker/postgres-init/01-create-databases.sh`) | Page-view telemetry                                                                                                                                                     |
| D3  | MinIO/S3 (barely used in v1)                                                                                  | —                                                                                                                                                                       |
| D4  | Browser-side: localStorage favorites, URL fragment state, service-worker precache                             | Calculator inputs **must live only here**                                                                                                                               |
| D5  | Logs: app structured logs, proxy access logs, error tracker (Sentry/GlitchTip, §11)                           | IPs, URLs — must never contain fragments/PII                                                                                                                            |
| D6  | Encrypted backups                                                                                             | Copy of D1                                                                                                                                                              |
| D7  | Secrets: `.env` on VM, GitHub Actions secrets                                                                 | DB creds, SMTP creds, `UMAMI_APP_SECRET`, Auth.js secret                                                                                                                |

### Trust boundaries

| ID  | Boundary                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TB1 | Internet ↔ reverse proxy (public edge; TLS termination)                                                                                                                                                         |
| TB2 | Unauthenticated ↔ authenticated admin (Auth.js perimeter over `/admin` and admin APIs)                                                                                                                          |
| TB3 | **The privacy invariant** — browser ↔ server for calculator inputs. This boundary must _never_ be crossed by score inputs (§2.3, §6.4). It is a negative requirement: the crown-jewel guarantee of the platform |
| TB4 | App container ↔ Postgres (Docker network)                                                                                                                                                                       |
| TB5 | App ↔ external SMTP provider                                                                                                                                                                                    |
| TB6 | Repo/CI ↔ npm + GitHub Actions marketplace (build-time supply chain)                                                                                                                                            |
| TB7 | Container ↔ container on the single VM (web, umami, postgres, backups co-tenant; §11)                                                                                                                           |
| TB8 | DNS/registrar/CA control plane (domain + email trust)                                                                                                                                                           |

### Key flows

- F1: E1 →TB1→ P11 → P1 (HTTPS pages, mostly static)
- F2: E1 browser-local: P5 computes in-page; share state → URL **fragment**; favorites → localStorage (never crosses TB3)
- F3: E1 →TB1→ P2 → D1 (form POST: pilot/interest/contact/services PII)
- F4: P2 → P7 →TB5→ E4 (submit notification to `[ADMIN_EMAIL]`)
- F5: E1 browser → P6 (`/api/send` pageview — path only; must exclude query and hash)
- F6: E2 →TB1,TB2→ P3 ↔ D1 (login, inbox triage, CalculatorMeta edits, AuditLog writes)
- F7: P3 → P7 → submitter email (status-change notification to an **unverified, attacker-supplied** address — §6.8)
- F8/F9: P8 purge → D1; P9 backup D1 → D6
- F10: E5 →TB6→ P10 → image → VM
- F11: E3 →TB1→ P4 (future)
- F12: E6 ↔TB8↔ P11 (DNS resolution, ACME issuance)

---

## 2. STRIDE per element (focus areas)

### 2.1 Public form pipeline (F3/F4/F7, P2 → D1 → P7)

| STRIDE | Threat                                                                                                | PRD/code mitigation                                                                    | Residual gap → finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S      | Submissions impersonate real clinicians/institutions; email field is unverified identity              | None claimed — submissions are leads, not accounts                                     | Treat all submission identity as unverified in admin UX; never auto-act on it. **TM-002**: §6.8's "email notifications on submit and status change" sends towardpcc.com email to an attacker-chosen address — backscatter spam, harassment-by-form, and phishing (attacker content echoed inside a legitimate towardpcc.com email)                                                                                                                                                                                                                    |
| T      | Malicious payloads stored in `Submission.payload` JSONB, later rendered in admin or exported          | Per-type Zod schemas (§7, §9)                                                          | Zod validates shape, not safety-on-render. **TM-003**: stored XSS in admin inbox and CSV/formula injection in the §6.9 CSV export (`=HYPERLINK(...)` in a project summary opens on an admin's Excel). PRD never mentions output encoding for admin views or CSV hardening                                                                                                                                                                                                                                                                             |
| R      | Disputed submissions ("we never sent that")                                                           | Source IP hash, salted + truncated, forensics-only (§7) — good privacy call            | Keep the salt stable per rate-limit window or correlation is lost; document in ADR-data-model                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I      | Clinicians paste patient-identifiable data into the 300-word services summary despite the §6.8 notice | Warning text only                                                                      | **TM-011**: no handling procedure exists for when it happens anyway (redaction workflow, audit note, purge). Payloads must also stay out of app logs and error-tracker events                                                                                                                                                                                                                                                                                                                                                                         |
| D      | Spam flood drowns the services queue (see abuse case AC-1)                                            | Honeypot + time-trap + per-IP rate limit (§3, §9); Turnstile documented off-by-default | Per-IP fails against distributed bots. Need global circuit-breaker, per-email caps, payload size caps, queue-depth alerting, and a written trigger for flipping Turnstile on. **TM-002/TM-012**                                                                                                                                                                                                                                                                                                                                                       |
| D      | **Per-IP limiting saw the proxy, not the visitor** (found and fixed 2026-07-27)                       | `lib/client-ip.ts` prefers `cf-connecting-ip`, with unit tests                         | Traefik has no `forwardedHeaders.trustedIPs`, so it rewrote `x-real-ip` from the connecting peer — a Cloudflare edge node. Every visitor collapsed onto a handful of addresses: the per-IP allowance became per-edge (one abuser exhausting it for everyone behind that node) and the salted abuse hash recorded Cloudflare. Trusting `cf-connecting-ip` is safe **only because** the OCI ingress rules admit 80/443 from Cloudflare alone, so the peer is guaranteed; widening those rules re-opens CWE-348 and means revisiting `lib/client-ip.ts`. |
| E      | Submission content is the payload; the admin's browser is the target — the pivot into TB2             | §9 CSP planned                                                                         | CSP is scheduled at P7 but forms+admin ship at P5 — **TM-005** (sequencing)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### 2.2 Admin auth/session surface (F6, P3, TB2)

| STRIDE | Threat                                                                                   | PRD/code mitigation                                                                     | Residual gap → finding                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S      | Credential stuffing / password reuse; AiTM phishing proxies that relay TOTP in real time | Argon2id, login throttling + lockout, mandatory TOTP, no public registration (§3, §9)   | TOTP is not phishing-resistant. **TM-004**: add passkeys/WebAuthn as the recommended admin second factor (P7 upgrade); keep the admin login URL unlinked; alert `[ADMIN_EMAIL]` on failed-login bursts and new-device logins                           |
| S      | TOTP seed theft from D1 turns 2FA into 1FA                                               | DB volume encryption at rest (§8.1)                                                     | Encrypt `totpSecret` at the application layer (separate key in env), not only volume-level — volume crypto does not protect against SQLi/backup leaks. Not in PRD — **TM-004**                                                                         |
| T      | Session fixation; CSRF on admin mutations                                                | `HttpOnly; Secure; SameSite=Lax`, CSRF on all mutations (§9)                            | Rotate session on login; absolute + idle timeouts (unspecified in PRD — pick 12h absolute / 30min idle for admin)                                                                                                                                      |
| R      | Admin denies an action; attacker erases traces                                           | AuditLog with who/what/when/before-after (§6.9, §7)                                     | **TM-004**: make AuditLog append-only at the DB-grant level (app role gets INSERT/SELECT, no UPDATE/DELETE) and explicitly log auth events (login success/fail, TOTP fail, lockout) — "every admin action" in §6.9 doesn't clearly include failed auth |
| I      | Session token theft via stored XSS (2.1)                                                 | HttpOnly blocks cookie read, not in-session actions                                     | Real mitigation is the CSP + output encoding — again **TM-005** sequencing                                                                                                                                                                             |
| D      | Lockout policy weaponized to lock out the real admin                                     | Lockout per §9                                                                          | Prefer per-(IP, account) exponential backoff over hard account lockout; document break-glass. Also: **TOTP depends on VM clock — NTP drift silently locks all admins out**; pin time sync in the deploy runbook                                        |
| E      | Authorization enforced only in Next.js middleware (the CVE-2025-29927 bypass class)      | §6.9: "server-side authorization on every route and API handler — never UI-only gating" | Make it structural for P5: authz check in every route handler/server action/data-access function, with middleware as defense-in-depth only. **TM-004**                                                                                                 |
| E      | TOTP device loss = permanent admin lockout (single-admin org)                            | Not addressed in PRD                                                                    | **TM-004**: one-time recovery codes generated at enrollment + documented break-glass runbook                                                                                                                                                           |

### 2.3 Calculator client-side privacy guarantee (F2, P5, TB3 — the negative invariant)

The promise on every calculator (§6.4): _"Calculations run entirely in your browser. Nothing you enter is transmitted or stored."_ Today this is architecturally true (pure client compute from `packages/scoring-engine`; fragments don't reach servers). The threat is **silent regression** — each vector below breaks the promise without any test failing:

| Vector                       | Mechanism                                                                                                                                                                                                                | Design control                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analytics leakage            | Umami records URL path + **query string** by default; some configs/SPA route-tracking can capture `location.hash`. One config change or Umami upgrade could ship input values to D2                                      | Configure Umami to strip query strings and never record hash; exclude `/admin` from tracking; assert in e2e that the `/api/send` beacon payload never contains input values (**TM-001**)            |
| Query-vs-fragment regression | A future developer moves share state from `#` to `?` (e.g., to SSR the result, or by reaching for `useSearchParams`) — inputs instantly appear in proxy logs (D5), Umami (D2), Referer headers, and browser history sync | CI grep-guard banning `useSearchParams`/`searchParams` under `apps/web/app/calculators/**`; ADR documenting the invariant; the §6.4 fragment rule restated in `PRIVACY-ENGINEERING.md` (**TM-001**) |
| Server actions creep         | A calculator form accidentally wired to a server action posts inputs to the server                                                                                                                                       | Calculators are client components importing the pure engine; CI check: no `"use server"` under calculator routes (**TM-001**)                                                                       |
| Error tracking               | §11 plans self-hosted Sentry/GlitchTip. Client SDKs capture `window.location.href` **including the fragment**, plus DOM breadcrumbs (input events). "Keep PII out of events" (§11) doesn't name this mechanism           | Either don't load the client SDK on calculator routes, or scrub URL fragments + disable input breadcrumbs in `beforeSend`; verify with a forced test error (**TM-001**)                             |
| Third-party scripts          | §8.1 bans them — but a ban is policy, not enforcement                                                                                                                                                                    | Nonce-based CSP with `script-src 'self'` + explicit `connect-src` allowlist (self + Umami origin) makes exfiltration structurally hard even if a malicious script gets in (§9; **TM-001/TM-005**)   |
| Dependency compromise        | A hijacked npm package injects a beacon into the calculator bundle — the promise breaks with zero code change in this repo                                                                                               | See 2.4; CSP `connect-src` is the last line of defense (**TM-007**)                                                                                                                                 |
| Service worker               | Serwist precache poisoned by one bad deploy persists offline for a long time                                                                                                                                             | SW versioning + kill-switch/update-toast (§6.5 already plans the toast); deploy-by-digest (2.5)                                                                                                     |

**The invariant needs a permanent executable proof:** a Playwright test that fills a calculator, computes, copies the result, and asserts that **zero network requests** (beyond the allowlisted page/beacon set, none containing input values) occurred. Run it in CI forever. This is the single highest-leverage control in the whole model (**TM-001**).

### 2.4 CI/CD + supply chain (F10, P10, TB6)

Current posture in `.github/workflows/ci.yml` is genuinely good: SHA-pinned actions, `permissions: contents: read`, `--frozen-lockfile`, checksum-verified gitleaks. Gaps against §9 and against 2025-class npm attacks (Shai-Hulud-style worm publishes):

| STRIDE | Threat                                                                                                                                                                     | Gap → finding                                                                                                                                                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T      | Hijacked npm package enters at install time; lifecycle scripts exfiltrate CI secrets or poison the build                                                                   | No dependency audit step yet (§9 requires it); no `minimumReleaseAge` in `.npmrc` (pnpm 10 supports delaying freshly-published versions — cheap, high-value); confirm pnpm 10's script-blocking (`onlyBuiltDependencies`) is explicit, not accidental (**TM-007**) |
| T      | Floating image tags: `umami:postgresql-latest`, `mailpit:latest`, `minio:latest` in `docker-compose.yml`; `node:24-alpine`/`postgres:16-alpine` tag- but not digest-pinned | Acceptable for dev, violates §9 ("pinned... images") for prod. `docker-compose.prod.yml` must pin digests (**TM-007**)                                                                                                                                             |
| T      | Crown-jewel drift: `scoring-engine` gains a runtime dependency or DOM API someday                                                                                          | §12 mandates CI-enforced no-DOM; add a zero-runtime-deps CI assertion (fail if `dependencies` is non-empty) (**TM-007**)                                                                                                                                           |
| T/E    | Workflow injection / privilege creep                                                                                                                                       | Keep `permissions` read-only; never adopt `pull_request_target` with checkout of PR code; branch protection + required checks on `main` (not repo-visible — confirm in GitHub settings)                                                                            |
| S/T    | Deploy path (P8) unspecified: who builds the prod image, how does the VM trust it?                                                                                         | Decide now: CI builds → pushes to registry → VM pulls **by digest**. Never `docker compose pull` a floating tag in prod (**TM-007**)                                                                                                                               |

### 2.5 Docker / single-VM deployment (TB7, P11 — P8 phase)

| STRIDE | Threat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Gap → finding                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E      | Flat co-tenancy: Umami is the largest third-party attack surface on the VM (its login dashboard + API). An Umami auth bypass/RCE lands an attacker on the same host and Docker network as the app DB                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | DB-user separation already done well (`docker/postgres-init/01-create-databases.sh` uses safe `:'pw'` interpolation, separate `umami` user/DB). Add for prod: separate Docker networks (web↔postgres, umami↔postgres only); expose only `/script.js` + `/api/send` publicly — the Umami **dashboard** goes behind IP allowlist or a separate authenticated vhost (**TM-006**)                                |
| E      | Container escape / lateral movement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Prod compose: `read_only` rootfs where possible, `cap_drop: [ALL]`, `no-new-privileges`, memory/CPU limits, **no Docker socket mounts ever**, no published DB/MinIO/SMTP host ports (dev's loopback-only discipline is the right instinct — prod publishes nothing but 80/443) (**TM-006**)                                                                                                                  |
| I      | Secrets on VM (`.env`, backup keys)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `chmod 600`, root-owned; backups encrypted with a key that does **not** live on the same VM; offsite copy must remain KSA-region or the §8.3 residency claim breaks (**TM-006/TM-009**)                                                                                                                                                                                                                      |
| D      | Single VM = single point of failure; DDoS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Mostly-static SSG + offline PWA is a strong availability story for the flagship feature. Note the tension: fronting with a global CDN/WAF would terminate TLS and see form PII **outside KSA** — contradicts §8.3. Prefer origin-side rate limiting (Caddy) + KSA-provider DDoS protection; write the tradeoff into an ADR (**TM-006**). **⚠️ MATERIALISED 2026-07-27 — see TM-006a below.**                 |
| I      | **TM-006a — the CDN/residency tension above is now live, and was never decided.** Cloudflare proxies both hostnames (verified: `Server: cloudflare`, `CF-RAY`), so it terminates TLS and every `/contact` and `/services` submission — name, email, institution, free-text message — transits a Cloudflare edge before reaching the origin. The zone is on the **Free** plan, which carries no data-localization guarantee; edge selection is by proximity, so a submitter outside the Gulf is served outside the Gulf. The origin is also firewalled to Cloudflare's ranges (OCI `hosting-vcn`), so this is not reversible by flipping the orange cloud off — that would take the site down. | Not a defect to patch: a decision to make and write down. Either accept it and correct the §8.3 wording plus the privacy notice to say processing may occur outside KSA, or move to a KSA-region edge/DDoS provider. The ADR TM-006 asked for still does not exist, and the deployment silently chose one branch of it. Calculators are unaffected — they compute client-side and transmit nothing (TM-001). |
| R      | Proxy access logs contain IPs (personal data under PDPL) with no retention rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | §8.4 covers submissions (24 mo) and audit logs (12 mo) but **not** proxy/app/error-tracker logs — define 30–90 day rotation (**TM-009**)                                                                                                                                                                                                                                                                     |
| S      | Host-level                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | SSH keys only, firewall 80/443 (+restricted SSH), unattended upgrades, fail2ban, NTP (TOTP dependency, see 2.2) — belongs in `docs/runbooks/deploy.md` (§11)                                                                                                                                                                                                                                                 |

### 2.6 Future `/api/v1` mobile surface (F11, P4)

Today only `GET /api/v1/health` (exposes engine version — acceptable, info-level). Design-ahead rules so the mobile door (§12) opens safely:

- **Token auth, not cookies**, for mobile (short-lived access + revocable refresh); cookies+CSRF for web only. Rate limit per token and per IP. BOLA/BFLA checks per `sec-api` on every handler (§9).
- **Spec ambiguity to resolve now (TM-010):** §12 says "keep all business logic behind the API rather than in page components" — read literally, that would move scoring server-side and destroy the §6.4 privacy guarantee. Clarify in an ADR: _score computation is explicitly excluded; the engine ships inside the client (web bundle and mobile app alike); `/api/v1` carries only forms, metadata, and future authenticated features._ Mobile inherits the same privacy promise.
- Version the contract from day one (`/api/v1` is already the path — good); generate the OpenAPI spec from the Zod schemas so client and server can't drift.
- Fuzz the surface with schemathesis before mobile launch (guidance-only boundary: static review can't prove handler behavior).

---

## 3. Abuse cases (healthcare-adjacent trust target)

**AC-1 — Spam flood into the services queue.** A botnet submits thousands of plausible-looking `/services` requests. Impact: real fellows' requests are lost in noise; the free-service promise (§6.8) dies quietly; clinical volunteers burn hours triaging garbage. Honeypot + time-trap stop naive bots only. Required: per-IP _and_ per-email _and_ global rate caps, payload size caps, queue-depth alarm, bulk-triage tooling in the admin inbox (select-all-spam), and a **pre-written runbook trigger** for enabling Turnstile (the PRD wisely keeps it off by default — the failure mode is having no decision procedure when the flood arrives).

**AC-2 — Scraping and hostile cloning.** The calculator catalog is scraped and re-hosted — worst case with **altered formulas or interpretation bands** under a lookalike domain. A clinician harmed by a tampered clone is a patient-safety and brand catastrophe, and TowardPCC can't prevent copying of public content. Design response: canonical URLs + JSON-LD (§10) so search engines prefer the original; a "verify you are on towardpcc.com" line on the trust page; CT-log and lookalike-domain monitoring; a registrar/host takedown runbook with pre-identified contacts (**TM-008/TM-012**).

**AC-3 — Defacement → trust destruction.** Three paths: (a) stored XSS from a submission → admin session → CalculatorMeta edit via the CMS; (b) dependency compromise injecting content; (c) VM or DNS compromise. §16.3's rule that **formulas change only in code + tests, never through the CMS** is an excellent blast-radius limiter — keep the CMS surface to presentation fields only, audited with before/after diffs and an explicit re-publish step. Add a **synthetic integrity canary**: an uptime probe that fetches a known calculator page and verifies a content hash, alerting on unexpected diffs; plus an incident runbook with a static "maintenance" fallback (**TM-003/TM-012**).

**AC-4 — Dependency compromise breaks the privacy promise silently.** A hijacked transitive npm package adds a beacon to the calculator bundle. No file in this repo changes; every test stays green; the site now exfiltrates what it promises never to transmit. Defense-in-depth: minimal dependency count, `minimumReleaseAge`, audit-in-CI, digest-pinned images, and — decisively — the CSP `connect-src` allowlist plus the Playwright zero-network invariant test, which turns this from silent to loud (**TM-001/TM-007**).

**AC-5 — Admin credential stuffing / AiTM phishing.** Admin emails are guessable; breached-password reuse is the default assumption. TOTP blocks stuffing but not a real-time phishing proxy. Given a tiny admin population, passkeys are cheap to roll out and phishing-resistant — the single best auth upgrade available (**TM-004**). Meanwhile: unlinked admin URL, login-failure alerting, per-(IP, account) backoff instead of hard lockout.

**AC-6 — DNS/domain decay — the Saudi Critical Care Society precedent.** The SCCS's old domain lapsed and was squatted by a **gambling site** — for a medical brand in KSA, near-maximal reputational damage, and entirely preventable. towardpcc.com and its sibling/redirect domains (§1, §10) must be designed against this exact fate: registrar lock + registry lock where offered, auto-renew on an **organizational** payment method and org-owned contact email (never one person's personal card/inbox), a renewal calendar with two owners, DNSSEC, CAA records restricting issuance to the ACME CA Caddy uses, defensive registration of obvious typos/siblings, no short-lived campaign domains (use paths on towardpcc.com), and dangling-DNS hygiene (kill staging records when VMs are released — subdomain takeover). Email is domain trust too: **SPF + DKIM + DMARC `p=reject` (+ MTA-STS)** before the first form notification is sent, because F4/F7 make towardpcc.com a sender and a healthcare brand is a premium phishing lure. Almost none of this is in the PRD (§10 covers only the 301 redirects) — **TM-008**.

---

## 4. Prioritized design mitigations by phase

**Legend:** [PRD] = already specified, listed for sequencing; **[GAP]** = not in the PRD — add it.

### P5 — Forms + admin (this gate)

1. **[GAP — move earlier]** Ship §9 security headers + nonce-based CSP **with P5**, not P7. Forms and an authenticated admin must not run for two phases without CSP; it is also the enforcement mechanism for the §8.1 third-party ban. (TM-005)
2. [PRD §9] Zod server-side on every input; add **[GAP]** hard length caps and a JSONB payload size cap. (TM-003)
3. [PRD §3/§9] Honeypot + time-trap + per-IP rate limit; **[GAP]** add per-email caps, a global circuit breaker, queue-depth alerting, and the written Turnstile-activation trigger. (TM-002, AC-1)
4. **[GAP]** Redesign §6.8 email notifications: submit-notification goes to `[ADMIN_EMAIL]` only; status-change email to the submitter is sent only after an admin marks the submission legitimate; templates are fixed-text, echo no user content, and are per-address rate-limited. (TM-002)
5. **[GAP]** Admin renders all submission content escaped-by-default (no `dangerouslySetInnerHTML` — §9); CSV export neutralizes formula injection (quote/prefix `= + - @` cells). (TM-003)
6. [PRD §9] Argon2id, throttling, TOTP, session cookie flags, CSRF; **[GAP]** TOTP **recovery codes + break-glass runbook**, app-layer encryption of `totpSecret`, session rotation on login, idle/absolute timeouts, auth events written to AuditLog. (TM-004)
7. **[GAP]** Authorization enforced inside every handler/server action — middleware is defense-in-depth only (Next.js middleware-bypass class). (TM-004)
8. **[GAP]** AuditLog append-only via DB grants (no UPDATE/DELETE for the app role). (TM-004)
9. **[GAP]** Privacy-invariant regression suite: Playwright zero-network compute test; CI grep-guards (`useSearchParams`/`"use server"` banned under calculator routes); Umami configured to drop query strings and hash, `/admin` excluded from tracking. Start now — it protects P2/P3 work already shipped. (TM-001)

### P6 — Legal, retention

10. [PRD §8.4] Retention job: submissions 24 mo, audit 12 mo; **[GAP]** extend §8.4 to proxy/app/error-tracker logs (30–90 days) — IPs are PDPL personal data. (TM-009)
11. **[GAP]** Accidental-patient-data procedure: admin redaction action (field-level), audit note, immediate-purge option — §6.8 warns users but defines no response when they ignore it. (TM-011)
12. **[GAP]** Deletion-request runbook including backup latency (document that purged data persists in encrypted backups for the backup-retention window).

### P7 — Hardening

13. [PRD §9] Dependency audit in CI (osv-scanner or `pnpm audit`) + **[GAP]** `minimumReleaseAge` in `.npmrc`, explicit pnpm script-blocking policy, zero-runtime-deps CI assertion on `packages/scoring-engine`. (TM-007)
14. [PRD §9] Digest-pin every image in `docker-compose.prod.yml` — including Umami/Mailpit/MinIO currently floating on `latest` tags in dev compose. (TM-007)
15. **[GAP]** Prod network segmentation: separate Docker networks; Umami dashboard not publicly reachable (only `/script.js` + `/api/send`); no published host ports except the proxy. Container hardening: `cap_drop`, `no-new-privileges`, read-only rootfs, resource limits. (TM-006)
16. **[GAP]** Passkeys/WebAuthn for admin (phishing-resistant upgrade over TOTP). (TM-004, AC-5)
17. **[GAP]** Error-tracker scrubbing verified by test: no fragment capture, no input breadcrumbs on calculator routes. (TM-001)
18. **[GAP]** ADR resolving the §12 vs §6.4 tension: score computation is client-side on every platform; `/api/v1` never receives calculator inputs. (TM-010)

### P8 — Launch/ops

19. **[GAP — largest PRD omission]** Domain trust program (AC-6): registrar+registry lock, org-owned auto-renew and contacts, renewal calendar, DNSSEC, CAA, CT-log + lookalike monitoring, defensive typo/sibling registrations, dangling-DNS hygiene. Add to `LAUNCH-BLOCKERS.md`. (TM-008)
20. **[GAP]** Email authentication before first send: SPF, DKIM, DMARC `p=reject`, MTA-STS/TLS-RPT. (TM-008)
21. [PRD §11] Encrypted backups + rehearsed restore; **[GAP]** key custody off-VM; offsite copy KSA-region to preserve §8.3. (TM-006)
22. **[GAP]** Deploy by image digest from CI-built artifacts; VM never pulls floating tags. (TM-007)
23. **[GAP]** Monitoring beyond uptime: calculator content-hash canary, queue-depth alert, login-failure alert; defacement incident runbook with static fallback + takedown contacts. (TM-012, AC-2/AC-3)
24. [PRD §11] VM baseline in the deploy runbook: SSH keys only, firewall, unattended upgrades, fail2ban, **NTP (TOTP depends on it)**.

---

## Appendix A — Machine-readable findings

```json
{
  "tool": "security-pan-check",
  "domain": "threat-model",
  "target": "C:/Users/ahmed/Documents/TowardPCC",
  "stackDetected": {
    "languages": ["typescript"],
    "frameworks": ["next.js@16", "tailwind@4", "pnpm-workspaces"],
    "infra": ["docker-compose", "postgres:16", "umami", "mailpit", "minio", "github-actions"],
    "planned": ["prisma", "auth.js+totp", "nodemailer", "serwist", "caddy-or-nginx-single-vm-ksa"]
  },
  "toolsUsed": ["pattern-fallback"],
  "counts": { "critical": 0, "high": 3, "medium": 7, "low": 1, "info": 1 },
  "findings": [
    {
      "id": "SPC-TM-001",
      "title": "Client-side calculator privacy invariant has no enforcement mechanism (analytics config, query-vs-fragment regression, error-tracker fragment capture, server-action creep)",
      "severity": "high",
      "confidence": "tentative",
      "stride": "I",
      "cwe": "CWE-359",
      "phase": "P5+P7",
      "recommendation": "Playwright zero-network compute test in CI; grep-guards on calculator routes; Umami strip query+hash; error-tracker scrub verified by test; CSP connect-src allowlist"
    },
    {
      "id": "SPC-TM-003",
      "title": "Public-submission to admin-browser kill chain: stored XSS in inbox and CSV formula injection in export enable defacement of calculator presentation via CMS",
      "severity": "high",
      "confidence": "tentative",
      "stride": "T/E",
      "cwe": "CWE-79, CWE-1236",
      "phase": "P5",
      "recommendation": "Escape-by-default rendering, CSV cell neutralization, CSP shipped with P5; CMS limited to presentation fields"
    },
    {
      "id": "SPC-TM-008",
      "title": "No domain/DNS/email trust program in PRD (registrar/registry lock, renewal governance, DNSSEC, CAA, typo/sibling defense, SPF/DKIM/DMARC) — SCCS domain-squatting precedent applies directly",
      "severity": "high",
      "confidence": "firm",
      "stride": "S",
      "phase": "P8",
      "recommendation": "Domain trust program + email auth (DMARC p=reject) as LAUNCH-BLOCKERS items"
    },
    {
      "id": "SPC-TM-002",
      "title": "§6.8 submitter notifications email unverified attacker-supplied addresses (backscatter, harassment, phishing-content echo)",
      "severity": "medium",
      "confidence": "tentative",
      "stride": "S/R",
      "phase": "P5",
      "recommendation": "Admin-only submit notification; submitter emails only after human triage; fixed templates, no echoed content, per-address rate caps"
    },
    {
      "id": "SPC-TM-004",
      "title": "Admin auth gaps: no TOTP recovery/break-glass, totpSecret app-layer encryption unspecified, middleware-only-authz risk, audit log not append-only, no phishing-resistant factor",
      "severity": "medium",
      "confidence": "tentative",
      "stride": "S/E/R",
      "phase": "P5+P7",
      "recommendation": "Recovery codes, encrypted TOTP seeds, per-handler authz, DB-grant append-only AuditLog incl. auth events, passkeys at P7"
    },
    {
      "id": "SPC-TM-005",
      "title": "CSP/security headers sequenced at P7 while forms+admin ship at P5 (two-phase exposure window)",
      "severity": "medium",
      "confidence": "firm",
      "stride": "I/E",
      "phase": "P5",
      "recommendation": "Move headers/CSP into the P5 acceptance criteria"
    },
    {
      "id": "SPC-TM-006",
      "title": "Single-VM flat co-tenancy: Umami dashboard exposure, shared Postgres, no prod network segmentation/container hardening specified; CDN/WAF would break KSA residency claim",
      "severity": "medium",
      "confidence": "tentative",
      "stride": "E/I/D",
      "phase": "P7+P8",
      "recommendation": "Split Docker networks, hide Umami dashboard, cap_drop/no-new-privileges/read-only, publish only 80/443, ADR on DDoS-vs-residency"
    },
    {
      "id": "SPC-TM-007",
      "title": "Supply chain: floating image tags, no dependency audit in CI yet, no minimumReleaseAge, scoring-engine zero-dep invariant unenforced, deploy provenance undefined",
      "severity": "medium",
      "confidence": "firm",
      "stride": "T",
      "phase": "P7+P8",
      "recommendation": "Digest-pin prod images, osv-scanner in CI, minimumReleaseAge, zero-deps CI check, deploy by digest"
    },
    {
      "id": "SPC-TM-011",
      "title": "No procedure for accidental patient-identifiable data in service requests (redaction, escalation, purge)",
      "severity": "medium",
      "confidence": "tentative",
      "stride": "I",
      "phase": "P6",
      "recommendation": "Field-level redaction action in admin + audit note + purge path; keep payloads out of logs/error events"
    },
    {
      "id": "SPC-TM-012",
      "title": "No defacement/integrity monitoring or incident fallback for the calculator catalog (trust-critical content)",
      "severity": "medium",
      "confidence": "tentative",
      "stride": "T",
      "phase": "P8",
      "recommendation": "Content-hash canary probe, queue/login alerting, incident runbook with static fallback and takedown contacts"
    },
    {
      "id": "SPC-TM-009",
      "title": "§8.4 retention omits proxy/app/error-tracker logs (IPs = PDPL personal data)",
      "severity": "low",
      "confidence": "firm",
      "stride": "R/I",
      "phase": "P6",
      "recommendation": "30-90 day log rotation documented alongside §8.4 retention table"
    },
    {
      "id": "SPC-TM-010",
      "title": "§12 'all business logic behind the API' conflicts with §6.4 client-side scoring guarantee; /api/v1 mobile auth/rate-limit design undefined",
      "severity": "info",
      "confidence": "tentative",
      "stride": "I/E",
      "phase": "P7 ADR / pre-mobile",
      "recommendation": "ADR: score computation excluded from the API rule on every platform; token auth + BOLA checks + schemathesis before mobile"
    }
  ]
}
```

---

## Summary

TowardPCC v1 is a mostly-static Next.js site whose crown jewels are (1) a _negative_ invariant — calculator inputs never leave the browser — and (2) the clinical integrity of the scoring content; its riskiest surfaces arrive at P5: a public-form pipeline feeding PII into Postgres and an Auth.js+TOTP admin on a single co-tenant KSA VM. The top design risks are the unenforced privacy invariant (TM-001 — one analytics config, query-string regression, or hijacked dependency breaks the brand promise silently), the submission-to-admin XSS/CSV kill chain enabling defacement (TM-003), and the complete absence of a domain/DNS/email trust program despite the SCCS gambling-squat precedent (TM-008). Highest-leverage moves: ship CSP with P5 (not P7), add the Playwright zero-network invariant test at P3, and put the domain program plus DMARC into `LAUNCH-BLOCKERS.md`. Coverage is honest: this is a static, advisory model of a partially built system — the P5 adversarial reviews, the P7 scanner suite, and ZAP/schemathesis dynamic testing must confirm every `tentative` finding; P2–P4 components were modeled from the PRD, not code.
