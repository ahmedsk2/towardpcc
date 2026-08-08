/**
 * Round a converted plausibility bound toward the interior of its own range.
 *
 * WHY A DIRECTION AT ALL. Input bounds are declared in one canonical unit and
 * displayed in whichever unit the clinician picked, so the printed number is a
 * conversion and rarely lands anywhere tidy. Corrected calcium declares
 * 2.0–10.0 mg/dL, which becomes 0.998004–4.99002 mmol/L.
 *
 * The obvious tidy-up is to round both ends to "1.0–5.0". That is wrong in a
 * way worth spelling out: 5.0 mmol/L is ABOVE the true ceiling of 4.99002, so
 * the hint would advertise a value validation then rejects. The field would be
 * instructing the clinician to enter something it refuses, and the rejection
 * message names the CANONICAL bound (2–10 mg/dL), so the two would not even
 * appear to be about the same number.
 *
 * Rounding inward — lower bounds up, upper bounds down — makes the printed
 * range a subset of the accepted range in every case. A hint can then only ever
 * understate what the field takes, which costs a clinician nothing, while the
 * outward error costs them a rejected entry they were told to make.
 *
 * WHY TWO PRECISION RULES. Neither survives the spread of bounds in the
 * registry on its own. Three decimal places flattens a 0.0001 ceiling to 0.
 * Three significant figures drags a 1234 ceiling down to 1230, discarding four
 * units of a legitimate range. Taking whichever result stays closer to the true
 * value handles both, and still collapses the float noise this function was
 * originally added for (`fromCanonical` on 0.01 units/kg/min returns
 * 10.000000000000002 milliunits, which must print as 10).
 *
 * Negative bounds work without a special case: "inward" for a lower bound is
 * always toward zero-and-beyond in the positive direction, which is `ceil`.
 */
export function roundInward(value: number, direction: "up" | "down"): number {
  if (!Number.isFinite(value) || value === 0) return value;

  const at = (decimals: number): number => {
    const factor = 10 ** decimals;
    const scaled = value * factor;
    // Nudge off an exact-integer product that floating point missed by an ulp,
    // so 10.000000000000002 does not round DOWN to 9.999.
    const snapped = Math.abs(scaled - Math.round(scaled)) < 1e-9 ? Math.round(scaled) : scaled;
    return (direction === "up" ? Math.ceil(snapped) : Math.floor(snapped)) / factor;
  };

  const byDecimals = at(3);
  // Decimals needed for three significant figures. Clamped at 0 so a bound of
  // 1234 keeps all four digits instead of becoming 1230.
  const bySigFigs = at(Math.max(0, 2 - Math.floor(Math.log10(Math.abs(value)))));

  // Whichever stayed nearer the true value: the smaller when rounding up, the
  // larger when rounding down. Both are on the safe side of `value` already.
  return direction === "up" ? Math.min(byDecimals, bySigFigs) : Math.max(byDecimals, bySigFigs);
}
