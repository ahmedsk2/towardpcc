import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

/**
 * Reads the shipped token values straight out of tokens.css, so this guard
 * asserts what actually ships rather than a copy that can drift. A palette
 * edit that breaks contrast fails CI instead of reaching a bedside screen.
 */
const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Token --${name} not found in tokens.css`);
  return match[1]!;
}

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;
const BODY_TARGET = 7;

describe("palette — text contrast (WCAG 2.2 AA)", () => {
  const cases: Array<[string, string, number]> = [
    ["color-ink-strong", "color-surface-page", BODY_TARGET],
    ["color-ink-body", "color-surface-page", BODY_TARGET],
    ["color-ink-body", "color-surface-raised", BODY_TARGET],
    ["color-ink-muted", "color-surface-page", AA_TEXT],
    ["color-ink-muted", "color-surface-raised", AA_TEXT],
    ["color-ink-muted", "color-surface-sunken", AA_TEXT],
    ["color-accent", "color-surface-raised", AA_TEXT],
    ["color-accent", "color-surface-page", AA_TEXT],
    ["color-accent", "color-surface-sunken", AA_TEXT],
    ["color-accent-deep", "color-surface-raised", AA_TEXT],
    ["color-ink-on-accent", "color-accent", AA_TEXT],
    ["color-ink-on-dark", "color-surface-hero", AA_TEXT],
    ["color-ink-on-dark", "color-surface-hero-raised", AA_TEXT],
    ["color-alert-text", "color-surface-raised", AA_TEXT],
    ["color-success-text", "color-surface-raised", AA_TEXT],
  ];

  it.each(cases)("%s on %s meets its threshold", (fg, bg, min) => {
    expect(contrastRatio(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});

describe("palette — non-text UI contrast (WCAG 1.4.11)", () => {
  it("control edges clear 3:1 on every light surface", () => {
    for (const bg of ["color-surface-raised", "color-surface-page", "color-surface-sunken"]) {
      expect(contrastRatio(token("color-edge"), token(bg))).toBeGreaterThanOrEqual(AA_NON_TEXT);
    }
  });

  it("accent clears 3:1 as a control boundary on light", () => {
    expect(
      contrastRatio(token("color-accent"), token("color-surface-page")),
    ).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe("palette — coral is dark-surface only", () => {
  it("reads clearly on the dark bands", () => {
    expect(contrastRatio(token("color-coral"), token("color-surface-hero"))).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  });

  /**
   * Coral is 2.55:1 on white. This documents that limitation as an invariant:
   * if someone later "fixes" coral to pass on light they have changed the
   * brand colour, and the gradients must be revisited deliberately.
   */
  it("is documented as failing on light, so it is never a light-ground UI colour", () => {
    expect(contrastRatio(token("color-coral"), token("color-surface-raised"))).toBeLessThan(
      AA_NON_TEXT,
    );
  });
});
