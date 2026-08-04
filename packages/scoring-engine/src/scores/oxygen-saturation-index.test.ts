import { describeScore } from "../testing/harness";
import { oxygenSaturationIndex } from "./oxygen-saturation-index";

// OSI worked examples are traced to docs/research/scores/oi-osi.md; the PALICC-2
// bands and the SpO₂ ≤ 97% guard carry the primary citation.
const palicc2 = {
  citation:
    "Emeriaud G, et al; PALICC-2. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168.",
  pmid: "36661420",
};
const slaughter2025 = {
  citation:
    "Slaughter J, et al. Comparison of the oxygenation index and the oxygen saturation index as clinical indicators for neonatal ECMO. Front Pediatr. 2025;13:1586985.",
  pmid: "40630719",
};

describeScore(oxygenSaturationIndex, (ctx) => {
  // Worked example 2 (oi-osi.md): MAP 15, FiO₂ 0.50, SpO₂ 92 (≤ 97, valid) →
  // OSI (15×0.50×100)/92 = 8.15 (PALICC-2 mild–moderate).
  ctx.workedExample(
    {
      ...palicc2,
      locator: "Worked example 2 (oi-osi.md): OSI = 750/92 = 8.15, PALICC-2 mild–moderate",
    },
    {
      map_awp: { value: 15, unit: "cmH2O" },
      fio2: { value: 0.5, unit: "fraction" },
      spo2: { value: 92, unit: "%" },
    },
    [{ id: "osi", value: 8.15, tolerance: 0.1 }],
  );

  // Same clinical case with FiO₂ entered as a percentage (50% → 0.50): the unit
  // must normalize before computing (the ×100 / FiO₂-convention check), yielding
  // the identical OSI 8.15. Derived from worked example 2 (oi-osi.md).
  ctx.workedExample(
    {
      ...palicc2,
      locator: "unit-conversion equivalent of worked example 2 (oi-osi.md), FiO₂ entered as %",
    },
    {
      map_awp: { value: 15, unit: "cmH2O" },
      fio2: { value: 50, unit: "%" },
      spo2: { value: 92, unit: "%" },
    },
    [{ id: "osi", value: 8.15, tolerance: 0.1 }],
  );

  // ×100 CONVENTION ANCHOR (oi-osi.md worked example 7). This is the guard against a
  // future "simplification" that drops the ×100 or applies it twice, and it is chosen
  // so the three candidate answers are orders of magnitude apart rather than adjacent:
  //   MAP 20, FiO₂ 1.0 (fraction), SpO₂ 100 is illegal here (> 97), so use SpO₂ 80.
  //   correct, fraction + ×100 : (20 × 1.0 × 100) / 80 = 25
  //   ×100 dropped             : (20 × 1.0)       / 80 = 0.25   (100× too small)
  //   ×100 applied to a percent: (20 × 100 × 100) / 80 = 2500   (100× too large)
  // A tolerance of 0.1 cannot absorb either error, so the sign and size of the
  // FiO₂ convention are pinned, not merely its arithmetic.
  ctx.workedExample(
    {
      ...slaughter2025,
      locator:
        "oi-osi.md worked example 7 — ×100 convention anchor: OSI = 2000/80 = 25, not 0.25 and not 2500",
    },
    {
      map_awp: { value: 20, unit: "cmH2O" },
      fio2: { value: 1, unit: "fraction" },
      spo2: { value: 80, unit: "%" },
    },
    [{ id: "osi", value: 25, tolerance: 0.1 }],
  );

  const base = {
    map_awp: { value: 15, unit: "cmH2O" },
    fio2: { value: 0.5, unit: "fraction" },
    spo2: { value: 92, unit: "%" },
  } as const;

  ctx.boundaryTest("map_awp", "min", base);
  ctx.boundaryTest("map_awp", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  // The SpO₂ bounds ARE the validity window, asserted structurally in both directions:
  // "max" = 97 computes at 97 and rejects just above (dissociation-curve plateau,
  // Thomas 2010 / PALICC-2); "min" = 80 computes at 80 and rejects just below (the
  // lower end of the Khemani 2009/2012 derivation window — a documented implementation
  // choice, since no OSI-specific lower bound is published).
  ctx.boundaryTest("spo2", "min", base);
  ctx.boundaryTest("spo2", "max", base);

  // Worked example 4 (oi-osi.md): the OSI validity guard. SpO₂ 99 > 97 must be rejected —
  // OSI is not interpretable above 97% (dissociation curve plateau; Thomas 2010 / PALICC-2).
  ctx.rejectsImplausible(
    "an SpO₂ above the 97% OSI validity ceiling (worked example 4)",
    {
      map_awp: { value: 12, unit: "cmH2O" },
      fio2: { value: 0.4, unit: "fraction" },
      spo2: { value: 99, unit: "%" },
    },
    { inputId: "spo2", code: "out-of-range" },
  );

  // The other end of the same window: SpO₂ 70 is a real, measurable saturation, and it
  // is still refused — not because it is implausible but because it sits below the
  // 80–97% range the SpO₂-based indices were derived in, so grading it would be
  // extrapolation. This test is what stops the floor drifting back to a permissive
  // value that no primary supports.
  ctx.rejectsImplausible(
    "an SpO₂ below the 80% derivation-window floor (plausible reading, outside the evidence)",
    {
      map_awp: { value: 15, unit: "cmH2O" },
      fio2: { value: 0.5, unit: "fraction" },
      spo2: { value: 70, unit: "%" },
    },
    { inputId: "spo2", code: "out-of-range" },
  );

  // One clinically-framed rejection for each remaining required input.
  ctx.rejectsImplausible(
    "a mean airway pressure below the positive-pressure floor",
    {
      map_awp: { value: 3, unit: "cmH2O" },
      fio2: { value: 0.5, unit: "fraction" },
      spo2: { value: 92, unit: "%" },
    },
    { inputId: "map_awp", code: "out-of-range" },
  );
  ctx.rejectsImplausible(
    "an FiO₂ below room air",
    {
      map_awp: { value: 15, unit: "cmH2O" },
      fio2: { value: 0.1, unit: "fraction" },
      spo2: { value: 92, unit: "%" },
    },
    { inputId: "fio2", code: "out-of-range" },
  );

  // PALICC-2 (2023) OSI bands: diagnosis OSI ≥ 5, severe OSI ≥ 12 (ascending [min, max)).
  // Cutpoint 5: below → osi-below-threshold; at/above → osi-mild-moderate.
  ctx.expectBand("osi", 4.9, "osi-below-threshold");
  ctx.expectBand("osi", 5, "osi-mild-moderate"); // cutpoint belongs to the higher band
  ctx.expectBand("osi", 8.15, "osi-mild-moderate"); // worked example 2 value
  // Cutpoint 12: below → osi-mild-moderate; at/above → osi-severe.
  ctx.expectBand("osi", 11.9, "osi-mild-moderate");
  ctx.expectBand("osi", 12, "osi-severe"); // cutpoint belongs to the higher band
  ctx.expectBand("osi", 15, "osi-severe");
});
