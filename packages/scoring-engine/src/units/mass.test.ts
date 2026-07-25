import { describe, expect, it } from "vitest";
import { G_PER_KG, gForKg, kgWithLbAndG, LB_PER_KG, lbForKg } from "./mass";
import { NO_UNIT, toCanonical } from "./types";

describe("mass units", () => {
  it("uses the research-cited pound factor (holliday-segar.md: kg = lb ÷ 2.20462)", () => {
    expect(LB_PER_KG).toBe(2.20462);
    expect(G_PER_KG).toBe(1000);
  });

  it("converts pounds to kg: 22.0462 lb = 10 kg", () => {
    expect(lbForKg.toCanonical(22.0462)).toBeCloseTo(10, 10);
  });

  it("converts grams to kg exactly: 8000 g = 8 kg", () => {
    expect(gForKg.toCanonical(8000)).toBe(8);
    expect(gForKg.fromCanonical(8)).toBe(8000);
  });

  it("round-trips pounds within floating tolerance", () => {
    for (const v of [0.5, 8, 15, 32, 70, 150]) {
      expect(lbForKg.fromCanonical(lbForKg.toCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("round-trips grams exactly", () => {
    for (const v of [0.5, 8, 15, 32, 70, 150]) {
      expect(gForKg.fromCanonical(gForKg.toCanonical(v))).toBe(v);
    }
  });

  it("toCanonical resolves canonical, alternates, and unknown units", () => {
    expect(toCanonical(kgWithLbAndG, 8, "kg")).toBe(8);
    expect(toCanonical(kgWithLbAndG, 8000, "g")).toBe(8);
    expect(toCanonical(kgWithLbAndG, 22.0462, "lb")).toBeCloseTo(10, 10);
    expect(toCanonical(kgWithLbAndG, 1, "st")).toBeNull();
    expect(toCanonical(NO_UNIT, 3, "")).toBe(3);
  });
});
