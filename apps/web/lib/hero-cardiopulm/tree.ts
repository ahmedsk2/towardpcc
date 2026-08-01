import {
  AIRWAY_RADII,
  BRANCHING,
  CENTRAL_AIRWAY_SHARE,
  BRONCHI,
  COLONISATION,
  CLUSTER_SHARE,
  EXTRA_GENERATIONS_RIGHT,
  LENGTH_DECAY_BY_SIDE,
  TRACHEA_LENGTH_FACTOR,
  LOBAR_BRONCHI,
  LOBAR_LENGTH_FACTOR,
  LOBE_SHARES,
  MIN_STUB_FRACTION,
  RUL_TAKEOFF,
} from "./anatomy";
import { insideLung, lobeAt } from "./envelope";
import { cardiacField } from "./heart";
import { fibonacciSphere, jitter, mulberry32 } from "./rng";

/**
 * The airway tree. Trachea → carina → asymmetric main bronchi → lobar bronchi →
 * recursive bifurcation → alveolar clusters.
 *
 * COORDINATE REMINDER: +x is the viewer's RIGHT = the patient's LEFT. The RIGHT
 * main bronchus therefore has NEGATIVE x. See anatomy.ts.
 *
 * TWO THINGS NOBODY SHOULD "CORRECT" (repeated here because this is the file
 * where someone would be tempted):
 *
 * 1. The right main bronchus is SHORTER, WIDER and MORE VERTICAL than the left.
 *    The asymmetry is real and load-bearing.
 * 2. These are PEDIATRIC angles, deliberately less asymmetric than adult values
 *    (~25°/45°). In infants the two are nearly equal, which is why aspirated
 *    foreign bodies do not favour the right in young children the way they do
 *    in adults. Do not tune toward adult numbers.
 *
 * The heart is passed in as an EXCLUSION REGION: any branch or cluster point
 * landing inside the cardiac hull is culled at generation time, so the heart
 * sits in a real cavity rather than inside a thicket.
 */

/** Which lobe a particle belongs to. Right has three, left has two. */
export type Lobe = "rul" | "rml" | "rll" | "lul" | "lll";

export interface TreeGeometry {
  positions: Float32Array;
  /** 0 = branch dust, 1 = alveolar cluster (clusters swell and glow on inhale). */
  isCluster: Uint8Array;
  /** Index of the owning cluster, or 255 for branch dust. Clusters scale about their own centroid. */
  clusterId: Uint8Array;
  /**
   * 1 for the mediastinal airway — trachea, carina, main bronchi.
   *
   * Exposed so the pleural-containment assertion can be exact rather than
   * lenient: these are legitimately outside the lungs, everything else must be
   * inside, and without the flag the test would have to tolerate "a few"
   * escapees and would stop catching real leaks.
   */
  central: Uint8Array;
  lobe: Uint8Array;
  /** Centroid per cluster, xyz triples — the origin each cluster scales about. */
  clusterCentroids: Float32Array;
  clusterCount: number;
  count: number;
  /**
   * The branch segments themselves, as xyzxyz sextuples in anatomy units.
   *
   * A bronchial tree is a GRAPH, and drawing it as one is the difference
   * between an airway and a scatter of dots. Nearest-neighbour meshing over the
   * sampled points cannot recover this: it links whatever happens to be close,
   * so a distal twig of the right lower lobe joins a twig of the middle lobe
   * that never shared a bronchus with it. The connectivity is already known at
   * generation time and is simply carried out.
   */
  segments: Float32Array;
  /** Generation per segment, so distal branches can be drawn finer. */
  segmentGeneration: Uint8Array;
}

export const CENTRAL_AIRWAY_GENERATION = 1;

export const LOBES: readonly Lobe[] = ["rul", "rml", "rll", "lul", "lll"];

interface Branch {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  radius: number;
  generation: number;
  lobe: Lobe;
}

/**
 * Generations at or below which an airway is MEDIASTINAL, not intrapulmonary.
 *
 * The trachea, the carina and the main bronchi run in the mediastinum, between
 * the lungs — that is what "between the lungs" means. Pleural containment must
 * not be applied to them, and applying it deleted them: the rendered scene had
 * alveolar clusters glowing at the lung apices with nothing joining them to
 * anything, because the one part of an airway everybody recognises, the
 * inverted Y of trachea into main bronchi, had been culled as "outside the
 * lung". It is outside the lung. It is still the airway.
 */
const MEDIASTINAL_GENERATION = CENTRAL_AIRWAY_GENERATION;

const deg = (d: number) => (d * Math.PI) / 180;

/** Right-lobe test. Module scope so the recursion can use it before sampling. */
const isRight = (l: Lobe) => l.startsWith("r");

/**
 * A branch of `length` leaving `from`.
 *
 * `polarDeg` is measured from the DOWNWARD vertical: 0° straight down, 90°
 * horizontal, 180° straight up. `rollDeg` is the azimuth, 0° toward +x (the
 * patient's left), 180° toward −x.
 *
 * Polar-from-down rather than a signed "angle from vertical", because the
 * signed form is ambiguous about which way is up and was implemented backwards
 * once: cos() stays positive either side of zero, so a negative angle still
 * drove the branch downward — sending both upper lobes into the mediastinum,
 * where the cardiac exclusion culled them. This form cannot express that
 * mistake.
 */
function extend(
  from: { x: number; y: number; z: number },
  polarDeg: number,
  rollDeg: number,
  length: number,
) {
  const a = deg(polarDeg);
  const r = deg(rollDeg);
  const lateral = Math.sin(a) * length;
  return {
    x: from.x + lateral * Math.cos(r),
    y: from.y - Math.cos(a) * length,
    z: from.z + lateral * Math.sin(r),
  };
}

export function generateTree(budget: number, generations: number, seed: number): TreeGeometry {
  const rng = mulberry32(seed);
  const carina = { x: 0, y: 0, z: 0 };
  const branches: Branch[] = [];

  // Generation 0 — the trachea, vertical, descending to the carina.
  branches.push({
    from: { x: 0, y: BRONCHI.right.length * TRACHEA_LENGTH_FACTOR, z: 0 },
    to: carina,
    radius: AIRWAY_RADII.trachea,
    generation: 0,
    lobe: "rul",
  });

  // Main bronchi. Roll 180° puts the right main at negative x.
  const rightHilum = extend(carina, BRONCHI.right.angleDeg, 180, BRONCHI.right.length);
  const leftHilum = extend(carina, BRONCHI.left.angleDeg, 0, BRONCHI.left.length);
  // The right upper lobe bronchus arises very early — the most recognisable
  // feature of the right airway, and the only lobar bronchus above the
  // pulmonary artery. Explicit, not left to the generic recursion.
  const rulOrigin = {
    x: carina.x + (rightHilum.x - carina.x) * RUL_TAKEOFF.alongRightMain,
    y: carina.y + (rightHilum.y - carina.y) * RUL_TAKEOFF.alongRightMain,
    z: 0,
  };

  // The right main bronchus is SPLIT AT THAT TAKEOFF: carina to takeoff, then
  // takeoff to hilum.
  //
  // Not bookkeeping. The RUL leaves from a point ALONG the right main, and
  // unless that point is also an endpoint of the segments either side of it,
  // nothing shares it — the entire right upper lobe then hangs off a node no
  // other branch touches. Measured: a 259-node component floating free of a
  // 924-node tree, which on screen is a lobe of airways attached to nothing.
  branches.push({
    from: carina,
    to: rulOrigin,
    radius: AIRWAY_RADII.rightMain,
    generation: 1,
    lobe: "rll",
  });
  branches.push({
    from: rulOrigin,
    to: rightHilum,
    radius: AIRWAY_RADII.rightMain,
    generation: 1,
    lobe: "rll",
  });
  branches.push({
    from: carina,
    to: leftHilum,
    radius: AIRWAY_RADII.leftMain,
    generation: 1,
    lobe: "lll",
  });

  branches.push({
    from: rulOrigin,
    to: extend(rulOrigin, RUL_TAKEOFF.angleDeg, 180, RUL_TAKEOFF.length),
    radius: AIRWAY_RADII.rul,
    generation: 2,
    lobe: "rul",
  });

  // Lobar bronchi. Right gives middle + lower (the upper already left early as
  // the RUL); left gives upper — which includes the lingula — plus lower.
  //
  // UPPER LOBES RUN SUPEROLATERALLY, downward-angled lobar bronchi do not.
  // Sending the left upper lobe down at a shallow angle drives it straight
  // through the left ventricle, where the cardiac exclusion then culls the
  // whole lobe: the first version of this produced two lobar groups on the left
  // and zero left-upper particles. The lung sits above and lateral to the
  // heart, and the bronchus has to be aimed that way.
  for (const l of LOBAR_BRONCHI) {
    const hilum = l.lobe.startsWith("r") ? rightHilum : leftHilum;
    branches.push({
      from: hilum,
      to: extend(hilum, l.polarDeg, l.rollDeg, BRONCHI.left.length * LOBAR_LENGTH_FACTOR),
      radius: AIRWAY_RADII.lobar,
      generation: 2,
      lobe: l.lobe as Lobe,
    });
  }

  // ── Space colonisation ──────────────────────────────────────────────────
  // The lobar bronchi are the trunk; everything distal grows into its lobe.
  // See COLONISATION in anatomy.ts for why this replaced a steered recursion.
  const C = COLONISATION;

  /** Attractors, scattered through each lobe and owned by it alone. */
  const attractors: { x: number; y: number; z: number; lobe: Lobe; alive: boolean }[] = [];
  for (const lobe of LOBES) {
    let placed = 0;
    let guard = 0;
    while (placed < C.attractorsPerLobe && guard++ < C.attractorsPerLobe * 300) {
      const x = (rng() * 2 - 1) * C.sampleHalfX;
      const y = C.sampleMinY + rng() * C.sampleSpanY;
      const z = (rng() * 2 - 1) * C.sampleHalfZ;
      if (lobeAt(x, y, z) !== lobe) continue;
      if (cardiacField(x, y, z) < 0) continue;
      attractors.push({ x, y, z, lobe, alive: true });
      placed++;
    }
  }

  interface Node {
    x: number;
    y: number;
    z: number;
    dx: number;
    dy: number;
    dz: number;
    lobe: Lobe;
    generation: number;
    radius: number;
    parent: number;
    grew: boolean;
  }

  const nodes: Node[] = [];
  for (const b of branches.filter((br) => br.generation === 2)) {
    const dx = b.to.x - b.from.x;
    const dy = b.to.y - b.from.y;
    const dz = b.to.z - b.from.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    nodes.push({
      x: b.to.x,
      y: b.to.y,
      z: b.to.z,
      dx: dx / len,
      dy: dy / len,
      dz: dz / len,
      lobe: b.lobe,
      generation: 2,
      radius: b.radius,
      parent: -1,
      grew: false,
    });
  }

  for (let iter = 0; iter < C.maxIterations; iter++) {
    // Each live attractor votes for its nearest node within the influence
    // radius. A node pulled from two directions bifurcates; one with no votes
    // has filled its neighbourhood and stops.
    const pull = new Map<number, { x: number; y: number; z: number; n: number }>();
    let anyAlive = false;
    for (const a of attractors) {
      if (!a.alive) continue;
      anyAlive = true;
      let best = -1;
      let bestD: number = C.influenceRadius;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        if (n.lobe !== a.lobe) continue;
        const d = Math.hypot(n.x - a.x, n.y - a.y, n.z - a.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) continue;
      const n = nodes[best]!;
      const len = Math.hypot(a.x - n.x, a.y - n.y, a.z - n.z) || 1;
      const acc = pull.get(best) ?? { x: 0, y: 0, z: 0, n: 0 };
      acc.x += (a.x - n.x) / len;
      acc.y += (a.y - n.y) / len;
      acc.z += (a.z - n.z) / len;
      acc.n++;
      pull.set(best, acc);
    }
    if (!anyAlive || pull.size === 0) break;

    const grown: Node[] = [];
    for (const [i, acc] of pull) {
      const n = nodes[i]!;
      // Blend the attractor direction with the parent's heading; a branch that
      // can turn arbitrarily sharply reads as a kinked wire, not an airway.
      let dx = acc.x / acc.n + n.dx * C.parentInertia;
      let dy = acc.y / acc.n + n.dy * C.parentInertia;
      let dz = acc.z / acc.n + n.dz * C.parentInertia;
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-6) continue;
      dx /= len;
      dy /= len;
      dz /= len;

      // Try a full step, then progressively shorter ones. A tip that stops the
      // moment a whole step would cross the pleura halts a full step short of
      // the surface everywhere, and the lungs read as under-filled at the edge.
      let to: { x: number; y: number; z: number } | null = null;
      for (const f of [1, ...C.stepFallbacks]) {
        const c = {
          x: n.x + dx * C.stepLength * f,
          y: n.y + dy * C.stepLength * f,
          z: n.z + dz * C.stepLength * f,
        };
        if (cardiacField(c.x, c.y, c.z) < 0) continue;
        if (!insideLung(c.x, c.y, c.z)) continue;
        to = c;
        break;
      }
      if (!to) continue;

      const generation = n.generation + 1;
      branches.push({
        from: { x: n.x, y: n.y, z: n.z },
        to,
        radius: n.radius * BRANCHING.radiusDecay,
        generation,
        lobe: n.lobe,
      });
      grown.push({
        ...to,
        dx,
        dy,
        dz,
        lobe: n.lobe,
        generation,
        radius: n.radius * BRANCHING.radiusDecay,
        parent: i,
        grew: false,
      });
      n.grew = true;
    }
    if (grown.length === 0) break;
    nodes.push(...grown);

    for (const a of attractors) {
      if (!a.alive) continue;
      for (const n of grown) {
        if (n.lobe !== a.lobe) continue;
        if (Math.hypot(n.x - a.x, n.y - a.y, n.z - a.z) < C.killRadius) {
          a.alive = false;
          break;
        }
      }
    }
  }

  // Tips are the terminals: nodes that never grew are where the tree ended.
  const terminalPoints = nodes.filter((n) => !n.grew);
  const deepest = Math.max(...branches.map((b) => b.generation));

  // ── Sample ────────────────────────────────────────────────────────────────
  const pos: number[] = [];
  const isCluster: number[] = [];
  const clusterId: number[] = [];
  const central: number[] = [];
  const lobeTag: number[] = [];
  const centroids: number[] = [];
  let cid = 0;

  /**
   * Budget is allocated PER LOBE against LOBE_SHARES, and allocated AFTER the
   * cardiac cull rather than before it.
   *
   * Both halves of that matter. Allocating by side fixed R:L and still let the
   * right lower lobe — the largest lobe of the lung — ship as the thinnest
   * object in the scene, because within a side the split fell out of branch
   * counts. And allocating before the cull means a lobe that loses points to
   * the heart stays thin: the left upper lobe borders the cardiac notch and
   * loses the most, which is exactly the lobe least able to afford it. Topping
   * up to the share after culling is what makes the documented proportion the
   * thing that actually ships.
   */
  // ── The mediastinal airway, allocated off the top ───────────────────────
  // Sampled evenly along its length rather than by the pass loop, so the
  // trachea reads as a continuous run instead of a dotted hint.
  const centralBranches = branches.filter((b) => b.generation <= CENTRAL_AIRWAY_GENERATION);
  const centralWant = Math.round(budget * CENTRAL_AIRWAY_SHARE);
  const perCentral = Math.max(2, Math.ceil(centralWant / Math.max(1, centralBranches.length)));
  let centralPlaced = 0;
  for (const b of centralBranches) {
    for (let k = 0; k < perCentral && centralPlaced < centralWant; k++) {
      const t = (k + 0.5) / perCentral;
      const x = b.from.x + (b.to.x - b.from.x) * t;
      const y = b.from.y + (b.to.y - b.from.y) * t;
      const z = b.from.z + (b.to.z - b.from.z) * t;
      if (cardiacField(x, y, z) < 0) continue;
      pos.push(x, y, z);
      isCluster.push(0);
      clusterId.push(255);
      central.push(1);
      lobeTag.push(LOBES.indexOf(b.lobe));
      centralPlaced++;
    }
  }

  const lobeBudget = budget - centralPlaced;
  let allocated = 0;
  for (let li = 0; li < LOBES.length; li++) {
    const lobe = LOBES[li]!;
    // The last lobe absorbs the rounding remainder, so five rounded shares sum
    // to the budget rather than one over it.
    const want =
      li === LOBES.length - 1 ? lobeBudget - allocated : Math.round(lobeBudget * LOBE_SHARES[lobe]);
    allocated += want;
    const lobeTerminals = terminalPoints.filter((t) => t.lobe === lobe);
    const lobeBranches = branches.filter((b) => b.lobe === lobe);
    if (lobeBranches.length === 0) continue;

    // Clusters get the larger share: they are what visibly breathes.
    const clusterWant = Math.round(want * CLUSTER_SHARE);
    let placed = 0;

    for (const t of lobeTerminals) {
      if (cid >= 254 || placed >= clusterWant) break;
      const per = Math.max(3, Math.ceil(clusterWant / Math.max(1, lobeTerminals.length)));
      const sphere = fibonacciSphere(per, t.radius * BRANCHING.clusterRadiusFactor);
      let kept = 0;
      for (let i = 0; i < per && placed < clusterWant; i++) {
        const x = t.x + sphere[i * 3]!;
        const y = t.y + sphere[i * 3 + 1]!;
        const z = t.z + sphere[i * 3 + 2]!;
        if (cardiacField(x, y, z) < 0) continue;
        if (!insideLung(x, y, z)) continue;
        pos.push(x, y, z);
        isCluster.push(1);
        clusterId.push(cid);
        central.push(0);
        lobeTag.push(LOBES.indexOf(lobe));
        kept++;
        placed++;
      }
      if (kept > 0) {
        centroids.push(t.x, t.y, t.z);
        cid++;
      }
    }

    // Branch dust fills the lobe's remaining budget. Structured passes first, so
    // the proximal airway stays visible rather than being swamped by the
    // periphery; then jittered top-up, so a lobe that lost points to the
    // cardiac cull still reaches its share instead of silently shipping thin.
    let dust = 0;
    const dustWant = want - placed;
    for (let pass = 1; pass <= 8 && dust < dustWant; pass++) {
      for (const b of lobeBranches) {
        if (dust >= dustWant) break;
        const t = (pass - 0.5) / 8;
        const x = b.from.x + (b.to.x - b.from.x) * t;
        const y = b.from.y + (b.to.y - b.from.y) * t;
        const z = b.from.z + (b.to.z - b.from.z) * t;
        if (cardiacField(x, y, z) < 0) continue;
        if (b.generation > MEDIASTINAL_GENERATION && !insideLung(x, y, z)) continue;
        pos.push(x, y, z);
        isCluster.push(0);
        clusterId.push(255);
        central.push(b.generation <= CENTRAL_AIRWAY_GENERATION ? 1 : 0);
        lobeTag.push(LOBES.indexOf(lobe));
        dust++;
      }
    }
    let guard = 0;
    while (dust < dustWant && guard++ < dustWant * 200) {
      const b = lobeBranches[Math.floor(rng() * lobeBranches.length)]!;
      const t = rng();
      const x = b.from.x + (b.to.x - b.from.x) * t;
      const y = b.from.y + (b.to.y - b.from.y) * t;
      const z = b.from.z + (b.to.z - b.from.z) * t;
      if (cardiacField(x, y, z) < 0) continue;
      if (b.generation > MEDIASTINAL_GENERATION && !insideLung(x, y, z)) continue;
      pos.push(x, y, z);
      isCluster.push(0);
      clusterId.push(255);
      central.push(b.generation <= CENTRAL_AIRWAY_GENERATION ? 1 : 0);
      lobeTag.push(LOBES.indexOf(lobe));
      dust++;
    }
  }

  const segments: number[] = [];
  const segmentGeneration: number[] = [];
  for (const b of branches) {
    segments.push(b.from.x, b.from.y, b.from.z, b.to.x, b.to.y, b.to.z);
    segmentGeneration.push(Math.min(255, b.generation));
  }

  return {
    segments: new Float32Array(segments),
    segmentGeneration: new Uint8Array(segmentGeneration),
    positions: new Float32Array(pos),
    isCluster: new Uint8Array(isCluster),
    clusterId: new Uint8Array(clusterId),
    central: new Uint8Array(central),
    lobe: new Uint8Array(lobeTag),
    clusterCentroids: new Float32Array(centroids),
    clusterCount: cid,
    count: isCluster.length,
  };
}

/** Main-bronchus facts, exposed so the assertion suite tests the real geometry. */
export const MAIN_BRONCHI = {
  right: { angleDeg: BRONCHI.right.angleDeg, length: BRONCHI.right.length },
  left: { angleDeg: BRONCHI.left.angleDeg, length: BRONCHI.left.length },
  subcarinalAngleDeg: BRONCHI.right.angleDeg + BRONCHI.left.angleDeg,
} as const;
