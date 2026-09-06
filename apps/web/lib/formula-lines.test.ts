import { describe, expect, it } from "vitest";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import { formulaLines } from "./formula-lines";

/** The lines, joined back the way the page would read them, for a word-for-word check. */
const rebuild = (lines: { label?: string; text: string }[]) =>
  lines
    .map((l) => (l.label ? `${l.label}: ${l.text}` : l.text))
    .join(" ")
    .replace(/\s+/g, " ");

describe("formulaLines", () => {
  it("splits PELOD-2 into a lead-in, five labelled systems and a closing line, without changing a word", () => {
    const text = getScore("pelod2")!.formula!.en;
    const lines = formulaLines("pelod2", text);
    expect(lines).not.toBeNull();
    expect(lines!.map((l) => l.label)).toEqual([
      undefined,
      "Neurologic",
      "Cardiovascular",
      "Renal",
      "Respiratory",
      "Haematologic",
      undefined,
    ]);
    // The sentence about the second output belongs to the whole formula, not
    // to the haematological system it happens to follow.
    expect(lines!.at(-1)!.text.startsWith("A second output")).toBe(true);
    expect(lines!.at(-2)!.text.includes("second output")).toBe(false);
    expect(rebuild(lines!)).toBe(text.replace(/\s+/g, " "));
  });

  it("splits KDIGO into its three axes with no closing line", () => {
    const text = getScore("kdigo-aki")!.formula!.en;
    const lines = formulaLines("kdigo-aki", text);
    expect(lines!.filter((l) => l.label).map((l) => l.label)).toEqual([
      "SERUM-CREATININE AXIS",
      "URINE-OUTPUT AXIS",
      "UNRESOLVABLE AXIS",
    ]);
    expect(lines!.at(-1)!.label).toBeDefined();
    expect(rebuild(lines!)).toBe(text.replace(/\s+/g, " "));
  });

  it("keeps the paragraph for every score that is not listed, whatever its prose", () => {
    for (const s of listScores({ status: "published" })) {
      if (s.slug === "pelod2" || s.slug === "kdigo-aki") continue;
      const text = getScore(s.slug)!.formula?.en ?? "";
      expect(formulaLines(s.slug, text), s.slug).toBeNull();
    }
  });

  it("fails loudly if a listed score's closing marker disappears from its prose", () => {
    expect(() => formulaLines("pelod2", "Neurologic: a. Cardiovascular: b.")).toThrow(
      /A second output/,
    );
  });
});
