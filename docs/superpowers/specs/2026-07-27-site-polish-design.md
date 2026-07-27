# Site polish — hero motion, image framing, calculator IA, canonical host

**Status:** design, pending approval
**Date:** 2026-07-27
**Supersedes nothing.** Amends `ADR-design-direction` (motion clause) and
`docs/design/motion.md` (ambient motion clause).

## Why this exists

Four complaints from the founder after the redesign shipped:

1. the hero does not animate;
2. images are not fully visible;
3. calculator pages look plain;
4. the site should always open on `www`.

All four were reproduced and measured against production. Three are defects,
two of which were introduced by the redesign itself. This document records the
causes and the design that fixes them.

---

## 1. Findings

### 1.1 The hero is static because one gate condition is wrong

`components/home/hero-scene.tsx` enables the animated scene only when all four
hold: not `prefers-reduced-motion`, not `max-width: 768px`, **not
`pointer: coarse`**, and WebGL is available.

On a touchscreen laptop `pointer: coarse` is true, so the scene never mounts.
Measured in production: zero `<canvas>` elements in the DOM, and
`document.getAnimations()` returns **1** for the whole page — an 8×8px pulsing
dot. The three.js chunks all return 200 and the module imports cleanly, so the
build is healthy; only the gate is at fault.

The gate also costs ~874 KB of three.js on the devices where it _does_ pass,
for a decorative background.

### 1.2 `aspect-4/3.4` is not a valid Tailwind class

Tailwind's fraction shorthand takes integers. A decimal denominator does not
compile, so `.aspect-4\/3\.4` is absent from the stylesheet and
`aspect-ratio` resolves to `auto`.

The container's only in-flow child is its caption, and the image is absolutely
positioned, so the box collapses to the caption's height — **581×99**, a 5.89:1
letterbox — and `object-fit: cover` discards 74–80% of the photo.

It appears in two files, one of which is the shared pillar template, so it
affects four pages:

| Page         | Image              | Native    | Rendered | Lost  |
| ------------ | ------------------ | --------- | -------- | ----- |
| `/`          | care-nurse-smiling | 1400×928  | 581×99   | 74.4% |
| `/data`      | registry-dashboard | 1000×850  | 581×99   | 80.0% |
| `/services`  | care-thermometer   | 1242×826  | 581×99   | 74.5% |
| `/knowledge` | library-screenshot | 1400×1014 | 581×99   | 76.6% |

Two further crops are real but not bugs — the container ratio simply does not
match the source:

| Page          | Image             | Native         | Container       | Lost  |
| ------------- | ----------------- | -------------- | --------------- | ----- |
| `/about`      | care-teddy-oxygen | 1400×935 (3:2) | `aspect-21/9`   | 35.8% |
| `/`, `/about` | brand-waveform    | 1200×800 (3:2) | `aspect-square` | 33.3% |

### 1.3 Every border in the redesign is invisible

`--color-surface-sunken` (`#fff2ee`) is used as a border colour in **38
places**. Against the page it is **1.056:1**; against white, **1.094:1**.

`packages/ui/src/tokens.test.ts` asserts `--color-edge` clears 3:1 as a border
and passes — but `--color-edge` is not the token that shipped in those 38
places. The guard tested a token the code was not using.

Compounding it, every element on a calculator page computes
`box-shadow: none`. The card and section structure exists in the markup and is
simply not perceivable. This, not the layout, is the main reason the pages read
as plain.

### 1.4 Both hostnames serve 200 with no canonical

`https://towardpcc.com/` and `https://www.towardpcc.com/` both return 200, with
no redirect and no `rel="canonical"` anywhere — duplicate content on two
hostnames. Cloudflare is DNS-only for this zone, so a Cloudflare redirect rule
cannot fire.

### 1.5 The sticky result panel barely moves on short calculators

A sticky element travels only within its parent. On `/calculators/pf-ratio` the
grid parent is 214px tall and the aside is 203px, giving **11px of travel** on
a 2443px page, so the result leaves the viewport almost immediately. The same
markup works on `/calculators/pim3`, where a taller input column gives the
aside 1147px of travel. It is a structural bug, not a styling one, and it bites
exactly the calculators with the fewest inputs.

---

## 2. Design

### 2.1 Depth system — borders and elevation

The root cause of "plain" is that structure is present but imperceptible. The
fix is a token system, not per-component patching.

**Borders, three tiers.** WCAG 1.4.11's 3:1 threshold governs boundaries that
_identify a control or its state_. A decorative card edge is not one, and
forcing every hairline to 3:1 produces a heavy, wrong-looking page. So the
tiers encode intent, with measured values:

| Token                   | Value     | page / raised / sunken | Use                                         |
| ----------------------- | --------- | ---------------------- | ------------------------------------------- |
| `--color-border-subtle` | `#e7cfc7` | 1.43 / 1.48 / 1.36     | rules _inside_ a card                       |
| `--color-border`        | `#d8b8ae` | 1.78 / 1.84 / 1.69     | card edges, section dividers                |
| `--color-border-strong` | `#8e7e84` | 3.71 / 3.84 / 3.51     | inputs, buttons, tabs, any control boundary |

`--color-border-strong` is the existing `--color-edge` value. `--color-edge` is
retained as an alias so nothing breaks mid-sweep, and removed once the sweep
lands.

**Elevation.** Shadows are warm-tinted from the plum ground, never neutral
grey, so they sit in the palette rather than muddying it:

```css
--shadow-sm: 0 1px 2px rgba(61, 21, 38, 0.06), 0 1px 3px rgba(61, 21, 38, 0.04);
--shadow-md: 0 4px 12px -2px rgba(61, 21, 38, 0.1), 0 2px 6px -2px rgba(61, 21, 38, 0.06);
--shadow-lg: 0 18px 40px -12px rgba(61, 21, 38, 0.18), 0 6px 14px -6px rgba(61, 21, 38, 0.08);
```

**The guard test is rewritten to enumerate.** Instead of listing pairings by
hand — which is how this was missed — the test parses `tokens.css`, collects
**every** `--color-border*` token, and asserts each against **every**
`--color-surface-*` token, with the threshold selected by tier. A new border
token cannot be added without the test having an opinion about it. The test
also asserts, by scanning source, that `border-surface-sunken` appears **zero**
times, so the specific mistake cannot return.

### 2.2 Hero — Canvas 2D, replacing three.js

**Replace, not un-gate.** Removing `pointer: coarse` would fix touch laptops
but leaves phones excluded by the `max-width: 768px` gate, still requires
WebGL, and still ships ~874 KB for decoration. A 2D canvas runs everywhere,
costs a few KB, and is directly tunable.

`three`, `@react-three/fiber` and `@types/three` are used in exactly one file
(`waveform-canvas.tsx`) and are removed from `apps/web/package.json`.

**Gating collapses to one condition: `prefers-reduced-motion`.** No device
class is excluded. Under reduced motion the same renderer paints a **single
static frame**, so there is one drawing code path and the still and moving
states cannot drift apart.

**What it draws.** The brand mark is a _respiratory_ waveform. The existing
scene comments make this explicit — "a respiratory-rhythm amplitude envelope,
never a cardiac trace" — because an ECG complex on a PICU site reads as a
monitor and implies a diagnostic instrument. That constraint holds. The
eye-catching moment is therefore **not** a QRS spike:

1. four layered traces at differing amplitude, phase and opacity, drifting
   continuously;
2. a slow respiratory envelope modulating all of them together;
3. a **luminous crest** that travels along the leading trace every few seconds
   — a moving highlight, not an added waveform feature;
4. sparse drifting motes suggesting data points;
5. a slight parallax offset following the pointer, absent rather than gated on
   touch devices.

Colours come only from tokens legible on the dark ground: `--color-coral`
(7.11:1), `--color-coral-soft`, `--color-peach`.

**Cost control.** Device pixel ratio capped at 2; the loop stops on
`IntersectionObserver` when off-screen and on `visibilitychange` when the tab
is hidden.

**Accessibility and no-JS.** The canvas is decorative and `aria-hidden`. The
existing server-rendered `HeroWaveform` SVG stays as the pre-hydration and
no-JS layer beneath it, so the hero is never empty.

**Motion doctrine.** `docs/design/motion.md` bans infinite loops on interactive
controls and reserves ambient drift for decoration. A continuously animating
hero is consistent with that only if it stays decorative, pauses off-screen,
and collapses under reduced motion — all of which hold. The ADR gains an
explicit clause permitting continuous ambient motion on **decorative hero
elements only**, so the intent is recorded rather than inferred.

### 2.3 Images — match the container to the source, frame the screenshots

Five of seven photographs are 3:2. They were placed in containers of unrelated
ratios and then cropped by `object-fit: cover`.

`ImageSlot` gains a `fit` prop (`"cover" | "contain"`, default `"cover"`) and a
`frame` prop. Every container ratio uses **bracket syntax** — `aspect-[3/2]` —
regardless of whether the shorthand would compile, so this class of typo cannot
silently produce `auto` again.

| Image              | Native    | New container        | Fit                 | Crop           |
| ------------------ | --------- | -------------------- | ------------------- | -------------- |
| care-nurse-smiling | 1400×928  | `aspect-[3/2]`       | cover               | 0%             |
| care-thermometer   | 1242×826  | `aspect-[3/2]`       | cover               | 0%             |
| care-teddy-oxygen  | 1400×935  | `aspect-[3/2]`       | cover               | 0%             |
| brand-waveform     | 1200×800  | `aspect-[3/2]`       | cover               | 0%             |
| care-resting       | 900×1600  | `aspect-[9/16]`      | cover               | 0% (unchanged) |
| library-screenshot | 1400×1014 | `aspect-[1400/1014]` | **contain** + frame | 0%             |
| registry-dashboard | 1000×850  | `aspect-[1000/850]`  | **contain** + frame | 0%             |

Screenshots are product evidence: cropping one destroys the thing it is
showing. Both render uncropped inside a restrained window frame — a rounded
surface with a title strip — which also signals "this is real software" rather
than "this is a photo".

**Regression test.** A Playwright spec walks every image slot, reads the
image's natural dimensions, compares them to the rendered box, and fails if
more than 10% of either axis is cropped unless the element carries
`data-crop="intentional"`. That makes both the typo and the ratio mismatch
impossible to reship, and forces any future deliberate crop to be declared.

### 2.4 Calculator pages — MDCalc's information architecture

Adopted from MDCalc, which is the reference clinicians already use:

- **A result panel that is always visible.** The two-column grid and the
  `<aside>` live inside the **client** form component, not the page, so the
  sticky parent is only as tall as the input row — which is why a 2-input score
  gets 11px of travel and a 14-input score gets 1147px.

  The fix is to make that grid the page's main grid: the server-rendered
  content (chips, tabs, disclaimer) is passed **as `children` into the client
  form** and slotted into the left column. React renders those server
  components on the server and hands the client component the resulting tree,
  so nothing moves to the client and nothing crosses the RSC boundary as data.
  The left column is then tall for every score, and the sticky rail has
  page-length travel regardless of input count.

  On narrow viewports the rail becomes a bottom-anchored bar. It renders in
  every state, including incomplete, so the page is never blank where the
  answer belongs.

- **Chips above the form** — _When to use_, _Cautions_, _Why use_ — replacing
  prose sections, scannable before the first input.
- **Tabs below the form** — _Next steps_, _Evidence_, _About & version_ —
  collapsing four stacked sections into one zone. Tabs are real buttons with
  roving focus and are server-rendered open-by-default for the first panel, so
  content is present without JS.
- **Ranges move into the field.** The accepted range renders as placeholder and
  hint text on each input, dissolving the separate "Accepted input ranges"
  section.
- **The interpretation table is published** in _Evidence_, built from the
  existing `interpretation` bands — the full result→meaning lookup, not just
  the band that currently applies. **Only 10 of the 22 scores have bands; the
  other 12 declare `interpretation: []`** because they are estimators rather
  than severity scores. The table renders only when bands exist, and its
  absence is never presented as missing information.
- **Two fields we already store and currently discard are surfaced:**
  `Reference.note` (editorial context on why a citation matters) and
  `ChangelogEntry.reason` (`initial-release` / `formula-correction` /
  `new-reference` / `clarification`). Both exist on every score today and are
  simply not rendered. No data-model change.
- **A trust strip** carrying last-reviewed date, version and validation status,
  from the existing `changelog`. MDCalc has no per-page review date or version
  history; this is where we are ahead, so it is made visible rather than buried
  at the bottom.

**Deliberately not adopted.** MDCalc's input ranges are advisory — it computed
a creatinine clearance from a 900 kg weight. Ours are documented as
plausibility bounds that reject rather than compute. For a pediatric tool where
a mistyped weight changes a dose, rejecting is correct and is retained.

**Out of scope.** MDCalc prints each option's point contribution on the option
button. Our `CategoricalOption` carries only `value` and `label`; the points
live inside each score's `compute`. Surfacing them means changing the
scoring-engine data model — clinical code under a 100% coverage gate with
cited worked examples for all 22 scores. That is its own piece of work with its
own clinical review, not part of a page redesign.

**Reference classification** (Original → Validation → Guideline → Other) is
**deferred**. `Reference` is a union of `citation`, an optional `note`, and a
locator (`pmid` / `doi` / `url`) — there is no field expressing a citation's
role. Adding one means classifying **89 citations across 22 scores**, which is
a clinical-editorial judgment per citation, not a layout change. Rendering the
existing `note` field delivers much of the same value at zero risk.

### 2.4.1 Invariants the restructure must not break

These are enforced by tests that already exist and would otherwise fail
silently or late:

- **Input DOM ids stay `field-<input.id>`.** `e2e/calculator-privacy.spec.ts`
  fills `#field-na`, `#field-cl`, `#field-hco3` directly.
- **`data-print="result"` stays on the result container.** The same spec
  asserts the offline-computed value through that attribute, and the print
  stylesheet keys off it.
- **No `searchParams`, no `useSearchParams`, no `"use server"`** anywhere under
  `app/calculators/` or `components/calculator/`.
  `content/privacy-invariant.test.ts` walks both trees and fails on any match,
  and it picks up new files automatically. **Tab state is therefore client
  state, never a URL query parameter** — which is also the correct privacy
  behaviour, since a query parameter would put calculator state in the
  Referer header.
- **89 references and 22 calculators** are asserted by the home page counters
  in `e2e/layout.spec.ts`. This work changes neither count.
- **`/calculators/pf-ratio` is in the layout suite's page list** and must stay
  free of horizontal scroll at 375 / 768 / 1440.

### 2.5 Canonical host — redirect to `www`

**Redirect in `apps/web/proxy.ts`, not in Traefik.** The host is shared with a
service carrying real patient data; a Traefik middleware edit has blast radius
beyond this app, whereas the proxy change is isolated, version-controlled, and
testable in CI.

The condition is an exact match on `towardpcc.com`, issuing a **308** that
preserves path and query. An exact match leaves `localhost`,
`next.towardpcc.com` (the noindexed preview) and container health checks
untouched.

The proxy matcher excludes static assets, so those continue to serve on both
hosts. That is harmless: no HTML is reachable on the apex, so nothing is
indexed there and no service worker can register there.

**Supporting changes:**

- `alternates: { canonical: "./" }` on the root layout, giving every page a
  self-referencing canonical resolved against `metadataBase` — currently no
  canonical is emitted at all;
- the four hardcoded `https://towardpcc.com` fallbacks — `app/layout.tsx:14`,
  `app/robots.ts:3`, `app/sitemap.ts:4`, and `lib/email.ts:43` (empty-string
  fallback) — become `https://www.towardpcc.com`;
- `NEXT_PUBLIC_SITE_URL` is updated in Coolify.

A Playwright spec asserts the apex 308s to `www` with path and query intact,
that `www` does not redirect, and that a canonical is present.

---

## 3. Scope

**In:** the four complaints, the border/elevation system and its guard, the
sticky-result structural bug, and the two regression suites above.

**Out:** per-option point values; reference classification; input grouping into
labelled sections (`phoenix` has 15 inputs, `psofa` 14, `pelod2` 11, all
rendered as one flat list — grouping needs a `group` field on `ScoreInput`,
i.e. another scoring-engine change); any change to scoring logic, clinical
content, or the 22 score definitions; Traefik or shared-host configuration.

## 3.1 Delivery slices

One slice per branch, per repo convention. Ordered so each is independently
shippable and later slices build on earlier ones:

| Slice                   | Contents                                                                                                                            | Depends on                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **P1 — depth**          | border + elevation tokens, enumerating guard test, sweep of the 38 `border-surface-sunken` sites, `--color-edge` alias removed      | —                              |
| **P2 — images**         | `aspect-[…]` fixes, `fit`/`frame` props on `ImageSlot`, screenshot frames, crop regression spec                                     | P1 (frames use the new tokens) |
| **P3 — hero**           | Canvas 2D renderer, three.js removal, gate reduced to reduced-motion, ADR motion clause                                             | —                              |
| **P4 — calculators**    | children-into-client-form restructure, chips, tabs, in-field ranges, interpretation table, `note` + `reason` rendering, trust strip | P1                             |
| **P5 — canonical host** | proxy 308, canonical tag, four URL fallbacks, Coolify env, redirect spec                                                            | —                              |

P5 is the only slice with a production-configuration step (the Coolify
environment variable), and it must be deployed together with the code change:
shipping the redirect while `NEXT_PUBLIC_SITE_URL` still points at the apex
would emit canonicals pointing at a URL that 308s away.

## 4. Risks

| Risk                                               | Mitigation                                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Sweeping 38 border sites causes visual regressions | Token-level change first, so most sites update by definition; the enumerating guard test plus the existing e2e layout suite cover the rest |
| Canvas animation costs battery on mobile           | DPR capped at 2; loop stops off-screen and on tab hide; reduced motion paints one frame and never starts a loop                            |
| Calculator restructure breaks existing e2e         | Restructure is layout-only; every score field rendered today is still rendered, relocated but not removed                                  |
| The apex redirect catches an unintended host       | Exact string match on `towardpcc.com`, never a suffix match, so preview and localhost cannot match                                         |
| Removing three.js breaks an unnoticed usage        | Verified: `three` and `@react-three/fiber` are imported in exactly one file                                                                |

## 5. Verification

- 697 existing unit tests and the 40-assertion e2e layout suite keep passing.
- New: enumerating token guard; image-crop regression spec; canonical-host spec.
- Home route JS must stay within the 170 KB gzipped budget — removing three.js
  gives headroom rather than consuming it.
- Manual: hero animates on a touchscreen laptop, the device class where it
  previously failed.
