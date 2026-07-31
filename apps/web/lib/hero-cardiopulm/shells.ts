import { ENVELOPE, FISSURES, LUNG, THORAX } from "./anatomy";
import { insideLung, MEDIAL_X } from "./envelope";

/**
 * The pleural surfaces, as STROKED OUTLINES rather than particles.
 *
 * WHY THIS REPLACED A PARTICLE SHELL. The envelope had ~110 particles to carry
 * two lung surfaces, three fissures, two costophrenic angles and the cardiac
 * notch. Measured on the reviewed artifact, the notch — which ANATOMY.md §5
 * calls the single most important silhouette feature — was described by FIVE
 * PARTICLES. It was geometrically correct (zero intrusions, correct medial
 * asymmetry) and simply too sparse to see. No budget increase fixes that; a
 * curve needs to be a curve.
 *
 * Six SVG paths replace 110 DOM nodes, the notch becomes a crisp edge that
 * coincides with the cardiac left border, fissures become gaps in a stroke, and
 * the freed budget goes to the airways and the heart, which is where item 1's
 * hollow lung was.
 *
 * COORDINATE REMINDER: +x is the viewer's RIGHT = the patient's LEFT. The right
 * lung therefore occupies negative x. See anatomy.ts.
 */
export interface ShellSegment {
  /** Consecutive points, in anatomy units. Gaps between segments are fissures. */
  points: { x: number; y: number }[];
}

export interface Shell {
  lung: "right" | "left";
  /** Depth of the plane this outline is drawn on. */
  z: number;
  segments: ShellSegment[];
}

/** Vertical resolution of the boundary march. */
const STEPS_Y = 150;
/** Horizontal resolution, then refined by bisection. */
const STEPS_X = 200;

/**
 * The oblique fissure, as a signed distance. Runs infero-anteriorly across both
 * lungs, separating upper lobe from lower.
 */
function obliqueFissure(x: number, y: number, sign: number, centreY: number, centreX: number) {
  return y - (centreY - FISSURES.obliqueOffsetY) + (x - centreX) * sign * FISSURES.obliqueSlope;
}

/** The horizontal fissure. RIGHT LUNG ONLY — it is what resolves three lobes there. */
function horizontalFissure(y: number, centreY: number) {
  return y - (centreY + FISSURES.horizontalOffsetY);
}

/**
 * Walk one lung's outline at one depth.
 *
 * For each height, the boundary is the extreme x at which the lung is present —
 * found by scan then bisection, off `insideLung` itself, so a drawn outline can
 * never drift from the surface the airways are contained by. The lateral border
 * is walked downward and the medial border back up, giving a closed loop.
 *
 * The medial border is where the notch appears: inside the notch band the lung
 * starts at the heart's left BORDER — the single x the spec names — instead of
 * at the mediastinum.
 *
 * Note what that is and is not. §5 specifies a cut to x = +0.240 across a fixed
 * y band, so the notch is a straight medial edge, not a tracing of the cardiac
 * contour; where the heart is narrower than its widest point the notch cuts
 * lateral to it. What the scan does guarantee is that the border never crosses
 * INTO the heart, since insideLung excludes the cardiac hull outright.
 */
function march(lung: "right" | "left", z: number): { x: number; y: number }[] {
  const sign = lung === "right" ? -1 : 1;
  const lateral: { x: number; y: number }[] = [];
  const medial: { x: number; y: number }[] = [];
  const span = PLEURAL_SPAN;

  for (let i = 0; i <= STEPS_Y; i++) {
    const y = THORAX.lungApexY - (i / STEPS_Y) * (THORAX.lungApexY - THORAX.costophrenicY);
    // Walk INWARD from the chest wall and stop at the first gap, rather than
    // taking the row's min and max.
    //
    // A row through the heart is DISCONTINUOUS: lung laterally, cardiac shadow,
    // then a thin strip medial to the heart where the chamber ellipsoids fall
    // short of the mediastinal border. Collapsing that to min/max reported the
    // medial border as -0.021 when the heart's own border was -0.115, and drew
    // the lung outline straight through the cardiac shadow — the one place the
    // silhouette must not be crossed. The outermost contiguous run is the lung;
    // the medial strip is mediastinum the chamber model does not fill.
    let outer: number | null = null;
    let inner: number | null = null;
    for (let j = STEPS_X; j >= 0; j--) {
      const x = sign * (j / STEPS_X) * span;
      if (insideLung(x, y, z)) {
        if (outer === null) outer = x;
        inner = x;
      } else if (outer !== null) {
        break;
      }
    }
    if (outer === null || inner === null) continue;
    lateral.push({ x: refine(outer, y, z, sign, span), y });
    medial.unshift({ x: refine(inner, y, z, -sign as -1 | 1, span), y });
  }
  // CLOSE THE LOOP. The lateral and medial chains end on the same row at the
  // apex, 0.054 to 0.085 apart, and leaving them unjoined drew every lung with
  // an open top — a gap indistinguishable from a fissure to anything reading
  // the stroke, including a viewer. The apex is continuous lung.
  if (lateral.length > 0) return [...lateral, ...medial, lateral[0]!];
  return [...lateral, ...medial];
}

const PLEURAL_SPAN = LUNG.scanSpan;

/**
 * Push a boundary sample onto the true surface.
 *
 * The scan lands on the last grid point INSIDE, up to one step short of the
 * edge. At the costophrenic angle, where the floor falls as the square of
 * lateral distance, one step is the difference between a sharp corner and a
 * rounded one — which is exactly the landmark §5 says must stay sharp.
 */
function refine(x: number, y: number, z: number, outward: number, span: number): number {
  let inside = x;
  let outside = x + outward * (span / STEPS_X);
  for (let k = 0; k < 24; k++) {
    const mid = (inside + outside) / 2;
    if (insideLung(mid, y, z)) inside = mid;
    else outside = mid;
  }
  return inside;
}

/**
 * Break the closed loop wherever it crosses a fissure.
 *
 * Fissures are drawn as GAPS, never as lines. That is not a stylistic choice:
 * a fissure is where the visceral pleura folds inward, so it genuinely
 * interrupts the outer surface. Drawing it as a line would put a mark where
 * there is no edge, and would make the lobes read as stacked plates.
 */
function splitAtFissures(
  loop: { x: number; y: number }[],
  lung: "right" | "left",
  centreY: number,
  centreX: number,
): ShellSegment[] {
  const sign = lung === "right" ? -1 : 1;
  const gap = ENVELOPE.fissureGap;
  const segments: ShellSegment[] = [];
  let run: { x: number; y: number }[] = [];

  for (const p of loop) {
    const onOblique = Math.abs(obliqueFissure(p.x, p.y, sign, centreY, centreX)) < gap;
    const onHorizontal = lung === "right" && Math.abs(horizontalFissure(p.y, centreY)) < gap;
    if (onOblique || onHorizontal) {
      if (run.length > 1) segments.push({ points: run });
      run = [];
    } else {
      run.push(p);
    }
  }
  if (run.length > 1) segments.push({ points: run });
  return segments;
}

export function generateShells(): Shell[] {
  const centreY = (THORAX.lungApexY + THORAX.costophrenicY) / 2;
  const shells: Shell[] = [];
  for (const lung of ["right", "left"] as const) {
    const sign = lung === "right" ? -1 : 1;
    const centreX = sign * (MEDIAL_X + LUNG.halfWidth);
    for (const z of ENVELOPE.shellDepths) {
      const loop = march(lung, z);
      if (loop.length < 4) continue;
      shells.push({ lung, z, segments: splitAtFissures(loop, lung, centreY, centreX) });
    }
  }
  return shells;
}

/**
 * Points along every shell, for the assertion suite.
 *
 * The §5 landmarks and §7 assertions are unchanged by this rewrite — they still
 * test lung apex height, hemidiaphragm asymmetry, notch depth and medial
 * asymmetry, and cardiac exclusion. They simply read points off the paths now
 * instead of off a particle cloud, which is a stricter test: every point lies
 * exactly ON the surface, where before the sparsest region of a random cloud
 * decided whether a landmark was measurable at all.
 */
export function sampleShells(
  shells: Shell[],
): { x: number; y: number; z: number; isRight: boolean }[] {
  const out: { x: number; y: number; z: number; isRight: boolean }[] = [];
  for (const shell of shells) {
    for (const seg of shell.segments) {
      for (const p of seg.points) {
        out.push({ x: p.x, y: p.y, z: shell.z, isRight: shell.lung === "right" });
      }
    }
  }
  return out;
}

/**
 * The shells presented in the shape the assertion suite already consumes.
 *
 * Deliberately identical to the old particle geometry's interface, so every §5
 * landmark and §7 envelope assertion runs UNCHANGED against the new
 * representation — apex height, hemidiaphragm asymmetry, notch depth, medial
 * asymmetry, cardiac exclusion. A rewrite that also rewrote its own tests would
 * prove nothing.
 */
export function shellsAsPointCloud(shells: Shell[]): {
  positions: Float32Array;
  isRight: Uint8Array;
  count: number;
} {
  const pts = sampleShells(shells);
  const positions = new Float32Array(pts.length * 3);
  const isRight = new Uint8Array(pts.length);
  pts.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    isRight[i] = p.isRight ? 1 : 0;
  });
  return { positions, isRight, count: pts.length };
}
