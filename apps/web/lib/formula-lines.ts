export interface FormulaLine {
  /** The clause label, e.g. "Neurologic"; undefined for the lead-in sentence. */
  readonly label?: string;
  readonly text: string;
}

/**
 * Lays out a formula paragraph as labelled lines when the prose itself
 * carries clause labels — "Neurologic: …", "Cardiovascular: …" — and leaves
 * it alone otherwise. It never changes a word: the test reassembles the
 * lines and compares them to the source. A label is a run of 2–28 letters,
 * digits, spaces, slashes or subscripts starting with a capital, at the start
 * of a sentence, followed by a colon and a space.
 */
const LABEL = /(?:^|(?<=[.;] ))([A-Z][A-Za-z0-9₀-₉/ –-]{1,27}): /g;

export function formulaLines(text: string): FormulaLine[] | null {
  const matches = [...text.matchAll(LABEL)];
  if (matches.length < 2) return null;
  const lines: FormulaLine[] = [];
  let cursor = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    const before = text.slice(cursor, start).trim();
    if (before) {
      if (lines.length === 0) lines.push({ text: before });
      else
        lines[lines.length - 1] = {
          ...lines[lines.length - 1]!,
          text: `${lines[lines.length - 1]!.text} ${before}`.trim(),
        };
    }
    cursor = start + m[0].length;
    lines.push({ label: m[1]!, text: "" });
  }
  const tail = text.slice(cursor).trim();
  if (tail)
    lines[lines.length - 1] = {
      ...lines[lines.length - 1]!,
      text: `${lines[lines.length - 1]!.text} ${tail}`.trim(),
    };
  // Fill each labelled line's text with what sits between it and the next label.
  let idx = 0;
  const out: FormulaLine[] = [];
  for (const line of lines) {
    if (line.label === undefined) {
      out.push(line);
      continue;
    }
    const start = (matches[idx]!.index ?? 0) + matches[idx]![0].length;
    const end = idx + 1 < matches.length ? (matches[idx + 1]!.index ?? text.length) : text.length;
    out.push({ label: line.label, text: text.slice(start, end).trim() });
    idx++;
  }
  return out;
}
