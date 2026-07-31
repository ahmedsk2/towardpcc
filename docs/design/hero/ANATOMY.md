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
