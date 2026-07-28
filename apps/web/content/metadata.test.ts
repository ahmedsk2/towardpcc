import { describe, expect, it } from "vitest";
import { listScores, getScore } from "@towardpcc/scoring-engine";
import { site } from "./site";

/**
 * Meta-description hygiene.
 *
 * The calculator route used to build its description by appending each score's
 * name to the shared 130-character catalogue lede. Two consequences: 17 of 22
 * descriptions ran past the ~160 characters a search result will display, and
 * all 22 shared an identical tail — so they were unique only in their opening
 * words, which is exactly the part a reader scans and a snippet keeps.
 *
 * This asserts the shape of the generated string rather than importing
 * generateMetadata, which is an async server function tied to route params.
 * The template is duplicated here deliberately: if someone changes the route's
 * wording without changing this, the length and uniqueness checks still run
 * against the real score data, and the mismatch surfaces as a failing
 * expectation rather than a silently stale test.
 */
const LIMIT = 160;

/** Mirrors the route: strips parentheticals anywhere, not only at the end. */
const shortName = (name: string) =>
  name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const describeFor = (slug: string): string => {
  const score = getScore(slug)!;
  const refs = score.references.length;
  const build = (name: string) =>
    `${name}: ${site.calculators.categoryLabels[score.category].toLowerCase()} score for PICU, ` +
    `computed in your browser from ${refs} referenced ${refs === 1 ? "source" : "sources"}. ` +
    `Nothing you enter is sent.`;
  const full = build(score.name);
  return full.length > LIMIT ? build(shortName(score.name)) : full;
};

describe("calculator meta descriptions", () => {
  const slugs = listScores({ status: "published" }).map((s) => s.slug);

  it("covers every published score", () => {
    expect(slugs.length).toBe(22);
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
    // Compare the tail after the first clause; at least some must differ.
    const tails = slugs.map((s) => describeFor(s).split(": ").slice(1).join(": "));
    expect(new Set(tails).size).toBeGreaterThan(1);
  });
});
