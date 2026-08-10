import { listScores } from "@towardpcc/scoring-engine";

/**
 * Counts the site publishes about itself, resolved from the registry.
 *
 * `/trust` promises that "every figure here is something you can go and count".
 * The About page had been carrying a hand-typed "23 referenced PICU
 * calculators" while the index, the trust page and the validation page all said
 * 25 — it simply went stale, and nothing noticed until an outside reader
 * counted. Two more literals were found the moment a guard existed to look.
 *
 * So published copy carries a TOKEN and this resolves it. Substitution is
 * centralised here rather than done at each render site because the failure
 * mode of the alternative is silent: forget it at one call site and the page
 * prints the token itself.
 */
const TOKENS: Record<string, () => string> = {
  "{liveCalculators}": () => String(listScores({ status: "published" }).length),
};

/** Resolve every count token in a string of published copy. */
export function withCounts(text: string): string {
  let out = text;
  for (const [token, resolve] of Object.entries(TOKENS)) {
    if (out.includes(token)) out = out.split(token).join(resolve());
  }
  return out;
}

/** The token names, for the guard in content/published-counts.test.ts. */
export const COUNT_TOKENS = Object.keys(TOKENS);
