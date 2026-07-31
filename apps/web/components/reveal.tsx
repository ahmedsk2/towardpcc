"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Where the element travels from. `up` is the default 12px rise. */
export type RevealFrom = "up" | "left" | "right" | "scale";

/**
 * One-time entry reveal (docs/design/motion.md).
 *
 * A CSS transition plus a one-shot IntersectionObserver, so it costs no
 * animation library in the first-load bundle — which matters more than it
 * sounds: the templates that prompted the dial-7 revision ship GSAP, AOS and
 * jQuery to move a card five pixels, and this route has 13-23 KB of headroom
 * against the 170 KB gate.
 *
 * `delay` is how staggering works. It sets a CSS custom property rather than
 * scheduling anything in JS, so a grid of twelve cards still costs exactly one
 * observer each and no timers at all. Callers pass `delay={i * 60}`.
 *
 * Reduced motion collapses it to static in CSS, and `data-reveal` pairs with
 * the layout's <noscript> override so content stays visible when JS never runs.
 * Both of those states must show the content, never hide it — a reveal that
 * fails closed is an invisible page.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  from = "up",
}: {
  children: ReactNode;
  className?: string;
  /** Milliseconds. Stagger a list with `delay={i * 60}`. */
  delay?: number;
  from?: RevealFrom;
}) {
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
      // 30% is deliberately not 0: a card should be committed to the viewport
      // before it starts, or the whole grid animates while still off-screen.
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      data-reveal={from}
      {...(shown ? { "data-shown": "" } : {})}
      {...(delay ? { style: { "--reveal-delay": `${delay}ms` } as React.CSSProperties } : {})}
      className={className}
    >
      {children}
    </div>
  );
}
