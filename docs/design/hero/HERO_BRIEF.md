# HERO_BRIEF.md — "The Cardiopulmonary Unit"

**A brief for Claude Code, implementing the new hero animation on towardpcc.com.**

How to use this file: place it at the repo root. Then prompt Claude Code:

> Read HERO_BRIEF.md and ANATOMY.md in full. Execute Phase 0 and report your
> findings before writing any code. Then execute Phases 1–2 and STOP at the
> approval gate — show me the static render and the AP anatomy check before any
> animation work begins.

**`ANATOMY.md` is the single source of truth for all geometry.** Where this
brief and that file disagree, that file wins. Every landmark in it is
normalized and has a corresponding unit-test assertion; treat those assertions
as part of the definition of done, not as optional polish.

Supersedes the earlier "Airway Tree" brief. The change and its reasoning are
recorded below rather than deleted.

---

## Part I — Decision record

### Problem statement

How might the hero acquire the anatomical depth and life of a modern
particle-rendered organ scene, using only what pediatric critical care itself
looks like — while obeying the platform's own laws: crimson as the single
accent, a hard performance budget, motion that pauses, and nothing on screen
that can appear to have stopped?

### Recommended direction

A procedurally generated **pediatric cardiopulmonary unit**, rendered as
luminous crimson particles in true 3D on the existing Canvas 2D hero surface:

- A **bronchial tree** — trachea, asymmetric main bronchi, bronchioles,
  terminal alveolar clusters — that **breathes** at ~17.6 breaths/min, a well
  child at rest. On inhale the structure expands and the alveolar clusters
  swell and brighten (recruitment); on exhale it settles.
- A **heart** in the mediastinum, below the carina and between the main
  bronchi, where it anatomically belongs. It does not squeeze. It **perfuses**:
  each beat sends a pulse of light through the form, right side to left, with
  only ~3% volumetric change.
- **Respiratory sinus arrhythmia** couples them. Beat interval shortens on
  inspiration and lengthens on expiration (±8%). This is the signature of the
  piece: two rhythms that resolve into one organism.

The form is **stylized and evocative, not an anatomical diagram**, and the site
never claims otherwise. (Real conducting airways run ~23 generations; we render
7–8. The heart is a gestured four-chamber silhouette, not a model.) This keeps
the animation on the right side of "never claim more than is true."

### Why this changed from airways-only

The earlier brief excluded cardiac imagery on the strength of the platform
doc's rule. On re-reading, that rule is narrower than it was applied: it bans a
**cardiac trace**, and gives three reasons — a trace reads as a monitor, it
implies a diagnostic instrument, and it can flatline. A volumetric anatomical
heart triggers none of the three. It reads as anatomy, not instrumentation.

The positive case is stronger than the absence of a prohibition: the specialty
is cardiorespiratory, and airways alone under-describe it. Cardiopulmonary
coupling is the thing critical care is actually about, and RSA makes it
visible.

**Consequence to handle, not ignore:** the /about brand story currently says
the brand mark is respiratory and never cardiac. The coherent position after
this change is that the **mark** remains respiratory (the waveform is
unchanged) while the **hero scene** is the cardiopulmonary unit. The /about
copy must be updated to say that precisely — tracked in Phase 5, not left to
drift. A claim on the site that the hero contradicts is exactly the kind of
small dishonesty this platform is built to refuse.

Alternatives still rejected:

- **A lone particle heart** — that is the reference site's homepage, and the
  most generic med-tech motif in existence. The unit is not.
- **Any cardiac trace or ECG waveform** — the original rule stands untouched.
- **A single alveolus with gas exchange** — stronger concept-density, weaker
  legibility. Future candidate.

### On the heart's color — a second hue is rejected

The request was for a different color for the heart. Rejected, on the design
system's own terms:

- **Blue/teal** is banned platform-wide and is the reflexive venous choice.
- **Amber is reserved for alerts.** A heart in amber reads as a warning state —
  the precise collision the "crimson never means error" rule prevents.
- **Any new hue is a new token**, which forces a re-audit of every contrast
  pairing. The doc already records a guard passing while a real 1.056:1 defect
  shipped in 38 places. Do not spend that budget on decoration.

The separation is achieved instead by **value, density and rhythm**:

|         | Airways      | Heart                                                             |
| ------- | ------------ | ----------------------------------------------------------------- |
| Density | sparse dust  | dense, massed                                                     |
| Core    | crimson, dim | warm white                                                        |
| Rhythm  | slow breath  | fast pulse (only fast thing on screen)                            |
| Tone    | mid crimson  | right side deep/desaturated toward oxblood; left brighter, warmer |

Right-deep / left-bright is venous and arterial rendered as **luminance rather
than hue** — truer than the textbook blue-and-red, and it costs nothing. If
after seeing Phase 2 the heart still does not separate enough, the next lever
is density and core brightness, **not** a new hue. Escalate to the founder
before introducing any color token.

### Key assumptions to validate

- [ ] A stylized bronchial tree with a heart at the mediastinum is legible as
      anatomy at hero scale on a phone. → **Phase 2 approval gate**, static
      render, squint test.
- [ ] The heart separates from the airways on luminance and density alone. →
      same gate, phone and desktop.
- [ ] Crimson particles read as _alive_, not alarming or gory. The heart must
      look luminous and diagrammatic, never fleshy. → same gate.
- [ ] Two rhythms read as coupled rather than busy. → Phase 3 founder review.
- [ ] ≤ ~3,500 particles hold 60 fps (floor 30) on mid-range mobile in Canvas
      2D. → Phase 3 perf probe with a defined degradation order.
- [ ] The module fits the bundle budget with zero dependencies. → existing CI
      budget test is the arbiter.

### Not doing (and why)

- **three.js / WebGL / any dependency** — an ~874 KB three.js hero was already
  ripped out of this site once. All 3D is hand-rolled projection math.
- **A second hue** — see above.
- **A mechanical squeezing heart** — at ~81 bpm a contracting organ reads
  frantic and slightly grotesque. Perfusion pulse instead.
- **Any ECG trace, QRS complex, or monitor styling** — the original rule.
- **Sound, scroll-jacking, cursor-only parallax** — must be identical on touch;
  a fine-pointer gate is the exact recorded mistake of the last 3D hero.
- **Great vessels, coronary tree, blood-flow particles** — the mediastinum gets
  visually crowded fast and the budget is finite. Revisit only after ship.
- **Dark-mode variant** — deferred platform-wide; do not introduce it here.
- **Per-particle `shadowBlur`** — known Canvas performance trap; glow comes
  from pre-rendered sprites.

### Open questions (for the founder, not blockers)

- Base heart rate: 81 bpm specced. Config supports 70–110 (school-age resting
  range). Higher starts to read distressed.
- Whether the airway travelling light fires every breath (default) or every
  2–3 breaths, now that the heart also pulses.

---

## Part II — Implementation spec

### Phase 0 — Recon (report before writing code)

Read, and report back what you find:

1. The current hero component and its canvas waveform module (framework,
   mounting pattern, how reduced-motion and pause are handled today).
2. The design tokens: crimson family, surfaces, warm white, and how components
   consume them. **List every crimson-family token available** — the heart's
   deep/bright separation must be built from these.
3. The bundle budget test — file, threshold, how routes are measured.
4. Any token/contrast guard tests, and whether they would flag a new color
   constant introduced in a canvas module.
5. Existing Playwright setup and any motion/accessibility assertions.
6. The /about page copy describing the brand mark as respiratory and never
   cardiac — quote it, so Phase 5 can update it precisely.
7. Confirm you have read `ANATOMY.md` and restate, in your own words, the
   coordinate convention: which screen direction is `+x`, and which side of the
   patient that corresponds to. **Getting this backwards mirrors the entire
   chest**, and a mirrored chest is the single most likely and most humiliating
   defect this scene can ship with.

Do not assume file paths from this brief; adapt to the real structure. Keep the
existing hero component intact until the founder approves the swap (work on a
branch; the old component is the rollback).

### Non-negotiable constraints (acceptance checklist)

- [ ] Zero new dependencies. Module target ≤ ~12 KB gzipped; existing route
      budget test passes unmodified.
- [ ] **No new color constants.** Every color read from existing tokens via
      `getComputedStyle` at mount. A hardcoded hex in this module is a
      review-blocking defect.
- [ ] **No magic geometry numbers.** Every landmark constant lives in
      `anatomy.ts`, transcribed from `ANATOMY.md`, and is referenced by name.
      A bare coordinate literal in `tree.ts`, `heart.ts` or `envelope.ts` is
      likewise review-blocking.
- [ ] **Every anatomical assertion in `ANATOMY.md` §7 passes**, for both
      viewport presets.
- [ ] `prefers-reduced-motion: reduce` → a **static poster frame**, drawn once,
      **no rAF ever starts**. Set `data-hero-mode="static"` on the mount
      element as a test hook; otherwise `data-hero-mode="animated"`.
- [ ] Animation pauses fully (rAF **cancelled**, not skipped) when off-screen
      (IntersectionObserver) and on tab hide (`visibilitychange`).
- [ ] **The scene never renders a stalled heart.** If frame time collapses past
      the degradation tiers, the module drops cleanly to the static poster and
      stops. A juddering or frozen mid-beat heart is the failure mode the
      platform's flatline rule was really pointing at. Poster is drawn at a
      full, alive-looking moment (mid-inhale, mid-systole).
- [ ] Runs identically on touch devices. No pointer-type gating of any kind.
- [ ] Crimson never means error here or anywhere; nothing may resemble an alert
      state.
- [ ] Canvas is `aria-hidden="true"`, purely decorative. Headline/CTA contrast
      and focus behavior untouched — preserve the current scrim/layout
      treatment over the canvas.
- [ ] Regaining connectivity must not reload or reset anything.
- [ ] No data leaves the page. Zero network requests from the module.
- [ ] UI-level transitions (canvas fade-in on mount) use token easing and
      durations. Breath and beat curves are bespoke physiologic curves —
      permitted under "continuous ambient motion on decorative hero elements",
      and documented as such in code comments.

### Architecture

```
lib/hero-cardiopulm/
  rng.ts        mulberry32 seeded PRNG (determinism = testability)
  tree.ts       generateAirwayTree(config, seed) → geometry (typed arrays)
  heart.ts      generateHeart(config, seed) → geometry (typed arrays)
  envelope.ts   generatePleuralShell(config, seed) → geometry (typed arrays)
  anatomy.ts    landmark constants from ANATOMY.md — single source, no magic
                numbers anywhere else in the module
  breath.ts     breathValue(tMs, config) → v ∈ [0,1], plus phase info
  beat.ts       beat phase + RSA coupling, driven by breath phase
  camera.ts     rotation + perspective projection, depth sort order
  render.ts     sprite prep, per-frame draw
components/
  HeroCardiopulmonary(.tsx)  mount, observers, reduced-motion, poster, teardown
```

All geometry in `Float32Array`s allocated once. Per-frame work touches typed
arrays only — no object churn inside the rAF loop. Airways and heart share one
particle buffer and one depth sort, tagged by a type flag, so the heart
correctly occludes and is occluded by branches.

### Particle budget

Invariant, not aspiration. Generators receive a budget and adapt density to
land within it. Unit-tested for both presets.

| Preset          | Total | Airways | Heart | Pleural envelope |
| --------------- | ----- | ------- | ----- | ---------------- |
| Desktop         | 3,500 | 1,700   | 1,200 | 600              |
| Narrow (<768px) | 1,800 | 870     | 630   | 300              |

Total is unchanged from the pre-envelope budget — the envelope is paid for by
thinning the airways, not by raising the ceiling.

The heart's share is high relative to its size: that density _is_ the
separation from the airways, and cutting it first defeats the design. The
envelope is the opposite — a sparse shell, cheap per particle, but it is what
makes "between the lungs" visually true rather than merely asserted.

### The airway tree (`tree.ts`)

Recursive bifurcation, seeded (default seed constant, so every visitor sees the
same tree and tests are stable):

- Generation 0: trachea, vertical, descending to the carina at the origin.
- **The carina, main bronchi and right upper lobe takeoff come from
  `ANATOMY.md` §4** — right main 28°/length 0.115, left main 45°/length 0.175,
  subcarinal angle ≈73°, RUL bronchus arising in the proximal 40% of the right
  main. These are _pediatric_ angles and are deliberately less asymmetric than
  adult values; leave the code comments the anatomy file specifies so nobody
  tunes them toward adult numbers.
- Subsequent generations: divergence 34° ± 8° jitter; child length
  `L × 0.76 ± 0.04`; radius `r × 0.72`; azimuthal roll advances ~137.5°
  (golden angle) per generation ± jitter.
- Depth: `G = 8` desktop, `G = 7` narrow.
- Each terminal branch ends in an **alveolar cluster**: points on a small
  fibonacci sphere, radius ∝ 3 × terminal branch radius.
- Branch bodies sampled as evenly spaced points along the axis.

The mediastinal volume the heart occupies is passed to the generator as an
**exclusion region**: branches that would intrude are culled at generation
time, so the heart sits in a real cavity rather than inside a thicket.

### The heart (`heart.ts`)

Gestured, not modelled. Four blended ellipsoids (soft-min union, k ≈ 0.04),
populated by seeded rejection sampling, biased toward the hull.

**All centroids, radii, shares and the CTR-derived envelope are specified in
`ANATOMY.md` §3. Use those numbers exactly — they are derived from a
cardiothoracic ratio of 0.48 and are unit-tested.**

The properties that matter most in implementation:

- **Depth ordering is the whole point.** RV is the most anterior chamber, LA
  the most posterior, and the LA sits immediately beneath the carina (its roof
  reaches `y = 0.000`). This is what makes bronchi pass convincingly behind the
  RV and above the LA. Depth-sort per particle across the entire scene — heart,
  airways and envelope in one combined buffer.
- **Chamber tint by luminance, not hue.** Right-heart particles take the
  deepest crimson token with a dim core; left-heart particles take the brighter
  crimson with a warm-white core. Sample tokens at mount; blend across the
  septum over ~15% of the width so there is no hard seam.
- **Hull bias** keeps the form a luminous shell rather than a solid blob —
  this is what keeps it diagrammatic rather than fleshy.

### The pleural envelope (`envelope.ts`)

A sparse particle **shell** — surfaces only, no parenchymal fill — defining the
lung boundaries. Without it the heart floats between two bare trees and "between
the lungs" is not visually true.

Full geometry in `ANATOMY.md` §5. The features that carry the image:

- **The cardiac notch** in the left upper lobe, cutting medially to exactly the
  heart's left border (`x = +0.240`) — the notch and the cardiac silhouette are
  the same curve. The right lung has no equivalent; that asymmetry between the
  two medial borders is much of what makes it read as a real chest.
- **Fissures render as thin gaps in particle density**, never as drawn lines —
  that is how lobes become visible in a particle cloud. Right lung: oblique +
  horizontal. Left: oblique only.
- Right hemidiaphragm sits **higher** than the left (the liver). Costophrenic
  angles sharp.
- Lowest alpha and deepest crimson in the scene. The envelope must never
  compete with the heart for attention — it is the room, not the subject.

Breathing scales the envelope with the same `breath.ts` curve as the airways,
about the same root.

**Optional thymus layer** (`ANATOMY.md` §6): default **off**, founder decision
at the Phase 2 gate. It is the single clearest signal that this is a child's
chest, and also a legibility risk. Judge it on a real render.

### The breath (`breath.ts`)

- Cycle `BREATH_MS = 3400` (≈17.6/min). Config-clamped 2400–5000 ms.
- **I:E ≈ 1:1.8** — inhale 36% of cycle, exhale 64%. With phase `p ∈ [0,1)`:
  - inhale (`p < 0.36`): `v = 0.5 − 0.5·cos(π · p / 0.36)`
  - exhale (`p ≥ 0.36`): `v = 0.5 + 0.5·cos(π · (p − 0.36) / 0.64)`
  - Derivatives vanish at both boundaries → smooth peak and trough; the cosine
    tail gives a natural end-expiratory pause.
- Applied as: global radial scale `1 + 0.07·v` about the tree root; clusters
  additionally scale `1 + 0.18·v` about their own centroids and gain `+0.15·v`
  alpha — recruitment glow at end-inspiration.
- Airway travelling light: at each inhale start, pick a random root→leaf path;
  a bright pulse travels it over the inhale duration.
- **The heart does not scale with the breath.** It is anchored; the lungs move
  around it. Coupling is expressed through rate, not displacement.

### The beat and RSA (`beat.ts`)

- Base `HR = 81 bpm` → interval ≈ 741 ms. Config range 70–110.
- Ratio to breath is **deliberately non-integer** (3400 / 741 ≈ 4.59 beats per
  breath) so the two rhythms never lock into a mechanical pattern. A unit test
  asserts the ratio is not near-integer for the shipped defaults.
- **RSA coupling:** instantaneous interval `= baseInterval × (1 − 0.08·(2v − 1))`
  where `v` is the current breath value. Inspiration (`v→1`) shortens the
  interval to ~681 ms (≈88 bpm); expiration lengthens it to ~800 ms (≈75 bpm).
  Advance beat phase by `dt / instantaneousInterval` each frame — **never**
  recompute phase from absolute time, or rate changes will cause discontinuous
  jumps.
- **Perfusion pulse, not squeeze.** Each beat: a brightness wave crosses the
  form right→left over ~55% of the interval, easing in fast and out slow.
  Volumetric change is capped at 3% and applied to the ventricles only.
- The pulse uses the same visual language as the airway travelling light,
  intentionally — one vocabulary, two organs.

### Camera and projection (`camera.ts`)

- Gentle sway, not rotation: `yaw = 12° · sin(2π · t / 30 000 ms)`, fixed pitch
  ≈ −6°. The 30 s period is incommensurate with both the 3.4 s breath and the
  ~0.74 s beat, so nothing feels mechanically coupled that shouldn't be.
- Perspective: camera distance `d ≈ 2.2 × tree height`, focal
  `f = 0.9 × canvas height`; `sx = cx + f·x′/(z′ + d)`,
  `sy = cy + f·y′/(z′ + d)` after yaw/pitch rotation.
- Depth cues: draw size ∝ `f/(z′ + d)`; alpha mapped from depth into
  [0.25, 0.9]. Painter's algorithm: sort indices back→front each frame across
  the combined buffer.

### Rendering (`render.ts`)

- Pre-render **glow sprites** to offscreen canvases at ~2/4/7 px (pre-DPR), in
  each of three tints (airway crimson, deep crimson, bright crimson), radial
  gradient with warm-white core → transparent. All colors read from tokens at
  mount. 9 sprites total, built once.
- Per frame: clear; draw back→front with `drawImage`. Alveolar clusters and the
  heart composite with `globalCompositeOperation: "lighter"` (bloom); branch
  dust stays `source-over` so the scene cannot blow out.
- Cap `devicePixelRatio` at 2. Debounced ResizeObserver regenerates projection
  constants; geometry unchanged.
- Poster: on mount, synchronously draw one frame at breath `v = 0.7`, beat
  mid-systole, sway 0 — both the reduced-motion frame and the first paint
  before rAF starts (no pop-in).

### Performance probe and degradation order

Measure mean frame time over the first ~120 animated frames. If > 14 ms,
degrade one tier at a time, re-measuring:

1. Sway off (breath and beat continue)
2. Airway cluster density −30%
3. `G − 1` generation
4. Heart particle density −25%
5. RSA coupling off (fixed interval — last resort; the coupling is the concept)

**Breath and beat are never degraded.** If still below 30 fps after tier 5,
drop to the static poster and stop — never ship a stuttering heart.

### Tests (definition of done)

Unit:

- **The full anatomical assertion suite in `ANATOMY.md` §7** — cardiac
  position and depth ordering, CTR ∈ [0.45, 0.55] computed from the
  orthographic silhouette, bronchial asymmetry, RUL takeoff, lobar counts,
  right:left lung ratio, cardiac notch present and right-lung notch absent,
  diaphragm asymmetry, spatial exclusions. Both presets.
- Same seed + config → identical geometry (hash of the typed arrays).
- Both presets respect the total budget **and** the airway/heart/envelope
  split.
- Breath curve: `v(0)=0`, `v(0.36·T)=1`, continuity at boundaries; I:E split as
  specced; config clamp enforced.
- RSA: interval at peak inspiration < base < interval at peak expiration, at
  the specced ±8%; beat phase is continuous across a rate change (no jump).
- Beats-per-breath ratio for shipped defaults is not within 0.15 of an integer.
- Projection known-values: a hand-computed point projects to expected screen
  coordinates.
- **Source scan: no hex/rgb color literals anywhere in `lib/hero-cardiopulm/`.**

E2E (Playwright):

- With `prefers-reduced-motion: reduce`: `data-hero-mode="static"`, and two
  screenshots 500 ms apart are identical.
- Tab hidden → rAF cancelled.
- No network requests originate from the hero module.
- Existing bundle-budget and accessibility checks pass unmodified.

Run the full existing suite. Everything green before founder review.

### Phased plan

- **Phase 0 — Recon.** Report findings; propose final file paths; quote the
  /about copy needing revision. No code.
- **Phase 1 — Pure modules.** `anatomy`, `rng`, `tree`, `heart`, `envelope`,
  `breath`, `beat`, `camera` with unit tests — including the full anatomical
  assertion suite. No DOM. **Do not proceed to Phase 2 with any anatomical
  assertion failing.**
- **Phase 2 — Static render.** Mount component drawing the poster frame with
  real tokens, both viewport presets. Also render `anatomy-check.png` — the
  orthographic AP projection (`ANATOMY.md` §8) — and print the computed CTR.
  **STOP. Approval gate:** founder reviews the AP projection for anatomical
  correctness, then squint-tests the perspective render on desktop and phone —
  is it legible as a chest, does the heart separate on luminance alone, does it
  read alive rather than alarming? Thymus layer decided here.
- **Phase 3 — Motion.** Breath, beat, RSA, sway, travelling light, perf probe
  and degradation tiers. Founder review of the coupled rhythms.
- **Phase 4 — Integration.** Reduced-motion, pause/resume, resize, fade-in via
  motion tokens, swap into the hero on the branch (old hero retained).
- **Phase 5 — Verification and copy.** Full unit + E2E + budget run; **update
  the /about brand-story copy** so the mark-vs-scene distinction is stated
  accurately; screenshots for sign-off; then merge.

Commit per phase with messages referencing this brief.

### Escape hatch

If Phase 3 cannot hold 30 fps on the narrow preset even fully degraded, cut the
**airways** to a suggestion — trachea, main bronchi and the RUL takeoff only —
and keep the heart, the pleural envelope with its cardiac notch, and the
RSA-coupled breath. The coupling is the concept and the notch is what makes the
composition true; distal branch detail is the cost. Do not install a 3D library
to rescue either.

**Degrading detail must never break an anatomical assertion.** The suite runs
against every degradation tier — a cheaper scene is still a correct one.

### A note on taste

The near-black surface with a single accent is a common default; here it is
mandated by the existing brand, so it stays. All distinctiveness must come from
the signature: a child's airways and heart, rendered in one palette, breathing
and beating at a well child's rates, coupled by respiratory sinus arrhythmia.
Spend the boldness there. Typography, layout and CTAs are untouched. If a
choice arises this brief does not cover, the platform's documented rules win,
then existing code patterns, then ask.

---

## Amendment A — 2026-07-31: CSS 3D, not Canvas 2D

Approved by the founder after a Phase 0 measurement. Recorded rather than
edited in, so the original reasoning stays readable.

**The change.** The scene renders as **CSS 3D DOM particles in a
`transform-style: preserve-3d` scene**, not Canvas 2D. Part II's Architecture,
Particle budget and Rendering sections are superseded to that extent. Everything
else — the anatomy, the physiology, the constraints, the phase gates — stands.

**Why, with numbers.** Particles positioned once are nearly free: 3,500 of them
cost 1.46 ms/frame when only the container rotates. But this scene's breath
model scales GROUPS (the tree root, each alveolar cluster, the chambers), and
mutating a group forces style recalc across every descendant. Measured on
desktop with a synchronous layout flush per frame — the worst case:

| Particles | ms/frame       |
| --------- | -------------- |
| 300       | 4.1            |
| 450       | 4.1            |
| 600       | 8.7            |
| 900       | 12.6           |
| 1,200     | 20.3           |
| 3,500     | 53.4 (~19 fps) |

Mid-range mobile runs roughly 3–5× slower. Revised budget:

| Preset          | Total | Airways | Heart | Envelope |
| --------------- | ----- | ------- | ----- | -------- |
| Desktop         | 550   | 250     | 190   | 110      |
| Narrow (<768px) | 280   | 125     | 100   | 55       |

The heart keeps a disproportionate share: that density _is_ the separation from
the airways, exactly as the original budget argued.

**What this buys.** Three of the brief's hardest requirements become free or
near-free:

- **Depth sorting.** `preserve-3d` sorts per element in the compositor, so
  `camera.ts` loses its painter's-algorithm sort entirely, and "bronchi pass
  behind the RV and above the LA" falls out correctly rather than being
  maintained by hand.
- **"No colour constants; read every colour via `getComputedStyle` at mount."**
  In CSS the tokens are simply in scope. A review-blocking discipline problem
  becomes structurally impossible.
- **Reduced motion.** `motion-safe:` gates the animation with no JS branch; the
  static poster is just the un-animated DOM.

JS drops from ~12 KB to ~2 KB: a driver that publishes `--breath` and `--beat`
onto ~20 group wrappers per frame. **RSA survives intact** — the coupling is
computed in JS and published as one number. This is the reason the scene is not
pure CSS: no stylesheet can express "beat interval depends on current breath
phase", and RSA is the signature of the piece.

**What it costs.** ~6× fewer particles than the original brief imagined. The
scene will be sparser. Whether that reads as elegant or thin is a judgement for
the Phase 2 gate, which already exists for exactly this.

**Consequential edits.**

- Airway depth drops to `G = 6` desktop / `G = 5` narrow. At 550 particles, 8
  generations yields ~2 particles per terminal branch, which reads as noise.
  The original escape hatch — trachea, main bronchi, RUL takeoff, fewer
  generations — becomes the starting point rather than the fallback.
- `render.ts` is deleted. No sprites, no `drawImage`. Glow is a
  `radial-gradient` background; the `globalCompositeOperation: "lighter"` bloom
  becomes `mix-blend-mode: plus-lighter`, its true CSS equivalent.
- `camera.ts` keeps only the sway; projection and sorting are the browser's.
- Degradation tiers collapse to: sway off → fewer particles → static poster.

**Unchanged, and deliberately so: every assertion in `ANATOMY.md` §7.** They
test typed arrays, not pixels, so they are render-target agnostic and survive
this change without a single edit. No anatomical assertion may fail at any
degradation tier.

## Amendment B — the hero this replaces

Phase 0 item 1 asks for "the current hero component and its canvas waveform
module". That module no longer exists: `hero-scene.tsx`, `hero-waveform.tsx` and
`waveform-canvas.tsx` were deleted on 2026-07-31 and replaced by
`components/home/organ-stack.tsx`, a CSS 3D stack of the six pSOFA organ
systems.

The founder has confirmed this scene **replaces the organ stack**. The rollback
point is therefore the organ stack, not a canvas hero.

Note the continuity: the organ stack already established CSS 3D `preserve-3d`
with a drift animation and a `motion-safe:`-gated keyframe in this codebase.
This scene extends that vocabulary rather than introducing one.

**Workflow constraint agreed at Phase 0.** The Phase 2 squint test needs a real
render, and the development browser pane does not composite frames — screenshots
are unavailable. Phase 2 therefore delivers `anatomy-check.svg` (the §8
orthographic AP projection, with the computed CTR printed) as a file, plus a
deployed branch preview for judging the perspective render on a real phone.

---

## Amendment C — 2026-07-31: post-review budget and module shape

Supersedes the **Particle budget** table above and the `lib/hero-cardiopulm/`
file list. Both had survived from the Canvas draft.

### Budget

| Preset          | Total | Airways | Heart | Pleural surfaces |
| --------------- | ----- | ------- | ----- | ---------------- |
| Desktop         | 550   | 316     | 228   | 6 stroked paths  |
| Narrow (<768px) | 280   | 158     | 116   | 6 stroked paths  |

The old 3,500 / 1,800 totals were Canvas-era: one draw call per particle costs
nothing like one DOM node per particle. The envelope's ~110 particles became six
paths and the difference went to the airways and the heart, which is where the
hollow right lung was. The six paths are rendered elements and are charged
against the total, so the particle lines sum to 544 and 274, not the full
budget.

**The ceiling is no longer a per-frame CPU limit.** Measured in a real browser
with batched writes, per-frame main-thread cost is flat from 300 to 3,500
particles, because the animation writes one transform for the scene and one per
group — particle transforms are static after mount. Cost tracks GROUP count:
~50 groups (the scene's real shape, ~44 alveolar clusters plus systems) gives
p95 0.7 ms against a 16.7 ms frame; 200 groups gives 2.9 ms.

550 stands because GPU raster and layer memory are still unmeasured — both
available harnesses run in hidden tabs, which do not composite. **Watch cluster
count, not particle count.** If more particles are ever wanted, the lever is
dropping `will-change: transform` from particles (they never animate
individually), not raising the number blindly.

### Module shape

```
lib/hero-cardiopulm/
  rng.ts        mulberry32 seeded PRNG (determinism = testability)
  anatomy.ts    landmark constants from ANATOMY.md — single source, no magic
                numbers anywhere else in the module
  tree.ts       generateTree(budget, generations, seed) → geometry
  heart.ts      generateHeart(budget, seed) → geometry, plus cardiacField and
                cardiacHullExtentX (analytic silhouette, not sampled)
  envelope.ts   PREDICATES ONLY — insidePleura / insideLung / inCardiacNotch.
                No longer emits particles. One definition of where the lung is,
                shared by the tree (containment), the shells (outline) and the
                assertions (landmarks), so a drawn surface cannot drift from a
                grown one.
  shells.ts     generateShells() → 6 stroked pleural outlines, 3 nested per lung
  breath.ts     breathAt(tMs, breathMs) → v ∈ [0,1], plus phase info
  beat.ts       beat phase + RSA coupling, driven by breath phase
```

`generatePleuralShell` never existed under that name and is not coming; the
surfaces are `shells.ts`, and they are curves rather than clouds.
