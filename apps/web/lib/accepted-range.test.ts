import { describe, expect, it } from "vitest";
import { getScore, type ScoreInput } from "@towardpcc/scoring-engine";
import { acceptedRange, displayInputError } from "./accepted-range";

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

  it("leaves an exclusive-upper-bound input alone, whose engine wording is exact", () => {
    const withExclusive = getScore("apls-weight")?.inputs.find(
      (i) => i.type === "numeric" && i.maxExclusive !== undefined,
    );
    if (!withExclusive || withExclusive.type !== "numeric") return; // no such input: nothing to pin
    const alt = withExclusive.unit.alternates?.[0]?.unit;
    if (!alt) return;
    const msg = { code: "out-of-range", message: "engine wording" };
    expect(displayInputError(withExclusive, alt, msg)).toBe("engine wording");
  });
});
