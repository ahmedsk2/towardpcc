import type { ValidatorSlots } from "@towardpcc/scoring-engine";
import { site } from "@/content/site";

const c = site.calculators;

/**
 * Honest validation status (PRD §6.4): two named slots, shown as "pending"
 * with visible empty slots until real validators are entered. Never renders
 * a fabricated name.
 */
export function ValidationBadge({ validators }: { validators: ValidatorSlots }) {
  const assigned = validators.filter((v) => v.status === "assigned");

  if (assigned.length === 2) {
    return (
      <div className="rounded-md bg-success-bg px-4 py-3 text-sm text-success-text">
        <span className="font-medium">{c.validatedByPrefix} </span>
        {assigned
          .map((v) => (v.status === "assigned" ? `${v.name}, ${v.credentials} (${v.date})` : ""))
          .join("; ")}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-ink-muted/50 px-4 py-3">
      <p className="font-numeric text-[11px] tracking-[0.08em] text-ink-muted uppercase">
        {c.validationPending}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{c.validationPendingDetail}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {validators.map((v, i) => (
          <div
            key={i}
            className="rounded-sm border border-surface-sunken bg-surface-sunken/40 px-3 py-2 text-sm text-ink-muted"
          >
            {v.status === "assigned"
              ? `${v.name}, ${v.credentials}`
              : `${c.validatorSlotEmpty} ${i + 1}`}
          </div>
        ))}
      </div>
    </div>
  );
}
