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
      <div className="flex items-center justify-between gap-3">
        <p className="font-numeric text-[11px] tracking-[0.08em] text-ink-muted uppercase">
          {c.validationPending}
        </p>
        {/* An honest 0-of-2 meter: one filled segment per assigned validator,
            so "pending" carries how far along it is rather than reading as a
            binary stamp. Muted, never crimson — an incomplete state is not an
            error on this site. */}
        <span aria-hidden="true" className="flex shrink-0 gap-1">
          {validators.map((v, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${
                v.status === "assigned" ? "bg-success-text" : "bg-ink-muted/25"
              }`}
            />
          ))}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{c.validationPendingDetail}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {validators.map((v, i) => (
          <div
            key={i}
            className="rounded-sm border border-border-subtle bg-surface-sunken/40 px-3 py-2 text-sm text-ink-muted"
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
