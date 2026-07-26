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
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
      className={cn(
        "fixed end-6 z-[90] grid size-12 place-items-center rounded-full bg-gradient-accent text-white",
        "shadow-[0_14px_30px_-10px_rgba(207,31,61,0.8)] transition-[bottom] duration-300",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        shown ? "bottom-6" : "-bottom-20",
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
