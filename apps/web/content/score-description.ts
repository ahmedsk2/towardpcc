import type { ScoreDefinition } from "@towardpcc/scoring-engine";
import { site } from "./site";

/**
 * The meta description for a calculator page.
 *
 * Lives here rather than in the route because a route module cannot be
 * imported by a test: `page.tsx` resolves through the `@/` alias, which vitest
 * does not, and its exports are server functions tied to route params. While
 * this template sat inside the route, `content/metadata.test.ts` tested a
 * hand-copied duplicate of it — the length and uniqueness rules were real, but
 * they were being checked against a string the site never rendered.
 *
 * The 160 is what a search result will display before truncating. The rule it
 * enforces is not cosmetic: descriptions used to be built by appending each
 * score's name to the shared catalogue lede, which put 17 of 22 past that limit
 * AND left all 22 with an identical tail, so they were distinct only in the
 * opening words — the part a snippet keeps and a reader scans.
 */
export const DESCRIPTION_LIMIT = 160;

/**
 * Strips parenthetical expansions from a score name. Applies anywhere in the
 * string, not just at the end: one score is "Serum osmolality (calculated) and
 * osmolar gap", where the parenthetical sits mid-name and a trailing-only rule
 * silently does nothing.
 */
export const shortName = (name: string) =>
  name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/**
 * One description, used by both the meta tags and the JSON-LD. They must agree:
 * a structured-data description that differs from the meta description is a
 * signal to a crawler that one of them is boilerplate.
 */
export function scoreDescription(score: ScoreDefinition): string {
  const refs = score.references.length;
  const build = (name: string) =>
    `${name}: ${site.calculators.categoryLabels[score.category].toLowerCase()} score for PICU, ` +
    `computed in your browser from ${refs} referenced ${refs === 1 ? "source" : "sources"}. ` +
    `Nothing you enter is sent.`;
  // A few names carry a long parenthetical expansion — "Pediatric burn fluid
  // resuscitation (Parkland / modified Brooke)" is 62 characters on its own.
  // Drop it only where the full name would push the description past the
  // display limit. The <title> and heading always keep the full name.
  const full = build(score.name);
  return full.length > DESCRIPTION_LIMIT ? build(shortName(score.name)) : full;
}
