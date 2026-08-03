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
 * six-drug pediatric VIS. Phenylephrine appears in NEITHER Gaies 2010 nor the
 * Gaies 2014 re-derivation, so leaving it out is not an omission — it is what
 * makes this a Gaies VIS; the levosimendan (×50) and phenylephrine (×10) terms
 * of the adult/ECMO variants are deliberately not offered (see notes).
 * Research + full sourcing: docs/research/scores/vis.md.
 */
export const vis = defineScore({
  id: "vis",
  slug: "vis",
  name: "Vasoactive-Inotropic Score (VIS)",
  version: "1.2.0",
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
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
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
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
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
      // Local input-validity convention. No per-drug maximum dose is published
      // for VIS — searched and confirmed absent, not merely unfound (vis.md).
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
      note: "Original VIS derivation (primary). Full text obtained and read directly from the source PDF on 2026-08-03 — the source of the adjusted OR 8.1 (95% CI 3.4–19.2, p<0.001) and of the five-group, two-period classification behind it. Its per-group numeric cut-points were not extracted from the paper's table and are not stated here.",
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
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary: "Initial release: original six-drug Gaies 2010 VIS as a continuous weighted sum.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "Sourcing pass, no change to the computed number. The reported effect size is now quoted with the cut-point it came from: Gaies 2014 (maximum VIS ≥ 20 in the first 24 h, adjusted OR 6.5, 95% CI 2.9–14.6) replaces the previously unpaired Gaies 2010 OR 8.1, whose dual-threshold origin is now stated alongside it. Phenylephrine's exclusion is restated as confirmed correct (absent from both Gaies papers) rather than as a sourcing gap, and the per-drug dose ceilings are relabelled a local input-validity convention with no published maximum in existence.",
      reason: "new-reference",
    },
    {
      version: "1.2.0",
      date: "2026-08-03",
      summary:
        "Provenance upgrade, no change to the computed number and no change to which threshold is quoted. The Gaies 2010 primary full text was obtained and read directly, so the notes no longer say it was paywalled and unread: its adjusted OR 8.1 (95% CI 3.4–19.2, p<0.001) and the rule that OR belongs to are now attributed to the paper itself rather than to a peer-reviewed paraphrase. That rule turns out to be a five-group classification assigning each patient to the highest group reached in either the first or the subsequent 24-hour period, with groups 4 and 5 combined into 'high VIS' and the scheme anchored at a VIS of about 15 as the first-period midpoint — not the two-number dual threshold previously reconstructed from the paraphrase. One narrowly scoped gap replaces the old blanket caveat: the exact per-group numeric cut-points were not extracted from the paper's table and are deliberately not stated. No reference was added; the existing primary citation moved from cited-but-unread to read.",
      reason: "new-reference",
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
    "VIS = dopamine + dobutamine + 100×epinephrine + 10×milrinone + 10,000×vasopressin + 100×norepinephrine — the original six-drug weighted sum of Gaies et al. 2010. Every rate is in mcg/kg/min except vasopressin, which is in units/kg/min (coefficient 10,000). Each drug is optional; an agent not running contributes 0. There are no branches, floor, ceiling, or age adjustment: the result is a single continuous index (displayed to one decimal place) with no interpretation bands applied.",
  ),
  notes: defineText(
    "vis.notes",
    "Original six-drug Gaies 2010 VIS = dopamine + dobutamine + 100×epinephrine + 10×milrinone + 10,000×vasopressin(units/kg/min) + 100×norepinephrine. All six coefficients are confirmed against the published derivation and are unchanged in the Gaies 2014 re-derivation. Phenylephrine is not part of VIS — it appears in neither Gaies 2010 nor Gaies 2014 — so its absence here is correct and deliberate, not a gap; the levosimendan (×50) and phenylephrine (×10) terms carried by some adult and ECMO variants are likewise not offered, so the output is always a true Gaies VIS. Those two coefficients are quoted here only to name what is being left out, and their own provenance is [NEEDS SOURCE] — the round-2 review settled that phenylephrine is absent from Gaies, which is a different question from where the ×10 figure originates, and no primary for it has been fetched. Nothing here computes either term, so the gap is descriptive rather than load-bearing. VIS is a continuous index of vasoactive/inotropic support intensity, not a diagnostic test or clinical device, and higher values are an association marker for morbidity/mortality in the cited cohorts, not a treatment trigger. A threshold and an effect size only mean something together: Gaies 2014 re-derived a single flat cut-point — maximum VIS ≥ 20 during the first 24h — with an adjusted OR of 6.5 (95% CI 2.9–14.6) for the poor composite outcome, and that pairing is the one quoted here because one cut-point is what a bedside reader can actually apply. The larger OR 8.1 (95% CI 3.4–19.2, p<0.001) often seen attached to VIS is from Gaies 2010, whose full text was obtained and read directly from the source PDF on 2026-08-03 — so what follows is the primary paper's own account, not a paraphrase of it. That OR compares a high-VIS group against a low-VIS group after adjustment, and 'high VIS' there is not a single flat cut-point: the 2010 paper sorts patients into five classification groups, assigns each patient to the highest group they reach during EITHER the first or the subsequent 24-hour period (its own illustration puts a patient whose maximum is 22 in the first 24h and 14 in the next into group 4), and then combines groups 4 and 5 into the high-VIS arm. It anchors the scheme by treating dosages that would give a VIS of approximately 15 as the midpoint for the first 24h, expecting most patients to be on lower doses in the second. Reading 8.1 as though it came from one threshold therefore overstates it. One thing is still missing and is not guessed at here: the exact numeric VIS boundaries of the five groups were not extracted from the paper's table, so they are stated nowhere in this calculator. Davidson 2012 reports a different, cohort-specific VIS-at-48h threshold of 10.5 in neonates/infants after cardiac surgery. Cut-points do not transfer across populations (sepsis, ECMO, general PICU). VIS is a snapshot; the prognostic quantity in the literature is the maximum over a defined window (first 24h in Gaies 2014, 48h in Davidson 2012), which the platform must define and label. Per-drug dose ceilings: none are published for VIS — searched and confirmed absent, not merely unfound — so the maxima this calculator enforces are a local input-validity convention and carry no clinical authority. Vasopressin unit trap: it is dosed in units/kg/min (coefficient 10,000), the only agent not in mcg/kg/min.",
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
