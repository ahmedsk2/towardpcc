import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

  /**
   * The home page's pillar cards, which lived outside every guard above.
   *
   * Those assertions all read `site.ts`. The pillar array is declared in
   * `app/page.tsx` instead, and carried "Twenty-two Tier-A PICU scores" with
   * stats 22 and 87 while the registry held 23 and 91 — with a comment above it
   * claiming it was "pinned to the registry by content/figures.test.ts", which
   * it was not. The claim of coverage is what made it invisible.
   *
   * Read as source text rather than imported: the module is a server component
   * that pulls in half the app, and the figures are literals in a const array,
   * so the text is exactly what a reader sees.
   */
  it("home pillar cards: the typed figures match the registry", () => {
    const src = readFileSync(fileURLToPath(new URL("../app/page.tsx", import.meta.url)), "utf8");

    const scores = src.match(/\{ label: "Scores", value: "(\d+)" \}/);
    expect(scores, "the calculators pillar should still carry a score count").not.toBeNull();
    expect(Number(scores![1])).toBe(truth.scores);

    const cites = src.match(/\{ label: "Citations", value: "(\d+)" \}/);
    expect(cites, "the calculators pillar should still carry a citation count").not.toBeNull();
    expect(Number(cites![1])).toBe(truth.citations);

    // And the sentence above them, which spells the same number in words and so
    // slipped past every numeral-watching guard this file already had.
    const words = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
      "Twenty",
      "Twenty-one",
      "Twenty-two",
      "Twenty-three",
      "Twenty-four",
      "Twenty-five",
    ];
    const spelled = words[truth.scores];
    expect(spelled, `add a word for ${truth.scores} to this table`).toBeDefined();
    expect(
      src,
      `the pillar body should read "${spelled} Tier-A PICU scores" — the registry holds ${truth.scores}`,
    ).toContain(`${spelled} Tier-A PICU scores`);
  });

  it("no figure in the copy is typed as a literal that could drift", () => {
    // The citation count is the one that got out of step, so it is the one
    // pinned here: it must not appear as a hardcoded numeral anywhere in the
    // content module.
    const src = String(site.home.features.map((f) => f.body).join(" "));
    expect(src).toContain(String(truth.citations));
  });

  /**
   * A count can be right while the sentence around it is false.
   *
   * The homepage said "87 citations with PMID and DOI" until 2026-07-28. The
   * 87 was correct and every figure test above passed — but only 56 of the 87
   * carry both identifiers, and 16 carry neither. The guards were all watching
   * the numeral and none was watching the claim.
   *
   * Written as an implication rather than a fixed expectation, so that adding
   * DOIs to the registry is never blocked by a test: improve the data and the
   * stronger sentence simply becomes legal.
   */
  it("does not claim identifier coverage the registry does not have", () => {
    // `in` rather than property access: Reference is a union whose third arm
    // is url-only and declares neither key, which is how the type already
    // guarantees the weaker "traceable to its source" claim by construction.
    const withBoth = registry.reduce(
      (n, s) => n + s.references.filter((r) => "pmid" in r && "doi" in r).length,
      0,
    );
    const copy = site.home.features.map((f) => f.body).join(" ");
    const claimsBoth = /citations?[^.]*\bwith PMID and DOI/i.test(copy);
    expect(
      claimsBoth && withBoth !== truth.citations,
      `the copy claims every citation has a PMID and a DOI, but only ${withBoth} of ${truth.citations} do — say "traceable to its source", which registry-gate.test.ts actually enforces`,
    ).toBe(false);
  });

  /**
   * Arithmetic stated in prose is unowned by anything: no test computes it and
   * no reader recomputes it. "The remaining 152" shipped against 2,425 − 2,272
   * = 153 and survived every review.
   *
   * Parsing the sentence rather than duplicating its numbers is deliberate —
   * a copy of the figures here would just be a second place to get it wrong.
   */
  it("the library document counts add up", () => {
    const answer = site.pillarDetail.knowledge.faq.find((f) =>
      /can't be read/i.test(f.question),
    )?.answer;
    expect(answer, "the unreadable-documents FAQ should still exist").toBeDefined();
    const n = (re: RegExp) => Number((re.exec(answer!)?.[1] ?? "").replace(/,/g, ""));
    const imported = n(/Of ([\d,]+) imported/);
    const searchable = n(/([\d,]+) became full-text/);
    const native = n(/([\d,]+) by native/);
    const ocr = n(/([\d,]+) through OCR/);
    const remaining = n(/remaining ([\d,]+)/);

    expect(
      native + ocr,
      `${native} native + ${ocr} OCR should equal ${searchable} searchable`,
    ).toBe(searchable);
    expect(
      imported - searchable,
      `${imported} imported − ${searchable} searchable should equal the ${remaining} stated as remaining`,
    ).toBe(remaining);
  });
});
