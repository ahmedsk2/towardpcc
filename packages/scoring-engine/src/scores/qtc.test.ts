import { describe, expect, it } from "vitest";
import { matchInterpretationBand } from "../interpretation";
import { describeScore } from "../testing/harness";
import { qtc } from "./qtc";

// The modern QTc corrections have no worked arithmetic example in the 1920
// primary sources; qtc.md derives these vectors directly from the formulas in
// Bazett 1920 and Fridericia 1920 and reports each to 0.1 ms. Raw computed
// values differ from the cited 0.1-ms figures by < 0.05, so continuous outputs
// use tolerance 0.05; the HR-60 fixed point is exact.
const bazettFridericia = {
  citation:
    "Bazett HC. Heart. 1920;7:353–370; Fridericia LS. Acta Med Scand. 1920;53:469–486 (formulas; QTc = QT/√RR and QT/RR^(1/3), RR in seconds).",
  doi: "10.1111/j.1542-474X.1997.tb00325.x",
};

describeScore(qtc, (ctx) => {
  // Example 1 (qtc.md): QT 400 ms, HR 60 → RR 1.0 s. The fixed point: √1 = 1,
  // 1^(1/3) = 1, so both corrections equal the raw QT exactly.
  ctx.workedExample(
    { ...bazettFridericia, locator: "qtc.md Example 1 — HR 60 fixed point (QT 400, HR 60)" },
    { qt: { value: 400, unit: "ms" }, hr: { value: 60, unit: "bpm" } },
    [
      { id: "qtc_bazett", value: 400 },
      { id: "qtc_fridericia", value: 400 },
    ],
  );

  // Example 1, unit-equivalent: QT entered in seconds (0.4 s = 400 ms) and rate
  // entered as the R–R interval (1000 ms = HR 60). Exercises both alternate units.
  ctx.workedExample(
    { ...bazettFridericia, locator: "qtc.md Example 1 — unit-equivalent (QT 0.4 s, RR 1000 ms)" },
    { qt: { value: 0.4, unit: "s" }, hr: { value: 1000, unit: "ms" } },
    [
      { id: "qtc_bazett", value: 400, tolerance: 1e-9 },
      { id: "qtc_fridericia", value: 400, tolerance: 1e-9 },
    ],
  );

  // Example 2 (qtc.md): QT 360 ms, HR 120 → RR 0.5 s. Tachycardia where Bazett
  // over-corrects: Bazett 509.1 crosses the prolonged line, Fridericia 453.6 does not.
  ctx.workedExample(
    { ...bazettFridericia, locator: "qtc.md Example 2 — tachycardia (QT 360, HR 120)" },
    { qt: { value: 360, unit: "ms" }, hr: { value: 120, unit: "bpm" } },
    [
      { id: "qtc_bazett", value: 509.1, tolerance: 0.05 },
      { id: "qtc_fridericia", value: 453.6, tolerance: 0.05 },
    ],
  );

  // Example 2, unit-equivalent: rate entered as R–R 500 ms (= HR 120). Exercises
  // the reciprocal rate "unit" through validation and calculate.
  ctx.workedExample(
    { ...bazettFridericia, locator: "qtc.md Example 2 — unit-equivalent (RR 500 ms = HR 120)" },
    { qt: { value: 360, unit: "ms" }, hr: { value: 500, unit: "ms" } },
    [
      { id: "qtc_bazett", value: 509.1, tolerance: 0.05 },
      { id: "qtc_fridericia", value: 453.6, tolerance: 0.05 },
    ],
  );

  // Example 3 (qtc.md): QT 460 ms, HR 50 → RR 1.2 s. Bradycardia where Bazett
  // under-corrects: Bazett 419.9 is the LOWER value, Fridericia 432.9.
  ctx.workedExample(
    { ...bazettFridericia, locator: "qtc.md Example 3 — bradycardia (QT 460, HR 50)" },
    { qt: { value: 460, unit: "ms" }, hr: { value: 50, unit: "bpm" } },
    [
      { id: "qtc_bazett", value: 419.9, tolerance: 0.05 },
      { id: "qtc_fridericia", value: 432.9, tolerance: 0.05 },
    ],
  );

  // Example 4 (qtc.md): 2-year-old at a normal toddler rate, QT 340 ms, HR 130
  // → RR 0.4615 s. Bazett 500.5 would falsely flag a healthy child; Fridericia 440.0.
  ctx.workedExample(
    {
      ...bazettFridericia,
      locator: "qtc.md Example 4 — pediatric screening trap (QT 340, HR 130)",
    },
    { qt: { value: 340, unit: "ms" }, hr: { value: 130, unit: "bpm" } },
    [
      { id: "qtc_bazett", value: 500.5, tolerance: 0.05 },
      { id: "qtc_fridericia", value: 440.0, tolerance: 0.05 },
    ],
  );

  // Boundary + rejection coverage for every required numeric input.
  const base = { qt: { value: 400, unit: "ms" }, hr: { value: 60, unit: "bpm" } };
  ctx.boundaryTest("qt", "min", base);
  ctx.boundaryTest("qt", "max", base);
  ctx.boundaryTest("hr", "min", base);
  ctx.boundaryTest("hr", "max", base);

  ctx.rejectsImplausible(
    "a QT beyond the plausible sanity bound",
    { qt: { value: 800, unit: "ms" }, hr: { value: 60, unit: "bpm" } },
    { inputId: "qt", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "a heart rate beyond the plausible sanity bound",
    { qt: { value: 400, unit: "ms" }, hr: { value: 300, unit: "bpm" } },
    { inputId: "hr", code: "out-of-range" },
  );
  // An R–R interval so long it implies HR < 30 bpm is rejected via the shared bpm bound.
  ctx.rejectsImplausible(
    "an R–R interval implying an implausibly low heart rate",
    { qt: { value: 400, unit: "ms" }, hr: { value: 2500, unit: "ms" } },
    { inputId: "hr", code: "out-of-range" },
  );

  // Pediatric Bazett-based bands (qtc.md): ≤440 normal, 440–460 borderline,
  // >460 to <480 prolonged, ≥480 diagnostic-level. Boundary ownership matches
  // the source wording.
  ctx.expectBand("qtc_bazett", 400, "normal");
  ctx.expectBand("qtc_bazett", 440, "normal"); // ≤ 440 is normal
  ctx.expectBand("qtc_bazett", 450, "borderline");
  ctx.expectBand("qtc_bazett", 460, "borderline"); // ≤ 460 is borderline
  ctx.expectBand("qtc_bazett", 470, "prolonged");
  ctx.expectBand("qtc_bazett", 479, "prolonged");
  ctx.expectBand("qtc_bazett", 480, "markedly-prolonged"); // ≥ 480
  ctx.expectBand("qtc_bazett", 520, "markedly-prolonged");
});

// The bands are Bazett-derived; the research warns they are not equivalent for
// Fridericia, so the Fridericia output is intentionally left unbanded.
describe("QTc — Fridericia is emitted without interpretation bands", () => {
  it("matchInterpretationBand returns undefined for qtc_fridericia at every threshold", () => {
    for (const v of [400, 440, 460, 480, 520]) {
      expect(matchInterpretationBand(qtc, "qtc_fridericia", v)).toBeUndefined();
    }
  });
});
