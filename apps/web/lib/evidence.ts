import { listScores, registry } from "@towardpcc/scoring-engine";
// The PURE module, not the package root. `@towardpcc/ui` exports JSX
// components alongside these helpers, so importing a number from the root
// drags a component into a module that must stay React-free — and the unit
// runner cannot parse it, which is how this file learns the same lesson
// `shortCite` did.
import { contrastRatio } from "@towardpcc/ui/contrast";

/**
 * The figures the /trust and /validation chips are allowed to show.
 *
 * ONE RULE GOVERNS THIS FILE. A chip may only display a value the build can
 * compute, or a constant a CI gate holds — and this module is the only place
 * that knows how any of them is computed, so a chip cannot invent one.
 *
 * That rule is meant to cost chips, and it did: data residency and the backup
 * restore drill were both dropped from the design rather than faked, because
 * `me-riyadh-1` exists in this repository only inside a comment and the last
 * drill date lives in a runbook, in prose. A chip showing an underivable number
 * is exactly the decorative assertion /trust exists to refuse, and it would rot
 * silently the first time the underlying fact changed. Making those facts
 * derivable is a precondition for a chip, not part of building one.
 *
 * NO REACT IMPORT, deliberately. These are plain values, unit-testable without
 * a DOM. The lesson is `shortCite`, which shipped with a regex that could never
 * match precisely because it lived in a `.tsx` the unit runner cannot parse, so
 * nothing tested it.
 */

/** The two colours the accessibility chip measures, from `tokens.css`. */
const INK_STRONG = "#2b1b20";
const SURFACE_PAGE = "#fffaf7";

/**
 * The coverage gate, DECLARED here and PINNED BY TEST to the real threshold.
 *
 * Not imported from `packages/scoring-engine/vitest.config.ts`, which opens
 * with `import { defineConfig } from "vitest/config"` — importing it would drag
 * a dev dependency into the production module graph to render one number.
 * `evidence.test.ts` imports that config (it runs under vitest, so it may) and
 * asserts these four values equal it, which makes drift impossible without the
 * bundle cost.
 */
export const COVERAGE = {
  lines: 100,
  branches: 100,
  functions: 100,
  statements: 100,
} as const;

/** The spec that enforces the zero-network claim. Named, never parsed. */
export const PRIVACY_SPEC = "e2e/calculator-privacy.spec.ts";

export interface Evidence {
  /** Published calculators. */
  scores: number;
  /** Citations across every score — a score cannot publish without a locator. */
  citations: number;
  /** Scores whose reviewer slots are all filled. Zero today, and it must show. */
  validated: number;
  /** Every score, published or not — the denominator for `validated`. */
  total: number;
  /** The coverage gate, as one number when all four axes agree. */
  coveragePercent: number;
  /** Measured contrast of body ink on the page ground, to one decimal. */
  contrast: number;
}

/**
 * Every figure the chips may render, computed once.
 *
 * `scores` and `citations` are the same derivations `/trust` already performed
 * inline and rendered only as words inside a heading; they move here so the
 * chip and the heading cannot disagree.
 */
export function evidence(): Evidence {
  const axes = Object.values(COVERAGE);
  return {
    scores: listScores({ status: "published" }).length,
    citations: registry.reduce((n, s) => n + s.references.length, 0),
    validated: registry.filter((s) => s.validators.every((v) => v.status === "assigned")).length,
    total: registry.length,
    // Collapsed to one number ONLY while the four axes agree. If they ever
    // diverge the chip would be quietly reporting the wrong gate, so this
    // returns the lowest — the one that actually blocks a merge.
    coveragePercent: Math.min(...axes),
    contrast: Math.round(contrastRatio(INK_STRONG, SURFACE_PAGE) * 10) / 10,
  };
}
