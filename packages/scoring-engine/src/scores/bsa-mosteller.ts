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
      date: "2026-09-03",
      summary: "Initial published text.",
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
    "BSA in square metres is the square root of (height in cm × weight in kg ÷ 3600). There are no age or sex terms. Compute in full floating point and round once at display.",
  ),
  notes: defineText(
    "bsa.notes",
    "BSA is a body-size scalar consumed by downstream calculations such as mg/m² dosing and cardiac index, so it carries no bands. Mosteller was validated against the Du Bois formula, itself fit to 9 adults in 1916, rather than against direct measurement. Agreement with pediatric-fit estimators widens at the extremes (neonates, severe obesity), so any platform indexing by BSA should record which formula it uses. The main failure mode is unit transposition (lb↔kg, in↔cm): because BSA scales as a square root, a swapped unit yields a wrong-but-plausible number the formula cannot self-detect.",
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
