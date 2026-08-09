# PRISM window collapse — implementation brief

Date: 2026-08-09. Status: design, ready to implement. Scope: PR-1 below is the whole of this
brief; PR-2 is scoped at the end and is deliberately not specified in full.

**The decision this designs for, already taken and not re-litigated here:** PRISM stops presenting
three window variants. It becomes one score calculator emitting `prism_total`,
`neurologic_subscore` and `non_neurologic_subscore`, with the PRISM IV mortality probability as a
downstream output. The collection window becomes a recorded annotation that also gates the
probability, and the four PRISM IV context questions stop appearing when the probability is
unreachable.

**What already exists, verified by reading:** `calculate()` reads `collection_window` exactly once
(`packages/scoring-engine/src/scores/prism.ts:745-746`), after the score and both subscores are
built, and the only thing it gates is whether a fourth `ScoreValue` is appended. The window has
never changed a number. The collapse is therefore a declaration-and-presentation change; **any diff
inside `prism.ts:660-820` other than the two lines named in §4 is a red flag, not part of this
work.**

**What does not exist:** there is no conditional-visibility mechanism anywhere. `grep showWhen`
across the repo returns nothing. `ScoreInput` (`types.ts:91`) has no such field,
`calculator-form.tsx` has no conditional rendering, and `runValidation` (`validation.ts:9-125`)
iterates the declarations with no notion of visibility. That machinery is §1 and §2.

---

## 1. The mechanism

### 1.1 The type

Add to `packages/scoring-engine/src/types.ts`, immediately before `InputBase` closes at line 36:

```ts
/**
 * When an input is asked at all.
 *
 * DECLARATIVE DATA, NOT A PREDICATE FUNCTION. A closure cannot be enumerated by
 * the registry gate, cannot be checked for a dangling id, and cannot be swept
 * over every legal controller value — which is the whole of how this codebase
 * gates `composition`. A shape the gate can read is the only version that can
 * be guarded.
 *
 * ONE LEVEL ONLY. The controller must itself carry no `showWhen`, so visibility
 * is a single pass over the submitted values with no fixpoint to iterate and no
 * cycle to detect. Structurally gated in registry-gate.test.ts.
 */
export interface ShowWhen {
  /** Id of a CATEGORICAL input declared by the same score, itself unconditional. */
  readonly input: string;
  /** Option values of that input for which this input is asked. */
  readonly equals: readonly string[];
}
```

and, as the last member of `InputBase` (after `group`, `types.ts:35`):

```ts
  /**
   * OPTIONAL and ADDITIVE, exactly like `group` above: an input with no
   * `showWhen` is always visible, so annotating one score can never affect
   * another. All 24 other registered scores are untouched by this field.
   *
   * MAY NOT BE COMBINED WITH `required: true` — see registry-gate. A hidden
   * required input is an uncomputable score whose blocking rail names a field
   * that is not in the DOM and whose jump button silently no-ops
   * (calculator-form.tsx:1156-1157).
   */
  readonly showWhen?: ShowWhen;
```

### 1.2 Why on the input, and not elsewhere

**On `InputBase`, beside `group`.** Visibility is a per-input presentation fact, which is what
`InputBase` already carries; `group`'s own comment (`types.ts:32-35`) states the additive-annotation
argument verbatim, and it applies unchanged. A `visibility` map on `ScoreDefinition<TInputs>` would
buy compile-checked ids (keyed on `TInputs[number]["id"]`) at the cost of stating the condition in a
second place, away from the input it governs. The compile check is worth having and is bought back
in §6.3 as a structural gate with a readable failure message; the split declaration is not
recoverable. The corpus precedent points the same way: `composition` lives on the definition because
a subscore maximum is a fact about the _instrument_ (`types.ts:232-234`), while `group` — a fact
about one input — lives on the input.

**Not a fourth `ScoreInput` union member.** This was measured against the real tree during the
hazard analysis and it fails loudly in three places and silently in five. `ValueForInput`
(`types.ts:99-103`) ends in an `else` that types any unrecognised member as `BooleanValue`;
`runValidation` (`validation.ts:112-121`) ends in an unguarded fall-through that validates it as a
boolean; `toComputeInput` (`calculator-form.tsx:89`) encodes it as `raw === "true"`. Nothing in the
repo does an exhaustive switch with a `never` fallthrough — `grep assertNever` returns nothing — and
`noFallthroughCasesInSwitch` buys nothing against if-chains. A new variant would be silently
mis-typed and silently mis-validated.

**Not a predicate function**, for the reason in the doc comment: the gate has to be able to read it.

### 1.3 The evaluator

New file `packages/scoring-engine/src/visibility.ts`:

```ts
import type { ScoreInput } from "./types";

/**
 * Whether an input is asked, given the values submitted in the same call.
 *
 * Evaluated against the RAW submitted values rather than the canonical ones, so
 * it does not depend on declaration order: every input's visibility is decided
 * from the same snapshot, whatever order they are declared or arrive in.
 *
 * An unanswered, absent or malformed controller HIDES its dependents. That is
 * the safe direction here: on PRISM the controller is `required: true`, so a
 * missing one already fails the whole compute with `missing-required`, and
 * hiding rather than showing can only ever withhold a number.
 */
export function isVisible(input: ScoreInput, values: Record<string, unknown>): boolean {
  const cond = input.showWhen;
  if (!cond) return true;
  const raw = values[cond.input];
  if (raw === undefined || raw === null) return false;
  const v = (raw as { value?: unknown }).value;
  return typeof v === "string" && cond.equals.includes(v);
}

/** The inputs a form should render, and the only ones any consumer may read. */
export function visibleInputs(
  inputs: readonly ScoreInput[],
  values: Record<string, unknown>,
): readonly ScoreInput[] {
  return inputs.filter((i) => isVisible(i, values));
}
```

Both are exported from the barrel (`packages/scoring-engine/src/index.ts`) **so the web form imports
the same function the engine runs.** `runValidation` is deliberately not exported and stays that way;
`isVisible` must be, or the UI grows a second implementation of the predicate and the `as never`
cast at `calculator-form.tsx:200` guarantees typecheck never notices the drift.

`packages/scoring-engine/vitest.config.ts:17` gates this package at 100% lines/branches/functions/
statements, so every branch of `isVisible` needs a case: no condition, controller absent, controller
null, controller value not a string, value in `equals`, value not in `equals`. Six.

---

## 2. The safety rule

> **For every input whose `showWhen` is not satisfied by the values submitted in the same call, the
> object handed to `calculate()` contains no key for that input's id.**

That is the sentence a reviewer checks. It is a positive property of one object, so it is decidable
by looking at that object alone — it does not require enumerating who might read a hidden value, and
it therefore holds against form layers that do not exist yet (React Native, Electron, white-label;
ADR-0005 says "different runtime" is not an available argument). It is the same shape as the
replacement invariant recorded in the root guide after the fragment bug: assert a property, not an
absence.

Two facts make it cheap. `runValidation` never writes an absent optional input into `canonical` — it
`continue`s at `validation.ts:29` with no write — and `calculate` only ever receives `canonical`
(`define-score.ts:23-25`). So "hidden" and "blank" are already byte-identical at the engine
boundary, and PRISM's existing withholding guard (`prism.ts:778-785`) fires unchanged with **zero
edits to `calculate`**.

### The exact code change that enforces it

`packages/scoring-engine/src/validation.ts` — one import and one guard, as the first statement of the
existing loop at line 16:

```ts
import { isVisible } from "./visibility";

  for (const input of inputs) {
    /**
     * A HIDDEN INPUT IS ABSENT, NOT DEFAULTED — and it is skipped HERE, before
     * the required check below, so that `required` means "required when asked".
     * Skipping the loop body is what keeps the id out of `canonical`, and
     * `canonical` is the entire object `calculate` receives (define-score.ts:25).
     * The browser is therefore not the enforcement point: a UI filter that is
     * forgotten, a shared link, a direct compute() call from a test or a future
     * runtime cannot feed a hidden value in.
     */
    if (!isVisible(input, values)) continue;

    const raw = values[input.id];
```

Nothing else in `validation.ts` changes. The web form may keep passing the full payload — it does,
per §3 — because the strip happens here.

**Two consequences worth stating so nobody re-derives them badly.** A hidden input can never produce
an `InputRejection`, so the blocking rail (`calculator-form.tsx:245-252`) can never name a field
that is not in the DOM, and the dead-jump-button case at `:1156-1157` is closed by construction
rather than by filtering. And a hidden `required: true` input would now be silently exempt from
validation, which is why §6.3 forbids the combination structurally rather than relying on it
behaving sensibly.

---

## 3. File-by-file changes

### 3.1 `packages/scoring-engine/src/types.ts`

Add `ShowWhen` (§1.1) and `readonly showWhen?: ShowWhen` on `InputBase` after line 35. No other type
moves. `InputValues` (`types.ts:111-117`) is untouched: it keys off `required`, the four PRISM
covariates are already `required: false`, and conditional-requiredness is explicitly out of scope
(§7).

### 3.2 `packages/scoring-engine/src/visibility.ts` (new)

`isVisible` and `visibleInputs`, verbatim as §1.3.

### 3.3 `packages/scoring-engine/src/validation.ts`

The import and the four-line guard at the top of the `for` loop at line 16 (§2).

### 3.4 `packages/scoring-engine/src/index.ts`

Add `ShowWhen` to the type export block (lines 10-34) and
`export { isVisible, visibleInputs } from "./visibility";` beside the other value exports (line 36+).

### 3.5 `packages/scoring-engine/src/scores/prism.ts`

See §4.

### 3.6 `packages/scoring-engine/src/scores/registry-gate.test.ts`

Four structural assertions plus one invariance sweep — see §6.3 and §6.4.

### 3.7 `apps/web/components/calculator/calculator-form.tsx`

**The single derivation point.** Replace `const { inputs } = definition;` (line 145) with a derived
visible list, and let every existing consumer keep the name `inputs` so none of them has to be
individually remembered:

```ts
const declared = definition.inputs;
const [state, setState] = useState<FieldState>(() => initialState(declared));
// …
const submitted = useMemo(() => toComputeInput(declared, state), [declared, state]);
/** WHAT THE FORM IS ALLOWED TO SEE. Shadowing `inputs` is deliberate: a future
      author must not have the full declared list in scope, because passing it is
      exactly the mistake. `declared` is used in three places only — state
      initialisation, the payload above, and this line. */
const inputs = useMemo(() => visibleInputs(declared, submitted), [declared, submitted]);
```

`submitted` is built from `declared` because visibility has to be decided from a snapshot that
includes the controller. The **full** `submitted` object is what goes to `compute` at line 200
(`definition.compute(submitted as never)`); the engine strips. Do not pre-filter it in the form —
that would move the enforcement point back into the browser.

Consumers that then correct themselves with no further edit, because they already read `inputs`:
`anyEntered` (`:95-97`, called at `:199`, `:503`, `:569`), `blocking`'s `byId` (`:247`),
`enteredCount` (`:268-271`), `showPartialCue` (`:277-280`), `copySummary`'s entered list (`:315`),
the carried-values effect (`:381-403`, already independently allow-listed to `CARRIED_IDS`), and the
render loop `groupInputs(inputs)` (`:537`).

Three sites need a named edit:

- **`:1091`** — `{enteredCount} of {definition.inputs.length} entered` becomes
  `{enteredCount} of {visibleCount} entered`, with `visibleCount` passed into `ResultPanel` beside
  `enteredCount`. Filtering the numerator alone yields `26 of 22`; filtering the denominator alone
  yields a permanent `22 of 26`.
- **`encodeFragment` (`:40-48`)** — takes the visible id set and filters on it as well as on
  `raw !== ""`. Signature becomes `encodeFragment(state, inputs)`; call site at `:449`.
- **`decodeFragment` (`:50-76`)** — prunes non-visible ids after the whole fragment has been applied.
  See §5.2 for why this is a two-pass and why it must not be done at write time.

`groupInputs` (`:109-123`) itself does not change: filtering happens **before** it, so a group whose
members are all hidden never opens a bucket and PRISM's "Admission context" `<fieldset>`, its
`<legend>` and its top hairline (`:537-551`) disappear together. Filtering inside `items.map` would
leave a labelled empty section.

One in-scope copy fix while these four fields are open: the optional badge at `:941-945` renders only
in the categorical/boolean branch and, because PRISM sets `missingAsNormal: true` (`prism.ts:219`),
prints `optionalScoredAsNormal` — "Optional · blank scored as normal" (`site.ts:975`). On PRISM the
non-required categorical/boolean inputs are **exactly** these four, and for them the claim is false:
the score file says so in terms (`prism.ts:537` "`required: false` here therefore does NOT mean
'safe to leave blank'"). Add a third badge string used when the input carries a `showWhen` —
suggested `optionalForProbability: "Optional · needed for the probability"` in `site.ts` beside
`optionalScoredAsNormal` — and select it in the badge expression. This is a live defect today, it
sits on the four fields this change is about, and leaving it makes the surviving 4-hour rendering
state something untrue.

### 3.8 `apps/web/app/calculators/page.tsx` and `apps/web/components/nav/site-header.tsx`

Both publish `getScore(slug)?.inputs.length` as a per-score claim (`page.tsx:16`,
`site-header.tsx:36`), and `page.tsx:13-14` asserts in a comment that "the index can never claim a
shape the calculator does not actually have." After this change PRISM has 22 or 26 fields depending
on the window, and both surfaces are server components with no field state, so neither can resolve a
`showWhen`.

Publish a **range, derived from the definition**: `min` = inputs with no `showWhen`, `max` =
`inputs.length`, rendered as a single number when they are equal and `22–26 inputs` when they are
not. Derived means it cannot go stale, and it is the only option true in both directions —
publishing 26 overstates what is ever on screen at once, publishing 22 understates it. The
`site-header.tsx:40` template `` `${count} input${count === 1 ? "" : "s"}` `` becomes the same helper.
Keep the comment at `page.tsx:13-14` and extend it to say the count is a range where a score asks
conditionally.

### 3.9 `apps/web/e2e/prism-window.spec.ts` (new)

First PRISM e2e spec. There is none today — `grep -i prism apps/web/e2e/` matches only Prisma-the-ORM
in `global-setup.mjs`. See §6.5.

---

## 4. What PRISM declares

**Four inputs gain the condition, and nothing else does.** Identical declaration on each, added
beside the existing `required: false`:

```ts
      showWhen: { input: "collection_window", equals: ["first_4h"] },
```

- `admission_source` — `prism.ts:546-567` (`required: false` at `:549`)
- `cpr_24h` — `prism.ts:568-578` (`:572`)
- `cancer` — `prism.ts:579-589` (`:583`)
- `low_risk_system` — `prism.ts:590-600` (`:594`)

All four already sit in one contiguous group, `defineText("prism.group.admission-context",
"Admission context")` (`:547`, `:570`, `:581`, `:592`), so the whole section appears and disappears
as a unit.

**Nothing else gets it, and the predicate cannot be inferred.** `age` is dual-use — it drives the
PRISM III bands via `bandFor(ageMonths)` (`:664`) _and_ is its own term in the PRISM IV logit, which
splits the first month at 14 days where PRISM III has one neonate band (`:793`, argued at
`:110-113`). A rule of the shape "hide what only the logit reads" would also hide `age`, `pupils` and
`mental_status_gcs`. The four are named by hand because they are the four the model adds and the
score does not use.

### What else changes in `prism.ts`

- **`calculate` does not change.** `prism.ts:745-746` stays verbatim. It is the engine-side gate on
  the probability and it is what makes the covariate terms unreachable on the other two windows
  regardless of what the form does. Deleting it in the same change as introducing visibility filtering
  would leave no remaining guard if the filter has a hole.
- **`collection_window` keeps its id, its `required: true` (`:225`), and all three option values**
  `first_4h` / `first_12h` / `first_24h` (`:229`, `:233`, `:237`). `encodeFragment` writes
  `${input.id}=${raw}` (`calculator-form.tsx:40-47`), so both the id and the value are baked into
  every link a clinician has already copied; changing either drops the window on rehydration, and
  because it is required the form then blocks compute on a link that used to work. Making it optional
  would additionally turn `values.collection_window` into an omittable key in `InputValues`
  (`types.ts:111-117`) and break `prism.ts:745` under `strict`.
- **The three option labels stay as they are** (`:230`, `:234`, `:238`), naming the models. They land
  verbatim in every copied record, a 24-hour PRISM 18 is a different patient from a 4-hour PRISM 18,
  and rewriting them is user-visible text with no clinical gain.
- **`helpText` on the window (`:241-244`)** — one sentence changes. "The four admission-context
  questions belong to PRISM IV alone and are ignored on those windows" is now false in its second
  half: they are not shown at all. Replace with wording that says they are asked only on the 4-hour
  window and why.
- **`notes` (`:832-836`)** — the same correction to "Those four questions belong to PRISM IV alone and
  are ignored on the 12- and 24-hour windows."
- **The comment block at `:530-544`** explaining why none of the four is `required` needs rewriting
  rather than deleting. Its reasoning changes from "an unconditional requirement would reject a
  legitimate score-only entry on the other windows" to "they are not asked when the probability is
  unreachable, and `showWhen` may not be combined with `required` because a hidden required input is
  an uncomputable score." The conclusion — `required: false`, requirement conditioned inside
  `calculate` at `:778-785` — is unchanged.
- **Version `2.4.0` → `2.5.0`**, with a changelog entry dated `2026-08-09` appended last (the gate at
  `registry-gate.test.ts:95-113` asserts oldest-first ordering and that `version` equals the newest
  entry's version).

### The changelog `reason`

**`clarification`.** No output changes: the same inputs yield the same numbers, and the probability's
absence on the 12- and 24-hour windows has been the behaviour since v2.1.0. `output-withdrawn` is
documented for a number that stops being shown (`types.ts:200-216`), and nothing here stops being
shown — four _inputs_ stop being _asked_ where `calculate` already ignored them. The summary should
say plainly that four questions no longer appear on two of three windows, so a reader who filled them
in last week can see where they went.

Do not add a sixth vocabulary value for "an input stops being offered". That widens a shared type for
one score, which is the argument `types.ts:63-71` makes against `minExclusive`.

---

## 5. The completion counter and the URL fragment

### 5.1 The counter

Numerator (`calculator-form.tsx:268-271`) and denominator (`:1091`) both move to the visible set, in
the same change. PRISM renders the counter because it declares a `composition` (`prism.ts:650-656`),
so this is live for exactly the score being changed.

The denominator therefore **moves under the user's hand**, 26 on the 4-hour window and 22 on the other
two. That is accepted and is the point: the counter exists (`:254-267`) to stop a partial composite
reading as complete, and a fixed 26 makes a fully entered 12-hour PRISM read `22 of 26` forever —
the same class of falsehood in the other direction.

`showPartialCue` (`:277-280`) takes the visible set too. Miss it and four hidden, permanently blank,
non-required inputs pin "Components left blank are scored as normal." (`site.ts:926-927`) on for every
12- and 24-hour result, about questions that are neither on screen nor scored. A cue that fires on
100% of results is a cue clinicians stop reading.

### 5.2 The fragment

The policy, stated as the property it guarantees:

> **A value held in a field that is not on screen was typed in this session by the person looking at
> the screen. It never arrives from outside, and it never leaves.**

Three mechanics deliver it.

**Retain in state.** Nothing prunes `FieldState` — `initialState` (`:30-37`) seeds every declared id,
`setField` (`:190-196`) only merges, and `clearAll` (`:418-434`) is the sole eraser. Leave that alone.
Switching the window to 12 h and back restores the four answers, which is the humane behaviour on a
26-field form whose only reset is all-or-nothing.

**Exclude on encode.** `encodeFragment` (`:40-48`) filters on `raw !== ""` only, so today it would put
a hidden answer into "Copy link with these values" (`:448-460`). Give it the visible id set. The
sender's link then contains exactly what the sender could see.

**Prune on decode.** `decodeFragment` (`:50-76`) admits any id that is `in state` (`:59`), and `state`
is `initialState(inputs)`, which holds every declared id — so a link injects hidden state with no
keystroke. This is not hypothetical: links already in circulation legitimately carry
`collection_window=first_12h` _together with_ all four covariates, because today all three windows
render all 26 fields. Those links become the hazard case on first load. Decode must apply the whole
fragment, then compute visibility over the result, then blank any id that is not visible.

**Two passes, never write-time pruning.** Visibility depends on the _final_ state, not on arrival
order — the fragment is applied wholesale by one `setState` (`:168`), and the `tpcc:fragment`
listener (`:171`) re-applies it on same-document paste with no per-field handler running at all. Any
clearing hung off the controller's `onChange` is simply not on that code path, and any pruning done
as each pair is parsed behaves differently depending on key order in the string.

**`blurred` is not pruned.** A field answered, hidden and re-shown shows its validation message
immediately rather than after the user leaves it — arguably correct, since they did finish with it.
Left alone deliberately; noted so the next reader knows it was considered.

**`copySummary` (`:313-357`)** follows from `inputs` being the visible list, and it is the highest-
consequence consumer: the pasted handover record is read later, away from the page, and a hidden
covariate printed there is an answer the reader believes was on screen. The file argues this itself at
`:282-288` — "a clinical record that cannot be checked against its own inputs is a number with a name
on it."

---

## 6. Tests that fail if the safety rule is violated

Named assertions, not intents. Each is listed with the file it goes in.

### 6.1 The key-absence test — this is the one that binds for PRISM

`packages/scoring-engine/src/validation.test.ts` (which already imports `runValidation` directly):

```ts
it("omits a hidden input's id from canonical", () => {
  const { errors, canonical } = runValidation(prism.inputs, {
    collection_window: { value: "first_12h" },
    age: { value: 3, unit: "years" },
    pupils: { value: "both_reactive" },
    cancer: { value: true },
    low_risk_system: { value: true },
  });
  expect(errors).toEqual([]);
  expect(Object.keys(canonical)).not.toContain("cancer");
  expect(Object.keys(canonical)).not.toContain("low_risk_system");
});
```

This is the safety rule stated directly against the object `calculate` receives. Delete the `continue`
from §2 and it goes red immediately. It is the assertion that binds for PRISM, because PRISM's
covariates are inert inside `calculate` (the early return at `:745-746` precedes every read of them),
so an output-comparison test cannot detect a stale hidden value on this score.

### 6.2 The stale-hidden-value test at the UI boundary

`apps/web/e2e/prism-window.spec.ts` — **this is the test that would have caught a stale hidden value
reaching a consumer**, because on PRISM the visible damage is in the record and the link rather than
in the number:

```ts
test("a covariate answered on the 4-hour window does not survive into the record", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/calculators/prism");
  // select first_4h, answer cancer = Yes, then switch the window to first_12h
  await expect(page.locator("#field-cancer")).toHaveCount(0);
  await page.getByRole("button", { name: "Copy link with these values" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).not.toContain("cancer");
  await page.getByRole("button", { name: "Copy result summary" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).not.toContain(
    "Cancer, acute or chronic",
  );
});
```

The clipboard pattern is the one already used at `apps/web/e2e/calculator-privacy.spec.ts:104` and
`:113`.

### 6.3 Structural gates on the declaration

`packages/scoring-engine/src/scores/registry-gate.test.ts`, in the shape of the existing composition
gates at `:137` and `:187`. One `it` per property so a failure names itself:

- `"every showWhen names an input the score declares"` — `showWhen.input` resolves to a declared id
  of the same score. `ScoreInput` is a non-generic union (`types.ts:91`), so the id is a plain
  `string` and a typo cannot be caught by the compiler; this is what replaces that check.
- `"every showWhen controller is categorical and unconditional"` — the referenced input has
  `type === "categorical"` and no `showWhen` of its own. That is the no-chains rule that makes
  one-pass evaluation correct.
- `"every showWhen value is a declared option of its controller"` — every string in `equals` appears
  in the controller's `options`. A value that matches nothing hides the input forever, silently.
- `"no conditional input is required"` — no input carries both `showWhen` and `required: true`.

### 6.4 The invariance sweep — the general detector

Same file, using the existing `sweepInputs` (`:36-54`), which already supplies **every** declared
input unconditionally and therefore already constructs the illegal state this change forbids:

```ts
it("a hidden input's value cannot change what a score emits", () => {
  for (const s of registry) {
    const gated = s.inputs.filter((i) => i.showWhen);
    if (gated.length === 0) continue;
    for (const vector of sweepInputs(s)) {
      for (const i of gated) {
        if (isVisible(i, vector)) continue;
        const perturbed = { ...vector, [i.id]: otherLegalValue(i) };
        expect(s.compute(perturbed as never), `${s.slug}/${i.id}`).toEqual(
          s.compute(vector as never),
        );
      }
    }
  }
});
```

Derived from the registry with no hand-maintained list, for the reason `registry-gate.test.ts:175-176`
gives: "a gate that has to be edited by the person it is guarding against is not a gate." **Be honest
about its reach on PRISM: it passes today even without §2, because `calculate` returns before reading
the four.** It binds for the next score that puts a `showWhen` on an input its `calculate` actually
reads, which is the case where a hidden value moves a number. §6.1 is what binds now.

Note also that `sweepInputs` is the reason `calculate` must stay total over the illegal combination —
do not "simplify" it on the assumption the UI filters.

### 6.5 The rest of the new e2e spec

- Visibility both ways: `await expect(page.locator("#field-admission_source")).toHaveCount(1)` on the
  4-hour window, `toHaveCount(0)` on the 12- and 24-hour windows, for all four ids.
- Denominator: with only the window selected, the counter reads `1 of 26 entered` on 4 h and
  `1 of 22 entered` on 12 h. This is the single assertion that catches an N/M desync.
- Installed-base decode:
  `goto("/calculators/prism#collection_window=first_12h;age=3~years;pupils=both_reactive;cancer=true")`,
  then switch to the 4-hour window, and assert `#field-cancer` has no option selected.
- Output shape: `[data-result-values]` (`calculator-form.tsx:1202`) reads `1` on a complete 12-hour
  entry — the total, with the two subscores claimed by the composition — and `2` on a 4-hour entry
  with all four covariates answered.
- Group removal: the `Admission context` legend is absent from the form on the 12- and 24-hour
  windows.

Do **not** reuse `openWithValues` from `composition.spec.ts` for a PRISM fragment containing gated
ids: it asserts `#field-${id}` renders for every id in the fragment (`composition.spec.ts:110`), which
is exactly what must not be true here.

### 6.6 Make them fail on purpose once

Per the root guide's rule that a guard which has never failed deserves suspicion: after the gates are
green, delete the `continue` from `validation.ts` and confirm §6.1 goes red; add a `showWhen` naming
a non-existent id and confirm §6.3 goes red; set `required: true` on `cancer` and confirm §6.3 goes
red. Then revert. Record in the PR description that this was done and what each produced.

Run e2e as `pnpm --filter @towardpcc/web test:e2e`, and read the `N passed` line rather than the exit
code — a real run prints `Running 126 tests using 1 worker`, and this change adds to that number.

---

## 7. What must not be done

**Do not make the four covariates `required: true`.** The comment that currently protects them
(`prism.ts:530-544`) rests on the word _unconditional_, and `showWhen` reads as answering that
objection. It does not. `InputValues` (`types.ts:112`) maps `required: true` to a mandatory key, and
`runValidation` (`:21-28`) rejects an absent one with no notion of visibility — so a hidden required
input makes the entire score permanently `{ok:false}`: no total, no subscores, nothing. The rail then
names a field by label (`:245-252`, deliberately un-gated by `blurred`) whose jump button silently
returns (`:1156-1157`), whose inline message can never render because a hidden field can never be
blurred (`:227`), and which — being the last four declared — falls past `BLOCKING_SHOWN = 5` (`:984`)
into an anonymous "and 4 more". Every gate stays green: `sampleInputs` supplies every declared input
by construction, and `assertSuiteComplete` (`testing/harness.ts:58-61`) exempts booleans, so three of
the four would add no test obligation at all.

**Do not delete or weaken `prism.ts:745-746`.** It is the engine-side gate. Keep it until the §6.1
property is asserted, and keep it after.

**Do not remove `collection_window` from `inputs`.** `ScoreDefinition` (`types.ts:257-338`) has no
annotation channel; `inputs`/`InputValues` is the only path user-supplied data reaches `calculate`.
Moving the window out takes `values.collection_window` away from `prism.ts:745` and relocates a
clinical gate into the presentation layer — which has no 100% coverage gate — while
`mortality_probability` would still be emitted and would still flow into the flat list
(`composition-panel.tsx:74`), the `aria-live` region (`calculator-form.tsx:1115-1125`) and
`copySummary` (`:330-347`). "Recorded annotation" is a labelling and placement change, not a
data-model move.

**Do not clear a hidden field's state on hide.** It destroys four answers on a mis-tap, and it cannot
be made reliable: fragment hydration replaces state wholesale (`:168`) with no per-field handler, so
clearing hung off the controller's `onChange` is bypassed entirely. Prune at decode instead (§5.2).

**Do not implement visibility only in `calculator-form.tsx`.** The `as never` cast at `:200` means
typecheck cannot see a mismatch between what renders and what computes, and every non-form caller —
tests, a print path, a future runtime — bypasses the filter.

**Do not add a fourth `ScoreInput` union member**, and **do not make `showWhen` a function** (§1.2).

**Do not filter only the numerator or only the denominator** of the completion counter (§5.1).

**Do not give PRISM interpretation bands to obtain a `primaryId`.** `interpretationStatus:
"not-applicable"` is closed permanently and argued at `prism.ts:602-631`, pinned by a test that would
have to be deleted on purpose.

**Do not add a sixth changelog `reason` value** (§4).

**Do not batch this with anything else.** Every path here is on the branch-alone list in the root
guide: `packages/scoring-engine/**`, `components/calculator/**`, and the changed public claim on
`/calculators` and in the nav.

---

## 8. Deliberately deferred: PR-2, the derived-output declaration

The decision names the probability as "a downstream output". Today it renders as a peer row beside
`prism_total` for two compounding structural reasons, neither about its id: `splitComposition`
(`composition-panel.tsx:74`) sweeps everything not claimed by a component into `flat`, and
`primaryId` (`calculator-form.tsx:1058`) is derived from interpretation bands, of which PRISM declares
none (`prism.ts:602`) — so the two flat values render at equal weight.

`composition` cannot carry the relationship: the registry gate asserts a sum identity across the
sweep (`registry-gate.test.ts:187-225`), so any declared component must be a summand of the total, and
a probability is not. A new optional field on `ScoreDefinition` is required, and the gate's own
comment (`:180-181`) anticipates it: "A derived output is not a summand, so it never enters the
identity, and adding one tomorrow requires no change here."

Deferred because it is a second new `ScoreDefinition` field on a change that already touches the
engine, the form, two server surfaces and the gate. Three constraints found while investigating, so
PR-2 does not have to rediscover them:

- The declaration belongs on `ScoreDefinition`, not as a flag on `ScoreValue` — same argument
  `types.ts:232-234` makes for `composition`'s maxima.
- `from` must be `["neurologic_subscore", "non_neurologic_subscore"]`, **never `["prism_total"]`**.
  PRISM IV does not use the total; it weights the halves at 0.197 and 0.163 (`prism.ts:804-805`), and
  `prism.test.ts:726` exists to catch an implementation that summed first. Declaring the total would
  render a clinical falsehood.
- The gate on it must be one-directional — "if emitted, then declared" — because a derived output is
  conditionally emitted. `sampleInputs` picks `options[0]`, which is `first_4h`, and `false` for every
  boolean, so a copy of the composition gate would pass on the base vector and fail across the sweep.
- Keep the id `mortality_probability`: it is shared with `pim3.ts:520` and `pelod2.ts:482`, nothing
  under `apps/web` keys on it, and `prism.test.ts:556-558` asserts an exact id list specifically so a
  probability cannot be smuggled back under a new name.
