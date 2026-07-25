import { describe, expect, it } from "vitest";
import { ageInYears, daysForYears, monthsForYears } from "./age";
import { toCanonical } from "./types";

describe("age units", () => {
  it("converts months to years (calendar definition: 12 months = 1 year)", () => {
    expect(monthsForYears.toCanonical(24)).toBeCloseTo(2, 12);
    expect(monthsForYears.toCanonical(6)).toBeCloseTo(0.5, 12);
    expect(monthsForYears.fromCanonical(2)).toBeCloseTo(24, 12);
  });

  it("converts days to years (Julian-year definition: 365.25 days = 1 year)", () => {
    expect(daysForYears.toCanonical(365.25)).toBeCloseTo(1, 12);
    expect(daysForYears.fromCanonical(1)).toBeCloseTo(365.25, 12);
  });

  it("round-trips months and days within floating tolerance", () => {
    for (const v of [0, 0.5, 1, 4, 8, 12]) {
      expect(monthsForYears.fromCanonical(monthsForYears.toCanonical(v))).toBeCloseTo(v, 12);
      expect(daysForYears.fromCanonical(daysForYears.toCanonical(v))).toBeCloseTo(v, 12);
    }
  });

  it("toCanonical resolves canonical, alternates, and unknown units via the spec", () => {
    expect(toCanonical(ageInYears, 4, "years")).toBe(4);
    expect(toCanonical(ageInYears, 24, "months")).toBeCloseTo(2, 12);
    expect(toCanonical(ageInYears, 365.25, "days")).toBeCloseTo(1, 12);
    expect(toCanonical(ageInYears, 4, "weeks")).toBeNull();
  });
});
