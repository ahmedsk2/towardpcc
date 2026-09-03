import { Callout } from "@towardpcc/ui";
import type { Composition, DerivedOutput, ScoreValue } from "@towardpcc/scoring-engine";

/** One declared component, paired with the value the score actually emitted. */
export interface ComponentRow {
  readonly id: string;
  readonly label: string;
  /**
   * Formatted HERE, once, to the emitted value's own precision — the same
   * `toFixed(precision)` every other number on this page goes through. Every
   * component in the corpus is an integer today, so this is invisible; the
   * point is that a non-integer one would not be the single number on the page
   * printing its raw float.
   */
  readonly value: string;
  /** The instrument maximum, to the same precision, so the pair reads as a pair. */
  readonly max: string;
  /** 0–1 proportion of the component's own declared span. */
  readonly fill: number;
  /**
   * Why this component reads the way it does, when an ENTERED value did not
   * reach it. Present only when the score emitted one for these values, so
   * a row without it renders exactly as it always has.
   */
  readonly notice?: string;
}

export interface CompositionSplit {
  /**
   * Everything the score emitted that neither the composition nor a `derived`
   * declaration accounts for — the total, plus any UNdeclared extra output
   * (PELOD-2's mortality probability, Phoenix's sepsis and septic-shock flags).
   */
  readonly flat: readonly ScoreValue[];
  /** The declared components, in declaration order. */
  readonly components: readonly ComponentRow[];
  /**
   * The declared derived output, when the score declares one AND emitted it on
   * this run. Conditionally emitted is expected — PRISM shows a probability
   * only on the 4-hour window, and only once all four covariates are answered —
   * so `undefined` here is an ordinary state, not a missing value.
   */
  readonly derived?: ScoreValue;
}

/**
 * Split what a score emitted into the values the result list states and the
 * components the panel explains.
 *
 * ONE PREDICATE, THREE CONSUMERS. The flat value list, the `aria-live`
 * announcement and the clipboard summary all read `result.values`, and when
 * only the list filtered, pSOFA's six organ subscores rendered once but were
 * ANNOUNCED twice — once by the live region, once by this panel's own text —
 * and were silently appended to a timestamped clinical record as six
 * undifferentiated extra lines. Returning both halves from one function is what
 * stops the three drifting apart again; each consumer then decides which half
 * it wants, which is a decision, not an oversight.
 */
export function splitComposition(
  values: readonly ScoreValue[],
  composition: Composition | undefined,
  derived?: DerivedOutput,
): CompositionSplit {
  if (!composition) return { flat: values, components: [] };
  const byId = new Map(values.map((v) => [v.id, v]));
  const components = composition.components.flatMap<ComponentRow>((c) => {
    const v = byId.get(c.id);
    // A declared component the score does not emit is a bug caught by
    // registry-gate; here it simply drops out rather than rendering a blank row.
    if (!v) return [];
    const min = c.min ?? 0;
    const span = c.max - min;
    // Clamped: a value outside its declared range is a bug caught by
    // registry-gate, but it must never render a bar wider than its track.
    // A zero span would divide to NaN, which poisons the CSS variable and
    // invalidates the transform outright — floor it to an empty bar instead.
    const fill = span > 0 ? Math.max(0, Math.min(1, (v.value - min) / span)) : 0;
    return [
      {
        id: c.id,
        label: v.label.en,
        value: v.value.toFixed(v.precision),
        max: c.max.toFixed(v.precision),
        fill,
        ...(v.notice ? { notice: v.notice.text.en } : {}),
      },
    ];
  });
  const claimed = new Set(components.map((r) => r.id));
  // The derived value leaves the flat list so it does not render twice — once
  // as a peer of the total and once in its own block. Adding it to `claimed`
  // rather than filtering separately keeps the ONE PREDICATE promise above: a
  // consumer that reads `flat` cannot accidentally get it back.
  const derivedValue = derived ? byId.get(derived.id) : undefined;
  if (derivedValue) claimed.add(derivedValue.id);
  return {
    flat: values.filter((v) => !claimed.has(v.id)),
    components,
    ...(derivedValue ? { derived: derivedValue } : {}),
  };
}

/**
 * What makes up a composite total.
 *
 * A clinician reading pSOFA 15 learns the magnitude and nothing about the
 * shape — fifteen from three organs at maximum is a different patient from
 * fifteen spread across six. The engine already knew which; this renders it.
 *
 * NO SEVERITY COLOUR RAMP, deliberately. The reference site this came from
 * ramps each row green through red; ADR-design-direction states crimson never
 * means error, and a per-row ramp would teach exactly that association on the
 * most-read surface here. Proportion is carried by bar LENGTH in one accent
 * tone instead.
 *
 * The bars are aria-hidden and the `4 of 24` text is the accessible content —
 * the same decision the evidence chips make, for the same reason: nothing in a
 * graphic may be the sole carrier of a value.
 *
 * `data-fill-immediate` is load-bearing: the shared `.chip-meter` rule holds a
 * meter at `scaleX(0)` until a `[data-shown]` ancestor releases it, and that
 * ancestor is the `Reveal` wrapper. The result rail is not revealed — it is
 * sticky and mounted from first paint — so without the opt-in every bar here
 * would render at zero width. See globals.css.
 */
export function CompositionPanel({ rows }: { rows: readonly ComponentRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border-subtle pt-4">
      <p className="m-0 font-numeric text-eyebrow tracking-[0.1em] text-ink-muted uppercase">
        What makes up this total
      </p>
      <dl className="mt-3 m-0 flex flex-col gap-2.5">
        {rows.map((r) => (
          /**
           * THE BAR LIVES INSIDE THE `<dd>`, and it has to.
           *
           * `<dl>` permits exactly one wrapper level: `dl > div > (dt | dd)`.
           * A `<span>` sibling of the `dt`/`dd` pair — which is where this bar
           * used to sit, so it could take `col-span-2` in the row grid — is not
           * permitted content, and invalid list structure is precisely the kind
           * of thing assistive technology recovers from unpredictably.
           *
           * Being inside the `dd` costs the bar its grid placement: one element
           * cannot occupy both the right-hand cell (the number) and a full-width
           * cell beneath it. So the row reserves the strip with `pb-2.5` — the
           * old `gap-y-1` (4px) plus the bar's own `h-1.5` (6px) — and the bar
           * is placed into it against the row box. Same 6px bar, same 4px gap,
           * same full-row width: the geometry is arithmetically identical, only
           * the element that owns it has moved.
           */
          <div
            key={r.id}
            className="relative grid grid-cols-[1fr_auto] items-center gap-x-3 pb-2.5"
          >
            <dt className="text-[13px] text-ink-body">{r.label}</dt>
            <dd className="numeric m-0 font-numeric text-[13px] text-ink-strong tabular-nums">
              {r.value} of {r.max}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 block h-1.5 overflow-hidden rounded-pill bg-border-subtle"
              >
                <span
                  data-fill-immediate=""
                  className="chip-meter block h-full origin-left rounded-pill bg-accent"
                  style={{ "--fill": r.fill } as React.CSSProperties}
                />
              </span>
            </dd>
          </div>
        ))}
        {rows
          .filter((r) => r.notice)
          .map((r) => (
            /**
             * ITS OWN ROW, not a second `dd` in the value's row.
             *
             * The proportion bar is `absolute inset-x-0 bottom-0` against the
             * row box, so anything added to that box pushes the bar down and
             * away from the number it measures — measured at 1280x900, the
             * Respiratory bar detached by 41px on the one row carrying a
             * notice. `dl > div > dd` with no `dt` is valid, so the sentence
             * gets a row of its own and the geometry above is untouched.
             */
            <div key={`${r.id}-notice`} className="-mt-1">
              <dd className="m-0 text-[12px] leading-snug text-alert-text">{r.notice}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

/**
 * A value the score DERIVES from the components above it.
 *
 * WHY ITS OWN BLOCK AND NOT A ROW. Rendered as a peer of the total — which is
 * how PRISM's mortality probability rendered until v2.6.0 — two numbers sit
 * side by side at equal weight and read as two equally direct measurements of
 * the same patient. They are not. The score is measured; the probability is
 * concluded from it, by a model with its own provenance, its own population and
 * its own failure mode. The separation is the claim.
 *
 * THE CAUTION BELONGS HERE, NOT WITH THE SCORE. PRISM's Gulf calibration
 * finding is about the probability specifically: discrimination held at AUC
 * 0.81 and it is calibration that failed. Rendered once for the whole score it
 * attached a probability caveat to a score that does not deserve one, and
 * detached it from the figure a clinician actually reads. Amber with a
 * non-colour marker, never crimson — crimson never means error here.
 *
 * NO BAND SCALE, deliberately. The flat list draws one where interpretation
 * bands exist; PRISM declares none and never will (`interpretationStatus:
 * "not-applicable"`), and inventing a ramp for a probability would imply
 * thresholds nobody published.
 */
export function DerivedPanel({
  value,
  label,
  description,
  caution,
}: {
  readonly value: ScoreValue;
  readonly label: string;
  readonly description: string;
  readonly caution?: string | undefined;
}) {
  return (
    <section
      data-derived-output={value.id}
      aria-labelledby={`derived-${value.id}-heading`}
      className="rounded-lg border border-border bg-surface-sunken p-4"
    >
      <h3
        id={`derived-${value.id}-heading`}
        className="font-display text-sm font-medium text-ink-strong"
      >
        {label}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>
      <p className="numeric mt-3 text-3xl font-medium tabular-nums text-ink-strong">
        {value.value.toFixed(value.precision)}
        {value.unit ? <span className="ml-1 text-lg text-ink-muted">{value.unit}</span> : null}
      </p>
      {/* The shared Callout, not a hand-rolled amber box: it already carries
          the ADR rule that an alert is amber PLUS a non-colour marker, and a
          second implementation of that contract is a second place for it to
          drift. `live` stays false — this is static prose about the number
          beside it, not a status change worth interrupting a screen reader
          for, and the number itself is already announced by the result
          region. */}
      {caution ? (
        <Callout tone="alert" className="mt-3 text-[13px]">
          {caution}
        </Callout>
      ) : null}
    </section>
  );
}
