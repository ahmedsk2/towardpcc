import { describe, expect, it } from "vitest";
import {
  mcgPerKgPerMin,
  mcgSpellingForMicrogram,
  milliunitsForUnits,
  unitsPerKgPerMin,
} from "./infusion";
import { fromCanonical, toCanonical } from "./types";

describe("infusion-rate units", () => {
  it("treats µg/kg/min as identical to mcg/kg/min (same unit, microgram)", () => {
    expect(mcgSpellingForMicrogram.toCanonical(5)).toBe(5);
    expect(mcgSpellingForMicrogram.fromCanonical(5)).toBe(5);
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

  /**
   * The inverse, which the calculator form uses to state a plausibility bound in
   * the unit the clinician has SELECTED.
   *
   * `min` and `max` are declared canonically, and the form printed them verbatim
   * under the canonical name — so with `milliunits/kg/min` chosen, vasopressin
   * read "Accepted 0–0.01 units/kg/min" while the box beside it expected
   * milliunits. Obeying that hint enters a thousandth of the intended dose and
   * it is ACCEPTED, because validation converts from the selected unit and
   * 0.005 milliunits is legitimately inside 0–0.01 units. This is the exact
   * field whose comment above calls the pairing a documented 1000x error trap,
   * which is why the conversion the fix depends on is pinned here.
   */
  it("states a canonical bound in the selected unit, and refuses an unknown one", () => {
    expect(fromCanonical(unitsPerKgPerMin, 0.01, "units/kg/min")).toBe(0.01);
    expect(fromCanonical(unitsPerKgPerMin, 0.01, "milliunits/kg/min")).toBeCloseTo(10, 9);
    expect(fromCanonical(unitsPerKgPerMin, 0.0003, "milliunits/kg/min")).toBeCloseTo(0.3, 12);
    // Null rather than a silent passthrough: a bound printed under a unit the
    // spec does not know is the defect this exists to prevent.
    expect(fromCanonical(unitsPerKgPerMin, 1, "units/min")).toBeNull();
  });

  it("resolves canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(unitsPerKgPerMin, 0.0003, "units/kg/min")).toBe(0.0003);
    expect(toCanonical(unitsPerKgPerMin, 0.3, "milliunits/kg/min")).toBeCloseTo(0.0003, 12);
    expect(toCanonical(unitsPerKgPerMin, 1, "units/min")).toBeNull();
    expect(toCanonical(mcgPerKgPerMin, 1, "mg/kg/min")).toBeNull();
  });
});
