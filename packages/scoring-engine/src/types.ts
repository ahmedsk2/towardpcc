import type { LocalizedText } from "./i18n/text";
import type { UnitSpec } from "./units/types";

export type ScoreCategory =
  | "mortality-severity"
  | "organ-dysfunction"
  | "sepsis"
  | "respiratory"
  | "sedation-analgesia-withdrawal"
  | "fluids-resuscitation"
  | "airway-equipment"
  | "renal-metabolic"
  | "general";

export type ScoreStatus = "draft" | "published";

interface InputBase {
  readonly id: string;
  readonly label: LocalizedText;
  readonly required: boolean;
  readonly helpText?: LocalizedText;
}

export interface NumericInput extends InputBase {
  readonly type: "numeric";
  readonly unit: UnitSpec;
  /** Plausibility bounds in the canonical unit — outside them we reject, never compute. */
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

export interface CategoricalOption {
  readonly value: string;
  readonly label: LocalizedText;
}

export interface CategoricalInput extends InputBase {
  readonly type: "categorical";
  readonly options: readonly CategoricalOption[];
}

export interface BooleanInput extends InputBase {
  readonly type: "boolean";
}

export type ScoreInput = NumericInput | CategoricalInput | BooleanInput;

export type NumericValue = { readonly value: number; readonly unit: string };
export type CategoricalValue<I extends CategoricalInput = CategoricalInput> = {
  readonly value: I["options"][number]["value"];
};
export type BooleanValue = { readonly value: boolean };

type ValueForInput<I extends ScoreInput> = I extends NumericInput
  ? NumericValue
  : I extends CategoricalInput
    ? CategoricalValue<I>
    : BooleanValue;

/**
 * Maps literal input ids to value shapes: required ids are mandatory keys,
 * optional ids are omittable (`?:` — correct under exactOptionalPropertyTypes;
 * "not provided" means the key is absent, never an explicit undefined).
 * Inputs must be declared `as const` so ids stay literal.
 */
export type InputValues<TInputs extends readonly ScoreInput[]> = {
  readonly [I in TInputs[number] as I["required"] extends true ? I["id"] : never]: ValueForInput<I>;
} & {
  readonly [
    I in TInputs[number] as I["required"] extends true ? never : I["id"]
  ]?: ValueForInput<I>;
};

export interface ScoreValue {
  readonly id: string;
  readonly label: LocalizedText;
  /** Integer when precision === 0. */
  readonly value: number;
  /** "" for dimensionless values and points. */
  readonly unit: string;
  readonly precision: number;
}

export interface ScoreResult {
  readonly values: readonly ScoreValue[];
}

export type RejectionCode =
  "out-of-range" | "missing-required" | "invalid-category" | "invalid-type" | "unknown-unit";

export interface InputRejection {
  readonly inputId: string;
  readonly code: RejectionCode;
  /** Plain English; states the violated bound so the fix is obvious. */
  readonly message: string;
}

export type ComputeResult<TResult = ScoreResult> =
  | { readonly ok: true; readonly result: TResult }
  | { readonly ok: false; readonly errors: readonly InputRejection[] };

export interface InterpretationBand {
  readonly id: string;
  /** The ScoreValue.id this band evaluates. */
  readonly appliesTo: string;
  /** null means unbounded on that side. */
  readonly min: number | null;
  readonly max: number | null;
  /**
   * Boundary inclusivity. Defaults model an ascending "≥ threshold" score
   * (min inclusive, max exclusive → [min, max)) — correct for point/index
   * scores where higher is worse. Descending "≤ threshold" scores (P/F, S/F,
   * where lower is worse and the cutpoint belongs to the worse band) set
   * `minInclusive: false, maxInclusive: true` → (min, max].
   */
  readonly minInclusive?: boolean;
  readonly maxInclusive?: boolean;
  readonly label: LocalizedText;
  /** Non-directive wording (PRD §6.3): supports judgment, never directs care. */
  readonly description: LocalizedText;
}

interface ReferenceBase {
  readonly citation: string;
  readonly note?: string;
}

/** At least one locator (pmid/doi/url) by construction. */
export type Reference =
  | (ReferenceBase & { readonly pmid: string; readonly doi?: string })
  | (ReferenceBase & { readonly doi: string; readonly pmid?: string })
  | (ReferenceBase & { readonly url: string });

export type ValidatorSlot =
  | { readonly status: "pending" }
  | {
      readonly status: "assigned";
      readonly name: string;
      readonly credentials: string;
      readonly date: string;
    };

/** Exactly two slots, compile-enforced (PRD §1 locked decision). */
export type ValidatorSlots = readonly [ValidatorSlot, ValidatorSlot];

export interface ChangelogEntry {
  readonly version: string;
  readonly date: string;
  readonly summary: string;
  readonly reason?: "initial-release" | "formula-correction" | "new-reference" | "clarification";
}

export type IpStatus =
  | { readonly kind: "original-formula" }
  | { readonly kind: "freely-reproducible"; readonly evidence: string }
  | { readonly kind: "permission-required"; readonly rightsHolder: string; readonly note: string }
  | {
      readonly kind: "permission-obtained";
      readonly rightsHolder: string;
      readonly grantedDate: string;
    };

export interface ScoreDefinition<TInputs extends readonly ScoreInput[] = readonly ScoreInput[]> {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly version: string;
  readonly status: ScoreStatus;
  readonly category: ScoreCategory;
  readonly inputs: TInputs;
  readonly compute: (values: InputValues<TInputs>) => ComputeResult;
  readonly interpretation: readonly InterpretationBand[];
  readonly references: readonly Reference[];
  readonly validators: ValidatorSlots;
  readonly changelog: readonly ChangelogEntry[];
  readonly ipStatus: IpStatus;
  /**
   * How the score is computed, in plain words (PRD §6.4 formula transparency).
   * Optional for now; where absent the detail page falls back to `notes`.
   */
  readonly formula?: LocalizedText;
  /**
   * True when a blank non-required input is scored as normal (0 points / not
   * on that therapy) rather than omitted — the additive organ-dysfunction and
   * vasoactive composites (PELOD-2, pSOFA, Phoenix, VIS). The calculator UI
   * shows a partial-result cue for these so a clinician never mistakes a
   * not-yet-complete entry for a genuinely low score. Absent/false means every
   * input either is required or simply adds detail when supplied.
   */
  readonly missingAsNormal?: boolean;
  /** Clinical limitations, caveats, and any [NEEDS SOURCE] gaps. */
  readonly notes: LocalizedText;
}

export interface ScoreSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly version: string;
  readonly status: ScoreStatus;
  readonly category: ScoreCategory;
}
