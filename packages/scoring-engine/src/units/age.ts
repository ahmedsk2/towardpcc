import type { UnitConversion, UnitSpec } from "./types";

/**
 * Age expressed in years (canonical) for pediatric age-based formulas
 * (ETT sizing, APLS weight, etc.). The alternates are calendar-definitional
 * conversions only — 1 year = 12 months, 1 year = 365.25 days (Julian year) —
 * i.e. arithmetic/calendar facts, not clinical thresholds. The research uses
 * the same conversions (docs/research/scores/ett-size.md, inputs table:
 * "years; months ÷ 12, days ÷ 365.25").
 */

/** Completed months → years (÷ 12). */
export const monthsForYears: UnitConversion = {
  unit: "months",
  toCanonical: (months) => months / 12,
  fromCanonical: (years) => years * 12,
};

/**
 * A whole-year birthday, in days, is a whole number of years.
 *
 * 365.25 is the average length of a Gregorian four-year cycle, so the day
 * count of a true Nth birthday differs from N × 365.25 by at most 0.75 days in
 * either direction — 2191 days is a sixth birthday and divides to 5.9986, and
 * 3652 days is a tenth and divides to 9.9986. Left as they are, every consumer
 * that floors or bands on whole years reads the child as a year younger:
 * measured 2026-09-03, APLS returned 18 kg for that six-year-old where the
 * band table gives 25, ETT's tie-break flipped a tube size, and KDIGO's
 * under-18 eGFR route stayed open on an eighteenth birthday.
 *
 * THE TOLERANCE IS THE DRIFT, not a guess: one day is the smallest window that
 * captures every real birthday, because the drift is bounded at 0.75 days, and
 * it reaches no further than the ±1-day uncertainty an age given in days
 * already carries. What it costs is that a child less than a day short of a
 * birthday can be counted as having reached it. What it replaces is being a
 * whole YEAR wrong on the birthday itself, which is the case a clinician
 * actually types.
 *
 * Applies ONLY within a day of a whole year. An age of 14 days, 400 days or
 * 18 months is untouched, so PRISM's day-level neonatal bands and every
 * fractional age keep their exact converted value.
 */
const DAYS_PER_YEAR = 365.25;

export const daysForYears: UnitConversion = {
  unit: "days",
  toCanonical: (days) => {
    const years = days / DAYS_PER_YEAR;
    const nearest = Math.round(years);
    // NEVER TOWARDS ZERO. Snapping to 0 would flatten every age under about
    // a day and a half into a newborn, and it broke the days round-trip on
    // 0.5, 1, 4, 8 and 12 days — an existing test caught it. Only a whole
    // year of one or more is a birthday worth snapping to.
    if (nearest < 1) return years;
    return Math.abs(days - nearest * DAYS_PER_YEAR) <= 1 ? nearest : years;
  },
  fromCanonical: (years) => years * DAYS_PER_YEAR,
};

/** Age: canonical years, also accepts completed months and days. */
export const ageInYears: UnitSpec = {
  canonical: "years",
  alternates: [monthsForYears, daysForYears],
};
