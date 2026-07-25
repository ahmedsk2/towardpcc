import { describeScore } from "../testing/harness";
import { pim3 } from "./pim3";

// All three worked examples are the vectors published in
// docs/research/scores/pim3.md "Worked examples", each derived step-by-step
// from the Straney 2013 formula (PMID 23863821) and re-verified term-by-term
// in that file's Verification section.
const straney = {
  citation:
    "Straney L, et al. Paediatric index of mortality 3. Pediatr Crit Care Med. 2013;14(7):673–681.",
  pmid: "23863821",
  doi: "10.1097/PCC.0b013e31829760cf",
};

// A valid, fully-specified base used for boundary tests (values inside all bounds).
const base = {
  pupils: { value: false },
  mechanical_ventilation: { value: false },
  elective_admission: { value: false },
  recovery_category: { value: "none" },
  diagnosis_risk: { value: "none" },
  sbp: { value: 90, unit: "mmHg" },
  base_excess: { value: 0, unit: "mmol/L" },
  fio2: { value: 0.4, unit: "fraction" },
  pao2: { value: 100, unit: "mmHg" },
} as const;

describeScore(pim3, (ctx) => {
  // Example A — all-defaults / "unknowns" baseline (pim3.md, Example A):
  // SBP unknown → 120, base excess unknown → 0, FiO₂/PaO₂ unknown → term 0.23.
  // logit = -4.39684; P(death) = 0.01217.
  ctx.workedExample(
    { ...straney, locator: "Worked example A (all-defaults baseline; corrected FiO₂/PaO₂ = 0.23)" },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: false },
      recovery_category: { value: "none" },
      diagnosis_risk: { value: "none" },
    },
    [
      { id: "pim3_score", value: -4.39684, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.01217, tolerance: 0.0005 },
    ],
  );

  // Example B — elective post-op non-cardiac recovery, mild derangement
  // (pim3.md, Example B): BE −5 → |BE| 5; SBP 90; FiO₂ 0.40 & PaO₂ 100 → 0.40;
  // recovery = non-cardiac. logit = -5.83198; P(death) = 0.00292.
  ctx.workedExample(
    { ...straney, locator: "Worked example B (elective non-cardiac recovery)" },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: true },
      recovery_category: { value: "non_cardiac" },
      diagnosis_risk: { value: "none" },
      base_excess: { value: -5.0, unit: "mmol/L" },
      sbp: { value: 90, unit: "mmHg" },
      fio2: { value: 0.4, unit: "fraction" },
      pao2: { value: 100, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: -5.83198, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.00292, tolerance: 0.0005 },
    ],
  );

  // Example C — critically ill, ventilated, very-high-risk diagnosis
  // (pim3.md, Example C): pupils fixed >3mm; ventilated; BE −12 → |BE| 12;
  // SBP 40; FiO₂ 0.80 & PaO₂ 60 → 1.33333; very-high-risk.
  // logit = 4.54693; P(death) = 0.9895.
  ctx.workedExample(
    { ...straney, locator: "Worked example C (ventilated, very-high-risk)" },
    {
      pupils: { value: true },
      mechanical_ventilation: { value: true },
      elective_admission: { value: false },
      recovery_category: { value: "none" },
      diagnosis_risk: { value: "very_high" },
      base_excess: { value: -12, unit: "mmol/L" },
      sbp: { value: 40, unit: "mmHg" },
      fio2: { value: 0.8, unit: "fraction" },
      pao2: { value: 60, unit: "mmHg" },
    },
    [
      { id: "pim3_score", value: 4.54693, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.9895, tolerance: 0.0005 },
    ],
  );

  // Unit-conversion equivalent of Example B: PaO₂ entered in kPa and FiO₂ in %
  // must normalise before computing. 100 mmHg ≈ 13.3322 kPa; 40% → 0.40.
  ctx.workedExample(
    { ...straney, locator: "Worked example B via kPa/percent unit entry" },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: true },
      recovery_category: { value: "non_cardiac" },
      diagnosis_risk: { value: "none" },
      base_excess: { value: -5.0, unit: "mmol/L" },
      sbp: { value: 90, unit: "mmHg" },
      fio2: { value: 40, unit: "%" },
      pao2: { value: 13.3322, unit: "kPa" },
    },
    [
      { id: "pim3_score", value: -5.83198, tolerance: 0.002 },
      { id: "mortality_probability", value: 0.00292, tolerance: 0.0005 },
    ],
  );

  // Recovery-category and diagnosis-risk single-term variants of the Example A
  // baseline (pim3.md, Example A: logit -4.396838 before any recovery/diagnosis
  // term). Each adds exactly one published coefficient to that baseline, so the
  // expected logit and probability are a pure arithmetic consequence of the
  // Straney 2013 formula (PMID 23863821). These cover the recovery_category and
  // diagnosis_risk branches (bypass_cardiac, non_bypass_cardiac, high, low) that
  // Examples A–C leave unexercised.

  // Baseline A + recovery = bypass_cardiac (coefficient -1.2246):
  // logit = -4.396838 + (-1.2246) = -5.621438; P(death) = 0.003606.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "derived from formula in Straney 2013 (PMID 23863821); Example A + bypass-cardiac recovery",
    },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: false },
      recovery_category: { value: "bypass_cardiac" },
      diagnosis_risk: { value: "none" },
    },
    [
      { id: "pim3_score", value: -5.62144, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.003606, tolerance: 0.0005 },
    ],
  );

  // Baseline A + recovery = non_bypass_cardiac (coefficient -0.8762):
  // logit = -4.396838 + (-0.8762) = -5.273038; P(death) = 0.005102.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "derived from formula in Straney 2013 (PMID 23863821); Example A + non-bypass-cardiac recovery",
    },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: false },
      recovery_category: { value: "non_bypass_cardiac" },
      diagnosis_risk: { value: "none" },
    },
    [
      { id: "pim3_score", value: -5.27304, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.005102, tolerance: 0.0005 },
    ],
  );

  // Baseline A + diagnosis = high-risk (coefficient +1.0725):
  // logit = -4.396838 + 1.0725 = -3.324338; P(death) = 0.034746.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "derived from formula in Straney 2013 (PMID 23863821); Example A + high-risk diagnosis",
    },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: false },
      recovery_category: { value: "none" },
      diagnosis_risk: { value: "high" },
    },
    [
      { id: "pim3_score", value: -3.32434, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.034746, tolerance: 0.0005 },
    ],
  );

  // Baseline A + diagnosis = low-risk (coefficient -2.1766):
  // logit = -4.396838 + (-2.1766) = -6.573438; P(death) = 0.001395.
  ctx.workedExample(
    {
      ...straney,
      locator:
        "derived from formula in Straney 2013 (PMID 23863821); Example A + low-risk diagnosis",
    },
    {
      pupils: { value: false },
      mechanical_ventilation: { value: false },
      elective_admission: { value: false },
      recovery_category: { value: "none" },
      diagnosis_risk: { value: "low" },
    },
    [
      { id: "pim3_score", value: -6.57344, tolerance: 0.001 },
      { id: "mortality_probability", value: 0.001395, tolerance: 0.0005 },
    ],
  );

  // Input-validity bounds (research [NEEDS SOURCE] physiologic bounds).
  ctx.boundaryTest("sbp", "min", base); // SBP 0 = cardiac arrest coding, must compute
  ctx.boundaryTest("sbp", "max", base);
  ctx.boundaryTest("base_excess", "min", base);
  ctx.boundaryTest("base_excess", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  ctx.boundaryTest("pao2", "min", base);
  ctx.boundaryTest("pao2", "max", base);

  // Required categoricals reject unrecognised values (satisfies the §6.3.3 floor
  // for required non-boolean inputs). Cast bypasses the literal-union type only
  // to feed the deliberately-invalid value the validator must catch at runtime.
  ctx.rejectsImplausible(
    "an unrecognised recovery category",
    { ...base, recovery_category: { value: "space_surgery" as unknown as "none" } },
    { inputId: "recovery_category", code: "invalid-category" },
  );
  ctx.rejectsImplausible(
    "an unrecognised diagnosis-risk tier",
    { ...base, diagnosis_risk: { value: "extreme" as unknown as "none" } },
    { inputId: "diagnosis_risk", code: "invalid-category" },
  );

  // An out-of-range optional numeric is rejected, never silently computed.
  ctx.rejectsImplausible(
    "a FiO₂ below room air",
    { ...base, fio2: { value: 0.1, unit: "fraction" } },
    { inputId: "fio2", code: "out-of-range" },
  );
});
