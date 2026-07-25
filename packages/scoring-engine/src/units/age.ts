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

/** Days → years (÷ 365.25, Julian-year definition). */
export const daysForYears: UnitConversion = {
  unit: "days",
  toCanonical: (days) => days / 365.25,
  fromCanonical: (years) => years * 365.25,
};

/** Age: canonical years, also accepts completed months and days. */
export const ageInYears: UnitSpec = {
  canonical: "years",
  alternates: [monthsForYears, daysForYears],
};
