import type { InterpretationBand } from "@towardpcc/scoring-engine";

/**
 * Pure formatters for the calculator surface.
 *
 * Separated from score-meta.tsx so they can be TESTED. They lived in a .tsx
 * beside the components that call them, which the unit runner cannot parse —
 * so neither had a test, and `shortCite` duly shipped with a regex that could
 * never match. A pure string function that a component happens to use is not a
 * component.
 */

/**
 * Renders a band's numeric range exactly as the engine evaluates it.
 *
 * Inclusivity is not decoration here. The defaults model an ascending
 * "≥ threshold" score (min inclusive, max exclusive), while descending scores
 * like P/F invert both, and a band printed as "4–8" would be ambiguous at
 * precisely the boundary a clinician is most likely to be looking up.
 */
export function formatBand(band: InterpretationBand): string {
  const minInc = band.minInclusive ?? true;
  const maxInc = band.maxInclusive ?? false;

  if (band.min !== null && band.max !== null) {
    return `${minInc ? "" : ">"}${band.min} to ${maxInc ? "" : "<"}${band.max}`;
  }
  if (band.min !== null) return `${minInc ? "≥" : ">"} ${band.min}`;
  if (band.max !== null) return `${maxInc ? "≤" : "<"} ${band.max}`;
  return "any value";
}

/**
 * "Author Year" from a full citation, for the provenance line beside the result.
 *
 * Derived rather than stored: every reference already carries the full string,
 * and a second short field would be one more thing that can disagree with the
 * long one.
 *
 * NULL WHEN IT CANNOT, and the caller omits the line. It used to return the
 * whole citation as a fallback, which meant a failure printed two hundred
 * characters into a 22rem sticky rail beside the number — and hid, for as long
 * as it existed, a year pattern that could never match. A missing provenance
 * line is recoverable: the full citation is in Evidence, one tab away. A wrong
 * or unreadable one is not.
 */
export function shortCite(citation: string): string | null {
  /**
   * A surname FOLLOWED BY INITIALS, not merely a capitalised first word.
   *
   * Matching the leading capital alone shortened "Endotracheal Tube. StatPearls
   * [Internet]… 2023." to "Endotracheal 2023" — a plausible-looking attribution
   * to a word from the title. The initials are what distinguish an author from
   * a title: Vancouver puts one to three capitals and a delimiter straight
   * after the surname, and no title in the corpus has that shape.
   *
   * Also matched after a semicolon, because a collective author can lead:
   * "ARDS Definition Task Force; Ranieri VM, …" is the Berlin Definition, and
   * the named authors follow the group exactly as the style prescribes.
   */
  const surname = /(?:^|;\s*)([A-Z][A-Za-zÀ-ÿ'’-]+)\s+[A-Z]{1,3}[,.]/.exec(citation)?.[1];
  /**
   * A corporate author, where there is no personal one: "KDIGO Acute Kidney
   * Injury Work Group." A leading all-caps acronym, bounded — which "MDCalc"
   * and "Evidencio" deliberately do not satisfy, because those are vendor
   * pages rather than issuing bodies and "MD 2019" would be an invention.
   */
  const corporate = surname ? undefined : /^([A-Z]{2,})\b/.exec(citation)?.[1];
  /**
   * The first four-digit year, bounded so it cannot match inside a volume
   * number or an article id.
   *
   * THE BOUNDARIES WERE LITERAL BACKSPACE CHARACTERS — written through a tool
   * that read `\b` as the escape it is in most languages rather than as the two
   * characters a regex needs, so this compiled to /<BS>(19|20)\d{2}<BS>/ and
   * matched nothing, ever. It failed in exactly the way the fallback was
   * designed to hide. Found by looking at the rendered page; nothing checked
   * it, which is why there is a test beside it now.
   */
  const year = /\b(?:19|20)\d{2}\b/.exec(citation)?.[0];
  const author = surname ?? corporate;
  return author && year ? `${author} ${year}` : null;
}
