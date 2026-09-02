"use client";

import { useEffect, useState } from "react";
import { cn } from "@towardpcc/ui";

/**
 * Sticky header that shrinks once scrolling begins, reclaiming vertical space
 * on a phone at the bedside.
 *
 * The trigger is 70px, not the ~10px the reference implementations use — at
 * 10px the bar flinches on any twitch of the wheel. Scroll state is read via a
 * passive listener and only ever toggles a boolean, so no layout work happens
 * per frame.
 */
export function StickyShell({ children }: { children: React.ReactNode }) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 70);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-print="hide"
      // Named for the view transition, so the header holds position across a
      // navigation instead of cross-fading with the page beneath it. It is
      // literally the same element either side; saying so is what stops the
      // flicker. See the @view-transition block in globals.css.
      data-site-header
      className={cn(
        "sticky top-0 z-50 transition-[box-shadow,background-color] duration-150",
        // GLASS ONCE STUCK. Content scrolling under the bar shows through a
        // blur at 85% surface, which is what makes a sticky header read as
        // floating over the page rather than cutting it off. The mix is written
        // out rather than as `bg-surface-raised/85`: the modifier form read as
        // opaque on the one measurement taken, and rather than argue with a
        // possibly mid-transition sample, this form was verified translucent
        // at 0.85 across six samples over 2.5 s (2026-08-17). It is what is
        // known to work.
        // At rest it is
        // fully opaque, so nothing bleeds into the hero band. `backdrop-filter`
        // is a paint property, not a layout one, so motion.md is untouched.
        stuck
          ? "bg-[color-mix(in_oklab,var(--color-surface-raised)_85%,transparent)] backdrop-blur-md shadow-[0_6px_28px_-14px_rgba(61,21,38,0.35)]"
          : // A hairline drawn as a shadow so it costs no layout height. It was
            // painted in a fill colour (1.06:1) and so was never visible.
            "bg-surface-raised shadow-[0_1px_0_var(--color-border)]",
      )}
    >
      <div
        className={cn(
          // `relative` is the mega-menu's positioning context, deliberately.
          // It used to anchor to its own <li>, which is only as wide as the
          // "Calculators" button — so an 860px panel right-aligned to a trigger
          // sitting mid-nav extended off the left edge of the screen and the
          // first column was unreadable. Anchoring here bounds it to the header
          // container, which is the widest thing it can be aligned to without
          // escaping the page gutter.
          "relative mx-auto flex max-w-[1280px] items-center gap-7 px-6 transition-[height] duration-200",
          stuck ? "h-[64px]" : "h-[84px]",
        )}
      >
        {children}
      </div>
    </header>
  );
}
