import { describe, expect, it } from "vitest";
import { CM_PER_INCH, CM_PER_M, cmWithInAndM, inchForCm, mForCm } from "./length";
import { NO_UNIT, toCanonical } from "./types";

describe("length units", () => {
  it("uses the exact definitional factors (bsa-mosteller.md: in × 2.54, m × 100)", () => {
    expect(CM_PER_INCH).toBe(2.54);
    expect(CM_PER_M).toBe(100);
  });

  it("converts inches to cm exactly: 66.929 in ≈ 170 cm", () => {
    expect(inchForCm.toCanonical(66.929)).toBeCloseTo(170, 2);
    expect(inchForCm.toCanonical(10)).toBe(25.4);
    expect(inchForCm.fromCanonical(25.4)).toBe(10);
  });

  it("converts metres to cm exactly: 1.7 m = 170 cm", () => {
    expect(mForCm.toCanonical(1.7)).toBe(170);
    expect(mForCm.fromCanonical(170)).toBe(1.7);
  });

  it("round-trips inches within floating tolerance", () => {
    for (const v of [12, 20, 39.37, 66.929, 86.6]) {
      expect(inchForCm.fromCanonical(inchForCm.toCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("round-trips metres within floating tolerance", () => {
    for (const v of [0.3, 0.6, 1.0, 1.7, 2.2]) {
      expect(mForCm.fromCanonical(mForCm.toCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("toCanonical resolves canonical, alternates, and unknown units", () => {
    expect(toCanonical(cmWithInAndM, 170, "cm")).toBe(170);
    expect(toCanonical(cmWithInAndM, 1.7, "m")).toBe(170);
    expect(toCanonical(cmWithInAndM, 10, "in")).toBe(25.4);
    expect(toCanonical(cmWithInAndM, 1, "ft")).toBeNull();
    expect(toCanonical(NO_UNIT, 3, "")).toBe(3);
  });
});
