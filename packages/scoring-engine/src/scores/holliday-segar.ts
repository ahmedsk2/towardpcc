import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { kgWithLbAndG } from "../units/mass";

/**
 * Holliday-Segar maintenance fluid requirement (pediatric). Estimates baseline
 * daily maintenance water (the "100-50-20" mL/kg/day rule) and the derivative
 * bedside hourly rate (the "4-2-1" mL/kg/hr rule) from body weight alone.
 *
 * This is a DOSING/TARGET estimate, not a severity or diagnostic score: it has
 * no interpretation bands. The two rules share the same physiology but the
 * hourly coefficients are rounded whole numbers, so hourly × 24 ≠ daily volume
 * in general — both are emitted as separate ScoreValues so the user sees each.
 *
 * Research + full sourcing: docs/research/scores/holliday-segar.md
 * (Holliday MA, Segar WE. Pediatrics. 1957;19(5):823–832. PMID 13431307).
 */
export const hollidaySegar = defineScore({
  id: "holliday-segar",
  slug: "holliday-segar",
  name: "Holliday-Segar maintenance fluids",
  version: "1.0.0",
  status: "published",
  category: "fluids-resuscitation",
  inputs: [
    {
      id: "weight",
      label: defineText("hs.weight", "Body weight"),
      required: true,
      type: "numeric",
      unit: kgWithLbAndG,
      // Input-validity bounds (holliday-segar.md Inputs: ~0.5 kg validation floor,
      // ~150 kg validation ceiling), not cited clinical dosing limits. A zero or
      // negative weight is inherently invalid; the formula itself is unbounded.
      min: 0.5,
      max: 150,
      helpText: defineText(
        "hs.weight.help",
        "Actual body weight. Accepts kilograms, pounds, or grams.",
      ),
    },
  ] as const,
  // A maintenance-fluid dosing estimate has no published risk cut-points, so
  // there are no interpretation bands (holliday-segar.md "Interpretation bands").
  interpretation: [],
  references: [
    {
      citation:
        "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823–832.",
      pmid: "13431307",
      doi: "10.1542/peds.19.5.823",
    },
    {
      citation:
        "University of Iowa Head and Neck Protocols — Pediatric Fluid Management. Secondary confirmation of the 4-2-1 hourly rule and the 35 kg → 75 mL/hr worked example.",
      url: "https://iowaprotocols.medicine.uiowa.edu/protocols/pediatric-fluid-management",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: 100-50-20 daily volume and 4-2-1 hourly rate from body weight; no bands.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Piecewise-linear arithmetic function of body weight; the coefficients (100/50/20, 4/2/1) and weight-bracket thresholds (10 kg, 20 kg) are facts and a mathematical formula, not copyrightable expression. No proprietary scale wording (holliday-segar.md IP status).",
  },
  formula: defineText(
    "hs.formula",
    "Daily maintenance volume uses the 100-50-20 rule: 100 mL/kg for the first 10 kg, plus " +
      "50 mL/kg for each kg between 10 and 20 kg, plus 20 mL/kg for each kg above 20 kg. " +
      "The hourly rate uses the derivative 4-2-1 rule: 4 mL/kg/hr for the first 10 kg, " +
      "2 mL/kg/hr for each kg between 10 and 20 kg, and 1 mL/kg/hr for each kg above 20 kg. " +
      "Both rules describe the same water need, but the hourly coefficients are the daily " +
      "coefficients divided by 24 and rounded (100÷24≈4.17, 50÷24≈2.08, 20÷24≈0.83), so the " +
      "hourly rate multiplied by 24 does not exactly equal the daily volume.",
  ),
  notes: defineText(
    "hs.notes",
    "Estimate of baseline (basal-state) maintenance water only — not a prescription or order. " +
      "It EXCLUDES any pre-existing fluid deficit (dehydration) and ongoing/abnormal losses " +
      "(fever, vomiting, diarrhea, drains, third-spacing), which are computed and added " +
      "separately. There are no interpretation bands: the output is a target volume, not a risk " +
      "tier. Derived for children in a basal metabolic state and not intended for neonates " +
      "younger than ~2 weeks; accuracy is reduced in fever, hypothermia, hyperthyroidism, and " +
      "status epilepticus. The two outputs disagree slightly by design: the 4-2-1 hourly rule " +
      "uses rounded coefficients, so hourly × 24 ≠ daily volume (the hourly rule slightly " +
      "underestimates in the first two brackets and slightly overestimates above 20 kg). The " +
      "1957 method paired this volume with hypotonic, dextrose-containing fluid; contemporary " +
      "evidence links routine hypotonic maintenance fluids to iatrogenic hyponatremia and " +
      "current guidance generally favors isotonic maintenance fluids — the volume rule stands, " +
      "the 1957 composition is superseded (an authoritative isotonic-fluid guideline citation is " +
      "[NEEDS SOURCE]). Many centers cap total maintenance volume for large patients (commonly " +
      "stated near ~2000–2400 mL/day) rather than extrapolating the >20 kg bracket indefinitely; " +
      "any such cap is an institutional policy overlay and the specific numeric value is " +
      "[NEEDS SOURCE] — the 1957 paper specifies no ceiling.",
  ),
  calculate: (values) => {
    const w = values.weight.value;

    // Daily maintenance volume (mL/day) — additive 100-50-20 rule across brackets.
    // Continuous at the 10 kg and 20 kg knots; closed forms per holliday-segar.md.
    const dailyVolume = w <= 10 ? 100 * w : w <= 20 ? 1000 + 50 * (w - 10) : 1500 + 20 * (w - 20);

    // Hourly maintenance rate (mL/hr) — derivative 4-2-1 rule (rounded coefficients).
    const hourlyRate = w <= 10 ? 4 * w : w <= 20 ? 40 + 2 * (w - 10) : 60 + 1 * (w - 20);

    // Return RAW computed values; `precision` rounds for display only.
    return [
      {
        id: "daily_volume",
        label: defineText("hs.daily", "Daily maintenance volume (100-50-20 rule)"),
        value: dailyVolume,
        unit: "mL/day",
        precision: 0,
      },
      {
        id: "hourly_rate",
        label: defineText("hs.hourly", "Hourly maintenance rate (4-2-1 rule)"),
        value: hourlyRate,
        unit: "mL/h",
        precision: 0,
      },
    ];
  },
});
