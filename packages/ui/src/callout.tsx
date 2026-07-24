import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type CalloutTone = "note" | "alert" | "success";

export interface CalloutProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CalloutTone;
}

const tones: Record<CalloutTone, { box: string; role: string }> = {
  note: { box: "bg-surface-sunken/60 text-ink-body", role: "note" },
  alert: { box: "bg-alert-bg text-alert-text", role: "alert" },
  success: { box: "bg-success-bg text-success-text", role: "status" },
};

/** Quiet inline notice — used for privacy lines, disclaimers, form-level messages. */
export function Callout({ tone = "note", className, ...props }: CalloutProps) {
  const t = tones[tone];
  return (
    <div
      role={t.role}
      className={cn("rounded-md px-4 py-3 text-sm leading-relaxed", t.box, className)}
      {...props}
    />
  );
}
