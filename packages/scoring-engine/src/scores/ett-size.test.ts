import { describeScore } from "../testing/harness";
import { ettSize } from "./ett-size";

// Primary formula sources (docs/research/scores/ett-size.md, §"Worked examples").
const cole = {
  citation: "Cole F. Pediatric formulas for the anesthesiologist. AMA J Dis Child. 1957.",
  pmid: "13478300",
};
const duracher = {
  citation:
    "Duracher C, et al. Evaluation of cuffed tracheal tube size predicted using the Khine formula. Paediatr Anaesth. 2008.",
  pmid: "18184241",
};

describeScore(ettSize, (ctx) => {
  // Research Worked example 1 — 4-year-old.
  // Uncuffed = 4/4 + 4 = 5.0 mm; cuffed(+3.5) = 4/4 + 3.5 = 4.5 mm; depth = 4/2 + 12 = 14 cm.
  ctx.workedExample(
    {
      ...cole,
      locator: "Worked example 1 (4 y): uncuffed 5.0, depth 14; cuffed 4.5 per formula A3",
    },
    { age: { value: 4, unit: "years" } },
    [
      { id: "uncuffed_id", value: 5.0 },
      { id: "cuffed_id", value: 4.5 },
      { id: "depth_at_lips", value: 14 },
    ],
  );

  // Research Worked example 2 — 8-year-old.
  // Cuffed(+3.5) = 8/4 + 3.5 = 5.5 mm; uncuffed = 8/4 + 4 = 6.0 mm; depth = 8/2 + 12 = 16 cm.
  ctx.workedExample(
    {
      ...duracher,
      locator: "Worked example 2 (8 y): cuffed(+3.5) 5.5, depth 16; uncuffed 6.0 per Cole A1",
    },
    { age: { value: 8, unit: "years" } },
    [
      { id: "cuffed_id", value: 5.5 },
      { id: "uncuffed_id", value: 6.0 },
      { id: "depth_at_lips", value: 16 },
    ],
  );

  // Research Worked example 3 — 2-year-old.
  // Cuffed(+3.5) = 2/4 + 3.5 = 4.0 mm; uncuffed = 2/4 + 4 = 4.5 mm; depth = 2/2 + 12 = 13 cm.
  ctx.workedExample(
    { ...duracher, locator: "Worked example 3 (2 y): cuffed(+3.5) 4.0, uncuffed 4.5, depth 13" },
    { age: { value: 2, unit: "years" } },
    [
      { id: "cuffed_id", value: 4.0 },
      { id: "uncuffed_id", value: 4.5 },
      { id: "depth_at_lips", value: 13 },
    ],
  );

  // Same 2-year-old entered as 24 months exercises the months→years conversion.
  // 24 months ÷ 12 = 2 years → identical outputs (float-exact for /12 of 24).
  ctx.workedExample(
    {
      ...duracher,
      locator: "Worked example 3, entered in months (24 mo = 2 y): unit-conversion path",
    },
    { age: { value: 24, unit: "months" } },
    [
      { id: "cuffed_id", value: 4.0, tolerance: 1e-9 },
      { id: "uncuffed_id", value: 4.5, tolerance: 1e-9 },
      { id: "depth_at_lips", value: 13, tolerance: 1e-9 },
    ],
  );

  // Newborn edge (age 0): the formulas collapse to fixed values (cuffed 3.5,
  // uncuffed 4.0, depth 12) — the documented reason a neonatal weight/GA table
  // is used instead below ~1 y. Verifies the min-bound value still computes.
  ctx.workedExample(
    {
      ...cole,
      locator:
        "domain guard: age 0 collapses to cuffed 3.5 / uncuffed 4.0 / depth 12 (research §C, Domain guards)",
    },
    { age: { value: 0, unit: "years" } },
    [
      { id: "cuffed_id", value: 3.5 },
      { id: "uncuffed_id", value: 4.0 },
      { id: "depth_at_lips", value: 12 },
    ],
  );

  ctx.boundaryTest("age", "min", { age: { value: 4, unit: "years" } });
  ctx.boundaryTest("age", "max", { age: { value: 4, unit: "years" } });

  ctx.rejectsImplausible(
    "an age beyond the pediatric formula domain (use adult sizing)",
    { age: { value: 20, unit: "years" } },
    { inputId: "age", code: "out-of-range" },
  );
});
