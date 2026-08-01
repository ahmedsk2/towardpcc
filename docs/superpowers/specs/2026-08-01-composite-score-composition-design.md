# Composite score composition: showing what makes up a total

**Status:** approved 2026-08-01.
**Scope:** `packages/scoring-engine` type contract, five composite scores, and the
calculator result panel.

## Why

A clinician reading `pSOFA 15` learns the magnitude and nothing about the shape.
Fifteen from three organs at maximum is a different patient from fifteen spread
evenly across six, and the engine already knows which it is — it computes every
organ subscore and then renders them as an undifferentiated list beside the
total. Nothing says which values are parts and which is the whole.

This came out of reviewing `calculadorasdeenfermagem.com.br`, whose PRISM page
shows a per-item contribution badge and a completion counter. Its interface
answers "which domains are driving this?" better than ours does. Almost nothing
else about it should be copied — see "Rejected", below.

## What ships

### 1. A `composition` declaration on the score

```ts
export interface Composition {
  /** ScoreValue id of the total. */
  readonly total: string;
  readonly components: readonly {
    readonly id: string;
    /** Instrument maximum — a property of the score, not of a run. */
    readonly max: number;
    /** Instrument minimum. Defaults to 0. */
    readonly min?: number;
  }[];
}
```

Added as an optional `composition?: Composition` on `ScoreDefinition`.

The maxima live on the **definition**, not on the emitted `ScoreValue`, and that
is the whole design decision. A pSOFA respiratory subscore is 0–4 because the
instrument says so, not because of anything the patient's numbers did. Putting
`max` on the computed value would make `calculate()` repeat a constant on every
invocation, turn a static instrument fact into a computed one, and give the type
system nothing to check consistency against. Declared once, a structural test can
assert it against every worked example in the suite.

`min` exists because of the paediatric GCS specifically. Its components are 1–4,
1–5 and 1–6 — never 0. A proportion bar drawn from zero would show a motor score
of 1 as occupying a sixth of its range when it is in fact the floor. That is a
visual that quietly lies, which is worse than no visual.

### 2. Five scores, in two tiers

The tiers matter because they are different sizes of change.

**Tier 1 — metadata only. The components are already emitted.**

| Score   | Total                | Components                                                                                  |
| ------- | -------------------- | ------------------------------------------------------------------------------------------- |
| pSOFA   | `total` (0–24)       | `respiratory`, `coagulation`, `hepatic`, `cardiovascular`, `neurologic`, `renal` (0–4 each) |
| Phoenix | `phoenix_total`      | `respiratory` (0–3), `cardiovascular`, `coagulation`, `neurologic`                          |
| PRISM   | `prism_total` (0–74) | `neurologic_subscore` (0–16), `non_neurologic_subscore` (0–58)                              |

The total ids above are the ones the engine actually emits, checked rather than
assumed — and they are not consistent with each other: pSOFA's total is `total`,
Phoenix's is `phoenix_total`, PELOD-2's is `pelod2`. The `composition` block names
the id explicitly for exactly this reason, and the structural test below is what
stops a spec-level guess from surviving.

Ranges left blank above are the ones **not verified against the primary table
while writing this spec**, and they are deliberately not guessed. Phoenix's
non-respiratory maxima are computed rather than assigned in the code, so reading
them off the implementation would just launder an assumption; they come from
JAMA 2024 Table 2 at implementation time. The "maxima are real" test below is
what makes that safe — a wrong constant fails the suite rather than silently
drawing a bar of the wrong length.

**Tier 2 — `calculate()` must emit values it currently discards.**

| Score   | Emits today                       | Must also emit                   |
| ------- | --------------------------------- | -------------------------------- |
| PELOD-2 | `pelod2`, `mortality_probability` | the per-organ subscores          |
| pGCS    | `pgcs_total`                      | eye, verbal and motor components |

Both compute their parts internally and throw them away. Emitting them is a
**behaviour change**, not a declaration: the result gains values, so the result
panel gains rows and any test asserting an exact value count will need updating.

PELOD-2's organ set and per-organ maxima come from Leteurtre 2013 Table 6, not
from the code's internal variable names — a variable called `neuro` is not a
citation.

**Correction, 2026-08-01:** this section first claimed PELOD-2 and PRISM were
the only two built scores with no `docs/research/scores/*.md` note, and that
producing one for PELOD-2 was part of this work. That was wrong — I misread the
directory listing. `pelod2.md` has existed since `c4b4712`, runs to 252 lines,
is transcribed from the Leteurtre full text and carries a Verification section
recording an independent second fetch. Acting on the claim as written would have
replaced a verified primary-source transcription with one derived from the
implementation and marked `[NEEDS SOURCE]` — a real regression in provenance,
caught only because the implementer checked before writing.

**PRISM is the only score without a research note.** That is the gap this
section was reaching for, and it is out of scope here: it needs its own task.

pGCS is the simplest of the five and the one whose `min` matters: eye 1–4,
verbal 1–5, motor 1–6, total 3–15.

### 3. Per-item contribution display

Rendered only where `composition` is present. Each component shows its label, a
`4 of 24` figure, and a proportion bar.

**No severity colour ramp.** The reference site ramps each item green → amber →
orange → red. That is rejected on two grounds. `ADR-design-direction` states that
crimson never means error, and a per-row severity ramp would establish exactly
that association on the most-read surface on the site. Second, it encodes
magnitude twice while adding a hue axis that carries no information the number
does not already carry.

The bar carries proportion through **length**, in a single accent tone, reusing
the `.chip-meter` rule already shipped for the evidence chips. Bars are
`aria-hidden`; the `4 of 24` text is the accessible content — the same decision
as the evidence chips, for the same reason: nothing in a graphic may be the sole
carrier of a value.

### 4. Completion indicator

`12 of 17 entered`, on the same five scores. PRISM is where this earns its place:
seventeen physiological inputs and currently no sense of how far through you are.
It supplements the existing blocking-input list rather than replacing it — the
list says what is missing, the counter says how much.

## Testing

- **Structural, across the whole registry.** Every declared `total` id and every
  declared component id must appear in that score's computed values. This is what
  catches a rename, and it is the reason the declaration is worth having at all.
- **The maxima are real.** No case in the suite may produce a component above its
  declared `max` or below its `min`. A wrong constant is otherwise invisible: it
  produces a bar of the wrong length and no failure anywhere.
- **The sum holds.** All five instruments are pure sums, so assert
  `Σ components === total` on every worked example. This is the assertion that
  catches a mis-declared composition, and it must be applied per worked example
  rather than once, because a composition can be right for one input vector and
  wrong for another.
- **e2e:** component rows render on a composite score, the bars are
  `aria-hidden`, the figures appear as text, and there is no horizontal scroll at
  320px.
- **Route JS must not increase.** Composition is server-rendered.
  `/calculators/[slug]` is already in `scripts/check-bundle-budget.mjs`; the
  measured figure before and after goes in the implementation commit, because
  the last spec asserted "unchanged" and was wrong by 0.2 KB.

## Rejected, and why

- **Their pre-banded dropdown input model.** Their PRISM asks the clinician to
  pick `161–180 or 60–69` rather than typing a heart rate. That moves the
  classification decision out of a tested engine and into a person's head at the
  bedside, which is the precise thing the worked-example suite exists to
  guarantee. Adopting it would be a regression dressed as a simplification.
- **Their severity colour ramp.** See above.
- **Nursing-diagnosis suggestions.** Their page maps a high subscore to NANDA
  diagnoses. Wrong audience, and it converts a measurement into advice.
- **A PDF library.** Deferred with the printable report below; if it returns, it
  is `window.print()` plus `@media print`, never jsPDF. The browser already does
  this for zero bytes, and the calculator routes must keep transmitting nothing.

## Out of scope

- **The printable report.** Considered and deliberately deferred at design time.
  `copySummary` already puts an auditable record with an ISO timestamp and
  provenance line on the clipboard, so this is an improvement rather than a gap.
- **New calculators.** The reference site's IP-clean gaps worth considering
  later — fluid balance and % fluid overload, an integrated blood-gas
  interpreter, FOUR score, RASS/Ramsay, Silverman-Andersen, Wood-Downes, ASA,
  BMI — are a separate spec, and each needs its own research note and cited
  worked examples. Fluid balance is the strongest candidate: it is the most
  common PICU calculation absent from the current 23.
- **PEWS, FLACC, COMFORT-B, CAPD, SOS-PD.** `ADR-tier-b-ip` concluded these need
  written permission. They appear on the reference site; that is not evidence of
  a licence, and it is worth stating plainly that another site publishing an
  instrument says nothing about our right to.

## A note on the reference site's PRISM

Recorded because it bears on how much weight to give the rest of that site.

Its "PRISM" is seven dropdowns — GCS, heart rate, systolic pressure, respiratory
rate, temperature, arterial pH, glucose — each capped at 4, totalling 0–28. PRISM
III is 17 variables across 26 ranges, 0–74. More seriously, **it applies no age
banding at all**: its systolic row is `80–110 (0) / 111–120 or 70–79 (1) /
121–130 or 60–69 (2) / >130 or <60 (4)`, identical for a neonate and a
sixteen-year-old. Age stratification is the single most important thing PRISM
does, and it is absent.

The interface is worth learning from. The instrument behind it is not.
