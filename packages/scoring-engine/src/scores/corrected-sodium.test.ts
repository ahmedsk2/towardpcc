import { describeScore } from "../testing/harness";
import { correctedSodium } from "./corrected-sodium";

/**
 * Every expected value below is the arithmetic result of the published Katz
 * (1973, PMID 4763428) and Hillier (1999, PMID 10225241) correction formulas,
 * as worked in docs/research/scores/corrected-sodium.md (§Worked examples).
 * The corrected sodium is a continuous output, so a tight float tolerance is
 * used; the derivation itself is exact.
 */
const katz = {
  citation: "Katz MA. N Engl J Med. 1973;289(16):843–844 (1.6 factor).",
  pmid: "4763428",
};
const hillier = {
  citation: "Hillier TA, Abbott RD, Barrett EJ. Am J Med. 1999;106(4):399–403 (2.4 factor).",
  pmid: "10225241",
};

describeScore(correctedSodium, (ctx) => {
  // Worked example 1 (corrected-sodium.md): Na 130, glucose 600 mg/dL.
  // Katz    = 130 + 0.016·(600−100) = 130 + 8  = 138 mEq/L
  // Hillier = 130 + 0.024·(600−100) = 130 + 12 = 142 mEq/L
  ctx.workedExample(
    { ...katz, locator: "corrected-sodium.md Example 1 (Na 130, glucose 600)" },
    { measured_na: { value: 130, unit: "mEq/L" }, glucose: { value: 600, unit: "mg/dL" } },
    [
      { id: "corrected_na_katz", value: 138, tolerance: 1e-9 },
      { id: "corrected_na_hillier", value: 142, tolerance: 1e-9 },
    ],
  );

  // Worked example 2 (corrected-sodium.md): Na 134, glucose 300 mg/dL.
  // Katz    = 134 + 0.016·(300−100) = 134 + 3.2 = 137.2 mEq/L
  // Hillier = 134 + 0.024·(300−100) = 134 + 4.8 = 138.8 mEq/L
  ctx.workedExample(
    { ...hillier, locator: "corrected-sodium.md Example 2 (Na 134, glucose 300)" },
    { measured_na: { value: 134, unit: "mEq/L" }, glucose: { value: 300, unit: "mg/dL" } },
    [
      { id: "corrected_na_katz", value: 137.2, tolerance: 1e-9 },
      { id: "corrected_na_hillier", value: 138.8, tolerance: 1e-9 },
    ],
  );

  // Worked example 3 (corrected-sodium.md): pediatric DKA, Na 128, glucose 800 mg/dL.
  // Katz    = 128 + 0.016·(800−100) = 128 + 11.2 = 139.2 mEq/L
  // Hillier = 128 + 0.024·(800−100) = 128 + 16.8 = 144.8 mEq/L
  ctx.workedExample(
    { ...katz, locator: "corrected-sodium.md Example 3 (pediatric DKA, Na 128, glucose 800)" },
    { measured_na: { value: 128, unit: "mEq/L" }, glucose: { value: 800, unit: "mg/dL" } },
    [
      { id: "corrected_na_katz", value: 139.2, tolerance: 1e-9 },
      { id: "corrected_na_hillier", value: 144.8, tolerance: 1e-9 },
    ],
  );

  // Unit conversion: glucose entered as mmol/L must convert (×18) before the
  // correction. 33.3333 mmol/L ≈ 600 mg/dL, reproducing Example 1. Float noise
  // from the conversion widens the tolerance.
  ctx.workedExample(
    { ...hillier, locator: "unit-conversion equivalent of Example 1 (glucose in mmol/L, ×18)" },
    { measured_na: { value: 130, unit: "mEq/L" }, glucose: { value: 33.3333, unit: "mmol/L" } },
    [
      { id: "corrected_na_katz", value: 138, tolerance: 0.01 },
      { id: "corrected_na_hillier", value: 142, tolerance: 0.01 },
    ],
  );

  // Sodium entered in mmol/L is 1:1 with mEq/L (monovalent) — Example 1 again.
  ctx.workedExample(
    { ...katz, locator: "Example 1 with sodium entered in mmol/L (1:1, monovalent)" },
    { measured_na: { value: 130, unit: "mmol/L" }, glucose: { value: 600, unit: "mg/dL" } },
    [
      { id: "corrected_na_katz", value: 138, tolerance: 1e-9 },
      { id: "corrected_na_hillier", value: 142, tolerance: 1e-9 },
    ],
  );

  // Applicability branch (corrected-sodium.md §"Branch / applicability"): for
  // glucose ≤ 100 mg/dL no correction is applied, so both corrected values equal
  // the measured sodium. Glucose 80 exercises the zero-clamp (raw excess < 0).
  ctx.workedExample(
    { ...hillier, locator: "corrected-sodium.md §Branch: no correction for glucose ≤ 100 mg/dL" },
    { measured_na: { value: 140, unit: "mEq/L" }, glucose: { value: 80, unit: "mg/dL" } },
    [
      { id: "corrected_na_katz", value: 140, tolerance: 1e-9 },
      { id: "corrected_na_hillier", value: 140, tolerance: 1e-9 },
    ],
  );

  // Every required numeric input must reject implausible entry (harness gate).
  const base = {
    measured_na: { value: 130, unit: "mEq/L" },
    glucose: { value: 600, unit: "mg/dL" },
  } as const;
  ctx.boundaryTest("measured_na", "min", base);
  ctx.boundaryTest("measured_na", "max", base);
  ctx.boundaryTest("glucose", "min", base);
  ctx.boundaryTest("glucose", "max", base);

  ctx.rejectsImplausible(
    "a sodium below the plausibility floor",
    { measured_na: { value: 40, unit: "mEq/L" }, glucose: { value: 600, unit: "mg/dL" } },
    { inputId: "measured_na", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a glucose above the plausibility ceiling",
    { measured_na: { value: 130, unit: "mEq/L" }, glucose: { value: 5000, unit: "mg/dL" } },
    { inputId: "glucose", code: "out-of-range" },
  );
});
