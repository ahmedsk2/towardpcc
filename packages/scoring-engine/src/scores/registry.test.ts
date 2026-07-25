import { describe, expect, it } from "vitest";
import { fixtureScore } from "../testing/fixture-score";
import { getScore, listScores, registry } from "./registry";

describe("registry", () => {
  it("exposes shipped scores with unique slugs and published status", () => {
    expect(registry.length).toBeGreaterThan(0);
    const slugs = registry.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(getScore("pf-ratio")?.name).toBe("PaO₂/FiO₂ ratio (P/F)");
    expect(getScore("does-not-exist")).toBeUndefined();
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
