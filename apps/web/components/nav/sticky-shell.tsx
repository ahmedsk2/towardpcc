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
      className={cn(
        "sticky top-0 z-50 bg-surface-raised transition-shadow duration-150",
        stuck
          ? "shadow-[0_6px_28px_-14px_rgba(61,21,38,0.35)]"
          : // A hairline drawn as a shadow so it costs no layout height. It was
            // painted in a fill colour (1.06:1) and so was never visible.
            "shadow-[0_1px_0_var(--color-border)]",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1280px] items-center gap-7 px-6 transition-[height] duration-200",
          stuck ? "h-[64px]" : "h-[84px]",
        )}
      >
        {children}
      </div>
    </header>
  );
}
