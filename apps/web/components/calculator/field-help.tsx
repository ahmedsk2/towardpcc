"use client";

import { useEffect } from "react";
import { cn } from "@towardpcc/ui";

/**
 * FIELD GUIDANCE, ONE GESTURE AWAY (2026-09-06).
 *
 * Every numeric field used to carry its full guidance under the input — 135
 * help texts averaging 31 words — which is most of why a calculator read as
 * a wall of text. The text is not deleted: it stays in the DOM, is still the
 * input's `aria-describedby` target (a screen reader hears it exactly as
 * before; the accessible description is computed from hidden nodes too), and
 * is shown visually two ways:
 *
 * - hover or keyboard focus on the ⓘ shows it as a tooltip under the label,
 *   opacity/translate only, 150ms, static under reduced motion;
 * - click or tap PINS it inline under the field (`aria-expanded`), so touch
 *   has a designed path rather than relying on the hover variant firing on
 *   touch. Escape, a second click, or pinning another field unpins it.
 *
 * CONTROLLED, NOT SELF-OWNED. Which field is pinned is form state
 * (`pinnedHelp` in calculator-form.tsx), passed down as `pinned`, so "one at a
 * time" is a fact about one piece of state rather than a protocol between
 * siblings — the first cut coordinated fields through a document-level event,
 * which a review pointed out could leave two fields pinned when two pins
 * landed in one tick, and would cross between two forms on one page. Never
 * the URL. Print keeps the guidance hidden: a printed record wants the chosen
 * values, not the guidance.
 */
export function FieldHelp({
  helpId,
  label,
  text,
  pinned,
  onPinChange,
  className,
}: {
  /** The id the input's aria-describedby already points at. */
  helpId: string;
  label: string;
  text: string;
  pinned: boolean;
  onPinChange: (pinned: boolean) => void;
  className?: string | undefined;
}) {
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPinChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pinned, onPinChange]);

  /**
   * TWO SIBLINGS, NOT ONE WRAPPER — and the ROW is the positioning context.
   *
   * The first cut put everything inside one `relative inline-flex` span: the
   * tooltip anchored to the ⓘ, so on a 375px phone it ran 54px off the right
   * edge and, laid out even at rest, added 169px of sideways scroll to the
   * page; and the pinned copy, a `basis-full` item inside a nowrap inline-flex
   * container, rendered squeezed beside the button instead of under the label
   * (measured 2026-09-07 with Playwright against the dev server).
   *
   * So the caller's label row is `relative flex flex-wrap`: the tooltip is
   * `absolute start-0 top-full` against THAT row and capped at its width, and
   * the pinned copy is a second child of the row with `basis-full`, which a
   * wrapping flex row puts on a line of its own at full width.
   */
  return (
    <>
      <span className={cn("group/help inline-flex", className)} data-print="hide">
        <button
          type="button"
          onClick={() => onPinChange(!pinned)}
          aria-expanded={pinned}
          aria-controls={helpId}
          aria-label={`About ${label}`}
          className={cn(
            "grid size-6 place-items-center rounded-pill border font-numeric text-[12px] font-semibold",
            "transition-[color,border-color,background-color] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            pinned
              ? "border-accent bg-accent-tint text-accent-deep"
              : "border-border-strong text-ink-muted hover:border-accent hover:bg-accent-tint hover:text-accent-deep",
          )}
        >
          i
        </button>
        {/* Tooltip: shown on hover/focus of the button, never when pinned (the
          inline copy below takes over). `hidden` is not used here because the
          node must stay in the accessibility tree for aria-describedby — it
          is visually collapsed with opacity and pointer-events instead, and
          `aria-hidden` keeps the tooltip copy from being read twice. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute start-0 top-full z-20 mt-1.5 w-max max-w-[min(44ch,100%)] rounded-md bg-ink-strong px-3.5 py-2.5 text-[13px] leading-relaxed font-normal text-surface-page shadow-xl",
            "opacity-0 -translate-y-1 transition-[opacity,translate] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
            !pinned &&
              "group-hover/help:opacity-100 group-hover/help:translate-y-0 group-focus-within/help:opacity-100 group-focus-within/help:translate-y-0",
          )}
        >
          {text}
        </span>
      </span>
      {/* The accessible copy. Always in the DOM (aria-describedby reads hidden
          nodes); visible only when pinned, on its own full-width line under
          the label row. `hidden` toggles display (Tailwind's preflight makes
          the attribute win over any display utility). */}
      <span
        id={helpId}
        hidden={!pinned}
        data-print="hide"
        className="mt-1 block basis-full rounded-md bg-surface-sunken px-3.5 py-2.5 text-[13px] leading-relaxed font-normal text-ink-body"
      >
        {text}
      </span>
    </>
  );
}
