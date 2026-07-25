import { describeScore } from "../testing/harness";
import { pfRatio } from "./pf-ratio";

const berlin = {
  citation: "ARDS Definition Task Force (Ranieri VM, et al). Berlin Definition. JAMA. 2012.",
  pmid: "22797452",
};

describeScore(pfRatio, (ctx) => {
  // Worked example 1 (pf-sf.md): PaO₂ 80 mmHg, FiO₂ 0.5 → P/F 160 (Berlin moderate).
  ctx.workedExample(
    { ...berlin, locator: "derived from formula; Berlin moderate band" },
    { pao2: { value: 80, unit: "mmHg" }, fio2: { value: 0.5, unit: "fraction" } },
    [{ id: "pf_ratio", value: 160 }],
  );

  // kPa entry and % FiO₂ must convert before computing: 10.67 kPa ≈ 80 mmHg, 50% → 0.5.
  // Tolerance: the value is now the raw (unrounded) ratio, and unit conversion
  // introduces sub-unit float noise (~160.0006).
  ctx.workedExample(
    { ...berlin, locator: "unit-conversion equivalent of example 1" },
    { pao2: { value: 10.6657, unit: "kPa" }, fio2: { value: 50, unit: "%" } },
    [{ id: "pf_ratio", value: 160, tolerance: 0.05 }],
  );

  // Severe boundary: P/F exactly 100 sits in the severe band (≤ 100).
  // 60/0.6 is 99.999… in binary float; tolerance covers it (displays as 100).
  ctx.workedExample(
    { ...berlin, locator: "severe boundary, P/F = 100" },
    { pao2: { value: 60, unit: "mmHg" }, fio2: { value: 0.6, unit: "fraction" } },
    [{ id: "pf_ratio", value: 100, tolerance: 1e-9 }],
  );

  ctx.boundaryTest("pao2", "min", {
    pao2: { value: 80, unit: "mmHg" },
    fio2: { value: 0.5, unit: "fraction" },
  });
  ctx.boundaryTest("pao2", "max", {
    pao2: { value: 80, unit: "mmHg" },
    fio2: { value: 0.5, unit: "fraction" },
  });
  ctx.boundaryTest("fio2", "min", {
    pao2: { value: 80, unit: "mmHg" },
    fio2: { value: 0.5, unit: "fraction" },
  });
  ctx.boundaryTest("fio2", "max", {
    pao2: { value: 80, unit: "mmHg" },
    fio2: { value: 0.5, unit: "fraction" },
  });

  ctx.rejectsImplausible(
    "an FiO₂ below room air",
    { pao2: { value: 80, unit: "mmHg" }, fio2: { value: 0.1, unit: "fraction" } },
    { inputId: "fio2", code: "out-of-range" },
  );

  // Descending "≤" cutpoints: the boundary value belongs to the worse band.
  ctx.expectBand("pf_ratio", 100, "severe"); // ≤ 100 is severe
  ctx.expectBand("pf_ratio", 101, "moderate");
  ctx.expectBand("pf_ratio", 200, "moderate"); // ≤ 200 is moderate
  ctx.expectBand("pf_ratio", 201, "mild");
  ctx.expectBand("pf_ratio", 300, "mild"); // ≤ 300 is mild
  ctx.expectBand("pf_ratio", 301, "above-range");
  ctx.expectBand("pf_ratio", 50, "severe");
});
