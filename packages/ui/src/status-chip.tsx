import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type ChipTone = "accent" | "neutral" | "success";

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Chips carry real state (live / in pilot / in design / free) — never
   * decoration. Pick the tone that matches the actual status.
   */
  tone?: ChipTone;
}

const tones: Record<ChipTone, string> = {
  accent: "bg-accent-tint text-accent-deep",
  // ink-body, not ink-muted: muted on sunken is 4.41:1 — under AA for 11px text
  neutral: "bg-surface-sunken text-ink-body",
  success: "bg-success-bg text-success-text",
};

export function StatusChip({ tone = "neutral", className, ...props }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-1 font-numeric text-[11px] tracking-[0.09em] uppercase",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
