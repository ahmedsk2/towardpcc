# ADR-design-direction: TowardPCC visual direction

- Status: **accepted** — direction approved by the founder 2026-07-24 with one
  major revision: the original petrol/teal palette was rejected ("something
  other than blue and teal") and replaced by **Pulse Crimson**, chosen by the
  founder from three candidates grounded in field research
  (docs/research/2026-07-24-picu-brand-colors.md). Part 2's palette table
  reflects the chosen palette; the original petrol/teal table is superseded.
- Date: 2026-07-24
- Deciders: founder + founding engineer, against the founder's brief (PRD §5)

## Part 1 — Mood-reference review (§5.1)

Reviewed live in the browser on 2026-07-24: Dribbble `tags/3d-website`,
`shots/popular/web-design`, `shots/popular`, `tags/ui-template`, and Envato
Elements UX/UI kits. Principles extracted, no copies taken; nothing was
downloaded and no purchasable kit informs any asset in this repo.

### What the strongest work shares (principles to apply)

1. **One confident idea per composition.** A single hero object or scene on
   a calm field; everything else recedes. The weak shots crowd; the strong
   ones commit.
2. **Exactly one accent at full strength.** Dark scenes carried by a single
   glowing hue; light scenes by one saturated accent against warm neutrals.
   Two competing accents at equal strength read as template.
3. **Technical annotation as a design language.** Mono type, bracketed
   labels, fine hairline rules, coordinates — the "instrument panel" idiom
   (satellite-control dashboards, HUD-framed 3D scenes, molecular line
   diagrams drawn as precise line art). This resonates directly with the
   PICU monitor world — but per PRD §5.3, structural labels appear only
   where they encode real information. Annotation as decoration is noise.
4. **Negative space is the premium signal.** Generous margins, low element
   density, large quiet type. Commodity kits are dense; premium work
   breathes.
5. **Numbers presented as the product.** The best fintech shots set figures
   in tabular numerals with strong hierarchy — data gains authority from
   its own typeface. Maps directly to scores/results in the mono numeric
   face with `tabular-nums`.
6. **Porcelain-light surfaces + fine line-work read clinical-clean without
   sterility.** Soft shadows, hairline diagram strokes, structured info
   cards on warm off-white.
7. **Tinted darks, never pure black.** The strongest dark scenes are
   atmospheric petrol/deep-navy/deep-green with depth — validating
   "midnight-petrol, never generic near-black."
8. **Type does the branding.** Characterful grotesk display in tight
   leading; small quiet wordmarks; zero badge clutter.

### Anti-targets observed (the defaults to refuse)

- Purple/blue nebula-gradient "dashboard in space" heroes
- Acid green on near-black (also explicitly banned by PRD §5.2)
- Pastel three-card SaaS feature rows with icon chips
- Orange-glow crypto-landing gradients
- Commodity admin-kit density and feature-bullet marketing covers
  (the entire Envato UX/UI-kit aesthetic is the anti-target: TowardPCC
  must never look purchasable)
- Mascots, blob characters, decorative 3D clutter

### Implication for "Precision and pulse" (§5.3)

The concept holds against the field and sharpens: a tinted-dark hero with
one breathing waveform element and sparse real-information mono annotation;
porcelain content surfaces with hairline rules and structured cards; one
sole full-strength accent; every number in tabular mono. The
scientific-line-diagram idiom is a strong from-scratch reference for
rendering formulas and score anatomy transparently. _(Historical note: this
paragraph originally concluded for midnight-petrol/monitor-teal; the color
world was revised to Pulse Crimson by founder decision — the structural
conclusions stand unchanged.)_

## Part 2 — Design plan (§5.2 pass 1)

**Design read:** trust-first clinical-tools platform for PICU clinicians
(medical-adjacent audience that judges in ten seconds), with a "precision
instrument" visual language. Dials: site-wide variance 4-5, motion 3
(hover/focus + gentle one-time reveals), density 4 — with the single
sanctioned bold moment being the home hero (P4). Boldness is spent in
exactly one place; everything else is quiet.

### Palette — Pulse Crimson (founder-chosen 2026-07-24)

| Token           | Hex       | Role                                                            |
| --------------- | --------- | --------------------------------------------------------------- |
| `night-950`     | `#231018` | hero canvas — oxblood night, tinted, never near-black           |
| `night-800`     | `#311A24` | dark-band elevation / gradient end                              |
| `porcelain`     | `#F7F4F3` | page surface — blush porcelain, cool-warm neutral, not cream    |
| `raised`        | `#FFFFFF` | cards/raised surfaces                                           |
| `mist`          | `#EBE4E3` | sunken zones, hairline tint                                     |
| `ink-strong`    | `#231A1C` | headings on light (ties to night)                               |
| `ink-body`      | `#4A3D40` | body text (≈8:1 on porcelain)                                   |
| `ink-muted`     | `#75646A` | secondary text (≈5:1 on porcelain)                              |
| `ink-on-dark`   | `#F4E9EC` | text on night                                                   |
| `crimson-600`   | `#B01E32` | THE accent: links, focus, interactive, the single primary CTA   |
| `crimson-700`   | `#8F1728` | hover/pressed, deep accents                                     |
| `rose-300`      | `#FF7D8E` | crimson's voice on dark: waveform, accents on night             |
| `amber-700`     | `#8A5900` | alerts/warnings/errors — WITH icon, never bare color            |
| `amber-100`     | `#FBEED7` | alert background tint                                           |
| `moss-700`      | `#2E6B4F` | success/confirmation text                                       |
| `moss-100`      | `#E2F0E8` | success background tint                                         |
| `accent-tint`   | `#F6E3E6` | chip/selection backgrounds on light (crimson at whisper volume) |
| `ink-on-accent` | `#FFFFFF` | text on accent fills (6.8:1 on crimson-600)                     |
| `edge`          | `#8E7E84` | control borders — ≥3:1 non-text contrast on white and porcelain |

Rules: crimson is the one accent and appears at full strength once per
screen as a CTA; brand crimson **never** doubles as an error color — alerts
and errors are amber + icon, so a red button always means "act", never
"wrong". No blue, no teal, anywhere. No gradients except the night band's
own depth. Kinship grounding: Saudi Critical Care Society red, PCICS
cardiac red; full research in docs/research/2026-07-24-picu-brand-colors.md.

### Typography

- **Display: Space Grotesk** (OFL, self-hosted, variable) — characterful
  technical grotesk with mono DNA; 500/700, tight tracking. H1
  `text-4xl md:text-6xl`.
- **Body: Inter** (OFL, self-hosted, variable) — the PRD names it; quiet,
  hyper-legible at clinical reading sizes; 400/500/600, 16px base,
  `max-w-[65ch]`.
- **Numeric: IBM Plex Mono** (OFL, self-hosted) — every number the
  platform outputs (scores, doses, results, versions) renders in this face
  with `font-variant-numeric: tabular-nums`. Numbers are the product; they
  get their own voice. Also used for the sparse technical annotations —
  which appear only where they encode real information (score version,
  category, residency fact), never as decoration.

All three are SIL OFL — **verified 2026-07-24** from the LICENSE files
shipped inside the installed packages (`@fontsource-variable/space-grotesk`
5.3.0, `@fontsource-variable/inter` 5.3.0, `@fontsource/ibm-plex-mono`
5.3.0 — each `license: OFL-1.1` with the full SIL OFL text; Space Grotesk
© The Space Grotesk Project Authors, Inter © The Inter Project Authors,
IBM Plex Mono © IBM Corp.). Self-hosting via Fontsource webfonts is
squarely within the OFL.

### Layout concept

Global: porcelain pages, 12-col grid capped `max-w-[1400px]`, section
rhythm `py-16..py-24`, nav ≤72px single-line. The home page opens with the
one night band; the dark→light boundary is drawn by the signature
waveform edge (below). All other pages are light with night reserved for
the footer band, keeping the brand bracket.

Home (§6.1):

```
┌─────────────────────────────────────────────────┐
│ nav: wordmark · four pillars · About · Contact  │ 68px, on night
├─────────────────────────────────────────────────┤
│ NIGHT BAND                                     │
│  H1 (5-7 words)          ~ breathing waveform ~ │ split hero: text left,
│  one-sentence promise      (P4 R3F / poster)    │ signature scene right
│  [Explore the calculators] [Request a pilot]    │ crimson primary, quiet secondary
│ ~~~~ waveform edge dissolves night → porcelain │ the transition moment
├─────────────────────────────────────────────────┤
│ PORCELAIN                                       │
│  four-pillar bento — exactly 4 cells, rhythm:   │
│  ┌──────────────────────┬───────────┐           │
│  │ Calculators (wide)   │ Knowledge │           │ status chips carry real
│  ├───────────┬──────────┴───────────┤           │ state: live / in pilot /
│  │ Data      │ Services (wide)      │           │ in design / free & open
│  └───────────┴──────────────────────┘           │
│  trust strip (full-width, not a bento cell)     │ → /legal/data-protection
│  mission excerpt (short, quiet)                 │
│  honest roadmap: live · piloting · next         │
│  footer on night: pillars · legal · KSA line   │
└─────────────────────────────────────────────────┘
```

Calculator detail (mobile-first — bedside phone is the primary context):

```
┌────────────────────┐
│ ← calculators · name│
│ INPUT CARD          │  one column, 44px+ targets,
│  age      [___] mo  │  unit toggles inline
│  PaO₂    [___] kPa⇄ │
│ RESULT PANEL        │  live, IBM Plex Mono,
│  ┌───────────────┐  │  tabular-nums, precision-
│  │ 14 · band     │  │  correct, interpretation band
│  └───────────────┘  │
│ copy result · print │
│ validation badge    │  "pending" state honest
│ privacy line        │  client-side statement
│ formula · references│
│ version · limits    │
│ disclaimer          │
└────────────────────┘
```

### Signature element

The **breathing waveform**: a single slow respiratory-rhythm trace (calm
sinusoid — deliberately respiratory, never a cardiac trace that could
flatline). It exists in exactly two forms: (1) the P4 hero scene — lines/
particles breathing and resolving into the four pillars; (2) the static
waveform edge where the night band dissolves into porcelain — which is
also the hero's poster fallback ingredient. It appears nowhere else; it is
the one memorable thing.

### Motion guidelines (P1 scope)

Hover/focus states that aid comprehension; one-time 400ms fade/12px-rise
reveals on section entry; durations/easings only from motion tokens; all
behind the central `prefers-reduced-motion` guard (reduce ⇒ static,
no exceptions). No marquees, no parallax, no scroll-hijack anywhere.
The orchestrated hero moment is P4's job and stays inside these guards.
**Operative motion spec: docs/design/motion.md** — if that file and this
paragraph ever disagree, motion.md wins.

### Theme

v1 ships light-locked (single page theme; night is a band, not a mode).
Tokens are semantic CSS variables, so a true dark theme later is a token
swap, not a rework — worth doing post-v1 for night-shift bedside use, and
noted on the honest roadmap as "considering," only if the founder agrees
it belongs there.

## Part 3 — Self-critique (§5.2 pass 2)

Checked against "the generic default you'd produce for any medical SaaS":

1. **Generic medical SaaS** would be hospital-blue + Inter-everything +
   three equal feature cards + stock smiling clinicians. This plan has
   none of those: night/porcelain/crimson is not a hospital palette,
   display and numeric faces carry distinct voices, the bento has exact
   cell count with rhythm, and imagery is real product screenshots only.
2. **Banned AI-default looks** (PRD §5.2): cream+serif+terracotta — no
   serif anywhere, porcelain is cool not cream; near-black+acid-green —
   the night canvas is tinted and no green accent exists; broadsheet
   hairlines — hairlines only inside annotation contexts that encode real
   data. _(Historical note: this item originally discussed tuning
   pulse-coral away from terracotta; superseded by the Pulse Crimson
   revision — crimson `#B01E32` is unambiguously red, not earthy.)_
3. **Flatline trap** (caught and fixed): an ECG-style trace that goes flat
   reads as death in a pediatric ICU context. The motif is explicitly a
   respiratory waveform — continuous, calm, breathing.
4. **Split-hero commonness**: left-text/right-asset is common; what makes
   it specific here is the night→porcelain waveform dissolve and the
   annotation idiom. Kept, with the boundary doing the memorable work.
5. **Space Grotesk popularity**: common in tech, yes — but license-safe,
   technically-voiced, and executed with this palette and the Plex Mono
   numeric voice it reads as an instrument, not a template. The trendier
   alternative (Clash Display) has the wrong register for clinical trust.
6. **Crimson once per screen** is the discipline that keeps the palette
   from collapsing into a generic two-accent SaaS look. _(Originally
   written as "coral once per screen"; the rule carried over unchanged to
   the crimson accent.)_
