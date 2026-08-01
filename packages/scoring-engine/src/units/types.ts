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

/**
 * Convert a canonical value into `unit` — the inverse of `toCanonical`.
 *
 * Exists so the UI can state a plausibility bound in the unit the clinician has
 * SELECTED. Min and max are declared canonically, and the form was printing
 * them verbatim: with `milliunits/kg/min` chosen, the vasopressin field read
 * "Accepted 0–0.01 units/kg/min" — the canonical numbers under the canonical
 * name, while the box beside it was expecting milliunits. Obeying that hint
 * enters a thousandth of the intended dose, on the one field whose own source
 * comment calls it "a documented 1000x error trap".
 */
export function fromCanonical(spec: UnitSpec, value: number, unit: string): number | null {
  if (unit === spec.canonical) return value;
  const alt = spec.alternates?.find((a) => a.unit === unit);
  return alt ? alt.fromCanonical(value) : null;
}
