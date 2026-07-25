import type { UnitConversion, UnitSpec } from "./types";

/**
 * Weight-based drug infusion rates for the Vasoactive-Inotropic Score.
 * Two dimensions appear in VIS: mcg/kg/min for the catecholamines/milrinone
 * and units/kg/min for vasopressin (see vis.md). Kept here so the vasopressin
 * unit trap (coefficient 10,000) is handled in one audited place.
 */

/** µg and mcg denote the same unit (microgram); accept the µ-sign spelling 1:1. */
export const microgramSignForMcg: UnitConversion = {
  unit: "µg/kg/min",
  toCanonical: (v) => v,
  fromCanonical: (v) => v,
};

/** Catecholamine / milrinone infusion rate: canonical mcg/kg/min, accepts µg/kg/min. */
export const mcgPerKgPerMin: UnitSpec = {
  canonical: "mcg/kg/min",
  alternates: [microgramSignForMcg],
};

/**
 * Vasopressin dosing unit for VIS: canonical units/kg/min (VIS coefficient 10,000).
 * Accepts milliunits/kg/min (÷1000; SI prefix milli = 10⁻³) because this is the
 * documented vasopressin unit trap (vis.md): 0.3 milliunits/kg/min = 0.0003
 * units/kg/min — a 1000× error if the unit is mistaken, which the coefficient
 * then amplifies (0.0003 → 3 VIS points vs 0.3 → 3000 VIS points).
 */
export const milliunitsForUnits: UnitConversion = {
  unit: "milliunits/kg/min",
  toCanonical: (mu) => mu / 1000,
  fromCanonical: (u) => u * 1000,
};

/** Vasopressin infusion rate: canonical units/kg/min, accepts milliunits/kg/min. */
export const unitsPerKgPerMin: UnitSpec = {
  canonical: "units/kg/min",
  alternates: [milliunitsForUnits],
};
