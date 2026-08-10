/** A non-canonical unit and its exact conversion to/from the canonical unit. */
export interface UnitConversion {
  readonly unit: string;
  readonly toCanonical: (value: number) => number;
  readonly fromCanonical: (value: number) => number;
  /**
   * This is the SAME unit under another spelling, not another unit.
   *
   * `alternates` was doing two unrelated jobs. Most entries are real
   * conversions: choosing one changes the number, so the form must offer the
   * choice. A few are spelling variants — `mcg/kg/min` and `µg/kg/min` are both
   * micrograms — where choosing changes nothing at all.
   *
   * Rendering the second kind as a toggle is a SAFETY problem, not a cosmetic
   * one. Four VIS drugs offered a mcg/µg toggle that did nothing, sitting
   * beside vasopressin, whose units-versus-milliunits toggle changes the answer
   * by a factor of a thousand and is the documented trap this file exists to
   * contain. A control that visibly does nothing teaches a clinician that
   * infusion unit toggles do not matter, and the next one they skip is the one
   * that does.
   *
   * Set this and the unit stays ACCEPTED on input — links and habits that use
   * the other spelling keep working — while the form stops presenting it as a
   * choice. A registry gate asserts that any conversion marked this way is
   * genuinely the identity in both directions, so the flag cannot be used to
   * hide a real conversion from the reader.
   */
  readonly sameUnitSpelling?: boolean;
}

/** The unit system for one input: canonical unit plus accepted alternates. */
export interface UnitSpec {
  readonly canonical: string;
  readonly alternates?: readonly UnitConversion[];
  /**
   * Decimal places at which this quantity is CLINICALLY REPORTED in its
   * canonical unit. When set, `toCanonical` rounds a CONVERTED value to it.
   * Absent means no rounding.
   *
   * Why this exists — a threshold-boundary safety defect. Scoring compares the
   * canonical value against thresholds and never sees the unit the clinician
   * typed, so a value entered in an alternate unit reached `calculate()`
   * carrying the full binary residue of the division. Where a guideline PRINTS
   * an alternate-unit equivalent of its own cutoff, entering that printed
   * number landed a hair under the cutoff and staged low: KDIGO prints
   * "≥4.0 mg/dL (≥353.6 µmol/L)", but 353.6 ÷ 88.42 = 3.999095 mg/dL, which
   * fails `>= 4`. The clinician types the guideline's own SI number and gets
   * KDIGO Stage 1 instead of Stage 3.
   *
   * Rounding at the conversion boundary is also the more honest model of the
   * measurement: a creatinine measured in µmol/L does not carry six decimal
   * places of precision once expressed in mg/dL, and keeping them asserts a
   * precision the measurement does not have. Set this to the number of decimals
   * the lab actually reports in the canonical unit — never to a value chosen to
   * make one threshold behave, which would over-score every value in the widened
   * band. Only set it on specs whose canonical unit has a settled clinical
   * reporting precision; leave it absent otherwise.
   *
   * A value entered in the canonical unit is returned untouched — it is the
   * clinician's own figure at their own precision, not a converted one.
   */
  readonly canonicalDecimals?: number | undefined;
}

/** Dimensionless inputs (ratios, fractions, points). */
export const NO_UNIT: UnitSpec = { canonical: "" };

/**
 * Round to `decimals` places by decimal (not binary) semantics.
 * `toFixed` renders the true decimal expansion of the double and rounds there,
 * so 3.999095 → "4.00" → 4 rather than the 3.9999999 a `Math.round(v * 100)`
 * scaling can leave behind. Non-finite input passes through unchanged
 * ("NaN"/"Infinity" round-trip through Number).
 */
function roundToDecimals(value: number, decimals: number | undefined): number {
  return decimals === undefined ? value : Number(value.toFixed(decimals));
}

/**
 * Convert a value in `unit` to the spec's canonical unit.
 * Returns null when the unit is not part of the spec — the validator turns
 * that into a rejection; nothing is ever silently computed.
 *
 * A converted value is rounded to the spec's `canonicalDecimals` when declared;
 * see that field for why. A value already in the canonical unit is returned
 * verbatim, so declaring `canonicalDecimals` can never move a canonical-unit
 * entry across a threshold.
 */
export function toCanonical(spec: UnitSpec, value: number, unit: string): number | null {
  if (unit === spec.canonical) return value;
  const alt = spec.alternates?.find((a) => a.unit === unit);
  return alt ? roundToDecimals(alt.toCanonical(value), spec.canonicalDecimals) : null;
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
