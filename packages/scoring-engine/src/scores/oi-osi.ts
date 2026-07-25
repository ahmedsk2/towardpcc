import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fractionWithPercent, percent } from "../units/fraction";
import { cmH2O, mmhgWithKpa } from "../units/pressure";

/**
 * Oxygenation Index (OI) and Oxygen Saturation Index (OSI) — two bedside
 * oxygenation-defect indices that fold the ventilator support required (mean
 * airway pressure and FiO₂) into the oxygenation achieved (PaO₂ or SpO₂). They
 * are the PALICC/PALICC-2 metrics for grading PARDS severity in invasively
 * ventilated children. Higher value = worse oxygenation defect.
 *
 *   OI  = (MAP × FiO₂ × 100) / PaO₂     [MAP cmH₂O, FiO₂ fraction, PaO₂ mmHg]
 *   OSI = (MAP × FiO₂ × 100) / SpO₂     [MAP cmH₂O, FiO₂ fraction, SpO₂ %]
 *
 * The ×100 factor exactly compensates for FiO₂ being a fraction (0.21–1.0): the
 * PALICC executive-summary rendering MAP × FiO₂% / PaO₂ is the SAME number.
 * Applying both — or neither — is a 100× error (oi-osi.md worked example 3).
 *
 * Hard validity constraint: OSI is interpretable only when SpO₂ ≤ 97% (above
 * that the oxyhemoglobin dissociation curve plateaus and SpO₂ no longer tracks
 * PaO₂). SpO₂ is therefore bounded at 97 so any value above it is REJECTED as
 * out-of-range rather than yielding an uninterpretable OSI (Thomas 2010;
 * PALICC-2).
 *
 * Interpretation bands here are PALICC-2 (2023) two-tier (IMV); the PALICC 2015
 * three-tier scheme is documented in the notes for context only.
 *
 * Research + full sourcing: docs/research/scores/oi-osi.md.
 */
export const oiOsi = defineScore({
  id: "oi-osi",
  slug: "oi-osi",
  name: "Oxygenation Index and Oxygen Saturation Index (OI/OSI)",
  version: "1.0.0",
  status: "published",
  category: "respiratory",
  inputs: [
    {
      id: "map_awp",
      label: defineText("oiosi.map", "Mean airway pressure (MAP)"),
      required: true,
      type: "numeric",
      unit: cmH2O,
      // Input-validity bounds, not a cited clinical threshold (oi-osi.md
      // [NEEDS SOURCE]): only defined on positive-pressure ventilation.
      min: 5,
      max: 50,
      helpText: defineText(
        "oiosi.map.help",
        "Ventilator-reported mean airway pressure in cm H₂O. Only defined on positive-pressure ventilation (conventional IMV or HFOV).",
      ),
    },
    {
      id: "fio2",
      label: defineText("oiosi.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText(
        "oiosi.fio2.help",
        "Room air is 0.21. Accepts a fraction or a percentage.",
      ),
    },
    {
      id: "pao2",
      label: defineText("oiosi.pao2", "Arterial oxygen tension (PaO₂)"),
      required: true,
      type: "numeric",
      unit: mmhgWithKpa,
      // Input-validity bounds, not a cited clinical threshold (oi-osi.md
      // [NEEDS SOURCE]).
      min: 10,
      max: 700,
      helpText: defineText("oiosi.pao2.help", "From an arterial blood gas. Accepts mmHg or kPa."),
    },
    {
      id: "spo2",
      label: defineText("oiosi.spo2", "Pulse oximeter oxygen saturation (SpO₂)"),
      required: true,
      type: "numeric",
      unit: percent,
      // Hard OSI validity guard, not an engineering guess: OSI is interpretable
      // only when SpO₂ ≤ 97% — above that the dissociation curve plateaus and
      // SpO₂ no longer tracks PaO₂ (Thomas 2010; PALICC-2). Values above 97 are
      // rejected as out-of-range, never scored. Min 1 is an input-validity floor.
      min: 1,
      max: 97,
      helpText: defineText(
        "oiosi.spo2.help",
        "Measured at steady state, not during a transient desaturation. Valid for OSI only when ≤ 97%; above 97% the index is not interpretable.",
      ),
    },
  ] as const,
  interpretation: [
    {
      id: "oi-below-threshold",
      appliesTo: "oi",
      min: null,
      max: 4,
      label: defineText("oiosi.oi.below", "OI < 4"),
      description: defineText(
        "oiosi.oi.below.desc",
        "Below the PALICC-2 (2023) invasive-ventilation oxygenation criterion for PARDS (OI ≥ 4). Interpret in the full clinical context.",
      ),
    },
    {
      id: "oi-mild-moderate",
      appliesTo: "oi",
      min: 4,
      max: 16,
      label: defineText("oiosi.oi.mildmod", "OI 4 to < 16"),
      description: defineText(
        "oiosi.oi.mildmod.desc",
        "Corresponds to the mild–moderate category for invasively ventilated children in PALICC-2 (2023) (OI ≥ 4 meets the oxygenation criterion; OI < 16).",
      ),
    },
    {
      id: "oi-severe",
      appliesTo: "oi",
      min: 16,
      max: null,
      label: defineText("oiosi.oi.severe", "OI ≥ 16"),
      description: defineText(
        "oiosi.oi.severe.desc",
        "Corresponds to the severe category for invasively ventilated children in PALICC-2 (2023) (OI ≥ 16).",
      ),
    },
    {
      id: "osi-below-threshold",
      appliesTo: "osi",
      min: null,
      max: 5,
      label: defineText("oiosi.osi.below", "OSI < 5"),
      description: defineText(
        "oiosi.osi.below.desc",
        "Below the PALICC-2 (2023) invasive-ventilation oxygenation criterion for PARDS (OSI ≥ 5). Valid only when SpO₂ ≤ 97%. Interpret in the full clinical context.",
      ),
    },
    {
      id: "osi-mild-moderate",
      appliesTo: "osi",
      min: 5,
      max: 12,
      label: defineText("oiosi.osi.mildmod", "OSI 5 to < 12"),
      description: defineText(
        "oiosi.osi.mildmod.desc",
        "Corresponds to the mild–moderate category for invasively ventilated children in PALICC-2 (2023) (OSI ≥ 5 meets the oxygenation criterion; OSI < 12; SpO₂ ≤ 97%).",
      ),
    },
    {
      id: "osi-severe",
      appliesTo: "osi",
      min: 12,
      max: null,
      label: defineText("oiosi.osi.severe", "OSI ≥ 12"),
      description: defineText(
        "oiosi.osi.severe.desc",
        "Corresponds to the severe category for invasively ventilated children in PALICC-2 (2023) (OSI ≥ 12; SpO₂ ≤ 97%). PALICC-2 lowered this cutoff from the 2015 value of 12.3.",
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
        "Thomas NJ, Shaffer ML, Willson DF, Shih MC, Curley MAQ. Defining acute lung disease in children with the oxygenation saturation index. Pediatr Crit Care Med. 2010;11(1):12–17.",
      pmid: "19561556",
      doi: "10.1097/PCC.0b013e3181b0653d",
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
        "Initial release: OI and OSI with PALICC-2 (2023) two-tier severity bands and the SpO₂ ≤ 97% OSI validity guard.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "OI and OSI are arithmetic formulas; the PALICC 2015 / PALICC-2 diagnostic and severity thresholds (4, 8, 16; 5, 7.5, 12.3, 12) and the Thomas/Slaughter cutoffs are facts (numbers, formulas), not copyrightable expression. No verbatim scale-item wording is embedded; surrounding guideline prose is paraphrased (oi-osi.md IP status).",
  },
  notes: defineText(
    "oiosi.notes",
    "Interpretation bands here are the PALICC-2 (2023) two-tier scheme for invasively ventilated children: the oxygenation criterion is OI ≥ 4 or OSI ≥ 5, severe is OI ≥ 16 or OSI ≥ 12. PALICC 2015 used a three-tier scheme — mild (4 ≤ OI < 8 or 5 ≤ OSI < 7.5), moderate (8 ≤ OI < 16 or 7.5 ≤ OSI < 12.3), severe (OI ≥ 16 or OSI ≥ 12.3) — and PALICC-2 moved the OSI severe cutoff from 12.3 (2015) to 12 (2023) while leaving the OI severe cutoff (≥ 16) unchanged; this implementation applies the PALICC-2 (2023) edition. OSI is valid only when SpO₂ ≤ 97%: above ~97% the oxyhemoglobin dissociation curve plateaus and SpO₂ no longer tracks PaO₂, so OSI cannot discriminate severity (Thomas 2010; PALICC-2) — SpO₂ > 97% is rejected, never scored. Both indices are defined only on positive-pressure ventilation (a mean airway pressure must exist). [NEEDS SOURCE]: the map_awp (5–50 cmH₂O) and pao2 (10–700 mmHg) numeric limits are engineering input-validation bounds, not values from a specific publication. These indices classify a physiologic defect; they are not individual-patient outcome predictions.",
  ),
  calculate: (values) => {
    const support = values.map_awp.value * values.fio2.value * 100;
    const oi = support / values.pao2.value;
    const osi = support / values.spo2.value;
    const round1 = (x: number) => Math.round(x * 10) / 10;
    return [
      {
        id: "oi",
        label: defineText("oiosi.output.oi", "Oxygenation index (OI)"),
        value: round1(oi),
        unit: "",
        precision: 1,
      },
      {
        id: "osi",
        label: defineText("oiosi.output.osi", "Oxygen saturation index (OSI)"),
        value: round1(osi),
        unit: "",
        precision: 1,
      },
    ];
  },
});
