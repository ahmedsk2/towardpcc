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

/** Blood-gas tension: canonical mmHg, accepts kPa. */
export const mmhgWithKpa: UnitSpec = { canonical: "mmHg", alternates: [kpaForMmhg] };

/** Airway pressure (e.g. mean airway pressure): clinical standard cmH₂O. */
export const cmH2O: UnitSpec = { canonical: "cmH2O" };
