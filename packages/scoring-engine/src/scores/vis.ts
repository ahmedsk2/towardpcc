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
  version: "1.3.1",
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
      note: "Original VIS derivation (primary). Full text read directly from the source PDF on 2026-08-03, and Table 1 (p235) read directly on 2026-08-04 — source of the adjusted OR 8.1 (95% CI 3.4–19.2, p<0.001), of the six coefficients (Box 1), and of the five-group, two-period classification with its per-group cut-points, all now stated in the notes. No extraction gap remains.",
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
    {
      version: "1.3.0",
      date: "2026-08-04",
      summary:
        "Threshold correction and gap closure; the computed number is unchanged. Table 1 on page 235 of the Gaies 2010 primary was read directly on 2026-08-04, closing the one gap left open on 2026-08-03: all five group boundaries are now stated (under 10 / 10–14 / 15–19 / 20–24 / 25+ in the first 24h against under 5 / 5–9 / 10–14 / 15–19 / 20+ in hours 24–48). Because groups 4 and 5 form the high-VIS arm and a patient takes the highest group reached in either period, high VIS means a maximum of 20 or more in the first 24h OR 15 or more in hours 24–48. Two wrong readings are named so neither can return: a literature review's 'more than 15 in the first 24h', which misplaces the whole of group 3 into the high arm, and this score's own 2026-08-03 note demoting its earlier dual-period reconstruction as the wrong shape — the printed table shows that reconstruction was right, and it is restored explicitly rather than silently re-reversed. Gaies 2010's OR 8.1 now has a fully stateable rule, so both it and the Gaies 2014 flat cut-point (20 or more in the first 24h, OR 6.5) are quoted with their rules instead of only the latter. Added the reason no cut-point is ever applied automatically: reported optima span roughly 10–30 with no convergence (new reference, Belletti 2021, bibliographic details resolved against NCBI E-utilities), a paediatric septic-shock cut of 11 is recorded with its performance, and cut-points are stated not to transfer between populations. The exclusion of newer agents is upgraded from silence to a stated reason: proposed coefficients disagree by up to a hundredfold between proposals (methylene blue 1 vs 20, angiotensin II 0.25 vs 25, olprinone 10 vs 25), so only the original six ship.",
      reason: "new-reference",
    },
    {
      version: "1.3.1",
      date: "2026-08-04",
      summary:
        "Provenance correction in the notes; the computed number, every coefficient and every quoted threshold are unchanged. The paragraph that explains which coefficients are deliberately left out ended in a single blanket attribution — that every coefficient it named was quoted from the 2026-08-04 review and was [NEEDS SOURCE] for a primary. That sentence scoped over two terms it does not describe. Levosimendan (×50) and phenylephrine (×10) both predate the 2026-08-04 review; both were checked in the 2026-07-25 verification pass. And levosimendan ×50 is not unsourced at all — it was confirmed there against the independently fetched full texts of two variant cohorts, an ECMO one and a heart-transplant one — so the old wording marked as unsourced a coefficient this project has read primary text for. The attribution is now scoped to the three newer-agent disagreements it actually covers (methylene blue 1 versus 20, angiotensin II 0.25 versus 25, olprinone 10 versus 25), and each excluded term now carries its own provenance: levosimendan confirmed against two primaries, phenylephrine corroborated by two independent secondary aggregations but still [NEEDS SOURCE] for a directly fetched primary.",
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
    "VIS = dopamine + dobutamine + 100×epinephrine + 10×milrinone + 10,000×vasopressin + 100×norepinephrine — the original six-drug weighted sum of Gaies et al. 2010. Every rate is in mcg/kg/min except vasopressin, which is in units/kg/min (coefficient 10,000). Each drug is optional; an agent not running contributes 0. There are no branches, floor, ceiling, or age adjustment: the result is a single continuous index (displayed to one decimal place) with no interpretation bands applied.",
  ),
  notes: defineText(
    "vis.notes",
    "Original six-drug Gaies 2010 VIS = dopamine + dobutamine + 100×epinephrine + 10×milrinone + 10,000×vasopressin(units/kg/min) + 100×norepinephrine. All six coefficients are confirmed verbatim against Box 1 of the Gaies 2010 primary and are unchanged in the Gaies 2014 re-derivation. Phenylephrine is not part of VIS — it appears in neither Gaies 2010 nor Gaies 2014 — so its absence here is correct and deliberate, not a gap. Nor are any newer agents offered, and that is now a positive decision rather than an omission: the coefficients proposed for them disagree sharply between proposals — methylene blue 1 versus 20, angiotensin II 0.25 versus 25, olprinone 10 versus 25 — so any calculator including them would have to pick a winner between two figures differing by up to a hundredfold and would stop being comparable to the published literature. The levosimendan (×50) and phenylephrine (×10) terms of some adult and ECMO variants are excluded for the same reason of fidelity, so the output is always a true Gaies VIS. The provenance of these left-out coefficients is not uniform, so it is stated per term rather than as one blanket caveat. The three newer-agent pairs above are quoted from the 2026-08-04 review, and the competing proposals behind them are [NEEDS SOURCE] for a primary. Levosimendan ×50 is not unsourced at all: it was confirmed in the 2026-07-25 verification pass against the independently fetched full texts of two variant cohorts, an ECMO one and a heart-transplant one. Phenylephrine ×10 comes from that same 2026-07-25 pass, corroborated by two independent secondary aggregations of modified-VIS formulas but still [NEEDS SOURCE] for a directly fetched primary. Nothing here computes any of these coefficients, so every one of these gaps is descriptive rather than load-bearing. VIS is a continuous index of vasoactive/inotropic support intensity, not a diagnostic test or clinical device, and higher values are an association marker for morbidity/mortality in the cited cohorts, not a treatment trigger. A threshold and an effect size only mean something together, and both published Gaies pairings can now be stated in full. Gaies 2010 (adjusted OR 8.1, 95% CI 3.4–19.2, p<0.001, high versus low VIS): Table 1 on page 235 was read directly on 2026-08-04, and it sorts patients into five groups by the score reached in each of two periods — group 1 is under 10 in the first 24h and under 5 in hours 24–48; group 2 is 10–14 and 5–9; group 3 is 15–19 and 10–14; group 4 is 20–24 and 15–19; group 5 is 25 or more and 20 or more. Each patient is assigned to the highest group reached in EITHER period (the table's own illustration puts a patient with a maximum of 22 in the first 24h and 14 in the next into group 4), and groups 4 and 5 combined form the high-VIS arm. High VIS therefore means a maximum VIS of 20 or more in the first 24h OR 15 or more in hours 24–48. Two readings must not be carried forward. A literature review reports this as 'more than 15 in the first 24h'; that is wrong — 15–19 in the first period is group 3, which sits in the low-VIS arm, so that reading would move a whole group across the dichotomy. And this calculator's own earlier note, having correctly reconstructed the dual-period rule from a peer-reviewed paraphrase, then demoted it on 2026-08-03 as merely the right neighbourhood with the wrong shape when the five-group scheme was read but its table was not; the printed table shows the dual-period reconstruction was right all along, and it is restored rather than silently re-reversed. The paper's anchoring of the scheme at a VIS of about 15 as the first-period midpoint is consistent with this: 15–19 is the middle group of the five. Gaies 2014 (adjusted OR 6.5, 95% CI 2.9–14.6): a single flat cut-point, maximum VIS of 20 or more during the first 24h, on the same six coefficients. It remains the simpler bedside form, but the 2010 rule is no longer the unstateable one. No cut-point is applied automatically by this calculator, and the reason is that the wider literature has not converged on one: optimal cut-points reported across studies span roughly 10 to 30 with no agreed value (Belletti 2021), Davidson 2012 gives a cohort-specific VIS-at-48h threshold of 10.5 in neonates/infants after cardiac surgery, an ECMO cohort gives a pre-ECMO 61.4, and paediatric septic shock has been reported with a cut of 11 (sensitivity 78.87%, specificity 72.22%, AUC 0.779 — figures from the 2026-08-04 review, whose primary derivation study is not named and is [NEEDS SOURCE] here). That spread is the point: cut-points do not transfer between populations — post-cardiac-surgery, sepsis and ECMO cohorts each derive their own — and the literature says so explicitly. VIS is a snapshot; the prognostic quantity in the literature is the maximum over a defined window (two 24h periods in Gaies 2010, the first 24h in Gaies 2014, 48h in Davidson 2012), which the platform must define and label. Per-drug dose ceilings: none are published for VIS — searched and confirmed absent, not merely unfound — so the maxima this calculator enforces are a local input-validity convention and carry no clinical authority. Vasopressin unit trap: it is dosed in units/kg/min (coefficient 10,000), the only agent not in mcg/kg/min.",
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
