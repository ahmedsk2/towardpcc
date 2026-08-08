import { describe, it } from "vitest";
import { registry } from "@towardpcc/scoring-engine";
import { fromCanonical, toCanonical } from "@towardpcc/scoring-engine";
import { roundInward } from "./round-inward";

describe("scratch sweep", () => {
  it("sweeps every numeric input x unit", () => {
    const rows: string[] = [];
    for (const score of registry) {
      for (const input of score.inputs) {
        if (input.type !== "numeric") continue;
        const units = [
          input.unit.canonical,
          ...(input.unit.alternates?.map((a) => a.unit) ?? []),
        ].filter((u) => u !== undefined);
        for (const u of units) {
          const cmin = fromCanonical(input.unit, input.min, u);
          const cmax = fromCanonical(input.unit, input.max, u);
          if (cmin === null || cmax === null) continue;
          const dmin = roundInward(cmin, "up");
          const dmax = roundInward(cmax, "down");
          const backMin = toCanonical(input.unit, dmin, u);
          const backMax = toCanonical(input.unit, dmax, u);
          const badMin = backMin === null || backMin < input.min;
          const badMax = backMax === null || backMax > input.max;
          const expo = `${dmin}`.includes("e") || `${dmax}`.includes("e");
          const emptyRange = dmin > dmax;
          const old = `${Number(cmin.toPrecision(6))}–${Number(cmax.toPrecision(6))}`;
          const nu = `${dmin}–${dmax}`;
          const flag = [
            badMin ? "MIN-REJECTED" : "",
            badMax ? "MAX-REJECTED" : "",
            expo ? "EXPONENTIAL" : "",
            emptyRange ? "EMPTY" : "",
            old !== nu ? "CHANGED" : "",
          ]
            .filter(Boolean)
            .join(",");
          if (flag) {
            rows.push(
              `${score.id}/${input.id} [${u}] old=${old} new=${nu} back=(${backMin},${backMax}) decl=(${input.min},${input.max}) ${flag}`,
            );
          }
        }
      }
    }
    console.log("ROWS:\n" + rows.join("\n"));
  });
});
