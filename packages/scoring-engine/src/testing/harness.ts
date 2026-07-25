import { afterAll, describe, expect, it } from "vitest";
import type {
  InputRejection,
  InputValues,
  NumericInput,
  ScoreDefinition,
  ScoreInput,
} from "../types";
import { matchInterpretationBand } from "../interpretation";

/**
 * Test harness that makes PRD §6.3's absolute rules structural (ADR-0002.7):
 * a score suite cannot pass without cited worked examples and rejection
 * coverage. Dev-time only — not exported from the package barrel.
 */

export interface WorkedExampleSource {
  readonly citation: string;
  readonly pmid?: string;
  readonly doi?: string;
  /** e.g. "Table 2, patient 4" — required when neither pmid nor doi is set. */
  readonly locator?: string;
}

export interface ExpectedValue {
  readonly id: string;
  readonly value: number;
  readonly tolerance?: number;
}

/** Pure guard: a worked example must be traceable or it is not evidence. */
export function assertValidSource(source: WorkedExampleSource): void {
  if (!source.citation || source.citation.trim() === "") {
    throw new Error("workedExample: source.citation must not be empty (PRD §6.3.1).");
  }
  if (!source.pmid && !source.doi && !source.locator) {
    throw new Error(
      "workedExample: source needs a pmid, doi, or locator so the expected value is traceable (PRD §6.3.1).",
    );
  }
}

export interface SuiteState {
  workedExamples: number;
  rejectionInputIds: Set<string>;
}

/** Pure guard: run at suite end; throws when the §6.3 floor is not met. */
export function assertSuiteComplete(
  definition: Pick<ScoreDefinition, "slug" | "inputs">,
  state: SuiteState,
): void {
  if (state.workedExamples === 0) {
    throw new Error(
      `describeScore(${definition.slug}): at least one cited workedExample is required (PRD §6.3.1).`,
    );
  }
  const uncovered = definition.inputs
    .filter((i) => i.required && i.type !== "boolean")
    .map((i) => i.id)
    .filter((id) => !state.rejectionInputIds.has(id));
  if (uncovered.length > 0) {
    throw new Error(
      `describeScore(${definition.slug}): rejectsImplausible missing for required input(s): ${uncovered.join(", ")} (PRD §6.3.3).`,
    );
  }
}

/** Pure guard: boundary tests only make sense for numeric inputs. */
export function resolveNumericInput(
  definition: Pick<ScoreDefinition, "inputs">,
  inputId: string,
): NumericInput {
  const input = definition.inputs.find((i) => i.id === inputId);
  if (!input || input.type !== "numeric") {
    throw new Error(`boundaryTest: "${inputId}" is not a numeric input.`);
  }
  return input;
}

export interface ScoreTestContext<TInputs extends readonly ScoreInput[]> {
  workedExample(
    source: WorkedExampleSource,
    inputs: InputValues<TInputs>,
    expected: readonly ExpectedValue[],
  ): void;
  /** Asserts ok at the bound and out-of-range rejection just past it. */
  boundaryTest(
    inputId: TInputs[number]["id"],
    edge: "min" | "max",
    baseInputs: InputValues<TInputs>,
  ): void;
  rejectsImplausible(
    label: string,
    inputs: InputValues<TInputs>,
    expected: { inputId: string; code: InputRejection["code"] },
  ): void;
  /** Asserts the band switch happens exactly at the shared boundary value. */
  interpretationBoundary(
    outputId: string,
    boundaryValue: number,
    bandBelowId: string,
    bandAtId: string,
  ): void;
}

const EPSILON_FACTOR = 1e-9;

export function describeScore<TInputs extends readonly ScoreInput[]>(
  definition: ScoreDefinition<TInputs>,
  suite: (ctx: ScoreTestContext<TInputs>) => void,
): void {
  const state: SuiteState = { workedExamples: 0, rejectionInputIds: new Set() };

  describe(`${definition.name} (${definition.slug} v${definition.version})`, () => {
    const ctx: ScoreTestContext<TInputs> = {
      workedExample(source, inputs, expected) {
        assertValidSource(source);
        state.workedExamples += 1;
        it(`worked example — ${source.citation}${source.locator ? ` (${source.locator})` : ""}`, () => {
          const outcome = definition.compute(inputs);
          expect(outcome.ok, outcome.ok ? "" : JSON.stringify(outcome.errors)).toBe(true);
          if (!outcome.ok) return;
          for (const exp of expected) {
            const actual = outcome.result.values.find((v) => v.id === exp.id);
            expect(actual, `output "${exp.id}" missing`).toBeDefined();
            if (exp.tolerance !== undefined) {
              expect(Math.abs((actual?.value ?? Number.NaN) - exp.value)).toBeLessThanOrEqual(
                exp.tolerance,
              );
            } else {
              expect(actual?.value).toBe(exp.value);
            }
          }
        });
      },

      boundaryTest(inputId, edge, baseInputs) {
        const input = resolveNumericInput(definition, inputId as string);
        const bound = edge === "min" ? input.min : input.max;
        const past =
          edge === "min"
            ? input.min - Math.max(Math.abs(input.min) * EPSILON_FACTOR, 1e-6)
            : input.max + Math.max(Math.abs(input.max) * EPSILON_FACTOR, 1e-6);
        state.rejectionInputIds.add(input.id);

        it(`${input.id} computes at ${edge} bound (${bound} ${input.unit.canonical})`, () => {
          const values = {
            ...(baseInputs as Record<string, unknown>),
            [input.id]: { value: bound, unit: input.unit.canonical },
          } as InputValues<TInputs>;
          expect(definition.compute(values).ok).toBe(true);
        });
        it(`${input.id} rejects just past ${edge} bound`, () => {
          const values = {
            ...(baseInputs as Record<string, unknown>),
            [input.id]: { value: past, unit: input.unit.canonical },
          } as InputValues<TInputs>;
          const outcome = definition.compute(values);
          expect(outcome.ok).toBe(false);
          if (outcome.ok) return;
          expect(
            outcome.errors.some((e) => e.inputId === input.id && e.code === "out-of-range"),
          ).toBe(true);
        });
      },

      rejectsImplausible(label, inputs, expected) {
        state.rejectionInputIds.add(expected.inputId);
        it(`rejects ${label}`, () => {
          const outcome = definition.compute(inputs);
          expect(outcome.ok).toBe(false);
          if (outcome.ok) return;
          const err = outcome.errors.find((e) => e.inputId === expected.inputId);
          expect(err, `no rejection for input "${expected.inputId}"`).toBeDefined();
          expect(err?.code).toBe(expected.code);
          expect(err?.message.length ?? 0).toBeGreaterThan(0);
        });
      },

      interpretationBoundary(outputId, boundaryValue, bandBelowId, bandAtId) {
        it(`interpretation switches ${bandBelowId} -> ${bandAtId} at ${outputId}=${boundaryValue}`, () => {
          const justBelow =
            boundaryValue - Math.max(Math.abs(boundaryValue) * EPSILON_FACTOR, 1e-9);
          expect(matchInterpretationBand(definition, outputId, justBelow)?.id).toBe(bandBelowId);
          expect(matchInterpretationBand(definition, outputId, boundaryValue)?.id).toBe(bandAtId);
        });
      },
    };

    suite(ctx);

    afterAll(() => {
      assertSuiteComplete(definition, state);
    });
  });
}
