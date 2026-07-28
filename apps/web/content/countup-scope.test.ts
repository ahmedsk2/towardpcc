import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Count-up scope guard (docs/design/motion.md, revision 3).
 *
 * The Counter component server-renders `0` and animates to its real value after
 * hydration. That is fine where a figure is decorative AND below the fold, so
 * it has scrolled into view before it animates. It is not fine anywhere else.
 *
 * It shipped in the pillar-page hero stat band, which sits above the fold
 * (~636px at 1280x900), so the first paint read "0 Pilot unit" directly beneath
 * "Pilot underway · one Gulf unit", and "1 Areas of support" beside "Three
 * kinds of help". The content was correct the whole time — site.ts declared 1
 * and 3 — so nothing about the values was wrong. The animation was reading
 * correct numbers out loud starting from zero, in a place a visitor could
 * screenshot.
 *
 * The rule is positional rather than categorical, which is why this is a source
 * scan and not a value assertion: no test can see where a figure sits on the
 * page, but it can see which files are allowed to import the component.
 */
const ROOTS = [join(__dirname, "..", "app"), join(__dirname, "..", "components")];

/** The home counter band, and the component itself. Nothing else. */
const ALLOWED = ["app/page.tsx", "components/home/counter.tsx"];

const IMPORTS_COUNTER =
  /from\s+["'](?:@\/components\/home\/counter|\.\/counter|\.\.\/home\/counter)["']/;

function collectTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsx(full));
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const rel = (file: string) => file.replace(/^.*[\\/]apps[\\/]web[\\/]/, "").replaceAll("\\", "/");

describe("count-up scope", () => {
  const files = ROOTS.flatMap(collectTsx);

  it("finds the app source", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("imports Counter only where count-up is permitted", () => {
    const importers = files.filter((f) => IMPORTS_COUNTER.test(readFileSync(f, "utf8"))).map(rel);
    expect(
      importers.sort(),
      "Count-up is permitted in the home counter band only (motion.md rev 3). " +
        "Anywhere above the fold it paints 0 first and can contradict the copy beside it.",
    ).toEqual(ALLOWED.filter((a) => a !== "components/home/counter.tsx").sort());
  });

  it("still has a home counter band to animate", () => {
    // Guards the guard: if Counter were deleted outright this test would pass
    // vacuously while the home band silently lost its animation.
    const home = readFileSync(join(__dirname, "..", "app", "page.tsx"), "utf8");
    expect(IMPORTS_COUNTER.test(home)).toBe(true);
  });
});
