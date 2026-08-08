import { describe, expect, it } from "vitest";
import { roundInward } from "./round-inward";

/**
 * Finding F6 (external calculator audit, 2026-08-08): converted range hints
 * printed unrounded limits, e.g. "Accepted 0.998004–4.99002 mmol/L".
 *
 * The audit's suggested display was "1.0–5.0". These tests pin the reason that
 * is not what was implemented: 5.0 is outside the accepted range, so it would
 * turn the hint into an instruction the field refuses to obey.
 */
describe("roundInward", () => {
  it("tidies the corrected-calcium hint that prompted the finding", () => {
    // 2.0-10.0 mg/dL declared canonically -> 0.998004-4.99002 mmol/L displayed.
    expect(roundInward(0.998004, "up")).toBe(0.999);
    expect(roundInward(4.99002, "down")).toBe(4.99);
  });

  it("NEVER prints a bound outside the accepted range, in either direction", () => {
    // The invariant the whole function exists for. An outward round would make
    // the hint advertise a value validation rejects.
    const bounds = [0.998004, 4.99002, 0.0001, 1234, 180, 45, 1.5, 0.01, 99.999, 2 / 3];
    for (const v of bounds) {
      expect(roundInward(v, "up"), `min ${v} rounded below itself`).toBeGreaterThanOrEqual(v);
      expect(roundInward(v, "down"), `max ${v} rounded above itself`).toBeLessThanOrEqual(v);
    }
  });

  it("keeps small magnitudes that three decimal places alone would destroy", () => {
    // 3 dp would floor this to 0 and print a ceiling of zero.
    expect(roundInward(0.0001, "down")).toBe(0.0001);
    expect(roundInward(0.00025, "down")).toBe(0.00025);
  });

  it("keeps large magnitudes that three significant figures alone would truncate", () => {
    // 3 sig figs would drag this to 1230, discarding four units of real range.
    expect(roundInward(1234, "down")).toBe(1234);
    expect(roundInward(1234, "up")).toBe(1234);
  });

  it("collapses the float noise the original rounding was added for", () => {
    // fromCanonical(0.01 units/kg/min -> milliunits) returns this.
    expect(roundInward(10.000000000000002, "down")).toBe(10);
    expect(roundInward(9.999999999999998, "up")).toBe(10);
  });

  it("leaves already-clean bounds untouched", () => {
    for (const v of [180, 45, 1.5, 12, 0.5]) {
      expect(roundInward(v, "up")).toBe(v);
      expect(roundInward(v, "down")).toBe(v);
    }
  });

  it("handles zero and negative bounds without a special case", () => {
    expect(roundInward(0, "up")).toBe(0);
    expect(roundInward(0, "down")).toBe(0);
    // Inward for a lower bound is toward the interior, i.e. less negative.
    // Both candidates (-3.141 at 3 dp, -3.14 at 3 sf) sit above the true value;
    // the nearer one wins, so this is -3.141 rather than the tidier -3.14.
    expect(roundInward(-3.14159, "up")).toBe(-3.141);
    expect(roundInward(-3.14159, "down")).toBe(-3.142);
  });

  it("passes non-finite values through rather than emitting NaN into the DOM", () => {
    expect(roundInward(Number.POSITIVE_INFINITY, "down")).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(roundInward(Number.NaN, "up"))).toBe(true);
  });
});
