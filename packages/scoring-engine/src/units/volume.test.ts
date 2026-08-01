import { describe, expect, it } from "vitest";
import { toCanonical } from "./types";
import { litresWithMl, ML_PER_L, mlForL } from "./volume";

describe("volume units", () => {
  it("uses the exact SI millilitre factor (1 L = 1000 mL)", () => {
    expect(ML_PER_L).toBe(1000);
  });

  it("converts millilitres to litres exactly: 12000 mL = 12 L", () => {
    expect(mlForL.toCanonical(12000)).toBe(12);
    expect(mlForL.fromCanonical(12)).toBe(12000);
  });

  it("round-trips millilitres exactly across a cumulative-balance range", () => {
    for (const v of [0, 0.25, 2, 12, 47.5, 200]) {
      expect(mlForL.fromCanonical(mlForL.toCanonical(v))).toBe(v);
    }
  });

  it("converts a negative net balance without special-casing the sign", () => {
    // A cumulative balance runs negative during diuresis or ultrafiltration.
    // The conversion is linear, so this is not a separate branch — it is
    // asserted because a clamp added later would silently break it.
    expect(mlForL.toCanonical(-3000)).toBe(-3);
    expect(mlForL.fromCanonical(-3)).toBe(-3000);
  });

  it("toCanonical resolves canonical, the millilitre alternate, and unknown units", () => {
    expect(toCanonical(litresWithMl, 12, "L")).toBe(12);
    expect(toCanonical(litresWithMl, 12000, "mL")).toBe(12);
    expect(toCanonical(litresWithMl, 1, "dL")).toBeNull();
  });
});
