import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "./registry";
import type { ScoreDefinition } from "../types";

/**
 * A minimal valid input vector, built from each input's own declared domain.
 * Deliberately dumb: it exists to make `compute` return, not to be clinically
 * meaningful, and every assertion above is about ids rather than values.
 */
function sampleInputs(s: ScoreDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of s.inputs) {
    if (i.type === "numeric") out[i.id] = { value: i.min, unit: i.unit.canonical };
    else if (i.type === "boolean") out[i.id] = { value: false };
    else out[i.id] = { value: i.options[0]!.value };
  }
  return out;
}

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

  /**
   * A composition that names an id the score does not emit is invisible without
   * this: the panel renders one fewer row and nothing fails. These assertions
   * are the entire reason the maxima are declared rather than computed.
   *
   * INERT UNTIL THE FIRST COMPOSITION IS DECLARED. No score carries one yet, so
   * both loops `continue` on every score and `sampleInputs` never runs. Written
   * first on purpose — the gate exists before the thing it guards, so the first
   * declaration is checked the moment it lands rather than audited afterwards.
   */
  it("every declared composition names ids the score actually emits", () => {
    for (const s of registry) {
      if (!s.composition) continue;
      const outcome = s.compute(sampleInputs(s) as never);
      expect(outcome.ok, `${s.slug}: sample inputs did not compute`).toBe(true);
      if (!outcome.ok) continue;
      const emitted = new Set(outcome.result.values.map((v) => v.id));
      expect(
        emitted,
        `${s.slug}: composition.total "${s.composition.total}" is not emitted`,
      ).toContain(s.composition.total);
      for (const c of s.composition.components) {
        expect(emitted, `${s.slug}: component "${c.id}" is not emitted`).toContain(c.id);
      }
    }
  });

  it("composition components declare a sane range", () => {
    for (const s of registry) {
      if (!s.composition) continue;
      for (const c of s.composition.components) {
        const min = c.min ?? 0;
        expect(c.max, `${s.slug}/${c.id}: max must exceed min`).toBeGreaterThan(min);
      }
    }
  });
});
