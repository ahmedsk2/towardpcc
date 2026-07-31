/**
 * Fast look-iteration on the hero mesh.
 *
 * Renders the mesh to a standalone SVG at a fixed camera so the visual can be
 * judged and tuned without a dev server round trip. Not shipped and not the
 * renderer — the scene draws to canvas — but the same projection maths, so what
 * this shows is what that draws.
 *
 * Run: npx tsx scripts/hero-mesh-preview.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { RHYTHM } from "../apps/web/lib/hero-cardiopulm/anatomy";
import { buildMesh, type MeshKind } from "../apps/web/lib/hero-cardiopulm/mesh";

const W = 760;
const H = 900;
const SCALE = 700;
const ORIGIN = { x: W / 2, y: 300 };
const YAW = (14 * Math.PI) / 180;
const PITCH = (RHYTHM.pitchDeg * Math.PI) / 180;
const CAM = 2.6;

const mesh = buildMesh();

/** Rotate about y then x, then project with a simple perspective divide. */
function project(p: { x: number; y: number; z: number }) {
  const cx = Math.cos(YAW);
  const sx = Math.sin(YAW);
  const x1 = p.x * cx + p.z * sx;
  const z1 = -p.x * sx + p.z * cx;
  const cy = Math.cos(PITCH);
  const sy = Math.sin(PITCH);
  const y1 = p.y * cy - z1 * sy;
  const z2 = p.y * sy + z1 * cy;
  const k = CAM / (CAM - z2);
  return { x: ORIGIN.x + x1 * SCALE * k, y: ORIGIN.y - y1 * SCALE * k, depth: z2, k };
}

const projected = mesh.points.map(project);
const depths = projected.map((p) => p.depth);
const near = Math.max(...depths);
const far = Math.min(...depths);
/** 0 at the back, 1 at the front. Depth is carried by brightness alone. */
const norm = (d: number) => (d - far) / (near - far || 1);

const INK: Record<MeshKind, string> = {
  airway: "255,150,130",
  heart: "244,72,96",
  pleura: "255,214,200",
};

const parts: string[] = [];

// Edges first, back to front, so nearer structure overlays.
const KIND_ORDER: Record<MeshKind, number> = { pleura: 0, airway: 1, heart: 2 };
const ordered = mesh.edges
  .map((e) => ({ e, d: (norm(projected[e.a]!.depth) + norm(projected[e.b]!.depth)) / 2 }))
  // Pleura behind, then airways, then the heart on top: the heart is the
  // subject and must not be lost under a lung it sits in front of.
  .sort((a, b) => KIND_ORDER[a.e.kind] - KIND_ORDER[b.e.kind] || a.d - b.d);

for (const { e, d } of ordered) {
  const a = projected[e.a]!;
  const b = projected[e.b]!;
  const base = e.kind === "airway" ? 0.7 : e.kind === "heart" ? 0.95 : 0.2;
  // Wide alpha range: depth is carried by brightness alone, as in the reference.
  const alpha = Math.pow(0.06 + 0.94 * d, 1.7) * base;
  const width =
    e.kind === "airway"
      ? Math.max(0.5, 2.4 * (1 - e.depth) * (0.55 + 0.45 * d))
      : (e.kind === "heart" ? 0.85 : 0.7) * (0.5 + 0.5 * d);
  parts.push(
    `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="rgb(${INK[e.kind]})" stroke-opacity="${alpha.toFixed(3)}" stroke-width="${width.toFixed(2)}" stroke-linecap="round"/>`,
  );
}

// Vertices: small, and only where they mean something.
mesh.points.forEach((p, i) => {
  const q = projected[i]!;
  const d = norm(q.depth);
  if (p.kind === "pleura") return;
  const r = (p.kind === "heart" ? 1.5 : 1.2) * (0.6 + 0.7 * d);
  const alpha = (0.25 + 0.75 * d) * (p.kind === "heart" ? 0.9 : 0.7);
  parts.push(
    `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r.toFixed(2)}" fill="rgb(${INK[p.kind]})" fill-opacity="${alpha.toFixed(3)}"/>`,
  );
});

// Alveolar clusters: the luminous nodes that breathe.
for (const i of mesh.nodes) {
  const q = projected[i]!;
  const d = norm(q.depth);
  const r = 2.6 * (0.6 + 0.8 * d);
  parts.push(
    `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${(r * 3).toFixed(1)}" fill="rgb(255,170,140)" fill-opacity="${(0.1 * (0.3 + 0.7 * d)).toFixed(3)}"/>`,
    `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="${r.toFixed(2)}" fill="rgb(255,214,196)" fill-opacity="${(0.5 + 0.5 * d).toFixed(3)}"/>`,
  );
}

const counts = mesh.edges.reduce<Record<string, number>>((a, e) => {
  a[e.kind] = (a[e.kind] ?? 0) + 1;
  return a;
}, {});

writeFileSync(
  join(import.meta.dirname, "..", "docs", "design", "hero", "mesh-preview.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#1b0a12"/>
${parts.join("\n")}
<text x="18" y="30" fill="#ffd9cc" font-size="15" font-family="monospace" opacity="0.7">${mesh.points.length} points, ${mesh.edges.length} edges (airway ${counts.airway ?? 0}, heart ${counts.heart ?? 0}, pleura ${counts.pleura ?? 0})</text>
</svg>
`,
);

console.log(
  `points ${mesh.points.length}  edges ${mesh.edges.length}  ` +
    `airway ${counts.airway ?? 0}  heart ${counts.heart ?? 0}  pleura ${counts.pleura ?? 0}  ` +
    `clusters ${mesh.nodes.length}`,
);
