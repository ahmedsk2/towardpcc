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
      date: "2026-07-25",
      summary:
        "Initial release: OSI split out from the former OI/OSI score, with PALICC-2 (2023) two-tier severity bands and the SpO₂ ≤ 97% OSI validity guard.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "The accepted SpO₂ range narrows from 1–97% to 80–97%. The old 1% floor had no support in any primary source; 80% is the lower end of the window the SpO₂-based indices were derived and validated in (Khemani 2009/2012), and is the window S/F already enforces here. An SpO₂ below 80% is now rejected rather than scored. The PALICC-2 (2023) bands were re-verified and are unchanged — severe is OSI ≥ 12, not the 2015 value of 12.3 — and the ×100 FiO₂ convention is unchanged and now pinned by test.",
      reason: "new-reference",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "OSI is an arithmetic formula; the PALICC 2015 / PALICC-2 diagnostic and severity thresholds (5, 7.5, 12.3, 12), the Thomas cutoffs and the Khemani SpO₂ 80–97% validity window are facts (numbers, formulas), not copyrightable expression. No verbatim scale-item wording is embedded; surrounding guideline prose is paraphrased (oi-osi.md IP status).",
  },
  formula: defineText(
    "osi.formula",
    "OSI = (mean airway pressure × FiO₂ × 100) ÷ SpO₂, with MAP in cm H₂O, FiO₂ as a FRACTION (0.21–1.0), and SpO₂ as a percent. FiO₂ must be the fraction here: the ×100 factor is exactly what converts it to the percentage form PALICC-2 prints, MAP × FiO₂(%) ÷ SpO₂, so the two renderings give the identical number. Applying both conventions, or neither, is a 100-fold error in opposite directions, and a worked example pins the magnitude in the test suite. OSI is interpretable only for SpO₂ 80–97% — values outside that range are rejected as out-of-range and never scored. The raw index is banded against the PALICC-2 (2023) invasive-ventilation cutoffs: OSI < 5 is below the oxygenation criterion, 5 ≤ OSI < 12 is mild–moderate, and OSI ≥ 12 is severe. Bands are matched on the unrounded value even though the index is displayed to one decimal place.",
  ),
  notes: defineText(
    "osi.notes",
    "OSI is the mean airway pressure times FiO₂ times 100, divided by the pulse-oximeter oxygen saturation (SpO₂) — higher OSI means a worse oxygenation defect. It substitutes SpO₂ for the arterial PaO₂ used by the Oxygenation Index (OI), sparing an arterial draw, and is defined only on positive-pressure ventilation, where a mean airway pressure exists (conventional IMV or HFOV). SpO₂ is accepted only in the 80–97% window, and the two ends of that window are sourced differently, which is worth knowing before a reading is refused. The CEILING is cited: above ~97% the oxyhemoglobin dissociation curve plateaus and SpO₂ no longer tracks PaO₂, so OSI cannot discriminate severity (Thomas 2010; PALICC-2). The FLOOR is a documented implementation choice: no lower bound specific to OSI has ever been published, and 80% is adopted because it is the lower end of the SpO₂ 80–97% window the pediatric SpO₂-based indices were derived and validated in (Khemani 2009; Khemani 2012) — the same window this platform's S/F ratio enforces. A saturation below 80% is therefore not implausible, it is simply outside the evidence; the score declines to grade it rather than extrapolate. Interpretation bands here are the PALICC-2 (2023) two-tier scheme for invasively ventilated children: the oxygenation criterion is OSI ≥ 5 and severe is OSI ≥ 12. PALICC 2015 used a three-tier scheme — mild (5 ≤ OSI < 7.5), moderate (7.5 ≤ OSI < 12.3), severe (OSI ≥ 12.3) — and PALICC-2 collapsed the two lower tiers into mild–moderate and moved the OSI severe cutoff from 12.3 (2015) to 12 (2023). This implementation applies the PALICC-2 (2023) edition, so a reader who arrives expecting a severe cutoff of 12.3 has met a tertiary source that conflated the two editions; 12 is current. The ×100 factor exactly compensates for FiO₂ being a fraction; the PALICC table rendering MAP × FiO₂% / SpO₂ gives the same number — applying both or neither is a 100× error. The map_awp (5–50 cmH₂O) numeric limits are engineering input-validation bounds, not values from a specific publication [NEEDS SOURCE]. OSI classifies a physiologic defect; it is not an individual-patient outcome prediction.",
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
