import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, getScore, listScores } from "./index";

describe("scoring-engine public surface", () => {
  it("exposes a semver engine version", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("lists published scores through the barrel export", () => {
    const summaries = listScores({ status: "published" });
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every((s) => s.slug.length > 0)).toBe(true);
  });

  it("resolves a score definition by slug", () => {
    expect(getScore("pf-ratio")?.category).toBe("respiratory");
  });
});
