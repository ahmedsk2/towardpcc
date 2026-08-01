import { describe, expect, it } from "vitest";
import { RHYTHM } from "./anatomy";
import { breathAt, clampBreathMs } from "./breath";
import {
  advanceBeat,
  baseIntervalMs,
  beatState,
  beatsPerBreath,
  clampBpm,
  instantaneousIntervalMs,
} from "./beat";

const T = RHYTHM.breathMs;

describe("breath curve", () => {
  it("starts and ends the cycle at end-expiration", () => {
    expect(breathAt(0).value).toBeCloseTo(0, 6);
    expect(breathAt(T).value).toBeCloseTo(0, 6);
  });

  it("peaks exactly at the end of inhale", () => {
    expect(breathAt(RHYTHM.inhaleFraction * T).value).toBeCloseTo(1, 6);
  });

  it("is continuous across the inhale/exhale boundary", () => {
    const b = RHYTHM.inhaleFraction * T;
    expect(Math.abs(breathAt(b - 0.5).value - breathAt(b + 0.5).value)).toBeLessThan(0.001);
  });

  it("has a vanishing derivative at peak and trough, so neither is cusped", () => {
    // The reason both halves are cosines rather than a single sine.
    const d = (t: number) => (breathAt(t + 0.5).value - breathAt(t - 0.5).value) / 1;
    expect(Math.abs(d(RHYTHM.inhaleFraction * T))).toBeLessThan(0.002);
    expect(Math.abs(d(T))).toBeLessThan(0.002);
  });

  it("spends 36% of the cycle inhaling — I:E about 1:1.8", () => {
    let inhaling = 0;
    const steps = 10_000;
    for (let i = 0; i < steps; i++) if (breathAt((i / steps) * T).inhaling) inhaling++;
    expect(inhaling / steps).toBeCloseTo(RHYTHM.inhaleFraction, 2);
  });

  it("clamps the period to a physiologic range", () => {
    expect(clampBreathMs(100)).toBe(RHYTHM.breathMsMin);
    expect(clampBreathMs(99_999)).toBe(RHYTHM.breathMsMax);
  });

  it("is periodic and handles negative time without going out of range", () => {
    expect(breathAt(-T * 0.25).value).toBeCloseTo(breathAt(T * 0.75).value, 6);
    for (let i = 0; i < 500; i++) {
      const v = breathAt(i * 37.3).value;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("beat and RSA coupling", () => {
  it("shortens the interval on inspiration and lengthens it on expiration", () => {
    // The direction is real physiology; inverting it is a silent defect.
    const peakInspiration = instantaneousIntervalMs(1);
    const base = baseIntervalMs();
    const peakExpiration = instantaneousIntervalMs(0);
    expect(peakInspiration).toBeLessThan(base);
    expect(base).toBeLessThan(peakExpiration);
  });

  it("modulates by the specced ±8%", () => {
    const base = baseIntervalMs();
    expect(instantaneousIntervalMs(1) / base).toBeCloseTo(1 - RHYTHM.rsaDepth, 6);
    expect(instantaneousIntervalMs(0) / base).toBeCloseTo(1 + RHYTHM.rsaDepth, 6);
  });

  it("keeps beat phase continuous across a rate change", () => {
    // The reason phase is integrated rather than recomputed from absolute time:
    // deriving it as now/interval jumps the moment RSA changes the interval,
    // which is every frame.
    let phase = 0.4;
    const before = phase;
    phase = advanceBeat(phase, 16, 0); // slow (expiration)
    const afterSlow = phase;
    phase = advanceBeat(phase, 16, 1); // abruptly fast (inspiration)
    const step1 = afterSlow - before;
    const step2 = phase - afterSlow;
    // Both steps are small and same-signed — no discontinuity at the switch.
    expect(step1).toBeGreaterThan(0);
    expect(step2).toBeGreaterThan(0);
    expect(Math.abs(step2 - step1)).toBeLessThan(0.01);
  });

  it("wraps phase into [0,1) rather than growing without bound", () => {
    let phase = 0;
    for (let i = 0; i < 5_000; i++) {
      phase = advanceBeat(phase, 16, breathAt(i * 16).value);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(1);
    }
  });

  it("perfuses rather than squeezes — volumetric change stays capped", () => {
    let peak = 1;
    for (let i = 0; i <= 1000; i++) peak = Math.max(peak, beatState(i / 1000).scale);
    expect(peak - 1).toBeLessThanOrEqual(RHYTHM.maxVolumetricChange + 1e-9);
  });

  it("runs the perfusion wave right to left, then rests", () => {
    expect(beatState(0).wave).toBeCloseTo(0, 6);
    expect(beatState(RHYTHM.pulseTravelFraction * 0.999).wave).toBeGreaterThan(0.9);
    // After the travel the form is quiet until the next beat.
    expect(beatState(RHYTHM.pulseTravelFraction + 0.01).wave).toBe(0);
    expect(beatState(0.99).wave).toBe(0);
  });

  it("clamps heart rate to the school-age range", () => {
    expect(clampBpm(10)).toBe(RHYTHM.heartRateBpmMin);
    expect(clampBpm(400)).toBe(RHYTHM.heartRateBpmMax);
  });

  it("keeps the beats-per-breath ratio clear of an integer", () => {
    // At a whole-number ratio the two rhythms lock and the scene reads
    // mechanical. Shipped default is about 4.59.
    const ratio = beatsPerBreath();
    expect(Math.abs(ratio - Math.round(ratio))).toBeGreaterThan(0.15);
  });
});
