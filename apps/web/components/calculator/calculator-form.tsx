"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ComputeResult,
  InterpretationBand,
  ScoreDefinition,
  ScoreInput,
} from "@towardpcc/scoring-engine";
import {
  fromCanonical,
  getScore,
  matchInterpretationBand,
  visibleInputs,
} from "@towardpcc/scoring-engine";
import { Callout, cn } from "@towardpcc/ui";
import { site } from "@/content/site";
import { roundInward } from "@/lib/round-inward";
import { CompositionPanel, DerivedPanel, splitComposition } from "./composition-panel";
import { formatBand, shortCite } from "./format";
import { CARRIED_IDS, useCarriedValues, type CarriedValue } from "./use-carried-values";

const c = site.calculators;

/** Raw field state — strings for numerics (so the box can be empty), plus a chosen unit. */
type Field = { raw: string; unit?: string | undefined };
type FieldState = Record<string, Field>;

function unitOptions(input: ScoreInput): string[] {
  if (input.type !== "numeric") return [];
  // Spelling variants are accepted but never OFFERED: a toggle between two
  // spellings of one unit changes nothing, and a control that visibly does
  // nothing teaches a clinician to ignore the next one, which on VIS is the
  // vasopressin units/milliunits toggle worth a factor of a thousand.
  const alts = (input.unit.alternates ?? []).filter((a) => !a.sameUnitSpelling).map((a) => a.unit);
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

/**
 * Compact URL-fragment encoding: id=value~unit joined by ';'. Never the query
 * string (PRD §6.4).
 *
 * `inputs` is the VISIBLE list, not the declared one. A field that is not on
 * screen must not travel in a link the sender composed from a screen that did
 * not show it — the property this delivers is that a value held in a hidden
 * field was typed in this session by the person looking at the screen, and it
 * never leaves.
 */
function encodeFragment(state: FieldState, inputs: readonly ScoreInput[]): string {
  const visible = new Set(inputs.map((i) => i.id));
  const parts = Object.entries(state)
    .filter(([id, v]) => v.raw !== "" && visible.has(id))
    .map(([id, v]) => {
      const val = encodeURIComponent(v.raw);
      return v.unit ? `${id}=${val}~${encodeURIComponent(v.unit)}` : `${id}=${val}`;
    });
  return parts.join(";");
}

/**
 * Option values this application has already minted into links, and which the
 * score no longer declares.
 *
 * PRISM's 12- and 24-hour windows collapsed into one on 2026-08-09 because they
 * computed identically. Links carrying the retired values are in circulation
 * right now, and without this map such a link does NOT merely lose the window:
 * `collection_window` is `required: true`, so the engine returns
 * `invalid-category` and the ENTIRE score blocks. A shared link that used to
 * show a number would show nothing. Measured, not assumed — an unknown option
 * value was fed through `compute` and returned exactly that.
 *
 * Scoped to the fragment decoder deliberately. A direct `compute()` call
 * passing a value the score does not declare SHOULD be rejected; this is about
 * URLs this application itself minted, so it belongs with the sharing format
 * rather than in the engine.
 *
 * Keyed by slug so it cannot reach across scores: another score with a
 * `collection_window` input would be untouched.
 */
const RETIRED_FRAGMENT_VALUES: Record<string, Record<string, Record<string, string>>> = {
  prism: {
    collection_window: { first_12h: "first_12_24h", first_24h: "first_12_24h" },
  },
};

function decodeFragment(hash: string, inputs: readonly ScoreInput[], slug: string): FieldState {
  const retired = RETIRED_FRAGMENT_VALUES[slug];
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
      const decoded = decodeURIComponent(value ?? "");
      state[id] = {
        raw: retired?.[id]?.[decoded] ?? decoded,
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
  return pruneHidden(inputs, state);
}

/**
 * Blank every field the FINAL state does not make visible.
 *
 * A SECOND PASS, and it has to be. Visibility depends on the whole decoded
 * state, not on arrival order: the fragment is applied wholesale by one
 * `setState`, and pruning as each pair is parsed would behave differently
 * depending on the order of keys in the string.
 *
 * NOT hung off the controller's `onChange` either. Fragment hydration replaces
 * state wholesale with no per-field handler running, and the `tpcc:fragment`
 * listener re-applies it on a same-document paste — neither code path calls any
 * change handler, so clearing there is simply not reached.
 *
 * This is not hypothetical. Links already in circulation legitimately carry
 * `collection_window=first_12h` together with all four PRISM covariates,
 * because until v2.5.0 every window rendered all 26 fields. Those links are the
 * hazard case on first load: without this, a link injects state into fields
 * that are not on screen, with no keystroke.
 */
function pruneHidden(inputs: readonly ScoreInput[], state: FieldState): FieldState {
  const visible = new Set(visibleInputs(inputs, toComputeInput(inputs, state)).map((i) => i.id));
  const out: FieldState = {};
  let pruned = false;
  for (const [id, field] of Object.entries(state)) {
    if (field.raw === "" || visible.has(id)) {
      out[id] = field;
      continue;
    }
    pruned = true;
    out[id] = { ...field, raw: "" };
  }
  return pruned ? out : state;
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
 * Inputs in declaration order, partitioned into their sections.
 *
 * DECLARATION ORDER IS PRESERVED WITHIN AND BETWEEN GROUPS — a section is
 * opened the first time its label appears and inputs are appended to it, so a
 * score's author still controls the sequence and the grouping cannot silently
 * reorder a form that was ordered for a reason. An input with no group joins
 * the run it sits in, which is why an un-annotated score yields exactly one
 * unlabelled section and renders as it always did.
 */
function groupInputs(inputs: readonly ScoreInput[]): [string | null, ScoreInput[]][] {
  const out: [string | null, ScoreInput[]][] = [];
  const index = new Map<string | null, ScoreInput[]>();
  for (const input of inputs) {
    const key = input.group?.en ?? null;
    let bucket = index.get(key);
    if (!bucket) {
      bucket = [];
      index.set(key, bucket);
      out.push([key, bucket]);
    }
    bucket.push(input);
  }
  return out;
}

/**
 * The badge beside an optional input's label.
 *
 * THREE STATES, NOT TWO, AND THE THIRD EXISTS BECAUSE THE SECOND WAS LYING.
 * `missingAsNormal` is declared once per SCORE, and PRISM holds two classes of
 * optional input with opposite blank semantics. Its physiologic variables do
 * score as normal when unmeasured — the published convention. Its four PRISM IV
 * admission-context covariates do not: leaving any one blank WITHHOLDS the
 * mortality probability, deliberately, because each is zero at its reference
 * level and reading a blank as "contributes nothing" would hand every clinician
 * who skipped a question the OR/PACU, no-CPR, no-cancer curve.
 *
 * Until 2026-08-09 all four printed "Optional · blank scored as normal" — the
 * exact opposite of what happens, on the four fields the score is most careful
 * about. An input may now opt out with `missingIsNotNormal`, and the wording is
 * the score's own: its notes say a blank "is not an answer of no".
 */
function optionalBadge(missingAsNormal: boolean, input: ScoreInput, copy: typeof c): string {
  if (input.missingIsNotNormal) return copy.optionalBlankNotAnAnswer;
  return missingAsNormal ? copy.optionalScoredAsNormal : copy.optionalLabel;
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
  /**
   * THE SINGLE DERIVATION POINT.
   *
   * `declared` is used in exactly four places — state initialisation, fragment
   * decoding, the submitted payload, and the line below. Everything else in
   * this component reads `inputs`, which SHADOWS the declared list on purpose:
   * a future author must not have the full list in scope, because passing it
   * where the visible one belongs is exactly the mistake.
   *
   * The FULL `submitted` object is what goes to `compute`. Do not pre-filter it
   * here — `runValidation` drops a hidden input before the required check, and
   * that is the enforcement point precisely because it holds for callers that
   * are not this form.
   */
  const declared = definition.inputs;
  const [state, setState] = useState<FieldState>(() => initialState(declared));
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Hydrate once on mount from the fragment the inline script in `layout.tsx`
  // lifted out of the URL before parse finished. Reading it in the state
  // initializer would diverge from the server render (no window there) and
  // cause a hydration mismatch, so the post-mount setState is correct and
  // intentional here.
  //
  // NOT `window.location.hash`, and with no fallback to it. By the time this
  // runs the hash is gone by design — see the comment in `layout.tsx`. If the
  // stash is missing the form starts empty, which someone will notice; a
  // fallback would quietly put every entered value back into `location.href`
  // for the edge script to collect.
  //
  // The `tpcc:fragment` listener covers the same-document case: pasting a
  // shared link into a tab already on this calculator changes only the
  // fragment, so nothing remounts and the mount read above never fires again.
  useEffect(() => {
    const hydrate = () => {
      const stashed = window.__TPCC_FRAGMENT__;
      if (stashed) setState(decodeFragment(stashed, declared, definition.slug));
    };
    hydrate();
    window.addEventListener("tpcc:fragment", hydrate);
    return () => window.removeEventListener("tpcc:fragment", hydrate);
  }, [declared, definition.slug]);

  // THE FRAGMENT IS NO LONGER MIRRORED AS THE USER TYPES, and that is the fix.
  //
  // This effect used to run `history.replaceState` on every keystroke, so the
  // address bar held the live clinical values. Anything that then re-read the
  // URL — a reload, a restored tab, or Cloudflare's JS Detections reading
  // `document.location.href` at DOMContentLoaded — saw them. The values now
  // live in React state only, and reach a URL solely when the clinician presses
  // "Copy link with these values", which builds one on demand.
  //
  // The cost is deliberate and was accepted: a reload no longer restores the
  // form. Persisting the rest of the fields to sessionStorage would fix that,
  // but the allow-list in Invariant 2 is `age`, `age_months`, `weight`,
  // `weight_kg` and widening it is its own decision, not a side effect of this
  // one.

  const setField = useCallback((id: string, patch: { raw?: string; unit?: string }) => {
    setState((prev) => {
      const existing = prev[id] ?? { raw: "" };
      return { ...prev, [id]: { ...existing, ...patch } };
    });
    setCopied(false);
  }, []);

  const submitted = useMemo(() => toComputeInput(declared, state), [declared, state]);
  /** What the form is allowed to see. */
  const inputs = useMemo(() => visibleInputs(declared, submitted), [declared, submitted]);
  const visibleCount = inputs.length;

  const outcome: ComputeResult | null = useMemo(() => {
    if (!anyEntered(inputs, state)) return null;
    return definition.compute(submitted as never);
  }, [definition, inputs, state, submitted]);

  /**
   * Fields the user has actually left. Validation MESSAGES wait for this;
   * compute does not.
   *
   * Typing one digit into any field of a 26-input score used to paint a
   * "… is required." paragraph under every OTHER field and fire that many
   * `role="alert"` announcements — the form shouting about work the user had
   * not reached yet. Range messages had the same shape mid-typing: on the way
   * to 140 the value passes through 1, and a field accepting 20–600 called it
   * out of range while the clinician was still on the first keystroke.
   *
   * Blur is the natural commit point: it means "I have finished with this
   * field", needs no timer, and cannot fire for a field nobody has visited.
   */
  const [blurred, setBlurred] = useState<ReadonlySet<string>>(() => new Set<string>());
  const markBlurred = useCallback((id: string) => {
    setBlurred((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const errorsById = useMemo(() => {
    const m = new Map<string, string>();
    if (outcome && !outcome.ok) {
      for (const e of outcome.errors) {
        // Not yet reached is not yet wrong.
        if (!blurred.has(e.inputId)) continue;
        m.set(e.inputId, e.message);
      }
    }
    return m;
  }, [outcome, blurred]);

  /**
   * What is standing between the entries so far and a result.
   *
   * The result rail is sticky and the blocking field can be a screen and a half
   * below it, so a panel that says only "Enter values to compute." is telling a
   * half-filled form the same thing it tells an empty one. Named, and linked.
   *
   * Un-gated by `blurred` on purpose: this is a SUMMARY of why there is no
   * number, not a per-field accusation, and a summary that omitted the fields
   * you have not visited would be a list of the wrong things.
   */
  const blocking = useMemo(() => {
    if (!outcome || outcome.ok) return [];
    const byId = new Map(inputs.map((i) => [i.id, i]));
    return outcome.errors.flatMap((e) => {
      const input = byId.get(e.inputId);
      return input ? [{ id: input.id, label: input.label.en, message: e.message }] : [];
    });
  }, [outcome, inputs]);

  /**
   * How much of a composite has actually been filled in.
   *
   * Counted straight off the field state rather than derived from `blocking`,
   * which cannot answer this question: `blocking` lists inputs that FAILED
   * validation, and a blank OPTIONAL input fails nothing. pSOFA declares seven
   * of its fourteen inputs optional and scores a blank one as normal, so
   * `inputs.length - blocking.length` would report "14 of 14 entered" on a form
   * with seven empty boxes — and read the same on a completely empty form,
   * where `blocking` is empty because nothing has been computed at all.
   *
   * That is the exact falsehood the partial-result cue beside it exists to
   * prevent, so the counter has to be measured, not inferred.
   */
  const enteredCount = useMemo(
    () => inputs.filter((i) => (state[i.id]?.raw ?? "") !== "").length,
    [inputs, state],
  );

  // Honest partial-result cue (PRD §6.4): additive composites (pSOFA, Phoenix,
  // VIS) score a blank component as normal, so a not-yet-complete entry can read
  // falsely low. Flag it whenever such a score computes with an optional field
  // still blank, so the number is never mistaken for a complete assessment.
  const showPartialCue = useMemo(() => {
    if (!definition.missingAsNormal || !outcome?.ok) return false;
    return inputs.some((i) => !i.required && (state[i.id]?.raw ?? "") === "");
  }, [definition.missingAsNormal, outcome, inputs, state]);

  /**
   * The copied summary carries the INPUTS and a timestamp.
   *
   * Pasted into a handover note, the old one was unreproducible: a reader could
   * not tell which creatinine produced pSOFA 9, and a version number without a
   * date does not fix that. A clinical record that cannot be checked against
   * its own inputs is a number with a name on it.
   *
   * No privacy implication — the clinician is choosing to copy. The shareable
   * LINK is a separate, separately-labelled action below, because it has the
   * opposite privacy character.
   *
   * IT KEEPS THE COMPONENTS, AND THAT IS A DECISION — the opposite one from the
   * live region below, which drops them.
   *
   * The two consumers want different things. The live region is an
   * INTERRUPTION: it fires on every recompute, and the panel already states the
   * breakdown as readable text a few nodes away, so announcing it there too is
   * the same information twice for a listener who cannot skim past it. This
   * summary is a RECORD, read once, later, away from the page — and the
   * breakdown is exactly what stops being recoverable when it leaves. pSOFA 9
   * from cardiovascular 4 and renal 3 is a different handover from pSOFA 9
   * spread across six organs, and the total alone cannot say which.
   *
   * So they are kept DELIBERATELY and as a breakdown: one labelled line, in the
   * panel's own `4 of 24` phrasing, after the values and before the footer.
   * That is the difference between this and what the composition work first did
   * by accident, which was to append five unexplained lines to PELOD-2's
   * summary and three to pGCS's, interleaved with the banded values and
   * indistinguishable from them.
   */
  const copySummary = useCallback(() => {
    if (!outcome || !outcome.ok) return;
    const entered = inputs
      .flatMap((i) => {
        const raw = state[i.id]?.raw ?? "";
        if (raw === "") return [];
        if (i.type === "numeric") {
          const unit = state[i.id]?.unit ?? i.unit.canonical;
          return [`${i.label.en} ${raw}${unit ? ` ${unit}` : ""}`];
        }
        if (i.type === "categorical") {
          const opt = i.options.find((o) => o.value === raw);
          return [`${i.label.en} ${opt?.label.en ?? raw}`];
        }
        return [`${i.label.en} ${raw === "true" ? c.booleanYes : c.booleanNo}`];
      })
      .join(" · ");
    const {
      flat,
      components,
      derived: derivedValue,
    } = splitComposition(outcome.result.values, definition.composition, definition.derived);
    const lines = [
      `${definition.name} — ${new Date().toISOString().slice(0, 16)}Z`,
      ...(entered ? [`${c.copyInputsLabel}: ${entered}`] : []),
      ...flat.map((v) => {
        const band = matchInterpretationBand(definition, v.id, v.value);
        const num = `${v.label.en}: ${v.value.toFixed(v.precision)}${v.unit ? ` ${v.unit}` : ""}`;
        return band ? `${num} (${band.label.en})` : num;
      }),
      ...(components.length > 0
        ? [
            `${c.copyComponentsLabel}: ${components
              .map((r) => `${r.label} ${r.value} of ${r.max}`)
              .join(" · ")}`,
          ]
        : []),
      // THE DERIVED VALUE STAYS IN THE RECORD. Pulling it out of `flat` for
      // layout must not drop it from the clipboard: it is the number a reader
      // is most likely to act on, and a handover note that silently omits it is
      // worse than one that never had it. Prefixed so its provenance survives
      // the trip off the page.
      ...(derivedValue
        ? [
            `${c.copyDerivedLabel}: ${derivedValue.label.en} ${derivedValue.value.toFixed(
              derivedValue.precision,
            )}${derivedValue.unit ? ` ${derivedValue.unit}` : ""}`,
          ]
        : []),
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
  }, [definition, outcome, inputs, state]);

  /**
   * CLEAR ALL — and it clears the fragment too.
   *
   * There was no reset anywhere on the page: emptying a 26-field PRISM meant
   * clearing each field by hand or reloading without the fragment. Radio groups
   * already had a Clear, because a native radio cannot be unchecked; numeric
   * fields were simply left asymmetric.
   *
   * `type="button"`, never `type="reset"`: native reset restores the
   * SERVER-RENDERED defaults, not our fragment-hydrated state, so on a shared
   * link it would restore the shared values rather than empty the form.
   */
  const {
    offered,
    remember,
    consume: consumeCarried,
    dismiss: dismissCarried,
  } = useCarriedValues(inputs);

  // Remembered only once the score COMPUTES. A half-typed weight is not a
  // patient's weight, and offering one to the next calculator would carry a
  // typo forward.
  useEffect(() => {
    if (!outcome?.ok) return;
    remember(
      inputs.flatMap((i) => {
        const raw = state[i.id]?.raw ?? "";
        // Filtered HERE as well as in the hook. This sent every numeric field
        // it had, so sessionStorage accumulated creatinine, bilirubin, lactate
        // and the rest as a labelled snapshot of one child — undisclosed local
        // persistence on a page whose privacy table says "Nothing". It also
        // means the effect below does no storage work at all on a score with no
        // age or weight, instead of a read-parse-stringify-write per keystroke.
        if (!CARRIED_IDS.has(i.id) || i.type !== "numeric" || raw === "") return [];
        return [
          {
            id: i.id,
            raw,
            unit: state[i.id]?.unit ?? i.unit.canonical,
            label: i.label.en,
          } satisfies CarriedValue,
        ];
      }),
    );
  }, [outcome, inputs, state, remember]);

  const applyCarried = useCallback(
    (v: CarriedValue) => {
      setField(v.id, { raw: v.raw, unit: v.unit });
      // Clicking a chip is a commit at least as deliberate as leaving a field,
      // so the value is eligible for validation messages immediately. Without
      // this an accepted-but-out-of-range carry sat there looking fine.
      markBlurred(v.id);
      // Only this one. The others stay on offer.
      consumeCarried(v.id);
    },
    [setField, markBlurred, consumeCarried],
  );

  const clearAll = useCallback(() => {
    setState(initialState(declared));
    setBlurred(new Set());
    setCopied(false);
    setLinkCopied(false);
    dismissCarried();
    // The URL no longer carries field values, so there is nothing here to
    // strip: the inline script in `layout.tsx` removed the fragment before this
    // component mounted, and nothing writes one back. The `replaceState` that
    // used to live here — carefully preserving `window.location.search` so a
    // campaign or referral parameter survived a clear — is gone with the
    // mirroring effect it existed to correct.
    //
    // The stash goes too, so a later remount cannot resurrect the values the
    // clinician just cleared.
    delete window.__TPCC_FRAGMENT__;
  }, [declared, dismissCarried]);

  /**
   * Copying the link is DELIBERATE, and is now the ONLY way values reach a URL.
   *
   * This used to copy `window.location.href`, which worked only because the
   * address bar already held the values. It no longer does, so the link is
   * composed here from state at the moment it is asked for. That is the whole
   * shape of the fix: the fragment is a sharing format the clinician opts into,
   * not ambient page state that anything reading `location.href` can collect.
   *
   * The query string is preserved, matching `clearAll` below — a visit carrying
   * a campaign or referral parameter keeps it.
   */
  const copyLink = useCallback(() => {
    const frag = encodeFragment(state, inputs);
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}${
      frag ? `#${frag}` : ""
    }`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {});
  }, [state, inputs]);

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
        /* `pe-16` below the two-column breakpoint: room for the fixed
           back-to-top button, which is full-width-overlapping down there and
           was sitting on the unit toggles at the inline end of these rows.
           Reserving the space is the half of that fix which belongs to the
           content — the button moves in as well, and neither alone is enough at
           320px. */
        className="flex min-w-0 flex-col gap-5 pe-16 lg:col-start-1 lg:row-start-1 lg:pe-0"
        noValidate
        aria-label={definition.name}
      >
        {/* AN OFFER, NEVER A PRE-FILL. See use-carried-values.ts: this is the
            one thing on the page that could put a number into a form nobody
            typed, so it asks. Hidden the moment anything is entered — an offer
            to fill a field you are already filling is just clutter. */}
        {offered.length > 0 && !anyEntered(inputs, state) ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-surface-sunken px-4 py-3">
            <span className="text-sm text-ink-muted">{c.carriedLabel}</span>
            {offered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => applyCarried(v)}
                className="numeric inline-flex min-h-11 items-center rounded-pill border border-border-strong bg-surface-raised px-3.5 text-sm font-medium text-ink-strong transition-colors duration-[var(--motion-duration-fast)] hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {v.label} {v.raw} {v.unit}
              </button>
            ))}
            <button
              type="button"
              onClick={dismissCarried}
              className="min-h-11 rounded-sm px-1 text-sm text-ink-muted underline underline-offset-4 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {c.carriedDismiss}
            </button>
          </div>
        ) : null}

        {/* GROUPED, where the score is long enough for declaration order to
            stop being navigable. PRISM's 26 inputs were one undifferentiated
            column with no landmark and no sense of progress, while the
            structure sat in the data all along — and grouping puts the min/max
            worst-value pairs next to each other instead of eight rows apart,
            which is how they are collected at the bedside.
            Separation is a hairline plus the existing rhythm, not a card: the
            "rules inside a card" border tier, exactly as the ADR intends. A
            tinted band per organ system inside a form would read as six cards.
            A score with no groups yields one unlabelled section, so nothing
            that was not annotated changes at all. */}
        {groupInputs(inputs).map(([group, items]) => (
          <fieldset
            key={group ?? "_"}
            className="flex min-w-0 flex-col gap-5 border-t border-border-subtle pt-6 first:border-t-0 first:pt-0"
          >
            {group ? (
              /* `mb-1` rather than relying on the fieldset's `gap-5`. A <legend>
                 is not a flex item — browsers render it in the fieldset's
                 border area — so the gap does not apply to it, and on the first
                 section (which has no top rule to sit in) the heading landed
                 6px above its first field. */
              <legend className="mb-2 font-numeric text-eyebrow font-semibold tracking-[0.1em] text-ink-muted uppercase">
                {group}
              </legend>
            ) : null}
            {items.map((input) => (
              <InputField
                key={input.id}
                input={input}
                field={state[input.id] ?? { raw: "" }}
                error={errorsById.get(input.id)}
                onChange={(patch) => setField(input.id, patch)}
                onCommit={() => markBlurred(input.id)}
                missingAsNormal={Boolean(definition.missingAsNormal)}
              />
            ))}
          </fieldset>
        ))}

        {/* Only once something is entered. On an untouched form a reset is an
            offer to undo nothing, and it would be the first control a reader
            meets under a 26-field score. */}
        {anyEntered(inputs, state) ? (
          <button
            type="button"
            data-print="hide"
            onClick={clearAll}
            className="min-h-11 self-start rounded-sm text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {c.clearAllLabel}
          </button>
        ) : null}
      </form>

      <ResultPanel
        definition={definition}
        outcome={outcome}
        blocking={blocking}
        enteredCount={enteredCount}
        visibleCount={visibleCount}
        copied={copied}
        linkCopied={linkCopied}
        onCopy={copySummary}
        onCopyLink={copyLink}
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
 * Selected state carries FOUR cues. The original reason was that `accent-tint`
 * was #fff2ee — 1.10:1 against white and byte-identical to `surface-sunken` —
 * so the fill was invisible and could not carry meaning at all. The token is
 * now #ffd9e0 and does separate, and the four cues stay regardless: WCAG 1.4.1
 * is not satisfied by a fill that is merely visible, because colour must never
 * be the only carrier. So the radio dot fills (shape), the border goes crimson
 * at a constant 2px (never 1px to 2px, which would shift every row by 2px), the
 * label goes medium weight, and the tint arrives last as reinforcement.
 *
 * Hover moves the BORDER, not the fill. That was forced when the selected fill
 * and `surface-sunken` were the same colour; it is still right, because a fill
 * change on hover reads as selection on a control whose selected state is also
 * a fill change.
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
  onCommit,
  missingAsNormal,
}: {
  input: ScoreInput;
  field: Field;
  error?: string | undefined;
  onChange: (patch: { raw?: string; unit?: string }) => void;
  /** The user has finished with this field — see `blurred` above. */
  onCommit: () => void;
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
  /**
   * THE BOUND, IN THE UNIT ON SCREEN.
   *
   * `min` and `max` are declared canonically and were printed verbatim under
   * the canonical name — so selecting `milliunits/kg/min` on VIS vasopressin
   * left the field reading "Accepted 0–0.01 units/kg/min" while the box beside
   * it expected milliunits. A clinician obeying that hint enters a thousandth
   * of the intended dose, and it is ACCEPTED, because validation converts from
   * the selected unit and 0.005 milliunits is legitimately inside 0–0.01 units.
   * Nothing anywhere would have flagged it. That field's own source comment
   * calls the pairing "a documented 1000x error trap".
   *
   * Converted, then rounded to the precision the bound actually carries —
   * `fromCanonical` on 0.01 units gives 10.000000000000002 milliunits, and a
   * plausibility bound printed to sixteen digits reads like a bug.
   *
   * ROUNDING GOES INWARD, AND THAT DIRECTION IS THE WHOLE POINT. Corrected
   * calcium declares 2.0–10.0 mg/dL, which converts to 0.998004–4.99002 mmol/L
   * and used to print at exactly that width. The obvious tidy-up is "1.0–5.0",
   * and it is wrong: 5.0 mmol/L is ABOVE the real ceiling, so the hint would
   * promise a value validation then rejects — the field would be telling the
   * clinician to enter something it refuses. So the lower bound rounds UP and
   * the upper bound rounds DOWN. The printed range is always a subset of the
   * accepted one, never a superset, and a hint can only ever understate what
   * the field takes.
   *
   * Precision is whichever of 3 decimal places or 3 significant figures keeps
   * MORE of the value, because neither alone survives the full spread of bounds
   * in the registry: 3 dp alone flattens a 0.0001 ceiling to 0, and 3 sig figs
   * alone drags a 1234 ceiling down to 1230. Taking the tighter-to-true of the
   * two handles both, and still collapses 10.000000000000002 to 10.
   */
  const selectedUnit = input.type === "numeric" ? (field.unit ?? input.unit.canonical) : "";
  const bound = (v: number, direction: "up" | "down") => {
    if (input.type !== "numeric") return v;
    const converted = fromCanonical(input.unit, v, selectedUnit);
    if (converted === null) return v;
    return roundInward(converted, direction);
  };
  const range =
    input.type === "numeric"
      ? `${bound(input.min, "up")}–${bound(input.max, "down")}${selectedUnit ? ` ${selectedUnit}` : ""}`
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
            onBlur={onCommit}
            /* A FOCUSED type=number INCREMENTS ON WHEEL SCROLL in Chrome and
               Safari. Fill weight, scroll down to the next field, and the
               weight changes underneath you with no keystroke and no undo. On
               a pediatric dose tool that is a patient-safety defect rather
               than a nitpick, and blurring on wheel is the whole fix.
               It costs keyboard users nothing: arrow keys still step the
               value, which is the accessible increment path. */
            onWheel={(e) => e.currentTarget.blur()}
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
                onBlur={onCommit}
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
      // The blocking summary links to `#field-<id>`, and this branch used to
      // expose no such element at all — only `${id}-legend` on the legend — so
      // every jump link for a categorical or boolean input was a dead anchor.
      // On PRISM, whose three required inputs are all categorical, that was
      // every link on the page.
      id={id}
      role="radiogroup"
      aria-labelledby={`${id}-legend`}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={input.required || undefined}
      /* React's onBlur is focusout, which BUBBLES — so this fires on every
         focus change inside the group as well as on leaving it. That is fine
         and is why no `relatedTarget` check is needed: the flag means "the user
         has reached this group", and arrowing between its own radios is
         reaching it. (An earlier comment here claimed focusout fires only on
         leaving the group. It does not.) */
      onBlur={onCommit}
      className="flex flex-col gap-2"
    >
      <legend id={`${id}-legend`} className="text-sm font-medium text-ink-strong">
        {input.label.en}
        {!input.required && (
          <span className="ml-2 font-numeric text-[11px] tracking-[0.09em] text-ink-muted uppercase">
            {optionalBadge(missingAsNormal, input, c)}
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

/** How many blocking fields the rail names before it summarises the rest. */
const BLOCKING_SHOWN = 5;

interface BlockingField {
  id: string;
  label: string;
  message: string;
}

function ResultPanel({
  definition,
  outcome,
  blocking,
  enteredCount,
  visibleCount,
  copied,
  linkCopied,
  onCopy,
  onCopyLink,
  showPartialCue,
  className,
}: {
  definition: ScoreDefinition;
  outcome: ComputeResult | null;
  blocking: readonly BlockingField[];
  enteredCount: number;
  /**
   * The DENOMINATOR, and it moves under the user's hand where a score asks
   * conditionally — 26 on PRISM's 4-hour window, 22 on the other two. That is
   * the point rather than a wart: filtering the numerator alone reads `26 of
   * 22`, and filtering neither pins a fully entered 12-hour PRISM at `22 of 26`
   * forever, which is the same falsehood this counter exists to prevent.
   */
  visibleCount: number;
  copied: boolean;
  linkCopied: boolean;
  onCopy: () => void;
  onCopyLink: () => void;
  showPartialCue: boolean;
  className?: string;
}) {
  const ok = outcome?.ok ? outcome : null;

  /**
   * The flat list shows everything the score emits EXCEPT the parts a
   * composition already accounts for.
   *
   * Without this filter pSOFA's six organ subscores render TWICE — once as
   * unexplained rows in the list, and again, labelled and in proportion, in the
   * panel below. The panel is the better rendering of the two, so the list
   * yields.
   *
   * Split ONCE, here, and used by both the list and the live region below.
   * Splitting per consumer is how the live region came to announce all seven
   * pSOFA values while the list rendered one.
   */
  const {
    flat: flatValues,
    components: componentRows,
    derived: derivedValue,
  } = useMemo(
    () => splitComposition(ok?.result.values ?? [], definition.composition, definition.derived),
    [ok, definition.composition, definition.derived],
  );

  /* Derived from what actually RENDERS, not from what the engine emitted.
     `multi` exists to tell several numbers apart — it labels each one and
     shrinks the non-primary ones. With the components pulled out, pSOFA shows a
     single number and needs neither. Since v2.6.0 PRISM's mortality probability
     is pulled out too, into its own block, so PRISM is no longer multi either —
     the total is the one number in this list, at full size, which is the point
     of the change. Phoenix and PELOD-2 declare no `derived` and still are. */
  const multi = flatValues.length > 1;

  /**
   * The value that IS the score, when a score returns several.
   *
   * Every value used to render at the same size in the multi branch. That is
   * right for ideal body weight, which deliberately offers four methods and
   * chooses none — and wrong for pSOFA, which returns a 0–24 total plus six
   * organ subscores, where one number is the answer and six are its working.
   *
   * DERIVED, not declared: the primary value is the one carrying interpretation
   * bands, which the engine already knows. IBW declares none, so `primaryId`
   * stays undefined there and its equal-weight treatment is preserved exactly.
   */
  const bandedIds = useMemo(
    () => new Set(definition.interpretation.map((b) => b.appliesTo)),
    [definition.interpretation],
  );
  const primaryId = ok?.result.values.find((v) => bandedIds.has(v.id))?.id;
  const bandsFor = useCallback(
    (valueId: string) => definition.interpretation.filter((b) => b.appliesTo === valueId),
    [definition.interpretation],
  );
  const source = definition.references[0];
  // Omitted rather than degraded where the reference has no author to shorten
  // to — see shortCite. A missing line is recoverable; an unreadable one is not.
  const shortSource = source ? shortCite(source.citation) : null;

  return (
    <aside
      data-print="result"
      // top-24 clears the sticky header (84px, shrinking to 64px on scroll)
      // rather than tucking underneath it.
      className={cn(
        "h-max rounded-lg border border-border bg-surface-raised p-6 shadow-md lg:sticky lg:top-24",
        className,
      )}
    >
      <h2 className="font-display text-lg font-medium text-ink-strong">{c.resultHeading}</h2>

      {/* HOW MUCH OF THE INSTRUMENT HAS BEEN ANSWERED — composites only.
          A composite that scores blank components as normal reads low while it
          is still being filled in, and the number alone cannot say which it is.
          The blocking list answers this only while the score is incomplete; it
          disappears the moment a result exists, which is exactly when a pSOFA
          with seven optional boxes still empty most needs to say so. So it sits
          here, above both branches, and is present in both.
          Not inside the live region below: it changes on every keystroke, and a
          count read aloud that often is noise rather than information. */}
      {definition.composition ? (
        <p className="mt-1 font-numeric text-[13px] text-ink-muted">
          {enteredCount} of {visibleCount} entered
        </p>
      ) : null}

      {/* THE ANNOUNCEMENT, and nothing else.
          MOUNTED FROM FIRST PAINT — it was moved inside the `ok` branch to
          narrow what gets announced, and that narrowed it to nothing: a live
          region inserted into the DOM in the same mutation as its content is
          not announced by any major screen reader, so the FIRST computed score
          was silent. A live region has to exist BEFORE its content changes.
          It carries the answer as a sentence rather than mirroring the visual
          block, because the visual block is a grid of numbers, band scales and
          citation lines whose reading order out loud is not the reading order
          on screen. The band scale and range strip are aria-hidden for the same
          reason; this is where their meaning is spoken instead.
          The blocking summary is deliberately NOT here: it changes on every
          keystroke, and each field already announces itself on blur.
          IT ANNOUNCES `flatValues`, NOT EVERY EMITTED VALUE — the same split the
          visible list uses. Reading the components out here as well would
          announce pSOFA's six organ subscores on every keystroke AND leave them
          in the panel below, so a listener meets each one twice while a sighted
          reader meets it once. The panel's `4 of 24` rows are ordinary text a
          few nodes away: available on demand, which is the right register for
          working. The answer is what is worth interrupting for. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {/* THE DERIVED VALUE IS ANNOUNCED, and it is announced LAST.
            Pulling it out of `flatValues` for layout must not remove it from
            what a listener hears — it is the number most likely to be acted
            on. Last, and named as derived, because that is the order it is
            reached on screen: the score, then what follows from it. */}
        {ok
          ? [...flatValues, ...(derivedValue ? [derivedValue] : [])]
              .map((v) => {
                const band = matchInterpretationBand(definition, v.id, v.value);
                const num = `${v.label.en} ${v.value.toFixed(v.precision)}${v.unit ? ` ${v.unit}` : ""}`;
                return band ? `${num}, ${band.label.en}` : num;
              })
              .join(". ")
          : ""}
      </div>

      {!ok ? (
        blocking.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">{c.resultPlaceholder}</p>
        ) : (
          /* NAMED AND LINKED, not just "enter values". The reference this was
             measured against fails here in the other direction — its incomplete
             submit adds an `.error` class that has no CSS rule in any of its
             stylesheets, so the user gets literally nothing — and arriving at
             the same place by a different route would be no better.
             Amber, never crimson: in this palette crimson is the brand and must
             never mean error. */
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-sm text-ink-muted">{c.resultBlockedHeading}</p>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {blocking.slice(0, BLOCKING_SHOWN).map((b) => (
                <li key={b.id} className="text-sm">
                  {/* A BUTTON, NOT AN ANCHOR. `href="#field-x"` navigates by
                      writing the fragment — and this page's fragment IS its
                      field state, so clicking a jump link replaced
                      `#pao2=180~mmHg` with `#field-fio2` and silently discarded
                      every entered value from the URL. "Copy link with these
                      values" then copied a link with none, and a reload lost
                      the lot. The comment on the source line below rejects an
                      anchor for exactly this reason; these had it anyway.
                      Scrolling and focusing directly does the same job and
                      leaves the URL alone. */}
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`field-${b.id}`);
                      if (!el) return;
                      el.scrollIntoView({ block: "center", behavior: "smooth" });
                      // A fieldset is not focusable; focus its first control so
                      // the keyboard lands where the eye does.
                      (el.matches("input, select, textarea")
                        ? el
                        : el.querySelector<HTMLElement>("input, select, textarea")
                      )?.focus({ preventScroll: true });
                    }}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-left text-alert-text underline decoration-alert-text/40 underline-offset-2 hover:decoration-alert-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span
                      aria-hidden="true"
                      className="numeric inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-alert-bg text-[11px] font-medium"
                    >
                      !
                    </span>
                    <span>
                      {b.label}
                      <span className="sr-only">{` — ${b.message}. ${c.resultBlockedJump}`}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {/* CAPPED. PELOD-2 declares all eleven inputs required, so one
                entry produced ten 44px links — taller than the sticky rail's
                own window on a 1024px laptop, and a sticky element taller than
                its viewport stops holding position. The count still tells the
                truth about how much is left. */}
            {blocking.length > BLOCKING_SHOWN ? (
              <p className="text-sm text-ink-muted">
                {c.resultBlockedMore.replace("{n}", String(blocking.length - BLOCKING_SHOWN))}
              </p>
            ) : null}
          </div>
        )
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {/* `data-result-values` is a test hook, and it earns its keep: the
              double-rendering regression it guards is only visible in the LABELS
              when `multi` is true, so a text-based assertion silently stops
              catching it the moment a composite drops to one flat value. Counting
              the rendered blocks catches it either way. */}
          <div
            data-result-values={flatValues.length}
            className={cn("flex flex-col", multi ? "gap-3" : "gap-4")}
          >
            {flatValues.map((v) => {
              const band: InterpretationBand | undefined = matchInterpretationBand(
                definition,
                v.id,
                v.value,
              );
              const bands = bandsFor(v.id);
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
                      !multi || v.id === primaryId ? "text-4xl" : "text-2xl",
                    )}
                  >
                    {v.value.toFixed(v.precision)}
                    {v.unit ? (
                      <span
                        className={cn(
                          "ml-1 text-ink-muted",
                          !multi || v.id === primaryId ? "text-xl" : "text-base",
                        )}
                      >
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
                  {band && bands.length > 1 ? (
                    <>
                      {/* WHERE THE NUMBER SITS, not only what it is called.
                          The cutpoints lived one tab-click away and below the
                          fold; a clinician reading pSOFA 9 wants to see that
                          the threshold is >8 and that they are one point over
                          it. Proximity to a threshold IS the clinical
                          information, and a sentence cannot carry it.

                          EQUAL-WIDTH SEGMENTS, deliberately. Bands are often
                          open-ended, so proportional widths would draw a
                          magnitude the score does not have. Position says
                          WHICH band; the number itself says how much.

                          Crimson marks "you are here", never "this is bad" —
                          there is no green-amber-red ramp. Severity is carried
                          by the band's own ordinal label and by where the mark
                          sits in the sequence, which is also what makes this
                          legible without colour. */}
                      <ol aria-hidden="true" className="mt-2 flex list-none gap-0.5 p-0">
                        {bands.map((b) => (
                          <li
                            key={b.id}
                            className={cn(
                              "h-1.5 flex-1 rounded-pill",
                              b.id === band.id ? "bg-accent" : "bg-border-subtle",
                            )}
                          />
                        ))}
                      </ol>
                      <p
                        aria-hidden="true"
                        className="numeric mt-1 text-[11px] tracking-[0.02em] text-ink-muted"
                      >
                        {bands.map((b) => formatBand(b)).join(" · ")}
                      </p>
                    </>
                  ) : null}
                  {band && shortSource ? (
                    /* PROVENANCE BESIDE THE NUMBER. The site's whole claim is
                       "every one referenced", and the panel showed a band
                       description with no visible source at all.
                       PLAIN TEXT, NOT A LINK: the URL fragment belongs to field
                       state, so an href="#evidence" would wipe everything the
                       clinician had entered. */
                    <p className="mt-1 text-[13px] text-ink-muted">
                      {c.sourceLabel}: {shortSource} — {c.sourceSuffix}.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* The working behind the total. Only composite scores declare a
              composition, so `componentRows` is empty for the rest and the
              panel renders nothing. */}
          <CompositionPanel rows={componentRows} />

          {/* THE SECOND STEP. Below the score and its working, because that is
              the order the reasoning runs: measure, then conclude. */}
          {derivedValue && definition.derived ? (
            <DerivedPanel
              value={derivedValue}
              label={definition.derived.label.en}
              description={definition.derived.description.en}
              caution={definition.derived.caution?.en}
            />
          ) : null}

          {/* BESIDE THE NUMBER. A result-invalidating caveat that only appears
              in a Limitations tab is a caveat most readers will never meet.
              Amber with a non-colour marker, never crimson. */}
          {definition.cautions?.map((caution) => (
            <Callout key={caution.key} tone="alert" className="text-[13px]">
              {caution.en}
            </Callout>
          ))}

          {showPartialCue && (
            <Callout tone="note" className="text-[13px]" data-print="hide">
              {c.partialResultNote}
            </Callout>
          )}

          {/* Two ways out of the page, because there are two things a
              clinician does with a score: paste it into a note, or put it in
              the record. The print stylesheet already existed and was already
              careful — full-width result, chosen answers only, link targets
              spelled out — and `printLabel` had been sitting in the copy file
              with nothing rendering it, so the whole printable record was
              reachable only by knowing the browser shortcut. */}
          <div className="flex flex-wrap gap-2" data-print="hide">
            <button
              type="button"
              onClick={onCopy}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium text-ink-strong",
                "transition-colors duration-150 hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              )}
            >
              {copied ? c.copied : c.copyResult}
            </button>
            <button
              type="button"
              onClick={onCopyLink}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium text-ink-strong",
                "transition-colors duration-150 hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              )}
            >
              {linkCopied ? c.copied : c.copyLinkLabel}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border-strong px-4 text-sm font-medium text-ink-strong",
                "transition-colors duration-150 hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              )}
            >
              {c.printLabel}
            </button>
          </div>
        </div>
      )}
      <Callout tone="note" className="mt-6 text-[13px]">
        {c.privacyLine}
      </Callout>
    </aside>
  );
}
