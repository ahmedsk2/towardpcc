import { BUDGET, DEFAULT_SEED, HEART_CENTRE, LUNG, THORAX } from "./anatomy";
import { cardiacField, chamberLeftness } from "./heart";
import { generateHeart } from "./heart";
import { insideLung } from "./envelope";
import { fibonacciSphere } from "./rng";
import { generateTree } from "./tree";
import { generateVessels, type VesselSegment } from "./vessels";

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
/**
 * "trachea" covers the CENTRAL airway — trachea, carina, main and lobar
 * bronchi — as a system of its own rather than as the first few edges of the
 * airway.
 *
 * Not a taxonomy nicety. It is the one shape in a chest that everybody reads
 * instantly, and drawn at the same weight as a fifth-generation twig it
 * disappeared into the parenchyma: an air column three times the calibre of
 * anything around it, rendered at the same half-pixel stroke. Giving it its own
 * kind gives it its own depth bands and its own weight.
 */
/**
 * "artery" and "vein" are the PULMONARY circulation, and they are two kinds
 * rather than one for the same reason trachea is not airway: they need
 * different weights and different inks to be told apart at all.
 *
 * The artery is drawn heavier and more saturated — it springs from the right
 * ventricle, so continuity with the cardiac ink is correct rather than
 * decorative. The vein is drawn finer and paler. Neither is blue, and neither
 * ever will be: the design direction reserves the whole palette to crimson and
 * its warm neighbours, so the two are separated by weight and saturation, which
 * is what a reader can actually use at this scale.
 */
export type MeshKind = "trachea" | "airway" | "artery" | "vein" | "heart" | "pleura";

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
  /**
   * 0 = proximal/structural, 1 = distal/fine — the CALIBRE taper.
   *
   * Carried, not currently rendered. scene.ts cuts its bands by projected depth
   * because depth is what the parallax needs, and a band is one path with one
   * stroke width, so calibre would need its own banding and its own kinds. Kept
   * because it is a real property of the geometry and the generators know it;
   * the day the renderer can afford a second axis, it is already here.
   */
  depth: number;
}

export interface Mesh {
  points: MeshPoint[];
  edges: MeshEdge[];
  /** Indices of points that should also be drawn as dots. */
  nodes: number[];
}

/** How many neighbours each surface point is joined to. */
/**
 * Generations drawn as the central airway.
 *
 * Through the lobar bronchi: trachea, carina, both main bronchi, the early RUL
 * takeoff and the four lobar branches. That is the whole recognisable
 * inverted Y plus its first division, and it is where a reader's eye lands.
 */
const CENTRAL_GENERATIONS = 2;

const SURFACE_NEIGHBOURS = 4;
/**
 * Longest edge worth drawing, in anatomy units.
 *
 * Without a ceiling the mesh bridges across the mediastinum and ties the two
 * lungs together, which draws a surface where there is a gap.
 */
const MAX_EDGE = 0.16;
/**
 * The heart's ceiling, which is now a HOLE GUARD and not a density control.
 *
 * It was 0.055, chosen back when proximity was the meshing mechanism and a
 * short edge was the only thing stopping the mesh webbing through the organ.
 * With direction adjacency doing the work, that number instead deleted the
 * atria: they subtend a small solid angle from the cardiac centre — the base of
 * the heart is narrow, and the left atrium is tucked posteriorly behind the
 * transverse sinus — so few rays land on them and the points that do are far
 * apart. Every one of those edges was longer than 0.055 and was dropped, which
 * is why a heart whose surface measurably reached y = −0.002 was drawn stopping
 * at −0.16, and why it read as a ball with no base.
 */
const HEART_MAX_EDGE = 0.13;

/**
 * Directions swept over each lung's surface. CUT, not raised.
 *
 * The pleura is a closed surface, so it draws its back wall through its front —
 * every direction costs twice what it looks like it costs. At 640 it was 2,537
 * edges, over a third of the scene, and the two lungs read as geodesic cages
 * with the anatomy caught inside them rather than as the room the anatomy is
 * in. Direction adjacency made each quad clean enough that far fewer of them
 * describe the same surface, and a sparser weave with larger, calmer facets is
 * both quieter and more obviously a SURFACE than a dense one is.
 */
const PLEURA_DIRECTIONS = 400;
/**
 * The cardiac surface is swept finest: it is smaller and it is the subject.
 *
 * Raised with the meshing change. Angular sampling spends itself where the
 * surface is nearest the centre, so an elongated body needs more directions to
 * describe its ends than a round one of the same volume — and the ends of this
 * one are the apex and the base, which is the whole silhouette a reader knows.
 */
const HEART_DIRECTIONS = 720;

const HEART_MARCH_MAX = 0.42;

/**
 * Surface meshing by DIRECTION adjacency, not by proximity in space.
 *
 * WHAT THIS REPLACED AND WHY IT MATTERED. Both surfaces are swept as rays from
 * a centre, and were then re-meshed by joining each surface point to its
 * nearest neighbours in space. On a sphere those two are the same thing. On an
 * elongated body they are not, and the difference is what made the heart render
 * as a BALL: Fibonacci directions are uniform in ANGLE, so the parts of the
 * surface furthest from the centre — the apex, the base — receive no more
 * samples than the parts nearest it, and their points end up further apart.
 * Past the maximum edge length they stopped being joined at all, so the apex
 * and the great-vessel end survived as disconnected dust around a dense core.
 * Measured, the geometry was right the whole time: the surface reached
 * x −0.118 to 0.238 and y −0.002 to −0.460, exactly the specified borders,
 * base and apex. It simply was not connected there, and a mesh is its edges.
 *
 * Two directions that are neighbours on the sphere give surface points that are
 * neighbours ON THE SURFACE, however far apart they are in space. So the
 * triangulation is exact rather than approximate, it cannot cut through the
 * body, and it cannot starve wherever the body is longest — which is precisely
 * where the shape a reader recognises lives.
 *
 * `maxLen` survives as a guard, not as the mechanism. A ray that missed the
 * surface leaves a hole, and without a ceiling its neighbours would sew across
 * it — drawing a lid over the cardiac notch, which is the one feature the left
 * lung is defined by.
 */
function knnDirections(
  dirs: Float32Array,
  count: number,
  /** Surface point index per direction, or -1 where the ray found no crossing. */
  hit: Int32Array,
  points: MeshPoint[],
  kind: MeshKind,
  k: number,
  maxLen: number,
): MeshEdge[] {
  const seen = new Set<string>();
  const edges: MeshEdge[] = [];
  for (let i = 0; i < count; i++) {
    const pi = hit[i]!;
    if (pi < 0) continue;
    const ax = dirs[i * 3]!;
    const ay = dirs[i * 3 + 1]!;
    const az = dirs[i * 3 + 2]!;
    const near: { j: number; d: number }[] = [];
    for (let j = 0; j < count; j++) {
      if (i === j || hit[j]! < 0) continue;
      // Chord length between unit directions — monotonic in the angle between
      // them, and cheaper than an arccos we would only sort by.
      const d = Math.hypot(ax - dirs[j * 3]!, ay - dirs[j * 3 + 1]!, az - dirs[j * 3 + 2]!);
      near.push({ j, d });
    }
    near.sort((m, n) => m.d - n.d);
    for (const { j } of near.slice(0, k)) {
      const pj = hit[j]!;
      const key = pi < pj ? `${pi}:${pj}` : `${pj}:${pi}`;
      if (seen.has(key)) continue;
      const p = points[pi]!;
      const q = points[pj]!;
      const len = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
      if (len > maxLen) continue;
      seen.add(key);
      edges.push({ a: pi, b: pj, kind, depth: Math.min(1, len / maxLen) });
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
  // KEYED BY KIND as well as position, so a vessel running alongside a bronchus
  // never collapses into it. Deduplication exists to keep one system connected,
  // not to weld two systems together at the places they touch.
  const index = new Map<string, number>();
  const nodeOf = (x: number, y: number, z: number, kind: MeshKind) => {
    const k = `${kind}:${Math.round(x * 4096)},${Math.round(y * 4096)},${Math.round(z * 4096)}`;
    const hit = index.get(k);
    if (hit !== undefined) return hit;
    const id = points.length;
    points.push({ x, y, z, kind, t: 0 });
    index.set(k, id);
    return id;
  };

  const segCount = tree.segments.length / 6;
  const maxGen = Math.max(...tree.segmentGeneration);
  for (let s = 0; s < segCount; s++) {
    const o = s * 6;
    const a = nodeOf(tree.segments[o]!, tree.segments[o + 1]!, tree.segments[o + 2]!, "airway");
    const b = nodeOf(tree.segments[o + 3]!, tree.segments[o + 4]!, tree.segments[o + 5]!, "airway");
    if (a === b) continue;
    const generation = tree.segmentGeneration[s]!;
    edges.push({
      a,
      b,
      kind: generation <= CENTRAL_GENERATIONS ? "trachea" : "airway",
      depth: generation / maxGen,
    });
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

  // ── Pulmonary vessels: their own connectivity, like the airway's ─────────
  //
  // Segments come out of the generator already joined end to end, so the same
  // grid deduplication turns them into a connected graph. No nearest-neighbour
  // meshing anywhere near them: a vessel is a tube, and proximity meshing over
  // sampled tubes joins a pulmonary vein to whatever bronchus it happens to
  // pass, which is precisely the relationship the veins exist to deny.
  const vessels = generateVessels(tree, DEFAULT_SEED);
  const addVessels = (segs: VesselSegment[], kind: MeshKind) => {
    for (const s of segs) {
      const a = nodeOf(s.from.x, s.from.y, s.from.z, kind);
      const b = nodeOf(s.to.x, s.to.y, s.to.z, kind);
      if (a === b) continue;
      edges.push({ a, b, kind, depth: s.depth });
    }
  };
  addVessels(vessels.arteries, "artery");
  addVessels(vessels.veins, "vein");

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
  const heartDirs = fibonacciSphere(HEART_DIRECTIONS, 1);
  const heartHit = new Int32Array(HEART_DIRECTIONS).fill(-1);
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
    heartHit[i] = points.length;
    points.push({ x, y, z, kind: "heart", t: chamberLeftness(x, y, z) });
  }
  edges.push(
    ...knnDirections(
      heartDirs,
      HEART_DIRECTIONS,
      heartHit,
      points,
      "heart",
      SURFACE_NEIGHBOURS,
      HEART_MAX_EDGE,
    ),
  );
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
  for (const side of [-1, 1] as const) {
    const cx = side * (LUNG.medialX + LUNG.halfWidth);
    const cy = (THORAX.lungApexY + THORAX.costophrenicY) / 2;
    const dirs = fibonacciSphere(PLEURA_DIRECTIONS, 1);
    const hit = new Int32Array(PLEURA_DIRECTIONS).fill(-1);
    /**
     * THIS LUNG, not either lung.
     *
     * `insideLung` is a global predicate, so a ray leaving one lung's centre
     * medially crosses the mediastinum and re-enters the OTHER lung — and since
     * the march takes the outermost crossing, that is the point it kept. Ten
     * pleural vertices were being placed on the wrong side of the chest, and
     * each dragged an edge across the mediastinum with it.
     *
     * It was invisible while the edge ceiling was 0.11, which quietly discarded
     * every one of those edges as too long. Raising the ceiling to serve the
     * heart exposed it — a latent defect that a limit had been masking rather
     * than preventing, which is exactly what the assertion was written to
     * catch, and did.
     */
    const insideThisLung = (x: number, y: number, z: number) =>
      (side < 0 ? x < 0 : x > 0) && insideLung(x, y, z);
    for (let i = 0; i < PLEURA_DIRECTIONS; i++) {
      const dx = dirs[i * 3]!;
      const dy = dirs[i * 3 + 1]!;
      const dz = dirs[i * 3 + 2]!;
      // Outermost crossing: the cardiac notch makes a lung non-star-shaped, so
      // a ray can leave and re-enter and the first exit is not the surface.
      let inside = -1;
      for (let r = 0.02; r <= 0.62; r += 0.01) {
        if (insideThisLung(cx + dx * r, cy + dy * r, dz * r)) inside = r;
      }
      if (inside < 0) continue;
      let lo = inside;
      let hi = inside + 0.01;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        if (insideThisLung(cx + dx * mid, cy + dy * mid, dz * mid)) lo = mid;
        else hi = mid;
      }
      hit[i] = points.length;
      points.push({ x: cx + dx * lo, y: cy + dy * lo, z: dz * lo, kind: "pleura", t: 0 });
    }
    // Per side, so the two lungs can never be sewn together across the
    // mediastinum — a structural guarantee rather than one the edge ceiling
    // happens to provide.
    edges.push(
      ...knnDirections(
        dirs,
        PLEURA_DIRECTIONS,
        hit,
        points,
        "pleura",
        SURFACE_NEIGHBOURS,
        MAX_EDGE,
      ),
    );
  }

  return { points, edges, nodes };
}
