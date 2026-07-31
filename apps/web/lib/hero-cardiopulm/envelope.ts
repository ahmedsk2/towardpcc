import { ENVELOPE, HEART, LUNG, THORAX } from "./anatomy";
import { cardiacField } from "./heart";

/**
 * The pleural cavity, as PREDICATES. The surfaces themselves are drawn as
 * stroked outlines in shells.ts; this file defines where the lung is.
 *
 * It used to also emit a particle cloud for the surfaces. That is gone: 110
 * particles could not carry two lung shells, three fissures, two costophrenic
 * angles and the cardiac notch, and the notch ended up drawn by five of them.
 * What remains is the geometry every other system asks questions of — the
 * airway tree for containment, the shell marcher for its outline, the assertion
 * suite for its landmarks — so there is exactly ONE definition of where the
 * lung is, and a drawn surface cannot drift from a grown one.
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
 *  - THE RIGHT HEMIDIAPHRAGM SITS HIGHER than the left — the liver, which
 *    raises the costophrenic angle with it, not just the dome.
 *  - FISSURES render as gaps, never as drawn lines. A fissure is where the
 *    visceral pleura folds inward, so it genuinely interrupts the surface;
 *    drawing it would put a mark where there is no edge.
 */

/** Half-width of a lung shell; the pair spans the thorax with a mediastinal gap. */
const LUNG_HALF_WIDTH = LUNG.halfWidth;
/** Medial border offset from the midline — the mediastinum lives between these. */
export const MEDIAL_X = LUNG.medialX;
const LUNG_CENTRE_X = MEDIAL_X + LUNG_HALF_WIDTH;
/**
 * Vertical centre and half-height of the thoracic shell.
 *
 * Spans apex to lungInferiorLimit, NOT apex to costophrenic angle. The shell
 * must clear the diaphragm so the diaphragm alone forms the base — see
 * THORAX.lungInferiorLimit.
 */
const LUNG_CENTRE_Y = (THORAX.lungApexY + THORAX.lungInferiorLimit) / 2;
const LUNG_HALF_HEIGHT = (THORAX.lungApexY - THORAX.lungInferiorLimit) / 2;
/** Medial border to lateral pleura. `lateral` below is normalised by THIS. */
const LUNG_FULL_WIDTH = LUNG_HALF_WIDTH * 2;
const LUNG_HALF_DEPTH = THORAX.apDepth / 2;

/**
 * Is this point inside the LUNG — the pleural cavity minus the cardiac notch?
 *
 * The distinction from insidePleura is the notch, and it matters in both
 * directions. The notch is not lung, so nothing may be drawn or grown there;
 * but the notch is also ANTERIOR only, because the heart lies against the front
 * of the left lung while the posterior left lung runs medially behind it. A
 * full-thickness cut deletes lung that exists and throws away the one fact the
 * notch is there to convey.
 */
export function insideLung(x: number, y: number, z: number): boolean {
  if (!insidePleura(x, y, z)) return false;
  return !inCardiacNotch(x, y, z);
}

/**
 * THE CARDIAC NOTCH — left lung only, anterior only.
 *
 * Cuts medially to EXACTLY the heart's left border — asserted equal to
 * HEART.leftBorderX, so the two can never drift apart. That is a shared x, not
 * a shared curve: §5 specifies a straight medial edge across a fixed y band,
 * and where the heart is narrower than its widest point the notch cuts lateral
 * to the chamber contour. Giving the right lung an equivalent would flatten the
 * one asymmetry that makes this read as a chest.
 */
export function inCardiacNotch(x: number, y: number, z: number): boolean {
  const n = ENVELOPE.cardiacNotch;
  return x > 0 && z > n.anteriorZ && y <= n.topY && y >= n.bottomY && x <= n.medialX;
}

/**
 * Lateral half-width of each pleural surface from the midline, analytically.
 * Exposed so the airway-fill assertion compares against the true surface rather
 * than against whichever envelope particle happened to land furthest out.
 */
export const PLEURAL_LATERAL_EXTENT = LUNG_CENTRE_X + LUNG_HALF_WIDTH;

/**
 * Is this point inside either pleural cavity?
 *
 * Exported so the airway tree can be CONTAINED by the same surface the envelope
 * draws, rather than merely aimed at it. Steering branches along their lobe's
 * growth axis fixed the hollow right lung and then let the strongest seeds push
 * airway tips 7.6% BEYOND the pleura — trading a lung with nothing in it for
 * one leaking out of the chest. Reach and containment are separate properties
 * and each needs its own mechanism; tuning the pull to satisfy both at once
 * would just pick whichever defect the seed happened to hide.
 *
 * Deliberately omits the fissures and the cardiac notch. Those are DENSITY
 * features of the drawn shell — the lobes they separate are contiguous lung,
 * and a bronchus crossing a fissure line is normal. Containment is the
 * pleura, the diaphragm and the mediastinum, nothing else.
 */
export function insidePleura(x: number, y: number, z: number): boolean {
  const sign = x < 0 ? -1 : 1;
  const cx = sign * LUNG_CENTRE_X;
  const dx = Math.abs((x - cx) / LUNG_HALF_WIDTH);
  const dySigned = (y - LUNG_CENTRE_Y) / LUNG_HALF_HEIGHT;
  const dy = Math.abs(dySigned);
  const dz = Math.abs(z / LUNG_HALF_DEPTH);
  // Rounded above the centre, near-square below: a chest is a dome on a barrel.
  const n = dySigned > 0 ? ENVELOPE.wallExponentUpper : ENVELOPE.wallExponentLower;
  if (Math.pow(dx, n) + Math.pow(dy, n) + Math.pow(dz, n) > 1) return false;

  // The mediastinum belongs to the heart and great vessels.
  if (sign > 0 ? x < MEDIAL_X : x > -MEDIAL_X) return false;

  // Nor may lung occupy the heart itself. This was previously enforced only
  // where the envelope SAMPLED, so the predicate quietly disagreed with the
  // cloud it produced — and the moment the surface was drawn as a curve
  // instead, 45 points ran straight through the cardiac hull. The lung's
  // mediastinal border and the cardiac border are the same line where the two
  // abut; that has to live in the predicate, not in one consumer of it.
  if (cardiacField(x, y, z) < 0) return false;

  // The diaphragm: dome medially, costophrenic angle laterally.
  //
  // Normalised by the FULL width, not the half-width. It was the half-width,
  // so `lateral` ran 0 to 2 rather than 0 to 1 — the specified costophrenic
  // depth was reached at mid-hemithorax and the floor kept plunging past it
  // until the shell cut it off, which is why the two costophrenic angles came
  // out level (0.0007 apart against a specified 0.015) and blunt.
  const domeY = sign < 0 ? THORAX.rightDiaphragmY : THORAX.leftDiaphragmY;
  const cpY = sign < 0 ? THORAX.rightCostophrenicY : THORAX.leftCostophrenicY;
  const lateral = Math.min(1, Math.abs(x - sign * MEDIAL_X) / LUNG_FULL_WIDTH);
  return y >= domeY + (cpY - domeY) * Math.pow(lateral, ENVELOPE.diaphragmFalloffPower);
}

/** Exposed so the assertion suite can test the notch against the real border. */
export const NOTCH_MATCHES_HEART_BORDER = ENVELOPE.cardiacNotch.medialX === HEART.leftBorderX;
