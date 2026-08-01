import { RHYTHM } from "./anatomy";

/**
 * The beat, and its coupling to the breath.
 *
 * Respiratory sinus arrhythmia is the signature of the whole piece: two rhythms
 * that resolve into one organism. Inspiration shortens the beat interval (rate
 * rises), expiration lengthens it — real physiology, and the reason this scene
 * cannot be pure CSS. No stylesheet can express "interval depends on the
 * current value of another animation."
 *
 * The heart PERFUSES rather than squeezes. At ~81 bpm a contracting organ reads
 * frantic and slightly grotesque; a brightness wave crossing right→left reads
 * alive. Volumetric change is capped at 3% and applied to the ventricles only.
 */
export interface BeatState {
  /** Cycle position in [0, 1). 0 is the start of systole. */
  phase: number;
  /** Where the perfusion wave has reached, 0 (right) → 1 (left). Clamped. */
  wave: number;
  /** Ventricular scale — never more than RHYTHM.maxVolumetricChange. */
  scale: number;
}

export function clampBpm(bpm: number): number {
  return Math.min(RHYTHM.heartRateBpmMax, Math.max(RHYTHM.heartRateBpmMin, bpm));
}

export function baseIntervalMs(bpm: number = RHYTHM.heartRateBpm): number {
  return 60_000 / clampBpm(bpm);
}

/**
 * The instantaneous interval, given the current breath value.
 *
 * `v = 1` (peak inspiration) shortens the interval; `v = 0` lengthens it. The
 * `2v − 1` term maps [0,1] onto [−1,+1] so the modulation is symmetric about
 * the base rate rather than only ever shortening it.
 */
export function instantaneousIntervalMs(
  breathValue: number,
  bpm: number = RHYTHM.heartRateBpm,
): number {
  return baseIntervalMs(bpm) * (1 - RHYTHM.rsaDepth * (2 * breathValue - 1));
}

/**
 * Advance the beat phase by one frame.
 *
 * INTEGRATED, never recomputed from absolute time. Deriving phase from
 * `now / interval` makes the phase jump discontinuously the instant the
 * interval changes — and since RSA changes it every frame, that is a permanent
 * stutter rather than an edge case. Accumulating `dt / interval` is what keeps
 * the beat continuous across a rate change.
 */
export function advanceBeat(
  previousPhase: number,
  dtMs: number,
  breathValue: number,
  bpm: number = RHYTHM.heartRateBpm,
): number {
  const interval = instantaneousIntervalMs(breathValue, bpm);
  const next = previousPhase + dtMs / interval;
  return next - Math.floor(next);
}

/**
 * The perfusion wave: eases in fast and out slow across the first ~55% of the
 * interval, then rests. The same visual language as the airway travelling
 * light, intentionally — one vocabulary, two organs.
 */
export function beatState(phase: number): BeatState {
  const t = RHYTHM.pulseTravelFraction;
  if (phase >= t) return { phase, wave: 0, scale: 1 };

  const p = phase / t;
  // Fast in, slow out.
  const wave = 1 - Math.pow(1 - p, 3);
  // A single smooth swell over the travel, not a step.
  const scale = 1 + RHYTHM.maxVolumetricChange * Math.sin(Math.PI * p);
  return { phase, wave, scale };
}

/**
 * Beats per breath for a given configuration.
 *
 * Asserted to sit clear of an integer: at a whole-number ratio the two rhythms
 * lock and the scene reads as a machine. The shipped default is ≈4.32 (3200 ms
 * breath, 741 ms beat) — 4.59 predated the rate correction in review item 8.
 */
export function beatsPerBreath(
  bpm: number = RHYTHM.heartRateBpm,
  breathMs: number = RHYTHM.breathMs,
): number {
  return breathMs / baseIntervalMs(bpm);
}
