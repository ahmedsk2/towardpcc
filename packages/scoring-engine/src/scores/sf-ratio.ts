import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fractionWithPercent, percent } from "../units/fraction";

/**
 * SpO₂/FiO₂ ratio (S/F) — arithmetic oxygenation index that substitutes the
 * pulse-oximeter saturation for PaO₂ when an arterial gas is unavailable.
 *
 * S/F = SpO₂ (%) / FiO₂ (fraction). Interpretation bands use the PALICC-2
 * (2023) pediatric non-invasive-ventilation PARDS strata.
 *
 * Hard validity constraint: S/F is only interpretable when SpO₂ ≤ 97% (above
 * that the oxyhemoglobin dissociation curve plateaus and S/F loses
 * discrimination). SpO₂ is therefore bounded at 97 so any value above it is
 * REJECTED as out-of-range rather than yielding an uninterpretable number.
 *
 * The published P/F↔S/F conversion equations (Rice 2007; Khemani 2009/2012)
 * are documented in the research note but are deliberately NOT implemented
 * here — this calculator returns the direct S/F ratio only.
 *
 * Research + full sourcing: docs/research/scores/pf-sf.md.
 */
export const sfRatio = defineScore({
  id: "sf-ratio",
  slug: "sf-ratio",
  name: "SpO₂/FiO₂ ratio (S/F)",
  version: "1.0.0",
  status: "published",
  category: "respiratory",
  inputs: [
    {
      id: "spo2",
      label: defineText("sf.spo2", "Pulse oximeter oxygen saturation (SpO₂)"),
      required: true,
      type: "numeric",
      unit: percent,
      // Cited validity window, not an engineering guess: S/F is interpretable
      // only for SpO₂ 80–97% — max 97 is the hard PALICC-2 / Rice / Khemani
      // ceiling (flat top of the dissociation curve); min 80 is the lower end
      // of the Khemani derivation range (pf-sf.md: "treat S/F below SpO₂ 80% or
      // above 97% as out-of-range"). Values outside are rejected, not computed.
      min: 80,
      max: 97,
      helpText: defineText(
        "sf.spo2.help",
        "Measured at steady state, not during a transient desaturation. Valid for S/F only when 80–97%; above 97% the ratio is not interpretable.",
      ),
    },
    {
      id: "fio2",
      label: defineText("sf.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: true,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText("sf.fio2.help", "Room air is 0.21. Accepts a fraction or a percentage."),
    },
  ] as const,
  // Descending score: lower S/F is worse, cutpoints are "≤" → (min, max].
  interpretation: [
    {
      id: "severe",
      appliesTo: "sf_ratio",
      min: null,
      max: 150,
      maxInclusive: true,
      label: defineText("sf.band.severe", "≤ 150"),
      description: defineText(
        "sf.band.severe.desc",
        "Corresponds to the severe category for non-invasive-ventilation PARDS in PALICC-2 (2023) (full-facemask CPAP/BiPAP with PEEP ≥ 5 cm H₂O; SpO₂ ≤ 97%).",
      ),
    },
    {
      id: "mild-moderate",
      appliesTo: "sf_ratio",
      min: 150,
      minInclusive: false,
      max: 250,
      maxInclusive: true,
      label: defineText("sf.band.mildmod", "> 150 to ≤ 250"),
      description: defineText(
        "sf.band.mildmod.desc",
        "Meets the PALICC-2 (2023) non-invasive-ventilation PARDS oxygenation criterion (S/F ≤ 250) and corresponds to the mild/moderate category (S/F > 150).",
      ),
    },
    {
      id: "above-threshold",
      appliesTo: "sf_ratio",
      min: 250,
      minInclusive: false,
      max: null,
      label: defineText("sf.band.above", "> 250"),
      description: defineText(
        "sf.band.above.desc",
        "Above the PALICC-2 non-invasive-ventilation PARDS oxygenation threshold (S/F ≤ 250). Interpret in the full clinical context.",
      ),
    },
  ],
  references: [
    {
      citation:
        "Emeriaud G, López-Fernández YM, Iyer NP, et al; PALICC-2. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168.",
      pmid: "36661420",
      doi: "10.1097/PCC.0000000000003147",
    },
    {
      citation:
        "Khemani RG, Thomas NJ, Venkatachalam V, et al; PALISI. Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. Crit Care Med. 2012;40(4):1309–1316.",
      pmid: "22202709",
      doi: "10.1097/CCM.0b013e31823bc61b",
    },
    {
      citation:
        "Rice TW, Wheeler AP, Bernard GR, et al; NIH NHLBI ARDS Network. Comparison of the SpO2/FiO2 ratio and the PaO2/FiO2 ratio in patients with acute lung injury or ARDS. Chest. 2007;132(2):410–417.",
      pmid: "17573487",
      doi: "10.1378/chest.07-0617",
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
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Arithmetic ratio; PALICC-2 numeric thresholds and the Rice/Khemani regression coefficients are facts, not copyrightable expression (pf-sf.md IP status). No verbatim scale-item wording is reproduced.",
  },
  formula: defineText(
    "sf.formula",
    "S/F = SpO₂ (%) ÷ FiO₂ (fraction). It is computed only for SpO₂ 80–97%. Above 97% the dissociation curve plateaus and the ratio cannot discriminate, so a value outside that window is rejected rather than scored. The bands are the PALICC-2 (2023) strata for non-invasive-ventilation PARDS (full-facemask CPAP/BiPAP with PEEP ≥ 5 cmH₂O): ≤ 150 is severe, > 150 to ≤ 250 is mild/moderate (≤ 250 meets the NIV-PARDS oxygenation criterion), and > 250 is above the threshold.",
  ),
  notes: defineText(
    "sf.notes",
    "The 2024 global adult ARDS definition cuts S/F at ≤ 315, so a value between 250 and 315 is below the adult threshold while above the paediatric one. Both frameworks are correct, so read the number against the one intended. FiO₂ estimation on nasal cannula or low-flow is unreliable. Prefer P/F when a gas is available, and prefer OI/OSI on invasive ventilation.",
  ),
  calculate: (values) => {
    const ratio = values.spo2.value / values.fio2.value;
    return [
      {
        id: "sf_ratio",
        label: defineText("sf.output", "S/F ratio"),
        // Raw value; `precision` rounds for display only. Bands match the raw.
        value: ratio,
        unit: "",
        precision: 0,
      },
    ];
  },
});
