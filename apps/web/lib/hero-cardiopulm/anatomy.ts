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
  /**
   * The liver elevates the WHOLE right hemidiaphragm, so the right
   * costophrenic angle sits slightly higher too — not just the medial dome.
   * The single shared value made the two angles level, which is the one place
   * this chest was symmetric where a real one is not.
   */
  rightCostophrenicY: -0.625,
  leftCostophrenicY: -0.64,
  /**
   * Inferior extent of the thoracic shell — DELIBERATELY BELOW both
   * costophrenic angles, so the shell never forms the lung's floor.
   *
   * It used to sit exactly at -0.64, and that quietly broke the base. The shell
   * is deepest at the MIDLINE and rises laterally; the diaphragm is highest at
   * the midline (the dome) and falls laterally to the costophrenic angle. The
   * two therefore run in opposite directions, and the lung's lowest point came
   * out where they crossed — mid-hemithorax, at a smooth tangency. Measured:
   * the two costophrenic angles differed by 0.0007 against the 0.015 specified,
   * i.e. they were level, and the included angle was 112 degrees on the right
   * and 133 on the left against a documented requirement of under 45.
   *
   * Dropping the shell clear of the diaphragm lets the diaphragm alone define
   * the base, which is what it does in a chest.
   */
  lungInferiorLimit: -0.78,
  /**
   * The hemidiaphragm DOMES, measured at the central tendon rather than at the
   * mediastinum. The liver raises the right one; it sits HIGHER than the left.
   *
   * Raised from -0.505 and -0.555, which placed the domes at 87% and 92% of the
   * way down the lung field against a real ~84%, and put the whole diaphragm
   * BELOW the cardiac apex. The heart floated with lung drawn underneath it, in
   * the one place a chest film shows the cardiac silhouette merging into the
   * diaphragm.
   */
  rightDiaphragmY: -0.4,
  leftDiaphragmY: -0.45,
  /**
   * The cardiophrenic angle, where the diaphragm meets the mediastinum.
   *
   * BELOW the dome, which is the point: a hemidiaphragm is not a slope from the
   * mediastinum outward, it rises from here to a dome over the central tendon
   * and only then falls to the costophrenic angle. Modelling it as monotonic
   * meant the diaphragm was highest exactly where the heart needed to rest on
   * it, and there was nowhere to put the heart but above the whole thing.
   */
  rightCardiophrenicY: -0.5,
  leftCardiophrenicY: -0.55,
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
    // Shifted -0.020 -> -0.005 (review item 0, second-order). Narrowing the RA
    // alone did not move the right heart border, because the RA never formed
    // it: at rx 0.115 the RV reached -0.135, 0.015 LATERAL to the atrium. That
    // is wrong twice — the right border on an AP film is an ATRIAL border, and
    // the RV is the anterior chamber, not the lateral one. Shifting rather than
    // shrinking puts the RV's right margin exactly on the border while keeping
    // the chamber's volume, and carries it further across the midline, which is
    // where the right ventricle actually lies.
    centroid: { x: -0.005, y: -0.3, z: 0.115 },
    radii: { x: 0.115, y: 0.13, z: 0.08 },
    share: 0.3,
  },
  {
    id: "ra",
    label: "right atrium",
    side: "right",
    // Reconciled 2026-07-31 (review item 0). ANATOMY.md §3's chamber table and
    // border table disagreed: -0.075 - 0.075 reaches -0.150, against a stated
    // right border of -0.120. The render followed the chambers, making the
    // heart 24% too wide on the right and CTR 0.504 where 0.480 was intended.
    // Narrowed to meet the border table, which is the clinically-read landmark.
    centroid: { x: -0.07, y: -0.14, z: 0.02 },
    radii: { x: 0.05, y: 0.105, z: 0.075 },
    share: 0.2,
  },
  {
    id: "lv",
    label: "left ventricle",
    side: "left",
    // rx widened 0.115 -> 0.125 so the left border reaches the stated +0.240
    // (review item 0). Cardiac width becomes exactly 0.360, CTR exactly 0.480.
    centroid: { x: 0.115, y: -0.315, z: 0.005 },
    radii: { x: 0.125, y: 0.145, z: 0.1 },
    share: 0.32,
  },
  {
    id: "la",
    label: "left atrium",
    side: "left",
    // TALLER, and lowered to match: -0.075 ± 0.075 became -0.085 ± 0.085.
    //
    // THE MITRAL ANNULUS DID NOT EXIST. The atrium's floor sat at -0.150 and
    // the ventricle's roof at -0.170, so the left heart was two solids with a
    // gap of 0.020 between them that the chamber blend never crossed. Measured
    // on the shipped mesh, the slice at y = -0.12 spanned x -0.120 to -0.067 —
    // the right atrium alone, nothing on the left at any depth — and the heart
    // rendered as a faint atrial cap floating above a dense ventricular ball,
    // which is most of why it read as a ball at all. A heart detached at the
    // mitral valve is not a stylistic problem.
    //
    // The floor now lands exactly on the ventricular roof, so the two fuse
    // through the soft-min rather than merely approaching. The ROOF does not
    // move: it stays at the carina, which is the landmark the assertion pins
    // and the reason left-atrial enlargement splays the carinal angle. Growing
    // downward is also the honest direction — a left atrium runs from the
    // carina to the annulus, and 0.150 was simply short of it.
    centroid: { x: 0.055, y: -0.085, z: -0.09 },
    radii: { x: 0.085, y: 0.085, z: 0.07 },
    share: 0.18,
  },
] as const;

/**
 * Centre the cardiac surface is ray-marched from.
 *
 * Midway between the borders and between base and apex — deep inside the
 * blended union, which is what a star-shaped sweep needs. Derived rather than
 * typed: it is the middle of the box HEART already describes.
 */
export const HEART_CENTRE = { x: 0.06, y: -0.24, z: 0.01 } as const;

/** Soft-min blend constant for the chamber union — a smooth join, not four balls. */
export const CHAMBER_BLEND_K = 0.04;

/**
 * Chamber-membership blend softness, in FIELD units (the field is normalised by
 * chamber radii, so this does not read directly in anatomy units).
 *
 * Chosen by sweep. Re-run after the RA/LV/RV corrections of review item 0, the
 * per-chamber tint means are RV 0.24 / RA 0.15 / LV 0.78 / LA 0.86 and the
 * intermediate fraction is 22%: enough particles carry the gradient that there
 * is no seam, while the chambers stay unambiguously themselves.
 */
export const MEMBERSHIP_SOFTNESS = 0.18;

/** How sharply the inferior heart converges on the apex. 2 = quadratic. */
export const APEX_TAPER_POWER = 2;

/**
 * Ceiling on the taper factor, so the warp stays invertible.
 *
 * At exactly 1 the taper maps every x onto the apex and has no inverse, which
 * matters because the field un-tapers a query point before testing it.
 */
export const APEX_TAPER_CLAMP = 0.985;

/** Hull-bias falloff: how strongly sampling favours the surface over the core. */
export const HEART_HULL_BIAS = 26;

/** Bounds of the analytic apex scan. Must reach below the tapered apex. */
export const APEX_SCAN = { belowApex: 0.06, xMin: -0.2, xSpan: 0.55 } as const;

/** Bounds of the analytic cardiac-hull scan. Must enclose the whole heart. */
export const HULL_SCAN = { yMin: -0.5, ySpan: 0.5, zMin: -0.25, zSpan: 0.5, xSpan: 0.5 } as const;

/** Airway radii by level. Not decorative — cluster size scales with them. */
export const AIRWAY_RADII = {
  trachea: 0.026,
  rightMain: 0.019,
  leftMain: 0.016,
  rul: 0.012,
  lobar: 0.011,
} as const;

/** Trachea length, as a multiple of the right main bronchus. */
export const TRACHEA_LENGTH_FACTOR = 1.6;

/** Lobar bronchus length, as a fraction of the left main bronchus. */
export const LOBAR_LENGTH_FACTOR = 0.62;

/**
 * Share of the airway budget reserved for the MEDIASTINAL airway — trachea,
 * carina, main bronchi — before the lobes are allocated.
 *
 * Reserved, because the generic dust loop gave it four particles out of 316.
 * That loop walks every branch once per pass and stops when the lobe's budget
 * is met, so a lobe with thirty branches spends its whole allowance in the
 * first pass and the trachea receives exactly one point, the same as the
 * thinnest distal twig. Rendered, the airways were glowing clusters at the lung
 * apices with nothing joining them to anything.
 *
 * The inverted Y of trachea into main bronchi is the single most recognisable
 * shape in a chest, and it is what makes the rest of the scene legible as an
 * airway at all. Same lesson as the R:L ratio and the per-lobe shares: a
 * structure that matters should be allocated, not hoped for.
 */
export const CENTRAL_AIRWAY_SHARE = 0.07;

/**
 * Share of each lobe's budget spent on alveolar clusters rather than branch
 * dust. Clusters are what visibly breathes, so they get the larger half.
 */
export const CLUSTER_SHARE = 0.55;

/**
 * Shortest branch worth keeping when clamped to the pleura, as a fraction of
 * its intended length. Below this it was already at the surface — a nub, not a
 * bronchus.
 */
export const MIN_STUB_FRACTION = 0.2;

/** Lung shell dimensions. The pleural surface and the airway container both use these. */
export const LUNG = {
  halfWidth: 0.175,
  /** Medial border offset from the midline — the mediastinum lives between these. */
  medialX: 0.02,
  /** Lateral limit of the boundary march; must exceed the pleural extent. */
  scanSpan: 0.42,
} as const;

/**
 * Fissure planes, as offsets from the lung's vertical centre plus the oblique's
 * slope. The horizontal fissure exists on the RIGHT ONLY — that is what
 * resolves three lobes there and two on the left.
 */
export const FISSURES = {
  /**
   * The oblique fissure, as a plane through each lung.
   *
   * IT SLOPES WITH Z, NOT X. The oblique fissure runs posterosuperior to
   * anteroinferior: high at the back, low at the front. Sloping it with lateral
   * position instead tilted it in the coronal plane, which is not a plane any
   * fissure lies in, and put a third of each lower lobe into the upper one.
   *
   * The offsets are CALIBRATED against LOBE_SHARES rather than eyeballed. Lobe
   * membership is now answered by these planes, so the two had to agree, and
   * they never had to before: shares were allocated to a particle budget by
   * fiat while the fissures were only density gaps in a drawn shell. Solving
   * for the documented proportions lands every lobe within 2.7 points and three
   * of the five within 0.2.
   */
  obliqueOffsetY: -0.02,
  obliqueSlopeZ: -0.6,
  /** The horizontal fissure. RIGHT LUNG ONLY, and near enough horizontal. */
  horizontalOffsetY: 0.1,
} as const;

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

/**
 * Fraction of the airway budget belonging to each lobe (ANATOMY.md §4).
 *
 * SUPERSEDES the flat side-split for the airways. Allocating by side alone
 * fixed the R:L ratio and left the distribution WITHIN each side to fall out of
 * branch counts — which shipped the right lower lobe, the largest lobe of the
 * lung, as the thinnest object in the scene at 13 particles. The lesson from
 * the R:L fix generalises one level down: a documented proportion should be
 * allocated, not hoped for.
 *
 * Right 53% / left 47% gives R:L 1.13, inside the documented [1.10, 1.25].
 */
export const LOBE_SHARES = {
  rul: 0.2,
  rml: 0.08,
  rll: 0.25,
  /** Includes the lingula, which is a left-upper structure, not a third lobe. */
  lul: 0.23,
  lll: 0.24,
} as const;

/**
 * Per-side length decay per generation.
 *
 * NOT COSMETIC TUNING — it corrects a real geometric shortfall. The two hila
 * are not equidistant from their pleural surfaces: the right main bronchus is
 * short and steep (28 degrees, 0.115) so its hilum sits at x = -0.054, while
 * the left is long and oblique (45 degrees, 0.175) putting its hilum at
 * x = +0.124. From there the right tree must cross 0.313 of lateral distance to
 * reach its pleura and the left only 0.228.
 *
 * With one shared decay the right tree simply cannot get there, and it did not:
 * the right lung shipped filled to 0.225 of a 0.370 half-width, leaving an
 * empty shell across its entire lateral third while the left reached 0.346.
 * That reads as a chest with one lung missing, and it is backwards — the right
 * lung is the LARGER one.
 *
 * Real anatomy compensates the same way, with longer and more numerous distal
 * branches on the right. The spec did not say so, and the generator faithfully
 * produced a hollow lung.
 */
export const LENGTH_DECAY_BY_SIDE = { right: 0.87, left: 0.76 } as const;

/**
 * The right tree runs one generation deeper than the left.
 *
 * Decay alone could not close the gap. At 0.87 against the left's 0.76 the
 * right reached 0.843 of its pleural half-width on desktop and only 0.778 on
 * the narrow preset, which runs a generation shallower to begin with — and
 * pushing decay high enough to close that would have made the right airway
 * barely taper at all, trading a hollow lung for an implausible one.
 *
 * The extra generation is the anatomically honest half of the fix: the right
 * lung is larger and does carry more distal branches, so the depth asymmetry is
 * a fact about the anatomy rather than a knob. It also fixes both presets at
 * once, where decay had to be retuned per generation count. Costs nothing at
 * render time — the budget is allocated per lobe, so this changes where
 * particles sit, not how many there are.
 */
export const EXTRA_GENERATIONS_RIGHT = 1;

/**
 * Space-colonisation parameters for the airway tree.
 *
 * WHAT REPLACED WHAT. Branches used to be steered toward a per-lobe growth axis
 * with a tunable pull. That satisfied the fill assertion and destroyed the
 * tree: every branch in a lobe pointed the same way, so the airways rendered as
 * straight rays from the carina to a knot of clusters at the far end, with
 * nothing in between. The assertion could not catch it because it measures
 * lateral EXTENT, and a single ray reaching the pleura has full extent.
 *
 * Space colonisation is the standard algorithm for this and it is the right
 * one, because it is close to how the thing actually develops: attractors are
 * scattered through the lobe, a tip grows toward the average direction of the
 * attractors near it, and attractors are consumed as they are reached. Branches
 * bifurcate where attractors pull in two directions and stop where the volume
 * is filled, so the tree fills its lobe by SUBDIVIDING rather than by reaching.
 *
 * Attractors are assigned to lobes by the fissure planes, and a lobe's tree
 * only ever sees its own — which makes "airways do not cross fissures"
 * structurally true rather than merely likely.
 */
export const COLONISATION = {
  /** Attractors scattered per lobe, before culling to the lobe's volume. */
  attractorsPerLobe: 260,
  /** A tip is influenced by attractors within this distance. */
  influenceRadius: 0.16,
  /** An attractor is consumed once a node comes this close. */
  killRadius: 0.038,
  /** How far a tip advances per iteration. */
  stepLength: 0.032,
  /** Safety bound on the growth loop. */
  maxIterations: 90,
  /** Box the attractors are drawn from, before being culled to each lobe. */
  sampleHalfX: 0.4,
  sampleMinY: -0.7,
  sampleSpanY: 1.1,
  sampleHalfZ: 0.25,
  /**
   * Fractions of a full step to try when the full one would leave the lung.
   *
   * Without this a tip simply stops as soon as a whole step would cross the
   * pleura, so the tree halts a full step short of the surface all the way
   * round and the lungs read as under-filled at their edges.
   */
  stepFallbacks: [0.55, 0.28],
  /**
   * Blend of the attractor direction with the parent's own direction.
   *
   * 0 would let a tip turn arbitrarily sharply toward whatever is nearest,
   * which produces kinked, wandering branches. Airways change direction
   * gradually, and inheriting some of the parent's heading is what keeps a
   * branch reading as a continuation of its parent rather than a new object.
   */
  parentInertia: 0.42,
} as const;

/** Recursive bifurcation below the lobar bronchi (ANATOMY.md §4). */
export const BRANCHING = {
  divergenceDeg: 34,
  divergenceJitterDeg: 8,
  /**
   * Baseline length decay per generation. Overridden per side below — see
   * lengthDecayBySide, which is where the real number lives.
   */
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
 * THE PULMONARY CIRCULATION — the reason the two organs are one figure.
 *
 * Without it the scene is a heart and a pair of lungs that happen to be drawn
 * near each other. The hila read as places where bronchi stop rather than as
 * hila, and the left atrium's posterior position — the single most deliberate
 * fact in CHAMBERS above — is unexplained, because nothing arrives there.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TWO HILAR RELATIONSHIPS, which are the whole point of drawing this
 *
 * RIGHT — EPARTERIAL. The right pulmonary artery passes ANTERIOR to the right
 * main bronchus, and the right upper lobe bronchus leaves ABOVE it. The RUL is
 * the only lobar bronchus in the body superior to its artery, which is why
 * RUL_TAKEOFF exists as an explicit branch rather than as generic recursion.
 *
 * LEFT — HYPARTERIAL. The left pulmonary artery ARCHES OVER the left main
 * bronchus, crossing from anterior to posterior as it goes, so every left lobar
 * bronchus is below its artery.
 *
 * Both are asserted against the bronchi in anatomy.test.ts rather than merely
 * commented, because a reader who knows one thing about a hilum knows this one,
 * and a figure that gets it backwards is worse than a figure without vessels.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE VEINS RUN SOMEWHERE ELSE, and that is not a stylistic choice
 *
 * Arteries travel WITH the bronchi — the bronchovascular bundle — so the
 * arterial tree is the airway tree offset by a small vector, which is what a
 * bundle is. Veins run in the INTERSEGMENTAL SEPTA, in the gaps between
 * bundles, and are grown toward attractors chosen for being far from any
 * airway. That is a real property of the drawn geometry, asserted, not a look.
 *
 * Four veins, converging on the posterior left atrium: right superior (upper +
 * middle lobes), right inferior (lower), left superior (upper), left inferior
 * (lower).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS SIMPLIFIED, said out loud
 *
 * The superior veins are drawn passing anterior to the artery at the hilum and
 * swinging posteromedially to the atrium, through the interatrial groove, which
 * is their real course. The inferior veins run posteriorly throughout, which is
 * also real. What is NOT modelled is the segmental-level interleaving: at 400 px
 * per unit H, the few millimetres separating a segmental vein from its
 * neighbouring artery is a fraction of a stroke width.
 */
export const VESSELS = {
  /**
   * The pulmonary valve — the arterial trunk's root, placed INSIDE the right
   * ventricular outflow tract.
   *
   * Inside deliberately. The trunk's first centimetre is then buried in the
   * cardiac mesh, so the arterial tree and the heart cannot visibly separate
   * when the lungs breathe and the heart does not. Geometry solving a
   * compositing problem, rather than a transform hack solving it.
   */
  mpaRoot: { x: 0.02, y: -0.185, z: 0.095 },
  /** Ascending, leftward, and posteriorly — the trunk runs UP AND BACK. */
  mpaMid: { x: 0.04, y: -0.11, z: 0.06 },
  /**
   * Where the trunk divides: below the aortic arch, just below the carina, and
   * ANTERIOR to the left atrium. Asserted against both.
   */
  mpaBifurcation: { x: 0.058, y: -0.038, z: 0.014 },
  /**
   * Right pulmonary artery, as waypoints from the bifurcation.
   *
   * Long and near-horizontal — it has the whole mediastinum to cross, which is
   * why the right main bronchus can be short and steep and the left cannot.
   * Every z is POSITIVE: the RPA passes in front of the right main bronchus,
   * which sits at z = 0.
   */
  rpa: [
    { x: -0.005, y: -0.062, z: 0.034 },
    { x: -0.052, y: -0.088, z: 0.038 },
    /** The interlobar (descending) artery, alongside the bronchus intermedius. */
    { x: -0.098, y: -0.148, z: 0.024 },
  ],
  /**
   * Left pulmonary artery — THE ARCH. Shorter, higher, and it crosses.
   *
   * The summit sits above the left main bronchus and the descent is posterior
   * to it, so the sign of z flips between the first waypoint and the last.
   * That flip is the arch, and it is what makes every left lobar bronchus
   * hyparterial.
   */
  lpa: [
    { x: 0.092, y: -0.028, z: -0.01 },
    { x: 0.132, y: -0.082, z: -0.052 },
    { x: 0.152, y: -0.15, z: -0.045 },
  ],
  /**
   * The four venous ostia, INSIDE the left atrium for the same reason the
   * arterial root is inside the right ventricle.
   *
   * Their spread is the atrium's own: two right, two left, two upper, two
   * lower, all on its posterior aspect. This is what the LA's z of -0.09 has
   * been waiting for.
   */
  ostia: {
    rspv: { x: -0.01, y: -0.048, z: -0.118 },
    ripv: { x: -0.01, y: -0.102, z: -0.118 },
    lspv: { x: 0.12, y: -0.048, z: -0.118 },
    lipv: { x: 0.12, y: -0.102, z: -0.118 },
  },
  /**
   * Hilar stems: ostium → mediastinum → first point inside the lung, per vein.
   *
   * Explicit rather than grown, because a tip starting inside the atrium has
   * nowhere to grow — every direction out of it is mediastinum, which is not
   * lung, and the containment test would refuse the first step. The stems are
   * also where the anterior/posterior difference between the superior and
   * inferior veins lives, which no growth rule would produce.
   *
   * The SUPERIOR veins pass anterior to their artery at the hilum and thread
   * back through the interatrial groove — between the right atrium and the
   * left — which is their real course and is why the middle waypoint exists.
   * The INFERIOR veins are posterior the whole way, and need no such detour.
   */
  stems: {
    // The tip is LATERAL to the right atrium, not medial to it. At x = -0.052
    // it sat inside the atrial ellipsoid — measured, the cardiac field there is
    // 0.758 of the RA's radius, comfortably within — so the right superior
    // vein's growth seed was buried in the heart, every step out of it was
    // refused by containment, and the vein grew nothing at all.
    rspv: [
      { x: -0.035, y: -0.055, z: -0.035 },
      { x: -0.125, y: -0.08, z: 0.06 },
    ],
    // Lateral to the right atrium as well, and for the same reason as the
    // superior vein above. At x = -0.078 the tip sat in the pocket immediately
    // behind the atrium: not inside it, but with the chamber filling every
    // direction the vein needed to grow, so it advanced two steps and wedged.
    ripv: [
      { x: -0.055, y: -0.13, z: -0.095 },
      { x: -0.13, y: -0.185, z: -0.08 },
    ],
    lspv: [
      { x: 0.135, y: -0.055, z: -0.05 },
      { x: 0.14, y: -0.062, z: 0.01 },
    ],
    lipv: [
      { x: 0.148, y: -0.128, z: -0.092 },
      { x: 0.17, y: -0.16, z: -0.075 },
    ],
  },
  /** Which lobes drain to which vein. The right superior takes two. */
  venousTerritory: {
    rspv: ["rul", "rml"],
    ripv: ["rll"],
    lspv: ["lul"],
    lipv: ["lll"],
  },
  /**
   * How far the artery sits from the bronchus it accompanies, per side.
   *
   * Mirrors the hilar relationship outward: anterior and slightly inferior on
   * the right, posterior and slightly superior on the left. Constant, because
   * a bundle IS two structures a fixed small distance apart — and because a
   * varying offset makes the arterial tree wander off its bronchus, which is
   * the one thing a bronchovascular bundle never does.
   *
   * 0.016 units is 6.4 scene pixels against strokes of 1.5 to 1.9: far enough
   * apart to read as two vessels, close enough to read as one bundle.
   */
  bundleOffset: {
    right: { x: 0, y: -0.008, z: 0.014 },
    left: { x: 0, y: 0.008, z: -0.014 },
  },
  /**
   * Fractions of the offset to try when the full one would leave the lung.
   *
   * A bronchus already against the pleura has nowhere to put a vessel outside
   * it. Shrinking keeps the arterial tree connected where dropping the segment
   * would leave its children floating, and it is what happens anyway: bronchus
   * and artery converge as the bundle runs out of room. The final 0 is the
   * degenerate case — the artery drawn on top of its bronchus.
   */
  bundleFallbacks: [1, 0.5, 0.25, 0],
  /**
   * Deepest airway generation an artery is drawn alongside.
   *
   * Not anatomy — arteries accompany bronchi to the terminal bronchiole. It is
   * a legibility ceiling, and the same one the trachea/airway split answers:
   * drawn to the full depth the arterial tree is a translated copy of the
   * airway, which at 6 px of offset reads as a drop shadow rather than as a
   * second system. Through generation 10 it covers 729 of 1,597 segments —
   * the whole proximal half, where a pulmonary artery has a name.
   */
  arteryMaxGeneration: 10,
  /**
   * THE INTERSEGMENTAL SEPTA, operationally: candidates are scattered through
   * each vein's territory and only the furthest-from-any-bronchus survive.
   *
   * RANKED, NOT THRESHOLDED, and the difference was visible. An absolute
   * clearance sounds like the same thing and is not, because the two lungs are
   * not equally full: the right tree runs a generation deeper and decays more
   * slowly — deliberately, see LENGTH_DECAY_BY_SIDE — so almost nowhere in the
   * right upper lobe cleared a fixed 0.052, and the right superior vein grew
   * about six segments while the left grew two hundred. Rendered, the chest had
   * veins down one side only.
   *
   * A septum is not a fixed distance from a bronchus. It is wherever is
   * furthest from the bundles AROUND IT, and how far that is depends on how
   * closely those bundles are spaced. Keeping the top fraction says exactly
   * that, and it balances the two sides by construction rather than by a
   * constant tuned until they matched.
   */
  candidatesPerVein: 900,
  /**
   * The calibre ramp, 0 at a trunk and 1 at the finest twig.
   *
   * Carried on every segment and not currently rendered — see MeshEdge.depth
   * for why a depth band can only have one stroke width. It lives here rather
   * than in vessels.ts because it is a property of the vessels, and this file
   * is the only place such numbers may live.
   */
  taper: {
    /** End of the pulmonary trunk, where it divides. */
    hilar: 0.08,
    /** End of the hilar arteries, and the calibre every lobar artery starts at. */
    lobar: 0.25,
    /** End of the venous stems, where the grown tree takes over. */
    stem: 0.2,
    /** Added per venous generation beyond the stem. */
    perVenousGeneration: 0.06,
  },
  /** Fraction of candidates kept — the most septal quarter of each territory. */
  septalFraction: 0.26,
  /**
   * Growth parameters. Coarser than the airway's, deliberately.
   *
   * A venous tree drawn at bronchial density would double the visual noise of
   * each lobe for no gain — the veins are there to be READ as a second system
   * running in the gaps, and a second system as fine as the first reads as one
   * system twice as dense. Longer steps and a wider kill radius give a sparser,
   * straighter tree, which is also closer to what a pulmonary vein looks like:
   * fewer, larger tributaries than the bronchus beside it.
   */
  growth: {
    // LOCAL. At 0.17 a tip could see most of its lobe, so it grew one long
    // snake toward the far side instead of branching into the territory
    // beside it, and the veins rendered as strands rather than as trees.
    influenceRadius: 0.11,
    killRadius: 0.045,
    stepLength: 0.034,
    maxIterations: 70,
    parentInertia: 0.5,
  },
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
    /**
     * How the cut deepens across the band: 0 at both ends, deepest at this
     * fraction of the way up from bottomY.
     *
     * The notch was a RECTANGLE — a constant-x wall across a fixed y band,
     * which is what §5's table literally specifies and which, rendered, looks
     * exactly like what it is: a drafting box cut out of the left lung, with
     * two right angles where a heart border should curve. A cardiac notch is a
     * smooth concavity. This keeps the spec's maximum depth, at one height, and
     * eases to nothing at the top and bottom of the band.
     */
    deepestAtFraction: 0.38,
    /**
     * The notch exists only ANTERIOR to this depth.
     *
     * It was cut through the full thickness of the lung, which is wrong: the
     * heart lies against the ANTERIOR left lung, and the posterior left lung
     * runs medially BEHIND it, down to the descending aorta and the spine.
     * A full-depth cut removes lung that is really there — and hides the one
     * fact the notch is supposed to convey, that the heart sits in FRONT.
     *
     * -0.05 sits just behind the left ventricle (z +0.005), so the notch opens
     * on the anterior shells and closes on the posterior one. That difference
     * between shells is depth information a particle cloud could not carry and
     * a stroked shell shows for free.
     */
    anteriorZ: -0.05,
  },
  /**
   * Right lung exceeds left by 10-25%: the heart displaces the left.
   *
   * Governs the ENVELOPE only. The airway tree is allocated per lobe against
   * LOBE_SHARES, which supersedes this for airways and lands R:L at 1.13.
   */
  rightLeftParticleRatio: 1.18,
  /** Costophrenic angles are sharp. Asserted below 45 degrees, both sides. */
  costophrenicAngleDeg: 32,
  /**
   * Thoracic wall profile, as superellipse exponents: |dx|^n + |dy|^n + |dz|^n.
   *
   * TWO EXPONENTS, because a chest is round at the top and square at the
   * bottom. A plain ellipse (n = 2) has no straight wall anywhere, so it cannot
   * produce a costophrenic angle at all — the base is an arc, and an arc has no
   * corner. Pushing a single exponent up to 8 gives the vertical lower wall the
   * angle needs, and then removes the apical dome with it: measured, the lung
   * at y = +0.30 was 94% as wide as at y = -0.30, a column rather than a chest.
   *
   * Splitting them gives both. Above the shell's centre the profile stays
   * rounded, tapering the apex to 57% of mid-lung width; below it the wall runs
   * near-vertical down to the diaphragm.
   */
  /**
   * Where the dome sits, as a fraction of the way from the mediastinal border
   * to the chest wall. The central tendon, and where the cardiac apex rests.
   */
  diaphragmDomeLat: 0.4,
  wallExponentUpper: 2.5,
  wallExponentLower: 4,
  /**
   * How sharply the diaphragm falls from its dome to the costophrenic angle.
   *
   * The costophrenic angle is the angle between a vertical chest wall and the
   * diaphragm, so it is set by the diaphragm's SLOPE where the two meet. A
   * quadratic falloff over the FULL width met the wall at ~64 degrees, blunted,
   * which on a pediatric film is the cardinal sign of an effusion.
   *
   * 1.8 rather than the 6.5 that a monotonic profile needed: the fall now runs
   * from the dome at 0.4 to the chest wall rather than across the whole width,
   * so the same drop happens over 60% of the distance and needs far less
   * curvature. Delivers 30 degrees on the right and 34 on the left, bracketing
   * the 32 documented above, with the two angles exactly 0.015 apart.
   */
  diaphragmFalloffPower: 1.8,
  /**
   * Depths at which each lung's surface is drawn as a stroked outline.
   *
   * Three per lung, six in the scene, replacing ~110 particles. The old shell
   * was a particle cloud asked to carry two lung surfaces, three fissures, two
   * costophrenic angles and the cardiac notch at once — and the notch, which §5
   * calls the single most important silhouette feature, came out described by
   * FIVE PARTICLES. It was geometrically correct and simply invisible.
   *
   * Because the cross-section narrows with |z|, the three outlines nest: the
   * posterior and anterior shells draw at ~78% of the mid shell's size. That
   * nesting is what reads as a volume rather than a sticker.
   */
  shellDepths: [-0.14, 0, 0.14],
  /** Stroke break at a fissure, in anatomy units. */
  fissureGap: 0.012,
} as const;

/**
 * The thymus (ANATOMY.md §6) — prominent in young children, involutes with age.
 * The single clearest signal that this is a CHILD's chest and not a small
 * adult's, and simultaneously a legibility risk.
 *
 * DEFAULT OFF. Founder decision at the Phase 2 gate, on a real render.
 */
export const THYMUS = {
  /**
   * OFF, and staying off. Confirmed with evidence rather than taste: the
   * envelope has ~110 particles to carry two lung shells, three fissures, two
   * costophrenic angles and the cardiac notch — the notch alone ends up
   * described by 5 particles. A translucent veil in FRONT of all that would
   * spend budget the silhouette cannot spare.
   */
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
 * The beats-per-breath ratio is deliberately NON-INTEGER (3200/741 ≈ 4.32) so
 * the two rhythms never lock into a mechanical pattern. Asserted.
 */
export const RHYTHM = {
  // 3200 ms = 18.75/min, correctly in the school-age range (18-30). The
  // original 3400 (17.6/min) was adolescent. 3200/741 = 4.32 beats per breath,
  // still comfortably non-integer (review item 8).
  breathMs: 3200,
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
  /**
   * Breathing is DIAPHRAGMATIC, and anisotropic because of it.
   *
   * A single radial scale about the carina was the first attempt and it reads
   * as a zoom rather than a breath: everything grows together, including the
   * pleura, so nothing moves relative to anything else and the eye sees the
   * camera pushing in. Rendered as a filmstrip that is unmistakable.
   *
   * A child breathes mostly with the diaphragm. The apex barely moves; the
   * bases descend. So the expansion is anchored AT THE LUNG APEX and is mostly
   * vertical, with a small lateral component for the ribs. The bases then
   * travel about 0.055 of the lung field on inspiration while the apex stays
   * put, which is what the motion actually looks like.
   */
  breathScaleVertical: 0.055,
  breathScaleLateral: 0.018,
  /**
   * How far the heart DESCENDS on inspiration, in anatomy units.
   *
   * The heart used to be the one system the breath did not touch, and nothing
   * on screen contradicted that because nothing visibly joined it to the lungs.
   * The pulmonary vessels do: the trunk leaves the right ventricle and the four
   * veins enter the left atrium, so a stationary heart beside a chest whose
   * hila rise and fall by ten pixels tears the vessels apart at both ends.
   *
   * The honest fix is not to pin the vessels — it is that A HEART MOVES WITH
   * THE BREATH. It rests on the diaphragm and is tethered above by the great
   * vessels, so inspiration carries it down; the change in cardiac silhouette
   * between an inspiratory and an expiratory film is the everyday evidence,
   * and it is why a chest X-ray is taken at full inspiration.
   *
   * 0.025 is ~5 mm at this scale (unit H ≈ 20 cm in a school-age child) and is
   * the excursion of quiet tidal breathing, not of a deep breath. It also lands
   * within about two pixels of where the breath scale carries the hilum, so the
   * vessels stay joined at both ends without either end being pinned to the
   * other — the geometry agrees rather than being made to agree.
   */
  breathCardiacDescent: 0.025,
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
  // envelope: 0 PARTICLES — the pleural surfaces are six stroked paths now, and
  // the ~110 particles they used to cost went to the airways and the heart,
  // which is where the hollow right lung was. The six paths are still rendered
  // elements and are charged against `total`, so airways + heart come to 544 on
  // desktop and 274 on narrow, not the full budget.
  desktop: { total: 550, airways: 316, heart: 228, envelope: 0, generations: 6 },
  narrow: { total: 280, airways: 158, heart: 116, envelope: 0, generations: 5 },
} as const;

export type Preset = keyof typeof BUDGET;

/** Seeded so every visitor sees the same chest and tests are stable. */
export const DEFAULT_SEED = 0x7c0a_11de;
