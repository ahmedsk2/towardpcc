import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type CalloutTone = "note" | "alert" | "success";

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
  /**
   * Set for messages that appear dynamically (form-level errors, status
   * updates) so screen readers announce them (role="alert"/"status").
   * Statically rendered notices (privacy lines, disclaimers) stay
   * role="note" regardless of tone.
   */
  live?: boolean;
}

const tones: Record<CalloutTone, { box: string; liveRole: string; marker: ReactNode }> = {
  note: { box: "bg-surface-sunken/60 text-ink-body", liveRole: "status", marker: null },
  alert: {
    box: "bg-alert-bg text-alert-text",
    liveRole: "alert",
    // ADR rule: alerts are amber + marker, never bare color
    marker: (
      <span
        aria-hidden="true"
        className="numeric mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-alert-text/50 text-[11px] font-medium"
      >
        !
      </span>
    ),
  },
  success: {
    box: "bg-success-bg text-success-text",
    liveRole: "status",
    marker: (
      <span
        aria-hidden="true"
        className="numeric mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-success-text/50 text-[11px] font-medium"
      >
        ✓
      </span>
    ),
  },
};

/** Quiet inline notice — used for privacy lines, disclaimers, form-level messages. */
export function Callout({
  tone = "note",
  live = false,
  className,
  children,
  ...props
}: CalloutProps) {
  const t = tones[tone];
  return (
    <div
      role={live ? t.liveRole : "note"}
      className={cn("rounded-md px-4 py-3 text-sm leading-relaxed", t.box, className)}
      {...props}
    >
      {t.marker ? (
        <span className="flex items-start gap-2">
          {t.marker}
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </div>
  );
}
