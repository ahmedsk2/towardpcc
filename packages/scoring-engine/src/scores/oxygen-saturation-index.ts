import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fractionWithPercent, percent } from "../units/fraction";
import { cmH2O } from "../units/pressure";

/**
 * Oxygen Saturation Index (OSI) — a bedside oxygenation-defect index that folds
 * the ventilator support required (mean airway pressure and FiO₂) into the
 * pulse-oximeter oxygenation achieved (SpO₂). It substitutes SpO₂ for the
 * arterial PaO₂ used by the Oxygenation Index (OI, oxygenation-index.ts),
 * sparing an arterial draw. It is the PALICC/PALICC-2 metric for grading PARDS
 * severity in invasively ventilated children when no arterial line is present.
 * Higher value = worse oxygenation defect.
 *
 *   OSI = (MAP × FiO₂ × 100) / SpO₂     [MAP cmH₂O, FiO₂ fraction, SpO₂ %]
 *
 * The ×100 factor exactly compensates for FiO₂ being a fraction (0.21–1.0): the
 * PALICC executive-summary rendering MAP × FiO₂% / SpO₂ is the SAME number.
 * Applying both — or neither — is a 100× error (oi-osi.md worked example 3).
 *
 * Hard validity constraint: OSI is interpretable only when SpO₂ ≤ 97% (above
 * that the oxyhemoglobin dissociation curve plateaus and SpO₂ no longer tracks
 * PaO₂). SpO₂ is therefore bounded at 97 so any value above it is REJECTED as
 * out-of-range rather than yielding an uninterpretable OSI (Thomas 2010;
 * PALICC-2). The FLOOR is 80 — the lower end of the SpO₂ 80–97% window the
 * SpO₂-based indices were derived and validated in (Khemani 2009/2012), and the
 * same window sf-ratio.ts enforces. No OSI-specific lower bound is published;
 * adopting the derivation floor is a documented implementation choice, and it
 * is deliberately NOT a permissive 1%, which no primary would support.
 * OSI is also only defined on positive-pressure ventilation (a mean airway
 * pressure must exist).
 *
 * Interpretation bands here are PALICC-2 (2023) two-tier (IMV); the PALICC 2015
 * three-tier scheme is documented in the notes for context only.
 *
 * Research + full sourcing: docs/research/scores/oi-osi.md.
 */
export const oxygenSaturationIndex = defineScore({
  id: "oxygen-saturation-index",
  slug: "oxygen-saturation-index",
  name: "Oxygen Saturation Index (OSI)",
  version: "1.1.0",
  status: "published",
  category: "respiratory",
  inputs: [
    {
      id: "map_awp",
      label: defineText("osi.map", "Mean airway pressure (MAP)"),
      required: true,
      type: "numeric",
      unit: cmH2O,
      // Input-validity bounds, not a cited clinical threshold (oi-osi.md
      // [NEEDS SOURCE]): only defined on positive-pressure ventilation.
      min: 5,
      max: 50,
      helpText: defineText(
        "osi.map.help",
        "Ventilator-reported mean airway pressure in cm H₂O. Only defined on positive-pressure ventilation (conventional IMV or HFOV).",
      ),
    },
    {
      id: "fio2",
      label: defineText("osi.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText(
        "osi.fio2.help",
        "Room air is 0.21. Accepts a fraction or a percentage.",
      ),
    },
    {
      id: "spo2",
      label: defineText("osi.spo2", "Pulse oximeter oxygen saturation (SpO₂)"),
      required: true,
      type: "numeric",
      unit: percent,
      // Hard OSI validity guard, not an engineering guess: OSI is interpretable
      // only when SpO₂ ≤ 97% — above that the dissociation curve plateaus and
      // SpO₂ no longer tracks PaO₂ (Thomas 2010; PALICC-2). Values above 97 are
      // rejected as out-of-range, never scored.
      //
      // The 80 floor is the lower end of the SpO₂ 80–97% window in which the
      // SpO₂-based indices were derived/validated (Khemani 2009/2012) — the same
      // window sf-ratio.ts enforces for S/F. No lower bound specific to OSI is
      // published, so this is a DOCUMENTED IMPLEMENTATION CHOICE anchored to the
      // derivation floor; it replaced a 1% floor that no primary supported.
      min: 80,
      max: 97,
      helpText: defineText(
        "osi.spo2.help",
        "Measured at steady state, not during a transient desaturation. Valid for OSI only when 80–97%; above 97% the index is not interpretable, and below 80% it is outside the window the SpO₂-based indices were validated in.",
      ),
    },
  ] as const,
  // Ascending index: higher OSI is worse, cutpoints are "≥" → default [min, max).
  interpretation: [
    {
      id: "osi-below-threshold",
      appliesTo: "osi",
      min: null,
      max: 5,
      label: defineText("osi.band.below", "OSI < 5"),
      description: defineText(
        "osi.band.below.desc",
        "Below the PALICC-2 (2023) invasive-ventilation oxygenation criterion for PARDS (OSI ≥ 5). Valid only for SpO₂ 80–97%. Interpret in the full clinical context.",
      ),
    },
    {
      id: "osi-mild-moderate",
      appliesTo: "osi",
      min: 5,
      max: 12,
      label: defineText("osi.band.mildmod", "OSI 5 to < 12"),
      description: defineText(
        "osi.band.mildmod.desc",
        "Corresponds to the mild–moderate category for invasively ventilated children in PALICC-2 (2023) (OSI ≥ 5 meets the oxygenation criterion; OSI < 12; SpO₂ 80–97%).",
      ),
    },
    {
      id: "osi-severe",
      appliesTo: "osi",
      min: 12,
      max: null,
      label: defineText("osi.band.severe", "OSI ≥ 12"),
      description: defineText(
        "osi.band.severe.desc",
        "Corresponds to the severe category for invasively ventilated children in PALICC-2 (2023) (OSI ≥ 12; SpO₂ 80–97%). PALICC-2 lowered this cutoff from the 2015 value of 12.3, and 12 — not 12.3 — is the value applied here; tertiary sources routinely conflate the two editions.",
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
        "Thomas NJ, Shaffer ML, Willson DF, Shih MC, Curley MAQ. Defining acute lung disease in children with the oxygenation saturation index. Pediatr Crit Care Med. 2010;11(1):12–17.",
      pmid: "19561556",
      doi: "10.1097/PCC.0b013e3181b0653d",
      note: "OSI derivation in children; SpO₂ ≤ 97% data restriction.",
    },
    {
      citation:
        "Khemani RG, Patel NR, Bart RD 3rd, Newth CJL. Comparison of the pulse oximetric saturation/fraction of inspired oxygen ratio and the PaO2/fraction of inspired oxygen ratio in children. Chest. 2009;135(3):662–668.",
      pmid: "19029434",
      doi: "10.1378/chest.08-2239",
      note: "Pediatric SpO₂-based derivation restricted to SpO₂ 80–97% — the source of this score's 80% floor.",
    },
    {
      citation:
        "Khemani RG, Thomas NJ, Venkatachalam V, et al; PALISI. Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. Crit Care Med. 2012;40(4):1309–1316.",
      pmid: "22202709",
      doi: "10.1097/CCM.0b013e31823bc61b",
      note: "Pediatric prospective validation in the same SpO₂ 80–97% window.",
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
        "Grades the exact PALICC-2 and Berlin cut-points correctly. The arithmetic behind these indices is binary and the thresholds are decimal, so a value that IS the cut-point did not compute to it: an OI of exactly 16 evaluates to 15.999999999999998 from a mean airway pressure of 24, FiO2 0.60 and PaO2 90; an OSI of exactly 12 to 11.999999999999998; a P/F of exactly 100 to 100.00000000000001. Compared raw, all three placed the patient one band TOO MILD, the under-triage direction and never the reverse, while the page printed the rounded figure beside the milder label and appeared to contradict itself. The band matcher now treats a value within a millionth of a millionth of a bound as being on it, which is four orders above the floating-point residue and far below any difference a clinician draws. NO OTHER VALUE MOVES: a number genuinely below a cut-point still bands below it. Found 2026-09-03 by an independent recompute of every calculator from its published source; the same defect as the PRISM 14-day age term, in a different unit. On this score a child at the severe threshold of 12, or at the diagnostic threshold of 5, was graded one tier milder.",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "OSI is an arithmetic formula; the PALICC 2015 / PALICC-2 diagnostic and severity thresholds (5, 7.5, 12.3, 12), the Thomas cutoffs and the Khemani SpO₂ 80–97% validity window are facts (numbers, formulas), not copyrightable expression. No verbatim scale-item wording is embedded; surrounding guideline prose is paraphrased (oi-osi.md IP status).",
  },
  formula: defineText(
    "osi.formula",
    "OSI = (mean airway pressure × FiO₂ × 100) ÷ SpO₂. FiO₂ enters as a fraction, and the ×100 factor is exactly what converts it to the percentage rendering, so the two forms give the identical number. This is the same convention as the Oxygenation Index, and carries the same 100-fold trap: applying both conventions, or neither, is a 100-fold error. The index is valid only for SpO₂ 80–97%, and a saturation outside that window is rejected rather than scored. Bands are the PALICC-2 (2023) cutoffs for invasively ventilated children: OSI < 5 is below the criterion, 5 to < 12 is mild–moderate, and OSI ≥ 12 is severe.",
  ),
  notes: defineText(
    "osi.notes",
    "OSI substitutes SpO₂ for PaO₂, sparing an arterial draw. It is valid only for SpO₂ 80–97%, and the two ends of that window are sourced differently. The ceiling is cited: the dissociation curve plateaus above it, so SpO₂ no longer tracks PaO₂ (Thomas 2010; PALICC-2). The floor of 80% is a documented implementation choice, being the lower edge of the window the paediatric SpO₂-based indices were derived in (Khemani 2009/2012). Below 80% the score declines to grade rather than extrapolate. The bands are PALICC-2 (2023) and apply to invasively ventilated children. PALICC-2 moved the severe cutoff from 12.3 (2015) to 12. Tertiary sources routinely conflate the editions, and 12 is current.",
  ),
  calculate: (values) => {
    // Return the raw index; `precision` rounds for DISPLAY only. Interpretation
    // bands are matched against this raw value so an OSI of 4.99 bands as
    // below-threshold (not mild–moderate) even though it displays as 5.0.
    const osi = (values.map_awp.value * values.fio2.value * 100) / values.spo2.value;
    return [
      {
        id: "osi",
        label: defineText("osi.output", "Oxygen saturation index (OSI)"),
        value: osi,
        unit: "",
        precision: 1,
      },
    ];
  },
});
