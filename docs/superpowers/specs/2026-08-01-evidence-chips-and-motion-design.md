# Evidence chips, view transitions, and one photograph

**Status:** approved 2026-08-01.
**Scope:** `/trust`, `/validation`, `/services`, and one site-wide CSS rule.

## Why

Two pages are measurably starved, and they are the two that carry the site's
credibility. Measured on the running site at 1440px:

| route           | words | images | cards | words per screen |
| --------------- | ----- | ------ | ----- | ---------------- |
| **/trust**      | 761   | **0**  | **0** | **172**          |
| **/validation** | 521   | **0**  | 1     | **146**          |
| /               | 673   | 2      | 13    | 109              |
| /about          | 432   | 2      | 10    | 99               |
| /services       | 275   | 1      | 8     | 75               |

`/trust` and `/validation` are roughly twice the text density of everything else
and have no visual structure at all.

The fix is not photography. `/trust` is a series of claims, each ending in a
"How it is checked" line that names a machine-checkable artefact — a
zero-network test, a coverage gate, a validator slot. The page _describes_ its
proofs and shows none of them, which is the last place on the site still telling
rather than showing. The hero draws the RSA coupling instead of captioning it;
the result panel prints its cutpoints beside the number. `/trust` should hold
the same register.

A stock clinician beside "nothing you type is transmitted" spends credibility
rather than building it, which is also why this site has no founder portrait.

## The rule that governs everything below

**A chip may only display a value the build can compute, or a constant a CI gate
holds. Anything else gets no chip.**

This is the constraint doing the most work, and it is meant to cost us chips. An
evidence chip showing an underivable number is exactly the decorative assertion
the page exists to refuse — and it would rot, silently, the first time the
underlying fact changed.

Applied honestly it produces three tiers:

- **Computed** — read from source at build time. The chip shows the value.
- **Enforced** — a constant a CI gate holds. The chip shows the value _and names
  the gate_, so a reader can go and check the gate rather than trust the chip.
- **Neither** — no chip. Prose only.

### What this costs

Two chips from the original seven, dropped rather than faked:

- **Data residency.** `me-riyadh-1` appears in the repository only inside a
  comment (`apps/web/content/site.ts:736`). There is no machine-readable region
  constant, so a locator chip would be a hand-typed string dressed as evidence.
- **Backups and the restore drill.** The last drill date lives in a runbook, in
  prose.

If either is wanted later, the work is to make the fact derivable first — export
the region from deployment config, record drill dates in a machine-readable file
— and the chip follows for free. That order is the point.

## What ships

### `/trust` — five chips

| #   | Claim                            | Tier     | Chip                                                                                                      | Source of the value                                                                                                                                    |
| --- | -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Nothing you type is transmitted  | Enforced | Miniature network panel: request rows resolving to `0 requests`, captioned with the spec that enforces it | `apps/web/e2e/calculator-privacy.spec.ts` — named in the caption, not parsed                                                                           |
| 2   | N calculators, N citations       | Computed | Two counters over a hairline                                                                              | `listScores({ status: "published" }).length` and `registry.reduce((n, s) => n + s.references.length, 0)`, both already derived in `app/trust/page.tsx` |
| 3   | Cannot merge below full coverage | Computed | Meter at 100% with the four axes named                                                                    | A constant in `lib/evidence.ts`, pinned by test to `thresholds` in `packages/scoring-engine/vitest.config.ts` — see below                              |
| 4   | Clinical review is pending       | Computed | Progress track reading `0 of 23`                                                                          | `validated` / `registry.length`, already derived in `app/trust/page.tsx`                                                                               |
| 5   | Accessibility is asserted        | Computed | Contrast pair swatch showing a measured ratio                                                             | `contrastRatio()` from `@towardpcc/ui`, over two `tokens.css` values                                                                                   |

Chips 2 and 4 consume values the page **already computes and currently renders
only as words inside a heading**. Neither needs new derivation.

Chip 3 does **not** import the vitest config, and the reason is worth writing
down. `packages/scoring-engine/vitest.config.ts` opens with
`import { defineConfig } from "vitest/config"`, so importing it into the app
would pull a dev dependency into the production module graph to render one
number. Instead the threshold is declared as a constant in `lib/evidence.ts`,
and a **unit test asserts that constant equals the vitest config's threshold** —
the test runs under vitest and may import it freely. Drift stays impossible and
the app bundle stays clean.

Chip 1 is the only Enforced-tier chip. Its caption names the spec file, because
a chip asserting `0` without saying what enforces it is precisely what this page
refuses.

### `/validation` — one chip

A progress ring above the existing table, reading the same `0 of 23` from the
same source as chip 4. Same underlying value, different presentation: the ring
is this page's subject, where on `/trust` it is one claim among five.

### `/services` — one photograph

The only new image on the site. `/services` is research aid, biostatistics and
research guidance provided by the team — the one page whose subject is people
rather than proof.

Sourced from Envato Elements. **Three to four candidates are presented for
approval before any file is downloaded.** The chosen image ships through the
existing `ImageSlot` + `next/image` path, which already serves WebP — measured
live, 35 KB WebP against 54 KB JPEG.

`/trust`, `/validation` and `/contact` receive no photography.

## Motion

Three items. All CSS, no new client JavaScript.

**1. Cross-document view transitions.** `@view-transition { navigation: auto }`
in `globals.css`, plus `view-transition-name` on the site header so it holds
position across navigations rather than cross-fading with the page. Browsers
without support navigate exactly as they do today; no polyfill, no feature
detection. The existing `prefers-reduced-motion` block disables the animation.

**2. The three dead reveal directions.** `left`, `right` and `scale` are defined
in `globals.css` and consumed nowhere. The chips are where `scale` earns its
place: a proof object that settles into view reads differently from one that
slides, and that distinction is the reason to use it rather than variety for its
own sake.

**3. Chip motion, once, on scroll-in.** Each chip animates the quantity it
measures — the coverage meter fills to 100%, the counters count, the network
panel's rows resolve to `0`. Reuses the shipped `Reveal` and `Counter`, so no
new client JavaScript.

Explicitly excluded: parallax, scroll-jacking, and any motion on the calculator
detail route. `docs/design/motion.md` revision 4 — the number may not move, and
neither may its inputs or its panel.

## Components

One new component, one new module, edits to four files.

```
apps/web/components/trust/evidence-chip.tsx   new — the shared frame
apps/web/lib/evidence.ts                      new — the derivations
apps/web/app/trust/page.tsx                   edit — five chips into <Claim>
apps/web/app/validation/page.tsx              edit — one ring
apps/web/app/globals.css                      edit — @view-transition
apps/web/app/services/page.tsx                edit — the photograph
```

**`lib/evidence.ts`** owns every derivation and exports plain values. It is the
only place that knows how a figure is computed, so a chip cannot invent one. It
imports no React and is unit-testable without a DOM — the lesson from
`shortCite`, whose regex could never match precisely because it lived in a
`.tsx` the unit runner cannot parse.

**`EvidenceChip`** owns the frame: border, padding, caption slot, reveal
behaviour. Each specific chip is a small server component passing children into
it. The frame does not know what a coverage meter is.

## Accessibility

Every chip is a redundant visual encoding of a sentence already on the page, so
the graphic is `aria-hidden` and the value stays in the prose — the same
decision the calculator's band scale makes, for the same reason. Nothing in a
chip is the sole carrier of any information.

Colour is never the only signal: the coverage meter carries its percentage as
text and the progress track carries `0 of 23`.

Chip 5 displays a contrast ratio, so it must itself pass the ratio it reports.
Asserted in a unit test alongside the existing `tokens.test.ts` pairings.

## Testing

- `lib/evidence.ts` gets a unit test per derivation, including the case that
  matters most: **the validated count is 0 today, and the chip must render
  `0 of 23` rather than hiding.** A progress component that treats 0 as "nothing
  to show" would silently delete the site's most honest claim.
- A test asserts the coverage constant in `lib/evidence.ts` equals the vitest
  config's `thresholds`, so the rendered figure cannot drift from the gate it
  claims to report. This test is the reason the chip may declare the number
  rather than import the config.
- An e2e test asserts every chip is `aria-hidden`, and that its value also
  appears as text in the surrounding prose.
- Existing layout e2e covers `/trust` and `/validation` at 375/768/1440; the
  chips must not introduce horizontal scroll at 320px.
- Route JS for `/trust` and `/validation` must not increase. The chips are
  server-rendered SVG; if the number moves, something became a client component
  that should not have.

## Budget

Route JS unchanged — chips are server-rendered, view transitions are CSS. The
only new bytes are the single `/services` photograph, through the existing
optimiser. The 170 KB gate has 13–22 KB of headroom and this spends none of it.

## Out of scope

Photography on `/trust`, `/validation` or `/contact`. A loading screen — measured
live production is TTFB 38 ms, first contentful paint 200 ms, load complete
155 ms, so a spinner would cover a page that has already painted. Any motion on
the calculator detail route. Making residency or backup dates derivable, which
is its own piece of work and a precondition rather than a part of this one.
