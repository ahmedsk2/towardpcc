/**
 * Renders the scene at real driver states, as a filmstrip.
 *
 * WHY THIS EXISTS. Every browser available in this environment reports
 * `visibilityState: hidden`, so requestAnimationFrame never runs and the motion
 * has never been observed — only inferred from the code that produces it. This
 * does not fix that, and it is not a substitute for watching the thing on a
 * real device. What it does do is move the judgement one step closer to
 * evidence: the frames below are computed by the SAME breath, beat and RSA
 * modules the driver calls, at real timestamps, and rendered through the same
 * scene model the page emits.
 *
 * So it can answer, without a device: is the breath deep enough to read as
 * breathing? Is a 3% volumetric change visible at all? Does the RSA coupling
 * show up as a rate that changes with the breath, or as jitter?
 *
 * It cannot answer whether any of that FEELS right in motion. That still needs
 * a phone.
 *
 * Run: npx tsx scripts/hero-motion-filmstrip.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { RHYTHM } from "../apps/web/lib/hero-cardiopulm/anatomy";
import { advanceBeat, beatState } from "../apps/web/lib/hero-cardiopulm/beat";
import { breathAt } from "../apps/web/lib/hero-cardiopulm/breath";
import { BREATH_ANCHOR_Y, buildScene, SCENE } from "../apps/web/lib/hero-cardiopulm/scene";

const scene = buildScene();
const INK = { airway: "255,150,130", heart: "244,72,96", pleura: "255,214,200" } as const;

const FRAMES = 14;
const SPAN = RHYTHM.breathMs; // one full breath
const CELL_W = 210;
const CELL_H = 272;

/** Integrate the beat exactly as the driver does, so RSA is real and not faked. */
const STEP = 16.7;
const states: { t: number; breath: number; beat: number; wave: number; interval: number }[] = [];
{
  let phase = 0;
  let lastWrap = 0;
  const intervals: number[] = [];
  for (let t = 0; t <= SPAN * 2; t += STEP) {
    const breath = breathAt(t).value;
    const next = advanceBeat(phase, STEP, breath);
    if (next < phase) {
      intervals.push(t - lastWrap);
      lastWrap = t;
    }
    phase = next;
    const b = beatState(phase);
    if (t >= SPAN && states.length < FRAMES && t - SPAN >= (states.length * SPAN) / FRAMES) {
      states.push({ t, breath, beat: b.scale, wave: b.wave, interval: 0 });
    }
  }
  console.log(
    `beat intervals across two breaths (ms): ${intervals.map((i) => i.toFixed(0)).join(" ")}`,
  );
  const lo = Math.min(...intervals);
  const hi = Math.max(...intervals);
  console.log(
    `  shortest ${lo.toFixed(0)}  longest ${hi.toFixed(0)}  ` +
      `spread ${(((hi - lo) / ((hi + lo) / 2)) * 100).toFixed(1)}%  ` +
      `(RSA depth is configured at ${(RHYTHM.rsaDepth * 200).toFixed(0)}% peak-to-peak)`,
  );
}

/** One frame, at the given driver state. */
function frame(s: (typeof states)[number], col: number): string {
  const ox = col * CELL_W;
  const k = CELL_W / SCENE.width;
  const bx = 1 + RHYTHM.breathScaleLateral * s.breath;
  const by = 1 + RHYTHM.breathScaleVertical * s.breath;
  const clusterAlpha = 0.66 + RHYTHM.breathAlphaCluster * 2 * s.breath;
  const cx = SCENE.originX;
  const cy = SCENE.originY;
  const ay = BREATH_ANCHOR_Y;

  const body = scene.paths
    .map((p) => {
      const isLung = p.kind !== "heart";
      const oy = isLung ? ay : cy;
      const sxv = isLung ? bx : s.beat;
      const syv = isLung ? by : s.beat;
      const bright = p.kind === "heart" ? 0.85 + 0.5 * s.wave : 1;
      return (
        `<g transform="translate(${cx} ${oy}) scale(${sxv.toFixed(4)} ${syv.toFixed(4)}) translate(${-cx} ${-oy})">` +
        `<path d="${p.d}" fill="none" stroke="rgb(${INK[p.kind]})" ` +
        `stroke-opacity="${Math.min(1, p.opacity * bright).toFixed(3)}" ` +
        `stroke-width="${p.width.toFixed(2)}" stroke-linecap="round"/></g>`
      );
    })
    .join("");

  const clusters =
    `<g opacity="${clusterAlpha.toFixed(3)}" transform="translate(${cx} ${ay}) scale(${bx.toFixed(4)} ${by.toFixed(4)}) translate(${-cx} ${-ay})">` +
    scene.clusters
      .map(
        (n) =>
          `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${(n.r * (1 + RHYTHM.breathScaleCluster * s.breath)).toFixed(2)}" fill="rgb(255,220,204)" fill-opacity="${(0.35 + 0.6 * n.depth).toFixed(3)}"/>`,
      )
      .join("") +
    `</g>`;

  return (
    `<g transform="translate(${ox} 26) scale(${k.toFixed(4)})">` +
    `<rect x="0" y="0" width="${SCENE.width}" height="${SCENE.height}" fill="#2a1019"/>` +
    body +
    clusters +
    `</g>` +
    `<text x="${ox + 6}" y="18" fill="#ffd9cc" font-size="11" font-family="monospace" opacity="0.8">` +
    `${((s.t - SPAN) / 1000).toFixed(2)}s b${s.breath.toFixed(2)} h${s.beat.toFixed(3)} w${s.wave.toFixed(2)}</text>`
  );
}

const W = CELL_W * FRAMES;
writeFileSync(
  join(import.meta.dirname, "..", "docs", "design", "hero", "motion-filmstrip.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${CELL_H + 30}" width="${W}" height="${CELL_H + 30}">
<rect width="${W}" height="${CELL_H + 30}" fill="#160810"/>
${states.map(frame).join("\n")}
</svg>
`,
);

const bs = states.map((s) => s.breath);
const hs = states.map((s) => s.beat);
console.log(
  `breath across the strip ${Math.min(...bs).toFixed(2)}..${Math.max(...bs).toFixed(2)}  ` +
    `=> bases descend ${(RHYTHM.breathScaleVertical * (Math.max(...bs) - Math.min(...bs)) * SCENE.height).toFixed(0)}px of a ${SCENE.height}px frame`,
);
console.log(
  `beat across the strip ${Math.min(...hs).toFixed(3)}..${Math.max(...hs).toFixed(3)}  ` +
    `(cap ${(1 + RHYTHM.maxVolumetricChange).toFixed(3)})`,
);
console.log("wrote motion-filmstrip.svg");
