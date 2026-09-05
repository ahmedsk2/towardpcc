# Calculator arithmetic audit — 2026-09-05

**What this is.** An external, line-by-line arithmetic verification of all 25
published calculators on towardpcc.com, run by the founder in Claude in Chrome
from a prompt written for it (synthetic inputs only, no patient data). Each
calculator was exercised on the site and against an independent reference —
the primary paper's worked example where one exists, otherwise the score
authors' own calculator, MDCalc/QxMD, or arithmetic from the formula stated on
the page — over three passes with fresh random values, plus an adjudication
pass for any mismatch.

**What this is not.** Independent clinical validation. It checks that the site
computes what its cited formulas say, not that those formulas are the right
ones for a given child. The validator slots on every calculator still read
"pending", correctly.

**Reproduction.** The record notes that external audit reports have been wrong
about half the time, so both findings were reproduced before anything changed:
finding 1 against the score's source and the audit's exact inputs, finding 2
live on production on `sf-ratio`. Both reproduced exactly as reported.

## Result

| Calculators | Cases | Mismatches | Defects                                |
| ----------- | ----- | ---------- | -------------------------------------- |
| 25 / 25     | 510   | 1          | 1 logic/text, 1 cosmetic (shared by 4) |

Per calculator (cases, verdict): anion-gap 15 PASS · apls-weight 19 PASS ·
bsa-mosteller 17 PASS · burn-resuscitation 20 PASS · corrected-calcium 13 PASS
· corrected-sodium 18 PASS · ett-size 17 PASS · fluid-balance 29 PASS ·
four-score 6 PASS · holliday-segar 17 PASS · ideal-body-weight 21 PASS ·
kdigo-aki 42 PASS · oxygen-saturation-index 22 PASS · oxygenation-index 22
PASS · pediatric-gcs 17 PASS · pf-ratio 22 PASS · pelod2 12 PASS · phoenix 14
PASS · pim3 13 PASS · prism 21 PASS (see residual) · psofa 18 PASS · qtc 27
PASS (cosmetic) · **serum-osmolality 38 FAIL** (finding 1) · sf-ratio 24 PASS
(cosmetic) · vis 26 PASS (cosmetic).

## Finding 1 — serum osmolality: the ethanol label's documented rule omitted a precondition

All 38 cases were numerically exact and the headline < 10 / ≥ 10 mOsm/kg band
was never wrong. The page's "How it is calculated" text said the _Accounted
for by the measured ethanol_ label appears whenever the residual gap is
negative under both divisors; the site did not show it when the raw gap
(before the ethanol term) was already negative. Reproduced case: Na 140,
glucose 100 mg/dL, BUN 14 mg/dL, measured 250, ethanol 50 mg/dL → calculated
290.6, raw gap −40.6, residuals −54.1 / −51.4, plain "< 10" badge.

**Adjudication here:** the code (`serum-osmolality.ts`, the `explainedByEthanol`
guard) requires the raw gap to be non-negative on purpose, with a comment
recording why — without it, every negative raw gap was relabelled as explained
by ethanol, which is false: nothing had been accounted for, and it displaced
the normal band on exactly the −2 gap Hoffman 1993 puts at the centre of the
healthy distribution. So the implementation was the considered one and the
text overclaimed. **Fixed by making the text true, not the code wrong** — the
two public sentences now state the precondition, and the audit's case and its
contrast (measured 291, raw gap +0.4 → labelled) are pinned as tests. #174.

## Finding 2 — out-of-range messages named the canonical unit's range

On `qtc`, `serum-osmolality`, `sf-ratio` and `vis`: with a unit toggle switched
away from its canonical unit, an out-of-range value was correctly refused, but
the message still named the canonical range ("between 0.21 and 1 fraction")
while the caption under the same field correctly read "Accepted 21–100 %".
Every out-of-range value was still refused and every in-range value accepted;
no wrong number was ever produced.

**Cause:** the engine's message is built in canonical units because the engine
does not know which unit is on screen; the form did, and already computed the
converted, inward-rounded range for the caption. Two strings for one bound.
**Fixed** by moving that computation into `apps/web/lib/accepted-range.ts` (its
reasoning intact) and using it for the caption, the field's error and the
rail's screen-reader message, with unit tests on real registry inputs and an
e2e case that switches FiO₂ to % and reads the refusal. #175.

## Residual the audit could not verify — PRISM

Four PRISM IV admission-context coefficients and four PRISM III blood-gas
cut-points live only in a source table the audit could not access (reported as
patent-protected), so they are reported as **unverified**, not as wrong. Every
independently checkable case passed. The site's own tests assert these values
against the cited paper; an external reader with access to that table is the
only thing that would close this.

## What the audit is evidence for

Arithmetic fidelity to the cited formulas across 510 cases, with both defects
found being a documentation gap and a wording gap — neither a wrong number.
It belongs in front of the two independent clinical validators when they are
recruited, as the thing they do not need to redo.
