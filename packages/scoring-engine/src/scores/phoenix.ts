import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { saturatingSpo2Notice } from "../value-notices";
import { ddimerMgLFeu, fibrinogenMgdl, lactateMmol } from "../units/concentration";
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
  version: "1.1.0",
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
      // and is the divergence, not the rule. Declared as an EXCLUSIVE ceiling,
      // which states that domain directly. Until v2.1.0 it read `max: 215`,
      // because `max` is inclusive and no exclusive facility existed: right for
      // whole months, but it also rejected a fractional age in (215, 216) that
      // the criteria admit. `step: 1` remains the ENTRY convention (whole
      // months, matching the published bands) and is not a validation bound —
      // 215.5 is now accepted, as it should be. MAP bands start at 0 months.
      //
      // PUBLISHED, AND IDENTICAL: the Phoenix implementation notes' reasonable-
      // value table gives age as [0, 216) months, half-open, the same domain
      // this field declares. That is independent corroboration of the v2.1.0
      // maxExclusive work — the exclusive ceiling was argued from the criteria's
      // "under 18 years" before the published table was read, and the table
      // states the same interval in the same form.
      min: 0,
      max: 216,
      maxExclusive: 216,
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
            "Non-invasive support (supplemental O₂, high-flow nasal cannula, or non-invasive ventilation)",
          ),
        },
        {
          value: "imv",
          label: defineText("phoenix.resp_support.imv", "Invasive mechanical ventilation"),
        },
      ],
      helpText: defineText(
        "phoenix.resp_support.help",
        "The 1-point tier needs any support; the 2- and 3-point tiers need invasive mechanical ventilation. A low ratio with no support scores 0. High-flow nasal cannula counts as support here — Phoenix includes it explicitly — while PICANet and ANZPIC both exclude high flow from the ventilation field they collect, so the same child reads as supported on this score and as not ventilated in either registry. Answer from what the child is actually on: entering an FiO₂ above 0.21 alongside 'no respiratory support' is contradictory, and the task force's own extraction code would treat that FiO₂ as support where this calculator takes the answer given.",
      ),
    },
    {
      id: "pao2",
      group: defineText("phoenix.group.respiratory", "Respiratory"),
      label: defineText("phoenix.pao2", "Arterial PaO₂"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // Input-validity bound, kept. Two published comparators now exist and
      // neither is adopted: the Phoenix implementation notes give PaO₂ as
      // [0, ∞) mmHg — no upper bound at all, and a floor of 0 — while PICANet's
      // Admission Dataset Definitions Manual v5.4 gives 3–60 kPa (22–450 mmHg),
      // tighter than this on both ends. Ours sits between them and is unchanged:
      // a form field refusing a typo does a different job from a pipeline's
      // outlier filter, and 700 still admits a legitimately high PaO₂ on
      // supplemental O₂ that the older "20–200 typical" note would have rejected.
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
      // PUBLISHED, AND IDENTICAL: the implementation notes' reasonable-value
      // table gives FiO₂ [0.21, 1.00], exactly this pair.
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
      // The S/F ratio is only VALID at SpO₂ ≤ 97 (that gate is applied in
      // calculate); a measured SpO₂ of 98–100 is still valid data (it simply
      // yields no S/F), so max is 100, not 97. PUBLISHED, AND MATCHING ON BOTH
      // COUNTS: the implementation notes give SpO₂ [0, 100] and state separately
      // that a value above 97 is unusable for S/F — the same ceiling and the
      // same gate. The 50 floor is still ours; the published floor is 0.
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
      // PUBLISHED, AND IDENTICAL: the implementation notes give the vasoactive
      // count as an integer 0–6, exactly this pair plus this step. Six is the
      // number of distinct agents the criteria enumerate, so the ceiling is the
      // list's length rather than a guardrail.
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
      // Input-validity bound, kept and NARROWER than both published comparators
      // at the top: the implementation notes give lactate [0, 50] mmol/L,
      // PICANet v5.4 gives 0.2–15.0. Ours (0.3–30) is unchanged — it sits inside
      // the Phoenix range and outside PICANet's, and 30 already exceeds any
      // value the ≥ 11 top tier can distinguish.
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
      // Input-validity bound, kept. Published alternative: the implementation
      // notes give MAP [1, 300] mmHg (with SBP [1, 300], DBP [1, 200] and
      // SBP − DBP ≥ 1 for sites that derive MAP from a cuff pressure — this
      // calculator takes MAP directly, so those two are not declared here).
      // Ours stays 10–200: the upper end was already widened past the research
      // note's "10–120" so an adolescent hypertensive value is not falsely
      // rejected, and it scores 0 either way.
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
      // Input-validity bound, kept. The published reasonable-value range is
      // [0, ∞) ×10³/µL — open above and admitting 0 — so there is no published
      // number to adopt here, only a published refusal to bound it. Ours stays.
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
      // Input-validity bound, kept. Published reasonable-value range is
      // [0, ∞) — open above, and its floor of 0 is below any physiologic INR.
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
      unit: ddimerMgLFeu,
      // Input-validity bound, kept. Published reasonable-value range is
      // [0, 500] mg/L FEU — ten times this ceiling. Ours is unchanged: the
      // 1-point threshold is > 2, so nothing above 50 is distinguishable and a
      // three-figure D-dimer at a bedside form is far likelier to be a unit
      // error (ng/mL FEU entered as mg/L) than a real value.
      //
      // THAT UNIT ERROR IS NOW ANSWERED RATHER THAN ONLY REFUSED (v2.3.0). The
      // ceiling still catches a ng/mL figure typed into a mg/L field, but it is
      // a blunt instrument for a question the unit system can answer exactly,
      // and it left the commonest FEU reporting unit unenterable: a laboratory
      // issuing 1500 ng/mL FEU — a real 1.5 mg/L, below threshold — was refused
      // with nothing to indicate the unit was the problem. Selecting the unit
      // converts instead.
      min: 0.1,
      max: 50,
      helpText: defineText(
        "phoenix.ddimer.help",
        "Contributes 1 coagulation point above 2 mg/L fibrinogen-equivalent units (FEU). Laboratories report FEU three ways: mg/L and µg/mL are the same number, while ng/mL is a thousand times larger (2 mg/L FEU = 2 µg/mL FEU = 2000 ng/mL FEU). Select the unit your report uses rather than converting by hand.",
      ),
    },
    {
      id: "fibrinogen",
      group: defineText("phoenix.group.coagulation", "Coagulation"),
      label: defineText("phoenix.fibrinogen", "Fibrinogen"),
      required: false,
      type: "numeric",
      unit: fibrinogenMgdl,
      // Input-validity bound, kept. Published reasonable-value range is
      // [0, ∞) mg/dL — open above, so again nothing to adopt.
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
      // PUBLISHED, AND IDENTICAL: the implementation notes give GCS 3–15 (and,
      // for the components this score does not consume, eye 1–4, motor 1–6,
      // verbal 1–5). Which is also the instrument's own definition — the two
      // agreeing is expected, and is recorded because "matches a published
      // bound" is the claim being made about every bound on this score.
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
      note: "Reference implementation by task-force members; source of the worked vignettes and the half-open MAP interval detail. Its implementation-notes documentation additionally publishes the reasonable-value table this score's input bounds are compared against, and the SQL from which the respiratory support gate is read (other respiratory support = FiO₂ > 0.21 OR invasive ventilation). The machine-readable units file that page refers to could not be retrieved; nothing here is cited to it.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-08-10",
      summary: "Initial published text.",
      reason: "initial-release",
    },
    {
      version: "1.1.0",
      date: "2026-09-03",
      reason: "clarification",
      summary:
        "Says so when an SpO₂ above 97% is entered with no PaO₂. The SpO₂:FiO₂ ratio saturates above 97%, so the value is accepted and then discarded and the respiratory subscore stays 0 — with the field FILLED, which the form's partial-entry cue cannot see, because it watches for blanks. The number is unchanged; what is new is that the result now says why it is 0 and names the field, beside the subscore and beside the input. Found on 2026-09-03 by an audit of the text-condensing pass, which had removed the one sentence that disclosed it.",
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
      "A half-entered Phoenix reads FALSELY LOW. Every unentered value is imputed at its normal end, each independently of the others: an uncomputable oxygenation ratio as 500, GCS as 15, pupils as not fixed, respiratory support as absent, lactate and vasoactive agents as 0, the coagulation labs as normal. A total below 2 on an incomplete entry is not evidence against sepsis. Enter every value that was actually measured before reading the total, and read a blank as “not measured”, never as “normal”.",
    ),
  ],
  formula: defineText(
    "phoenix.formula",
    "Total (0–13) = respiratory (0–3) + cardiovascular (0–6) + coagulation (0–2) + neurologic (0–2), each per JAMA 2024 Table 2. RESPIRATORY is support-gated and cumulative. The PaO₂:FiO₂ (P/F) and SpO₂:FiO₂ (S/F) ratios are evaluated together, S/F only when SpO₂ ≤ 97%, and either can trigger a tier: 1 point for any support with P/F < 400 or S/F < 292, 1 more for invasive ventilation with P/F < 200 or S/F < 220, and 1 more for invasive ventilation with P/F < 100 or S/F < 148. No support scores 0 regardless of the ratio, and non-invasive support cannot exceed 1. High-flow nasal cannula counts as support here, because Phoenix includes it explicitly. CARDIOVASCULAR sums three independent 0–2 sub-scores with no cap: vasoactive agents (0 → 0, 1 → 1, ≥ 2 → 2, counting dobutamine, dopamine, epinephrine, milrinone, norepinephrine and vasopressin), lactate (< 5 → 0, 5 to < 11 → 1, ≥ 11 → 2 mmol/L), and age-banded MAP (0, 1 or 2). COAGULATION adds 1 point each for platelets < 100 ×10³/µL, INR > 1.3, D-dimer > 2 mg/L FEU and fibrinogen < 100 mg/dL, capped at 2. For D-dimer, mg/L and µg/mL are the same number while ng/mL is a thousand times larger, so select the unit the report uses. NEUROLOGIC is hierarchical, not additive: bilaterally fixed pupils score 2 outright, whatever the GCS; otherwise GCS ≤ 10 scores 1; otherwise 0. An uncapped sum, which would return 3 for fixed pupils at GCS 8, is wrong. MISSING INPUTS are imputed at their normal end, each independently of the others: an uncomputable ratio as 500, GCS as 15, pupils as not fixed, respiratory support as absent, lactate and vasoactive agents as 0, the coagulation labs as normal. A fixed-pupils entry therefore scores its 2 points even with no GCS recorded. BOUNDARIES are compared continuously, matching the task force’s reference software rather than the integer bedside tables, at the four values where the two disagree: MAP 30.5 in a child under 1 month scores 1, lactate 10.95 scores 1, and a P/F of exactly 200 or an S/F of exactly 220 on invasive ventilation scores 1. Sepsis is reported when infection is suspected or confirmed and the total is ≥ 2; septic shock when sepsis is met and the cardiovascular component is ≥ 1, not merely when the total is ≥ 2.",
  ),
  notes: defineText(
    "phoenix.notes",
    "A diagnostic criterion, not a graded severity ladder. A HALF-ENTERED PHOENIX READS FALSELY LOW, because every unentered value is imputed at its normal end, and a total below 2 on an incomplete entry is not evidence against sepsis. The same convention produces one discontinuity worth stating outright: with no arterial gas, a child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at SpO₂ 97 but 0 at SpO₂ 98, because the ratio is simply not computable above 97. Read that as “not measurable”, never as “not hypoxaemic”, and obtain a gas. HIGH-FLOW NASAL CANNULA counts as respiratory support here, while PICANet and ANZPIC exclude it from the ventilation field they collect, so the same child reads differently against registry data. SCOPE. The criteria were derived in children under 18 years (216 months, an exclusive ceiling) and exclude newborns during the birth hospitalization and infants under 37 weeks post-conceptional age; age is not adjusted for prematurity. A sedated child’s neurologic point may be measuring the sedation, which is the authors’ own caveat. The 8-organ Phoenix-8 extension is research-only and out of scope.",
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
    // THE SHAPE BELOW IS READ OFF THE TASK FORCE'S PUBLISHED SQL, not inferred
    // from the printed table. That SQL derives one support flag and multiplies
    // by it — `other_respiratory_support = IIF(fio2 > 0.21 OR vent = 1, 1, 0)`,
    // then `imv * (two tiers) + other_respiratory_support * IIF(pfr < 400 OR
    // sfr < 292, 1, 0)`. So no support scores 0 at any ratio; the 1-point tier
    // needs only oxygen or non-invasive support; 2 and 3 need invasive
    // ventilation. pSOFA is built the other way up — its subscores 3 and 4
    // carry a support requirement and nothing below 3 does, so an unsupported
    // child there is CAPPED at 2 rather than floored at 0 (psofa.ts).
    //
    // ONE OPERATIONAL DIFFERENCE FROM THAT SQL, deliberate: it infers support
    // from the data (any FiO₂ above room air counts) because it extracts from
    // records with no support field; this calculator asks the clinician, and
    // `support === "none"` is taken at face value even when an FiO₂ above 0.21
    // is also entered. That pairing is internally contradictory, and it is the
    // one input combination where this score and the published extraction
    // disagree — stated in `notes` and on the field rather than silently
    // reconciled, because guessing past a clinician's explicit answer is worse
    // than disagreeing with a pipeline written for a different data source.
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
    // Same hole as pSOFA: a filled SpO₂ above 97 becomes RATIO_ABSENT and
    // contributes nothing, with no blank for the form's cue to notice.
    const spo2Discarded = pao2 === undefined && spo2 !== undefined && spo2 > 97;
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
        ...(spo2Discarded ? { notice: saturatingSpo2Notice() } : {}),
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
