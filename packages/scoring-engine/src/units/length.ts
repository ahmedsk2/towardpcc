import type { UnitConversion, UnitSpec } from "./types";

/**
 * Body length / height units. Canonical centimetres — the unit the Mosteller
 * BSA estimator consumes (docs/research/scores/bsa-mosteller.md, Inputs table:
 * "height_cm … inches → cm: × 2.54 (exact); meters → cm: × 100"). Accepts
 * inches and metres because charts and imported records use both. The
 * conversions are exact definitional facts (international inch, SI prefix),
 * not clinical thresholds.
 */

/**
 * 1 inch = 2.54 cm exactly (international inch, NIST SP 811; bsa-mosteller.md:
 * "inches → cm: multiply by 2.54 (exact)"). Inches → cm multiplies by this.
 */
export const CM_PER_INCH = 2.54;

export const inchForCm: UnitConversion = {
  unit: "in",
  toCanonical: (inches) => inches * CM_PER_INCH,
  fromCanonical: (cm) => cm / CM_PER_INCH,
};

/**
 * 1 m = 100 cm exactly (SI prefix centi = 10⁻²; bsa-mosteller.md:
 * "meters → cm: × 100"). Metres → cm multiplies by 100.
 */
export const CM_PER_M = 100;

export const mForCm: UnitConversion = {
  unit: "m",
  toCanonical: (m) => m * CM_PER_M,
  fromCanonical: (cm) => cm / CM_PER_M,
};

/** Height / length: canonical cm, also accepts inches and metres. */
export const cmWithInAndM: UnitSpec = {
  canonical: "cm",
  alternates: [inchForCm, mForCm],
};
