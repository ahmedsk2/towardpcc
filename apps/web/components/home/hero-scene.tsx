"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@towardpcc/ui";
import { HeroWaveform } from "./hero-waveform";

// Its own chunk, so it never lands in the home page's first-load JS
// (PRD §5.4 / §10). The poster is already on screen while it arrives.
const WaveformCanvas = dynamic(() => import("./waveform-canvas").then((m) => m.WaveformCanvas), {
  ssr: false,
});

/**
 * The hero scene: an animated respiratory waveform over a static poster.
 *
 * There is exactly ONE condition on the animation — `prefers-reduced-motion`.
 * The previous version also required a fine pointer, a viewport wider than
 * 768px, and WebGL; on a touchscreen laptop `pointer: coarse` is true, so the
 * scene never mounted and the hero was simply static. Measured in production:
 * zero canvas elements, and one running animation on the whole page (an 8px
 * dot). Canvas 2D needs no WebGL and costs a few KB, so there is nothing left
 * to gate on — it runs on phones and touchscreens too.
 *
 * Under reduced motion the canvas is never mounted and the poster stands
 * alone, which is motion.md rule 1 verbatim ("the P4 hero — poster only").
 *
 * The poster stays in the DOM either way: it is the server-rendered and no-JS
 * layer, so the hero is never blank, and it carries the accessible name for
 * the whole scene. The canvas is decorative and aria-hidden, so it adds
 * nothing to the reading order.
 */
export function HeroScene({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Tracked live rather than read once: a reader who turns reduced motion on
    // should see it stop, without reloading.
    const apply = () => setAnimate(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative aspect-[640/460]", className)}>
      <HeroWaveform
        className={cn(
          "h-full w-full transition-opacity duration-700",
          // Faded rather than unmounted, so there is no swap flicker when the
          // canvas chunk lands and the accessible label never leaves the tree.
          animate ? "opacity-0" : "opacity-100",
        )}
      />
      {animate ? <WaveformCanvas active={inView} /> : null}
    </div>
  );
}
