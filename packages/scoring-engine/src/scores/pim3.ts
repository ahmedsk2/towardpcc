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
  version: "1.2.1",
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
        "The list is complete as published — five conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Cardiac arrest counts whether it happened inside or outside hospital and needs a documented absent pulse or chest compressions — a past arrest does not count. Leukaemia or lymphoma counts only when the admission is about the malignancy or its treatment. Liver failure may be acute or chronic but excludes admission after a planned liver transplant. If a condition from a lower tier also applies, still record it there: the model applies the highest tier only.",
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
      note: "Derivation paper: the 13 coefficients and intercept (Table 3, p677), the three diagnosis-tier lists with their qualifying rules and the precedence rule, and the variable coding and missing-value conventions (Appendix 1, p680). The ANZICS 'PIM2 & PIM3 for the ANZPIC Registry — Information Booklet (Version Jan 2019)' is a supporting document for registry data entry; its text was retrieved and read on 2026-08-03 and is the only source for the rule that a tracheostomy with unassisted spontaneous breathing is not ventilation, a rule the paper does not address. It is grey literature with no DOI and is no longer retrievable at its published URL (HTTP 404, re-verified 2026-08-02), so it is credited here rather than carried as its own reference.",
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
      note: "Latifa Hospital, Dubai; single centre, n = 583 with 46 deaths (7.9%). Full text read 2026-08-04. Three findings are stable and are what this page rests on: AUC 0.78 (95% CI 0.69–0.87), an overall SMR of 0.53 — the model OVER-predicted deaths across the unit — and SMR 2.1 in the sepsis subgroup, an UNDER-prediction that nothing else in the paper contradicts. Its predicted-probability strata do contradict each other and are carried as unstable rather than as a finding: SMR 2.67 in the 1–5% band (severe under-prediction) against SMR 0.33 below a predicted probability of 14.3% and 0.72 above it (over-prediction across that same low range). Both cuts are this study's own, so neither direction can be asserted for the low end of the scale.",
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
      date: "2026-07-25",
      summary:
        "Initial release: PIM3 logistic model → predicted mortality probability, with corrected FiO₂/PaO₂ missing-value default of 0.23.",
      reason: "initial-release",
    },
    {
      version: "1.0.1",
      date: "2026-08-02",
      summary:
        "Removed the ANZICS PIM2/PIM3 Information Booklet as a separate reference: its published URL returns HTTP 404 (re-verified 2026-08-02) and it was the only locator on this page not backed by a resolver. The booklet is still named, as the authoritative source for the variable coding rules, in a note on the derivation paper it supports, and the rules that depend on it remain marked [NEEDS SOURCE]. No citation text was lost and no computed value changed.",
      reason: "new-reference",
    },
    {
      version: "1.1.0",
      date: "2026-08-03",
      summary:
        "Straney 2013 read in full including Appendix 1, and the diagnosis model rebuilt on it. The single 'main-reason risk category' picker is replaced by the three published tier lists as separate questions (5 very high-risk, 5 high-risk, 6 low-risk, each complete as published) with their qualifying rules, and the model now resolves them itself by the paper's precedence rule — highest tier wins, never additive. This changes the number for a patient who has conditions in two tiers and whose tier was previously chosen by hand: on the paper's own worked example (p681) counting the high-risk term alongside the very high-risk one returns 72.34% where the published answer is 47.22%. No coefficient, intercept or imputation default changed. The pupil, ventilation, elective, SBP-sentinel and measurement-window coding rules are now sourced to Appendix 1 p680 instead of the unreachable ANZICS booklet, closing those [NEEDS SOURCE] flags; four external validations were added and the limitations now carry the age-range discrepancy, neonatal over-prediction, haemato-oncology and neurological under-prediction, and per-region calibration. New caution: PIM3 is validated for groups and must not drive decisions about an individual patient.",
      reason: "formula-correction",
    },
    {
      version: "1.1.1",
      date: "2026-08-03",
      summary:
        "Closes the last [NEEDS SOURCE] on this score. The rule that a tracheostomy with unassisted spontaneous breathing does not count as first-hour ventilation is sourced to the ANZPIC Registry PIM2/PIM3 Information Booklet (version January 2019), whose text was retrieved and read on 2026-08-03. It is recorded for what it is: a registry data-dictionary convention, grey literature with no DOI, and the only source that addresses the edge case — Straney 2013 Appendix 1 lists only what the ventilation criterion includes and is silent on tracheostomy. The booklet is still not shipped as a locator, because its published URL still returns HTTP 404. No coefficient, input, imputation default or computed probability changed; the ventilation help text and the limitations now state the provenance instead of a gap.",
      reason: "new-reference",
    },
    {
      version: "1.2.0",
      date: "2026-08-04",
      summary:
        "Adds the Gulf-region calibration evidence, which is where this platform deploys. NO COEFFICIENT, INPUT, IMPUTATION DEFAULT, TIER LIST OR COMPUTED PROBABILITY CHANGED — the model returns exactly what it returned before. Dubai (Malhotra 2019, Latifa Hospital, single centre, n = 583, 46 deaths, 7.9%): AUC 0.78 (95% CI 0.69–0.87), overall SMR 0.53 — over-predicting deaths for the unit as a whole — but SMR 2.1 in the sepsis subgroup and 2.67 among children whose predicted probability was 1–5%. Riyadh (Alkhalifah 2022, n = 3396, under 14 years): sufficient discrimination and poor calibration across the mortality models it evaluated, with the worst calibration and discrimination in infants under 12 months. The limitations now draw the conclusion rather than only listing the figures — discrimination travels between populations, calibration frequently does not, and the regional under-prediction sits in the low-probability band and in sepsis, exactly where a small number is most likely to be trusted — and the previous line naming the South African study as the closest Gulf comparator is corrected, since the region now has its own evaluations (South Africa remains the only multicentre one in a resource-varied setting). New caution beside the result: a low predicted probability, in a septic child or an infant, is the least trustworthy number this model produces here.",
      reason: "new-reference",
    },
    {
      version: "1.2.1",
      date: "2026-08-04",
      summary:
        "Corrects the conclusion v1.2.0 drew from the Dubai study, which that study's own other stratification contradicts. NOTHING COMPUTED CHANGED — no coefficient, input, imputation default, tier list or probability moved. v1.2.0 told a reader that the reassuring end of the scale is the least trustworthy part of it, resting that on SMR 2.67 in the 1–5% predicted-probability band. Malhotra 2019 also reports SMR 0.33 below a predicted probability of 14.3% against 0.72 above it — over-prediction, not under-prediction, across that same low range. Both figures are from that one cohort of 583 and they point in opposite directions depending on where the bands are cut, so the platform now carries BOTH and asserts no direction for the low end. What is unchanged, because nothing in the paper contradicts it, is the part that matters clinically: SMR 2.1 in the SEPSIS subgroup, still stated prominently in the caution beside the result. The robust findings are the overall SMR 0.53, the AUC 0.78 and the sepsis SMR 2.1; the predicted-probability strata are recorded as unstable. The caution now names sepsis and infants under 12 months as where this model is least trustworthy here — both of which their own studies support — rather than the low end of the scale.",
      reason: "clarification",
    },
  ],
  ipStatus: {
    kind: "freely-reproducible",
    evidence:
      "The formula, its 13 coefficients, the intercept, the logistic transform and the tier-precedence rule are mathematical facts / a method and are freely implementable (pim3.md IP status). Which conditions sit in which risk tier is likewise a fact and is used; the condition names are ordinary clinical terms. The paper's and the ANZICS booklet's descriptive prose — the qualifying rules, the pupil descriptor and the SBP special-value instructions — is paraphrased in this project's own words rather than transcribed (pim3.md IP FLAG).",
  },
  formula: defineText(
    "pim3.formula",
    "PIM3 score (logit) = 3.8233 × pupils − 0.5378 × elective + 0.9763 × ventilated + 0.0671 × |base excess| − 0.0431 × SBP + 0.1716 × (SBP² ÷ 1000) + 0.4214 × (FiO₂/PaO₂ term) − 1.2246 × bypass-cardiac recovery − 0.8762 × non-bypass-cardiac recovery − 1.5164 × non-cardiac recovery + 1.6225 × very-high-risk diagnosis + 1.0725 × high-risk diagnosis − 2.1766 × low-risk diagnosis − 1.7928, where each pupil, ventilation, elective, recovery and diagnosis indicator is 1 when present and 0 otherwise (Straney 2013, Table 3, p677). The three diagnosis tiers are ONE variable, not three: when conditions from more than one tier are present only the highest applies — very high-risk, then high-risk, then low-risk — and the others contribute nothing. SBP is in mmHg (unknown → 120; cardiac arrest → 0; shocked with an unmeasurable BP → 30) and enters both linearly and as SBP² ÷ 1000, which together are U-shaped with a minimum near 125.6 mmHg, so both low and high pressures raise the score. Base excess enters as its absolute value in mmol/L (unknown → 0); the oxygenation term is (FiO₂ × 100) ÷ PaO₂ with FiO₂ a fraction and PaO₂ in mmHg, or 0.23 when either is unmeasured (PIM3's substitute for a normal value, not PIM2's 0). Predicted mortality (probability) = 1 ÷ (1 + e^−logit). Both the logit and the probability (a value from 0 to 1) are reported, each to 4 decimal places; the derivation paper defines no severity bands.",
  ),
  cautions: [
    defineText(
      "pim3.caution.groups",
      "PIM3 is validated for GROUPS of patients, not for one patient. It is a case-mix and benchmarking instrument, and it should not be used to describe, or to make decisions about, the individual child in front of you (Straney 2013).",
    ),
    defineText(
      "pim3.caution.imputed",
      "A blank blood pressure, base excess or blood gas is not treated as normal — the model substitutes its own fixed values (SBP 120, |base excess| 0, oxygenation term 0.23). That is the published behaviour and it is the ordinary case, not the exception: PaO₂ was missing for 55.8% of the derivation cohort. It does mean a result computed from few entries is carrying more of the model than of this patient.",
    ),
    defineText(
      "pim3.caution.regional",
      "Calibration does not travel with discrimination, and this platform deploys where that has been measured. In a Dubai PICU (n = 583) PIM3 discriminated acceptably (AUC 0.78) and over-predicted deaths overall (SMR 0.53) — while UNDER-predicting by a factor of 2.1 in SEPSIS. A Riyadh series (n = 3396, under 14 years) found poor calibration across the mortality models it assessed, worst in infants under 12 months. So a probability shown here is uncalibrated for this region and is least trustworthy in a septic child and in an infant under 12 months, and a unit-level SMR below 1 does not make it safe on the admissions inside that unit. What the Dubai study says about LOW predicted probabilities specifically is unsettled and is not a basis for either reassurance or alarm: its fine-grained bands report severe under-prediction there (SMR 2.67 at a predicted probability of 1–5%) while its coarse split reports the opposite across the same range (SMR 0.33 below 14.3% against 0.72 above it).",
    ),
  ],
  notes: defineText(
    "pim3.notes",
    "PIM3 estimates the probability of death from data collected at first ICU contact. It is a unit-level case-mix / benchmarking tool — summed individual probabilities across a cohort give an expected death count, compared with observed deaths as a Standardised Mortality Ratio (SMR = observed/expected) — and is NOT an individual bedside prediction; the derivation paper is explicit that it should not be used to describe or make decisions about an individual patient. Straney 2013 defines no diagnostic cut-points or risk bands, so this score reports none. " +
      "AGE RANGE — THE PAPER CONTRADICTS ITSELF. The abstract describes admissions of children younger than 18 at admission; the inclusion criteria in Methods state younger than 16. Read it as under 16, which is how the field reads it, and note that the discrepancy is in the source rather than resolved here: the Korean validation extended the model to under-18s precisely because the developmental data covered under-16s. " +
      "DIAGNOSIS TIERS ARE ONE VARIABLE. Very high-risk, high-risk and low-risk are resolved to a single term by precedence — highest wins — and are never added together. This is a change from PIM2, where a high-risk and a low-risk condition could both count, and it is the commonest porting defect: on the paper's own worked example (p681) counting the high-risk term alongside the very high-risk one gives 72.34% instead of 47.22%. Each list is complete as published (5 very high-risk, 5 high-risk, 6 low-risk) and applies only to the MAIN reason for admission. " +
      "MISSING-DATA CONVENTIONS ARE LOAD-BEARING: unknown systolic BP substitutes 120 mmHg, unknown base excess contributes 0, and an unmeasured FiO₂/PaO₂ sets that term to PIM3's normal-value substitute of 0.23 (a correction — PIM2 used 0). This path is the ordinary path, not an edge case: PaO₂ was missing for 55.8% and FiO₂ for 41.1% of the derivation cohort, and a US single-centre series reported base excess missing in 97.2%. SBP coding: cardiac arrest at admission → enter 0; shocked with an unmeasurable BP → enter 30; unknown → leave blank (120). The two SBP paired terms are U-shaped with a minimum near 125.6 mmHg, so SBP 0 adds about 2.70 to the logit relative to the unknown default — that is how the arrest case acquires its weight. Use the FIRST value of each variable from first face-to-face ICU-team contact up to 1 hour after ICU arrival (may include ED or retrieval data), not the worst. " +
      "LIMITATIONS. Newborns are systematically over-predicted: they sit physiologically well below the 125.6 mmHg SBP nadir, so the blood-pressure terms inflate their score (observed for both PIM2 and PIM3 in the Italian validation). Haemato-oncology admissions are under-predicted, and badly: discrimination fell to c-index 0.66 against 0.74–0.83 in other subgroups, with observed mortality 18.73% against 7.13% predicted (Lee 2017). Neurological admissions were under-predicted in the derivation cohort itself — SMR 1.32 (1.16–1.50), the only diagnostic group significantly off in the original data. Calibration travels far worse than discrimination: Italy AUC 0.88 / SMR 0.98 (Hosmer-Lemeshow p = 0.21, good); Argentina AUC 0.83 / SMR 1.3 (p < 0.001); South Africa AUC 0.81 / SMR 1.28 (p < 0.001) with the HIGHEST SMR (6.67) in the lowest-risk decile. THE GULF NOW HAS ITS OWN EVIDENCE RATHER THAN A PROXY. Dubai (Malhotra 2019, single centre, n = 583, 46 deaths, 7.9%): AUC 0.78 (95% CI 0.69–0.87) with an overall SMR of 0.53, meaning the model over-predicted deaths for the unit as a whole, alongside SMR 2.1 in the SEPSIS subgroup — under-prediction inside an over-predicting unit. Those three are the robust findings from that paper, and the sepsis one is both uncontradicted and the clinically consequential one. WHAT THE SAME PAPER SAYS ABOUT LOW PREDICTED PROBABILITIES IS UNSTABLE, AND BOTH HALVES ARE RECORDED HERE BECAUSE EITHER ALONE MISLEADS. Cut finely, it reports SMR 2.67 among children whose predicted probability was 1–5% — severe under-prediction. Cut coarsely at a predicted probability of 14.3%, it reports SMR 0.33 below the cut against 0.72 above it — over-prediction across that same low range. Two stratifications of one cohort of 583 pointing in opposite directions in the same region of the scale is a subgroup instability, not a direction, so no claim about the low end is made here from it. Riyadh (Alkhalifah 2022, n = 3396, under 14 years) concluded that the mortality models it evaluated had sufficient discrimination and poor calibration, with the worst calibration AND the worst discrimination in infants under 12 months; the per-model figure recorded here from it is PRISM III's (AUC 0.87 in the 60–120-month band), and no PIM3-specific statistic from that study is claimed. READ THE SHAPE, NOT THE HEADLINE: discrimination travels between populations, calibration frequently does not, and the regional under-prediction this platform will state is the one that survives its own paper — SEPSIS, by a factor of about 2. A unit-level SMR below 1 does not make the model safe on the individual admissions inside it; it can conceal a doubling of risk in a subgroup. Recalibrate and monitor locally before any comparative interpretation. South Africa remains the only MULTICENTRE evaluation in a resource-varied setting, and is still the comparator for that specific question. HIV infection and admission after liver transplant were dropped from the model as non-predictive in the derivation population, but remain associated with higher mortality in the Argentine setting. " +
      "COEFFICIENT SET. This is the published international model (Straney 2013). ANZICS also publishes regional recalibrations — PIM3-anz13 and PIM3-anz15 — whose coefficients are entirely different (anz13 pupils 4.371172, intercept −2.299542); do not mix them with these. " +
      "REGISTRY CODE NUMBERS ARE NOT IMPLEMENTED, DELIBERATELY. The ANZPIC registry carries its own numbering for the three tiers, and it DIVERGES from the paper's: registry high-risk code 5 is septic shock (collected but not used by PIM3) while necrotising enterocolitis moves to code 6, and the registry adds very-high-risk combination codes 7 and 8 that a naive 1–5 membership test would silently drop. This calculator consumes no registry data, so it maps no codes; anyone who later ingests ANZPIC records needs two explicitly labelled mappers, not one. The registry numbering is documented in the ANZICS 'PIM2 & PIM3 for the ANZPIC Registry' Information Booklet, whose published URL returns HTTP 404 (re-verified 2026-08-02). " +
      "THE TRACHEOSTOMY RULE IS A REGISTRY CONVENTION, AND THAT IS NOW ITS STATED PROVENANCE RATHER THAN A GAP. A tracheostomy with unassisted spontaneous breathing does not count as ventilation in the first hour. The source is the ANZPIC Registry's own data dictionary — 'PIM2 & PIM3 for the ANZPIC Registry — Information Booklet', version January 2019, whose text was obtained and read on 2026-08-03 and which states the exclusion in those terms. It is grey literature: no DOI, and its published anzics.org URL still returns HTTP 404, so no link is carried for it. NO PEER-REVIEWED SOURCE ADDRESSES THE EDGE CASE AT ALL — Straney 2013 Appendix 1 (p680) lists only what the criterion INCLUDES (invasive ventilation, mask or nasal CPAP, BiPAP, negative-pressure ventilation) and is silent on tracheostomy. Read the rule for what it is: how the derivation registry coded the variable, which is the best available answer and the one that keeps this calculator consistent with the data the model was fitted on, but not a finding from the paper.",
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
