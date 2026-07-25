import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { fractionWithPercent } from "../units/fraction";
import { mmhgWithKpa } from "../units/pressure";
import type { UnitSpec } from "../units/types";

/**
 * PIM3 — Paediatric Index of Mortality 3. A single logistic-regression model
 * that maps admission data to a predicted probability of death (0–1). It is a
 * unit-level case-mix / benchmarking instrument (summed probabilities across a
 * cohort give an expected death count for a Standardised Mortality Ratio), NOT
 * an individual bedside prognosis, and it carries no severity bands — the
 * derivation paper defines none.
 *
 * Coefficients, the intercept, the logistic transform, the special-value
 * defaults (SBP unknown → 120, cardiac arrest → 0, shock/unmeasurable → 30;
 * base excess unknown → 0; FiO₂/PaO₂ unknown → term 0.23 — the corrected PIM3
 * value, NOT PIM2's 0), and every [NEEDS SOURCE] flag come from
 * docs/research/scores/pim3.md (Straney et al., PCCM 2013, PMID 23863821).
 */

// Systolic BP is clinically recorded in mmHg only; kPa entry is not meaningful
// here, so this spec deliberately has no alternate (unlike blood-gas mmhgWithKpa).
const mmhgNoAlternate: UnitSpec = { canonical: "mmHg" };
// Base excess is reported in mmol/L with no routine alternate unit.
const mmolPerLitre: UnitSpec = { canonical: "mmol/L" };

export const pim3 = defineScore({
  id: "pim3",
  slug: "pim3",
  name: "Paediatric Index of Mortality 3 (PIM3)",
  version: "1.0.0",
  status: "published",
  category: "mortality-severity",
  inputs: [
    {
      id: "pupils",
      label: defineText("pim3.pupils", "Pupils fixed to bright light"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "pim3.pupils.help",
        "Yes only when BOTH pupils are fixed and larger than 3 mm to bright light. Fixed pupils caused by drugs, toxins, or local eye injury do not count as yes (exclusion detail is [NEEDS SOURCE] — ANZICS booklet; see notes).",
      ),
    },
    {
      id: "mechanical_ventilation",
      label: defineText("pim3.vent", "Mechanically ventilated in the first hour"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "pim3.vent.help",
        "Ventilated at any time during the first hour in ICU. PIM's definition also counts CPAP and BiPAP (mask or endotracheal); a tracheostomy with spontaneous breathing does not count (inclusion/exclusion detail is [NEEDS SOURCE] — ANZICS booklet).",
      ),
    },
    {
      id: "elective_admission",
      label: defineText("pim3.elective", "Elective ICU admission"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "pim3.elective.help",
        "Yes for a planned admission (elective surgery or elective monitoring/procedure). An unexpected admission after elective surgery that could not have been foreseen is not elective (wording is [NEEDS SOURCE] — ANZICS booklet).",
      ),
    },
    {
      id: "recovery_category",
      label: defineText("pim3.recovery", "Recovery from a procedure"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "pim3.recovery.help",
        "The reason for ICU admission, if it is recovery from a procedure. Mutually exclusive; choose 'none' if the admission is not a post-procedure recovery.",
      ),
      options: [
        {
          value: "none",
          label: defineText("pim3.recovery.none", "Not a post-procedure recovery admission"),
        },
        {
          value: "bypass_cardiac",
          label: defineText(
            "pim3.recovery.bypass",
            "Recovery after a cardiac procedure with cardiopulmonary bypass",
          ),
        },
        {
          value: "non_bypass_cardiac",
          label: defineText(
            "pim3.recovery.nonbypass",
            "Recovery after a cardiac procedure without bypass",
          ),
        },
        {
          value: "non_cardiac",
          label: defineText("pim3.recovery.noncardiac", "Recovery after a non-cardiac procedure"),
        },
      ],
    },
    {
      id: "diagnosis_risk",
      label: defineText("pim3.diagnosis", "Main-reason risk category"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "pim3.diagnosis.help",
        "Risk tier of the MAIN reason for ICU admission (at most one). Very high-risk includes e.g. cardiac arrest before admission, SCID, leukaemia/lymphoma after first induction, bone-marrow transplant, liver failure. High-risk includes e.g. spontaneous cerebral haemorrhage, cardiomyopathy/myocarditis, hypoplastic left heart, neurodegenerative disorder, necrotising enterocolitis. Low-risk includes e.g. asthma, bronchiolitis, croup, obstructive sleep apnoea, diabetic ketoacidosis, seizure disorder. Choose 'none' if the reason is not on any list.",
      ),
      options: [
        {
          value: "none",
          label: defineText("pim3.diagnosis.none", "None of the listed risk diagnoses"),
        },
        {
          value: "very_high",
          label: defineText("pim3.diagnosis.veryhigh", "Very high-risk main diagnosis"),
        },
        { value: "high", label: defineText("pim3.diagnosis.high", "High-risk main diagnosis") },
        { value: "low", label: defineText("pim3.diagnosis.low", "Low-risk main diagnosis") },
      ],
    },
    {
      id: "sbp",
      label: defineText("pim3.sbp", "Systolic blood pressure"),
      required: false,
      type: "numeric",
      unit: mmhgNoAlternate,
      // Input-validity bound, not a cited threshold (see research [NEEDS SOURCE]);
      // 0 is retained because cardiac arrest is coded as SBP 0.
      min: 0,
      max: 300,
      helpText: defineText(
        "pim3.sbp.help",
        "First systolic BP from first ICU contact to +1 hour. Leave blank if unknown (defaults to 120). For cardiac arrest at admission enter 0; if shocked with an unmeasurable BP enter 30. (Special-value wording is [NEEDS SOURCE] — ANZICS booklet.)",
      ),
    },
    {
      id: "base_excess",
      label: defineText("pim3.be", "Base excess"),
      required: false,
      type: "numeric",
      unit: mmolPerLitre,
      // Input-validity bound, not a cited threshold (see research [NEEDS SOURCE]).
      min: -40,
      max: 40,
      helpText: defineText(
        "pim3.be.help",
        "Arterial or capillary base excess in mmol/L. The equation uses its absolute value, so sign does not matter. Leave blank if unknown (contributes 0).",
      ),
    },
    {
      id: "fio2",
      label: defineText("pim3.fio2", "FiO₂ at the time of the PaO₂"),
      required: false,
      type: "numeric",
      unit: fractionWithPercent,
      min: 0.21,
      max: 1,
      helpText: defineText(
        "pim3.fio2.help",
        "Fraction of inspired oxygen, simultaneous with the PaO₂. Room air is 0.21. If FiO₂ or PaO₂ is unknown, leave both blank — the FiO₂/PaO₂ term then defaults to 0.23 (PIM3's 'normal' value).",
      ),
    },
    {
      id: "pao2",
      label: defineText("pim3.pao2", "Arterial PaO₂"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // Input-validity bound, not a cited threshold (see research [NEEDS SOURCE]).
      min: 20,
      max: 600,
      helpText: defineText(
        "pim3.pao2.help",
        "Arterial PaO₂, simultaneous with the FiO₂. Accepts mmHg or kPa. If FiO₂ or PaO₂ is unknown, leave both blank — the FiO₂/PaO₂ term then defaults to 0.23.",
      ),
    },
  ] as const,
  // The derivation paper defines NO diagnostic cut-points or risk bands for
  // individual patients; PIM3 output is used in aggregate (SMR). No bands.
  interpretation: [],
  references: [
    {
      citation:
        "Straney L, Clements A, Parslow RC, et al; ANZICS Paediatric Study Group and PICANet. Paediatric index of mortality 3: an updated model for predicting mortality in pediatric intensive care. Pediatr Crit Care Med. 2013;14(7):673–681.",
      pmid: "23863821",
      doi: "10.1097/PCC.0b013e31829760cf",
    },
    {
      citation:
        "ANZICS Centre for Outcome and Resource Evaluation. PIM2 & PIM3 for the ANZPIC Registry — Information Booklet (Version Jan 2019). Authoritative source for variable coding rules (SBP special values, pupil/ventilation definitions, first-hour timing).",
      url: "https://www.anzics.org/wp-content/uploads/2019/07/ANZPICR-PIM2-PIM3-Information-Booklet.pdf",
      note: "Booklet PDF returned HTTP 404 at verification; coding-rule wording carried as [NEEDS SOURCE].",
    },
    {
      citation:
        "Lee OJ, Jung M, Kim M, Yang HK, Cho J. Validation of the Pediatric Index of Mortality 3 in a Single Pediatric Intensive Care Unit in Korea. J Korean Med Sci. 2017;32(2):365–370.",
      doi: "10.3346/jkms.2017.32.2.365",
      note: "Independent reproduction of the full PIM3 equation, probability transform, and the risk-diagnosis lists.",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-25",
      summary:
        "Initial release: PIM3 logistic model → predicted mortality probability, with corrected FiO₂/PaO₂ missing-value default of 0.23.",
      reason: "initial-release",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The formula, its 13 coefficients, the intercept, and the logistic transform are mathematical facts / a method and are freely implementable (pim3.md IP status). Diagnosis-tier membership and the coding rules are facts and are used, but the ANZICS booklet's descriptive prose and the pupil/SBP instructional wording are paraphrased here rather than copied verbatim (pim3.md IP FLAG).",
  },
  formula: defineText(
    "pim3.formula",
    "PIM3 score (logit) = 3.8233 × pupils − 0.5378 × elective + 0.9763 × ventilated + 0.0671 × |base excess| − 0.0431 × SBP + 0.1716 × (SBP² ÷ 1000) + 0.4214 × (FiO₂/PaO₂ term) − 1.2246 × bypass-cardiac recovery − 0.8762 × non-bypass-cardiac recovery − 1.5164 × non-cardiac recovery + 1.6225 × very-high-risk diagnosis + 1.0725 × high-risk diagnosis − 2.1766 × low-risk diagnosis − 1.7928, where each pupil, ventilation, elective, recovery, and diagnosis indicator is 1 when present and 0 otherwise (Straney 2013). SBP is in mmHg (unknown → 120; cardiac arrest → 0; shocked/unmeasurable → 30) and enters both linearly and as SBP² ÷ 1000; base excess enters as its absolute value in mmol/L (unknown → 0); the FiO₂/PaO₂ term is (FiO₂ × 100) ÷ PaO₂ with FiO₂ a fraction and PaO₂ in mmHg, or 0.23 when either is unmeasured (PIM3's 'normal' substitute, not PIM2's 0). Predicted mortality (probability) = 1 ÷ (1 + e^−logit). Both the logit and the probability (a value from 0 to 1) are reported, each to 4 decimal places; the derivation paper defines no severity bands.",
  ),
  notes: defineText(
    "pim3.notes",
    "PIM3 estimates the probability of death from data collected at first ICU contact. It is a unit-level case-mix / benchmarking tool — summed individual probabilities across a cohort give an expected death count, compared with observed deaths as a Standardised Mortality Ratio (SMR = observed/expected) — and is NOT an individual bedside prediction. The derivation paper (Straney 2013) defines no diagnostic cut-points or risk bands, so this score reports none. Missing-data conventions are load-bearing: unknown systolic BP defaults to 120 mmHg, unknown base excess contributes 0, and an unmeasured FiO₂/PaO₂ sets that term to PIM3's 'normal' value of 0.23 (a correction — PIM2 used 0). SBP coding: cardiac arrest at admission → enter 0; shocked with an unmeasurable BP → enter 30; unknown → leave blank (120). Use the FIRST value of each variable from first ICU contact up to 1 hour after admission (may include ED/retrieval data), not the worst. Calibration drifts by setting and era (external AUC ~0.80–0.90, variable calibration); recalibrate and monitor locally before comparative interpretation. [NEEDS SOURCE] (all depend on the ANZICS PIM2/PIM3 Information Booklet, which returned HTTP 404 at verification): the pupil-exclusion clause (fixed pupils from drugs/toxins/local eye injury not scored), the mechanical-ventilation CPAP/BiPAP inclusion and tracheostomy-while-spontaneously-breathing exclusion, the elective 'could not have been foreseen' exclusion wording, and the exact verbatim SBP special-value wording (the values cardiac arrest→0 and shocked/unmeasurable→30 are widely repeated but no quotable full-text source was fetched). Per-region calibration statistics and the exact ANZPIC diagnosis-code mappings for each risk tier are also [NEEDS SOURCE].",
  ),
  calculate: (values) => {
    const pupils = values.pupils.value ? 1 : 0;
    const elective = values.elective_admission.value ? 1 : 0;
    const ventilated = values.mechanical_ventilation.value ? 1 : 0;

    // Base excess unknown → |BE| contributes 0.
    const absBaseExcess = values.base_excess ? Math.abs(values.base_excess.value) : 0;

    // SBP unknown → 120 (ANZICS default). Cardiac arrest and shock are entered
    // by the user as the special values 0 and 30 respectively.
    const sbp = values.sbp ? values.sbp.value : 120;

    // (FiO₂×100)/PaO₂ when BOTH are measured; otherwise PIM3's normal
    // substitute of 0.23 (corrected — PIM2 used 0). FiO₂ enters as a percent.
    const fio2Pao2Term =
      values.fio2 && values.pao2 ? (values.fio2.value * 100) / values.pao2.value : 0.23;

    const bypassCardiac = values.recovery_category.value === "bypass_cardiac" ? 1 : 0;
    const nonBypassCardiac = values.recovery_category.value === "non_bypass_cardiac" ? 1 : 0;
    const nonCardiac = values.recovery_category.value === "non_cardiac" ? 1 : 0;

    const veryHighRisk = values.diagnosis_risk.value === "very_high" ? 1 : 0;
    const highRisk = values.diagnosis_risk.value === "high" ? 1 : 0;
    const lowRisk = values.diagnosis_risk.value === "low" ? 1 : 0;

    const logit =
      3.8233 * pupils +
      -0.5378 * elective +
      0.9763 * ventilated +
      0.0671 * absBaseExcess +
      -0.0431 * sbp +
      0.1716 * ((sbp * sbp) / 1000) +
      0.4214 * fio2Pao2Term +
      -1.2246 * bypassCardiac +
      -0.8762 * nonBypassCardiac +
      -1.5164 * nonCardiac +
      1.6225 * veryHighRisk +
      1.0725 * highRisk +
      -2.1766 * lowRisk +
      -1.7928;

    const probability = 1 / (1 + Math.exp(-logit));

    return [
      {
        id: "pim3_score",
        label: defineText("pim3.out.logit", "PIM3 score (logit)"),
        value: logit,
        unit: "",
        precision: 4,
      },
      {
        id: "mortality_probability",
        label: defineText("pim3.out.prob", "PIM3 predicted mortality (probability)"),
        value: probability,
        unit: "",
        precision: 4,
      },
    ];
  },
});
