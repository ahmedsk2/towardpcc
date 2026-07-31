import { BUDGET, DEFAULT_SEED } from "./anatomy";
import { generateHeart } from "./heart";
import { generateShells } from "./shells";
import { generateTree } from "./tree";

/**
 * The scene as a WIRE MESH: points joined to their neighbours.
 *
 * WHY THIS REPLACED LOOSE PARTICLES. A cloud of unconnected dots reads as
 * noise, however anatomically correct each dot is. What makes a point cloud
 * read as a VOLUME is the edges between the points: they give the eye a
 * surface to follow, and the outermost edges become a silhouette without any
 * outline being drawn. The first build of this scene had 544 correct particles
 * and six drawn outlines, and looked like a technical contour plot with dust
 * scattered over it.
 *
 * CONNECTIVITY COMES FROM ANATOMY WHERE ANATOMY HAS IT.
 *
 * The airway is a tree — the segments are known at generation time, and drawing
 * them is what makes it an airway rather than a scatter. Nearest-neighbour
 * meshing cannot recover that: it joins whatever is close, so a distal twig of
 * the right lower lobe links to one of the middle lobe that never shared a
 * bronchus with it. Only the heart and the pleural surfaces, which are surfaces
 * rather than trees, are meshed by proximity.
 */
export type MeshKind = "airway" | "heart" | "pleura";

export interface MeshPoint {
  x: number;
  y: number;
  z: number;
  kind: MeshKind;
  /** Heart: 0 = right, 1 = left. Airway: 1 if an alveolar cluster. Pleura: 0. */
  t: number;
}

export interface MeshEdge {
  a: number;
  b: number;
  kind: MeshKind;
  /** 0 = proximal/structural, 1 = distal/fine. Drives stroke weight. */
  depth: number;
}

export interface Mesh {
  points: MeshPoint[];
  edges: MeshEdge[];
  /** Indices of points that should also be drawn as dots. */
  nodes: number[];
}

/** How many neighbours each surface point is joined to. */
const NEIGHBOURS = 3;
/**
 * Longest edge worth drawing, in anatomy units.
 *
 * Without a ceiling the mesh bridges across the mediastinum and ties the two
 * lungs together, which draws a surface where there is a gap.
 */
const MAX_EDGE = 0.11;

/**
 * Contour points to keep per shell.
 *
 * Sparse on purpose. Drawn as a continuous line the contour is an OUTLINE, and
 * an outline around a mesh reads as a drafting box the scene has been placed
 * inside. Scattered and woven to its neighbours it reads as what it is: the
 * surface the airways stop at. The mesh's own outer edges carry the silhouette,
 * which is the whole reason a mesh needs no outline.
 */
const SHELL_SAMPLES = 17;

function knn(
  points: MeshPoint[],
  from: number,
  to: number,
  kind: MeshKind,
  k: number,
  maxLen: number,
): MeshEdge[] {
  const seen = new Set<string>();
  const edges: MeshEdge[] = [];
  for (let i = from; i < to; i++) {
    const p = points[i]!;
    const near: { j: number; d: number }[] = [];
    for (let j = from; j < to; j++) {
      if (i === j) continue;
      const q = points[j]!;
      const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      if (d > maxLen) continue;
      near.push({ j, d });
    }
    near.sort((m, n) => m.d - n.d);
    for (const { j, d } of near.slice(0, k)) {
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: i, b: j, kind, depth: Math.min(1, d / maxLen) });
    }
  }
  return edges;
}

export function buildMesh(preset: keyof typeof BUDGET = "desktop"): Mesh {
  const budget = BUDGET[preset];
  const heart = generateHeart(budget.heart, DEFAULT_SEED);
  const tree = generateTree(budget.airways, budget.generations, DEFAULT_SEED);
  const shells = generateShells();

  const points: MeshPoint[] = [];
  const edges: MeshEdge[] = [];
  const nodes: number[] = [];

  // ── Airway: the tree's own connectivity ─────────────────────────────────
  // Segment endpoints are deduplicated on a grid, so a parent's tip and its
  // children's roots become one shared node and the tree stays connected
  // rather than falling into disjoint sticks.
  const key = (x: number, y: number, z: number) =>
    `${Math.round(x * 4096)},${Math.round(y * 4096)},${Math.round(z * 4096)}`;
  const index = new Map<string, number>();
  const nodeOf = (x: number, y: number, z: number) => {
    const k = key(x, y, z);
    const hit = index.get(k);
    if (hit !== undefined) return hit;
    const id = points.length;
    points.push({ x, y, z, kind: "airway", t: 0 });
    index.set(k, id);
    return id;
  };

  const segCount = tree.segments.length / 6;
  const maxGen = Math.max(...tree.segmentGeneration);
  for (let s = 0; s < segCount; s++) {
    const o = s * 6;
    const a = nodeOf(tree.segments[o]!, tree.segments[o + 1]!, tree.segments[o + 2]!);
    const b = nodeOf(tree.segments[o + 3]!, tree.segments[o + 4]!, tree.segments[o + 5]!);
    if (a === b) continue;
    edges.push({ a, b, kind: "airway", depth: tree.segmentGeneration[s]! / maxGen });
  }

  // Alveolar clusters ride on top as luminous nodes — the part that breathes.
  for (let i = 0; i < tree.clusterCount; i++) {
    const o = i * 3;
    if (o + 2 >= tree.clusterCentroids.length) break;
    nodes.push(points.length);
    points.push({
      x: tree.clusterCentroids[o]!,
      y: tree.clusterCentroids[o + 1]!,
      z: tree.clusterCentroids[o + 2]!,
      kind: "airway",
      t: 1,
    });
  }

  // ── Heart: a surface, so meshed by proximity ────────────────────────────
  const heartFrom = points.length;
  for (let i = 0; i < heart.count; i++) {
    points.push({
      x: heart.positions[i * 3]!,
      y: heart.positions[i * 3 + 1]!,
      z: heart.positions[i * 3 + 2]!,
      kind: "heart",
      t: heart.tint[i]!,
    });
  }
  edges.push(...knn(points, heartFrom, points.length, "heart", NEIGHBOURS, MAX_EDGE));

  // ── Pleura: the contours, subsampled, then woven across depths ──────────
  // Proximity across the three depth shells weaves them into a surface rather
  // than three loose rings.
  const pleuraFrom = points.length;
  for (const shell of shells) {
    for (const seg of shell.segments) {
      const step = Math.max(1, Math.floor(seg.points.length / SHELL_SAMPLES));
      for (let i = 0; i < seg.points.length; i += step) {
        const p = seg.points[i]!;
        points.push({ x: p.x, y: p.y, z: shell.z, kind: "pleura", t: 0 });
      }
    }
  }
  edges.push(...knn(points, pleuraFrom, points.length, "pleura", 3, MAX_EDGE * 1.4));

  return { points, edges, nodes };
}
