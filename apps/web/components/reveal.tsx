"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * One-time entry reveal — the only ambient motion the shell allows
 * (docs/design/motion.md): a 12px rise + fade, once, when the element scrolls
 * into view. Pure CSS transition + a one-shot IntersectionObserver, so it costs
 * no animation library in the first-load bundle (PRD §10 route-JS budget); the
 * heavier `motion` runtime is reserved for the P4 hero, which is lazy-loaded.
 *
 * Reduced motion collapses it to static in CSS (`prefers-reduced-motion`), and
 * `data-reveal` pairs with the layout's <noscript> override so content stays
 * visible when JS never runs. The initial hidden state lives in globals.css
 * keyed on `[data-reveal]`; adding `data-shown` triggers the transition.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div ref={ref} data-reveal {...(shown ? { "data-shown": "" } : {})} className={className}>
      {children}
    </div>
  );
}
