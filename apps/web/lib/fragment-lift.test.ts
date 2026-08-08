import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FRAGMENT_LIFT_SCRIPT, FRAGMENT_LIFT_SHA256 } from "./fragment-lift";

/**
 * The hash in `fragment-lift.ts` is hard-coded, because `proxy.ts` assembles the
 * CSP synchronously in middleware where `node:crypto` does not exist. That makes
 * this test the only thing keeping it truthful.
 *
 * The drift it guards against is SILENT in the worst way: edit the script,
 * forget the hash, and nothing appears broken. The script still runs everywhere
 * except `/admin`, where it has no work to do anyway — so the only symptom is a
 * CSP violation in a console nobody has open.
 */
describe("fragment-lift CSP hash", () => {
  it("matches the script it is supposed to authorise", () => {
    const actual = `sha256-${createHash("sha256").update(FRAGMENT_LIFT_SCRIPT).digest("base64")}`;
    expect(
      actual,
      "FRAGMENT_LIFT_SCRIPT changed without FRAGMENT_LIFT_SHA256 being updated. " +
        `Set it to: ${actual}`,
    ).toBe(FRAGMENT_LIFT_SHA256);
  });

  it("is a base64 sha256 source expression, not a bare digest", () => {
    // `script-src` needs the `sha256-` prefix; a bare digest is silently ignored
    // as an unknown source and the script stays blocked.
    expect(FRAGMENT_LIFT_SHA256).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
  });

  /**
   * The two behaviours the script exists for, asserted on the source rather than
   * by executing it — `app/layout.tsx` explains at length why the `=` test is
   * load-bearing in BOTH directions, and a rewrite that dropped it would still
   * hash cleanly and still pass every other test in this file.
   */
  it("still tests for '=' before touching the fragment", () => {
    expect(FRAGMENT_LIFT_SCRIPT).toContain('indexOf("=")');
  });

  it("still strips the fragment with replaceState rather than leaving it", () => {
    expect(FRAGMENT_LIFT_SCRIPT).toContain("history.replaceState");
    expect(FRAGMENT_LIFT_SCRIPT).toContain("location.pathname+location.search");
  });
});
