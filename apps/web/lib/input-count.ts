import type { ScoreDefinition } from "@towardpcc/scoring-engine";

/**
 * How many fields a score puts on screen, as a claim that is true on every
 * screen it can produce.
 *
 * A score whose inputs all render unconditionally has one honest number. A
 * score that asks conditionally has two, and publishing either alone is false
 * in one direction: PRISM shows 26 fields on the 4-hour window and 22 on the
 * other two, so `26 inputs` overstates what is ever on screen at once while
 * `22 inputs` understates it.
 *
 * DERIVED FROM THE DEFINITION, never written down. `/calculators` says in its
 * own comment that "the index can never claim a shape the calculator does not
 * actually have" — a hand-maintained range would be exactly that claim, one
 * `showWhen` away from going stale.
 *
 * Both surfaces that publish this — the index card and the nav flyout — call
 * the same function, so they cannot disagree with each other either.
 */
export function inputCountRange(definition: ScoreDefinition): { min: number; max: number } {
  return {
    min: definition.inputs.filter((i) => !i.showWhen).length,
    max: definition.inputs.length,
  };
}

/** The range as the site renders it: "17 inputs", or "22–26 inputs". */
export function inputCountLabel(definition: ScoreDefinition): string {
  const { min, max } = inputCountRange(definition);
  if (min === max) return `${max} input${max === 1 ? "" : "s"}`;
  // An en dash, matching how ranges are set everywhere else on the site.
  return `${min}–${max} inputs`;
}
