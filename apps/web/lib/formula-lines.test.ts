import { describe, expect, it } from "vitest";
import { getScore } from "@towardpcc/scoring-engine";
import { formulaLines } from "./formula-lines";

describe("formulaLines", () => {
  it("splits PELOD-2's clause-labelled prose into labelled lines without changing a word", () => {
    const text = getScore("pelod2")!.formula!.en;
    const lines = formulaLines(text);
    expect(lines).not.toBeNull();
    expect(lines!.map((l) => l.label)).toEqual(
      expect.arrayContaining([
        "Neurologic",
        "Cardiovascular",
        "Renal",
        "Respiratory",
        "Haematologic",
      ]),
    );
    // Reassembled, it is the original text: the splitter only chooses breaks.
    const rebuilt = lines!.map((l) => (l.label ? `${l.label}: ${l.text}` : l.text)).join(" ");
    expect(rebuilt.replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "));
  });

  it("returns null for prose with fewer than two clause labels, so the page keeps the paragraph", () => {
    expect(formulaLines(getScore("bsa-mosteller")!.formula!.en)).toBeNull();
  });
});
