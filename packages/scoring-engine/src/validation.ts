import type { InputRejection, NumericValue, ScoreInput } from "./types";
import { toCanonical } from "./units/types";
import { isVisible } from "./visibility";

/**
 * Validates raw values against input declarations and normalizes numeric
 * values to canonical units. Runs before any arithmetic — implausible input
 * is rejected with a message that states the violated bound (PRD §6.3.3).
 */
export function runValidation(
  inputs: readonly ScoreInput[],
  values: Record<string, unknown>,
): { errors: InputRejection[]; canonical: Record<string, unknown> } {
  const errors: InputRejection[] = [];
  const canonical: Record<string, unknown> = {};

  for (const input of inputs) {
    /**
     * A HIDDEN INPUT IS ABSENT, NOT DEFAULTED — and it is skipped HERE, before
     * the required check below, so that `required` means "required when asked".
     * Skipping the loop body is what keeps the id out of `canonical`, and
     * `canonical` is the entire object `calculate` receives (define-score.ts).
     * The browser is therefore not the enforcement point: a UI filter that is
     * forgotten, a shared link, a direct compute() call from a test or a future
     * runtime cannot feed a hidden value in.
     */
    if (!isVisible(input, values)) continue;

    const raw = values[input.id];

    // Treat null like undefined so an explicit null never reaches property
    // access below — compute must reject, never throw (PRD §6.3).
    if (raw === undefined || raw === null) {
      if (input.required) {
        errors.push({
          inputId: input.id,
          code: "missing-required",
          message: `${input.label.en} is required.`,
        });
      }
      continue;
    }

    if (input.type === "numeric") {
      const v = raw as Partial<NumericValue>;
      if (typeof v.value !== "number" || !Number.isFinite(v.value)) {
        errors.push({
          inputId: input.id,
          code: "invalid-type",
          message: `${input.label.en} must be a number.`,
        });
        continue;
      }
      const unit = typeof v.unit === "string" ? v.unit : input.unit.canonical;
      const converted = toCanonical(input.unit, v.value, unit);
      if (converted === null) {
        errors.push({
          inputId: input.id,
          code: "unknown-unit",
          message: `${input.label.en}: unit "${unit}" is not supported (expected ${[
            input.unit.canonical,
            ...(input.unit.alternates?.map((a) => a.unit) ?? []),
          ]
            .filter((u) => u !== "")
            .join(" or ")}).`,
        });
        continue;
      }
      /**
       * THE STRICTER UPPER BOUND WINS, and it decides the wording too.
       *
       * `max` is inclusive and required; `maxExclusive` is optional and rejects
       * its own value. Only one of them can ever be the binding constraint, so
       * this resolves which and then applies it once:
       *
       * - `maxExclusive <= max` — it binds. Everything `max` would reject
       *   (`v > max`) it rejects too, since `v > max >= maxExclusive`.
       * - `maxExclusive > max`, or absent — `max` binds and `maxExclusive` is
       *   inert, because `max` already rejects every value it would.
       *
       * The message must follow, or it misdescribes the bound it enforces:
       * "must be between 0 and 216" is a false statement when 216 is the one
       * value the exclusive bound exists to reject.
       */
      const exclusiveMax =
        input.maxExclusive !== undefined && input.maxExclusive <= input.max
          ? input.maxExclusive
          : undefined;
      const aboveUpperBound =
        exclusiveMax === undefined ? converted > input.max : converted >= exclusiveMax;
      if (converted < input.min || aboveUpperBound) {
        const unitSuffix = input.unit.canonical ? ` ${input.unit.canonical}` : "";
        errors.push({
          inputId: input.id,
          code: "out-of-range",
          message:
            exclusiveMax === undefined
              ? `${input.label.en} must be between ${input.min} and ${input.max}${unitSuffix}.`
              : `${input.label.en} must be at least ${input.min} and less than ${exclusiveMax}${unitSuffix}.`,
        });
        continue;
      }
      canonical[input.id] = { value: converted, unit: input.unit.canonical };
      continue;
    }

    if (input.type === "categorical") {
      const v = raw as { value?: unknown };
      const match = input.options.find((o) => o.value === v.value);
      if (!match) {
        errors.push({
          inputId: input.id,
          code: "invalid-category",
          message: `${input.label.en} must be one of: ${input.options
            .map((o) => o.label.en)
            .join(", ")}.`,
        });
        continue;
      }
      canonical[input.id] = { value: match.value };
      continue;
    }

    const v = raw as { value?: unknown };
    if (typeof v.value !== "boolean") {
      errors.push({
        inputId: input.id,
        code: "invalid-type",
        message: `${input.label.en} must be yes or no.`,
      });
      continue;
    }
    canonical[input.id] = { value: v.value };
  }

  return { errors, canonical };
}
