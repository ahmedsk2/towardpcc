import { expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import { fourScore } from "./four-score";

/**
 * NO PUBLISHED WORKED EXAMPLE EXISTS for the FOUR score.
 *
 * Wijdicks 2005 introduces and validates the scale; it does not print a named
 * patient vignette worked through to a total, and no secondary source located
 * during research does either. So every vector below is CONSTRUCTED from the
 * published scoring table — a plain sum whose every term is annotated with the
 * level that produced it, auditable line by line even though the case itself is
 * not citable to a published patient. The `locator` on the source says so, the
 * way `prism.test.ts` does.
 *
 * Each case doubles as a trap for a specific way this score is easy to get
 * wrong: the floor that is 0 rather than GCS's 3, the intubated ceiling of 13,
 * and the one-point or/and boundary inside the brainstem component.
 *
 * Integer points → exact match, no tolerance.
 */
const constructed = {
  citation:
    "Wijdicks EFM, Bamlet WR, Maramattom BV, Manno EM, McClelland RL. Validation of a new coma scale: The FOUR score. Ann Neurol. 2005;58(4):585-593.",
  pmid: "16178024",
  doi: "10.1002/ana.20611",
};

/**
 * The best-possible response on every component (E4 + M4 + B4 + R4 = 16).
 * Doubles as the vector that drives all four components to their declared
 * maxima at once — every level is independently observable in an awake,
 * spontaneously-breathing patient, so nothing here is clinically impossible.
 */
const best = {
  four_eye: { value: "4" },
  four_motor: { value: "4" },
  four_brainstem: { value: "4" },
  four_respiration: { value: "4" },
} as const;

/**
 * The floor, and the one number that separates this scale from the GCS at a
 * glance: 0 is attainable. Every component has a genuine "nothing at all"
 * level, which is why the composition declares no explicit `min`.
 */
const worst = {
  four_eye: { value: "0" },
  four_motor: { value: "0" },
  four_brainstem: { value: "0" },
  four_respiration: { value: "0" },
} as const;

describeScore(fourScore, (ctx) => {
  /**
   * THREE LABELS THAT HAD DRIFTED FROM THE PUBLISHED INSTRUMENT.
   *
   * Found 2026-09-03 by an independent recompute of every calculator against
   * its source. All three are wording rather than arithmetic, which is why the
   * suite could pass over them: the vectors here are the readings a rater
   * arrives at, and what changed is which level those readings match.
   *
   * The labels are paraphrases, never the source descriptors, so these assert
   * the DISCRIMINATOR each level turns on rather than any published sentence.
   */
  it("splits respiration on intubation, not on ventilator support", () => {
    const resp = fourScore.inputs.find((i) => i.id === "four_respiration")!;
    expect(resp.type).toBe("categorical");
    if (resp.type !== "categorical") return;
    const label = (v: string) => resp.options.find((o) => o.value === v)!.label.en;
    // A child on mask CPAP or high-flow is NOT intubated and is scored on
    // rhythm alone — three points that the old "without mechanical support"
    // wording put out of reach, on a scale where low is worse.
    for (const v of ["4", "3", "2"]) {
      expect(label(v), `level ${v} must turn on intubation`).toMatch(/not intubated/i);
      expect(label(v), `level ${v} must not turn on ventilator support`).not.toMatch(
        /mechanical support|mechanically ventilated/i,
      );
    }
    for (const v of ["1", "0"]) {
      expect(label(v), `level ${v} describes an intubated patient`).toMatch(/intubated/i);
    }
  });

  it("keeps withdrawal inside motor level 2, which this scale does not split", () => {
    const motor = fourScore.inputs.find((i) => i.id === "four_motor")!;
    expect(motor.type).toBe("categorical");
    if (motor.type !== "categorical") return;
    const m2 = motor.options.find((o) => o.value === "2")!.label.en;
    // The published level is a flexion response to pain and collapses what the
    // GCS separates. Naming only the decorticate pattern left a child who
    // withdraws but does not localise matching no level, and raters reach for
    // level 3 — one point high.
    expect(m2, "withdrawal must be inside level 2").toMatch(/pulling away|withdraw/i);
    expect(m2, "and the decorticate pattern with it").toMatch(/decorticate/i);
    expect(m2, "and the collapse must be stated, not left to inference").toMatch(
      /does not separate|not separated|collapses/i,
    );
  });

  it("counts eyes OPENED by the examiner at the top eye level", () => {
    const eye = fourScore.inputs.find((i) => i.id === "four_eye")!;
    expect(eye.type).toBe("categorical");
    if (eye.type !== "categorical") return;
    const e4 = eye.options.find((o) => o.value === "4")!.label.en;
    // Lids held shut by periorbital swelling is an everyday trauma
    // presentation; the published level counts them once opened.
    expect(e4, "eyes opened by the examiner still reach level 4").toMatch(/opened by/i);
  });

  // four-score.md Example 1 — intact examination, breathing spontaneously:
  // 4 + 4 + 4 + 4 = 16 (best possible).
  ctx.workedExample(
    {
      ...constructed,
      locator:
        "four-score.md Worked example 1 (ceiling, 16) — constructed from the scoring table; no published worked example exists",
    },
    best,
    [
      { id: "four_total", value: 16 },
      { id: "eye", value: 4 },
      { id: "motor", value: 4 },
      { id: "brainstem", value: 4 },
      { id: "respiration", value: 4 },
    ],
  );

  // four-score.md Example 2 — no response on any component: total 0.
  // A total the GCS cannot produce: its floor is 3.
  ctx.workedExample(
    {
      ...constructed,
      locator:
        "four-score.md Worked example 2 (floor, 0) — constructed from the scoring table; no published worked example exists",
    },
    worst,
    [
      { id: "four_total", value: 0 },
      { id: "eye", value: 0 },
      { id: "motor", value: 0 },
      { id: "brainstem", value: 0 },
      { id: "respiration", value: 0 },
    ],
  );

  // four-score.md Example 3 — the case the GCS handles badly: intubated,
  // localising, brainstem intact. E1 + M3 + B4 + R1 = 9. The GCS on this
  // patient has an unscoreable verbal component; this scale has no gap.
  ctx.workedExample(
    {
      ...constructed,
      locator:
        "four-score.md Worked example 3 (intubated, localising, 9) — constructed from the scoring table; no published worked example exists",
    },
    {
      four_eye: { value: "1" },
      four_motor: { value: "3" },
      four_brainstem: { value: "4" },
      four_respiration: { value: "1" },
    },
    [{ id: "four_total", value: 9 }],
  );

  // four-score.md Example 4 — the INTUBATED ceiling. An otherwise perfect
  // examination in an intubated patient tops out at 13, because respiration
  // cannot exceed 1 once the patient is intubated. Intubation is the split,
  // not ventilator support: a child on mask CPAP or high-flow is scored on
  // rhythm like any unsupported patient. This is the vector
  // that makes the "totals are not comparable across airway status" caution
  // concrete rather than rhetorical.
  ctx.workedExample(
    {
      ...constructed,
      locator:
        "four-score.md Worked example 4 (ventilated ceiling, 13) — constructed from the scoring table; no published worked example exists",
    },
    {
      four_eye: { value: "4" },
      four_motor: { value: "4" },
      four_brainstem: { value: "4" },
      four_respiration: { value: "1" },
    },
    [{ id: "four_total", value: 13 }],
  );

  // four-score.md Example 5 — the or/and boundary. Pupillary AND corneal both
  // lost but cough retained is brainstem 1, not 0; the total is 1 rather than
  // 0. That single point is the whole clinical distance between the two levels
  // and is the easiest misreading in the scale.
  ctx.workedExample(
    {
      ...constructed,
      locator:
        "four-score.md Worked example 5 (brainstem or/and boundary, 1) — constructed from the scoring table; no published worked example exists",
    },
    {
      four_eye: { value: "0" },
      four_motor: { value: "0" },
      four_brainstem: { value: "1" },
      four_respiration: { value: "0" },
    },
    [
      { id: "four_total", value: 1 },
      { id: "brainstem", value: 1 },
    ],
  );

  // Categorical inputs have no numeric bounds — plausibility is enforced by the
  // fixed option set. A level outside 0–4 is rejected as invalid-category, one
  // required rejection per required input (harness floor). The value types are
  // literal unions ("0".."4"), so an out-of-set level is itself a compile
  // error — we cast past that to exercise the runtime rejection.
  type Inputs = Parameters<typeof ctx.rejectsImplausible>[1];

  ctx.rejectsImplausible(
    "an eye level above the 0–4 option set",
    { ...best, four_eye: { value: "5" } } as unknown as Inputs,
    { inputId: "four_eye", code: "invalid-category" },
  );

  ctx.rejectsImplausible(
    "a motor level below the 0–4 option set",
    { ...best, four_motor: { value: "-1" } } as unknown as Inputs,
    { inputId: "four_motor", code: "invalid-category" },
  );

  ctx.rejectsImplausible(
    "a brainstem level above the 0–4 option set",
    { ...best, four_brainstem: { value: "5" } } as unknown as Inputs,
    { inputId: "four_brainstem", code: "invalid-category" },
  );

  // Not merely out of range: the GCS habit of scoring respiration 1–4 would
  // land here, and this pins that the FOUR levels are 0-based.
  ctx.rejectsImplausible(
    "a respiration level above the 0–4 option set",
    { ...best, four_respiration: { value: "6" } } as unknown as Inputs,
    { inputId: "four_respiration", code: "invalid-category" },
  );

  /**
   * No bands, checked rather than assumed.
   *
   * `interpretation: []` with `interpretationStatus: "not-applicable"` is a
   * decision recorded in four-score.md, not an omission — the literature
   * carries only cohort-specific cut-points and no canonical banding. If a
   * later pass ever adds bands it should have to delete this test on purpose.
   */
  it("ships no interpretation bands, deliberately", () => {
    expect(fourScore.interpretation).toHaveLength(0);
    expect(fourScore.interpretationStatus).toBe("not-applicable");
  });

  it("emits the four components, and they sum to the total", () => {
    const outcome = fourScore.compute(best as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const get = (id: string) => outcome.result.values.find((x) => x.id === id)?.value;
    for (const id of ["eye", "motor", "brainstem", "respiration"]) {
      expect(get(id), `${id} must be emitted`).toBeDefined();
    }
    expect(get("eye")! + get("motor")! + get("brainstem")! + get("respiration")!).toBe(
      get("four_total"),
    );
  });

  /**
   * The declared composition, checked against the numbers rather than the ids.
   * registry-gate proves the four ids are emitted; nothing there checks that
   * they sum to the total or that each respects — and REACHES — its declared
   * [min, max].
   *
   * Both directions, because a one-sided check is half a test each way:
   *   - `value <= max` cannot catch a max declared too HIGH. Nothing attains
   *     the inflated ceiling, so it passes forever while the bar renders short.
   *   - `value >= min` cannot catch a min declared too LOW — except that here
   *     the floor genuinely IS 0, which is the whole difference from
   *     pediatric-gcs, so the interesting assertion is that 0 is ATTAINED
   *     rather than merely permitted. If someone later copies pGCS's `min: 1`
   *     onto this score, the worst-case vector fails immediately.
   *
   * Bounds are read from `fourScore.composition` rather than restated, so the
   * test and the declaration cannot agree with each other while both disagree
   * with the code.
   */
  it("declared components sum to the total and pin both bounds, floor to ceiling", () => {
    const vectors = [
      worst,
      {
        four_eye: { value: "1" },
        four_motor: { value: "3" },
        four_brainstem: { value: "4" },
        four_respiration: { value: "1" },
      },
      {
        four_eye: { value: "3" },
        four_motor: { value: "2" },
        four_brainstem: { value: "3" },
        four_respiration: { value: "2" },
      },
      best,
    ];

    const composition = fourScore.composition;
    expect(composition, "four-score must declare a composition").toBeDefined();
    if (!composition) return;

    const observedMax = new Map(
      composition.components.map((c) => [c.id, Number.NEGATIVE_INFINITY]),
    );
    const observedMin = new Map(
      composition.components.map((c) => [c.id, Number.POSITIVE_INFINITY]),
    );

    for (const v of vectors) {
      const outcome = fourScore.compute(v as never);
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
        expect(value, `${c.id} below declared min ${c.min ?? 0}`).toBeGreaterThanOrEqual(
          c.min ?? 0,
        );
        observedMax.set(c.id, Math.max(observedMax.get(c.id)!, value));
        observedMin.set(c.id, Math.min(observedMin.get(c.id)!, value));
      }
    }

    // Each declared bound must be REACHED, not merely respected.
    for (const c of composition.components) {
      expect(observedMax.get(c.id), `${c.id}: declared max ${c.max} is never attained`).toBe(c.max);
      expect(
        observedMin.get(c.id),
        `${c.id}: declared min ${c.min ?? 0} is never attained — on this scale 0 is real`,
      ).toBe(c.min ?? 0);
    }

    // And the declared bounds must tile the published FOUR range of 0–16.
    expect(
      composition.components.reduce((n, c) => n + c.max, 0),
      "declared maxima must sum to the published FOUR maximum of 16",
    ).toBe(16);
    expect(
      composition.components.reduce((n, c) => n + (c.min ?? 0), 0),
      "declared minima must sum to the published FOUR minimum of 0 — unlike GCS, there is a zero",
    ).toBe(0);
  });

  /**
   * The ventilated ceiling as a property, not a single case.
   *
   * Worked example 4 pins one vector at 13. This pins the reason: respiration
   * levels 4, 3 and 2 all describe an unsupported breathing pattern, so a
   * ventilated patient can only ever be scored 1 or 0 there. If someone later
   * "helpfully" adds a ventilated level above 1, the caution shipped beside the
   * result becomes false and this fails.
   */
  it("caps a ventilated patient at 13, because respiration tops out at 1", () => {
    const ventilatedLevels = ["1", "0"];
    for (const r of ventilatedLevels) {
      const outcome = fourScore.compute({ ...best, four_respiration: { value: r } } as never);
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) continue;
      const total = outcome.result.values.find((v) => v.id === "four_total")!.value;
      expect(
        total,
        `an otherwise perfect examination on a ventilator scored ${total}`,
      ).toBeLessThanOrEqual(13);
    }
  });
});
