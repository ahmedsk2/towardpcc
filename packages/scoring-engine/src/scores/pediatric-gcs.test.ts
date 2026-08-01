import { expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { pediatricGcs } from "./pediatric-gcs";

// Every worked example is drawn from pgcs.md "Worked examples". Those vectors are
// derived step-by-step from the published summation formula total = E + V + M
// (Teasdale & Jennett 1974, PMID 4136544), with component wording per the
// James/PECARN descriptor tables. Integer points → exact match (no tolerance).
const gcsSum = {
  citation:
    "Teasdale G, Jennett B. Assessment of coma and impaired consciousness. Lancet. 1974;2(7872):81–84.",
  pmid: "4136544",
  doi: "10.1016/s0140-6736(74)91639-0",
};

/**
 * The best-possible response on every component (E4 + V5 + M6 = 15). Doubles as
 * the vector that drives all three components to their declared maxima at once
 * — every level is independently observable, so unlike an organ-dysfunction
 * score there is nothing clinically impossible about maxing all three.
 */
const base = {
  gcs_eye: { value: "4" },
  gcs_verbal: { value: "5" },
  gcs_motor: { value: "6" },
} as const;

describeScore(pediatricGcs, (ctx) => {
  // pgcs.md Example 1 — normal, alert 6-month-old infant: E4 + V5 + M6 = 15 (best possible).
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 1 (best possible, 15)" },
    {
      gcs_eye: { value: "4" },
      gcs_verbal: { value: "5" },
      gcs_motor: { value: "6" },
    },
    [{ id: "pgcs_total", value: 15 }],
  );

  // pgcs.md Example 2 — unresponsive infant: E1 + V1 + M1 = 3 (worst possible).
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 2 (worst possible, 3)" },
    {
      gcs_eye: { value: "1" },
      gcs_verbal: { value: "1" },
      gcs_motor: { value: "1" },
    },
    [{ id: "pgcs_total", value: 3 }],
  );

  // pgcs.md Example 3 — obtunded infant, painful-stimulus-only: E2 + V3 + M4 = 9.
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 3 (painful-stimulus-only, 9)" },
    {
      gcs_eye: { value: "2" },
      gcs_verbal: { value: "3" },
      gcs_motor: { value: "4" },
    },
    [{ id: "pgcs_total", value: 9 }],
  );

  // pgcs.md Example 4 — verbal child ≥2 y, confused: E3 + V4 + M5 = 12.
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 4 (verbal child, 12)" },
    {
      gcs_eye: { value: "3" },
      gcs_verbal: { value: "4" },
      gcs_motor: { value: "5" },
    },
    [{ id: "pgcs_total", value: 12 }],
  );

  // Categorical inputs have no numeric bounds — plausibility is enforced by the
  // fixed option set. An out-of-range level (0 or above the ceiling) is rejected
  // as invalid-category, one required rejection per required input (harness floor).
  // The value types are literal unions ("1".."4" etc.), so an out-of-set level is
  // itself a compile error — we cast past that to exercise the runtime rejection.
  type Inputs = Parameters<typeof ctx.rejectsImplausible>[1];

  ctx.rejectsImplausible(
    "an eye level below the 1–4 option set",
    {
      gcs_eye: { value: "0" },
      gcs_verbal: { value: "5" },
      gcs_motor: { value: "6" },
    } as unknown as Inputs,
    { inputId: "gcs_eye", code: "invalid-category" },
  );

  ctx.rejectsImplausible(
    "a verbal level above the 1–5 option set",
    {
      gcs_eye: { value: "4" },
      gcs_verbal: { value: "6" },
      gcs_motor: { value: "6" },
    } as unknown as Inputs,
    { inputId: "gcs_verbal", code: "invalid-category" },
  );

  ctx.rejectsImplausible(
    "a motor level above the 1–6 option set",
    {
      gcs_eye: { value: "4" },
      gcs_verbal: { value: "5" },
      gcs_motor: { value: "7" },
    } as unknown as Inputs,
    { inputId: "gcs_motor", code: "invalid-category" },
  );

  // Severity tri-band boundaries (pgcs.md interpretation: 3–8 / 9–12 / 13–15).
  ctx.interpretationBoundary("pgcs_total", 9, "severe", "moderate");
  ctx.interpretationBoundary("pgcs_total", 13, "moderate", "mild");

  it("emits eye, verbal and motor components that sum to the total, never below 1", () => {
    const outcome = pediatricGcs.compute(base as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const get = (id: string) => outcome.result.values.find((x) => x.id === id)?.value;
    for (const id of ["eye", "verbal", "motor"]) {
      expect(get(id), `${id} must be emitted`).toBeDefined();
      expect(get(id)!, `${id} floor is 1, not 0`).toBeGreaterThanOrEqual(1);
    }
    expect(get("eye")! + get("verbal")! + get("motor")!).toBe(get("pgcs_total"));
  });

  /**
   * The declared composition, checked against the numbers rather than the ids.
   * registry-gate proves the three ids are emitted; nothing there checks that
   * they sum to the total or respect their declared [min, max].
   *
   * Both bounds are pinned from BOTH sides, because a one-sided check is half a
   * test in each direction:
   *   - `value <= max` cannot catch a max declared too HIGH — nothing attains
   *     the inflated ceiling, so it passes forever while the bar renders short.
   *   - `value >= min` cannot catch a min declared too LOW — the classic error
   *     here is min 0, which no component can ever produce, so the assertion
   *     never fires while the bar draws a motor score of 1 as a sixth of its
   *     range instead of at the floor.
   * The sweep therefore spans the full published 3–15: E1V1M1 attains every
   * min, E4V5M6 attains every max. Bounds are read from
   * `pediatricGcs.composition` rather than restated, so the test and the
   * declaration cannot agree with each other while both disagree with the code.
   */
  it("declared components sum to the total and pin both bounds, floor to ceiling", () => {
    const vectors = [
      // The floor: no response on any component (3).
      { gcs_eye: { value: "1" }, gcs_verbal: { value: "1" }, gcs_motor: { value: "1" } },
      { gcs_eye: { value: "2" }, gcs_verbal: { value: "3" }, gcs_motor: { value: "4" } },
      { gcs_eye: { value: "3" }, gcs_verbal: { value: "4" }, gcs_motor: { value: "5" } },
      // The ceiling: best response on every component (15).
      base,
    ];

    const composition = pediatricGcs.composition;
    expect(composition, "pediatric-gcs must declare a composition").toBeDefined();
    if (!composition) return;

    const observedMax = new Map(
      composition.components.map((c) => [c.id, Number.NEGATIVE_INFINITY]),
    );
    const observedMin = new Map(
      composition.components.map((c) => [c.id, Number.POSITIVE_INFINITY]),
    );

    for (const v of vectors) {
      const outcome = pediatricGcs.compute(v as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const get = (id: string) => {
        const found = outcome.result.values.find((x) => x.id === id);
        expect(found, `${id} must be emitted`).toBeDefined();
        return found!.value;
      };

      const sum = composition.components.reduce((n, c) => n + get(c.id), 0);
      expect(sum, "components must sum to the total").toBe(get(composition.total));

      for (const c of composition.components) {
        const value = get(c.id);
        expect(value, `${c.id} above declared max ${c.max}`).toBeLessThanOrEqual(c.max);
        expect(value, `${c.id} below declared min ${c.min}`).toBeGreaterThanOrEqual(c.min ?? 0);
        observedMax.set(c.id, Math.max(observedMax.get(c.id)!, value));
        observedMin.set(c.id, Math.min(observedMin.get(c.id)!, value));
      }
    }

    // Each declared bound must be REACHED, not merely respected.
    for (const c of composition.components) {
      expect(observedMax.get(c.id), `${c.id}: declared max ${c.max} is never attained`).toBe(c.max);
      expect(observedMin.get(c.id), `${c.id}: declared min ${c.min} is never attained`).toBe(c.min);
    }

    // And the declared bounds must tile the published pGCS range of 3–15.
    expect(
      composition.components.reduce((n, c) => n + c.max, 0),
      "declared maxima must sum to the published pGCS maximum of 15",
    ).toBe(15);
    expect(
      composition.components.reduce((n, c) => n + (c.min ?? 0), 0),
      "declared minima must sum to the published pGCS minimum of 3 — there is no 0",
    ).toBe(3);
  });
});
