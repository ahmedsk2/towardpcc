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
const INK = { airway: "255,150,130", heart: "244,72,96", pleura: "255,214,200" } as const;

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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -20 ${SCENE.width + 60} ${SCENE.height + 60}" width="${(SCENE.width + 60) * 2}" height="${(SCENE.height + 60) * 2}">
<rect x="-30" y="-20" width="${SCENE.width + 60}" height="${SCENE.height + 60}" fill="#2a1019"/>
${parts.join("\n")}
</svg>
`,
);

console.log(
  `points ${scene.counts.points}  edges ${scene.counts.edges}  ` +
    `paths ${scene.paths.length}  elements ${scene.counts.elements}  ` +
    `path chars ${scene.paths.reduce((a, p) => a + p.d.length, 0)}`,
);
