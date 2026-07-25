import type { ComputeResult, InputValues, ScoreDefinition, ScoreInput, ScoreValue } from "./types";
import { runValidation } from "./validation";

export interface ScoreSpec<TInputs extends readonly ScoreInput[]> extends Omit<
  ScoreDefinition<TInputs>,
  "compute"
> {
  /**
   * Pure arithmetic over canonical-unit, already-validated values.
   * Validation and unit normalization happen in the wrapper — a score
   * author cannot forget them (ADR-0002 decision 2).
   */
  readonly calculate: (canonicalValues: InputValues<TInputs>) => readonly ScoreValue[];
}

export function defineScore<const TInputs extends readonly ScoreInput[]>(
  spec: ScoreSpec<TInputs>,
): ScoreDefinition<TInputs> {
  const { calculate, ...definition } = spec;
  return {
    ...definition,
    compute: (values: InputValues<TInputs>): ComputeResult => {
      const { errors, canonical } = runValidation(spec.inputs, values as Record<string, unknown>);
      if (errors.length > 0) return { ok: false, errors };
      return { ok: true, result: { values: calculate(canonical as InputValues<TInputs>) } };
    },
  };
}
