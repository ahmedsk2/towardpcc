# P1 — Depth system (borders + elevation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site's existing card and section structure visible, by replacing a border colour that renders at 1.056:1 with a three-tier token system, adding branded elevation tokens, and rewriting the contrast guard so it enumerates instead of listing pairings by hand.

**Architecture:** Token values live only in `packages/ui/src/tokens.css`; `apps/web/app/globals.css` maps them into Tailwind v4 via self-referential `@theme inline` passthroughs. Two guards: an enumerating contrast test in `packages/ui` (values), and a source-scan test in `apps/web` (usage). Then a mechanical sweep of 38 call sites grouped by what each border actually is.

**Tech Stack:** Tailwind v4 (no config file — `@theme inline` in CSS), vitest, TypeScript 5.9 strict.

**Spec:** `docs/superpowers/specs/2026-07-27-site-polish-design.md` §2.1

---

## Why the current guard passed

`packages/ui/src/tokens.test.ts` asserts `--color-edge` clears 3:1 as a border. It does (3.51–3.84). But the code shipped `border-surface-sunken` in 38 places, which is **1.056:1** on the page. The guard tested a token the code was not using, so a hand-maintained list of pairings passed while the actual UI was invisible.

Enumeration is the fix: derive the pairings from the tokens that exist, not from a list someone remembered to update.

## Threshold policy (read before Task 2)

WCAG 1.4.11's 3:1 governs boundaries that **identify a control or its state**. A decorative card edge is not one, and forcing every hairline to 3:1 produces a visibly heavy page. So thresholds are per tier:

| Tier    | Token                   | Floor | Ceiling            | Rationale                                       |
| ------- | ----------------------- | ----- | ------------------ | ----------------------------------------------- |
| control | `--color-border-strong` | ≥ 3.0 | —                  | WCAG 1.4.11 applies                             |
| card    | `--color-border`        | ≥ 1.6 | < 3.0              | must read as a line, must not read as a control |
| inner   | `--color-border-subtle` | ≥ 1.3 | < `--color-border` | quieter than a card edge, still perceivable     |

The ceilings matter as much as the floors: without them, a future edit could push `--color-border-subtle` past `--color-border` and invert the hierarchy while both still "pass".

## File structure

| File                                    | Responsibility                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/ui/src/tokens.css`            | **Modify.** Add 3 border + 3 shadow tokens; delete `--color-edge` (Task 8).                     |
| `apps/web/app/globals.css`              | **Modify.** Add 6 `@theme inline` passthroughs; delete the `--color-edge` passthrough (Task 8). |
| `packages/ui/src/tokens.test.ts`        | **Modify.** Replace the hand-listed border assertions with enumeration.                         |
| `apps/web/content/border-usage.test.ts` | **Create.** Source scan asserting the dead token names are gone.                                |
| 19 component/page files                 | **Modify.** The 38-site sweep, Tasks 4–7.                                                       |

The usage scan lives in `apps/web`, not `packages/ui`. `tokens.test.ts` reads only its sibling `tokens.css` and has no precedent for reaching into `../../../apps/web` — a package should not assert on an app that consumes it. `apps/web/content/privacy-invariant.test.ts` already establishes the source-scan pattern on the app side.

---

### Task 1: Add the border and elevation tokens

**Files:**

- Modify: `packages/ui/src/tokens.css:44`
- Modify: `apps/web/app/globals.css:28`
- Test: `packages/ui/src/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `packages/ui/src/tokens.test.ts`:

```ts
describe("palette — border tiers exist and are ordered", () => {
  it("declares all three border tiers", () => {
    expect(() => token("color-border-subtle")).not.toThrow();
    expect(() => token("color-border")).not.toThrow();
    expect(() => token("color-border-strong")).not.toThrow();
  });

  it("orders the tiers: subtle is quieter than card, card is quieter than control", () => {
    const page = token("color-surface-page");
    const subtle = contrastRatio(token("color-border-subtle"), page);
    const card = contrastRatio(token("color-border"), page);
    const strong = contrastRatio(token("color-border-strong"), page);
    expect(subtle).toBeLessThan(card);
    expect(card).toBeLessThan(strong);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @towardpcc/ui test`
Expected: FAIL — `Token --color-border-subtle not found in tokens.css`

- [ ] **Step 3: Add the tokens**

In `packages/ui/src/tokens.css`, replace the `--color-edge` block (lines 42–44):

```css
/* Control edges — >=3:1 non-text contrast on every light surface
     (3.84 raised / 3.71 page / 3.51 sunken) */
--color-edge: #8e7e84;
```

with:

```css
/* Borders, three tiers by intent. WCAG 1.4.11's 3:1 governs boundaries that
     identify a CONTROL or its state — decorative card edges are not that, and
     forcing them to 3:1 produces a visibly heavy page. Ratios below are
     page / raised / sunken, asserted by tokens.test.ts.

     The previous single token (--color-edge) is kept until the sweep lands;
     it must be deleted from tokens.css AND globals.css in the same commit,
     or `border-edge` resolves to an unset var and falls back to currentColor. */
--color-border-subtle: #e7cfc7; /* 1.43 / 1.48 / 1.36 — rules inside a card */
--color-border: #d8b8ae; /* 1.78 / 1.84 / 1.69 — card edges, dividers */
--color-border-strong: #8e7e84; /* 3.71 / 3.84 / 3.51 — control boundaries */
--color-edge: #8e7e84; /* deprecated alias, removed in Task 8 */

/* Elevation — warm-tinted from the plum ground (#3d1526), never neutral
     grey, so shadows sit in the palette instead of muddying it. Declaring
     --shadow-sm/md/lg OVERRIDES Tailwind v4's stock neutral defaults for
     those three names; any other stock name (shadow-2xl) still resolves grey. */
--shadow-sm: 0 1px 2px rgba(61, 21, 38, 0.06), 0 1px 3px rgba(61, 21, 38, 0.04);
--shadow-md: 0 4px 12px -2px rgba(61, 21, 38, 0.1), 0 2px 6px -2px rgba(61, 21, 38, 0.06);
--shadow-lg: 0 18px 40px -12px rgba(61, 21, 38, 0.18), 0 6px 14px -6px rgba(61, 21, 38, 0.08);
```

- [ ] **Step 4: Map them into Tailwind**

In `apps/web/app/globals.css`, replace line 28 (`  --color-edge: var(--color-edge);`) with:

```css
--color-edge: var(--color-edge);
--color-border-subtle: var(--color-border-subtle);
--color-border: var(--color-border);
--color-border-strong: var(--color-border-strong);
--shadow-sm: var(--shadow-sm);
--shadow-md: var(--shadow-md);
--shadow-lg: var(--shadow-lg);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @towardpcc/ui test`
Expected: PASS, including the two new tests.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/tokens.css packages/ui/src/tokens.test.ts apps/web/app/globals.css && git commit -m "feat(ui): add three-tier border tokens and warm elevation tokens"
```

---

### Task 2: Rewrite the contrast guard to enumerate

**Files:**

- Modify: `packages/ui/src/tokens.test.ts:47-59` (the non-text block)

The current block hard-codes one token name and a literal 3-surface list. Replace it with enumeration over what `tokens.css` actually declares.

**Three constraints the rewrite must respect** — each one breaks a naive cross-product:

1. **Light and dark surfaces must be partitioned.** `--color-border-strong` vs `--color-surface-hero` is a dark-on-dark pairing that will never clear 3:1 and is never used.
2. **Per-tier thresholds.** `--color-border-subtle` (1.36) and `--color-border` (1.69) are deliberately below 3:1. A uniform `>= 3` assertion fails by design.
3. **Coral's inverted assertion must stay out of the loop.** `tokens.test.ts` deliberately asserts coral _fails_ on light (`toBeLessThan`). Sweeping it into a generic "every colour × every surface" loop turns a pinned limitation into a false positive.

- [ ] **Step 1: Write the failing test**

Replace lines 47–59 of `packages/ui/src/tokens.test.ts` with:

```ts
/** Light grounds only. Border tokens are never painted on the dark bands —
 *  those use the on-dark border idioms (border-white/20 etc.). */
const LIGHT_SURFACES = ["color-surface-page", "color-surface-raised", "color-surface-sunken"];

/**
 * Per-tier thresholds. Floors keep a border perceivable; ceilings keep the
 * hierarchy from inverting — without them a future edit could make `subtle`
 * heavier than `border` and both would still "pass".
 */
const BORDER_TIERS: Record<string, { min: number; max: number }> = {
  "color-border-subtle": { min: 1.3, max: 1.75 },
  "color-border": { min: 1.6, max: 3.0 },
  "color-border-strong": { min: AA_NON_TEXT, max: 21 },
};

describe("palette — non-text UI contrast (WCAG 1.4.11)", () => {
  /**
   * Enumerated from tokens.css rather than hand-listed. The previous version
   * of this block asserted --color-edge and passed, while the code shipped
   * border-surface-sunken (1.056:1) in 38 places — a guard that tested a token
   * the UI was not using. Anything matching --color-border* is now covered by
   * construction, so a new tier cannot be added without a threshold decision.
   */
  const declared = [...css.matchAll(/--(color-border[a-z-]*):\s*#[0-9a-fA-F]{6}/g)].map(
    (m) => m[1]!,
  );

  it("finds every declared border token", () => {
    expect(declared.length).toBeGreaterThan(0);
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

  it("accent clears 3:1 as a control boundary on light", () => {
    expect(
      contrastRatio(token("color-accent"), token("color-surface-page")),
    ).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm --filter @towardpcc/ui test`
Expected: PASS. The `declared` set is `{color-border-subtle, color-border, color-border-strong}` — note `--color-edge` does **not** match `color-border*`, so the deprecated alias is correctly ignored.

- [ ] **Step 3: Prove the guard actually catches the original bug**

Temporarily add `--color-border-oops: #fff2ee;` to `tokens.css`, re-run.
Expected: FAIL on `finds every declared border token` (unknown tier) — the guard refuses an untiered token rather than silently skipping it.
Remove the line before continuing.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/tokens.test.ts && git commit -m "test(ui): enumerate border tokens in the contrast guard instead of listing pairings"
```

---

### Task 3: Guard the usage, not just the values

A value guard cannot catch `border-surface-sunken` — `--color-surface-sunken` is a legitimate token, correct as a _fill_. The defect is using a fill colour as a border. That is a usage question, so it needs a source scan.

**Files:**

- Create: `apps/web/content/border-usage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Usage guard, complementing the value guard in packages/ui/src/tokens.test.ts.
 *
 * --color-surface-sunken is a valid token and a correct FILL. Painted as a
 * border it is 1.056:1 against the page — invisible. It shipped that way in 38
 * places because the value guard asserted --color-edge, a token the UI was not
 * using. This asserts the surface tokens are never used as boundary colours.
 *
 * divide-* and ring-* are included deliberately: they are border-adjacent
 * utilities drawing the same kind of line, and a scan for `border-` alone
 * would miss `divide-surface-sunken`, which shipped with exactly this bug.
 */
const ROOTS = ["app", "components"].map((d) => join(import.meta.dirname, "..", d));
const BANNED = /\b(?:border|divide|ring)-surface-(?:sunken|page|raised)\b/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("border usage", () => {
  const files = ROOTS.flatMap(sources);

  it("scans a meaningful number of files", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it("never paints a surface token as a border, divider, or ring", () => {
    const offenders = files.flatMap((file) => {
      const hits = readFileSync(file, "utf8").match(BANNED) ?? [];
      return hits.map((hit) => `${file.replace(/.*[\\/]apps[\\/]web[\\/]/, "")}: ${hit}`);
    });
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @towardpcc/web test -- border-usage`
Expected: FAIL, listing 38 `border-surface-sunken` offenders plus 1 `divide-surface-sunken`.

Record the count — it is the checklist for Tasks 4–7.

- [ ] **Step 3: Commit the failing guard**

Commit it now, red, so the sweep has a target that proves completion.

```bash
git add apps/web/content/border-usage.test.ts && git commit -m "test(web): add a failing guard for surface tokens used as borders"
```

---

### Task 4: Sweep the card edges (18 sites) → `border-border`

Mechanical: `border-surface-sunken` → `border-border` at each site below. Do not change any other class.

- [ ] **Step 1: Apply**

| #   | File                                                         | Line | What it is                                                                                                  |
| --- | ------------------------------------------------------------ | ---- | ----------------------------------------------------------------------------------------------------------- |
| 1   | `packages/ui/src/card.tsx`                                   | 7    | the `Card` primitive — highest leverage                                                                     |
| 2   | `apps/web/app/calculators/[slug]/page.tsx`                   | 155  | related-score link card                                                                                     |
| 3   | `apps/web/app/calculators/calculators-index.tsx`             | 126  | calculator link card                                                                                        |
| 4   | `apps/web/app/about/page.tsx`                                | 109  | principle card                                                                                              |
| 5   | `apps/web/app/about/page.tsx`                                | 146  | brand-story card                                                                                            |
| 6   | `apps/web/app/about/page.tsx`                                | 172  | roadmap column                                                                                              |
| 7   | `apps/web/app/page.tsx`                                      | 165  | home feature-strip card                                                                                     |
| 8   | `apps/web/app/page.tsx`                                      | 310  | pillar link card                                                                                            |
| 9   | `apps/web/components/pillar/pillar-page.tsx`                 | 90   | stat card                                                                                                   |
| 10  | `apps/web/components/home/evidence-carousel.tsx`             | 37   | evidence quote card                                                                                         |
| 11  | `apps/web/components/calculator/calculator-form.tsx`         | 333  | sticky result `<aside>`                                                                                     |
| 12  | `apps/web/components/pwa/service-worker.tsx`                 | 81   | update toast                                                                                                |
| 13  | `apps/web/components/nav/main-nav.tsx`                       | 147  | mega-menu panel                                                                                             |
| 14  | `apps/web/app/admin/(protected)/calculators/page.tsx`        | 24   | table shell                                                                                                 |
| 15  | `apps/web/app/admin/(protected)/page.tsx`                    | 58   | inbox table shell                                                                                           |
| 16  | `apps/web/app/legal/data-protection/page.tsx`                | 34   | collection table shell                                                                                      |
| 17  | `apps/web/app/admin/(protected)/submissions/[id]/page.tsx`   | 50   | payload `<dl>` — **card edge only**; its `divide-y divide-surface-sunken` on the same line is Task 6        |
| 18  | `apps/web/app/admin/(protected)/calculators/[slug]/page.tsx` | 46   | validator `<fieldset>` — a grouping container, not a control; its child inputs already use the control tier |

- [ ] **Step 2: Verify**

Run: `pnpm --filter @towardpcc/web test -- border-usage`
Expected: still FAIL, but offenders down from 39 to 21.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(web): make card edges visible — 18 sites to the card border tier"
```

---

### Task 5: Sweep the section dividers (5 sites) → `border-border`

- [ ] **Step 1: Apply**

| #   | File                                             | Line | What it is                  |
| --- | ------------------------------------------------ | ---- | --------------------------- |
| 19  | `apps/web/app/calculators/[slug]/page.tsx`       | 65   | formula section rule        |
| 20  | `apps/web/app/calculators/[slug]/page.tsx`       | 146  | related-scores section rule |
| 21  | `apps/web/app/calculators/[slug]/page.tsx`       | 173  | disclaimer section rule     |
| 22  | `apps/web/components/forms/pillar-form-page.tsx` | 50   | form section rule           |
| 23  | `apps/web/app/admin/(protected)/layout.tsx`      | 12   | admin header rule           |

- [ ] **Step 2: Verify** — Run: `pnpm --filter @towardpcc/web test -- border-usage`. Offenders: 21 → 16.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(web): make section dividers visible — 5 sites to the card border tier"
```

---

### Task 6: Sweep the inner rules (10 sites + the divider) → `border-border-subtle`

Alpha modifiers carry over unchanged: `border-surface-sunken/60` → `border-border-subtle/60`.

- [ ] **Step 1: Apply**

| #   | File                                                       | Line | Replacement                                                                                                                |
| --- | ---------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 24  | `apps/web/app/admin/(protected)/calculators/page.tsx`      | 26   | `border-border-subtle` (`<thead>`)                                                                                         |
| 25  | `apps/web/app/admin/(protected)/calculators/page.tsx`      | 48   | `border-border-subtle/60` (row)                                                                                            |
| 26  | `apps/web/app/admin/(protected)/page.tsx`                  | 60   | `border-border-subtle`                                                                                                     |
| 27  | `apps/web/app/admin/(protected)/page.tsx`                  | 78   | `border-border-subtle/60`                                                                                                  |
| 28  | `apps/web/app/legal/data-protection/page.tsx`              | 36   | `border-border-subtle`                                                                                                     |
| 29  | `apps/web/app/legal/data-protection/page.tsx`              | 49   | `border-border-subtle/60`                                                                                                  |
| 30  | `apps/web/components/home/evidence-carousel.tsx`           | 45   | `border-border-subtle` (`<cite>` rule)                                                                                     |
| 31  | `apps/web/components/nav/main-nav.tsx`                     | 149  | `border-border-subtle` (mega-menu header rule)                                                                             |
| 32  | `apps/web/components/calculator/calculator-form.tsx`       | 352  | `border-border-subtle` (multi-value separator)                                                                             |
| 33  | `apps/web/components/calculator/validation-badge.tsx`      | 35   | `border-border-subtle` — note this pairs with a `bg-surface-sunken/40` fill, so it was invisible-on-tinted, the worst case |
| 34  | `apps/web/app/admin/(protected)/submissions/[id]/page.tsx` | 50   | `divide-surface-sunken` → `divide-border-subtle` — **the only `divide-*` colour in the codebase**                          |

- [ ] **Step 2: Verify** — Run: `pnpm --filter @towardpcc/web test -- border-usage`. Offenders: 16 → 5.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix(web): make inner rules visible — 10 sites plus the table divider to the subtle tier"
```

---

### Task 7: Sweep the control boundaries (5 sites) → `border-border-strong`

These carry state or identify a control, so WCAG 1.4.11's 3:1 applies.

- [ ] **Step 1: Apply**

| #   | File                                             | Line | Why control tier                                                                                                                                                                                                          |
| --- | ------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 35  | `packages/ui/src/accordion.tsx`                  | 37   | border **carries open/closed state** (swaps to `border-accent`)                                                                                                                                                           |
| 36  | `apps/web/app/calculators/calculators-index.tsx` | 159  | favourite toggle, `aria-pressed`                                                                                                                                                                                          |
| 37  | `apps/web/app/calculators/calculators-index.tsx` | 202  | filter chip, `aria-pressed`                                                                                                                                                                                               |
| 38  | `apps/web/app/admin/(protected)/page.tsx`        | 119  | filter tab, `aria-current`                                                                                                                                                                                                |
| 39  | `apps/web/components/pillar/pillar-page.tsx`     | 169  | topic pill — **control-shaped but inert** (plain `<li>`, no href or handler). 1.4.11 does not apply, but it sits beside real chips and a different tier would read as a bug. Use the control tier for visual consistency. |

- [ ] **Step 2: Fix the Button primitive while here**

`packages/ui/src/button.tsx:22` uses `border-ink-muted/40` for the secondary variant — a control boundary not on the control tier, and the second-most load-bearing inconsistency after `Card`. Change `border-ink-muted/40` → `border-border-strong` and `hover:border-ink-strong/60` → `hover:border-accent`.

Same at `apps/web/components/calculator/calculator-form.tsx:392` (copy-result button): `border-ink-muted/40` → `border-border-strong`.

- [ ] **Step 3: Verify the guard is finally green**

Run: `pnpm --filter @towardpcc/web test -- border-usage`
Expected: PASS — zero offenders.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix(web): put control boundaries on the 3:1 border tier"
```

---

### Task 8: Retire `--color-edge`

**Both deletions must land in one commit.** If the `:root` value goes but the `@theme` passthrough stays, `border-edge` still generates `border-color: var(--color-edge)` with nothing to resolve. CSS treats that as invalid-at-computed-value-time and falls back to `currentColor` — **every input on the site would outline in ink**.

- [ ] **Step 1: Rename all 16 usages**

`border-edge` → `border-border-strong` in: `packages/ui/src/field.tsx:22`; `apps/web/app/calculators/calculators-index.tsx:69`; `apps/web/components/forms/submission-form.tsx:141`; `apps/web/app/admin/login/login-form.tsx:8`; `apps/web/app/admin/(protected)/calculators/[slug]/page.tsx:14`; `apps/web/components/calculator/calculator-form.tsx:236,243,262,280`; `apps/web/app/admin/(protected)/submissions/[id]/page.tsx:84,108,112`; `apps/web/app/admin/(protected)/layout.tsx:39`; `apps/web/components/nav/main-nav.tsx:214,242`; `apps/web/components/home/evidence-carousel.tsx:93` (`border-2 border-edge`).

One exception — `apps/web/app/page.tsx:333` is a decorative dashed rule using the control tier. Demote it to `border-border-subtle`.

Update the comment at `packages/ui/src/field.tsx:21` to name the new token.

- [ ] **Step 2: Delete the token from both files, together**

Remove `--color-edge: #8e7e84;` and its `deprecated alias` comment from `packages/ui/src/tokens.css`, and `--color-edge: var(--color-edge);` from `apps/web/app/globals.css`.

- [ ] **Step 3: Prove nothing references it**

```bash
grep -rn "color-edge\|border-edge" apps packages --include=*.tsx --include=*.ts --include=*.css | grep -v node_modules
```

Expected: no output.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @towardpcc/ui test && pnpm --filter @towardpcc/web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor(ui): retire --color-edge in favour of the named border tiers"
```

---

### Task 9: Apply elevation to the calculator pages

Every element on a calculator page currently computes `box-shadow: none`. This is the other half of why they read as flat.

- [ ] **Step 1: Give the result panel real elevation**

`apps/web/components/calculator/calculator-form.tsx:333` — the `<aside>`. Add `shadow-md` to the existing classes.

- [ ] **Step 2: Replace the faked hairline**

`apps/web/components/nav/sticky-shell.tsx:32` uses `shadow-[0_1px_0_var(--color-surface-sunken)]` — a border drawn as a shadow, in the invisible colour. Change to `shadow-[0_1px_0_var(--color-border)]`.

- [ ] **Step 3: Replace the two unbranded stock shadows**

`apps/web/components/pwa/service-worker.tsx:81` already says `shadow-md`, which now resolves to the warm token automatically — no edit needed, but confirm visually.

`apps/web/components/nav/main-nav.tsx:233` uses `shadow-2xl`, which is **not** overridden by our tokens and still resolves to Tailwind's stock neutral grey. Replace with `shadow-lg`.

- [ ] **Step 4: Verify no other stock shadow names survive**

```bash
grep -rn "shadow-\(xs\|sm\|md\|lg\|xl\|2xl\|inner\)" apps/web packages/ui --include=*.tsx | grep -v node_modules
```

Every hit must be `shadow-sm`, `shadow-md`, or `shadow-lg`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix(web): give the calculator result panel and chrome real elevation"
```

---

### Task 10: Verify the whole slice

- [ ] **Step 1: Full suite**

Run: `pnpm test`
Expected: PASS. 697 unit tests plus the two new guards.

- [ ] **Step 2: Build and check the bundle budget**

Run: `pnpm --filter @towardpcc/web build`
Expected: build succeeds, home route stays within 170 KB gzipped. This slice adds only CSS, so the JS budget should be unchanged.

- [ ] **Step 3: e2e**

Run: `pnpm --filter @towardpcc/web e2e`
Expected: the 40-assertion layout suite passes — no horizontal scroll at 375/768/1440 across 11 pages.

- [ ] **Step 4: Look at it**

Start the preview and check `/calculators/pf-ratio` and `/data`. The cards and section rules should now read as structure. If any border looks _heavy_, it is on the wrong tier — check it against the classification in Tasks 4–7 rather than tweaking the token value, which would move all 38 sites.

- [ ] **Step 5: Confirm the guard would have caught the original bug**

Temporarily reintroduce `border-surface-sunken` in one file and run `pnpm --filter @towardpcc/web test -- border-usage`. It must fail, naming the file. Revert.

---

## Self-review

**Spec coverage:** §2.1 asks for three border tiers (Task 1), warm elevation (Task 1), an enumerating guard (Task 2), the 38-site sweep (Tasks 4–7), and `--color-edge` retired (Task 8). All covered.

**One deliberate deviation from the spec:** the spec put the "`border-surface-sunken` appears zero times" assertion inside `packages/ui/src/tokens.test.ts`. That file reads only its sibling `tokens.css`, and a package asserting on a consuming app is the wrong direction. The scan lives in `apps/web/content/border-usage.test.ts` instead, following the existing `privacy-invariant.test.ts` pattern. It is also broadened to `divide-*` and `ring-*`, which caught a real second instance the spec had missed.

**Type consistency:** token names are identical across `tokens.css`, `globals.css`, `BORDER_TIERS`, and every sweep table.

**Counts:** 18 card + 5 section + 10 inner + 5 control = 38, matching the measured total; plus 1 `divide-*` = 39 guard offenders.
