import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import type { ScoreValue } from "../types";
import { bunMgdl, ethanolMgdl, glucoseMgdl, mOsmPerKg, sodiumMmol } from "../units/osmolytes";

/**
 * Serum osmolality (calculated) and osmolar gap.
 *
 * Two linked bedside quantities (docs/research/scores/serum-osmolality.md):
 *
 *   1. Calculated osmolality — Smithline–Gardner (JAMA 1976), the formula Choy
 *      2016 recommends for harmonised use:
 *          Osm_calc = 2·Na + glucose/18 + BUN/2.8      [mOsm/kg]
 *      (÷18 and ÷2.8 are the exact mg/dL → mmol/L conversions for glucose and
 *      urea; 2·Na stands for sodium plus its paired anion.)
 *
 *   2. Osmolar gap = measured osmolality − calculated osmolality. Computed only
 *      when the user supplies an osmometer-measured value; a raised gap flags
 *      osmotically active solute NOT captured by Na/glucose/urea.
 *
 * Ethanol is a real fork, not a silent choice: when a measured ethanol is
 * entered, BOTH published ethanol terms are emitted — ÷3.7 (Purssell 2001
 * empiric) and ÷4.6 (ideal molar mass, MW ≈ 46) — plus the residual gap each
 * yields, so the user sees the effect of the divisor choice (research §Formula
 * variants + worked example 4). The base Smithline–Gardner value is always the
 * first output; alternate base formulas (Dorwart–Chalmers, Bhagat) are documented
 * in notes but not silently substituted.
 *
 * Interpretation bands apply to the base osmolar gap only (Choy 2016 reference
 * limit 10; classic < 10 cut-off). Corrected/derived osmolality VALUES carry no
 * bands (they have a physiologic reference range, not a threshold — see notes).
 */
export const serumOsmolality = defineScore({
  id: "serum-osmolality",
  slug: "serum-osmolality",
  name: "Serum osmolality (calculated) and osmolar gap",
  version: "1.0.0",
  status: "published",
  category: "renal-metabolic",
  inputs: [
    {
      id: "na",
      label: defineText("osm.na", "Sodium"),
      required: true,
      type: "numeric",
      unit: sodiumMmol,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]): survivable hypo-/hypernatraemia.
      min: 100,
      max: 200,
      step: 1,
      helpText: defineText(
        "osm.na.help",
        "Serum sodium in mmol/L (equivalently mEq/L — monovalent, 1:1).",
      ),
    },
    {
      id: "glucose",
      label: defineText("osm.glucose", "Glucose"),
      required: true,
      type: "numeric",
      unit: glucoseMgdl,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]): severe hypoglycaemia to extreme
      // hyperglycaemic crisis.
      min: 10,
      max: 2000,
      step: 1,
      helpText: defineText(
        "osm.glucose.help",
        "Serum glucose. Accepts mg/dL (US) or mmol/L (SI, ×18).",
      ),
    },
    {
      id: "bun",
      label: defineText("osm.bun", "Blood urea nitrogen (BUN)"),
      required: true,
      type: "numeric",
      unit: bunMgdl,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]).
      min: 1,
      max: 300,
      step: 1,
      helpText: defineText(
        "osm.bun.help",
        "Blood urea NITROGEN. Accepts mg/dL (US) or, if the lab reports whole-molecule urea (SI), mmol/L (×2.8). BUN ≠ urea — they differ by the ×2.8 factor.",
      ),
    },
    {
      id: "osm_measured",
      label: defineText("osm.measured", "Measured osmolality (optional)"),
      required: false,
      type: "numeric",
      unit: mOsmPerKg,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]): generous engineering range that
      // still admits marked toxic-alcohol elevations.
      min: 100,
      max: 600,
      step: 1,
      helpText: defineText(
        "osm.measured.help",
        "Osmometer value in mOsm/kg. Enter it to compute the osmolar gap (measured − calculated).",
      ),
    },
    {
      id: "ethanol",
      label: defineText("osm.ethanol", "Ethanol (optional)"),
      required: false,
      type: "numeric",
      unit: ethanolMgdl,
      // Input-validity bounds, not a cited clinical threshold
      // (serum-osmolality.md [NEEDS SOURCE]).
      min: 0,
      max: 1000,
      step: 1,
      helpText: defineText(
        "osm.ethanol.help",
        "Measured ethanol. Accepts mg/dL or mmol/L (×4.6). When entered, the calculated osmolality and residual gap are shown with both the ÷3.7 (empiric) and ÷4.6 (ideal) ethanol terms.",
      ),
    },
  ] as const,
  // Bands apply to the base osmolar gap only. Ascending: a larger gap is the
  // "more abnormal" direction, so the cut-off is "≥" → default [min, max).
  // gap < 10 → normal; gap ≥ 10 → elevated (Choy 2016 reference limit).
  interpretation: [
    {
      id: "gap-normal",
      appliesTo: "osm_gap",
      min: null,
      max: 10,
      label: defineText("osm.gap.normal", "< 10 mOsm/kg"),
      description: defineText(
        "osm.gap.normal.desc",
        "Below the conventional reference limit of 10 mOsm/kg for the osmolar gap computed with the Smithline–Gardner formula (Choy 2016). A gap in this range does not exclude an unmeasured osmole: the gap has high sensitivity but low specificity and wide individual baseline variation (which can be negative), so it is not used in isolation (Lynd 2008).",
      ),
    },
    {
      id: "gap-elevated",
      appliesTo: "osm_gap",
      min: 10,
      max: null,
      label: defineText("osm.gap.elevated", "≥ 10 mOsm/kg"),
      description: defineText(
        "osm.gap.elevated.desc",
        "At or above the reference limit of 10 mOsm/kg proposed for the Smithline–Gardner osmolar gap (Choy 2016) — the most common clinically applied cut-off (Lynd 2008). Suggests osmotically active solute not captured by sodium, glucose, and urea (e.g. a toxic alcohol, ethanol, mannitol, or a pseudo-gap from severe hyperlipidaemia/hyperproteinaemia). Some older sources use a wider normal up to ~14–15. The gap does not identify the substance; interpret with the full clinical picture.",
      ),
    },
  ],
  references: [
    {
      citation:
        "Smithline N, Gardner KD Jr. Gaps—anionic and osmolal. JAMA. 1976;236(14):1594–1597.",
      pmid: "989132",
      doi: "10.1001/jama.236.14.1594",
      note: "Original Smithline–Gardner formula (default calculated osmolality).",
    },
    {
      citation:
        "Choy KW, Wijeratne N, Lu ZX, Doery JCG. Harmonisation of Osmolal Gap — Can We Use a Common Formula? Clin Biochem Rev. 2016;37(3):113–119.",
      pmid: "27872505",
      note: "Recommends Smithline–Gardner; proposes the gap reference limit of 10 mOsm/kg; healthy SD ≈ 4, uncertainty ≈ ±7.",
    },
    {
      citation:
        "Purssell RA, Pudek M, Brubacher J, Abu-Laban RB. Derivation and validation of a formula to calculate the contribution of ethanol to the osmolal gap. Ann Emerg Med. 2001;38(6):653–659.",
      pmid: "11719745",
      doi: "10.1067/mem.2001.119455",
      note: "Empiric ethanol divisor 3.7 (factor 1.25 in SI).",
    },
    {
      citation:
        "Lynd LD, Richardson KJ, Purssell RA, et al. An evaluation of the osmole gap as a screening test for toxic alcohol poisoning. BMC Emerg Med. 2008;8:5.",
      pmid: "18442409",
      doi: "10.1186/1471-227X-8-5",
      note: "10 = most common cut-off; high sensitivity, low specificity; not to be used in isolation.",
    },
    {
      citation:
        "Dorwart WV, Chalmers L. Comparison of methods for calculating serum osmolality from chemical concentrations. Clin Chem. 1975;21(2):190–194.",
      pmid: "1112025",
      note: "Alternate formula (1.86·Na + glucose/18 + BUN/2.8 + 9); not implemented — documented for cross-reference.",
    },
    {
      citation:
        "Bhagat CI, Garcia-Webb P, Fletcher E, Beilby JP. Calculated vs measured plasma osmolalities revisited. Clin Chem. 1984;30(10):1703–1705.",
      pmid: "6537784",
      note: "Alternate formula (Bhagat); not implemented — documented for cross-reference.",
    },
    {
      citation:
        "Ranadive SA, Rosenthal SM. Pediatric Disorders of Water Balance. Pediatr Clin North Am. 2011;58(5):1271–1280.",
      pmid: "21981960",
      doi: "10.1016/j.pcl.2011.07.013",
      note: "Pediatric normal plasma-osmolality range 280–295 mOsm/kg (the value's reference range, not the gap threshold).",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: Smithline–Gardner calculated osmolality, osmolar gap, and both ethanol-divisor variants (÷3.7 / ÷4.6).",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The osmolality formulas (coefficients 2, ÷18, ÷2.8), the ethanol divisors (3.7, 4.6), the gap definition (measured − calculated), and the < 10 mOsm/kg reference limit are mathematical facts and numeric thresholds — outside copyright. No verbatim scale-item wording is embedded (serum-osmolality.md IP status).",
  },
  formula: defineText(
    "osm.formula",
    "Calculated osmolality (Smithline–Gardner) = 2 × sodium (mmol/L) + glucose (mg/dL) ÷ 18 + blood urea nitrogen (mg/dL) ÷ 2.8, in mOsm/kg. When a measured ethanol is entered, an ethanol term is added and shown two ways: ethanol (mg/dL) ÷ 3.7 (Purssell empiric) and ÷ 4.6 (ideal molar mass). Osmolar gap = measured osmolality − calculated osmolality; with an ethanol on board, the residual gap (ethanol accounted for) is also shown for each divisor. Normal gap is conventionally < 10 mOsm/kg.",
  ),
  notes: defineText(
    "osm.notes",
    "Formula choice changes the number: this score uses Smithline–Gardner (2·Na + glucose/18 + BUN/2.8), the formula Choy 2016 recommends; Dorwart–Chalmers and Bhagat give slightly different values and are provided as references only, not computed. A gap threshold of 10 is valid only paired with the formula it was derived for. Ethanol divisor 3.7 vs 4.6 is a real fork (empiric Purssell vs ideal MW); both are emitted so the choice is explicit — using 4.6 when ethanol is present slightly over-states the residual gap. US vs SI unit traps: glucose and BUN must be mg/dL for the ÷18 and ÷2.8 divisors; the SI mmol/L alternates apply the factor once (entering already-SI values keeps the same result). BUN (nitrogen) ≠ urea (whole molecule) — they differ by ×2.8. The additive formula yields osmolarity (per L) while the osmometer yields osmolality (per kg water); this small structural mismatch is one reason a normal gap is non-zero, and severe hyperlipidaemia/hyperproteinaemia produce a pseudo-gap without true extra osmoles. The gap is a screening tool, not a rule-out: low specificity and wide baseline variation mean a gap < 10 does not exclude a toxic alcohol, and a raised gap does not identify the agent (Lynd 2008); early methanol/ethylene-glycol poisoning can show a normal gap. The gap requires a measured osmolality the app cannot compute. Pediatric applicability: the formula and threshold are population-independent arithmetic; the normal osmolality range in children matches adults (280–295 mOsm/kg, Ranadive & Rosenthal 2011). [NEEDS SOURCE]: the numeric input-validation bounds for sodium (100–200 mmol/L), glucose (10–2000 mg/dL), BUN (1–300 mg/dL), and measured osmolality (100–600 mOsm/kg) are engineering limits, not values from a specific publication. This is a training/reference calculator, not a clinical decision device.",
  ),
  calculate: (values): ScoreValue[] => {
    // Return RAW computed values; `precision` rounds for DISPLAY only, and the
    // interpretation bands are matched against the raw gap.
    const base = 2 * values.na.value + values.glucose.value / 18 + values.bun.value / 2.8;

    const results: ScoreValue[] = [
      {
        id: "osm_calc",
        label: defineText("osm.out.calc", "Calculated osmolality (Smithline–Gardner)"),
        value: base,
        unit: "mOsm/kg",
        precision: 0,
      },
    ];

    // Ethanol is optional; when present, expose BOTH divisor variants so the
    // fork (empiric ÷3.7 vs ideal ÷4.6) is never chosen silently.
    const ethanol = values.ethanol?.value;
    let calcEmpiric = base;
    let calcIdeal = base;
    if (ethanol !== undefined) {
      calcEmpiric = base + ethanol / 3.7; // Purssell 2001 empiric divisor
      calcIdeal = base + ethanol / 4.6; // ideal molar-mass divisor (MW ≈ 46)
      results.push(
        {
          id: "osm_calc_ethanol_empiric",
          label: defineText(
            "osm.out.calc.eth37",
            "Calculated osmolality incl. ethanol (÷3.7, Purssell empiric)",
          ),
          value: calcEmpiric,
          unit: "mOsm/kg",
          precision: 0,
        },
        {
          id: "osm_calc_ethanol_ideal",
          label: defineText(
            "osm.out.calc.eth46",
            "Calculated osmolality incl. ethanol (÷4.6, ideal MW)",
          ),
          value: calcIdeal,
          unit: "mOsm/kg",
          precision: 0,
        },
      );
    }

    // The gap needs an osmometer-measured value; without it, only the
    // calculated osmolality is deterministic.
    const measured = values.osm_measured?.value;
    if (measured !== undefined) {
      results.push({
        id: "osm_gap",
        label: defineText("osm.out.gap", "Osmolar gap"),
        value: measured - base,
        unit: "mOsm/kg",
        precision: 1,
      });
      if (ethanol !== undefined) {
        results.push(
          {
            id: "osm_gap_ethanol_empiric",
            label: defineText("osm.out.gap.eth37", "Residual osmolar gap (ethanol ÷3.7 accounted)"),
            value: measured - calcEmpiric,
            unit: "mOsm/kg",
            precision: 1,
          },
          {
            id: "osm_gap_ethanol_ideal",
            label: defineText("osm.out.gap.eth46", "Residual osmolar gap (ethanol ÷4.6 accounted)"),
            value: measured - calcIdeal,
            unit: "mOsm/kg",
            precision: 1,
          },
        );
      }
    }

    return results;
  },
});
