import { describe, expect, it } from "vitest";
import { getScore, type ScoreInput } from "@towardpcc/scoring-engine";
import { acceptedBounds, acceptedRange, displayInputError } from "./accepted-range";

/**
 * Real registry inputs, not fixtures: the point of these bounds is what a
 * clinician is told about a real field, and a synthetic UnitSpec would test
 * the helper against itself.
 */
function input(slug: string, id: string): ScoreInput {
  const score = getScore(slug);
  const found = score?.inputs.find((i) => i.id === id);
  if (!found) throw new Error(`no input ${id} on ${slug}`);
  return found;
}

describe("acceptedRange", () => {
  it("prints the canonical bound unchanged in the canonical unit", () => {
    expect(acceptedRange(input("sf-ratio", "fio2"), "fraction")).toBe("0.21–1 fraction");
  });

  it("converts the bound into the unit on screen", () => {
    expect(acceptedRange(input("sf-ratio", "fio2"), "%")).toBe("21–100 %");
    expect(acceptedRange(input("bsa-mosteller", "height_cm"), "m")).toBe("0.3–2.2 m");
  });

  it("keeps the 1000x vasopressin pairing honest", () => {
    const vaso = input("vis", "vasopressin");
    if (vaso.type !== "numeric") throw new Error("vasopressin is numeric");
    const milli = vaso.unit.alternates?.find((a) => a.unit.includes("milli"));
    if (!milli) throw new Error("vasopressin declares a milliunits alternate");
    expect(acceptedRange(vaso, milli.unit)).toBe(`0–10 ${milli.unit}`);
  });

  it("flips the ends for a reversing unit and still rounds inward", () => {
    // 30–250 bpm is 2000–240 ms of R-R: the canonical minimum becomes the
    // displayed MAXIMUM. Printed ascending, with the displayed lower bound
    // rounded up and the upper rounded down — the subset contract, not the
    // declaration order (which is what the field used to print, and the bug).
    expect(acceptedRange(input("qtc", "hr"), "ms")).toBe("240–2000 ms");
  });

  it("returns null for a non-numeric input", () => {
    const score = getScore("four-score");
    const choice = score?.inputs.find((i) => i.type !== "numeric");
    if (!choice) throw new Error("four-score has a non-numeric input");
    expect(acceptedRange(choice, "")).toBeNull();
  });
});

describe("displayInputError", () => {
  const fio2 = input("sf-ratio", "fio2");
  const engine = {
    code: "out-of-range",
    message: "Fraction of inspired oxygen (FiO₂) must be between 0.21 and 1 fraction.",
  };

  it("restates an out-of-range refusal in the unit on screen", () => {
    expect(displayInputError(fio2, "%", engine)).toBe(
      "Fraction of inspired oxygen (FiO₂) must be between 21 and 100 %.",
    );
  });

  it("leaves the engine's wording alone in the canonical unit", () => {
    expect(displayInputError(fio2, "fraction", engine)).toBe(engine.message);
  });

  it("leaves every other error code alone", () => {
    const missing = {
      code: "missing-required",
      message: "Fraction of inspired oxygen (FiO₂) is required.",
    };
    expect(displayInputError(fio2, "%", missing)).toBe(missing.message);
  });

  it("leaves an exclusive-upper-bound input's refusal alone, whose engine wording is exact", () => {
    // PELOD-2 and Phoenix declare age as max 216 / maxExclusive 216 months. The
    // engine says "at least 0 and less than 216 months", which is exact, and
    // neither field offers an alternate unit. Asserted on the real input so this
    // cannot pass by finding nothing.
    const age = input("pelod2", "age_months");
    if (age.type !== "numeric") throw new Error("age_months is numeric");
    expect(age.maxExclusive).toBe(216);
    const msg = {
      code: "out-of-range",
      message: "Patient age must be at least 0 and less than 216 months.",
    };
    expect(displayInputError(age, "months", msg)).toBe(msg.message);
  });
});

describe("acceptedRange with an exclusive ceiling", () => {
  it("says the ceiling is excluded instead of promising it", () => {
    // The caption used to read "0–216 months" over a field that refuses 216 —
    // the one number it promised was the one value validation rejects.
    expect(acceptedRange(input("pelod2", "age_months"), "months")).toBe("0 to under 216 months");
    expect(acceptedRange(input("phoenix", "age_months"), "months")).toBe("0 to under 216 months");
  });

  it("reports the exclusive flag on the bounds", () => {
    expect(acceptedBounds(input("pelod2", "age_months"), "months")).toEqual({
      low: 0,
      high: 216,
      highExclusive: true,
    });
    expect(acceptedBounds(input("sf-ratio", "fio2"), "%")).toEqual({
      low: 21,
      high: 100,
      highExclusive: false,
    });
  });
});
