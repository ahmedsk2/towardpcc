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

/**
 * A quantity measured directly in percent, canonical "%" (e.g. SpO₂, which is
 * reported as a whole-number percentage and is used as the numerator of the
 * S/F ratio in %, not as a 0–1 fraction). Canonical-only, no conversion —
 * analogous to cmH2O in pressure.ts.
 */
export const percent: UnitSpec = { canonical: "%" };
