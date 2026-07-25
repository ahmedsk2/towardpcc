import { describe, expect, it } from "vitest";
import { fractionWithPercent, percent, percentForFraction } from "./fraction";
import { toCanonical } from "./types";

describe("fraction units", () => {
  it("converts percent to fraction", () => {
    expect(percentForFraction.toCanonical(40)).toBeCloseTo(0.4, 12);
    expect(percentForFraction.fromCanonical(0.4)).toBeCloseTo(40, 12);
  });

  it("round-trips", () => {
    for (const v of [0.21, 0.5, 1]) {
      expect(percentForFraction.fromCanonical(percentForFraction.toCanonical(v))).toBeCloseTo(
        v,
        12,
      );
    }
  });

  it("resolves canonical and percent via a spec", () => {
    expect(toCanonical(fractionWithPercent, 0.6, "fraction")).toBe(0.6);
    expect(toCanonical(fractionWithPercent, 60, "%")).toBeCloseTo(0.6, 12);
    expect(toCanonical(fractionWithPercent, 60, "ratio")).toBeNull();
  });

  it("percent is a canonical-only %, keeping the number as-entered (e.g. SpO₂ 90)", () => {
    expect(toCanonical(percent, 90, "%")).toBe(90);
    expect(toCanonical(percent, 90, "fraction")).toBeNull();
  });
});
