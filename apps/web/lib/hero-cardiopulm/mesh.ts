import { BUDGET, DEFAULT_SEED, HEART_CENTRE, LUNG, THORAX } from "./anatomy";
import { cardiacField, chamberLeftness } from "./heart";
import { generateHeart } from "./heart";
import { insideLung } from "./envelope";
import { fibonacciSphere } from "./rng";
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
const SURFACE_NEIGHBOURS = 4;
/**
 * Longest edge worth drawing, in anatomy units.
 *
 * Without a ceiling the mesh bridges across the mediastinum and ties the two
 * lungs together, which draws a surface where there is a gap.
 */
const MAX_EDGE = 0.11;
/** The heart is denser, so its edges must be shorter or the mesh webs over. */
const HEART_MAX_EDGE = 0.055;

/** Directions swept over each lung's surface. */
const PLEURA_DIRECTIONS = 640;
/** The cardiac surface is swept finer: it is smaller and it is the subject. */
const HEART_DIRECTIONS = 520;

const HEART_MARCH_MAX = 0.42;

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

  // ── Heart: a SURFACE GRID, ray-marched off the cardiac field ────────────
  //
  // The same sweep the lungs get, and for the same reason. Nearest-neighbour
  // meshing over sampled particles produced a web: correct points joined in
  // whatever order proximity happened to suggest, with edges cutting through
  // the organ and no facet anywhere. Beside a bronchial tree drawn from its own
  // connectivity and lungs drawn as a real surface, it was the one system that
  // still looked like a scatter with lines added.
  //
  // The blended chamber union is star-shaped about its centre, so the same
  // march works: step out until the field turns positive, bisect the crossing.
  // Vertices carry chamber laterality, so the right-to-left tint survives the
  // change of representation — the surface still knows which chambers it is.
  const heartFrom = points.length;
  const heartDirs = fibonacciSphere(HEART_DIRECTIONS, 1);
  for (let i = 0; i < HEART_DIRECTIONS; i++) {
    const dx = heartDirs[i * 3]!;
    const dy = heartDirs[i * 3 + 1]!;
    const dz = heartDirs[i * 3 + 2]!;
    // Outermost crossing. A ray leaving the ventricles re-enters at the left
    // atrium, which sits posteriorly and higher; stopping at the first exit
    // cut the great-vessel end off the organ entirely.
    let inside = -1;
    for (let r = 0.01; r <= HEART_MARCH_MAX; r += 0.006) {
      if (
        cardiacField(HEART_CENTRE.x + dx * r, HEART_CENTRE.y + dy * r, HEART_CENTRE.z + dz * r) <= 0
      ) {
        inside = r;
      }
    }
    if (inside < 0) continue;
    let lo = inside;
    let hi = inside + 0.006;
    for (let k = 0; k < 14; k++) {
      const mid = (lo + hi) / 2;
      const fx = HEART_CENTRE.x + dx * mid;
      const fy = HEART_CENTRE.y + dy * mid;
      const fz = HEART_CENTRE.z + dz * mid;
      if (cardiacField(fx, fy, fz) <= 0) lo = mid;
      else hi = mid;
    }
    const x = HEART_CENTRE.x + dx * lo;
    const y = HEART_CENTRE.y + dy * lo;
    const z = HEART_CENTRE.z + dz * lo;
    points.push({ x, y, z, kind: "heart", t: chamberLeftness(x, y, z) });
  }
  edges.push(...knn(points, heartFrom, points.length, "heart", SURFACE_NEIGHBOURS, HEART_MAX_EDGE));
  void heart;

  // ── Pleura: a surface, swept on FIBONACCI DIRECTIONS and re-meshed ──────
  //
  // Directions come from a Fibonacci sphere rather than a latitude/longitude
  // grid. A lat/long grid has poles, and the poles landed on the lung apex and
  // the diaphragm — the two places a lung is most obviously a dome — where
  // every meridian converges into a starburst. It also has rows, and the eye
  // locks onto rows and stops seeing a surface. Fibonacci directions are
  // evenly spaced with no pole and no preferred axis.
  //
  // The cost is that neighbours are no longer known from indices, so the shell
  // is re-meshed by proximity afterwards. On a set of points that all lie ON a
  // surface that is what a surface triangulation is, and unlike meshing a
  // volume it cannot cut through the solid.
  //
  // Marched off insideLung itself, so the drawn skin cannot drift from the
  // surface the airways are contained by.
  const pleuraFrom = points.length;
  for (const side of [-1, 1] as const) {
    const cx = side * (LUNG.medialX + LUNG.halfWidth);
    const cy = (THORAX.lungApexY + THORAX.costophrenicY) / 2;
    const dirs = fibonacciSphere(PLEURA_DIRECTIONS, 1);
    for (let i = 0; i < PLEURA_DIRECTIONS; i++) {
      const dx = dirs[i * 3]!;
      const dy = dirs[i * 3 + 1]!;
      const dz = dirs[i * 3 + 2]!;
      // Outermost crossing: the cardiac notch makes a lung non-star-shaped, so
      // a ray can leave and re-enter and the first exit is not the surface.
      let inside = -1;
      for (let r = 0.02; r <= 0.62; r += 0.01) {
        if (insideLung(cx + dx * r, cy + dy * r, dz * r)) inside = r;
      }
      if (inside < 0) continue;
      let lo = inside;
      let hi = inside + 0.01;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        if (insideLung(cx + dx * mid, cy + dy * mid, dz * mid)) lo = mid;
        else hi = mid;
      }
      points.push({ x: cx + dx * lo, y: cy + dy * lo, z: dz * lo, kind: "pleura", t: 0 });
    }
  }
  edges.push(...knn(points, pleuraFrom, points.length, "pleura", SURFACE_NEIGHBOURS, MAX_EDGE));

  return { points, edges, nodes };
}
