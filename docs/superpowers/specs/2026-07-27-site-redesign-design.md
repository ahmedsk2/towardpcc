# TowardPCC site redesign — design spec

- **Date:** 2026-07-27
- **Status:** approved by the founder (direction confirmed against an interactive mockup)
- **Deciders:** founder + founding engineer
- **Supersedes (in part):** `docs/decisions/ADR-design-direction.md` — see §11
- **Mockup:** interactive concept, home + Knowledge pillar (v2, warmed palette)

---

## 1. Problem

The live site is thin, not wrong. Measured on 2026-07-26:

| Symptom                         | Evidence                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| Three of four pillars are stubs | `/knowledge`, `/data`, `/services` are 29 lines each — heading, two paragraphs, a form           |
| `/about` is a fragment          | 67 lines; no story, no founder, no credentials                                                   |
| No UI furniture                 | 8 UI components; no dropdown, back-to-top, accordion, tabs, breadcrumbs, carousel                |
| Real assets are invisible       | 22 calculators, 89 citations, a 2,425-document library with 64,388 indexed pages — none surfaced |
| Copy contradicts reality        | `site.ts` says "In development. Launching soon." while the site has been live since 2026-07-26   |

The founder's read — _"very minimalist … boring … no visuals or animations"_ — is correct and is a **content and craft** gap first, a styling gap second.

## 2. Approved direction

Richer, warmer, and visibly alive, taking **structure and polish** from the reference sites
(`webstrot.com/html/medisch`, `nayonacademy.com/html/kidocare`) while refusing the four
things that would cost credibility with physicians.

**Audience:** clinicians first (bedside, ~10-second credibility judgement), institutions second.

**Adopted from the references:** top utility bar; sticky header that shrinks; hover mega-menu;
feature cards overlapping the hero; about-split with photo and floating stat badge; full-width
gradient counter band with animated numbers; image-headed cards; carousel; FAQ accordion;
breadcrumbs; back-to-top; fat footer with newsletter + consent checkbox.

**Deliberately refused** (each is a defect in the references, none costs visual appeal):

1. **Preloader** — blocks a loaded interface behind a splash. A clinician opening a calculator mid-resuscitation must see input fields.
2. **Perpetual motion** — the bouncing back-to-top, 13 infinite decorative loops, and `AOS once:false` (content re-animating on every scroll pass).
3. **Smooth-scroll hijack** (Lenis) — breaks anchor precision, assistive tech, and muscle memory.
4. **Invented figures** — "4500 Happy Patients", fake partner logos, fabricated testimonials.

## 3. Visual system

### 3.1 Palette (warmed Pulse Crimson)

| Token                            | Hex                               | Role                                       |
| -------------------------------- | --------------------------------- | ------------------------------------------ |
| `crimson`                        | `#CF1F3D`                         | primary accent (brightened from `#B01E32`) |
| `crimson-bright`                 | `#EA3A57`                         | gradient partner, hover                    |
| `crimson-deep`                   | `#8F1728`                         | pressed, deep accents                      |
| `coral`                          | `#FF7A6B`                         | **new** warm secondary                     |
| `coral-soft` / `peach`           | `#FFB3A3` / `#FFD9CC`             | tints, icon fills                          |
| `blush` / `cream`                | `#FFF2EE` / `#FFFAF7`             | page grounds (replaces grey-porcelain)     |
| `plum` / `night`                 | `#3D1526` / `#260E1A`             | dark bands, footer                         |
| `ink` / `ink-body` / `ink-muted` | `#2B1B20` / `#4A3D40` / `#6F5D63` | text                                       |
| `moss` / `amber`                 | `#2E6B4F` / `#8A5900`             | semantic only — success / warning          |

**Gradients are now permitted** (the previous ADR banned them): `grad-hero`
(plum → crimson → coral), `grad-accent` (crimson → coral), `grad-soft` (blush → cream).

**Rules retained:** crimson never doubles as the error colour — alerts are amber + icon, so a red
button always means "act", never "wrong". No blue or teal. Gold stays out (it is the international
childhood-cancer colour).

### 3.2 Typography

Unchanged: **Space Grotesk** display / **Inter** body / **IBM Plex Mono** numeric, all SIL OFL,
self-hosted. All figures render in Plex Mono with `tabular-nums`.

### 3.3 Layout

Alternating section grounds — cream, white, blush, gradient band — replacing the single flat
surface. `max-width: 1280px`, `padding-block: 96px` desktop / 64px mobile. Pill buttons
(`border-radius: 999px`), `20px` card radius.

## 4. Component library

New: `MegaMenu`, `UtilityBar`, `Accordion`, `Tabs`, `Breadcrumbs`, `BackToTop`, `Counter`,
`Carousel`, `FeatureCard`, `PillarCard`, `ImageSlot`, `StatBadge`, `Drawer`, `CredChip`,
`EvidenceCard`, `Newsletter`.

Icons are **inline SVG using `fill="currentColor"`** — no icon font (never renders as tofu,
themes for free).

## 5. Page specs

### 5.1 Home

Utility bar → sticky header + mega-menu → gradient hero (badge, headline with coral gradient span,
dual CTA, trust row, floating device card with live waveform, two floating info cards, wave divider)
→ four overlapping feature cards → mission split with photo slot and stat badge → animated counter
band → four pillar cards with image headers → evidence carousel → founder section → gradient CTA band
→ fat footer.

### 5.2 Pillar template (`/knowledge`, `/data`, `/services`)

Compact gradient hero with status badge → four stat cards → capability split with image → topic tags
→ FAQ accordion → CTA band. This template converts all three stubs into full pages.

### 5.3 `/about`

Mission, the approved vision sentence (currently unused), the brand story (PICU has no claimed
awareness colour; the waveform is respiratory because a flatline reads as death in a PICU),
principles, honest roadmap, and the founder section.

### 5.4 Calculators

Index gains category tabs, filters, and data-pair cards (`Population · Inputs`). Detail page gains
breadcrumbs, formula transparency, a citation block with PMID + DOI, validation status, and related
scores. **Motion is off during reading; the result panel never animates.**

## 6. Motion

Extends `docs/design/motion.md`:

- Interactions **120–180ms**, explicit properties — never `transition: all`.
- Scroll reveals fire **once** (`IntersectionObserver` + `unobserve`), 26px rise + fade.
- Counters animate once on entry, cubic ease-out, ~1500ms — **marketing figures only**.
- Ambient: drifting blurred blobs, floating cards, pulsing live dot, glowing waveform.
- Canvas waveform pauses when scrolled out of view.
- `prefers-reduced-motion` collapses everything, including counters (jump to final value) and the
  waveform (static poster). Absolute, no exceptions.

## 7. Imagery

Founder-approved: free-licensed photography **including people** (clinicians, children, patients),
abstract brand visuals, and a custom icon/illustration system. Placeholders ship first; real art is
generated or sourced afterwards.

**Constraints:** images must be genuinely free-licensed, and must never be captioned or positioned to
imply they depict TowardPCC's own unit, staff, or patients. The founder's portrait must be a real
photograph — a generated likeness of a named real physician would be a fabrication.

**Slots:** hero mission photo, library screenshot, four pillar-card headers, founder portrait,
section background textures.

## 8. Content changes

**Corrections:**

- Remove "In development. Launching soon." — the site is live.
- Knowledge status → **"In production · piloting"** (piloted with a small group of PICU physicians across the Gulf).
- Data status → **"Pilot underway"** — _"A PICU registry is currently being piloted in one unit in the Gulf region. This public site collects no patient data."_ **No hospital is named.**

**Additions (all verified):** 22 calculators · 89 citations with PMID + DOI · 100% engine coverage ·
2,425 documents · 64,388 pages indexed · 10.4 GB corpus · 69 tags across 11 topic groups · the
approved vision sentence · the brand story.

**Evidence block replaces testimonials** — Del Fiol (_JAMA Intern Med_ 2014), Kell (_JAMIA_ 2024),
Brassil (_J Med Libr Assoc_ 2017), Baxter (_Appl Clin Inform_ 2022), MicroGuide 91/152 NHS trusts.

**Founder bio:** Dr. Ahmed Alkhalifah — Pediatric Intensivist. MBBS/MD; Saudi Board in Pediatric
Medicine; Fellowships in Pediatric Critical Care and Pediatric Neurocritical Care. Published in
_PLOS ONE_ and _Open Access Emergency Medicine_. **No employer named; Qatif is omitted by explicit
founder instruction** so the unnamed registry pilot site cannot be inferred.

## 9. Constraints that hold

1. **Authenticity** — no invented numbers, logos, testimonials, or counters. Any figure without a true source is deleted, not estimated.
2. **Privacy invariant** — calculators compute client-side; the zero-network Playwright test must keep passing.
3. **WCAG 2.2 AA** — body copy targets 7:1 (both reference sites fail or barely pass); focus visible; reduced motion honoured; 44px targets.
4. **Performance** — the 170KB gzipped route-JS budget still gates CI. Ambient motion is CSS/Canvas, not a library. If a section cannot fit the budget, the section changes, not the budget.

## 10. Open items (founder input)

- Real figures for the four counter slots: PICU physicians in the pilot, countries in the pilot group, research requests supported, peer-reviewed publications. Any without a true number gets deleted.
- Founder portrait photograph.
- Whether to name the Library's institutional source code (`SK`) on `/knowledge`.

## 11. Relationship to ADR-design-direction

This spec **revises** the accepted ADR on three points, by founder decision after reviewing a built
mockup:

1. The Envato/medical-template register is no longer a blanket anti-target — its _structure_ is adopted.
2. Gradients are permitted (previously banned outside the night band).
3. Photography including people is permitted (previously "real product screenshots only").

Unchanged: crimson-never-means-error, no blue/teal, no gold, the respiratory-not-cardiac waveform,
the type stack, and the authenticity rule. **The ADR must be updated with a superseding entry as part
of implementation** — it is the design authority named in `CLAUDE.md` and must not silently disagree
with the shipped site.

## 12. Implementation phasing

The scope spans tokens, a component library, and five page types — too much for one plan. It
decomposes into four shippable slices, each independently verifiable and each leaving the live site
working:

| Slice                         | Contents                                                                                                                                       | Done when                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **R1 — Foundation**           | Warmed tokens, type scale, gradients, motion tokens; `motion.md` and the ADR superseding entry                                                 | Existing pages render on new tokens with no visual regression; contrast audit passes |
| **R2 — Chrome & furniture**   | Utility bar, sticky/shrinking header, mega-menu, mobile drawer, breadcrumbs, back-to-top, fat footer                                           | Keyboard + touch navigable; axe clean; budget holds                                  |
| **R3 — Home**                 | Hero (canvas waveform, floating cards), feature cards, mission split, counter band, pillar cards, evidence carousel, founder section, CTA band | Home matches the approved mockup; counters animate once; reduced-motion verified     |
| **R4 — Pillar & about pages** | Pillar template applied to `/knowledge`, `/data`, `/services`; `/about` rebuilt; all copy corrections from §8                                  | Zero stub pages remain; every published figure traces to a verified source           |

Calculator-page refinements (§5.4) are a **separate follow-up slice (R5)** — they touch the clinical
surface and should not ride along with a marketing redesign.

## 13. Out of scope

Simulation / NeuroSim (locked out of scope, MEM-006); a true dark theme (post-v1 token swap);
multi-tenant SaaS; naming the registry's pilot hospital; any change to scoring-engine formulas.
