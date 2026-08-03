import { describe, expect, it } from "vitest";
import { describeScore } from "../testing/harness";
import {
  LUND_BROWDER_AGE_BANDS,
  LUND_BROWDER_BAND_KEYS,
  LUND_BROWDER_SEGMENTS,
  lundBrowderBandForAgeMonths,
  lundBrowderBandTotal,
  lundBrowderPercent,
  lundBrowderTbsaPercent,
  type LundBrowderBandKey,
  type LundBrowderSegment,
} from "../data/lund-browder";
import { burnResuscitation } from "./burn-resuscitation";

// StatPearls has no PMID/DOI (Bookshelf), so worked examples cite it via locator.
const statPearlsParkland = {
  citation:
    "Baartmans MG, et al. Parkland Formula. StatPearls Publishing (Bookshelf NBK537190) + Holliday & Segar 1957 (PMID 13431307).",
};
const statPearlsBurn = {
  citation:
    "Mehta M, Tudor GJ. Burn Fluid Resuscitation. StatPearls Publishing (Bookshelf NBK534227) + Holliday & Segar 1957 (PMID 13431307).",
};
const hollidaySegar = {
  citation:
    "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823-832.",
  pmid: "13431307",
};

describeScore(burnResuscitation, (ctx) => {
  // Worked example 1 (burn-resuscitation.md §Worked examples): 15 kg, 25% TBSA.
  // Pediatric Parkland 3 x 15 x 25 = 1125 mL/24h; first 8 h = 562.5 mL.
  // Holliday-Segar maintenance = 10x100 + 5x50 = 1250 mL/day. Combined = 2375 mL.
  // Modified Brooke converges (same 3 mL peds coefficient) at 1125 mL.
  ctx.workedExample(
    {
      ...statPearlsParkland,
      locator: "Worked example 1 — 15 kg, 25% TBSA (modified-Parkland 3 mL + Holliday-Segar)",
    },
    { weight_kg: { value: 15, unit: "kg" }, tbsa_pct: { value: 25, unit: "%" } },
    [
      { id: "parkland_peds_24h_ml", value: 1125 },
      { id: "parkland_peds_first8h_ml", value: 562.5 },
      { id: "mod_brooke_peds_24h_ml", value: 1125 },
      { id: "maintenance_24h_ml", value: 1250 },
      { id: "parkland_peds_plus_maint_24h_ml", value: 2375 },
    ],
  );

  // Worked example 3 (burn-resuscitation.md): 20 kg, 30% TBSA.
  // Pediatric modified Brooke 3 x 20 x 30 = 1800 mL/24h; first 8 h = 900 mL.
  // Holliday-Segar maintenance = 10x100 + 10x50 = 1500 mL/day (upper edge of tier 2).
  // Parkland converges at 1800 mL.
  ctx.workedExample(
    {
      ...statPearlsBurn,
      locator: "Worked example 3 — 20 kg, 30% TBSA (modified-Brooke 3 mL + Holliday-Segar)",
    },
    { weight_kg: { value: 20, unit: "kg" }, tbsa_pct: { value: 30, unit: "%" } },
    [
      { id: "mod_brooke_peds_24h_ml", value: 1800 },
      { id: "mod_brooke_peds_first8h_ml", value: 900 },
      { id: "parkland_peds_24h_ml", value: 1800 },
      { id: "maintenance_24h_ml", value: 1500 },
    ],
  );

  // Worked example 6 (burn-resuscitation.md): 26 kg → Holliday-Segar maintenance
  // = 10x100 + 10x50 + 6x20 = 1620 mL/day (exercises the >20 kg tier). TBSA is
  // arbitrary here (maintenance depends only on weight).
  ctx.workedExample(
    {
      ...hollidaySegar,
      locator: "Worked example 6 — 26 kg maintenance = 1620 mL/day (three-tier)",
    },
    { weight_kg: { value: 26, unit: "kg" }, tbsa_pct: { value: 20, unit: "%" } },
    [{ id: "maintenance_24h_ml", value: 1620 }],
  );

  // First maintenance tier (<=10 kg): 8 kg x 100 mL/kg/day = 800 mL/day
  // (Holliday & Segar 1957 first tier). Covers the low-weight branch.
  ctx.workedExample(
    { ...hollidaySegar, locator: "8 kg maintenance = 800 mL/day (first tier, 100 mL/kg/day)" },
    { weight_kg: { value: 8, unit: "kg" }, tbsa_pct: { value: 15, unit: "%" } },
    [{ id: "maintenance_24h_ml", value: 800 }],
  );

  const base = { weight_kg: { value: 15, unit: "kg" }, tbsa_pct: { value: 25, unit: "%" } };
  ctx.boundaryTest("weight_kg", "min", base);
  ctx.boundaryTest("weight_kg", "max", base);
  ctx.boundaryTest("tbsa_pct", "min", base);
  ctx.boundaryTest("tbsa_pct", "max", base);

  ctx.rejectsImplausible(
    "a sub-neonatal weight below the 0.5 kg validity bound",
    { weight_kg: { value: 0.1, unit: "kg" }, tbsa_pct: { value: 25, unit: "%" } },
    { inputId: "weight_kg", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a %TBSA above 100%",
    { weight_kg: { value: 15, unit: "kg" }, tbsa_pct: { value: 120, unit: "%" } },
    { inputId: "tbsa_pct", code: "out-of-range" },
  );
});

/**
 * The Lund-Browder chart, tested as data.
 *
 * `calculate` does not consume this table — `tbsa_pct` is still one number the
 * clinician has already estimated — so these are not `describeScore` worked
 * examples. They are the evidence that closed the score's [NEEDS SOURCE]
 * marker: the eight assertions from the reference note, of which the first
 * three are the ones that matter. Every circulating chart that sums to 101%
 * fails at least one of them.
 *
 * Every cell is a multiple of 0.5 and therefore exact in binary floating point,
 * so totals are asserted with `toBe`, never a tolerance. A tolerance here would
 * be the thing that let a 100.5 through.
 */
describe("Lund-Browder chart (src/data/lund-browder.ts)", () => {
  const ALL_SEGMENT_IDS = LUND_BROWDER_SEGMENTS.map((s) => s.id);
  const num = (x: number | null | undefined): number => x ?? Number.NaN;
  const series = (id: string): number[] =>
    LUND_BROWDER_BAND_KEYS.map((band) => num(lundBrowderPercent(id, band)));

  // ── Assertion 1 — the invariant every defect breaks ────────────────────────
  it.each([...LUND_BROWDER_BAND_KEYS])("band %s sums to exactly 100", (band) => {
    expect(lundBrowderBandTotal(band)).toBe(100);
  });

  // ── Assertion 2 — Defect 1, the "101%" hand (Lundin & Alsbjørn 2013) ───────
  it("each hand is 2.5% in every band, never 3%", () => {
    for (const band of LUND_BROWDER_BAND_KEYS) {
      expect(lundBrowderPercent("hand_right", band)).toBe(2.5);
      expect(lundBrowderPercent("hand_left", band)).toBe(2.5);
    }
    // The defective charts carry 1.5 per aspect instead of 1.25, i.e. hand = 3,
    // which adds exactly 1.0 to every column.
    expect(lundBrowderTbsaPercent(["hand_right", "hand_left"], "adult")).toBe(5);
  });

  // ── Assertion 3 — Defect 2, thigh at 10-14 ────────────────────────────────
  it("each thigh is 8.5% in the 10-14 band, never 9%", () => {
    expect(lundBrowderPercent("thigh_right", "10")).toBe(8.5);
    expect(lundBrowderPercent("thigh_left", "10")).toBe(8.5);
    // 9 would put this column, and only this column, at 101.
    expect(lundBrowderBandTotal("10")).toBe(100);
  });

  // The heavily degraded scanned variant, pinned value by value.
  it("carries none of the degraded variant's four values", () => {
    expect(lundBrowderPercent("trunk_anterior", "1")).toBe(13); // not 17
    expect(lundBrowderPercent("buttock_right", "adult")).toBe(2.5); // not 2
    expect(lundBrowderPercent("hand_left", "adult")).toBe(2.5); // not 2
    expect(lundBrowderPercent("head", "10")).toBe(11); // not 10
  });

  // ── Assertion 4 — which rows move with age ────────────────────────────────
  it("marks exactly 5 segments variable and 14 constant, and the flag matches the data", () => {
    expect(LUND_BROWDER_SEGMENTS).toHaveLength(19);
    expect(LUND_BROWDER_SEGMENTS.filter((s) => s.variable).map((s) => s.id)).toEqual([
      "head",
      "thigh_right",
      "thigh_left",
      "leg_right",
      "leg_left",
    ]);
    expect(LUND_BROWDER_SEGMENTS.filter((s) => !s.variable)).toHaveLength(14);

    // Asserted in both directions: a value quietly made age-varying fails here
    // just as loudly as a variable row quietly frozen.
    const varies = (s: LundBrowderSegment): boolean =>
      LUND_BROWDER_BAND_KEYS.some((band) => s.values[band] !== s.values["0"]);
    for (const s of LUND_BROWDER_SEGMENTS) {
      expect(varies(s), `${s.id}: variable flag disagrees with its own values`).toBe(s.variable);
    }
  });

  // ── Assertion 5 — direction of the age trend ──────────────────────────────
  it("falls monotonically at the head and rises at thigh and lower leg", () => {
    const head = series("head");
    const thigh = series("thigh_right");
    const leg = series("leg_right");
    for (let i = 1; i < LUND_BROWDER_BAND_KEYS.length; i += 1) {
      expect(num(head[i])).toBeLessThan(num(head[i - 1]));
      expect(num(thigh[i])).toBeGreaterThan(num(thigh[i - 1]));
      // The lower leg is FLAT from birth to 1 (5 → 5) and rises thereafter, so
      // it is non-decreasing rather than strictly increasing. Asserting strict
      // here would be asserting a value the chart does not carry.
      expect(num(leg[i])).toBeGreaterThanOrEqual(num(leg[i - 1]));
    }
    expect(num(leg.at(-1))).toBeGreaterThan(num(leg[0]));
  });

  // ── Assertion 6 — the redistribution nets to zero ─────────────────────────
  it("redistributes head loss into the lower limbs, netting exactly zero", () => {
    const delta = (id: string): number =>
      num(lundBrowderPercent(id, "adult")) - num(lundBrowderPercent(id, "0"));
    expect(delta("head")).toBe(-12);
    expect(delta("thigh_right") + delta("thigh_left")).toBe(8);
    expect(delta("leg_right") + delta("leg_left")).toBe(4);
    const moved = ["head", "thigh_right", "thigh_left", "leg_right", "leg_left"];
    expect(moved.reduce((sum, id) => sum + delta(id), 0)).toBe(0);
    // Nothing else moved at all.
    for (const s of LUND_BROWDER_SEGMENTS.filter((x) => !x.variable)) {
      expect(delta(s.id), `${s.id} should be constant across age`).toBe(0);
    }
  });

  // ── Assertion 7 — a selection can never exceed 100 ────────────────────────
  it("cannot total more than 100% in any band, whatever is selected", () => {
    for (const band of LUND_BROWDER_BAND_KEYS) {
      // Every cell is positive, so the whole-body selection IS the maximum any
      // subset can reach — and it is exactly 100. That pair of facts is the
      // proof; the running total below is the demonstration.
      for (const s of LUND_BROWDER_SEGMENTS) expect(s.values[band]).toBeGreaterThan(0);
      expect(lundBrowderTbsaPercent(ALL_SEGMENT_IDS, band)).toBe(100);

      let running = 0;
      for (const id of ALL_SEGMENT_IDS) {
        running += num(lundBrowderPercent(id, band));
        expect(running).toBeLessThanOrEqual(100);
      }
    }
  });

  it("deduplicates a repeated segment rather than double-counting it", () => {
    expect(lundBrowderTbsaPercent(["head", "head", "head"], "0")).toBe(19);
    expect(lundBrowderTbsaPercent([...ALL_SEGMENT_IDS, ...ALL_SEGMENT_IDS], "adult")).toBe(100);
  });

  it("throws on an unknown segment id rather than silently under-counting the burn", () => {
    expect(() => lundBrowderTbsaPercent(["head", "tail"], "adult")).toThrow(
      /unknown Lund-Browder segment "tail"/,
    );
    expect(lundBrowderPercent("tail", "adult")).toBeNull();
  });

  // ── Assertion 8 — the age → column mapping, and its rejection ─────────────
  it.each([
    [0, "0"],
    [11, "0"],
    [12, "1"],
    [36, "1"], // a 3-year-old takes the "1" column
    [59, "1"],
    [60, "5"],
    [84, "5"], // a 7-year-old takes the "5" column
    [119, "5"],
    [120, "10"],
    [179, "10"],
    [180, "15"],
    [191, "15"],
    [192, "adult"],
    [1200, "adult"],
  ])("age %i months maps to band %s", (months, band) => {
    expect(lundBrowderBandForAgeMonths(months as number)).toBe(band as LundBrowderBandKey);
  });

  it("rejects an out-of-range age instead of clamping it into a band", () => {
    expect(lundBrowderBandForAgeMonths(-1)).toBeNull();
    expect(lundBrowderBandForAgeMonths(Number.NaN)).toBeNull();
    expect(lundBrowderBandForAgeMonths(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("declares contiguous ascending bands with only the adult band open-ended", () => {
    expect(LUND_BROWDER_AGE_BANDS.map((b) => b.key)).toEqual([...LUND_BROWDER_BAND_KEYS]);
    expect(LUND_BROWDER_AGE_BANDS[0]?.minMonths).toBe(0);
    for (let i = 1; i < LUND_BROWDER_AGE_BANDS.length; i += 1) {
      expect(LUND_BROWDER_AGE_BANDS[i]?.minMonths).toBe(LUND_BROWDER_AGE_BANDS[i - 1]?.maxMonths);
    }
    expect(LUND_BROWDER_AGE_BANDS.at(-1)?.maxMonths).toBeNull();
    expect(LUND_BROWDER_AGE_BANDS.slice(0, -1).every((b) => b.maxMonths !== null)).toBe(true);
  });

  // ── Per-side, not per-pair ────────────────────────────────────────────────
  it("gives one limb per cell, not the pair", () => {
    expect(lundBrowderTbsaPercent(["hand_left", "hand_right"], "adult")).toBe(5);
    // Both adult lower limbs: 2 x (thigh 9.5 + lower leg 7 + foot 3.5) = 40.
    const bothLegs = [
      "thigh_left",
      "leg_left",
      "foot_left",
      "thigh_right",
      "leg_right",
      "foot_right",
    ];
    expect(lundBrowderTbsaPercent(bothLegs, "adult")).toBe(40);
  });

  it("keeps left and right of every paired segment equal", () => {
    for (const right of LUND_BROWDER_SEGMENTS.filter((s) => s.id.endsWith("_right"))) {
      const leftId = right.id.replace(/_right$/, "_left");
      for (const band of LUND_BROWDER_BAND_KEYS) {
        expect(lundBrowderPercent(leftId, band), `${leftId} vs ${right.id} @ ${band}`).toBe(
          right.values[band],
        );
      }
    }
  });

  /**
   * Independent cross-check against the OTHER printed form of the same chart.
   *
   * The classic chart prints anterior and posterior outlines with an inset
   * giving A/B/C "half" values, where half means ONE ASPECT (front or back) of
   * ONE limb — not one of a pair. So B x 2 is a whole thigh. These figures come
   * from a different reproduction lineage (Miminas, Wounds UK 2007) than the
   * JTS worksheets the table above was taken from, so agreement here is a
   * genuine second opinion rather than a restatement.
   */
  it("doubles the printed A/B/C half-body inset exactly", () => {
    const halfHead: Record<LundBrowderBandKey, number> = {
      "0": 9.5,
      "1": 8.5,
      "5": 6.5,
      "10": 5.5,
      "15": 4.5,
      adult: 3.5,
    };
    const halfThigh: Record<LundBrowderBandKey, number> = {
      "0": 2.75,
      "1": 3.25,
      "5": 4,
      "10": 4.25, // 4.5 here is Defect 2
      "15": 4.5,
      adult: 4.75,
    };
    const halfLeg: Record<LundBrowderBandKey, number> = {
      "0": 2.5,
      "1": 2.5,
      "5": 2.75,
      "10": 3,
      "15": 3.25,
      adult: 3.5,
    };
    for (const band of LUND_BROWDER_BAND_KEYS) {
      expect(lundBrowderPercent("head", band)).toBe(halfHead[band] * 2);
      expect(lundBrowderPercent("thigh_left", band)).toBe(halfThigh[band] * 2);
      expect(lundBrowderPercent("leg_left", band)).toBe(halfLeg[band] * 2);
    }
  });
});
