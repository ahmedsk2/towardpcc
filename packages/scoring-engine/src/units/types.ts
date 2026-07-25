/** A non-canonical unit and its exact conversion to/from the canonical unit. */
export interface UnitConversion {
  readonly unit: string;
  readonly toCanonical: (value: number) => number;
  readonly fromCanonical: (value: number) => number;
}

/** The unit system for one input: canonical unit plus accepted alternates. */
export interface UnitSpec {
  readonly canonical: string;
  readonly alternates?: readonly UnitConversion[];
}

/** Dimensionless inputs (ratios, fractions, points). */
export const NO_UNIT: UnitSpec = { canonical: "" };

/**
 * Convert a value in `unit` to the spec's canonical unit.
 * Returns null when the unit is not part of the spec — the validator turns
 * that into a rejection; nothing is ever silently computed.
 */
export function toCanonical(spec: UnitSpec, value: number, unit: string): number | null {
  if (unit === spec.canonical) return value;
  const alt = spec.alternates?.find((a) => a.unit === unit);
  return alt ? alt.toCanonical(value) : null;
}
