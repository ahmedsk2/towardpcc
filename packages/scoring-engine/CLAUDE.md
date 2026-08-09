# Authoring a clinical score

This package computes numbers that reach a bedside. It has **zero runtime
dependencies**, touches no DOM global, and is gated at **100% lines, branches,
functions and statements**. Read the root `CLAUDE.md` first.

## Before writing code

1. Write the research note: `docs/research/scores/<slug>.md`. Every threshold,
   bound and band in the implementation must trace to a line in that note.
2. Settle the rights question (below). A score that cannot be published is not
   worth building.

## Shape of a score

`defineScore` requires **id, slug, name, version, status, category, inputs,
interpretation, references, validators, changelog, ipStatus, notes** and
`calculate`. Only `formula`, `missingAsNormal`, `cautions`,
`interpretationStatus` and `composition` are optional.

- **`inputs` does not need `as const`.** `defineScore` takes a `const` type
  parameter, so an array written inline keeps its ids and option values literal
  either way — `prism.ts` ships without it and typechecks clean. Most scores
  write it for consistency; that is fine, but it is not what protects the
  `InputValues` mapping, so don't cite it as a correctness requirement.
- **Never validate, range-check or unit-convert inside `calculate`.**
  `defineScore` wraps it: `runValidation` rejects bad input and normalises to
  canonical units first, so `calculate` only ever sees canonical values.
- **Give it a colocated `src/scores/<slug>.test.ts` whose source literally
  contains `describeScore(`** — the registry gate fails otherwise. Then add it
  to `src/scores/registry.ts` (kept roughly alphabetical by convention; nothing
  checks the order, and it isn't strictly sorted today). Note what is _not_
  enforced: the gate only iterates scores already in the array, so forgetting to
  register one fails nothing — it silently ships nowhere while its own colocated
  test still earns it 100% coverage.
- **Changing user-visible text requires a `version` bump plus a matching
  changelog entry.** The gate asserts changelog dates read oldest-first and that
  `version` equals the newest entry's version.
- **An input can be asked conditionally: `showWhen: { input, equals }`.** The
  controller must be a categorical input of the same score that itself carries
  no `showWhen` — one level only, so visibility is a single pass with no
  fixpoint and no cycle to detect. It is declarative DATA rather than a
  predicate, because the registry gate has to read it: four structural
  assertions check that the id resolves, the controller is categorical and
  unconditional, every `equals` value is a declared option, and that
  `showWhen` is never combined with `required: true`. That last one is not
  style — a hidden required input is rejected with `missing-required` forever,
  so the whole score returns `{ok:false}` with no total and no subscores, while
  the form's blocking rail names a field that is not in the DOM. The safety
  property is enforced in `runValidation`, not the UI: an input whose condition
  is unsatisfied is skipped before the required check, so its id never enters
  `canonical` and `canonical` is the entire object `calculate` receives. Keep
  any window gate already inside `calculate` as well — two guards, because a
  filter with a hole should not be the only thing between a value and a logit.

## Units

`canonicalDecimals` rounds **only** values arriving in an alternate unit; a value
entered in the canonical unit is returned verbatim. Set it only when the
guideline itself prints an alternate-unit equivalent of its own cutoff — KDIGO's
"≥4.0 mg/dL (≥353.6 µmol/L)" is why creatinine has 2. Leave it absent when the
source gives only a conversion factor, and never pick a value tuned to make one
threshold behave.

## Tests are the proof, not the coverage number

`describeScore` fails in `afterAll` unless the suite declares at least one
`workedExample` **and** a rejection for every required non-boolean input
(`rejectsImplausible` or `boundaryTest` both register it; booleans are exempt).
Every worked-example source needs a non-empty `citation` plus at least one of
`pmid`, `doi` or `locator`, or `assertValidSource` throws.

Three failure modes the gates cannot catch for you:

- **100% coverage proves every line is reachable, not that any number is
  right.** Only a cited worked example does that. A fully-covered score can be
  clinically wrong in every band.
- **Assert every declared maximum in both directions.** A `≤ max` check catches
  a maximum declared too LOW, but nothing ever reaches an inflated ceiling, so
  it can never catch one declared too high. PRISM's composition maxima once
  passed the entire suite because it asserted them in neither direction (commit
  702d742). Assert that no case exceeds the max **and** that some case exactly
  attains it — `prism.test.ts:505-556` is the pattern to copy.
- **A test input vector hoisted into a shared `const` needs `as const`.** Inline
  vectors keep their literal types; a hoisted one widens a categorical `value`
  to `string`, which will not narrow back to the option union when spread into
  `workedExample`. `pnpm test` will not tell you, because vitest does not
  typecheck — this is exactly the error that reached `main` on 2026-08-01
  (`phoenix.test.ts`). Run `pnpm typecheck`.

A declared `composition` is structurally gated: total and every component id
must be emitted by `compute`, and across a per-input sweep the components must
sum to the total. Any value folded into the total but left undeclared fails.

## Rights — check before you build

`docs/decisions/ADR-tier-b-ip.md` is authoritative, and its Findings table is
**stale**. Three dated addenda successively reverse each other; read to the end.

**Do not build, and do not reproduce item wording for**, until written clearance
is on file:

| Declined                  | Why                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| COMFORT-B, CAPD, SOS-PD   | copyrighted; reproduction permission required                         |
| FLACC                     | © 2002 Regents of the University of Michigan; licence required        |
| Bedside PEWS              | trademarked, FDA 510(k)-cleared, commercially licensed                |
| WAT-1                     | CC BY-ND 2.0 — no-derivatives vs. an interactive calculator uncleared |
| Braden QD                 | free only "without modification"                                      |
| non-Bedside PEWS variants | each published table sits under its publisher's copyright             |

**Resolved by founder decision, 2026-08-02:** PRISM III/IV publish (a cut-point
table plus a logistic regression is a method, not expression — 17 USC 102(b)).
FOUR publishes. The adverse facts stay on the record and are not to be quietly
dropped: the Pollack 1996 p.752 rights footnote was never withdrawn, and the
patent's assignee is VPS LLC. Only a communication from VPS LLC or Children's
National asserting a claim against _this_ use reopens it — re-reading the same
footnote does not.

Two obligations bind regardless:

- **Attribution is not optional.** Every published surface names the derivation
  study and the score's `references` must resolve. This is academic integrity,
  independent of copyright.
- **Never transcribe published scale-item wording.** `pediatric-gcs.ts` and
  `four-score.ts` both ship neutral paraphrases of every option label rather
  than the source descriptors. Preserve that when editing them, and follow the
  same pattern for any coma-scale-family score: consume components as integers,
  write every explanation in this project's own words.

Record every rights finding in the score's `ipStatus`. Reproducing copyrighted
scale text verbatim is a licensing bug, not a style issue.
