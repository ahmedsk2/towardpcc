import type { UnitConversion, UnitSpec } from "./types";

/**
 * Body mass (weight) units. Canonical kilograms — the unit every pediatric
 * weight-based calculation in this engine consumes (Holliday-Segar maintenance
 * fluids, weight-based dosing, BSA). Accepts pounds and grams because charts
 * and imported records use both.
 */

/**
 * 1 kg = 2.20462 lb (the reciprocal avoirdupois-pound factor cited in the
 * Holliday-Segar research file's Inputs table, docs/research/scores/holliday-segar.md:
 * "kg = lb ÷ 2.20462"). Pounds → kg divides by this factor.
 */
export const LB_PER_KG = 2.20462;

export const lbForKg: UnitConversion = {
  unit: "lb",
  toCanonical: (lb) => lb / LB_PER_KG,
  fromCanonical: (kg) => kg * LB_PER_KG,
};

/**
 * 1 kg = 1000 g exactly (SI prefix kilo = 10³; holliday-segar.md: "kg = g ÷ 1000").
 * Grams → kg divides by 1000.
 */
export const G_PER_KG = 1000;

export const gForKg: UnitConversion = {
  unit: "g",
  toCanonical: (g) => g / G_PER_KG,
  fromCanonical: (kg) => kg * G_PER_KG,
};

/** Body weight: canonical kg, accepts lb and g. */
export const kgWithLbAndG: UnitSpec = {
  canonical: "kg",
  alternates: [lbForKg, gForKg],
};
