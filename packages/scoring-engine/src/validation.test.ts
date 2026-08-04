import { describe, expect, it } from "vitest";
import { runValidation } from "./validation";
import { defineText } from "./i18n/text";
import { mmhgWithKpa } from "./units/pressure";
import { NO_UNIT } from "./units/types";
import type { ScoreInput } from "./types";

const numeric = (unit = mmhgWithKpa, min = 10, max = 700): ScoreInput => ({
  id: "n",
  label: defineText("n", "Pressure"),
  required: true,
  type: "numeric",
  unit,
  min,
  max,
});

describe("runValidation numeric edge branches", () => {
  it("falls back to the canonical unit when no unit field is given", () => {
    const { errors, canonical } = runValidation([numeric()], { n: { value: 100 } });
    expect(errors).toEqual([]);
    expect(canonical.n).toEqual({ value: 100, unit: "mmHg" });
  });

  it("lists only the canonical unit for a dimensionless input on unknown-unit", () => {
    const { errors } = runValidation([numeric(NO_UNIT, 0, 10)], {
      n: { value: 5, unit: "bananas" },
    });
    expect(errors[0]?.code).toBe("unknown-unit");
    // No alternates and no "" noise: message names no supported unit
    expect(errors[0]?.message).toContain("not supported");
  });

  it("omits the unit suffix on out-of-range for a dimensionless input", () => {
    const { errors } = runValidation([numeric(NO_UNIT, 0, 10)], { n: { value: 20 } });
    expect(errors[0]?.code).toBe("out-of-range");
    expect(errors[0]?.message).toBe("Pressure must be between 0 and 10.");
  });

  it("keeps the unit suffix on out-of-range for a dimensioned input", () => {
    const { errors } = runValidation([numeric()], { n: { value: 5, unit: "mmHg" } });
    expect(errors[0]?.message).toBe("Pressure must be between 10 and 700 mmHg.");
  });

  it("lists alternates in the unknown-unit message for a dimensioned input", () => {
    const { errors } = runValidation([numeric()], { n: { value: 5, unit: "psi" } });
    expect(errors[0]?.message).toContain("mmHg or kPa");
  });

  it("treats an explicit null like a missing required value (never throws)", () => {
    const { errors } = runValidation([numeric()], { n: null as never });
    expect(errors[0]?.code).toBe("missing-required");
  });
});

/**
 * `maxExclusive` — the half-open upper bound.
 *
 * `max` is required and INCLUSIVE, so "accept everything under 216" had no
 * expression: PELOD-2 declared the IEEE-754 predecessor of 216 and Phoenix
 * declared 215, wrongly rejecting the last month it should admit. These pin the
 * three things that can go wrong with a second bound — which one binds, whether
 * the named value is accepted, and whether the message describes the bound that
 * was actually enforced.
 */
const withExclusive = (max: number, maxExclusive: number): ScoreInput => ({
  id: "n",
  label: defineText("n", "Age"),
  required: true,
  type: "numeric",
  unit: { canonical: "months" },
  min: 0,
  max,
  maxExclusive,
});

describe("runValidation maxExclusive", () => {
  it("rejects exactly the excluded value", () => {
    const { errors } = runValidation([withExclusive(216, 216)], { n: { value: 216 } });
    expect(errors[0]?.code).toBe("out-of-range");
  });

  it("accepts everything below it, including a fractional value in the final unit", () => {
    for (const value of [0, 215, 215.5, 216 - 2 ** -45]) {
      const { errors, canonical } = runValidation([withExclusive(216, 216)], { n: { value } });
      expect(errors, `${value} must be accepted`).toEqual([]);
      expect(canonical.n).toEqual({ value, unit: "months" });
    }
  });

  it("states an exclusive bound as 'less than', never as 'between'", () => {
    const { errors } = runValidation([withExclusive(216, 216)], { n: { value: 300 } });
    // "between 0 and 216" would be a false statement: 216 is the one value the
    // bound exists to reject.
    expect(errors[0]?.message).toBe("Age must be at least 0 and less than 216 months.");
  });

  it("still rejects below min, with the exclusive wording", () => {
    const { errors } = runValidation([withExclusive(216, 216)], { n: { value: -1 } });
    expect(errors[0]?.code).toBe("out-of-range");
    expect(errors[0]?.message).toBe("Age must be at least 0 and less than 216 months.");
  });

  it("lets the stricter bound win when maxExclusive is below max", () => {
    const input = [withExclusive(300, 216)];
    expect(runValidation(input, { n: { value: 215.5 } }).errors).toEqual([]);
    const { errors } = runValidation(input, { n: { value: 250 } });
    expect(errors[0]?.message).toBe("Age must be at least 0 and less than 216 months.");
  });

  it("lets max win when maxExclusive is above it, and keeps the inclusive wording", () => {
    // Inert by construction: `max` already rejects everything the looser
    // exclusive bound would. The declared max must stay ACCEPTED.
    const input = [withExclusive(216, 300)];
    expect(runValidation(input, { n: { value: 216 } }).errors).toEqual([]);
    const { errors } = runValidation(input, { n: { value: 217 } });
    expect(errors[0]?.message).toBe("Age must be between 0 and 216 months.");
  });
});
