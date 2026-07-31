"use client";

import { useEffect, useRef } from "react";

import { RHYTHM } from "@/lib/hero-cardiopulm/anatomy";
import { advanceBeat, beatState } from "@/lib/hero-cardiopulm/beat";
import { breathAt } from "@/lib/hero-cardiopulm/breath";
import { MAX_SWAY_DEG } from "@/lib/hero-cardiopulm/scene";

/**
 * The only client code in the hero.
 *
 * It writes four custom properties on the scene root and touches nothing else —
 * no state, no re-render, no DOM beyond one `style` object. The 544 particles
 * and six shells are server-rendered and never re-render, which is what makes a
 * rAF loop affordable here at all.
 *
 * WHY THIS EXISTS, when the organ stack it replaces was pure CSS.
 *
 * Respiratory sinus arrhythmia. Inspiration shortens the beat interval and
 * expiration lengthens it — the signature of the whole piece: two rhythms that
 * resolve into one organism rather than two loops running side by side. No
 * stylesheet can express "this animation's period depends on that animation's
 * current value". Keyframes have fixed durations, and baking the variation into
 * a single long master loop would require the beat and breath periods to be
 * commensurate, which is exactly the mechanical lock-step that the deliberately
 * non-integer ratio exists to prevent.
 *
 * The cost is about a kilobyte and, measured, ~0.7 ms per frame: the properties
 * are read by 4 chambers, 54 clusters, 5 dust groups and the world, so about 64
 * elements recalculate. The cost of NOT paying it is a heart that ticks like a
 * metronome beside a chest that breathes.
 */
export function PulseDriver() {
  const anchor = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    // The scene root is this element's parent — the element carrying the
    // custom properties every rule below reads.
    const el = anchor.current?.parentElement;
    if (!el) return;

    // ABSOLUTE. The driver does not start at all under reduced motion, rather
    // than starting and moving less. The server already rendered a composed
    // end-inspiratory, mid-systolic pose, and that is what stays on screen.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame: number | null = null;
    let last = performance.now();
    let beatPhase = 0;

    const tick = (now: number) => {
      // CLAMPED. A backgrounded tab resumes with a dt of seconds, and
      // integrating that in one step would jump the beat rather than continue
      // it — the exact discontinuity advanceBeat's integrator exists to avoid.
      const dt = Math.min(64, now - last);
      last = now;

      const breath = breathAt(now).value;
      beatPhase = advanceBeat(beatPhase, dt, breath);
      const beat = beatState(beatPhase);

      el.style.setProperty("--breath", breath.toFixed(4));
      el.style.setProperty("--beat", beat.scale.toFixed(4));
      el.style.setProperty("--wave", beat.wave.toFixed(4));
      // Parallax, as cos and sin rather than an angle: the CSS multiplies each
      // band's depth by the sine and scales the root by the cosine, which is
      // the first-order exact form of a yaw about the vertical axis.
      //
      // CLAMPED to the ceiling. Past it the bands cross in depth and the
      // approximation visibly breaks, so the clamp is here as well as asserted
      // — a configured amplitude should degrade, not tear.
      const amplitude = Math.min(RHYTHM.swayDeg, MAX_SWAY_DEG);
      const yaw = (amplitude * Math.sin((now / RHYTHM.swayPeriodMs) * Math.PI * 2) * Math.PI) / 180;
      el.style.setProperty("--sway-cos", Math.cos(yaw).toFixed(5));
      el.style.setProperty("--sway-sin", Math.sin(yaw).toFixed(5));

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame !== null) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame === null) return;
      cancelAnimationFrame(frame);
      frame = null;
    };

    // Stop while off-screen. The scene sits in the hero, so in practice this
    // means "stop once the reader has scrolled to the pillars" — there is no
    // reason to keep a heart beating in a viewport nobody is looking at.
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(el);

    return () => {
      stop();
      io.disconnect();
    };
  }, []);

  return <span ref={anchor} hidden aria-hidden="true" />;
}
