import { describe, expect, it } from "vitest";
import { KPA_PER_MMHG, kpaForMmhg, mmhgWithKpa } from "./pressure";
import { NO_UNIT, toCanonical } from "./types";

describe("pressure units", () => {
  it("uses the exact standard-atmosphere factor (NIST SP 811: 101.325 kPa = 760 mmHg)", () => {
    expect(KPA_PER_MMHG).toBeCloseTo(0.1333223684, 10);
  });

  it("converts kPa to mmHg: 13.3 kPa ≈ 99.76 mmHg", () => {
    expect(kpaForMmhg.toCanonical(13.3)).toBeCloseTo(99.758, 3);
  });

  it("round-trips exactly within floating tolerance", () => {
    for (const v of [0.5, 7.6, 40, 100, 600]) {
      expect(kpaForMmhg.fromCanonical(kpaForMmhg.toCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("toCanonical resolves canonical, alternate, and unknown units", () => {
    expect(toCanonical(mmhgWithKpa, 100, "mmHg")).toBe(100);
    expect(toCanonical(mmhgWithKpa, 13.3, "kPa")).toBeCloseTo(99.758, 3);
    expect(toCanonical(mmhgWithKpa, 1, "psi")).toBeNull();
    expect(toCanonical(NO_UNIT, 3, "")).toBe(3);
  });
});
