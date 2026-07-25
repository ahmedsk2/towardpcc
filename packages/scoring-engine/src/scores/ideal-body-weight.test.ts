import { describeScore } from "../testing/harness";
import { idealBodyWeight } from "./ideal-body-weight";

// Primary height-based pediatric equation (A1).
const traub = {
  citation: "Traub SL, Kichen L. Estimating ideal body mass in children. Am J Hosp Pharm. 1983.",
  pmid: "6823980",
};
// Source for the simplified Traub (A2) and Devine (A3) formulas.
const kang = {
  citation:
    "Kang K, et al. Evaluation of Different Methods Used to Calculate Ideal Body Weight in the Pediatric Population. J Pediatr Pharmacol Ther. 2019;24(5):421–430.",
  pmid: "31598106",
};

describeScore(idealBodyWeight, (ctx) => {
  // Worked example 1 (ideal-body-weight.md, A1): 100 cm → 2.396 × e^(0.01863×100)
  // = 15.44 kg (cross-checked against the R `physiology` package). Devine is not
  // emitted below 152.4 cm, so only the two Traub values are present here.
  ctx.workedExample(
    {
      ...traub,
      locator: "Worked example 1 (A1); 100 cm → 15.44 kg; physiology-package cross-check",
    },
    { height: { value: 100, unit: "cm" }, sex: { value: "male" } },
    [{ id: "traub_kichen", value: 15.44, tolerance: 0.01 }],
  );

  // Worked example 2 (ideal-body-weight.md, A2): (100² × 1.65) ÷ 1000 = 16.50 kg
  // exactly — ~7% above A1 for the same height (the two are NOT equal).
  ctx.workedExample(
    { ...kang, locator: "Worked example 2 (A2, simplified Traub); 100 cm → 16.50 kg" },
    { height: { value: 100, unit: "cm" }, sex: { value: "male" } },
    [{ id: "simplified_traub", value: 16.5, tolerance: 1e-9 }],
  );

  // Worked example 3 contrast value (A1 at 170 cm): 2.396 × e^(0.01863×170) = 56.9 kg.
  ctx.workedExample(
    { ...traub, locator: "Worked example 3 contrast (A1); 170 cm → 56.9 kg" },
    { height: { value: 170, unit: "cm" }, sex: { value: "male" } },
    [{ id: "traub_kichen", value: 56.9, tolerance: 0.1 }],
  );

  // Worked example 3 (ideal-body-weight.md, A3, male): 170 cm = 66.93 in;
  // 50.0 + 2.3 × (66.93 − 60) = 65.9 kg (adult-derived, over-estimates).
  ctx.workedExample(
    { ...kang, locator: "Worked example 3 (A3, Devine male); 170 cm → 65.9 kg" },
    { height: { value: 170, unit: "cm" }, sex: { value: "male" } },
    [{ id: "devine", value: 65.9, tolerance: 0.1 }],
  );

  // Devine female uses base 45.5 kg (cited female formula 45.5 + 2.3×(Ht_in−60)):
  // 45.5 + 2.3 × (66.93 − 60) = 61.4 kg. Traub–Kichen is sex-independent, so it
  // returns the same 56.9 kg as the male case at 170 cm.
  ctx.workedExample(
    { ...kang, locator: "A3 Devine female formula 45.5 + 2.3×(Ht_in−60); 170 cm → 61.4 kg" },
    { height: { value: 170, unit: "cm" }, sex: { value: "female" } },
    [
      { id: "devine", value: 61.4, tolerance: 0.1 },
      { id: "traub_kichen", value: 56.9, tolerance: 0.1 },
    ],
  );

  // Inches entry must convert before computing: 39.3701 in ≈ 100 cm → A1 = 15.44 kg.
  ctx.workedExample(
    { ...traub, locator: "unit-conversion equivalent of Worked example 1 (inches → cm)" },
    { height: { value: 39.3701, unit: "in" }, sex: { value: "male" } },
    [{ id: "traub_kichen", value: 15.44, tolerance: 0.02 }],
  );

  // Height computes at both plausibility bounds and rejects just past them.
  ctx.boundaryTest("height", "min", {
    height: { value: 100, unit: "cm" },
    sex: { value: "male" },
  });
  ctx.boundaryTest("height", "max", {
    height: { value: 100, unit: "cm" },
    sex: { value: "male" },
  });

  // Implausible height is rejected, never computed.
  ctx.rejectsImplausible(
    "a height below the plausibility floor",
    { height: { value: 20, unit: "cm" }, sex: { value: "male" } },
    { inputId: "height", code: "out-of-range" },
  );

  // Required-input rejection coverage for the categorical sex (harness §6.3.3 floor).
  ctx.rejectsImplausible(
    "an unrecognised sex value",
    { height: { value: 100, unit: "cm" }, sex: { value: "unknown" as unknown as "male" } },
    { inputId: "sex", code: "invalid-category" },
  );
});
