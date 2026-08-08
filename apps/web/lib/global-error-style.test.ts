import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLOBAL_ERROR_STYLE, GLOBAL_ERROR_STYLE_SHA256 } from "./global-error-style";

/**
 * The hash in `global-error-style.ts` is hard-coded, because `proxy.ts`
 * assembles the CSP synchronously in middleware where `node:crypto` does not
 * exist. That makes this test the only thing keeping it truthful.
 *
 * The drift it guards against is silent in the worst possible way: the style is
 * simply refused, on a boundary that only renders when the application has
 * already crashed, and the only symptom is a missing focus ring on the one
 * control the page has.
 */
describe("global-error inline style CSP hash", () => {
  it("matches the style it is supposed to authorise", () => {
    const actual = `sha256-${createHash("sha256").update(GLOBAL_ERROR_STYLE).digest("base64")}`;
    expect(
      actual,
      "GLOBAL_ERROR_STYLE changed without GLOBAL_ERROR_STYLE_SHA256 being updated. " +
        `Set it to: ${actual}`,
    ).toBe(GLOBAL_ERROR_STYLE_SHA256);
  });

  it("is a base64 sha256 source expression, not a bare digest", () => {
    // `style-src-elem` needs the `sha256-` prefix; a bare digest is silently
    // ignored as an unknown source and the style stays blocked.
    expect(GLOBAL_ERROR_STYLE_SHA256).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
  });

  /**
   * The component must actually USE the exported constant. Hashing a string
   * that no longer matches what the component renders authorises nothing, and
   * both files would still pass every other assertion here.
   */
  it("is the string global-error.tsx actually renders", () => {
    const source = readFileSync(join(__dirname, "..", "app", "global-error.tsx"), "utf8");
    expect(
      source,
      "global-error.tsx must render GLOBAL_ERROR_STYLE rather than its own literal",
    ).toContain("GLOBAL_ERROR_STYLE");
    // And no stray inline stylesheet alongside it, which would be un-hashed.
    const inlineStyleLiterals = source.match(/<style>\{`/g) ?? [];
    expect(inlineStyleLiterals.length, "an un-hashed inline <style> literal reappeared").toBe(0);
  });

  /**
   * The focus idiom itself. apps/web/CLAUDE.md pins one focus treatment across
   * the site and allows a raw hex here only because no stylesheet is loaded in
   * this boundary — so if the outline is ever dropped from this string, the
   * retry button silently becomes unfocusable-looking.
   */
  it("still carries the crimson focus-visible outline", () => {
    expect(GLOBAL_ERROR_STYLE).toContain("focus-visible");
    expect(GLOBAL_ERROR_STYLE).toContain("#cf1f3d");
    expect(GLOBAL_ERROR_STYLE).toContain("outline-offset:2px");
  });
});
