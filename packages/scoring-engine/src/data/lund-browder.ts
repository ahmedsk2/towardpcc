import { defineText, type LocalizedText } from "../i18n/text";

/**
 * The Lund-Browder body-surface-area chart: the age-adjusted %TBSA table a
 * child's burn must be assessed with instead of the Rule of Nines.
 *
 * WHAT THIS MODULE IS AND IS NOT. It is the table, its age-band mapping and
 * four lookups over it — verified data, available to any future surface that
 * wants it. It is NOT wired into `burn-resuscitation`'s `calculate`, which
 * still takes %TBSA as a single number the clinician has already estimated.
 * Whether the calculator grows a per-segment picker is a product decision that
 * has not been taken.
 *
 * ── PROVENANCE, STATED EXACTLY — EACH FACT WITH ITS OWN SOURCE ───────────────
 *
 * These cells are **after Lund & Browder (1944), as reproduced in the US DoD
 * Joint Trauma System Burn Care CPG Lund Browder Burn Estimate & Diagram
 * worksheets**. Three things below are known to three different depths, from
 * three different sources, so each is attributed on its own. Merging them into
 * one sentence would lend the weakest of them the standing of the strongest.
 *
 * 1. **The cells, and the per-form dates — from the implementation reference
 *    note** (`docs/research/scores/burn-resuscitation.md`, compiled
 *    2026-08-03), which records the three worksheets read in full: Infant
 *    (July 2025) supplying the age-0 column, Pediatric (June 2025) supplying
 *    ages 1/5/10/15, and Adult (June 2025) supplying the adult column and its
 *    printed total of 100. Those three dates are worksheet dates, not the
 *    CPG's.
 *
 * 2. **The CPG identifier and its own date — checked live, NOT from that
 *    note.** The JTS CPG index at jts.health.mil lists Burn Care as CPG ID 12
 *    dated 10 June 2025 and carries all three worksheets; that was read
 *    directly at jts.health.mil on 2026-08-03. The reference note gives no
 *    CPG-level date at all — only the per-form dates in (1) — so this date
 *    must not be written as though it came from the note.
 *
 * 3. **The 1944 original — not obtained.** Lund CC, Browder NC, "The
 *    estimation of areas of burns", Surg Gynecol Obstet 1944;79:352-358 is the
 *    source of record, but SGO vol. 79 is not digitised in any reachable open
 *    repository, and no copy was read here. What is verified is the modern
 *    reproduction. The attribution therefore stays "after Lund & Browder
 *    (1944), as reproduced in the JTS worksheets", never a bare claim on the
 *    1944 paper. Specifically unconfirmed: whether the 19-row tabular layout
 *    below appears *in that form* in 1944 — the 1944 publication is generally
 *    described as presenting body diagrams with an A/B/C growth inset, and the
 *    expanded table may be a later reformatting for worksheet use. Do NOT
 *    upgrade the attribution without obtaining and checking that PDF.
 *
 * Two independent reproductions agree with the JTS worksheets cell for cell:
 * the Vanderbilt (Monroe Carell) paediatric burn fluid resuscitation protocol,
 * March 2025 (all five paediatric columns) and Wayne State University Surgery
 * Burn Protocol #23 (the 15-year and adult columns).
 *
 * ── THE TWO TRANSCRIPTION DEFECTS THIS TABLE IS FREE OF ──────────────────────
 *
 * Most Lund-Browder charts in circulation sum to **101%**, and the tests over
 * this module exist to prove this one does not.
 *
 * 1. **The hand.** Lundin & Alsbjørn (Burns 2013;39(4):819-820, PMID 22980775)
 *    traced the 101% charts to a typographic error predating the chart's spread
 *    online: one aspect of each hand is 1.25%, not 1.5%. The inflated version
 *    adds 0.25 per aspect x 2 aspects x 2 hands = +1.0 in *every* column. Each
 *    hand here is 2.5, never 3.
 * 2. **The thigh at 10-14 years.** Some reproductions print half-a-thigh at age
 *    10 as 4.5 rather than 4.25, making each thigh 9 instead of 8.5 and pushing
 *    the 10-year column alone to 101. Miminas (Wounds UK 2007;3(3):58-68) has
 *    4.25, which is the value that closes at 100 — and is what is used here.
 *
 * A third, heavily degraded variant (traced to a scanned teaching handout)
 * carries several errors at once: trunk-front 17 in the 1-4 band, buttocks and
 * hands 2 instead of 2.5, head 10 instead of 11 at 10-14. The standing rule is
 * to sum any Lund-Browder chart before trusting it; `lundBrowderBandTotal`
 * exists so that is one call.
 *
 * ── SHAPE ────────────────────────────────────────────────────────────────────
 *
 * Percentages are **per side**: each cell is one limb, not the pair. Both hands
 * together are 5%, and both legs of an adult are 40% (2 x [9.5 + 7 + 3.5]).
 * "Lower leg" is knee to ankle, exclusive of the foot; "forearm" is elbow to
 * wrist, exclusive of the hand.
 *
 * Growth is redistributed entirely between the head and the lower limbs — head
 * -12, thighs +8 (4 each), lower legs +4 (2 each) across birth to adult — which
 * nets to zero and is why every column closes at exactly 100. Every value is a
 * multiple of 0.5 and therefore exact in binary floating point, so the column
 * totals are asserted with `toBe(100)`, not a tolerance.
 *
 * Only numbers are reproduced. The chart's body diagrams and the worksheet
 * layout are copyrightable expression and are not copied; the segment labels
 * below are this project's own anatomical wording.
 *
 * Research note: docs/research/scores/burn-resuscitation.md.
 */

/** Column keys, in ascending age order. */
export const LUND_BROWDER_BAND_KEYS = ["0", "1", "5", "10", "15", "adult"] as const;

export type LundBrowderBandKey = (typeof LUND_BROWDER_BAND_KEYS)[number];

export interface LundBrowderAgeBand {
  readonly key: LundBrowderBandKey;
  readonly label: LocalizedText;
  /** Inclusive lower edge, completed months. */
  readonly minMonths: number;
  /** Exclusive upper edge, completed months. `null` = open-ended (adult). */
  readonly maxMonths: number | null;
}

/**
 * The chart labels its columns as POINT ages (0, 1, 5, 10, 15, adult); the JTS
 * worksheets label the identical columns as BANDS (0-1, 1-4, 5-9, 10-14, 15).
 * Same numbers, different labels — so bands are what is implemented, and a
 * 3-year-old takes the "1" column while a 7-year-old takes the "5" column.
 */
export const LUND_BROWDER_AGE_BANDS: readonly LundBrowderAgeBand[] = [
  {
    key: "0",
    label: defineText("lundBrowder.band.0", "Birth to under 1 year"),
    minMonths: 0,
    maxMonths: 12,
  },
  {
    key: "1",
    label: defineText("lundBrowder.band.1", "1 to under 5 years"),
    minMonths: 12,
    maxMonths: 60,
  },
  {
    key: "5",
    label: defineText("lundBrowder.band.5", "5 to under 10 years"),
    minMonths: 60,
    maxMonths: 120,
  },
  {
    key: "10",
    label: defineText("lundBrowder.band.10", "10 to under 15 years"),
    minMonths: 120,
    maxMonths: 180,
  },
  {
    key: "15",
    label: defineText("lundBrowder.band.15", "15 to under 16 years"),
    minMonths: 180,
    maxMonths: 192,
  },
  {
    key: "adult",
    label: defineText("lundBrowder.band.adult", "16 years and over"),
    minMonths: 192,
    maxMonths: null,
  },
];

export interface LundBrowderSegment {
  readonly id: string;
  readonly label: LocalizedText;
  /**
   * True for the five rows that move with age — head, both thighs, both lower
   * legs. The other fourteen are constant across all six columns, and a test
   * asserts that count in both directions so a value silently made age-varying
   * (or silently frozen) fails.
   */
  readonly variable: boolean;
  /** Percent of total body surface area, per side for paired segments. */
  readonly values: Readonly<Record<LundBrowderBandKey, number>>;
}

export const LUND_BROWDER_SEGMENTS: readonly LundBrowderSegment[] = [
  {
    id: "head",
    label: defineText("lundBrowder.segment.head", "Head"),
    variable: true,
    values: { "0": 19, "1": 17, "5": 13, "10": 11, "15": 9, adult: 7 },
  },
  {
    id: "neck",
    label: defineText("lundBrowder.segment.neck", "Neck"),
    variable: false,
    values: { "0": 2, "1": 2, "5": 2, "10": 2, "15": 2, adult: 2 },
  },
  {
    id: "trunk_anterior",
    label: defineText("lundBrowder.segment.trunkAnterior", "Trunk, front"),
    variable: false,
    values: { "0": 13, "1": 13, "5": 13, "10": 13, "15": 13, adult: 13 },
  },
  {
    id: "trunk_posterior",
    label: defineText("lundBrowder.segment.trunkPosterior", "Trunk, back"),
    variable: false,
    values: { "0": 13, "1": 13, "5": 13, "10": 13, "15": 13, adult: 13 },
  },
  {
    id: "buttock_right",
    label: defineText("lundBrowder.segment.buttockRight", "Buttock, right"),
    variable: false,
    values: { "0": 2.5, "1": 2.5, "5": 2.5, "10": 2.5, "15": 2.5, adult: 2.5 },
  },
  {
    id: "buttock_left",
    label: defineText("lundBrowder.segment.buttockLeft", "Buttock, left"),
    variable: false,
    values: { "0": 2.5, "1": 2.5, "5": 2.5, "10": 2.5, "15": 2.5, adult: 2.5 },
  },
  {
    id: "genitalia",
    label: defineText("lundBrowder.segment.genitalia", "Genitalia and perineum"),
    variable: false,
    values: { "0": 1, "1": 1, "5": 1, "10": 1, "15": 1, adult: 1 },
  },
  {
    id: "upperarm_right",
    label: defineText("lundBrowder.segment.upperarmRight", "Upper arm, right (shoulder to elbow)"),
    variable: false,
    values: { "0": 4, "1": 4, "5": 4, "10": 4, "15": 4, adult: 4 },
  },
  {
    id: "upperarm_left",
    label: defineText("lundBrowder.segment.upperarmLeft", "Upper arm, left (shoulder to elbow)"),
    variable: false,
    values: { "0": 4, "1": 4, "5": 4, "10": 4, "15": 4, adult: 4 },
  },
  {
    id: "forearm_right",
    label: defineText("lundBrowder.segment.forearmRight", "Forearm, right (elbow to wrist)"),
    variable: false,
    values: { "0": 3, "1": 3, "5": 3, "10": 3, "15": 3, adult: 3 },
  },
  {
    id: "forearm_left",
    label: defineText("lundBrowder.segment.forearmLeft", "Forearm, left (elbow to wrist)"),
    variable: false,
    values: { "0": 3, "1": 3, "5": 3, "10": 3, "15": 3, adult: 3 },
  },
  {
    id: "hand_right",
    label: defineText("lundBrowder.segment.handRight", "Hand, right"),
    variable: false,
    values: { "0": 2.5, "1": 2.5, "5": 2.5, "10": 2.5, "15": 2.5, adult: 2.5 },
  },
  {
    id: "hand_left",
    label: defineText("lundBrowder.segment.handLeft", "Hand, left"),
    variable: false,
    values: { "0": 2.5, "1": 2.5, "5": 2.5, "10": 2.5, "15": 2.5, adult: 2.5 },
  },
  {
    id: "thigh_right",
    label: defineText("lundBrowder.segment.thighRight", "Thigh, right (hip to knee)"),
    variable: true,
    values: { "0": 5.5, "1": 6.5, "5": 8, "10": 8.5, "15": 9, adult: 9.5 },
  },
  {
    id: "thigh_left",
    label: defineText("lundBrowder.segment.thighLeft", "Thigh, left (hip to knee)"),
    variable: true,
    values: { "0": 5.5, "1": 6.5, "5": 8, "10": 8.5, "15": 9, adult: 9.5 },
  },
  {
    id: "leg_right",
    label: defineText("lundBrowder.segment.legRight", "Lower leg, right (knee to ankle)"),
    variable: true,
    values: { "0": 5, "1": 5, "5": 5.5, "10": 6, "15": 6.5, adult: 7 },
  },
  {
    id: "leg_left",
    label: defineText("lundBrowder.segment.legLeft", "Lower leg, left (knee to ankle)"),
    variable: true,
    values: { "0": 5, "1": 5, "5": 5.5, "10": 6, "15": 6.5, adult: 7 },
  },
  {
    id: "foot_right",
    label: defineText("lundBrowder.segment.footRight", "Foot, right"),
    variable: false,
    values: { "0": 3.5, "1": 3.5, "5": 3.5, "10": 3.5, "15": 3.5, adult: 3.5 },
  },
  {
    id: "foot_left",
    label: defineText("lundBrowder.segment.footLeft", "Foot, left"),
    variable: false,
    values: { "0": 3.5, "1": 3.5, "5": 3.5, "10": 3.5, "15": 3.5, adult: 3.5 },
  },
];

/**
 * Age in completed months → the chart column that applies, or `null` when no
 * column does.
 *
 * REJECTS RATHER THAN CLAMPS. A negative or non-finite age returns `null`;
 * it is never quietly rounded up into the infant column, because a chart
 * silently applied to an age it was not selected for is exactly the failure a
 * clinician cannot see. There is deliberately no upper rejection: the adult
 * band is open-ended by construction, so every age at or past 16 years has a
 * column.
 */
export function lundBrowderBandForAgeMonths(ageMonths: number): LundBrowderBandKey | null {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) return null;
  let key: LundBrowderBandKey = "0";
  for (const band of LUND_BROWDER_AGE_BANDS) {
    if (ageMonths >= band.minMonths) key = band.key;
  }
  return key;
}

/** One segment's percentage in one column, or `null` for an unknown segment. */
export function lundBrowderPercent(segmentId: string, band: LundBrowderBandKey): number | null {
  const segment = LUND_BROWDER_SEGMENTS.find((s) => s.id === segmentId);
  return segment ? segment.values[band] : null;
}

/**
 * Total %TBSA for a set of burned segments in one column.
 *
 * Deduplicates, so naming a segment twice cannot push the total past 100, and
 * THROWS on an unknown id rather than skipping it — a mistyped segment would
 * otherwise under-count the burn, and an under-counted burn under-resuscitates.
 */
export function lundBrowderTbsaPercent(
  segmentIds: Iterable<string>,
  band: LundBrowderBandKey,
): number {
  let total = 0;
  for (const id of new Set(segmentIds)) {
    const percent = lundBrowderPercent(id, band);
    if (percent === null) {
      throw new Error(`lundBrowderTbsaPercent: unknown Lund-Browder segment "${id}".`);
    }
    total += percent;
  }
  return total;
}

/** Column total. Exactly 100 for every column, in a correct chart. */
export function lundBrowderBandTotal(band: LundBrowderBandKey): number {
  return LUND_BROWDER_SEGMENTS.reduce((sum, segment) => sum + segment.values[band], 0);
}
