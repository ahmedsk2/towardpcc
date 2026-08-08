import { describe, expect, it } from "vitest";
import { hoursWithMinutes, minutesForHours } from "./time";
import { fromCanonical, toCanonical } from "./types";

describe("elapsed time (canonical hours, accepts minutes)", () => {
  it("declares hours canonical", () => {
    expect(hoursWithMinutes.canonical).toBe("h");
    expect(hoursWithMinutes.alternates).toEqual([minutesForHours]);
  });

  it("converts the times a burn history is actually recorded in", () => {
    // "burn at 14:20, now 17:05" — 165 minutes, which is the form a clinician
    // has before they have hours.
    expect(toCanonical(hoursWithMinutes, 165, "min")).toBeCloseTo(2.75, 12);
    expect(toCanonical(hoursWithMinutes, 30, "min")).toBe(0.5);
    expect(toCanonical(hoursWithMinutes, 480, "min")).toBe(8);
    expect(toCanonical(hoursWithMinutes, 1440, "min")).toBe(24);
  });

  it("passes a canonical value through untouched", () => {
    expect(toCanonical(hoursWithMinutes, 2.75, "h")).toBe(2.75);
    expect(toCanonical(hoursWithMinutes, 0, "h")).toBe(0);
  });

  it("round-trips both directions", () => {
    for (const hours of [0, 0.25, 2.75, 7.9, 8, 12, 23.5, 24]) {
      expect(
        toCanonical(hoursWithMinutes, fromCanonical(hoursWithMinutes, hours, "min") ?? 0, "min"),
      ).toBeCloseTo(hours, 12);
    }
  });

  /**
   * The 8-hour boundary decides which branch the burn score takes, so a
   * conversion that lands a hair off it would silently switch the answer.
   * 480 minutes must be exactly 8, not 7.999999999999999.
   */
  it("lands exactly on the 8-hour boundary from minutes", () => {
    expect(toCanonical(hoursWithMinutes, 480, "min")).toBe(8);
    expect(toCanonical(hoursWithMinutes, 479, "min")).toBeLessThan(8);
    expect(toCanonical(hoursWithMinutes, 481, "min")).toBeGreaterThan(8);
  });

  it("rejects an unknown unit rather than guessing", () => {
    expect(toCanonical(hoursWithMinutes, 5, "days")).toBeNull();
  });
});
