import type { InterpretationBand, ScoreDefinition } from "./types";

/**
 * Finds the interpretation band for one output value.
 * Bands are [min, max) intervals; null bounds are open-ended.
 */
export function matchInterpretationBand(
  definition: Pick<ScoreDefinition, "interpretation">,
  outputId: string,
  value: number,
): InterpretationBand | undefined {
  return definition.interpretation.find(
    (band) =>
      band.appliesTo === outputId &&
      (band.min === null || value >= band.min) &&
      (band.max === null || value < band.max),
  );
}
