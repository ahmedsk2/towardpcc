"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ComputeResult,
  InterpretationBand,
  ScoreDefinition,
  ScoreInput,
} from "@towardpcc/scoring-engine";
import { getScore, matchInterpretationBand } from "@towardpcc/scoring-engine";
import { Callout, cn } from "@towardpcc/ui";
import { site } from "@/content/site";

const c = site.calculators;

/** Raw field state — strings for numerics (so the box can be empty), plus a chosen unit. */
type Field = { raw: string; unit?: string | undefined };
type FieldState = Record<string, Field>;

function unitOptions(input: ScoreInput): string[] {
  if (input.type !== "numeric") return [];
  const alts = input.unit.alternates?.map((a) => a.unit) ?? [];
  return input.unit.canonical ? [input.unit.canonical, ...alts] : alts;
}

function initialState(inputs: readonly ScoreInput[]): FieldState {
  const s: FieldState = {};
  for (const input of inputs) {
    s[input.id] =
      input.type === "numeric" ? { raw: "", unit: input.unit.canonical || undefined } : { raw: "" };
  }
  return s;
}

/** Compact URL-fragment encoding: id=value~unit joined by ';'. Never the query string (PRD §6.4). */
function encodeFragment(state: FieldState): string {
  const parts = Object.entries(state)
    .filter(([, v]) => v.raw !== "")
    .map(([id, v]) => {
      const val = encodeURIComponent(v.raw);
      return v.unit ? `${id}=${val}~${encodeURIComponent(v.unit)}` : `${id}=${val}`;
    });
  return parts.join(";");
}

function decodeFragment(hash: string, inputs: readonly ScoreInput[]): FieldState {
  const state = initialState(inputs);
  const clean = hash.replace(/^#/, "");
  if (!clean) return state;
  // A shared or corrupted link may carry a malformed percent-escape; a bad
  // fragment must degrade to an empty form, never throw.
  try {
    for (const pair of clean.split(";")) {
      const [id, rest] = pair.split("=");
      if (!id || rest === undefined || !(id in state)) continue;
      const [value, unit] = rest.split("~");
      const existing = state[id];
      if (!existing) continue;
      state[id] = {
        raw: decodeURIComponent(value ?? ""),
        ...(unit
          ? { unit: decodeURIComponent(unit) }
          : existing.unit
            ? { unit: existing.unit }
            : {}),
      };
    }
  } catch {
    return initialState(inputs);
  }
  return state;
}

/** Build the typed values object the engine expects from raw field state. */
function toComputeInput(inputs: readonly ScoreInput[], state: FieldState): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const input of inputs) {
    const field = state[input.id];
    if (!field || field.raw === "") continue;
    if (input.type === "numeric") {
      values[input.id] = { value: Number(field.raw), unit: field.unit ?? input.unit.canonical };
    } else if (input.type === "categorical") {
      values[input.id] = { value: field.raw };
    } else {
      values[input.id] = { value: field.raw === "true" };
    }
  }
  return values;
}

function anyEntered(inputs: readonly ScoreInput[], state: FieldState): boolean {
  return inputs.some((i) => state[i.id]?.raw !== "");
}

/**
 * Client-side calculator. Takes only the slug (a string) and resolves the
 * score itself, so the compute function and unit conversions live in the
 * browser — never serialized across the RSC boundary, and never sent to the
 * server. This is what makes the "nothing you enter is transmitted" promise
 * architecturally true (PRD §6.4).
 */
export function CalculatorForm({ slug, children }: { slug: string; children?: React.ReactNode }) {
  const definition = useMemo(() => getScore(slug), [slug]);
  if (!definition) return null;
  return <CalculatorFormInner definition={definition}>{children}</CalculatorFormInner>;
}

function CalculatorFormInner({
  definition,
  children,
}: {
  definition: ScoreDefinition;
  children?: React.ReactNode;
}) {
  const { inputs } = definition;
  const [state, setState] = useState<FieldState>(() => initialState(inputs));
  const [copied, setCopied] = useState(false);

  // Hydrate from the URL fragment once on mount. Reading the hash in the
  // state initializer would diverge from the server render (no window there)
  // and cause a hydration mismatch, so the post-mount setState is correct
  // and intentional here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.location.hash) setState(decodeFragment(window.location.hash, inputs));
  }, [inputs]);

  // Mirror state into the fragment as the user types (replaceState — no history spam).
  useEffect(() => {
    const frag = encodeFragment(state);
    const url = `${window.location.pathname}${window.location.search}${frag ? `#${frag}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [state]);

  const setField = useCallback((id: string, patch: { raw?: string; unit?: string }) => {
    setState((prev) => {
      const existing = prev[id] ?? { raw: "" };
      return { ...prev, [id]: { ...existing, ...patch } };
    });
    setCopied(false);
  }, []);

  const outcome: ComputeResult | null = useMemo(() => {
    if (!anyEntered(inputs, state)) return null;
    return definition.compute(toComputeInput(inputs, state) as never);
  }, [definition, inputs, state]);

  const errorsById = useMemo(() => {
    const m = new Map<string, string>();
    if (outcome && !outcome.ok) for (const e of outcome.errors) m.set(e.inputId, e.message);
    return m;
  }, [outcome]);

  // Honest partial-result cue (PRD §6.4): additive composites (pSOFA, Phoenix,
  // VIS) score a blank component as normal, so a not-yet-complete entry can read
  // falsely low. Flag it whenever such a score computes with an optional field
  // still blank, so the number is never mistaken for a complete assessment.
  const showPartialCue = useMemo(() => {
    if (!definition.missingAsNormal || !outcome?.ok) return false;
    return inputs.some((i) => !i.required && (state[i.id]?.raw ?? "") === "");
  }, [definition.missingAsNormal, outcome, inputs, state]);

  const copySummary = useCallback(() => {
    if (!outcome || !outcome.ok) return;
    const lines = [
      definition.name,
      ...outcome.result.values.map((v) => {
        const band = matchInterpretationBand(definition, v.id, v.value);
        const num = `${v.label.en}: ${v.value.toFixed(v.precision)}${v.unit ? ` ${v.unit}` : ""}`;
        return band ? `${num} (${band.label.en})` : num;
      }),
      `${definition.name} v${definition.version} · towardpcc.com`,
    ];
    // Clipboard can reject (denied permission / insecure context); swallow it so
    // there's no unhandled rejection and the button simply doesn't flip to "copied".
    void navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [definition, outcome]);

  return (
    /**
     * Three grid items in the order form → result → reference, placed
     * explicitly on large screens and left to flow on small ones.
     *
     * The DOM order is the mobile order, and it is the reason for this shape.
     * The reference content used to sit in the same column wrapper as the form,
     * which on one column put the whole formula/limitations/evidence zone
     * BETWEEN the last input and the answer: on a phone you typed a value and
     * then scrolled past everything to find out what it computed.
     *
     * Moving it out cannot go back to the original arrangement either, where
     * the grid held only the inputs. A sticky element travels within its own
     * grid area, so a two-input score gave the result rail 11px of travel on a
     * 2443px page and the answer scrolled away almost immediately. Spanning the
     * rail across both rows restores the full-page travel while leaving the
     * reference content after it in source order.
     *
     * The children are server components, slotted in here, so nothing extra
     * crosses the RSC boundary.
     */
    /* gap-y-12 rather than a uniform gap-8, and ScoreTabs no longer carries its
       own mt-12. Introducing a second grid row turned gap-8 into a ROW gap that
       stacked on that margin, leaving an 80px dead band between the answer and
       the reference zone on a phone. One source of vertical rhythm, not two. */
    <div className="grid items-start gap-x-8 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form
        className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1"
        noValidate
        aria-label={definition.name}
      >
        {inputs.map((input) => (
          <InputField
            key={input.id}
            input={input}
            field={state[input.id] ?? { raw: "" }}
            error={errorsById.get(input.id)}
            onChange={(patch) => setField(input.id, patch)}
            missingAsNormal={Boolean(definition.missingAsNormal)}
          />
        ))}
      </form>

      <ResultPanel
        definition={definition}
        outcome={outcome}
        copied={copied}
        onCopy={copySummary}
        showPartialCue={showPartialCue}
        className="lg:col-start-2 lg:row-start-1 lg:row-span-2"
      />

      <div className="min-w-0 lg:col-start-1 lg:row-start-2">{children}</div>
    </div>
  );
}

type OptionModel = { value: string; label: string };

/**
 * Whether a unit list can be shown as visible segments instead of a dropdown.
 *
 * Not "is it two options" — that premise breaks on the corpus. `unitsPerKgPerMin`
 * pairs `units/kg/min` with `milliunits/kg/min` (12 and 17 characters), whose own
 * doc-comment calls it a documented 1000x error trap; truncating either of those
 * to fit a segment would be the worst possible place to save space. So the rule
 * is written on length: two segments up to 6 characters, or three up to 3.
 * Everything longer keeps the dropdown, which can show the full string.
 */
function unitsFitASegmentedToggle(units: readonly string[]): boolean {
  const longest = Math.max(...units.map((u) => u.length));
  return (units.length === 2 && longest <= 6) || (units.length === 3 && longest <= 3);
}

/**
 * One option: a real `<input type="radio">` with the chrome hidden and the
 * `<label>` carrying the visible treatment.
 *
 * The radio is present rather than simulated, so arrow-key navigation,
 * selection-follows-focus, the single tab stop for the whole group, and form
 * semantics are the browser's job rather than ours. `role="listbox"` would have
 * implied a popup and handed us every keyboard behaviour to reimplement.
 *
 * Selected state carries FOUR cues, because `accent-tint` is #fff2ee — 1.10:1
 * against white, and byte-identical to `surface-sunken`. It is invisible on its
 * own and cannot mean anything by itself (WCAG 1.4.1). So: the radio dot fills
 * (shape), the border goes crimson at a constant 2px (never 1px to 2px, which
 * would shift every row by 2px), the label goes medium weight, and the tint
 * arrives last as reinforcement rather than as the signal.
 *
 * Hover moves the BORDER, not the fill. `hover:bg-surface-sunken` would paint an
 * unselected row #fff2ee — the selected fill exactly — so hovering would read as
 * selecting.
 */
function OptionControl({
  name,
  option,
  selected,
  horizontal,
  invalid,
  onSelect,
}: {
  name: string;
  option: OptionModel;
  selected: boolean;
  horizontal: boolean;
  invalid: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      data-opt=""
      {...(selected ? { "data-selected": "" } : {})}
      /* No colour in the base string. `cn` here concatenates, it does not merge
         Tailwind conflicts, so a `bg-*` in the base and another in the state
         branch both land on the element and the stylesheet's own ordering picks
         the winner — which was the base one. Each branch owns its colours
         outright, so there is nothing to resolve. */
      className={cn(
        "flex min-h-11 cursor-pointer gap-2.5 rounded-md border-2 px-3 py-2.5 text-sm",
        "transition-colors duration-150 motion-reduce:transition-none",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
        horizontal ? "items-center justify-center text-center" : "w-full items-start",
        selected
          ? "border-accent bg-accent-tint font-medium text-ink-strong"
          : invalid
            ? "border-alert-text bg-surface-raised text-ink-body"
            : "border-border-strong bg-surface-raised text-ink-body hover:border-ink-muted",
      )}
    >
      <input
        type="radio"
        name={name}
        value={option.value}
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <span>{option.label}</span>
    </label>
  );
}

/** Unit chooser as visible segments. Same radio mechanics as OptionControl. */
function UnitToggle({
  input,
  units,
  field,
  onChange,
}: {
  input: ScoreInput;
  units: readonly string[];
  field: Field;
  onChange: (patch: { raw?: string; unit?: string }) => void;
}) {
  const current = field.unit ?? units[0];
  return (
    <fieldset role="radiogroup" className="shrink-0">
      {/* Preserves the accessible name the old `aria-label` supplied. */}
      <legend className="sr-only">{`${input.label.en} ${c.unitLabel}`}</legend>
      <div className="flex gap-1">
        {units.map((u) => {
          const selected = current === u;
          return (
            <label
              key={u}
              data-opt=""
              {...(selected ? { "data-selected": "" } : {})}
              className={cn(
                "flex h-11 cursor-pointer items-center justify-center rounded-md border-2 px-3 text-sm",
                "transition-colors duration-150 motion-reduce:transition-none",
                "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
                selected
                  ? "border-accent bg-accent-tint font-medium text-ink-strong"
                  : "border-border-strong bg-surface-raised text-ink-body hover:border-ink-muted",
              )}
            >
              <input
                type="radio"
                name={`unit-${input.id}`}
                value={u}
                checked={selected}
                onChange={() => onChange({ unit: u })}
                className="sr-only"
              />
              {u}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function InputField({
  input,
  field,
  error,
  onChange,
  missingAsNormal,
}: {
  input: ScoreInput;
  field: Field;
  error?: string | undefined;
  onChange: (patch: { raw?: string; unit?: string }) => void;
  missingAsNormal: boolean;
}) {
  const id = `field-${input.id}`;
  const hasHint = Boolean(input.helpText) || input.type === "numeric";
  const describedBy = error ? `${id}-error` : hasHint ? `${id}-help` : undefined;
  const units = unitOptions(input);

  // The accepted range sits in the field itself rather than in a separate list
  // at the bottom of the page, where a clinician had to leave the form to find
  // out why a value was rejected. Unlike MDCalc's advisory ranges these are
  // plausibility bounds that REJECT rather than compute — for a pediatric tool
  // a mistyped weight changes a dose — so the wording says accepted, not
  // typical, and the value is never silently clamped.
  const range =
    input.type === "numeric"
      ? `${input.min}–${input.max}${input.unit.canonical ? ` ${input.unit.canonical}` : ""}`
      : null;

  const hint = error ? (
    <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-alert-text" role="alert">
      <span
        aria-hidden="true"
        className="numeric mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-alert-bg text-[11px] font-medium"
      >
        !
      </span>
      {error}
    </p>
  ) : hasHint ? (
    <p id={`${id}-help`} className="text-sm text-ink-muted">
      {input.helpText?.en}
      {input.helpText && range ? " " : null}
      {/* Persists after typing, unlike the placeholder, so the accepted
          range is still on screen when a value is being corrected. */}
      {/* Full `ink-muted`, no opacity modifier. `/85` composited to #847579
          on the page ground — 4.22:1 at 13px, under the 4.5:1 AA needs.
          Plain ink-muted is 5.92:1. This is the line that tells a clinician
          why their value was rejected, on every numeric field of every
          calculator, so it was the worst possible place to shave contrast
          for a shade of visual hierarchy. */}
      {range ? <span className="numeric text-ink-muted">Accepted {range}</span> : null}
    </p>
  ) : null;

  if (input.type === "numeric") {
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink-strong">
          {input.label.en}
        </label>
        {/* `flex-wrap`, so on the narrowest phones the unit control drops to
            its own line instead of squeezing the number box. No media query. */}
        <div className="flex flex-wrap items-start gap-2">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={input.step ?? "any"}
            value={field.raw}
            placeholder={range ?? undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange({ raw: e.target.value })}
            className="numeric h-11 w-full min-w-[8.5rem] flex-1 rounded-md border border-border-strong bg-surface-raised px-3.5 text-ink-strong tabular-nums placeholder:text-ink-body/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-invalid:border-alert-text"
          />
          {units.length > 1 ? (
            unitsFitASegmentedToggle(units) ? (
              <UnitToggle input={input} units={units} field={field} onChange={onChange} />
            ) : (
              <select
                aria-label={`${input.label.en} ${c.unitLabel}`}
                value={field.unit ?? units[0]}
                onChange={(e) => onChange({ unit: e.target.value })}
                className="h-11 shrink-0 rounded-md border border-border-strong bg-surface-raised px-3 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )
          ) : null}
        </div>
        {hint}
      </div>
    );
  }

  const opts: OptionModel[] =
    input.type === "boolean"
      ? [
          { value: "true", label: c.booleanYes },
          { value: "false", label: c.booleanNo },
        ]
      : input.options.map((o) => ({ value: o.value, label: o.label.en }));

  // Two short options sit side by side; everything else stacks full-width.
  //
  // Decided from the label text, not from a breakpoint. The binding case is a
  // 320px viewport, where the form column is 272px and a two-up cell is 132px —
  // about 13 characters at 14px before the text wraps and the two segments stop
  // matching height. Anything longer, or any group of three or more, gets rows.
  // pGCS is the reason: its longest option is 76 characters, which no
  // side-by-side arrangement survives at any width.
  const horizontal = opts.length === 2 && Math.max(...opts.map((o) => o.label.length)) <= 13;

  return (
    /**
     * `role="radiogroup"` is set explicitly. A bare `<fieldset>` maps to
     * `role="group"` in HTML-AAM — there is no implicit radiogroup mapping — so
     * without this a screen reader announces the options as a loose collection
     * with no "3 of 6" position and no group semantics. `aria-labelledby`
     * rather than relying on `<legend>`, because the native legend-names-fieldset
     * behaviour is not guaranteed once the role is overridden.
     */
    <fieldset
      role="radiogroup"
      aria-labelledby={`${id}-legend`}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={input.required || undefined}
      className="flex flex-col gap-2"
    >
      <legend id={`${id}-legend`} className="text-sm font-medium text-ink-strong">
        {input.label.en}
        {!input.required && (
          <span className="ml-2 font-numeric text-[11px] tracking-[0.09em] text-ink-muted uppercase">
            {missingAsNormal ? c.optionalScoredAsNormal : c.optionalLabel}
          </span>
        )}
      </legend>

      <div className={horizontal ? "grid max-w-sm grid-cols-2 gap-2" : "flex flex-col gap-2"}>
        {opts.map((o) => (
          <OptionControl
            key={o.value}
            name={id}
            option={o}
            selected={field.raw === o.value}
            horizontal={horizontal}
            invalid={Boolean(error)}
            onSelect={() => onChange({ raw: o.value })}
          />
        ))}
      </div>

      {/* Offered on every group that holds a value, not only optional ones.
          A native radio cannot be unchecked, and a `<select>` could always be
          returned to its blank entry — without this, replacing the dropdowns
          would quietly remove the ability to undo a mis-tap on the 13 required
          categorical fields. */}
      {field.raw !== "" && (
        <button
          type="button"
          onClick={() => onChange({ raw: "" })}
          className="inline-flex min-h-11 items-center self-start rounded-sm px-1 text-sm text-accent-deep underline decoration-accent/40 underline-offset-2 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="sr-only">{`${c.clearSelectionLabel} ${input.label.en}`}</span>
          <span aria-hidden="true">{c.clearSelection}</span>
        </button>
      )}

      {hint}
    </fieldset>
  );
}

function ResultPanel({
  definition,
  outcome,
  copied,
  onCopy,
  showPartialCue,
  className,
}: {
  definition: ScoreDefinition;
  outcome: ComputeResult | null;
  copied: boolean;
  onCopy: () => void;
  showPartialCue: boolean;
  className?: string;
}) {
  const ok = outcome?.ok ? outcome : null;
  // One output → a single dominant headline. Several outputs → an equal-weight
  // list, so the panel stays scannable without implying one value is "the"
  // answer (e.g. IBW deliberately shows every method and chooses none).
  const multi = (ok?.result.values.length ?? 0) > 1;
  return (
    <aside
      aria-live="polite"
      data-print="result"
      // top-24 clears the sticky header (84px, shrinking to 64px on scroll)
      // rather than tucking underneath it.
      className={cn(
        "h-max rounded-lg border border-border bg-surface-raised p-6 shadow-md lg:sticky lg:top-24",
        className,
      )}
    >
      <h2 className="font-display text-lg font-medium text-ink-strong">{c.resultHeading}</h2>
      {!ok ? (
        <p className="mt-4 text-sm text-ink-muted">{c.resultPlaceholder}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className={cn("flex flex-col", multi ? "gap-3" : "gap-4")}>
            {ok.result.values.map((v) => {
              const band: InterpretationBand | undefined = matchInterpretationBand(
                definition,
                v.id,
                v.value,
              );
              return (
                <div
                  key={v.id}
                  className={
                    multi
                      ? "border-t border-border-subtle pt-3 first:border-t-0 first:pt-0"
                      : undefined
                  }
                >
                  {multi && <p className="text-sm text-ink-muted">{v.label.en}</p>}
                  <p
                    className={cn(
                      "numeric font-medium tabular-nums text-ink-strong",
                      multi ? "text-2xl" : "text-4xl",
                    )}
                  >
                    {v.value.toFixed(v.precision)}
                    {v.unit ? (
                      <span className={cn("ml-1 text-ink-muted", multi ? "text-base" : "text-xl")}>
                        {v.unit}
                      </span>
                    ) : null}
                  </p>
                  {band && (
                    <p className="mt-1 text-sm text-ink-body">
                      <span className="font-medium">{c.interpretationLabel}: </span>
                      {band.label.en} — {band.description.en}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {showPartialCue && (
            <Callout tone="note" className="text-[13px]" data-print="hide">
              {c.partialResultNote}
            </Callout>
          )}

          <button
            type="button"
            onClick={onCopy}
            data-print="hide"
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium text-ink-strong",
              "transition-colors duration-150 hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            {copied ? c.copied : c.copyResult}
          </button>
        </div>
      )}
      <Callout tone="note" className="mt-6 text-[13px]">
        {c.privacyLine}
      </Callout>
    </aside>
  );
}
