import { RHYTHM } from "./anatomy";

/**
 * The breath curve. ~18.75 breaths/min — a well child at rest, school-age
 * (18-30). 17.6 was adolescent; corrected with review item 8.
 *
 * I:E ≈ 1:1.8, so inhale occupies 36% of the cycle and exhale 64%. Both halves
 * are cosine segments, which matters for a reason that is easy to miss: the
 * derivative vanishes at both boundaries, so the peak and trough are smooth
 * rather than cusped, and the long cosine tail on exhale produces a natural
 * end-expiratory pause. A linear or sine-of-whole-cycle curve gives neither, and
 * the scene reads as a bellows instead of a child.
 */
export interface BreathPhase {
  /** 0 at end-expiration, 1 at end-inspiration. */
  value: number;
  /** Cycle position in [0, 1). */
  phase: number;
  inhaling: boolean;
}

export function clampBreathMs(ms: number): number {
  return Math.min(RHYTHM.breathMsMax, Math.max(RHYTHM.breathMsMin, ms));
}

export function breathAt(tMs: number, breathMs: number = RHYTHM.breathMs): BreathPhase {
  const period = clampBreathMs(breathMs);
  const phase = (((tMs % period) + period) % period) / period;
  const i = RHYTHM.inhaleFraction;

  if (phase < i) {
    return { value: 0.5 - 0.5 * Math.cos((Math.PI * phase) / i), phase, inhaling: true };
  }
  return {
    value: 0.5 + 0.5 * Math.cos((Math.PI * (phase - i)) / (1 - i)),
    phase,
    inhaling: false,
  };
}

/**
 * Diaphragmatic expansion, anchored at the lung apex.
 *
 * Two scales, not one: a child breathes mostly with the diaphragm, so the apex
 * barely moves and the bases descend. A single radial scale reads as a zoom.
 */
export function breathScale(v: number): { x: number; y: number } {
  return {
    x: 1 + RHYTHM.breathScaleLateral * v,
    y: 1 + RHYTHM.breathScaleVertical * v,
  };
}

/** Alveolar clusters swell about their own centroids — recruitment. */
export function clusterBreathScale(v: number): number {
  return 1 + RHYTHM.breathScaleCluster * v;
}

/** Recruitment glow: clusters brighten at end-inspiration. */
export function clusterBreathAlpha(v: number): number {
  return RHYTHM.breathAlphaCluster * v;
}
