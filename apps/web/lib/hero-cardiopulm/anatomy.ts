/**
 * Landmark constants, transcribed from docs/design/hero/ANATOMY.md.
 *
 * THIS FILE IS THE ONLY PLACE GEOMETRY NUMBERS MAY LIVE. A bare coordinate
 * literal in tree.ts, heart.ts or envelope.ts is a review-blocking defect —
 * every landmark here has a corresponding assertion in anatomy.test.ts, and a
 * number that bypasses this file bypasses its test.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COORDINATE CONVENTION — DO NOT "FIX" THE X-AXIS
 *
 *   +x  = the viewer's RIGHT  = the patient's LEFT
 *   +y  = superior (up)
 *   +z  = anterior, toward the viewer
 *
 * This is radiological convention: the film is read as if facing the patient.
 * Two consequences that look wrong at a glance and are correct:
 *
 *   - the heart apex has a POSITIVE x (viewer's right)
 *   - the right main bronchus has a NEGATIVE x (viewer's left)
 *
 * Flipping the sign mirrors the entire chest, which is the single most likely
 * and most humiliating defect this scene can ship with.
 *
 * ORIGIN = THE CARINA, not the centre of the scene. Every landmark is a
 * relationship to the tracheal bifurcation, which is how thoracic anatomy is
 * actually reasoned about.
 *
 * Unit H = 1.0 = lung apex → costophrenic angle.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Thoracic frame (ANATOMY.md §1). */
export const THORAX = {
  /** Extends above the clavicle, medially. */
  lungApexY: 0.36,
  /** The origin. Stated for readability at call sites. */
  carinaY: 0,
  costophrenicY: -0.64,
  /** The liver raises the right hemidiaphragm — it sits HIGHER than the left. */
  rightDiaphragmY: -0.505,
  leftDiaphragmY: -0.555,
  maxTransverseWidth: 0.75,
  /** A child's chest is rounder than an adult's. */
  apDepth: 0.45,
} as const;

/**
 * Cardiac envelope (ANATOMY.md §3), derived from a cardiothoracic ratio of
 * 0.48 — normal for a child. Not eyeballed: width = CTR × thoracic width.
 */
export const HEART = {
  ctr: 0.48,
  width: 0.36,
  /** Right heart border, formed by the right atrium. */
  rightBorderX: -0.12,
  /** Left heart border, formed by the left ventricle. */
  leftBorderX: 0.24,
  /** The classic 2:1 split — two thirds of the width lies left of midline. */
  fractionLeftOfMidline: 0.667,
  /** Base of the heart, just below the carina. */
  baseY: -0.03,
  /**
   * Apex: inferolateral, to the patient's LEFT, hence +x.
   * PEDIATRIC NOTE — this sits relatively higher than in an adult (4th
   * intercostal space in a young child vs 5th). Do not lower it toward adult
   * proportions.
   */
  apex: { x: 0.149, y: -0.45 },
  height: 0.42,
} as const;

/**
 * The four chambers, as blended ellipsoids (ANATOMY.md §3).
 *
 * Depth ordering is the whole point of the scene. Anterior → posterior:
 *
 *   RV (+0.115) → RA (+0.020) → LV (+0.005) → LA (−0.090)
 *
 * The right ventricle is the most anterior chamber; the left atrium the most
 * posterior, sitting immediately beneath the carina — close enough that LA
 * enlargement splays the carinal angle, the classic sign of a large
 * left-to-right shunt. Rendering that ordering is what makes a particle cloud
 * read as a volume rather than a sticker.
 */
export const CHAMBERS = [
  {
    id: "rv",
    label: "right ventricle",
    side: "right",
    centroid: { x: -0.02, y: -0.3, z: 0.115 },
    radii: { x: 0.115, y: 0.13, z: 0.08 },
    share: 0.3,
  },
  {
    id: "ra",
    label: "right atrium",
    side: "right",
    centroid: { x: -0.075, y: -0.14, z: 0.02 },
    radii: { x: 0.075, y: 0.105, z: 0.075 },
    share: 0.2,
  },
  {
    id: "lv",
    label: "left ventricle",
    side: "left",
    centroid: { x: 0.115, y: -0.315, z: 0.005 },
    radii: { x: 0.115, y: 0.145, z: 0.1 },
    share: 0.32,
  },
  {
    id: "la",
    label: "left atrium",
    side: "left",
    centroid: { x: 0.055, y: -0.075, z: -0.09 },
    radii: { x: 0.085, y: 0.075, z: 0.07 },
    share: 0.18,
  },
] as const;

/** Soft-min blend constant for the chamber union — a smooth join, not four balls. */
export const CHAMBER_BLEND_K = 0.04;

/**
 * Main bronchi (ANATOMY.md §4). School-age child.
 *
 * TWO THINGS NOBODY SHOULD "CORRECT":
 *
 * 1. The right main bronchus is SHORTER, WIDER and MORE VERTICAL than the
 *    left. This asymmetry is real and load-bearing.
 * 2. These are PEDIATRIC angles, deliberately less asymmetric than adult
 *    values (~25°/45°). In infants the two are nearly equal — which is exactly
 *    why aspirated foreign bodies do not favour the right in young children the
 *    way they do in adults. Do not tune toward adult numbers.
 */
export const BRONCHI = {
  right: {
    /** Degrees from vertical. Negative x — the viewer's left. */
    angleDeg: 28,
    length: 0.115,
    hilum: { x: -0.054, y: -0.102 },
  },
  left: {
    angleDeg: 45,
    length: 0.175,
    hilum: { x: 0.124, y: -0.124 },
  },
  /** Right + left. Asserted to land in [65°, 80°]. */
  subcarinalAngleDeg: 73,
} as const;

/**
 * The right upper lobe bronchus arises very early — the most recognisable
 * feature of the right airway, and the only lobar bronchus above the pulmonary
 * artery. Rendered explicitly rather than left to the generic recursion.
 */
export const RUL_TAKEOFF = {
  /** Fraction along the right main bronchus. Asserted to be within the proximal 50%. */
  alongRightMain: 0.4,
  /**
   * POLAR angle from the DOWNWARD vertical: 0° is straight down, 90° is
   * horizontal, 180° is straight up. 145° is therefore 55° above the
   * horizontal — superolateral, as the anatomy specifies.
   *
   * Stated this way because "−35°, directed superolaterally" is ambiguous and
   * was implemented backwards once: a naive reading sent the bronchus DOWNWARD
   * and toward the midline, straight into the mediastinum, where the cardiac
   * exclusion culled almost all of it. Polar-from-down has no such ambiguity.
   */
  angleDeg: 145,
  length: 0.075,
} as const;

/**
 * Lobar bronchus directions, as polar angle from the downward vertical plus an
 * azimuthal roll (0° = toward +x / the patient's left, 180° = toward −x).
 *
 * The upper lobes are ABOVE the hilum and the lower lobes below it. Aiming an
 * upper lobe downward drives it through the heart.
 */
export const LOBAR_BRONCHI = [
  /** Right middle lobe: down, lateral, and ANTERIOR — hence the roll off 180°. */
  { lobe: "rml", polarDeg: 24, rollDeg: 150 },
  { lobe: "rll", polarDeg: 52, rollDeg: 180 },
  /** Left upper lobe, including the lingula. Superolateral, mirroring the RUL. */
  { lobe: "lul", polarDeg: 145, rollDeg: 0 },
  { lobe: "lll", polarDeg: 50, rollDeg: 0 },
] as const;

/** Recursive bifurcation below the lobar bronchi (ANATOMY.md §4). */
export const BRANCHING = {
  divergenceDeg: 34,
  divergenceJitterDeg: 8,
  lengthDecay: 0.76,
  lengthJitter: 0.04,
  radiusDecay: 0.72,
  /** Golden angle, so successive generations do not stack into a plane. */
  rollDeg: 137.5,
  rollJitterDeg: 12,
  /** Alveolar cluster radius as a multiple of the terminal branch radius. */
  clusterRadiusFactor: 3,
} as const;

/**
 * Pleural envelope (ANATOMY.md §5) — a sparse shell, surfaces only. Without it
 * the heart floats between two bare trees and "between the lungs" is a claim
 * the picture contradicts.
 */
export const ENVELOPE = {
  /**
   * The cardiac notch in the left upper lobe. The single most important
   * silhouette feature: it cuts medially to EXACTLY the heart's left border, so
   * the notch and the cardiac silhouette are the same curve.
   *
   * The right lung has no equivalent. That asymmetry between the two medial
   * borders is much of what makes this read as a real chest rather than a
   * symmetric ornament.
   */
  cardiacNotch: {
    topY: -0.15,
    bottomY: -0.45,
    /** === HEART.leftBorderX, deliberately. Asserted equal. */
    medialX: 0.24,
  },
  /** Right lung exceeds left by 10–25%: the heart displaces the left. */
  rightLeftParticleRatio: 1.18,
  /** Costophrenic angles are sharp — asserted below 45°. */
  costophrenicAngleDeg: 32,
} as const;

/**
 * The thymus (ANATOMY.md §6) — prominent in young children, involutes with age.
 * The single clearest signal that this is a CHILD's chest and not a small
 * adult's, and simultaneously a legibility risk.
 *
 * DEFAULT OFF. Founder decision at the Phase 2 gate, on a real render.
 */
export const THYMUS = {
  enabled: false,
  zNear: 0.16,
  zFar: 0.2,
  topY: 0.1,
  bottomY: -0.1,
  leftX: -0.1,
  rightX: 0.12,
  /** A veil, not a mass. */
  alphaFactor: 0.25,
} as const;

/**
 * Physiology (HERO_BRIEF.md). A well child at rest.
 *
 * The beats-per-breath ratio is deliberately NON-INTEGER (3400/741 ≈ 4.59) so
 * the two rhythms never lock into a mechanical pattern. Asserted.
 */
export const RHYTHM = {
  breathMs: 3400,
  breathMsMin: 2400,
  breathMsMax: 5000,
  /** I:E ≈ 1:1.8 — inhale occupies 36% of the cycle. */
  inhaleFraction: 0.36,
  heartRateBpm: 81,
  heartRateBpmMin: 70,
  heartRateBpmMax: 110,
  /**
   * Respiratory sinus arrhythmia. Inspiration SHORTENS the interval (heart
   * rate rises); expiration lengthens it. ±8%.
   */
  rsaDepth: 0.08,
  /** Perfusion pulse crosses the form right→left over this share of the interval. */
  pulseTravelFraction: 0.55,
  /** Ventricles only, and capped: this perfuses, it does not squeeze. */
  maxVolumetricChange: 0.03,
  /** Global radial scale about the tree root. */
  breathScaleGlobal: 0.07,
  /** Alveolar clusters additionally scale about their own centroids. */
  breathScaleCluster: 0.18,
  /** Recruitment glow at end-inspiration. */
  breathAlphaCluster: 0.15,
  swayDeg: 12,
  swayPeriodMs: 30_000,
  pitchDeg: -6,
} as const;

/**
 * Particle budget (HERO_BRIEF.md Amendment A). An invariant, not an
 * aspiration: generators receive a budget and adapt density to land within it.
 *
 * The heart's share is high relative to its size. That density IS the
 * separation from the airways, so it is not the first thing to cut.
 */
export const BUDGET = {
  desktop: { total: 550, airways: 250, heart: 190, envelope: 110, generations: 6 },
  narrow: { total: 280, airways: 125, heart: 100, envelope: 55, generations: 5 },
} as const;

export type Preset = keyof typeof BUDGET;

/** Seeded so every visitor sees the same chest and tests are stable. */
export const DEFAULT_SEED = 0x7c0a_11de;
