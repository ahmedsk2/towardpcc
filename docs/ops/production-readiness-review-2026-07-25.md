# Production Readiness Review — TowardPCC

```
PRODUCTION READINESS — TowardPCC            Verdict: 🟡 NEEDS FIXES (78/100)
Stack: Next.js 15 (App Router, standalone) · TypeScript 5.9 (strict) · Postgres 16 + Prisma ·
       pnpm monorepo · Docker Compose + Caddy · GitHub Actions CI · OCI (KSA) target
Run:   16 categories audited · 2 N/A · 2026-07-25
```

Pre-launch pediatric-critical-care web app. This review scores the **codebase**; deployment/
infrastructure is the acknowledged remaining **P8** work and is tracked explicitly in
`LAUNCH-BLOCKERS.md`, `docs/go-live-checklist.md`, and `docs/security/readiness-scorecard.md`.

> A separate deep security audit is running in parallel. Security findings below are
> summarized and cross-referenced, not re-litigated check-by-check.

---

## 1. Project Detection & Applicability

**Detected stack.** A pnpm workspace monorepo: `apps/web` (Next.js 15 App Router, React 19,
Server Actions, Tailwind, deployed as a standalone Node server in Docker); `packages/scoring-engine`
(pure deterministic clinical math, DOM-free); `packages/db` (Prisma + Postgres 16 driver adapter);
`packages/ui` + `packages/config` (design tokens, shared tsconfig). Auth is Auth.js v5 with
Argon2id + mandatory TOTP. Production topology is a single OCI VM (me-riyadh-1/me-jeddah-1)
running docker-compose (web, postgres, umami, caddy, backup, uptime-kuma) behind Caddy auto-TLS.
CI is GitHub Actions. The core clinical journey (22 calculators) computes **entirely client-side**
and persists nothing.

**Applicability.** 16 of 18 categories apply. Two self-skip and are **excluded from the
denominator** (never counted as failures):

- **API & Contract Lifecycle — N/A.** Self-contained app whose only client (its own frontend)
  deploys in lockstep. No external/versioned API, no broker/queue, no outbound webhooks, no
  independent consumer. Only HTTP routes are an internal `/api/v1/health` probe and the NextAuth
  handler; all public writes go through Server Actions.
- **AI / LLM / Agentic — N/A.** No LLM/AI SDKs, prompts, or agentic features anywhere; the
  calculators are pure deterministic functions.

---

## 2. Weighted Scorecard

Overall = Σ(weight × score) / Σ(weight) over the 16 applicable categories = **9259 / 119 = 78**.

| Category                             | Wt  | Score | ●   | Crit | High  | Med | Low | Notes                                                              |
| ------------------------------------ | --- | ----- | --- | ---- | ----- | --- | --- | ------------------------------------------------------------------ |
| Reliability, SLOs & Error Budgets    | 10  | 46    | 🟡  | 0    | 0     | 0   | 0   | No SLIs/SLOs/error budget in repo (all intake); pre-deploy         |
| Testing & Code Quality               | 10  | 80    | 🟡  | 0    | **1** | 0   | 1   | apps/web auth/submission paths untested + no coverage gate         |
| Security & App Hardening             | 10  | 91    | 🟢  | 0    | 0     | 0   | 0   | Exemplary; no SAST job (intake), branch-protection unverifiable    |
| Resilience & Fault Tolerance         | 9   | 71    | 🟡  | 0    | 0     | 2   | 0   | No integration timeouts; single-VM SPOF (documented)               |
| CI/CD & Release Engineering          | 9   | 74    | 🟡  | 0    | 0     | 0   | 0   | Image build/SBOM/signing deferred to P8 (intake)                   |
| Data, Backups, DR & Correctness      | 9   | 74    | 🟡  | 0    | 0     | 0   | 0   | Backups designed but never run; restore untested (intake, P8 gate) |
| Observability                        | 8   | 70    | 🟡  | 0    | 0     | 2   | 1   | No RED metrics, shallow health probe, no tracing                   |
| Config, Secrets & Environments       | 8   | 86    | 🟢  | 0    | 0     | 0   | 1   | LOG_LEVEL missing from .env.example                                |
| Operational Readiness & On-Call      | 7   | 72    | 🟡  | 0    | 0     | 2   | 0   | Bus-factor-1 on-call; no SEV tiers/roles                           |
| Performance & Scalability            | 7   | 86    | 🟢  | 0    | 0     | 0   | 2   | In-memory limiter blocks horizontal scale; no request deadlines    |
| Compliance, Privacy & Legal          | 7   | 86    | 🟢  | 0    | 0     | 0   | 0   | Strong privacy-by-design; DPIA/DPA/breach-clock are intake         |
| Infrastructure, Containers & IaC     | 7   | 88    | 🟢  | 0    | 0     | 0   | 1   | Aux images on mutable tags (umami :latest)                         |
| Documentation, Runbooks & Onboarding | 5   | 86    | 🟢  | 0    | 0     | 0   | 2   | No CHANGELOG; stale README runbooks line                           |
| Visual QA & Accessibility            | 5   | 92    | 🟢  | 0    | 0     | 0   | 1   | TODO comment embedded in shipped legal copy                        |
| Cost, FinOps & Sustainability        | 4   | 74    | 🟡  | 0    | 0     | 0   | 0   | Denial-of-wallet well-bounded; budgets are console-side (intake)   |
| Internationalization & Text          | 4   | 90    | 🟢  | 0    | 0     | 0   | 0   | UTF-8 by construction; single-locale, no round-trip test           |

**N/A (excluded):** API & Contract Lifecycle (no external contract) · AI/LLM & Agentic (no model usage).

**Overall verdict: 🟡 NEEDS FIXES (78/100).** No unwaived Critical anywhere. One unwaived **High**
fail (TST-02) and overall score < 85 — either condition alone lands NEEDS FIXES.

---

## 3. Findings (Critical → Info)

No Critical findings. The single High is the one true codebase blocker; the rest are Medium/Low.

### 🟠 HIGH

**[TST-02] apps/web security-critical modules are untested and ungated** · testing · confidence: high

- **Where:** `apps/web/vitest.config.ts` (no coverage block); untested: `apps/web/lib/auth/totp.ts:66`,
  `apps/web/lib/auth/password.ts:11`, `apps/web/lib/auth/guard.ts`, `apps/web/lib/submissions.ts:135`,
  `apps/web/lib/admin/audit.ts`, `app/contact/actions.ts`, `app/admin/(protected)/submissions/actions.ts`.
- **Why:** The 100% coverage gate covers only `packages/scoring-engine` (clinical math). `apps/web`
  has no coverage threshold and its auth + submission critical paths (Argon2id, TOTP encrypt/decrypt
  and replay protection, recovery codes, honeypot/time-trap, per-IP + global rate limit, IP hashing)
  have zero unit tests. High engine coverage masks entirely untested auth/mutation paths — the exact
  pattern this check warns against. A regression in replay protection or rate-limit fail-closed
  behavior would ship green.
- **Fix:** Add unit tests for `verifyTotpStep` replay/window, password hash/verify round-trip,
  honeypot/time-trap rejection, and rate-limit fail-closed behavior; add a coverage threshold to
  `apps/web/vitest.config.ts` (start ~70–80% lines) so these paths are gated, not just the calculators.
- **Auto-fixable:** no

### 🟡 MEDIUM

**[RES-01] No timeouts on either outbound integration** · resilience · confidence: high

- **Where:** `packages/db/src/index.ts:23` (PrismaPg, connectionString only — no statement/pool
  timeout); `apps/web/lib/email.ts:16-26` (nodemailer, no connection/greeting/socket timeout).
- **Why:** A hung Postgres query holds a pooled connection indefinitely and can exhaust the pool,
  stalling form submissions and admin; SMTP relies on multi-minute library defaults. Bounded (core
  calculators are client-side; SMTP is best-effort) — hence Medium.
- **Fix:** Set `statement_timeout` + a pool-acquisition timeout on the pg adapter; pass explicit
  `connectionTimeout`/`greetingTimeout`/`socketTimeout` to nodemailer. Auto-fixable.

**[OBS-07] Health endpoint is liveness-only; no readiness probe** · observability · confidence: high

- **Where:** `apps/web/app/api/v1/health/route.ts:5-11` (static 200, no dependency check).
- **Why:** Liveness and readiness are conflated; DB-backed features could be routed traffic while
  Postgres is unreachable. Medium — single instance behind Caddy, Dockerfile HEALTHCHECK covers
  restart-on-liveness, calculators are client-side.
- **Fix:** Add `/api/v1/ready` doing a short-timeout `SELECT 1` via the Prisma adapter, returning 503
  when the DB is down; keep the current route as pure liveness. Auto-fixable.

**[OBS-04] No RED / golden-signal metrics** · observability · confidence: high

- **Where:** missing — no prom-client/OpenTelemetry/statsd anywhere in `apps/web`.
- **Why:** No request-rate/error/duration histograms, so p50/p95/p99 latency and saturation are not
  computable. Uptime Kuma gives only black-box availability. Medium given single VM, no SLO program yet.
- **Fix:** If an SLO program is wanted at launch, expose duration histograms + an error counter +
  a DB-pool saturation gauge on `/metrics`; otherwise document reliance on Uptime Kuma + host metrics.

**[RES-09] Single-VM SPOF, no failover** · resilience · confidence: high

- **Where:** `docker-compose.prod.yml` (one web, one postgres, single-AZ, no replicas).
- **Why:** A VM/AZ/host failure takes down forms, admin, and analytics with no automatic failover;
  only already-loaded/PWA calculator users survive. A deliberate, documented v1 tradeoff — Medium.
- **Fix:** Accept-and-document an explicit backend RTO for a single-VM outage, or add ≥2 web replicas
  - replicated Postgres + multi-AZ when the SLO justifies it (see intake).

**[OPS-02] On-call is bus-factor-1** · ops · confidence: high

- **Where:** `docs/runbooks/incident.md:4-5,54-58` (escalation = founder only); no CODEOWNERS/pager.
- **Why:** No rotation/secondary/pager; pages go unanswered if the one person is unavailable. Inherent
  to a solo pre-launch project; an escalation contact does exist — Medium.
- **Fix:** Add a secondary escalation contact before public launch and route Uptime Kuma alerts to a
  lightweight pager (even email/SMS); record ownership in CODEOWNERS.

**[OPS-04] No incident severity tiers or role model** · ops · confidence: high

- **Where:** `docs/runbooks/incident.md` (triage present; no SEV1/2/3 criteria, no IC/comms/scribe).
- **Why:** Severity classification drives escalation/comms decisions even for a solo operator.
- **Fix:** Add a short SEV table (SEV1 = data loss/breach/full outage; SEV2 = degraded; SEV3 = minor)
  with declaration criteria and a note on when to pull in help; link from `incident.md`.

### 🟢 LOW

- **[TST-10] Floating promise on clipboard write** · `apps/web/components/calculator/calculator-form.tsx:168` —
  `void navigator.clipboard.writeText(...).then(...)` has no `.catch()`; rejects on permission denial /
  insecure context → unhandledrejection, and the "copied" state never resolves. Add `.catch(() => {})`;
  consider enabling typescript-eslint `no-floating-promises` (type-checked config) to gate the class.
- **[PERF-07] In-memory rate-limit store blocks horizontal scaling** · `apps/web/lib/submissions.ts:53-64` —
  module-level `Map` resets on deploy and gives each replica an independent counter (halving the global
  limit). Documented v1 single-instance tradeoff. Move to Redis/Postgres before running >1 replica.
- **[PERF-08] No per-request deadlines / load shedding; default pg pool** · `packages/db/src/index.ts:23-27` —
  no explicit `pool.max`, no request timeout/AbortSignal, no 503/Retry-After shed path. Low on one small
  instance; confirm Caddy read/write timeouts cover it and set an explicit pool max.
- **[INFRA-09] Supporting images on mutable tags** · `docker-compose.prod.yml:11,48,84` — `postgres:16-alpine`,
  `caddy:2-alpine`, and notably umami `:postgresql-latest` (a floating "latest") can silently pull changed
  images with no audit trail. Pin third-party images by `@sha256` digest (esp. umami).
- **[CFG-06] LOG_LEVEL absent from .env.example** · `apps/web/lib/logger.ts:12` reads it at runtime but it
  has no template entry (degrades to a safe default). Add `LOG_LEVEL=info` with a comment; optionally
  digest-pin the auxiliary compose images for parity.
- **[UX-02] TODO comment embedded in shipped legal copy** · `apps/web/content/site.ts:324,355` — two strings
  contain a literal `<!-- TODO:counsel-review -->`; if that copy renders as text the marker leaks into the
  page. Remove the inline marker (track the counsel TODO in code, not shipped copy) and confirm the render
  path escapes/strips it.
- **[DOC-05] No CHANGELOG** · missing repo-wide — CONTRIBUTING commits to a "version bump + changelog"
  workflow per scoring-engine formula change but no CHANGELOG exists. Add a Keep-a-Changelog file (or
  changesets) recording the current engine version and 22-score baseline.
- **[DOC-09] Stale README runbooks line** · `README.md:43` says runbooks are "authored in P8; empty until
  then" but three runbooks are already committed. Update the line; optionally add markdownlint/lychee to CI.

Cross-referenced security items (owned by the parallel deep security audit): **[SEC-07]** no CodeQL/Semgrep
SAST job (intake, mitigated by TS strict/no-any); **[SEC-11]/[CICD-04]** branch-protection + required-reviewer
enforcement on `main` is unverifiable from the repo (GitHub free-tier API 403). Both are intake, not fails.

---

## 4. What's Good ✅

- **Clinical core is exemplary and low-risk by construction.** All 22 calculators compute client-side
  and persist nothing (verified by an airplane-mode Playwright e2e); `packages/scoring-engine` enforces a
  hard **100% line+branch+function+statement** coverage gate with worked-example citations across 40+ tests.
- **Security posture is strong (91).** Argon2id at OWASP params + mandatory replay-protected TOTP +
  constant-cost dummy-hash anti-enumeration + atomic per-account lockout; server-side authz on every
  protected page _and_ every admin Server Action (14 call sites); parameterized Prisma throughout with zero
  `dangerouslySetInnerHTML`/`eval`/`child_process`; full static security-header set + two-tier nonce CSP on
  `/admin`; defense-in-depth public forms (Zod caps, honeypot, time-trap, per-IP + global rate limit,
  salted-HMAC IP hashing that fails closed).
- **Supply-chain hygiene.** All GitHub Actions SHA-pinned, base image `@sha256`-pinned, gitleaks
  version+checksum-verified over full history, `pnpm audit --prod` clean and gating, Dependabot on actions+npm,
  `--frozen-lockfile` everywhere, least-privilege `contents:read` + `persist-credentials:false`.
- **Secret hygiene.** `.env*` gitignored (only `.env.example` placeholders tracked), all prod secrets injected
  via required `${VAR:?}` fail-fast references — no secret in source, image, or history.
- **Container is a model build.** Non-root `USER app`, digest-pinned multi-stage, dumb-init PID 1 for correct
  SIGTERM/zombie handling, working HEALTHCHECK against a real endpoint; only Caddy publishes ports.
- **Privacy-by-design.** Data minimization documented and enforced, per-table retention with an automated
  purge job, raw IPs never stored (salted/truncated hash), cookie-less self-hosted analytics (no consent
  banner needed), reachable plain-language privacy notice.
- **Graceful degradation & bounded demand.** Admin email is best-effort and can never fail a stored
  submission; the only write path has per-IP + global admission control with an LRU-bounded map; all
  request-path queries are bounded (`take:200`/`take:20`).
- **Strong accessibility (92) and honest launch discipline.** Skip link, named landmarks, fully labeled
  accessible forms, reduced-motion honored, jsx-a11y gated in CI; every deferred item is enumerated in
  `LAUNCH-BLOCKERS.md`/readiness-scorecard rather than silently missing.

---

## 5. Intake — could not verify from the repo

Runtime/infra/deploy facts (mostly the acknowledged P8 work). Listed as open questions, not failures.

**Data / DR (highest-stakes gates):**

- ❓ [DATA-03] Has a backup **restore** been run end-to-end into a fresh DB? (procedure exists, never executed — the single most important open data gate before go-live)
- ❓ [DATA-02] Is the scheduled encrypted backup actually running on OCI, with the GPG copy landing in an in-region Object Storage bucket separate from the DB host?
- ❓ [DATA-01] What are the numeric **RTO/RPO** targets? (only defined as things to _measure_; nightly-only implies up to ~24h data-loss window)
- ❓ [DATA-06] Is the OCI block volume for pgdata (and backups) encrypted at rest with managed keys?
- ❓ [DATA-12] Is there a BIA, and can anyone besides the founder deploy/hold prod credentials?

**CI/CD / supply chain (P8 image pipeline):**

- ❓ [CICD-01/05/13] Will the same image `@sha256` digest be promoted dev→staging→prod, with SBOM + signed attestation archived per release?
- ❓ [CICD-08] Will the P8 deploy include an automated fail-closed post-deploy smoke test with auto-rollback?
- ❓ [CICD-04 / SEC-11] Are required status checks + required review enforced on `main`? (API returned 403 — likely not on free-tier)

**Config / secrets / infra:**

- ❓ [CFG-03] Where do prod secrets live (host env file vs OCI Vault) and how is read access scoped per workload?
- ❓ [CFG-04] What is the rotation cadence for AUTH_SECRET / TOTP_ENC_KEY / SUBMISSION_IP_SALT / DB creds?
- ❓ [CFG-10] Will the deploy/registry pipeline authenticate to OCI via OIDC/workload identity or a stored long-lived key?
- ❓ [CFG-11] Will the OCI VM/network/volume be codified in IaC with drift detection, or provisioned manually?

**Observability / reliability / ops:**

- ❓ [OBS-03] Will the error-tracker (Sentry/GlitchTip) DSN + release tags be wired before first traffic? (init can land in-repo now)
- ❓ [OBS-08] Where do container stdout logs land on the OCI host and what is retention?
- ❓ [REL-01..07] Are user-facing SLIs/SLOs, error-budget policy, and burn-rate alerts defined once monitoring is live?
- ❓ [OPS-03/05] Once Uptime Kuma + error tracker are configured, is each paging alert symptom/SLO-based and runbook-linked? Where are postmortems recorded?
- ❓ [OPS-06] When will the documented rollback path first be rehearsed (staging)?

**Compliance / performance / cost:**

- ❓ [CMP-03] DPIA outcome; signed DPAs with hosting + email sub-processors; PDPL 72h breach-notification clock + SDAIA contact in the incident runbook.
- ❓ [CMP-06] Complete the tracked counsel review of the formal privacy policy before public launch.
- ❓ [PERF-05/06/10] Has the submission path been load-tested to its knee point? Launch-peak/10x capacity plan? OCI quotas (DB max_connections, vCPU) vs projected peak?
- ❓ [COST-02] Is an OCI cost budget + anomaly alert configured before the VM goes live?

---

## 6. Top Fixes (prioritized)

### (a) Real pre-launch blockers — fixable in the repo now, **not** deploy-gated

1. **[TST-02 · High] Test the auth/submission critical paths and add an `apps/web` coverage gate.** The
   only High fail and the single most important codebase gap: TOTP replay/window, password round-trip,
   honeypot/time-trap, and rate-limit fail-closed behavior are entirely untested and ungated.
2. **[RES-01 · Med] Add finite timeouts to Postgres (statement + pool acquisition) and nodemailer.** A hung
   dependency can currently stall the whole form/admin path. Auto-fixable.
3. **[OBS-07 · Med] Add a real `/api/v1/ready` readiness probe (DB `SELECT 1`, 503 on failure).** Auto-fixable.
4. **[OPS-02/04 · Med] Name a secondary escalation contact + add a SEV tier table to the incident runbook.**
   Small doc changes that remove the bus-factor-1 single point and give incidents a classification.
5. **Low-effort hygiene sweep:** `.catch()` the clipboard write **[TST-10]**; pin umami/postgres/caddy by
   `@sha256` **[INFRA-09]**; add `LOG_LEVEL` to `.env.example` **[CFG-06]**; strip the `<!-- TODO:counsel-review -->`
   marker from shipped legal copy **[UX-02]**; fix the stale `README.md:43` runbooks line **[DOC-09]**; add a
   `CHANGELOG.md` **[DOC-05]**.

### (b) Already-known, documented P8 deploy-gated items — verify at go-live, not codebase defects

- Run the **backup restore drill** end-to-end on real infra; stand up the encrypted off-host backup; set numeric **RTO/RPO** from a BIA. _(DATA-01/02/03)_
- Land the **CI image build** with SBOM + signed provenance + Trivy/Grype scan, promote by digest, and add an **automated post-deploy smoke test with auto-rollback**. _(CICD-01/05/08, DATA-13, INFRA-01)_
- Wire the **error tracker** (Sentry/GlitchTip) DSN and configure **Uptime Kuma monitors + burn-rate alerts**; define **SLIs/SLOs**. _(OBS-03, REL-01..07, OPS-03)_
- Enforce **branch protection + required checks/review** on `main`; add a **SAST (CodeQL) job**. _(CICD-04, SEC-07/11)_
- Move secrets to **OCI Vault**, confirm at-rest volume encryption, decide **OIDC** deploy auth, set a **cost budget**. _(CFG-03/04/10, DATA-06, COST-02)_
- Execute **DPAs**, add the **PDPL breach-notification clock**, and complete the **counsel privacy-policy review**. _(CMP-03/06)_

---

## 7. Verdict

**🟡 NEEDS FIXES — overall 78/100. The codebase is close to production-ready, with exactly one true
blocker to clear before launch.**

There are **zero Critical findings** and **one High** — TST-02, the untested/ungated auth and submission
critical paths in `apps/web`. That is a genuine, in-repo, pre-launch blocker (a security regression could
ship green), and it is the reason the codebase is NEEDS FIXES rather than READY. It is squarely fixable now
with unit tests plus a coverage threshold; nothing about it depends on infrastructure.

Every other gap is either a bounded Medium/Low with a clear in-repo fix (integration timeouts, a readiness
probe, image digest pinning, a handful of hygiene items) or an **acknowledged P8 deploy-gated item** that is
correctly deferred and tracked — the low scores in Reliability (46), Observability (70), CI/CD (74), and
Data/DR (74) are dominated by _intake_ items (backups not yet run, no SLOs/metrics/error-tracker configured,
no CI image build) that cannot exist until infrastructure is stood up, and they are **excluded from the score,
not counted as failures**.

**Bottom line:** as a _codebase_, TowardPCC is in strong shape — excellent security, a fully-tested clinical
core, clean supply-chain and secret hygiene, and disciplined launch tracking. Close the **one High
(TST-02)** and the short hygiene sweep, then treat the P8 deploy-gated list as the go-live checklist. The
single most important finding to act on is **TST-02**.

---

```
Re-run:  /prod-ready:audit            Deep-dive: /prod-ready:<category>
Fix safe items: /prod-ready:fix       CI gate: /prod-ready:audit --ci  (NEEDS FIXES → exit 1)
```
