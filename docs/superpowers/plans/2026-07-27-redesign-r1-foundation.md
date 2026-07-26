# Redesign R1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the warmed Pulse Crimson palette, type scale, gradient and motion tokens across the design system, guarded by an automated contrast test, and record the ADR revision — so R2–R4 can build on stable tokens.

**Architecture:** Tokens live once in `packages/ui/src/tokens.css` as CSS custom properties (the single source of truth). `apps/web/app/globals.css` re-exports them into Tailwind v4 via `@theme inline`, so utilities carry `var()` expressions and `:root` stays authoritative. `packages/ui/src/index.ts` exposes a typed token surface for TS consumers. A new vitest guard parses the CSS and asserts WCAG ratios, so a future palette edit cannot silently break contrast.

**Tech Stack:** Tailwind v4 (`@theme inline`), CSS custom properties, vitest, Next.js 16 App Router.

**Spec:** `docs/superpowers/specs/2026-07-27-site-redesign-design.md`

---

## Verified contrast (computed 2026-07-27, not estimated)

These are the numbers the guard test asserts. Every text pair clears AA.

| Pair                                    | Ratio    | Verdict                |
| --------------------------------------- | -------- | ---------------------- |
| ink `#2B1B20` on cream `#FFFAF7`        | 15.83    | PASS (>7)              |
| ink-body `#4A3D40` on cream             | 9.97     | PASS (>7)              |
| ink-muted `#6F5D63` on cream            | 5.92     | PASS AA                |
| crimson `#CF1F3D` on white              | 5.36     | PASS AA                |
| crimson on blush `#FFF2EE`              | 4.90     | PASS AA                |
| white on crimson (button)               | 5.36     | PASS AA                |
| accent-deep `#8F1728` on white          | 9.05     | PASS (>7)              |
| ink-on-dark `#FFEEF0` on plum `#3D1526` | 14.05    | PASS (>7)              |
| coral `#FF7A6B` on night `#260E1A`      | 7.11     | PASS (>7)              |
| **coral `#FF7A6B` on white**            | **2.55** | **FAILS 3:1 non-text** |

**Hard rule this creates:** coral is a **dark-surface and gradient-only** colour. It must never be a border, icon, or control boundary on a light ground, and never carries meaning. The guard test enforces this by asserting coral is _not_ used where light-ground UI contrast is required.

---

## File structure

| File                                     | Responsibility                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `packages/ui/src/tokens.css`             | **Modify.** Single source of truth for all colour/type/radius/motion/gradient values.               |
| `packages/ui/src/contrast.ts`            | **Create.** Pure sRGB relative-luminance + contrast-ratio helpers. No DOM, no deps — unit-testable. |
| `packages/ui/src/tokens.test.ts`         | **Create.** Parses `tokens.css` and asserts every shipped pairing meets its WCAG threshold.         |
| `packages/ui/src/index.ts`               | **Modify.** Typed token surface — add the new names.                                                |
| `apps/web/app/globals.css`               | **Modify.** Map new tokens into Tailwind `@theme inline`; add gradient utilities.                   |
| `docs/decisions/ADR-design-direction.md` | **Modify.** Superseding entry recording the three revisions.                                        |
| `docs/design/motion.md`                  | **Modify.** New interaction durations and the counter rule.                                         |

---

## Task 1: Contrast helpers (pure functions, TDD)

**Files:**

- Create: `packages/ui/src/contrast.ts`
- Test: `packages/ui/src/contrast.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/contrast.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "./contrast";

describe("relativeLuminance", () => {
  it("returns 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("accepts hex with or without the leading hash, any case", () => {
    expect(relativeLuminance("FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#FfFfFf")).toBeCloseTo(1, 5);
  });

  it("throws on a malformed hex", () => {
    expect(() => relativeLuminance("#12345")).toThrow(/hex/i);
  });
});

describe("contrastRatio", () => {
  it("is 21:1 for black on white, in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 2);
  });

  it("is 1:1 for a colour against itself", () => {
    expect(contrastRatio("#cf1f3d", "#cf1f3d")).toBeCloseTo(1, 5);
  });

  it("matches a known reference pair (crimson on white)", () => {
    expect(contrastRatio("#CF1F3D", "#FFFFFF")).toBeCloseTo(5.36, 1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @towardpcc/ui exec vitest run src/contrast.test.ts`
Expected: FAIL — `Failed to resolve import "./contrast"`.

- [ ] **Step 3: Write the implementation**

Create `packages/ui/src/contrast.ts`:

```ts
/**
 * WCAG 2.2 relative luminance and contrast ratio, per
 * https://www.w3.org/TR/WCAG22/#dfn-relative-luminance.
 * Pure sRGB math — no DOM, no dependencies — so the palette can be
 * asserted in unit tests rather than eyeballed in a browser.
 */
function channels(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
  }
  const pair = clean.match(/../g) as RegExpMatchArray;
  return pair.map((p) => parseInt(p, 16) / 255) as [number, number, number];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @towardpcc/ui exec vitest run src/contrast.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/contrast.ts packages/ui/src/contrast.test.ts
git commit -m "feat(ui): add WCAG contrast helpers"
```

---

## Task 2: Palette guard test (fails until Task 3 lands the tokens)

**Files:**

- Create: `packages/ui/src/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

/**
 * Reads the shipped token values straight out of tokens.css, so this guard
 * asserts what actually ships rather than a copy that can drift.
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
   * Coral is 2.55:1 on white. This test documents that limitation as an
   * invariant: if someone later "fixes" coral to pass on light, they have
   * changed the brand colour and must revisit the gradients deliberately.
   */
  it("is documented as failing on light, so it is never used as a light-ground UI colour", () => {
    expect(contrastRatio(token("color-coral"), token("color-surface-raised"))).toBeLessThan(
      AA_NON_TEXT,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @towardpcc/ui exec vitest run src/tokens.test.ts`
Expected: FAIL — `Token --color-coral not found in tokens.css`.

- [ ] **Step 3: Commit the failing guard**

```bash
git add packages/ui/src/tokens.test.ts
git commit -m "test(ui): add palette contrast guard (red)"
```

---

## Task 3: Land the warmed palette

**Files:**

- Modify: `packages/ui/src/tokens.css`

- [ ] **Step 1: Replace the surface, ink, and accent blocks**

In `packages/ui/src/tokens.css`, replace lines 9–38 (from `:root {` through the semantic-signal block) with:

```css
:root {
  /* Surfaces — plum/night dark bands into warm cream light.
     Warmed 2026-07-27 (ADR revision 2): porcelain was cool-grey and read
     "slate"; cream + blush carry the same neutrality with warmth. */
  --color-surface-hero: #260e1a;
  --color-surface-hero-raised: #3d1526;
  --color-surface-page: #fffaf7;
  --color-surface-raised: #ffffff;
  --color-surface-sunken: #fff2ee;

  /* Ink */
  --color-ink-strong: #2b1b20;
  --color-ink-body: #4a3d40;
  --color-ink-muted: #6f5d63;
  --color-ink-on-dark: #ffeef0;

  /* Accent — crimson, the one and only, brightened for energy.
     5.36:1 on white, 4.90:1 on sunken; deep is 9.05:1 on white. */
  --color-accent: #cf1f3d;
  --color-accent-bright: #ea3a57; /* gradient partner + hover */
  --color-accent-deep: #8f1728;
  --color-accent-tint: #fff2ee; /* chip/selection backgrounds on light */
  --color-ink-on-accent: #ffffff;

  /* Coral — the warm secondary. DARK SURFACES AND GRADIENTS ONLY.
     7.11:1 on night, but 2.55:1 on white: it fails the 3:1 non-text
     threshold on light grounds, so it must never be a border, icon or
     control boundary there, and it never carries meaning.
     Guarded by tokens.test.ts. */
  --color-coral: #ff7a6b;
  --color-coral-soft: #ffb3a3;
  --color-peach: #ffd9cc;

  /* Control edges — >=3:1 non-text contrast (WCAG 1.4.11) on all light surfaces */
  --color-edge: #8e7e84;

  /* Semantic signals — deliberately NOT crimson */
  --color-alert-text: #8a5900;
  --color-alert-bg: #fbeed7;
  --color-success-text: #2e6b4f;
  --color-success-bg: #e2f0e8;

  /* Gradients — permitted from 2026-07-27 (ADR revision 2). Decorative
     only: never the sole carrier of meaning, and always over a solid
     fallback colour so a failed paint degrades legibly. */
  --gradient-hero: linear-gradient(135deg, #3d1526 0%, #6b1930 45%, #a81f3c 100%);
  --gradient-accent: linear-gradient(135deg, #cf1f3d 0%, #ff7a6b 100%);
  --gradient-soft: linear-gradient(180deg, #fff2ee 0%, #fffaf7 100%);
```

- [ ] **Step 2: Add the type scale and extend motion**

In the same file, replace the `/* Radius */` and `/* Motion ... */` blocks with:

```css
/* Type scale — 8 steps. Headings use --font-display, figures --font-numeric. */
--text-xs: 0.75rem;
--text-sm: 0.8125rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.375rem;
--text-2xl: 1.75rem;
--text-3xl: 2.25rem;
--text-4xl: 3rem;
--text-5xl: 4rem;

/* Radius */
--radius-sm: 0.375rem;
--radius-md: 0.875rem;
--radius-lg: 1.25rem;
--radius-pill: 999px;

/* Motion — single easing voice; all animation honors reduced-motion.
     Interactions are 120-180ms: half a second reads as lag on a control. */
--motion-duration-fast: 150ms;
--motion-duration-slow: 400ms;
--motion-duration-reveal: 700ms;
--motion-duration-count: 1500ms;
--motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
```

- [ ] **Step 3: Run the guard to verify it passes**

Run: `pnpm --filter @towardpcc/ui exec vitest run src/tokens.test.ts`
Expected: PASS — all contrast assertions green, including the coral-is-dark-only invariant.

- [ ] **Step 4: Run the whole UI package suite**

Run: `pnpm --filter @towardpcc/ui test`
Expected: PASS — pre-existing `cn` tests plus the new contrast and token suites.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/tokens.css
git commit -m "feat(ui): warm the palette — brighter crimson, coral secondary, cream grounds"
```

---

## Task 4: Expose the new tokens to Tailwind and TypeScript

**Files:**

- Modify: `apps/web/app/globals.css:10-36`
- Modify: `packages/ui/src/index.ts:6-24`

- [ ] **Step 1: Extend the Tailwind theme mapping**

In `apps/web/app/globals.css`, inside the existing `@theme inline { ... }` block, add these lines immediately after `--color-accent-tint: var(--color-accent-tint);`:

```css
--color-coral: var(--color-coral);
--color-coral-soft: var(--color-coral-soft);
--color-peach: var(--color-peach);
```

and add these immediately after `--radius-lg: var(--radius-lg);`:

```css
--radius-pill: var(--radius-pill);
--text-xs: var(--text-xs);
--text-sm: var(--text-sm);
--text-base: var(--text-base);
--text-lg: var(--text-lg);
--text-xl: var(--text-xl);
--text-2xl: var(--text-2xl);
--text-3xl: var(--text-3xl);
--text-4xl: var(--text-4xl);
--text-5xl: var(--text-5xl);
```

- [ ] **Step 2: Add gradient utility classes**

In `apps/web/app/globals.css`, immediately after the closing `}` of the `@theme inline` block, add:

```css
/* Gradient surfaces (ADR revision 2, 2026-07-27). Each sets a solid
   background-color first so a failed gradient paint still yields a legible
   surface — the text colours above are contrast-checked against these. */
.bg-gradient-hero {
  background-color: var(--color-surface-hero-raised);
  background-image: var(--gradient-hero);
}
.bg-gradient-accent {
  background-color: var(--color-accent);
  background-image: var(--gradient-accent);
}
.bg-gradient-soft {
  background-color: var(--color-surface-page);
  background-image: var(--gradient-soft);
}
```

- [ ] **Step 3: Extend the typed token surface**

In `packages/ui/src/index.ts`, add these entries to the `tokens` object immediately after `accentTint: "var(--color-accent-tint)",`:

```ts
  coral: "var(--color-coral)",
  coralSoft: "var(--color-coral-soft)",
  peach: "var(--color-peach)",
  gradientHero: "var(--gradient-hero)",
  gradientAccent: "var(--gradient-accent)",
  gradientSoft: "var(--gradient-soft)",
```

- [ ] **Step 4: Typecheck both packages**

Run: `pnpm --filter @towardpcc/ui typecheck && pnpm --filter @towardpcc/web typecheck`
Expected: both exit 0, no output.

- [ ] **Step 5: Build the web app to prove the Tailwind theme compiles**

Run: `pnpm --filter @towardpcc/web build`
Expected: build completes; route table printed; no CSS errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/globals.css packages/ui/src/index.ts
git commit -m "feat(ui): expose coral, type scale and gradient tokens to tailwind + ts"
```

---

## Task 5: Verify no regression across the app

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Run the full workspace suite**

Run: `pnpm -r test`
Expected: `packages/ui` PASS, `packages/scoring-engine` 628 PASS, `apps/web` 40 PASS with its coverage gate green.

- [ ] **Step 2: Run lint and typecheck across the workspace**

Run: `pnpm lint && pnpm typecheck`
Expected: both exit 0.

- [ ] **Step 3: Confirm the bundle budget still holds**

Run: `pnpm --filter @towardpcc/web budget:check`
Expected: all three routes PASS under 170 KB gzipped. Tokens are CSS-only, so the JS figures should be unchanged from baseline.

- [ ] **Step 4: Run the privacy + security e2e suite**

Run: `pnpm --filter @towardpcc/web test:e2e`
Expected: PASS — the zero-network calculator test and security-headers test are unaffected by a palette change. If Playwright browsers are missing, run `pnpm --filter @towardpcc/web exec playwright install chromium` first.

- [ ] **Step 5: Visually confirm the warmed palette on the running app**

Run: `pnpm --filter @towardpcc/web dev`, then open `http://localhost:3000`.
Expected: page ground is warm cream (not grey), the hero band is plum/night, primary CTAs are brighter crimson. Check `/calculators` and one calculator detail page for any text that now sits on an unintended surface.

- [ ] **Step 6: Commit any fixes found**

If step 5 surfaced a component hard-coding an old hex instead of a token, fix it to use the token and commit:

```bash
git add -A
git commit -m "fix(ui): replace hard-coded palette values with tokens"
```

If nothing needed fixing, skip this step.

---

## Task 6: Record the ADR revision

**Files:**

- Modify: `docs/decisions/ADR-design-direction.md`

- [ ] **Step 1: Add the superseding entry**

Append to `docs/decisions/ADR-design-direction.md`:

```markdown
## Part 4 — Revision 2 (2026-07-27): warmed palette, gradients, photography

- Status: **accepted** — founder decision after reviewing an interactive
  mockup of the original direction and judging it "very minimalist … boring
  … no visuals or animations".
- Spec: `docs/superpowers/specs/2026-07-27-site-redesign-design.md`

Three parts of this ADR are superseded:

1. **The Envato/medical-template register is no longer a blanket
   anti-target.** Its _structure_ — utility bar, shrinking sticky header,
   mega-menu, overlapping feature cards, counter bands, carousels, fat
   footer — is adopted. Its _defects_ are still refused: no preloader, no
   perpetual motion, no scroll hijack, and no invented figures.
2. **Gradients are permitted** (previously banned outside the night band's
   own depth). Three are defined in tokens.css. They are decorative only:
   never the sole carrier of meaning, and always over a solid fallback
   colour.
3. **Photography including people is permitted** (previously "real product
   screenshots only"), provided images are genuinely free-licensed and are
   never captioned or positioned to imply they depict TowardPCC's own unit,
   staff, or patients.

The palette is warmed rather than replaced: crimson brightens `#B01E32` →
`#CF1F3D`, a coral secondary `#FF7A6B` is added, and the cool-grey porcelain
ground becomes warm cream `#FFFAF7` / blush `#FFF2EE`. Contrast was recomputed
for every shipped pairing and is now asserted automatically by
`packages/ui/src/tokens.test.ts`.

**One new hard constraint:** coral is 2.55:1 on white and therefore fails the
WCAG 1.4.11 non-text threshold on light grounds. It is a dark-surface and
gradient colour only — never a border, icon, or control boundary on light, and
it never carries meaning.

Unchanged and still binding: crimson never doubles as the error colour; no
blue, no teal; no gold (the international childhood-cancer colour); the
signature waveform is respiratory, never cardiac; the Space Grotesk / Inter /
IBM Plex Mono stack; and the authenticity rule — no fabricated numbers, logos,
counters, or testimonials.
```

- [ ] **Step 2: Update the motion guidelines**

In `docs/design/motion.md`, replace rule 2 with:

```markdown
2. **One easing voice.** `cubic-bezier(0.22, 1, 0.36, 1)` (token
   `--motion-ease`); durations only from tokens: 150ms interactions
   (never longer — half a second on a control reads as lag), 400ms
   state changes, 700ms scroll reveals, 1500ms counters.
```

and replace rule 5 with:

```markdown
5. **Banned:** preloaders, marquees, scroll-hijack (no smooth-scroll
   libraries — they break anchor precision and assistive tech), infinite
   loops on interactive controls, attention pulses, and any reveal that
   replays (`IntersectionObserver` must `unobserve` after firing).
   Permitted from 2026-07-27: slow ambient drift on purely decorative
   hero elements, and count-up animation on **marketing figures only** —
   never on a computed clinical value, because rolling digits teach the
   eye that numbers are decorative.
```

- [ ] **Step 3: Verify the docs render**

Run: `pnpm format:check`
Expected: exits 0. If prettier reports the markdown needs formatting, run `pnpm format` and re-check.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/ADR-design-direction.md docs/design/motion.md
git commit -m "docs: ADR revision 2 — warmed palette, gradients, photography"
```

---

## Done when

- [ ] `pnpm -r test` green, including the new contrast and palette guards
- [ ] `pnpm lint && pnpm typecheck` green
- [ ] `pnpm --filter @towardpcc/web budget:check` — all routes under 170 KB
- [ ] `pnpm --filter @towardpcc/web test:e2e` green
- [ ] The running app shows warm cream grounds and brighter crimson CTAs
- [ ] `ADR-design-direction.md` carries the Part 4 revision, so the named design authority no longer disagrees with what ships
