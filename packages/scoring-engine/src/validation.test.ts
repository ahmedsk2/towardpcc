import { describe, expect, it } from "vitest";
import { runValidation } from "./validation";
import { prism } from "./scores/prism";
import { defineText } from "./i18n/text";
import { mmhgWithKpa } from "./units/pressure";
import { NO_UNIT } from "./units/types";
import type { ScoreInput } from "./types";
import type { UnitSpec } from "./units/types";

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

/**
 * THE SAFETY RULE, stated directly against the object `calculate` receives:
 *
 *   For every input whose `showWhen` is not satisfied by the values submitted
 *   in the same call, the object handed to `calculate()` contains no key for
 *   that input's id.
 *
 * It is a positive property of one object, so it is decidable by looking at
 * that object alone — it does not require enumerating who might read a hidden
 * value, and it therefore holds against form layers that do not exist yet
 * (ADR-0005: "different runtime" is not an available argument).
 *
 * This is the assertion that BINDS for PRISM. The registry-wide invariance
 * sweep passes on PRISM even without the skip, because PRISM's `calculate`
 * returns before every read of its four covariates — so an output-comparison
 * test cannot detect a stale hidden value on this score. This one can: delete
 * the `continue` from validation.ts and it goes red immediately.
 */
describe("a hidden input never reaches calculate", () => {
  it("omits a hidden input's id from canonical", () => {
    const { errors, canonical } = runValidation(prism.inputs, {
      collection_window: { value: "first_12_24h" },
      age: { value: 3, unit: "years" },
      pupils: { value: "both_reactive" },
      cancer: { value: true },
      low_risk_system: { value: true },
    });
    expect(errors).toEqual([]);
    expect(Object.keys(canonical)).not.toContain("cancer");
    expect(Object.keys(canonical)).not.toContain("low_risk_system");
  });

  it("passes the same ids through when the controller does satisfy the condition", () => {
    // The other direction, so the test above cannot be satisfied by a skip that
    // drops the four unconditionally.
    const { errors, canonical } = runValidation(prism.inputs, {
      collection_window: { value: "first_4h" },
      age: { value: 3, unit: "years" },
      pupils: { value: "both_reactive" },
      cancer: { value: true },
      low_risk_system: { value: true },
    });
    expect(errors).toEqual([]);
    expect(canonical.cancer).toEqual({ value: true });
    expect(canonical.low_risk_system).toEqual({ value: true });
  });

  it("does not raise missing-required for a hidden input", () => {
    // `required` means "required when asked". The skip sits BEFORE the required
    // check for exactly this reason; the structural gate forbids the
    // combination anyway, and this pins the ordering that makes it safe.
    const conditional: ScoreInput[] = [
      {
        id: "w",
        label: defineText("w", "Window"),
        required: true,
        type: "categorical",
        options: [
          { value: "on", label: defineText("on", "On") },
          { value: "off", label: defineText("off", "Off") },
        ],
      },
      {
        id: "dep",
        label: defineText("dep", "Dependent"),
        required: true,
        type: "boolean",
        showWhen: { input: "w", equals: ["on"] },
      },
    ];
    const { errors, canonical } = runValidation(conditional, { w: { value: "off" } });
    expect(errors).toEqual([]);
    expect(Object.keys(canonical)).not.toContain("dep");
  });
});

/**
 * A VALUE THAT IS THE BOUND IS ACCEPTED, WHATEVER UNIT IT ARRIVES IN.
 *
 * Found on body surface area 2026-09-03: height accepts 30-220 cm, 220 cm was
 * accepted and the identical 2.2 m was refused, because `2.2 * 100` is
 * 220.00000000000003 — while the field's own hint read "Accepted 0.3-2.2 m",
 * since the hint converts the same bound the other way and `fromCanonical` then
 * `toCanonical` is not the identity.
 *
 * The units here are SYNTHETIC and deliberately so. The upper half is pinned by
 * a real score, but no bound in the registry currently converts to just BELOW
 * its minimum, so that half could be deleted with every test still green — a
 * mutation run proved exactly that. These two conversions are built to land a
 * hair either side, so both halves can fail.
 */
describe("bounds are enterable in every unit that expresses them", () => {
  // Converting out and back lands ABOVE: 2.2 * 100 = 220.00000000000003.
  const overshoots: UnitSpec = {
    canonical: "cm",
    alternates: [{ unit: "m", toCanonical: (m) => m * 100, fromCanonical: (cm) => cm / 100 }],
  };
  // And BELOW: (0.21 / 3) * 3 is 0.20999999999999996. 0.21 is FiO2's real
  // floor here, so this is the shape a genuine unit could take rather than a
  // contrivance. Found by a numeric search, because the first attempt at this
  // fixture — 1 with a factor of 3 — rounds back to exactly 1 and left the
  // lower half of the tolerance unfalsifiable.
  const undershoots: UnitSpec = {
    canonical: "fraction",
    alternates: [{ unit: "third", toCanonical: (t) => t * 3, fromCanonical: (f) => f / 3 }],
  };

  const accepts = (input: ScoreInput, value: number, unit: string) =>
    runValidation([input], { n: { value, unit } } as never).errors.every(
      (e) => e.code !== "out-of-range",
    );

  it("accepts a maximum that overshoots when converted back", () => {
    const input = numeric(overshoots, 30, 220);
    expect(accepts(input, 220, "cm"), "the canonical maximum").toBe(true);
    expect(accepts(input, 2.2, "m"), "2.2 m IS 220 cm").toBe(true);
    expect(accepts(input, 2.21, "m"), "and the tolerance reaches no further").toBe(false);
  });

  it("accepts a minimum that undershoots when converted back", () => {
    const input = numeric(undershoots, 0.21, 1);
    expect(accepts(input, 0.21, "fraction"), "the canonical minimum").toBe(true);
    // (0.21 / 3) * 3 lands at 0.20999999999999996, a hair under the floor.
    expect(accepts(input, 0.21 / 3, "third"), "a third of 0.21, times three, IS 0.21").toBe(true);
    expect(accepts(input, 0.06, "third"), "and the tolerance reaches no further").toBe(false);
  });

  it("does not widen maxExclusive, whose whole job is to reject its own value", () => {
    const input = { ...numeric(overshoots, 0, 216), maxExclusive: 216 } as ScoreInput;
    expect(accepts(input, 216, "cm"), "216 is the value it exists to refuse").toBe(false);
    expect(accepts(input, 2.16, "m"), "and the same value in metres").toBe(false);
    expect(accepts(input, 215.9, "cm"), "while 215.9 is inside it").toBe(true);
  });
});
