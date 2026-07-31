import { ENVELOPE, HEART, THORAX } from "./anatomy";
import { cardiacField } from "./heart";
import { mulberry32 } from "./rng";

/**
 * The pleural envelope — a sparse particle SHELL defining the lung surfaces.
 *
 * Without it the heart floats between two bare trees and "between the lungs" is
 * a claim the picture contradicts. Surfaces only, no parenchymal fill: lowest
 * alpha and deepest crimson in the scene. It is the room, not the subject.
 *
 * COORDINATE REMINDER: +x is the viewer's RIGHT = the patient's LEFT. The right
 * lung therefore occupies negative x.
 *
 * The features that carry the image:
 *
 *  - THE CARDIAC NOTCH in the left upper lobe, cutting medially to exactly the
 *    heart's left border, so the notch and the cardiac silhouette are the same
 *    curve. The right lung has no equivalent, and that asymmetry between the
 *    two medial borders is much of what makes this read as a real chest rather
 *    than a symmetric ornament.
 *  - THE RIGHT HEMIDIAPHRAGM SITS HIGHER than the left — the liver.
 *  - FISSURES render as thin gaps in particle density, never as drawn lines.
 *    That is how lobes become visible in a particle cloud.
 */
export interface EnvelopeGeometry {
  positions: Float32Array;
  /** 1 = right lung, 0 = left. */
  isRight: Uint8Array;
  count: number;
}

/** Half-width of a lung shell; the pair spans the thorax with a mediastinal gap. */
const LUNG_HALF_WIDTH = 0.175;
/** Medial border offset from the midline — the mediastinum lives between these. */
const MEDIAL_X = 0.02;
const LUNG_CENTRE_X = MEDIAL_X + LUNG_HALF_WIDTH;
/** Vertical centre, midway between apex and costophrenic angle. */
const LUNG_CENTRE_Y = (THORAX.lungApexY + THORAX.costophrenicY) / 2;
const LUNG_HALF_HEIGHT = (THORAX.lungApexY - THORAX.costophrenicY) / 2;
const LUNG_HALF_DEPTH = THORAX.apDepth / 2;

/** Oblique fissure: a plane through each lung, rendered as a density gap. */
const FISSURE_GAP = 0.012;

export function generateEnvelope(budget: number, seed: number): EnvelopeGeometry {
  const rng = mulberry32(seed);
  const pos: number[] = [];
  const side: number[] = [];

  const ratio = ENVELOPE.rightLeftParticleRatio;
  const rightWant = Math.round((budget * ratio) / (1 + ratio));
  const want = { right: rightWant, left: budget - rightWant };

  for (const lung of ["right", "left"] as const) {
    const sign = lung === "right" ? -1 : 1;
    const cx = sign * LUNG_CENTRE_X;
    // The liver raises the right hemidiaphragm, so the right lung's floor is
    // higher and its shell correspondingly shorter.
    const domeY = lung === "right" ? THORAX.rightDiaphragmY : THORAX.leftDiaphragmY;

    let placed = 0;
    let guard = 0;
    while (placed < want[lung] && guard++ < want[lung] * 600) {
      // Sample the SHELL: a direction on the unit sphere, pushed to the surface.
      const u = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - u * u));
      const x = cx + r * Math.cos(theta) * LUNG_HALF_WIDTH;
      const y = LUNG_CENTRE_Y + u * LUNG_HALF_HEIGHT;
      const z = r * Math.sin(theta) * LUNG_HALF_DEPTH;

      const lateral = Math.abs(x - sign * MEDIAL_X) / LUNG_HALF_WIDTH;
      // Medially the floor is the diaphragm dome; laterally it falls to the
      // costophrenic angle. Squaring makes the fall accelerate outward, which
      // is what produces a SHARP corner rather than the flat cut a plain
      // ellipsoid would give.
      const floorY = domeY + (THORAX.costophrenicY - domeY) * lateral * lateral;
      if (y < floorY) continue;

      // The mediastinum belongs to the heart and great vessels, not the lung.
      if (sign > 0 ? x < MEDIAL_X : x > -MEDIAL_X) continue;

      // THE CARDIAC NOTCH — left lung only. Cuts medially to exactly the
      // heart's left border, so the notch and the cardiac silhouette are the
      // same curve. Giving the right lung an equivalent would flatten the one
      // asymmetry that makes this read as a chest.
      if (
        lung === "left" &&
        y <= ENVELOPE.cardiacNotch.topY &&
        y >= ENVELOPE.cardiacNotch.bottomY &&
        x <= ENVELOPE.cardiacNotch.medialX
      ) {
        continue;
      }

      // Nothing may sit inside the heart.
      if (cardiacField(x, y, z) < 0) continue;

      // FISSURES as density gaps, never drawn lines. The oblique fissure runs
      // obliquely across both lungs; the horizontal fissure exists only on the
      // right, which is what resolves three lobes there and two on the left.
      const oblique = y - (LUNG_CENTRE_Y - 0.08) + (x - cx) * sign * 0.55;
      if (Math.abs(oblique) < FISSURE_GAP) continue;
      if (lung === "right" && Math.abs(y - (LUNG_CENTRE_Y + 0.14)) < FISSURE_GAP) continue;

      pos.push(x, y, z);
      side.push(sign < 0 ? 1 : 0);
      placed++;
    }
  }

  return {
    positions: new Float32Array(pos),
    isRight: new Uint8Array(side),
    count: side.length,
  };
}

/** Exposed so the assertion suite can test the notch against the real border. */
export const NOTCH_MATCHES_HEART_BORDER = ENVELOPE.cardiacNotch.medialX === HEART.leftBorderX;
