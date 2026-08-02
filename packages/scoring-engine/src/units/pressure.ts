import type { UnitConversion, UnitSpec } from "./types";

/**
 * 1 mmHg = 101.325/760 kPa exactly (standard atmosphere definition,
 * NIST SP 811). KPA_PER_MMHG ≈ 0.133322368421...
 */
export const KPA_PER_MMHG = 101.325 / 760;

/** kPa alternate for a canonical-mmHg blood-gas pressure (PaO₂, PaCO₂). */
export const kpaForMmhg: UnitConversion = {
  unit: "kPa",
  toCanonical: (kpa) => kpa / KPA_PER_MMHG,
  fromCanonical: (mmhg) => mmhg * KPA_PER_MMHG,
};

/**
 * Blood-gas tension: canonical mmHg, accepts kPa.
 *
 * Deliberately NO `canonicalDecimals`. Every score using this spec states its
 * pressure cut points in mmHg only; none prints a kPa equivalent (pelod2.md
 * §Inputs records that "1 kPa = 7.5 mmHg" is a standard laboratory conversion,
 * "not values from the paper"). 12.6 kPa is therefore not a published
 * restatement of PELOD-2's ≥95 mmHg cut point — 95 mmHg is 12.666 kPa — and
 * 12.6 kPa really is 94.5 mmHg, which correctly scores 1 point, not 3.
 * Rounding to 0 decimals here would round 94.5 up to 95 and over-score a real
 * blood gas by two points. If a kPa-printing source ever appears, 1 decimal is
 * the honest choice (blood gases are reported to 0.1 kPa) and it keeps 94.5
 * below 95. See units/pressure.test.ts.
 */
export const mmhgWithKpa: UnitSpec = { canonical: "mmHg", alternates: [kpaForMmhg] };

/** Airway pressure (e.g. mean airway pressure): clinical standard cmH₂O. */
export const cmH2O: UnitSpec = { canonical: "cmH2O" };
