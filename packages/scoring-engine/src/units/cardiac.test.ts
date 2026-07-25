import { describe, expect, it } from "vitest";
import {
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  bpmWithRr,
  msWithSeconds,
  rrMsForBpm,
  rrSecondsForBpm,
  secondsForMs,
} from "./cardiac";
import { toCanonical } from "./types";

describe("cardiac timing units", () => {
  it("uses the exact definitional factors (qtc.md: 1 s = 1000 ms, RR = 60/HR)", () => {
    expect(MS_PER_SECOND).toBe(1000);
    expect(SECONDS_PER_MINUTE).toBe(60);
    expect(MS_PER_MINUTE).toBe(60000);
  });

  describe("ECG interval duration (ms canonical)", () => {
    it("converts seconds to ms exactly: 0.4 s = 400 ms", () => {
      expect(secondsForMs.toCanonical(0.4)).toBe(400);
      expect(secondsForMs.fromCanonical(400)).toBe(0.4);
    });

    it("round-trips seconds within floating tolerance", () => {
      for (const v of [0.2, 0.36, 0.4, 0.46, 0.7]) {
        expect(secondsForMs.fromCanonical(secondsForMs.toCanonical(v))).toBeCloseTo(v, 10);
      }
    });

    it("toCanonical resolves canonical, seconds, and unknown units", () => {
      expect(toCanonical(msWithSeconds, 400, "ms")).toBe(400);
      expect(toCanonical(msWithSeconds, 0.4, "s")).toBe(400);
      expect(toCanonical(msWithSeconds, 400, "min")).toBeNull();
    });
  });

  describe("cardiac rate (bpm canonical, R–R interval as reciprocal alternates)", () => {
    it("converts R–R in ms to bpm exactly: RR 500 ms = 120 bpm (HR = 60000/RR)", () => {
      expect(rrMsForBpm.toCanonical(500)).toBe(120);
      expect(rrMsForBpm.fromCanonical(120)).toBe(500);
      // The fixed point: RR 1000 ms = 60 bpm.
      expect(rrMsForBpm.toCanonical(1000)).toBe(60);
    });

    it("converts R–R in seconds to bpm exactly: RR 0.5 s = 120 bpm (HR = 60/RR)", () => {
      expect(rrSecondsForBpm.toCanonical(0.5)).toBe(120);
      expect(rrSecondsForBpm.fromCanonical(120)).toBe(0.5);
      // The fixed point: RR 1.0 s = 60 bpm.
      expect(rrSecondsForBpm.toCanonical(1)).toBe(60);
    });

    it("round-trips the reciprocal (ms) within floating tolerance", () => {
      for (const rrMs of [240, 500, 600, 1000, 1200, 2000]) {
        expect(rrMsForBpm.fromCanonical(rrMsForBpm.toCanonical(rrMs))).toBeCloseTo(rrMs, 8);
      }
    });

    it("round-trips the reciprocal (s) within floating tolerance", () => {
      for (const rrS of [0.24, 0.5, 0.6, 1.0, 1.2, 2.0]) {
        expect(rrSecondsForBpm.fromCanonical(rrSecondsForBpm.toCanonical(rrS))).toBeCloseTo(
          rrS,
          10,
        );
      }
    });

    it("toCanonical resolves bpm, RR (ms), RR (s), and unknown units", () => {
      expect(toCanonical(bpmWithRr, 120, "bpm")).toBe(120);
      expect(toCanonical(bpmWithRr, 500, "ms")).toBe(120);
      expect(toCanonical(bpmWithRr, 0.5, "s")).toBe(120);
      expect(toCanonical(bpmWithRr, 120, "Hz")).toBeNull();
    });
  });
});
