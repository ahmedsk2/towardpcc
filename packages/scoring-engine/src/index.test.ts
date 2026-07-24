import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, listScores } from "./index";

describe("scoring-engine skeleton", () => {
  it("exposes a semver engine version", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("starts with an empty score registry", () => {
    expect(listScores()).toEqual([]);
  });
});
