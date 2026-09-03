import type { InterpretationBand, ScoreDefinition } from "./types";

/**
 * Finds the interpretation band for one output value. Each bound's
 * inclusivity is honored (default: min inclusive, max exclusive — see
 * InterpretationBand). Returns the first matching band in definition order.
 */
export function matchInterpretationBand(
  definition: Pick<ScoreDefinition, "interpretation">,
  outputId: string,
  value: number,
): InterpretationBand | undefined {
  return definition.interpretation.find((band) => {
    if (band.appliesTo !== outputId) return false;
    const minInclusive = band.minInclusive ?? true;
    const maxInclusive = band.maxInclusive ?? false;
    // A value that IS the cut-point must be graded as the cut-point.
    //
    // Every band here comes from a published table of decimal thresholds,
    // and the arithmetic that reaches them is binary. An OI of exactly 16
    // computes as 15.999999999999998 from MAP 24, FiO2 0.60, PaO2 90; an
    // OSI of exactly 12 as 11.999999999999998; a P/F of exactly 100 as
    // 100.00000000000001. Compared raw, all three put the patient one band
    // TOO MILD — the under-triage direction, never the reverse — while the
    // page prints the rounded figure and appears to contradict its own
    // label. Found on 2026-09-03 by an independent recompute of every
    // calculator from its published source; it is the same defect as the
    // PRISM 14-day age term, in a different unit.
    //
    // RELATIVE, because the bands span 0.3 mL/kg/h to 600 mmHg and a fixed
    // epsilon cannot serve both.
    //
    // 1e-12 AND NOT 1e-9, which is where this started and which three
    // existing tests immediately rejected: the harness probes the value
    // JUST BELOW a boundary at exactly 1e-9 (harness.ts, EPSILON_FACTOR),
    // so a tolerance of the same size swallowed the probe and reported the
    // upper band for a value deliberately placed in the lower one. The
    // residue being absorbed is ~1e-16 relative, so 1e-12 sits four orders
    // above the noise and three below anything a test or a clinician
    // distinguishes.
    const near = (a: number, b: number) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
    const aboveMin =
      band.min === null ||
      (minInclusive
        ? value >= band.min || near(value, band.min)
        : value > band.min && !near(value, band.min));
    const belowMax =
      band.max === null ||
      (maxInclusive
        ? value <= band.max || near(value, band.max)
        : value < band.max && !near(value, band.max));
    return aboveMin && belowMax;
  });
}
