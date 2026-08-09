import type { ScoreInput } from "./types";

/**
 * Whether an input is asked, given the values submitted in the same call.
 *
 * Evaluated against the RAW submitted values rather than the canonical ones, so
 * it does not depend on declaration order: every input's visibility is decided
 * from the same snapshot, whatever order they are declared or arrive in.
 *
 * An unanswered, absent or malformed controller HIDES its dependents. That is
 * the safe direction: on the only score that uses this today the controller is
 * `required: true`, so a missing one already fails the whole compute with
 * `missing-required`, and hiding rather than showing can only ever withhold a
 * number — never invent one.
 */
export function isVisible(input: ScoreInput, values: Record<string, unknown>): boolean {
  const cond = input.showWhen;
  if (!cond) return true;
  const raw = values[cond.input];
  if (raw === undefined || raw === null) return false;
  const v = (raw as { value?: unknown }).value;
  return typeof v === "string" && cond.equals.includes(v);
}

/**
 * The inputs a form should render, and the only ones any consumer may read.
 *
 * Exported from the barrel so the web form calls the same function the engine
 * runs. A second implementation in the UI would drift silently: the form's
 * `compute` call casts through `as never`, so typecheck cannot see a mismatch
 * between what renders and what is computed.
 */
export function visibleInputs(
  inputs: readonly ScoreInput[],
  values: Record<string, unknown>,
): readonly ScoreInput[] {
  return inputs.filter((i) => isVisible(i, values));
}
