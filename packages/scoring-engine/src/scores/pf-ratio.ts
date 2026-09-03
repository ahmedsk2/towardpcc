import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fractionWithPercent } from "../units/fraction";
import { mmhgWithKpa } from "../units/pressure";

/**
 * PaO₂/FiO₂ ratio — arithmetic oxygenation index. Interpretation bands use
 * the Berlin (2012) adult ARDS severity strata, the most widely recognized
 * P/F cut-points; pediatric PARDS context (PALICC-2) is in the notes.
 * Research + full sourcing: docs/research/scores/pf-sf.md.
 */
export const pfRatio = defineScore({
  id: "pf-ratio",
  slug: "pf-ratio",
  name: "PaO₂/FiO₂ ratio (P/F)",
  version: "1.1.0",
  status: "published",
  category: "respiratory",
  inputs: [
    {
      id: "pao2",
      label: defineText("pf.pao2", "Arterial oxygen tension (PaO₂)"),
      required: true,
      type: "numeric",
      unit: mmhgWithKpa,
      // Input-validity bounds, not a cited clinical threshold (pf-sf.md [NEEDS SOURCE]).
      min: 10,
      max: 700,
      helpText: defineText("pf.pao2.help", "From an arterial blood gas. Accepts mmHg or kPa."),
    },
    {
      id: "fio2",
      label: defineText("pf.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText("pf.fio2.help", "Room air is 0.21. Accepts a fraction or a percentage."),
    },
  ] as const,
  // Descending score: lower P/F is worse, cutpoints are "≤" → (min, max].
  interpretation: [
    {
      id: "severe",
      appliesTo: "pf_ratio",
      min: null,
      max: 100,
      maxInclusive: true,
      label: defineText("pf.band.severe", "≤ 100"),
      description: defineText(
        "pf.band.severe.desc",
        "Corresponds to the severe category in the Berlin ARDS definition (with PEEP or CPAP ≥ 5 cm H₂O).",
      ),
    },
    {
      id: "moderate",
      appliesTo: "pf_ratio",
      min: 100,
      minInclusive: false,
      max: 200,
      maxInclusive: true,
      label: defineText("pf.band.moderate", "> 100 to ≤ 200"),
      description: defineText(
        "pf.band.moderate.desc",
        "Corresponds to the moderate category in the Berlin ARDS definition (with PEEP or CPAP ≥ 5 cm H₂O).",
      ),
    },
    {
      id: "mild",
      appliesTo: "pf_ratio",
      min: 200,
      minInclusive: false,
      max: 300,
      maxInclusive: true,
      label: defineText("pf.band.mild", "> 200 to ≤ 300"),
      description: defineText(
        "pf.band.mild.desc",
        "Corresponds to the mild category in the Berlin ARDS definition (with PEEP or CPAP ≥ 5 cm H₂O).",
      ),
    },
    {
      id: "above-range",
      appliesTo: "pf_ratio",
      min: 300,
      minInclusive: false,
      max: null,
      label: defineText("pf.band.above", "> 300"),
      description: defineText(
        "pf.band.above.desc",
        "Above the Berlin ARDS oxygenation threshold. Interpret in the full clinical context.",
      ),
    },
  ],
  references: [
    {
      citation:
        "ARDS Definition Task Force; Ranieri VM, et al. Acute respiratory distress syndrome: the Berlin Definition. JAMA. 2012;307(23):2526–2533.",
      pmid: "22797452",
      doi: "10.1001/jama.2012.5669",
    },
    {
      citation:
        "Emeriaud G, et al. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168.",
      pmid: "36661420",
      doi: "10.1097/PCC.0000000000003147",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-08-10",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-09-03",
      reason: "formula-correction",
      summary:
        "Grades the exact PALICC-2 and Berlin cut-points correctly. The arithmetic behind these indices is binary and the thresholds are decimal, so a value that IS the cut-point did not compute to it: an OI of exactly 16 evaluates to 15.999999999999998 from a mean airway pressure of 24, FiO2 0.60 and PaO2 90; an OSI of exactly 12 to 11.999999999999998; a P/F of exactly 100 to 100.00000000000001. Compared raw, all three placed the patient one band TOO MILD, the under-triage direction and never the reverse, while the page printed the rounded figure beside the milder label and appeared to contradict itself. The band matcher now treats a value within a millionth of a millionth of a bound as being on it, which is four orders above the floating-point residue and far below any difference a clinician draws. NO OTHER VALUE MOVES: a number genuinely below a cut-point still bands below it. Found 2026-09-03 by an independent recompute of every calculator from its published source; the same defect as the PRISM 14-day age term, in a different unit. On this score a patient at the Berlin severe threshold of 100, or at the moderate threshold of 200, was graded one band milder.",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Arithmetic ratio; Berlin/PALICC-2 numeric thresholds are facts, not copyrightable expression (pf-sf.md IP status).",
  },
  formula: defineText(
    "pf.formula",
    "P/F = PaO₂ in mmHg ÷ FiO₂ as a fraction from 0.21 to 1.0. A PaO₂ entered in kPa converts at 1 kPa = 7.50062 mmHg. The ratio is displayed rounded to a whole number, but the bands are matched against the unrounded ratio. Bands follow the Berlin (2012) ARDS severity strata: ≤ 100 severe, > 100 to ≤ 200 moderate, > 200 to ≤ 300 mild, and > 300 above the ARDS oxygenation threshold.",
  ),
  notes: defineText(
    "pf.notes",
    "The Berlin bands are adult bands and require PEEP or CPAP ≥ 5 cm H₂O. In children, PALICC-2 grades invasive-ventilation severity by oxygenation index (OI/OSI) rather than P/F, and uses P/F on non-invasive support. Berlin mortality figures are population associations.",
  ),
  calculate: (values) => {
    // Return the raw ratio; `precision` rounds for DISPLAY only. Interpretation
    // bands are matched against this raw value so a true P/F of 100.4 bands as
    // moderate (not severe), even though it displays as 100.
    const ratio = values.pao2.value / values.fio2.value;
    return [
      {
        id: "pf_ratio",
        label: defineText("pf.output", "P/F ratio"),
        value: ratio,
        unit: "",
        precision: 0,
      },
    ];
  },
});
