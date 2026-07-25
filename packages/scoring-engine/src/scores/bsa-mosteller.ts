import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { cmWithInAndM } from "../units/length";
import { kgWithLbAndG } from "../units/mass";

/**
 * Body surface area (BSA), Mosteller 1987 simplified formula. A body-size
 * SCALAR, not a severity/risk score: it emits a single continuous quantity in
 * m² used downstream as a denominator/normalizer (drug dosing per m², cardiac
 * index L/min/m²). Single closed-form square root — no branches, no age/sex
 * terms, and no interpretation bands (research §"Interpretation bands":
 * "This measure has NO interpretation, severity, or risk bands.").
 *
 *   BSA (m²) = sqrt( height_cm × weight_kg / 3600 )   [ = sqrt(h × w) / 60 ]
 *
 * Research + full sourcing: docs/research/scores/bsa-mosteller.md.
 */
export const bsaMosteller = defineScore({
  id: "bsa-mosteller",
  slug: "bsa-mosteller",
  name: "Body surface area (Mosteller)",
  version: "1.0.0",
  status: "published",
  category: "general",
  inputs: [
    {
      id: "height_cm",
      label: defineText("bsa.height", "Height"),
      required: true,
      type: "numeric",
      unit: cmWithInAndM,
      // input-validity bound, not a cited threshold: bsa-mosteller.md Inputs
      // table gives ~30–220 cm as a deliberately wide PICU plausibility span
      // (micro-premature neonate to large adolescent), "not from Mosteller 1987".
      min: 30,
      max: 220,
      helpText: defineText(
        "bsa.height.help",
        "Body length / height. Accepts centimetres (default), inches, or metres.",
      ),
    },
    {
      id: "weight_kg",
      label: defineText("bsa.weight", "Weight"),
      required: true,
      type: "numeric",
      unit: kgWithLbAndG,
      // input-validity bound, not a cited threshold: bsa-mosteller.md Inputs
      // table gives ~0.3–250 kg as a deliberately wide PICU plausibility span,
      // "not from Mosteller 1987".
      min: 0.3,
      max: 250,
      helpText: defineText(
        "bsa.weight.help",
        "Body weight. Accepts kilograms (default), pounds, or grams.",
      ),
    },
  ] as const,
  // Body-size scalar — no severity/risk bands exist (research
  // §"Interpretation bands"). Intentionally empty; see notes.
  interpretation: [],
  references: [
    {
      citation:
        "Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098.",
      pmid: "3657876",
      doi: "10.1056/NEJM198710223171717",
      note: "Primary source: BSA = sqrt(height·weight/3600) (metric) and the sqrt(height·weight/3131) imperial variant.",
    },
    {
      citation:
        "Du Bois D, Du Bois EF. A formula to estimate the approximate surface area if height and weight be known. Arch Intern Med. 1916;17(6):863–871. (Reprinted: Nutrition. 1989;5(5):303–311.)",
      pmid: "2520314",
      note: "The comparator/gold-standard formula the Mosteller estimator was designed to approximate; cited for the limitations discussion, not implemented.",
    },
    {
      citation: "Evidencio — Body surface area (Mosteller formula), model 518.",
      url: "https://www.evidencio.com/models/show/518",
      note: "Secondary confirmation of the metric formula BSA(m²) = sqrt(height_cm × weight_kg / 3600) and the Mosteller 1987 citation.",
    },
    {
      citation: "Omnicalculator — BSA Calculator (Body Surface Area).",
      url: "https://www.omnicalculator.com/health/bsa",
      note: "Secondary confirmation and the 170 cm / 60 kg worked example (Example D) reproduced as an external check.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary: "Initial release: Mosteller body surface area from height and weight.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      'The Mosteller estimator is a single mathematical expression (a square root of a product over the constant 3600); formulas, constants, and the ½-power are facts/algorithms, not copyrightable expression, and there is no proprietary scale wording (research §"IP status").',
  },
  formula: defineText(
    "bsa.formula",
    "Body surface area is estimated with the Mosteller (1987) formula: BSA in square metres = the square root of (height in cm × weight in kg ÷ 3600), which is equivalently √(height × weight) ÷ 60. It is a single closed-form expression with no age or sex terms and no interpretation bands. The result is a body-size scalar used as a denominator elsewhere — e.g. drug dosing per m² (mg/m²) and indexed haemodynamic/renal parameters such as cardiac index (L/min/m²). Compute in full floating point and round once at display (precision 2); do not chain rounded intermediates.",
  ),
  notes: defineText(
    "bsa.notes",
    "No interpretation bands: BSA is a continuous body-size scalar with no published cut-point that stratifies patients, so interpretation is intentionally empty — present the value as a derived body-size estimate and defer any dosing/indexing interpretation to the downstream calculation that consumes it. Estimate only, not a clinical device: Mosteller was validated only against the Du Bois formula (itself fit to 9 adults in 1916), not against direct surface-area measurement; agreement with pediatric-fit estimators (Haycock, Gehan-George) is close but widens at the extremes (neonates, severe obesity), so a platform indexing by BSA should record which formula it uses. The main failure mode is unit transposition (lb↔kg, in↔cm): because BSA scales as sqrt(h·w) a swapped unit yields a wrong-but-plausible number the formula cannot self-detect — unit labels and the range checks are the defense. The height (~30–220 cm) and weight (~0.3–250 kg) bounds are input-validity limits chosen to span the PICU range, NOT clinical limits and not from Mosteller 1987. NEEDS SOURCE (carried from research): a specific head-to-head pediatric accuracy figure vs Haycock/Gehan-George is not asserted here, and any protocol BSA cap for dosing (commonly cited around 2.0–2.2 m²) is a protocol overlay, not part of Mosteller, and lacks a primary numeric source.",
  ),
  calculate: (values) => {
    // Return the RAW computed BSA; per-value `precision` rounds for DISPLAY
    // only. Single closed-form expression — no branches, no bands. Canonical
    // units are cm and kg (validation/normalization already applied).
    const bsa = Math.sqrt((values.height_cm.value * values.weight_kg.value) / 3600);
    return [
      {
        id: "bsa",
        label: defineText("bsa.output", "Body surface area (BSA)"),
        value: bsa,
        unit: "m²",
        precision: 2,
      },
    ];
  },
});
