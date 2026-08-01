import type { Composition, ScoreValue } from "@towardpcc/scoring-engine";

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
}

export interface CompositionSplit {
  /**
   * Everything the score emitted that the composition does NOT account for —
   * the total, plus any derived output (PRISM's and PELOD-2's mortality
   * probability, Phoenix's sepsis and septic-shock flags).
   */
  readonly flat: readonly ScoreValue[];
  /** The declared components, in declaration order. */
  readonly components: readonly ComponentRow[];
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
      },
    ];
  });
  const claimed = new Set(components.map((r) => r.id));
  return { flat: values.filter((v) => !claimed.has(v.id)), components };
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
      </dl>
    </div>
  );
}
