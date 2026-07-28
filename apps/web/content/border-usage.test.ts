import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Usage guard for the border tiers, complementing the value guard in
 * packages/ui/src/tokens.test.ts.
 *
 * The value guard cannot catch this class of bug on its own:
 * --color-surface-sunken is a legitimate token and a correct FILL. Painted as
 * a boundary it is 1.056:1 against the page — invisible. It shipped that way
 * in 38 places, and the guard passed because it asserted --color-edge, a token
 * the UI was not actually using. So the values were fine and the UI was flat.
 *
 * divide-* is in scope deliberately: it draws the same kind of line as a
 * border, and a scan for `border-` alone would have missed
 * `divide-surface-sunken`, which shipped with exactly this defect.
 *
 * ring-* is deliberately NOT in scope. `ring-<surface>` is the knockout idiom
 * — an element overlapping another is ringed in the colour of the surface
 * behind it so it reads as cut out of the layout (see the overlapping image on
 * the home page). There, matching the background is the whole point, which is
 * the exact inverse of the bug this guards against. Banning it would turn a
 * correct technique into a false positive.
 *
 * Boundaries belong to the border tiers: border-border-subtle (rules inside a
 * card), border-border (card edges and section dividers), border-border-strong
 * (anything identifying a control or its state — WCAG 1.4.11).
 */
const ROOTS = [
  join(__dirname, "..", "app"),
  join(__dirname, "..", "components"),
  // packages/ui is in scope: two of the original 38 sites were the Card and
  // Accordion primitives, which is the worst place for this bug — one edit
  // there is invisible on every page that renders a card.
  join(__dirname, "..", "..", "..", "packages", "ui", "src"),
];

/**
 * Surfaces are enumerated out of tokens.css rather than hardcoded, mirroring
 * tokens.test.ts. The previous literal list — sunken|page|raised — was the
 * complete set on the day it was written, so a fourth surface token could be
 * added and painted as a border without this guard ever seeing it.
 */
const SURFACES = [
  ...readFileSync(
    join(__dirname, "..", "..", "..", "packages", "ui", "src", "tokens.css"),
    "utf8",
  ).matchAll(/--color-surface-([a-z0-9-]+):/g),
].map((m) => m[1]!);

/**
 * Matches the prefixes Tailwind actually emits, not just the bare ones:
 *
 * - `border-t-`, `border-x-`, `border-s-` — side-specific borders are the same
 *   defect on one edge, and `\bborder-surface-` missed all of them.
 * - `outline-` — a focus ring in a surface colour is invisible for the same
 *   reason, and it fails WCAG 2.4.11 rather than merely looking flat.
 * - the arbitrary-value escape `border-[var(--color-surface-page)]`, which
 *   spells the identical thing in a form no class-name pattern would catch.
 */
const BANNED = new RegExp(
  String.raw`\b(?:(?:border|divide|outline)(?:-[trblxyse])?-surface-(?:` +
    SURFACES.join("|") +
    String.raw`)(?:\/\d+)?\b` +
    String.raw`|(?:border|divide|outline)(?:-[trblxyse])?-\[[^\]]*--color-surface-[a-z0-9-]+)`,
  "g",
);

function collectSource(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectSource(full));
    // .css is in scope: globals.css writes real border rules, and scanning only
    // .ts/.tsx left the one file that can set a border without a class name
    // entirely unguarded.
    //
    // Test files are excluded: they legitimately quote the banned strings when
    // asserting on them, and a guard that cannot describe itself is useless.
    else if (/\.(ts|tsx|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("border usage (depth-system guard)", () => {
  const files = ROOTS.flatMap(collectSource);

  it("finds the app source files", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("enumerates the surface tokens rather than trusting a stale list", () => {
    // Guards the guard. If tokens.css moves or the declaration syntax changes,
    // SURFACES silently empties and BANNED stops matching anything — the guard
    // would report a clean codebase forever.
    expect(SURFACES.length).toBeGreaterThanOrEqual(3);
    expect(SURFACES).toContain("sunken");
  });

  // Title says "border or divider", not "ring": ring-* is deliberately out of
  // scope (see the header), and a test claiming to guard rings that does not is
  // worse than no test — someone greps for one, finds this, and stops looking.
  it("never paints a surface token as a border or divider", () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const hit of readFileSync(file, "utf8").match(BANNED) ?? []) {
        offenders.push(`${file.replace(/^.*[\\/]apps[\\/]web[\\/]/, "")}: ${hit}`);
      }
    }
    expect(
      offenders,
      "Surface tokens are fills, not boundaries. Use border-border-subtle / " +
        "border-border / border-border-strong depending on what the line is.",
    ).toEqual([]);
  });
});
