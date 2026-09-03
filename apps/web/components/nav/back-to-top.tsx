"use client";

import { useEffect, useState } from "react";
import { cn } from "@towardpcc/ui";
import { site } from "@/content/site";

/**
 * Back-to-top control.
 *
 * Appears at 350px — the reference implementation that fires at 100px shows
 * the button before the user has meaningfully scrolled. It slides in and then
 * stays still: a control that animates forever in the corner of a clinical
 * screen is a distraction, not a flourish. Smooth scrolling is skipped under
 * reduced motion.
 */
export function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 350);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      data-print="hide"
      data-back-to-top=""
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      className={cn(
        // `end-3` below the two-column breakpoint, not `end-6`.
        //
        // IT WAS EATING TAPS. At 320-768px the calculator form is full-width
        // and its unit toggles run to the inline end, so the FAB sat directly
        // on top of them — five PRISM fields at 375px, the kPa label 95%
        // covered at 320px, and `elementFromPoint` at the label's centre
        // returning this button. A tap left the unit unchanged and scrolled the
        // page to the top. From 1024px the two-column grid puts the FAB over
        // the gutter and nothing overlaps, which is why this never showed on a
        // desktop review.
        //
        // Paired with the end padding the form column reserves at the same
        // widths, so the button clears the controls rather than merely
        // overlapping them less.
        // `data-back-to-top` is what globals.css stands down while the
        // calculator's bottom result bar is on screen; the two are fixed to
        // the same corner and overlap at 375px.
        "fixed end-3 z-[90] grid size-12 place-items-center rounded-full bg-gradient-accent text-ink-on-accent lg:end-6",
        // `translate`, not `bottom`: bottom is a layout property, which
        // motion.md revision 4 forbids outright, and the compositor cannot
        // fast-path it. The button stays pinned at bottom-6 and slides out of
        // view on the Y axis instead.
        "shadow-[0_14px_30px_-10px_rgba(207,31,61,0.8)] bottom-6 transition-[translate] duration-300 ease-[var(--motion-ease)] motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        shown ? "translate-y-0" : "translate-y-32",
      )}
      // Keep it out of the tab order until it is actually on screen.
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
    >
      <span className="sr-only">{site.nav.backToTop}</span>
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
        <path
          d="M8 13V3M3 8l5-5 5 5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
