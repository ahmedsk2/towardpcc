import { describe, expect, it } from "vitest";
import { listScores, getScore } from "@towardpcc/scoring-engine";
import { DESCRIPTION_LIMIT as LIMIT, scoreDescription } from "./score-description";

/**
 * Meta-description hygiene.
 *
 * The calculator route used to build its description by appending each score's
 * name to the shared 130-character catalogue lede. Two consequences: 17 of 22
 * descriptions ran past the ~160 characters a search result will display, and
 * all 22 shared an identical tail — so they were unique only in their opening
 * words, which is exactly the part a reader scans and a snippet keeps.
 *
 * Until 2026-07-28 this file re-implemented the route's template and tested
 * the copy, on the reasoning that a divergence would surface as a failure.
 * It would not: both the length rule and the uniqueness rule are properties of
 * the template, so a route that started emitting 300-character descriptions
 * would leave every assertion here green. The template now lives in
 * content/score-description.ts and both the route and this file import it.
 */

describe("calculator meta descriptions", () => {
  const slugs = listScores({ status: "published" }).map((s) => s.slug);
  const describeFor = (slug: string) => scoreDescription(getScore(slug)!);

  it("covers every published score", () => {
    expect(slugs.length).toBe(23);
  });

  it.each(slugs)("%s fits inside the display limit", (slug) => {
    const d = describeFor(slug);
    expect(d.length, `"${d}" is ${d.length} chars`).toBeLessThanOrEqual(LIMIT);
  });

  it("gives every score a genuinely distinct description", () => {
    const all = slugs.map(describeFor);
    expect(new Set(all).size).toBe(slugs.length);
  });

  it("does not differ only in the opening words", () => {
    // The old failure mode: unique by leading score name, identical thereafter.
    //
    // Some sharing is correct and should not fail — the tail carries category
    // and reference count, so two respiratory scores each citing 3 sources
    // genuinely have the same one. What must not happen is one tail dominating.
    // The previous assertion was `> 1` distinct tails, which 21 of 22 scores
    // sharing a single tail would have passed: it named the right failure and
    // then permitted it.
    const tails = slugs.map((s) => describeFor(s).split(": ").slice(1).join(": "));
    const counts = new Map<string, number>();
    for (const t of tails) counts.set(t, (counts.get(t) ?? 0) + 1);
    const [worst, n] = [...counts].sort((a, b) => b[1] - a[1])[0]!;
    expect(n, `${n} of ${slugs.length} descriptions share the tail "${worst}"`).toBeLessThan(
      slugs.length / 2,
    );
  });
});
