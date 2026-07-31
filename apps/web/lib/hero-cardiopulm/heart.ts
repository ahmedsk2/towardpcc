import { CHAMBERS, CHAMBER_BLEND_K, HEART } from "./anatomy";
import { mulberry32 } from "./rng";

/**
 * The heart: four blended ellipsoids, gestured rather than modelled.
 *
 * COORDINATE REMINDER: +x is the viewer's RIGHT = the patient's LEFT. The apex
 * having positive x is correct. See anatomy.ts.
 *
 * Two properties carry the whole design:
 *
 * 1. DEPTH ORDERING. RV is the most anterior chamber, LA the most posterior,
 *    and the LA roof touches the carina from below. This is what lets bronchi
 *    pass convincingly behind the RV and above the LA — and in CSS it comes
 *    free, because `preserve-3d` sorts per element in the compositor.
 *
 * 2. HULL BIAS. Sampling is pushed toward the surface of the union, so the form
 *    reads as a luminous shell rather than a solid blob. This is the single
 *    thing keeping it diagrammatic instead of fleshy — and "fleshy" is the
 *    failure mode that would make crimson read as gore rather than life.
 */
export interface HeartGeometry {
  /** xyz triples, normalised units, origin at the carina. */
  positions: Float32Array;
  /** 0 = right heart (deep, dim core) → 1 = left heart (bright, warm core). */
  tint: Float32Array;
  /** Index into CHAMBERS, for the ventricle-only perfusion scale. */
  chamber: Uint8Array;
  count: number;
}

/** Normalised ellipsoid field: <1 inside, 1 on the surface, >1 outside. */
function ellipsoidField(
  x: number,
  y: number,
  z: number,
  c: { x: number; y: number; z: number },
  r: { x: number; y: number; z: number },
): number {
  const dx = (x - c.x) / r.x;
  const dy = (y - c.y) / r.y;
  const dz = (z - c.z) / r.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Polynomial smooth-min — stable where the exponential form underflows. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

/** Signed distance to the blended union. Negative inside. */
export function cardiacField(x: number, y: number, z: number): number {
  let d = ellipsoidField(x, y, z, CHAMBERS[0].centroid, CHAMBERS[0].radii) - 1;
  for (let i = 1; i < CHAMBERS.length; i++) {
    const c = CHAMBERS[i]!;
    d = smin(d, ellipsoidField(x, y, z, c.centroid, c.radii) - 1, CHAMBER_BLEND_K);
  }
  return d;
}

/**
 * The lateral shear that carries the left ventricle's inferior pole out to the
 * specified apex.
 *
 * DERIVED, not typed: a bare ellipsoid's lowest point sits directly under its
 * centroid, which would put the apex at the LV's x rather than at
 * HEART.apex.x. Shearing the LV so its bottom reaches the documented apex is
 * what makes the silhouette's inferolateral point real instead of asserted.
 */
const LV = CHAMBERS[2];
const APEX_SHEAR = (HEART.apex.x - LV.centroid.x) / (LV.centroid.y - (LV.centroid.y - LV.radii.y));

/**
 * Septal blend width, as a fraction of cardiac width. The right/left tint
 * crosses over this span so there is no hard seam down the middle — a visible
 * line would read as two hearts rather than one.
 */
const SEPTAL_BLEND = 0.15;

export function generateHeart(budget: number, seed: number): HeartGeometry {
  const rng = mulberry32(seed);
  const positions = new Float32Array(budget * 3);
  const tint = new Float32Array(budget);
  const chamber = new Uint8Array(budget);

  const septumX = HEART.rightBorderX + HEART.width * (1 - HEART.fractionLeftOfMidline);
  const blendHalf = (HEART.width * SEPTAL_BLEND) / 2;

  let written = 0;

  for (let ci = 0; ci < CHAMBERS.length; ci++) {
    const c = CHAMBERS[ci]!;
    // Exact share allocation; the last chamber absorbs the rounding remainder
    // so the total lands on budget rather than near it.
    const want = ci === CHAMBERS.length - 1 ? budget - written : Math.round(budget * c.share);

    let placed = 0;
    let guard = 0;
    const maxTries = want * 400 + 1000;

    while (placed < want && guard++ < maxTries) {
      // The box is expanded by the blend constant, deliberately.
      //
      // A soft-min union bulges BETWEEN its ellipsoids — that bulge is what
      // makes four balls read as one organ. Sampling each chamber's own bounding
      // box exactly would never populate those bridges, leaving visible seams
      // and, measurably, too little mass across the septum: the RV↔LV bridge
      // sits at positive x, and without it the heart failed the "two thirds of
      // cardiac particles lie to the patient's left" assertion by half a point.
      // The union field below still rejects anything genuinely outside.
      const k = CHAMBER_BLEND_K;
      const x = c.centroid.x + (rng() * 2 - 1) * (c.radii.x + k);
      const y = c.centroid.y + (rng() * 2 - 1) * (c.radii.y + k);
      const z = c.centroid.z + (rng() * 2 - 1) * (c.radii.z + k);

      const d = cardiacField(x, y, z);
      if (d > 0) continue; // outside the blended union

      // Hull bias: accept readily near the surface, rarely deep inside. This
      // is what makes a shell instead of a blob.
      const depth = -d; // 0 at surface, larger toward the core
      if (rng() > Math.exp(-depth * 26)) continue;

      let px = x;
      if (c.id === "lv") px += APEX_SHEAR * (c.centroid.y - y);

      const i = written * 3;
      positions[i] = px;
      positions[i + 1] = y;
      positions[i + 2] = z;

      // Tint by position across the septum rather than by chamber id, so the
      // blended region between RV and LV reads continuously.
      tint[written] = Math.max(0, Math.min(1, (px - (septumX - blendHalf)) / (2 * blendHalf)));
      chamber[written] = ci;

      written++;
      placed++;
    }
  }

  return {
    positions: positions.subarray(0, written * 3),
    tint: tint.subarray(0, written),
    chamber: chamber.subarray(0, written),
    count: written,
  };
}
