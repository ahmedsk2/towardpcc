import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { albuminGdl, calciumMgdl } from "../units/calcium";

/**
 * Albumin-adjusted ("corrected") total calcium — Payne et al. 1973 (BMJ).
 * A unit transformation of a lab value, NOT a diagnostic score: it estimates
 * what the total calcium would be at a normal albumin, so the number is read
 * against the ordinary total-calcium reference range. Implemented with the
 * de-facto clinical coefficient (0.8 mg/dL per g/dL, = 0.02 mmol/L per g/L),
 * which is a later rounding of Payne's printed slope of 1.0 (0.025). There are
 * NO interpretation bands. Ionized calcium is the reference method in critical
 * illness. Research + full sourcing: docs/research/scores/corrected-calcium.md.
 */
export const correctedCalcium = defineScore({
  id: "corrected-calcium",
  slug: "corrected-calcium",
  name: "Corrected calcium for albumin",
  version: "1.0.0",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "measuredCalcium",
      label: defineText("cca.ca", "Measured total calcium"),
      required: true,
      type: "numeric",
      unit: calciumMgdl,
      // Input-validity bounds spanning severe hypo-/hypercalcemia, not cited
      // clinical thresholds (corrected-calcium.md Inputs: sanity limits).
      min: 4,
      max: 20,
      helpText: defineText(
        "cca.ca.help",
        "Total (not ionized) serum calcium. Accepts mg/dL or mmol/L.",
      ),
    },
    {
      id: "albumin",
      label: defineText("cca.alb", "Serum albumin"),
      required: true,
      type: "numeric",
      unit: albuminGdl,
      // Input-validity bounds, not cited clinical thresholds
      // (corrected-calcium.md Inputs: sanity limits; normal ~3.5–5.0 g/dL).
      min: 1,
      max: 6,
      helpText: defineText("cca.alb.help", "Serum albumin. Accepts g/dL or g/L."),
    },
  ] as const,
  // A transformed lab value read against the total-calcium reference range —
  // it carries no intrinsic risk stratification, so there are NO bands
  // (corrected-calcium.md Interpretation bands: "The correction itself has NO
  // interpretation bands.").
  interpretation: [],
  references: [
    {
      citation:
        "Payne RB, Little AJ, Williams RB, Milner JR. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J. 1973;4(5893):643–646.",
      pmid: "4758544",
      doi: "10.1136/bmj.4.5893.643",
    },
    {
      citation:
        "Steele T, Kolamunnage-Dona R, Downey C, Toh CH, Welters I. Albumin-adjusted calcium concentration should not be used to identify hypocalcaemia in critical illness. Crit Care. 2013;17(Suppl 2):P446.",
      doi: "10.1186/cc12384",
    },
    {
      citation:
        "Roizen JD, Shah V, Levine MA, Carlow DC. Determination of Reference Intervals for Serum Total Calcium in the Vitamin D-Replete Pediatric Population. J Clin Endocrinol Metab. 2013;98(12):E1946–E1950.",
      pmid: "24217904",
      doi: "10.1210/jc.2013-3105",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: albumin-corrected calcium (Payne, de-facto 0.8/0.02 coefficient); no bands.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Linear arithmetic transformation of two lab values with a numeric coefficient (0.8/0.02) and reference constant (4.0 g/dL); facts and mathematics, no proprietary scale text (corrected-calcium.md IP status).",
  },
  formula: defineText(
    "cca.formula",
    "Corrected calcium (mg/dL) = measured total calcium + 0.8 × (4.0 − serum albumin in g/dL). In SI units: corrected calcium (mmol/L) = measured + 0.02 × (40 − albumin in g/L). 4.0 g/dL (40 g/L) is the reference-normal albumin at which no correction is applied; below it the correction raises an artefactually low total calcium, above it it lowers it. The 0.8 (0.02) coefficient is the widely used rounded form of Payne's original 1.0 (0.025) slope.",
  ),
  notes: defineText(
    "cca.notes",
    "No interpretation bands: the output is a transformed lab value read against the ordinary total-calcium reference range, which is age-specific in children (Roizen 2013, PMID 24217904). Do not attach an automated normal/abnormal verdict. Headline caveat: the correction is unreliable in critical illness and does not track ionized calcium well (Steele 2013: adjusted Ca <2.2 mmol/L had only 78% sensitivity / 63% specificity, AUC 0.78 for ionized hypocalcemia) — direct ionized calcium is the reference standard in the critically ill, acid-base disturbance, after citrate-containing transfusion, or with rapid albumin shifts. The albumin–calcium binding constant is not fixed, so a fixed linear coefficient overestimates ionized calcium at low albumin. The 0.8 (0.02) coefficient is a rounded convention of Payne's printed 1.0 (0.025) slope: for Ca 7.6 mg/dL / albumin 2.0 g/dL the two forms differ by 0.4 mg/dL (9.2 vs 9.6). The slope is assay- and population-specific (bromocresol green vs purple albumin methods differ; locally validated equations are recommended), and the reference albumin (4.0 g/dL) may be replaced by a local mean normal albumin. Payne's derivation cohort was 200 adults with no ionized-calcium validation — there is no pediatric-specific derivation, so applying it to neonates/unstable children is an extrapolation (prefer ionized calcium). [NEEDS SOURCE] for a fetched pediatric albumin reference interval, a fetched primary pediatric ionized-calcium interval, and the reported (unverified) low sensitivity in trauma.",
  ),
  calculate: (values) => {
    // Reference-normal albumin at which no correction is applied. 4.0 g/dL
    // (= 40 g/L) is the Payne default (corrected-calcium.md §Formula A); some
    // labs substitute a local mean normal albumin (see notes).
    const REFERENCE_ALBUMIN_GDL = 4.0;
    // De-facto standard coefficient: 0.8 mg/dL of calcium added per 1 g/dL that
    // albumin falls below reference — the rounded form of Payne's original 1.0
    // (corrected-calcium.md §Formula A/§C).
    const COEFFICIENT = 0.8;
    // Canonical units: calcium mg/dL, albumin g/dL. Return the RAW value;
    // `precision` rounds for display only. No bands, so nothing is matched.
    const corrected =
      values.measuredCalcium.value + COEFFICIENT * (REFERENCE_ALBUMIN_GDL - values.albumin.value);
    return [
      {
        id: "corrected_calcium",
        label: defineText("cca.output", "Albumin-corrected calcium"),
        value: corrected,
        unit: "mg/dL",
        precision: 1,
      },
    ];
  },
});
