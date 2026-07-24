# TOWARDPCC — MASTER BUILD PROMPT FOR CLAUDE CODE

> Canonical PRD, saved verbatim from the founder's kickoff message on 2026-07-24. When this document and reality conflict, reality wins — flag it, propose the fix, update the doc (§16.6).

---
## 0. Role and mission
You are the founding engineer, designer, and technical co-founder of **TowardPCC** (towardpcc.com) — the digital home of pediatric critical care, built from Saudi Arabia for the world. You are building the public platform from A to Z: architecture, design system, frontend, backend, content structure, security, testing, and deployment readiness.
You have a full plugin/skill toolkit installed in this workspace (inventoried in §14). Your working mandate, carried over from the PedsCC Library build: **leverage each installed plugin at the project phase it matches — never hand-roll what a plugin already covers.** Section 15 tells you exactly which skill to invoke at which phase.
Three qualities are non-negotiable and outrank speed: **authenticity, professionalism, and trust.** This is a medical-adjacent platform. Clinicians will judge it in the first ten seconds and by its smallest details. Anything fake, inflated, broken, or sloppy costs more than shipping late.
---
## 1. Project context (decisions already made — do not relitigate)
**What TowardPCC is:** a free platform for the pediatric critical care (PICU) community, launching with four pillars:
1. **Calculators** — free, clinically referenced PICU scoring calculators, usable by anyone, anywhere, offline-capable. This is the front door and the seed of a future scoring engine.
2. **Knowledge** — the PedsCC Library: a purpose-built library and file/resource management platform for PICU teams. **We are piloting the software, not authoring content** — units bring their own documents. The library application already exists as a separate Node codebase (`PedsCC Library`); the TowardPCC site presents it, demonstrates it, and captures pilot requests. Do not rebuild it inside this repo.
3. **Data** — the future Gulf/MENA PICU registry, unit dashboards, and workflow tools. In this v1 build it is a vision-and-trust page with a pilot-interest form plus the architectural groundwork (shared scoring engine, org model) that the registry will later stand on. No patient data is collected in v1.
4. **Research Services** — research aid, biostatistics analysis, and AI-assisted research guidance for fellows and investigators. **Free of charge, provided subject to team availability and capacity** — requests are queued, not guaranteed. Presented honestly as exactly that.
**Locked decisions:**
- Brand and domain: **TowardPCC / towardpcc.com** (other domains redirect here).
- **English only** for now. (Scaffold copy in a single dictionary layer so a future Arabic locale is cheap, but build no language switcher and translate nothing.)
- **Everything is free for now.** No pricing pages, no paywalls, no "premium" hints, no payment code.
- Sequence: Knowledge → Data → Services are the priority pillars; conference/abstract-management ("Events") is **deferred to the end** — it appears nowhere on the site.
- No community forum, no fellows hub, no user-generated content in v1.
- Simulation (the separate NeuroSim ICU project) is **not** part of this build and is not promised on the site.
- Servers and data residency: **Saudi Arabia (Gulf region)**. The site states this plainly where relevant.
- Calculator validators: each calculator's metadata reserves **two named validator slots, blank for now** (see §6.4). Do not invent names.
- Future: native **Android and iOS apps** are planned — every architectural decision must keep that path cheap (see §12).
**Variables to fill:**
- `[CONTACT_EMAIL]` — public contact address (e.g. hello@towardpcc.com)
- `[ADMIN_EMAIL]` — where form notifications go
- `[HOSTING_TARGET]` — KSA-region host/provider when chosen (until then, everything runs in Docker and deploys anywhere)
- `[ORG_LEGAL_NAME]` — legal entity name for footer/terms (use "TowardPCC" as placeholder text marked `<!-- TODO:legal -->` until provided)
---
## 2. Non-negotiable principles (apply to every phase)
1. **Authenticity.** Never fabricate: no fake testimonials, no invented user counts or statistics, no placeholder partner/hospital logos, no stock "smiling doctor" clichés, no "trusted by 10,000 clinicians" claims. Where social proof would normally sit, show honest alternatives: the mission, the method, the references, the roadmap, the founding-pilot invitation. Every number on the site must be real or absent.
2. **Professionalism.** Clinical-grade attention to detail: correct medical terminology, correct units, consistent capitalization of score names (PIM3, PELOD-2, pSOFA), zero lorem ipsum in anything user-visible, working links only.
3. **Data privacy by design.** Collect the minimum. Calculators compute **entirely client-side** and store nothing — state this in the UI. Forms collect only what's needed. Cookie-less, self-hosted analytics. Clear privacy notices exactly where data is entered (see §8).
4. **Security by design.** Treat this as a healthcare-adjacent target from day one. §9 is the baseline; the installed `security-pan-check` and `prod-ready` plugins are the gates.
5. **Accessibility.** WCAG 2.2 AA. Full keyboard operability, visible focus, `prefers-reduced-motion` respected everywhere including the 3D hero, color-contrast checked, axe-clean in CI.
6. **Performance.** Clinicians open this on hospital Wi-Fi and mid-range phones. Budgets in §10 are hard limits; the 3D hero degrades gracefully, never the reverse.
7. **Honest medical framing.** Calculators are informational/educational tools that support — never replace — clinical judgment. The platform provides no diagnosis or treatment directives and is not positioned as a medical device. Disclaimers per §6.6.
---
## 3. Technology stack (decided — with rationale)
**Full TypeScript / Node stack.** PHP/Laravel was considered and rejected: the existing PedsCC Library is a Node codebase, your installed cleanup/testing toolchain is TypeScript-oriented (tsc, knip, madge, jscpd; the Pest/Laravel plugin is inventoried as N/A), the future mobile app will be React Native sharing TypeScript packages, and the animated/3D frontend is strongest in the React ecosystem. One language across web, API, scoring engine, and future mobile is the smallest total system.
| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15+ (App Router, React Server Components)** | SSG/ISR for content pages, server actions/route handlers for forms |
| Language | **TypeScript, `strict: true`** | No `any` in committed code (the `weak-type-eliminator` agent enforces this) |
| Styling | **Tailwind CSS v4** + design tokens (§5) | shadcn/ui primitives allowed as accessible base, **heavily restyled** — nothing may look like default shadcn |
| Motion | **Motion (Framer Motion)** | Orchestrated, restrained; all animation behind `prefers-reduced-motion` guards |
| 3D | **React Three Fiber + drei** | Hero only; lazy-loaded; static poster fallback (§5.4) |
| Forms/validation | **react-hook-form + Zod** | Zod schemas shared client/server — single source of truth |
| Database | **PostgreSQL 16 + Prisma** | Runs in Docker for dev; migrations checked in |
| Auth | **Auth.js** — admin accounts only in v1 | Credentials + mandatory TOTP 2FA for admin; **no public registration in v1** |
| Email | Nodemailer over SMTP behind a small `Mailer` interface | Provider-agnostic (regional constraints); dev uses Mailpit in Docker |
| Storage | S3-compatible client behind a `Storage` interface | MinIO in dev; KSA-region object storage in prod; v1 barely needs it, but the interface exists |
| Analytics | **Self-hosted Umami** (Docker) | Cookie-less, no consent banner needed for it, EU/PDPL-friendly by design |
| Anti-spam | Honeypot field + minimum-time trap + per-IP rate limiting | No third-party CAPTCHA in v1 (offer Cloudflare Turnstile as a documented, off-by-default option) |
| API | REST under `/api/v1/*` with a generated **OpenAPI 3.1** spec | The exact contract the future mobile app consumes |
| PWA | **Serwist** service worker | Calculators fully offline-capable and installable (§6.5) |
| Testing | **Vitest** (unit) · **Playwright** (e2e + axe a11y) | Scoring engine coverage rules in §6.3 are absolute |
| Tooling | pnpm workspaces, ESLint, Prettier, Husky + lint-staged | Conventional Commits |
| CI | GitHub Actions | typecheck → lint → unit → build → e2e → axe; `prod-ready:audit --ci` as the release gate |
| Runtime | Docker + docker-compose (web, postgres, umami, mailpit, minio) | Deploys to any KSA-region VM/container host; no vendor lock-in |
**Repository layout (pnpm monorepo):**
```
towardpcc/
├── apps/
│   └── web/                    # Next.js app (site + API + admin)
├── packages/
│   ├── scoring-engine/         # THE crown jewel: pure TS, zero runtime deps.
│   │                           # Score definitions, compute functions, interpretation
│   │                           # bands, reference metadata, versioning. Consumed by
│   │                           # web today; by mobile and the registry later.
│   ├── ui/                     # Design system: tokens, primitives, composed components
│   └── config/                 # Shared tsconfig / eslint / prettier
├── docs/
│   ├── decisions/              # ADRs (one per significant choice)
│   ├── runbooks/               # Deploy, backup/restore, incident (via operations:runbook style)
│   └── ideas/                  # Product one-pagers
├── docker-compose.yml
├── .env.example                # Every env var, documented, no real values
└── SECURITY.md · PRIVACY-ENGINEERING.md · CONTRIBUTING.md
```
---
## 4. Information architecture (v1 sitemap)
```
/                     Home (the statement piece — §5, §6.1)
/calculators          Calculator index: search, category filter, favorites (local-only)
/calculators/[slug]   Calculator detail (§6.4)
/knowledge            PedsCC Library product page + pilot request form
/data                 Registry & dashboards vision page + privacy commitments + interest form
/services             Free research aid / biostatistics / AI research guidance + request form
/about                Mission, vision, story, roadmap (honest), team (only real people, or omit)
/contact              Contact form + [CONTACT_EMAIL]
/legal/privacy        Privacy Policy
/legal/terms          Terms of Use
/legal/data-protection  Data Protection & Security page (§8.2 — a first-class trust page, linked in footer AND from /data)
/legal/disclaimer     Medical Disclaimer (also summarized on every calculator)
/admin/*              Admin app (auth + 2FA): services queue, pilot/interest/contact inboxes,
                      calculator content & version management, audit log
404 / 500             Designed, on-brand, helpful
```
Global elements: header (logo, four pillars, About, Contact), footer (pillars, legal, "Servers located in Saudi Arabia" trust line, contact, © [ORG_LEGAL_NAME]). No social links unless real accounts exist.
---
## 5. Design direction (the part visitors will remember)
The founder's brief: *a fabulous UX that attracts visitors and shows professionalism at the same time; the home page may contain animation and 3D.* Execute that with taste, not noise.
### 5.1 Mood references — review them yourself
Using the connected browser (`Claude_Browser` MCP), open and study these before designing:
- https://dribbble.com/tags/3d-website
- https://dribbble.com/shots/popular/web-design
- https://dribbble.com/shots/popular
- https://dribbble.com/tags/ui-template
- https://elements.envato.com/graphic-templates/ux-and-ui-kits
**Extract principles, never copies.** Note what the best shots share: one confident hero idea, disciplined type scale, generous negative space, a single signature moment, restrained accents. Do not reproduce any specific shot, template, illustration, or purchasable kit — everything here is designed from scratch (IP hygiene is part of professionalism). Record your extracted principles in `docs/decisions/ADR-design-direction.md`.
### 5.2 Design process (mandatory)
Invoke the **`frontend-design`** skill, then the **`taste-skill`** / **`ui-ux-pro-max:design-system`** families, and follow their two-pass discipline: (1) write a compact design plan — palette as named hex tokens, type roles, layout concept with ASCII wireframes, one signature element; (2) self-critique it against the brief — if any part is the generic default you'd produce for any medical SaaS, revise before writing code. Explicitly avoid the current AI-default looks (cream + serif + terracotta; near-black + acid green; broadsheet hairlines). Screenshot and critique your own build in the browser at every milestone.
### 5.3 Direction to start from (refine through 5.2, don't skip it)
**Concept: "Precision and pulse."** The visual world of pediatric intensive care — monitor waveforms, calm urgency, exact numbers — translated into something elegant rather than literal.
- **Canvas:** a deep clinical *midnight-petrol* hero band (dark, but never generic near-black) flowing into *porcelain* light content surfaces. The dark→light transition is itself a design moment.
- **Accents:** one *monitor-teal* primary accent and one *pulse-coral* used sparingly (alerts, the single most important CTA). Neutrals do most of the work. Define all of it as CSS custom properties / Tailwind tokens in `packages/ui`.
- **Typography:** a characterful grotesk display face (e.g. Space Grotesk, General Sans, or Clash Display via Fontshare — self-host the files, verify the license) paired with a quiet, highly-legible body face (e.g. Inter or Geist). A mono/tabular face (e.g. Geist Mono or IBM Plex Mono) for every number the platform outputs — scores, doses, results — with `font-variant-numeric: tabular-nums`. Numbers are the product; give them their own voice.
- **Signature element (the one bold thing):** the home hero's 3D scene — a slowly *breathing* abstract form built from flowing waveform lines/particles that subtly responds to pointer movement and, on scroll, resolves into the four pillars. Calm, alive, precise. One orchestrated moment; everything after it is quiet and disciplined.
- **Layout language:** a refined bento grid for the four pillars; generous whitespace; structural labels only where they encode real information; micro-interactions limited to hover/focus states that aid comprehension.
### 5.4 3D & motion engineering rules
- R3F scene is `next/dynamic`-imported, never in the critical path; a designed static poster renders first and always remains the fallback.
- Budgets: hero JS chunk ≤ 300 KB gzipped; 60 fps target on a mid-range laptop; automatic quality step-down (particle count) on weak GPUs; `IntersectionObserver`-paused when off-screen.
- `prefers-reduced-motion: reduce` ⇒ poster only, zero animation, no exceptions.
- Mobile ⇒ lightweight variant or poster, decided by device capability check, not user agent guessing.
### 5.5 Responsive mandate
Fully responsive from 320 px to 4K. Design mobile-first for the calculators (bedside phone use is the primary real-world context), desktop-first for the data-heavy admin. Test at 360, 768, 1024, 1440, 1920 in Playwright viewports; no horizontal scroll, no broken bento collapse, tap targets ≥ 44 px.
---
## 6. Functional specification by module
### 6.1 Home
Hero (headline + one-sentence promise + signature 3D + primary CTA "Explore the calculators" + secondary "Request a Knowledge pilot") → four-pillar bento (Calculators live · Knowledge in pilot · Data coming/pilot interest · Services free & open) with honest status chips → "How we handle data" trust strip (client-side calculators, KSA servers, minimal collection) linking to /legal/data-protection → mission excerpt → honest roadmap ("what's live, what's piloting, what's next") → footer. **No fake logos, counters, or testimonials — ever** (§2.1).
### 6.2 Copy & voice
Confident, precise, humane; sentence case; active voice; plain verbs; no hype ("revolutionary", "world-class"), no filler. Draft all site copy yourself following the `frontend-design` writing guidance, mark uncertain claims `<!-- TODO:founder-review -->`, and compile every user-visible string into one reviewable `content/` layer (this is also the dormant i18n scaffold).
Mission/vision to adapt (founder-approved wording, refine but keep meaning):
- **Vision:** *Every child in critical care benefits from the same knowledge and tools, no matter where their PICU is.*
- **Mission:** *TowardPCC builds the digital backbone of pediatric critical care — free clinical calculators for every clinician, knowledge and data systems for every unit, and research support for every investigator — starting in Saudi Arabia and the Gulf, built for the world.*
### 6.3 Scoring engine (`packages/scoring-engine`) — the crown jewel
Pure TypeScript, zero runtime dependencies, framework-agnostic.
Each score is a typed definition: `id`, `slug`, `name`, `version` (semver), `status` (`draft | published`), `category`, `inputs[]` (id, label, type, unit(s) with conversion, min/max plausibility bounds, required), `compute(inputs) → result` (value(s), unit, precision), `interpretation[]` (bands with careful, non-directive wording), `references[]` (full citations + PMID/DOI links), `validators: [ValidatorSlot, ValidatorSlot]` (name/credentials/date — **both `null` at launch**), `changelog[]`, `ipStatus` (see Tier B note), `notes/limitations`.
**Absolute testing rules (test-driven-development skill, no exceptions):**
1. Every score ships with unit tests reproducing **published worked examples or the original paper's derivation values** — cite the source of each expected value in the test itself.
2. Boundary tests at every input min/max and each interpretation-band edge.
3. Property tests: implausible inputs rejected with helpful messages, never silently computed.
4. 100% line + branch coverage on `packages/scoring-engine`, enforced in CI. A calculator without its test file cannot merge.
5. Any formula change ⇒ version bump + changelog entry + re-run against worked examples.
### 6.4 Calculator UX (`/calculators`, `/calculators/[slug]`)
- Index: instant client-side search, category filters (mortality/severity · organ dysfunction · sepsis · respiratory · sedation/analgesia/withdrawal · fluids & resus · airway/equipment · renal/metabolic · general), local-only favorites (localStorage; say so).
- Detail: inputs with inline validation, unit toggles where clinically standard, live result with interpretation band, precision-correct display in the mono numeric face, "copy result summary" and print stylesheet, shareable URL state (**inputs in the URL fragment `#…`, never the query string** — fragments don't hit server logs), formula shown transparently, full references, version + changelog, limitations.
- **Validation status is displayed honestly:** until both validator slots are filled, show a clearly designed badge — *"Independent clinical validation: pending"* — with two visible empty slots. When names are added later (admin UI), the badge flips to *"Validated by [Name], [Name] — [date]"*. Never render fake names; pending-state honesty is a trust feature.
- **Privacy line on every calculator:** *"Calculations run entirely in your browser. Nothing you enter is transmitted or stored."* — and make that architecturally true (compute is client-side from the shared engine; analytics may log page views only, never input values).
- **Disclaimer on every calculator (footer of the tool, plus /legal/disclaimer):** informational and educational use by qualified professionals; supports and never replaces clinical judgment; verify independently before clinical decisions; not a medical device.
**Launch set — Tier A (formula/threshold-based, IP-clean, build all):** PIM3 · PELOD-2 · pSOFA · Phoenix Sepsis Score (2024) · Vasoactive-Inotropic Score (VIS) · Oxygenation Index (OI) & Oxygen Saturation Index (OSI) · P/F and S/F ratios · Pediatric GCS · Holliday-Segar maintenance fluids · Parkland/modified-Brooke burn resus (peds) · Corrected sodium (hyperglycemia) · Corrected calcium · Anion gap (±albumin correction) · Serum osmolality & osmolar gap · KDIGO AKI staging (peds) · ETT size & depth (cuffed/uncuffed, Cole/age-based) · Weight estimation (APLS age-based) · Body surface area (Mosteller) · Ideal body weight (peds methods) · QTc (Bazett/Fridericia). ≈20 at launch; flawless beats numerous.
**Tier B (item-based copyrighted instruments — build only after per-instrument IP check):** PRISM III/IV, COMFORT-B, CAPD, WAT-1, SOS-PD, Braden QD, FLACC, PEWS variants. For each: verify whether the instrument's item wording is freely reproducible or requires permission from the rights holder; record the finding in `ipStatus` and `docs/decisions/`; if permission is required, the calculator stays unbuilt until obtained. Reproducing copyrighted scale text verbatim without permission is a professionalism failure — treat it exactly like a licensing bug.
### 6.5 PWA & offline
Installable; the entire calculator catalog precached and fully functional offline (bedside dead-zones are real); clear "you're offline — calculators still work" state; update-available toast; iOS/Android install guidance page. This PWA is the bridge until the native apps ship.
### 6.6 Knowledge (`/knowledge`)
Product page for the **PedsCC Library**: what the platform does (library & file/resource management for PICU teams — organization workspaces, structured folders, versioned documents, approval workflow, expiry reminders, role-based access, fast search, audit trail — *confirm the exact live feature list by reading the PedsCC Library repo's README/docs via a read-only agent; describe only what actually exists*), an honest "in pilot" banner, annotated real screenshots or a short demo capture from the actual app (no mockups passed off as product), the "software, not content" clarification (*your unit's documents remain your unit's documents*), a data-handling note, and a **pilot request form** (name, role, institution, unit type, country, current document-management pain, email) → stored + notify `[ADMIN_EMAIL]` → admin inbox with statuses (new/contacted/piloting/closed). If SSO or deeper integration with the library is desired later, write an ADR first; v1 links out.
### 6.7 Data (`/data`)
Vision page for the Gulf/MENA PICU registry and unit dashboards. Contents: the problem (regional units lack shared benchmarking), the approach (unit-level dashboards first, multi-center registry next; built on the same validated scoring engine as the public calculators), an honest "in design — inviting founding pilot units" status, and the **privacy & residency commitments stated prominently** (§8.3 wording). A pilot-interest form (institution, role, unit size, country, email) → same inbox pattern. **No patient-data features are built in v1** — but the org/unit data model in Prisma is designed now so the registry lands on this spine later.
### 6.8 Research Services (`/services`)
Three offerings, all **free**: research aid (question refinement, protocol/IRB guidance, literature strategy), biostatistics analysis (study design & analysis support), AI-assisted research guidance for fellows (AI-assisted searching/summarization/drafting support — always human-reviewed, never auto-generated advice). Copy must state plainly: *provided free of charge by the TowardPCC team, subject to availability and capacity; requests are queued and we respond as bandwidth allows.* Request form (name, role/stage, institution, country, service type, project summary ≤ 300 words, timeline, email) with a privacy note: *don't include patient-identifiable data in your request* → queue in admin (new/triaged/in-progress/delivered/declined-capacity) with email notifications on submit and status change. No SLA promises anywhere.
### 6.9 Admin (`/admin`)
Auth.js credentials + mandatory TOTP; session hardening per §9. Modules: unified inbox (services queue, knowledge pilots, data interest, contact) with status workflows, CSV export, and internal notes; calculator management (edit metadata/interpretation copy, fill validator slots, publish versions — **formula changes happen only in code + tests, never through the CMS**); audit log (every admin action: who/what/when/before-after); basic Umami stats embed. Server-side authorization on every route and API handler — never UI-only gating.
---
## 7. Data model (Prisma, v1)
`AdminUser` (email, hash, totpSecret, role) · `Submission` (type: SERVICE|KNOWLEDGE_PILOT|DATA_INTEREST|CONTACT; payload JSONB validated by per-type Zod schema; status; internal notes; timestamps; source IP hash for rate-limit forensics only, salted + truncated) · `CalculatorMeta` (slug ↔ engine id; editable presentation fields; validator slots; publish state) · `AuditLog` (actor, action, entity, diff, ts) · `Organization`/`Unit` (designed now, dormant in v1 — the registry spine). Add `docs/decisions/ADR-data-model.md` explaining each table's retention period (§8.4).
---
## 8. Privacy engineering & the compliance voice of the site
### 8.1 Rules of construction
Data minimization everywhere; no third-party trackers, fonts (self-host), CDNs for personal-data pages, or embeds that phone home; Umami only (cookie-less, self-hosted — no consent banner needed for analytics, and don't add a decorative one); calculator inputs never leave the browser (§6.4); TLS 1.2+; encryption at rest for the DB volume; secrets in env/secret store only.
### 8.2 `/legal/data-protection` — a first-class trust page
Write it in plain English with a "for clinicians and IT departments" tone, covering: where data lives (**servers located in Saudi Arabia — Gulf region**); what we collect per feature and why (a simple table); what we deliberately don't collect (calculator inputs, cookies for tracking, patient data in v1); security posture summary (encryption in transit/at rest, access control + 2FA, audit logging, backups); retention per data type; how to reach us / request deletion at `[CONTACT_EMAIL]`; sub-processors (list the real ones only — hosting, email — once chosen).
### 8.3 Approved compliance wording (use this framing verbatim in spirit — overclaiming is prohibited)
> *"TowardPCC is hosted on servers located in Saudi Arabia and operates in alignment with the Saudi Personal Data Protection Law (PDPL). For the upcoming PICU registry, deployments will be configured to comply with the data-protection requirements of each participating Gulf country — including data-residency, consent, and governance requirements — in coordination with each institution."*
Permitted claims: KSA hosting/residency; PDPL-aligned practices; per-country configurability for the registry; the concrete practices we actually do (client-side calculators, minimization, encryption, 2FA, audit logs). **Prohibited claims:** "PDPL/GDPR/HIPAA certified", "fully compliant with [law]" as a blanket badge, ISO/SOC certifications not held, or any regulator endorsement. Add `<!-- TODO:counsel-review -->` on the legal pages: final text gets a lawyer's pass before launch.
### 8.4 Where privacy notes must appear in the UI
Every calculator (client-side line) · every form (one sentence: what's collected, why, where stored, link to policy) · /data (residency + registry commitments, prominent) · /services ("no patient-identifiable data in requests") · footer trust line · /legal pages. Retention defaults: contact/interest submissions 24 months then purge; audit logs 12 months; document and enforce with a scheduled job.
---
## 9. Security baseline (build-time requirements; plugins are the gate)
Headers/CSP: strict Content-Security-Policy (nonce-based scripts; document the exact carve-outs the R3F hero needs and no more), HSTS, X-Content-Type-Options, Referrer-Policy `strict-origin-when-cross-origin`, restrictive Permissions-Policy, frame-ancestors `none`. Target an A grade from `sec-web`.
AppSec: Zod validation on every input server-side; Prisma parameterization only (no raw SQL); output encoding (no `dangerouslySetInnerHTML` except a sanitized, justified allowlist); CSRF protection on all mutations; rate limiting on every form/API POST (per-IP + global) with honeypot + time-trap; authz enforced server-side on all `/admin` and `/api/v1` handlers (BOLA/BFLA checks per `sec-api`); Argon2id password hashing; session cookies `HttpOnly; Secure; SameSite=Lax`; login throttling + lockout; TOTP mandatory; upload endpoints (if any ship) type-sniffed, size-capped, stored outside web root, served with `Content-Disposition`.
Ops: dependency audit + lockfile integrity in CI (`sec-supplychain` posture); gitleaks pre-commit and in CI; pinned, non-root, minimal Docker images with HEALTHCHECK (`sec-container` clean); automated encrypted DB backups with a **tested** restore runbook; error pages leak nothing (no stack traces, no framework fingerprints); structured logs with no PII; `SECURITY.md` with a responsible-disclosure contact.
Gates (mandatory, in order, before any deploy): `sec-threatmodel` after Phase 1 → module-level adversarial reviews on auth, forms, admin during build → full `security-pan-check:security-audit` → fix criticals/highs → `prod-ready:audit --ci` must pass → `sec-report` archived in `docs/`.
---
## 10. Performance, SEO, and quality budgets
Performance (hard limits, CI-checked via Lighthouse CI on key pages): LCP ≤ 2.5 s and CLS ≤ 0.1 on mid-tier mobile; calculator pages interactive ≤ 2 s on 4G; route JS ≤ 170 KB gzipped excluding the lazy hero chunk (≤ 300 KB, §5.4); images AVIF/WebP via `next/image`; fonts self-hosted, subset, `display: swap`.
SEO: unique metadata everywhere; Open Graph images per pillar (designed, on-brand); JSON-LD (`Organization`, `WebSite`, `MedicalWebPage` for calculators with appropriate modesty); sitemap + robots; canonical URLs on towardpcc.com with the other domains 301-redirected (document in the deploy runbook).
Quality: axe-clean in CI on all public pages; Playwright e2e for the critical journeys (home → calculator → compute → copy result; each form → admin inbox; offline calculator use); zero console errors; `code-cleanup` families run before each release (dead code, weak types, async patterns, slop-remover on comments).
---
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
## 13. Phased delivery plan (each phase = plan → build → review → verify, per §15)
- **P0 — Foundation.** Repo, monorepo tooling, CI skeleton, Docker stack, Next.js app boots, design tokens stubbed, `.env.example`, ADR-0001 (stack). *Accept:* fresh clone → `pnpm i && docker compose up` → running app; CI green.
- **P1 — Design system & shell.** §5 process executed (mood-reference review via browser, design plan, self-critique), tokens/typography/components in `packages/ui`, header/footer/404/500, motion guidelines. *Accept:* design plan ADR written; shell screenshots reviewed against the brief at 5 viewports; axe-clean.
- **P2 — Scoring engine + first 8 calculators.** Engine architecture, versioning, test harness; 8 Tier-A scores end-to-end with the full detail UX (§6.4). *Accept:* 100% engine coverage; every expected value cites its published source; validation-pending badge and client-side privacy line render; offline compute works.
- **P3 — Full Tier-A catalog + index + PWA.** Remaining Tier-A scores, index with search/filter/favorites, Serwist offline, install flows. *Accept:* ~20 calculators live; airplane-mode e2e passes; Lighthouse budgets met on calculator pages.
- **P4 — Home & the signature hero.** R3F hero with poster fallback and reduced-motion path, bento pillars, trust strip, roadmap. *Accept:* budgets in §5.4/§10 met on mid-tier hardware; hero degrades gracefully; the page is memorable — critique it honestly in-browser before calling it done.
- **P5 — Pillar pages + forms + admin.** /knowledge (with real PedsCC Library facts + screenshots), /data, /services, /about, /contact; Submission pipeline; admin with 2FA, inboxes, calculator meta/validator management, audit log; email notifications. *Accept:* every form → inbox → status change → email, e2e-tested; authz verified server-side; rate limits demonstrably work.
- **P6 — Legal & trust pages.** §8 pages written, privacy notes placed everywhere §8.4 requires, retention job scheduled, `TODO:counsel-review` markers in place. *Accept:* compliance wording matches §8.3 exactly in spirit; nothing overclaims.
- **P7 — Hardening & audits.** Full `security-pan-check:security-audit` → remediate criticals/highs → `prod-ready:audit --ci` green → `code-cleanup` pass → `sec-report` archived. *Accept:* both audit gates pass; scorecard committed to `docs/`.
- **P8 — Launch readiness.** Runbooks written and restore rehearsed, staging deploy on `[HOSTING_TARGET]`, monitoring live, redirects for the sibling domains documented, final founder review checklist (validator names still pending is expected and fine). *Accept:* staging is production-identical; go-live is a runbook step, not an adventure.
---
## 14. Installed toolkit (inventory — know what's on hand)
Plugins/skills available in this workspace: **superpowers** (using-superpowers, brainstorming, writing-plans, executing-plans, subagent-driven-development, dispatching-parallel-agents, test-driven-development, systematic-debugging, requesting/receiving-code-review, verification-before-completion, finishing-a-development-branch, using-git-worktrees, writing-skills) · **anthropic-skills** (idea-refine, skill-creator, consolidate-memory, docx/pptx/xlsx/pdf, schedule, setup-cowork) · **taskmanager** (init, plan, run, show, update, research, memory, export; SQLite/FTS5) · **security-pan-check** (security-audit, sec-code/api/web/ai/database/container/iac/mobile/supplychain/threatmodel/report + scanner agents) · **prod-ready** (audit, scorecard, fix, and 20 category deep-dives) · **code-cleanup** (cleanup-code + 11 dimension agents incl. dead-code-hunter, weak-type-eliminator, async-pattern-fixer, slop-remover) · **feature-dev** (feature-dev; code-architect/explorer/reviewer agents) · **frontend/design** (frontend-design, taste-skill:*, ui-ux-pro-max:*, dataviz, artifact-design) · **built-ins** (deep-research, code-review, simplify, security-review, verify, run, claude-api, claude-automation-recommender, loop, schedule, update-config) · **agents** (general-purpose, Explore, Plan, code-simplifier, claude-code-guide, taskmanager, plus the scanner/review agents above) · **MCP** (Claude_Browser — connected; claude-in-chrome — deferred; visualize; ccd_session*; mcp-registry; scheduled-tasks; SaaS connectors present but unauthenticated — **do not OAuth any without asking**). Skills scoped to the NeuroSim ICU simulator repo (session-start, domain-grounding, clinical-validator, etc.) do **not** apply here. The `test-specialist` (Pest/Laravel) plugin is N/A to this Node stack.
## 15. Phase ⇄ skill mapping (the mandate, applied)
| Phase | Invoke |
|---|---|
| Kickoff | `using-superpowers` → `superpowers:writing-plans` on this document → `taskmanager:init` + `taskmanager:plan` (this file is the PRD) → store locked decisions (§1) as taskmanager memories |
| P1 design | `frontend-design` + `taste-skill:*` / `ui-ux-pro-max:design-system`; `Claude_Browser` for §5.1 mood review and every self-critique screenshot; `dataviz` when admin stats appear |
| All build slices | `subagent-driven-development` + `test-driven-development`; `feature-dev:code-architect` before each new module; `using-git-worktrees` for risky/parallel slices |
| Research moments | `taskmanager:research` / `deep-research` (e.g., Tier-B instrument IP status §6.4; PDPL wording sanity for §8; hosting-region verification §11) |
| Every slice completion | `requesting-code-review` → `receiving-code-review` → `verification-before-completion` → `run`/`verify` in-browser → `finishing-a-development-branch` |
| Security cadence | `sec-threatmodel` after P1; targeted `security-review` on auth/forms/admin during P5; full `security-pan-check:security-audit` + `sec-report` in P7; `sec-ai` if any AI-assisted feature touches the product |
| Quality cadence | `code-cleanup` dimensions before each release; `simplify` on churned code; `prod-ready:audit` at P7/P8 (`fix` for safe remediations) |
| Ops | `update-config` for hooks/permissions early; `schedule`/`loop` for the retention purge job and recurring audits; runbooks in `operations:runbook` style |
## 16. Working agreements
1. **Never fabricate** content, data, names, logos, or claims (§2.1). Placeholders are explicitly marked and listed in a `LAUNCH-BLOCKERS.md`.
2. **Ask before:** creating accounts on external services, authenticating any MCP connector, spending money, deploying to the public internet, deleting data, or deviating from a locked decision in §1.
3. Formula changes to any score go through code + tests + version bump only — never through the admin CMS.
4. Conventional Commits; one reviewable slice per branch; ADR for every significant decision; keep `.env.example`, runbooks, and README current as you go.
5. Definition of done for any slice: tests green, review received and addressed, verified live in the browser with evidence, a11y/perf budgets respected, docs updated, branch finished cleanly.
6. When this document and reality conflict (e.g., a PedsCC Library feature I described doesn't exist), reality wins — flag it, propose the fix, update the doc.
## 17. Kickoff — your first actions, in order
1. Invoke `using-superpowers`; read this entire document; list any ambiguities or missing variables in one batch of questions.
2. Run the Kickoff row of §15 (plan → taskmanager breakdown → memories).
3. Present the P0–P8 task tree for approval.
4. On approval, execute P0 — and from that moment, every phase ends with evidence, not assertions.
Build something a PICU clinician anywhere in the world would trust at first sight and still respect after a year of daily use. That is the bar.
