"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Count-up animation for **marketing figures only** (motion.md rule 5).
 *
 * It is deliberately never used for a computed clinical value: rolling digits
 * teach the eye that a number is decorative, which is the opposite of what a
 * score must communicate. Fires once when scrolled into view, then stops
 * observing. Under reduced motion it renders the final value immediately —
 * the number is the point, the animation is not.
 */
export function Counter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  // `| undefined` because the repo runs exactOptionalPropertyTypes.
  suffix?: string | undefined;
  prefix?: string | undefined;
  className?: string | undefined;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done) return;

    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Every state update happens asynchronously (observer callback or a frame
    // callback), never synchronously in the effect body — a synchronous
    // setState here would trigger a cascading render.
    const run = () => {
      if (reduced) {
        setDisplay(value);
        setDone(true);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1500, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setDone(true);
      };
      raf = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      raf = requestAnimationFrame(run);
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect(); // once — never replays on scroll-back
        run();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, done]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
