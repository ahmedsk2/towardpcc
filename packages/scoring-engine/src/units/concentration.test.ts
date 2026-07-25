import { describe, expect, it } from "vitest";
import {
  BILIRUBIN_UMOL_PER_MGDL,
  bilirubinMgdl,
  creatinineUmolWithMgdl,
  CREATININE_UMOL_PER_MGDL,
  creatinineMgdl,
  fibrinogenMgdl,
  gPerLForFibrinogen,
  LACTATE_MGDL_PER_MMOL,
  lactateMmol,
  mgdlForCreatinine,
  mgdlPerLForLactate,
  umolPerLForBilirubin,
  umolPerLForCreatinine,
  UMOL_PER_L_PER_MGDL_CREATININE,
} from "./concentration";
import { NO_UNIT, toCanonical } from "./types";

describe("concentration units", () => {
  it("uses the standard clinical factors (psofa.md conversions)", () => {
    expect(CREATININE_UMOL_PER_MGDL).toBe(88.42);
    expect(BILIRUBIN_UMOL_PER_MGDL).toBe(17.104);
  });

  it("creatinine µmol/L → mg/dL: 88.42 µmol/L ≈ 1.0 mg/dL", () => {
    expect(umolPerLForCreatinine.toCanonical(88.42)).toBeCloseTo(1, 6);
    expect(umolPerLForCreatinine.toCanonical(176.84)).toBeCloseTo(2, 6);
    // 88.42 µmol/L ≈ 1.0 mg/dL, the Example A renal input.
    expect(umolPerLForCreatinine.toCanonical(88.42)).toBeCloseTo(1.0, 6);
  });

  it("bilirubin µmol/L → mg/dL: 17.104 µmol/L ≈ 1.0 mg/dL", () => {
    expect(umolPerLForBilirubin.toCanonical(17.104)).toBeCloseTo(1, 6);
    // Example A bilirubin 3.0 mg/dL ≈ 51.312 µmol/L.
    expect(umolPerLForBilirubin.toCanonical(51.312)).toBeCloseTo(3, 6);
  });

  it("round-trips exactly within floating tolerance", () => {
    for (const v of [0.3, 1.0, 4.5, 13]) {
      expect(umolPerLForCreatinine.fromCanonical(umolPerLForCreatinine.toCanonical(v))).toBeCloseTo(
        v,
        10,
      );
      expect(umolPerLForBilirubin.fromCanonical(umolPerLForBilirubin.toCanonical(v))).toBeCloseTo(
        v,
        10,
      );
    }
  });

  it("toCanonical resolves canonical, alternate, and unknown units", () => {
    expect(toCanonical(creatinineMgdl, 1.0, "mg/dL")).toBe(1.0);
    expect(toCanonical(creatinineMgdl, 88.42, "µmol/L")).toBeCloseTo(1, 6);
    expect(toCanonical(creatinineMgdl, 1, "mmol/L")).toBeNull();
    expect(toCanonical(bilirubinMgdl, 3.0, "mg/dL")).toBe(3.0);
    expect(toCanonical(bilirubinMgdl, 17.104, "µmol/L")).toBeCloseTo(1, 6);
    expect(toCanonical(NO_UNIT, 5, "")).toBe(5);
  });
});

/**
 * Lactate (mmol/L↔mg/dL) and fibrinogen (mg/dL↔g/L) conversions used by the
 * Phoenix Sepsis Score. Factors are standard clinical lab conventions
 * (general, not Phoenix-specific): lactate molar mass ≈ 90.08 g/mol ⇒
 * 1 mmol/L = 9.01 mg/dL; fibrinogen 100 mg/dL = 1 g/L. Both are documented in
 * docs/research/scores/phoenix.md ("Unit-conversion reference values") and are
 * recomputed here from first principles.
 */
describe("concentration units — lactate & fibrinogen (phoenix)", () => {
  it("uses the conventional lactate factor 9.01 mg/dL per mmol/L", () => {
    expect(LACTATE_MGDL_PER_MMOL).toBe(9.01);
  });

  it("converts lactate: 1 mmol/L = 9.01 mg/dL", () => {
    expect(mgdlPerLForLactate.fromCanonical(1)).toBeCloseTo(9.01, 10);
    expect(mgdlPerLForLactate.toCanonical(9.01)).toBeCloseTo(1, 10);
  });

  it("lactate round-trips within floating tolerance", () => {
    for (const v of [0.5, 2.9, 5, 11, 30]) {
      expect(mgdlPerLForLactate.toCanonical(mgdlPerLForLactate.fromCanonical(v))).toBeCloseTo(
        v,
        10,
      );
    }
  });

  it("resolves lactate canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(lactateMmol, 2.9, "mmol/L")).toBe(2.9);
    expect(toCanonical(lactateMmol, 27.03, "mg/dL")).toBeCloseTo(3, 6);
    expect(toCanonical(lactateMmol, 1, "g/dL")).toBeNull();
  });

  it("converts fibrinogen: 100 mg/dL = 1 g/L", () => {
    expect(gPerLForFibrinogen.toCanonical(1)).toBeCloseTo(100, 10);
    expect(gPerLForFibrinogen.fromCanonical(100)).toBeCloseTo(1, 10);
  });

  it("resolves fibrinogen canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(fibrinogenMgdl, 120, "mg/dL")).toBe(120);
    expect(toCanonical(fibrinogenMgdl, 1.2, "g/L")).toBeCloseTo(120, 6);
    expect(toCanonical(fibrinogenMgdl, 1, "mmol/L")).toBeNull();
  });
});

/**
 * Creatinine in SI orientation (canonical µmol/L, mg/dL alternate) used by
 * PELOD-2, whose renal cutoffs are printed in µmol/L (Leteurtre 2013). Factor
 * 88.4 µmol/L per mg/dL is the standard clinical factor in
 * docs/research/scores/pelod2.md (§Inputs, conversion notes).
 */
describe("concentration units — creatinine SI orientation (pelod2)", () => {
  it("uses the standard clinical factor 88.4 µmol/L per mg/dL (pelod2.md)", () => {
    expect(UMOL_PER_L_PER_MGDL_CREATININE).toBe(88.4);
  });

  it("converts creatinine: 1 mg/dL = 88.4 µmol/L", () => {
    expect(mgdlForCreatinine.toCanonical(1)).toBeCloseTo(88.4, 10);
    expect(mgdlForCreatinine.toCanonical(2)).toBeCloseTo(176.8, 10);
    expect(mgdlForCreatinine.fromCanonical(88.4)).toBeCloseTo(1, 10);
  });

  it("creatinine (SI) round-trips within floating tolerance", () => {
    for (const v of [23, 51, 70, 93, 300]) {
      expect(mgdlForCreatinine.fromCanonical(mgdlForCreatinine.toCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("resolves creatinine (SI) canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(creatinineUmolWithMgdl, 70, "µmol/L")).toBe(70);
    expect(toCanonical(creatinineUmolWithMgdl, 1, "mg/dL")).toBeCloseTo(88.4, 6);
    expect(toCanonical(creatinineUmolWithMgdl, 1, "g/L")).toBeNull();
  });
});
