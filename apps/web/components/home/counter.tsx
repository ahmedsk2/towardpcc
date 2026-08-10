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
  /**
   * `null` means "show the real number". THE SERVER MUST RENDER THE TRUTH.
   *
   * This was `useState(0)`, so the served HTML literally contained
   * "0 Referenced calculators" and "0 calculators, live today". That is what a
   * crawler indexes and what anything reading the document before hydration
   * receives, on a site whose whole pitch is that every figure is countable.
   * Found by an outside reviewer extracting the homepage text, which is exactly
   * how it would have been found by a reader.
   *
   * The animation is now an enhancement layered on a correct first paint: the
   * number is in the DOM from the start, and only drops to zero to count up if
   * the element was OFF SCREEN when the page loaded. Already in view means no
   * animation, because the alternative is showing the real figure and then
   * visibly wiping it to zero.
   */
  const [display, setDisplay] = useState<number | null>(null);
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
        setDisplay(null);
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

    // Both bail-outs below simply RETURN, leaving `display` null so the real
    // number stays on screen. No setState: the effect cannot re-run while its
    // deps are unchanged, so marking `done` would buy nothing and would be a
    // synchronous setState in an effect body, which this repo lints against.
    if (typeof IntersectionObserver === "undefined") return;

    // Already on screen at first paint: a hash jump, a short page, or simply
    // above the fold. Counting up from zero here would mean replacing a correct
    // number with a wrong one in front of the reader.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;

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
      {(display ?? value).toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
