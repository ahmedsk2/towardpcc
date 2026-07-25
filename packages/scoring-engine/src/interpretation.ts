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
    const aboveMin = band.min === null || (minInclusive ? value >= band.min : value > band.min);
    const belowMax = band.max === null || (maxInclusive ? value <= band.max : value < band.max);
    return aboveMin && belowMax;
  });
}
