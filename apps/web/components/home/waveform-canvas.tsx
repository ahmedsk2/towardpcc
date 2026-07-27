"use client";

import { useEffect, useRef } from "react";

/**
 * The animated hero: the poster's RESPIRATORY waveform brought to life.
 *
 * Canvas 2D rather than WebGL. The previous R3F scene was gated behind
 * `pointer: coarse`, so it never ran on a touchscreen laptop — the whole hero
 * was static for anyone on one — and it pulled ~874 KB of three.js for a
 * decorative background. This costs a few KB, needs no WebGL context, and
 * therefore runs everywhere instead of being switched off on the devices it
 * failed on.
 *
 * It stays respiratory. A cardiac trace on a PICU site reads as a monitor and
 * implies a diagnostic instrument, so the eye-catching moment is a luminous
 * crest travelling ALONG the wave — a moving highlight — never a QRS complex
 * and never anything that could flatline (ADR-design-direction §5.3).
 *
 * Decorative, so `aria-hidden`; the labelled poster underneath carries the
 * accessible name. Reduced motion never mounts this at all (see hero-scene).
 */

/** Matches the poster's geometry so the still and the motion are one design. */
const PERIODS = 2.15;
const ECHOES = [
  { ampScale: 0.87, phase: 0.55, offset: 0.057, alpha: 0.28, width: 1.5 },
  { ampScale: 1.13, phase: -0.5, offset: -0.048, alpha: 0.2, width: 1.5 },
  { ampScale: 0.74, phase: 1.1, offset: 0.117, alpha: 0.12, width: 1 },
  { ampScale: 1.26, phase: -1.05, offset: -0.104, alpha: 0.1, width: 1 },
];
const MOTES = 16;

type Mote = { x: number; y: number; r: number; speed: number; alpha: number };

function makeMotes(count: number): Mote[] {
  // Deterministic scatter — no Math.random, so the field is identical on every
  // mount and a server/client difference can never show up as a flicker.
  return Array.from({ length: count }, (_, i) => {
    const golden = (i * 0.6180339887) % 1;
    const secondary = (i * 0.7548776662) % 1;
    return {
      x: golden,
      y: secondary,
      r: 0.9 + ((i * 7) % 5) * 0.35,
      speed: 0.004 + ((i * 3) % 4) * 0.0022,
      alpha: 0.18 + ((i * 5) % 4) * 0.1,
    };
  });
}

/** Reads a token so the scene cannot drift from the palette. */
function tokenColor(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export function WaveformCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coral = tokenColor(canvas, "--color-coral", "#ff7a6b");
    const peach = tokenColor(canvas, "--color-peach", "#ffd9cc");
    const motes = makeMotes(MOTES);

    let w = 0;
    let h = 0;
    let raf = 0;
    let start = 0;

    // Cap at 2: beyond it the cost climbs with no visible gain on a soft glow.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    // Listening on window rather than the canvas: the canvas sits behind the
    // hero's glass card, so it would receive almost no pointer events itself.
    window.addEventListener("pointermove", onPointer, { passive: true });

    /** y of the wave at normalised x, for a given layer. */
    const waveY = (t: number, amp: number, phase: number, yBase: number, breath: number) =>
      yBase + Math.sin(t * PERIODS * Math.PI * 2 + phase) * amp * breath;

    const strokeWave = (
      amp: number,
      phase: number,
      yBase: number,
      breath: number,
      alpha: number,
      width: number,
      glow: number,
    ) => {
      ctx.beginPath();
      const steps = 110;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = waveY(t, amp, phase, yBase, breath);
        if (i === 0) ctx.moveTo(t * w, y);
        else ctx.lineTo(t * w, y);
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = coral;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = glow;
      ctx.shadowColor = glow > 0 ? coral : "transparent";
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      if (!start) start = now;
      const time = (now - start) / 1000;

      // Ease the parallax toward the pointer so it glides rather than snaps.
      pointer.current.x += (pointer.current.tx - pointer.current.x) * 0.045;
      pointer.current.y += (pointer.current.ty - pointer.current.y) * 0.045;
      const px = pointer.current.x;
      const py = pointer.current.y;

      ctx.clearRect(0, 0, w, h);

      // Respiratory envelope — one calm breath roughly every 8 s, modulating
      // every layer together. This is the "breathing", and it is deliberately
      // slower than a heartbeat so it never reads as a pulse.
      const breath = 0.78 + 0.22 * Math.sin(time * 0.78);
      const drift = time * 0.42;
      const amp = h * 0.1;
      const yBase = h * 0.5 + py * h * 0.03;

      // Ambient wash behind the traces.
      const wash = ctx.createRadialGradient(
        w * (0.5 + px * 0.06),
        h * 0.5,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.55,
      );
      wash.addColorStop(0, `${coral}2e`);
      wash.addColorStop(1, `${coral}00`);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);

      // Motes: sparse data points drifting upward, wrapping at the top.
      for (const m of motes) {
        const my = (m.y - time * m.speed) % 1;
        const y = (my < 0 ? my + 1 : my) * h;
        const x = m.x * w + px * 14 * (0.4 + m.r * 0.3);
        ctx.globalAlpha = m.alpha * breath;
        ctx.fillStyle = peach;
        ctx.beginPath();
        ctx.arc(x, y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Echo layers behind the lead line.
      for (const e of ECHOES) {
        strokeWave(
          amp * e.ampScale,
          e.phase - drift,
          yBase + h * e.offset + py * h * 0.012,
          breath,
          e.alpha,
          e.width,
          0,
        );
      }

      // Lead line: a wide soft pass under a crisp one, matching the poster's
      // blurred-glow-then-sharp construction.
      strokeWave(amp, -drift, yBase, breath, 0.32, 6, 18);
      strokeWave(amp, -drift, yBase, breath, 1, 2.25, 8);

      // The travelling crest. A highlight riding the lead line left to right
      // every ~5.5 s, with a short trail behind it. This is the eye-catching
      // moment — a moving point of light, NOT an added waveform feature, so
      // the trace stays a respiratory sine throughout.
      const cycle = 5.5;
      const progress = (time % cycle) / cycle;
      // Fade in and out at the edges so it never pops into or out of existence.
      const presence = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI);

      if (presence > 0.01) {
        const trail = 0.16;
        ctx.beginPath();
        const steps = 34;
        for (let i = 0; i <= steps; i++) {
          const t = Math.max(0, progress - trail * (1 - i / steps));
          const y = waveY(t, amp, -drift, yBase, breath);
          if (i === 0) ctx.moveTo(t * w, y);
          else ctx.lineTo(t * w, y);
        }
        const grad = ctx.createLinearGradient(
          Math.max(0, progress - trail) * w,
          0,
          progress * w,
          0,
        );
        grad.addColorStop(0, `${coral}00`);
        grad.addColorStop(1, peach);
        ctx.globalAlpha = presence;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.shadowBlur = 16;
        ctx.shadowColor = peach;
        ctx.stroke();

        const cx = progress * w;
        const cy = waveY(progress, amp, -drift, yBase, breath);
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = peach;
        ctx.shadowBlur = 22;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const run = () => {
      // Never queue a second loop; `active` and visibility can both fire.
      if (!raf && active && document.visibilityState === "visible") {
        // Reset the clock so a paused scene resumes rather than jumping ahead.
        start = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onVisibility = () => (document.visibilityState === "visible" ? run() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    run();

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />;
}
