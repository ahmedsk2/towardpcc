import { describe, expect, it } from "vitest";
import pkg from "../package.json";

describe("crown-jewel guards", () => {
  it("the engine has zero runtime dependencies (PRD §6.3, §12)", () => {
    const deps = (pkg as { dependencies?: Record<string, string> }).dependencies ?? {};
    expect(Object.keys(deps)).toEqual([]);
  });

  it("no DOM globals are reachable (tsconfig lib/types guard backup)", () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe("undefined");
    expect(typeof (globalThis as { document?: unknown }).document).toBe("undefined");
  });
});
