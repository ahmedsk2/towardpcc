import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { site } from "./site";

/**
 * The privacy page must not claim to collect something the site does not collect.
 *
 * This is the inverse of the usual privacy lie. The collection table promises
 * "the honest, complete picture of what each part of the site collects today",
 * and until 2026-07-28 it listed an Analytics row describing cookie-less page
 * counts. No analytics runs: the only trace of one is a container in
 * docker-compose files that production does not use, and the live pages load
 * nothing but their own chunks.
 *
 * Nobody was harmed by that particular error — over-declaring collection is the
 * safe direction to be wrong in. It matters because it is the same failure that
 * produced "87 citations with PMID and DOI" and "the remaining 152": a sentence
 * that was true of an intention rather than of the system, on a page whose whole
 * value is that its statements are checkable.
 *
 * Written as an implication so that wiring analytics up is never blocked by a
 * test — add the collector and the row becomes legal again automatically.
 */
const ROOTS = [join(__dirname, "..", "app"), join(__dirname, "..", "components")];

/**
 * Wiring signals, not product names.
 *
 * The first version of this matched the bare word `plausible`, and
 * components/forms/submission-form.tsx says "The label is a plausible field
 * name" in a comment about the honeypot. That single false positive made
 * analyticsIsWired permanently true and the guard below permanently vacuous —
 * it would have shipped as a test that could never fail, which is the exact
 * defect this file exists to argue against.
 *
 * So: match only strings that cannot occur in English prose — a script URL, an
 * SDK call, a public env var. Comments are stripped as well, belt and braces.
 */
const COLLECTOR =
  /umami\.(?:js|is)|plausible\.io|googletagmanager|gtag\s*\(|matomo\.js|posthog\.(?:init|capture)|NEXT_PUBLIC_(?:UMAMI|PLAUSIBLE|POSTHOG|ANALYTICS)/i;

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

function collectSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectSource(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("privacy copy matches what the site actually does", () => {
  const analyticsIsWired = ROOTS.flatMap(collectSource).some((f) =>
    COLLECTOR.test(stripComments(readFileSync(f, "utf8"))),
  );

  it("does not think analytics is wired when it is not", () => {
    // Guards the guard. Everything below is an implication predicated on this
    // being false; if a stray prose match flips it true, the real assertion
    // silently stops testing anything.
    expect(
      analyticsIsWired,
      "a collector signal was found in app/ or components/ — if analytics really was added, restore the collection-table row and delete this assertion",
    ).toBe(false);
  });

  it("lists no analytics row in the collection table", () => {
    // Asserted against the TABLE, not the prose around it.
    //
    // Two earlier attempts scanned copy for keywords and both were wrong. The
    // first matched the whole site and hit /data's registry "Analytics"
    // feature, which is clinical and has nothing to do with tracking. The
    // second matched the privacy section and hit this page's own DENIAL — "we
    // run no analytics: no page counts" — because a keyword cannot tell an
    // admission from a refusal.
    //
    // The table is a structured list of things collected, so a row in it IS an
    // admission by construction. That is the level where the claim actually
    // lives, and the only level where it can be checked without parsing English.
    const categories = site.dataProtection.collection.rows.map((r) => r[0] ?? "");
    const analyticsRow = categories.find((c) => /analytic|page count|telemetry/i.test(c));
    expect(
      analyticsRow && !analyticsIsWired,
      `the collection table declares "${analyticsRow}" but no collector is wired into app/ or components/ — either wire one up or drop the row`,
    ).toBeFalsy();
  });

  it("still names the sub-processors that do exist", () => {
    // The opposite failure, and the one actually worth worrying about: a list of
    // third parties that omits a live one. Oracle hosts it and Cloudflare sits in
    // front of every request; both must stay named for as long as that is true.
    const body = site.dataProtection.subProcessorsBody;
    expect(body).toMatch(/Oracle Cloud Infrastructure/);
    expect(body).toMatch(/Cloudflare/);
  });
});
