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
