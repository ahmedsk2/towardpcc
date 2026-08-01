# Site functionality review — 2026-08-01

Target: `http://localhost:62726` (Next.js dev server) at commit `3d4d4a4`, branch `polish/pre-launch`.
Method: six parallel browser-driven sweeps (Playwright/Chromium), then a second adversarial pass
that tried to refute every non-minor finding before it was allowed into this document.

---

## Verdict

**Not fit to launch today — but one fix stands between it and that, and the clinical core is
already sound.** The thing that has to be fixed is `/contact`: every submission after the first
from a given page load is silently thrown away while the visitor is shown "Message sent. Thank
you. We've received your message and will reply by email." It fires on the most ordinary path
there is — mistype a field, get told, correct it, resubmit — and it affects all four public forms.
A clinician who writes to this team about a score will be told their message was delivered when it
was not. That is a launch blocker on its own. The second-most serious defect is not a wrong
computed number but a wrong _instruction_: on 45 numeric fields the "Accepted range" hint and the
placeholder are pinned to the canonical unit and never follow the unit the clinician has actually
selected, so a VIS vasopressin field with `milliunits/kg/min` selected literally reads
`0–0.01 units/kg/min` — and typing what the box asks for yields VIS 0.0 instead of 5.0, silently,
on the exact field whose own source comment calls it "a documented 1000x error trap." Everything
else is repairable in a day: an unfiltered `sessionStorage` write that contradicts three privacy
claims, 15 dead anchors, an unannounced result region, a mobile drawer with no focus containment,
and a floating button that eats unit-toggle taps below 1024px. **What is genuinely finished is the
part that matters most.** All 23 published calculators were driven in a browser and every rendered
number compared character-by-character against the scoring engine (23/23 exact), then 26
independent hand-computed worked examples were run against the published formulas (26/26 exact).
The zero-network promise is literally true — 0 requests after load across all 23 calculators. No
value drifted without being typed, out-of-range values are rejected rather than clamped, malformed
URL fragments degrade safely, and 89 of 91 citations resolve. Nothing found in this review makes
the site display a wrong score.

**Blocking launch:** finding 1.
**Should not launch with:** findings 2–8.
**Everything else can follow the release.**

---

## Confirmed findings

Findings 1–11 were each reproduced twice: once by the sweep that found it, then again by a
separate verifier whose brief was to knock it down. All 11 survived. Severity was corrected on
four of them (see _Corrected and refuted_).

### 1 · CRITICAL — Every form submission after the first is silently discarded while the user is told "Message sent"

**Breaks:** all four public forms — `/contact`, `/services`, `/knowledge`, `/data`. Submission #2
onward within a single page load returns the success panel without being validated, rate-limited,
stored, or emailed. An entirely empty form is accepted.

**Where:** `apps/web/components/forms/submission-form.tsx:48-50` and `:124` →
`apps/web/lib/submission-guards.ts:57` → `apps/web/lib/submissions.ts:118-124`.

**Reproduce:** load `http://localhost:62726/contact`, wait 3s (past the 2500 ms time-trap), submit
the form completely empty — you correctly get three field errors. Submit it completely empty again
without typing anything: "Message sent. Thank you. We've received your message and will reply by
email."

**Mechanism, proven on the wire.** React 19 auto-resets an uncontrolled `<form action={fn}>` once
the action settles. The reset restores the hidden stamp `<input name="t" defaultValue="0">` to
`"0"`, and the `useEffect` that stamps it has `[]` deps so it never re-runs. `classifyDrop` reads
`0` as `"no-timestamp"` and `handleSubmission` returns `{ok:true}` at `submissions.ts:123` — above
the rate limiter, above Zod, above the DB write. The decisive evidence is two submits in one page
load, seconds apart, same IP: submit #1 returned
`{"ok":false,"error":"Too many messages from here…"}` and submit #2 returned `{"ok":true}`. The IP
was demonstrably over the limit; the only `return {ok:true}` upstream of the limiter is the drop
branch. Verified individually on all 4 forms. The first submission on any page load works
correctly.

**Fix:** re-apply the stamp after React resets the form — stamp in the submit handler, or key the
effect on the action state, or send a server-rendered signed render-time instead of a resettable
`defaultValue`. A form must never report delivery for a submission it discarded.

---

### 2 · MAJOR — A validation error wipes every field the user typed

**Breaks:** the same four forms. One bad character in the email destroys a long free-text message
with no recovery. This is also the root cause of finding 1 — the same reset clears the anti-bot
stamp.

**Where:** `apps/web/components/forms/submission-form.tsx:72-94` (inputs carry no
`value`/`defaultValue` inside a form React resets); `apps/web/lib/submissions.ts:144` returns
`{ok, error, fieldErrors}` and never echoes the submitted values.

**Reproduce:** `/contact`, wait 3s, fill name, email `bad-email`, and a 230-character message.
Submit. All three fields are empty; the textarea's `.value`, `.defaultValue` and `.textContent` are
all `""` and the text is unrecoverable. Confirmed on all 4 forms (`/services`, `/knowledge`,
`/data` each blank every field including the 230-char textarea).

**Fix:** return the submitted values from the action and render them as `defaultValue`, so a
validation failure asks the user to correct one field rather than retype everything. Fixing this
correctly also fixes finding 1.

---

### 3 · MAJOR — "Accepted range" and placeholder never follow the selected unit; VIS reads `0–0.01 units/kg/min` while the correct entry is 0.5

**Breaks:** 45 numeric inputs across the published scores whose alternate unit genuinely changes
the number. The stated bound and the value the field accepts disagree.

**Where:** `apps/web/components/calculator/calculator-form.tsx:654-657` builds the string from
`input.min`/`input.max`/`input.unit.canonical` and never consults `field.unit`; that one string
feeds both the hint (`:681`) and the `placeholder` (`:700`). Same defect class at
`packages/scoring-engine/src/validation.ts:62`, which hardcodes `input.unit.canonical` into the
out-of-range error.

**Reproduce:** `/calculators/vis`, switch vasopressin to `milliunits/kg/min`. The empty box reads
`0–0.01 units/kg/min`. Type what it asks for — `0.0005` — and you get **no error and Result 0.0**,
where the correct entry (0.5) gives 5.0. A silent 1000x under-score reached by following the
field's own guidance. Also: `/calculators/qtc` heart rate shows "Accepted 30–250 bpm" while `ms` is
selected and the help text invites entering the R–R interval (600); `/calculators/pf-ratio` FiO₂
shows "0.21–1 fraction" while `%` is selected; `/calculators/holliday-segar` weight shows
"0.5–150 kg" while `lb` is selected.

**Fix:** express the accepted range, the placeholder and the out-of-range error in the unit
currently selected, converting the bounds rather than printing the canonical ones.

---

### 4 · MAJOR — Calculators write every numeric input to `sessionStorage` and accumulate them across the session, contradicting the site's own "complete picture" privacy table

**Breaks:** the privacy claim, not the network promise. Nothing is transmitted (0 non-GET requests
across the whole session, `localStorage` empty throughout) — this is undisclosed local persistence.

**Where:** `apps/web/components/calculator/calculator-form.tsx:304-320` calls `remember()` on every
numeric field, guarded only by `i.type !== "numeric" || raw === ""`. The `CARRIED_IDS` allow-list
(`age`, `age_months`, `weight`, `weight_kg`) at
`apps/web/components/calculator/use-carried-values.ts:67` is applied on the _read_ side only. Its
own comment reads "The inputs worth carrying. Nothing clinical — the patient's size, only."

**Reproduce:** fill `/calculators/psofa` to a computed score, then read
`sessionStorage['towardpcc:carried']` → 10 entries. Without clearing, visit `/calculators/anion-gap`
(→15), `/calculators/qtc` (→17), `/calculators/burn-resuscitation` (→19). Each entry is
human-labelled, e.g.
`{"id":"creatinine","raw":"1.42","unit":"mg/dL","label":"Serum creatinine"}` — a readable
physiologic snapshot of one child persisting for the life of the tab. Meanwhile
`/legal/data-protection` says "This table is the honest, complete picture of what each part of the
site collects today", lists Calculators → "Nothing", lists browser storage as favourites and the
install prompt only, and closes "Calculator use leaves nothing to delete." `grep` finds no
user-facing mention of session storage anywhere in `content/` or `app/`.

**Fix:** filter `remember()` by `CARRIED_IDS` so the store holds what it advertises. ("Clear all
values" does remove the key — verified — but it is an undocumented remedy for an undocumented
store.)

---

### 5 · MAJOR — Blocking-field links are dead anchors for every categorical and boolean input

**Breaks:** 15 of 15 required non-numeric inputs, across 7 of 23 calculators (`pim3`, `prism`,
`pelod2`, `psofa`, `phoenix`, `ideal-body-weight`, `pediatric-gcs`). The "Waiting on" links in the
result rail carry sr-only text "Go to" and do nothing.

**Where:** `apps/web/components/calculator/calculator-form.tsx:643` computes ``id = `field-${input.id}` ``;
the numeric branch puts it on the `<input>` at `:695` (those links work), but the categorical
branch's `<fieldset>` at `:767` has no `id` at all — only the `<legend>` at `:779` gets
`${id}-legend`. The href at `:907` is a hardcoded `` `#field-${b.id}` `` with no JS handler
anywhere in the app.

**Reproduce:** `/calculators/pim3`, select "No" for "Pupils fixed to bright light" only, click
"Recovery from a procedure" in the rail. `window.scrollY` stays 0, `document.activeElement` remains
the `<a>`, and `document.getElementById('field-recovery_category')` is `null`. Control: the same
control works on `/calculators/anion-gap` (scrolls 0→507, focus lands on `INPUT#field-cl`). Worst
at 390×844, where the target legend sits 1408px above the viewport after the click.

**Fix:** put `id={id}` on the `<fieldset>` — but note that a `<fieldset>` is not focusable, so
reaching parity with the numeric branch also needs `tabIndex={-1}` on it or an explicit focus of
the first radio.

---

### 6 · MAJOR — The result's `aria-live` region is created in the same DOM mutation as its content, so the first computed score is never announced

**Breaks:** the entire output of a scoring tool, for screen-reader users, at the most common
interaction — the first compute. Later in-place updates announce correctly.

**Where:** `apps/web/components/calculator/calculator-form.tsx:938-942` — the `aria-live="polite"`
div sits inside the `ok` branch of the ternary opened at `:890`, so it cannot exist until a result
exists.

**Reproduce:** load `/calculators/psofa`; `document.querySelectorAll('[aria-live]').length` → 0.
Fill to a valid score → 1, containing "Total pSOFA 3". Tag that node `data-probe="A"`, change GCS
15→8: the node survives and re-announces (6). Clear FiO₂ → count returns to 0. Restore FiO₂ → a
region exists again but `data-probe` is gone: a brand-new node. Same on `/calculators/prism`. The
only other live region at load is Next's empty `<next-route-announcer>`; focus stays on the last
field typed.

**Fix:** render an always-mounted empty live container in both the blocked and computed branches.
The codebase already implements this correctly at
`apps/web/app/calculators/calculators-index.tsx:162-168`, whose comment states the rule: a region
that appears at the same moment its text does "often goes unannounced: the screen reader has
nothing to diff against." WCAG 2.1 SC 4.1.3 (AA).

---

### 7 · MAJOR — Mobile nav drawer has no focus containment, does not move focus on open, and drops focus to `<body>` on Escape

**Breaks:** the only navigation surface below 1024px (the desktop `<nav>` is `hidden lg:block`),
three ways at once.

**Where:** `apps/web/components/nav/main-nav.tsx` — drawer at `:252-317`; the Escape handler at
`:52-59` calls `triggerRef.current?.focus()` for the mega-menu at `:56` but nothing for the drawer
at `:58`. Only the scroll lock (`:72-79`) is implemented.

**Reproduce:** `/` at 390×844. Focus `button[aria-controls="nav-drawer"]`, press Enter — focus is
still on the hamburger, outside the drawer. Tab 1 reaches the scrim close button, Tabs 2–9 stay in
the drawer, **Tab 10 lands on the hero link "Explore the calculators"**, which `elementFromPoint`
confirms is occluded by the drawer panel itself. `main` and `header` both report
`aria-hidden=null`, `inert=false`. Separately: open, Tab ×4 to the in-drawer "Knowledge" link,
press Escape → `document.activeElement === document.body`. The drawer has no `role="dialog"`, no
`aria-modal`, no `aria-label`. Control: the mega-menu on the same component restores focus to its
trigger correctly.

**Fix:** move focus into the drawer on open, contain Tab while open, mark the background `inert`,
and restore focus to the hamburger on Escape — mirroring the mega-menu path 200 lines above. Note
the file's own docblock at `:30` and `:71` already claims this behaviour.

---

### 8 · MAJOR — The fixed "Back to top" button covers unit toggles on calculator forms below 1024px and swallows the tap

**Breaks:** unit selection on the mobile widths a bedside clinician is most likely to use. Five
PRISM fields at 375px, three at 320px; `pim3` and `psofa` each have 16 labels sharing the FAB's
horizontal column at 375px.

**Where:** `apps/web/components/nav/back-to-top.tsx:39` (`fixed end-6 z-[90] grid size-12 …
bottom-6`), mounted globally at `apps/web/app/layout.tsx:93`.

**Reproduce:** `/calculators/prism` at 320×812, scroll to y≈2627. The kPa label occupies
`[245,742,51,44]`, the FAB `[248,740,48,48]` — 95% covered; `elementFromPoint` at the label's
centre returns the Back-to-top button. A real tap leaves the unit at mmHg and scrolls to y=0.
Reproduced at 375px and 768px. Zero overlaps at 1024/1440/1920px, where the two-column layout puts
the FAB over the gutter. Control: the same toggle clear of the FAB works. Typed values survive the
swallowed tap.

**Fix:** reserve end padding on the form column below 1024px, or move the FAB clear of the content
column, or suppress it while an interactive control is under it.

---

### 9 · MINOR — Clicking a blocking-field link overwrites the value-bearing URL fragment

`/calculators/anion-gap`: type Na 140 / Cl 104 (`#na=140~mEq%2FL;cl=104~mEq%2FL`), click the
"Serum bicarbonate" link → fragment becomes `#field-hco3`. Reload → every field empty. Cause: the
bare `href` at `calculator-form.tsx:907` writes the hash, and the mirror effect at `:158-162`
depends on `[state]` so it never undoes it. **Mitigations that cap this at minor:** the desync
self-heals on the very next keystroke, the Copy-link button does not render in the blocked state
(so a valueless link cannot be copied through the UI), and on-screen values are unaffected. The
reporter's claim that Back recovers the values is false _after_ a reload — verified. Fixed by
finding 5's remedy if the jump is done programmatically instead of via `location.hash`.

### 10 · MINOR — The same FAB covers the "Add to favorites" star on `/calculators`

At 375px, scrollY 600 (reached by realistic stepwise or wheel scrolling — a direct `scrollTo` lands
at 580 because of sticky-header scroll anchoring, which is why a naïve repro misses it): star
`[307,731,44,85]`, FAB `[303,740,48,48]`, 56.5% covered, FAB owns the centre. Clicking scrolls to
top and `towardpcc:favorites` stays `null`. 13 of 21 sampled scroll positions overlap; 10 capture a
centre. **Capped at minor:** the star is 85px tall and the FAB covers only its middle 48px — in a
26-click sweep only 3 misfired — and keyboard activation works perfectly. No clinical surface
touched.

### 11 · MINOR — The home page publishes two different calculator counts on one screen

`apps/web/app/page.tsx:277` is a hardcoded `<Counter value={22} />` labelled "calculators, live
today". Bare "22" appears exactly once on the page; bare "23" exactly four times (hero eyebrow,
hero trust stat, counters band, pillar card), and the pillar body spells "Twenty-three". Registry
ground truth is 23. Directly below sits the line "Every figure here is something you can go and
count. Nothing on this page is an estimate." `content/figures.test.ts` passes 34/34 because its two
`app/page.tsx` regexes anchor on `{ label: "Scores", value: "(\d+)" }` and the spelled-out phrase,
and a bare `Counter` literal matches neither. **Fix:** derive from
`listScores({status:"published"}).length` and extend the guard to bare `Counter` literals.

---

## Minor observations (single-pass, evidence cited, not adversarially re-verified)

These were each observed directly with a URL or `file:line`, but the verification pass was reserved
for non-minor findings, so they carry one round of evidence rather than two.

**Citations and claims**

- **Two dead citation "Source" links**, found independently by 4 of the 6 sweeps.
  `/calculators/pim3` → the ANZICS PIM2/PIM3 booklet PDF returns **404** (anzics.org root is 200);
  `/calculators/apls-weight` → `https://www.alsg.org/en/?q=APLS` returns **500** on 4/4 attempts
  (alsg.org root is 200). Defined at `packages/scoring-engine/src/scores/pim3.ts:196` and
  `apls-weight.ts:63`. PIM3 already discloses its own 404 in the adjacent note; APLS does not.
- **`/trust` overclaims**: "a citation you cannot follow is not possible." The build gate
  (`registry-gate.test.ts`) checks a locator is _present_, not that it _resolves_. Either soften
  the sentence or extend the gate to fetch locators.
- **Privacy copy on `/`, `/about` and `/install`** says "Nothing you enter is transmitted **or
  stored**" (`content/site.ts:96`, `:313`, `:841`), which the calculator's own honest line at
  `:968` contradicts — values are mirrored into the address bar on every keystroke.
  `/legal/data-protection` is already precise and needs no change.
- **`/validation` meta description** says "all 22" (`app/validation/page.tsx:28`) while the page
  body renders 23 from the registry.
- **All 23 calculator pages emit no `og:image`** and downgrade `twitter:card` to `summary`
  (`app/calculators/[slug]/page.tsx:50-51`) — Next shallow-merges `openGraph`/`twitter`, so the
  page-level object replaces the root layout's. The 23 pages most likely to be shared render as
  bare text links.

**Forms and interaction**

- **Raw Zod strings shown to users** on 5 fields across `/services`, `/knowledge`, `/data`:
  "Too small: expected string to have >=1 characters". Cause: `lib/submissions.ts:25-26` calls
  `.min(1)` with no message, unlike the neighbouring name/email/message schemas.
- **Drawer link for the current page is inert** and leaves the drawer open with the body still
  scroll-locked (`main-nav.tsx:39-42`, open state derived as `drawerAt === pathname`). Affects the
  large red "Open the calculators" CTA on `/calculators`.
- **Carousel dots 4 and 5 can never be current** on desktop (`components/home/evidence-carousel.tsx:41-48`):
  max `scrollLeft` 944 ÷ step 440 caps the index at 2, so clicking dot 5 highlights dot 3. Correct
  at 375px.
- **Submitting `/contact` drops focus to `<body>`** (`submission-form.tsx:133-142`, `disabled={pending}`
  on the focused button); the result is still announced via `role="status"`/`role="alert"`.
- **Wheel-scrolling past a half-typed number field fires a premature range error.** The `onWheel`
  blur at `calculator-form.tsx:712` marks the field committed, so typing "1" toward 7.25 on PRISM's
  pH field shows "must be between 6.5 and 8" mid-keystroke — the exact failure the blur-gated
  validation at `:186-190` was written to prevent. The wheel fix itself is correct and worth
  keeping (0 value changes in 8 tests); it just should not count as a real blur.

**Accessibility and layout**

- **Homepage stats use an invalid `<dl>`** (`app/page.tsx:379-401`): two `<div>` levels between
  `<dl>` and its pairs, and `<dd>` emitted before `<dt>`. axe reports 2 serious WCAG 1.3.1
  violations over 9 nodes; a screen reader reads eight unassociated strings.
- **`prefers-reduced-motion` not honoured** by the sticky header height transition
  (`components/nav/sticky-shell.tsx:46-47`, all routes, scroll-triggered so unavoidable) and by 10
  hover-lift elements (`app/page.tsx:227`, `:440`; `app/calculators/[slug]/page.tsx:222`). The
  carousel at `evidence-carousel.tsx:100` already uses `motion-safe:` correctly. Under `reduce`
  there are 0 keyframe animations and no hidden content.
- **The utility bar sits outside every landmark** (`components/nav/utility-bar.tsx:12`, a direct
  child of `<body>`), so landmark navigation skips the site's contact email and LinkedIn link. axe
  `region` violation on all 6 routes tested.
- **`#evidence-track` is a focusable scroll container with no role and no accessible name**
  (`evidence-carousel.tsx:88-95`) — an unexplained tab stop.
- **"Skip to content" lands with the breadcrumb under the sticky header**: `main#content` has
  `scroll-margin-top: 0px` against a 64px stuck header. The 8 `#cat-*` headings on `/calculators`
  have the same problem when deep-linked.
- **Per-field "Clear" buttons print into the paper record** — 6 on PRISM, 3 each on `pediatric-gcs`
  and `phoenix`, 2 on `pelod2`, 1 each on `psofa` and `kdigo-aki`. `calculator-form.tsx:807-816`
  lacks the `data-print="hide"` that every other interactive control carries.
- **Text below 12px** across the chrome: 39 distinct signatures, smallest 10px, identical at all 6
  widths. The one that matters clinically is "Optional — blank scored as normal" at 11px on the
  PRISM form, which states scoring semantics.
- **Touch targets under 44×44** at 375px, 20–29 per route, concentrated in header and footer. The
  notable one is the 38×38 "Menu" button — the only navigation control below 1024px. The calculator
  forms themselves pass (inputs, unit toggles and radio labels all measure 44px).
- **No favicon anywhere**: no `<link rel="icon">` is emitted, and `/favicon.ico`,
  `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` all 404, despite
  `appleWebApp.capable = true` and correct icons already sitting in `public/` and wired into the
  manifest. Android PWA install is unaffected.

---

## Corrected and refuted on verification

Nothing that reached the second pass was overturned outright — all 11 were confirmed. What the
adversarial pass did change:

**Four severity downgrades.** _Back-to-top over the PRISM unit toggle_ critical→major: the toggle
visibly stays on mmHg, typed values survive, and the failure announces itself by jumping to the top
of the page — no silent wrong number. _Blocking-link fragment overwrite_ major→minor: it self-heals
on the next keystroke and the Copy-link button is unreachable in the blocked state. _FAB over the
favorites star_ major→minor: 3 of 26 overlapped clicks actually misfired, keyboard works, and
favourites is an organisational convenience. _Home page 22-vs-23_ major→minor: a catalogue count in
a marketing section, no clinical value affected.

**Two claims inside otherwise-confirmed findings were disproved.** "Browser Back restores the
fragment and the values" — true only before a reload, i.e. only when nothing had been lost; after
the reload Back restores the fragment but not the values. And "a link copied at this moment carries
no values" — the result rail renders zero buttons while blocked, so the bad link is only obtainable
by hand-copying the address bar.

**One proposed fix was wrong.** Finding 5's "the target is one attribute away" understates it: an
`id` on the `<fieldset>` gets the scroll but a `<fieldset>` is not focusable, so focus parity needs
`tabIndex={-1}` or an explicit focus of the first radio.

**Counts corrected downward.** The FAB overlap sweep was inflated roughly 1.7× (reported 62/63/52
positions at 320/375/768px; re-measured 37/32/29 — the centre-capture figures, which are the ones
that matter, held at 3/6/5). The dead-anchor census differed 12-of-41 vs 14-of-50 purely on which
field was pre-filled; the stable figure both agree on is 15 of 15 required non-numeric inputs.

**Candidates investigated and deliberately not reported**, because they were measurement artifacts
or environmental rather than defects:

- `https://www.cpccrn.org/calculators/prismivcalculator/` returns 503 — but so does the cpccrn.org
  root, which makes it a Wordfence block on this IP, not a dead link. `prism.ts` already documents
  the 503.
- 36 `doi.org` 403s are Cloudflare bot challenges and LinkedIn's 999 is an authwall; all resolve for
  a human. Every one of the 91 citations was re-checked through NCBI esummary (60 PMIDs) and the DOI
  handle API / Crossref (59 DOIs) rather than by naïve fetch.
- `/knowledge`, `/legal/terms` and `/legal/disclaimer` timed out on `networkidle` on first crawl —
  dev-server first compile. On retry: 281ms, 96ms, and 3 consecutive 1037/976/1003ms loads.
- "Two elements wider than the viewport" on every page are the anti-spam honeypot at
  `-left-[9999px]` and an SVG group clipped by its own `<svg>`.
- ~30 apparent text overlaps on `/knowledge`, `/data` and `/services` are collapsed FAQ accordions
  (`grid-rows-[0fr]`, parent `height:0; overflow:hidden`). Real overlap count: 0.
- Images carry no `width`/`height` attributes, but use `next/image` `fill` inside `aspect-[…]`
  wrappers (`components/image-slot.tsx:116-120`), so space is reserved — corroborated by CLS of
  0.0074–0.0238 across all 16 measurements.
- "23live", "9inputs", "Sepsis1" were a text-node extraction artifact; rendered `innerText` is
  correct.
- `[NEEDS SOURCE]` renders on `/trust` and 4× on `/calculators/pim3` — that is the site's
  deliberate, documented honesty convention, explained on `/trust` itself.
- The offline/PWA claim was **not tested**: the dev server serves a stale `sw.js` build artifact, so
  precache behaviour would not be representative. No claim is made about it either way.

**On scale.** A previous review of this codebase estimated "~25 simultaneous errors" where the real
figure was 2. Every number in this document was counted. For the record: across all 37 public
routes there is exactly **1** console error site-wide (the 404 page's own 404 status) and **0**
failed requests.

---

## What was checked

**Routes.** All 45 URLs the app serves, enumerated by reading every file under `apps/web/app`: 13
static public pages, 23 calculator slugs, 6 admin routes, 3 deliberately bad URLs. All 36 public
routes returned 200 with exactly one `<h1>`, a distinct `<title>`, a canonical, and no placeholder
content. All 6 admin routes 307 to `/admin/login` (confirmed by curl, not a soft 200). Bad URLs
render the real 404 with HTTP 404. `/sitemap.xml` lists exactly 36 URLs — byte-for-byte the set of
public routes that return 200 — with `/admin` and `/api` absent and `Disallow`ed in `robots.txt`.

**Calculator correctness — the main effort.** All 23 score definitions were dumped from
`@towardpcc/scoring-engine`, then each calculator was driven in Chromium with identical inputs and
the rendered numbers compared character by character: **23/23 exact**. Independently, **26
hand-computed worked examples** were run against the published formulas (ETT size ×3 formulas,
Holliday-Segar 100-50-20 and 4-2-1, Mosteller BSA, corrected calcium, anion gap ×3 variants,
corrected sodium Katz and Hillier, P/F, S/F, Smithline-Gardner osmolality, OI, OSI, VIS across all
six agent weights, pediatric Parkland + maintenance, APLS, QTc Bazett and Fridericia, Traub-Kichen
and simplified IBW, pGCS at 15 and 3, KDIGO stages 1/2/3 by creatinine and stage 3 by urine output,
pSOFA, Phoenix) — **26/26 exact**. A second sweep hand-checked all 23 again independently (PELOD-2
7 → 3.49%, PIM3 logit −2.6540 → 6.57%, PRISM III 11 → 11.09%, pSOFA 10 with subscores 3/1/0/3/2/1,
Phoenix 5 with 2/1/2/0, VIS 25.0, QTc 516/474). Unit alternates round-tripped on 6 fields including
the PELOD-2 creatinine 59 µmol/L threshold either side. **Registry ground truth: 23 published
scores, 91 citations** — the brief's "24 calculators" is one too many.

**Privacy and safety behaviours.** Zero network requests after page load while filling all 23
calculators. A fully-filled pSOFA plus Copy result, Copy link, Print and all four Evidence tabs
produced 53 requests, none carrying an entered value in URL, headers or body. State lives in the
fragment, never a query string; `Referrer-Policy: strict-origin-when-cross-origin` reduces the
Referer on outbound citation clicks to bare origin; a P/F calculation completed correctly with the
context offline. Wheel over a focused number field does not change the value (8 tests, both
directions). No value drifted from what was typed on any of the 23. Out-of-range values are
rejected, not clamped. Five malformed URL fragments plus eight hostile ones (bad percent-escape,
non-numeric, unknown unit, negative, `1e400`, duplicate key, `__proto__`, script tag) all degrade
safely with zero page errors.

**Citations.** All 138 distinct external URLs the site renders (all four score tabs on all 23
calculators) were resolved: 60 PMIDs via NCBI esummary with title matching, 59 DOIs via the DOI
handle API / Crossref, 19 by browser navigation. Two dead (findings above). `/trust`'s "91
citations" was verified by counting rendered references across all 23 calculators: exactly 91.
`/knowledge` library arithmetic (2,197 + 75 = 2,272; 2,425 − 2,272 = 153) checks out.

**Layout and responsive.** 8 routes × 6 widths (320/375/768/1024/1440/1920) = 48 combinations, plus
37 routes × 3 viewports = 111 page loads for overflow. **Zero horizontal document overflow
anywhere.** CLS 0.0074–0.0238 across 16 measurements, all "good". Sticky/fixed inventory,
per-element overflow, computed font sizes, label-aware touch-target boxes, and `elementFromPoint`
hit-testing with real mouse clicks on covered controls.

**Accessibility.** axe-core 4.12.1 (`wcag2a+wcag2aa+wcag21a+wcag21aa+wcag22aa+best-practice`) on 6
routes in their empty state, on `/calculators/psofa` with a computed result, and on each of its 4
expanded tab panels. Every real tab stop on all six pages has a visible focus ring (43/84/66/50/28/34
stops) and focus order matches visual order on all six. Contrast measured against actually-rendered
pixels behind 135/128/173/114/77/47 text elements per route. The score-tabs widget is a correct
ARIA tablist with roving tabindex; the mega-menu handles `aria-expanded` and Escape-restores-focus
correctly; the contact honeypot is properly hidden from AT.

**Everything else that came back clean, in one line each.** Structure sweep over 36 routes: no
heading-level skips, no missing/broken alt, all JSON-LD parses, no unnamed buttons or links, no
unlabelled inputs, no duplicate ids, `lang="en"` everywhere. Nav: desktop mega-menu opens with all
23 links and closes on Escape; mobile menu opens and navigates at 360px. `/calculators` search, the
`/` shortcut, all 8 category chips (counts sum to 23) and localStorage favourites all work and
survive reload. Print media keeps the result panel and hides the header. `security.txt` served and
unexpired; `/api/v1/health` and `/api/v1/ready` return JSON 200; NextAuth session/providers/csrf
endpoints 200. Admin login gives a single non-enumerating error for both wrong and plausible
addresses. Back-to-top gates itself correctly at its 350px threshold. The PWA install prompt
appears, routes and dismisses correctly on iPhone emulation and is correctly absent on desktop. All
37 titles present and distinct; all 12 internal footer links 200. The per-IP rate limiter fires
correctly on the 6th genuine attempt from separate page loads.

**Not reached.** Production build (dev server only). Offline/PWA precache (stale dev `sw.js`).
Real screen readers — NVDA/JAWS/VoiceOver; finding 6's live-region behaviour is a verified DOM-timing
fact plus standard documented AT behaviour, not an observed announcement. The admin area behind
login. Whether a form submission actually writes a DB row (`@prisma/client` throws outside the Next
runtime here) — finding 1's "no row written" follows necessarily from the early return and is
corroborated by the rate-limiter evidence, but the table was not queried. The JavaScript-disabled
submission path. 200% zoom / reflow and target-size 2.5.8. RTL rendering. Live `towardpcc.com`.
Score-value correctness was not re-checked in the layout or a11y passes (it was covered exhaustively
elsewhere).
