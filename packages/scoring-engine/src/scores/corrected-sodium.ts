import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { electrolyteMeqL } from "../units/electrolytes";
import { glucoseMgdl } from "../units/osmolytes";

/**
 * Corrected sodium for hyperglycemia — the two standard linear corrections that
 * estimate the serum sodium that would be present if glucose were normal
 * (100 mg/dL), unmasking the patient's true sodium status behind
 * translocational ("dilutional") hyponatremia. Both published factors are
 * emitted side by side: Katz (1973) 1.6 mEq/L per 100 mg/dL and Hillier (1999)
 * 2.4 mEq/L per 100 mg/dL. Neither is a diagnostic score nor a treatment
 * threshold, so there are no interpretation bands.
 *
 * Both factors are ADULT-DERIVED (see notes). Research + full sourcing:
 * docs/research/scores/corrected-sodium.md.
 */
export const correctedSodium = defineScore({
  id: "corrected-sodium",
  slug: "corrected-sodium",
  name: "Corrected sodium for hyperglycemia",
  tagline: defineText(
    "corrected-sodium.tagline",
    "Measured sodium adjusted for hyperglycaemia, by both published factors",
  ),
  version: "1.0.1",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "measured_na",
      label: defineText("corrected-sodium.measured_na", "Measured serum sodium"),
      required: true,
      type: "numeric",
      unit: electrolyteMeqL,
      // Input-validity bounds, not a cited clinical threshold. corrected-sodium.md
      // §Inputs marks Na ~90–180 mEq/L as data-entry sanity guards ([NEEDS SOURCE]
      // for an authoritative pediatric reference interval).
      min: 90,
      max: 180,
      helpText: defineText(
        "corrected-sodium.measured_na.help",
        "Serum sodium as reported by the lab. mEq/L and mmol/L are numerically identical (sodium is monovalent).",
      ),
    },
    {
      id: "glucose",
      label: defineText("corrected-sodium.glucose", "Serum glucose"),
      required: true,
      type: "numeric",
      unit: glucoseMgdl,
      // Input-validity bounds, not a cited clinical threshold. corrected-sodium.md
      // §Inputs marks glucose 0–~2000 mg/dL as data-entry sanity guards
      // ([NEEDS SOURCE] for an authoritative critical-value source).
      min: 0,
      max: 2000,
      helpText: defineText(
        "corrected-sodium.glucose.help",
        "Serum glucose in mg/dL (accepts mmol/L, ×18). The correction applies only above the 100 mg/dL reference.",
      ),
    },
  ] as const,
  // No bands: a corrected laboratory value is not an ordinal score. Katz 1973 and
  // Hillier 1999 define a correction, not a graded scale, so there is nothing to
  // band (corrected-sodium.md §Interpretation). Read against the ordinary
  // serum-sodium reference frame instead.
  interpretation: [],
  references: [
    {
      citation:
        "Katz MA. Hyperglycemia-induced hyponatremia — calculation of expected serum sodium depression. N Engl J Med. 1973;289(16):843–844.",
      pmid: "4763428",
      doi: "10.1056/NEJM197310182891607",
    },
    {
      citation:
        "Hillier TA, Abbott RD, Barrett EJ. Hyponatremia: evaluating the correction factor for hyperglycemia. Am J Med. 1999;106(4):399–403.",
      pmid: "10225241",
      doi: "10.1016/S0002-9343(99)00055-8",
    },
    {
      citation:
        "MDCalc / Scholastica. Sodium Correction for Hyperglycemia. Independent reproduction of both formulas (Katz +0.016·(glucose−100); Hillier +0.024·(glucose−100)) with the 100 mg/dL reference.",
      url: "https://mdcalc.scholasticahq.com/article/143117-sodium-correction-for-hyperglycemia",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-09-03",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.0.1",
      date: "2026-09-06",
      summary:
        "Added a one-line description for the catalogue card. No rule, threshold or reference changed.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Simple published linear correction formulas; the coefficients 1.6/2.4 and the 100 mg/dL reference are facts, not copyrightable expression, and there is no verbatim scale text (corrected-sodium.md §IP status).",
  },
  formula: defineText(
    "corrected-sodium.formula",
    "Corrected Na = measured Na + (factor ÷ 100) × (glucose − 100), with glucose in mg/dL (mmol/L × 18). No correction is applied at or below 100. Both published factors are shown: Katz 1.6 (1973, theoretical) and Hillier 2.4 (1999, measured in 6 healthy adults).",
  ),
  notes: defineText(
    "corrected-sodium.notes",
    "A corrected lab value read against the ordinary sodium reference frame, so there are no bands. Both factors are adult-derived with no paediatric validation [NEEDS SOURCE for a paediatric factor or DKA-guideline endorsement]. Hillier’s data are non-linear: above ~400 mg/dL the true factor climbs toward ~4.0, so the real corrected sodium may exceed even the 2.4 estimate. Units are the main hazard: glucose must be mg/dL for these coefficients.",
  ),
  calculate: (values) => {
    const na = values.measured_na.value; // mEq/L (canonical)
    const glucose = values.glucose.value; // mg/dL (canonical)
    // The correction is defined only for hyperglycemia (glucose > 100 mg/dL).
    // Below the 100 mg/dL reference the raw formula would subtract, which is
    // outside the derivation intent, so the excess is clamped to zero and the
    // corrected value equals the measured value (corrected-sodium.md
    // §"Branch / applicability"). Not a cited threshold — a definitional bound.
    const excessGlucose = Math.max(0, glucose - 100);
    // RAW values (unrounded); `precision` rounds for display only.
    const katz = na + (1.6 * excessGlucose) / 100;
    const hillier = na + (2.4 * excessGlucose) / 100;
    return [
      {
        id: "corrected_na_katz",
        label: defineText("corrected-sodium.katz", "Corrected sodium — Katz (1.6 factor)"),
        value: katz,
        unit: "mEq/L",
        precision: 1,
      },
      {
        id: "corrected_na_hillier",
        label: defineText("corrected-sodium.hillier", "Corrected sodium — Hillier (2.4 factor)"),
        value: hillier,
        unit: "mEq/L",
        precision: 1,
      },
    ];
  },
});
