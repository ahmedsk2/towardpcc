import { fromCanonical, type ScoreInput } from "@towardpcc/scoring-engine";
import { roundInward } from "./round-inward";

/**
 * THE BOUND, IN THE UNIT ON SCREEN.
 *
 * `min` and `max` are declared canonically and were printed verbatim under
 * the canonical name — so selecting `milliunits/kg/min` on VIS vasopressin
 * left the field reading "Accepted 0–0.01 units/kg/min" while the box beside
 * it expected milliunits. A clinician obeying that hint enters a thousandth
 * of the intended dose, and it is ACCEPTED, because validation converts from
 * the selected unit and 0.005 milliunits is legitimately inside 0–0.01 units.
 * Nothing anywhere would have flagged it. That field's own source comment
 * calls the pairing "a documented 1000x error trap".
 *
 * Converted, then rounded to the precision the bound actually carries —
 * `fromCanonical` on 0.01 units gives 10.000000000000002 milliunits, and a
 * plausibility bound printed to sixteen digits reads like a bug.
 *
 * ROUNDING GOES INWARD, AND THAT DIRECTION IS THE WHOLE POINT. Corrected
 * calcium declares 2.0–10.0 mg/dL, which converts to 0.998004–4.99002 mmol/L
 * and used to print at exactly that width. The obvious tidy-up is "1.0–5.0",
 * and it is wrong: 5.0 mmol/L is ABOVE the real ceiling, so the hint would
 * promise a value validation then rejects — the field would be telling the
 * clinician to enter something it refuses. So the lower bound rounds UP and
 * the upper bound rounds DOWN. The printed range is always a subset of the
 * accepted one, never a superset, and a hint can only ever understate what
 * the field takes.
 *
 * Precision is whichever of 3 decimal places or 3 significant figures keeps
 * MORE of the value, because neither alone survives the full spread of bounds
 * in the registry: 3 dp alone flattens a 0.0001 ceiling to 0, and 3 sig figs
 * alone drags a 1234 ceiling down to 1230. Taking the tighter-to-true of the
 * two handles both, and still collapses 10.000000000000002 to 10.
 *
 * ORDER-REVERSING UNITS EXIST, and one ships. QTc's R-R alternates are
 * reciprocal (RR_ms = 60000 / bpm), so the canonical MINIMUM of 30 bpm
 * converts to the R-R MAXIMUM of 2000 ms. Printed in declaration order that
 * reads "Accepted 2000-240 ms".
 *
 * Both halves have to flip together. Which value is the lower BOUND decides
 * which end of the printed range it belongs at, and it also decides which way
 * `roundInward` must round — under a reversing conversion the canonical lower
 * bound becomes the displayed upper one, so rounding it "up" would round it
 * OUTWARD and break the subset contract roundInward exists to keep.
 *
 * Detected by comparing the two converted bounds rather than by asking the
 * unit whether it reverses: a conversion is a pair of functions, and the
 * comparison is the only thing that cannot go stale against a new one.
 *
 * This lived inside the form's field renderer until 2026-09-05, when an
 * external arithmetic audit found the out-of-range ERROR still naming the
 * canonical range ("between 0.21 and 1 fraction") while the caption beside it
 * correctly read "Accepted 21–100 %". Two strings describing one bound in two
 * units is how that happens; one function used by both is how it stops.
 */
export function acceptedBounds(
  input: ScoreInput,
  selectedUnit: string,
): { low: number; high: number } | null {
  if (input.type !== "numeric") return null;
  const convert = (v: number): number | null => fromCanonical(input.unit, v, selectedUnit);
  const bound = (v: number, direction: "up" | "down"): number => {
    const converted = convert(v);
    return converted === null ? v : roundInward(converted, direction);
  };
  const lo = convert(input.min);
  const hi = convert(input.max);
  const reversed = lo !== null && hi !== null && lo > hi;
  const low = reversed ? bound(input.max, "up") : bound(input.min, "up");
  const high = reversed ? bound(input.min, "down") : bound(input.max, "down");
  return { low, high };
}

/** The caption's form: "21–100 %". */
export function acceptedRange(input: ScoreInput, selectedUnit: string): string | null {
  const b = acceptedBounds(input, selectedUnit);
  return b ? `${b.low}–${b.high}${selectedUnit ? ` ${selectedUnit}` : ""}` : null;
}

/**
 * The engine's out-of-range message states the bound in the canonical unit,
 * because the engine does not know which unit is on screen. The form does.
 * When the field is showing an alternate unit, say the range in that unit —
 * the same converted, inward-rounded range the caption prints — so the
 * refusal and the hint can never disagree.
 *
 * Left untouched: every other error code, inputs whose upper bound is
 * exclusive (their message has a different shape and the engine's wording is
 * exact), and fields already in their canonical unit.
 */
export function displayInputError(
  input: ScoreInput,
  selectedUnit: string,
  error: { code: string; message: string },
): string {
  if (error.code !== "out-of-range" || input.type !== "numeric") return error.message;
  if (input.maxExclusive !== undefined || selectedUnit === input.unit.canonical) {
    return error.message;
  }
  const b = acceptedBounds(input, selectedUnit);
  if (!b) return error.message;
  // The engine's own shape — "between A and B unit" — so the two messages read
  // as one voice; only the numbers and the unit differ.
  return `${input.label.en} must be between ${b.low} and ${b.high}${selectedUnit ? ` ${selectedUnit}` : ""}.`;
}
