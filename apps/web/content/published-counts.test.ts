import { describe, expect, it } from "vitest";
import { listScores } from "@towardpcc/scoring-engine";
import { site } from "./site";

/**
 * Every calculator count the site publishes must be countable.
 *
 * `/trust` promises that "every figure here is something you can go and count",
 * and the calculators index says so in its own source comment. The About page
 * still carried a hand-typed "23 referenced PICU calculators" while the index,
 * the trust page and the validation page all said 25 — the literal simply went
 * stale, and nothing noticed for as long as it took an outside reader to spot
 * it.
 *
 * This does not check that one string. It refuses ANY hardcoded calculator
 * count anywhere in the published copy, which is the version that catches the
 * next one. Copy that wants to state the number uses the `{liveCalculators}`
 * token and the page substitutes it from the registry.
 */
describe("published calculator counts", () => {
  const published = listScores({ status: "published" }).length;

  /** Every string in the copy tree, with the path that reached it. */
  function* strings(node: unknown, path = "site"): Generator<[string, string]> {
    if (typeof node === "string") yield [node, path];
    else if (Array.isArray(node)) {
      for (const [i, v] of node.entries()) yield* strings(v, `${path}[${i}]`);
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) yield* strings(v, `${path}.${k}`);
    }
  }

  it("has scores to count, or the assertions below prove nothing", () => {
    expect(published).toBeGreaterThan(0);
  });

  it("states no hardcoded calculator count anywhere in the copy", () => {
    // Matches "23 calculators", "25 referenced PICU calculators", "23 scores".
    const literal = /\b(\d+)\s+(?:[a-z-]+\s+){0,3}(?:calculator|score)s?\b/i;
    const offenders: string[] = [];
    for (const [text, path] of strings(site)) {
      const m = literal.exec(text);
      if (!m) continue;
      offenders.push(`${path}: "${m[0]}" — use the {liveCalculators} token`);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("resolves every {liveCalculators} token to the registry count", () => {
    let tokens = 0;
    for (const [text] of strings(site)) {
      if (!text.includes("{liveCalculators}")) continue;
      tokens += 1;
      expect(text.replace("{liveCalculators}", String(published))).toContain(String(published));
    }
    // Otherwise a rename silently removes every token and this suite goes quiet.
    expect(tokens, "no {liveCalculators} token found — was it renamed?").toBeGreaterThan(0);
  });
});
