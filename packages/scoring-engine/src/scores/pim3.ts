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
 * Coefficients, the intercept, the logistic transform, the three diagnosis-tier
 * lists and their qualifying rules, the special-value coding (SBP unknown → 120,
 * cardiac arrest → 0, shock/unmeasurable → 30; base excess unknown → 0;
 * FiO₂/PaO₂ unknown → term 0.23 — the corrected PIM3 value, NOT PIM2's 0) all
 * come from Straney 2013 (PMID 23863821), Table 3 p677 and Appendix 1 p680, via
 * docs/research/scores/pim3.md.
 *
 * THE ONE THING NOT TO BREAK. The three diagnosis tiers are ONE categorical
 * variable, resolved by precedence — very high > high > low — and are NEVER
 * summed. PIM2 allowed a high-risk and a low-risk term to be counted together;
 * porting that behaviour forward is the defect this file is built to prevent.
 * On the paper's own worked example (fixture A, p681, a child with BOTH a
 * very-high-risk and a high-risk condition) failing to suppress the high-risk
 * term returns 72.34% where the published answer is 47.22%. The three mutually
 * exclusive indicators in `calculate` are the whole guard, and pim3.test.ts
 * pins them in both directions.
 */

// Systolic BP is clinically recorded in mmHg only; kPa entry is not meaningful
// here, so this spec deliberately has no alternate (unlike blood-gas mmhgWithKpa).
const mmhgNoAlternate: UnitSpec = { canonical: "mmHg" };
// Base excess is reported in mmol/L with no routine alternate unit.
const mmolPerLitre: UnitSpec = { canonical: "mmol/L" };

const NONE = "none";

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
      group: defineText("pim3.group.admission", "Admission and first-hour assessment"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "pim3.pupils.help",
        "Yes only when BOTH pupils are larger than 3 mm and fixed to bright light. Anything else — reactive, unequal, or not known — is no. A fixed pupil that can be attributed to drugs, toxins or direct injury to the eye is not recorded as abnormal (Straney 2013, Appendix 1, p680).",
      ),
    },
    {
      id: "mechanical_ventilation",
      label: defineText("pim3.vent", "Mechanically ventilated in the first hour"),
      group: defineText("pim3.group.admission", "Admission and first-hour assessment"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "pim3.vent.help",
        "Yes if the child received any of these at any point in the first hour in ICU: invasive ventilation, CPAP by mask or nasal prongs, BiPAP, or negative-pressure ventilation (Straney 2013, Appendix 1, p680). A tracheostomy with unassisted spontaneous breathing is no — that is the ANZPIC Registry's data-entry convention (PIM2 & PIM3 for the ANZPIC Registry — Information Booklet, version January 2019), not a rule stated in the paper, which lists only what the criterion includes.",
      ),
    },
    {
      id: "elective_admission",
      label: defineText("pim3.elective", "Elective ICU admission"),
      group: defineText("pim3.group.admission", "Admission and first-hour assessment"),
      required: true,
      type: "boolean",
      helpText: defineText(
        "pim3.elective.help",
        "Yes when the admission could have been put off by more than six hours without harm — the paper's test for elective (Straney 2013, Appendix 1, p680). Planned surgery and planned monitoring or procedures normally meet it; an admission that had to happen now does not.",
      ),
    },
    {
      id: "recovery_category",
      label: defineText("pim3.recovery", "Recovery from a procedure"),
      group: defineText("pim3.group.admission", "Admission and first-hour assessment"),
      required: true,
      type: "categorical",
      helpText: defineText(
        "pim3.recovery.help",
        "Choose a category only when recovering from the procedure IS the reason for the ICU admission. Radiology procedures and cardiac catheterisation count. Coming from theatre is not enough on its own — a child admitted after insertion of an ICP monitor is admitted for the head injury, not for the procedure (Straney 2013, Appendix 1, p680). The categories are mutually exclusive; a post-procedure admission may also carry a risk diagnosis below.",
      ),
      options: [
        {
          value: NONE,
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
      id: "very_high_risk_diagnosis",
      label: defineText("pim3.vhr", "Very high-risk diagnosis"),
      required: true,
      type: "categorical",
      group: defineText("pim3.group.diagnosis", "Risk diagnosis (main reason for admission)"),
      helpText: defineText(
        "pim3.vhr.help",
        "The list is complete as published — five conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Cardiac arrest counts whether it happened inside or outside hospital and needs a documented absent pulse or chest compressions — a past arrest does not count. Leukaemia or lymphoma counts only when the admission is about the malignancy or its treatment. Liver failure may be acute or chronic. THE TWO CUSTODIAN REGISTRIES CODE THE POST-TRANSPLANT CASE OPPOSITELY, and this is not resolvable by reading the paper harder: ANZPICR (Jan 2019) says do NOT include patients admitted for recovery following a liver transplant done for acute or chronic liver failure, and flags that this differs from PIM2; PICANet (v5.4, Nov 2020) says DO include them. ANZICS PSG and PICANet jointly supplied the derivation data, so the disagreement is downstream of Straney 2013 and live in practice. This score follows ANZPICR — the stricter reading, and the custodian of the ratio the model was built to produce — so a planned post-transplant admission is excluded here. Both registries agree that a readmission whose main reason is failure OF THE GRAFT does qualify. If a condition from a lower tier also applies, still record it there: the model applies the highest tier only.",
      ),
      options: [
        { value: NONE, label: defineText("pim3.vhr.none", "None of these") },
        {
          value: "cardiac_arrest",
          label: defineText("pim3.vhr.arrest", "Cardiac arrest before ICU admission"),
        },
        {
          value: "scid",
          label: defineText("pim3.vhr.scid", "Severe combined immune deficiency"),
        },
        {
          value: "leukaemia_lymphoma",
          label: defineText(
            "pim3.vhr.leukaemia",
            "Leukaemia or lymphoma, after the first induction",
          ),
        },
        {
          value: "bone_marrow_transplant",
          label: defineText("pim3.vhr.bmt", "Bone marrow transplant recipient"),
        },
        { value: "liver_failure", label: defineText("pim3.vhr.liver", "Liver failure") },
      ],
    },
    {
      id: "high_risk_diagnosis",
      label: defineText("pim3.hr", "High-risk diagnosis"),
      required: true,
      type: "categorical",
      group: defineText("pim3.group.diagnosis", "Risk diagnosis (main reason for admission)"),
      helpText: defineText(
        "pim3.hr.help",
        "The list is complete as published — five conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Cerebral haemorrhage must be spontaneous (aneurysm or arteriovenous malformation): traumatic bleeds are excluded, as are intracranial bleeds outside the brain itself such as a subdural. Hypoplastic left heart syndrome counts at any age, but only where a Norwood or equivalent operation was needed in the newborn period to keep the child alive. Neurodegenerative disorder needs a progressive loss of milestones, or a diagnosis in which that loss is certain, and does not need a name. A very high-risk diagnosis, if also present, takes precedence over this one.",
      ),
      options: [
        { value: NONE, label: defineText("pim3.hr.none", "None of these") },
        {
          value: "cerebral_haemorrhage",
          label: defineText("pim3.hr.ich", "Spontaneous cerebral haemorrhage"),
        },
        {
          value: "cardiomyopathy_myocarditis",
          label: defineText("pim3.hr.cardiomyopathy", "Cardiomyopathy or myocarditis"),
        },
        {
          value: "hypoplastic_left_heart",
          label: defineText("pim3.hr.hlhs", "Hypoplastic left heart syndrome"),
        },
        {
          value: "neurodegenerative",
          label: defineText("pim3.hr.neurodegen", "Neurodegenerative disorder"),
        },
        {
          value: "necrotising_enterocolitis",
          label: defineText("pim3.hr.nec", "Necrotising enterocolitis"),
        },
      ],
    },
    {
      id: "low_risk_diagnosis",
      label: defineText("pim3.lr", "Low-risk diagnosis"),
      required: true,
      type: "categorical",
      group: defineText("pim3.group.diagnosis", "Risk diagnosis (main reason for admission)"),
      helpText: defineText(
        "pim3.lr.help",
        "The list is complete as published — six conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Bronchiolitis covers a child presenting with either respiratory distress or central apnoea where the clinical diagnosis is bronchiolitis. Obstructive sleep apnoea covers admission after adenoidectomy or tonsillectomy when the apnoea is the main reason — record the procedure recovery above as well, since such a case carries both terms. Seizure disorder covers status epilepticus, epilepsy, a febrile convulsion or another epileptic syndrome where the admission is to control the seizures or to recover from them or their treatment. A very high-risk or high-risk diagnosis, if also present, takes precedence over this one.",
      ),
      options: [
        { value: NONE, label: defineText("pim3.lr.none", "None of these") },
        { value: "asthma", label: defineText("pim3.lr.asthma", "Asthma") },
        { value: "bronchiolitis", label: defineText("pim3.lr.bronchiolitis", "Bronchiolitis") },
        { value: "croup", label: defineText("pim3.lr.croup", "Croup") },
        {
          value: "obstructive_sleep_apnoea",
          label: defineText("pim3.lr.osa", "Obstructive sleep apnoea"),
        },
        {
          value: "diabetic_ketoacidosis",
          label: defineText("pim3.lr.dka", "Diabetic ketoacidosis"),
        },
        { value: "seizure_disorder", label: defineText("pim3.lr.seizure", "Seizure disorder") },
      ],
    },
    {
      id: "sbp",
      label: defineText("pim3.sbp", "Systolic blood pressure"),
      group: defineText("pim3.group.observations", "Observations at first contact"),
      required: false,
      type: "numeric",
      unit: mmhgNoAlternate,
      // 0 and 30 are PUBLISHED SENTINELS, not measurements (Straney 2013,
      // Appendix 1, p680), and each carries real weight: SBP 0 contributes
      // +2.70096 logit relative to the unknown default of 120. A guard that
      // rejects them breaks the score, so `min` MUST stay at 0. The upper bound
      // of 300 is an engineering plausibility limit, not a cited threshold.
      min: 0,
      max: 300,
      helpText: defineText(
        "pim3.sbp.help",
        "First systolic BP from first ICU-team contact to one hour after ICU arrival — the first value in that window, not the worst. Three coded entries carry weight and are not measurements: leave blank if unknown (the model substitutes 120), enter 0 if the child was in cardiac arrest at admission, and enter 30 if shocked with a blood pressure that could not be measured (Straney 2013, Appendix 1, p680).",
      ),
    },
    {
      id: "base_excess",
      label: defineText("pim3.be", "Base excess"),
      group: defineText("pim3.group.observations", "Observations at first contact"),
      required: false,
      type: "numeric",
      unit: mmolPerLitre,
      // Engineering plausibility bound, not a cited threshold; the paper states
      // the unit and the unknown default but publishes no range.
      min: -40,
      max: 40,
      helpText: defineText(
        "pim3.be.help",
        "Arterial or capillary base excess in mmol/L. The equation uses its absolute value, so sign does not matter. Leave blank if unknown — the model substitutes 0 (Straney 2013, Appendix 1, p680).",
      ),
    },
    {
      id: "fio2",
      label: defineText("pim3.fio2", "FiO₂ at the time of the PaO₂"),
      group: defineText("pim3.group.observations", "Observations at first contact"),
      required: false,
      type: "numeric",
      unit: fractionWithPercent,
      // Engineering plausibility bound: room air is the floor of deliverable
      // FiO₂. Not a cited threshold.
      min: 0.21,
      max: 1,
      helpText: defineText(
        "pim3.fio2.help",
        "Fraction of inspired oxygen taken at the same moment as the PaO₂. Room air is 0.21. If either FiO₂ or PaO₂ is unknown the whole oxygenation term becomes 0.23, so leaving one blank makes the other one unused.",
      ),
    },
    {
      id: "pao2",
      label: defineText("pim3.pao2", "Arterial PaO₂"),
      group: defineText("pim3.group.observations", "Observations at first contact"),
      required: false,
      type: "numeric",
      unit: mmhgWithKpa,
      // Engineering plausibility bound, not a cited threshold.
      min: 20,
      max: 600,
      helpText: defineText(
        "pim3.pao2.help",
        "Arterial PaO₂ taken at the same moment as the FiO₂. Accepts mmHg or kPa. If either FiO₂ or PaO₂ is unknown the whole oxygenation term becomes 0.23 — PIM3's substitute for a normal value, and NOT PIM2's 0.",
      ),
    },
  ] as const,
  // The derivation paper defines NO diagnostic cut-points or risk bands for
  // individual patients; PIM3 output is used in aggregate (SMR). No bands.
  interpretation: [],
  // Absence by design, NOT a content gap. Straney 2013 publishes no cut-points
  // and no risk bands, so there is nothing to author — the two lines above and
  // this one previously contradicted each other, telling a reader both that no
  // bands exist and that ours were unwritten. "pending" would promise a page
  // that can never be written, and would read as an admission of incomplete
  // work rather than a property of the score.
  interpretationStatus: "not-applicable",
  references: [
    {
      citation:
        "Straney L, Clements A, Parslow RC, et al; ANZICS Paediatric Study Group and PICANet. Paediatric index of mortality 3: an updated model for predicting mortality in pediatric intensive care. Pediatr Crit Care Med. 2013;14(7):673–681.",
      pmid: "23863821",
      doi: "10.1097/PCC.0b013e31829760cf",
      // The ANZICS "PIM2 & PIM3 for the ANZPIC Registry — Information Booklet
      // (Version Jan 2019)" is still named rather than carried as its own
      // reference: its published URL
      // (anzics.org/wp-content/uploads/2019/07/ANZPICR-PIM2-PIM3-Information-Booklet.pdf)
      // returns HTTP 404, re-verified 2026-08-02, as does every other
      // anzics.org upload path tried. Shipping a dead link beside working DOIs
      // and a PMID made the citation list less trustworthy, not more complete.
      //
      // What CHANGED on 2026-08-03: the coding rules no longer depend on it.
      // Appendix 1 (p680) of the paper itself carries the pupil, ventilation,
      // elective, SBP-sentinel, measurement-window and imputation rules, and
      // those are now sourced to the paper. The booklet remains the source of
      // two things the paper does not carry: the registry's own diagnosis code
      // numbers, which diverge from the paper's (see `notes`) and which this
      // implementation deliberately does not consume, and the tracheostomy
      // clause on the ventilation criterion. The booklet's text was obtained
      // and read on 2026-08-03 — that is what closed the tracheostomy
      // [NEEDS SOURCE] — but its published URL still 404s, so it is named and
      // dated here rather than shipped as a locator.
      note: "Derivation paper: the 13 coefficients and intercept (Table 3, p677), the three diagnosis-tier lists with their qualifying rules and the precedence rule, and the variable coding and missing-value conventions (Appendix 1, p680). The ANZICS 'PIM2 & PIM3 for the ANZPIC Registry — Information Booklet (Version Jan 2019)' is a supporting document for registry data entry, and the only source for the rule that a tracheostomy with unassisted spontaneous breathing is not ventilation, a rule the paper does not address. It is grey literature with no DOI and is no longer retrievable at its published URL (HTTP 404), so it is credited here rather than carried as its own reference.",
    },
    {
      citation:
        "Wolfler A, Osello R, Gualino J, et al; Italian Network of Pediatric Intensive Care Units. The importance of mortality risk assessment: validation of the Pediatric Index of Mortality 3 score. Pediatr Crit Care Med. 2016;17(3):251–256.",
      doi: "10.1097/PCC.0000000000000657",
      note: "Italian multicentre validation: AUC 0.88, SMR 0.98 (Hosmer-Lemeshow p = 0.21). Source for the neonatal over-prediction observed for both PIM2 and PIM3, and for the measured cost of migrating a PIM2 cohort to PIM3 (roughly one admission in eleven changes risk tier).",
    },
    {
      citation:
        "Lee OJ, Jung M, Kim M, Yang HK, Cho J. Validation of the Pediatric Index of Mortality 3 in a Single Pediatric Intensive Care Unit in Korea. J Korean Med Sci. 2017;32(2):365–370.",
      doi: "10.3346/jkms.2017.32.2.365",
      note: "Independent reproduction of the full PIM3 equation, probability transform, and the risk-diagnosis lists. Source for the haemato-oncology under-prediction (c-index 0.66 against 0.74–0.83 in other subgroups; observed mortality 18.73% against 7.13% predicted).",
    },
    {
      citation:
        "Arias López MdP, Fernández AL, Ratto ME, et al. Pediatric Index of Mortality 3: an evaluation of function among ICUs in Argentina. Pediatr Crit Care Med. 2018;19(12):e653–e661.",
      doi: "10.1097/PCC.0000000000001741",
      note: "Argentine multicentre evaluation: AUC 0.83, SMR 1.3, Hosmer-Lemeshow p < 0.001. Source for the observation that HIV infection and post-liver-transplant admission — both dropped from the model as non-predictive in the derivation population — remain associated with higher mortality in a resource-varied setting.",
    },
    {
      citation:
        "Solomon LJ, Morrow BM, Argent AC. Paediatric Index of Mortality scores: an evaluation of function in the Paediatric Intensive Care Units of a South African province. Pediatr Crit Care Med. 2021;22(9):813–821.",
      doi: "10.1097/PCC.0000000000002693",
      note: "South African multicentre evaluation: AUC 0.81, SMR 1.28, Hosmer-Lemeshow p < 0.001, with the highest SMR (6.67) in the LOWEST risk decile. The closest published comparator for deployment in a resource-varied setting, being the only multicentre evaluation of PIM3 in one.",
    },
    {
      citation:
        "Baloglu O, Nagy LR, Sonawane A, et al. Simplified Pediatric Index of Mortality 3 score by explainable machine learning algorithm. Crit Care Explor. 2021;3(10):e0561.",
      doi: "10.1097/CCE.0000000000000561",
      note: "Source for the scale of real-world missingness in the PIM3 blood-gas inputs: base excess missing in 97.2% and the oxygenation ratio in 97.3% of a single-centre US series — the reason the imputation path is the ordinary path rather than an edge case.",
    },
    // The two Gulf-region evaluations, added 2026-08-04. This platform deploys
    // in the region, so these are the calibration figures that describe its own
    // patients rather than a proxy drawn from somewhere with a similar
    // resource profile.
    {
      citation:
        "Malhotra D, Nour N, El Halik M, Zidan M. Performance of Pediatric Index of Mortality 3 score in a tertiary pediatric ICU in Dubai. Dubai Med J. 2019;3(1):19–25.",
      doi: "10.1159/000505205",
      note: "Latifa Hospital, Dubai; single centre, n = 583 with 46 deaths (7.9%). Three findings are stable and are what this page rests on: AUC 0.78 (95% CI 0.69–0.87), an overall SMR of 0.53 — the model OVER-predicted deaths across the unit — and SMR 2.1 in the sepsis subgroup, an UNDER-prediction that nothing else in the paper contradicts. Its predicted-probability strata do contradict each other and are carried as unstable rather than as a finding: SMR 2.67 in the 1–5% band (severe under-prediction) against SMR 0.33 below a predicted probability of 14.3% and 0.72 above it (over-prediction across that same low range). Both cuts are this study's own, so neither direction can be asserted for the low end of the scale.",
    },
    {
      citation:
        "Alkhalifah AS, AlSoqati A, Zahraa J. Performance of pediatric risk of mortality III and pediatric index of mortality scores in a tertiary pediatric intensive care unit in Saudi Arabia. Front Pediatr. 2022;10:926686.",
      doi: "10.3389/fped.2022.926686",
      note: "King Fahad Medical City, Riyadh; n = 3396, children under 14. The models it evaluated had, in its own words, 'sufficient discrimination ability and poor calibration', and both the worst calibration and the worst discrimination were in infants under 12 months. The one per-model figure carried here is PRISM III's (best in the 60–120-month band, AUC 0.87); no PIM3-specific statistic from this study is asserted, because none was captured in the review that supplied it.",
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
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The formula, its 13 coefficients, the intercept, the logistic transform and the tier-precedence rule are mathematical facts / a method and are freely implementable (pim3.md IP status). Which conditions sit in which risk tier is likewise a fact and is used; the condition names are ordinary clinical terms. The paper's and the ANZICS booklet's descriptive prose — the qualifying rules, the pupil descriptor and the SBP special-value instructions — is paraphrased in this project's own words rather than transcribed (pim3.md IP FLAG).",
  },
  formula: defineText(
    "pim3.formula",
    "PIM3 score (logit) = 3.8233 × pupils + 0.9763 × ventilated − 0.5378 × elective + 0.0671 × |base excess| − 0.0431 × SBP + 0.1716 × (SBP² ÷ 1000) + 0.4214 × (FiO₂ × 100 ÷ PaO₂) − 1.2246 × bypass-cardiac recovery − 0.8762 × non-bypass-cardiac recovery − 1.5164 × non-cardiac recovery + 1.6225 × very-high-risk diagnosis + 1.0725 × high-risk diagnosis − 2.1766 × low-risk diagnosis − 1.7928, where each indicator is 1 when present and 0 otherwise. Predicted mortality (probability) = 1 ÷ (1 + e^−logit). No severity bands are published, so none are shown. " +
      "THE THREE DIAGNOSIS TIERS ARE ONE VARIABLE, NOT THREE. Very-high-risk outranks high-risk, which outranks low-risk, and only the highest applies. Counting two tiers together is the commonest porting defect: on the paper’s own worked example it yields 72.34% instead of 47.22%. " +
      "MISSING VALUES SUBSTITUTE THE MODEL’S OWN FIGURES rather than being dropped or read as normal: SBP → 120, base excess → 0, oxygenation term → 0.23 (a PIM3 correction; PIM2 used 0). This is the ordinary path, not an edge case, PaO₂ having been missing in 55.8% of the derivation cohort. Systolic BP also carries three coded entries that are not measurements: cardiac arrest at admission → 0, shocked with an unmeasurable BP → 30, unknown → blank, which the model reads as 120. The paired SBP terms are U-shaped with a minimum near 125.6 mmHg, which is how the arrest code acquires its weight, about +2.70 logit against the default.",
  ),
  cautions: [
    defineText(
      "pim3.caution.groups",
      "PIM3 is for GROUPS of patients, not for one individual patient. The derivation paper says so itself: “These models are not intended for prognostic use on individual patients” (Straney 2013). It estimates hospital-mortality probability for unit-level case-mix and SMR benchmarking, so the number shown here should not be used to describe, or to decide anything about, the child in front of you.",
    ),
  ],
  notes: defineText(
    "pim3.notes",
    "PIM3 estimates hospital-mortality probability from data at first ICU contact, for unit-level case-mix and SMR benchmarking. The derivation paper states the limit itself: “These models are not intended for prognostic use on individual patients” (Straney 2013). " +
      "MEASUREMENT WINDOW AND CODING. Use the FIRST value of each variable from first face-to-face ICU-team contact to 1 hour after ICU arrival, not the worst. Pupils count only when both are larger than 3 mm and fixed to bright light; a drug, toxin or direct eye-injury explanation does not count. Ventilated in the first hour covers invasive ventilation, mask or nasal CPAP, BiPAP and negative-pressure ventilation. A tracheostomy breathing spontaneously without support is no, which is an ANZPIC Registry data-entry convention (January 2019 booklet) rather than a rule in the paper, and the paper is silent on the case. Elective means the admission could have been deferred by more than 6 hours without harm. Each of the three diagnosis-tier lists is complete as published and applies to the main reason for admission; if you are unsure, record none. " +
      "POST-LIVER-TRANSPLANT ADMISSIONS ARE CODED OPPOSITELY BY THE TWO CUSTODIAN REGISTRIES. ANZPICR excludes planned post-transplant recovery from liver failure; PICANet includes it. This score follows ANZPICR, the stricter reading. Both agree that a readmission for graft failure qualifies. " +
      "AGE. Read the model as applying to children younger than 16. The paper CONTRADICTS itself here, its abstract saying younger than 18 and its inclusion criteria younger than 16, and the contradiction is in the source rather than resolved here. " +
      "CALIBRATION TRAVELS FAR WORSE THAN DISCRIMINATION. Italy AUC 0.88 with SMR 0.98; Argentina 0.83 with SMR 1.3; South Africa 0.81 with SMR 1.28, its highest SMR of 6.67 falling in the LOWEST-risk decile. The Gulf has its own evidence. Dubai (n = 583): AUC 0.78 with an overall SMR of 0.53, yet SMR 2.1 in SEPSIS, an under-prediction inside an over-predicting unit, and that sepsis signal is the finding that survives its own paper. Riyadh (n = 3,396): sufficient discrimination, poor calibration, worst in infants under 12 months. Newborns are systematically over-predicted, sitting below the SBP nadir, and haemato-oncology admissions are under-predicted, observed mortality 18.73% against 7.13% predicted. Recalibrate and monitor locally before comparative use. " +
      "DO NOT MIX COEFFICIENT SETS. ANZICS publishes regional recalibrations, PIM3-anz13 and PIM3-anz15, whose coefficients are entirely different. Registry exports use sentinel values, 999 meaning unknown, so any future import path must map them before scoring. PICANet publishes citable plausibility ranges for systolic BP, PaO₂ and base excess; no registry publishes ranges for platelets, bilirubin, creatinine or MAP, because none collects them.",
  ),
  calculate: (values) => {
    const pupils = values.pupils.value ? 1 : 0;
    const elective = values.elective_admission.value ? 1 : 0;
    const ventilated = values.mechanical_ventilation.value ? 1 : 0;

    // Base excess unknown → |BE| contributes 0 (Appendix 1, p680).
    const absBaseExcess = values.base_excess ? Math.abs(values.base_excess.value) : 0;

    // SBP unknown → 120. Cardiac arrest (0) and shock with an unmeasurable BP
    // (30) are entered by the user as those published sentinel values, which is
    // why `min` on the input is 0 and not a physiologic floor.
    const sbp = values.sbp ? values.sbp.value : 120;

    // (FiO₂×100)/PaO₂ when BOTH are measured; otherwise PIM3's substitute for a
    // normal value, 0.23 (corrected — PIM2 used 0). FiO₂ enters as a percent.
    const fio2Pao2Term =
      values.fio2 && values.pao2 ? (values.fio2.value * 100) / values.pao2.value : 0.23;

    const bypassCardiac = values.recovery_category.value === "bypass_cardiac" ? 1 : 0;
    const nonBypassCardiac = values.recovery_category.value === "non_bypass_cardiac" ? 1 : 0;
    const nonCardiac = values.recovery_category.value === "non_cardiac" ? 1 : 0;

    /*
     * THE PRECEDENCE RULE (Straney 2013, Methods p674). The three tiers are a
     * single categorical: a child with conditions in two tiers is assigned to
     * exactly one, the highest. The suppression below is the entire difference
     * between the paper's 47.22% and the PIM2-style additive 72.34% on its own
     * worked example, so it is written as three mutually exclusive indicators
     * rather than three independent flags.
     */
    const hasVeryHigh = values.very_high_risk_diagnosis.value !== NONE;
    const hasHigh = values.high_risk_diagnosis.value !== NONE;
    const hasLow = values.low_risk_diagnosis.value !== NONE;

    const veryHighRisk = hasVeryHigh ? 1 : 0;
    const highRisk = !hasVeryHigh && hasHigh ? 1 : 0;
    const lowRisk = !hasVeryHigh && !hasHigh && hasLow ? 1 : 0;

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
