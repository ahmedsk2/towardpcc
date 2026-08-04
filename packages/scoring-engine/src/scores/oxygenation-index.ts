import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fractionWithPercent } from "../units/fraction";
import { cmH2O, mmhgWithKpa } from "../units/pressure";

/**
 * Oxygenation Index (OI) — a bedside oxygenation-defect index that folds the
 * ventilator support required (mean airway pressure and FiO₂) into the
 * arterial oxygenation achieved (PaO₂). It is the PALICC/PALICC-2 metric for
 * grading PARDS severity in invasively ventilated children when an arterial
 * PaO₂ is available. Higher value = worse oxygenation defect.
 *
 *   OI = (MAP × FiO₂ × 100) / PaO₂     [MAP cmH₂O, FiO₂ fraction, PaO₂ mmHg]
 *
 * The ×100 factor exactly compensates for FiO₂ being a fraction (0.21–1.0): the
 * PALICC executive-summary rendering MAP × FiO₂% / PaO₂ is the SAME number.
 * Applying both — or neither — is a 100× error (oi-osi.md worked example 3).
 *
 * OI needs an arterial PaO₂ → requires an arterial line (invasive), and is only
 * defined on positive-pressure ventilation (a mean airway pressure must exist).
 * The SpO₂-based sibling that spares the arterial draw is the Oxygen Saturation
 * Index (OSI, oxygen-saturation-index.ts), which carries its own SpO₂ ≤ 97%
 * validity guard.
 *
 * Interpretation bands here are PALICC-2 (2023) two-tier (IMV); the PALICC 2015
 * three-tier scheme is documented in the notes for context only.
 *
 * Research + full sourcing: docs/research/scores/oi-osi.md.
 */
export const oxygenationIndex = defineScore({
  id: "oxygenation-index",
  slug: "oxygenation-index",
  name: "Oxygenation Index (OI)",
  version: "1.1.0",
  status: "published",
  category: "respiratory",
  inputs: [
    {
      id: "map_awp",
      label: defineText("oi.map", "Mean airway pressure (MAP)"),
      required: true,
      type: "numeric",
      unit: cmH2O,
      // Input-validity bounds, not a cited clinical threshold (oi-osi.md
      // [NEEDS SOURCE]): only defined on positive-pressure ventilation.
      min: 5,
      max: 50,
      helpText: defineText(
        "oi.map.help",
        "Ventilator-reported mean airway pressure in cm H₂O. Only defined on positive-pressure ventilation (conventional IMV or HFOV).",
      ),
    },
    {
      id: "fio2",
      label: defineText("oi.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText("oi.fio2.help", "Room air is 0.21. Accepts a fraction or a percentage."),
    },
    {
      id: "pao2",
      label: defineText("oi.pao2", "Arterial oxygen tension (PaO₂)"),
      required: true,
      type: "numeric",
      unit: mmhgWithKpa,
      // Input-validity bounds, not a cited clinical threshold (oi-osi.md
      // [NEEDS SOURCE]).
      min: 10,
      max: 700,
      helpText: defineText("oi.pao2.help", "From an arterial blood gas. Accepts mmHg or kPa."),
    },
  ] as const,
  // Ascending index: higher OI is worse, cutpoints are "≥" → default [min, max).
  interpretation: [
    {
      id: "oi-below-threshold",
      appliesTo: "oi",
      min: null,
      max: 4,
      label: defineText("oi.band.below", "OI < 4"),
      description: defineText(
        "oi.band.below.desc",
        "Below the PALICC-2 (2023) invasive-ventilation oxygenation criterion for PARDS (OI ≥ 4). Interpret in the full clinical context.",
      ),
    },
    {
      id: "oi-mild-moderate",
      appliesTo: "oi",
      min: 4,
      max: 16,
      label: defineText("oi.band.mildmod", "OI 4 to < 16"),
      description: defineText(
        "oi.band.mildmod.desc",
        "Corresponds to the mild–moderate category for invasively ventilated children in PALICC-2 (2023) (OI ≥ 4 meets the oxygenation criterion; OI < 16).",
      ),
    },
    {
      id: "oi-severe",
      appliesTo: "oi",
      min: 16,
      max: null,
      label: defineText("oi.band.severe", "OI ≥ 16"),
      description: defineText(
        "oi.band.severe.desc",
        "Corresponds to the severe category for invasively ventilated children in PALICC-2 (2023) (OI ≥ 16).",
      ),
    },
  ],
  references: [
    {
      citation:
        "Emeriaud G, López-Fernández YM, Iyer NP, et al; Second Pediatric Acute Lung Injury Consensus Conference (PALICC-2) of the PALISI Network. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric Acute Respiratory Distress Syndrome (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168.",
      pmid: "36661420",
      doi: "10.1097/PCC.0000000000003147",
    },
    {
      citation:
        "Pediatric Acute Lung Injury Consensus Conference Group. Pediatric acute respiratory distress syndrome: consensus recommendations from the Pediatric Acute Lung Injury Consensus Conference. Pediatr Crit Care Med. 2015;16(5):428–439.",
      pmid: "25647235",
      doi: "10.1097/PCC.0000000000000350",
    },
    {
      citation:
        "Khemani RG, Smith LS, Zimmerman JJ, Erickson S; Pediatric Acute Lung Injury Consensus Conference Group. Pediatric acute respiratory distress syndrome: definition, incidence, and epidemiology: proceedings from the Pediatric Acute Lung Injury Consensus Conference. Pediatr Crit Care Med. 2015;16(5 Suppl 1):S23–S40.",
      pmid: "26035358",
      doi: "10.1097/PCC.0000000000000432",
    },
    {
      citation:
        "Slaughter J, Sites J, Ballard H, Bauer J, Schadler A, Severyn N. Comparison of the oxygenation index and the oxygen saturation index as clinical indicators for neonatal ECMO. Front Pediatr. 2025;13:1586985.",
      pmid: "40630719",
      doi: "10.3389/fped.2025.1586985",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: OI split out from the former OI/OSI score, with PALICC-2 (2023) two-tier severity bands.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "Sourcing pass, no change to the computed number. The FiO₂ convention is now stated as a requirement rather than an aside — PALICC-2 (2023) prints OI as MAP(cmH₂O) × FiO₂(percent) ÷ PaO₂(mmHg), and the ×100 in this implementation is exactly what converts the fraction to that form — and a worked example now pins the magnitude so a future simplification cannot introduce a silent 100-fold error. The PALICC-2 bands were re-verified and are unchanged (criterion OI ≥ 4, severe OI ≥ 16).",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "OI is an arithmetic formula; the PALICC 2015 / PALICC-2 diagnostic and severity thresholds (4, 8, 16) are facts (numbers, formulas), not copyrightable expression. No verbatim scale-item wording is embedded; surrounding guideline prose is paraphrased (oi-osi.md IP status).",
  },
  formula: defineText(
    "oi.formula",
    "OI = (MAP × FiO₂ × 100) ÷ PaO₂, where MAP is mean airway pressure in cmH₂O, FiO₂ is the inspired-oxygen FRACTION (0.21–1.0), and PaO₂ is arterial oxygen tension in mmHg; the result is a unitless index displayed to one decimal. The FiO₂ unit is load-bearing, not a detail: PALICC-2 (2023) prints this index as MAP(cmH₂O) × FiO₂(percent) ÷ PaO₂(mmHg), and the explicit ×100 above is precisely what converts a fraction into that percentage form, so the two renderings are the same number (the ×100 form is written out in Slaughter 2025). Applying both conventions, or neither, is a 100-fold error in opposite directions; a worked example in the test suite pins the magnitude so the factor cannot be simplified away. Bands are matched against the raw unrounded value using the PALICC-2 (2023) two-tier scheme: OI < 4 is below the invasive-ventilation oxygenation criterion, 4 ≤ OI < 16 is mild–moderate, and OI ≥ 16 is severe.",
  ),
  notes: defineText(
    "oi.notes",
    "OI is the mean airway pressure times FiO₂ times 100, divided by the arterial oxygen tension (PaO₂) — higher OI means a worse oxygenation defect. It requires an arterial line (for the PaO₂) and is defined only on positive-pressure ventilation, where a mean airway pressure exists (conventional IMV or HFOV); it is undefined for spontaneous breathing, nasal cannula, or standard non-invasive masks. FiO₂ is entered as a fraction here and the ×100 converts it to the percentage form the guideline prints: PALICC-2 (2023) states OI as MAP(cmH₂O) × FiO₂(percent) ÷ PaO₂(mmHg), which is the identical number. This is the single most likely implementation error in the score — apply both conventions and the index is 100× too large, apply neither and it is 100× too small — so if a value here disagrees with another calculator by a factor of 100, that is the first thing to check. Interpretation bands here are the PALICC-2 (2023) two-tier scheme for invasively ventilated children: the oxygenation criterion is OI ≥ 4 and severe is OI ≥ 16. PALICC 2015 used a three-tier scheme — mild (4 ≤ OI < 8), moderate (8 ≤ OI < 16), severe (OI ≥ 16) — and PALICC-2 collapsed the two lower tiers into mild–moderate while leaving the OI severe cutoff (≥ 16) unchanged, so unlike OSI (whose severe cutoff moved from 12.3 to 12) no OI number changed between editions; this implementation applies the PALICC-2 (2023) edition. The map_awp (5–50 cmH₂O) and pao2 (10–700 mmHg) numeric limits are engineering input-validation bounds, not values from a specific publication [NEEDS SOURCE]. OI classifies a physiologic defect; it is not an individual-patient outcome prediction.",
  ),
  calculate: (values) => {
    // Return the raw index; `precision` rounds for DISPLAY only. Interpretation
    // bands are matched against this raw value so an OI of 3.99 bands as
    // below-threshold (not mild–moderate) even though it displays as 4.0.
    const oi = (values.map_awp.value * values.fio2.value * 100) / values.pao2.value;
    return [
      {
        id: "oi",
        label: defineText("oi.output", "Oxygenation index (OI)"),
        value: oi,
        unit: "",
        precision: 1,
      },
    ];
  },
});
