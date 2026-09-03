import { boundaryValues } from "./harness";
import type { ScoreDefinition } from "../types";

/**
 * A minimal valid input vector, built from each input's own declared domain.
 *
 * Deliberately dumb: it exists to make `compute` return, not to be clinically
 * meaningful. Every caller asserts on ids and structure rather than on values,
 * and nothing here can become stale against a score it does not know about.
 *
 * Lived inside registry-gate.test.ts until 2026-09-03, when the calculator-text
 * dump needed the same vector to enumerate conditional value notices — which
 * are emitted by `calculate` rather than declared, so sweeping is the only way
 * to find them.
 */
export function sampleInputs(s: ScoreDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of s.inputs) {
    if (i.type === "numeric") out[i.id] = { value: i.min, unit: i.unit.canonical };
    else if (i.type === "boolean") out[i.id] = { value: false };
    else out[i.id] = { value: i.options[0]!.value };
  }
  return out;
}

/**
 * The minimal vector, plus one variant per input pushed off its floor.
 *
 * A single all-minimum vector is a weak place to check an arithmetic identity:
 * it can score an undeclared organ 0 and let `0 === 0` pass for it. Moving one
 * input at a time keeps every other term fixed, so any subscore that responds
 * to any input at all is non-zero in at least one vector.
 *
 * Still built only from each input's OWN declared domain — plausibility bounds
 * and declared options — so no vector asserts anything clinical.
 */
export function sweepInputs(s: ScoreDefinition): Record<string, unknown>[] {
  const base = sampleInputs(s);
  const vectors = [base];
  for (const i of s.inputs) {
    if (i.type === "numeric") {
      // The largest ACCEPTED value, which is not `i.max` on an input with a
      // half-open ceiling — pushing 216 at PELOD-2's `maxExclusive: 216` would
      // be rejected, and the vector would silently drop out of the sweep
      // instead of exercising the top of the range it was added for.
      const { bound } = boundaryValues(i, "max");
      vectors.push({ ...base, [i.id]: { value: bound, unit: i.unit.canonical } });
    } else if (i.type === "boolean") {
      vectors.push({ ...base, [i.id]: { value: true } });
    } else {
      for (const o of i.options.slice(1)) vectors.push({ ...base, [i.id]: { value: o.value } });
    }
  }
  return vectors;
}

/**
 * The sweep, plus each vector re-run with ONE optional input dropped.
 *
 * `sweepInputs` supplies every declared input, so a condition of the form
 * "this optional input is absent" is unreachable through it — and that is the
 * shape every `ValueNotice` has, because a notice explains a value an entered
 * figure failed to reach. Required inputs are never dropped: their absence is
 * a rejection, not a result.
 */
export function sweepWithOmissions(s: ScoreDefinition): Record<string, unknown>[] {
  const optional = s.inputs.filter((i) => !i.required).map((i) => i.id);
  return sweepInputs(s).flatMap((vector) => [
    vector,
    ...optional.map((id) => {
      const dropped = { ...vector };
      delete dropped[id];
      return dropped;
    }),
  ]);
}
