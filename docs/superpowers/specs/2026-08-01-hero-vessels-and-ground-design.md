# Hero figure: vessels, open ground, standing annotations

**Status:** approved 2026-08-01. Rotation deliberately deferred.

## Why

Three things drove this: the card around the figure reads as a box on a page
that has none elsewhere; the annotations only appear on hover, so the scene's
best idea is invisible to anyone who does not go looking; and the figure has
airways and no blood vessels, which on a _cardiopulmonary_ graphic is a
conspicuous absence — the heart and the lungs currently share a frame without
being connected to one another.

Measured against `mnm.towardpcc.com`, whose brain is the agreed reference.

## What the reference actually is

Read from the private repo through the owner's `gh` credentials, not guessed.

|             | Brain (reference)                              | Chest (current)                             |
| ----------- | ---------------------------------------------- | ------------------------------------------- |
| Nodes       | 640                                            | 2,989                                       |
| Edges       | ~1,965                                         | 5,661                                       |
| Geometry    | procedural in-browser, noise-deformed spheres  | precomputed on the server, measured anatomy |
| Renderer    | raw three.js `^0.184.0`, dynamic import        | server-rendered SVG, depth-banded           |
| Rotation    | 24 s Y turntable + 3.4 deg X wobble + 11 s bob | ±15 deg depth-band parallax                 |
| Annotations | fixed SVG overlay, **do not track rotation**   | hover-revealed, physiology only             |

Two findings that shaped this design.

The chest is already about **three times denser** than the reference, so density
was never the gap.

And the reference's annotations are anchored to nothing: there is no
`camera.project()` anywhere in that codebase, while the 3D hotspots _are_
parented to the rotating group. They drift away from their own labels, and the
alignment only reads correctly at one phase of each 24-second turn. Do not copy
this.

## Decisions

**Rotation is deferred, not rejected.** It is the only thing that makes the
depth ordering legible — RV anterior, LA posterior, bronchi passing behind the
heart — and a static AP view flattens that completely. But it forces the mesh
into the client as a binary payload and puts every edge through a per-frame
projection, which caps both edge count and page weight. Deferring it spends
that budget on anatomy instead. The ±15 deg parallax already built stays; it is
server-rendered and effectively free, and recovers some of the depth reading.

**No box, no dark ground.** The figure sits on the crimson hero gradient. The
known cost is contrast: depth is carried entirely by brightness and the ground
moves from near-black to mid-crimson. Compensated by raising mesh luminance and
widening the separation between systems, then _measured_. If it cannot be made
to read, that gets reported with a comparison rather than argued.

**Annotations stand permanently.** `RR 19/min`, `HR 81 bpm`, and the RSA line,
still derived from the rhythm constants rather than written out. Low emphasis so
they do not compete with the headline. Leader lines are drawn only where the
anchor is genuinely fixed — since the figure no longer rotates, this is honest;
if rotation returns, the anchors must be projected per frame, which is the bug
the reference has.

## Scope

1. Pulmonary **arteries**, following the bronchi from each hilum.
2. Pulmonary **veins**, running separately and draining to the left atrium —
   which is _why_ the LA already sits posteriorly in the model.
3. The diaphragm as a drawn surface rather than an implied floor.
4. Edge budget from ~5,700 to ~9,000–10,000.
5. Card removed; annotations made permanent.

Vessels are the substance of this change. They connect the two organs, make the
hila read as hila, and are the reason the left atrium is where it is.

## Budget

Route JS is unaffected — none of this ships as JavaScript. The constraint moves
to HTML: ~45 KB gzipped of path data today, ~70 KB at 10,000 edges. Still far
below a 3D library, but not free, and loading time is a stated goal. If the
figure crosses ~75 KB gzipped, decimate rather than ship it.

## Out of scope

Rotation. Ribs. Annotations beyond physiology — no lobe names, no chamber
names, and never the CTR, which is a test assertion and not a claim to a reader.

---

## What shipped, and where it diverged

Recorded after the fact, because two of the numbers above turned out to be
wrong about the problem rather than about the answer.

**Delivered:** items 1, 2 and 5. Both hilar relationships are drawn and
asserted — the right is eparterial, the left arches over its bronchus — the
bundle offset makes the arteries genuinely accompany the bronchi, and the four
veins grow in the septa and converge on the posterior left atrium. The card is
gone and the annotations stand.

**Not delivered:** item 3, the drawn diaphragm. Held back deliberately: the
work below changed how every surface in the scene is meshed, and adding a third
surface on top of an unverified change would have made both hard to judge.

**Item 4 was the wrong target.** The edge budget went to 6,303, not 9,000, and
the figure is better for it. Two discoveries inverted the assumption that more
edges meant more anatomy:

- The cardiac and pleural surfaces were meshed by proximity between sampled
  points, which starves an elongated body at its ends. The heart's geometry
  measured correct throughout — reaching the documented base, both borders and
  the apex — while the drawn surface stopped a third of the way down and read
  as a ball, because the points at the apex fell further apart than the maximum
  edge length and were never joined. Meshing by DIRECTION adjacency instead is
  exact, and fixed the shape without adding a single sample.
- With clean quads, the pleura described the same surface at 400 sweep
  directions that had taken 640, and its back wall stopped being drawn as a
  cage of dots through the front.

Net: two whole vessel systems added, 1,612 edges of pleural cage removed, and
**path data fell from 202,103 to 192,863 bytes** — more anatomy in less weight.
Route JS unchanged at 156.5 KB. The home page gzips to 133 KB, well inside the
75 KB-of-figure ceiling this document set.

**Three defects the vessel work exposed**, all pre-existing and none visible
before something was attached to them:

1. The left atrium and left ventricle were not joined. A gap of 0.020 across
   the mitral annulus meant the left heart was two solids; the slice at
   y = −0.12 contained only right-atrial surface. Fixed by growing the atrium
   down to the annulus, leaving its roof at the carina where the assertion pins
   it.
2. The pleural sweep used a global containment predicate, so a ray leaving one
   lung's centre could take its outermost crossing inside the OTHER lung. Ten
   vertices sat on the wrong side of the chest. The existing "never bridges the
   mediastinum" assertion caught it the moment the edge ceiling stopped masking
   it — which is the case for keeping assertions that seem to pass for free.
3. The heart did not move with the breath. Nothing had connected it to the
   lungs before, so nothing contradicted it; a trunk leaving the right
   ventricle and four veins entering the left atrium did. The heart now
   descends 0.025 on inspiration, which is both the fix and a fact.

**Deferred to a decision, not to a backlog:** the right main bronchus ends
inside the modelled right atrium, and the right middle lobe bronchus runs
through it. The chambers are reviewed geometry with their own assertions, so
correcting the atrium's depth is not a change to make in passing.
