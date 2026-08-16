# apps/web — UI, UX, and the privacy invariants

Read the root `CLAUDE.md` first. Invoke `ui-ux-pro-max:ui-ux-pro-max` before
adding or changing a component; use `frontend-design` for a net-new page and
review it with `ui-ux-pro-max` after.

## The privacy invariants — enforced, not aspirational

Calculator inputs never leave the browser. Concretely:

- **Field state lives in React state and NEVER in the URL.** It reaches a URL
  only when the clinician presses "Copy link with these values", which composes
  one from state at that moment. The fragment remains the sharing FORMAT —
  `id=value~unit` joined by `;`, never the query string — and an inline script
  at the top of `<body>` in `app/layout.tsx` lifts an incoming fragment into
  `window.__TPCC_FRAGMENT__` and `replaceState`s it out of the URL during parse,
  before anything can read it. `calculator-form.tsx` hydrates from that stash
  and deliberately has no fallback to `location.hash`. See "Do not reintroduce
  fragment mirroring" below before touching any of it.
- **Prefer a `type="button"` with `scrollIntoView` + `focus` over `href="#..."`
  inside calculator UI.** This used to be absolute, because an anchor overwrote
  the fragment holding field state and discarded every entered value. It no
  longer can: the lifting script acts only on fragments containing `=`, so
  anchors pass through untouched and are left in the URL for the browser to jump
  to — asserted by the anchor case in `e2e/calculator-privacy.spec.ts`. Buttons
  are still preferred for focus management, but an anchor is no longer a
  data-loss bug.
- **No file under `app/calculators/**` or `components/calculator/**` may contain
  the text `useSearchParams`, `searchParams`, or `"use server"`.** The TM-001
  guard in `content/privacy-invariant.test.ts` is a raw regex over source, so
  even a comment or an unrelated variable name fails the suite.
- **`/api/v1` holds exactly two parameterless GETs** (health, ready). It must
  never receive a calculator input, return a computed score, or gain a scoring
  endpoint.
- **sessionStorage carry-over is allow-listed to `age`, `age_months`, `weight`,
  `weight_kg`** — enforced on write as well as read. Persisting any other
  clinical value contradicts the published "Nothing collected" claim.
- **A value in a field that is not on screen was typed in this session, by the
  person looking at the screen. It never arrives from outside and it never
  leaves.** `calculator-form.tsx` derives `inputs = visibleInputs(declared,
submitted)` and SHADOWS the declared list on purpose — `declared` is in scope
  in four places only. `encodeFragment` takes the visible list so a copied link
  carries only what the sender could see, and `decodeFragment` prunes hidden
  ids in a SECOND pass after the whole fragment is applied, because visibility
  depends on the final state rather than on key order. Pruning cannot be hung
  off the controller's `onChange`: fragment hydration replaces state wholesale
  and the `tpcc:fragment` listener re-applies it with no per-field handler
  running at all. Hidden state is retained rather than cleared, so switching
  PRISM's window and back restores four answers instead of destroying them on a
  mis-tap. The full payload still goes to `compute` — `runValidation` strips it,
  which is what makes the property hold for callers that are not this form.
- **If analytics is ever added:** page views only. Never an event payload keyed
  to a field, never a value, never a range bucket, and above all never the
  interpretation band — a band _is_ the clinical finding. Strip the fragment
  before recording anything.
- **Debug logging** may emit `ComputeResult`'s structured `{ code, inputId }`
  with no value attached, client-side only. Automatic transmission of an input
  value is unacceptable in every form — including "only on error", "1% sampled",
  and behind a flag defaulting off.

`e2e/calculator-privacy.spec.ts` proves it at runtime: it goes offline to show
anion-gap still computes, records every request URL and POST body while typing,
and asserts the sentinel value `137` appears in neither. It excludes
`/_next/static/` only because webpack's hex content-hashes collide with
three-digit clinical values — do not "fix" a failure by changing the sentinel or
widening that filter.

Know the guards' limits (ADR-0005 documents them): the runtime spec exercises
one calculator, the static scan matches three patterns of which `fetch(` is not
one and walks only two directories, and `connect-src 'self'` does not stop
same-origin exfiltration.

### Do not reintroduce fragment mirroring

Until 2026-08-05, field state was written into the URL fragment on every
keystroke. The justification was that the fragment is the one part of a URL the
browser never transmits — true of the BROWSER, and silent about any SCRIPT
sharing the document.

Cloudflare's JS Detections is injected into every page and cannot be disabled on
the Free plan. It reads `document.location.href` and POSTs it as `{"lhr": …}`.
The script was deobfuscated and its plaintext payload captured with real entered
values in it, so this is measured rather than theorised. Every reload, restored
tab, bookmark and shared link leaked the full field set to the edge.

Two things about how it survived so long are worth keeping in mind, because both
generalise:

- **Every guard we had was looking elsewhere.** The privacy spec inspected
  request URLs and bodies, but Cloudflare does not run against localhost. The
  edge-script check matched `<script src="/cdn-cgi/…">`, and the injection has no
  `src` — it builds the element at runtime, so that check returned zero matches
  for its entire life while the script was demonstrably on the page.
  `privacy-claims.test.ts` asserts on COPY, not behaviour.
- **The replacement asserts a property, not an absence.** "No third-party
  scripts" requires knowing who else is executing. "Entered values are not in
  `location.href`" does not, and therefore holds against scripts that do not
  exist yet. Prefer that shape whenever you have the choice.

## Design tokens

`packages/ui/src/tokens.css` is the single source of truth. **Never write a raw
hex in a component Tailwind styles** — everything routes through the
`@theme inline` names (`surface-*`, `ink-*`, `accent*`, `border*`, `alert-*`,
`success-*`, `font-*`, `radius-*`). Two documented exceptions, both because a
CSS variable cannot resolve there: `app/global-error.tsx` renders its own bare
`<html>` with no stylesheet loaded, so the crimson focus idiom is inlined or the
retry button has no focus outline at all; and browser-metadata values
(`themeColor`, manifest colours) are plain strings.

- **Crimson `#cf1f3d` is the only accent and never signals error.** Errors use
  amber (`alert-text` / `alert-bg`) plus a non-colour marker, so a red button
  always means "act", never "wrong". Blue, teal and gold are banned outright.
- **Coral is for dark surfaces and gradients only** — 2.55:1 on white, so never
  a border, icon or control boundary on a light ground, and it never carries
  meaning.
- **Borders have three tiers with absolute contrast bands**: `border-subtle`
  1.3–1.75 (rules inside a card), `border` 1.6–<3.0 (card edges, dividers),
  `border-strong` ≥3.0 (control boundaries only). A border needing more weight
  moves up a tier; never redefine one.
- **Never paint a `surface-*` token as a boundary.** `border-*`, `divide-*`,
  `outline-*` and the `border-[var(--color-surface-*)]` escape are all scanned
  by `content/border-usage.test.ts` and fail the build.
- **One focus idiom only** — `outline-2`, `outline-offset-2`, `outline-accent`,
  all under `focus-visible:` (accent-bright on dark surfaces). There is
  deliberately no ring token, so no second idiom can appear.
- Contrast is a CI gate: `tokens.test.ts` parses the shipped CSS and fails if
  body ink drops below 7:1 on page/raised, or any listed pairing below 4.5:1.

`globals.css` redefines `hover` as `(&:hover)`, stripping Tailwind's
`(hover: hover)` guard — so `hover:` and `group-hover:` **also fire on touch**.
Every hover state needs a `focus-visible`/`focus-within` twin, and no affordance
may be hover-only.

## Motion

One easing voice, `cubic-bezier(0.22, 1, 0.36, 1)`, and six duration tokens:
fast 150ms, enter 200ms, panel 260ms, slow 400ms, reveal 700ms, count 1500ms.

`transition: all` is banned — name the properties. Nothing that triggers layout
may animate: **movement** is `transform`/`opacity` only. Hover and focus states
transition colour, border-colour and box-shadow at 150ms — that is the site's
standard idiom, not an exception. Preloaders, marquees, parallax on content,
scroll-hijack, infinite loops on interactive elements, attention pulses and
replaying reveals are all banned. `prefers-reduced-motion: reduce` collapses
every animation to static, with no exceptions including the hero.

**The dial is 7 on marketing surfaces and 3 on clinical ones.** A calculator's
inputs and its computed **number** get nothing beyond the 150ms colour
transition — the number may not move. The one deliberate exception in the result
panel is `CompositionPanel`'s proportion bars, which animate their own fill
(`.chip-meter`, 900ms `scaleX`) because they animate the very quantity they
measure; `globals.css` argues the case at the definition.

**Count-up is allow-listed to the home counter band.**
`content/countup-scope.test.ts` fails the suite if anything other than
`app/page.tsx` imports `components/home/counter.tsx`. The component
server-renders `0` and animates after hydration, so anywhere above the fold the
first paint contradicts the copy beside it. The rule is positional, which is why
it is a source scan rather than a value assertion — "the dial is 7 on marketing
surfaces" is not licence to use count-up on another marketing page.

## Build, budget and e2e

- **Production builds need `next build --webpack`** — Serwist requires webpack,
  and the wrapper applies only outside `NODE_ENV=development`.
- **Route first-load JS is capped at 170 KB gzipped** on `/`, `/calculators`,
  `/calculators/[slug]`, `/trust`, `/validation`. The last two are listed
  specifically so that making an evidence chip a client component fails the
  budget.
- **Playwright blocks service workers globally**, now for determinism rather
  than necessity: a worker precaching in the background adds requests and timing
  the specs did not ask for. It was originally the fix for a reload fired on
  `controllerchange` that detached the document mid-call, but that reload was
  removed on 2026-08-03 — updates apply silently on `pagehide`.
  `calculator-privacy.spec.ts` is the single spec that opts back in.
- **There is no "update available" prompt, deliberately.** Next mints a random
  build id per build, so `sw.js` changes on every deploy including a docs-only
  one; a prompt that fires on non-changes and (as built) could not be dismissed
  is noise. `sw.ts` keeps `skipWaiting: false` because routes are code-split and
  a worker taking over mid-session leaves the running page asking for chunks the
  new precache no longer lists.
- **Keep `workers: 1`.** The privacy specs assert on network timing; parallel
  Chromium instances against one server reorder requests and flake for reasons
  unrelated to the invariant.
- E2E runs `build && start` on port 3100, never `next dev` — HMR websockets and
  RSC traffic would drown out the zero-network assertions.
- `lib/auth/{lockout,totp,password}.ts`, `lib/rate-limit.ts` and
  `lib/submission-guards.ts` carry a 100% lines/functions/statements (90%
  branches) gate. A new uncovered line in those five fails `pnpm test`.
- **Every numeric input keeps `onWheel={(e) => e.currentTarget.blur()}`** —
  without it a focused `type="number"` increments on wheel scroll in Chrome and
  Safari, changing an entered weight with no keystroke and no undo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
