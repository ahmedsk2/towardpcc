import {
  AIRWAY_RADII,
  BRANCHING,
  CENTRAL_AIRWAY_SHARE,
  BRONCHI,
  CLUSTER_SHARE,
  EXTRA_GENERATIONS_RIGHT,
  LENGTH_DECAY_BY_SIDE,
  LOBE_TERRITORY,
  TERRITORY_PULL,
  TRACHEA_LENGTH_FACTOR,
  LOBAR_BRONCHI,
  LOBAR_LENGTH_FACTOR,
  LOBE_SHARES,
  MIN_STUB_FRACTION,
  RUL_TAKEOFF,
} from "./anatomy";
import { insideLung } from "./envelope";
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
  branches.push({
    from: carina,
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

  // The right upper lobe bronchus arises very early — the most recognisable
  // feature of the right airway, and the only lobar bronchus above the
  // pulmonary artery. Explicit, not left to the generic recursion.
  const rulOrigin = {
    x: carina.x + (rightHilum.x - carina.x) * RUL_TAKEOFF.alongRightMain,
    y: carina.y + (rightHilum.y - carina.y) * RUL_TAKEOFF.alongRightMain,
    z: 0,
  };
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

  // Recursive bifurcation below the lobar bronchi.
  const frontier = branches.filter((b) => b.generation === 2);
  let current = frontier;
  for (let g = 3; g <= generations + EXTRA_GENERATIONS_RIGHT; g++) {
    const next: Branch[] = [];
    for (const parent of current) {
      // Past the nominal depth only the right tree keeps dividing.
      if (g > generations && !isRight(parent.lobe)) continue;
      // Parent direction as polar-from-down, so children inherit its aim.
      const dx = parent.to.x - parent.from.x;
      const dy = parent.to.y - parent.from.y;
      const dz = parent.to.z - parent.from.z;
      const len0 = Math.hypot(dx, dy, dz) || 1;
      const axisDeg = (Math.acos(Math.max(-1, Math.min(1, -dy / len0))) * 180) / Math.PI;
      const parentRoll = (Math.atan2(dz, dx) * 180) / Math.PI;
      const roll = jitter(rng, parentRoll + g * BRANCHING.rollDeg, BRANCHING.rollJitterDeg);
      const len = Math.hypot(
        parent.to.x - parent.from.x,
        parent.to.y - parent.from.y,
        parent.to.z - parent.from.z,
      );

      // Per-side decay: the right hilum sits far medial of the right pleura, so
      // a shared decay leaves the larger lung hollow. See LENGTH_DECAY_BY_SIDE.
      const decay = LENGTH_DECAY_BY_SIDE[isRight(parent.lobe) ? "right" : "left"];

      for (const sign of [-1, 1]) {
        const div = jitter(rng, BRANCHING.divergenceDeg, BRANCHING.divergenceJitterDeg) * sign;
        const childLen = len * jitter(rng, decay, BRANCHING.lengthJitter);
        const free = extend(parent.to, axisDeg + div, roll + (sign > 0 ? 0 : 180), childLen);

        // Steer along the lobe's growth axis. The branch keeps its length; only
        // its aim is blended, so divergence and roll still shape the tree.
        const T = LOBE_TERRITORY[parent.lobe];
        const tx = T.x;
        const ty = T.y;
        const tz = T.z;
        const tl = Math.hypot(tx, ty, tz) || 1;
        const w = TERRITORY_PULL;
        let ax = (free.x - parent.to.x) * (1 - w) + (tx / tl) * childLen * w;
        let ay = (free.y - parent.to.y) * (1 - w) + (ty / tl) * childLen * w;
        let az = (free.z - parent.to.z) * (1 - w) + (tz / tl) * childLen * w;
        const al = Math.hypot(ax, ay, az) || 1;
        ax = (ax / al) * childLen;
        ay = (ay / al) * childLen;
        az = (az / al) * childLen;
        const to = { x: parent.to.x + ax, y: parent.to.y + ay, z: parent.to.z + az };

        // Cardiac exclusion — the heart gets a real cavity, not a thicket.
        if (cardiacField(to.x, to.y, to.z) < 0) continue;

        // Pleural containment. An airway cannot leave the lung — but it does
        // not vanish at the surface either, so the branch is SHORTENED to the
        // boundary rather than discarded. Discarding was measurably worse than
        // the defect: culling any tip that crossed the pleura removed whole
        // deep generations, so the desktop preset (which runs deeper) ended up
        // filling LESS of its lung than the narrow one, 0.83 against 0.88.
        // Clamping keeps the branch, ends it against the pleura where a real
        // airway ends, and guarantees containment at the same time.
        if (!insideLung(to.x, to.y, to.z)) {
          let lo = 0;
          let hi = 1;
          for (let it = 0; it < 12; it++) {
            const mid = (lo + hi) / 2;
            if (insideLung(parent.to.x + ax * mid, parent.to.y + ay * mid, parent.to.z + az * mid))
              lo = mid;
            else hi = mid;
          }
          // A stub shorter than a fifth of its intended length is a branch that
          // was already at the surface; drop it rather than ship a nub.
          if (lo < MIN_STUB_FRACTION) continue;
          to.x = parent.to.x + ax * lo;
          to.y = parent.to.y + ay * lo;
          to.z = parent.to.z + az * lo;
        }

        next.push({
          from: parent.to,
          to,
          radius: parent.radius * BRANCHING.radiusDecay,
          generation: g,
          lobe: parent.lobe,
        });
      }
    }
    branches.push(...next);
    current = next;
    if (current.length === 0) break;
  }

  // ── Sample ────────────────────────────────────────────────────────────────
  const pos: number[] = [];
  const isCluster: number[] = [];
  const clusterId: number[] = [];
  const central: number[] = [];
  const lobeTag: number[] = [];
  const centroids: number[] = [];
  let cid = 0;

  const deepest = generations + EXTRA_GENERATIONS_RIGHT;
  const terminals = branches.filter(
    (b) => current.includes(b) || b.generation === (isRight(b.lobe) ? deepest : generations),
  );

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
    const lobeTerminals = terminals.filter((b) => b.lobe === lobe);
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
        const x = t.to.x + sphere[i * 3]!;
        const y = t.to.y + sphere[i * 3 + 1]!;
        const z = t.to.z + sphere[i * 3 + 2]!;
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
        centroids.push(t.to.x, t.to.y, t.to.z);
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

  return {
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
