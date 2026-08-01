"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@towardpcc/ui";

export type ScoreTab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

/**
 * The calculator page's reference zone.
 *
 * Formula, limitations, evidence and version history used to stack as four
 * full-width prose sections below the form, which is most of why the page read
 * as a wall of text. Collapsed into one zone they cost the height of the
 * tallest panel instead of the sum of all four.
 *
 * Panel content is server-rendered and passed in as React elements, so nothing
 * here needs the score definition and no clinical data crosses the RSC
 * boundary as props.
 *
 * Tab state is component state, never the query string. Anything in the query
 * string ends up in the Referer header, and content/privacy-invariant.test.ts
 * fails the build if any file under this tree reads one — the calculator
 * privacy invariant covers the whole route, not just the inputs.
 * (That guard scans raw source, so this comment deliberately avoids naming
 * the banned API.)
 *
 * Without JavaScript every panel renders open (see the <noscript> rule below),
 * because reference material on a clinical page should not depend on
 * hydration to be readable.
 */
export function ScoreTabs({ items }: { items: readonly ScoreTab[] }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = items.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    // No top margin: the parent grid's row gap owns the space above this zone.
    // Carrying both stacked them into an 80px gap on a phone.
    <div>
      <noscript>
        <style
          dangerouslySetInnerHTML={{ __html: "[data-score-panel]{display:block!important}" }}
        />
      </noscript>

      <div
        role="tablist"
        aria-label="Score details"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-1 border-b border-border"
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={active === i}
            aria-controls={`${base}-panel-${item.id}`}
            // Roving tabindex: one stop for the whole tablist, arrows move
            // between tabs. Tabbing through every tab would be tedious on a
            // page a clinician is trying to get an answer from.
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "group relative -mb-px inline-flex min-h-11 items-center rounded-t-md px-4 py-2.5 text-sm font-medium",
              "transition-colors duration-150 ease-[var(--motion-ease)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active === i ? "text-accent-deep" : "text-ink-muted hover:text-ink-strong",
            )}
          >
            {item.label}
            {/* The same trace the nav uses, so the site has one idiom for "this
                is the current one" rather than a border swap here and a rule
                there. A 2px border that appears and disappears also shifted the
                label by 2px on every tab change; a scaled bar never moves it.

                `transition-[scale]`, because Tailwind v4 compiles `scale-x-*`
                to the `scale` property — naming `transform` would transition
                nothing, which is what left eight hover lifts inert site-wide. */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent",
                "transition-[scale] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
                active === i
                  ? "origin-left scale-x-100"
                  : "origin-right scale-x-0 group-hover:origin-left group-hover:scale-x-100",
              )}
            />
          </button>
        ))}
      </div>

      {items.map((item, i) => (
        <section
          key={item.id}
          data-score-panel
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          // tabIndex 0 so a keyboard user can scroll a long panel that holds
          // no focusable content of its own.
          tabIndex={0}
          hidden={active !== i}
          // Carried so the print stylesheet can title each panel once the tab
          // strip is gone. Three of the four panels are `hidden` at any moment,
          // so a printed record shipped with whichever tab happened to be open
          // and silently dropped the formula, the limitations or the evidence
          // that justified the number.
          data-panel-title={item.label}
          className="pt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {item.content}
        </section>
      ))}
    </div>
  );
}
