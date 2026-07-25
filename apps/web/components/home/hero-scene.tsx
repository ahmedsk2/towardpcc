"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@towardpcc/ui";
import { HeroWaveform } from "./hero-waveform";

// The R3F scene is its own chunk, loaded only when it will actually run — never
// in the home page's first-load JS (PRD §5.4 / §10). The poster fills the frame
// while it loads and remains the fallback everywhere the scene is suppressed.
const WaveformCanvas = dynamic(() => import("./waveform-canvas").then((m) => m.WaveformCanvas), {
  ssr: false,
  loading: () => <HeroWaveform className="h-full w-full" />,
});

/**
 * Decides between the animated R3F scene and the static poster (ADR §5.4):
 * reduced motion, small/touch screens, or no WebGL ⇒ poster only, no scene
 * chunk fetched. On capable pointer devices the scene loads behind the poster
 * and pauses whenever it scrolls out of view.
 */
export function HeroScene({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [enable3d, setEnable3d] = useState(false);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 768px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const webgl = (() => {
      try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    if (!reduce && !small && !coarse && webgl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnable3d(true);
    }
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
      {enable3d ? <WaveformCanvas active={inView} /> : <HeroWaveform className="h-full w-full" />}
    </div>
  );
}
