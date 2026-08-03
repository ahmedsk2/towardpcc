import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fibrinogenMgdl, lactateMmol } from "../units/concentration";
import { fractionWithPercent, percent } from "../units/fraction";
import { NO_UNIT } from "../units/types";
import { mmhgWithKpa } from "../units/pressure";

/**
 * Phoenix Sepsis Score (2024) — the SCCM Task Force pediatric-sepsis diagnostic
 * criterion. Total 0–13 = sum of four organ-system components:
 *   respiratory (0–3) + cardiovascular (0–6) + coagulation (0–2) + neurologic (0–2).
 *
 * Sepsis = suspected/confirmed infection AND total ≥ 2.
 * Septic shock = sepsis AND cardiovascular component ≥ 1 (a cardiovascular
 * point specifically — not merely total ≥ 2).
 *
 * MISSING INPUTS ARE IMPUTED AT THEIR NORMAL-END SENTINEL, each independently
 * of every other input — not "the component scores 0". The distinction is the
 * whole of the 2026-08-03 neurologic correction: a missing GCS imputes to 15,
 * which must not suppress the 2 points that bilaterally fixed pupils score on
 * their own. The score therefore reflects DOCUMENTED dysfunction, not proven
 * absence of it, and a half-entered Phoenix reads falsely low BY DESIGN — hence
 * `missingAsNormal` and the caution rendered beside the number.
 *
 * Only the numeric total GCS (3–15) is consumed — no GCS response-descriptor
 * wording is reproduced (that is a separate instrument; see notes/ipStatus).
 *
 * Research + full sourcing: docs/research/scores/phoenix.md.
 */

const VASOACTIVE_UNIT = NO_UNIT; // count of distinct agents (dimensionless)

/**
 * Normal-end sentinel for an oxygenation ratio that cannot be computed —
 * P/F and S/F both impute to 500 in the reference package, independently of
 * each other. 500 is above every published cut point, so an absent ratio can
 * never trigger a tier while a present one still can.
 */
const RATIO_ABSENT = 500;

/**
 * Age-banded MAP sub-score (2c). Age bands are left-inclusive, half-open
 * [low, high); thresholds are JAMA 2024 Table 2 (cross-checked against the
 * `phoenix` reference package). 2 pts if MAP < low, 1 pt if low ≤ MAP < high,
 * 0 pts if MAP ≥ high. The half-open form scores non-integer MAP (e.g. 43.67)
 * exactly as the reference code does — and is the first of the four places
 * where the software convention and the printed integer band disagree: at
 * age < 1 month the table's 0-point band starts at 31, so MAP 30.5 reads 0
 * from the table and 1 from the software. This implementation follows the
 * software at all four (see `formula`).
 */
function mapPoints(ageMonths: number, map: number): number {
  let low: number;
  let high: number;
  if (ageMonths < 1) {
    low = 17;
    high = 31;
  } else if (ageMonths < 12) {
    low = 25;
    high = 39;
  } else if (ageMonths < 24) {
    low = 31;
    high = 44;
  } else if (ageMonths < 60) {
    low = 32;
    high = 45;
  } else if (ageMonths < 144) {
    low = 36;
    high = 49;
  } else {
    low = 38;
    high = 52;
  }
  if (map < low) return 2;
  if (map < high) return 1;
  return 0;
}

export const phoenix = defineScore({
  id: "phoenix",
  slug: "phoenix",
  name: "Phoenix Sepsis Score",
  version: "2.0.0",
  status: "published",
  category: "sepsis",
  inputs: [
    {
      id: "age_months",
      group: defineText("phoenix.group.patient", "Patient"),
      label: defineText("phoenix.age", "Age"),
      required: true,
      type: "numeric",
      unit: { canonical: "months" },
      // The criteria exclude age 18 and over, i.e. the eligible domain is
      // [0, 216) months — the reference R code's `<= 216` admits exactly 18.0 y
      // and is the divergence, not the rule. `NumericInput.max` is INCLUSIVE and
      // there is no exclusive-bound facility, so over the whole-month domain
      // this input declares (`step: 1`) the last eligible value is 215 and 216
      // is rejected, which is exactly "reject at ≥ 216 months". The residual: a
      // fractional age in (215, 216) months is also rejected, though the
      // criteria would admit it. Expressing that would need an exclusive bound
      // in validation.ts, which is shared. MAP bands start at 0 months.
      min: 0,
      max: 215,
      step: 1,
      helpText: defineText(
        "phoenix.age.help",
        "In whole months. Determines the age-adjusted MAP band. The criteria were derived in children under 18 years — age 216 months (18.0 years) and over is outside them and is rejected — and exclude newborns during the birth hospitalization and infants under 37 weeks post-conceptional age.",
      ),
    },
    {
      id: "suspected_infection",
      group: defineText("phoenix.group.patient", "Patient"),
      label: defineText("phoenix.infection", "Suspected or confirmed infection"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "phoenix.infection.help",
        "Clinical judgment. Phoenix sepsis requires suspected/confirmed infection AND a score ≥ 2 — the score alone does not decide whether infection is present.",
      ),
    },
    {
      id: "resp_support",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.resp_support", "Respiratory support"),
      required: false,
      type: "categorical",
      options: [
        { value: "none", label: defineText("phoenix.resp_support.none", "No respiratory support") },
        {
          value: "any-support",
          label: defineText(
            "phoenix.resp_support.any",
            "Non-invasive support (supplemental O₂ or non-invasive ventilation)",
          ),
        },
        {
          value: "imv",
          label: defineText("phoenix.resp_support.imv", "Invasive mechanical ventilation"),
        },
      ],
      helpText: defineText(
        "phoenix.resp_support.help",
        "The 1-point tier needs any support; the 2- and 3-point tiers need invasive mechanical ventilation. A low ratio with no support scores 0.",
      ),
    },
    {
      id: "pao2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.pao2", "Arterial PaO₂"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // input-validity bound, not a cited threshold (research lists "20–200 typical"
      // as a typical range; upper widened to a physiologic ceiling so a legitimately
      // high PaO₂ on supplemental O₂ is not falsely rejected).
      min: 20,
      max: 700,
      helpText: defineText(
        "phoenix.pao2.help",
        "From an arterial blood gas. Gives the PaO₂:FiO₂ (P/F) ratio. P/F and SpO₂:FiO₂ are evaluated together and either can trigger a tier, so supplying both is not redundant. Accepts mmHg or kPa.",
      ),
    },
    {
      id: "fio2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.fio2", "Fraction of inspired oxygen (FiO₂)"),
      required: false,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText(
        "phoenix.fio2.help",
        "Room air is 0.21. Needed for the P/F or S/F ratio. Accepts a fraction or a percentage.",
      ),
    },
    {
      id: "spo2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.spo2", "Pulse-oximeter oxygen saturation (SpO₂)"),
      required: false,
      type: "numeric",
      unit: percent,
      // input-validity bound, not a cited threshold. The S/F ratio is only VALID at
      // SpO₂ ≤ 97 (that gate is applied in calculate); a measured SpO₂ of 98–100 is
      // still valid data (it simply yields no S/F), so max is 100, not 97.
      min: 50,
      max: 100,
      helpText: defineText(
        "phoenix.spo2.help",
        "Gives the SpO₂:FiO₂ (S/F) ratio, which is valid only when SpO₂ ≤ 97% (above that the ratio saturates and is uninformative). S/F and PaO₂:FiO₂ are evaluated together and either can trigger a tier.",
      ),
    },
    {
      id: "n_vasoactives",
      group: defineText("phoenix.group.cardiovascular", "Cardiovascular"),
      label: defineText("phoenix.n_vasoactives", "Number of distinct vasoactive agents"),
      required: false,
      type: "numeric",
      unit: VASOACTIVE_UNIT,
      min: 0,
      max: 6,
      step: 1,
      helpText: defineText(
        "phoenix.n_vasoactives.help",
        "Count of distinct systemic vasoactive medications running (dobutamine, dopamine, epinephrine, milrinone, norepinephrine, vasopressin): 0 → 0 pts, 1 → 1 pt, ≥ 2 → 2 pts.",
      ),
    },
    {
      id: "lactate",
      group: defineText("phoenix.group.cardiovascular", "Cardiovascular"),
      label: defineText("phoenix.lactate", "Blood lactate"),
      required: false,
      type: "numeric",
      unit: lactateMmol,
      // input-validity bound, not a cited threshold (research "0.3–30").
      min: 0.3,
      max: 30,
      helpText: defineText(
        "phoenix.lactate.help",
        "0 pts if < 5, 1 pt if 5 to < 11, 2 pts if ≥ 11 mmol/L. Accepts mmol/L or mg/dL.",
      ),
    },
    {
      id: "map",
      group: defineText("phoenix.group.cardiovascular", "Cardiovascular"),
      label: defineText("phoenix.map", "Mean arterial pressure (MAP)"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // input-validity bound, not a cited threshold (research "10–120"; upper widened
      // to a physiologic ceiling so an adolescent hypertensive value is not falsely
      // rejected — it scores 0 anyway).
      min: 10,
      max: 200,
      helpText: defineText(
        "phoenix.map.help",
        "Age-adjusted scoring (0–2 pts). May be computed as DBP + (SBP − DBP)/3. Accepts mmHg or kPa.",
      ),
    },
    {
      id: "platelets",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.platelets", "Platelet count"),
      required: false,
      type: "numeric",
      unit: { canonical: "10^3/uL" },
      // input-validity bound, not a cited threshold (research "5–1000").
      min: 5,
      max: 1000,
      helpText: defineText(
        "phoenix.platelets.help",
        "In ×10³/µL (K/µL). Contributes 1 coagulation point when < 100.",
      ),
    },
    {
      id: "inr",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.inr", "INR"),
      required: false,
      type: "numeric",
      unit: NO_UNIT,
      // input-validity bound, not a cited threshold (research "0.8–10").
      min: 0.8,
      max: 10,
      helpText: defineText(
        "phoenix.inr.help",
        "International normalized ratio (unitless). Contributes 1 coagulation point when > 1.3.",
      ),
    },
    {
      id: "ddimer",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.ddimer", "D-dimer"),
      required: false,
      type: "numeric",
      unit: { canonical: "mg/L FEU" },
      // input-validity bound, not a cited threshold (research "0.1–50").
      min: 0.1,
      max: 50,
      helpText: defineText(
        "phoenix.ddimer.help",
        "In mg/L fibrinogen-equivalent units (FEU). Contributes 1 coagulation point when > 2.",
      ),
    },
    {
      id: "fibrinogen",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.fibrinogen", "Fibrinogen"),
      required: false,
      type: "numeric",
      unit: fibrinogenMgdl,
      // input-validity bound, not a cited threshold (research "30–800").
      min: 30,
      max: 800,
      helpText: defineText(
        "phoenix.fibrinogen.help",
        "Contributes 1 coagulation point when < 100 mg/dL. Accepts mg/dL or g/L.",
      ),
    },
    {
      id: "gcs_total",
      group: defineText("phoenix.group.neurological", "Neurological"),
      label: defineText("phoenix.gcs", "Glasgow Coma Scale (total)"),
      required: false,
      type: "numeric",
      unit: NO_UNIT,
      min: 3,
      max: 15,
      step: 1,
      helpText: defineText(
        "phoenix.gcs.help",
        "Total GCS 3–15. Scores 1 neurologic point when ≤ 10 — but bilaterally fixed pupils score 2 whatever the GCS, so this value only decides between 0 and 1. Left blank it is taken as 15, which is why it cannot mask a fixed-pupils score. Only the numeric total is used.",
      ),
    },
    {
      id: "fixed_pupils",
      group: defineText("phoenix.group.neurological", "Neurological"),
      label: defineText("phoenix.fixed_pupils", "Bilaterally fixed pupils"),
      required: false,
      type: "boolean",
      helpText: defineText(
        "phoenix.fixed_pupils.help",
        "Scores the full 2 neurologic points on its own, whatever the GCS — it is not additive with the GCS point. Left blank it is taken as not fixed.",
      ),
    },
  ] as const,
  interpretation: [
    {
      id: "below-threshold",
      appliesTo: "phoenix_total",
      min: null,
      max: 2,
      label: defineText("phoenix.band.below", "0–1"),
      description: defineText(
        "phoenix.band.below.desc",
        "Below the Phoenix threshold: in a child with suspected infection this does not meet the Phoenix criterion for sepsis. Interpret in the full clinical context.",
      ),
    },
    {
      id: "meets-criterion",
      appliesTo: "phoenix_total",
      min: 2,
      max: null,
      label: defineText("phoenix.band.meets", "≥ 2"),
      description: defineText(
        "phoenix.band.meets.desc",
        "In a child with suspected/confirmed infection, meets the Phoenix criterion for sepsis. Reported in-hospital mortality in the derivation/validation cohorts was ~7.1% (higher-resource) and ~28.5% (lower-resource); with ≥ 1 cardiovascular point the septic-shock criterion is also met (~10.8% / ~33.5%). These are population associations, not individual predictions.",
      ),
    },
  ],
  references: [
    {
      citation:
        "Sanchez-Pinto LN, Bennett TD, DeWitt PE, et al; SCCM Pediatric Sepsis Definition Task Force. Development and Validation of the Phoenix Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):675–686.",
      pmid: "38245897",
      doi: "10.1001/jama.2024.0196",
      note: "Primary derivation/validation; Table 2 is the score.",
    },
    {
      citation:
        "Schlapbach LJ, Watson RS, Sorce LR, et al; SCCM Pediatric Sepsis Definition Task Force. International Consensus Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):665–674.",
      pmid: "38245889",
      doi: "10.1001/jama.2024.0179",
      note: "Companion consensus definition (sepsis = suspected infection + Phoenix ≥ 2; septic shock).",
    },
    {
      citation:
        "DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD. phoenix: an R package and Python module for calculating the Phoenix pediatric sepsis score and criteria. JAMIA Open. 2024;7(3):ooae066.",
      doi: "10.1093/jamiaopen/ooae066",
      note: "Reference implementation by task-force members; source of the worked vignettes and the half-open MAP interval detail.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: four-organ Phoenix Sepsis Score with age-banded MAP, sepsis and septic-shock flags.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-08-01",
      summary:
        "Limitations now state the SpO₂ 97/98 discontinuity outright: with no arterial gas, a child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at SpO₂ 97 but 0 at SpO₂ 98, because S/F is undefined above 97 and the missing-input convention then contributes 0 — so a well-saturated child on maximal support can fall below the total ≥ 2 sepsis threshold on respiratory grounds alone. Both halves are per the paper and neither was stated; a reader could have taken the 0 for reassurance. The four component maxima (respiratory 0–3, cardiovascular 0–6, coagulation 0–2, neurologic 0–2) are now declared for the result panel, and the inputs carry organ-system group headings. No threshold or computed value changed.",
      reason: "clarification",
    },
    {
      version: "2.0.0",
      date: "2026-08-03",
      summary:
        "TWO COMPUTED RESULTS CHANGE, both in the direction of a HIGHER score — a patient may now meet the Phoenix sepsis threshold who did not before, and no patient scores lower than before. (1) NEUROLOGIC. Bilaterally fixed pupils now score the full 2 points outright, whatever the GCS. The rule was implemented as GCS ≤ 10 (+1) plus fixed pupils (+1) capped at 2, which returned 1 for fixed pupils with a GCS above 10 and 1 for fixed pupils with no GCS entered. All four published tables print the neurologic row as three mutually exclusive columns, and the task force's own reference software returns 2 for fixed pupils at GCS 15, at GCS 8, and with GCS missing. The missing case is the consequential one: a missing GCS is imputed to 15 INDEPENDENTLY of pupil status, so a child with bilaterally fixed pupils and no GCS recorded scored 1 here — below the threshold — and now scores 2, which meets it. (2) RESPIRATORY. The PaO₂:FiO₂ and SpO₂:FiO₂ ratios are now evaluated together as the source expression writes them, either one able to trigger a tier, rather than the arterial ratio being used alone whenever a blood gas was present. Where the two disagree — non-simultaneous sampling being the usual reason — the respiratory component can only rise. Missing inputs are now imputed at their documented normal-end sentinels (unusable ratio 500, GCS 15, pupils not fixed, no ventilation, no other support, 0 vasoactive agents, lactate 0, INR 0, D-dimer 0, platelets and fibrinogen normal), each independently of the others. Also, without changing any number: the continuous-comparison convention is now stated for the four boundaries where the published integer bands and the reference software disagree (MAP 30.5 under 1 month, lactate 10.95, and P/F exactly 200 or S/F exactly 220 on invasive ventilation); a missing-data caution renders beside the result, because a half-entered Phoenix reads falsely low by design and a total below 2 on an incomplete entry is not evidence against sepsis; the age bound is documented as excluding 216 months (18.0 years) and over; and the limitations add the authors' own sedation caveat and the derivation-cohort generalisability caveat.",
      reason: "formula-correction",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "Threshold/branch-rule clinical score — cutoffs, arithmetic, and age bands are facts/procedures, not copyrightable expression. The authors additionally released an open-source reference implementation (CRAN/PyPI) and open-access papers. Only the numeric total GCS is consumed; no GCS response-descriptor item wording is reproduced (phoenix.md IP status).",
  },
  missingAsNormal: true,
  cautions: [
    defineText(
      "phoenix.caution.partial",
      "A half-entered Phoenix reads FALSELY LOW, by design. Every unentered value is scored at its normal end — an unusable oxygenation ratio as 500, GCS as 15, pupils as not fixed, lactate and vasoactive agents as none, platelets and fibrinogen as normal — so the total measures DOCUMENTED organ dysfunction, never absence of it. A total below 2 on an incomplete entry is not evidence against sepsis. Enter every value that was actually measured before reading the total, and read a blank as 'not measured', never as 'normal'.",
    ),
  ],
  formula: defineText(
    "phoenix.formula",
    "Total (0–13) = respiratory (0–3) + cardiovascular (0–6) + coagulation (0–2) + neurologic (0–2), each per JAMA 2024 Table 2 (PaO₂ and MAP in mmHg, FiO₂ a fraction). RESPIRATORY is cumulative and scored only when respiratory support is present. The PaO₂:FiO₂ (P/F) and SpO₂:FiO₂ (S/F) ratios are evaluated together — S/F only when SpO₂ ≤ 97% — and either can trigger a tier: 1 point for any support with P/F < 400 or S/F < 292, 1 more for invasive mechanical ventilation with P/F < 200 or S/F < 220, and 1 more for invasive ventilation with P/F < 100 or S/F < 148. Invasive ventilation can therefore reach 3 and non-invasive support cannot exceed 1. CARDIOVASCULAR sums three independent 0–2 sub-scores with no overall cap: vasoactive agents (0 → 0, 1 → 1, ≥ 2 → 2), lactate (< 5 → 0, 5 to < 11 → 1, ≥ 11 → 2 mmol/L), and age-banded MAP (2 if MAP < low, 1 if low ≤ MAP < high, 0 if MAP ≥ high, with half-open [low, high) thresholds by age band). COAGULATION adds 1 point each — platelets < 100 ×10³/µL, INR > 1.3, D-dimer > 2 mg/L FEU, fibrinogen < 100 mg/dL — capped at 2. NEUROLOGIC is hierarchical, not additive: bilaterally fixed pupils score 2 outright whatever the GCS; otherwise GCS ≤ 10 scores 1; otherwise 0. BOUNDARIES are compared continuously, matching the reference software rather than the integer bands printed for bedside use, at the four values where the two disagree: MAP 30.5 under 1 month scores 1 where the printed band reads 0; lactate 10.95 scores 1 where the printed band (5–10.9) leaves a gap; and a P/F of exactly 200 or an S/F of exactly 220 on invasive ventilation scores 1 where the printed 2-point bands (100–200, 148–220) read 2. MISSING INPUTS are each imputed at their own normal-end sentinel, independently of every other input — an uncomputable ratio as 500, GCS as 15, pupils as not fixed, ventilation and other support as absent, vasoactive agents 0, lactate 0, INR 0, D-dimer 0, platelets and fibrinogen normal — so a missing GCS never suppresses a fixed-pupils score. Sepsis is reported as 1 when infection is suspected/confirmed and total ≥ 2; septic shock as 1 when sepsis is met and the cardiovascular component ≥ 1.",
  ),
  notes: defineText(
    "phoenix.notes",
    "Diagnostic criterion, not a graded severity ladder: sepsis = suspected/confirmed infection AND total ≥ 2; septic shock = sepsis AND cardiovascular component ≥ 1 (a cardiovascular point, not merely total ≥ 2). The vasoactive sub-score is a COUNT of distinct agents (0/1/≥2), not the VIS. " +
      "NEUROLOGIC IS HIERARCHICAL, NOT ADDITIVE. Bilaterally fixed pupils score 2 outright, whatever the GCS; a GCS ≤ 10 with pupils not fixed scores 1; anything else scores 0. All four published tables print this row as three mutually exclusive columns, and the neurologic sub-score the task force selected came from PELOD-2, whose own neurologic component is a maximum-type rule over GCS and pupillary reactivity. The reference software writes the rule as an additive expression capped at 2, which is observationally identical because fixed pupils alone already saturate the cap — but an UNCAPPED sum would return 3 for fixed pupils at GCS 8 and is wrong. Until 2026-08-03 this calculator returned 1 for fixed pupils whenever the GCS was above 10 or was not entered; that was a defect, and it is the reason for the v2.0.0 bump. " +
      "MISSING INPUTS ARE IMPUTED AT THEIR NORMAL END, EACH INDEPENDENTLY of every other input — the rule is per input, not 'the component scores 0'. A missing GCS imputes to 15 and missing pupil status to 'not fixed', separately, so a child with bilaterally fixed pupils and no GCS recorded still scores the full 2 neurologic points and still meets the total ≥ 2 threshold. Both JAMA tables state the general rule in their first table footnote: an unmeasured variable contributes no points. One honest qualification, so the claim is not overstated as the whole of the published method: in the derivation cohort missing values were first carried forward from physiologically appropriate earlier time windows, and only values still absent after that contributed zero. That is a property of how the development dataset was built and has no bearing on a single-timepoint bedside calculator, where only the second half applies. The consequence is that the total reflects DOCUMENTED dysfunction — a teaching UI should show a missing input as missing, not as normal. " +
      "RESPIRATORY USES BOTH RATIOS. P/F and S/F are evaluated together and either can trigger a tier, exactly as the source expression writes it; a ratio that cannot be computed imputes to 500 and so triggers nothing. S/F is valid only when SpO₂ ≤ 97%. That gate has a consequence worth stating outright, because it runs against intuition: with no arterial gas, a child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at SpO₂ 97 but 0 at SpO₂ 98 — the ratio simply is not computable above 97, and the missing-input convention then contributes 0. A well-saturated child on maximal support can therefore fall below the total ≥ 2 sepsis threshold on respiratory grounds alone. Read that as ‘not measurable’, never as ‘not hypoxaemic’, and obtain a blood gas. " +
      "BOUNDARY CONVENTION. The published tables are written for bedside use (integers, one-decimal lactate) while the software treats every input as continuous, and the two disagree at exactly four values. This calculator follows the software at all four, consistently: MAP 30.5 in a child under 1 month scores 1 where the printed band reads 0 (the same shape recurs at every age band's 0/1 edge); lactate 10.95 scores 1, where the printed 1-point band of 5–10.9 leaves it in a gap; P/F exactly 200 on invasive ventilation scores 1, where the printed 2-point band of 100–200 reads 2; S/F exactly 220 on invasive ventilation scores 1, where the printed 2-point band of 148–220 reads 2. There is no divergence at any coagulation or neurologic boundary, nor at P/F 100, S/F 148, MAP 17, MAP 30, lactate 5 or lactate 11. " +
      "OUT-OF-RANGE INPUT IS REJECTED RATHER THAN COMPUTED, and that is the source behaviour rather than a local choice: the reference R package halts on a GCS outside 3–15 and on ventilation/support flags outside {0, 1}. The criteria exclude age 18 and over, so 216 months and above is rejected here; note that the reference R code's own `<= 216` bound admits exactly 18.0 years and diverges from the criteria it implements. Because the age bound is inclusive and the field is in whole months, the last accepted value is 215. " +
      "SEDATION. The neurologic sub-score was pragmatically validated in sedated and non-sedated patients, with and without invasive ventilation. The derivation paper separately acknowledges that some organ-dysfunction measures may reflect iatrogenic effects or clinician choices rather than sepsis-related dysfunction, and names a reduced GCS under sedation as its example. A sedated child's neurologic point may therefore be measuring the sedation; that caveat comes from the authors, not from commentary. " +
      "GENERALISABILITY. The higher-resource derivation data came exclusively from US tertiary paediatric centres. Some lower-resource sites did not record respiratory support or neurologic status even when it had been assessed, which constrained both the achievable score range and the score's measured performance at those sites. " +
      "‘REMOTE ORGAN DYSFUNCTION’ IS NOT PART OF THE CRITERIA and is deliberately not implemented: the derivation paper uses it as a descriptive subgroup (respiratory or neurologic dysfunction plus at least one point in a different organ system) to characterise a higher-mortality population, not as a diagnostic gate. " +
      "Only the numeric total GCS (3–15) is consumed; the GCS response-descriptor wording is a separate instrument (Teasdale & Jennett) and is not reproduced or licensed by the Phoenix papers. The validated cohort was children < 18 years and excluded newborns during the birth hospitalization and infants < 37 weeks post-conceptional age — applying the score to those groups is outside the validated population, and age in months is not adjusted for prematurity. The 8-organ research extension Phoenix-8 is research-only, is not the diagnostic criterion and is out of scope. The MAP age bands are implemented as half-open [low, high) intervals (matching the reference package) so non-integer MAP scores exactly. The per-input plausible min/max are input-validity guardrails, not published Phoenix thresholds (the research labels these ranges as heuristics, not published thresholds); pao2/spo2/map upper bounds were widened beyond the research's 'typical' ranges to avoid false rejections and are annotated in code.",
  ),
  /**
   * Component maxima are JAMA 2024 Table 2 as transcribed in phoenix.md, NOT
   * read back off `calculate` below — three of the four are computed (a sum or
   * a cap) rather than assigned, so inferring them from the code would launder
   * an assumption into a published range. They sum to 13, the published total
   * maximum, which is the arithmetic check that they are the right four.
   */
  composition: {
    total: "phoenix_total",
    components: [
      { id: "respiratory", max: 3 },
      { id: "cardiovascular", max: 6 },
      { id: "coagulation", max: 2 },
      { id: "neurologic", max: 2 },
    ],
  },
  calculate: (values) => {
    // ---- 1. Respiratory (0–3), CUMULATIVE ----
    // Written as the source expression is written — three independent tier
    // tests summed — rather than as a first-match ladder. The two agree
    // (pf < 100 implies pf < 200 implies pf < 400), and the cumulative form
    // makes the two structural facts visible: invasive ventilation is the only
    // way past 1 point, and a child on non-invasive support therefore cannot
    // exceed 1 however bad the ratio.
    //
    // BOTH ratios are tested at every tier and either can trigger it. An
    // uncomputable ratio imputes to RATIO_ABSENT (500), which is above every
    // cut point, so it can never trigger a tier while the other ratio still
    // can. This is why the two are not "P/F preferred, S/F as fallback": the
    // published rows read "P/F < 100 or S/F < 148", and a gas drawn at a
    // different moment from the saturation can legitimately disagree with it.
    const support = values.resp_support?.value ?? "none";
    const imv = support === "imv" ? 1 : 0;
    const anySupport = support === "none" ? 0 : 1;
    const fio2 = values.fio2?.value;
    const pao2 = values.pao2?.value;
    const spo2 = values.spo2?.value;
    // Canonical units: mmHg / fraction, and % / fraction.
    const pf = fio2 === undefined || pao2 === undefined ? RATIO_ABSENT : pao2 / fio2;
    // S/F is only valid at SpO₂ ≤ 97 — above that the ratio saturates and stops
    // discriminating, so it is treated as absent rather than as reassuring.
    const sf = fio2 === undefined || spo2 === undefined || spo2 > 97 ? RATIO_ABSENT : spo2 / fio2;
    const respiratory =
      imv * ((pf < 100 || sf < 148 ? 1 : 0) + (pf < 200 || sf < 220 ? 1 : 0)) +
      anySupport * (pf < 400 || sf < 292 ? 1 : 0);

    // ---- 2. Cardiovascular (0–6) = vasoactives + lactate + age-banded MAP ----
    const nVaso = values.n_vasoactives?.value ?? 0;
    const vasoPts = nVaso >= 2 ? 2 : nVaso >= 1 ? 1 : 0;

    const lactate = values.lactate?.value;
    const lactatePts = lactate === undefined ? 0 : lactate >= 11 ? 2 : lactate >= 5 ? 1 : 0;

    const map = values.map?.value;
    const mapPts = map === undefined ? 0 : mapPoints(values.age_months.value, map);

    const cardiovascular = vasoPts + lactatePts + mapPts;

    // ---- 3. Coagulation (0–2): 1 point each, capped at 2 ----
    let coag = 0;
    const platelets = values.platelets?.value;
    if (platelets !== undefined && platelets < 100) coag += 1;
    const inr = values.inr?.value;
    if (inr !== undefined && inr > 1.3) coag += 1;
    const ddimer = values.ddimer?.value;
    if (ddimer !== undefined && ddimer > 2) coag += 1;
    const fibrinogen = values.fibrinogen?.value;
    if (fibrinogen !== undefined && fibrinogen < 100) coag += 1;
    const coagulation = Math.min(coag, 2);

    // ---- 4. Neurologic (0–2): HIERARCHICAL, not additive ----
    // Bilaterally fixed pupils are worth 2 outright, whatever the GCS. The
    // published tables print three mutually exclusive columns; the reference
    // software writes an additive-then-capped expression, which agrees with
    // this at every input because fixed pupils alone already saturate the cap.
    // An uncapped sum would return 3 for fixed pupils at GCS 8 and is wrong.
    //
    // The two sentinels are imputed INDEPENDENTLY — missing GCS → 15, missing
    // pupil status → not fixed — so a missing GCS cannot suppress a
    // fixed-pupils score. Before 2026-08-03 this returned 1 for fixed pupils
    // with no GCS entered, putting that child BELOW the total ≥ 2 sepsis
    // threshold that the published algorithm has them meeting.
    const gcs = values.gcs_total?.value ?? 15;
    const pupilsFixed = values.fixed_pupils?.value ?? false;
    const neurologic = pupilsFixed ? 2 : gcs <= 10 ? 1 : 0;

    const total = respiratory + cardiovascular + coagulation + neurologic;
    const sepsis = values.suspected_infection.value && total >= 2 ? 1 : 0;
    const septicShock = sepsis === 1 && cardiovascular >= 1 ? 1 : 0;

    return [
      {
        id: "respiratory",
        label: defineText("phoenix.out.respiratory", "Respiratory component"),
        value: respiratory,
        unit: "",
        precision: 0,
      },
      {
        id: "cardiovascular",
        label: defineText("phoenix.out.cardiovascular", "Cardiovascular component"),
        value: cardiovascular,
        unit: "",
        precision: 0,
      },
      {
        id: "coagulation",
        label: defineText("phoenix.out.coagulation", "Coagulation component"),
        value: coagulation,
        unit: "",
        precision: 0,
      },
      {
        id: "neurologic",
        label: defineText("phoenix.out.neurologic", "Neurologic component"),
        value: neurologic,
        unit: "",
        precision: 0,
      },
      {
        id: "phoenix_total",
        label: defineText("phoenix.out.total", "Phoenix Sepsis Score (total)"),
        value: total,
        unit: "",
        precision: 0,
      },
      {
        id: "sepsis",
        label: defineText("phoenix.out.sepsis", "Meets sepsis criterion (1 = yes)"),
        value: sepsis,
        unit: "",
        precision: 0,
      },
      {
        id: "septic_shock",
        label: defineText("phoenix.out.shock", "Meets septic-shock criterion (1 = yes)"),
        value: septicShock,
        unit: "",
        precision: 0,
      },
    ];
  },
});
