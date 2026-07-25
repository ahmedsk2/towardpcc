<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 6). Load only the slice a phase needs. -->

## 6. Functional specification by module

### 6.1 Home

Hero (headline + one-sentence promise + signature 3D + primary CTA "Explore the calculators" + secondary "Request a Knowledge pilot") → four-pillar bento (Calculators live · Knowledge in pilot · Data coming/pilot interest · Services free & open) with honest status chips → "How we handle data" trust strip (client-side calculators, KSA servers, minimal collection) linking to /legal/data-protection → mission excerpt → honest roadmap ("what's live, what's piloting, what's next") → footer. **No fake logos, counters, or testimonials — ever** (§2.1).

### 6.2 Copy & voice

Confident, precise, humane; sentence case; active voice; plain verbs; no hype ("revolutionary", "world-class"), no filler. Draft all site copy yourself following the `frontend-design` writing guidance, mark uncertain claims `<!-- TODO:founder-review -->`, and compile every user-visible string into one reviewable `content/` layer (this is also the dormant i18n scaffold).
Mission/vision to adapt (founder-approved wording, refine but keep meaning):

- **Vision:** _Every child in critical care benefits from the same knowledge and tools, no matter where their PICU is._
- **Mission:** _TowardPCC builds the digital backbone of pediatric critical care — free clinical calculators for every clinician, knowledge and data systems for every unit, and research support for every investigator — starting in Saudi Arabia and the Gulf, built for the world._

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
- **Validation status is displayed honestly:** until both validator slots are filled, show a clearly designed badge — _"Independent clinical validation: pending"_ — with two visible empty slots. When names are added later (admin UI), the badge flips to _"Validated by [Name], [Name] — [date]"_. Never render fake names; pending-state honesty is a trust feature.
- **Privacy line on every calculator:** _"Calculations run entirely in your browser. Nothing you enter is transmitted or stored."_ — and make that architecturally true (compute is client-side from the shared engine; analytics may log page views only, never input values).
- **Disclaimer on every calculator (footer of the tool, plus /legal/disclaimer):** informational and educational use by qualified professionals; supports and never replaces clinical judgment; verify independently before clinical decisions; not a medical device.
  **Launch set — Tier A (formula/threshold-based, IP-clean, build all):** PIM3 · PELOD-2 · pSOFA · Phoenix Sepsis Score (2024) · Vasoactive-Inotropic Score (VIS) · Oxygenation Index (OI) & Oxygen Saturation Index (OSI) · P/F and S/F ratios · Pediatric GCS · Holliday-Segar maintenance fluids · Parkland/modified-Brooke burn resus (peds) · Corrected sodium (hyperglycemia) · Corrected calcium · Anion gap (±albumin correction) · Serum osmolality & osmolar gap · KDIGO AKI staging (peds) · ETT size & depth (cuffed/uncuffed, Cole/age-based) · Weight estimation (APLS age-based) · Body surface area (Mosteller) · Ideal body weight (peds methods) · QTc (Bazett/Fridericia). ≈20 at launch; flawless beats numerous.
  **Tier B (item-based copyrighted instruments — build only after per-instrument IP check):** PRISM III/IV, COMFORT-B, CAPD, WAT-1, SOS-PD, Braden QD, FLACC, PEWS variants. For each: verify whether the instrument's item wording is freely reproducible or requires permission from the rights holder; record the finding in `ipStatus` and `docs/decisions/`; if permission is required, the calculator stays unbuilt until obtained. Reproducing copyrighted scale text verbatim without permission is a professionalism failure — treat it exactly like a licensing bug.

### 6.5 PWA & offline

Installable; the entire calculator catalog precached and fully functional offline (bedside dead-zones are real); clear "you're offline — calculators still work" state; update-available toast; iOS/Android install guidance page. This PWA is the bridge until the native apps ship.

### 6.6 Knowledge (`/knowledge`)

Product page for the **PedsCC Library**: what the platform does (library & file/resource management for PICU teams — organization workspaces, structured folders, versioned documents, approval workflow, expiry reminders, role-based access, fast search, audit trail — _confirm the exact live feature list by reading the PedsCC Library repo's README/docs via a read-only agent; describe only what actually exists_), an honest "in pilot" banner, annotated real screenshots or a short demo capture from the actual app (no mockups passed off as product), the "software, not content" clarification (_your unit's documents remain your unit's documents_), a data-handling note, and a **pilot request form** (name, role, institution, unit type, country, current document-management pain, email) → stored + notify `[ADMIN_EMAIL]` → admin inbox with statuses (new/contacted/piloting/closed). If SSO or deeper integration with the library is desired later, write an ADR first; v1 links out.

### 6.7 Data (`/data`)

Vision page for the Gulf/MENA PICU registry and unit dashboards. Contents: the problem (regional units lack shared benchmarking), the approach (unit-level dashboards first, multi-center registry next; built on the same validated scoring engine as the public calculators), an honest "in design — inviting founding pilot units" status, and the **privacy & residency commitments stated prominently** (§8.3 wording). A pilot-interest form (institution, role, unit size, country, email) → same inbox pattern. **No patient-data features are built in v1** — but the org/unit data model in Prisma is designed now so the registry lands on this spine later.

### 6.8 Research Services (`/services`)

Three offerings, all **free**: research aid (question refinement, protocol/IRB guidance, literature strategy), biostatistics analysis (study design & analysis support), AI-assisted research guidance for fellows (AI-assisted searching/summarization/drafting support — always human-reviewed, never auto-generated advice). Copy must state plainly: _provided free of charge by the TowardPCC team, subject to availability and capacity; requests are queued and we respond as bandwidth allows._ Request form (name, role/stage, institution, country, service type, project summary ≤ 300 words, timeline, email) with a privacy note: _don't include patient-identifiable data in your request_ → queue in admin (new/triaged/in-progress/delivered/declined-capacity) with email notifications on submit and status change. No SLA promises anywhere.

### 6.9 Admin (`/admin`)

Auth.js credentials + mandatory TOTP; session hardening per §9. Modules: unified inbox (services queue, knowledge pilots, data interest, contact) with status workflows, CSV export, and internal notes; calculator management (edit metadata/interpretation copy, fill validator slots, publish versions — **formula changes happen only in code + tests, never through the CMS**); audit log (every admin action: who/what/when/before-after); basic Umami stats embed. Server-side authorization on every route and API handler — never UI-only gating.
---
