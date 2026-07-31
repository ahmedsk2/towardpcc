import { BUDGET, DEFAULT_SEED, HEART_CENTRE, LUNG, THORAX } from "./anatomy";
import { cardiacField, chamberLeftness } from "./heart";
import { generateHeart } from "./heart";
import { insideLung } from "./envelope";
import { mulberry32 } from "./rng";
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

/** Latitude and longitude divisions of each lung's surface grid. */
const PLEURA_RINGS = 22;
const PLEURA_SEGMENTS = 30;
/**
 * How far each grid direction is jittered, as a fraction of a cell.
 *
 * An unjittered lat/long grid is a perfect lattice, and a perfect lattice reads
 * as a wireframe balloon: the eye locks onto the rows and stops seeing a
 * surface. Displacing each direction by a fraction of a cell keeps the quads
 * connected while breaking the regularity, which is what makes a mesh read as
 * skin rather than as a net thrown over something.
 *
 * Seeded, so the surface is identical on every build.
 */
const PLEURA_JITTER = 0.42;

/** The cardiac surface is swept finer: it is smaller and it is the subject. */
const HEART_MARCH_MAX = 0.42;
const HEART_RINGS = 20;
const HEART_SEGMENTS = 26;

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
  const heartRng = mulberry32(DEFAULT_SEED ^ 0x1c0d);
  const heartGrid: number[][] = [];
  for (let iu = 0; iu <= HEART_RINGS; iu++) {
    const v = (iu / HEART_RINGS) * 0.94 + 0.03;
    const row: number[] = [];
    for (let iv = 0; iv < HEART_SEGMENTS; iv++) {
      const az = ((iv + (heartRng() - 0.5) * PLEURA_JITTER) / HEART_SEGMENTS) * Math.PI * 2;
      const polar = v * Math.PI + ((heartRng() - 0.5) * PLEURA_JITTER * Math.PI) / HEART_RINGS;
      const dx = Math.sin(polar) * Math.cos(az);
      const dy = Math.cos(polar);
      const dz = Math.sin(polar) * Math.sin(az);
      // Scans the WHOLE range and keeps the outermost crossing. Breaking at
      // the first exit returns the first shell, and neither of these solids is
      // star-shaped: a ray leaving the ventricles can re-enter at the left
      // atrium, which sits posteriorly and higher. Stopping early cut the top
      // third off the heart — the mesh reached y -0.170 against a base at
      // -0.030, so the great-vessel end simply was not there.
      let inside = -1;
      for (let r = 0.01; r <= HEART_MARCH_MAX; r += 0.006) {
        const p = {
          x: HEART_CENTRE.x + dx * r,
          y: HEART_CENTRE.y + dy * r,
          z: HEART_CENTRE.z + dz * r,
        };
        if (cardiacField(p.x, p.y, p.z) <= 0) inside = r;
      }
      if (inside < 0) {
        row.push(-1);
        continue;
      }
      let lo = inside;
      let hi = inside + 0.006;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        const p = {
          x: HEART_CENTRE.x + dx * mid,
          y: HEART_CENTRE.y + dy * mid,
          z: HEART_CENTRE.z + dz * mid,
        };
        if (cardiacField(p.x, p.y, p.z) <= 0) lo = mid;
        else hi = mid;
      }
      const x = HEART_CENTRE.x + dx * lo;
      const y = HEART_CENTRE.y + dy * lo;
      const z = HEART_CENTRE.z + dz * lo;
      row.push(points.length);
      points.push({ x, y, z, kind: "heart", t: chamberLeftness(x, y, z) });
    }
    heartGrid.push(row);
  }
  const joinHeart = (a: number, b: number) => {
    if (a < 0 || b < 0) return;
    const p = points[a]!;
    const q = points[b]!;
    const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    if (d > MAX_EDGE) return;
    edges.push({ a, b, kind: "heart", depth: Math.min(1, d / MAX_EDGE) });
  };
  for (let iu = 0; iu < heartGrid.length; iu++) {
    for (let iv = 0; iv < HEART_SEGMENTS; iv++) {
      joinHeart(heartGrid[iu]![iv]!, heartGrid[iu]![(iv + 1) % HEART_SEGMENTS]!);
      if (iu + 1 < heartGrid.length) joinHeart(heartGrid[iu]![iv]!, heartGrid[iu + 1]![iv]!);
    }
  }
  void heart;

  // ── Pleura: a STRUCTURED SURFACE GRID, ray-marched off insideLung ───────
  //
  // Contour samples cannot make a surface. Three stacks of subsampled outlines
  // gave the lungs no skin: the airways inside them read as volume and the
  // lungs themselves read as a faint wire cage around it. A surface needs a
  // grid whose neighbours are known, so that every quad is a facet.
  //
  // Each lung is swept on a latitude/longitude grid: for every direction, march
  // outward from the lung's centre until insideLung stops being true, and that
  // crossing is a vertex. Neighbours in both grid directions become edges, so
  // the mesh is a shell rather than a cloud that happens to be hollow.
  //
  // Marched off insideLung itself, so the drawn skin cannot drift from the
  // surface the airways are contained by.
  const pleuraFrom = points.length;
  const surfaceRng = mulberry32(DEFAULT_SEED ^ 0x5eed);
  for (const side of [-1, 1] as const) {
    const cx = side * (LUNG.medialX + LUNG.halfWidth);
    const cy = (THORAX.lungApexY + THORAX.costophrenicY) / 2;
    const grid: number[][] = [];
    for (let iu = 0; iu <= PLEURA_RINGS; iu++) {
      // Latitude, apex to base. Endpoints are pulled just inside the poles:
      // a ring of coincident vertices at each pole draws a starburst.
      const v = (iu / PLEURA_RINGS) * 0.94 + 0.03;
      const polar = v * Math.PI;
      const row: number[] = [];
      for (let iv = 0; iv < PLEURA_SEGMENTS; iv++) {
        const az = ((iv + (surfaceRng() - 0.5) * PLEURA_JITTER) / PLEURA_SEGMENTS) * Math.PI * 2;
        const jitteredPolar =
          polar + ((surfaceRng() - 0.5) * PLEURA_JITTER * Math.PI) / PLEURA_RINGS;
        const dx = Math.sin(jitteredPolar) * Math.cos(az);
        const dy = Math.cos(jitteredPolar);
        const dz = Math.sin(jitteredPolar) * Math.sin(az);
        // March out, then bisect the last inside/outside pair.
        // Outermost crossing, for the same reason as the heart: the cardiac
        // notch makes a lung non-star-shaped, so a ray can leave and re-enter.
        let inside = -1;
        for (let r = 0.02; r <= 0.62; r += 0.01) {
          if (insideLung(cx + dx * r, cy + dy * r, dz * r)) inside = r;
        }
        if (inside < 0) {
          row.push(-1);
          continue;
        }
        let lo = inside;
        let hi = inside + 0.01;
        for (let k = 0; k < 14; k++) {
          const mid = (lo + hi) / 2;
          if (insideLung(cx + dx * mid, cy + dy * mid, dz * mid)) lo = mid;
          else hi = mid;
        }
        row.push(points.length);
        points.push({ x: cx + dx * lo, y: cy + dy * lo, z: dz * lo, kind: "pleura", t: 0 });
      }
      grid.push(row);
    }

    // Quad edges: along each ring, and between rings. Long edges are dropped —
    // where the surface jumps, at the notch and the costophrenic angle, a
    // connecting edge would bridge a real discontinuity.
    const join = (a: number, b: number) => {
      if (a < 0 || b < 0) return;
      const p = points[a]!;
      const q = points[b]!;
      const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      if (d > MAX_EDGE) return;
      edges.push({ a, b, kind: "pleura", depth: Math.min(1, d / MAX_EDGE) });
    };
    for (let iu = 0; iu < grid.length; iu++) {
      for (let iv = 0; iv < PLEURA_SEGMENTS; iv++) {
        join(grid[iu]![iv]!, grid[iu]![(iv + 1) % PLEURA_SEGMENTS]!);
        if (iu + 1 < grid.length) join(grid[iu]![iv]!, grid[iu + 1]![iv]!);
      }
    }
  }
  void pleuraFrom;

  return { points, edges, nodes };
}
