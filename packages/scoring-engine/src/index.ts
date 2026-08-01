/**
 * TowardPCC scoring engine — pure TypeScript, zero runtime dependencies,
 * no DOM/browser APIs (enforced by tsconfig `lib`/`types` and CI guards).
 * Architecture: docs/decisions/ADR-0002-scoring-engine.md.
 * Note: `testing/*` is deliberately NOT exported — dev-time only.
 */

export const ENGINE_VERSION = "0.2.0";

export type {
  BooleanInput,
  CategoricalInput,
  CategoricalOption,
  ChangelogEntry,
  Composition,
  CompositionComponent,
  ComputeResult,
  InputRejection,
  InputValues,
  InterpretationBand,
  IpStatus,
  NumericInput,
  Reference,
  RejectionCode,
  ScoreCategory,
  ScoreDefinition,
  ScoreInput,
  ScoreResult,
  ScoreStatus,
  ScoreSummary,
  ScoreValue,
  ValidatorSlot,
  ValidatorSlots,
} from "./types";

export { defineScore, type ScoreSpec } from "./define-score";
export { matchInterpretationBand } from "./interpretation";
export { defineText, type LocalizedText } from "./i18n/text";
export {
  NO_UNIT,
  fromCanonical,
  toCanonical,
  type UnitConversion,
  type UnitSpec,
} from "./units/types";
export { KPA_PER_MMHG, cmH2O, kpaForMmhg, mmhgWithKpa } from "./units/pressure";
export { getScore, listScores, registry, type ListScoresFilter } from "./scores/registry";
