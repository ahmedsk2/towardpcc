import type { UnitConversion, UnitSpec } from "./types";

/**
 * Fluid volume units. Canonical litres, because the percent-cumulative-fluid-
 * balance formula is stated in litres over kilograms — (Σ intake_L − Σ output_L)
 * × 100 / weight_kg — and computing in the published unit keeps the numerator
 * one subtraction away from the formula on the page.
 *
 * Millilitres are accepted because that is what every flowsheet charts, and a
 * cumulative intake is read off the chart in mL, not L.
 */

/** 1 L = 1000 mL exactly (SI prefix milli = 10⁻³). Millilitres → L divides by 1000. */
export const ML_PER_L = 1000;

export const mlForL: UnitConversion = {
  unit: "mL",
  toCanonical: (ml) => ml / ML_PER_L,
  fromCanonical: (l) => l * ML_PER_L,
};

/** Fluid volume: canonical litres, accepts millilitres. */
export const litresWithMl: UnitSpec = {
  canonical: "L",
  alternates: [mlForL],
};
