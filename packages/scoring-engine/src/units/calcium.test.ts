import { describe, expect, it } from "vitest";
import {
  ALBUMIN_GL_PER_GDL,
  albuminGdl,
  CALCIUM_MGDL_PER_MMOL,
  calciumMgdl,
  gPerLForAlbumin,
  mmolPerLForCalcium,
} from "./calcium";
import { NO_UNIT, toCanonical } from "./types";

/**
 * Cited round-trip tests for the calcium (mg/dL↔mmol/L) and albumin
 * (g/dL↔g/L) conversions used by the corrected-calcium score. Factors are the
 * standard laboratory conversions documented in
 * docs/research/scores/corrected-calcium.md ("Unit conversions used above":
 * Ca molar mass 40.08 g/mol ⇒ 4.008 mg/dL per mmol/L; albumin g/dL × 10 = g/L).
 */
describe("calcium & albumin units (corrected-calcium.md conversions)", () => {
  it("uses the molar-mass calcium factor 4.008 mg/dL per mmol/L (Ca 40.08 g/mol)", () => {
    expect(CALCIUM_MGDL_PER_MMOL).toBe(4.008);
  });

  it("converts calcium: 1 mmol/L = 4.008 mg/dL (1 mg/dL ≈ 0.2495 mmol/L)", () => {
    expect(mmolPerLForCalcium.toCanonical(1)).toBeCloseTo(4.008, 10);
    expect(mmolPerLForCalcium.fromCanonical(4.008)).toBeCloseTo(1, 10);
    // Worked example 2 input: 1.90 mmol/L ≈ 7.6152 mg/dL.
    expect(mmolPerLForCalcium.toCanonical(1.9)).toBeCloseTo(7.6152, 6);
    // Standard inverse factor 0.2495 mmol/L per mg/dL.
    expect(mmolPerLForCalcium.fromCanonical(1)).toBeCloseTo(0.2495, 4);
  });

  it("calcium round-trips within floating tolerance", () => {
    for (const v of [4.0, 7.6, 9.6, 14, 20]) {
      expect(mmolPerLForCalcium.fromCanonical(mmolPerLForCalcium.toCanonical(v))).toBeCloseTo(
        v,
        10,
      );
    }
  });

  it("uses the SI albumin factor 10 g/L per g/dL", () => {
    expect(ALBUMIN_GL_PER_GDL).toBe(10);
  });

  it("converts albumin: 1 g/dL = 10 g/L", () => {
    expect(gPerLForAlbumin.toCanonical(10)).toBeCloseTo(1, 10);
    expect(gPerLForAlbumin.fromCanonical(1)).toBeCloseTo(10, 10);
    // Worked example 2 input: 25 g/L = 2.5 g/dL.
    expect(gPerLForAlbumin.toCanonical(25)).toBeCloseTo(2.5, 10);
  });

  it("albumin round-trips within floating tolerance", () => {
    for (const v of [1.0, 2.0, 2.5, 4.0, 6.0]) {
      expect(gPerLForAlbumin.fromCanonical(gPerLForAlbumin.toCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("resolves canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(calciumMgdl, 9.6, "mg/dL")).toBe(9.6);
    expect(toCanonical(calciumMgdl, 1.9, "mmol/L")).toBeCloseTo(7.6152, 6);
    expect(toCanonical(calciumMgdl, 1, "g/dL")).toBeNull();
    expect(toCanonical(albuminGdl, 4.0, "g/dL")).toBe(4.0);
    expect(toCanonical(albuminGdl, 25, "g/L")).toBeCloseTo(2.5, 10);
    expect(toCanonical(albuminGdl, 1, "mmol/L")).toBeNull();
    expect(toCanonical(NO_UNIT, 5, "")).toBe(5);
  });
});
