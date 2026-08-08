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
// Device-size rounding and the 3 x ID depth cross-check both come from here.
const statpearls = {
  citation: "Endotracheal Tube. StatPearls [Internet]. NCBI Bookshelf NBK539747.",
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

  // TIE CASE, and the one that validates the whole rounding rule. Every ODD
  // whole year lands exactly between two manufactured sizes, so the tie
  // direction decides half of all whole-year entries. At 1 y the formulas give
  // cuffed 3.75 and uncuffed 4.25; the conventionally taught tubes for a
  // 1-year-old are 3.5 cuffed and 4.0 uncuffed. Only rounding half DOWN
  // reproduces them — half up would return 4.0 and 4.5 and contradict both.
  // This is also the min bound, so it pins the youngest accepted age.
  ctx.workedExample(
    {
      ...statpearls,
      locator:
        "round to nearest available 0.5 mm; ties down reproduce the taught 1 y sizes (cuffed 3.5, uncuffed 4.0)",
    },
    { age: { value: 1, unit: "years" } },
    [
      { id: "cuffed_id", value: 3.75 },
      { id: "cuffed_device_id", value: 3.5 },
      { id: "uncuffed_id", value: 4.25 },
      { id: "uncuffed_device_id", value: 4.0 },
      { id: "depth_at_lips", value: 12.5 },
    ],
  );

  // Second tie, at 3 y: cuffed 4.25 -> 4.0 and uncuffed 4.75 -> 4.5, again the
  // conventionally taught pair. Confirms the rule is not a coincidence at 1 y.
  ctx.workedExample(
    { ...statpearls, locator: "3 y ties resolve down to the taught cuffed 4.0 / uncuffed 4.5" },
    { age: { value: 3, unit: "years" } },
    [
      { id: "cuffed_device_id", value: 4.0 },
      { id: "uncuffed_device_id", value: 4.5 },
    ],
  );

  // Finding F1 verbatim: the audit's two examples of sizes that do not exist as
  // devices. 7.5 y produced "cuffed 5.4 mm" and 18 months produced "3.9 mm".
  // The raw formula values are unchanged and still shown; the device rows are
  // what a clinician reaches for.
  ctx.workedExample(
    {
      ...statpearls,
      locator: "F1: 7.5 y raw cuffed 5.375 ('5.4 mm') is not a device; nearest real size is 5.5",
    },
    { age: { value: 7.5, unit: "years" } },
    [
      { id: "cuffed_id", value: 5.375 },
      { id: "cuffed_device_id", value: 5.5 },
      { id: "uncuffed_id", value: 5.875 },
      { id: "uncuffed_device_id", value: 6.0 },
    ],
  );

  ctx.workedExample(
    {
      ...statpearls,
      locator:
        "F1: 18 months raw cuffed 3.875 ('3.9 mm') is not a device; nearest real size is 4.0",
    },
    { age: { value: 18, unit: "months" } },
    [
      { id: "cuffed_device_id", value: 4.0, tolerance: 1e-9 },
      { id: "uncuffed_device_id", value: 4.5, tolerance: 1e-9 },
    ],
  );

  // Finding F9: the 3 x ID cross-check, computed from the DEVICE size because
  // it checks the tube actually inserted. At 4 y the uncuffed device is 5.0 mm,
  // so 3 x 5.0 = 15.0 cm against age/2 + 12 = 14 cm — agreement within the ~1 cm
  // the formula text claims. The cuffed tube is one step smaller and therefore
  // 1.5 cm shallower, which is why the two are emitted separately.
  ctx.workedExample(
    { ...statpearls, locator: "F9: depth cross-check = tube ID x 3 (a 4.0 mm tube at ~12 cm)" },
    { age: { value: 4, unit: "years" } },
    [
      { id: "depth_at_lips", value: 14 },
      { id: "depth_check_cuffed", value: 13.5 },
      { id: "depth_check_uncuffed", value: 15.0 },
    ],
  );

  ctx.boundaryTest("age", "min", { age: { value: 4, unit: "years" } });
  ctx.boundaryTest("age", "max", { age: { value: 4, unit: "years" } });

  ctx.rejectsImplausible(
    "an age beyond the pediatric formula domain (use adult sizing)",
    { age: { value: 20, unit: "years" } },
    { inputId: "age", code: "out-of-range" },
  );

  // Finding F2. Age 0 used to COMPUTE, returning uncuffed 4.0 mm for a newborn
  // who takes 3.0-3.5 — the score over-sizing exactly where over-sizing does
  // the damage, and contradicting its own notes, which have always said
  // sub-1-year sizing is weight/gestational-age based and not computed here.
  ctx.rejectsImplausible(
    "a newborn, where these formulas over-size and neonatal weight/GA sizing applies instead",
    { age: { value: 0, unit: "years" } },
    { inputId: "age", code: "out-of-range" },
  );

  // The same refusal reached through the months path, since that is how an
  // infant's age is actually entered. 6 months is the audit's F2 example.
  ctx.rejectsImplausible(
    "a 6-month-old entered in months (the F2 case: previously returned 3.6/4.1 mm)",
    { age: { value: 6, unit: "months" } },
    { inputId: "age", code: "out-of-range" },
  );
});
