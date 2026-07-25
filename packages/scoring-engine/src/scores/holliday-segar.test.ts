import { describeScore } from "../testing/harness";
import { hollidaySegar } from "./holliday-segar";

const hs = {
  citation:
    "Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823–832.",
  pmid: "13431307",
  doi: "10.1542/peds.19.5.823",
};

const iowa = {
  citation: "University of Iowa Head and Neck Protocols — Pediatric Fluid Management.",
  locator: "Pediatric Fluid Management worked example (35 kg → 75 mL/hr)",
};

describeScore(hollidaySegar, (ctx) => {
  // Example 1 (holliday-segar.md, first bracket only): 8 kg → 800 mL/day, 32 mL/hr.
  // Exact integers — no tolerance.
  ctx.workedExample(
    { ...hs, locator: "Worked example 1 (8 kg): V_day=100×8=800, V_hr=4×8=32" },
    { weight: { value: 8, unit: "kg" } },
    [
      { id: "daily_volume", value: 800 },
      { id: "hourly_rate", value: 32 },
    ],
  );

  // Example 2 (holliday-segar.md; daily figure matches the Wikipedia worked example):
  // 32 kg → 1740 mL/day, 72 mL/hr (all three brackets).
  ctx.workedExample(
    { ...hs, locator: "Worked example 2 (32 kg): V_day=1500+20×12=1740, V_hr=60+1×12=72" },
    { weight: { value: 32, unit: "kg" } },
    [
      { id: "daily_volume", value: 1740 },
      { id: "hourly_rate", value: 72 },
    ],
  );

  // Example 3 (holliday-segar.md, first two brackets): 15 kg → 1250 mL/day, 50 mL/hr.
  ctx.workedExample(
    { ...hs, locator: "Worked example 3 (15 kg): V_day=1000+50×5=1250, V_hr=40+2×5=50" },
    { weight: { value: 15, unit: "kg" } },
    [
      { id: "daily_volume", value: 1250 },
      { id: "hourly_rate", value: 50 },
    ],
  );

  // Example 4 (holliday-segar.md; hourly figure matches the Iowa protocol worked
  // example): 35 kg → 1800 mL/day, 75 mL/hr (all three brackets).
  ctx.workedExample(
    {
      ...iowa,
      locator: "Iowa Pediatric Fluid Management (35 kg → 75 mL/hr); daily V_day=1500+20×15=1800",
    },
    { weight: { value: 35, unit: "kg" } },
    [
      { id: "daily_volume", value: 1800 },
      { id: "hourly_rate", value: 75 },
    ],
  );

  // Knot continuity (holliday-segar.md "Boundary check"): the brackets join with
  // no discontinuity — at 10 kg V_day=1000, at 20 kg V_day=1500 (hourly 40 / 60).
  ctx.workedExample(
    { ...hs, locator: "Boundary check at 10 kg: V_day=100×10=1000, V_hr=4×10=40" },
    { weight: { value: 10, unit: "kg" } },
    [
      { id: "daily_volume", value: 1000 },
      { id: "hourly_rate", value: 40 },
    ],
  );
  ctx.workedExample(
    { ...hs, locator: "Boundary check at 20 kg: V_day=1000+50×10=1500, V_hr=40+2×10=60" },
    { weight: { value: 20, unit: "kg" } },
    [
      { id: "daily_volume", value: 1500 },
      { id: "hourly_rate", value: 60 },
    ],
  );

  // Unit conversion — grams entry converts exactly: 8000 g = 8 kg → 800 mL/day, 32 mL/hr.
  ctx.workedExample(
    { ...hs, locator: "grams entry equals example 1: 8000 g = 8 kg" },
    { weight: { value: 8000, unit: "g" } },
    [
      { id: "daily_volume", value: 800 },
      { id: "hourly_rate", value: 32 },
    ],
  );

  // Unit conversion — pounds entry converts before computing: 22.0462 lb ≈ 10 kg →
  // 1000 mL/day. Float noise from ÷2.20462 needs a small tolerance.
  ctx.workedExample(
    { ...hs, locator: "pounds entry ≈ boundary at 10 kg: 22.0462 lb ÷ 2.20462 = 10 kg" },
    { weight: { value: 22.0462, unit: "lb" } },
    [
      { id: "daily_volume", value: 1000, tolerance: 0.05 },
      { id: "hourly_rate", value: 40, tolerance: 0.05 },
    ],
  );

  ctx.boundaryTest("weight", "min", { weight: { value: 8, unit: "kg" } });
  ctx.boundaryTest("weight", "max", { weight: { value: 8, unit: "kg" } });

  // A zero weight is inherently invalid (below the ~0.5 kg validation floor).
  ctx.rejectsImplausible(
    "a zero body weight",
    { weight: { value: 0, unit: "kg" } },
    { inputId: "weight", code: "out-of-range" },
  );
});
