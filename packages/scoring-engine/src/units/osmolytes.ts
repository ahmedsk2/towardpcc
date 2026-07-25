import type { UnitConversion, UnitSpec } from "./types";

/**
 * Analyte units for the serum-osmolality / osmolar-gap score. Every conversion
 * factor here is an exact unit conversion carried in the additive osmolality
 * formula itself, not a fitted coefficient — sourced from
 * docs/research/scores/serum-osmolality.md ("Inputs" + "Formula / algorithm").
 *
 * The formula is Osm_calc = 2·Na + glucose/18 + BUN/2.8 (+ ethanol term). The
 * ÷18, ÷2.8 and ÷4.6 divisors ARE the mg/dL → mmol/L conversions, so the SI
 * alternates below use those same factors: entering a US mg/dL value or the
 * corresponding SI mmol/L value must yield the identical calculated osmolality
 * (serum-osmolality.md worked example 2, the unit-equivalence check).
 */

/**
 * Sodium: mEq/L and mmol/L are numerically identical for a monovalent ion
 * (serum-osmolality.md: "Na↔mEq/L is 1:1 (monovalent)"). Canonical mmol/L,
 * with an mEq/L alternate that is an exact 1:1 identity.
 */
export const mEqPerLForSodium: UnitConversion = {
  unit: "mEq/L",
  toCanonical: (meq) => meq,
  fromCanonical: (mmol) => mmol,
};

/** Serum sodium: canonical mmol/L, accepts mEq/L (1:1, monovalent). */
export const sodiumMmol: UnitSpec = {
  canonical: "mmol/L",
  alternates: [mEqPerLForSodium],
};

/**
 * Glucose: molar mass ≈ 180 g/mol ⇒ 1 mmol/L = 18 mg/dL. The formula's
 * glucose/18 term is exactly this conversion (serum-osmolality.md), so the
 * mmol/L alternate uses factor 18 (not the physically exact 18.0156) to keep
 * the SI and US forms numerically identical.
 */
export const GLUCOSE_MGDL_PER_MMOL = 18;

export const mmolPerLForGlucose: UnitConversion = {
  unit: "mmol/L",
  toCanonical: (mmol) => mmol * GLUCOSE_MGDL_PER_MMOL,
  fromCanonical: (mgdl) => mgdl / GLUCOSE_MGDL_PER_MMOL,
};

/** Serum glucose: canonical mg/dL, accepts mmol/L (×18). */
export const glucoseMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [mmolPerLForGlucose],
};

/**
 * Blood urea nitrogen: urea carries 2 N atoms (28 g N per mol) ⇒
 * 1 mmol/L urea = 2.8 mg/dL BUN. The formula's BUN/2.8 term is exactly this
 * conversion (serum-osmolality.md). Outside the US, labs report whole-molecule
 * UREA in mmol/L; entering it here as "mmol/L" multiplies by 2.8 to reach the
 * canonical mg/dL of nitrogen. BUN (nitrogen) vs urea (whole molecule) differ
 * by this ×2.8 factor — a frequent unit trap.
 */
export const BUN_MGDL_PER_UREA_MMOL = 2.8;

export const mmolPerLForUrea: UnitConversion = {
  unit: "mmol/L",
  toCanonical: (mmol) => mmol * BUN_MGDL_PER_UREA_MMOL,
  fromCanonical: (mgdl) => mgdl / BUN_MGDL_PER_UREA_MMOL,
};

/** Blood urea nitrogen: canonical mg/dL, accepts urea mmol/L (×2.8). */
export const bunMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [mmolPerLForUrea],
};

/**
 * Ethanol: molar mass ≈ 46.07 g/mol ⇒ 1 mmol/L = 4.6 mg/dL. This is the
 * PHYSICAL (ideal molar-mass) conversion (serum-osmolality.md: "mg/dL → mmol/L
 * is ÷4.6"). It is deliberately NOT the empiric 3.7 divisor — 3.7 is a fitted
 * formula coefficient (Purssell 2001) applied to the mg/dL value inside the
 * score, not a unit conversion. Canonical mg/dL, accepts mmol/L (×4.6).
 */
export const ETHANOL_MGDL_PER_MMOL = 4.6;

export const mmolPerLForEthanol: UnitConversion = {
  unit: "mmol/L",
  toCanonical: (mmol) => mmol * ETHANOL_MGDL_PER_MMOL,
  fromCanonical: (mgdl) => mgdl / ETHANOL_MGDL_PER_MMOL,
};

/** Serum ethanol: canonical mg/dL, accepts mmol/L (×4.6, ideal MW). */
export const ethanolMgdl: UnitSpec = {
  canonical: "mg/dL",
  alternates: [mmolPerLForEthanol],
};

/**
 * Measured osmolality from an osmometer: reported in mOsm/kg with no clinical
 * alternate unit (serum-osmolality.md). Canonical-only, analogous to cmH2O in
 * pressure.ts.
 */
export const mOsmPerKg: UnitSpec = { canonical: "mOsm/kg" };
