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
 * six-drug pediatric VIS — the published levosimendan (×50) and phenylephrine
 * (×10) extensions are deliberately NOT included so this never silently reports
 * a non-Gaies value (see notes). Research + full sourcing: docs/research/scores/vis.md.
 */
export const vis = defineScore({
  id: "vis",
  slug: "vis",
  name: "Vasoactive-Inotropic Score (VIS)",
  version: "1.0.0",
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
      // input-validity bound, not a cited threshold (see research [NEEDS SOURCE])
      max: 50,
      step: 0.5,
      helpText: defineText(
        "vis.dopamine.help",
        "Infusion rate in mcg/kg/min. Coefficient ×1. Leave blank if not running.",
      ),
    },
    {
      id: "dobutamine",
      label: defineText("vis.dobutamine", "Dobutamine"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // input-validity bound, not a cited threshold (see research [NEEDS SOURCE])
      max: 40,
      step: 0.5,
      helpText: defineText(
        "vis.dobutamine.help",
        "Infusion rate in mcg/kg/min. Coefficient ×1. Leave blank if not running.",
      ),
    },
    {
      id: "epinephrine",
      label: defineText("vis.epinephrine", "Epinephrine (adrenaline)"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // input-validity bound, not a cited threshold (see research [NEEDS SOURCE])
      max: 2,
      step: 0.01,
      helpText: defineText(
        "vis.epinephrine.help",
        "Infusion rate in mcg/kg/min. Coefficient ×100. Leave blank if not running.",
      ),
    },
    {
      id: "milrinone",
      label: defineText("vis.milrinone", "Milrinone"),
      required: false,
      type: "numeric",
      unit: mcgPerKgPerMin,
      min: 0,
      // input-validity bound, not a cited threshold (see research [NEEDS SOURCE])
      max: 1.5,
      step: 0.05,
      helpText: defineText(
        "vis.milrinone.help",
        "Infusion rate in mcg/kg/min. Coefficient ×10. Leave blank if not running.",
      ),
    },
    {
      id: "vasopressin",
      label: defineText("vis.vasopressin", "Vasopressin"),
      required: false,
      type: "numeric",
      unit: unitsPerKgPerMin,
      min: 0,
      // input-validity bound, not a cited threshold (see research [NEEDS SOURCE]).
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
      // input-validity bound, not a cited threshold (see research [NEEDS SOURCE])
      max: 2,
      step: 0.01,
      helpText: defineText(
        "vis.norepinephrine.help",
        "Infusion rate in mcg/kg/min. Coefficient ×100. Leave blank if not running.",
      ),
    },
  ] as const,
  // No universal interpretation bands: VIS is a continuous support-intensity index
  // with no single official cut-point; published cut-points are cohort-specific
  // (see notes) and are reported descriptively rather than as an automated risk label.
  interpretation: [],
  references: [
    {
      citation:
        "Gaies MG, Gurney JG, Yen AH, Napoli ML, Gajarski RJ, Ohye RG, Charpie JR, Hirsch JC. Vasoactive-inotropic score as a predictor of morbidity and mortality in infants after cardiopulmonary bypass. Pediatr Crit Care Med. 2010;11(2):234–238.",
      pmid: "19794327",
      doi: "10.1097/PCC.0b013e3181b806fc",
      note: "Original VIS derivation (primary).",
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
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary: "Initial release: original six-drug Gaies 2010 VIS as a continuous weighted sum.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "VIS is a weighted arithmetic sum of drug infusion rates (facts plus a mathematical formula). Coefficients and the formula are not copyrightable, and VIS has no free-text scale-item descriptors to license (vis.md IP status).",
  },
  notes: defineText(
    "vis.notes",
    "Original six-drug Gaies 2010 VIS = dopamine + dobutamine + 100×epinephrine + 10×milrinone + 10,000×vasopressin(units/kg/min) + 100×norepinephrine. Published extensions (levosimendan ×50, phenylephrine ×10) are intentionally excluded so the output is always a true Gaies VIS; the phenylephrine ×10 coefficient is itself [NEEDS SOURCE] (no directly-fetched primary text). VIS is a continuous index of vasoactive/inotropic support intensity, not a diagnostic test or clinical device, and higher values are an association marker for morbidity/mortality in the cited cohorts, not a treatment trigger. There is no single official cut-point: Davidson 2012 reports a cohort-specific VIS-at-48h threshold of 10.5 in neonates/infants after cardiac surgery, and Gaies 2010 reports an adjusted OR 8.1 (95% CI 3.4–19.2) for high vs low maximum VIS over the first 48h; the exact Gaies high/low dichotomization value is [NEEDS SOURCE] (primary text paywalled). Cut-points do not transfer across populations (sepsis, ECMO, general PICU). VIS is a snapshot; the prognostic quantity in the literature is typically the maximum over a defined window (e.g., first 48h), which the platform must define and label. Per-drug plausible-dose ceilings used for input validation are input-validity bounds, not cited clinical thresholds ([NEEDS SOURCE] — needs a pediatric formulary). Vasopressin unit trap: it is dosed in units/kg/min (coefficient 10,000), the only agent not in mcg/kg/min.",
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
