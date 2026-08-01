import { RHYTHM } from "./anatomy";
import { beatState, instantaneousIntervalMs } from "./beat";
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
  /** Path data. Spans `cycles` whole cycles, so it overflows the viewBox. */
  d: string;
  /**
   * viewBox width — ONE cycle, not the whole path.
   *
   * THIS IS THE SEAM. It was the full path width, so the viewport showed every
   * cycle at once and the scroll simply slid the trace out of its own box: by
   * the end of each period the right-hand half was empty and the waveform had
   * visibly drained away, then snapped back. Showing one cycle while holding
   * two is what makes the loop seamless — the second cycle is waiting outside
   * the viewport, clipped, and arrives exactly as the first leaves.
   */
  viewWidth: number;
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
    viewWidth: CYCLE_WIDTH,
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
    viewWidth: CYCLE_WIDTH,
    height: HEIGHT,
    cycles: CYCLES,
    // The pulse period, at the base rate. RSA varies the real interval by
    // about 8% either way; the trace does not chase that, because a scroll
    // whose rate changed would read as a stutter rather than as physiology.
    periodMs: Math.round(60_000 / RHYTHM.heartRateBpm),
  };
}

/**
 * THE RSA STRIP — the coupling, drawn instead of asserted.
 *
 * It replaces the sentence "heart rate rises on inspiration", which was the one
 * thing in this figure that asked to be believed rather than seen. Two
 * registers on one time axis: a filled swell along the bottom for the breath,
 * and above it the INSTANTANEOUS RATE, one measured point per beat. They rise
 * and fall together, and that is the whole claim.
 *
 * RATE, NOT R-R INTERVAL. A tachogram is conventionally plotted as interval,
 * which moves in ANTIPHASE with the breath — correct, and legible only to a
 * reader who already knows that interval is the inverse of rate. This graphic
 * has no axis and no legend, so it plots the quantity the sentence named. In
 * phase means "these move together" to anyone.
 *
 * THE POINTS ARE THE BEATS. There is exactly one interval per beat, so the
 * modulation can only ever be sampled 4.3 times per breath — that is
 * physiology, not resolution. The dots are those real samples and the curve
 * through them is smoothing, which is why both are drawn: the honest thing and
 * the legible thing, distinguishable.
 *
 * IT LOOPS ON THREE BREATHS, not one. The beats-per-breath ratio is
 * deliberately non-integer (≈4.32) so the two rhythms never lock, which means
 * no whole number of breaths returns the beat to its starting phase. Three
 * comes closest: 12.955 beats, so drawing thirteen leaves 0.045 of a beat
 * unaccounted at the seam — and the seam lands at 95% through a beat, in
 * diastole, where the rate curve is flat and the error has nothing to show on.
 */
export interface RsaStrip {
  /** The breath, as a filled swell along the bottom. */
  breath: string;
  /** Instantaneous rate, smoothed through the beat samples. */
  rate: string;
  /** The beats themselves — zero-length subpaths, drawn as discs. */
  beats: string;
  viewWidth: number;
  height: number;
  periodMs: number;
}

/** Breaths per loop. Three: see the note above about the seam. */
const RSA_BREATHS = 3;
const RSA_WIDTH = 210;
const RSA_HEIGHT = 30;
/** Where the breath swell tops out, leaving the band above it to the rate. */
const RSA_SWELL_TOP = 15;
/** The rate band: top and bottom of the excursion, in strip units. */
const RSA_RATE_TOP = 2;
const RSA_RATE_BOTTOM = 13;
/** Samples per breath for the swell. */
const RSA_BREATH_RESOLUTION = 30;

/**
 * Catmull-Rom through the beat samples, emitted as cubic Béziers.
 *
 * Sampling the curve instead would need four times the points to look as smooth,
 * and this path already ships twice over for the scroll.
 */
function smooth(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))]!;
  let d = `M${at(0).x.toFixed(1)} ${at(0).y.toFixed(1)}`;
  for (let i = 0; i + 1 < points.length; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function rsaStrip(): RsaStrip {
  const loopMs = RHYTHM.breathMs * RSA_BREATHS;
  const base = 60_000 / RHYTHM.heartRateBpm;
  const x = (t: number) => (t / loopMs) * RSA_WIDTH;

  // ── The breath: a swell in the lower half ────────────────────────────────
  const swell: { x: number; y: number }[] = [];
  const steps = RSA_BREATH_RESOLUTION * RSA_BREATHS * 2;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * loopMs * 2;
    const v = breathAt(t).value;
    swell.push({ x: x(t), y: RSA_HEIGHT - v * (RSA_HEIGHT - RSA_SWELL_TOP) });
  }
  const breath =
    `M${swell[0]!.x.toFixed(1)} ${RSA_HEIGHT}` +
    swell.map((p) => `L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") +
    `L${swell[swell.length - 1]!.x.toFixed(1)} ${RSA_HEIGHT}Z`;

  // ── The rate: one sample per beat, in the upper band ─────────────────────
  //
  // Walked forward the way the driver walks it — each interval is computed from
  // the breath value AT THAT BEAT, then time advances by that interval. Reading
  // the rate off a fixed grid instead would draw the modulation rather than the
  // beats, and the beats are the point.
  const samples: { x: number; y: number }[] = [];
  const span = RHYTHM.rsaDepth;
  for (let t = 0; t < loopMs * 2;) {
    const v = breathAt(t).value;
    const interval = instantaneousIntervalMs(v);
    // Rate as a fraction of the base rate, normalised onto [0, 1] across the
    // full RSA excursion. Derived from the interval rather than from `v`, so
    // the curve is the rate the heart is actually running at.
    const norm = (base / interval - (1 - span)) / (2 * span);
    samples.push({
      x: x(t),
      y: RSA_RATE_TOP + (1 - Math.min(1, Math.max(0, norm))) * (RSA_RATE_BOTTOM - RSA_RATE_TOP),
    });
    t += interval;
  }

  return {
    breath,
    rate: smooth(samples),
    beats: samples
      .map((p) => `M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(""),
    viewWidth: RSA_WIDTH,
    height: RSA_HEIGHT,
    periodMs: loopMs,
  };
}

/** Inspiratory-to-expiratory ratio, as it is written on a ventilator. */
export function ieRatio(): string {
  const e = (1 - RHYTHM.inhaleFraction) / RHYTHM.inhaleFraction;
  return `1:${e.toFixed(1)}`;
}

/** RSA depth as a peak-to-peak percentage of the base interval. */
export const rsaPercent = Math.round(RHYTHM.rsaDepth * 100);
