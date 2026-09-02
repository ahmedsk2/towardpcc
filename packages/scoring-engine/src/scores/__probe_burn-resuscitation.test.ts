import { expect, it } from "vitest";
import { burnResuscitation } from "./burn-resuscitation";

// Temporary probe — deleted after the run. Prints compute() output via a
// deliberately failing assertion because console.log is swallowed.
it("probe", () => {
  const cases: Record<string, Record<string, { value: number; unit: string }>> = {
    C1_10kg_30pct: {
      weight_kg: { value: 10, unit: "kg" },
      tbsa_pct: { value: 30, unit: "%" },
    },
    C2_22kg_40pct: {
      weight_kg: { value: 22, unit: "kg" },
      tbsa_pct: { value: 40, unit: "%" },
    },
    C3_30kg_50pct_2h_1000mL: {
      weight_kg: { value: 30, unit: "kg" },
      tbsa_pct: { value: 50, unit: "%" },
      time_since_burn_h: { value: 2, unit: "h" },
      fluid_given_ml: { value: 1000, unit: "mL" },
    },
    C4_25kg_20pct_300min_0L: {
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: 300, unit: "min" },
      fluid_given_ml: { value: 0, unit: "L" },
    },
    C5_25kg_20pct_8h_0p5L: {
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: 8, unit: "h" },
      fluid_given_ml: { value: 0.5, unit: "L" },
    },
    C6_4kg_15pct: {
      weight_kg: { value: 4, unit: "kg" },
      tbsa_pct: { value: 15, unit: "%" },
    },
    C7_25kg_20pct_6h_0L: {
      weight_kg: { value: 25, unit: "kg" },
      tbsa_pct: { value: 20, unit: "%" },
      time_since_burn_h: { value: 6, unit: "h" },
      fluid_given_ml: { value: 0, unit: "L" },
    },
  };
  const results: Record<string, unknown> = {};
  for (const [name, values] of Object.entries(cases)) {
    const outcome = burnResuscitation.compute(values as never);
    results[name] = outcome.ok
      ? Object.fromEntries(outcome.result.values.map((v) => [v.id, v.value]))
      : { errors: outcome.errors };
  }
  expect(JSON.stringify(results, null, 1)).toBe("SHOWME");
});
