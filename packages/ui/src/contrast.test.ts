import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("returns 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("accepts hex with or without the leading hash, any case", () => {
    expect(relativeLuminance("FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#FfFfFf")).toBeCloseTo(1, 5);
  });

  it("throws on a malformed hex", () => {
    expect(() => relativeLuminance("#12345")).toThrow(/hex/i);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white, in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 2);
  });

  it("is 1:1 for a colour against itself", () => {
    expect(contrastRatio("#cf1f3d", "#cf1f3d")).toBeCloseTo(1, 5);
  });

  it("matches a known reference pair (crimson on white)", () => {
    expect(contrastRatio("#CF1F3D", "#FFFFFF")).toBeCloseTo(5.36, 1);
  });
});
