/**
 * Generates the hero geometry review artifacts.
 *
 *   docs/design/hero/anatomy-check.svg   — AP projection of the particle cloud
 *   docs/design/hero/anatomy-pleura.svg  — the same, with pleural outlines
 *
 * COMMITTED ON PURPOSE. The first artifact was produced ad hoc, and that is
 * precisely how it came to disagree with the model it was supposed to depict:
 * it quantised a continuous laterality scalar into two flat fills, which made a
 * soft septal blend look like a hard split at the midline. Review decisions are
 * made on these renders, so the renderer has to be reproducible and has to be
 * wrong in no ways the model is not.
 *
 * Run: pnpm --filter @towardpcc/web exec tsx ../../scripts/hero-anatomy-artifacts.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { BUDGET, DEFAULT_SEED } from "../apps/web/lib/hero-cardiopulm/anatomy";
import { PLEURAL_LATERAL_EXTENT } from "../apps/web/lib/hero-cardiopulm/envelope";
import { generateShells } from "../apps/web/lib/hero-cardiopulm/shells";
import { cardiacHullExtentX, generateHeart } from "../apps/web/lib/hero-cardiopulm/heart";
import { generateTree } from "../apps/web/lib/hero-cardiopulm/tree";

/** Unchanged from the reviewed artifact, so recovered measurements still map. */
const PX_PER_UNIT = 1334.6;
const ORIGIN = { x: 600, y: 600 };
const VIEW = { w: 1200, h: 1550 };

const sx = (x: number) => ORIGIN.x + x * PX_PER_UNIT;
const sy = (y: number) => ORIGIN.y - y * PX_PER_UNIT;
const f = (n: number) => n.toFixed(1);
const NL = String.fromCharCode(10);

/** Right-heart deep crimson → left-heart bright, interpolated, never bucketed. */
const RIGHT = [0x8f, 0x17, 0x28];
const LEFT = [0xea, 0x3a, 0x57];
function tintFill(t: number): string {
  const c = RIGHT.map((r, i) => Math.round(r + (LEFT[i]! - r) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const preset = BUDGET.desktop;
const heart = generateHeart(preset.heart, DEFAULT_SEED);
const tree = generateTree(preset.airways, preset.generations, DEFAULT_SEED);
const shells = generateShells();

function guides(): string {
  const g: string[] = [];
  // One unit grid line every 0.1, so a reviewer can measure off the file.
  for (let v = -0.7; v <= 0.5; v += 0.1) {
    if (Math.abs(v) < 1e-9) continue;
    g.push(
      `<line x1="0" y1="${f(sy(v))}" x2="${VIEW.w}" y2="${f(sy(v))}" stroke="#ffffff" stroke-opacity="0.05"/>`,
      `<line x1="${f(sx(v))}" y1="0" x2="${f(sx(v))}" y2="${VIEW.h}" stroke="#ffffff" stroke-opacity="0.05"/>`,
    );
  }
  g.push(
    `<line x1="${f(sx(0))}" y1="0" x2="${f(sx(0))}" y2="${VIEW.h}" stroke="#ffffff" stroke-opacity="0.22" stroke-dasharray="6 6"/>`,
    `<line x1="0" y1="${f(sy(0))}" x2="${VIEW.w}" y2="${f(sy(0))}" stroke="#ffffff" stroke-opacity="0.22" stroke-dasharray="6 6"/>`,
    `<text x="${f(sx(0) + 8)}" y="${f(sy(0) - 8)}" fill="#ffd9cc" font-size="16" font-family="monospace">carina (origin)</text>`,
  );
  return g.join("\n");
}

/**
 * The pleural surfaces, as the renderer will draw them: one polyline per
 * segment, the gaps between segments being the fissures.
 *
 * Opacity carries depth — the posterior shell sits back, the anterior one
 * forward — because in the flat AP artifact there is no perspective to do it.
 */
function shellPaths(only?: "outline"): string {
  const out: string[] = [];
  for (const shell of shells) {
    const near = (shell.z + 0.14) / 0.28;
    const opacity = only === "outline" ? 0.85 : 0.3 + 0.45 * near;
    const width = only === "outline" ? 2.6 : 1.6 + 1.4 * near;
    for (const seg of shell.segments) {
      const d = seg.points.map((p) => `${f(sx(p.x))},${f(sy(p.y))}`).join(" ");
      out.push(
        `<polyline points="${d}" fill="none" stroke="#ffd9cc" stroke-opacity="${opacity.toFixed(2)}" stroke-width="${width.toFixed(1)}" stroke-linecap="round"/>`,
      );
    }
  }
  return out.join(NL);
}

function particles(): string {
  const out: string[] = [];
  for (let i = 0; i < tree.count; i++) {
    const cluster = tree.isCluster[i] === 1;
    out.push(
      `<circle cx="${f(sx(tree.positions[i * 3]!))}" cy="${f(sy(tree.positions[i * 3 + 1]!))}" r="${cluster ? 4.4 : 2.6}" fill="#ff7a6b" fill-opacity="${cluster ? 0.9 : 0.6}"/>`,
    );
  }
  for (let i = 0; i < heart.count; i++) {
    out.push(
      `<circle cx="${f(sx(heart.positions[i * 3]!))}" cy="${f(sy(heart.positions[i * 3 + 1]!))}" r="4.6" fill="${tintFill(heart.tint[i]!)}" fill-opacity="0.95"/>`,
    );
  }
  return out.join("\n");
}

function legend(lines: string[]): string {
  return lines
    .map(
      (t, i) =>
        `<text x="24" y="${40 + i * 26}" fill="#ffd9cc" font-size="18" font-family="monospace">${t}</text>`,
    )
    .join("\n");
}

function svg(body: string, lines: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" width="${VIEW.w}" height="${VIEW.h}">
<rect width="${VIEW.w}" height="${VIEW.h}" fill="#260e1a"/>
${guides()}
${body}
${legend(lines)}
</svg>
`;
}

const hull = cardiacHullExtentX();
// Measured on the TREE, not the sampled particles — the same quantity the
// assertion checks. Measuring the particles here reported 0.792 against an
// assertion passing at 0.85 on identical geometry, because the particles are a
// thinned draw and their extremes are a function of the budget.
const treeX = Array.from({ length: tree.segments.length / 3 }, (_, i) => tree.segments[i * 3]!);
const fillR = Math.abs(Math.min(...treeX)) / PLEURAL_LATERAL_EXTENT;
const fillL = Math.max(...treeX) / PLEURAL_LATERAL_EXTENT;

const dir = join(import.meta.dirname, "..", "docs", "design", "hero");

writeFileSync(
  join(dir, "anatomy-check.svg"),
  svg([shellPaths(), particles()].join(NL), [
    `AP projection — desktop preset, seed 0x${DEFAULT_SEED.toString(16)}`,
    `heart ${heart.count}  airways ${tree.count}  pleural shells ${shells.length} paths`,
    `heart fill is INTERPOLATED across chamber laterality (deep = right heart)`,
    `cardiac hull ${hull.minX.toFixed(3)} .. ${hull.maxX.toFixed(3)}  CTR ${hull.ctr.toFixed(3)}`,
    `grid 0.1 units;  ${PX_PER_UNIT} px/unit;  origin ${ORIGIN.x},${ORIGIN.y}`,
  ]),
);

writeFileSync(
  join(dir, "anatomy-pleura.svg"),
  svg([shellPaths("outline"), particles()].join(NL), [
    `Pleural shells — 3 nested outlines per lung, ${shells.length} paths replacing ~110 particles`,
    `airway fill vs pleura — right ${fillR.toFixed(3)}   left ${fillL.toFixed(3)}   (floor 0.85)`,
    `pleural half-width ${PLEURAL_LATERAL_EXTENT.toFixed(3)}`,
    `stroke GAPS are the fissures; the notch opens on anterior shells only`,
  ]),
);

console.log(
  `cardiac hull  ${hull.minX.toFixed(4)} .. ${hull.maxX.toFixed(4)}  CTR ${hull.ctr.toFixed(4)}`,
);
console.log(`airway fill   right ${fillR.toFixed(3)}  left ${fillL.toFixed(3)}`);
console.log(`wrote anatomy-check.svg and anatomy-pleura.svg`);
