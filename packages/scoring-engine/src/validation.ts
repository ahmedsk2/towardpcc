import type { InputRejection, NumericValue, ScoreInput } from "./types";
import { toCanonical } from "./units/types";

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
    const raw = values[input.id];

    if (raw === undefined) {
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
      if (converted < input.min || converted > input.max) {
        const unitSuffix = input.unit.canonical ? ` ${input.unit.canonical}` : "";
        errors.push({
          inputId: input.id,
          code: "out-of-range",
          message: `${input.label.en} must be between ${input.min} and ${input.max}${unitSuffix}.`,
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
