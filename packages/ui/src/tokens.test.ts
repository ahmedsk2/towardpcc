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

/**
 * Border tokens are only ever painted on light grounds — the dark bands use
 * the on-dark idioms (border-white/20 and friends), so cross-producting every
 * border against every surface would assert pairings that never render.
 */
const LIGHT_SURFACES = ["color-surface-page", "color-surface-raised", "color-surface-sunken"];

/**
 * Per-tier bands. Floors keep a border perceivable; ceilings keep the
 * hierarchy from inverting — without an upper bound a later edit could make
 * `subtle` heavier than `border` and both would still "pass".
 *
 * Only the control tier is bound by WCAG 1.4.11's 3:1. The decorative tiers
 * are deliberately below it: a card edge at 3:1 reads as a control.
 */
const BORDER_TIERS: Record<string, { min: number; max: number }> = {
  "color-border-subtle": { min: 1.3, max: 1.75 },
  "color-border": { min: 1.6, max: 3.0 },
  "color-border-strong": { min: AA_NON_TEXT, max: 21 },
};

describe("palette — non-text UI contrast (WCAG 1.4.11)", () => {
  /**
   * Enumerated from tokens.css, not hand-listed. The previous version asserted
   * --color-edge and passed while the UI painted a surface fill as a border
   * (1.056:1) in 38 places — it tested a token the code was not using.
   * Deriving the list from the file means a new tier cannot be added without
   * someone making a threshold decision about it.
   */
  const declared = [...css.matchAll(/--(color-border[a-z-]*):\s*#[0-9a-fA-F]{6}/g)].map(
    (m) => m[1]!,
  );

  it("covers exactly the border tokens that exist", () => {
    expect(new Set(declared)).toEqual(new Set(Object.keys(BORDER_TIERS)));
  });

  it.each(declared.flatMap((fg) => LIGHT_SURFACES.map((bg) => [fg, bg] as const)))(
    "%s on %s sits inside its tier's band",
    (fg, bg) => {
      const tier = BORDER_TIERS[fg];
      if (!tier) throw new Error(`No threshold declared for --${fg}`);
      const ratio = contrastRatio(token(fg), token(bg));
      expect(ratio).toBeGreaterThanOrEqual(tier.min);
      expect(ratio).toBeLessThanOrEqual(tier.max);
    },
  );

  it("orders the tiers — subtle quieter than card, card quieter than control", () => {
    const page = token("color-surface-page");
    const ratio = (name: string) => contrastRatio(token(name), page);
    expect(ratio("color-border-subtle")).toBeLessThan(ratio("color-border"));
    expect(ratio("color-border")).toBeLessThan(ratio("color-border-strong"));
  });

  it("has fully retired the old --color-edge token", () => {
    // It was declared in BOTH tokens.css and globals.css's @theme block. If the
    // :root value goes while the passthrough stays, `border-edge` still emits
    // border-color: var(--color-edge) with nothing to resolve — CSS treats that
    // as invalid-at-computed-value-time and falls back to currentColor, so
    // every input on the site would outline in ink.
    expect(css).not.toMatch(/--color-edge\s*:/);
  });

  it("accent clears 3:1 as a control boundary on light", () => {
    expect(
      contrastRatio(token("color-accent"), token("color-surface-page")),
    ).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});

describe("palette — coral is dark-surface only", () => {
  /**
   * Coral is the accent's voice on the dark bands (the role the old
   * accent-bright played). It must clear AA text on BOTH dark surfaces —
   * accent-bright is only 3.93:1 on hero-raised, which is why the dark-surface
   * components use coral instead.
   */
  it.each(["color-surface-hero", "color-surface-hero-raised"])(
    "reads clearly as text on %s",
    (bg) => {
      expect(contrastRatio(token("color-coral"), token(bg))).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

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
