<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 0, 1, 2). Load only the slice a phase needs. -->

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
