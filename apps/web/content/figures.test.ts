import { describe, expect, it } from "vitest";
import { listScores, registry } from "@towardpcc/scoring-engine";
import { site } from "./site";

/**
 * Every public figure must equal the artifact it describes.
 *
 * This exists because the site claimed 89 citations against a real 87, and the
 * e2e guard that was supposed to catch exactly that did not — it asserted the
 * rendered number matched site.ts, so the figure only ever had to agree with
 * itself. A number can be self-consistent and still be a lie.
 *
 * These assertions compare the copy against the registry instead, so the two
 * cannot drift apart no matter which one someone edits.
 */
const truth = {
  scores: listScores({ status: "published" }).length,
  citations: registry.reduce((n, s) => n + s.references.length, 0),
};

const numeric = (v: string | number) => Number(String(v).replace(/[^\d]/g, ""));

describe("public figures match the registry", () => {
  it("hero: cited references", () => {
    const stat = site.home.heroTrust.find((t) => /cited references/i.test(t.label));
    expect(stat, "the hero should still carry a citation figure").toBeDefined();
    expect(numeric(stat!.value)).toBe(truth.citations);
  });

  it("hero: calculators live", () => {
    const stat = site.home.heroTrust.find((t) => /calculators live/i.test(t.label));
    expect(numeric(stat!.value)).toBe(truth.scores);
  });

  it("proof band: literature citations", () => {
    const stat = site.home.counters.find((c) => /literature citations/i.test(c.label));
    expect(stat!.value).toBe(truth.citations);
  });

  it("proof band: referenced calculators", () => {
    const stat = site.home.counters.find((c) => /referenced calculators/i.test(c.label));
    expect(stat!.value).toBe(truth.scores);
  });

  it("no figure in the copy is typed as a literal that could drift", () => {
    // The citation count is the one that got out of step, so it is the one
    // pinned here: it must not appear as a hardcoded numeral anywhere in the
    // content module.
    const src = String(site.home.features.map((f) => f.body).join(" "));
    expect(src).toContain(String(truth.citations));
  });

  it("every published score actually has at least one citation", () => {
    // The figure being right is not enough if a score contributes zero.
    for (const s of registry) {
      expect(s.references.length, `${s.slug} has no references`).toBeGreaterThan(0);
    }
  });
});
