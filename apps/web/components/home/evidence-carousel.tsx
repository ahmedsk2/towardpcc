"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@towardpcc/ui";
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
  /**
   * A bare scroll-snap rail gives no sense of position: the scrollbar is
   * hidden, so there is nothing to say how many cards there are, which one you
   * are on, or that you have reached the end. The arrows also stayed enabled
   * at both extremes, where pressing them does nothing — a control that
   * accepts a click and produces no change reads as broken rather than as
   * finished.
   *
   * Derived from scroll position rather than tracked as an index, so a swipe,
   * a trackpad flick and an arrow press all agree without anything to keep in
   * sync.
   */
  const [pos, setPos] = useState({ index: 0, atStart: true, atEnd: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const read = () => {
      const max = el.scrollWidth - el.clientWidth;
      const card = el.firstElementChild as HTMLElement | null;
      // Card width plus the flex gap; falls back to the viewport if the rail
      // is somehow empty, so this can never divide by zero.
      const step = card ? card.offsetWidth + 24 : el.clientWidth || 1;
      setPos({
        index: Math.min(e.items.length - 1, Math.round(el.scrollLeft / step)),
        atStart: el.scrollLeft <= 4,
        // 4px of slack: sub-pixel layout means scrollLeft rarely lands exactly
        // on max, and an end state that never triggers is worse than none.
        atEnd: el.scrollLeft >= max - 4,
      });
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      el.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(454, el.clientWidth * 0.9),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (!card) return;
    el.scrollTo({
      left: card.offsetLeft - el.offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    // No edge-fade mask here, deliberately. It was tried and removed: a mask on
    // this wrapper also fades the arrows and dots below the track, and moving
    // it to a track-only wrapper still clips descendant focus rings, which
    // would break the keyboard affordance the dots exist to provide. Position
    // is already carried by the indicators and the end-disabled arrows — the
    // fade was the least informative of the three and the only one that fought
    // accessibility to get there.
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
            className="group flex w-[min(26rem,82vw)] shrink-0 snap-start flex-col gap-4 rounded-lg border border-border bg-surface-raised p-8 transition-[translate,box-shadow,border-color] duration-300 ease-[var(--motion-ease)] hover:border-accent hover:shadow-lg motion-safe:hover:-translate-y-1"
          >
            {/* Stays peach. Coral on a light ground is 2.55:1 and tokens.css
                pins it dark-surface-only; this is decorative and aria-hidden,
                which is the only reason a 1.9:1 mark is legal here at all. */}
            <span
              aria-hidden="true"
              className="font-display text-5xl leading-[0.4] text-peach transition-[scale] duration-300 ease-[var(--motion-ease)] motion-safe:group-hover:scale-110"
            >
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

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={pos.atStart}
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
        {/* Position, so the rail says how much there is and where you are.
            Real buttons rather than dots-as-decoration: each jumps to its card
            and carries the citation's source as its accessible name, so a
            screen-reader user gets "Del Fiol et al…" rather than "3 of 5". */}
        <ol className="flex list-none items-center gap-2">
          {e.items.map((item, i) => (
            <li key={item.source}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-controls="evidence-track"
                aria-current={pos.index === i ? "true" : undefined}
                // aria-label rather than an sr-only child: the visible content
                // is a decorative dot, so the label IS the accessible name and
                // putting it in the attribute keeps the two from drifting.
                aria-label={item.source}
                className="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span
                  aria-hidden="true"
                  // One fixed 20x6 box in both states; only `scale` and colour
                  // move. The previous pair swapped width and height under
                  // `transition-all`, which animates layout — banned by
                  // motion.md revision 4, and it forced a reflow of the whole
                  // indicator row on every slide change.
                  className={cn(
                    "block h-1.5 w-5 origin-center rounded-full transition-[scale,background-color] duration-200 ease-[var(--motion-ease)] motion-reduce:transition-none",
                    pos.index === i ? "scale-100 bg-accent" : "scale-x-[0.3] bg-border-strong/50",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={pos.atEnd}
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
  "grid size-11 place-items-center rounded-full border-2 border-border-strong bg-surface-raised text-ink-strong transition-colors duration-150 " +
  "hover:border-accent hover:bg-accent hover:text-ink-on-accent " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  // At the ends the button is disabled, so it must stop offering hover
  // feedback too — a control that lights up and then does nothing is the thing
  // that reads as broken. Kept focusable-looking rather than hidden so the
  // rail's shape does not shift as you scroll.
  "disabled:cursor-default disabled:border-border disabled:bg-transparent disabled:text-ink-muted/40 " +
  "disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-ink-muted/40";
