import { describe, expect, it } from "vitest";
import {
  albuminGdl,
  electrolyteMeqL,
  GDL_PER_GL_ALBUMIN,
  gPerLForAlbumin,
  mmolPerLForElectrolyte,
} from "./electrolytes";
import { NO_UNIT, toCanonical } from "./types";

/**
 * Electrolyte (mEq/L↔mmol/L, identity) and albumin (g/dL↔g/L) conversions used
 * by the anion-gap score. Factors are definitional lab conventions documented
 * in docs/research/scores/anion-gap.md (§Inputs): monovalent ions are 1:1
 * between mEq/L and mmol/L; albumin g/dL = g/L ÷ 10.
 */
describe("electrolyte units — monovalent ion (mEq/L = mmol/L)", () => {
  it("treats mmol/L as identical to mEq/L for monovalent ions", () => {
    expect(mmolPerLForElectrolyte.toCanonical(140)).toBe(140);
    expect(mmolPerLForElectrolyte.fromCanonical(104)).toBe(104);
  });

  it("round-trips exactly", () => {
    for (const v of [1.5, 4, 24, 104, 140]) {
      expect(mmolPerLForElectrolyte.fromCanonical(mmolPerLForElectrolyte.toCanonical(v))).toBe(v);
    }
  });

  it("resolves canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(electrolyteMeqL, 140, "mEq/L")).toBe(140);
    expect(toCanonical(electrolyteMeqL, 140, "mmol/L")).toBe(140);
    expect(toCanonical(electrolyteMeqL, 1, "g/dL")).toBeNull();
  });
});

describe("albumin units — g/dL ↔ g/L", () => {
  it("uses the definitional factor 0.1 g/dL per g/L", () => {
    expect(GDL_PER_GL_ALBUMIN).toBe(0.1);
  });

  it("converts albumin: 40 g/L = 4.0 g/dL, 20 g/L = 2.0 g/dL", () => {
    expect(gPerLForAlbumin.toCanonical(40)).toBeCloseTo(4.0, 10);
    expect(gPerLForAlbumin.toCanonical(20)).toBeCloseTo(2.0, 10);
    expect(gPerLForAlbumin.fromCanonical(4.0)).toBeCloseTo(40, 10);
  });

  it("round-trips within floating tolerance", () => {
    for (const v of [1.0, 2.0, 2.5, 4.0, 6.0]) {
      expect(gPerLForAlbumin.toCanonical(gPerLForAlbumin.fromCanonical(v))).toBeCloseTo(v, 10);
    }
  });

  it("resolves canonical, alternate, and unknown units via a spec", () => {
    expect(toCanonical(albuminGdl, 4.0, "g/dL")).toBe(4.0);
    expect(toCanonical(albuminGdl, 40, "g/L")).toBeCloseTo(4.0, 10);
    expect(toCanonical(albuminGdl, 1, "mmol/L")).toBeNull();
    expect(toCanonical(NO_UNIT, 5, "")).toBe(5);
  });
});
