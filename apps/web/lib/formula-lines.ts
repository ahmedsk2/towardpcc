export interface FormulaLine {
  /** The clause label, e.g. "Neurologic"; undefined for the lead-in and closing lines. */
  readonly label?: string;
  readonly text: string;
}

/**
 * WHICH FORMULAS ARE LAID OUT AS LABELLED LINES, decided per score by reading
 * the prose — not by a heuristic. The first cut split any formula carrying two
 * or more "Label: " clauses, and a review caught what that does to text after
 * the LAST label: PELOD-2's closing sentence about its second output sat under
 * "Haematologic" as if it were part of that system. The words were unchanged;
 * the attribution was wrong, and on a formula panel attribution is the point.
 *
 * So each listed score says where its labelled zone ends. `closingFrom` is the
 * start of the sentence that belongs to the whole formula again; everything
 * from it renders as an unlabelled closing line. A score not listed here keeps
 * its paragraph, whatever its prose looks like.
 */
const LISTED: Readonly<Record<string, { readonly closingFrom?: string }>> = {
  pelod2: { closingFrom: "A second output" },
  "kdigo-aki": {},
};

/** A clause label: a capitalised run of up to 28 characters at the start of a sentence, then ": ". */
const LABEL = /(?:^|(?<=[.;] ))([A-Z][A-Za-z0-9₀-₉/ –-]{1,27}): /g;

/**
 * Lays out a listed score's formula as a lead-in, labelled lines and an
 * optional closing line. It never changes a word — the test reassembles the
 * lines and compares them to the source. Returns null for a score that is not
 * listed, or whose prose no longer carries two labels (so a rewrite of the
 * text cannot silently produce a one-line "list").
 */
export function formulaLines(slug: string, text: string): FormulaLine[] | null {
  const entry = LISTED[slug];
  if (!entry) return null;

  const closingAt = entry.closingFrom ? text.indexOf(entry.closingFrom) : -1;
  if (entry.closingFrom && closingAt < 0) {
    throw new Error(`${slug}: formula no longer contains "${entry.closingFrom}"`);
  }
  const body = closingAt >= 0 ? text.slice(0, closingAt) : text;
  const closing = closingAt >= 0 ? text.slice(closingAt).trim() : "";

  const matches = [...body.matchAll(LABEL)];
  if (matches.length < 2) return null;

  const lines: FormulaLine[] = [];
  const lead = body.slice(0, matches[0]!.index ?? 0).trim();
  if (lead) lines.push({ text: lead });
  matches.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1]!.index ?? body.length) : body.length;
    lines.push({ label: m[1]!, text: body.slice(start, end).trim() });
  });
  if (closing) lines.push({ text: closing });
  return lines;
}
