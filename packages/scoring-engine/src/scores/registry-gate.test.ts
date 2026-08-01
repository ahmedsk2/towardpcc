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
 * The minimal vector, plus one variant per input pushed off its floor.
 *
 * A single all-minimum vector is a weak place to check an arithmetic identity:
 * it can score an undeclared organ 0 and let `0 === 0` pass for it, which is
 * exactly the case the identity below exists to catch. Moving one input at a
 * time keeps every other term fixed, so any subscore that responds to any input
 * at all is non-zero in at least one vector.
 *
 * Still built only from each input's OWN declared domain — plausibility bounds
 * and declared options — so no vector asserts anything clinical, and none can
 * become stale against a score it does not know about.
 */
function sweepInputs(s: ScoreDefinition): Record<string, unknown>[] {
  const base = sampleInputs(s);
  const vectors = [base];
  for (const i of s.inputs) {
    if (i.type === "numeric") {
      vectors.push({ ...base, [i.id]: { value: i.max, unit: i.unit.canonical } });
    } else if (i.type === "boolean") {
      vectors.push({ ...base, [i.id]: { value: true } });
    } else {
      for (const o of i.options.slice(1)) vectors.push({ ...base, [i.id]: { value: o.value } });
    }
  }
  return vectors;
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

  /**
   * The OTHER direction: a value the score sums into its total but never
   * declares. Add a seventh pSOFA organ, forget the declaration, and the check
   * above is silent — the panel renders six rows, the flat list quietly filters
   * the seventh out, and the total no longer equals what is on screen.
   *
   * WHY AN IDENTITY AND NOT "EVERY EMITTED VALUE IS DECLARED".
   *
   * The obvious reverse of `declared ⊆ emitted` is `emitted ⊆ declared ∪ {total}`,
   * and it is not true of this corpus. PRISM and PELOD-2 emit
   * `mortality_probability`; Phoenix emits `sepsis` and `septic_shock`. All
   * three are legitimate outputs that are not parts of a total, so any check of
   * that shape needs an exception list.
   *
   * And the list could not be derived — it would have to be written by hand.
   * Nothing in a `ScoreValue` separates a derived output from a subscore:
   * Phoenix's two flags are integers carrying `unit: ""` and `precision: 0`,
   * structurally identical to an organ subscore, so a "non-integer or
   * unit-bearing values are exempt" rule would exempt neither and a
   * `["mortality_probability", "sepsis", "septic_shock"]` literal would need
   * editing by the next author to add a derived output — the same author who
   * just forgot to declare a component. A gate that has to be edited by the
   * person it is guarding against is not a gate.
   *
   * The sum identity needs no list and answers the real question. It also
   * happens to state the thing the panel promises: these rows ARE this total.
   * A derived output is not a summand, so it never enters the identity, and
   * adding one tomorrow requires no change here.
   *
   * `toBeCloseTo` rather than `toBe`: every composition in the corpus is
   * integer today, and this should not be the assertion that has to be
   * rewritten for the first score whose parts are not.
   */
  it("a composition's declared components add up to its total", () => {
    for (const s of registry) {
      if (!s.composition) continue;
      const { total: totalId, components } = s.composition;
      let checked = 0;
      let sawNonZeroTotal = false;

      for (const vector of sweepInputs(s)) {
        const outcome = s.compute(vector as never);
        // A vector that fails validation emits no values, so there is nothing
        // to check — not a failure of the identity. The base vector is asserted
        // to compute by the test above, so this can never skip everything
        // silently; `checked` below proves it did not.
        if (!outcome.ok) continue;
        const byId = new Map(outcome.result.values.map((v) => [v.id, v.value]));
        const total = byId.get(totalId);
        if (total === undefined) continue;
        const sum = components.reduce((acc, c) => acc + (byId.get(c.id) ?? 0), 0);
        expect(
          sum,
          `${s.slug}: components sum to ${sum} but the total is ${total} — ` +
            `a value summed into the total is missing from the composition`,
        ).toBeCloseTo(total, 10);
        if (total !== 0) sawNonZeroTotal = true;
        checked += 1;
      }

      expect(
        checked,
        `${s.slug}: no input vector computed, so nothing was checked`,
      ).toBeGreaterThan(0);
      // 0 === 0 across every vector would pass the identity while proving
      // nothing about it.
      expect(
        sawNonZeroTotal,
        `${s.slug}: every vector totalled 0, so the identity above is vacuous`,
      ).toBe(true);
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
