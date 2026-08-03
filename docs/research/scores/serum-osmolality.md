# Serum osmolality (calculated) and osmolar gap

Two linked bedside quantities:

1. **Calculated serum osmolality** — an estimate of plasma osmolality from a
   routine chemistry panel (sodium, glucose, urea/BUN), using an additive
   formula. It approximates what an osmometer would measure if only the major
   physiologic solutes were present.
2. **Osmolar (osmolal) gap** — the difference between the **measured** osmolality
   (from a freezing-point-depression or vapour-pressure osmometer) and the
   **calculated** osmolality. A raised gap flags osmotically active substances
   **not** accounted for by Na/glucose/urea — classically the toxic alcohols
   (methanol, ethylene glycol), also ethanol, isopropanol, mannitol, glycerol,
   propylene glycol, and severe hyperproteinaemia/hyperlipidaemia (pseudo-gap).

The calculated value is the deterministic, formula-based part (this is what an
app computes). The gap additionally requires a lab-measured osmolality entered by
the user.

**Terminology (osmolality vs osmolarity).** Osmol**ality** = mOsm per **kg** of
water (what the osmometer measures, temperature-independent). Osmol**arity** =
mOsm per **L** of solution (what the additive formula actually yields). The two
are numerically close in plasma (water is ~93% of plasma volume) and the terms
are used interchangeably in the osmolar-gap literature; the "calculated
osmolality" is strictly a calculated osmolarity. This ~mismatch is one reason a
small non-zero gap is normal.

---

## Formula / algorithm (exact — every coefficient and branch)

### Calculated osmolality — Smithline–Gardner (the standard formula)

**Conventional (US) units** — Na in mmol/L (= mEq/L), glucose and BUN in mg/dL:

```
Osm_calc = 2 × Na + glucose/18 + BUN/2.8            [mOsm/kg, no alcohol]
```

**SI units** — all analytes in mmol/L:

```
Osm_calc = 2 × Na + glucose + urea                   [mmol/L → mOsm/kg]
```

- **2 × Na** accounts for sodium **plus its accompanying anions** (chiefly Cl⁻
  and HCO₃⁻); the factor 2 stands in for the paired anion. Sodium is the dominant
  osmole.
- **glucose/18** converts glucose mg/dL → mmol/L (glucose MW ≈ 180; ÷18).
- **BUN/2.8** converts blood-urea-**nitrogen** mg/dL → urea mmol/L (urea carries
  2 N atoms = 28 g per mol; ÷2.8). Note: outside the US, labs report **urea**
  (mmol/L) directly — use it as-is (no /2.8).
- Potassium is deliberately omitted in Smithline–Gardner (small, ~4 mmol/L
  contribution); other formulas include it (see variants).

Source of the coefficients and the simple additive form: Smithline & Gardner,
_JAMA_ 1976 ("a very simple formula: CO = 2(Sodium) + Glucose + Urea"); non-SI
÷18/÷2.8 rendering as tabulated in Choy et al. 2016 and Wikipedia's Osmol gap
entry.

**Round-2 confirmation (2026-08-03).** A second sourcing pass re-checked this
against the guideline-endorsed form and found the same equation, in both
renderings: `2 × Na + glucose/18 + BUN/2.8` for mg/dL inputs, `2 × Na + glucose +
urea` in mmol/L. **No coefficient changed and no behaviour changed** — the
implementation already computes exactly this. Recorded here as a confirmation,
not a correction.

### Ethanol variant (add an ethanol term)

When measured ethanol is available, add it so the **gap** reflects only _other_
unmeasured osmoles:

```
Conventional:  Osm_calc = 2 × Na + glucose/18 + BUN/2.8 + ethanol/3.7   (empiric, Purssell)
   (ideal MW): ... + ethanol/4.6   (ethanol treated as an ideal osmole; MW ≈ 46)
SI:            Osm_calc = 2 × Na + glucose + urea + 1.25 × ethanol(mmol/L)   (empiric)
   (ideal):    ... + 1.0 × ethanol(mmol/L)
```

- **Divisor 4.6** = the _ideal_ conversion (ethanol MW ≈ 46.07; mg/dL → mmol/L is
  ÷4.6, contributing 1 mOsm per mmol/L).
- **Divisor 3.7** = the _empirically validated_ factor (Purssell et al. 2001):
  ethanol raises measured osmolality **more** than an ideal osmole would, so its
  contribution is `ethanol(mg/dL)/3.7` ≡ `1.25 × ethanol(mmol/L)`. Purssell's
  full regression: contribution = ethanol(mg/dL)/3.7 − 0.35 (95% CI on the factor
  1/3.80 to 1/3.58). Many toxicology references use **3.7**; some labs still use
  4.6. Pick one explicitly — the choice shifts the computed gap.

### Osmolar (osmolal) gap

```
Osmolar gap = Osm_measured − Osm_calc
```

- **Osm_measured** = lab osmometer value (mOsm/kg), entered by the user.
- Sign convention is measured **minus** calculated; a positive gap = more
  measured osmoles than the formula predicts.
- No branch/algorithm beyond the subtraction; interpretation is by threshold
  (see bands).

### Formula variants (for cross-reference — Smithline–Gardner is the default)

| Formula                         | Expression (conventional-unit form)                                  | Source         |
| ------------------------------- | -------------------------------------------------------------------- | -------------- |
| **Smithline–Gardner** (default) | `2·Na + glucose/18 + BUN/2.8`                                        | Smithline 1976 |
| Dorwart–Chalmers                | `1.86·Na + glucose/18 + BUN/2.8 + 9`                                 | Dorwart 1975   |
| Bhagat (simplified)             | `1.89·Na + 1.38·K + 1.08·glucose(mmol/L) + 1.03·urea(mmol/L) + 7.45` | Bhagat 1984    |
| Bhagat (original)               | `1.86·(Na+K) + glucose + urea + 10` (SI)                             | Bhagat 1984    |

Choy et al. 2016 evaluated many formulas and **recommend Smithline–Gardner** for
harmonised use (smallest bias, simplest, platform-robust). This note uses it as
the primary formula.

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id             | label                           | type   | units / conversion                                                                            | plausible min/max                                                                                                                                                                   |
| -------------- | ------------------------------- | ------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `na`           | Sodium                          | number | **mmol/L** (= mEq/L, monovalent, 1:1)                                                         | ~100–200 mmol/L survivable extremes of hypo-/hypernatraemia; engineering input-validation bound, not a single cited threshold [NEEDS SOURCE]                                        |
| `glucose`      | Glucose                         | number | **mg/dL** (US) → ÷18 = mmol/L; or enter mmol/L directly                                       | ~10–2000 mg/dL (0.6–110 mmol/L) spanning severe hypoglycaemia to extreme hyperglycaemic crisis; input-validation bound [NEEDS SOURCE]                                               |
| `bun`          | Blood urea nitrogen             | number | **mg/dL** (US) → ÷2.8 = urea mmol/L. If lab reports **urea** (SI), enter mmol/L and skip /2.8 | ~1–300 mg/dL BUN; input-validation bound [NEEDS SOURCE]                                                                                                                             |
| `ethanol`      | Ethanol (optional)              | number | **mg/dL** → ÷3.7 (empiric, Purssell) or ÷4.6 (ideal); or mmol/L ×1.25 (empiric)               | 0 to several hundred mg/dL; optional term                                                                                                                                           |
| `osm_measured` | Measured osmolality (for gap)   | number | **mOsm/kg** (osmometer). Required only to compute the gap                                     | implemented bound **100–600 mOsm/kg** — deliberately wider than the ~250–400 clinical range so marked toxic-alcohol elevations still compute; input-validation bound [NEEDS SOURCE] |
| `osm_calc`     | Calculated osmolality (derived) | number | mOsm/kg (≈ mmol/L)                                                                            | reference range for the _value_ **275–295 mOsm/kg** (StatPearls NBK567764); paediatric 280–295 (Ranadive 2011); measured infant mean 285.8 ± 5.1 (PMC9920940)                       |
| `osm_gap`      | Osmolar gap (derived)           | number | mOsm/kg = measured − calculated                                                               | normal < 10 (see bands)                                                                                                                                                             |

Notes: Na↔mEq/L is 1:1 (monovalent). Glucose ÷18 (MW≈180) and BUN ÷2.8 (urea has
2 N; 28 g N/mol) are exact unit conversions, not fitted coefficients. The
hard numeric input bounds above are engineering input-validation limits, **not**
values from a specific publication — flagged [NEEDS SOURCE]; the bounds quoted
are the ones the implementation actually enforces. The _reference range for
calculated osmolality itself_ (275–295 mOsm/kg, StatPearls NBK567764; 280–295 in
Ranadive & Rosenthal 2011; measured infant mean 285.8 ± 5.1, PMC9920940) is a
physiologic normal range, distinct from the gap threshold. Note also that the
calculator collects **no age**, which is why the < 3-month "measure, don't
calculate" caveat below is carried as a caution rather than as a rejection.

---

## Worked examples

**Example 1 — Normal panel, conventional units, near-zero gap**
_(derived from the formula in Smithline & Gardner 1976; ÷18, ÷2.8 rendering per Choy 2016)_

- Inputs: Na = 140 mmol/L, glucose = 90 mg/dL, BUN = 14 mg/dL; measured osm = 292.
- Osm_calc = 2×140 + 90/18 + 14/2.8 = 280 + 5 + 5 = **290 mOsm/kg**.
- Osmolar gap = 292 − 290 = **+2 mOsm/kg** → **< 10, normal** (no significant
  unmeasured osmoles).

**Example 2 — Same patient in SI units (unit-equivalence check)**
_(derived from the SI form 2·Na + glucose + urea, Smithline & Gardner 1976)_

- Glucose 90 mg/dL ÷18 = **5.0 mmol/L**; BUN 14 mg/dL ÷2.8 = urea **5.0 mmol/L**.
- Osm_calc = 2×140 + 5.0 + 5.0 = **290 mmol/L** — identical to Example 1.
- Confirms the ÷18 / ÷2.8 factors simply carry the conventional-unit inputs into
  the SI additive form; do not apply the divisor twice.

**Example 3 — Elevated gap suggesting an unmeasured osmole (toxic alcohol)**
_(derived from formula; interpretation threshold from Choy 2016 / Lynd 2008)_

- Inputs: Na = 140, glucose = 90 mg/dL, BUN = 14 mg/dL; measured osm = **330**.
- Osm_calc = 290 (as above, no ethanol term).
- Osmolar gap = 330 − 290 = **+40 mOsm/kg** → **markedly elevated (≥10)**. A gap
  this large is consistent with a low-MW unmeasured osmole (e.g. methanol,
  ethylene glycol, or ethanol/other) and warrants clinical correlation — the gap
  alone does not identify the substance.

**Example 4 — Ethanol term rescues a falsely elevated gap**
_(ethanol divisor 3.7 / factor 1.25 from Purssell et al. 2001; base formula Smithline 1976)_

- Inputs: Na = 140, glucose = 90 mg/dL, BUN = 14 mg/dL, **ethanol = 100 mg/dL**;
  measured osm = **318**.
- Ethanol contribution (empiric) = 100/3.7 = **27 mOsm/kg** (≡ 100 mg/dL ÷4.6 =
  21.7 mmol/L × 1.25 = 27.1).
- **Without** ethanol term: gap = 318 − 290 = **+28** → looks abnormal.
- **With** ethanol term: Osm_calc = 290 + 27 = 317; gap = 318 − 317 = **+1** →
  normal. The elevation was fully explained by ethanol, so there is **no residual
  osmolar gap** to attribute to a toxic alcohol. (Using the ideal ÷4.6 instead:
  contribution 21.7, Osm_calc 311.7, residual gap 6.3 — still < 10 but larger;
  illustrates why the divisor choice matters.)

**Example 5 — Hyperglycaemia raises calculated osmolality, gap stays normal**
_(derived from formula in Smithline & Gardner 1976)_

- Inputs: Na = 130 mmol/L, glucose = 720 mg/dL, BUN = 28 mg/dL; measured osm = 320.
- Osm_calc = 2×130 + 720/18 + 28/2.8 = 260 + 40 + 10 = **310 mOsm/kg**.
- Osmolar gap = 320 − 310 = **+10** → at the reference limit; the hyperglycaemia
  is captured by the glucose term (it inflates the _calculated_ value, not the
  gap). Illustrates that a high measured osmolality is not itself an osmolar gap.

**Example 6 — Ethanol _over_-accounts for the gap; the raised-gap flag must not stand**
_(ethanol divisor 3.7 / 4.6 as in Example 4; base formula Smithline 1976)_

- Inputs: Na = 140, glucose = 90 mg/dL, BUN = 14 mg/dL, **ethanol = 200 mg/dL**;
  measured osm = **320**.
- Osm_calc (no ethanol) = 290 → **raw gap = +30**, which read on its own is
  "≥ 10, unmeasured osmole present".
- ÷3.7: contribution 200/3.7 = 54.05 → Osm_calc 344.05 → **residual −24.05**.
- ÷4.6: contribution 200/4.6 = 43.48 → Osm_calc 333.48 → **residual −13.48**.
- Both residuals are negative: the measured ethanol accounts for _more_ than the
  entire measured-minus-calculated difference, so no unmeasured osmole is needed
  to explain these two numbers. Flagging the +30 as elevated directly above two
  negative residual rows is a self-contradiction — the raw gap is therefore
  reported as **accounted for by the measured ethanol**, with the +30 still shown.
- A negative residual is not a finding: the measured normal gap is centred at −2
  (Hoffman 1993), so values below zero are ordinary variation, imprecision, or an
  osmolarity-vs-osmolality artefact.

**Example 7 — The two ethanol divisors disagree in sign; the flag stands**
_(same sources as Example 6)_

- Inputs: Na = 140, glucose = 90 mg/dL, BUN = 14 mg/dL, **ethanol = 100 mg/dL**;
  measured osm = **315**. Osm_calc (no ethanol) = 290 → **raw gap = +25**.
- ÷3.7: Osm_calc 317.03 → **residual −2.03** (negative).
- ÷4.6: Osm_calc 311.74 → **residual +3.26** (positive).
- The divisor choice changes the sign of the answer, so suppressing the flag here
  would be deciding the ÷3.7-vs-÷4.6 fork by fiat inside a rule whose only effect
  is to REMOVE a warning. The gap keeps its band, and both residuals are shown so
  the disagreement is visible. Suppression (Example 6) requires **both** residuals
  negative.

---

## Interpretation bands (non-directive, with source)

The osmolar gap has a threshold; the calculated osmolality value has a
physiologic reference range. Both are descriptive, not management directives.

**Osmolar gap:**

- **< 10 mOsm/kg — conventionally "normal."** Choy et al. 2016 propose **10** as
  the reference limit for the gap computed with Smithline–Gardner; the same < 10
  cut-off is the classic teaching and the "most common clinically applied
  cut-off" (Lynd et al. 2008). In healthy subjects the gap is centred near 0 with
  SD ≈ 4 mOsm/kg (Choy 2016), i.e. roughly −8 to +8 as a 2-SD spread.
- **≥ 10 mOsm/kg — elevated.** Suggests unmeasured osmotically active solute.
  Some older references use a wider "normal" up to ~14–15; the task brief notes
  the < 10–14 range. There is genuine inter-source variation.
- **The 10 cut-off is partly conventional, and the primary that shows this is
  Hoffman et al. 1993** (PMID 8433417, **n = 321**, abstract read 2026-08-04):
  measured, the normal gap is **−2 ± 6 mOsm**, and across different equations the
  gaps ranged about **−5 to +15**. Ten therefore sits near mean + 2 SD of a
  distribution that is **not centred on zero** — it is a statistical convention
  fitted to one formula, not a derived diagnostic cut-point.
- **The reference band is wider than the ±6 summary suggests.** Secondary sources
  render the same distribution as a **95% population range of about −14 to +10**.
  That is arithmetically −2 ± 2 SD, so it agrees with Hoffman rather than
  competing with him — and it makes the point sharper: **10 is the TOP of the
  healthy range**, not a line drawn outside it. Provenance: the −14 to +10 figure
  comes from secondary sources, not from the Hoffman abstract, and is labelled
  that way in the implementation. **Our band boundary is unchanged at 10.**
- **State the threshold with its use case (Lynd et al. 2008).** A gap threshold
  of 10 reached a **sensitivity and negative predictive value of 1** for
  identifying patients for whom **haemodialysis** was recommended. For
  identifying patients needing **antidotal therapy** the same threshold fell to
  **sensitivity 0.90 / NPV 0.85**. The threshold is not one number with one
  performance — quote the question it is answering.
- **A normal gap does NOT exclude toxic alcohol ingestion — and here is the
  arithmetic, not just the assertion.** An individual's own true baseline may be
  **negative**. A patient sitting at the bottom of the population range (about
  −14) can acquire **more than 20 mOsm/kg** of unmeasured osmole and still
  measure **+10** — at the cut-off rather than far above it. So a gap of +10, or
  of 0, can already represent a large change _for that patient_, and the gap
  cannot be read as a change score without a baseline nobody has. Early
  presentation before metabolism leaves the gap low for a separate reason. A
  cut-off of 10 gives **high sensitivity but low specificity** and **should not
  be used in isolation** to admit, discharge, or exclude toxic-alcohol poisoning
  (Lynd et al. 2008). Measurement uncertainty of the gap is ≈ ±7 mOsm/kg (Choy 2016) — larger than one might expect.
- **A NEGATIVE gap is not pathology.** It is ordinary biological variation,
  measurement imprecision, or an artefact of comparing an additive osmolarity
  with a measured osmolality. Hoffman's normal distribution is centred at −2, so
  negative values are the ordinary lower half of normal.

**Calculated (or measured) serum osmolality value — reference range:**

- Normal plasma osmolality is regulated within a narrow band, commonly cited as
  **275–295 mOsm/kg** (StatPearls, NCBI Bookshelf **NBK567764**, retrieved
  2026-08-03); Ranadive & Rosenthal 2011 (pediatric) give **280–295 mOsm/kg**,
  with AVP secretion beginning above ~280. This is the range for the osmolality
  _number_, not the gap. The paediatric range sits inside the wider one; they are
  not competing claims.
- **Measured paediatric data agree.** 280 samples from day 1 to 2 years of age
  give a mean of **285.8 ± 5.1 mOsm/kgH₂O** (**PMC9920940**, retrieved
  2026-08-03). Cited by PMCID: the sourcing pass captured the cohort, the sample
  count and the summary statistic but not the full bibliographic record, so
  authors/journal are deliberately not asserted.

**Age caveat — this is the real gap the round-2 pass closed.**

The gap threshold and the additive arithmetic are population-independent, but the
_calculated value_ is not validated at every age, and this calculator does not ask
for age.

- **Below 3 months, osmolality should be MEASURED, not calculated.** The additive
  formulas are not validated in that group. This is the clinically important half
  of the caveat: nothing otherwise stops the calculator producing a confident
  number for a neonate.
- **From 3 months to 2 years**, a validation study (a Kraków cohort) found a
  different equation agreed best with the osmometer on Bland–Altman analysis:
  `1.86 × (Na + K) + 1.15 × glucose + urea + 14`. Smithline–Gardner may therefore
  not be the closest estimate in infants.
- **[NEEDS SOURCE]** — the full bibliographic record for that infant validation
  was not captured in the round-2 pass. It is recorded here as a finding, with no
  citation claimed for it. The alternative equation is **not** implemented: doing
  so would also require a potassium this score does not collect.

**NO PAEDIATRIC OSMOLAR-GAP DATA EXISTS — settled absent (round-3, 2026-08-04).**

This is stated at full strength because a paediatric platform is where it
matters. The 10 mOsm/kg limit, the −2 ± 6 distribution beneath it and every
performance figure attached to it (Lynd 2008) are **adult**. Searching did not
merely fail to surface a paediatric osmolar-gap series; the absence is recorded
as **settled**, so it is not an open task waiting on a better search.

What that does and does not license:

- It does **not** change the threshold. The additive arithmetic is
  population-independent, and there is no paediatric number to prefer over 10.
- It **does** change how the threshold is described. Earlier wording on this page
  called the gap threshold itself "population-independent"; that conflated the
  arithmetic (which is) with the cut-point's evidence (which is adult-only). The
  implementation now separates the two and carries the absence as a `caution`.
- The paediatric literature on this page (Ranadive & Rosenthal 2011, PMC9920940)
  is cited for the normal osmolality **VALUE** in children, which matches the
  adult range. It says nothing about the gap.

**Implementation behaviour — ethanol-explained gaps.** When a measured ethanol is
entered and the residual gap is negative under **both** divisors, the raw gap is
emitted under a separate id carrying its own band ("accounted for by the measured
ethanol") rather than the ≥ 10 elevated band (worked example 6). Requiring both
divisors keeps the ÷3.7-vs-÷4.6 fork from being silently decided by a rule that
removes a warning (worked example 7). This is a **presentation choice made to
resolve a contradiction between two rows of the same result**, documented as an
implementation choice; no source prescribes it. It changes no computed number.

---

## References (full, PMID/DOI/URL)

1. **Smithline–Gardner original formula:** Smithline N, Gardner KD Jr. Gaps—
   anionic and osmolal. _JAMA._ 1976;236(14):1594–1597. PMID: **989132**.
   DOI: **10.1001/jama.236.14.1594**.

2. **Dorwart–Chalmers formula (1.86·Na + … + 9):** Dorwart WV, Chalmers L.
   Comparison of methods for calculating serum osmolality from chemical
   concentrations. _Clin Chem._ 1975;21(2):190–194. PMID: **1112025**.

3. **Bhagat formula:** Bhagat CI, Garcia-Webb P, Fletcher E, Beilby JP.
   Calculated vs measured plasma osmolalities revisited. _Clin Chem._
   1984;30(10):1703–1705. PMID: **6537784**.

4. **Formula comparison / harmonisation (recommends Smithline–Gardner; bias &
   reference-limit data):** Choy KW, Wijeratne N, Lu ZX, Doery JCG. Harmonisation
   of Osmolal Gap — Can We Use a Common Formula? _Clin Biochem Rev._
   2016;37(3):113–119. PMID: **27872505**. PMCID: **PMC5111243**.

5. **Ethanol divisor (empiric 3.7 / factor 1.25):** Purssell RA, Pudek M,
   Brubacher J, Abu-Laban RB. Derivation and validation of a formula to calculate
   the contribution of ethanol to the osmolal gap. _Ann Emerg Med._
   2001;38(6):653–659. PMID: **11719745**. DOI: **10.1067/mem.2001.119455**.

6. **Osmol gap as a screening test (low specificity; do not use in isolation):**
   Lynd LD, Richardson KJ, Purssell RA, Abu-Laban RB, Brubacher JR, Lepik KJ,
   Sivilotti MLA. An evaluation of the osmole gap as a screening test for toxic
   alcohol poisoning. _BMC Emerg Med._ 2008;8:5. PMID: **18442409**.
   DOI: **10.1186/1471-227X-8-5**.

7. **Pediatric normal plasma-osmolality range (280–295 mOsm/kg):** Ranadive SA,
   Rosenthal SM. Pediatric Disorders of Water Balance. _Pediatr Clin North Am._
   2011;58(5):1271–1280. PMID: **21981960**. DOI: **10.1016/j.pcl.2011.07.013**.
   PMCID: **PMC4624211**.

8. **Normal gap is not centred on zero; the 10 cut-off is ≈ mean + 2 SD:**
   Hoffman RS, Smilkstein MJ, Howland MA, Goldfrank LR. Osmol gaps revisited:
   normal values and limitations. _J Toxicol Clin Toxicol._ 1993;31(1):81–93.
   PMID: **8433417**. **n = 321**; normal gap −2 ± 6 mOsm; gaps ranged ≈ −5 to
   +15 across equations. **Abstract read 2026-08-04** (full text not accessed).
   The 95% population range of ≈ **−14 to +10** quoted alongside it is a
   **secondary** rendering of this distribution (= −2 ± 2 SD), not a figure this
   abstract prints — attributed as secondary wherever it appears.

9. **Osmolality reference range 275–295 mOsm/kg (tertiary/grey, cite with a
   retrieval date):** StatPearls [Internet]. Treasure Island (FL): StatPearls
   Publishing. Serum-osmolality chapter, NCBI Bookshelf ID **NBK567764**.
   URL: https://www.ncbi.nlm.nih.gov/books/NBK567764/ (retrieved 2026-08-03).

10. **Measured paediatric osmolality (280 samples, day 1 to 2 years; mean 285.8 ±
    5.1 mOsm/kgH₂O):** PubMed Central **PMC9920940**.
    URL: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9920940/ (retrieved
    2026-08-03). Cited by PMCID — the full bibliographic record (authors,
    journal, title) was not captured and is deliberately not asserted.

11. **Overview / ethanol ÷3.7 note (secondary, corroborating):** Wikipedia,
    "Osmol gap." URL: https://en.wikipedia.org/wiki/Osmol_gap (used only to
    corroborate the conventional-unit rendering and ethanol term; primary sources
    above are authoritative).

---

## Limitations & notes

- **Formula choice changes the number.** Smithline–Gardner (2·Na + glu/18 +
  BUN/2.8) is the recommended default (Choy 2016), but Dorwart–Chalmers and
  Bhagat give slightly different values (different Na coefficient and constants).
  A gap threshold of 10 is only valid paired with the formula it was derived for.
  State which formula the app uses.
- **Ethanol divisor (3.7 vs 4.6) is a real fork.** 4.6 = ideal (MW-based); 3.7 =
  empiric (Purssell). Using 4.6 when a patient has ethanol on board slightly
  _over_-states the residual gap. This note defaults to 3.7 (empirically
  validated) but exposes both.
- **US vs SI unit traps.** Glucose and BUN must be in mg/dL for the ÷18 and ÷2.8
  divisors. If the lab reports SI (glucose mmol/L, **urea** mmol/L), add them
  directly — applying the divisor again is a large error. BUN (nitrogen) vs urea
  (whole molecule) is a frequent confusion; they differ by the ×2.8 factor.
- **Osmolality vs osmolarity.** The formula yields osmolarity (per L); the
  osmometer yields osmolality (per kg water). The small structural difference
  contributes to a non-zero "normal" gap and to pseudo-gaps in severe
  hyperlipidaemia/hyperproteinaemia (large non-aqueous plasma volume) — those
  raise the _apparent_ gap without true extra osmoles.
- **The gap is a screening tool, not a rule-out.** Low specificity and wide
  individual baseline variation mean a gap < 10 does **not** exclude a toxic
  alcohol, and a raised gap does not identify the agent (Lynd 2008). Early
  methanol/ethylene-glycol poisoning can show a normal gap; late poisoning can
  show a normal gap with a high anion gap as the parent alcohol is metabolised.
  Not for isolated clinical decisions.
- **Requires a measured osmolality for the gap.** The calculated osmolality is
  fully deterministic from the panel; the _gap_ additionally needs an osmometer
  value the app cannot compute.
- **Pediatric applicability, split into its two halves.** The _arithmetic_ is
  population-independent, and the normal osmolality _range_ in children matches
  adults (280–295 mOsm/kg; Ranadive & Rosenthal 2011, corroborated by the
  measured 285.8 ± 5.1 in PMC9920940). The _gap threshold's evidence_ is not:
  **no paediatric osmolar-gap data exists at all — settled absent**, so 10 and
  its performance figures are adult numbers applied to children unvalidated. No
  pediatric-specific coefficient or threshold change is warranted, because there
  is no paediatric number to prefer — **and see the age caveat above**: below
  3 months the value should be measured rather than calculated, and from 3 months
  to 2 years a different equation validated better. Both are applicability
  limits, not coefficient changes.
- **The 10 cut-off is a convention with a use case, not a diagnostic boundary.**
  Its performance depends on the question (haemodialysis vs antidotal therapy —
  Lynd 2008), and the underlying normal distribution is centred at −2 ± 6, not 0,
  spanning ≈ −5 to +15 by equation and ≈ −14 to +10 as a 95% population range
  (Hoffman 1993 n = 321; the −14 to +10 rendering is secondary). A negative gap is
  normal; a normal gap does not exclude ingestion, because a patient whose
  baseline is −14 reaches only +10 after a rise of more than 20.
- **Mannitol, glycerol, propylene glycol, isopropanol, sorbitol** and other
  low-MW infused/ingested osmoles also raise the gap — context matters.

---

## IP status

- **Not copyrightable.** The calculated-osmolality formulas (coefficients 2,
  ÷18, ÷2.8; 1.86, 1.89, 1.38, etc.), the ethanol divisors (3.7, 4.6), the
  osmolar-gap definition (measured − calculated), and the < 10 mOsm/kg reference
  limit are mathematical facts and numeric thresholds — outside the scope of
  copyright.
- **No verbatim scale-item wording.** Unlike ordinal descriptor scales (e.g.
  GCS), there is no copyrightable descriptor text here — only equations and
  numbers. Nothing verbatim from a proprietary scale is embedded.
- **Prose/table layout** of the source papers (Smithline 1976, Choy 2016, etc.)
  is copyrighted expression; only numeric criteria are reproduced and surrounding
  text is paraphrased. No guideline paragraphs are copied verbatim.
- **IP-clean** for implementation.

---

## Verification

Independent-source check performed 2026-07-25. Load-bearing values were confirmed
against fetched primary sources.

- **Smithline–Gardner formula** `2·Na + glucose/18 + BUN/2.8` (SI: 2·Na + glucose
  - urea): SI form fetched verbatim from Choy 2016 full text (PMC5111243, "CO =
    2(Sodium) + Glucose + Urea"); conventional ÷18/÷2.8 rendering corroborated by
    the Osmol-gap overview fetch. Original citation confirmed via PubMed: PMID
    989132, JAMA 1976;236(14):1594-7, DOI 10.1001/jama.236.14.1594.
- **Osmolar gap = measured − calculated** and **normal < 10 mOsm/kg**: confirmed
  from Choy 2016 (proposed reference limit 10; healthy SD ≈ 4; uncertainty ≈ ±7)
  and Lynd 2008 (10 = most common cut-off; high sensitivity/low specificity; not
  to be used in isolation). Both fetched from PMC full text.
- **Ethanol divisor 3.7 / factor 1.25**: from Purssell 2001 (PMID 11719745, Ann
  Emerg Med 2001;38(6):653-9, DOI 10.1067/mem.2001.119455), fetched abstract/
  citation confirming contribution = ethanol(mg/dL)/3.7 − 0.35 ≡ 1.25×ethanol
  (mmol/L) − 0.35, 95% CI 1/3.80–1/3.58. Ideal ÷4.6 derived from ethanol MW≈46.
- **Alternate formulas**: Dorwart–Chalmers (1.86·Na+…+9, PMID 1112025, Clin Chem
  1975;21(2):190-4) and Bhagat (PMID 6537784, Clin Chem 1984;30(10):1703-5)
  fetched from Choy 2016 and confirmed via PubMed.
- **Pediatric osmolality range 280–295 mOsm/kg**: Ranadive & Rosenthal 2011
  (PMID 21981960, Pediatr Clin North Am 2011;58(5):1271-80, PMCID PMC4624211),
  fetched verbatim ("plasma osmolality is maintained within a relatively narrow
  range (280–295 mOsm/kg)").
- **Worked examples 1–5**: recomputed by hand — Ex1 280+5+5=290, gap +2; Ex2 SI
  equivalence =290; Ex3 gap 330−290=+40; Ex4 100/3.7=27.0, 290+27=317, gap +1
  (and ÷4.6 → 21.7, residual 6.3); Ex5 260+40+10=310, gap +10. All correct.
- **Unresolved [NEEDS SOURCE]:** hard numeric input-validation bounds for Na,
  glucose, BUN, and measured osmolality are engineering limits, not published
  validated bounds — left flagged, not fabricated.
- **Corrections from verification: none.** Every coefficient, divisor, threshold,
  and worked example was reproduced from at least one independently fetched
  source.

### Round-2 sourcing pass — 2026-08-03

- **Formula — CONFIRMED, no change.** `2 × Na + glucose/18 + BUN/2.8` (mg/dL) =
  `2 × Na + glucose + urea` (mmol/L) is the guideline-endorsed form and is what
  the implementation already computes. Confirmation, not correction.
- **Normal range — now sourced.** The pre-existing 280–295 claim was defensible
  and is unchanged; it now carries StatPearls NBK567764 (275–295, retrieved
  2026-08-03) alongside Ranadive 2011, plus measured paediatric data (PMC9920940,
  280 samples day 1 to 2 years, mean 285.8 ± 5.1 mOsm/kgH₂O, retrieved
  2026-08-03).
- **Age caveat — NEW, and it closed a real gap.** Below 3 months, osmolality
  should be measured rather than calculated; from 3 months to 2 years a Kraków
  validation found `1.86 × (Na + K) + 1.15 × glucose + urea + 14` best on
  Bland–Altman. Now carried in `cautions`, which render beside the number. The
  full citation for that validation was not captured — flagged [NEEDS SOURCE],
  not fabricated, and the alternative equation is not implemented.
- **Gap threshold ≥ 10 — relabelled as partly conventional, with its use case.**
  Hoffman 1993 (PMID 8433417) added: normal gap −2 ± 6, range ≈ −5 to +15 by
  equation, so 10 ≈ mean + 2 SD. Lynd 2008 re-stated with the question attached:
  sensitivity/NPV of 1 for identifying haemodialysis candidates, 0.90/0.85 for
  antidotal therapy. Band text now says plainly that a normal gap does not
  exclude toxic alcohol ingestion.
- **Defect fixed (behaviour change).** A raw gap ≥ 10 was flagged elevated even
  when the ethanol-adjusted residual was negative — an "unmeasured osmole"
  banner sitting directly above two negative rows. The raw gap is now emitted
  under `osm_gap_ethanol_explained` (own band, no ≥ 10 reading) when the residual
  is negative under **both** divisors; when the divisors disagree in sign the
  flag stands. Worked examples 6 and 7 pin both directions. No computed number
  changed.
- **Unchanged and still open:** the input-validation bounds remain engineering
  limits, still flagged [NEEDS SOURCE]. No source was asserted for them.

### Round-3 sourcing pass — 2026-08-04

**No computed number changed and no band boundary moved.** Everything in this
pass is what the page SAYS about the numbers it already produced.
Implementation version **1.2.0**.

- **Reference range widened in description, not in code.** Hoffman 1993 now
  carries **n = 321** and its full spread: −2 ± 6, ≈ −5 to +15 across equations
  (both from the abstract, read 2026-08-04), plus the **secondary** 95%
  population range of ≈ −14 to +10. The last of these is −2 ± 2 SD, which is why
  it lands exactly on our cut-off: **10 is the top of the healthy distribution.**
  Attribution is split in the implementation — the first two figures to Hoffman,
  the third to secondary sources — because they came from different places.
  The band stays `< 10` / `≥ 10`.
- **"A normal gap does not exclude ingestion" now shows its working.** The claim
  was already on the page; what it lacked was the mechanism. An individual's true
  baseline may be **negative**, so a patient starting near −14 can gain more than
  20 mOsm/kg and still measure only **+10** — at the cut-off, not beyond it. That
  sentence is now in the normal band, the elevated band's framing, the caution
  and the notes, sourced to Hoffman 1993 for the distribution and Lynd 2008 for
  the not-in-isolation rule.
- **NO PAEDIATRIC OSMOLAR-GAP DATA EXISTS — recorded as settled absent.** New
  `caution`, so it renders beside the number rather than in prose below it. The
  wording deliberately says the absence is settled rather than a search still
  running: a reader should stop expecting a paediatric cut-point, not wait for
  one. This also corrected a wording defect of our own — the page previously
  described the gap THRESHOLD as "population-independent", which is true of the
  arithmetic and false of the evidence.
- **What was NOT changed:** the Smithline–Gardner coefficients, the ethanol
  divisors, the ethanol-explained suppression rule, the osmolality reference
  range, the age caveat, and the [NEEDS SOURCE] on the engineering input bounds.
