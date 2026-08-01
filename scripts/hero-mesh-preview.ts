/**
 * Fast look-iteration on the hero.
 *
 * Renders THE SHIPPED SCENE MODEL — the same depth-banded paths the component
 * emits — to a standalone SVG, so what this shows is what the page draws. An
 * earlier version emitted one element per edge and was both slower than the
 * product and not the product.
 *
 * Run: npx tsx scripts/hero-mesh-preview.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildScene, SCENE } from "../apps/web/lib/hero-cardiopulm/scene";

const scene = buildScene();
/**
 * sRGB approximations of the component's `color-mix(in oklab, ...)` inks.
 *
 * They had drifted: these were still the pre-lift values from when the figure
 * sat on a near-black panel, so the tool that claims to show what the page
 * draws was showing a darker, more saturated scene than the page. Kept in sync
 * by hand — a build-time colour-space conversion for a dev script is not worth
 * the dependency, but a stale one is worth catching.
 */
const INK = {
  trachea: "255,225,215",
  airway: "255,181,167",
  artery: "239,99,118",
  vein: "255,202,189",
  heart: "236,74,99",
  pleura: "255,222,210",
} as const;

const parts = [
  ...scene.paths.map(
    (p) =>
      `<path d="${p.d}" fill="none" stroke="rgb(${INK[p.kind]})" stroke-opacity="${p.opacity.toFixed(3)}" stroke-width="${p.width.toFixed(2)}" stroke-linecap="round"/>`,
  ),
  ...scene.heartNodes.map(
    (n) =>
      `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(2)}" fill="rgb(244,72,96)" fill-opacity="${(0.25 + 0.7 * n.depth).toFixed(3)}"/>`,
  ),
  ...scene.clusters.map(
    (n) =>
      `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(2)}" fill="rgb(255,220,204)" fill-opacity="${(0.35 + 0.6 * n.depth).toFixed(3)}"/>`,
  ),
];

writeFileSync(
  join(import.meta.dirname, "..", "docs", "design", "hero", "mesh-preview.svg"),
  // THE HERO GRADIENT, not a flat dark panel. The panel is gone from the page,
  // and judging the mesh against a ground three stops darker than the real one
  // is how the lungs came to be shipped nearly invisible in the first place.
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -20 ${SCENE.width + 60} ${SCENE.height + 60}" width="${(SCENE.width + 60) * 2}" height="${(SCENE.height + 60) * 2}">
<defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#3d1526"/><stop offset="0.45" stop-color="#6b1930"/><stop offset="1" stop-color="#a81f3c"/>
</linearGradient></defs>
<rect x="-30" y="-20" width="${SCENE.width + 60}" height="${SCENE.height + 60}" fill="url(#ground)"/>
${parts.join("\n")}
</svg>
`,
);

console.log(
  `points ${scene.counts.points}  edges ${scene.counts.edges}  ` +
    `paths ${scene.paths.length}  elements ${scene.counts.elements}  ` +
    `path chars ${scene.paths.reduce((a, p) => a + p.d.length, 0)}`,
);
