"use client";

import { useRef } from "react";
import { site } from "@/content/site";

const e = site.home.evidence;

/**
 * Evidence carousel — the slot the reference sites fill with invented
 * testimonials, carrying real citations instead.
 *
 * Scrolling is native CSS scroll-snap: the arrows nudge the same scroller, so
 * it works with a trackpad, a touch swipe, and the keyboard without a carousel
 * library or a scroll hijack. Under reduced motion the nudge is instant.
 */
export function EvidenceCarousel() {
  const track = useRef<HTMLUListElement>(null);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(454, el.clientWidth * 0.9),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <div>
      <ul
        ref={track}
        // Both arrow buttons declare aria-controls="evidence-track"; without
        // this id they pointed at nothing, so assistive tech could not follow
        // the relationship they advertised.
        id="evidence-track"
        tabIndex={0}
        className="flex list-none snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-scrollbar]:hidden"
      >
        {e.items.map((item) => (
          <li
            key={item.source}
            className="flex w-[min(26rem,82vw)] shrink-0 snap-start flex-col gap-4 rounded-lg border border-border bg-surface-page p-8"
          >
            <span aria-hidden="true" className="font-display text-5xl leading-[0.4] text-peach">
              &ldquo;
            </span>
            <blockquote className="font-display text-lg leading-snug font-medium text-ink-strong">
              {item.quote}
            </blockquote>
            <cite className="mt-auto border-t border-border-subtle pt-3 font-numeric text-[11px] not-italic text-ink-muted">
              {item.source}
            </cite>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => nudge(-1)}
          className={arrow}
          aria-controls="evidence-track"
        >
          <span className="sr-only">Previous</span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          className={arrow}
          aria-controls="evidence-track"
        >
          <span className="sr-only">Next</span>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

const arrow =
  "grid size-11 place-items-center rounded-full border-2 border-border-strong bg-surface-raised text-ink-strong transition-colors duration-150 hover:border-accent hover:bg-accent hover:text-ink-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
