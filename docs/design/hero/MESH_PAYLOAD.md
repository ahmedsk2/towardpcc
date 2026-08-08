# The hero mesh payload — measured 2026-08-08

The open task said "move the hero mesh geometry out of the document". This is
what measuring it found, so the next person starts from numbers rather than
repeating the search.

**The short version: half the cost is duplication, not geometry, and the
duplication is not removable without giving up either the animation or the JS
budget. Encoding optimisations are already exhausted.**

## What it costs today

Measured against the built `apps/web/.next/server/app/index.html`:

|                                           | raw      | gzipped      |
| ----------------------------------------- | -------- | ------------ |
| whole home document                       | 604.7 KB | **134.8 KB** |
| largest inline `<svg>` (the mesh)         | 213.6 KB | 46.6 KB      |
| RSC flight payload (`self.__next_f.push`) | 310.5 KB | 71.6 KB      |
| `<style>` blocks                          | 9.6 KB   | —            |

The mesh is 35.3% of the raw document across 36 `<path d="…">` attributes,
200.6 KB of which is coordinate data.

## The geometry is in the document TWICE

Each of the 36 path strings occurs exactly **72 / 36 = 2.00** times: once as
rendered HTML, once serialised inside the RSC flight payload that Next inlines
for hydration.

|                        | raw      | gzipped  | saving                 |
| ---------------------- | -------- | -------- | ---------------------- |
| today                  | 604.7 KB | 134.8 KB | —                      |
| one copy removed       | 404.1 KB | 84.1 KB  | **50.8 KB gzip (38%)** |
| geometry gone entirely | 203.5 KB | 37.7 KB  | 97.1 KB gzip           |

So de-duplication alone is worth more than a third of the page, with **no visual
change at all** — if it can be done.

## Encoding optimisations are exhausted — do not redo these

**Coordinate precision is already 1dp.** 35,106 of 35,290 decimals carry one
place. Rounding everything to 1dp saves 0.9 KB gzipped.

**Relative path commands are WORSE over the wire**, which is counter-intuitive
enough to be worth recording. Converting `M x y L a b` pairs to `m`/`l` deltas
gives 26.5% smaller raw bytes and **larger gzip**:

|                  | raw      | gzipped     |
| ---------------- | -------- | ----------- |
| absolute (today) | 200.6 KB | **44.5 KB** |
| relative         | 147.5 KB | 49.2 KB     |

Absolute coordinates repeat wherever edges share a vertex, and gzip exploits
that repetition; deltas are more varied and compress worse. Raw size is the
wrong thing to optimise here.

## Why the duplication is hard to remove

The flight payload carries whatever a Server Component renders. Two escapes
exist and both cost more than they save:

Rendering the mesh from a **Client Component** puts a module reference and props
in the payload instead of markup — but then the geometry ships as client
JavaScript. The home route is at 156.1 KB against a 170 KB budget, so 46.6 KB of
geometry blows it outright.

Passing the paths as **props to a client component** serialises the props into
the flight payload, which is the same duplication by another route.

## Why an external SVG is not a drop-in either

The animation is applied by CSS to **class groups, not to the SVG as a whole**:

- `.cps-airway`, `.cps-trachea`, `.cps-artery`, `.cps-vein`, `.cps-pleura`,
  `.cps-clusters` — breath scale about `BREATH_ANCHOR_Y`
- `.cps-heart`, `.cps-heart-nodes` — cardiac descent **plus** `scale(var(--beat))`
- `.cps-clusters` — additional opacity on inspiration
- `.cps-heart-nodes` — brightness driven by `--wave`
- each depth band — its own `--z` parallax shift

`PulseDriver` writes `--breath`, `--beat` and `--wave` on the host element and
CSS distributes them. An external file loaded through `<img>`, `<object>` or
`background-image` is style-isolated, so none of those custom properties reach
inside. A single external mesh could only be animated as one rigid object — the
heart would stop beating independently of the lungs, which is the one thing the
figure exists to show.

`<use href="/hero-mesh.svg#band-3">` would preserve the cascade, but external
`<use>` has long-standing Safari support problems. That is not something to take
on trust for the site's signature element.

## What is actually left

A real fix means **one external SVG containing every group, referenced per
animated group**, so each group keeps its own transform — and it stands or falls
on external `<use>` behaving in Safari and iOS Safari. That needs testing on real
Apple devices before it is worth writing.

Until then this is a **known, quantified cost, not an unexamined one**: 134.8 KB
gzipped for the home document, about half of it a duplicate of the other half.

Anyone picking this up: measure `pnpm build` output, not the dev server, and
compare gzipped bytes rather than raw.
