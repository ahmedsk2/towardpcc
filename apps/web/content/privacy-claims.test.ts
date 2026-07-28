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

  /**
   * The residency claim must stay qualified for as long as the qualifications
   * are true.
   *
   * Two things currently leave Saudi Arabia and both are disclosed: requests
   * transit a Cloudflare edge chosen by proximity, and the operator
   * notification is relayed outside the Kingdom (ADR-0004 decision 5). Neither
   * is large. That is exactly why the caveat is at risk — it reads as clutter
   * to anyone tidying the copy who does not know why it is there.
   *
   * The claim becomes unqualified when the edge migration lands, and the
   * wording changes in THAT deploy, not before. Until then an absolute here
   * would be the most consequential false claim the site could make, because
   * a hospital's governance office may rely on it.
   */
  it("makes no absolute residency claim while data still leaves the Kingdom", () => {
    const sources = [
      JSON.stringify(site.dataProtection),
      readFileSync(join(__dirname, "..", "app", "trust", "page.tsx"), "utf8"),
    ].join(" ");

    const absolutes = [
      /never leaves? (?:the Kingdom|Saudi)/i,
      /(?:stays?|remains?) (?:entirely |wholly |only )?(?:in|within) (?:the Kingdom|Saudi Arabia)\b/i,
      /all (?:data|processing) (?:is |happens |occurs )?(?:in|within|inside) (?:the Kingdom|Saudi Arabia)/i,
      /nothing (?:ever )?leaves (?:the Kingdom|Saudi Arabia)/i,
    ];
    const offender = absolutes.find((re) => re.test(sources));
    expect(
      offender?.source,
      "the residency copy makes an unqualified claim, but requests still transit a Cloudflare edge and the operator notification is relayed outside KSA — see ADR-0004. Change this in the same deploy as the edge migration, not before",
    ).toBeUndefined();
  });

  it("discloses that the operator notification is relayed outside the Kingdom", () => {
    // The disclosure ADR-0004 decision 5 requires. Asserted positively so that
    // deleting it fails, rather than relying on nobody noticing it is gone.
    const trust = readFileSync(join(__dirname, "..", "app", "trust", "page.tsx"), "utf8");
    expect(
      /relay outside the Kingdom|relayed outside the Kingdom/i.test(trust),
      "/trust no longer discloses that the operator notification leaves KSA — required by ADR-0004 decision 5",
    ).toBe(true);
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
