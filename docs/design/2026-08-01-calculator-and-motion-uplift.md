# Calculator + motion uplift — prioritised implementation plan

Date: 2026-08-01 · Author: design lead · Status: proposed
Inputs: six structured studies (Kiddino motion, Kiddino visual/layout, Kiddino
form/dense content, PRISM reference calculator, our calculator surface, our
design system). Governing docs: `docs/decisions/ADR-design-direction.md`,
`docs/design/motion.md` (revision 4), `LAUNCH-BLOCKERS.md`.

**Tags.** (A) calculator page uplift · (B) site-wide motion/interaction uplift ·
(C) token or component addition.

**Ordering.** Value per unit of risk, descending. Risk = blast radius × chance of
regression, not effort.

**Budget.** Route JS is 146.5–156.7 KB gzipped against a 170 KB CI gate — about
13 KB of headroom on the worst route. Items 1–20 spend **≈2.3 KB gzipped total**.
Every (B) item is 0 KB: pure CSS.

**Vocabulary rule.** Every recommendation below resolves to a token in
`packages/ui/src/tokens.css`. Where a needed token does not exist it is called
out explicitly with a proposed value, and the item is tagged (C).

---

## Do these first

| #   | Tag | Item                                                                                  | JS cost  |
| --- | --- | ------------------------------------------------------------------------------------- | -------- |
| 1   | A   | Blur-gate validation messages — kill the ~25 simultaneous false errors on PRISM       | +0.25 KB |
| 2   | A   | Wheel guard on `type="number"` — scrolling currently mutates a focused field          | +0.05 KB |
| 3   | A   | Blocking-fields summary in the result panel, with jump links                          | +0.30 KB |
| 4   | A   | Print completeness: reveal all reference panels + ship the missing Print button       | +0.05 KB |
| 5   | C   | `--motion-duration-enter` / `--motion-duration-panel`; retire 14 hand-typed durations | 0 KB     |
| 6   | B   | `--text-display-2` in `PageHero` and the three other hand-built heroes                | 0 KB     |

Items 1–4 are clinical-safety or clinical-record defects. Items 5–6 are one-line
changes that pay for themselves the moment any later motion item lands.

---

## 1. (A) Blur-gate validation messages

**What changes.** `missing-required`, `out-of-range` and `invalid-type` messages
render only for fields the user has left (blurred) at least once. Compute stays
live on every keystroke — only the _messages_ wait.

**Why.** `outcome` is computed as soon as `anyEntered()` is true, `toComputeInput`
skips empty raws, and `runValidation` emits one `missing-required` per skipped
field. On PRISM (26 inputs) typing a single digit paints ~25 "… is required."
paragraphs and fires ~25 `role="alert"` announcements. Range messages have the
same problem mid-typing: `140` into a field with `min: 20` reads
"must be between 20 and 600" at `1`.

**Files.** `apps/web/components/calculator/calculator-form.tsx` (91-93, 143-152,
408-417, 443-454).

**Shape.**

```tsx
const [blurred, setBlurred] = useState<ReadonlySet<string>>(() => new Set());
const markBlurred = useCallback((id: string) => {
  setBlurred((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
}, []);

const errorsById = useMemo(() => {
  const m = new Map<string, string>();
  if (outcome && !outcome.ok) {
    for (const e of outcome.errors) {
      if (!blurred.has(e.inputId)) continue; // not yet reached — not yet wrong
      m.set(e.inputId, e.message);
    }
  }
  return m;
}, [outcome, blurred]);
```

`InputField` takes `onBlur={() => markBlurred(input.id)}` on the number input, the
unit `<select>`, and each radio. Blur is a natural commit point and needs no
timers.

**Evidence.** Our-calculator study, findings "every required field turns red the
moment the first character is typed anywhere" and "validation fires on every
keystroke"; `packages/scoring-engine/src/validation.ts:21-29,57-65`. Kiddino form
study, "validation is submit-only, unlabelled, and colour-only" — the opposite
failure, same root cause: validation timing was never designed.

**Accessibility.** Removes ~25 spurious `role="alert"` announcements. `aria-invalid`
follows the same gate, so a control is never announced invalid before it is
reached. WCAG 3.3.1 is still satisfied — errors appear before the result can be
produced, and item 3 provides the summary. Error styling stays amber
(`text-alert-text` + `bg-alert-bg` marker), never crimson.

**JS cost.** +0.25 KB gzipped (one `Set`, one callback).

---

## 2. (A) Wheel guard on numeric inputs

**What changes.** `onWheel={(e) => e.currentTarget.blur()}` on every
`type="number"` control.

**Why.** On a focused `type=number`, Chrome and Safari increment the value on
wheel scroll. A clinician fills weight, scrolls to the next field, and the weight
changes underneath them. On a pediatric dose calculator that is a patient-safety
defect, not a nitpick. There is no `onWheel` handler anywhere under the calculator
tree today.

**Files.** `apps/web/components/calculator/calculator-form.tsx:443-454`.

**Shape.**

```tsx
<input
  type="number"
  inputMode="decimal"
  onWheel={(e) => e.currentTarget.blur()}
  onBlur={() => markBlurred(input.id)}
  …
/>
```

Also add a one-line comment recording _why_ `input.min`/`input.max` are
deliberately not passed to the DOM (we reject rather than clamp, and native
clamping would silently rewrite a mistyped weight), so a later reviewer does not
"fix" it.

**Evidence.** Our-calculator study, "`type="number"` with no wheel guard and no
min/max attributes".

**Accessibility.** Blur-on-wheel does not trap keyboard users: arrow keys still
step the value, which is the accessible increment path.

**JS cost.** +0.05 KB gzipped.

---

## 3. (A) Blocking-fields summary in the result panel

**What changes.** When `outcome` is not ok, the result panel names what is
missing and links to it, instead of showing the same "Enter values to compute."
placeholder as an untouched form.

**Why.** On a 26-field score the blocking field can be far below the fold while
the sticky rail sits in view saying nothing useful. This is exactly the PRISM
reference's worst failure — its `.error` class has no CSS rule in any of its
three stylesheets, so an incomplete submit gives literally zero feedback — and we
should not land in the same place by a different route.

**Files.** `apps/web/components/calculator/calculator-form.tsx:573,590-591`;
copy in `apps/web/content/site.ts` (near `resultPlaceholder`, 903).

**Shape.**

```tsx
const blocking = useMemo(
  () =>
    outcome && !outcome.ok
      ? outcome.errors.map((e) => ({
          id: e.inputId,
          label: inputs.find((i) => i.id === e.inputId)?.label.en ?? e.inputId,
        }))
      : [],
  [outcome, inputs],
);
```

```tsx
{
  !ok && blocking.length > 0 && (
    <div className="mt-4 rounded-md border border-border-strong bg-alert-bg p-3" data-print="hide">
      <p className="text-sm font-medium text-alert-text">
        {blocking.length} field{blocking.length === 1 ? "" : "s"} still needed
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {blocking.slice(0, 5).map((b) => (
          <li key={b.id}>
            <a
              href={`#field-${b.id}`}
              className="text-sm text-ink-body underline underline-offset-2"
            >
              {b.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Cap the list at 5 with "+ n more" so a fresh PRISM does not render a 26-item list.

**Evidence.** Our-calculator study, "the result panel never says what is
blocking the result"; PRISM study, "incomplete submit fails completely silently".
WCAG technique G139 (error summary with links to the offending controls).

**Accessibility.** `href="#field-x"` targets the input's existing `id`, so
activation moves focus to a focusable element. Not `role="alert"` — it sits
outside the narrowed live region (item 13) so a screen-reader user hears the
summary once when they act, not on every keystroke.

**JS cost.** +0.30 KB gzipped.

---

## 4. (A) Print completeness

**What changes.** (a) All four reference panels print, not only the active tab.
(b) The `Print` button that copy already defines actually ships.

**Why.** (a) Inactive tabpanels carry the `hidden` attribute and the print block
has no rule to reveal them, so printing with the default tab active emits the
formula panel and nothing else — no limitations, no references, no changelog. A
printed clinical record without its references is the artefact this site exists
to prevent. (b) `site.calculators.printLabel: "Print"` exists at
`content/site.ts:912` and is referenced nowhere; there is no `window.print()` call
in the repo. Dead copy is how a print stylesheet rots — this is exactly how (a)
went unnoticed.

**Files.** `apps/web/app/globals.css:225-282`;
`apps/web/components/calculator/score-tabs.tsx:63-130`;
`apps/web/components/calculator/calculator-form.tsx:641-651`.

**Shape.** In the `@media print` block:

```css
/* Every reference panel prints, not just the open tab. Mirrors the <noscript>
     rule in score-tabs.tsx: reference material must not depend on which tab
     happened to be active when Print was pressed. */
[data-score-panel] {
  display: block !important;
  break-inside: avoid;
  padding-top: 1rem;
}
[data-score-panel]::before {
  content: attr(data-print-title);
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
}
```

`ScoreTabs` sets `data-print-title={item.label}` on each `<section>` and
`data-print="hide"` on the `role="tablist"` wrapper. Print button beside Copy:

```tsx
<button
  type="button"
  onClick={() => window.print()}
  data-print="hide"
  className={/* same as copy */}
>
  {c.printLabel}
</button>
```

**Evidence.** Our-calculator study, "printing loses the formula, limitations,
references and changelog" and "`printLabel` exists in copy but no print control is
rendered". PRISM study, "print and PDF as first-class outputs, with a `.no-print`
discipline" — the one place the reference is straightforwardly ahead of us.

**Accessibility.** The button is a real `<button>`, ≥44px via `min-h-11`, keeps the
standard `focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-accent` idiom. No print-only content that a screen reader
cannot reach.

**JS cost.** CSS is 0 KB. Button +0.05 KB gzipped.

---

## 5. (C) Motion duration tokens — close the drift

**What changes.** Add two tokens, wire the 14 hand-typed durations onto them, and
delete one banned animation.

**Why.** motion.md rule 2 says "durations only from tokens". Three of the four
duration tokens have zero consumers: `--motion-duration-fast` (150ms),
`--motion-duration-slow` (400ms) and `--motion-duration-count` (1500ms). Meanwhile
every keyframe is invoked with a bespoke value — `heroRise_600ms` (×5),
`drawerIn_260ms`, `drawerItemIn_260ms`, `installIn_240ms`, `megaColIn_220ms`,
`drawerScrimIn_200ms`, `megaIn_180ms` — plus `duration-200` ×9 and `duration-300`
×5. The rule is currently enforced by convention alone and has already broken 14+
times. Adding motion (items 16–17) before fixing this guarantees more drift.

**Files.** `packages/ui/src/tokens.css:151-157`; `apps/web/app/globals.css:32-83`
(`@theme inline` mapping); the 14 call sites in `app/page.tsx`,
`components/nav/main-nav.tsx`, `components/pwa/install-prompt.tsx`,
`packages/ui/src/accordion.tsx`.

**New tokens.**

```css
/* The 180–260ms band that 14 hand-typed call sites had converged on by feel.
     Not a variant of --motion-duration-fast: 150ms is the INTERACTION step
     (a control responding to a press), 200ms is the ENTRY step (an element
     arriving). Panels travel further, so they get their own 260ms step. */
--motion-duration-enter: 200ms;
--motion-duration-panel: 260ms;
```

Map both in `@theme inline` so `duration-enter` / `duration-panel` compile.
Assignments: `megaIn` 180→200, `megaColIn` 220→200, `drawerScrimIn` 200→200,
`installIn` 240→enter, `drawerItemIn` 260→panel, `drawerIn` 260→panel,
`heroRise` 600→`--motion-duration-reveal` (700ms — a 100ms change on a load
cascade, imperceptible, and it removes the last hand-typed value).
`duration-150` call sites (48 across 22 files) → `duration-fast`.

**Also in this pass.** Delete `animate-[ping_2.4s_ease-in-out_infinite]` on the
home status dot. It uses `ease-in-out` rather than the one easing voice, loops
infinitely, and is an _attention pulse_ — banned by motion.md rule 5 in both the
original and revision 4. A static `bg-success-text` dot says "live" without
pulling the eye.

**Evidence.** Design-system study, "motion tokens — the easing is load-bearing,
the durations are dead" and "off-scale durations are already shipping";
`docs/design/motion.md:13-19, 90`.

**Accessibility.** No behavioural change; every affected keyframe already sits
behind `motion-safe:`. Removing the infinite ping is a vestibular-load reduction
that reduced-motion users never saw and everyone else did.

**JS cost.** 0 KB — pure CSS.

---

## 6. (B) `--text-display-2` in the inner-page heroes

**What changes.** `PageHero` and the three other hand-built heroes use the fluid
display step instead of `text-4xl md:text-5xl`.

**Why.** `--text-display-1` has one consumer (home H1) and `--text-display-2` has
two. Every other hero still steps 3rem→4rem at exactly one breakpoint, which is
the problem the token was created to fix: the documented rem-offset makes the
size actually track the viewport (375px 40px · 768px 55px · 1024px 65px ·
1440px 72px). `PageHero` is the shared component, so one className fixes every
inner hero at once.

**Files.** `apps/web/components/page-hero.tsx:35`, `apps/web/app/about/page.tsx:30`,
`apps/web/app/install/page.tsx:27`, `apps/web/components/forms/pillar-form-page.tsx:43`.

**Shape.** `className="font-display text-display-2 font-medium text-ink-strong"` —
drop `text-4xl md:text-5xl`.

**Evidence.** Design-system study, "the fluid display steps have 3 consumers
between them"; `packages/ui/src/tokens.css:123-138`.

**Accessibility.** `clamp()` in rem with a rem-offset preferred term still
responds to browser text-size settings (WCAG 1.4.4). No fixed px anywhere in the
expression.

**JS cost.** 0 KB.

---

## 7. (A) Band scale beside the number

**What changes.** When a computed value has interpretation bands, the result panel
renders a compact segmented scale showing which band the value landed in — not
only the sentence.

**Why.** Today the result says `Interpretation: High risk — …` and the actual
cutpoints live in `InterpretationTable`, one tab-click away and below the fold. A
clinician reading pSOFA 9 wants to see that the cutpoint is >8 and that they are
one point over it. Proximity to a threshold _is_ the clinical information, and a
sentence cannot carry it. The PRISM reference gets this right and we do not: it
renders all four bands before any input is entered, so the number arrives inside a
frame rather than needing one built afterwards.

**Files.** `apps/web/components/calculator/calculator-form.tsx:624-629`;
`formatBand()` in `apps/web/components/calculator/score-meta.tsx:14-24` is
exported for reuse (it already prints boundary inclusivity exactly).

**Shape.**

```tsx
// Equal-width segments, deliberately. Bands are frequently open-ended
// (min or max null), so proportional widths would draw a magnitude the score
// does not have. Position says WHICH band; the number itself says how much.
<ol className="mt-2 flex list-none gap-0.5" aria-hidden="true">
  {bandsFor(v.id).map((b) => (
    <li
      key={b.id}
      data-current={b.id === band?.id ? "" : undefined}
      className="h-1.5 flex-1 rounded-pill bg-border-subtle data-[current]:bg-accent"
    />
  ))}
</ol>
<p className="numeric mt-1 text-[11px] tracking-[0.02em] text-ink-muted">
  {bandsFor(v.id).map((b) => formatBand(b)).join(" · ")}
</p>
```

**Colour position.** Crimson marks _"you are here"_, never _"this is bad"_. There
is no green→amber→orange→crimson ramp: severity is carried by the band's ordinal
text label and by where the marker sits in the sequence. This is the single
largest divergence from the PRISM reference and it is deliberate — see
"Clinical positions", §P4.

**Evidence.** Our-calculator study, "no band scale; the interpretation is a
sentence, and the cutpoints live in another tab"; PRISM study, "interpretation
legend persistently visible, with the reached band highlighted after calculate".

**Accessibility.** The scale is `aria-hidden` — it is a redundant visual encoding
of the sentence already in the live region, so announcing it twice would be noise.
Non-colour differentiation is inherent: the marked segment is the only filled one
and the range strip is text. `--radius-pill` finally gets a consumer.

**JS cost.** +0.30 KB gzipped.

---

## 8. (A) Provenance beside the number

**What changes.** A `Source: Pollack 1988` line under the interpretation sentence
in the result panel, with "full citation in Evidence, below".

**Why.** The site's entire claim is "every one referenced", and the result panel
currently shows a band description with no visible provenance at all. The PRISM
reference — whose clinical layer we otherwise reject — keeps a full ABNT citation
with a resolvable PubMed link permanently in the sidebar. On this specific point
it is ahead of us.

**Files.** `apps/web/components/calculator/calculator-form.tsx:624-629`.

**Shape.**

```tsx
{
  band && definition.references[0] && (
    <p className="mt-1 text-[13px] text-ink-muted">
      Source: {shortCite(definition.references[0])} — full citation in Evidence, below.
    </p>
  );
}
```

`shortCite` derives "FirstAuthor Year" from the existing `citation` string; no new
data. **Deliberately plain text, not a link.** The URL fragment is owned by field
state (`encodeFragment`), so an `href="#evidence"` jump would destroy the user's
entered values. If a jump is wanted later, dispatch a
`CustomEvent("towardpcc:open-tab", { detail: "evidence" })` that `ScoreTabs`
listens for (+0.15 KB) — never the hash.

**Evidence.** Our-calculator study, "the evidence that justifies the number is one
click away from the number"; PRISM study, "full scientific citation with deep
links to primary sources".

**Accessibility.** Plain text inside the result panel; no new focus stop, no
hover-only affordance.

**JS cost.** +0.10 KB gzipped.

---

## 9. (A) Input grouping — `group` on `InputBase`

**What changes.** An optional `group` field on `InputBase`, and `<fieldset>` /
`<legend>` sections in the form. Ungrouped inputs fall into one implicit section,
so nothing existing breaks.

**Why.** This is the biggest gap a reviewing intensivist would name. PRISM renders
26 inputs as one undifferentiated `gap-5` column in declaration order — no
landmark, no grouping, no sense of progress. The structure exists in the data and
never reaches the screen: neuro (`mental_status_gcs`, `pupils`), haemodynamics
(`sbp_min`, `hr_max`, `temp_min/max`), acid-base (`ph_min/max`, `tco2_min/max`,
`pco2_max`, `pao2_min`), chemistry, haematology, admission context. Grouping also
puts the min/max worst-value pairs next to each other instead of eight rows apart.

**Files.** `packages/scoring-engine/src/types.ts:17-22`;
`apps/web/components/calculator/calculator-form.tsx:216-225`;
annotate only the four long scores: `prism.ts` (26), `phoenix.ts` (15),
`psofa.ts` (14), `pelod2.ts` (11).

**Shape.**

```ts
interface InputBase {
  readonly id: string;
  readonly label: LocalizedText;
  readonly required: boolean;
  readonly helpText?: LocalizedText;
  /** Optional section heading. Ungrouped inputs render as one implicit
      section, so annotating a score is additive and never breaking. */
  readonly group?: LocalizedText;
}
```

```tsx
{groupedInputs(inputs).map(([label, items]) => (
  <fieldset key={label ?? "_"} className="flex min-w-0 flex-col gap-5 border-t border-border-subtle pt-6 first:border-t-0 first:pt-0">
    {label && (
      <legend className="font-numeric text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase">
        {label}
      </legend>
    )}
    {items.map((input) => <InputField key={input.id} … />)}
  </fieldset>
))}
```

Section separation is a `border-border-subtle` rule + the existing `gap-5` rhythm
— the "rules _inside_ a card" tier, exactly as the border ADR intends. No shadow,
no card-in-card.

**Evidence.** Our-calculator study, "flat input column — no grouping, no
sectioning, no engine metadata to group by". Kiddino visual study, "sections are
separated by background, never by rules or dividers" — adapted: we separate by a
hairline plus rhythm, because a tinted band per organ system inside a form would
read as six cards.

**Accessibility.** `<fieldset>`/`<legend>` is the correct grouping semantic and
gives screen readers the section name in context. Existing radio groups keep their
explicit `role="radiogroup"` (a bare fieldset maps to `role="group"` in HTML-AAM
and loses the "n of m" position announcement) — nest, do not replace.

**JS cost.** +0.20 KB gzipped (a `Map` group-by in render). Types change is
compile-time only.

---

## 10. (B) `text-white` → `text-ink-on-dark`

**What changes.** The 22 `text-white` occurrences on dark bands become
`text-ink-on-dark` (#ffeef0).

**Why.** There are exactly 22 of each, a 50/50 split in the same contexts,
including every hero H1. Pure white reads cooler than the palette and is a large
part of why the dark bands feel stock rather than Pulse Crimson.

**Files.** `apps/web/app/page.tsx:120`, `components/page-hero.tsx:35`,
`components/pillar-page.tsx:85`, `app/about/page.tsx:30`, plus the remaining
`text-white` call sites on `surface-hero` / `surface-hero-raised`.

**Evidence.** Design-system study, "ink tokens — but `text-white` bypasses
`ink-on-dark` half the time".

**Accessibility.** Zero contrast risk: #ffeef0 is lighter-warm than the grounds it
sits on, not darker. Contrast improves marginally or is unchanged.

**JS cost.** 0 KB.

---

## 11. (C) Correct `--color-accent-tint`

**What changes.** `--color-accent-tint` moves from `#fff2ee` to `#ffe4e8`, and
`tokens.test.ts` gains an assertion that it is distinguishable from
`--color-surface-sunken`.

**Why.** `--color-accent-tint` is byte-identical to `--color-surface-sunken`
(#fff2ee), so all 23 of its chip and selection backgrounds render as unexplained
padding. This already bit once: `Eyebrow`'s docstring records that three inline
eyebrows drew an accent-tint pill nobody could see, and the fix was to delete the
pill. This is the same class of defect as the retired `--color-edge` token — a
token whose value contradicts its stated purpose, with a guard that never checked.

**Files.** `packages/ui/src/tokens.css:30`; `packages/ui/src/tokens.test.ts`.

**Proposed value.** `--color-accent-tint: #ffe4e8`.
Approx. contrast: **1.20:1 on `surface-raised`**, **1.16:1 on `surface-page`**
(today: 1.09:1 and 1.00:1). Still a wash, not a fill — it must never be the sole
carrier of a selected state, which is why the radio options keep their constant
2px `border-accent` + filled dot + medium weight.

This is a redefinition, not a tier move, and that is defensible only because the
current value _fails the token's own declared purpose_. The ADR's "move up a tier,
do not redefine the tier" rule governs the border ramp, where each tier has a
contrast contract; `accent-tint` has none.

**Evidence.** Design-system study, "`--color-accent-tint` is byte-identical to
`--color-surface-sunken`"; `packages/ui/src/tokens.css:17,30`;
`apps/web/components/eyebrow.tsx:8-17`.

**Accessibility.** Text on the new tint is `ink-strong` (#2b1b20), well past AA at
any size. Selection state remains multi-cue.

**JS cost.** 0 KB.

---

## 12. (A) Primary vs secondary outputs on multi-output scores

**What changes.** The headline output — the one that carries interpretation bands
— renders at `text-4xl`; components render at `text-2xl` as today.

**Why.** `multi` is true whenever a score returns more than one value, and in that
branch every value gets identical treatment. pSOFA returns 7 values: `total` plus
six organ subscores. The 0–24 total that carries the interpretation renders at the
same size and weight as the 0–4 renal subscore that does not. The current
justification cites ideal body weight — correct for IBW, which deliberately offers
several methods and chooses none, and wrong for pSOFA / Phoenix / PELOD-2, where
one value _is_ the score.

**Files.** `apps/web/components/calculator/calculator-form.tsx:577,594-623`.

**Shape.** Derive, do not add schema:

```tsx
const banded = new Set(definition.interpretation.map((b) => b.appliesTo));
const primaryId = ok?.result.values.find((v) => banded.has(v.id))?.id;
// multi && v.id === primaryId  → text-4xl
// multi && v.id !== primaryId  → text-2xl
// !multi                       → text-4xl (unchanged)
```

IBW declares no bands, so `primaryId` is undefined and every value stays
equal-weight — the existing behaviour is preserved exactly where it was right.

**Evidence.** Our-calculator study, "no visual hierarchy between a total and its
subscores on multi-output scores"; `packages/scoring-engine/src/scores/psofa.ts:395-403`.

**Accessibility.** Size is not the only signal — the primary value is the one that
carries the interpretation sentence and the band scale, both of which are text.

**JS cost.** +0.10 KB gzipped.

---

## 13. (A) Narrow the live region; debounce announcements

**What changes.** `aria-live="polite"` moves from the whole `<aside>` onto the
values-and-interpretation block only, and its content updates on a 400ms idle.

**Why.** The live region currently wraps the heading, every value, the partial-result
callout, the copy button and the standing privacy callout. Compute is synchronous
per keystroke, so typing `140` re-announces the entire panel three times —
previously interleaved with a dozen `role="alert"` errors (fixed by item 1).

**Files.** `apps/web/components/calculator/calculator-form.tsx:579-580,589-657`.

**Shape.**

```tsx
<aside data-print="result" className={…}>        {/* no aria-live here */}
  <h2 …>{c.resultHeading}</h2>
  <div aria-live="polite" aria-atomic="false">
    {/* values, band scale, interpretation, source line only */}
  </div>
  {/* summary, partial cue, copy/print, privacy callout — outside */}
</aside>
```

Announcement content is held in state updated by a 400ms `setTimeout` that resets
on each change, so a burst of keystrokes announces once.

**Evidence.** Our-calculator study, "result panel is one big `aria-live="polite"`
region, re-announced on every keystroke"; PRISM study, "no `aria-live`, no
fieldset, no roles" — the reference announces nothing at all, which is worse, but
"announces everything constantly" is not the fix.

**Accessibility.** This _is_ the accessibility item. The visual result still
updates instantly; only the announcement settles.

**JS cost.** +0.20 KB gzipped.

---

## 14. (A) Reset, and a clear on numeric fields

**What changes.** A `Clear all` control at the end of the form, and a small clear
affordance on populated numeric fields to match the one radio groups already have.

**Why.** There is no reset anywhere on the detail page: emptying a 26-field PRISM
means clearing each field by hand or reloading without the fragment. Radio groups
got a `Clear` because a native radio cannot be unchecked; numeric fields were left
asymmetric. Reset should also clear the fragment, which is a privacy improvement
(item 20).

**Files.** `apps/web/components/calculator/calculator-form.tsx:116,542-551`.

**Shape.**

```tsx
<button
  type="button"
  data-print="hide"
  onClick={() => {
    setState(initialState(inputs));
    setBlurred(new Set());
    window.history.replaceState(null, "", window.location.pathname);
  }}
  className="min-h-11 self-start text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
>
  {c.clearAllLabel}
</button>
```

**Evidence.** Our-calculator study, "no reset, no per-numeric clear, and no shared
patient context between calculators".

**Accessibility.** ≥44px via `min-h-11`. `type="button"`, not `type="reset"` —
native reset restores server-rendered defaults, not our fragment-hydrated state.
Underline, not colour alone.

**JS cost.** +0.15 KB gzipped.

---

## 15. (A) Auditable copy summary

**What changes.** The copied text gains the input values and an ISO timestamp.

**Why.** Pasted into a handover note, today's summary is unreproducible: a reader
cannot tell which creatinine produced pSOFA 9, and `v1.0.0` without a date does
not fix it.

**Files.** `apps/web/components/calculator/calculator-form.tsx:163-183`.

**Shape.**

```
pSOFA — 2026-08-01T14:22Z
Inputs: PaO₂/FiO₂ 180 · Platelets 84 ×10⁹/L · MAP 42 mmHg · …
Total: 9 (High risk)
pSOFA v1.0.0 · towardpcc.com
```

No privacy implication: the clinician is choosing to copy. The shareable _link_ is
a separate, clearly-labelled action (item 20) because it has the opposite privacy
character.

**Evidence.** Our-calculator study, "the copied summary cannot be audited";
PRISM study, "elapsed assessment time captured into the exported record" —
adopted in structure, rejected in content (see §P6).

**Accessibility.** Unchanged; the copy button keeps its 2s confirmation.

**JS cost.** +0.20 KB gzipped.

---

## 16. (B) `Eyebrow` consumes `--text-eyebrow`

**What changes.** `text-[12px]` → `text-eyebrow` in the Eyebrow component.

**Why.** `--text-eyebrow` (0.75rem) is defined, mapped into `@theme inline`, and
has zero consumers — including the component whose drifting letter-spacing
motivated it. Same failure shape as `--color-edge`.

**Files.** `apps/web/components/eyebrow.tsx:29`.

**Evidence.** Design-system study, "`--text-eyebrow` has ZERO consumers —
including the Eyebrow component"; `packages/ui/src/tokens.css:140-143`.

**Accessibility.** 0.75rem responds to browser text scaling; the arbitrary
`text-[12px]` also did, so this is neutral — but the token is rem, so any future
size change is safe by construction.

**JS cost.** 0 KB.

---

## 17. (B) Compound hover on marketing and catalogue cards

**What changes.** Cards on the home page, calculators index and pillar pages get
one coordinated gesture: a 2px lift, `shadow-lg`→`shadow-xl`, border to
`border-border-strong`, and a `bg-gradient-accent` rule scaling in from the left
edge.

**Why.** motion.md revision 4 explicitly permits compound hover choreography on
marketing surfaces. The mechanism already exists and ships in exactly two places
(`app/page.tsx:224-228`, `:424-433`) — generalising it is near-zero-risk and adds
no bundle. Kiddino's card hover vocabulary is worth its one transferable idea
(hover changes the _edge_, never a lift) and we already have the better version.

**Files.** `apps/web/app/page.tsx`, `apps/web/components/calculators-index.tsx:220`,
`apps/web/components/pillar-page.tsx:116`.

**Shape.**

```tsx
<article
  className={cn(
    "group relative overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg",
    "transition-[translate,box-shadow,border-color] duration-fast ease-[var(--motion-ease)]",
    "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-xl",
    "focus-within:border-border-strong focus-within:shadow-xl",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
  )}
>
  <span
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-accent",
      "transition-[scale] duration-fast ease-[var(--motion-ease)]",
      "group-hover:scale-x-100 group-focus-within:scale-x-100 motion-reduce:transition-none",
    )}
  />
  …
</article>
```

Note `transition-[scale]`, not `transition-transform`: Tailwind v4 compiles
`scale-x-*` to the `scale` property, and naming `transform` transitions nothing —
the bug that left eight hover lifts inert site-wide, already fixed twice in this
repo.

**Also in this pass.** Replace `hover:border-accent/40` (3 sites) with
`hover:border-border-strong`. A 40%-alpha accent is not a border tier and is not
contrast-checked; the crimson belongs in the gradient rule, which is decorative
and carries no meaning.

**Boundary.** Not on the calculator detail route. motion.md revision 4: the
number may not move, and neither may its inputs or its panel.

**Evidence.** Design-system study, "choreography patterns exist but appear in one
or two places each"; `docs/design/motion.md:74-84`; Kiddino motion study, "card
hover fires three simultaneous changes and hides the CTA behind hover" (we take
the coordination, reject the hidden CTA).

**Accessibility.** `focus-within` mirrors every hover state, so keyboard gets
identical feedback — mandatory here because `@custom-variant hover (&:hover)`
(globals.css:24) drops the pointer-capability guard, so hover fires on touch
devices too. Nothing is revealed _only_ on hover: the card is a link and its
affordance is permanent. `motion-reduce:` kills the translate and both
transitions.

**JS cost.** 0 KB.

---

## 18. (B) Staggered entrance, and the three dead reveal directions

**What changes.** Grid children stagger 45ms apart, capped at 6 steps (270ms
total). The `left`/`right`/`scale` reveal directions defined in globals.css:197-205
and used nowhere get used where they are actually motivated.

**Why.** `[data-reveal]` + inline `--reveal-delay` gives zero-timer staggering and
already ships; the observer already `unobserve`s. Current staggers are `i * 60`
(×5) and `i * 70` (×3) with no cap, so a 12-card grid puts the last card 720ms
behind the first — past the ~300ms convention, where the tail reads as broken
rather than choreographed.

**Files.** `apps/web/app/page.tsx`, `apps/web/components/calculators-index.tsx`,
`apps/web/app/globals.css:189-219` (no change needed).

**Shape.** `<Reveal delay={Math.min(i, 6) * 45}>` — 0, 45, 90 … 270ms, then flat.

**Evidence.** Design-system study, "choreography patterns exist but appear in one
or two places each"; `docs/design/motion.md:78-80`; Kiddino motion study,
"scroll-reveal exists in CSS but has no driver" — the template authored _no_
stagger at all (`data-wow-delay` appears 0 times across 29 pages) and 70px travel;
we keep 12px and a real cap.

**Accessibility.** The reduced-motion block already zeroes both the transition and
the delay, so a staggered grid does not appear late under `reduce`.

**JS cost.** 0 KB — `Reveal` already ships.

---

## 19. (C) Spacing, shell and measure tokens

**What changes.** Four new tokens naming the rhythm the site already has, plus the
grouped-section device.

**Why.** `tokens.css` defines no spacing layer at all. Section padding is `py-24`
(13), `py-16` (5), `py-20` (3). Shell width is `max-w-[1280px]` (20) against the
ADR's stated 1400px (4). Measure caps come in five flavours: 58ch (16), 62ch (10),
52ch (5), 60ch (4), 70ch (2), against an ADR that says 65ch. A request to "increase
breathing room" currently has no vocabulary to land in.

**Files.** `packages/ui/src/tokens.css`; `apps/web/app/globals.css` `@theme inline`;
`docs/decisions/ADR-design-direction.md:137-141` (one-line correction).

**New tokens.**

```css
/* Vertical rhythm — two steps, not a ladder. Kiddino runs 120/90/60/30 from
     two variables plus a calc offset; the structure is right and the magnitude
     is marketing-scale. A clinical page wants more on screen. */
--space-section: 6rem; /* 96px — today's py-24, the dominant value */
--space-section-tight: 4rem; /* 64px — absorbs py-16 and py-20 */
--shell-max: 80rem; /* 1280px — the shipped value */
--measure: 62ch; /* prose cap; 58/60/70ch converge here */
```

Mapped as `--spacing-section`, `--spacing-section-tight`, `--container-shell` so
`py-section`, `py-section-tight` and `max-w-shell` compile.

**Position on the ADR conflict.** Ratify 1280px in the ADR rather than migrate 20
call sites to 1400px. 1280 is what shipped, what the layout was tuned against, and
the better measure for a page with a 22rem sticky rail.

**Also adopt (0 KB).** The grouped-section rhythm: when two sections belong to one
visual block, the second drops its top padding, so grouping is communicated by
rhythm rather than by a divider. Evidence: Kiddino `index.html:688-824` — 7×
`space-top space-extra-bottom`, 9× `space-extra-bottom` alone.

**Evidence.** Design-system study, "there is NO spacing token layer"; Kiddino
visual study, "vertical spacing scale is four numbers, not a Tailwind ladder" and
"section rhythm: asymmetric top/bottom padding is the default".

**Accessibility.** All rem/ch — scales with user text size. No fixed px.

**JS cost.** 0 KB.

---

## 20. (A) Tell the truth about the fragment, and make sharing deliberate

**What changes.** The privacy callout gains one clause; a `Copy link with these
values` button appears beside `Copy result summary`.

**Why.** Field state is mirrored into the URL fragment on every keystroke. That
fragment genuinely never reaches the network — guarded by
`content/privacy-invariant.test.ts` and by a zero-network Playwright spec — but it
does land in the address bar, session history, and any bookmark or screenshot. The
panel says "Nothing you enter is transmitted or stored". "Transmitted" is
architecturally true. "Stored" is doing quiet work, and on a shared PICU
workstation that is a real exposure. Meanwhile the sharing capability exists and
is invisible.

**Files.** `apps/web/content/site.ts` (`privacyLine`);
`apps/web/components/calculator/calculator-form.tsx:641-651`.

**Shape.** Copy becomes, in substance: _"Nothing you enter leaves this device.
Values do appear in this page's address bar, so the link can be bookmarked or
shared — clear them with Clear all."_ Button: `Copy link with these values`,
labelled so the label states what the link contains.

**The invariant does not move.** No query string, no server action, no network
call. Both tests stay green.

**Evidence.** Our-calculator study, "patient values are written into the URL on
every keystroke with no disclosure and no share affordance";
`apps/web/components/calculator/calculator-form.tsx:36-72,123-133`.

**Accessibility.** Two buttons, both ≥44px, both with the standard focus ring.
Distinct labels, not icon-only.

**JS cost.** +0.15 KB gzipped.

---

## 21. (C) `cautions` on `ScoreDefinition`

**What changes.** An optional `cautions?: readonly LocalizedText[]`, rendered as a
`Callout tone="alert"` beside the result.

**Why.** `missingAsNormal`'s own doc-comment names the unfinished work: "Any score
whose notes carry a result-invalidating caveat belongs in the page's Cautions
treatment, not only in the prose section." PELOD-2 declares all 11 inputs required
and rejects blanks — correct — but its `notes` instruct the caller to supply a
normal value for anything unmeasured, so a falsely-low score is still reachable by
the clinician's hand. That caveat currently renders only as prose inside a
collapsed Limitations tab.

**Files.** `packages/scoring-engine/src/types.ts:186-207`;
`packages/scoring-engine/src/scores/pelod2.ts`;
`apps/web/components/calculator/calculator-form.tsx:635-639`.

**Evidence.** Our-calculator study, "honest partial-result cue exists — but the
score it cannot cover is the dangerous one".

**Accessibility.** `Callout tone="alert"` already carries a required non-colour
marker (`!` in a bordered circle) and amber ink — never crimson.

**JS cost.** +0.10 KB gzipped.

---

## 22. (A) Evidence-tab honesty: `ipStatus`, and labelling band absence

**What changes.** (a) Render the existing `ipStatus` beside the references.
(b) Distinguish "estimator — no band by design" from "bands not yet authored".

**Why.** (a) Every score carries a typed `ipStatus` (original-formula /
freely-reproducible / permission-required / permission-obtained, with rights-holder
and evidence) and a repo-wide grep finds no render of it. pSOFA already carries a
paragraph of reasoning nobody can read. For a registry reproducing published
instruments, this is exactly the provenance a reviewing intensivist checks.
(b) 13 of 23 scores declare `interpretation: []` and render identical silence.
For BSA, IBW and ETT size that is correct. For PIM3, PRISM and PELOD-2 it is a
content gap, and rendering the same nothing for both is dishonest.

**Files.** `apps/web/app/calculators/[slug]/page.tsx:108-144`;
`packages/scoring-engine/src/types.ts:154-162`.

**Shape.** Add `interpretationStatus?: "not-applicable" | "pending"` (default
`"not-applicable"`). PIM3, PRISM and PELOD-2 set `"pending"`, which renders:
_"Interpretation bands for this score are not yet authored — see references."_

**Evidence.** Our-calculator study, "trust strip and validation badge are honest …
and the IP status they sit beside is never shown" and "13 of 23 scores produce a
bare number with no interpretation at all".

**Accessibility.** Text, in the reference zone; no new interaction.

**JS cost.** 0 KB (server-rendered).

---

## 23. (B) Depth on the dark bands from `coral-soft` / `peach`

**What changes.** Footer and hero night bands gain layered depth from
`--color-coral-soft` (#ffb3a3) and `--color-peach` (#ffd9cc) as gradient stops and
non-text decorative strokes.

**Why.** A whole warm secondary family sits almost unused — `coral-soft` has three
consumers total, `peach` has two outside the hero SVG — and it is already contrast-
cleared for the dark grounds (coral is 7.11:1 on the night band).

**Constraint, absolute.** Light grounds only ever see these as decoration behind
nothing: coral is 2.55:1 on white, failing the 3:1 non-text threshold (WCAG
1.4.11), so it must never be a border, icon, or control boundary there. Pinned by
`tokens.test.ts`.

**Files.** `apps/web/components/site-footer.tsx`, `apps/web/app/page.tsx` hero band.

**Evidence.** Design-system study, "coral / coral-soft / peach — the warm
secondary, hard-constrained to dark and gradients".

**Accessibility.** Decorative only, never the sole carrier of meaning; on-dark
text stays `ink-on-dark` checked against the solid fallback, not the gradient
midpoint (the existing `.bg-gradient-*` discipline).

**JS cost.** 0 KB.

---

## 24. (A) Shared patient context — last, and only if wanted

**What changes.** Age and weight carry from one calculator to the next, in-memory
or `sessionStorage`, with a visible "carried from your last calculator" cue and
one-click clear.

**Why.** A clinician computing ETT size, then maintenance fluids, then IBW for the
same child retypes age and weight three times.

**Why last.** This is the only item that touches the privacy invariant's blast
radius. It must not use the query string or a server action or
`content/privacy-invariant.test.ts` fails the build. It also introduces
cross-page state, which is the one thing that could make a value appear in a form
that the clinician did not type — the exact failure mode a registry cannot have.
Ship it only with an explicit visible cue and an explicit clear, or not at all.

**Files.** `apps/web/components/calculator/` (new hook, alongside
`use-favorites.ts:5-45` which is the existing localStorage precedent).

**Evidence.** Our-calculator study, "no reset, no per-numeric clear, and no shared
patient context between calculators".

**Accessibility.** The carried value must be visibly marked in the field, not
silently pre-filled.

**JS cost.** +0.60–0.90 KB gzipped.

---

## Clinical positions taken

Where the PRISM reference and our build genuinely differ in a way that matters
clinically, plainly:

**P1 — Live compute vs gated Calculate.** PRISM gates the total behind an explicit
`Calculate` button; we compute on every keystroke. **We keep live compute.** It is
what makes the zero-network promise legible, and we have no submit to gate. But
the reference's underlying instinct is right — a half-entered score must never be
mistakable for a complete one — so we pay for it with items 1, 3 and the existing
`missingAsNormal` partial cue. What gates is the _error messages_, not the number.

**P2 — Where the cutpoints live.** PRISM renders all four bands before a single
field is entered; we hide ours in the Evidence tab. **PRISM is right and we are
wrong.** Item 7 puts the band scale beside the number and item 8 puts the source
beside the interpretation. The full table stays in the tab.

**P3 — Mobile.** PRISM `display:none`s the band legend, the per-criterion
breakdown, the citation and the progress counter below 1024px — stripping the
interpretation of a mortality score from exactly the reader most likely to be at a
bedside. **We never do this.** Our current grid already carries everything to
375px; add an e2e assertion so it stays that way, rather than trusting review.

**P4 — Severity colour.** PRISM encodes severity by hue alone, green → amber →
orange → crimson, with #e11d48 also serving as its destructive-button colour. That
fails WCAG 1.4.1 (roughly 1 in 12 male intensivists read the amber and orange steps
as one state), its amber measures ~1.9:1 on white at 13px, and it makes crimson
mean death. **We carry severity by the band's ordinal text label and by position in
the band scale.** Crimson marks "you are here", never "this is bad". Alerts stay
amber + icon.

**P5 — Bare numbers.** PRISM implements 7 variables while citing a 14-variable
paper, never applies the age stratification the instrument requires, and never
outputs the mortality probability the score exists to produce — with no disclaimer
anywhere. We are cleaner but not clean: PIM3, PRISM and PELOD-2 currently hand the
clinician an unannotated number in the most consequential category on the site.
**Position: author sourced bands for those three, and until then say so on the
page** (item 22). Rendering the same silence for "estimator by design" and "not yet
done" is not acceptable in this category.

**P6 — Elapsed assessment time.** PRISM stamps `ASSESSMENT TIME: 00:15` onto the
printed record. **We do not.** Time-to-complete is a plausible data-quality signal
and simultaneously surveillance of the clinician entering it; putting it on the
artefact without saying why reads as judgement. If it is ever captured, capture it
silently for QA and keep it off the printout.

---

## Deliberately rejected

Nothing below is carried over. This list is as load-bearing as the plan above.

### From the Kiddino template

- **`transition: all`** — 130 of 133 declarations, including on the bare `a` and
  `button` element selectors. In a registry table that re-renders on filter change
  this smears rows, and it would animate `border-color` on a validation state by
  accident. Already banned by motion.md rule 2; worth a lint rule.
- **`all ease 0.4s` as the universal timing** — 96 identical declarations, zero
  `cubic-bezier` in 296 KB. There is no easing system to extract, only its absence.
  We have one voice: `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Every layout-property animation** — sticky header `top: -100% → 0` (a full
  viewport height in 800ms), back-to-top `bottom: 500px → 60px`, drawer
  `left: -110% → 0` over 1s, dropdown `margin-top: 50px → 0`. All have exact
  `transform` equivalents. `transform`/`opacity` only.
- **Hover-only affordances** — dropdowns with zero `:focus-within` in the entire
  stylesheet, carousel arrows hidden until the container is hovered, a CTA parked
  at `margin-bottom: -50px` until card hover. Unreachable on touch and keyboard;
  three separate WCAG 2.2 failures. Compounded for us: `@custom-variant hover`
  drops the pointer guard, so hover fires on touch — every revealed affordance
  needs a `focus-within` twin and a permanent path.
- **`outline: none` sitewide** — declared five separate times, with
  `.accordion-button:focus { box-shadow: none }` killing Bootstrap's ring too, and
  no `:focus-visible` substitute anywhere. We have exactly one focus idiom and it
  is never removed.
- **Infinite unpausable loops** — 7 of 9 `animation:` declarations, including a
  45s dashed rotating ring on every card image and a `jumpping` float, with zero
  `prefers-reduced-motion` in the file. Also kills our own home status-dot ping
  (item 5).
- **`scale(1.15)` image zoom over 400ms, and `rotate(4deg)`/`rotate(5deg)` tilts** —
  a 15% jump on a card fronting clinical data is animated decoration; tilting a
  medical image is the costume in its purest form.
- **The blob radius tier** — `274px 30px 274px 274px`, `210px`, `315px`, pinwheel
  `--radius-outer: 119px`. Carries no information, breaks bounding-box expectations
  for focus rings. We keep `--radius-sm/md/lg` plus `--radius-pill` for chips.
- **Full 9999px pills as the default control shape**, the three-colour bubble
  eyebrow, the 10-bump wave SVG cut, the 150px display numeral on the 404, and
  Fredoka as a display face. All unmistakably kids-school.
- **`display: none` on checkbox/radio inputs** with an 18px `::before` box — the
  native control leaves the a11y tree and keyboard focus entirely.
- **Red meaning three things at once** — `--theme-color` #e8063c (brand),
  `.required` #dc3545, and the invalid-field border, indistinguishable at 14px.
  Direct collision with "crimson never means error".
- **`:hover` sharing a selector with `.active` / `:not(.collapsed)` / current
  page** — on the accordion, the pricing table and pagination. Hover counterfeits
  meaning, and the state is invisible without a pointer.
- **30×30px pagination targets and 40px arrows below 767px** — under the 44px
  floor.
- **The whole jQuery plugin stack** — jQuery 3.6.0 (89 KB), slick (42 KB),
  Bootstrap JS (80 KB), jQuery UI (22 KB), magnific-popup (20 KB), Isotope +
  imagesLoaded (40 KB), LayerSlider ≈274 KB. LayerSlider alone would consume the
  entire 170 KB route budget. Native equivalents exist for all of it; a clinical
  registry needs none of it.
- **Dead code presented as a feature** — `counterUp()` is never invoked despite
  self-contradictory `data-counterup-time="1500" data-counterup-delay="3000"`
  markup, and the isotope filter JS targets buttons that ship in zero pages. Do not
  budget client JS for features the reference does not actually implement.
- **The preloader** — three counter-rotating rings gating the whole page behind
  `window.load`, with a force-dismiss escape hatch that admits the pattern fails.
  Already banned by motion.md rule 5.

### From the PRISM reference

- **An error class with no stylesheet rule** — `.error` is added to unfilled cards
  and defined in none of its three stylesheets, so an incomplete submit produces
  silence and a scroll. Item 3 is the direct answer.
- **Deleting the interpretation on mobile** — see §P3.
- **Colour-only severity terminating in crimson** — see §P4.
- **Zero `prefers-reduced-motion` on the entire site**, with unconditional
  `scrollIntoView({behavior:'smooth'})` on both the error and result paths, a
  `scale(1.03)` band highlight, and a spinner. A smooth programmatic scroll is a
  common vestibular trigger.
- **Runtime CDN script injection** — `jsPDF` + `jspdf-autotable` appended from
  cdnjs at click time, unpinned, no SRI, no fallback. Blocked outright by the CSP
  shipping in P5, and an unacceptable supply-chain surface in a clinical tool. The
  _deferral_ instinct is right: if we ever ship PDF export, it is a dynamic
  `import()` of a self-hosted module with a real error state.
- **Machine-generated clinical suggestions** — the NANDA panel scores diagnoses by
  counting `texto.includes(kw)` over title+definition, with a mixed
  Portuguese/English keyword list on the English page, and renders the top 6 with
  the same visual authority as the cited score. An unranked substring match is not
  a clinical inference.
- **Three simultaneous progress indicators for a 7-field form** — a fixed 6px top
  bar, a sticky counter and a stopwatch. One is enough; keep the `n/7` counter
  idea, drop the rest.
- **A duplicate `id="contadorPreenchidos"`** freezing the only progress counter
  mobile can see. Cited as the argument for HTML validity in CI: invisible to
  visual review, fatal on the device that matters.
- **Stamping elapsed time on the record** — see §P6.

---

## Budget summary

| Group                   | Items  | Client JS             |
| ----------------------- | ------ | --------------------- |
| Do-first (1–6)          | 6      | +0.65 KB              |
| 7–15                    | 9      | +1.25 KB              |
| 16–23 (B/C, mostly CSS) | 8      | +0.10 KB              |
| 24 (optional, last)     | 1      | +0.60–0.90 KB         |
| **Total 1–23**          | **23** | **≈ +2.0 KB gzipped** |

Worst current route: 156.7 KB against a 170 KB gate. Headroom after items 1–23:
≈11 KB.

**New tokens introduced:** `--motion-duration-enter` (200ms),
`--motion-duration-panel` (260ms), `--space-section` (6rem),
`--space-section-tight` (4rem), `--shell-max` (80rem), `--measure` (62ch).
**One token corrected:** `--color-accent-tint` #fff2ee → #ffe4e8.
**One token finally consumed:** `--radius-pill` (item 7).
**No token deleted.**
