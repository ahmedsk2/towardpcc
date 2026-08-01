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
  /**
   * Section heading, for scores long enough that declaration order stops being
   * navigable.
   *
   * PRISM has 26 inputs and renders as one undifferentiated column with no
   * landmark and no sense of progress — while the structure is right there in
   * the data: neurological, haemodynamic, acid-base, chemistry, haematology.
   * Grouping also puts the min/max worst-value pairs next to each other instead
   * of eight rows apart, which is how they are collected at the bedside.
   *
   * OPTIONAL, and ungrouped inputs render as one implicit leading section, so
   * annotating a score is additive and can never break one that is not.
   */
  readonly group?: LocalizedText;
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

/**
 * How a composite total decomposes into named parts.
 *
 * The maxima live HERE, on the definition, rather than on the emitted
 * `ScoreValue` — a pSOFA respiratory subscore is 0–4 because the instrument
 * says so, not because of anything the patient's numbers did. Declaring it once
 * keeps `calculate()` free of repeated constants and gives `registry-gate` a
 * fixed thing to check every worked example against.
 *
 * `min` exists for the paediatric GCS, whose components are 1–4, 1–5 and 1–6
 * and never 0. A proportion bar drawn from zero would render a motor score of 1
 * as a sixth of its range when it is in fact the floor.
 */
export interface CompositionComponent {
  /** Must match a `ScoreValue.id` the score emits. */
  readonly id: string;
  /** Instrument maximum for this component. */
  readonly max: number;
  /** Instrument minimum. Defaults to 0 when absent. */
  readonly min?: number | undefined;
}

export interface Composition {
  /** Must match the `ScoreValue.id` carrying the total. */
  readonly total: string;
  readonly components: readonly CompositionComponent[];
}

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
   * on that therapy) rather than omitted — pSOFA, Phoenix and VIS. The
   * calculator UI shows a partial-result cue for these so a clinician never
   * mistakes a not-yet-complete entry for a genuinely low score. Absent/false
   * means every input either is required or simply adds detail when supplied.
   *
   * PELOD-2 is deliberately NOT flagged, and the reason matters. Its published
   * form (Leteurtre 2013, Table 6 footnote a) does score an unmeasured variable
   * as normal — but this implementation declares all 11 inputs required and
   * rejects a blank outright rather than scoring it 0, so the flag's predicate
   * ("a blank NON-REQUIRED input") is vacuous for it and the cue could never
   * fire. Setting it here would be inert and untrue.
   *
   * That does not make PELOD-2 hazard-free: its `notes` instruct the caller to
   * supply a normal value for anything unmeasured, so the falsely-low score
   * this flag guards against is still reachable — by the clinician's hand
   * rather than the engine's. PELOD-2 states this in `notes`, which the detail
   * page renders — so it is disclosed, but in prose below the result rather
   * than beside it. Any score whose `notes` carry a result-invalidating caveat
   * belongs in the page's Cautions treatment, not only in the prose section.
   * PIM3 is likewise unflagged: it imputes model-specific defaults, not
   * "normal" values.
   */
  readonly missingAsNormal?: boolean;
  /**
   * Result-invalidating caveats, rendered BESIDE the number rather than in the
   * prose below it.
   *
   * `missingAsNormal` above names the gap this closes: a score whose notes
   * carry a caveat that can make the number wrong belongs in the page's
   * cautions treatment, not only in a Limitations tab a reader has to open.
   * PELOD-2 is the case — it rejects blanks, correctly, but its notes instruct
   * the caller to supply a normal value for anything unmeasured, so a falsely
   * low score is still reachable by the clinician's hand.
   *
   * Rendered amber with a non-colour marker, never crimson: in this palette
   * crimson is the brand and must never mean error.
   */
  readonly cautions?: readonly LocalizedText[];
  /**
   * Why this score has no interpretation bands.
   *
   * Thirteen of the shipped scores declare `interpretation: []` and render
   * identical silence. For BSA, ideal body weight and ETT size that silence is
   * correct — they are estimators and a band would be an invention. For PIM3,
   * PRISM and PELOD-2 it is a content gap. Rendering the same nothing for both
   * tells the reader the same thing about two different situations, and one of
   * those things is untrue.
   *
   * Defaults to "not-applicable", so a score that says nothing is claiming the
   * estimator case — which is right for the majority and wrong only where it
   * has been explicitly corrected to "pending".
   */
  readonly interpretationStatus?: "not-applicable" | "pending";
  /** Clinical limitations, caveats, and any [NEEDS SOURCE] gaps. */
  readonly notes: LocalizedText;
  /**
   * Present only on scores whose total is the sum of named parts. Absent means
   * "not a composite" — the result panel then renders exactly as it does today.
   */
  readonly composition?: Composition;
}

export interface ScoreSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly version: string;
  readonly status: ScoreStatus;
  readonly category: ScoreCategory;
}
