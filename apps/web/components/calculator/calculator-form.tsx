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
    .map(([id, v]) => (v.unit ? `${id}=${v.raw}~${v.unit}` : `${id}=${v.raw}`));
  return parts.join(";");
}

function decodeFragment(hash: string, inputs: readonly ScoreInput[]): FieldState {
  const state = initialState(inputs);
  const clean = hash.replace(/^#/, "");
  if (!clean) return state;
  for (const pair of clean.split(";")) {
    const [id, rest] = pair.split("=");
    if (!id || rest === undefined || !(id in state)) continue;
    const [value, unit] = rest.split("~");
    const existing = state[id];
    if (!existing) continue;
    state[id] = {
      raw: decodeURIComponent(value ?? ""),
      ...(unit ? { unit } : existing.unit ? { unit: existing.unit } : {}),
    };
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
export function CalculatorForm({ slug }: { slug: string }) {
  const definition = useMemo(() => getScore(slug), [slug]);
  if (!definition) return null;
  return <CalculatorFormInner definition={definition} />;
}

function CalculatorFormInner({ definition }: { definition: ScoreDefinition }) {
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
    void navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [definition, outcome]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <form className="flex flex-col gap-5" noValidate aria-label={definition.name}>
        {inputs.map((input) => (
          <InputField
            key={input.id}
            input={input}
            field={state[input.id] ?? { raw: "" }}
            error={errorsById.get(input.id)}
            onChange={(patch) => setField(input.id, patch)}
          />
        ))}
      </form>

      <ResultPanel definition={definition} outcome={outcome} copied={copied} onCopy={copySummary} />
    </div>
  );
}

function InputField({
  input,
  field,
  error,
  onChange,
}: {
  input: ScoreInput;
  field: Field;
  error?: string | undefined;
  onChange: (patch: { raw?: string; unit?: string }) => void;
}) {
  const id = `field-${input.id}`;
  const describedBy = error ? `${id}-error` : input.helpText ? `${id}-help` : undefined;
  const units = unitOptions(input);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink-strong">
        {input.label.en}
      </label>

      {input.type === "numeric" && (
        <div className="flex gap-2">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={input.step ?? "any"}
            value={field.raw}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(e) => onChange({ raw: e.target.value })}
            className="numeric h-11 w-full rounded-md border border-edge bg-surface-raised px-3.5 text-ink-strong tabular-nums placeholder:text-ink-body/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-invalid:border-alert-text"
          />
          {units.length > 1 && (
            <select
              aria-label={`${input.label.en} ${site.calculators.unitLabel}`}
              value={field.unit ?? units[0]}
              onChange={(e) => onChange({ unit: e.target.value })}
              className="h-11 shrink-0 rounded-md border border-edge bg-surface-raised px-3 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {input.type === "categorical" && (
        <select
          id={id}
          value={field.raw}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange({ raw: e.target.value })}
          className="h-11 w-full rounded-md border border-edge bg-surface-raised px-3.5 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-invalid:border-alert-text"
        >
          <option value="">—</option>
          {input.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label.en}
            </option>
          ))}
        </select>
      )}

      {input.type === "boolean" && (
        <select
          id={id}
          value={field.raw}
          aria-describedby={describedBy}
          onChange={(e) => onChange({ raw: e.target.value })}
          className="h-11 w-full rounded-md border border-edge bg-surface-raised px-3.5 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )}

      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-sm text-alert-text"
          role="alert"
        >
          <span
            aria-hidden="true"
            className="numeric mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-alert-bg text-[11px] font-medium"
          >
            !
          </span>
          {error}
        </p>
      ) : input.helpText ? (
        <p id={`${id}-help`} className="text-sm text-ink-muted">
          {input.helpText.en}
        </p>
      ) : null}
    </div>
  );
}

function ResultPanel({
  definition,
  outcome,
  copied,
  onCopy,
}: {
  definition: ScoreDefinition;
  outcome: ComputeResult | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const ok = outcome?.ok ? outcome : null;
  return (
    <aside
      aria-live="polite"
      className="h-max rounded-lg border border-surface-sunken bg-surface-raised p-6 lg:sticky lg:top-6"
    >
      <h2 className="font-display text-lg font-medium text-ink-strong">{c.resultHeading}</h2>
      {!ok ? (
        <p className="mt-4 text-sm text-ink-muted">{c.resultPlaceholder}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {ok.result.values.map((v) => {
            const band: InterpretationBand | undefined = matchInterpretationBand(
              definition,
              v.id,
              v.value,
            );
            return (
              <div key={v.id}>
                {ok.result.values.length > 1 && (
                  <p className="text-sm text-ink-muted">{v.label.en}</p>
                )}
                <p className="numeric text-4xl font-medium tabular-nums text-ink-strong">
                  {v.value.toFixed(v.precision)}
                  {v.unit ? <span className="ml-1 text-xl text-ink-muted">{v.unit}</span> : null}
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
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink-muted/40 px-4 text-sm font-medium text-ink-strong",
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
