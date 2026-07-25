import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type CalloutTone = "note" | "alert" | "success";

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
}

const tones: Record<CalloutTone, { box: string; role: string; marker: ReactNode }> = {
  note: { box: "bg-surface-sunken/60 text-ink-body", role: "note", marker: null },
  alert: {
    box: "bg-alert-bg text-alert-text",
    role: "alert",
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
    role: "status",
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
export function Callout({ tone = "note", className, children, ...props }: CalloutProps) {
  const t = tones[tone];
  return (
    <div
      role={t.role}
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
