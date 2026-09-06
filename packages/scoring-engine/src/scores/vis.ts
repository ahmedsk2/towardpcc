import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { mcgPerKgPerMin, unitsPerKgPerMin } from "../units/infusion";

/**
 * Vasoactive-Inotropic Score (VIS) — Gaies et al. 2010 (PMID 19794327).
 * A continuous weighted linear sum of vasoactive/inotropic infusion rates:
 *
 *   VIS = dopamine + dobutamine + 100·epinephrine + 10·milrinone
 *       + 10000·vasopressin + 100·norepinephrine
 *
 * Every drug is an optional numeric input; an agent not running contributes 0.
 * No branches, no floor/ceiling, no age adjustment. This is the ORIGINAL
 * six-drug pediatric VIS, confirmed against Box 1 of the Gaies 2010 primary.
 * Phenylephrine appears in NEITHER Gaies 2010 nor the Gaies 2014 re-derivation,
 * so leaving it out is not an omission — it is what makes this a Gaies VIS; the
 * levosimendan (×50) and phenylephrine (×10) terms of the adult/ECMO variants,
 * and the newer agents whose proposed coefficients disagree by up to 100-fold
 * between proposals, are deliberately not offered (see notes).
 * Research + full sourcing: docs/research/scores/vis.md.
 */
export const vis = defineScore({
  id: "vis",
  slug: "vis",
  name: "Vasoactive-Inotropic Score (VIS)",
  tagline: defineText(
    "vis.tagline",
    "Vasoactive and inotropic support summed into one number, six drugs",
  ),
  version: "1.0.1",
  status: "published",
  category: "fluids-resuscitation",
  inputs: [
    {
      id: "dopamine",
      label: defineText("vis.dopamine", "Dopamine"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
      max: 50,
      step: 0.5,
      helpText: defineText(
        "vis.dopamine.help",
        "Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×1. Leave blank if not running.",
      ),
    },
    {
      id: "dobutamine",
      label: defineText("vis.dobutamine", "Dobutamine"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
      max: 40,
      step: 0.5,
      helpText: defineText(
        "vis.dobutamine.help",
        "Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×1. Leave blank if not running.",
      ),
    },
    {
      id: "epinephrine",
      label: defineText("vis.epinephrine", "Epinephrine (adrenaline)"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
      max: 2,
      step: 0.01,
      helpText: defineText(
        "vis.epinephrine.help",
        "Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×100. Leave blank if not running.",
      ),
    },
    {
      id: "milrinone",
      label: defineText("vis.milrinone", "Milrinone"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
      max: 1.5,
      step: 0.05,
      helpText: defineText(
        "vis.milrinone.help",
        "Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×10. Leave blank if not running.",
      ),
    },
    {
      id: "vasopressin",
      label: defineText("vis.vasopressin", "Vasopressin"),
      required: false,
      type: "numeric",
      unit: unitsPerKgPerMin,
      min: 0,
      // Local input-validity convention (no published VIS dose maximum, as above).
      // Unit trap: canonical is units/kg/min with coefficient 10,000 — accepts
      // milliunits/kg/min (÷1000). 0.0003 units/kg/min = 3 VIS points.
      max: 0.01,
      step: 0.0001,
      helpText: defineText(
        "vis.vasopressin.help",
        "Infusion rate in units/kg/min (NOT mcg). Coefficient ×10,000. Accepts milliunits/kg/min. Leave blank if not running.",
      ),
    },
    {
      id: "norepinephrine",
      label: defineText("vis.norepinephrine", "Norepinephrine (noradrenaline)"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
      max: 2,
      step: 0.01,
      helpText: defineText(
        "vis.norepinephrine.help",
        "Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×100. Leave blank if not running.",
      ),
    },
  ] as const,
  // No universal interpretation bands: VIS is a continuous support-intensity index
  // with no single official cut-point. Published cut-points are cohort-specific and
  // span roughly 10–30 with no convergence across studies (Belletti 2021), so they
  // are reported descriptively in the notes rather than as an automated risk label.
  interpretation: [],
  references: [
    {
      citation:
        "Gaies MG, Gurney JG, Yen AH, Napoli ML, Gajarski RJ, Ohye RG, Charpie JR, Hirsch JC. Vasoactive-inotropic score as a predictor of morbidity and mortality in infants after cardiopulmonary bypass. Pediatr Crit Care Med. 2010;11(2):234–238.",
      pmid: "19794327",
      doi: "10.1097/PCC.0b013e3181b806fc",
      note: "Original VIS derivation (primary). Table 1 (p235) is the source of the adjusted OR 8.1 (95% CI 3.4–19.2, p<0.001), of the six coefficients (Box 1), and of the five-group, two-period classification with its per-group cut-points, all now stated in the notes. No extraction gap remains.",
    },
    {
      citation:
        "Gaies MG, Jeffries HE, Niebler RA, Pasquali SK, Donohue JE, Yu S, Gall C, Rice TB, Thiagarajan RR. Vasoactive-inotropic score is associated with outcome after infant cardiac surgery: an analysis from the Pediatric Cardiac Critical Care Consortium and Virtual PICU System Registries. Pediatr Crit Care Med. 2014;15(6):529–537.",
      pmid: "24777300",
      doi: "10.1097/PCC.0000000000000153",
      note: "Re-derivation on the same six coefficients (no phenylephrine); source of the single flat threshold quoted in the notes — maximum VIS ≥ 20 in the first 24 h, adjusted OR 6.5 (95% CI 2.9–14.6).",
    },
    {
      citation:
        "Davidson J, Tong S, Hancock H, Hauck A, da Cruz E, Kaufman J. Prospective validation of the vasoactive-inotropic score and correlation to short-term outcomes in neonates and infants after cardiothoracic surgery. Intensive Care Med. 2012;38(7):1184–1190.",
      pmid: "22527067",
      doi: "10.1007/s00134-012-2544-x",
      note: "Reproduces the exact formula (Fig 1); provides a cohort-specific VIS48 cut-point of 10.5.",
    },
    {
      citation:
        "Wernovsky G, Wypij D, Jonas RA, Mayer JE Jr, Hanley FL, Hickey PR, Walsh AZ, Chang AC, Castañeda AR, Newburger JW, Wessel DL. Postoperative course and hemodynamic profile after the arterial switch operation in neonates and infants. Circulation. 1995;92(8):2226–2235.",
      pmid: "7554206",
      doi: "10.1161/01.cir.92.8.2226",
      note: "Original Inotrope Score (dopamine + dobutamine + 100×epinephrine) that VIS extends.",
    },
    {
      citation:
        "Sun Y, Wu W, Yao Y. The association of vasoactive-inotropic score and surgical patients' outcomes: a systematic review and meta-analysis. Syst Rev. 2024;13:20.",
      doi: "10.1186/s13643-023-02403-1",
      note: "Independent confirmation of the fully expanded six-drug formula and coefficients.",
    },
    {
      citation:
        "Belletti A, Lerose CC, Zangrillo A, Landoni G. Vasoactive-Inotropic Score: Evolution, Clinical Utility, and Pitfalls. J Cardiothorac Vasc Anesth. 2021;35(10):3067–3077.",
      pmid: "33069558",
      doi: "10.1053/j.jvca.2020.09.117",
      note: "Cited for the cut-point controversy quoted in the notes: optimal cut-points reported across studies span roughly 10–30 with no convergence on a single value. That finding comes from the 2026-08-04 review and this full text has not been fetched here; the bibliographic details were resolved against the NCBI E-utilities record for PMID 33069558 on 2026-08-04 rather than recalled.",
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
    {
      version: "1.0.1",
      date: "2026-09-06",
      summary:
        "Added a one-line description for the catalogue card. No rule, threshold or reference changed.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "VIS is a weighted arithmetic sum of drug infusion rates (facts plus a mathematical formula). Coefficients and the formula are not copyrightable, and VIS has no free-text scale-item descriptors to license (vis.md IP status).",
  },
  missingAsNormal: true,
  formula: defineText(
    "vis.formula",
    "VIS = dopamine + dobutamine + 100 × epinephrine + 10 × milrinone + 10,000 × vasopressin + 100 × norepinephrine. This is the original six-drug formula of Gaies 2010, with coefficients unchanged in Gaies 2014. All rates are in µg/kg/min except vasopressin, which is in units/kg/min, the one unit trap in the score. An agent not running contributes 0. The result is a continuous index with no floor, ceiling, age adjustment, or bands.",
  ),
  notes: defineText(
    "vis.notes",
    "Phenylephrine is not part of VIS. It is absent from both Gaies papers, so its absence here is correct, not a gap. Newer agents are excluded as a positive decision: proposed coefficients disagree up to 100-fold between sources (methylene blue 1 vs 20, angiotensin II 0.25 vs 25), so including any would break comparability with the literature. The output is always a true Gaies VIS. No cut-point is applied, because none transfers: reported optima span roughly 10–30 across populations (Belletti 2021). For reference, with their effect sizes: Gaies 2010 high VIS means a maximum of 20 or more in the first 24 h or 15 or more in hours 24–48 (adjusted OR 8.1, 95% CI 3.4–19.2); Gaies 2014 uses a single flat maximum of 20 or more in the first 24 h (OR 6.5, 2.9–14.6); Davidson 2012 gives a cohort-specific VIS-at-48-h of 10.5 in neonates and infants after cardiac surgery. VIS is a snapshot; the prognostic quantity in the literature is the maximum over a defined window, which must be defined and labelled. No per-drug dose ceilings are published for VIS (confirmed absent); the input maxima here are local validity bounds with no clinical authority.",
  ),
  calculate: (values) => {
    // Optional inputs default to a 0 contribution when the drug is not running.
    const dopamine = values.dopamine?.value ?? 0;
    const dobutamine = values.dobutamine?.value ?? 0;
    const epinephrine = values.epinephrine?.value ?? 0;
    const milrinone = values.milrinone?.value ?? 0;
    const vasopressin = values.vasopressin?.value ?? 0; // canonical units/kg/min
    const norepinephrine = values.norepinephrine?.value ?? 0;

    const score =
      dopamine +
      dobutamine +
      100 * epinephrine +
      10 * milrinone +
      10000 * vasopressin +
      100 * norepinephrine;

    return [
      {
        id: "vis",
        label: defineText("vis.output", "Vasoactive-Inotropic Score"),
        value: score,
        unit: "",
        // Continuous score, value not rounded. precision is a display choice
        // (1 dp) for the UI — the research states no rounding convention.
        precision: 1,
      },
    ];
  },
});
