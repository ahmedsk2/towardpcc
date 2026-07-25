import { describeScore } from "../testing/harness";
import { oxygenSaturationIndex } from "./oxygen-saturation-index";

// OSI worked examples are traced to docs/research/scores/oi-osi.md; the PALICC-2
// bands and the SpO₂ ≤ 97% guard carry the primary citation.
const palicc2 = {
  citation:
    "Emeriaud G, et al; PALICC-2. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168.",
  pmid: "36661420",
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

  const base = {
    map_awp: { value: 15, unit: "cmH2O" },
    fio2: { value: 0.5, unit: "fraction" },
    spo2: { value: 92, unit: "%" },
  } as const;

  ctx.boundaryTest("map_awp", "min", base);
  ctx.boundaryTest("map_awp", "max", base);
  ctx.boundaryTest("fio2", "min", base);
  ctx.boundaryTest("fio2", "max", base);
  // spo2 "max" bound = 97: computes at 97, rejects just above — the structural
  // expression of the SpO₂ ≤ 97% OSI validity constraint.
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
