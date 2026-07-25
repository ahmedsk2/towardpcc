import { describe, expect, it } from "vitest";
import {
  mcgPerKgPerMin,
  microgramSignForMcg,
  milliunitsForUnits,
  unitsPerKgPerMin,
} from "./infusion";
import { toCanonical } from "./types";

describe("infusion-rate units", () => {
  it("treats µg/kg/min as identical to mcg/kg/min (same unit, microgram)", () => {
    expect(microgramSignForMcg.toCanonical(5)).toBe(5);
    expect(microgramSignForMcg.fromCanonical(5)).toBe(5);
    expect(toCanonical(mcgPerKgPerMin, 5, "mcg/kg/min")).toBe(5);
    expect(toCanonical(mcgPerKgPerMin, 5, "µg/kg/min")).toBe(5);
  });

  it("converts milliunits/kg/min to units/kg/min (SI milli = 10⁻³)", () => {
    // vis.md vasopressin unit trap: 0.3 milliunits/kg/min = 0.0003 units/kg/min.
    expect(milliunitsForUnits.toCanonical(0.3)).toBeCloseTo(0.0003, 12);
    expect(milliunitsForUnits.fromCanonical(0.0003)).toBeCloseTo(0.3, 12);
  });

  it("round-trips milliunits within floating tolerance", () => {
    for (const v of [0.0001, 0.0003, 0.001, 0.01]) {
      expect(milliunitsForUnits.fromCanonical(milliunitsForUnits.toCanonical(v))).toBeCloseTo(
        v,
        12,
      );
    }
  });

  it("resolves canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(unitsPerKgPerMin, 0.0003, "units/kg/min")).toBe(0.0003);
    expect(toCanonical(unitsPerKgPerMin, 0.3, "milliunits/kg/min")).toBeCloseTo(0.0003, 12);
    expect(toCanonical(unitsPerKgPerMin, 1, "units/min")).toBeNull();
    expect(toCanonical(mcgPerKgPerMin, 1, "mg/kg/min")).toBeNull();
  });
});
