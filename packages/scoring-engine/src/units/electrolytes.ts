import type { UnitConversion, UnitSpec } from "./types";

/**
 * Serum electrolyte and albumin units used by the anion-gap family of scores.
 * Sourcing: docs/research/scores/anion-gap.md (§Inputs, §Formula).
 */

/**
 * Monovalent serum electrolytes (Na⁺, K⁺, Cl⁻, HCO₃⁻). For these singly-charged
 * ions the milliequivalent and millimole are numerically identical
 * (1 mEq/L = 1 mmol/L), so mmol/L is accepted as a 1:1 alternate and no
 * scaling occurs. Source: anion-gap.md ("For these monovalent ions mmol/L is
 * numerically identical to mEq/L, so AG is reported in mEq/L (= mmol/L)").
 */
export const mmolPerLForElectrolyte: UnitConversion = {
  unit: "mmol/L",
  toCanonical: (mmol) => mmol,
  fromCanonical: (meq) => meq,
};

/** Monovalent serum electrolyte: canonical mEq/L, accepts an identical mmol/L. */
export const electrolyteMeqL: UnitSpec = {
  canonical: "mEq/L",
  alternates: [mmolPerLForElectrolyte],
};

/**
 * Serum albumin. Canonical g/dL (the unit of the Figge 1998 clinical
 * correction, baseline 4.0 g/dL); SI g/L is an accepted alternate. The forms
 * differ by a factor of 10 (40 g/L = 4.0 g/dL). Source: anion-gap.md ("From SI
 * g/L: ÷10 (e.g. 40 g/L = 4.0 g/dL)").
 */
export const GDL_PER_GL_ALBUMIN = 0.1;

export const gPerLForAlbumin: UnitConversion = {
  unit: "g/L",
  toCanonical: (gL) => gL * GDL_PER_GL_ALBUMIN,
  fromCanonical: (gdl) => gdl / GDL_PER_GL_ALBUMIN,
};

/** Serum albumin: canonical g/dL, accepts g/L. */
export const albuminGdl: UnitSpec = {
  canonical: "g/dL",
  alternates: [gPerLForAlbumin],
};
