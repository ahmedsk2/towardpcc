import { describe, expect, it } from "vitest";
import { buttonClasses } from "./button";

describe("buttonClasses — one family", () => {
  it("is pill-shaped in every variant and size", () => {
    for (const variant of [
      "primary",
      "secondary",
      "quiet",
      "icon",
      "on-dark",
      "ghost-dark",
    ] as const) {
      for (const size of ["lg", "md", "sm"] as const) {
        const cls = buttonClasses({ variant, size });
        expect(cls).toContain("rounded-pill");
        expect(cls).not.toMatch(/rounded-(md|lg|full)\b/);
      }
    }
  });

  it("paints the primary with the bounded gradient, never accent-bright", () => {
    const cls = buttonClasses({ variant: "primary" });
    expect(cls).toContain("bg-gradient-cta");
    expect(cls).not.toContain("accent-bright");
  });

  it("names the properties it transitions and never 'all'", () => {
    const cls = buttonClasses();
    expect(cls).toMatch(/transition-\[[^\]]*translate[^\]]*\]/);
    expect(cls).not.toContain("transition-all");
  });

  it("keeps the 44px floor at md and the 48px hero size at lg", () => {
    expect(buttonClasses({ size: "md" })).toContain("min-h-11");
    expect(buttonClasses({ size: "lg" })).toContain("min-h-12");
  });

  it("uses the coral focus outline on dark variants and accent elsewhere", () => {
    expect(buttonClasses({ variant: "on-dark" })).toContain("focus-visible:outline-coral");
    expect(buttonClasses({ variant: "ghost-dark" })).toContain("focus-visible:outline-coral");
    expect(buttonClasses({ variant: "primary" })).toContain("focus-visible:outline-accent");
    expect(buttonClasses({ variant: "primary" })).not.toContain("outline-coral");
  });
});
