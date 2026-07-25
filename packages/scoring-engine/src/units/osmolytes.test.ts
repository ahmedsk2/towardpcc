import { describe, expect, it } from "vitest";
import {
  BUN_MGDL_PER_UREA_MMOL,
  bunMgdl,
  ETHANOL_MGDL_PER_MMOL,
  ethanolMgdl,
  GLUCOSE_MGDL_PER_MMOL,
  glucoseMgdl,
  mEqPerLForSodium,
  mmolPerLForEthanol,
  mmolPerLForGlucose,
  mmolPerLForUrea,
  mOsmPerKg,
  sodiumMmol,
} from "./osmolytes";
import { NO_UNIT, toCanonical } from "./types";

/**
 * All factors are the exact conversions embedded in the additive osmolality
 * formula (docs/research/scores/serum-osmolality.md, "Formula / algorithm" and
 * "Inputs"): Na mEq/L = mmol/L (monovalent, 1:1); glucose 1 mmol/L = 18 mg/dL;
 * urea 1 mmol/L = 2.8 mg/dL BUN; ethanol 1 mmol/L = 4.6 mg/dL (ideal MW ≈ 46).
 */
describe("osmolyte units — factors match the research formula divisors", () => {
  it("uses the formula-native divisors (serum-osmolality.md)", () => {
    expect(GLUCOSE_MGDL_PER_MMOL).toBe(18);
    expect(BUN_MGDL_PER_UREA_MMOL).toBe(2.8);
    expect(ETHANOL_MGDL_PER_MMOL).toBe(4.6);
  });
});

describe("osmolyte units — sodium (mmol/L canonical, mEq/L 1:1)", () => {
  it("treats mEq/L as an exact 1:1 identity", () => {
    expect(mEqPerLForSodium.toCanonical(140)).toBe(140);
    expect(mEqPerLForSodium.fromCanonical(140)).toBe(140);
  });

  it("round-trips exactly", () => {
    for (const v of [100, 130, 140, 155, 200]) {
      expect(mEqPerLForSodium.fromCanonical(mEqPerLForSodium.toCanonical(v))).toBeCloseTo(v, 12);
    }
  });

  it("resolves canonical, alternate, and unknown units via the spec", () => {
    expect(toCanonical(sodiumMmol, 140, "mmol/L")).toBe(140);
    expect(toCanonical(sodiumMmol, 140, "mEq/L")).toBe(140);
    expect(toCanonical(sodiumMmol, 140, "g/dL")).toBeNull();
  });
});

describe("osmolyte units — glucose (mg/dL canonical, mmol/L ×18)", () => {
  it("converts glucose: 5.0 mmol/L = 90 mg/dL (research worked example 2)", () => {
    expect(mmolPerLForGlucose.toCanonical(5)).toBe(90);
    expect(mmolPerLForGlucose.fromCanonical(90)).toBe(5);
  });

  it("round-trips within floating tolerance", () => {
    for (const v of [0.6, 5, 40, 110]) {
      expect(mmolPerLForGlucose.toCanonical(mmolPerLForGlucose.fromCanonical(v))).toBeCloseTo(
        v,
        10,
      );
    }
  });

  it("resolves canonical, alternate, and unknown units via the spec", () => {
    expect(toCanonical(glucoseMgdl, 90, "mg/dL")).toBe(90);
    expect(toCanonical(glucoseMgdl, 5, "mmol/L")).toBe(90);
    expect(toCanonical(glucoseMgdl, 5, "mEq/L")).toBeNull();
  });
});

describe("osmolyte units — BUN (mg/dL canonical, urea mmol/L ×2.8)", () => {
  it("converts urea: 5.0 mmol/L = 14 mg/dL BUN (research worked example 2)", () => {
    expect(mmolPerLForUrea.toCanonical(5)).toBeCloseTo(14, 10);
    expect(mmolPerLForUrea.fromCanonical(14)).toBeCloseTo(5, 10);
  });

  it("round-trips within floating tolerance", () => {
    for (const v of [1, 2.5, 5, 50, 100]) {
      expect(mmolPerLForUrea.toCanonical(mmolPerLForUrea.fromCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("resolves canonical, alternate, and unknown units via the spec", () => {
    expect(toCanonical(bunMgdl, 14, "mg/dL")).toBe(14);
    expect(toCanonical(bunMgdl, 5, "mmol/L")).toBeCloseTo(14, 10);
    expect(toCanonical(bunMgdl, 5, "µmol/L")).toBeNull();
  });
});

describe("osmolyte units — ethanol (mg/dL canonical, mmol/L ×4.6 ideal MW)", () => {
  it("converts ethanol: 21.739 mmol/L ≈ 100 mg/dL (÷4.6 ideal, research example 4)", () => {
    expect(mmolPerLForEthanol.toCanonical(21.739)).toBeCloseTo(100, 2);
    expect(mmolPerLForEthanol.fromCanonical(100)).toBeCloseTo(21.739, 2);
  });

  it("round-trips within floating tolerance", () => {
    for (const v of [0, 10.87, 21.739, 65.2]) {
      expect(mmolPerLForEthanol.toCanonical(mmolPerLForEthanol.fromCanonical(v))).toBeCloseTo(
        v,
        10,
      );
    }
  });

  it("resolves canonical, alternate, and unknown units via the spec", () => {
    expect(toCanonical(ethanolMgdl, 100, "mg/dL")).toBe(100);
    expect(toCanonical(ethanolMgdl, 21.739, "mmol/L")).toBeCloseTo(100, 2);
    expect(toCanonical(ethanolMgdl, 1, "g/L")).toBeNull();
  });
});

describe("osmolyte units — measured osmolality (mOsm/kg, canonical only)", () => {
  it("accepts only mOsm/kg", () => {
    expect(toCanonical(mOsmPerKg, 292, "mOsm/kg")).toBe(292);
    expect(toCanonical(mOsmPerKg, 292, "mmol/L")).toBeNull();
    expect(toCanonical(NO_UNIT, 292, "")).toBe(292);
  });
});
