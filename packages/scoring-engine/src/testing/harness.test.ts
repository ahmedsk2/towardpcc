import { describe, expect, it } from "vitest";
import { fixtureScore } from "./fixture-score";
import {
  assertSuiteComplete,
  assertValidSource,
  describeScore,
  resolveNumericInput,
  type SuiteState,
} from "./harness";
import { matchInterpretationBand } from "../interpretation";

describe("assertValidSource", () => {
  it("rejects empty citations", () => {
    expect(() => assertValidSource({ citation: "  " })).toThrow(/citation/);
  });
  it("rejects sources with no pmid, doi, or locator", () => {
    expect(() => assertValidSource({ citation: "Some paper" })).toThrow(/traceable/);
  });
  it("accepts pmid, doi, or locator", () => {
    expect(() => assertValidSource({ citation: "P", pmid: "1" })).not.toThrow();
    expect(() => assertValidSource({ citation: "P", doi: "10.1/x" })).not.toThrow();
    expect(() => assertValidSource({ citation: "P", locator: "Table 1" })).not.toThrow();
  });
});

describe("assertSuiteComplete", () => {
  const def = { slug: "fixture-ratio", inputs: fixtureScore.inputs };
  it("fails with zero worked examples", () => {
    const state: SuiteState = { workedExamples: 0, rejectionInputIds: new Set() };
    expect(() => assertSuiteComplete(def, state)).toThrow(/workedExample/);
  });
  it("fails when a required non-boolean input has no rejection coverage", () => {
    const state: SuiteState = { workedExamples: 1, rejectionInputIds: new Set(["numerator"]) };
    expect(() => assertSuiteComplete(def, state)).toThrow(/mode/);
  });
  it("passes when the floor is met", () => {
    const state: SuiteState = {
      workedExamples: 1,
      rejectionInputIds: new Set(["numerator", "mode"]),
    };
    expect(() => assertSuiteComplete(def, state)).not.toThrow();
  });
});

describe("engine plumbing via fixture score", () => {
  it("converts alternate units before calculating (kPa -> mmHg)", () => {
    const outcome = fixtureScore.compute({
      numerator: { value: 13.3322368421, unit: "kPa" },
      mode: { value: "plain" },
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.values[0]?.value).toBeCloseTo(100, 6);
  });

  it("collects multiple rejections in one pass", () => {
    const outcome = fixtureScore.compute({
      numerator: { value: 9999, unit: "mmHg" },
      // @ts-expect-error deliberately invalid category for runtime validation
      mode: { value: "nope" },
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toHaveLength(2);
    expect(outcome.errors.map((e) => e.code).sort()).toEqual(["invalid-category", "out-of-range"]);
  });

  it("rejects missing required, wrong types, unknown units", () => {
    const missing = fixtureScore.compute({} as never);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors.map((e) => e.code)).toContain("missing-required");
    }
    const badType = fixtureScore.compute({
      // @ts-expect-error runtime junk
      numerator: { value: "high", unit: "mmHg" },
      mode: { value: "plain" },
    });
    expect(badType.ok).toBe(false);
    if (!badType.ok) expect(badType.errors[0]?.code).toBe("invalid-type");

    const badUnit = fixtureScore.compute({
      numerator: { value: 100, unit: "psi" },
      mode: { value: "plain" },
    });
    expect(badUnit.ok).toBe(false);
    if (!badUnit.ok) expect(badUnit.errors[0]?.code).toBe("unknown-unit");

    const badBool = fixtureScore.compute({
      numerator: { value: 100, unit: "mmHg" },
      mode: { value: "plain" },
      // @ts-expect-error runtime junk
      invert: { value: "yes" },
    });
    expect(badBool.ok).toBe(false);
    if (!badBool.ok) expect(badBool.errors[0]?.code).toBe("invalid-type");
  });

  it("optional boolean input changes the branch when provided", () => {
    const outcome = fixtureScore.compute({
      numerator: { value: 100, unit: "mmHg" },
      mode: { value: "doubled" },
      invert: { value: true },
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.result.values[0]?.value).toBeCloseTo(1 / 200, 12);
  });

  it("matchInterpretationBand honors [min, max) and unknown outputs", () => {
    expect(matchInterpretationBand(fixtureScore, "ratio", 99.999)?.id).toBe("low");
    expect(matchInterpretationBand(fixtureScore, "ratio", 100)?.id).toBe("high");
    expect(matchInterpretationBand(fixtureScore, "nope", 5)).toBeUndefined();
  });
});

// Exercises the real vitest glue end-to-end (worked example, boundaries,
// rejections, interpretation boundary) against the non-clinical fixture.
describeScore(fixtureScore, (ctx) => {
  ctx.workedExample(
    { citation: "Internal fixture: 120 mmHg, doubled = 240.", locator: "arithmetic identity" },
    { numerator: { value: 120, unit: "mmHg" }, mode: { value: "doubled" } },
    [{ id: "ratio", value: 240 }],
  );
  ctx.workedExample(
    { citation: "Internal fixture with tolerance.", locator: "arithmetic identity" },
    { numerator: { value: 100, unit: "mmHg" }, mode: { value: "plain" }, invert: { value: true } },
    [{ id: "ratio", value: 0.01, tolerance: 1e-9 }],
  );
  ctx.boundaryTest("numerator", "min", {
    numerator: { value: 50, unit: "mmHg" },
    mode: { value: "plain" },
  });
  ctx.boundaryTest("numerator", "max", {
    numerator: { value: 50, unit: "mmHg" },
    mode: { value: "plain" },
  });
  ctx.rejectsImplausible(
    "an unknown mode",
    {
      numerator: { value: 50, unit: "mmHg" },
      // @ts-expect-error deliberate invalid category
      mode: { value: "wild" },
    },
    { inputId: "mode", code: "invalid-category" },
  );
  ctx.interpretationBoundary("ratio", 100, "low", "high");
});

describe("resolveNumericInput guard", () => {
  it("returns the numeric input", () => {
    expect(resolveNumericInput(fixtureScore, "numerator").type).toBe("numeric");
  });
  it("throws on a categorical input", () => {
    expect(() => resolveNumericInput(fixtureScore, "mode")).toThrow(/not a numeric input/);
  });
  it("throws on an unknown input", () => {
    expect(() => resolveNumericInput(fixtureScore, "ghost")).toThrow(/not a numeric input/);
  });
});
