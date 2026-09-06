# Design Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** executed 2026-09-06/07 — A #180, B #179, C #181, D #182, E the docs PR carrying this file. Two deviations recorded in LAUNCH-BLOCKERS.md (the header CTA wrapper; the ⓘ anchored to the label row).

**Goal:** Ship the 2026-09-06 design revision — one pill button family with a
gradient primary, the generated-looking marks removed, a card toolkit for
`/calculators`, and a calculator page whose field guidance sits behind an ⓘ —
without touching palette, type, a formula, or a privacy invariant.

**Architecture:** Five PRs by risk, each independently deployable: (A) the
button family and the marks, site-wide; (B) scoring-engine text — a
`tagline` per score and seven condensed help texts, founder-reviewed; (C) the
catalogue; (D) the calculator page; (E) the session's markdown in one PR.
Everything is CSS plus a few hundred bytes of client state; no library is
added (11–14 KB of route headroom).

**Tech Stack:** Next.js 16 app router, React, Tailwind v4 (`@theme inline`
tokens from `packages/ui/src/tokens.css`), Vitest, Playwright. Spec:
`docs/superpowers/specs/2026-09-06-design-revision-design.md`.

**Standing rules for every task (from the root and `apps/web` CLAUDE.md):**

- Branch before touching `main`. Never `git add .` — name the files. The
  untracked spec and plan under `docs/superpowers/` stay out of PRs A–D; they
  land in PR E.
- Never write a raw hex in a component; route everything through the token
  names. Never paint a `surface-*` token as a border. One focus idiom:
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`
  (`outline-coral` on dark grounds).
- `transition: all` is banned; name the properties. Tailwind v4 compiles
  `scale-*`, `translate-*` and `rotate-*` to the `scale` / `translate` /
  `rotate` properties, so a transition must name those — `transition-transform`
  transitions nothing here.
- `hover:` fires on touch (`@custom-variant hover`), so every hover state has
  a `focus-visible` or `focus-within` twin and nothing is hover-only.
- Motion: `transform`/`opacity`/colour only; tokens only; static under
  `prefers-reduced-motion`. The calculator's inputs, computed number, band
  scale and composition bars do not move.
- Before the gate: `pnpm lint --fix` then `pnpm format`. Then
  `pnpm gate > "$TEMP/gate.log" 2>&1; echo $?` and read the log.
- No file under `app/calculators/**` or `components/calculator/**` may contain
  the text `useSearchParams`, `searchParams` or `"use server"` — the TM-001
  scan reads comments too.
- Every numeric input keeps `onWheel={(e) => e.currentTarget.blur()}`.
- Commits: Conventional Commits, lowercase subject, header ≤ 100 chars, body
  lines ≤ 100 chars, ending `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| PR  | Create                                                                                                                                                    | Modify                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `packages/ui/src/button.test.ts`, `apps/web/content/button-idiom.test.ts`                                                                                 | `packages/ui/src/tokens.css`, `apps/web/app/globals.css`, `packages/ui/src/button.tsx`, `apps/web/content/site.ts`, `apps/web/content/figures.test.ts`, `apps/web/app/(site)/home/page.tsx`, `apps/web/components/page-hero.tsx`, `apps/web/components/pillar/pillar-page.tsx`, `apps/web/components/nav/main-nav.tsx`, `apps/web/components/nav/breadcrumbs.tsx`, the other button call sites listed in Task A8 |
| B   | `packages/scoring-engine/src/scores/registry-text.test.ts`                                                                                                | `packages/scoring-engine/src/types.ts`, `packages/scoring-engine/src/scores/registry.ts`, `packages/scoring-engine/src/testing/fixture-score.ts`, all 25 `packages/scoring-engine/src/scores/*.ts`, `apps/web/lib/calculator-search.ts`                                                                                                                                                                          |
| C   | —                                                                                                                                                         | `apps/web/app/(site)/calculators/page.tsx`, `apps/web/app/(site)/calculators/calculators-index.tsx`, `apps/web/e2e/calculator-catalogue.spec.ts`                                                                                                                                                                                                                                                                 |
| D   | `apps/web/components/calculator/field-help.tsx`, `apps/web/lib/formula-lines.ts`, `apps/web/lib/formula-lines.test.ts`, `apps/web/e2e/field-help.spec.ts` | `apps/web/components/calculator/calculator-form.tsx`, `apps/web/components/calculator/score-meta.tsx`, `apps/web/components/calculator/score-tabs.tsx`, `apps/web/app/(site)/calculators/[slug]/page.tsx`, `apps/web/content/site.ts`, `apps/web/e2e/reciprocal-unit-hint.spec.ts`, `apps/web/e2e/composition.spec.ts`                                                                                           |
| E   | —                                                                                                                                                         | `docs/design/motion.md`, `docs/decisions/ADR-design-direction.md`, `LAUNCH-BLOCKERS.md`, `apps/web/CLAUDE.md`, plus the spec and this plan                                                                                                                                                                                                                                                                       |

---

# PR A — one button family, and the marks

Branch: `design/buttons-and-marks`.

### Task A1: the CTA gradient token

**Files:**

- Modify: `packages/ui/src/tokens.css` (the `/* Gradients — permitted from 2026-07-27 … */` block, three `--gradient-*` lines)
- Modify: `apps/web/app/globals.css` (after `.bg-gradient-soft { … }`)

- [ ] **Step 1: Add the token.** In `tokens.css`, directly under `--gradient-soft`, add:

```css
/* THE BUTTON FILL, bounded to the contrast-cleared crimsons (2026-09-06).
     White text needs 4.5:1 at 15px: accent is 5.36:1, accent-deep 9.05:1,
     and accent-bright (#ea3a57) only 4.01:1, so the run is accent -> deep and
     never reaches bright or coral. --gradient-accent stays a SURFACE gradient
     (bands, rules) and is never a button fill. The hover "slide" is a
     background-position shift over a 160%-wide paint of this same pair. */
--gradient-cta: linear-gradient(120deg, var(--color-accent) 0%, var(--color-accent-deep) 100%);
```

- [ ] **Step 2: Add the class.** In `globals.css`, after `.bg-gradient-soft { … }`:

```css
.bg-gradient-cta {
  background-color: var(--color-accent);
  background-image: var(--gradient-cta);
}
```

- [ ] **Step 3: Run the token guard.** `pnpm --filter @towardpcc/ui test > "$TEMP/ui.log" 2>&1; echo $?; tail -5 "$TEMP/ui.log"`. Expected: exit 0. If `tokens.test.ts` enumerates gradient tokens and fails on the new one, read its assertion and add `--gradient-cta` to the list it maintains — the test exists to make someone decide the pairing, and the pairing is stated in the comment above.

- [ ] **Step 4: Commit.**

```bash
git add packages/ui/src/tokens.css apps/web/app/globals.css
git commit -m "feat(ui): a cta gradient bounded to the contrast-cleared crimsons"
```

### Task A2: rewrite `button.tsx` as the one family

**Files:**

- Modify: `packages/ui/src/button.tsx` (whole file)
- Create: `packages/ui/src/button.test.ts`

- [ ] **Step 1: Write the failing test.** Create `packages/ui/src/button.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buttonClasses } from "./button";

describe("buttonClasses — one family", () => {
  it("is pill-shaped in every variant and size", () => {
    for (const variant of [
      "primary",
      "secondary",
      "quiet",
      "icon",
      "on-dark",
      "ghost-dark",
    ] as const) {
      for (const size of ["lg", "md", "sm"] as const) {
        const cls = buttonClasses({ variant, size });
        expect(cls).toContain("rounded-pill");
        expect(cls).not.toMatch(/rounded-(md|lg|full)\b/);
      }
    }
  });

  it("paints the primary with the bounded gradient, never accent-bright", () => {
    const cls = buttonClasses({ variant: "primary" });
    expect(cls).toContain("bg-gradient-cta");
    expect(cls).not.toContain("accent-bright");
  });

  it("names the properties it transitions and never 'all'", () => {
    const cls = buttonClasses();
    expect(cls).toMatch(/transition-\[[^\]]*translate[^\]]*\]/);
    expect(cls).not.toContain("transition-all");
  });

  it("keeps the 44px floor at md and the 48px hero size at lg", () => {
    expect(buttonClasses({ size: "md" })).toContain("min-h-11");
    expect(buttonClasses({ size: "lg" })).toContain("min-h-12");
  });

  it("uses the coral focus outline on dark variants and accent elsewhere", () => {
    expect(buttonClasses({ variant: "on-dark" })).toContain("focus-visible:outline-coral");
    expect(buttonClasses({ variant: "ghost-dark" })).toContain("focus-visible:outline-coral");
    expect(buttonClasses({ variant: "primary" })).toContain("focus-visible:outline-accent");
    expect(buttonClasses({ variant: "primary" })).not.toContain("outline-coral");
  });
});
```

- [ ] **Step 2: Run it to see it fail.** `pnpm --filter @towardpcc/ui test button > "$TEMP/ui.log" 2>&1; echo $?; grep -E "✓|×|FAIL|passed|failed" "$TEMP/ui.log" | tail -8`. Expected: failures on `rounded-pill`, `bg-gradient-cta`, `lg`.

- [ ] **Step 3: Replace `button.tsx` with:**

```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * THE ONE BUTTON FAMILY (2026-09-06).
 *
 * Until this revision the site ran three idioms — marketing pills, square
 * outlined form buttons and underlined text resets — each with its own hover,
 * press and focus recipe. Every button and button-shaped link now takes its
 * classes from here, and `content/button-idiom.test.ts` fails the suite if the
 * primary fill is written anywhere else.
 *
 * Shape is pill in every variant. Inputs and cards stay soft-rectangle, so a
 * control you type into looks different from one you press.
 *
 * The primary fill is `--gradient-cta`, bounded to accent -> accent-deep
 * (white text 5.36:1 and 9.05:1). Hover slides the paint to its deeper end —
 * a `background-position` shift over a 160%-wide paint — adds the accent
 * glow and lifts 1px. Never `accent-bright`: white on it is 4.01:1.
 *
 * `translate` is named in the transition because the lift and the press are
 * `translate` utilities, which Tailwind v4 compiles to the `translate`
 * property; `background-position` because of the slide. Naming six
 * properties is still not `transition: all`.
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "icon" | "on-dark" | "ghost-dark";
export type ButtonSize = "lg" | "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the single most important action — once per screen. */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  "group/btn inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold " +
  "select-none transition-[color,background-color,background-position,border-color,box-shadow,translate] " +
  "duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-cta [background-size:160%_100%] [background-position:0%_0%] text-ink-on-accent " +
    "hover:[background-position:100%_0%] hover:shadow-[var(--shadow-accent)] motion-safe:hover:-translate-y-px " +
    "focus-visible:outline-accent",
  // A button outline identifies a control, so it takes the 3:1 tier (WCAG
  // 1.4.11). The border carries the state and moves to full accent on hover.
  secondary:
    "border border-border-strong bg-surface-raised text-ink-strong " +
    "hover:border-accent hover:text-accent-deep hover:shadow-[var(--shadow-accent)] motion-safe:hover:-translate-y-px " +
    "focus-visible:outline-accent",
  // No border, no fill at rest. The tint on hover is 1.29:1 against white,
  // visible; the ink is already accent-deep (9.05:1) so it needs no change.
  quiet: "text-accent-deep hover:bg-accent-tint focus-visible:outline-accent",
  // A 44px circle for a single glyph. Callers pass an aria-label.
  icon:
    "border border-border-strong bg-surface-raised text-ink-muted " +
    "hover:border-accent hover:text-accent focus-visible:outline-accent",
  // For the hero and the crimson CTA band: white on the gradient, tint on hover.
  "on-dark":
    "bg-surface-raised text-accent hover:bg-accent-tint hover:text-accent-deep " +
    "motion-safe:hover:-translate-y-px focus-visible:outline-coral",
  "ghost-dark":
    "border-2 border-white/50 text-ink-on-dark hover:border-white hover:bg-white/10 " +
    "motion-safe:hover:-translate-y-px focus-visible:outline-coral",
};

const sizes: Record<ButtonSize, string> = {
  lg: "min-h-12 px-6 text-[15px]",
  md: "min-h-11 px-5 text-[15px]",
  sm: "min-h-9 px-3.5 text-sm",
};

/** The icon variant is a circle: width matches the height of its size. */
const iconSizes: Record<ButtonSize, string> = {
  lg: "min-h-12 w-12 px-0",
  md: "min-h-11 w-11 px-0",
  sm: "min-h-9 w-9 px-0",
};

/**
 * The button's classes, without the button.
 *
 * Most buttons on the site are `<Link>`s or form submits with their own
 * pending state and cannot be `<Button>`; exporting the class string lets
 * every one of them share the same hover, press and focus behaviour while
 * staying whatever element it needs to be.
 */
export function buttonClasses(opts?: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}): string {
  const { variant = "secondary", size = "md", className } = opts ?? {};
  const sizeClass = variant === "icon" ? iconSizes[size] : sizes[size];
  return cn(base, variants[variant], sizeClass, className);
}

/**
 * The travelling arrow for a primary or on-dark CTA. Sits inside the button
 * and moves 3px on hover via the `group/btn` on the base classes.
 */
export const buttonArrowClasses =
  "size-3.5 transition-[translate] duration-150 ease-[var(--motion-ease)] " +
  "group-hover/btn:translate-x-0.5 group-focus-visible/btn:translate-x-0.5 motion-reduce:transition-none";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
```

- [ ] **Step 4: Check `cn` merges conflicting utilities.** Read `packages/ui/src/cn.ts`. If it is `twMerge(clsx(...))` the per-variant `focus-visible:outline-*` colours are safe. If it only joins strings, keep the code above anyway — no variant declares two outline colours, so nothing conflicts.

- [ ] **Step 5: Run the test.** Same command as Step 2. Expected: all 5 pass.

- [ ] **Step 6: Typecheck the one existing consumer.** `apps/web/app/error.tsx` uses `<Button>` with `variant="primary"`; the variant still exists. Run `pnpm --filter @towardpcc/web typecheck > "$TEMP/tc.log" 2>&1; echo $?`. Expected 0.

- [ ] **Step 7: Commit.**

```bash
git add packages/ui/src/button.tsx packages/ui/src/button.test.ts
git commit -m "feat(ui): one pill button family with a gradient primary"
```

### Task A3: the guard — the primary fill is written once

**Files:**

- Create: `apps/web/content/button-idiom.test.ts`

- [ ] **Step 1: Write the guard.** Model it on `apps/web/content/countup-scope.test.ts` (read that file first for the walk helper it uses; copy its directory walk rather than importing it).

```ts
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
const RECIPE =
  /bg-accent(?:\s+[^"'`]*)?\s+text-ink-on-accent|text-ink-on-accent(?:\s+[^"'`]*)?\s+bg-accent\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe("button idiom", () => {
  it("never hand-rolls the primary fill outside the ui package", () => {
    const offenders = DIRS.flatMap(walk).filter((f) => RECIPE.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => f.slice(ROOT.length))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail** (the call sites still carry the recipe): `pnpm --filter @towardpcc/web test button-idiom > "$TEMP/t.log" 2>&1; echo $?; grep -A12 "offenders\|Expected\|Received" "$TEMP/t.log" | head -30`. Expected: a non-empty list including `home/page.tsx` and `main-nav.tsx`. Keep the list — it is Task A8's worklist.

- [ ] **Step 3: Commit the failing guard with `--no-verify`? No.** Do not commit yet; it lands with Task A8 once green.

### Task A4: the home hero and the marks

**Files:**

- Modify: `apps/web/app/(site)/home/page.tsx`
- Modify: `apps/web/content/site.ts` (`home:` block, lines ~84–150)
- Modify: `apps/web/content/figures.test.ts`

- [ ] **Step 1: Copy.** In `site.ts` under `home:` delete the `status:` line, the `badge:` line and its comment, the whole `heroTrust: [...]` array and its comments, and the whole `features: [...]` array and its comments. Add, after `ctaSecondary`:

```ts
    // One quiet line under the CTAs, where the status pill, the stat trio and
    // the feature strip used to be (2026-09-06). Each clause is a claim the
    // repo enforces: the count is derived at render, "every one referenced"
    // is registry-gate.test.ts, and the last clause is /trust's promise.
    heroLine: "{liveCalculators} calculators · every one referenced · nothing you enter leaves your browser",
```

Keep `counters`, `countersHeading`, `countersLede`, `mission`, `trust`, `evidence`, `ctaBand` and `CITATIONS` (still used by `counters`).

- [ ] **Step 2: Re-pin the figures test.** In `figures.test.ts` delete the two `hero:` tests and add:

```ts
it("hero line derives its count rather than typing it", () => {
  expect(site.home.heroLine).toContain("{liveCalculators}");
  expect(site.home.heroLine).not.toMatch(/\b\d{2,}\b/);
});
```

Read the rest of the file: if a later test references `site.home.features` (the pillar-card test reads `pillars` from the page source, not `features`), remove that reference too.

- [ ] **Step 3: The page.** In `home/page.tsx`:
  1. Delete `const featureTone`, `const ctaBase`, `function FeatureIcon`, and the whole `{/* ── FEATURE STRIP … */}` block (the `<div className="relative z-20 mx-auto -mt-16 …">` through its closing `</div>`).
  2. Import `buttonArrowClasses, buttonClasses, cn` from `@towardpcc/ui` (keep the other imports; drop `withCounts` only if nothing else uses it — the new line uses it, so keep).
  3. In the hero: delete the `<p className="mb-6 inline-flex … rounded-full …">…{withCounts(h.badge)}</p>` badge, and the whole `<dl className="mt-10 flex … heroTrust …">…</dl>`. Replace the two CTA `<Link>`s and add the line:

```tsx
            <div
              className="mt-9 flex flex-wrap gap-3.5 motion-safe:animate-[heroRise_var(--motion-duration-reveal)_var(--motion-ease)_both]"
              style={{ animationDelay: "320ms" }}
            >
              <Link href="/calculators" className={buttonClasses({ variant: "on-dark", size: "lg" })}>
                {h.ctaPrimary}
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={buttonArrowClasses}>
                  <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href="/knowledge" className={buttonClasses({ variant: "ghost-dark", size: "lg" })}>
                {h.ctaSecondary}
              </Link>
            </div>
            <p
              className="mt-8 text-[14px] text-ink-on-dark/75 motion-safe:animate-[heroRise_var(--motion-duration-reveal)_var(--motion-ease)_both]"
              style={{ animationDelay: "420ms" }}
            >
              {withCounts(h.heroLine)}
            </p>
```

4. Because the feature strip no longer overlaps the hero, change the hero's bottom padding from `pb-28` to `pb-20` and delete nothing else in the wave SVG.
5. Mission section: `Read our story` link → `className={buttonClasses({ variant: "primary", className: "mt-8" })}`.
6. CTA band link → `className={buttonClasses({ variant: "on-dark", size: "lg", className: "mt-8" })}`.
7. Pillar cards: replace the chip `<span className="absolute top-4 left-4 rounded-full …">{p.chip}</span>` with nothing, and in the `pillars` array change the four entries so the state lives in the meta row: delete `chip` and `chipTone` from each; add `status?: string` — `"Piloting"` for knowledge and data, omitted for calculators and services. Render it in the stats row as a first item when present:

```tsx
                      <span className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-dashed border-border-subtle pt-4">
                        {p.status ? (
                          <span className="font-numeric text-[11px] text-ink-muted">
                            Status
                            <span className="block text-[15px] text-ink-body">{p.status}</span>
                          </span>
                        ) : null}
                        {p.stats.map((s) => ( …unchanged… ))}
                      </span>
```

8. Under the pillars heading, keep the sentence "We say plainly what is live, what is piloting, and what is planned." — it is a claim about honesty, not a status pill.

- [ ] **Step 4: Run the web unit tests.** `pnpm --filter @towardpcc/web test figures > "$TEMP/t.log" 2>&1; echo $?`. Expected 0. Then `pnpm --filter @towardpcc/web typecheck`.

- [ ] **Step 5: Commit.**

```bash
git add "apps/web/app/(site)/home/page.tsx" apps/web/content/site.ts apps/web/content/figures.test.ts
git commit -m "feat(home): drop the status pill, stat trio and feature strip for one quiet line"
```

### Task A5: `PageHero` children slot, pillar-page badge

**Files:**

- Modify: `apps/web/components/page-hero.tsx`
- Modify: `apps/web/components/pillar/pillar-page.tsx` (the `<p className="mt-8 mb-6 inline-flex … rounded-full …">` badge)

- [ ] **Step 1: PageHero.** Add `children?: React.ReactNode` to the props and render it after the lede, inside the `relative z-10` container:

```tsx
{
  children ? <div className="mt-8 max-w-xl">{children}</div> : null;
}
```

- [ ] **Step 2: Pillar hero badge → plain eyebrow.** Replace the badge `<p>` (pill, dot, `bg-white/15`) with:

```tsx
<p className="mt-8 mb-5 font-numeric text-eyebrow tracking-[0.14em] text-coral uppercase">
  {badge}
</p>
```

- [ ] **Step 3: Pillar stat cards** already carry the compound hover; no change.

- [ ] **Step 4: Typecheck and commit.**

```bash
git add apps/web/components/page-hero.tsx apps/web/components/pillar/pillar-page.tsx
git commit -m "feat(hero): a children slot on page-hero; pillar status as text, not a pill"
```

### Task A6: breadcrumbs in sentence case

**Files:**

- Modify: `apps/web/components/nav/breadcrumbs.tsx`

- [ ] **Step 1:** On the `<ol>`, replace `font-numeric text-[11px] tracking-[0.06em] text-ink-muted uppercase` with `font-numeric text-[12px] text-ink-muted`. Nothing else changes.

- [ ] **Step 2: Commit.**

```bash
git add apps/web/components/nav/breadcrumbs.tsx
git commit -m "style(nav): breadcrumbs in sentence case"
```

### Task A7: nav CTAs

**Files:**

- Modify: `apps/web/components/nav/main-nav.tsx` (lines ~294–300 header CTA, ~380–388 drawer CTA)

- [ ] **Step 1:** Import `buttonClasses` from `@towardpcc/ui`. Header CTA className →
      `buttonClasses({ variant: "primary", size: "sm", className: "ms-auto hidden shrink-0 lg:ms-6 lg:inline-flex" })`.
      Drawer CTA className → `buttonClasses({ variant: "primary", className: "mt-6" })`. Delete the two comments about accent-deep hover; the family carries that reasoning now.

- [ ] **Step 2: Commit.**

```bash
git add apps/web/components/nav/main-nav.tsx
git commit -m "style(nav): header and drawer ctas take the button family"
```

### Task A8: every other button-shaped element

**Files (from the Task A3 failure list plus these known sites):**

- `apps/web/components/pwa/install-prompt.tsx` (the accept and "Not now" buttons — keep the accessible name "Not now"; e2e clicks it)
- `apps/web/components/home/evidence-carousel.tsx` (the arrow buttons → `icon`)
- `apps/web/app/(site)/about/page.tsx`, `apps/web/components/stage-timeline.tsx`, `apps/web/components/forms/submission-form.tsx`, `apps/web/components/site-footer.tsx`, `apps/web/app/(site)/validation/page.tsx`, `apps/web/app/(site)/legal/data-protection/page.tsx`, `apps/web/app/(site)/admin/**` (login form, mail form, test-mail button, submissions)
- NOT `image-slot.tsx` (its matches are frames, not buttons), NOT `eyebrow.tsx`, NOT `back-to-top.tsx` (its own heavier glow is a recorded intent), NOT the utility-bar LinkedIn circle, NOT `calculator-form.tsx` / `score-tabs.tsx` / `calculators-index.tsx` (PRs C and D).

- [ ] **Step 1:** For each file, replace every hand-rolled button/link recipe with `buttonClasses({ variant, size, className })`: crimson fills → `primary`; outlined → `secondary`; underlined text actions → `quiet`; single-glyph → `icon` with an `aria-label`. Keep every `type`, `aria-*`, `data-print`, `disabled` and pending-state prop exactly as it was. A submit button whose label flips while pending keeps that logic; only the className changes.

- [ ] **Step 2: Run the guard until it is green.** `pnpm --filter @towardpcc/web test button-idiom`. Expected: `offenders` is `[]`.

- [ ] **Step 3: Fixers, gate, commit.**

```bash
pnpm lint --fix > "$TEMP/lint.log" 2>&1; echo $?
pnpm format > "$TEMP/fmt.log" 2>&1; echo $?
pnpm gate > "$TEMP/gate.log" 2>&1; echo $?
```

Read `gate.log` to the end. Expected: exit 0, six stages, budget `PASS` on all five routes. Then:

```bash
git add apps/web/content/button-idiom.test.ts <every file touched in Step 1>
git commit -m "style(web): every button takes the family; guard the primary fill"
```

### Task A9: e2e and a browser pass

- [ ] **Step 1:** `pnpm --filter @towardpcc/web test:e2e -- layout published-figures hero-motion mega-menu quick-search evidence > "$TEMP/e2e.log" 2>&1; echo $?; grep -E "Running|passed|failed|flaky" "$TEMP/e2e.log"`. Expected: `Running N tests using 1 worker`, all passed. `published-figures.spec.ts` asserts the counter band on `/home`, which is unchanged.

- [ ] **Step 2:** Open the PR with `gh pr create`. Body: what changed, the guard, what was run (the six specs above, not the full suite — say so), and the two public-presentation changes for the founder to see: the hero line wording and the pillar status text.

- [ ] **Step 3:** After merge, wait ~5 minutes, then `EXPECTED_COMMIT=$(git rev-parse HEAD) node scripts/check-integrity.mjs`. Then open `/home`, `/calculators`, `/knowledge` in the Browser pane at 375 px and 1280 px and check: no pill with a dot anywhere, the hero line reads with the real count, every button is a pill and lifts on hover.

---

# PR B — scoring-engine text (founder sign-off before merge)

Branch: `content/taglines-and-help`. This PR changes user-visible clinical
text, so every score touched gets a patch version bump and a changelog entry,
per `packages/scoring-engine/CLAUDE.md`. It is opened, reviewed by the
founder, and merged only on his approval.

### Task B1: the `tagline` field and the text tests

**Files:**

- Modify: `packages/scoring-engine/src/types.ts` (`ScoreDefinition`, `ScoreSummary`)
- Modify: `packages/scoring-engine/src/scores/registry.ts` (`listScores` map)
- Modify: `packages/scoring-engine/src/testing/fixture-score.ts`
- Create: `packages/scoring-engine/src/scores/registry-text.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, expect, it } from "vitest";
import { registry } from "./registry";

/**
 * Text the catalogue and the form render, held to a shape (2026-09-06).
 *
 * A tagline is the one line a card shows under the name; it has to be short
 * enough for a three-column grid and say what the score is FOR. Help text
 * sits behind an info toggle on the form, and the toggle is only an
 * improvement if what it opens can be read in one glance — the cap is 70
 * words, chosen because the seven longest entries (74–223 words) all
 * condensed to that length without dropping a rule, threshold or prohibition.
 */
describe("registry text", () => {
  it("every score carries a tagline: 20–90 characters, no trailing full stop, unique", () => {
    const seen = new Set<string>();
    for (const s of registry) {
      const t = s.tagline.en.trim();
      expect(t.length, `${s.slug}: "${t}"`).toBeGreaterThanOrEqual(20);
      expect(t.length, `${s.slug}: "${t}"`).toBeLessThanOrEqual(90);
      expect(t.endsWith("."), `${s.slug} tagline ends with a full stop`).toBe(false);
      expect(seen.has(t), `${s.slug} duplicates another tagline`).toBe(false);
      seen.add(t);
    }
  });

  it("no field help exceeds 70 words", () => {
    const over: string[] = [];
    for (const s of registry) {
      for (const input of s.inputs) {
        const words = input.helpText?.en.trim().split(/\s+/).length ?? 0;
        if (words > 70) over.push(`${s.slug}.${input.id} (${words})`);
      }
    }
    expect(over).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it.** `pnpm --filter @towardpcc/scoring-engine test registry-text > "$TEMP/se.log" 2>&1; echo $?`. Expected: a typecheck-level failure on `s.tagline` (property missing) — that is the signal.

- [ ] **Step 3: Types.** In `types.ts`, in `ScoreDefinition` directly after `readonly name: string;`:

```ts
  /**
   * One line saying what the score is FOR, shown under the name on the
   * catalogue card and in search. 20–90 characters, no trailing full stop
   * (registry-text.test.ts). Founder-reviewed copy, like every other
   * user-visible string here.
   */
  readonly tagline: LocalizedText;
```

In `ScoreSummary` after `readonly name: string;`: `readonly tagline: LocalizedText;`.

- [ ] **Step 4: `listScores`.** Add `tagline` to the destructure and the object in `registry.ts`.

- [ ] **Step 5: Fixture.** In `fixture-score.ts` after `name:` add `tagline: defineText("fixture.tagline", "Internal engine fixture, never displayed"),` (import `defineText` is already there for `notes`).

- [ ] **Step 6:** Run `pnpm --filter @towardpcc/scoring-engine typecheck`. Expected: 25 errors, one per score missing `tagline`. That is Task B2's list.

### Task B2: the 25 taglines, with version bumps

**Files:** each `packages/scoring-engine/src/scores/<slug>.ts`.

- [ ] **Step 1:** In each score, directly after `name:`, add `tagline: defineText("<slug-key>.tagline", "…")` using the score's existing key prefix (the one its `notes` uses — e.g. `pelod2.notes` → `pelod2.tagline`; `fb.anchor.help` → `fb.tagline`). The lines, founder-reviewed in the PR:

| slug                    | tagline                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| anion-gap               | Anion gap from electrolytes, with an albumin-corrected value for hypoalbuminaemia    |
| apls-weight             | Age-based weight estimate for when a child cannot be weighed                         |
| bsa-mosteller           | Body surface area from height and weight, for mg/m² dosing and cardiac index         |
| burn-resuscitation      | 24-hour crystalloid volume and hourly rates after a burn, from weight and %TBSA      |
| corrected-calcium       | Total calcium adjusted for serum albumin                                             |
| corrected-sodium        | Measured sodium adjusted for hyperglycaemia, by both published factors               |
| ett-size                | Cuffed and uncuffed tube size and insertion depth from age                           |
| fluid-balance           | Cumulative fluid balance as a percentage of weight, in both published forms          |
| four-score              | Coma assessment that stays complete in an intubated patient                          |
| holliday-segar          | Daily maintenance fluid volume and hourly rate from weight                           |
| ideal-body-weight       | Ideal body weight from height, by four published methods side by side                |
| kdigo-aki               | Acute kidney injury stage from creatinine and urine output                           |
| oxygen-saturation-index | Oxygenation severity from SpO₂, without an arterial line                             |
| oxygenation-index       | Oxygenation severity on ventilation, from mean airway pressure, FiO₂ and PaO₂        |
| pediatric-gcs           | Age-adapted Glasgow Coma Scale for infants and children                              |
| pelod2                  | Organ dysfunction severity across five systems, with predicted in-hospital mortality |
| pf-ratio                | PaO₂ to FiO₂ ratio with the Berlin severity bands                                    |
| phoenix                 | The 2024 sepsis criteria for children, scored across four organ systems              |
| pim3                    | Predicted PICU mortality from data at first contact, for unit benchmarking           |
| prism                   | Physiologic severity in the first hours of PICU care, with PRISM IV mortality        |
| psofa                   | Sequential organ failure assessment adapted for children, six organ subscores        |
| qtc                     | Heart-rate-corrected QT interval by Bazett and Fridericia                            |
| serum-osmolality        | Calculated osmolality and the osmolar gap, with ethanol accounted for                |
| sf-ratio                | SpO₂ to FiO₂ ratio for non-invasive support, when no blood gas is available          |
| vis                     | Vasoactive and inotropic support summed into one number, six drugs                   |

- [ ] **Step 2: Version and changelog.** In each of the 25 scores, bump `version` by a patch (e.g. `1.0.0` → `1.0.1`, `1.1.0` → `1.1.1`, `1.2.0` → `1.2.1`) and append a changelog entry (newest LAST — the gate reads oldest-first):

```ts
    {
      version: "<new>",
      date: "2026-09-06",
      summary: "Added a one-line description for the catalogue card. No rule, threshold or reference changed.",
      reason: "clarification",
    },
```

For the seven scores Task B3 also condenses, use instead: `"Added a one-line description for the catalogue card and shortened field guidance to fit an info toggle. No rule, threshold or reference changed."`

- [ ] **Step 3:** `pnpm --filter @towardpcc/scoring-engine test > "$TEMP/se.log" 2>&1; echo $?; grep -E "Test Files|Tests " "$TEMP/se.log"`. Expected: the tagline test passes; each score's "declares the version its newest changelog entry describes" passes; the help cap still fails on 15 fields (Task B3).

### Task B3: condense the fifteen help texts over 70 words

**Files:** `fluid-balance.ts`, `four-score.ts`, `kdigo-aki.ts`, `phoenix.ts`, `pim3.ts`, `prism.ts`, `psofa.ts`.

Rule: keep every rule, threshold, prohibition and citation; drop restatement
and SHOUTED lead-ins; where a derivation detail is dropped, confirm the same
fact is in that score's `notes` and append it there if not. Replace each
`helpText` string with the text below (word counts in brackets are ≤ 70).

- [ ] **`fb.anchor.help`:** `The reference weight both forms divide by — usually the ICU admission weight, as in the outcome literature; in neonates, the birthweight during the first two postnatal weeks (ADQI). Accepts kilograms, pounds or grams. ADQI calls the choice of anchor an unresolved gap with no gold standard; it scales the whole result, so record which anchor you used.`
- [ ] **`four.respiration.help`:** `The split is intubation, not ventilator support. The top three levels describe an unintubated patient's breathing pattern — including on mask CPAP, BiPAP or high-flow, which still score on rhythm alone. The bottom two describe how an intubated patient interacts with the set rate, so an intubated patient cannot score above 1, capping the total at 13.`
- [ ] **`kdigo.scr.help`:** `The current measured serum creatinine, in mg/dL or µmol/L. Drives the ×-baseline ratio and the ≥ 4.0 mg/dL Stage-3 threshold. That threshold needs the AKI definition met first (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline): 4.0 or above without a baseline is reported as Stage 3 but flagged as not settled, because a chronically high creatinine that never rose is not AKI.`
- [ ] **`kdigo.scr_baseline.help`:** `Baseline creatinine — a known outpatient value or a 7-day dynamic baseline — in mg/dL or µmol/L. Needed for the ×-baseline ratio, the ≥ 0.3 mg/dL rise, and to settle the ≥ 4.0 mg/dL Stage-3 route. With no prior value, use the lowest creatinine of this admission (Lee 2022). Do not back-calculate from an assumed GFR of 75: in children it missed two thirds of AKI. Any surrogate stages as a surrogate.` Then confirm `kdigo-aki` `notes` carries Lee 2022's figures (n = 710, sensitivity 87.8%, specificity 71.0%, DOI 10.23876/j.krcp.21.120; back-calculation 31.5% sensitive, 19.1% vs 58.7% incidence); if not, append one sentence with them to `notes`.
- [ ] **`kdigo.uo_duration.help`:** `The KDIGO Table 2 windows as bands rather than free-typed hours, because an hours box invites false precision about a figure read off a nursing chart. The boundaries are the guideline's own: 6 to under 12 hours is a different row from 12 or more. Pick '24 hours or more' once the window has reached 24 hours; '12 hours or more' leaves the 24-hour Stage-3 row open, and where that could raise the stage (a rate below 0.3 mL/kg/h) the result is reported as a lower bound.`
- [ ] **`kdigo.anuria.help`:** `Anuria has its own row in Table 2: anuria for 12 hours or more is Stage 3 whatever the rate rows say. Enter it as the clinical finding it is — KDIGO defines no millilitre figure for it and none is invented here. With no urine the output is below every positive cutoff, so anuria for 6 to under 12 hours is Stage 1. Enter a measured rate as well if you have one; it can only make the answer more specific.`
- [ ] **`phoenix.resp_support.help`:** `The 1-point tier needs any support; the 2- and 3-point tiers need invasive mechanical ventilation. A low ratio with no support scores 0. High-flow nasal cannula counts as support — Phoenix includes it explicitly, although PICANet and ANZPIC exclude it from their ventilation field. Answer from what the child is actually on: an FiO₂ above 0.21 with 'no respiratory support' is contradictory, and this calculator takes the answer given.`
- [ ] **`pim3.vent.help`:** `Yes if the child received any of these at any point in the first hour in ICU: invasive ventilation, CPAP by mask or nasal prongs, BiPAP, or negative-pressure ventilation (Straney 2013, Appendix 1). A tracheostomy with unassisted spontaneous breathing is No — the ANZPIC Registry's data-entry convention (Information Booklet, January 2019), not a rule stated in the paper.`
- [ ] **`pim3.recovery.help`:** `Choose a category only when recovering from the procedure is the reason for the ICU admission. Radiology procedures and cardiac catheterisation count. Coming from theatre is not enough on its own — a child admitted after ICP-monitor insertion is admitted for the head injury (Straney 2013, Appendix 1). The categories are mutually exclusive; a post-procedure admission may also carry a risk diagnosis below.`
- [ ] **`pim3.vhr.help`:** `Five conditions, complete as published (Straney 2013, Appendix 1). Record one only when it is the main reason for admission; if unsure, record none. Cardiac arrest needs a documented absent pulse or chest compressions, in or out of hospital; a past arrest does not count. Leukaemia or lymphoma counts only when the admission concerns the malignancy or its treatment. Liver failure may be acute or chronic; a planned post-transplant admission is excluded here (see Notes), while readmission for graft failure qualifies.` Confirm `pim3` `notes` still carries the ANZPICR/PICANet disagreement (it does today) and that "the model applies the highest tier only" appears in `notes`; append it if not.
- [ ] **`pim3.hr.help`:** `Five conditions, complete as published (Straney 2013, Appendix 1). Record one only when it is the main reason for admission; if unsure, record none. Cerebral haemorrhage must be spontaneous (aneurysm or arteriovenous malformation): traumatic and extracerebral bleeds are excluded. Hypoplastic left heart counts only where a Norwood or equivalent was needed in the newborn period. Neurodegenerative disorder needs a progressive loss of milestones, or a diagnosis in which that loss is certain. A very high-risk diagnosis takes precedence.`
- [ ] **`pim3.lr.help`:** `Complete as published (Straney 2013, Appendix 1). Record one only when it is the main reason for admission; if unsure, record none. Bronchiolitis covers respiratory distress or central apnoea where bronchiolitis is the clinical diagnosis. Obstructive sleep apnoea covers admission after adenoidectomy or tonsillectomy when the apnoea is the main reason — record the procedure recovery above as well. Seizure disorder covers status epilepticus, epilepsy, febrile convulsion or another epileptic syndrome where the admission is to control or recover from seizures. A higher-risk diagnosis takes precedence.`
- [ ] **`pim3.sbp.help`:** `First systolic BP from first ICU-team contact to one hour after ICU arrival — the first value in that window, not the worst. Three coded entries are not measurements: leave blank if unknown (the model substitutes 120); enter 0 if in cardiac arrest at admission; enter 30 if shocked with a blood pressure that could not be measured (Straney 2013, Appendix 1).`
- [ ] **`prism.creat.help`:** `Age-banded; infant and child share one cutoff. Scores 2 above 0.85 mg/dL (neonate), 0.9 (infant and child) or 1.3 (adolescent) — about 75, 80 and 115 µmol/L. The comparison is made in mg/dL after conversion, rounded to 2 decimal places, so 115 µmol/L (1.30 mg/dL) does not score while 1.301 mg/dL entered directly does. Treat either unit as a knife-edge at the boundary.`
- [ ] **`psofa.resp_support.help`:** `Invasive or non-invasive support both count. Table 1 gates respiratory subscores 3–4 on being on respiratory support without defining it, so counting non-invasive support is this calculator's reading, not the paper's. Without support the respiratory subscore is capped at 2. High-flow nasal cannula counts here, although PICANet and ANZPIC exclude it from their ventilation field, so the same child reads as supported here and not ventilated there.`

- [ ] **Step 2: Any other field over 70 words** (the test lists them): condense by the same rule and add it to the PR table.

- [ ] **Step 3:** `pnpm --filter @towardpcc/scoring-engine test > "$TEMP/se.log" 2>&1; echo $?; grep -E "Test Files|Tests " "$TEMP/se.log"`. Expected: all green, including each score's worked examples (no arithmetic changed). Then `pnpm --filter @towardpcc/scoring-engine test dump-calculator-text` regenerates the text dump; commit the regenerated dump if it is tracked.

### Task B4: search finds a score by what it does

**Files:**

- Modify: `apps/web/lib/calculator-search.ts` (`matchScores`)
- Modify: `apps/web/lib/calculator-search.test.ts` if it exists (`ls apps/web/lib/*search*`); otherwise create it.

- [ ] **Step 1: Test.**

```ts
import { describe, expect, it } from "vitest";
import { listScores } from "@towardpcc/scoring-engine";
import { site } from "@/content/site";
import { matchScores } from "./calculator-search";

describe("matchScores reads the tagline", () => {
  it("finds PELOD-2 by 'in-hospital mortality', which appears only in its tagline", () => {
    const hits = matchScores(
      listScores({ status: "published" }),
      "in-hospital mortality",
      site.calculators.categoryLabels,
    );
    expect(hits.map((s) => s.slug)).toContain("pelod2");
  });
});
```

- [ ] **Step 2:** In `matchScores`, extend `indirect` so a score also matches when `s.tagline.en.toLowerCase().includes(q)` and `q.length >= 3`.

- [ ] **Step 3:** Run the test, then fixers, gate, commit:

```bash
git add packages/scoring-engine/src/types.ts packages/scoring-engine/src/scores/registry.ts packages/scoring-engine/src/scores/registry-text.test.ts packages/scoring-engine/src/testing/fixture-score.ts packages/scoring-engine/src/scores/*.ts apps/web/lib/calculator-search.ts apps/web/lib/calculator-search.test.ts
git commit -m "feat(scores): a tagline per score; field guidance capped at seventy words"
```

- [ ] **Step 4: The PR.** Body carries two tables — the 25 taglines, and the 15 help texts before/after with word counts — and the sentence "Merge only on the founder's approval of both tables." Do not merge.

---

# PR C — the catalogue as a toolkit

Branch: `design/catalogue`. Depends on PR B (taglines on `ScoreSummary`).

### Task C1: `calculators/page.tsx` — the hero holds the search

**Files:**

- Modify: `apps/web/app/(site)/calculators/page.tsx`

- [ ] **Step 1:** Replace the body of `CalculatorsPage` so the page renders only the index (which now renders its own hero, because the search box's state lives there):

```tsx
return (
  <>
    <CalculatorsIndex scores={scores} inputCounts={inputCounts} />
  </>
);
```

Delete the `PageHero` import here; keep `metadata`, `listScores`, `getScore`, `inputCounts`.

### Task C2: rewrite `calculators-index.tsx`

**Files:**

- Modify: `apps/web/app/(site)/calculators/calculators-index.tsx` (whole file)

- [ ] **Step 1: Replace the file with:**

```tsx
"use client";

import { CategoryIcon } from "@/components/category-icon";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { matchScores } from "@/lib/calculator-search";
import { shortName } from "@/content/score-description";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ScoreCategory, ScoreSummary } from "@towardpcc/scoring-engine";
import { buttonClasses, cn } from "@towardpcc/ui";
import { site } from "@/content/site";
import { useFavorites } from "@/components/calculator/use-favorites";

const c = site.calculators;

// Preserve the PRD §6.4 category order.
const CATEGORY_ORDER: ScoreCategory[] = [
  "mortality-severity",
  "organ-dysfunction",
  "sepsis",
  "respiratory",
  "sedation-analgesia-withdrawal",
  "fluids-resuscitation",
  "airway-equipment",
  "renal-metabolic",
  "general",
];

/**
 * The catalogue, in the shape of a toolkit (2026-09-06).
 *
 * A card says what the score is FOR before you open it: the category glyph,
 * the short name, the tagline, the input count, and a visible Open. The
 * favourite star sits inside the card. A `<button>` may not nest inside an
 * `<a>`, so the card is a `<li>` and the title link is stretched over it
 * with a pseudo-element; the star sits above that layer.
 *
 * The hero is rendered here rather than in the page because the search box
 * lives inside it and its state lives here. Tab, filter and search state is
 * component state, never the URL.
 */
export function CalculatorsIndex({
  scores,
  inputCounts = {},
}: {
  scores: readonly ScoreSummary[];
  /** Rendered label per slug, e.g. `17 inputs` or `22–26 inputs`. */
  inputCounts?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ScoreCategory | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, toggle, ready } = useFavorites();

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => scores.some((s) => s.category === cat)),
    [scores],
  );

  const grouped = useMemo(() => {
    let matched = matchScores(scores, query, c.categoryLabels);
    if (activeCategory) matched = matched.filter((s) => s.category === activeCategory);
    if (showFavoritesOnly) matched = matched.filter((s) => favorites.includes(s.slug));
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: matched.filter((s) => s.category === cat).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [scores, query, activeCategory, showFavoritesOnly, favorites]);

  const favoriteCount = favorites.length;
  const shownCount = grouped.reduce((n, g) => n + g.items.length, 0);
  const isFiltered = Boolean(query.trim() || activeCategory || showFavoritesOnly);

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<ScoreCategory, number>;
    for (const s of scores) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [scores]);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // "/" jumps to search. Ignored while typing — on a site full of ratio
    // scores ("P/F") stealing the slash is not hypothetical.
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "/" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el instanceof HTMLElement && el.isContentEditable) return;
      ev.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const clearAll = () => {
    setQuery("");
    setActiveCategory(null);
    setShowFavoritesOnly(false);
    searchRef.current?.focus();
  };

  let cardIndex = 0;

  return (
    <>
      <PageHero crumb={site.nav.calculators} title={c.indexHeading} lede={c.indexLede}>
        <label htmlFor="calc-search" className="sr-only">
          {c.searchLabel}
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M13.5 13.5 17 17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={searchRef}
            id="calc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="h-14 w-full rounded-pill border border-border-strong bg-surface-raised ps-13 pe-5 text-[16px] text-ink-strong shadow-lg placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
          />
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1280px] px-6 pb-24">
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={c.filterGroupLabel}>
          <FilterChip active={activeCategory === null && !showFavoritesOnly} onClick={clearAll}>
            {c.filterAll}
          </FilterChip>
          {ready && favoriteCount > 0 && (
            <FilterChip
              active={showFavoritesOnly}
              onClick={() => {
                setShowFavoritesOnly((v) => !v);
                setActiveCategory(null);
              }}
            >
              <StarIcon filled className="size-3.5" /> {c.filterFavorites}
              <span aria-hidden="true" className="ms-1.5 tabular-nums opacity-70">
                {favoriteCount}
              </span>
            </FilterChip>
          )}
          {presentCategories.map((cat) => (
            <FilterChip
              key={cat}
              icon={<CategoryIcon category={cat} className="size-4 shrink-0" />}
              active={activeCategory === cat && !showFavoritesOnly}
              onClick={() => {
                setActiveCategory((cur) => (cur === cat ? null : cat));
                setShowFavoritesOnly(false);
              }}
            >
              {c.categoryLabels[cat]}
              <span aria-hidden="true" className="ms-1.5 tabular-nums opacity-70">
                {categoryCounts[cat]}
              </span>
            </FilterChip>
          ))}
        </div>

        {/* Always mounted, content toggled, so the count is announced on every
            change; visually silent on an unfiltered list. */}
        <p aria-live="polite" className="mt-6 min-h-5 font-numeric text-sm text-ink-muted">
          {isFiltered ? (
            <>
              Showing <span className="tabular-nums text-ink-strong">{shownCount}</span> of{" "}
              <span className="tabular-nums">{scores.length}</span>
            </>
          ) : null}
        </p>

        {grouped.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border bg-surface-raised p-10 text-center shadow-sm">
            <p className="font-display text-lg font-medium text-ink-strong">
              {showFavoritesOnly ? c.noFavorites : c.noResults}
            </p>
            {query.trim() && !showFavoritesOnly ? (
              <p className="mt-2 text-sm text-ink-muted">
                Nothing matches “<span className="text-ink-strong">{query.trim()}</span>”
                {activeCategory ? ` in ${c.categoryLabels[activeCategory].toLowerCase()}` : ""}.
              </p>
            ) : null}
            <button
              type="button"
              onClick={clearAll}
              className={buttonClasses({ variant: "secondary", className: "mt-5" })}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-12">
            {grouped.map((group) => (
              <section key={group.category} aria-labelledby={`cat-${group.category}`}>
                <h2
                  id={`cat-${group.category}`}
                  className="flex items-center gap-2.5 font-display text-lg font-semibold text-ink-strong"
                >
                  <CategoryIcon category={group.category} className="size-5 text-accent" />
                  {c.categoryLabels[group.category]}
                </h2>
                <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((s) => {
                    const i = cardIndex++;
                    const fav = favorites.includes(s.slug);
                    return (
                      <li key={s.slug} className="min-w-0">
                        <Reveal className="h-full" delay={Math.min(i % 6, 6) * 45}>
                          <article className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface-raised p-5 transition-[translate,box-shadow,border-color] duration-[var(--motion-duration-enter)] ease-[var(--motion-ease)] hover:border-border-strong hover:shadow-xl focus-within:border-border-strong focus-within:shadow-xl motion-safe:hover:-translate-y-1 motion-reduce:transition-none">
                            {/* The crimson rule that draws in along the top edge on
                                hover: `transition-[scale]`, because scale-x-* compiles
                                to the `scale` property. */}
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-accent transition-[scale] duration-[var(--motion-duration-panel)] ease-[var(--motion-ease)] group-hover:scale-x-100 group-focus-within:scale-x-100 motion-reduce:transition-none"
                            />
                            <div className="flex items-center justify-between gap-3">
                              <span className="grid size-9 place-items-center rounded-md bg-accent-tint text-accent-deep">
                                <CategoryIcon category={s.category} className="size-5" />
                              </span>
                              {/* Above the stretched link (z-10) so it is its own
                                  target. aria-pressed carries the state. */}
                              <button
                                type="button"
                                onClick={() => toggle(s.slug)}
                                aria-pressed={fav}
                                aria-label={
                                  fav
                                    ? `${c.removeFavorite} ${s.name}`
                                    : `${c.addFavorite} ${s.name}`
                                }
                                className={cn(
                                  "relative z-10 grid size-11 place-items-center rounded-pill transition-[color,background-color] duration-150",
                                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                                  fav
                                    ? "bg-accent-tint text-accent"
                                    : "text-ink-muted hover:bg-accent-tint hover:text-accent",
                                )}
                              >
                                <StarIcon filled={fav} className="size-[18px]" />
                              </button>
                            </div>
                            <h3 className="font-display text-[17px] leading-tight font-bold text-ink-strong">
                              {/* The stretched link: `after:absolute after:inset-0`
                                  makes the whole card the target while the anchor
                                  keeps its text as the accessible name. */}
                              <Link
                                href={`/calculators/${s.slug}`}
                                className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                              >
                                {shortName(s.name)}
                                {shortName(s.name) !== s.name ? (
                                  <span className="sr-only"> — {s.name}</span>
                                ) : null}
                              </Link>
                            </h3>
                            <p className="text-[13.5px] leading-relaxed text-ink-muted">
                              {s.tagline.en}
                            </p>
                            <div className="mt-auto flex items-center justify-between pt-1">
                              <span className="font-numeric text-[11.5px] text-ink-muted">
                                {inputCounts[s.slug] ?? ""}
                              </span>
                              <span
                                aria-hidden="true"
                                className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent"
                              >
                                Open
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="size-3.5 transition-[translate] duration-150 ease-[var(--motion-ease)] group-hover:translate-x-0.5 group-focus-within:translate-x-0.5 motion-reduce:transition-none"
                                >
                                  <path
                                    d="M2 8h11M9 4l4 4-4 4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </div>
                          </article>
                        </Reveal>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-12 text-[13px] text-ink-muted">{c.favoritesNote}</p>
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm transition-[color,background-color,border-color,scale] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
        "motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        // Selected: solid crimson, white text, heavier weight. The luminance
        // inversion plus the weight is the non-colour cue (WCAG 1.4.1).
        active
          ? "border-accent bg-accent font-semibold text-ink-on-accent"
          : "border-border-strong bg-surface-raised font-medium text-ink-body hover:border-accent hover:text-accent-deep",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.5 6.6 20.4l1-6.1-4.4-4.3 6.1-.9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

Notes for the implementer: `ps-13` may not exist as a spacing step — if Tailwind does not emit it, use `ps-[3.25rem]`. `text-[16px]` on the search input is deliberate (iOS does not zoom a 16 px field). The selected FilterChip uses `bg-accent text-ink-on-accent`; this is a chip, not a button, but the Task A3 guard will match it — add the class `text-ink-on-accent` via a separate string so the recipe is not on one line, or better, extend the guard's allow-list with a comment naming this one chip. Prefer the second: honesty over a trick.

- [ ] **Step 2: `site.ts` strings.** Change `searchPlaceholder` to `"Search by name, condition or drug"`.

- [ ] **Step 3:** Typecheck, then `pnpm --filter @towardpcc/web test button-idiom border-usage privacy-invariant`. Expected green.

### Task C3: catalogue e2e

**Files:**

- Modify: `apps/web/e2e/calculator-catalogue.spec.ts`

- [ ] **Step 1:** The five existing tests stand (`#calc-search`, the chips group, the tally, "Clear filters", the slash). Add:

```ts
test("a card says what the score is for, and its star is its own control", async ({ page }) => {
  const card = page.locator("article").filter({ hasText: "PELOD-2" }).first();
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: /PELOD-2/ })).toBeVisible();
  // The tagline is the second line, and it is not the version number.
  await expect(card).toContainText(/organ dysfunction/i);
  await expect(card).not.toContainText(/v\d+\.\d+\.\d+/);

  const star = card.getByRole("button", { name: /favorites/i });
  await expect(star).toHaveAttribute("aria-pressed", "false");
  await star.click();
  await expect(star).toHaveAttribute("aria-pressed", "true");
  // Still on the catalogue: the star did not follow the stretched link.
  await expect(page).toHaveURL(/\/calculators$/);
});
```

- [ ] **Step 2:** Fixers, gate, then `pnpm --filter @towardpcc/web test:e2e -- calculator-catalogue quick-search mega-menu layout > "$TEMP/e2e.log" 2>&1; echo $?; grep -E "Running|passed|failed" "$TEMP/e2e.log"`. Expected all passed.

- [ ] **Step 3: Commit and PR.**

```bash
git add "apps/web/app/(site)/calculators/page.tsx" "apps/web/app/(site)/calculators/calculators-index.tsx" apps/web/content/site.ts apps/web/e2e/calculator-catalogue.spec.ts
git commit -m "feat(catalogue): cards that say what a score is for, with the search in the hero"
```

PR body: what changed, what ran (the four specs), a 375 px and 1280 px screenshot description after deploy.

---

# PR D — the calculator page

Branch: `design/calculator-page`. Depends on PR A (button family) and PR B (help caps; not strictly, but the toggle is only an improvement once the text fits).

### Task D1: `FieldHelp` — the ⓘ toggle

**Files:**

- Create: `apps/web/components/calculator/field-help.tsx`

- [ ] **Step 1: Write the component.**

```tsx
"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@towardpcc/ui";

/**
 * FIELD GUIDANCE, ONE GESTURE AWAY (2026-09-06).
 *
 * Every numeric field used to carry its full guidance under the input — 135
 * help texts averaging 31 words — which is most of why a calculator read as
 * a wall of text. The text is not deleted: it stays in the DOM, is still the
 * input's `aria-describedby` target (a screen reader hears it exactly as
 * before; the accessible description is computed from hidden nodes too), and
 * is shown visually two ways:
 *
 * - hover or keyboard focus on the ⓘ shows it as a tooltip under the label,
 *   opacity/translate only, 150ms, static under reduced motion;
 * - click or tap PINS it inline under the field (`aria-expanded`), so touch
 *   has a designed path rather than relying on the hover variant firing on
 *   touch. Escape, a second click, or pinning another field unpins it.
 *
 * The pinned state is component state, never the URL. Print keeps it hidden:
 * a printed record wants the chosen values, not the guidance.
 */
export function FieldHelp({
  helpId,
  label,
  text,
  className,
}: {
  /** The id the input's aria-describedby already points at. */
  helpId: string;
  label: string;
  text: string;
  className?: string | undefined;
}) {
  const [pinned, setPinned] = useState(false);
  const buttonId = useId();

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    // One pinned help at a time: another field's pin announces itself here.
    const onPin = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== helpId) setPinned(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("tpcc:help-pinned", onPin);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("tpcc:help-pinned", onPin);
    };
  }, [pinned, helpId]);

  const pin = () => {
    const next = !pinned;
    setPinned(next);
    if (next) document.dispatchEvent(new CustomEvent("tpcc:help-pinned", { detail: helpId }));
  };

  return (
    <span className={cn("group/help relative inline-flex", className)} data-print="hide">
      <button
        type="button"
        id={buttonId}
        onClick={pin}
        aria-expanded={pinned}
        aria-controls={helpId}
        aria-label={`About ${label}`}
        className={cn(
          "grid size-6 place-items-center rounded-pill border font-numeric text-[12px] font-semibold",
          "transition-[color,border-color,background-color] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          pinned
            ? "border-accent bg-accent-tint text-accent-deep"
            : "border-border-strong text-ink-muted hover:border-accent hover:bg-accent-tint hover:text-accent-deep",
        )}
      >
        i
      </button>
      {/* Tooltip: shown on hover/focus of the button, never when pinned (the
          inline copy below takes over). `hidden` is not used here because the
          node must stay in the accessibility tree for aria-describedby — it
          is visually collapsed with opacity and pointer-events instead, and
          `aria-hidden` keeps the tooltip copy from being read twice. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute start-0 top-8 z-20 w-max max-w-[min(44ch,calc(100vw-3rem))] rounded-md bg-ink-strong px-3.5 py-2.5 text-[13px] leading-relaxed font-normal text-surface-page shadow-xl",
          "opacity-0 -translate-y-1 transition-[opacity,translate] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
          !pinned &&
            "group-hover/help:opacity-100 group-hover/help:translate-y-0 group-focus-within/help:opacity-100 group-focus-within/help:translate-y-0",
        )}
      >
        {text}
      </span>
      {/* The accessible copy. Always in the DOM (aria-describedby reads hidden
          nodes); visible only when pinned, as a block under the label row.
          `hidden` toggles display; the parent InputField places this span's
          block form via `basis-full`. */}
      <span
        id={helpId}
        hidden={!pinned}
        className="mt-2 block basis-full rounded-md bg-surface-sunken px-3.5 py-2.5 text-[13px] leading-relaxed font-normal text-ink-body"
      >
        {text}
      </span>
    </span>
  );
}
```

Implementer note on layout: the label row in Task D2 is `flex flex-wrap items-center gap-2`; the pinned `<span id={helpId}>` uses `basis-full` so it wraps under the label as a block. Verify in the browser that it lands under the label and not beside it; if the inline `group/help` span prevents wrapping, move `basis-full` handling to the label row by rendering the pinned copy as a sibling of the label (pass a `renderPinned` slot) — but try the simple form first.

### Task D2: `InputField` — the label row, the caption, no inline help

**Files:**

- Modify: `apps/web/components/calculator/calculator-form.tsx` (`InputField`, ~lines 911–1151)

- [ ] **Step 1: Import** `FieldHelp` from `./field-help`.

- [ ] **Step 2: Replace the `hasHint` / `describedBy` / `hint` block** at the top of `InputField` with:

```tsx
const id = `field-${input.id}`;
const help = input.helpText?.en;
const helpId = `${id}-help`;
const describedBy =
  [error ? `${id}-error` : help ? helpId : null, notice ? `${id}-notice` : null]
    .filter(Boolean)
    .join(" ") || undefined;
const units = unitOptions(input);

const selectedUnit = input.type === "numeric" ? (field.unit ?? input.unit.canonical) : "";
const range = acceptedRange(input, selectedUnit);
const shownError =
  error !== undefined && errorCode !== undefined
    ? displayInputError(input, selectedUnit, { code: errorCode, message: error })
    : error;

// THE ACCEPTED RANGE HAS TWO HOMES. The placeholder carries it while the
// field is empty; once a value is present or rejected this caption carries
// it, so it is on screen exactly when a value is being corrected. The
// always-visible sentence under every empty field is gone (2026-09-06).
const showCaption = range !== null && (field.raw !== "" || Boolean(error));

const labelRow = (text: React.ReactNode, htmlFor?: string) => (
  <span className="flex flex-wrap items-center gap-2">
    {htmlFor ? (
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-strong">
        {text}
      </label>
    ) : (
      <span className="text-sm font-medium text-ink-strong">{text}</span>
    )}
    {help ? <FieldHelp helpId={helpId} label={input.label.en} text={help} /> : null}
  </span>
);

const hint = error ? (
  <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-alert-text" role="alert">
    <span
      aria-hidden="true"
      className="numeric mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-alert-bg text-[11px] font-medium"
    >
      !
    </span>
    {shownError}
  </p>
) : null;

const caption = showCaption ? (
  <p className="numeric text-[12px] text-ink-muted">Accepted {range}</p>
) : null;
```

Keep `noticeLine` exactly as it is.

- [ ] **Step 3: Numeric branch.** Replace `<label htmlFor={id} …>{input.label.en}</label>` with `{labelRow(input.label.en, id)}`; after `</div>` (the input row) render `{hint}{caption}{noticeLine}`. The `<input>` keeps `placeholder={range ?? undefined}`, `aria-describedby={describedBy}`, `onWheel`, everything else.

- [ ] **Step 4: Option-group branch.** The `<legend>` keeps its id and text; render the ⓘ inside the legend row so the fieldset still has an accessible name:

```tsx
      <legend id={`${id}-legend`} className="text-sm font-medium text-ink-strong">
        {input.label.en}
        {!input.required && ( …optional badge unchanged… )}
      </legend>
      {help ? (
        <span className="-mt-1">
          <FieldHelp helpId={helpId} label={input.label.en} text={help} />
        </span>
      ) : null}
```

and after the Clear button render `{hint}{caption}{noticeLine}` (caption is always null for non-numerics since `range` is null there).

- [ ] **Step 5: Run the unit tests and the TM-001 scan.** `pnpm --filter @towardpcc/web test privacy-invariant accepted-range > "$TEMP/t.log" 2>&1; echo $?`.

### Task D3: the result rail

**Files:**

- Modify: `apps/web/components/calculator/calculator-form.tsx` (`ResultPanel`)
- Modify: `apps/web/content/site.ts` (`calculators:` strings)

- [ ] **Step 1: Strings.** In `site.ts` `calculators:` change `copyResult` to `"Copy summary"`, `copyLinkLabel` to `"Copy link"`, `sourceSuffix` is no longer rendered (leave it, or delete it and its comment), and replace `privacyLine` with:

```ts
    // ONE SENTENCE, AND A LINK TO THE REST (2026-09-06). The two facts the
    // long form spelled out — a link carries values only when you ask for
    // one, and a reload starts blank — live on /trust and on the Copy-link
    // button's title. Still architecturally true: nothing you enter reaches
    // the URL or a server until you press Copy link.
    privacyLine: "Runs entirely in your browser. Nothing you enter leaves this device.",
    privacyLinkLabel: "How",
    copyLinkTitle: "Builds a link carrying these values, only when you press it",
```

- [ ] **Step 2: Rail heading.** Import `shortName` from `@/content/score-description`. Replace `<h2 …>{c.resultHeading}</h2>` with:

```tsx
<h2 className="font-display text-lg font-medium text-ink-strong">
  {shortName(definition.name)}
  <span className="sr-only"> — {c.resultHeading}</span>
</h2>
```

- [ ] **Step 3: Band sentence.** Replace the `{band && (<p className="mt-1 text-sm text-ink-body"><span className="font-medium">{c.interpretationLabel}: </span>{band.label.en} — {band.description.en}</p>)}` with:

```tsx
{
  band && (
    <p className="mt-1 text-sm leading-relaxed text-ink-body">
      <span className="sr-only">{c.interpretationLabel}: </span>
      <span className="font-semibold text-ink-strong">{band.label.en}.</span> {band.description.en}
    </p>
  );
}
```

- [ ] **Step 4: Source line.** Replace its `<p>` content with `{c.sourceLabel}: {shortSource}` (drop the suffix).

- [ ] **Step 5: Actions.** Import `buttonClasses` from `@towardpcc/ui`. The three buttons become:

```tsx
<div className="flex flex-wrap gap-2" data-print="hide">
  <button
    type="button"
    onClick={onCopy}
    className={buttonClasses({ variant: "secondary", className: "flex-1" })}
  >
    {copied ? c.copied : c.copyResult}
  </button>
  <button
    type="button"
    onClick={onCopyLink}
    title={c.copyLinkTitle}
    className={buttonClasses({ variant: "secondary" })}
  >
    {linkCopied ? c.copied : c.copyLinkLabel}
  </button>
  <button
    type="button"
    onClick={() => window.print()}
    aria-label={c.printLabel}
    className={buttonClasses({ variant: "icon" })}
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-[18px]">
      <path
        d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  </button>
</div>
```

- [ ] **Step 6: Privacy line.** Replace the `<Callout tone="note" className="mt-6 text-[13px]">{c.privacyLine}</Callout>` with:

```tsx
<p className="mt-6 text-[12.5px] leading-relaxed text-ink-muted" role="note">
  {c.privacyLine}{" "}
  <Link
    href="/trust"
    className="rounded-sm text-accent-deep underline decoration-accent/40 underline-offset-2 transition-colors duration-150 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
  >
    {c.privacyLinkLabel}
  </Link>
</p>
```

(`Link` from `next/link`; a link to another PAGE is fine — only same-page fragments were ever the problem, and even those no longer clear field state.)

- [ ] **Step 7:** Also replace the two `rounded-pill border border-border-strong …` carried-value chips and the "Clear all values" / "Dismiss" text buttons in `CalculatorFormInner` with `buttonClasses({ variant: "secondary", size: "sm", className: "numeric" })` and `buttonClasses({ variant: "quiet", size: "sm" })`.

- [ ] **Step 8:** `pnpm --filter @towardpcc/web test button-idiom` — expected green (the rail no longer hand-rolls anything).

### Task D4: `TrustStrip` → one meta line

**Files:**

- Modify: `apps/web/components/calculator/score-meta.tsx` (`TrustStrip`)

- [ ] **Step 1:** Replace the body of `TrustStrip` (keep the export name so `[slug]/page.tsx` needs no import change):

```tsx
export function TrustStrip({ score }: { score: ScoreDefinition }) {
  const latest = [...score.changelog].sort((a, b) => b.date.localeCompare(a.date))[0];
  const validated = score.validators.every((v) => v.status === "assigned");
  // "3 Sep 2026", not "2026-09-03": a date a person reads, rendered on the
  // server so it is the same string for every visitor.
  const reviewed = latest
    ? new Date(`${latest.date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
  const items: { key: string; value: string; className?: string }[] = [
    { key: "Category", value: c.categoryLabels[score.category] },
    { key: "Version", value: `v${score.version}` },
    ...(reviewed ? [{ key: "Reviewed", value: `Reviewed ${reviewed}` }] : []),
    {
      key: "Validation",
      value: validated ? c.validatedByPrefix.replace(/[:\s]+$/, "") : "Validation pending",
      className: validated ? "text-success-text" : undefined,
    },
  ];
  /**
   * ONE QUIET LINE, not four labelled cells (2026-09-06). The keys survive
   * for screen readers; sighted readers get the values with a dot between.
   */
  return (
    <ul className="mt-4 flex list-none flex-wrap items-center gap-x-2.5 gap-y-1 font-numeric text-[12.5px] text-ink-muted">
      {items.map((it, i) => (
        <li key={it.key} className="flex items-center gap-2.5">
          {i > 0 ? (
            <span aria-hidden="true" className="size-[3px] rounded-pill bg-border-strong" />
          ) : null}
          <span className="sr-only">{it.key}: </span>
          <span className={it.className}>{it.value}</span>
        </li>
      ))}
    </ul>
  );
}
```

### Task D5: tabs as a segmented strip, short labels

**Files:**

- Modify: `apps/web/components/calculator/score-tabs.tsx`
- Modify: `apps/web/content/site.ts` (`formulaHeading`, `limitationsHeading`, `evidenceHeading`, `versionHeading`)

- [ ] **Step 1:** Before changing the four labels, `grep -rn "formulaHeading\|limitationsHeading\|evidenceHeading\|versionHeading" apps/web --include=*.tsx --include=*.ts` and confirm only `[slug]/page.tsx` reads them. Then set them to `"Formula"`, `"Notes"`, `"Evidence"`, `"Version"`. (The print stylesheet titles each panel from the same label, so the printed record reads "Formula", "Notes", … — acceptable.)

- [ ] **Step 2:** In `score-tabs.tsx` replace the tablist and tab classes:

```tsx
      <div
        role="tablist"
        aria-label="Score details"
        onKeyDown={onKeyDown}
        className="inline-flex flex-wrap gap-1 rounded-pill bg-surface-sunken p-1"
      >
        {items.map((item, i) => (
          <button
            …same attributes…
            className={cn(
              "inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-medium",
              "transition-[color,background-color,box-shadow] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active === i
                ? "bg-surface-raised text-ink-strong shadow-sm"
                : "text-ink-muted hover:text-accent-deep",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
```

Delete the scaled underline `<span aria-hidden>` and its comment; the selected segment is raised (fill + shadow + ink), a non-colour cue.

### Task D6: the formula as a labelled list

**Files:**

- Create: `apps/web/lib/formula-lines.ts`
- Create: `apps/web/lib/formula-lines.test.ts`
- Modify: `apps/web/app/(site)/calculators/[slug]/page.tsx` (the `formula` tab)

- [ ] **Step 1: Test first.**

```ts
import { describe, expect, it } from "vitest";
import { getScore } from "@towardpcc/scoring-engine";
import { formulaLines } from "./formula-lines";

describe("formulaLines", () => {
  it("splits PELOD-2's clause-labelled prose into labelled lines without changing a word", () => {
    const text = getScore("pelod2")!.formula!.en;
    const lines = formulaLines(text);
    expect(lines).not.toBeNull();
    expect(lines!.map((l) => l.label)).toEqual(
      expect.arrayContaining([
        "Neurologic",
        "Cardiovascular",
        "Renal",
        "Respiratory",
        "Haematologic",
      ]),
    );
    // Reassembled, it is the original text: the splitter only chooses breaks.
    const rebuilt = lines!.map((l) => (l.label ? `${l.label}: ${l.text}` : l.text)).join(" ");
    expect(rebuilt.replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " "));
  });

  it("returns null for prose with fewer than two clause labels, so the page keeps the paragraph", () => {
    expect(formulaLines(getScore("bsa-mosteller")!.formula!.en)).toBeNull();
  });
});
```

- [ ] **Step 2: Implementation.**

```ts
export interface FormulaLine {
  /** The clause label, e.g. "Neurologic"; undefined for the lead-in sentence. */
  readonly label?: string;
  readonly text: string;
}

/**
 * Lays out a formula paragraph as labelled lines when the prose itself
 * carries clause labels — "Neurologic: …", "Cardiovascular: …" — and leaves
 * it alone otherwise. It never changes a word: the test reassembles the
 * lines and compares them to the source. A label is a run of 2–28 letters,
 * digits, spaces, slashes or subscripts starting with a capital, at the start
 * of a sentence, followed by a colon and a space.
 */
const LABEL = /(?:^|(?<=[.;] ))([A-Z][A-Za-z0-9₀-₉/ –-]{1,27}): /g;

export function formulaLines(text: string): FormulaLine[] | null {
  const matches = [...text.matchAll(LABEL)];
  if (matches.length < 2) return null;
  const lines: FormulaLine[] = [];
  let cursor = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    const before = text.slice(cursor, start).trim();
    if (before) {
      if (lines.length === 0) lines.push({ text: before });
      else
        lines[lines.length - 1] = {
          ...lines[lines.length - 1]!,
          text: `${lines[lines.length - 1]!.text} ${before}`.trim(),
        };
    }
    cursor = start + m[0].length;
    lines.push({ label: m[1]!, text: "" });
  }
  const tail = text.slice(cursor).trim();
  if (tail)
    lines[lines.length - 1] = {
      ...lines[lines.length - 1]!,
      text: `${lines[lines.length - 1]!.text} ${tail}`.trim(),
    };
  // Fill each labelled line's text with what sits between it and the next label.
  let idx = 0;
  const out: FormulaLine[] = [];
  for (const line of lines) {
    if (line.label === undefined) {
      out.push(line);
      continue;
    }
    const start = (matches[idx]!.index ?? 0) + matches[idx]![0].length;
    const end = idx + 1 < matches.length ? (matches[idx + 1]!.index ?? text.length) : text.length;
    out.push({ label: line.label, text: text.slice(start, end).trim() });
    idx++;
  }
  return out;
}
```

Run the test; if the reassembly assertion fails on whitespace around the lead-in, fix the splitter, never the test's equality — the property is "no words change".

- [ ] **Step 3: Render.** In `[slug]/page.tsx` import `formulaLines` and replace the `formula` tab's `content`:

```tsx
      content: (() => {
        const text = score.formula?.en ?? "";
        const lines = formulaLines(text);
        if (!lines) return <p className="max-w-[58ch] leading-relaxed text-ink-body">{text}</p>;
        return (
          <dl className="grid max-w-[64ch] grid-cols-[minmax(6ch,max-content)_1fr] gap-x-4 gap-y-2 text-[15px] leading-relaxed">
            {lines.map((l, i) =>
              l.label ? (
                <div key={i} className="contents">
                  <dt className="pt-0.5 font-numeric text-[12px] font-semibold tracking-[0.02em] text-accent-deep">{l.label}</dt>
                  <dd className="m-0 text-ink-body">{l.text}</dd>
                </div>
              ) : (
                <div key={i} className="col-span-2 text-ink-body">{l.text}</div>
              ),
            )}
          </dl>
        );
      })(),
```

### Task D7: page furniture

**Files:**

- Modify: `apps/web/app/(site)/calculators/[slug]/page.tsx`

- [ ] **Step 1: Related cards** take the catalogue card's hover recipe: `rounded-lg border border-border bg-surface-raised px-5 py-4 transition-[border-color,translate,box-shadow] duration-[var(--motion-duration-enter)] ease-[var(--motion-ease)] hover:border-border-strong hover:shadow-xl motion-safe:hover:-translate-y-1 …` and show `shortName(r.name)` in display face with the tagline (`getScore(r.slug)?.tagline.en` — `related` comes from `listScores`, which now carries `tagline`) under it, dropping `v{r.version}` and the hidden "Open →".

- [ ] **Step 2: Disclaimer:** replace the section's `<h2>` + `<Callout>` with:

```tsx
<section className="mt-12 border-t border-border pt-6">
  <p className="max-w-[64ch] text-[13px] leading-relaxed text-ink-muted" role="note">
    <span className="font-semibold text-ink-body">{c.disclaimerHeading}. </span>
    {c.disclaimer}
  </p>
</section>
```

### Task D8: e2e — update what changed, add what is new

**Files:**

- Modify: `apps/web/e2e/reciprocal-unit-hint.spec.ts` — after `goto`, fill the heart-rate field with `60` before reading `#field-hr-help`… **no**: the caption is now a sibling `<p>` without that id. Change the locator to the caption under the field: `const hrHint = page.locator("#field-hr").locator("xpath=../..").getByText(/^Accepted /);` and fill `#field-hr` with `60` and `#field-qt` with `400` first so the captions render.
- Modify: `apps/web/e2e/composition.spec.ts` line ~266: button name `"Copy summary"`.
- Modify: `apps/web/e2e/out-of-range.spec.ts` line ~102: `getByText("Accepted 0 to under 216 months")` — the test fills `216` before it? Read the test; it asserts the placeholder AND the caption. Keep the placeholder assertion; move the caption assertion after the `fill("216")`.
- Create: `apps/web/e2e/field-help.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/**
 * Field guidance sits behind an info toggle (2026-09-06). The text must stay
 * the input's accessible description, appear on hover, pin on click, and
 * unpin on Escape — the touch path is the pin, not the hover.
 */
test.describe("field help toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calculators/pelod2", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /not now/i })
      .click({ timeout: 3000 })
      .catch(() => {});
  });

  test("is the input's description, hidden until asked for", async ({ page }) => {
    const age = page.locator("#field-age_months");
    const describedBy = await age.getAttribute("aria-describedby");
    expect(describedBy).toContain("field-age_months-help");
    const help = page.locator("#field-age_months-help");
    await expect(help).toBeHidden();
    await expect(help).toHaveText(/age band/i);
  });

  test("pins on click and unpins on Escape", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /about patient age/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#field-age_months-help")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#field-age_months-help")).toBeHidden();
  });

  test("the accepted range returns as a caption once a value is present", async ({ page }) => {
    await expect(page.getByText("Accepted 0 to under 216 months")).toHaveCount(0);
    await page.locator("#field-age_months").fill("47");
    await expect(page.getByText("Accepted 0 to under 216 months")).toBeVisible();
  });
});
```

- [ ] **Step 2:** Fixers, gate, then the calculator specs: `pnpm --filter @towardpcc/web test:e2e -- calculator field-help out-of-range reciprocal composition mobile-result-bar value-notice prism-window vis-units evidence-rail > "$TEMP/e2e.log" 2>&1; echo $?; grep -E "Running|passed|failed|flaky" "$TEMP/e2e.log"`. Expected all passed. Then the full suite once: `pnpm --filter @towardpcc/web test:e2e > "$TEMP/e2e-full.log" 2>&1; echo $?`.

- [ ] **Step 3: Commit and PR.**

```bash
git add apps/web/components/calculator/field-help.tsx apps/web/components/calculator/calculator-form.tsx apps/web/components/calculator/score-meta.tsx apps/web/components/calculator/score-tabs.tsx "apps/web/app/(site)/calculators/[slug]/page.tsx" apps/web/content/site.ts apps/web/lib/formula-lines.ts apps/web/lib/formula-lines.test.ts apps/web/e2e/field-help.spec.ts apps/web/e2e/reciprocal-unit-hint.spec.ts apps/web/e2e/composition.spec.ts apps/web/e2e/out-of-range.spec.ts
git commit -m "feat(calculator): field guidance behind an info toggle; a quieter rail and reference zone"
```

PR body names the one public-claim wording change (the privacy line) for the founder.

- [ ] **Step 4: After deploy,** check `/calculators/pelod2` and `/calculators/pim3` at 375 px and 1280 px: no help text visible at rest, ⓘ tooltip on hover, pin on tap, caption after typing, the number does not move, the printed page (`Ctrl+P` preview) shows all four panels.

---

# PR E — the session's markdown, once

Branch: `docs/design-revision`. After A–D merge.

- [ ] `docs/design/motion.md`: append "Revision 5 — 2026-09-06" (the addendum text is in the spec's last section).
- [ ] `docs/decisions/ADR-design-direction.md`: append "Part 6 — 2026-09-06: one button family, status as text" (text in the spec).
- [ ] `apps/web/CLAUDE.md`: under Design tokens add two bullets — every button takes `buttonClasses()` and `content/button-idiom.test.ts` guards the primary fill; field guidance is rendered by `components/calculator/field-help.tsx` and must stay the input's `aria-describedby` target.
- [ ] `LAUNCH-BLOCKERS.md`: a dated record entry under the design section pointing at the spec, the plan and the five PR numbers.
- [ ] `git add` the spec, this plan and the four files above; `pnpm format`; two consecutive `pnpm exec prettier --check` on the markdown; `pnpm gate` (markdown fast path); PR; merge.

---

## Self-review against the spec

- §3 buttons → A1, A2, A3, A7, A8, D3. §4 marks → A4, A5, A6, C2 (eyebrow, chip, ✓, kbd, Open→, version), D4 (instrument row), D3 (source, privacy). §5 catalogue → C1–C3. §6.1 → D1, D2; §6.2 → D2, D8; §6.3 → D3; §6.4 → D5, D6, D7; §6.5 → no task moves the number. §7 → B1–B4. §8 → C2 card hover and reveal; nothing on the form. §9 → each PR's gate and e2e steps. Addenda → E.
- Names used across tasks: `buttonClasses`, `buttonArrowClasses` (A2, used A4, C2 does not use the arrow helper — it draws its own arrow inside a span, deliberately, because the card's Open is not a button); `FieldHelp` (D1, used D2); `formulaLines` (D6); `TrustStrip` keeps its name (D4); `shortName` from `content/score-description` (C2, D3, D7); `tagline` on both `ScoreDefinition` and `ScoreSummary` (B1, read C2, D7, B4).
- One known judgement left to the implementer: the selected FilterChip's crimson fill trips the A3 guard; the plan says extend the guard's allow-list with a named exception rather than obscure the class string.
