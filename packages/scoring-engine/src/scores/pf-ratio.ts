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
  version: "1.0.0",
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
      date: "2026-07-25",
      summary: "Initial release: P/F ratio with Berlin severity bands.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Arithmetic ratio; Berlin/PALICC-2 numeric thresholds are facts, not copyrightable expression (pf-sf.md IP status).",
  },
  notes: defineText(
    "pf.notes",
    "The Berlin bands are validated in adults and require PEEP/CPAP ≥ 5 cm H₂O. In children, PALICC-2 grades invasive-ventilation severity by oxygenation index (OI/OSI) rather than P/F, and uses P/F on non-invasive support. Berlin mortality figures are population associations, not individual predictions.",
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
