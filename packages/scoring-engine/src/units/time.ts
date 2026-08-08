import type { UnitConversion, UnitSpec } from "./types";

/**
 * Elapsed clinical time.
 *
 * Hours are canonical because every guideline that measures a resuscitation
 * window states it in hours — the burn 8-hour and 24-hour phases, the KDIGO
 * 6/12/24-hour urine-output windows, the PRISM collection windows. Minutes are
 * the alternate because that is how a burn time is actually recorded and
 * subtracted at a bedside: "burn at 14:20, now 17:05" is 165 minutes before it
 * is 2.75 hours, and making the clinician do that division by hand is the
 * category of hand-arithmetic this unit exists to remove.
 *
 * NO `canonicalDecimals`, deliberately. Per packages/scoring-engine/CLAUDE.md
 * it is set only when the guideline itself prints an alternate-unit equivalent
 * of its own cutoff — as KDIGO does for creatinine. No source here prints an
 * "8 hours (480 minutes)" restatement, so rounding a converted value would be
 * this project inventing a precision the literature does not state.
 */
export const minutesForHours: UnitConversion = {
  unit: "min",
  toCanonical: (minutes) => minutes / 60,
  fromCanonical: (hours) => hours * 60,
};

/** Elapsed time: canonical hours, accepts minutes. */
export const hoursWithMinutes: UnitSpec = {
  canonical: "h",
  alternates: [minutesForHours],
};
