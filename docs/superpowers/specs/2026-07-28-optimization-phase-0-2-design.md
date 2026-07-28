# Optimization pass, Phases 0–2 — design

**Status:** design, pending approval
**Date:** 2026-07-28
**Source:** `towardpcc-optimization-plan.md` (founder-supplied), verified against
the live site and the current branch before scoping.
**Amends:** `docs/design/motion.md` (count-up scope only).
**Does NOT amend:** `ADR-design-direction.md` — see §2.

---

## 1. What verification changed

Every defect claim in the source plan was checked against the deployed site and
the code. Four were true, three were true for different reasons than stated, and
several tasks describe work that already exists. The plan is good; it was
written from a snapshot that a week of changes had moved.

| Claim                                   | Verdict           | What is actually true                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 — five placeholder filenames visible | **partly**        | **Six** hints across five pages, and they are _not_ visually visible: all images return 200 and fully occlude the placeholder. `image-slot.tsx:56` applies `aria-hidden` only when `src` is **absent**, so the slots that _do_ have images announce "Mission photograph, care-nurse-smiling.jpg" to screen readers. A residual visual trace remains: every image is `loading="lazy"` with no priority, so the filename flashes before the above-the-fold hero paints. |
| D2 — stats contradict adjacent copy     | **partly**        | Real and reproducible, but it is count-up mid-flight, **not** a data error. `site.ts:418` already declares `value: 1` and `:464` `value: 3`. `pillar-page.tsx:105` renders `<Counter>`, which SSRs `0`. The band is **above the fold** (top 636px at 1280×900), so it fires at load. Computed: `value=3` shows "1" from 89–310ms.                                                                                                                                     |
| D3 — number fatigue                     | **understated**   | **14** figures before the pillars expressing only **9** distinct facts. "22" repeats 4×, "89" 3×. The two `<dl>`s share one section under an `sr-only` heading, so it reads as one unlabelled slab of eight animated numbers.                                                                                                                                                                                                                                         |
| D4 — evidence carousel is plain         | **half false**    | It is _already_ a native scroll-snap rail with 44px icon buttons; the review read `sr-only` labels as visible text. §6.6's headline ask is the current implementation. Real bug found instead: a dangling `aria-controls="evidence-track"` pointing at a non-existent id. The founder block _is_ plain — zero links despite naming two journals.                                                                                                                      |
| D5 — honeypot a11y defect               | **false**         | The wrapper is already `aria-hidden="true"`, the input `tabIndex={-1} autocomplete="off"`, positioned off-screen deliberately (`display:none` is bot-detectable). Not a WCAG defect. The real, smaller issue: the string is in extracted text, where it tells a scraping bot exactly what not to fill.                                                                                                                                                                |
| D6 — no structured data                 | **confirmed**     | Zero JSON-LD anywhere. But OG, Twitter, titles and canonicals are all present and correct — the gap is rich-results eligibility only.                                                                                                                                                                                                                                                                                                                                 |
| D7 — animation may not pause            | **already fixed** | Off-screen pause, tab-hide pause and DPR cap all exist. The gap is **test coverage**: nothing asserts any of the three, so all could be deleted with the suite green.                                                                                                                                                                                                                                                                                                 |
| D8 — thin footer                        | **confirmed**     | Logo, tagline, email, 10 links in three columns, two-item bottom bar.                                                                                                                                                                                                                                                                                                                                                                                                 |
| T0.4 — metadata                         | **partly**        | Four of five checks pass. Failing: 17 of 22 calculator descriptions exceed 160 chars, and all 22 share identical trailing boilerplate — distinct only by leading score name. All 22 also share one social preview.                                                                                                                                                                                                                                                    |

**Already built, contrary to the plan's task list:** BackToTop, elevation
tokens, border tiers and their two guards, sticky result rail, in-field accepted
ranges, interpretation tables, canonical tags, tabular-nums, reduced-motion
handling, print stylesheet, skeletons, StatusChip, RevealGroup.

**Does not exist, contrary to four tasks that say "extend it":** any test
asserting figures map to countable artifacts. It will be written, not extended.

## 2. Decisions taken

**The waveform stays scarce.** The plan's organizing premise — the waveform as
site-wide structural signature — directly inverts `ADR-design-direction.md`
("it appears nowhere else; it is the one memorable thing"). Founder decision:
keep the ADR. A mark used in six places is wallpaper. This cuts `WaveDivider`,
the waveform loader, the 404 waveform field, the founder waveform frame and the
OG family — roughly 40% of the source plan — and shifts the visual work onto
**depth, typography, elevation and section rhythm**, which is where the site is
genuinely flat: only four `shadow-*` usages exist across the entire codebase
despite the tokens shipping a week ago.

**Count-up narrows to the home band, as an amendment.** `motion.md` permits
count-up on "marketing figures only" — it does not restrict it to the home band,
so `pillar-page.tsx` is legal today. Tightening it is a spec change, not a
bugfix, and lands as a `motion.md` revision so the guard and the spec agree.

**Cut on invariant grounds, not taste:** the marquee (banned by name in
`motion.md:27` and `ADR:205`); the StatusChip pulse dot (recreates the exact
artifact `hero-motion.spec.ts:10` guards against); the CSP tightening
(`ADR-security-headers.md:20` records it empirically breaking hydration).

**Cut as duplicates:** `blush-100 #FDF1EC` measures **1.011:1** against the
shipped `--color-surface-sunken` — the alternation it promises is invisible.
`shadow-1/2/3` would mint utilities Tailwind does not emit while `--shadow-sm/md/lg`
stay live. New motion/radius token names would orphan every existing utility.

**Rejected on budget:** an icon library. Home has **14.7 KB** of headroom, which
is 48% of _all_ app code on the route (the framework floor is 122.8 KB of the
155.3 KB). The established convention is hand-inlined SVG in server components,
which costs exactly 0 route JS. Icons crossing a client boundary would cost
3–8 KB for capability inline SVG already provides.

**Deferred to their own specs:** Arabic/RTL, dark mode.

## 3. Phase 0 — credibility

**T0.1 Placeholder text.** Invert the `aria-hidden` condition in `image-slot.tsx`
so the decorative placeholder is hidden from assistive tech whenever an image is
present, and drop `hint` from the rendered output entirely — a filename is
authoring metadata, not content. Add `priority` to above-the-fold slots so the
hero photo does not paint after a gradient. Replace the empty-state design with
a **brand plate**: plum panel, faint monitor grid, honest caption. No waveform
(§2).
_Guard:_ e2e fails if any rendered text or accessible name matches
`/save as public\//i` or a bare image filename.

**T0.2 Count-up scope.** Remove the `Counter` import from `pillar-page.tsx`;
hero stats render final values at first paint. Amend `motion.md` to state the
home-band restriction and why. Write the countable-figures unit test the plan
assumes exists, covering `/`, `/data` and `/services`.
_Guard:_ source scan asserts `Counter` is imported only by the home band.

**T0.3 Honeypot text hygiene.** The a11y attributes are already correct. Change
the visually-hidden label so it does not announce its own purpose to a text
scraper.

**T0.4 Metadata.** Per-score descriptions under 160 chars, replacing the shared
130-char boilerplate. Per-calculator `openGraph.title`/`description` so 22 pages
stop sharing one social preview.
_Guard:_ test asserts every route's description ≤160 chars and that no two
calculator descriptions are identical after the leading score name.

**T0.5 JSON-LD baseline.** `Organization` + `WebSite` on the root layout,
`BreadcrumbList` site-wide, `MedicalWebPage` + `SoftwareApplication` (price 0,
offline-capable) per calculator. Inline `<script type="application/ld+json">`
has no `src`, so it is invisible to the JS budget.
_Guard:_ schema shape test in CI.

**T0.6 Animation pause guard.** Code already correct; add the missing negative
assertions — rAF ≈ 0 when scrolled away, and on `visibilitychange`.

**T0.7 Evidence rail `aria-controls`.** Fix the dangling reference to a
non-existent id.

## 4. Phase 1 — depth, not decoration

**Type.** Add `display-1` `clamp(2.75rem, 5.5vw, 4.5rem)` for the home hero
only; the existing 48px H1 stays for inner pages. Add an `eyebrow` step. Keep
both shipped families.

**Elevation, used rather than added.** The tokens exist and are almost unused.
Apply `--shadow-sm/md/lg` across cards, figures and floating surfaces, plus a
1px inner top highlight `rgba(255,255,255,.06)` on dark panels so cards read as
placed rather than floating.

**Icons.** One consistent inline-SVG set, 1.5px stroke, authored as server
components following `waveform-edge.tsx` and `page-hero.tsx`. Zero route JS.

**Section rhythm.** Alternate surfaces using the _existing_ `--color-surface-page`
and `--color-surface-sunken`; no new tint. Consistent vertical spacing scale
between bands.

**Loading (§5, waveform removed).** Inline critical CSS so the first frame is
the brand; LCP element is the H1. `ScrollProgress` 2px crimson bar for client
navigations over 300ms (~0.5 KB, the only genuinely new client JS in this
phase). Form submit states in place. No full-screen gate — `motion.md:26` bans
preloaders outright.

## 5. Phase 2 — home

**Consolidate the numbers (D3).** 14 figures expressing 9 facts becomes one
proof band of four countable artifacts: `22 referenced calculators` ·
`89 literature citations` · `64,388 library pages indexed` ·
`100% engine test coverage`. Give the merged band a visible heading — it
currently has only an `sr-only` one. Migrate `10+ years` to the founder block
and `7+ studies` / `<5 working days` to `/services`, where they inform a
decision. Remove the duplicate "22" from the hero eyebrow and the floating photo
badge.

**Hero.** Raise the headline to `display-1`. Keep the canvas. The three figures
become a hairline-separated row; "0 bytes transmitted" gains a footnote link
reading "proven by test →". That link's target (`/trust`) is Phase 3, so it
points at `/legal/data-protection` until then rather than shipping a dead link.

**Bridge cards, pillar cards.** Icon, elevation, hover lift, crimson top rule on
reveal, `RevealGroup` stagger with 60ms.

**Evidence rail.** Already the right implementation. Add dot indicators,
end-state disabling, edge-fade masks, and fix the `aria-controls` bug.

**Founder block.** Currently zero links despite naming two journals. Add the two
publications as resolved DOI links, credentials as quiet chips, and the migrated
`10+ years`. Keep the existing brand-waveform image — it is one of the ADR's two
sanctioned uses.

**Footer.** Four columns, the two load-bearing claims as badges, scholar links
rendered only when supplied (the row omits cleanly when absent).

## 6. Sequencing

One batch is the wrong shape for the token work specifically: this repo has
already shipped a bug where a guard passed because it asserted a token the UI
was not using. Tokens land separately from their consumers, and no token is
consumed before its guard row exists.

1. `motion.md` amendment + `image-slot` fix + count-up removal (Phase 0 core)
2. Budget instrumentation — per-route deltas printed **before** any spending
3. Remaining Phase 0 in parallel: metadata, JSON-LD, honeypot, guards
4. Phase 1 tokens + guard extensions, then Phase 1 components
5. Phase 2 home, structure first, then the stat merge alone

The calculator route is excluded from this batch entirely: `/calculators/[slug]`
carries the zero-network and no-query-string guards, and §7.2's share control is
precisely the feature most likely to trip them. It gets its own change.

## 7. Verification

Every existing guard re-run: 712 unit, 59 e2e, budget, typecheck, lint, the six
CI jobs. New guards from §3. Home must finish under **+2 KB** route JS — the
plan's own +8 KB allowance is 54% of remaining headroom for work that is almost
entirely CSS.
