import type { UnitConversion, UnitSpec } from "./types";

/** Percent alternate for a canonical 0–1 fraction (e.g. FiO₂ entered as 40 → 0.40). */
export const percentForFraction: UnitConversion = {
  unit: "%",
  toCanonical: (pct) => pct / 100,
  fromCanonical: (frac) => frac * 100,
};

/** A 0–1 fraction that also accepts percent entry (FiO₂, SpO₂-as-fraction, etc.). */
export const fractionWithPercent: UnitSpec = {
  canonical: "fraction",
  alternates: [percentForFraction],
};
