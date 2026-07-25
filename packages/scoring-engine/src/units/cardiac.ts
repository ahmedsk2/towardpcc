import type { UnitConversion, UnitSpec } from "./types";

/**
 * Cardiac timing units for ECG-interval scores (QTc). Two independent specs:
 *
 *  1. `msWithSeconds` — an ECG interval **duration** (the QT), canonical ms.
 *  2. `bpmWithRr`     — the cardiac **rate**, canonical beats/min, with the
 *     R–R interval offered as reciprocal alternate "units".
 *
 * Both are grounded in docs/research/scores/qtc.md ("Unit discipline is the
 * whole ballgame … RR must be in seconds"; Inputs table: HR and RR are
 * interchangeable, RR = 60/HR).
 */

/** 1 s = 1000 ms exactly (SI). qtc.md: "1 s = 1000 ms". */
export const MS_PER_SECOND = 1000;

/** Seconds → ms for an ECG interval measured in ms (QT). */
export const secondsForMs: UnitConversion = {
  unit: "s",
  toCanonical: (s) => s * MS_PER_SECOND,
  fromCanonical: (ms) => ms / MS_PER_SECOND,
};

/**
 * ECG interval duration: canonical milliseconds, also accepts seconds. QTc
 * inherits the QT's unit, so QT is normalized to ms and QTc is emitted in ms
 * (qtc.md: "QTc carries the same units as the QT you put in").
 */
export const msWithSeconds: UnitSpec = { canonical: "ms", alternates: [secondsForMs] };

/** 60 s = 1 min (RR in seconds ↔ bpm): HR = 60 / RR_s. qtc.md: "RR = 60 / HR". */
export const SECONDS_PER_MINUTE = 60;
/** 60000 ms = 1 min (RR in ms ↔ bpm): HR = 60000 / RR_ms. qtc.md: "RR_ms = 60000 / HR". */
export const MS_PER_MINUTE = 60000;

/**
 * R–R interval in **ms** as an alternate representation of rate. HR and RR are
 * the same cardiac cycle rate expressed two ways (qtc.md Inputs table), so the
 * reciprocal HR = 60000/RR_ms is its own inverse and round-trips exactly.
 */
export const rrMsForBpm: UnitConversion = {
  unit: "ms",
  toCanonical: (rrMs) => MS_PER_MINUTE / rrMs,
  fromCanonical: (bpm) => MS_PER_MINUTE / bpm,
};

/** R–R interval in **seconds** as an alternate representation of rate (HR = 60/RR_s). */
export const rrSecondsForBpm: UnitConversion = {
  unit: "s",
  toCanonical: (rrS) => SECONDS_PER_MINUTE / rrS,
  fromCanonical: (bpm) => SECONDS_PER_MINUTE / bpm,
};

/**
 * Cardiac rate: canonical beats/min, also accepts the R–R interval in ms or s.
 * The internal correction always works from RR in seconds (RR = 60 / HR), which
 * `calculate` derives from the canonical bpm value.
 */
export const bpmWithRr: UnitSpec = { canonical: "bpm", alternates: [rrMsForBpm, rrSecondsForBpm] };
