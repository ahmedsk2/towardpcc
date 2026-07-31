import {
  APEX_TAPER_POWER,
  CHAMBERS,
  CHAMBER_BLEND_K,
  HEART,
  HEART_HULL_BIAS,
  HULL_SCAN,
  MEMBERSHIP_SOFTNESS,
  THORAX,
} from "./anatomy";
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
 * centroid, which would put the apex at the LV's x rather than at HEART.apex.x.
 *
 * This was a pure lateral SHEAR and is now a TAPER, because a shear translates
 * every horizontal slice without narrowing it — it moves the LV sideways and
 * leaves it as wide at the bottom as at the base. A ventricle is a cone, and
 * the apex is its tip. The delivered apex therefore landed at x = 0.122 against
 * a specified 0.149: the theoretical bottom pole did map to the apex, but no
 * sampled particle sits exactly on a pole, and the ones near it were medial of
 * the centroid. Widening the LV radius per review item 0 did not move it.
 *
 * Interpolating toward the apex as depth^2 makes the inferior heart converge on
 * a point, so the tip is where the particles actually are rather than where an
 * unsampled extremum would have been.
 *
 * Applied by POSITION, not by chamber id. Keying it to the LV left the apex at
 * 0.122 even after the taper landed, because the lowest particle in the cloud
 * is not an LV particle: the sample box is expanded by CHAMBER_BLEND_K, so an
 * RV sample can sit below the LV's pole and still be inside the union, and it
 * escaped a taper that asked "which chamber drew you?" instead of "where are
 * you?". Anatomically the position test is also the truer one — the inferior RV
 * wraps onto the apex rather than stopping short of it.
 */
const LV = CHAMBERS[2]!;

/**
 * How sharply the LV converges on the apex. 2 = quadratic: the upper LV is
 * untouched and only the inferior third draws in.
 */

/**
 * Softness of the right/left membership blend, in field units.
 *
 * THE SEPTUM IS NOT THE MIDLINE. Tint was previously a ramp across x about a
 * "septumX" derived from HEART.rightBorderX and fractionLeftOfMidline — which
 * evaluates to −0.0001, i.e. the midline to within a rounding error. The right
 * ventricle spans x −0.148 … +0.122, so every RV particle that crossed x = 0
 * was painted as left heart: measured 0 of 30. The most anterior chamber, the
 * one that IS the front of the heart, was being drawn as someone else's.
 *
 * The septum runs obliquely, upper-right to lower-left, and no function of x
 * alone can express that. So laterality is now computed from CHAMBER
 * MEMBERSHIP: each particle is softly assigned to the chambers whose fields it
 * lies nearest, and tint is the left-sided share of that assignment. A particle
 * deep in the RV reads right wherever it sits in x; the crossover falls on the
 * real RV↔LV interface because that is where the two memberships balance.
 *
 * 0.18 chosen by sweep, not by eye. The field is normalised by chamber radii
 * (~0.1 units), so softness does NOT read directly in anatomy units: 0.055 put
 * only 8% of particles between the extremes — still a seam, merely a
 * better-placed one. Across 0.055 → 0.5 the intermediate fraction climbs
 * 8% → 83% while the per-chamber means hold at RV 0.30 / RA 0.21 / LV 0.82 /
 * LA 0.83, so separation is not what the choice trades against. 0.18 is the
 * knee: 21% of particles carry the gradient, spanning ~0.11 units of x, and
 * the chambers stay unambiguously themselves.
 */

/** 1 for a left-heart chamber, 0 for a right-heart one. */
const CHAMBER_IS_LEFT = CHAMBERS.map((c) => (c.side === "left" ? 1 : 0));

/**
 * Left-sided share of a point's soft chamber membership: 0 = purely right
 * heart, 1 = purely left. Continuous everywhere, including in the soft-union
 * bridges that belong to no single chamber.
 */
export function chamberLeftness(x: number, y: number, z: number): number {
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < CHAMBERS.length; i++) {
    const c = CHAMBERS[i]!;
    // exp(-field / softness): ~1 at the centroid, falling smoothly outward, so
    // distant chambers contribute negligibly rather than not at all.
    const w = Math.exp(-ellipsoidField(x, y, z, c.centroid, c.radii) / MEMBERSHIP_SOFTNESS);
    weighted += w * CHAMBER_IS_LEFT[i]!;
    total += w;
  }
  return total > 0 ? weighted / total : 0.5;
}

/**
 * Lateral extent of the cardiac silhouette, computed from the field rather than
 * from sampled particles — the AP borders a radiologist would measure.
 *
 * Sampling cannot answer this question. Across 40 seeds the widest sampled
 * particle ranges 0.205 … 0.239 against a true border of 0.240, because a
 * 100-190 particle cloud lands on an extremum only by luck. Asserting borders
 * against sampled extremes therefore measures the RNG, and any assertion band
 * loose enough to survive it is too loose to have caught the item-0 defect
 * (a 24% over-wide right border) that motivated the check in the first place.
 *
 * Bisection is exact to the returned precision and seed-independent. Only the
 * equatorial band is scanned: both borders are formed at chamber-centroid
 * height (RA on the right, LV on the left), and the apex taper acts strictly
 * below the LV centroid, so it cannot move either.
 */
const HULL_STEP = HULL_SCAN.xSpan / 100;

export function cardiacHullExtentX(): { minX: number; maxX: number; ctr: number } {
  const inside = (x: number, y: number, z: number) => cardiacField(x, y, z) <= 0;
  let minX = 0;
  let maxX = 0;
  for (let yi = 0; yi <= 120; yi++) {
    const y = HULL_SCAN.yMin + (yi / 120) * HULL_SCAN.ySpan;
    for (let zi = 0; zi <= 40; zi++) {
      const z = HULL_SCAN.zMin + (zi / 40) * HULL_SCAN.zSpan;
      for (const dir of [-1, 1]) {
        // Walk out until outside, then bisect the crossing.
        let hit = 0;
        let found = false;
        for (let s = 0; s <= HULL_SCAN.xSpan; s += HULL_STEP) {
          if (inside(dir * s, y, z)) {
            hit = dir * s;
            found = true;
          } else if (found) break;
        }
        if (!found) continue;
        let lo = hit;
        let hi = hit + dir * HULL_STEP;
        for (let it = 0; it < 40; it++) {
          const mid = (lo + hi) / 2;
          if (inside(mid, y, z)) lo = mid;
          else hi = mid;
        }
        if (dir < 0) minX = Math.min(minX, lo);
        else maxX = Math.max(maxX, lo);
      }
    }
  }
  return { minX, maxX, ctr: (maxX - minX) / THORAX.maxTransverseWidth };
}

export function generateHeart(budget: number, seed: number): HeartGeometry {
  const rng = mulberry32(seed);
  const positions = new Float32Array(budget * 3);
  const tint = new Float32Array(budget);
  const chamber = new Uint8Array(budget);

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
      if (rng() > Math.exp(-depth * HEART_HULL_BIAS)) continue;

      const apexDepth = Math.max(0, Math.min(1, (LV.centroid.y - y) / LV.radii.y));
      const t = Math.pow(apexDepth, APEX_TAPER_POWER);
      const px = x * (1 - t) + HEART.apex.x * t;

      const i = written * 3;
      positions[i] = px;
      positions[i + 1] = y;
      positions[i + 2] = z;

      // Sampled at the UNSHEARED position: the shear is a silhouette device
      // that carries the LV's inferior pole out to the apex, and feeding a
      // sheared x back into the field would ask the chambers where a point is
      // that they never contained.
      tint[written] = chamberLeftness(x, y, z);
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
