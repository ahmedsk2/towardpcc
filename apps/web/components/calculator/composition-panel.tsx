import type { Composition, ScoreValue } from "@towardpcc/scoring-engine";
import { cn } from "@towardpcc/ui";

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
export function CompositionPanel({
  composition,
  values,
}: {
  composition: Composition;
  values: readonly ScoreValue[];
}) {
  const rows = composition.components
    .map((c) => {
      const v = values.find((x) => x.id === c.id);
      if (!v) return null;
      const min = c.min ?? 0;
      const span = c.max - min;
      // Clamped: a value outside its declared range is a bug caught by
      // registry-gate, but it must never render a bar wider than its track.
      // A zero span would divide to NaN, which poisons the CSS variable and
      // invalidates the transform outright — floor it to an empty bar instead.
      const fill = span > 0 ? Math.max(0, Math.min(1, (v.value - min) / span)) : 0;
      return { id: c.id, label: v.label.en, value: v.value, max: c.max, fill };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border-subtle pt-4">
      <p className="m-0 font-numeric text-eyebrow tracking-[0.1em] text-ink-muted uppercase">
        What makes up this total
      </p>
      <dl className="mt-3 m-0 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <dt className="text-[13px] text-ink-body">{r.label}</dt>
            <dd className="numeric m-0 font-numeric text-[13px] text-ink-strong tabular-nums">
              {r.value} of {r.max}
            </dd>
            <span
              aria-hidden="true"
              className="col-span-2 h-1.5 overflow-hidden rounded-pill bg-border-subtle"
            >
              <span
                data-fill-immediate=""
                className={cn("chip-meter block h-full origin-left rounded-pill bg-accent")}
                style={{ "--fill": r.fill } as React.CSSProperties}
              />
            </span>
          </div>
        ))}
      </dl>
    </div>
  );
}
