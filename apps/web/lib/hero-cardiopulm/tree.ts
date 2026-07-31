import { BRANCHING, BRONCHI, ENVELOPE, LOBAR_BRONCHI, RUL_TAKEOFF } from "./anatomy";
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
  lobe: Uint8Array;
  /** Centroid per cluster, xyz triples — the origin each cluster scales about. */
  clusterCentroids: Float32Array;
  clusterCount: number;
  count: number;
}

export const LOBES: readonly Lobe[] = ["rul", "rml", "rll", "lul", "lll"];

interface Branch {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  radius: number;
  generation: number;
  lobe: Lobe;
}

const deg = (d: number) => (d * Math.PI) / 180;

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
    from: { x: 0, y: BRONCHI.right.length * 1.6, z: 0 },
    to: carina,
    radius: 0.026,
    generation: 0,
    lobe: "rul",
  });

  // Main bronchi. Roll 180° puts the right main at negative x.
  const rightHilum = extend(carina, BRONCHI.right.angleDeg, 180, BRONCHI.right.length);
  const leftHilum = extend(carina, BRONCHI.left.angleDeg, 0, BRONCHI.left.length);
  branches.push({ from: carina, to: rightHilum, radius: 0.019, generation: 1, lobe: "rll" });
  branches.push({ from: carina, to: leftHilum, radius: 0.016, generation: 1, lobe: "lll" });

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
    radius: 0.012,
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
      to: extend(hilum, l.polarDeg, l.rollDeg, BRONCHI.left.length * 0.62),
      radius: 0.011,
      generation: 2,
      lobe: l.lobe as Lobe,
    });
  }

  // Recursive bifurcation below the lobar bronchi.
  const frontier = branches.filter((b) => b.generation === 2);
  let current = frontier;
  for (let g = 3; g <= generations; g++) {
    const next: Branch[] = [];
    for (const parent of current) {
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

      for (const sign of [-1, 1]) {
        const div = jitter(rng, BRANCHING.divergenceDeg, BRANCHING.divergenceJitterDeg) * sign;
        const childLen = len * jitter(rng, BRANCHING.lengthDecay, BRANCHING.lengthJitter);
        const to = extend(parent.to, axisDeg + div, roll + (sign > 0 ? 0 : 180), childLen);

        // Cardiac exclusion — the heart gets a real cavity, not a thicket.
        if (cardiacField(to.x, to.y, to.z) < 0) continue;

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
  const lobeTag: number[] = [];
  const centroids: number[] = [];
  let cid = 0;

  const isRight = (l: Lobe) => l.startsWith("r");
  const terminals = branches.filter((b) => b.generation === generations || current.includes(b));

  /**
   * Budget is split BY SIDE against the documented right:left ratio, rather
   * than left to fall out of however many branches each side happens to have.
   *
   * The right lung is genuinely larger — the heart displaces the left — and the
   * anatomy file pins that at 1.18. Letting branch counts decide it produced
   * 3.14, because the right side carries an extra explicit lobar bronchus. A
   * documented ratio should be allocated, not hoped for.
   */
  const ratio = ENVELOPE.rightLeftParticleRatio;
  const sideBudgets = {
    right: Math.round((budget * ratio) / (1 + ratio)),
    left: budget - Math.round((budget * ratio) / (1 + ratio)),
  };

  for (const side of ["right", "left"] as const) {
    const want = sideBudgets[side];
    const sideTerminals = terminals.filter((b) => isRight(b.lobe) === (side === "right"));
    const sideBranches = branches.filter((b) => isRight(b.lobe) === (side === "right"));

    // Clusters get the larger share: they are what visibly breathes.
    const clusterWant = Math.round(want * 0.55);
    const perCluster = Math.max(3, Math.floor(clusterWant / Math.max(1, sideTerminals.length)));

    let placed = 0;
    for (const t of sideTerminals) {
      if (cid >= 254 || placed >= clusterWant) break;
      const sphere = fibonacciSphere(perCluster, t.radius * BRANCHING.clusterRadiusFactor);
      let kept = 0;
      for (let i = 0; i < perCluster && placed < clusterWant; i++) {
        const x = t.to.x + sphere[i * 3]!;
        const y = t.to.y + sphere[i * 3 + 1]!;
        const z = t.to.z + sphere[i * 3 + 2]!;
        if (cardiacField(x, y, z) < 0) continue;
        pos.push(x, y, z);
        isCluster.push(1);
        clusterId.push(cid);
        lobeTag.push(LOBES.indexOf(t.lobe));
        kept++;
        placed++;
      }
      if (kept > 0) {
        centroids.push(t.to.x, t.to.y, t.to.z);
        cid++;
      }
    }

    // Branch dust fills the side's remaining budget. Sampled in passes so the
    // proximal airway stays visible rather than being swamped by the periphery.
    const dustWant = want - placed;
    let dust = 0;
    for (let pass = 1; pass <= 8 && dust < dustWant; pass++) {
      for (const b of sideBranches) {
        if (dust >= dustWant) break;
        const t = (pass - 0.5) / 8;
        const x = b.from.x + (b.to.x - b.from.x) * t;
        const y = b.from.y + (b.to.y - b.from.y) * t;
        const z = b.from.z + (b.to.z - b.from.z) * t;
        if (cardiacField(x, y, z) < 0) continue;
        pos.push(x, y, z);
        isCluster.push(0);
        clusterId.push(255);
        lobeTag.push(LOBES.indexOf(b.lobe));
        dust++;
      }
    }
  }

  return {
    positions: new Float32Array(pos),
    isCluster: new Uint8Array(isCluster),
    clusterId: new Uint8Array(clusterId),
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
