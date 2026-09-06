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
  tagline: defineText(
    "oi.tagline",
    "Oxygenation severity on ventilation, from mean airway pressure, FiO₂ and PaO₂",
  ),
  version: "1.1.1",
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
      date: "2026-08-10",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-09-03",
      reason: "formula-correction",
      summary:
        "Grades the exact PALICC-2 and Berlin cut-points correctly. The arithmetic behind these indices is binary and the thresholds are decimal, so a value that IS the cut-point did not compute to it: an OI of exactly 16 evaluates to 15.999999999999998 from a mean airway pressure of 24, FiO2 0.60 and PaO2 90; an OSI of exactly 12 to 11.999999999999998; a P/F of exactly 100 to 100.00000000000001. Compared raw, all three placed the patient one band TOO MILD, the under-triage direction and never the reverse, while the page printed the rounded figure beside the milder label and appeared to contradict itself. The band matcher now treats a value within a millionth of a millionth of a bound as being on it, which is four orders above the floating-point residue and far below any difference a clinician draws. NO OTHER VALUE MOVES: a number genuinely below a cut-point still bands below it. Found 2026-09-03 by an independent recompute of every calculator from its published source; the same defect as the PRISM 14-day age term, in a different unit. On this score a child at the severe threshold of 16, or at the diagnostic threshold of 4, was graded one tier milder.",
    },
    {
      version: "1.1.1",
      date: "2026-09-06",
      summary:
        "Added a one-line description for the catalogue card. No rule, threshold or reference changed.",
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
    "OI = (mean airway pressure × FiO₂ × 100) ÷ PaO₂, with MAP in cmH₂O, FiO₂ a fraction, and PaO₂ in mmHg. The ×100 converts the fraction into the percentage form PALICC-2 prints, so the two renderings are the same number. Applying both conventions, or neither, is a 100-fold error, and it is the single most likely implementation mistake: if another calculator disagrees by a factor of 100, check this first. Bands (PALICC-2 2023, invasively ventilated) are OI < 4 below the PARDS oxygenation criterion, 4 to < 16 mild–moderate, and ≥ 16 severe.",
  ),
  notes: defineText(
    "oi.notes",
    "Requires an arterial line, and is defined only on positive-pressure ventilation, conventional or HFOV. PALICC 2015 used three tiers, 4/8/16; PALICC-2 merged the lower two, and the severe cutoff did not move.",
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
