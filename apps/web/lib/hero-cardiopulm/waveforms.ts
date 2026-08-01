import { RHYTHM } from "./anatomy";
import { beatState } from "./beat";
import { breathAt } from "./breath";

/**
 * Bedside traces, drawn from the curves the scene is actually running on.
 *
 * NOT DECORATION. Every sample below comes from `breathAt` and `beatState` —
 * the same functions the driver calls — so the traces cannot drift from the
 * figure beside them. A hero showing a capnograph that disagrees with the lungs
 * it sits next to is worse than a hero showing no capnograph.
 *
 * SCROLLED BY CSS, NOT BY JAVASCRIPT. Each path holds a whole number of cycles
 * and is translated by exactly one cycle over exactly one period, linear and
 * infinite — so the loop is seamless and the scroll rate IS the physiological
 * rate by construction rather than by tuning. Nothing here runs per frame.
 */
export interface Waveform {
  /** Path data in the trace's own viewBox. */
  d: string;
  /** viewBox width; one cycle is `width / cycles`. */
  width: number;
  height: number;
  cycles: number;
  /** Milliseconds per cycle — becomes the CSS animation duration. */
  periodMs: number;
}

/** Samples per cycle. Enough for a smooth curve, few enough to stay small. */
const RESOLUTION = 48;
/** Cycles drawn. Two, so one can scroll off while the next scrolls on. */
const CYCLES = 2;
const HEIGHT = 22;
const CYCLE_WIDTH = 78;

function toPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
}

/**
 * Capnography, the shape a real trace has.
 *
 * A capnograph does not follow the breath curve — it is close to its INVERSE.
 * CO2 is near zero through inspiration, rises steeply as the alveolar plateau
 * begins on expiration, plateaus, then falls off a cliff at the next breath.
 * That square-shouldered profile is the whole diagnostic value of the trace,
 * and drawing a smooth sine here would be recognisably wrong to anyone who
 * reads one at the bedside.
 *
 * Derived from the breath curve's PHASE rather than its value, because the
 * plateau is a property of where we are in the cycle, not of tidal volume.
 */
export function capnograph(): Waveform {
  const points: { x: number; y: number }[] = [];
  const inhale = RHYTHM.inhaleFraction;
  for (let c = 0; c < CYCLES; c++) {
    for (let i = 0; i <= RESOLUTION; i++) {
      const phase = i / RESOLUTION;
      const t = phase * RHYTHM.breathMs;
      const b = breathAt(t);
      let co2: number;
      if (b.inhaling) {
        // Inspiration washes it out: a fast fall to baseline, then flat.
        co2 = Math.max(0, 0.16 - (phase / inhale) * 0.16);
      } else {
        // Expiration: steep upstroke into a slightly rising alveolar plateau.
        const e = (phase - inhale) / (1 - inhale);
        co2 = e < 0.18 ? Math.pow(e / 0.18, 0.55) * 0.9 : 0.9 + (e - 0.18) * 0.12;
      }
      points.push({
        x: (c + phase) * CYCLE_WIDTH,
        y: HEIGHT - 1.5 - co2 * (HEIGHT - 3),
      });
    }
  }
  return {
    d: toPath(points),
    width: CYCLE_WIDTH * CYCLES,
    height: HEIGHT,
    cycles: CYCLES,
    periodMs: RHYTHM.breathMs,
  };
}

/**
 * The arterial pulse, from the beat's own perfusion curve.
 *
 * Uses `beatState().wave` — the same value that drives the brightness crossing
 * the chambers — so the trace peaks exactly when the figure does. The dicrotic
 * notch is added on the downstroke: without it the trace reads as a sine and
 * not as a pulse.
 */
export function pulseTrace(): Waveform {
  const points: { x: number; y: number }[] = [];
  for (let c = 0; c < CYCLES; c++) {
    for (let i = 0; i <= RESOLUTION; i++) {
      const phase = i / RESOLUTION;
      const { wave } = beatState(phase);
      // The notch: a small secondary rise as the aortic valve closes.
      const notch = phase > 0.42 && phase < 0.58 ? Math.sin((phase - 0.42) * 19.6) * 0.11 : 0;
      const v = Math.max(0, wave * 0.86 + notch);
      points.push({
        x: (c + phase) * CYCLE_WIDTH,
        y: HEIGHT - 1.5 - v * (HEIGHT - 3),
      });
    }
  }
  return {
    d: toPath(points),
    width: CYCLE_WIDTH * CYCLES,
    height: HEIGHT,
    cycles: CYCLES,
    // The pulse period, at the base rate. RSA varies the real interval by
    // about 8% either way; the trace does not chase that, because a scroll
    // whose rate changed would read as a stutter rather than as physiology.
    periodMs: Math.round(60_000 / RHYTHM.heartRateBpm),
  };
}

/** Inspiratory-to-expiratory ratio, as it is written on a ventilator. */
export function ieRatio(): string {
  const e = (1 - RHYTHM.inhaleFraction) / RHYTHM.inhaleFraction;
  return `1:${e.toFixed(1)}`;
}

/** RSA depth as a peak-to-peak percentage of the base interval. */
export const rsaPercent = Math.round(RHYTHM.rsaDepth * 100);
