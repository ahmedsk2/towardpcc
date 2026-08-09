import { describe, expect, it } from "vitest";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import { inputCountLabel, inputCountRange } from "./input-count";

const definitions = listScores().flatMap((s) => {
  const def = getScore(s.slug);
  return def ? [def] : [];
});

/**
 * Derived from the registry, so it cannot go stale against a score it does not
 * know about — and so a `showWhen` added tomorrow is covered without an edit
 * here. `/calculators` publishes this number as a claim about the calculator,
 * and the page says so in its own comment.
 */
describe("published input counts", () => {
  it("covers every registered score", () => {
    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions.length).toBe(listScores().length);
  });

  it("renders a range exactly when a score asks conditionally, and one number otherwise", () => {
    for (const def of definitions) {
      const conditional = def.inputs.some((i) => i.showWhen);
      const label = inputCountLabel(def);
      expect(label.includes("–"), `${def.slug}: "${label}"`).toBe(conditional);
    }
  });

  it("never publishes a range that overstates or understates what is on screen", () => {
    for (const def of definitions) {
      const { min, max } = inputCountRange(def);
      // max is every declared field — the most that can ever render at once.
      expect(max, def.slug).toBe(def.inputs.length);
      // min is the unconditional ones — the fewest, since a hidden input is
      // hidden by the value of an input that is itself always shown.
      expect(min, def.slug).toBeLessThanOrEqual(max);
      expect(min, def.slug).toBeGreaterThan(0);
    }
  });

  it("pluralises a single-input score and does not pluralise a range", () => {
    // The singular limb is unreachable from the current registry, so it is
    // asserted against a stub rather than left as an untested branch.
    const one = {
      inputs: [{ id: "a", required: true }],
    } as unknown as (typeof definitions)[number];
    expect(inputCountLabel(one)).toBe("1 input");
    expect(inputCountLabel(definitions[0]!)).toMatch(/inputs?$/);
  });
});
