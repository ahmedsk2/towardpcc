import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { gPerLForAlbumin, mmolPerLForCalcium } from "../units/calcium";
import { correctedCalcium } from "./corrected-calcium";

const payne = {
  citation:
    "Payne RB, Little AJ, Williams RB, Milner JR. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J. 1973;4(5893):643–646.",
  pmid: "4758544",
  doi: "10.1136/bmj.4.5893.643",
};

describeScore(correctedCalcium, (ctx) => {
  // Worked example 1 (corrected-calcium.md): measured Ca 7.6 mg/dL, albumin
  // 2.0 g/dL → 7.6 + 0.8 × (4.0 − 2.0) = 9.2 mg/dL. Continuous output → tolerance.
  ctx.workedExample(
    { ...payne, locator: "Worked example 1 (derived from formula); 7.6 + 0.8×(4.0−2.0) = 9.2" },
    {
      measuredCalcium: { value: 7.6, unit: "mg/dL" },
      albumin: { value: 2.0, unit: "g/dL" },
    },
    [{ id: "corrected_calcium", value: 9.2, tolerance: 1e-9 }],
  );

  // Worked example 2 (corrected-calcium.md): SI inputs Ca 1.90 mmol/L, albumin
  // 25 g/L. Canonical mg/dL pipeline: 1.90×4.008 = 7.6152 mg/dL, 25 g/L = 2.5
  // g/dL → 7.6152 + 0.8×(4.0−2.5) = 8.8152 mg/dL (≈ 2.20 mmol/L, the research
  // SI answer; the ~0.0024 mg/dL gap is the 0.02-vs-0.8 coefficient rounding).
  ctx.workedExample(
    {
      ...payne,
      locator: "Worked example 2 (derived from formula, SI); ≈ 2.20 mmol/L = 8.8152 mg/dL",
    },
    {
      measuredCalcium: { value: 1.9, unit: "mmol/L" },
      albumin: { value: 25, unit: "g/L" },
    },
    [{ id: "corrected_calcium", value: 8.8152, tolerance: 1e-6 }],
  );

  // Worked example 3 (corrected-calcium.md): at the reference albumin the
  // correction is exactly zero — Ca 9.6 mg/dL, albumin 4.0 g/dL → 9.6 mg/dL.
  ctx.workedExample(
    { ...payne, locator: "Worked example 3 (derived from formula); albumin = 4.0 → no correction" },
    {
      measuredCalcium: { value: 9.6, unit: "mg/dL" },
      albumin: { value: 4.0, unit: "g/dL" },
    },
    [{ id: "corrected_calcium", value: 9.6, tolerance: 1e-9 }],
  );

  ctx.boundaryTest("measuredCalcium", "min", {
    measuredCalcium: { value: 9.6, unit: "mg/dL" },
    albumin: { value: 4.0, unit: "g/dL" },
  });
  ctx.boundaryTest("measuredCalcium", "max", {
    measuredCalcium: { value: 9.6, unit: "mg/dL" },
    albumin: { value: 4.0, unit: "g/dL" },
  });
  ctx.boundaryTest("albumin", "min", {
    measuredCalcium: { value: 9.6, unit: "mg/dL" },
    albumin: { value: 4.0, unit: "g/dL" },
  });
  ctx.boundaryTest("albumin", "max", {
    measuredCalcium: { value: 9.6, unit: "mg/dL" },
    albumin: { value: 4.0, unit: "g/dL" },
  });

  ctx.rejectsImplausible(
    "a physiologically impossible calcium above the sanity bound",
    {
      measuredCalcium: { value: 25, unit: "mg/dL" },
      albumin: { value: 4.0, unit: "g/dL" },
    },
    { inputId: "measuredCalcium", code: "out-of-range" },
  );

  ctx.rejectsImplausible(
    "an albumin below the sanity bound",
    {
      measuredCalcium: { value: 9.6, unit: "mg/dL" },
      albumin: { value: 0.5, unit: "g/dL" },
    },
    { inputId: "albumin", code: "out-of-range" },
  );
});

/**
 * Round-trip coverage for the new calcium.ts unit specs. Validation/compute
 * only ever call `toCanonical` (exercised above via the mmol/L + g/L worked
 * example); `fromCanonical` is display-only, so it is exercised here to keep
 * the new unit file at 100% under the score-scoped coverage run.
 */
describe("calcium/albumin unit conversions (round-trip)", () => {
  it("calcium fromCanonical inverts toCanonical", () => {
    expect(mmolPerLForCalcium.fromCanonical(mmolPerLForCalcium.toCanonical(2.2))).toBeCloseTo(
      2.2,
      10,
    );
    // 9.6 mg/dL ÷ 4.008 ≈ 2.3952 mmol/L.
    expect(mmolPerLForCalcium.fromCanonical(9.6)).toBeCloseTo(2.3952, 4);
  });

  it("albumin fromCanonical inverts toCanonical", () => {
    expect(gPerLForAlbumin.fromCanonical(gPerLForAlbumin.toCanonical(30))).toBeCloseTo(30, 10);
    // 4.0 g/dL × 10 = 40 g/L.
    expect(gPerLForAlbumin.fromCanonical(4.0)).toBeCloseTo(40, 10);
  });
});
