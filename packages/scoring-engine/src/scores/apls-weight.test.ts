import { describeScore } from "../testing/harness";
import { aplsWeight } from "./apls-weight";

// Primary formula sources (docs/research/scores/apls-weight.md, §"Worked examples"
// and §"Inputs"/band-edge values). The manual and Luscombe & Owens present the
// formulas; the per-age answers are derived from those published formulas.
const apls = {
  citation:
    "Advanced Life Support Group. Advanced Paediatric Life Support (APLS), 5th ed. Wiley-Blackwell; 2011.",
  locator: "three age-banded formulas: infant (0.5×mo)+4, 1–5y (2×age)+8, 6–12y (3×age)+7",
};
const luscombe = {
  citation:
    "Luscombe M, Owens B. Weight estimation in resuscitation. Arch Dis Child. 2007;92(5):412–415.",
  pmid: "17213259",
};

describeScore(aplsWeight, (ctx) => {
  // ── Infant band (under 1 year): weight = 0.5 × months + 4 ──────────────────
  // Research Worked example 1 — 6-month-old: (0.5×6)+4 = 7.0 kg. Entered in
  // months to exercise the months→years conversion (6 mo = 0.5 y). Tolerance
  // covers sub-unit float noise from the /12 conversion path.
  ctx.workedExample(
    { ...apls, locator: "Worked example 1 (6 mo): (0.5×6)+4 = 7.0 kg" },
    { age: { value: 6, unit: "months" } },
    [{ id: "estimated_weight", value: 7.0, tolerance: 1e-9 }],
  );

  // Infant band edge — 0 months (term-newborn floor): (0.5×0)+4 = 4.0 kg
  // (research §Inputs: "0 mo → 4.0 kg"). Also the min-bound value.
  ctx.workedExample(
    { ...apls, locator: "band edge (§Inputs): 0 mo → 4.0 kg (infant formula floor)" },
    { age: { value: 0, unit: "months" } },
    [{ id: "estimated_weight", value: 4.0 }],
  );

  // Infant band upper edge — 11 completed months: (0.5×11)+4 = 9.5 kg
  // (research §Inputs: "11 mo → 9.5 kg").
  ctx.workedExample(
    { ...apls, locator: "band edge (§Inputs): 11 mo → 9.5 kg" },
    { age: { value: 11, unit: "months" } },
    [{ id: "estimated_weight", value: 9.5, tolerance: 1e-9 }],
  );

  // ── Child band 1 (1–5 years): weight = 2 × age + 8 ────────────────────────
  // Band lower edge — 1 year: (2×1)+8 = 10 kg (research §Inputs: "1 y → 10 kg").
  ctx.workedExample(
    { ...apls, locator: "band edge (§Inputs): 1 y → 10 kg" },
    { age: { value: 1, unit: "years" } },
    [{ id: "estimated_weight", value: 10 }],
  );

  // Research Worked example 2 — 3-year-old: (2×3)+8 = 14.0 kg.
  ctx.workedExample(
    { ...apls, locator: "Worked example 2 (3 y): (2×3)+8 = 14.0 kg" },
    { age: { value: 3, unit: "years" } },
    [{ id: "estimated_weight", value: 14 }],
  );

  // Band upper edge — 5 years: (2×5)+8 = 18 kg (research §Inputs: "5 y → 18 kg").
  ctx.workedExample(
    { ...apls, locator: "band edge (§Inputs): 5 y → 18 kg" },
    { age: { value: 5, unit: "years" } },
    [{ id: "estimated_weight", value: 18 }],
  );

  // Child bands use age at last birthday (whole years): 5 y 6 mo (5.5 y) still
  // floors to 5 → 18 kg, NOT interpolated to 19 (research §Formula boundary note).
  ctx.workedExample(
    { ...apls, locator: "whole-year (last birthday) rule: 5.5 y floors to 5 → 18 kg" },
    { age: { value: 5.5, unit: "years" } },
    [{ id: "estimated_weight", value: 18 }],
  );

  // ── Child band 2 (6–12 years): weight = 3 × age + 7 (Luscombe & Owens) ─────
  // Band lower edge — 6 years: (3×6)+7 = 25 kg (research §Inputs: "6 y → 25 kg").
  ctx.workedExample(
    { ...luscombe, locator: "band edge (§Inputs): 6 y → 25 kg (6–12y = Luscombe formula)" },
    { age: { value: 6, unit: "years" } },
    [{ id: "estimated_weight", value: 25 }],
  );

  // Research Worked example 3 — 8-year-old: (3×8)+7 = 31.0 kg (Luscombe & Owens).
  ctx.workedExample(
    { ...luscombe, locator: "Worked example 3 (8 y): (3×8)+7 = 31.0 kg" },
    { age: { value: 8, unit: "years" } },
    [{ id: "estimated_weight", value: 31 }],
  );

  // Research Worked example 4 — updated 6–12y at 10 years: (3×10)+7 = 37.0 kg
  // (Luscombe & Owens 2007; the ~24% gap vs legacy 28 kg motivated the update).
  ctx.workedExample(
    { ...luscombe, locator: "Worked example 4 (10 y): updated (3×10)+7 = 37.0 kg" },
    { age: { value: 10, unit: "years" } },
    [{ id: "estimated_weight", value: 37 }],
  );

  // Band upper edge — 12 years: (3×12)+7 = 43 kg (research §Inputs: "12 y → 43 kg").
  // Also the max-bound value.
  ctx.workedExample(
    { ...luscombe, locator: "band edge (§Inputs): 12 y → 43 kg (upper validated bound)" },
    { age: { value: 12, unit: "years" } },
    [{ id: "estimated_weight", value: 43 }],
  );

  // Cross-unit check: the 8-year example entered in months (96 mo = 8 y) must
  // route through the child band unchanged (float-safe via floor of exact years).
  ctx.workedExample(
    { ...luscombe, locator: "unit-conversion path: 96 mo = 8 y → 31.0 kg" },
    { age: { value: 96, unit: "months" } },
    [{ id: "estimated_weight", value: 31, tolerance: 1e-9 }],
  );

  // Domain bounds: 0 y computes (infant floor 4 kg); 12 y computes (43 kg);
  // just past either bound is rejected (below 0 / above the APLS-validated 12 y).
  ctx.boundaryTest("age", "min", { age: { value: 3, unit: "years" } });
  ctx.boundaryTest("age", "max", { age: { value: 3, unit: "years" } });

  ctx.rejectsImplausible(
    "an age beyond the APLS-validated range (no age-based formula above 12 y; use adult estimation)",
    { age: { value: 15, unit: "years" } },
    { inputId: "age", code: "out-of-range" },
  );
});
