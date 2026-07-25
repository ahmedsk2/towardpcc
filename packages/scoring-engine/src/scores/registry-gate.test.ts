import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "./registry";

/**
 * Crown-jewel structural gate (PRD §6.3): every registered score MUST have a
 * `<slug>.test.ts` that runs through `describeScore` — the harness that forces
 * a cited worked example and rejection coverage. Combined with the 100%
 * coverage gate (which forces the test to actually exercise the score), this
 * closes the "the floor is opt-in per test file" seam: a score cannot ship
 * with plain it() blocks that skip the citation/rejection floor.
 */
describe("registry §6.3 gate", () => {
  it("registers at least the P2 launch set", () => {
    expect(registry.length).toBeGreaterThanOrEqual(9);
  });

  it.each(registry.map((s) => s.slug))("score %s has a describeScore-driven test file", (slug) => {
    const src = readFileSync(join(__dirname, `${slug}.test.ts`), "utf8");
    expect(src, `${slug}.test.ts must run through describeScore (§6.3 floor)`).toMatch(
      /describeScore\s*\(/,
    );
  });

  it("every score carries the honest two-slot validator tuple and a locator-able reference", () => {
    for (const s of registry) {
      expect(s.validators, `${s.slug} needs exactly two validator slots`).toHaveLength(2);
      expect(s.references.length, `${s.slug} needs at least one reference`).toBeGreaterThan(0);
      for (const ref of s.references) {
        const traceable = "pmid" in ref || "doi" in ref || "url" in ref;
        expect(traceable, `${s.slug} reference must be traceable (pmid/doi/url)`).toBe(true);
      }
    }
  });
});
