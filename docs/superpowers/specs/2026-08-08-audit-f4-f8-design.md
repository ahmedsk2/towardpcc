# Design brief — audit findings F4 and F8

**Date:** 2026-08-08
**Scope:** two score changes in `packages/scoring-engine`
**Tracked as:** task #44 (KDIGO: allow urine-output-only staging (F4)) and task
#47 (Burn F8: time-since-burn and fluid-given inputs, mL/h outputs). Both tasks
are `pending`. The originating F-numbered audit text itself was NOT located —
`docs/security/threat-model.md`'s F-numbers are data flows, and no F-numbered
finding list exists in `docs/reviews/`. **The requirement is therefore taken
from the task titles, not from a source document.** If the audit exists
somewhere, read it before trusting this brief's framing of intent.

Both changes touch `packages/scoring-engine/**` and change a number a clinician
reads. Per the root `CLAUDE.md` branching rule each **stands alone on its own
branch and runs the FULL gate** (`pnpm gate --full`). Neither batches with
anything.

> **Read section 6 of each finding first.** Load-bearing claims behind both
> changes were put to adversarial verification and several did not survive. Two
> of them are hard blockers: implementing around them would produce a
> clinically wrong calculator that passes every test in this repo.

---

## F4 — KDIGO: allow urine-output-only staging

### F4.0 What is actually true today

`kdigoAki` (v3.1.0) already implements the max-of-two-axes rule correctly and
already stages the urine-output axis with no baseline. What it does **not** do
is accept an entry with no serum creatinine.

The block is not in the score. It is one level up in the engine:

- `packages/scoring-engine/src/scores/kdigo-aki.ts:91-94` — `scr` is
  `required: true` (and `age` likewise at `:74-77`).
- `packages/scoring-engine/src/validation.ts:21-28` — an absent or null value
  for a required input pushes `{ code: "missing-required", message:
"<label> is required." }`.
- `packages/scoring-engine/src/define-score.ts:22-26` — `compute` returns
  `{ ok: false, errors }` and `calculate` is never called.

Confirmed by execution: `kdigoAki.compute({ urine_output: 0.2 mL/kg/h,
uo_duration: "24h-or-more" })` returns `ok: false` with exactly two errors,
"Age is required." and "Current serum creatinine is required."

`calculate` itself has no gate at all — no early return, no "cannot stage"
path. It always emits `stage = Math.max(settled, scrUnbaselined3)`
(`kdigo-aki.ts:454-456`).

The test suite has been working around the requiredness rather than testing it:
`kdigo-aki.test.ts:337-343` states in a header comment that every case in the
urine-output block carries a fabricated creatinine of 0.3 mg/dL with no
baseline so the SCr axis contributes 0. There is **no** UO-only test and **no**
`missing-required` test for this score at all.

### F4.1 Exactly what to change

**File:** `packages/scoring-engine/src/scores/kdigo-aki.ts`
**Also:** `packages/scoring-engine/src/scores/kdigo-aki.test.ts`,
`docs/research/scores/kdigo-aki.md`

#### Inputs

No new inputs. One requiredness flip:

| id    | change                                 | notes                                                                     |
| ----- | -------------------------------------- | ------------------------------------------------------------------------- |
| `scr` | `required: true` → `required: false`   | Bounds unchanged: numeric, `creatinineMgdl`, min 0.1, max 15 (`:99-100`). |
| `age` | **recommend leaving `required: true`** | See F4.6 — this is a founder question, not settled by the repo.           |

This is a **compile-breaking change, not a flag flip.** `InputValues`
(`packages/scoring-engine/src/types.ts:111-117`) maps `required: true` ids to
mandatory keys, and `calculate` dereferences `values.scr.value` with no
optional chaining at `kdigo-aki.ts:343`, unlike all six optional inputs which
use `?.` at `:344-349`. Every read of `scr` inside `calculate` must move to
`values.scr?.value` and every downstream use must narrow.

The existing 48 worked examples all supply `scr`, so **they still typecheck** —
supplying an optional key is legal. The only compile break is inside
`calculate`.

Note the `scr` min bound is 0.1 mg/dL (`:99`), so today a user cannot enter 0
or blank as a "no creatinine" placeholder — inventing a plausible value is the
only current workaround, and that workaround is not inert: an invented value
≥ 4.0 mg/dL with no baseline unilaterally raises the reported stage to 3
(`:399`, `:455`).

#### Outputs

The score emits exactly two outputs today, both unconditionally
(`kdigo-aki.ts:467-485`): `kdigo_stage` and `stage_is_floor`.

Add **one** new output. Its name and meaning are constrained by the adversarial
findings in F4.6 — it must NOT be folded into `stage_is_floor`.

| id                      | label (proposed)                                                                           | value  | unit | precision |
| ----------------------- | ------------------------------------------------------------------------------------------ | ------ | ---- | --------- |
| `scr_axis_not_assessed` | "Serum-creatinine axis was not assessed — the stage rests on urine output alone (1 = yes)" | 1 or 0 | `""` | 0         |

`stage_is_floor` keeps its exact current meaning and its current label,
"Stage is not settled — read it as a bound, not a final stage (1 = yes)"
(`:477-480`). Do not touch it.

#### Code gates to modify

1. `kdigo-aki.ts:343` — `const scr = values.scr.value;` becomes optional.
2. `kdigo-aki.ts:369-379` — the baseline block already guards on
   `baseline !== undefined`; it must additionally guard on `scr !== undefined`
   before computing `ratio` and `scr - baseline`.
3. `kdigo-aki.ts:397` — `if (scr >= 4 && akiDefinitionMet)` needs
   `scr !== undefined &&`.
4. `kdigo-aki.ts:399` — `scrUnbaselined3` needs `scr !== undefined &&`.
5. `kdigo-aki.ts:404-405` — the eGFR and RRT branches read no creatinine and
   are **unchanged**. `egfr` is an independent numeric input; it must still
   stage a patient whose creatinine was not entered.
6. `kdigo-aki.ts:203-248` — the `stage-0` band description at `:212` must be
   reworded (see F4.3). That is user-visible text, so it forces the version
   bump on its own.
7. `kdigo-aki.ts:333-339` — `formula` and `notes` must state the new
   behaviour. Both are user-visible.
8. **`docs/research/scores/kdigo-aki.md` must be amended first** — see F4.5.
   Its Inputs table marks `scr` required "**yes**" at `:126`, so it will
   contradict the code otherwise.

### F4.2 The precise arithmetic

Every expression below is written against the existing variable names in
`calculate` (`kdigo-aki.ts:341-486`). Nothing in the urine-output block changes.

```
// UNCHANGED — the UO axis reads no creatinine and no baseline.
outputUnder05 = anuria || (uo !== undefined && uo < 0.5)
outputUnder03 = uo !== undefined && uo < 0.3
uoStageFor(w) = max of:
    outputUnder05 && w[0] -> 1     // < 0.5 mL/kg/h, 6 to < 12 h
    outputUnder05 && w[1] -> 2     // < 0.5 mL/kg/h, >= 12 h
    outputUnder03 && w[2] -> 3     // < 0.3 mL/kg/h, >= 24 h
    anuria        && w[1] -> 3     // anuria, >= 12 h
uoCertain  = duration === undefined ? 0 : uoStageFor(DURATION_WINDOWS[duration])
uoPossible = duration === undefined ? uoStageFor(ANY_DURATION)
           : duration === "12h-or-more" ? uoStageFor(DURATION_WINDOWS["24h-or-more"])
           : uoCertain

// CHANGED — every creatinine route gains an `scr !== undefined` guard.
scrKnown        = scr !== undefined
baselineKnown   = baseline !== undefined
scrRatioAssessable = scrKnown && baselineKnown

// (baseline block, only when scrRatioAssessable)
ratio           = scr / baseline
scrStage        = ratio >= 3 - EPS ? 3 : ratio >= 2 - EPS ? 2 : ratio >= 1.5 - EPS ? 1 : 0
scrStage        = (scr - baseline >= 0.3 - EPS && scrStage < 1) ? 1 : scrStage
akiDefinitionMet = scrRatioAssessable && scrStage >= 1

if (scrKnown && scr >= 4 && akiDefinitionMet) scrStage = 3
scrUnbaselined3 = (scrKnown && scr >= 4 && !baselineKnown) ? 3 : 0

// UNCHANGED — independent of creatinine.
if (egfr !== undefined && egfr < 35 && ageYears < 18) scrStage = 3
if (onRrt) scrStage = 3

// UNCHANGED — the reported stage and the existing flag.
settled  = max(scrStage, uoCertain)
stage    = max(settled, scrUnbaselined3)
ceiling  = max(scrStage, uoPossible, scrUnbaselined3)
unsettled = ceiling > stage || stage > settled

// NEW — a distinct signal, computed independently of `unsettled`.
scrAxisSettledHigh = onRrt || (egfr !== undefined && egfr < 35 && ageYears < 18)
scrAxisNotAssessed = !scrAxisSettledHigh
                  && !scrRatioAssessable
                  && scrUnbaselined3 === 0
```

Read `scrAxisNotAssessed` as: no route on the creatinine axis was evaluable,
and no route settled it high. It is true in two cases —

- **(a)** `scr` absent entirely (the new UO-only path), and
- **(b)** `scr` present but `< 4.0` with **no baseline**.

Case (b) already happens today and is silently reported as a settled axis
contributing 0. That is the pre-existing gap the adversarial pass found
(`kdigo-aki.ts:369`, `:399`, `:456`, `:465`). Including it makes this a
behaviour correction and **changes assertions in the existing UO test block**,
because every case there is scr 0.3 with no baseline. Excluding it ships a flag
that reports "assessed" for an axis that was never assessable — precisely the
"guard that has never failed" pattern the root `CLAUDE.md` warns about. **See
F4.6 / founder question 3.**

### F4.3 Edge cases and required behaviour

#### No creatinine, no urine-output row fires (e.g. rate ≥ 0.5 at any window)

`stage = 0`, `stage_is_floor = 0`, `scr_axis_not_assessed = 1`. The problem is
the band, not the number: `stage-0`'s description at `kdigo-aki.ts:212` reads
"The KDIGO 2012 definition of acute kidney injury is not met on the criteria
entered", which asserts a negative on an axis never measured. Its existing
hedge names only the urine-output axis. **The band text must be rewritten to
name an unassessed creatinine axis explicitly.** What it should say is a
clinical-safety call — founder question 2.

#### No creatinine, no urine output either (age alone, or age + RRT)

With RRT: `stage = 3`, `scr_axis_not_assessed = 0` (RRT settles it).
With nothing: `stage = 0`, `scr_axis_not_assessed = 1`. Consider whether an
entry with no creatinine and no urine-output data of any kind should compute at
all, or should reject. The engine has no "at least one of" validation
primitive; adding one is out of scope here. The web form already suppresses
compute until something is entered
(`apps/web/components/calculator/calculator-form.tsx:197-200`,
`anyEntered(inputs, state)`).

#### No creatinine, eGFR entered, age < 18, eGFR < 35

`stage = 3` via `:404`, `scr_axis_not_assessed = 0`. This is correct and must
not regress — eGFR is its own Table 2 branch and does not require the
creatinine input.

#### No creatinine, baseline entered

`scrRatioAssessable` is false (needs both). Baseline alone stages nothing. This
is a plausible mis-entry; it produces the same result as no creatinine at all.
Acceptable, but assert it.

#### Creatinine entered, no baseline, `scr >= 4.0`

Unchanged: `stage = 3`, `stage_is_floor = 1`, and `scr_axis_not_assessed = 0`
because `scrUnbaselined3 === 3`. The axis WAS assessed on the absolute route;
the uncertainty there runs downward and is already carried by `stage_is_floor`.

#### Anuria with no duration band and no creatinine

`uoCertain = 0`, `uoPossible = 3`, so `stage = 0`, `stage_is_floor = 1`,
`scr_axis_not_assessed = 1`. Both flags set, meaning different things. Confirm
the UI can render that without implying they are the same caveat.

#### `age` still required

If age stays required, a UO-only entry still rejects without it. That is the
recommended behaviour (age is always known, and it is what keeps the eGFR
branch off an adult — `kdigo-aki.ts:79-84`), but it means "urine-output-only"
is really "urine-output plus age". Say so in the changelog.

### F4.4 Changelog

**Version: 4.0.0.** A major: an entry that previously rejected now returns a
stage, a new output id appears, and (if case (b) is included) an existing
reported result gains a flag it did not carry.

**Reason enum: `formula-correction`.**

The enum is `initial-release | formula-correction | new-reference |
clarification | output-withdrawn` (`packages/scoring-engine/src/types.ts:211-216`).
Neither `clarification` nor `formula-correction` is a clean fit — nothing in
the max-of-axes arithmetic was wrong. `clarification` is precluded because
computed output genuinely changes (2.0.1 used it explicitly for "no computed
value changed"). `formula-correction` is the least-wrong and becomes clearly
right if case (b) lands, since that IS a correction of a result that
under-reported its own uncertainty. **The summary carries the burden** — write
it to say plainly what changed and in which direction.

The entry must state, at minimum:

- that `scr` is no longer required, and that the urine-output axis needs
  neither a creatinine nor a baseline (KDIGO Rec 2.1.1 criterion 3);
- that `age` remains required (or does not) and why;
- what `scr_axis_not_assessed` means, and — explicitly — that it is **not** the
  same signal as `stage_is_floor`, naming the v3.0.0 rewording so a reader does
  not conflate them;
- if case (b) is included: that a creatinine entered without a baseline and
  below 4.0 mg/dL was previously reported as a settled axis and is now flagged,
  in the house retraction style used at 2.0.0 and 3.0.0.

Two gates enforce the bump: `registry-gate.test.ts:95-114` (version equals
newest changelog entry; dates oldest-first) and the colocated
`kdigo-aki.test.ts:923-927`, which pins the **literal** `"3.1.0"` and must be
edited.

### F4.5 Tests that would make this trustworthy

`packages/scoring-engine` is gated at 100% lines/branches/functions/statements.

#### Amend the research note before writing the worked example

Invariant 4: no clinical number ships without a citation and a cited worked
example. The note's UO worked examples (C, D, E, F at
`docs/research/scores/kdigo-aki.md:174, :184, :198, :212`) are all phrased "SCr
axis not staging", never "SCr absent", and its Inputs table marks `scr`
required (`:126`). The note also **nowhere states affirmatively** that the
urine-output axis needs no baseline — it is true by construction and by
examples C/G/M, but there is no sentence to quote. Add both: a UO-only worked
example, and the affirmative sentence. Then cite the note as the `locator`.

#### New worked examples

- UO-only Stage 1: age + `urine_output` 0.4 + `uo_duration` `6-to-under-12h`,
  no `scr` → `kdigo_stage: 1`, `stage_is_floor: 0`, `scr_axis_not_assessed: 1`.
- UO-only Stage 2: 0.4 + `12h-or-more` → stage 2, floor 0 (0.4 caps the axis at
  2, so nothing is open — `kdigo-aki.md:109`), not assessed 1.
- UO-only Stage 3 by rate: 0.2 + `24h-or-more` → stage 3, floor 0.
- UO-only Stage 3 by anuria: `anuria: true` + `12h-or-more`, no rate → stage 3.
- UO-only, nothing fires: 0.8 + `24h-or-more` → stage 0, floor 0, not assessed 1.

The harness asserts `outcome.ok` before checking any value
(`packages/scoring-engine/src/testing/harness.ts:159-161`), so **each of these
fails today** rather than silently passing. Confirm that before implementing.

#### Rejection and boundary coverage

`assertSuiteComplete` (`harness.ts:53-66`) requires a rejection for every
**required** non-boolean input. Making `scr` optional removes it from that
filter, so the existing `rejectsImplausible("a creatinine above the plausible
ceiling", …)` at `kdigo-aki.test.ts:875-884` is no longer demanded — **keep it
anyway**, and add:

- a new `rejectsImplausible` proving `age` is still required
  (`{ inputId: "age", code: "missing-required" }`) — otherwise nothing stops a
  later change quietly dropping age's requiredness too. This is the first
  `missing-required` test this score has ever had.
- an assertion that an entry with neither `scr` nor `age` returns exactly one
  error, for `age`.

#### Regression pins

- Worked example A (`kdigo-aki.test.ts:33-41` — creatinine + baseline, no urine
  output at all) must still report `stage_is_floor: 0`. Add
  `scr_axis_not_assessed: 0` to it.
- The settled-Stage-2 case at `:378-392` ("a settled Stage 2, not a lower
  bound") must keep `stage_is_floor: 0`.
- The un-baselined ≥ 4.0 case at `:168-175` must keep `stage_is_floor: 1` and
  gain `scr_axis_not_assessed: 0`.

#### Adversarial checks — make each FAIL on purpose before trusting it

1. **The new flag is actually read.** Hard-code `scrAxisNotAssessed` to `0` and
   confirm every UO-only worked example goes red. If any stays green its
   expectation is not reading the output.
2. **The two flags have not been conflated.** Assert on a settled UO-only Stage
   2 that `stage_is_floor === 0` while `scr_axis_not_assessed === 1`. Then
   temporarily set `unsettled = unsettled || scrAxisNotAssessed` and confirm it
   goes red. This is the check that defends the v3.0.0 wording decision.
3. **The `missing-required` guard still exists.** Before the change, record
   that `compute({ urine_output, uo_duration })` returns two errors. After,
   assert it returns exactly one (`age`). Temporarily flip `age` to optional
   and confirm the new test goes red.
4. **Case (b), if included.** Write the assertion that scr 0.3 + no baseline +
   UO gives `scr_axis_not_assessed: 1` and confirm it fails before the change —
   it must, since the output does not exist yet.
5. **The Stage-0 band text.** Add a prose assertion that the stage-0
   description names an unassessed creatinine axis, and confirm it fails
   against the current text at `:212`.

### F4.6 Claims that did NOT survive adversarial verification

#### BLOCKER 1 — "a single-axis stage is a LOWER BOUND, so emitting it is safe provided it is labelled as not-fully-assessed"

**Refuted 2 of 2.** This was the safety argument for F4 and it does not hold.

- The reasoning is false for the creatinine axis. `scrUnbaselined3`
  (`kdigo-aki.ts:399`, raised into the reported stage at `:455`) makes an
  un-baselined creatinine ≥ 4.0 mg/dL an **upper** bound: the same patient with
  a baseline on file can be Stage 0 (`kdigo-aki.md:254-266`, Example L —
  chronic 4.6 vs 4.5, verified by execution).
- The repo already rejected this exact wording. The v3.0.0 changelog
  (`kdigo-aki.ts:317`): the flag's label "now reads 'not settled' rather than
  'a lower bound', because the stage can now be unsettled downward as well as
  upward and the old wording would have been false in the new case."
  `kdigo-aki.md:53` states the directionality outright.
- `stage_is_floor` does **not** mean "not fully assessed". It means an entered
  value leaves a specific Table 2 row open **and** closing it would change the
  answer (`kdigo-aki.ts:465`; `kdigo-aki.md:109`). The notes forbid the broader
  reading: "Reporting '≥ 2' for an answer already settled at 2 is false
  caution, and it erodes the flag exactly where it has to mean something"
  (`kdigo-aki.ts:339`).

**What the engineer must do:** do not reuse `stage_is_floor` and do not use
"lower bound" or "≥" framing anywhere in the new output's label or in the band
text. Use a separately named signal — this brief proposes
`scr_axis_not_assessed` — whose meaning is "this axis was not evaluated", with
no direction implied. Any wording that implies the true stage can only be
higher must be rejected in review.

#### BLOCKER 2 — "a stage can be assigned from urine output alone, with no creatinine and no baseline"

**Refuted 1 of 2, and the refutation is about this implementation, not the
guideline.** The max-of-axes half and the no-baseline half are fully supported
(`kdigo-aki.md:15`, `:98`, `:23`; `kdigo-aki.ts:454-456`). The "no creatinine"
half is false **today** — which is exactly what F4 exists to change, so it is
not a blocker to the work, but it is a blocker to the justification:

**Nothing in this repo establishes that a urine-output-only stage is a
legitimate KDIGO output rather than a partial assessment requiring a label.**
The score's own notes record that "the urine-output criteria are less well
validated than the creatinine criteria" and that KDIGO gives no weight basis
for mL/kg/h (`kdigo-aki.ts:339`). The research note's provenance header
(`kdigo-aki.md:5`) records that the official KDIGO PDF returned HTTP 403 and
three reproductions were used instead — so every page citation behind this is
taken on trust. **Resolve with the founder (question 1) before implementing.**

#### Also refuted, and useful

The reviewer's reading that "whichever criterion yields the higher stage"
licenses applying every Table 2 cell independently is wrong and would
reintroduce the over-staging bug fixed at v3.0.0: the ≥ 4.0 mg/dL route is
gated on the Rec 2.1.1 definition first (`kdigo-aki.ts:397`;
`kdigo-aki.md:35-51`). Do not simplify that gate while refactoring `calculate`.

---

## F8 — Burn: elapsed-time and fluid-given inputs, mL/h rate outputs

### F8.0 What is actually true today, and a sequencing hazard

`burn-resuscitation.ts` on disk is byte-identical to `main` and `origin/main`
(verified: `git diff main --stat` and `git diff origin/main --stat` both empty
for the score and its test, despite the working tree sitting on
`feat/ddimer-unit-toggle`).

`main` carries the **old four-row form** at **v1.6.0**: two inputs
(`weight_kg`, `tbsa_pct` — `:112-149`) and six outputs (`:388-449`), of which
`parkland_peds_24h_ml` and `mod_brooke_peds_24h_ml` are computed by
character-identical expressions (`:384-385`).

**The collapse is unmerged.** `origin/fix/burn-duplicate-rows` is a single
commit (`45ef9c1`) that bumps to **1.7.0** and renames the resuscitation
outputs to `resuscitation_24h_ml`, `resuscitation_first8h_ml`,
`maintenance_24h_ml`, `resuscitation_plus_maint_24h_ml`. It touches all three
files this work touches (65 lines of the score, 82 of the test, 14 of the
note). **Building F8 against `main`'s ids guarantees a conflict in `calculate`,
in all five worked examples, and in every `out.get(...)` in the test.** Founder
question 9. This brief writes output ids in the post-collapse naming; if the
collapse is abandoned, substitute `parkland_peds_*`.

The score already tells the reader to do this arithmetic by hand, in exactly
the shape F8 would automate: "Subtract what has already run, and divide the
remainder by the hours left in the 8-hour window, by hand."
(`burn-resuscitation.ts:340`, caution `burn.caution.prearrival`).

### F8.1 Exactly what to change

**File:** `packages/scoring-engine/src/scores/burn-resuscitation.ts`
**Also:** `packages/scoring-engine/src/scores/burn-resuscitation.test.ts`,
`docs/research/scores/burn-resuscitation.md`, and a new unit module.

#### A new unit spec is required

There is **no time `UnitSpec`** in `packages/scoring-engine/src/units/` — the
directory holds age, calcium, cardiac, concentration, electrolytes, fraction,
infusion, length, mass, osmolytes, pressure, volume. Add
`packages/scoring-engine/src/units/time.ts` with a colocated
`time.test.ts` (every other unit module has one):

```
hoursWithMinutes: UnitSpec = { canonical: "h", alternates: [minutesForHours] }
minutesForHours:  toCanonical = (min) => min / 60, fromCanonical = (h) => h * 60
```

Do **not** set `canonicalDecimals` — per `packages/scoring-engine/CLAUDE.md`,
set it only when the guideline prints an alternate-unit equivalent of its own
cutoff. It does not here.

#### Inputs to add

| id                  | label                             | type    | unit               | min | max | required           |
| ------------------- | --------------------------------- | ------- | ------------------ | --- | --- | ------------------ |
| `time_since_burn_h` | Time elapsed since the burn       | numeric | `hoursWithMinutes` | 0   | 24  | **see F8.6 / Q10** |
| `fluid_given_ml`    | Resuscitation fluid already given | numeric | `litresWithMl`     | 0   | 10  | **see F8.6 / Q10** |

- The 0–24 h bound is the research note's own declaration
  (`docs/research/scores/burn-resuscitation.md:390`). **It admits values at and
  beyond 8 h, where the note's own rate formula breaks.** That is Blocker 1.
- `litresWithMl` (`packages/scoring-engine/src/units/volume.ts:23-26`) is
  canonical **litres**, accepting mL. Reusing it means `min`/`max` are in L
  while every other bound and output on this score is in mL, and `calculate`
  must multiply by 1000. The alternative is a new mL-canonical spec. Reuse is
  recommended (one audited volume spec, and mL is what flowsheets chart) but
  flag the unit in a comment at the multiplication site. Multiplying a
  canonical value by 1000 is arithmetic, not unit conversion, so it does not
  violate the "never unit-convert inside `calculate`" rule.
- The label must say what "already given" counts — resuscitation crystalloid
  only, or all fluid. The note does not say. Default to resuscitation
  crystalloid and state it in `helpText`.

#### Outputs to add

| id                                | meaning                                           | unit | precision |
| --------------------------------- | ------------------------------------------------- | ---- | --------- |
| `resuscitation_first8h_rate_ml_h` | Infusion rate for the remainder of the 8-h window | mL/h | 1         |
| `resuscitation_next16h_rate_ml_h` | Infusion rate, hours 8–24 from the burn           | mL/h | 1         |
| `maintenance_rate_ml_h`           | Maintenance drip rate, constant across 24 h       | mL/h | 1         |

Precision 1 rather than the score's uniform 0, because the note's worked
examples print rates to one decimal (70.3, 35.2, 52, 112.5 mL/h — note
`:416-421`, `:436`). Every existing output stays `precision: 0`.

Consider also `resuscitation_first8h_remaining_ml` (the numerator), so the
reader can see the subtraction rather than only its quotient. Recommended: it
makes the pre-arrival deduction auditable at the bedside.

#### Code gates to modify

1. `burn-resuscitation.ts:379-381` — `calculate` currently reads exactly two
   canonical values.
2. `burn-resuscitation.ts:399-408` and `:419-428` — the first-8-h volume
   outputs are a bare `parkland24h / 2` under the label "(half, from time of
   burn)". **Their meaning changes** even if their arithmetic does not: see
   F8.4.
3. `burn-resuscitation.ts:340` — the caution `burn.caution.prearrival` asserts
   the absence this change removes, verbatim: "This calculator takes neither an
   elapsed-time nor a fluid-given input". It must be rewritten or retracted.
4. `burn-resuscitation.ts:377` — the notes assert the same absence: "This score
   has no elapsed-time input, no fluid-already-given input, and emits no
   infusion rate; its first-8-hour figure is simply half the 24-hour volume …
   That is a gross volume, not the volume still to be infused". Same.
5. `burn-resuscitation.ts:335` — the `formula` text states the split but no
   rate.
6. `interpretation: []` at `:152` stays empty. Rates are a dosing estimate
   titrated to urine output, not a classifier.

### F8.2 The precise arithmetic

**Only the maintenance line below is safe to implement as written.** The two
resuscitation rates depend on Blockers 1 and 2 (F8.6).

```
// UNCHANGED
resus24h        = PEDIATRIC_COEFF_ML * weight_kg * tbsa_pct     // 3 * kg * %
maintenance24h  = hollidaySegarMaintenanceMl(weight_kg)
                //  w <= 10 -> 100*w
                //  w <= 20 -> 1000 + 50*(w-10)
                //  else    -> 1500 + 20*(w-20)

// SAFE — survives adversarial verification 2/2.
maintenanceRate = maintenance24h / 24        // CONSTANT across all 24 hours.
                                             // NOT split 8/16. NOT titrated.

// Derived from the inputs
fluidGivenMl    = fluid_given_ml_canonical_L * 1000
hoursLeft       = 8 - time_since_burn_h

// READING A — the research note's R.2 rate formula (md:649-650)
first8hRemaining = (resus24h / 2) - fluidGivenMl
first8hRate      = first8hRemaining / hoursLeft
next16hRate      = (resus24h / 2) / 16        // no subtraction term at all

// READING B — the Children's Hospital of Michigan algorithm (md:638-642)
adjusted24h      = resus24h - fluidGivenMl
first8hRate      = (adjusted24h / 2) / hoursLeft
next16hRate      = (adjusted24h / 2) / 16     // the 16-h phase shrinks too
```

**A and B are different arithmetic and the note prints both without
reconciling them.** Under A the 8–24 h phase is untouched by pre-arrival fluid;
under B it is reduced. Blocker 2.

**A trap in the wording, worth stating explicitly:** "the remaining first-8-h
volume" means the half **minus fluid actually given**, not a time-prorated
fraction of it. A child arriving at hour 3 having received nothing still owes
the FULL first-8-h volume, run over 5 hours — not 5/8 of it. Implementing
`(resus24h / 2) * (hoursLeft / 8) / hoursLeft` is a systematic under-dose and
the note's prose admits that misreading ("one arriving 3 hours after the burn
has the remainder to run over 5 hours, not 8" — `md:729`).

### F8.3 Edge cases and required behaviour

#### `time_since_burn_h === 8` exactly — DIVISION BY ZERO

`hoursLeft === 0`. Must not emit `Infinity`. Behaviour **UNSPECIFIED** — see
Blocker 1. Do not implement until resolved.

#### `time_since_burn_h > 8` — NEGATIVE DENOMINATOR

Must not emit a negative rate. Behaviour **UNSPECIFIED** — see Blocker 1. The
input bound of 24 h admits this region deliberately, so it will be reached.

**Do not implement "no first-8-h rate left to give".** That reading was
adversarially refuted and is in the documented lethal direction.

#### `fluid_given_ml` exceeds the first-8-h volume — NEGATIVE NUMERATOR

Behaviour **UNSPECIFIED**. The note names "goes negative" only in respect of
the denominator (`md:653`), never the numerator. Founder question 7.

#### `tbsa_pct === 0`

`resus24h === 0`, so every resuscitation rate is 0 (or negative, if fluid was
given). `maintenance_rate_ml_h` is still positive and correct. Assert this —
`tbsa_pct` min is 0 (`:142`) so the boundary test will exercise it.

#### `weight_kg === 0.5` with `tbsa_pct === 100`

`resus24h = 150 mL`. Combined with a small `hoursLeft` this produces a large
rate against a tiny patient. Whether the AWMF 10 mL/kg/h cap should fire here
is founder question 8.

#### The boundary tests constrain the design

`ctx.boundaryTest(inputId, "max", base)` asserts `compute` is `ok` **at** the
declared bound (`harness.ts:134-145`). For `time_since_burn_h` with `max: 24`
that means **`compute` must return `ok: true` at 24 h** — so whatever the >8 h
behaviour is, it cannot be a rejection, and every emitted value must be finite.
This is a hard constraint on the answer to Blocker 1, not a preference.

#### Every emitted value must be finite

Add a sweep asserting `Number.isFinite` on every output across a grid of
weight × TBSA × time × fluid-given, including the degenerate corners. This is
the cheapest defence against `Infinity`/`NaN` reaching a bedside.

### F8.4 Changelog

**Version: 1.8.0** if the collapse (1.7.0) lands first; **1.7.0** if it does
not. A minor, not a major, provided the existing six (or four) outputs keep
their ids and values.

**Reason enum: `formula-correction`** — on the condition that the first-8-h
figure's published meaning changes from a gross half to a remaining volume, or
that its label changes. If the existing volume outputs are left completely
untouched and only rates are added, `clarification` is arguable but weak; do
not reach for it merely to avoid a major-sounding label.

The entry must:

- name the two new inputs and the three new outputs;
- state that maintenance is emitted as a constant hourly rate across all 24
  hours and is deliberately **not** split 8/16, with the reason (it replaces
  continuous obligate losses and is the dextrose vehicle; `md:657-658`,
  `md:249-254`);
- **retract the absence claim out loud**, in the style this file already uses
  at 1.3.0 ("CORRECTS A FALSE CLAIM") and 1.6.0 ("WITHDRAWS A WARNING THIS
  SCORE SHIPPED ONE RELEASE AGO"). Readers were told this calculator emits no
  rate and that they must do the arithmetic by hand; they are owed the
  correction rather than a silently different sentence. Name the versions that
  carried the old claim, as the existing tests demand for prior retractions
  (`burn-resuscitation.test.ts:726`, `:993`).

`registry-gate.test.ts:95-112` enforces version-equals-newest-entry and
oldest-first dates. The colocated test does **not** pin the version literal
(`burn-resuscitation.test.ts:1003-1004` asserts only the relation), so no test
edit is needed for the bump itself — unlike KDIGO.

### F8.5 Tests that would make this trustworthy

#### Existing assertions that WILL fail and must be updated deliberately

| assertion                                                            | location                             |
| -------------------------------------------------------------------- | ------------------------------------ |
| `expect(inputIds).toEqual(["weight_kg", "tbsa_pct"])`                | `burn-resuscitation.test.ts:573-574` |
| `expect(emitted.some((id) => /rate/i.test(id))).toBe(false)`         | `:571-572`                           |
| `expect(out.size).toBe(6)` (0.5–4 kg overlap band)                   | `:548`                               |
| `expect(outputsAt(25, 20).size).toBe(6)` ("fixed at six")            | `:870-871`                           |
| `expect(prose).toMatch(/no infusion rate\|emits no infusion rate/i)` | `:568`                               |
| `expect(notes).toMatch(/gross volume/i)`                             | `:569`                               |
| `expect(burnResuscitation.cautions).toHaveLength(9)`                 | `:1072`                              |

`expect(prose).toContain("1553")` at `:567` should **stay** — the ABRUPT
pre-arrival figure is what motivates the input and remains true.

Every caution key must stay namespaced `burn.caution.` and exceed 120
characters, and keys must be unique (`:1072-1079`).

#### New worked examples

Five exist today (`:41`, `:60`, `:77`, `:88`, `:100`), all keyed to the two
current inputs; they must gain the new inputs or be shown to still compute
without them. Add rate examples — but note the sourcing problem: the note's
printed rates (70.3, 35.2, 112.5 mL/h) are **the project's own arithmetic on
the formulas**, not figures any publication reports. Under invariant 4 a
clinical number needs a cited worked example. The workable route is a
`locator` pointing at the amended research note with the underlying formula
cited (StatPearls NBK534227 / NBK537190 for the clock rule at `md:148-151`;
Baxter & Shires 1968 for the split). Confirm that is acceptable — founder
question 6 in spirit, and `assertValidSource` requires citation + one of
pmid/doi/locator.

#### New rejection / boundary coverage

If either new input is **required**, `assertSuiteComplete` (`harness.ts:53-66`)
demands a registered rejection for it. Add `boundaryTest` for min and max on
both regardless — max on `time_since_burn_h` is the one that forces the >8 h
branch to be well-defined.

#### Adversarial checks — make each FAIL on purpose before trusting it

1. **Maintenance is not front-loaded — the highest-value check here.** Assert
   `maintenance_rate_ml_h * 24 === maintenance_24h_ml`, and separately assert
   it does **not** equal `(maintenance_24h_ml / 2) / 8`. Then temporarily wire
   maintenance through the resuscitation denominator and confirm both go red.
   Reusing one rate helper for all three rows is the natural coding shortcut
   and silently front-loads maintenance by 50% in the first 8 hours — the exact
   window where fluid creep does its damage, and it under-delivers dextrose
   across hours 8–24 in an infant.
2. **The `/rate/i` guard is real.** It has never failed. Before deleting it,
   add a dummy `foo_rate` output on a scratch branch and confirm `:571-572`
   goes red. If it does not, the guard was decorative and every conclusion
   drawn from its greenness is void.
3. **No proration.** Assert that at `time_since_burn_h = 3` with
   `fluid_given_ml = 0`, `first8hRate * 5 === resus24h / 2` — the full half over
   five hours. Then implement the prorated version and confirm it goes red.
4. **No `Infinity`, no `NaN`, no negative rate.** Sweep weight × TBSA × time ×
   fluid-given including `time = 8` and `time = 24`, asserting
   `Number.isFinite` and `>= 0` on every emitted value. Temporarily remove the
   `hoursLeft` guard and confirm it goes red.
5. **The pre-arrival subtraction is actually applied.** Assert
   `first8hRate(given = 1000) < first8hRate(given = 0)` at fixed weight, TBSA
   and time. Hard-code `fluidGivenMl = 0` and confirm it goes red.
6. **Reading A vs B is pinned.** Once the founder picks, assert the
   16-hour rate explicitly — under A it is invariant to `fluid_given_ml`, under
   B it is not. Whichever is chosen, the other must go red.

### F8.6 Claims that did NOT survive adversarial verification

#### BLOCKER 1 — "once more than 8 hours have elapsed there is no first-8-h rate left to give"

**Refuted 2 of 2.** Do not implement it.

The research note says only that "the denominator of rate₁ approaches zero or
goes negative on delayed presentation. Any implementation must handle that
explicitly rather than divide by zero or emit an absurd rate."
(`docs/research/scores/burn-resuscitation.md:653-655`). That is an instruction
about degenerate **arithmetic**. It does not say the volume is forfeited, and
a repo-wide search of the note found no catch-up, deficit or window-closed rule
anywhere.

The claim converts "the formula breaks" into "there is nothing left to give",
which is a non sequitur and points at the documented lethal direction: in the
German Burn Registry 86.5% of 407 children received **less** than Parkland plus
maintenance, and six of the seven who died were **under**-resuscitated
(`md:1481-1485`; the same finding at `burn-resuscitation.ts:370-372`). The
note's own second-phase formula `rate₂ = (0.5 × total) / 16` (`md:650`) carries
no shortfall term, so implementing the claim would discard the entire first
phase for the latest-presenting, sickest patient.

**What the engineer must resolve before writing this branch:** what the
first-8-h rate output shows at and beyond `hoursLeft <= 0`. Options the note
supports enough to put to the founder — spread the outstanding volume over the
hours remaining in the **24**-hour window (also anchored at the burn); emit no
first-8-h rate but a distinct "catch-up" rate; or emit a defined sentinel with
prose. The one hard published bound available to constrain any catch-up figure
is AWMF 006/128 Empfehlung 10 (12/12 consensus, evidence level IV): in children
with ≥ 10% TBSA, do not **initially** exceed 10 mL/kg/h (`md:852-855`;
`burn-resuscitation.ts:257`). Whatever is chosen must return `ok: true` at
`time_since_burn_h = 24` (see F8.3).

#### BLOCKER 2 — the order of operations for pre-arrival fluid is unreconciled

Not a failed adversarial verdict but a flat internal contradiction in the
source of record. Reading A (`md:649-650`) subtracts from the first-8-h half
only; Reading B (`md:638-642`, Children's Hospital of Michigan) subtracts from
the 24-h total before halving, which shrinks the 8–24 h phase too. The note
prints both. **Different answers produce different bedside volumes in the
second phase.** Founder question 5.

Compounding it: the note's own derived-output table omits the subtraction
entirely — `first8h_rate` is given as `first8h_ml / (8 − time_since_burn_h)`
(`md:398`) with no fluid-given term, contradicting its own R.2 `rate₁` fourteen
pages later. And although R.2 states "'Fluid already given' must be a
**required** input wherever a rate is emitted" (`md:656`), the note's Inputs
table (`md:382-390`) declares **no fluid-given input at all** — so its id,
label, unit and bounds are undefined by the spec and are this brief's proposal,
not the note's.

#### BLOCKER 3 — sequencing against an unmerged branch

`origin/fix/burn-duplicate-rows` renames every resuscitation output id and
bumps to 1.7.0, and is not merged into `main`. See F8.0. Founder question 9.

#### Claims that DID survive, and can be relied on

- **Maintenance runs at a constant hourly rate across all 24 h and is not
  split 8/16.** Survived 2 of 2, on four independent lines: the note scopes the
  split to the "24-hour **resuscitation** volume" (`md:152-154`); maintenance is
  "run continuously" as a flat 4-2-1 drip (`md:249-254`); it is explicitly not
  titrated (`md:657-658`); and worked example 1 only balances at 52 mL/h =
  1250/24, since a halved maintenance would print ~148 mL/h combined rather
  than the ~122 it states (`md:418-421`). **Scope caveat:** this holds because
  the term is Holliday-Segar. Galveston and Cincinnati fold a BSA maintenance
  term inside the halved total (`md:202-204`, `md:448-451`); this score
  computes neither (`burn-resuscitation.ts:335`), but do not generalise the
  rule if a formula selector is ever added.
- **The clock runs from the time of the burn and the remainder goes over the
  hours remaining.** Confirmed by both reviewers (`md:148-151`, `md:728-729`,
  `md:1465-1467`; mirrored at `burn-resuscitation.ts:340`, `:377`) — with the
  proration trap in F8.2 attached.

---

## Open questions for the founder

Each of these changes what gets built, not merely how.

### 1. Is a urine-output-only KDIGO stage a legitimate output, or a partial assessment?

Nothing in the repo establishes it, and the guideline PDF behind the research
note was never fetched (`docs/research/scores/kdigo-aki.md:5`, HTTP 403). If it
is a partial assessment, F4 ships a labelled result; if it is a legitimate
stage, the label is optional and the whole design simplifies. Blocks F4.

### 2. What should a urine-output-only entry report when no urine-output row fires?

Today that is a settled Stage 0, whose band reads "The KDIGO 2012 definition of
acute kidney injury is not met on the criteria entered"
(`kdigo-aki.ts:212`) — asserting a negative on a creatinine axis that was never
measured. Options: reword the band, suppress the band for an unassessed axis,
or refuse to emit a stage at all. Different answers change both `calculate` and
`apps/web`.

### 3. Should the pre-existing un-assessable-creatinine gap be fixed in the same release?

When a creatinine is entered with **no baseline** and is below 4.0 mg/dL, the
axis cannot be evaluated yet contributes 0 and the result is reported as
settled (`kdigo-aki.ts:369`, `:399`, `:456`, `:465`). Every current
urine-output test is exactly this shape. Fixing it is the honest reading of the
same clinical question and makes `formula-correction` unambiguously the right
changelog reason — but it changes results already on the site and rewrites ~20
existing assertions.

### 4. Should `age` stay required on KDIGO once `scr` is optional?

Age's only stated purpose is gating the eGFR < 35 branch
(`kdigo-aki.ts:31-33`), and `egfr` is itself optional — so age is not needed for
a pure urine-output path. Recommendation is to keep it required (it is always
known, and it is what keeps a paediatric branch off an adult), which makes the
feature "urine-output plus age". Confirm.

### 5. Pre-arrival fluid: subtract from the 24-hour total, or from the first-8-hour half only?

Reading A (`md:649-650`) leaves the 8–24 h rate untouched; Reading B
(`md:638-642`) reduces it. The note prints both and reconciles neither. This
sets the arithmetic for two of the three new burn outputs. Blocks F8.

### 6. What does the burn calculator show once more than 8 hours have elapsed?

The note requires the case be "handled explicitly" and prescribes nothing
(`md:653-655`), while declaring an input range of 0–24 h that admits it
(`md:390`). Emitting nothing was adversarially refuted as the documented lethal
direction. This is a clinical-policy call, and the harness forces `compute` to
return `ok: true` at 24 h whatever the answer is. Blocks F8.

### 7. What happens when fluid already given exceeds the volume owed?

Not addressed anywhere in the note. Clamp to zero with prose, show a negative
as a genuine surplus, or suppress the rate. Each is a different bedside
message.

### 8. Should an emitted mL/h rate be checked against the AWMF 10 mL/kg/h cap?

The figure is available and consensus-graded (`md:852-855`), but the note
separately forbids building warning thresholds on the German-registry findings
(`md:835`) and records that no guideline endorses a volume ceiling. Enforce,
warn, or display only.

### 9. Does `origin/fix/burn-duplicate-rows` land before F8?

It is unmerged, bumps to 1.7.0 and renames every resuscitation output id. F8
must be built on one naming or the other; building on `main`'s guarantees a
conflict across all three files.

### 10. Are the two new burn inputs required or optional?

If required, the page refuses a user who only wants the 24-hour volume, and
each needs its own rejection test. If optional with a zero default, a rate can
be shown that silently assumes no pre-arrival fluid — which contradicts the
note's instruction that fluid-given be required wherever a rate is emitted
(`md:656`). The middle option — optional inputs, rate outputs emitted only once
both are present — means the output count is no longer fixed, changing the
assertions at `burn-resuscitation.test.ts:548` and `:870-871`. Recommended, but
it is a product call.
