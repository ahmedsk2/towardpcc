import { describe, expect, it } from "vitest";
import { fixtureScore } from "../testing/fixture-score";
import { getScore, listScores, registry } from "./registry";

describe("registry", () => {
  it("starts empty until the first score ships", () => {
    expect(registry).toEqual([]);
    expect(listScores()).toEqual([]);
    expect(getScore("anything")).toBeUndefined();
  });

  it("summarizes and filters definitions", () => {
    const defs = [fixtureScore];
    expect(listScores(undefined, defs)).toEqual([
      {
        id: "fixture-ratio",
        slug: "fixture-ratio",
        name: "Engine test fixture (arithmetic ratio)",
        version: "1.0.0",
        status: "draft",
        category: "general",
      },
    ]);
    expect(listScores({ category: "general", status: "draft" }, defs)).toHaveLength(1);
    expect(listScores({ category: "sepsis" }, defs)).toHaveLength(0);
    expect(listScores({ status: "published" }, defs)).toHaveLength(0);
    expect(getScore("fixture-ratio", defs)?.id).toBe("fixture-ratio");
  });
});
