import { describe, expect, it } from "vitest";
import vitestConfig from "../../../packages/scoring-engine/vitest.config";
import { COVERAGE, evidence } from "./evidence";

/**
 * The chips on /trust say "here is the proof". These are the tests that make
 * that true rather than decorative.
 */
describe("evidence", () => {
  it("pins the coverage constant to the gate it claims to report", () => {
    /**
     * THE WHOLE REASON THE CONSTANT IS ALLOWED TO EXIST.
     *
     * `lib/evidence.ts` declares the coverage figures rather than importing the
     * vitest config, because that config opens with
     * `import { defineConfig } from "vitest/config"` and importing it into the
     * app would pull a dev dependency into the production module graph to
     * render one number. This test runs under vitest, so it may import it
     * freely — and without this assertion the chip would be a hand-typed "100%"
     * that could outlive the gate.
     */
    const thresholds = vitestConfig.test?.coverage?.thresholds;
    expect(thresholds, "the engine's coverage thresholds moved or vanished").toBeDefined();
    expect(COVERAGE.lines).toBe(thresholds?.lines);
    expect(COVERAGE.branches).toBe(thresholds?.branches);
    expect(COVERAGE.functions).toBe(thresholds?.functions);
    expect(COVERAGE.statements).toBe(thresholds?.statements);
  });

  it("reports the LOWEST axis, not a flattering one", () => {
    // Collapsing four axes into one number is only honest while they agree. If
    // they diverge the chip must report the one that actually blocks a merge.
    expect(evidence().coveragePercent).toBe(Math.min(...Object.values(COVERAGE)));
  });

  it("counts published scores and every citation behind them", () => {
    const e = evidence();
    expect(e.scores).toBeGreaterThan(20);
    expect(e.citations).toBeGreaterThan(e.scores);
    // A score cannot publish without a locator, so citations can never be
    // fewer than scores. If that inverts, the registry has a score with none.
    expect(e.citations).toBeGreaterThanOrEqual(e.scores);
  });

  it("renders a validated count of zero rather than hiding it", () => {
    /**
     * THE CASE THAT MATTERS MOST.
     *
     * Every reviewer slot is empty today. A progress component that treats 0 as
     * "nothing to show" would silently delete the site's most honest claim —
     * the one that says so out loud instead of hiding an empty slot. So this
     * asserts the shape of the number, not a floor above zero.
     */
    const e = evidence();
    expect(e.validated).toBeGreaterThanOrEqual(0);
    expect(e.total).toBeGreaterThan(0);
    expect(e.validated).toBeLessThanOrEqual(e.total);
    expect(Number.isInteger(e.validated)).toBe(true);
  });

  it("measures a contrast the accessibility chip can itself pass", () => {
    // The chip displays this ratio, so it must clear the bar it reports.
    expect(evidence().contrast).toBeGreaterThanOrEqual(7);
  });
});
