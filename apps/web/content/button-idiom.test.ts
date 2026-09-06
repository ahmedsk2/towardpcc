import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * THE PRIMARY FILL IS DEFINED ONCE.
 *
 * `packages/ui/src/button.tsx` owns the crimson primary. Before 2026-09-06 the
 * recipe "bg-accent text-ink-on-accent" was hand-rolled in a dozen places and
 * each drifted; this scan asserts the property the family exists to hold, in
 * the same shape as countup-scope.test.ts: a raw source scan, so a comment
 * quoting the recipe fails too — write "the primary recipe" in prose instead.
 */
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIRS = ["app", "components"].map((d) => join(ROOT, d));
// Both alternatives require whitespace or a quote right after `bg-accent`, so
// `bg-accent-tint` and `bg-accent-deep` beside on-accent ink never match.
const RECIPE =
  /bg-accent(?:\s+[^"'`]*)?\s+text-ink-on-accent|text-ink-on-accent(?:\s+[^"'`]*)?\s+bg-accent(?=[\s"'`])/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("button idiom", () => {
  // The same sanity check countup-scope.test.ts carries: a guard that walks
  // an empty or wrong directory passes vacuously, and this one would then be
  // enforcing nothing while looking green.
  it("finds the app source", () => {
    expect(DIRS.flatMap((d) => walk(d)).length).toBeGreaterThan(30);
  });

  it("never hand-rolls the primary fill outside the ui package", () => {
    // `DIRS.flatMap(walk)` would pass flatMap's index as walk's `out` param,
    // clobbering the accumulator default — call it with one argument instead.
    const offenders = DIRS.flatMap((d) => walk(d)).filter((f) =>
      RECIPE.test(readFileSync(f, "utf8")),
    );
    expect(offenders.map((f) => f.slice(ROOT.length))).toEqual([]);
  });
});
