import type { UnitConversion, UnitSpec } from "./types";

/**
 * Unit specs for the albumin-adjusted ("corrected") calcium calculation.
 * Factors are the standard molar-mass / SI laboratory conversions reproduced
 * in docs/research/scores/corrected-calcium.md ("Unit conversions used above").
 */

/**
 * Total serum calcium: molar mass 40.08 g/mol ⇒ 1 mmol/L = 40.08 mg/L =
 * 4.008 mg/dL (equivalently 1 mg/dL = 0.2495 mmol/L). The Payne correction
 * coefficient (0.8) is defined in conventional units, so mg/dL is canonical
 * and mmol/L is the accepted alternate. A single constant is used for both
 * directions so the conversion round-trips exactly.
 */
export const CALCIUM_MGDL_PER_MMOL = 4.008;

export const mmolPerLForCalcium: UnitConversion = {
  unit: "mmol/L",
  toCanonical: (mmol) => mmol * CALCIUM_MGDL_PER_MMOL,
  fromCanonical: (mgdl) => mgdl / CALCIUM_MGDL_PER_MMOL,
};

/** Total serum calcium: canonical mg/dL, accepts mmol/L. */
export const calciumMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [mmolPerLForCalcium],
};

/**
 * Serum albumin: 1 g/dL = 10 g/L (SI conversion g/dL × 10 = g/L;
 * corrected-calcium.md "Unit conversions"). The correction reference constant
 * (4.0) is expressed in g/dL, so g/dL is canonical and g/L is the alternate.
 */
export const ALBUMIN_GL_PER_GDL = 10;

export const gPerLForAlbumin: UnitConversion = {
  unit: "g/L",
  toCanonical: (gL) => gL / ALBUMIN_GL_PER_GDL,
  fromCanonical: (gdl) => gdl * ALBUMIN_GL_PER_GDL,
};

/** Serum albumin: canonical g/dL, accepts g/L. */
export const albuminGdl: UnitSpec = {
  canonical: "g/dL",
  alternates: [gPerLForAlbumin],
};
