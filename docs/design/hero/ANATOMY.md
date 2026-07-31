# ANATOMY.md — landmark specification for the towardpcc hero scene

Companion to `HERO_BRIEF.md`. This file is the **single source of truth for
geometry**. Every coordinate below is normalized and testable. If the brief and
this file disagree, this file wins.

The scene is a **stylized evocation, not a diagram**, and the site never claims
otherwise. But where it makes an anatomical statement, that statement is
correct — because a pediatric intensivist is the primary viewer and a wrong
relationship is the kind of thing this platform refuses to ship.

---

## 1. Coordinate system

**Origin = the carina.** Not the scene centre — the carina. Every landmark is
expressed as a relationship to the tracheal bifurcation, which is how thoracic
anatomy is actually reasoned about.

| Axis | Direction                       | Note                                                                                            |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `+x` | viewer's **right**              | = the **patient's LEFT**. Radiological convention: the film is viewed as if facing the patient. |
| `+y` | superior (up)                   |                                                                                                 |
| `+z` | **anterior**, toward the viewer | the camera looks at the child's front                                                           |

Unit `H = 1.0` = lung apex → costophrenic angle.

> **Do not "fix" the x-axis.** The heart apex having a **positive** x (viewer's
> right) is correct. The right main bronchus having a **negative** x is
> correct. Leave a comment saying so at the top of every geometry file.

### Thoracic frame

| Landmark                 | Value                                                 |
| ------------------------ | ----------------------------------------------------- |
| Lung apex                | `y = +0.360` (extends above the clavicle, medially)   |
| **Carina**               | `y = 0.000` — origin                                  |
| Costophrenic angle       | `y = -0.640`                                          |
| Right hemidiaphragm dome | `y = -0.505`                                          |
| Left hemidiaphragm dome  | `y = -0.555` (**lower** — the liver raises the right) |
| Max transverse width     | `0.750`                                               |
| AP depth                 | `0.450` (a child's chest is rounder than an adult's)  |

---

## 2. The correction that drives the whole scene

The heart is **anterior and inferior** to the carina — _not_ posterior to it.
What genuinely lies behind the carina is the **esophagus and descending
aorta**, neither of which we render.

But the **left atrium is the exception that makes the scene work**: it is the
most posterior chamber and it sits **immediately beneath the carina** — close
enough that LA enlargement splays the carinal angle, the classic sign of a
large left-to-right shunt. In this geometry the LA roof reaches `y = 0.000`,
touching the bifurcation from below.

**Consequence — this is the important part.** The chambers occupy genuinely
different depths, and rendering that ordering is what makes a particle cloud
read as a volume instead of a sticker:

```
anterior (toward viewer)  →  RV  →  RA  →  LV  →  LA  →  posterior
        +0.115              +0.020   +0.005   -0.090
```

The right ventricle is the most anterior chamber; the left atrium the most
posterior. Depth-sorting must be **per particle across the whole scene**, so
that bronchi correctly pass _behind_ the RV and _above_ the LA.

---

## 3. Cardiac geometry

Envelope derived from the **cardiothoracic ratio**, not eyeballed:

| Property              | Value                    | Reasoning                                         |
| --------------------- | ------------------------ | ------------------------------------------------- |
| CTR                   | **0.48**                 | normal for a child (<0.5; infants tolerate ~0.55) |
| Cardiac width         | `0.360`                  | = 0.48 × thoracic width                           |
| Right border (RA)     | `x = -0.120`             |                                                   |
| Left border (LV)      | `x = +0.240`             |                                                   |
| **⅔ left of midline** | `0.667` of width at `+x` | the classic 2:1 split                             |
| Base of heart (top)   | `y = -0.030`             | just below the carina                             |
| Apex                  | `(+0.149, -0.450)`       | inferolateral, to the **patient's left**          |
| Cardiac height        | `0.420`                  |                                                   |

> **Pediatric note:** the apex sits relatively higher than in an adult (4th
> intercostal space in a young child vs. 5th). Do not lower it toward adult
> proportions.

### Chambers — four blended ellipsoids

| Chamber                | Centroid (x, y, z)         | Radii (rx, ry, rz)      | Particle share |
| ---------------------- | -------------------------- | ----------------------- | -------------- |
| **RV** right ventricle | `(-0.020, -0.300, +0.115)` | `(0.115, 0.130, 0.080)` | 30%            |
| **RA** right atrium    | `(-0.075, -0.140, +0.020)` | `(0.075, 0.105, 0.075)` | 20%            |
| **LV** left ventricle  | `(+0.115, -0.315, +0.005)` | `(0.115, 0.145, 0.100)` | 32%            |
| **LA** left atrium     | `(+0.055, -0.075, -0.090)` | `(0.085, 0.075, 0.070)` | 18%            |

Build as a smooth union (soft-min blend, k ≈ 0.04) and populate by seeded
rejection sampling. Bias sampling toward the hull so the form reads as a
**luminous shell, not a solid blob** — this is what keeps it diagrammatic
rather than fleshy.

Silhouette borders that must be visible from the front, because these are the
borders a clinician reads on a film:

- **Right heart border** = right atrium
- **Left heart border** = left ventricle (with the LA appendage above it)
- **Apex** = left ventricle, pointing inferolaterally to `+x`

---

## 4. Airways

### Carina and main bronchi (school-age child)

| Bronchus       | Angle from vertical | Length  | Hilum reached      |
| -------------- | ------------------- | ------- | ------------------ |
| **Right main** | **28°**             | `0.115` | `(-0.054, -0.102)` |
| **Left main**  | **45°**             | `0.175` | `(+0.124, -0.124)` |

Subcarinal angle ≈ **73°**.

> **Two comments to leave in the code so nobody "corrects" this:**
>
> 1. The right main bronchus is **shorter, wider and more vertical** than the
>    left. This asymmetry is real and load-bearing.
> 2. These are **pediatric** angles, deliberately less asymmetric than adult
>    values (~25°/45°). In infants the two are nearly equal — which is exactly
>    why aspirated foreign bodies don't favour the right in young children the
>    way they do in adults. Do not tune toward adult numbers.

### Distinctive branching

- **Right upper lobe bronchus arises very early** — roughly 40% along the right
  main bronchus, directed superolaterally. It is the only lobar bronchus above
  the pulmonary artery, and its early takeoff is the most recognisable feature
  of the right airway. Render it explicitly rather than leaving it to the
  generic recursion.
- Below that, recursive bifurcation as specced in `HERO_BRIEF.md`
  (34° ± 8°, length × 0.76, radius × 0.72, golden-angle roll).
- Terminal branches end in alveolar clusters.

### Lobes

| Lung      | Lobes                        | Fissures                 |
| --------- | ---------------------------- | ------------------------ |
| **Right** | upper, middle, lower         | oblique + **horizontal** |
| **Left**  | upper (incl. lingula), lower | oblique only             |

Right lung total particle count should exceed left by **10–25%** — the right
lung is genuinely larger, because the heart displaces the left.

Fissures render as **thin gaps in particle density**, not drawn lines. That is
how lobes become visible in a particle cloud.

---

## 5. The pleural envelope — what makes it read as "between the lungs"

A sparse particle **shell** defining the lung surfaces. Without it the heart
floats between two bare trees and the phrase "between the lungs" is not
visually true. With it, the scene reads as a chest.

- Shell only — no parenchymal fill. Low density, low alpha, deepest crimson.
- Apices rounded, extending to `y = +0.360`.
- Bases concave, seated on the diaphragm domes (note the R/L asymmetry above).
- Costophrenic angles **sharp**, at `y = -0.640`.

### The cardiac notch — the single most important silhouette feature

The left upper lobe carries a concavity where the heart sits. Without it,
"between the lungs" is a claim the picture contradicts.

- Spans `y = -0.150` to `y = -0.450`
- Cuts medially to `x = +0.240` — **exactly the heart's left border**, so the
  notch and the cardiac silhouette are the same curve.

The **right lung has no such notch** — its medial border runs comparatively
straight. The asymmetry between the two medial borders is a large part of what
makes the image read as a real chest rather than a symmetric ornament.

---

## 6. Optional pediatric layer — the thymus

The **thymus** is prominent in young children and involutes with age. It sits
in the anterior mediastinum, draped in front of the great vessels, and produces
the "sail sign" on a pediatric film. It is the single clearest signal that this
is a **child's** chest and not a small adult's.

- Anterior: `z = +0.160` to `+0.200` (in front of everything else)
- `y = +0.100` to `-0.100`, spanning `x = -0.100` to `+0.120`
- Right-sided "sail" extension
- **Very low alpha** (~0.25 of heart particles), soft-edged — a veil, not a mass

Default **off**. Founder decision at the Phase 2 gate: it is a beautiful
insider detail and a legibility risk, and it should be judged on a real render
rather than in the abstract.

---

## 7. Anatomical assertions (unit tests — these are the deliverable)

Contrast is asserted rather than eyeballed on this platform; anatomy gets the
same treatment.

**Cardiac position**

- [ ] LA centroid is the **most posterior** chamber; RV the **most anterior**
- [ ] LA roof reaches `y ≥ -0.010` — immediately subcarinal, touching the
      bifurcation
- [ ] No chamber centroid has `y > 0` — nothing sits above the carina
- [ ] Heart apex is the inferior-most cardiac particle **and** has `x > 0`
- [ ] 0.60 ≤ fraction of cardiac particles with `x > 0` ≤ 0.72
- [ ] **CTR ∈ [0.45, 0.55]** — computed from the orthographic AP silhouette:
      max cardiac transverse width ÷ max thoracic transverse width

**Airways**

- [ ] Right main bronchus angle **<** left main bronchus angle
- [ ] Right main bronchus length **<** left main bronchus length
- [ ] Subcarinal angle ∈ [65°, 80°]
- [ ] A right upper lobe branch originates in the proximal 50% of the right
      main bronchus
- [ ] Right lung particle count ÷ left lung count ∈ [1.10, 1.25]
- [ ] Right lung resolves 3 lobar groups; left lung 2

**Spatial integrity**

- [ ] **Zero** airway or envelope particles inside the cardiac hull
- [ ] Cardiac notch present: no left-envelope particle inside the notch region
- [ ] Right lung medial border has no equivalent notch
- [ ] Lung apices ≥ `0.30` above the carina
- [ ] Right hemidiaphragm dome **higher** than left
- [ ] Both costophrenic angles sharp (angle < 45°)

**Determinism**

- [ ] Same seed + config → byte-identical geometry (hash the typed arrays)
- [ ] Both viewport presets satisfy every assertion above

---

## 8. Visual verification artifact

At Phase 2, additionally render and save an **orthographic AP projection** at
`1200 × 1600` — yaw 0, pitch 0, no perspective — as `anatomy-check.png`.

This is the radiographic view. It is the artifact the founder reviews for
anatomical correctness, because AP is the projection a clinician has the
strongest priors about, and errors that hide under perspective and sway are
obvious in it. Ship it alongside the perspective render at the approval gate.

Print the computed CTR in the console next to it.

---

## Amendment C — corrections from the phase 1 geometry review (2026-07-31)

Measured against the reviewed artifact. §3, §4 and §5 above are superseded on
the points below; `apps/web/lib/hero-cardiopulm/anatomy.ts` is the executable
form of every one, and each has a matching assertion.

### §3 contradicted itself, and the render followed the wrong table

The chamber table and the border table disagreed. Chambers implied a right
border at −0.150 and a left at +0.230; the border table stated −0.120 and
+0.240. The generator followed the chambers, so the heart shipped **24% too
wide on the right**, cardiac width 0.378 against 0.360, and **CTR 0.504 where
0.480 was intended**. A [0.45, 0.55] CTR band was loose enough to hide it.

| Chamber | Was                         | Now                             | Why                       |
| ------- | --------------------------- | ------------------------------- | ------------------------- |
| RA      | centroid x −0.075, rx 0.075 | **centroid x −0.070, rx 0.050** | reaches the stated −0.120 |
| LV      | rx 0.115                    | **rx 0.125**                    | reaches the stated +0.240 |
| RV      | centroid x −0.020           | **centroid x −0.005**           | see below                 |

The RA fix alone did not move the border, because **the RA never formed it**:
at rx 0.115 the RV reached −0.135, lateral to the atrium. That is wrong twice —
the right heart border on an AP film is an _atrial_ border, and the RV is the
anterior chamber, not the lateral one. Shifting rather than shrinking the RV
puts its right margin on the border while preserving chamber volume.

Cardiac width is now **0.3598** and CTR **0.4797**, measured analytically.

### Laterality is chamber membership, not sign(x)

§3 specified tint by chamber laterality blended across the septum. It was
implemented as a ramp in x about a "septum" derived from `rightBorderX` and
`fractionLeftOfMidline` — which evaluates to **−0.0001, the midline**. The RV
spans −0.148 … +0.122, so every RV particle across the midline was painted as
left heart: **0 of 30**. Tint is now the left-sided share of a soft chamber
membership; 21–45% of right-tinted particles now sit at x > 0.

### The apex is a taper, not a shear

A shear translates each horizontal slice without narrowing it — the LV stayed
as wide at the bottom as at the base, so the delivered apex landed at x 0.122
against a specified 0.149. The inferior heart now converges on the apex as
depth², applied **by position rather than by chamber id**, because the lowest
particle in the cloud is not an LV particle.

### §4 — the right lung was hollow

Right airways filled to **0.613** of their pleural half-width against the left's
0.983 — anatomically backwards, since the right lung is the larger one. Three
independent causes, three fixes:

1. **Reach.** The right hilum sits at x −0.054 and the left at +0.124, so the
   right tree must cross 0.313 against the left's 0.228. Per-side length decay,
   `right 0.87 / left 0.76`, plus one extra generation on the right.
2. **Aim.** Golden-angle roll spreads children isotropically, so reach was
   decided by whether jitter happened to point a branch laterally: fill ranged
   0.56–0.84 across seeds on identical geometry. Children are now steered along
   a per-lobe **growth axis** (`LOBE_TERRITORY`, pull 0.68). Right axes run more
   laterally than left, because the right hilum is more medial.
3. **Containment.** Steering then pushed tips 7.6% _beyond_ the pleura.
   Branches crossing the surface are now **shortened to it**, not discarded —
   discarding removed whole deep generations and made the deeper desktop preset
   fill _less_ than the shallow narrow one.

Delivered, worst of 40 seeds per preset: right 0.897–0.945, left 0.853–0.954,
zero particles outside the pleura.

### §4 — the airway budget is allocated per lobe

Allocating by side fixed R:L and let the **right lower lobe, the largest lobe of
the lung, ship as the thinnest object in the scene** at 13 particles. Shares are
now RUL 20% / RML 8% / RLL 25% / LUL 23% / LLL 24% — right 53%, left 47%, R:L
1.13 — allocated **after** culling, so a lobe that loses particles to the heart
is topped up rather than left thin. Worst deviation across 80 runs: 0.9%.

### §1 — the right costophrenic angle

The liver elevates the whole right hemidiaphragm, so the angle rises with the
dome. Right −0.625 against left −0.640; previously a single shared value made
the two level.

### §5 rate, §6 thymus

Breath **3400 → 3200 ms** (18.75/min; 17.6 was adolescent, school-age is 18–30).
3200/741 = 4.32 beats per breath, still non-integer. Thymus stays **off** — the
envelope has ~110 particles for two shells, three fissures, two costophrenic
angles and the notch, which alone gets 5.

### Assertions changed

Mass fraction of cardiac particles at x > 0 is **no longer a geometry gate**. It
asserts a claim anatomy does not make: the documented 2:1 split is about
silhouette width on a film, not sampled mass. It survives only as a loose
[0.55, 0.72] mirror check, explicitly marked never to tune against.

Borders and CTR are now computed **analytically** from the cardiac hull by
bisection. Sampling cannot do this job: across 40 seeds the widest sampled
particle ranged 0.205–0.239 against a true border of 0.240, so any band loose
enough to survive the RNG is too loose to catch the defect above.

---

## Amendment D — items 6 and 7 (2026-07-31)

### §8 — the 550 ceiling was measuring the wrong thing

Re-measured in a real browser with all writes in one batch and a single layout
flush per frame, rather than a flush per particle.

| particles | build (ms) | per-frame p50 | per-frame p95 |
| --------- | ---------- | ------------- | ------------- |
| 300       | 3.9        | <0.1          | <0.1          |
| 550       | 8.9        | <0.1          | 0.1           |
| 1200      | 9.3        | <0.1          | 0.1           |
| 3500      | 20.6       | <0.1          | <0.1          |

**Per-frame main-thread cost is flat across a twelvefold range in particle
count.** The first benchmark's 4.1 ms → 53.4 ms curve was an artifact of its own
method: it wrote and flushed per particle, manufacturing a cost the design does
not pay. The animation writes ONE transform for the scene and one per group —
particle transforms are static and are never touched after mount.

Cost scales with GROUPS, at 550 particles:

| groups | p50  | p95 |
| ------ | ---- | --- |
| 6      | <0.1 | 0.1 |
| 25     | <0.1 | 0.1 |
| 50     | 0.2  | 0.7 |
| 100    | 0.4  | 0.9 |
| 200    | 0.6  | 2.9 |

At the scene's real shape — measured at 54 clusters on desktop and 28 on
narrow, so ~60 groups with the systems — p95 is **~0.7 ms against a 16.7 ms
frame**. (An earlier draft of this table said ~44 clusters; that count predated
the budget moving to the airways, and is corrected here.) Doubling particles from 550
to 1200 at fixed group count changed nothing (p95 0.6 → 0.5, i.e. noise).
`will-change: transform` on particles made no main-thread difference either way,
which is expected: it is a compositor hint.

**Not measured, and still open: GPU raster and compositing.** Both harnesses
available here run in hidden tabs, where nothing composites. That term is where
particle count actually costs something — `will-change` on N particles promotes
N layers — so the budget stays at 550 for now. It is now bounded by layer
memory, not by main-thread time, and the lever if more particles are ever wanted
is to drop `will-change` from particles (which never animate individually)
rather than to raise the count blindly.

**Cluster count is the number to watch**, not particle count. Keep groups under
~100.

### §5, §7 — the pleural surfaces are stroked outlines

The particle envelope is gone. It had ~110 particles for two lung shells, three
fissures, two costophrenic angles and the cardiac notch, and the notch — the
single most important silhouette feature — came out drawn by five of them. It
was geometrically correct and invisible; no budget increase fixes that, because
a curve needs to be a curve.

Now **three nested outlines per lung, six paths total.** The cross-section
narrows with depth, so the anterior and posterior shells draw at ~78% of the mid
shell and the nesting itself reads as volume. Fissures are gaps in the stroke —
a fissure is where the visceral pleura folds inward, so it genuinely interrupts
the surface; drawing it as a line would put a mark where there is no edge.

Freed budget went where item 1's defect was: airways 250 → 316, heart 190 → 228
on desktop (the six paths are still rendered elements and are charged against
the 550). Airway fill improved again to right 0.914–0.942, left 0.906–0.953.

Every §5 landmark and §7 assertion survives unchanged, reading points off the
paths — a stricter test than before, since every point now lies exactly ON the
surface instead of wherever a random cloud happened to be densest.

### §5 — the cardiac notch is anterior, not full-thickness

Found while drawing the shells. The notch was cut through the entire depth of
the lung. The heart lies against the ANTERIOR left lung; behind it the lung runs
medially toward the descending aorta and the spine. A full-thickness cut deletes
lung that exists and discards the one fact the notch conveys — that the heart is
in FRONT. The notch now applies only anterior to z = −0.05, so it opens on the
anterior shells and closes on the posterior one. That per-shell difference is
depth information a particle cloud could not carry.

The assertion narrowed accordingly and gained a companion: anterior emptiness is
absolute, and posterior lung must be PRESENT, or a depth-limited notch would be
indistinguishable from the full-thickness one it replaced.

### One predicate for "where is the lung"

`insidePleura` and the envelope sampler had each carried their own copy of the
cardiac exclusion, and the predicate's copy was missing — invisible while the
only consumer was the sampler, and immediately visible as 45 surface points
running through the heart once a curve was marched off it. There is now one
definition. The airway tree contains against `insideLung` (pleura minus notch)
rather than `insidePleura`, which is both more correct and measurably better.

---

## Known open defect — the heart floats above the diaphragm

Found by the phase-1 verification sweep, confirmed by measurement, and NOT
fixed. Recording it rather than leaving it for the next reader to rediscover.

The cardiac hull's lowest point is y = **-0.459**. The left hemidiaphragm dome
is at **-0.555**. Between them, directly beneath the cardiac apex at x = 0.149,
the model draws **lung** — down to y = -0.555.

That is wrong. On an AP film the cardiac silhouette meets the left
hemidiaphragm; the cardiophrenic angle is where they join, and there is no lung
between them.

**The spec contains the contradiction**, as in review item 0: §3 puts the apex
at -0.450 and §1 puts the left dome at -0.555, so the two cannot both be right
about a heart that rests on the diaphragm.

**The likely correct fix is not to move either number.** It is that this model's
diaphragm falls monotonically from the mediastinum to the costophrenic angle,
whereas a real hemidiaphragm rises from a LOW medial cardiophrenic angle to a
dome near the midclavicular line and only then falls laterally. Give the floor
that third inflection and the heart settles into the medial recess with no gap,
without touching the apex, the dome, or the costophrenic work above.

Deferred because reshaping the diaphragm perturbs the costophrenic angle and
the airway containment that were just corrected against it, and that trade
deserves its own measurement pass rather than a change made at the end of one.
