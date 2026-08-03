# PRISM III and PRISM IV (Pediatric Risk of Mortality)

> **Source of record (primary text):** Pollack MM. _Method, apparatus and medium for allocating beds in a pediatric intensive care unit and for evaluating quality of care._ **US patent 5,809,477**, issued 1998-09-15. https://patents.google.com/patent/US5809477A/en — status **"Expired - Lifetime"**, anticipated expiration **2015-09-21**.
>
> The patent reproduces the **complete PRISM III threshold table, the age-band definitions, the scoring notes, and every mortality equation** verbatim. Its inventor is the first author of the derivation paper. It is used here as the primary text because the derivation paper is paywalled, and because a patent is a primary published document, not a secondary summary.
>
> **Derivation paper:** Pollack MM, Patel KM, Ruttimann UE. _PRISM III: an updated Pediatric Risk of Mortality score._ **Crit Care Med.** 1996;24(5):743-752. **PMID: 8706448** · **DOI: 10.1097/00003246-199605000-00004**. Paywalled; abstract independently fetched and reconciled against the transcribed table (see Verification).
>
> **PRISM IV:** Pollack MM, Holubkov R, Funai T, et al. _The Pediatric Risk of Mortality Score: Update 2015._ **Pediatr Crit Care Med.** 2016;17(1):2-9. **PMID: 26492059** · **DOI: 10.1097/PCC.0000000000000558**.
>
> **Three things a reader must meet before anything else.**
>
> 1. **PRISM III NO LONGER PRODUCES A MORTALITY PROBABILITY**, as of 2026-08-03. Its mortality equations are **not published in the derivation article** and are separately licensed. Read [The 2026-08-03 finding](#the-2026-08-03-finding--prism-iiis-mortality-equations-are-not-published) before adding one back. The **score** is unaffected and unchanged.
> 2. **NO PUBLISHED WORKED EXAMPLE EXISTS** for either PRISM III or PRISM IV — not in the 1996 paper, the 2016 paper, the patent, or any secondary source located. Every example on this page is **constructed from the threshold table** and labelled as such. See [`[NEEDS SOURCE]`](#needs-source--the-genuinely-open-items).
> 3. **The PRISM III age bands have already been challenged once, incorrectly.** Read [The 2026-08-01 age-band challenge](#the-2026-08-01-age-band-challenge-primary-text-vs-page-copy) **before** acting on any external report about them. The bands below are the patent's, quoted verbatim.
> 4. **A BLANK PRISM IV COVARIATE IS NEVER READ AS THE REFERENCE LEVEL.** All four admission-context covariates are worth 0 at their reference level, so defaulting a blank to "no contribution" returns the reference-patient curve rather than omitting a term. On the 4-hour window a single blank withholds the probability entirely. Read [A blank covariate withholds the probability](#a-blank-covariate-withholds-the-probability--it-is-never-read-as-the-reference-level) before making any of them optional in the equation.
>
> No value on this page is inferred or invented. Where the source is ambiguous, unreadable, or silent, the page says so rather than choosing.

## Why one calculator, not two

PRISM III and PRISM IV are **not two scores**. Pollack 2016's abstract states, verbatim, "Although the physiologic ranges for the Pediatric Risk of Mortality variables have not changed" — PRISM IV reuses PRISM III's physiologic variables and thresholds **unchanged** and revises three other things: the **collection window**, the **outcome definition**, and the **mortality equation**.

So one set of physiologic entries yields one score, and the collection window decides whether a published, citable equation exists to turn that score into a probability at all.

- **PRISM IV** (4-hour window) has one. It does **not** use the total: it splits the score into a **neurologic subscore** (pupils + mental status, 0–16) and a **non-neurologic subscore** (the other 15 variables, 0–58), weights them **separately** at 0.197 and 0.163 per point — a deliberate published finding that neurologic derangement carries more risk per point — and adds five non-physiologic terms. Its coefficients are printed in full in Pollack 2016.
- **PRISM III** (12- and 24-hour windows) does **not**. Its mortality equations appear nowhere in the 1996 article and are separately licensed, so those windows produce the score and its two subscores and nothing else. See [The 2026-08-03 finding](#the-2026-08-03-finding--prism-iiis-mortality-equations-are-not-published).

Implemented as `packages/scoring-engine/src/scores/prism.ts`, tested in `packages/scoring-engine/src/scores/prism.test.ts`.

## Formula / algorithm (exact — every coefficient, every branch)

PRISM III = the sum of points across **17 physiologic variables subdivided into 26 ranges** (Pollack 1996 abstract, verbatim). Range **0–74**. Higher = worse. Each variable takes the **worst qualifying value** observed in the collection window.

The 74-point ceiling decomposes as **neurologic 16 + non-neurologic 58** (see [Subscore split](#subscore-split-what-prism-iv-actually-weights)).

### PRISM III age bands — verbatim from the patent

> "Ages: Neonate=0-<1 month; Infant=1 month-<12 months; Child=12 months-<144 months; Adolescent ≧144 months."

| Band           | Range                    |
| -------------- | ------------------------ |
| **Neonate**    | 0 to <1 month            |
| **Infant**     | 1 month to <12 months    |
| **Child**      | 12 months to <144 months |
| **Adolescent** | ≥144 months (≥12 years)  |

These four bands **tile the age axis with no gap and no overlap**. That property is load-bearing: a scoring function must assign a band to every age, and any quoted set of ranges that leaves an age unassigned is not the instrument's banding. They govern **systolic blood pressure, heart rate, creatinine, BUN, and PTT** — five rows, no others.

**These are NOT the PRISM IV age categories**, which split the first month in two at 14 days. One age input drives both schemes; the implementation deliberately keeps them apart rather than merging them, because merging would silently change a threshold. See [PRISM IV covariate categories](#prism-iv-the-covariate-categories-that-differ-from-the-prism-iii-bands).

### The 2026-08-01 age-band challenge (primary text vs page copy)

**An external verification report dated 2026-08-01 called the PRISM age bands the site's one launch-blocking defect.** It claimed an **18-month-old with a systolic BP of 50 mmHg should score 3, not 7**, on the strength of the age ranges printed in the **prose on the CPCCRN calculator page**.

**The report was wrong, and the patent settles it.** US 5,809,477 states "Child = 12 months-<144 months", and gives the child systolic row as **"55-75 → 3 points, <55 → 7 points"**. An 18-month-old is a Child; 50 mmHg is below 55; the score is **7**.

Two further tells that the report was reading page copy rather than the instrument:

1. **Its own quoted ranges fail to tile the age axis.** "Child (2-12 years)" beside "Adolescent (13 years and up)" leaves **12y0m–12y11m unassigned**. No total scoring function can have a hole in its domain, so the quoted ranges cannot be the banding actually in use.
2. **The direction of the proposed change was clinically dangerous.** Acting on it would have **under-scored hypotension in toddlers** — a silent regression in the falsely reassuring direction, on a mortality-severity instrument.

The bands were correct but **untested at their edges**, which is why the report was able to look plausible. They are now pinned by `prism.test.ts` → `"holds the PRISM III age boundaries exactly where the patent puts them"`, which asserts:

| Probe                     | Expectation                                            |
| ------------------------- | ------------------------------------------------------ |
| 11.9 months, SBP 50       | 3 (infant band 45–65, in-band)                         |
| 12.0 months, SBP 50       | 7 (child band <55, below-band) — the infant/child edge |
| **18 months, SBP 50**     | **7** — the disputed case itself                       |
| 143.9 months, SBP 60      | 3 (child 55–75, in-band)                               |
| 144.0 months, SBP 60      | 7 (adolescent floor 65, below-band) — child/adol. edge |
| 12 years (144 mo), SBP 60 | 7 — must land in a band at all                         |

Note the choice of 60 mmHg at the upper edge: **SBP 50 does not discriminate there**, because it is below both the child floor (55) and the adolescent floor (65) and scores 7 on either side. The first draft of that test passed the wrong assertion for exactly that reason. 60 mmHg is in-band for a child and below-band for an adolescent, so it is the value that actually tests the boundary.

**Caveat on the record itself:** the CPCCRN page prose the reviewer quoted **could not be re-fetched to confirm it** — cpccrn.org returned HTTP 503 on 2026-08-01 as it has at every prior attempt. The quoted page copy is therefore second-hand via the test file's comment. That does not affect the conclusion, which rests entirely on the patent's own text.

**The transferable lesson**, and it is the same one `docs/decisions/ADR-tier-b-ip.md` records for this instrument's IP status: a claim about what an instrument says should be checked against the instrument's primary text, not against a calculator page's descriptive prose.

### The full PRISM III threshold table

Transcribed from the patent. Every value below appears in that document; nothing is interpolated.

#### Cardiovascular and neurologic vital signs

| Variable                    | Band       | Points = 3       | Points = 4 | Points = 5           | Points = 7 | Points = 11 |
| --------------------------- | ---------- | ---------------- | ---------- | -------------------- | ---------- | ----------- |
| **Systolic BP** (mmHg, min) | Neonate    | 40–55            | —          | —                    | <40        | —           |
|                             | Infant     | 45–65            | —          | —                    | <45        | —           |
|                             | Child      | 55–75            | —          | —                    | <55        | —           |
|                             | Adolescent | 65–85            | —          | —                    | <65        | —           |
| **Temperature** (°C)        | All        | <33 **or** >40.0 | —          | —                    | —          | —           |
| **Mental status**           | All        | —                | —          | Stupor/coma (GCS <8) | —          | —           |
| **Heart rate** (bpm, max)   | Neonate    | 215–225 ⚠️       | >225       | —                    | —          | —           |
|                             | Infant     | 215–225          | >225       | —                    | —          | —           |
|                             | Child      | 185–205          | >205       | —                    | —          | —           |
|                             | Adolescent | 145–155          | >155       | —                    | —          | —           |
| **Pupillary reflexes**      | All        | —                | —          | —                    | One fixed  | Both fixed  |

⚠️ **The neonate heart-rate band carries a known source defect.** The patent's rendering prints the neonate 3-point band as **"215-255"**, which cannot be right against the **">225"** 4-point cutoff printed on the same row — the two overlap by 30 bpm, so any rate from 226 to 255 would satisfy both tiers. **215–225 is used**, matching the infant band and independent reproductions of the table. This is an OCR/rendering artefact of the patent document, re-confirmed on 2026-08-01 (the same erroneous string reproduces on re-fetch, so it is in the source rendering, not a transcription slip here). The value printed in the 1996 paper's own Table 1 is **unverified** — see [`[NEEDS SOURCE]`](#needs-source--the-genuinely-open-items).

#### Acid–base and blood gases

| Variable                 | Criterion                           | Points |
| ------------------------ | ----------------------------------- | ------ |
| **Acidosis** (one row)   | pH 7.0–7.28 **or** total CO₂ 5–16.9 | 2      |
|                          | pH <7.0 **or** total CO₂ <5         | 6      |
| **pH** (maximum)         | 7.48–7.55                           | 2      |
|                          | >7.55                               | 3      |
| **PCO₂** (mmHg, maximum) | 50.0–75.0                           | 1      |
|                          | >75.0                               | 3      |
| **Total CO₂** (maximum)  | >34.0                               | 4      |
| **PaO₂** (mmHg, minimum) | 42.0–49.9                           | 3      |
|                          | <42.0                               | 6      |

#### Chemistry

| Variable                    | Band                 | Criterion   | Points |
| --------------------------- | -------------------- | ----------- | ------ |
| **Glucose** (max)           | All                  | >200 mg/dL  | 2      |
| **Potassium** (max)         | All                  | >6.9 mmol/L | 3      |
| **Creatinine** (mg/dL, max) | Neonate              | >0.85       | 2      |
|                             | Infant **and** Child | >0.90       | 2      |
|                             | Adolescent           | >1.30       | 2      |
| **BUN** (mg/dL, max)        | Neonate              | >11.9       | 3      |
|                             | All others           | >14.9       | 3      |

Note the **creatinine row shares one cutoff between infant and child**, and the **BUN row is a two-band split only** (neonate vs everyone else). Neither follows the four-band scheme, and assuming they do is a plausible way to get this score wrong.

#### Haematology

| Variable                       | Band       | Criterion                 | Points |
| ------------------------------ | ---------- | ------------------------- | ------ |
| **WBC** (cells/mm³, min)       | All        | <3,000                    | 4      |
| **Platelets** (cells/mm³, min) | All        | 100,000–200,000           | 2      |
|                                |            | 50,000–99,999             | 4      |
|                                |            | <50,000                   | 5      |
| **PT/PTT** (s, max; one row)   | Neonate    | PT >22.0 **or** PTT >85.0 | 3      |
|                                | All others | PT >22.0 **or** PTT >57.0 | 3      |

**Only leukopenia scores** — a high WBC is worth nothing. The platelet row is **unusually shaped**: a merely low-normal 150,000 already scores 2. Only the **PTT** limb of the clotting row is age-dependent; the PT cutoff of 22.0 s is the same at every age.

#### Completeness check against the paper's own count

The paper states the score has **"17 physiologic variables subdivided into 26 ranges."** The table above transcribes exactly that:

**17 variables** = SBP, temperature, mental status, heart rate, pupillary reflexes, acidosis (pH/tCO₂), pH-high, PCO₂, total CO₂-high, PaO₂, glucose, potassium, creatinine, BUN, WBC, platelets, PT/PTT.

**26 ranges** = SBP 2 + temperature 1 + mental status 1 + heart rate 2 + pupils 2 + acidosis 2 + pH-high 2 + PCO₂ 2 + total CO₂-high 1 + PaO₂ 2 + glucose 1 + potassium 1 + creatinine 1 + BUN 1 + WBC 1 + platelets 3 + PT/PTT 1 = **26**.

Both counts reconcile exactly, which is independent evidence that **no row is missing** from this transcription.

### Row shapes that are easy to get wrong

These are the rules that separate a correct implementation from a plausible one. Each has a dedicated trap case in the test file.

1. **Acidosis is ONE row satisfied by EITHER analyte.** The lowest pH and the lowest total CO₂ share a single row, awarded **once at the worse tier**. A patient with pH 7.05 **and** total CO₂ 6 scores **2, not 4** — both satisfy the same 2-point tier and the row fires once. Never 2 and 6 together; never 2 twice.
2. **Alkalosis is a SEPARATE row, and both can score in the same patient.** The patent is explicit: _"When there are both low and high ranges, PRISM III points may be assigned for the low and the high ranges."_ A pH that swung from 6.9 to 7.6 inside the window scores **6 + 3 = 9 from pH alone**.
3. **Total CO₂ likewise scores at both ends.** A low value feeds the shared acidosis row; a value >34.0 scores 4 independently. Total CO₂ 4 with a later 35 scores **6 + 4 = 10**.
4. **Temperature is one row with two limbs.** `<33 °C` **or** `>40.0 °C` scores 3. A patient with **both** excursions still scores **3 once**, not 6.
5. **PT and PTT share one row.** Either analyte over its cutoff awards **3 once**, even when both qualify.
6. **Pupillary reflexes are not additive with mental status in the way the max suggests** — they are separate variables (11 + 5) that happen to both land in the neurologic subscore.

### Subscore split (what PRISM IV actually weights)

| Subscore           | Variables                                       | Max    |
| ------------------ | ----------------------------------------------- | ------ |
| **Neurologic**     | Pupillary reflexes (0–11) + mental status (0–5) | **16** |
| **Non-neurologic** | The remaining fifteen variables                 | **58** |
| **Total**          |                                                 | **74** |

The worst-tier sum verifies the ceiling: 7 + 3 + 5 + 4 + 11 + 6 + 3 + 3 + 4 + 6 + 2 + 3 + 2 + 3 + 4 + 3 + 5 = **74**, of which the two neurologic items contribute 5 + 11 = **16**, leaving **58**. This is declared as the score's `composition` and pinned by a test that requires both maxima to be **attained**, not merely respected.

### The 2026-08-03 finding — PRISM III's mortality equations are not published

**Until 2026-08-03 this calculator turned the PRISM III score into a predicted mortality percentage, using a quadratic logistic equation for the 12-hour window and another for 24 hours. That output has been removed.** The score is untouched.

The reason is not that the equations were computed wrongly. They were computed correctly — the removed implementation reproduced its own model to three significant figures. The reason is that **the platform could not cite them**, and that they were the wrong model besides.

#### 1. The 1996 paper contains no coefficients

The derivation article publishes the **score** completely and the **equations** not at all. Every table and figure was enumerated against the full text (Ovid, retrieved 2026-08-03, all 16 pages):

| Item        | Page    | Contents                                                      |
| ----------- | ------- | ------------------------------------------------------------- |
| Table 1     | 3       | Study site and patient characteristics                        |
| Table 2     | 5       | Systolic BP ranges by age group                               |
| Table 3     | 7       | Model fit and performance — χ², df, AIC, AUC, Hosmer-Lemeshow |
| Table 4     | 7       | Hosmer-Lemeshow goodness of fit, training sample, III-12 full |
| Table 5     | 10      | Performance measures, validation sample                       |
| Table 6     | 10      | Goodness of fit, validation sample, III-24 full               |
| Table 7     | 11      | Goodness of fit by diagnosis, total sample                    |
| Table 8     | 12      | Goodness of fit by age group, total sample                    |
| Figure 1    | 6       | **The score sheet** — variables, ranges, point values, notes  |
| Figures 2–4 | 8–9, 11 | Observed vs. expected plots; ROC curves                       |

Table 3 — the table the Results text points to when it describes the risk-factor models — is a **model comparison** table. Chi-square, degrees of freedom, AIC, AUC, Hosmer-Lemeshow p-value. **No regression coefficient appears in it, or anywhere else in the paper, and there is no supplement.**

Figure 1 (p. 6) _is_ the whole score: every variable, every range, every point value, and the collection rules. That is what this calculator ships.

#### 2. The values were single-sourced to a patent, with no page to cite

The equations that were implemented came from **US patent 5,809,477** (same author, same derivation dataset). The paper corroborates the patent's **structure** exactly — Table 3 lists model tiers at 1, 2 and 10 degrees of freedom, which matches score + score² + 8 binary factors; Table 3's footnote and Figure 1's "Other Factors" box name the same eight factors; the squared term is deliberate, the paper citing Kay & Little (_Biometrika_ 1987;74:495–501) as its methodological basis; and age is not a covariate because it enters through the age-adjusted physiologic ranges.

**Structure verified, values unverified.** The patent's machine transcription carries at least three internal inconsistencies (a sign error on the APS intercept, a disagreement on the original PRISM quadratic term, and a sign disagreement on one PRISM-I term). No page or table citation was possible because no such page exists. That fails the standing rule that **no clinical number ships without a citation and a cited worked example**.

**The coefficient values are deliberately not reproduced on this page.** They are in the patent, which is cited in full below, for anyone who needs to check this finding. Restating them here would invite exactly the copy-back this section exists to prevent.

#### 3. Licensing, and the authors' own practice

The author note on the first page of the 1996 paper states that PRISM III and the updated PRISM algorithms are copyrighted and may be covered by one or more patents held by Children's Research Institute; that **the equations are available at no charge for _research_ uses**, including independent verification of their accuracy and reliability; and that Children's National Medical Center may receive compensation arising from **non-research** uses.

A free public clinical calculator is a non-research use. No source of the numbers — patent, third-party site, JavaScript bundle — confers a licence.

The authors' own network draws the same line. Checked 2026-08-03:

| CPCCRN calculator | Inputs                              | Outputs                                                |
| ----------------- | ----------------------------------- | ------------------------------------------------------ |
| PRISM III         | 17 physiologic variables + age band | SCORE / NEUROLOGIC / NON-NEUROLOGIC — **no mortality** |
| PRISM IV          | 7 subscores and risk factors        | **Estimated probability of mortality**                 |

The CPCCRN PRISM III calculator collects no risk factors at all, so it structurally cannot produce a mortality estimate. Pollack's own network had the coefficients and shipped the score without them.

#### 4. It was also the wrong model, by the paper's own criterion

Table 3, p. 7. The authors' stated inclusion criterion was Hosmer-Lemeshow p > .10:

| Model                  | AIC      | AUC  | HL χ² (12 df) | p     | Verdict                   |
| ---------------------- | -------- | ---- | ------------- | ----- | ------------------------- |
| PRISM III-12 alone     | 1970.878 | .929 | 35.877        | .0003 | **fails**                 |
| III-12 + squared term  | 1964.421 | .929 | 17.683        | .1257 | passes — **what shipped** |
| III-12 + all variables | 1867.762 | .946 | 14.854        | .2496 | passes                    |
| PRISM III-24 alone     | 1827.405 | .947 | 39.300        | .0001 | **fails**                 |
| III-24 + squared term  | 1814.818 | .947 | 19.966        | .0677 | **fails**                 |
| III-24 + all variables | 1723.773 | .958 | 17.335        | .1374 | passes                    |

Two problems follow. The 12-hour model that shipped was the **weakest passing model in the table**, with the lowest AUC of the three III-12 variants. And the 24-hour model that shipped — III-24 with the squared term, at p = .0677 — **does not meet the authors' own criterion at all**.

The Discussion makes two recommendations the removed implementation contradicted on both counts: use the models **with** the additional variables, for wider applicability across case mixes; and treat III-12 as a quality-assessment instrument while III-24 is the more accurate one for **individual patient** risk. The abstract quantifies the split — the additional risk variables contributed 5% of explained variance and PRISM III itself 95% — and that 5% is precisely what distinguishes a post-operative child from one admitted after CPR.

#### 5. One score, nine different answers

Effect of dropping the covariates, at a fixed score of 19, computed on the risk-adjusted III-12 model:

| Covariate present              | p at score 19 | Score at p = 50% |
| ------------------------------ | ------------- | ---------------- |
| none (reference)               | 38.2%         | 21.1             |
| acute diabetes / DKA           | 9.7%          | 30.0             |
| post-operative                 | 24.2%         | 24.3             |
| admitted from inpatient ward   | 50.2%         | 19.0             |
| chromosomal anomaly            | 50.8%         | 18.9             |
| previous ICU admission         | 54.5%         | 18.2             |
| acute non-operative CV disease | 54.8%         | 18.2             |
| cancer                         | 57.0%         | 17.8             |
| pre-ICU cardiac massage        | 65.2%         | 16.4             |

**A spread of 9.7% to 65.2% at one score.** The removed implementation returned **50.8%** for every one of those patients — over-predicting after surgery and in diabetic ketoacidosis, under-predicting after CPR, with cancer, and after a previous ICU admission.

#### Why no "score at which mortality reaches 50%" is quoted anywhere on this page

Every calibration table in the paper bins by **predicted probability**, never by score. That is the correct design for a model containing covariates, because there is no single score-to-mortality mapping: the same score maps to different probabilities depending on the eight risk factors. The question presupposes a one-dimensional curve, and the published model does not have one.

#### What was changed

|                                 | Before                        | After                      |
| ------------------------------- | ----------------------------- | -------------------------- |
| 4-hour window (PRISM IV)        | score, subscores, probability | **unchanged**              |
| 12-hour window                  | score, subscores, probability | score, subscores           |
| 24-hour window                  | score, subscores, probability | score, subscores           |
| Thresholds, bands, point values | —                             | **unchanged, all windows** |

The absence is rendered as an absence. Never a zero, never an error state. The guard is `prism.test.ts` → `"emits no probability for the 12- or 24-hour window, from any vector"`, which asserts the exact output id list rather than merely the absence of one id, so a probability smuggled back under a different name fails too.

#### Provenance of this finding

| Claim                                              | Source                                                               | Confidence                                     |
| -------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| Absence of any coefficient table in the 1996 paper | Full text read, all tables and figures enumerated (Ovid, 2026-08-03) | High                                           |
| Licensing position                                 | Author note, first page of the 1996 paper                            | Verified                                       |
| Table 3 model-fit statistics                       | Ovid full text, p. 7                                                 | Verified                                       |
| CPCCRN calculator input/output sets                | cpccrn.org, retrieved 2026-08-03                                     | Verified                                       |
| PRISM III coefficient **values**                   | US patent 5,809,477 only — structure confirmed, values unverified    | **Single-sourced; not for implementation**     |
| Covariate-effect spread at score 19                | Arithmetic on the patent's risk-adjusted III-12 model                | Reproducible, inherits the patent's provenance |

Source document: `C:/Users/ahmed/Downloads/calculators/prism-findings-and-implementation-spec.md`, 2026-08-03, accepted by the founder without re-litigation.

#### What has NOT been decided

The spec that produced this finding also proposes splitting PRISM IV into its own calculator, with its own inputs, its own limitations tab and cross-links. **That restructuring is not approved and has not been done.** PRISM IV stays where it is, inside this calculator, on the 4-hour window.

### PRISM IV — the covariate categories that DIFFER from the PRISM III bands

Coefficients as implemented, cited to **Table 3 of Pollack 2016**. `P(death) = 1 / (1 + e^−R)`.

```
R = -5.776
    + [age term]
    + [admission source term]
    + 1.082 × (CPR within 24 h before admission)
    + 0.766 × (cancer, acute or chronic)
    − 1.697 × (low-risk system of primary dysfunction)
    + 0.197 × (neurologic subscore)
    + 0.163 × (non-neurologic subscore)
```

**Age categories — note these are NOT the PRISM III bands:**

| PRISM IV age category | Coefficient   |
| --------------------- | ------------- |
| <14 days              | +1.311        |
| 14 days to <1 month   | +0.968        |
| 1 month to <12 months | +0.357        |
| ≥12 months            | 0 (reference) |

**PRISM IV splits the first month at 14 days, where PRISM III has a single undivided neonate band; and PRISM IV's top category opens at 12 months, where PRISM III's child band runs to 144 months.** The two schemes are not interchangeable and must not be merged. The implementation expresses the PRISM IV age term **in days** so the 14-day boundary is exact rather than a converted fraction of a month.

**Admission source:**

| Category                                      | Coefficient   |
| --------------------------------------------- | ------------- |
| Operating room / post-anaesthesia care (PACU) | 0 (reference) |
| Emergency department                          | +0.693        |
| Another hospital                              | +1.012        |
| Inpatient unit                                | +1.626        |

An **unplanned deterioration on an inpatient unit carries the heaviest weight of the four** — heavier than arriving from another hospital.

**Low-risk system of primary dysfunction** (endocrine, haematologic, musculoskeletal, or renal) at **−1.697** is the model's **only protective term**, and a large one.

### A blank covariate withholds the probability — it is never read as the reference level

**Every one of PRISM IV's four admission-context covariates is worth 0 at its reference level.** Read the three tables above: OR/PACU is the admission-source reference at 0, and no CPR, no cancer and no low-risk system are all the absent limb of a binary term. So an implementation that treats a blank as "contributes nothing" does not compute a probability _without_ that term — **it computes the reference patient**, and hands the OR/PACU, no-CPR, no-cancer, no-low-risk-system curve to every clinician who skipped a question.

That is the **same defect** as the score-only quadratic removed on 2026-08-03, which returned one curve for every patient. It merely picks a different single curve.

**The rule, as implemented:** on the 4-hour window, if **any** of `admission_source`, `cpr_24h`, `cancer` or `low_risk_system` is blank, **no `mortality_probability` output is emitted at all**. The PRISM score, the neurologic subscore and the non-neurologic subscore still render. The absence is rendered as an absence — never a zero, never an error state — exactly as on the 12- and 24-hour windows. Age is the fifth covariate and cannot be blank: the score itself requires it.

**Why the four inputs are still declared `required: false`.** They belong to PRISM IV alone and are meaningless on the 12- and 24-hour windows, where they are not collected. An unconditional requirement would reject a legitimate score-only entry. The requirement is therefore **conditioned on the window**, inside `calculate`, rather than declared on the inputs.

This follows the pattern the spec calls for — _"Require every categorical input and reject blanks outright rather than defaulting them to the reference level. Silently defaulting five covariates to zero reproduces the exact failure mode being fixed"_ — with one deliberate divergence: because this calculator carries all three windows rather than being split into a separate PRISM IV calculator, the requirement is enforced per window instead of per input. The guarantee is the same one, and it is stronger than a partial-result warning.

Guarded by `prism.test.ts` → `"withholds the PRISM IV probability when any admission-context answer is blank"`, which omits each covariate **individually** with the other three answered, asserts the exact output id list rather than merely the absence of one id, and carries a non-vacuity leg proving a fully answered vector still yields a probability.

### Collection windows are not interchangeable

| Window                                                                                      | Model        | Mortality equation shown                          |
| ------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------- |
| First **4 hours** of PICU care (laboratory values from 2 h before admission through hour 4) | **PRISM IV** | **Yes** — coefficients published in full, Table 3 |
| First **12 hours**                                                                          | PRISM III-12 | No — not published in the source article          |
| First **24 hours**                                                                          | PRISM III-24 | No — not published in the source article          |

There is **no published PRISM IV equation for 12 or 24 hours** and none is substituted. Showing a probability off its own window would be worse than showing none, because it would look correct.

The window changes **nothing about the score**, which is computed identically for all three. It decides only whether a mortality estimate can honestly be shown.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                  | label                                  | type        | units      | conversions                      | plausible min/max                                                   |
| ------------------- | -------------------------------------- | ----------- | ---------- | -------------------------------- | ------------------------------------------------------------------- |
| `collection_window` | Data collection window                 | categorical | —          | —                                | `first_4h` \| `first_12h` \| `first_24h` (required)                 |
| `age`               | Age                                    | numeric     | years      | 1 year = 12 months = 365.25 days | 0–18 [UI bound — NEEDS SOURCE]                                      |
| `sbp_min`           | Systolic blood pressure (lowest)       | numeric     | mmHg (kPa) | 1 kPa = 7.50062 mmHg             | 0–300 [UI bound — NEEDS SOURCE]                                     |
| `temp_min`          | Temperature (lowest)                   | numeric     | °C         | °F → °C: (°F−32)×5/9             | 20–45 [UI bound — NEEDS SOURCE]                                     |
| `temp_max`          | Temperature (highest)                  | numeric     | °C         | as above                         | 20–45 [UI bound — NEEDS SOURCE]                                     |
| `mental_status_gcs` | Glasgow Coma Scale (lowest)            | numeric     | points     | —                                | 3–15 (GCS definition)                                               |
| `pupils`            | Pupillary reflexes                     | categorical | —          | —                                | both reactive \| one fixed \| both fixed (required)                 |
| `hr_max`            | Heart rate (highest)                   | numeric     | bpm        | —                                | 0–350 [UI bound — NEEDS SOURCE]                                     |
| `ph_min`            | pH (lowest)                            | numeric     | —          | —                                | 6.5–8 [UI bound — NEEDS SOURCE]                                     |
| `ph_max`            | pH (highest)                           | numeric     | —          | —                                | 6.5–8 [UI bound — NEEDS SOURCE]                                     |
| `tco2_min`          | Total CO₂ (lowest)                     | numeric     | mmol/L     | mmol/L = mEq/L for HCO₃⁻         | 0–60 [UI bound — NEEDS SOURCE]                                      |
| `tco2_max`          | Total CO₂ (highest)                    | numeric     | mmol/L     | as above                         | 0–60 [UI bound — NEEDS SOURCE]                                      |
| `pco2_max`          | PCO₂ (highest)                         | numeric     | mmHg (kPa) | 1 kPa = 7.50062 mmHg             | 0–200 [UI bound — NEEDS SOURCE]                                     |
| `pao2_min`          | PaO₂ (lowest)                          | numeric     | mmHg (kPa) | as above                         | 0–700 [UI bound — NEEDS SOURCE]                                     |
| `glucose_max`       | Glucose (highest)                      | numeric     | mg/dL      | mg/dL ÷ 18.0182 = mmol/L         | 0–1500 [UI bound — NEEDS SOURCE]                                    |
| `potassium_max`     | Potassium (highest)                    | numeric     | mEq/L      | mEq/L = mmol/L                   | 0–15 [UI bound — NEEDS SOURCE]                                      |
| `creatinine_max`    | Creatinine (highest)                   | numeric     | mg/dL      | µmol/L ÷ 88.42 = mg/dL           | 0–25 [UI bound — NEEDS SOURCE]                                      |
| `bun_max`           | Blood urea nitrogen (highest)          | numeric     | mg/dL      | BUN mg/dL × 0.357 = urea mmol/L  | 0–300 [UI bound — NEEDS SOURCE]                                     |
| `wbc_min`           | White blood cell count (lowest)        | numeric     | cells/mm³  | cells/mm³ = ×10⁶/L               | 0–200,000 [UI bound — NEEDS SOURCE]                                 |
| `platelets_min`     | Platelet count (lowest)                | numeric     | cells/mm³  | cells/mm³ = ×10⁶/L               | 0–2,000,000 [UI bound — NEEDS SOURCE]                               |
| `pt_max`            | Prothrombin time (highest)             | numeric     | s          | —                                | 0–200 [UI bound — NEEDS SOURCE]                                     |
| `ptt_max`           | Partial thromboplastin time (highest)  | numeric     | s          | —                                | 0–400 [UI bound — NEEDS SOURCE]                                     |
| `admission_source`  | Admission source                       | categorical | —          | —                                | OR/PACU \| ED \| another hospital \| inpatient — **PRISM IV only**  |
| `cpr_24h`           | CPR within 24 h before admission       | boolean     | —          | —                                | **PRISM IV only**                                                   |
| `cancer`            | Cancer, acute or chronic               | boolean     | —          | —                                | **PRISM IV only**                                                   |
| `low_risk_system`   | Low-risk system of primary dysfunction | boolean     | —          | —                                | **PRISM IV only** (endocrine, haematologic, musculoskeletal, renal) |

The `min`/`max` values above are **user-interface plausibility bounds for input validation, not published limits.** The source specifies no physiologic ranges for data entry. They are marked `[UI bound — NEEDS SOURCE]` rather than presented as sourced.

### Data-collection instructions, verbatim from the patent's scoring notes

These are quoted in the calculator's help text and are reproduced here as the record of their source. All confirmed verbatim on 2026-08-01.

- **Pupillary reflexes:** _"Nonreactive pupils must be >3 mm. Do not assess after iatrogenic pupillary dilation."_
- **Mental status:** _"Include only patients with known or suspected, acute CNS disease. Do not assess within 2 hours of sedation, paralysis, or anesthesia."_
- **Heart rate:** _"Do not assess during crying or iatrogenic agitation."_
- **Temperature:** _"Use rectal, oral, blood, or axillary temperatures."_
- **Whole-blood corrections:** _"Whole blood measurements should be increased as follows: glucose-10%; sodium-3 mmol/L; potassium-0.4 mmol/L."_
- **Blood gases:** pH and PCO₂ _"may be measured from arterial, capillary, or venous sites."_ PaO₂: _"Use arterial measurements only."_
- **Total CO₂:** _"Use calculated bicarbonate values from blood gases only if total CO₂ is not measured routinely."_

**Note on the sodium correction.** The whole-blood note prescribes a sodium correction, but **sodium is not a scored PRISM III variable** — verified directly against the patent's tables, where it does not appear. (It was scored in the original PRISM; PRISM III dropped it.) The correction is inherited guidance with no scoring row behind it, so the calculator does not collect sodium. Do not add a sodium row on the strength of that note.

### Missing values score zero — and that is a hazard, not a feature

Every laboratory component is optional and a blank one contributes **0**. A partially entered PRISM therefore **reads lower than the patient is**. The implementation sets `missingAsNormal: true` and the form's partial-result cue exists for exactly this reason and must stay on.

**The four PRISM IV admission-context covariates are the exception, and deliberately so.** They are not physiologic rows and they do not score into the total; they are terms in a probability. A blank one is **not** treated as its reference level — it withholds the probability outright. See [A blank covariate withholds the probability](#a-blank-covariate-withholds-the-probability--it-is-never-read-as-the-reference-level). The partial-result cue is the right control for an unentered laboratory value, which understates a score the clinician can see; it is the wrong control for an unanswered covariate, which silently substitutes a specific clinical claim inside a number the clinician cannot audit.

## Worked examples

**No published worked example exists.** The five cases below are **constructed from the patent's threshold table**; each scoring decision is annotated with the row that produced it, so the arithmetic is auditable line by line even though the case itself is not citable to a published patient. All five were recomputed by hand during verification and reproduce exactly.

Each case doubles as a trap for a specific way this score is easy to get wrong.

**No case here carries a PRISM III mortality figure, and none may be added.** Examples A, B and C previously asserted one; those assertions were deleted on 2026-08-03 along with the equations that produced them.

### Example A — 3-year-old, entirely normal physiology (PRISM III-12); total = 0

All 26 ranges miss. Inputs: SBP 95, temp 36.5–37.5, no mental-status entry, pupils reactive, HR 120, pH 7.35–7.42, tCO₂ 22–24, PCO₂ 40, PaO₂ 90, glucose 100, K 4.0, creatinine 0.4, BUN 10, WBC 9,000, platelets 250,000, PT 12, PTT 30.

| Output              | Value                     |
| ------------------- | ------------------------- |
| PRISM total         | **0**                     |
| Neurologic subscore | 0                         |
| Non-neurologic      | 0                         |
| Predicted mortality | **none** — 12-hour window |

**What it pins:** the honest absence, on a patient whose data are perfectly complete. Three outputs and no fourth. The rail must render nothing there, not 0%.

### Example B — 8-month-old, bronchiolitis (PRISM III-12); total = 7

| Row                  | Value     | Applied rule                                                 | Points |
| -------------------- | --------- | ------------------------------------------------------------ | ------ |
| Systolic BP          | 70 mmHg   | Infant band 45–65; 70 is above it                            | 0      |
| Heart rate           | 210 bpm   | **Infant band starts at 215** — near miss                    | 0      |
| Acidosis             | pH 7.25   | 7.0–7.28 tier                                                | 2      |
| Acidosis (tCO₂ limb) | 18 mmol/L | >16.9, adds nothing to the same row                          | 0      |
| PCO₂                 | 80 mmHg   | >75.0                                                        | 3      |
| BUN                  | 12 mg/dL  | **Infant cutoff is 14.9** — would have scored 3 in a neonate | 0      |
| Platelets            | 180,000   | 100,000–200,000                                              | 2      |
| **Total**            |           |                                                              | **7**  |

No predicted mortality — 12-hour window.

**What it pins:** two near-miss age traps, in opposite directions.

### Example C — 14-year-old, DKA (PRISM III-12); total = 11

| Row           | Value                  | Applied rule                                        | Points |
| ------------- | ---------------------- | --------------------------------------------------- | ------ |
| **Acidosis**  | pH 7.05 **and** tCO₂ 6 | Both satisfy the 2-point tier of **one shared row** | **2**  |
| Glucose       | 620 mg/dL              | >200                                                | 2      |
| Creatinine    | 1.5 mg/dL              | Adolescent >1.30                                    | 2      |
| BUN           | 32 mg/dL               | >14.9                                               | 3      |
| Platelets     | 150,000                | Low-normal, still in the 100k–200k tier             | 2      |
| Systolic BP   | 88 mmHg                | Adolescent band 65–85; 88 is above it               | 0      |
| Potassium     | 6.0 mmol/L             | Cutoff is **>6.9**                                  | 0      |
| WBC           | 16,000                 | **Only leukopenia scores**                          | 0      |
| Mental status | GCS 13                 | Assessed but ≥8                                     | 0      |
| **Total**     |                        |                                                     | **11** |

No predicted mortality — 12-hour window.

**What it pins:** the shared acidosis row. Double-counting pH and total CO₂ gives **13** — the wrong answer this case exists to catch.

### Example D — 4-year-old, septic shock (PRISM III-12); total = 35, split 5 / 30

| Row           | Value         | Applied rule                                                  | Neuro | Non-neuro |
| ------------- | ------------- | ------------------------------------------------------------- | ----- | --------- |
| Mental status | GCS 6         | <8                                                            | **5** | —         |
| Pupils        | Reactive      | —                                                             | 0     | —         |
| Systolic BP   | 58 mmHg       | Child 55–75                                                   | —     | 3         |
| Temperature   | 32.5 °C       | <33 (one row, one award)                                      | —     | 3         |
| Heart rate    | 195 bpm       | Child 185–205                                                 | —     | 3         |
| Acidosis      | pH 7.15       | 7.0–7.28                                                      | —     | 2         |
| PCO₂          | 55 mmHg       | 50.0–75.0                                                     | —     | 1         |
| Glucose       | 260 mg/dL     | >200                                                          | —     | 2         |
| Creatinine    | 1.2 mg/dL     | Child >0.90                                                   | —     | 2         |
| BUN           | 30 mg/dL      | >14.9                                                         | —     | 3         |
| WBC           | 2,200         | <3,000                                                        | —     | 4         |
| Platelets     | 65,000        | 50,000–99,999                                                 | —     | 4         |
| **PT/PTT**    | PT 24, PTT 45 | PT >22.0 fires; PTT 45 ≤57.0 does not — **row awards 3 once** | —     | 3         |
| **Totals**    |               |                                                               | **5** | **30**    |

**Total 35.**

**What it pins:** the subscore split that PRISM IV depends on, and the shared PT/PTT row.

### Example E — 10-day-old, severe perinatal asphyxia (PRISM IV, 4-hour window); total = 67, split 16 / 51

| Row           | Value                  | Applied rule                                     | Neuro  | Non-neuro |
| ------------- | ---------------------- | ------------------------------------------------ | ------ | --------- |
| Pupils        | Both fixed             | Heaviest single item in the score                | **11** | —         |
| Mental status | GCS 5                  | <8                                               | **5**  | —         |
| Systolic BP   | 35 mmHg                | Neonate <40                                      | —      | 7         |
| Temperature   | 40.5 °C                | >40.0                                            | —      | 3         |
| Heart rate    | 230 bpm                | Neonate >225                                     | —      | 4         |
| **Acidosis**  | pH 6.95 **and** tCO₂ 4 | Both in the <7.0 / <5 tier of one row            | —      | **6**     |
| PCO₂          | 80 mmHg                | >75.0                                            | —      | 3         |
| PaO₂          | 38 mmHg                | <42.0                                            | —      | 6         |
| Glucose       | 250 mg/dL              | >200                                             | —      | 2         |
| Potassium     | 7.5 mmol/L             | >6.9                                             | —      | 3         |
| Creatinine    | 1.0 mg/dL              | Neonate >0.85                                    | —      | 2         |
| BUN           | 20 mg/dL               | Neonate >11.9                                    | —      | 3         |
| WBC           | 2,500                  | <3,000                                           | —      | 4         |
| Platelets     | 40,000                 | <50,000                                          | —      | 5         |
| **PT/PTT**    | PT 30, PTT 95          | Both over the neonate cutoffs — **still 3 once** | —      | 3         |
| **Totals**    |                        |                                                  | **16** | **51**    |

**Total 67.** Non-physiologic terms: admission source = another hospital, CPR within 24 h = **yes**, cancer = **no**, low-risk system = **no**. The last two are _answered_ rather than left blank — they contribute nothing either way, but a blank is not an answer and would withhold the probability entirely.

`R = −5.776 + 1.311 (under 14 days) + 1.012 (another hospital) + 1.082 (CPR) + 0.197×16 + 0.163×51 = 9.094`, so **P = 99.9888%**.

**What it pins:** the PRISM IV equation with a maxed neurologic subscore, and the **14-day age boundary** — this patient is on the young side of a split PRISM III does not have at all. It is the only worked example that asserts a probability, because the 4-hour window is the only one that produces one.

The probability is saturated at that score, so it is a weak place to catch a wrong coefficient. Four mid-range anchors carry that load instead (probes, not patients — see below).

### PRISM IV anchors (threshold probes, not clinical cases)

Every value is `P = 1 / (1 + e^−R)` over Table 3's coefficients with the patient at **every reference level** — age ≥ 12 months, admitted from OR/PACU, no CPR, no cancer, no low-risk system — so only the two subscore weights move. Those four are **answered at their reference level, not left blank**; blank withholds the probability, so an anchor built on blanks would have nothing to assert.

| Neurologic | Non-neurologic | R                                    | P(death)    |
| ---------- | -------------- | ------------------------------------ | ----------- |
| 0          | 0              | −5.776                               | **0.3092%** |
| 0          | 10             | −5.776 + 0.163×10 = −4.146           | **1.5581%** |
| 11         | 0              | −5.776 + 0.197×11 = −3.609           | **2.6365%** |
| 5          | 10             | −5.776 + 0.197×5 + 0.163×10 = −3.161 | **4.0660%** |

**Provenance is weaker than the platform's usual pattern and is recorded as such.** The 2016 paper contains no worked example, so these are **arithmetic on the published coefficient table**, not figures reproduced from a publication. They were cross-checked against an independent recomputation of the same table rather than being this file's own arithmetic marking its own work.

The first row is the one worth reading twice: a **completely normal child still carries a non-zero probability**, because that is what a logistic intercept does. It must never be displayed as 0%.

**The split cannot be collapsed into the total.** Two patients at the same total of 12:

| Split                 | R      | P(death)    |
| --------------------- | ------ | ----------- |
| neuro 7 / non-neuro 5 | −3.582 | **2.7067%** |
| neuro 5 / non-neuro 7 | −3.650 | **2.5333%** |

An implementation that summed to a total before applying weights would return one number for both. (The spec's own split-sensitivity pair, neuro 5/10 against neuro 10/5, is not usable here: the neurologic subscore is built from pupils 0/7/11 plus mental status 0/5, so it can only take the values 0, 5, 7, 11, 12 and 16 — **10 is not attainable**. The pair above is the equal-total substitute.)

### Ceiling vector (threshold probe, not a clinical case)

Every row at its worst tier simultaneously: **74 = 16 neurologic + 58 non-neurologic**. This is a branch-coverage probe, not a patient, and is deliberately kept out of the worked-example set — dressing a probe up as a patient would misrepresent what it is. It is what proves the declared `composition` maxima are **attainable** rather than merely respected.

## Interpretation bands (non-directive wording, with source)

**No severity bands are authored, and none is owed.** This is recorded in the implementation as `interpretationStatus: "not-applicable"` — an **absence by design, not a content gap**. It read `"pending"` until 2026-08-03; that was wrong, and the correction matters because `pending` asserts that a published stratification exists and has simply not been transcribed yet.

**Neither model has one.**

- **PRISM IV outputs a continuous probability, not a band** (source spec §2.3: _"PRISM IV outputs a continuous probability, not a band. No interpretation table."_). Its calibration data — the decile-style table that an earlier version of this page pointed at as "something to author" — bins by **predicted probability**, never by score, which is the correct design for a covariate-adjusted model and is exactly why [no score-to-mortality curve is quotable](#why-no-score-at-which-mortality-reaches-50-is-quoted-anywhere-on-this-page). A calibration table is a check on the model's own output; it is not a severity stratification of the score and cannot be turned into one.
- **PRISM III score-only has no published severity band at all**, and none may be invented. With the mortality output gone there is nothing left here to band.

So nothing is awaiting a later pass, which is precisely what `not-applicable` declares. Same call, for the same reason, as `fluid-balance` and `four-score`. Pinned by `prism.test.ts` → `"declares no interpretation bands, and declares that as not-applicable"`, so restoring `pending` requires deleting that test on purpose.

The published quantitative anchors, for reference and not as bands:

**PRISM III (Pollack 1996):** 11,165 admissions, 543 deaths, 32 PICUs. AUROC — PRISM III-12 development **0.947 ± 0.007**, validation **0.941 ± 0.021**; PRISM III-24 development **0.958 ± 0.006**, validation **0.944 ± 0.021**. Hosmer-Lemeshow goodness of fit showed no significant calibration error (p = 0.2496 / 0.1374 / 0.4168 / 0.5504).

**PRISM IV (Pollack 2016):** 10,078 admissions, unadjusted mortality **2.7%** (site range 1.3–5.0%), 75/25 derivation/validation split. AUROC **0.88 ± 0.013** (development) and **0.90 ± 0.018** (validation). Hosmer-Lemeshow p = 0.39 (development) and 0.50 (validation).

### Only one model produces a probability, and only for its own window

PRISM III was derived on early-1990s practice; PRISM IV was recalibrated on the 2011–2013 cohort. That gap used to be documented here with a side-by-side of the two predictions for the same physiology. **That comparison is gone with the PRISM III equations** — there is no longer a PRISM III figure to compare against, and reconstructing one to make the point would reintroduce exactly the number that was removed.

What survives is the scope statement, which matters at the bedside more than the calibration story:

|                                 | PRISM III (1996)                | PRISM IV (2016)                        |
| ------------------------------- | ------------------------------- | -------------------------------------- |
| Outcome                         | PICU mortality                  | **Hospital** mortality                 |
| Admissions                      | Readmissions counted separately | **First PICU admission only**          |
| Physiologic window              | first 12 or 24 hr               | **first 4 hr**                         |
| Laboratory window               | first 12 or 24 hr               | **2 hr before admission → 4 hr after** |
| Reference cohort                | 32 US PICUs, 1990s              | 7 CPCCRN sites, 2011–2013              |
| Unadjusted mortality            | —                               | 2.7% (site range 1.3–5.0%)             |
| Mortality equation shipped here | **none**                        | yes                                    |

So the PRISM IV number must be read with all three qualifiers attached: the estimated probability of **hospital** mortality, for a **first PICU admission**, from data collected in the **first 4 hours** of PICU care. Its age ceiling is 18 years, and performance in a different case mix or region may differ from the reference sample.

### Population instrument, not a bedside prognosis

PRISM estimates mortality risk for a **population**. It is a case-mix and benchmarking instrument: summed across a cohort it yields an expected death count for a standardised mortality ratio. **Applied to one patient it says nothing actionable.** Display wording must stay descriptive and must not read as a prognosis for the child in front of the user.

## `[NEEDS SOURCE]` — the genuinely open items

Listed plainly. None of these is papered over, and none is a placeholder for a value that was invented instead.

1. **No published worked example exists for either model.** Not in Pollack 1996 (now read in full), Pollack 2016, the patent, or any secondary source located. The test cases are constructed from the threshold table and labelled as such, and the PRISM IV probabilities are arithmetic on the published coefficient table rather than figures reproduced from a publication. **The natural oracle is the authors' own CPCCRN calculators** (https://www.cpccrn.org/calculators/prismivcalculator/ and `/prismiiicalculator/`). Their **input and output sets** were read on 2026-08-03 and are recorded above, but **no case has been round-tripped through either one**, so the constructed cases remain unreconciled. That round-trip is still the single most valuable outstanding verification for this score.
2. **The neonate heart-rate 3-point band.** The patent's rendering prints **"215-255"**, which is internally inconsistent with the **">225"** cutoff on the same row. **215–225** is used, matching the infant band and independent reproductions. The 1996 paper was obtained on 2026-08-03, so **this is now checkable against Figure 1 and has not yet been checked.** Until it is, this remains a source-defect resolution rather than a sourced value, and is flagged as such in the code.
3. **The glucose mg/dL vs mmol/L discrepancy.** The source prints **200 mg/dL** and **11.0 mmol/L** as if equivalent, but **200 mg/dL = 11.1 mmol/L**. The two limbs are not the same threshold. The **mg/dL limb is treated as authoritative** here. Which limb the authors intended, and whether the mmol/L figure is a rounding of the mg/dL one or a separately chosen cut point, is **not stated in any source located**. Also now checkable against Figure 1 and not yet checked.
4. ~~**PRISM IV Table 3 coefficients were not independently re-extracted.**~~ **CLOSED 2026-08-03.** Obtained from the PCCM 2016 author manuscript (PMC, nihms817698), Table 3, p. 12, and the implementation's coefficients match. The earlier structural corroboration via PRISM 4-C (Alvarez Elias et al., _J Pediatr Hematol Oncol_ 2020;42(7):e563-e568, **PMID 32986390**, publishing `logit = −4.110 + 0.219 × neurologic + 0.177 × non-neurologic`) is retained as a second, independent confirmation of the two-weight **shape**.
5. ~~**Interpretation bands are unauthored** (`interpretationStatus: "pending"`).~~ **CLOSED 2026-08-03 — and it was not a gap.** The declaration is now `not-applicable`. PRISM IV outputs a **continuous probability, not a band**, so it has no interpretation table; its calibration data bins by predicted probability rather than by score and therefore cannot become one. PRISM III score-only has no published severity band at all. Nothing is awaiting a later pass, and `pending` was asserting strata that do not exist. See [Interpretation bands](#interpretation-bands-non-directive-wording-with-source).
6. **Input plausibility bounds** (`min`/`max` on every numeric field) are UI validation limits with **no published basis**. The source specifies no data-entry ranges. Use institutional analyser limits rather than treating these as clinical bounds.
7. **PRISM III mortality is not a source gap that can be closed by finding a better source.** The equations are absent from the derivation article and the paper's author note reserves them for research use. What would settle it is a written answer from the rights holder, not another search — see item 8. Until then the platform ships the score only, and no `[NEEDS SOURCE]` marker is warranted, because nothing here is asserted without a source; a whole output was withdrawn instead.
8. **Write to the rights holder.** The 1996 paper states the equations are free for research uses including independent verification. One enquiry could obtain the authoritative coefficients _and_ a written answer on whether a free public clinical calculator is a non-research use. Worth having in writing either way. Note there are **at least two possible counterparties**: the patent assignment chain runs Children's Research Institute → Children's Hospital of Los Angeles (2007-11-01) → **VPS LLC** (2008-04-07), while the copyright footnote names Children's National. Tracked in `docs/research/source-requests-2026-08-03.md` if that file is in the tree.
9. **Audit the other calculators for the same failure mode.** If the PRISM III coefficients entered this codebase from a secondary source, that source may have seeded others. The provenance of every mortality or risk equation currently shipping is worth tracing. **Open, not started here.**

## References (full citations, PMID/DOI)

1. **Pollack MM.** _Method, apparatus and medium for allocating beds in a pediatric intensive care unit and for evaluating quality of care._ **US patent 5,809,477**, issued 1998-09-15. https://patents.google.com/patent/US5809477A/en — source for the complete PRISM III threshold table, the age-band definitions and the scoring notes quoted in the calculator help text, all of which the 1996 paper also publishes. Status **"Expired - Lifetime"**, anticipated expiration **2015-09-21**. It also states mortality equations the paper does not; **those are not implemented and are not reproduced on this page** — see the finding section for why.
2. **Pollack MM, Patel KM, Ruttimann UE.** _PRISM III: an updated Pediatric Risk of Mortality score._ **Crit Care Med.** 1996;24(5):743-752. **PMID: 8706448** · **DOI: 10.1097/00003246-199605000-00004.** The derivation paper, and the source of the score. **Full text obtained 2026-08-03** (Ovid / University of Toronto Libraries, all 16 pages). Publishes the score sheet in full at Figure 1, p. 6, and **no regression coefficients anywhere**. Its author note, p. 1, reserves the mortality equations for research use.
3. **Pollack MM, Holubkov R, Funai T, et al.** _The Pediatric Risk of Mortality Score: Update 2015._ **Pediatr Crit Care Med.** 2016;17(1):2-9. **PMID: 26492059** · **DOI: 10.1097/PCC.0000000000000558.** PRISM IV — source of the subscore split and every coefficient in Table 3. Table 3 **obtained and reconciled 2026-08-03** via the author manuscript (PMC, nihms817698), p. 12. Its stated objective included placing the algorithms in the public domain.
4. **Collaborative Pediatric Critical Care Research Network.** PRISM IV calculator (https://www.cpccrn.org/calculators/prismivcalculator/) and PRISM III calculator (`/prismiiicalculator/`) — the authors' own implementations. **Input and output sets read 2026-08-03**: PRISM III returns SCORE / NEUROLOGIC / NON-NEUROLOGIC and no mortality; PRISM IV's inputs match Table 3 one-to-one. **No case round-tripped; the constructed examples remain unreconciled.**
5. **Alvarez Elias AC, et al.** _PRISM 4-C: An Adapted PRISM IV Algorithm for Children With Cancer._ **J Pediatr Hematol Oncol.** 2020;42(7):e563-e568. **PMID: 32986390.** Used **only** as structural corroboration of the PRISM IV two-weight form; contributes no threshold or coefficient to this page.
6. Independent validation cohort corroborating the PRISM IV 4-hour collection window ("laboratory data from 2 hours prior to 4 hours after admission, and physiological data within 4 hours of admission were collected"): _Comparative Performance of Pediatric Risk of Mortality IV and Pediatric Index of Mortality 3 in Critically Ill Children with Cancer._ PMC12186081. Window corroboration only; contributes no threshold.

## Limitations & notes

- **Population instrument.** PRISM is for case-mix adjustment and benchmarking, not individual prognosis. See [Interpretation bands](#interpretation-bands-non-directive-wording-with-source).
- **PRISM III has no mortality output here, and that is deliberate.** Its equations are not published in the source article and are separately licensed. The 12- and 24-hour windows give the score and its two subscores. Do not restore a probability without the finding above being overturned in writing.
- **PRISM IV predicts something specific.** Hospital mortality, first PICU admission, first 4 hours. Not PICU mortality, not a readmission, not a 24-hour picture.
- **PRISM IV shows no probability until all four admission-context questions are answered.** Each is worth 0 at its reference level, so a blank read as "no contribution" is not a neutral omission — it is the reference patient, asserted about someone who was never asked. The estimate is withheld instead. See [A blank covariate withholds the probability](#a-blank-covariate-withholds-the-probability--it-is-never-read-as-the-reference-level).
- **Blank components score zero**, so a partially entered score reads lower than the patient is. The partial-result cue is a safety control, not decoration.
- **Mental status is conditional.** Enter it **only** for known or suspected acute CNS disease, and **not within 2 hours** of sedation, paralysis, or anaesthesia. Entering a sedation-depressed GCS inflates the neurologic subscore — the subscore PRISM IV weights most heavily.
- **Whole-blood chemistry needs correcting before entry**: glucose +10%, potassium +0.4 mmol/L. (The source also prescribes sodium +3 mmol/L, but sodium is not a scored PRISM III variable — see above.)
- **Worst-value semantics.** Every physiologic field is the worst value in the window, which is why several variables appear twice (lowest and highest pH; lowest and highest total CO₂). Entering a single spot value understates the score.
- **The bidirectional rows are the most common implementation error.** The patent explicitly permits scoring both a low and a high range of the same analyte. An implementation that treats pH as one row will silently under-score every patient whose pH swung.
- **Age bands differ between PRISM III and PRISM IV** and must never be unified. See the two tables above.
- **The neonate heart-rate band rests on a source-defect resolution**, not a clean citation. Flagged in `[NEEDS SOURCE]` item 2.
- **The mortality output is a population estimate off a specific window.** The calculator refuses to show a probability for a window whose model it cannot cite.

## Verification

Independent re-check performed **2026-08-01**, against the primary sources directly rather than against the implementation.

**US patent 5,809,477 (re-fetched):**

- Age bands — **confirmed verbatim**: "Ages: Neonate=0-<1 month; Infant=1 month-<12 months; Child=12 months-<144 months; Adolescent ≧144 months."
- Full threshold table (all 17 variables) — **matches this page row for row**, including the infant/child shared creatinine cutoff and the neonate-vs-everyone-else BUN split.
- Bidirectional scoring rule — **confirmed verbatim**: "When there are both low and high ranges, PRISM III points may be assigned for the low and the high ranges."
- Both score-only equations, then implemented — **confirmed verbatim against the patent**, which is the only thing that check established. **Superseded 2026-08-03:** confirming that a transcription matches the patent is not the same as confirming the values, and the paper that the citation names contains no such equation to check them against. Both are now removed; the values are not restated on this page. See [The 2026-08-03 finding](#the-2026-08-03-finding--prism-iiis-mortality-equations-are-not-published).
- Both full-covariate equations — **confirmed verbatim against the patent**, same caveat, also not restated. Patent contains **14 equations** across four methodologies.
- All seven scoring notes (pupil >3 mm, mental-status conditions, heart-rate exclusion, temperature sites, whole-blood corrections, blood-gas sample types, bicarbonate substitution) — **confirmed verbatim**.
- **Sodium confirmed absent** from the PRISM III-12 and PRISM III-24 tables, despite the whole-blood note prescribing a sodium correction.
- Patent status — **confirmed** "Expired - Lifetime", anticipated expiration **2015-09-21**.
- **Neonate heart-rate OCR defect reproduces on re-fetch** — the rendering again returned "215-255" against ">225" on the same row. The defect is therefore **in the source document's rendering**, not a transcription error on this page. Resolution to 215–225 stands.

**Pollack 1996 abstract (PubMed 8706448, re-fetched):**

- "The PRISM III score has 17 physiologic variables subdivided into 26 ranges" — **confirmed verbatim**, and **reconciled by arithmetic** against the transcribed table (17 and 26 both compute exactly; see the completeness check above). This is the strongest available evidence that the table here is complete.
- "stratified by age (neonate, infant, child, adolescent)" — **confirmed verbatim**, corroborating the patent's four-band scheme independently of the patent.
- Cohort (11,165 admissions, 543 deaths, 32 PICUs), all four AUROCs, all four Hosmer-Lemeshow p-values — **confirmed verbatim**.

**Pollack 2016 abstract (PubMed 26492059, re-fetched):**

- Public-domain statement — **confirmed verbatim**: "recalibrates the Pediatric Risk of Mortality score, placing the algorithms (Pediatric Risk of Mortality IV) in the public domain."
- Unchanged physiologic ranges — **confirmed**, actual wording: "Although the physiologic ranges for the Pediatric Risk of Mortality variables have not changed". **Correction of record:** the implementation's header docblock paraphrases this as "the PRISM score for physiologic variables and their ranges did not change" and presents it inside quotation marks. The claim is accurate; the quotation is a paraphrase, not the paper's words. Do not re-quote the docblock version as verbatim.
- Covariate list — **confirmed verbatim**: "the subcategories of neurologic and nonneurologic Pediatric Risk of Mortality scores, age, admission source, cardiopulmonary arrest within 24 hours before admission, cancer, and low-risk systems of primary dysfunction."
- Performance (AUROC 0.88 ± 0.013 / 0.90 ± 0.018; H-L p = 0.39 / 0.50; 10,078 admissions; 2.7% mortality) — **confirmed verbatim**.

**Not verified this pass, and recorded as such:**

- **PRISM IV Table 3 coefficients.** Paper paywalled; Medscape mirror returned **HTTP 402**; no open-access reproduction of the table located. Structural corroboration only, via PRISM 4-C (PMID 32986390). See `[NEEDS SOURCE]` item 4.
- **CPCCRN calculators.** Re-attempted 2026-08-01 → **HTTP 503, `Retry-After: 3600`**. Third documented failure. No worked example reconciled.
- **Independent reproduction of the 215–225 neonate band.** Located at search-snippet strength (a PRISM III validation paper reproducing the table with "Neonate 215-225"); the source PDF was not machine-extractable, so this is corroboration, not a citation, and item 2 stays open.

**Worked examples A–E** — all five recomputed by hand against the verified table: row selection, the shared-row rules, the subscore split, and the logistic equations. **All five reproduce exactly** (0, 7, 11, 35, 67; subscores 0/0, 0/7, 0/11, 5/30, 16/51). The 74-point ceiling was recomputed independently from the worst tier of every row and **sums to 74 = 16 + 58**.

**Result of the 2026-08-01 pass:** no numeric correction was necessary to the threshold table or the age bands. One documentation correction is recorded above (the paraphrased quotation in the implementation's docblock).

### 2026-08-03 pass — the full text of Pollack 1996

The 1996 article was obtained in full for the first time (Ovid / University of Toronto Libraries, all 16 pages). Every prior pass had worked from the abstract plus the patent, which is how a coefficient with no citable page survived four reviews.

- **Citation details** — confirmed: volume **24**, issue **5**, pages 743–752. A common miscitation renders this as volume 25 issue 4, and at least one indexing site propagates that error. This page and the implementation both have it right.
- **Absence of any regression coefficient** — established by enumerating all eight tables and four figures. No supplement exists. See the finding section for the table-by-table enumeration.
- **The author note on page 1** — read in context for the first time. Copyright asserted, patents possible, equations free for **research** uses, compensation possible for **non-research** uses.
- **Table 3 model-fit statistics** — confirmed, p. 7, and they are what showed that the shipped III-24 variant failed the authors' own Hosmer-Lemeshow criterion (p = .0677 against a stated threshold of .10).
- **Tables 4, 6, 7 and 8 calibration data** — confirmed, and confirmed to bin by **predicted probability**, never by score, which is why no score-to-mortality curve is quotable.
- ⚠️ Table 6's header reads "Probability of Death (%)" while its row values are **proportions** (0.03 = 3%), per Table 5's footnote. Noted so the next reader does not misread it.
- **CPCCRN calculators** — retrieved 2026-08-03. The PRISM III calculator returns SCORE / NEUROLOGIC / NON-NEUROLOGIC and collects no risk factors; the PRISM IV calculator returns a mortality probability and its input list is a one-to-one match with Table 3 of the 2016 paper. Its reference age band tops out at **≤18 years**.
- **PRISM IV Table 3 coefficients** — obtained from the PCCM 2016 author manuscript (PMC, nihms817698), p. 12. This closes `[NEEDS SOURCE]` item 4 as it was written: the coefficients in the implementation match the published table. The implementation was not changed.

**Result of the 2026-08-03 pass:** one output removed — the PRISM III mortality probability, on both windows. **No change to any threshold, age band, point value, subscore or the total.** The score computes exactly as it did before, in every window.

### 2026-08-03, second pass — three defects found by verification of the first

A verification pass over the change above found three defects in it. All three are fixed; the score is again untouched.

1. **The PRISM IV covariates were silently defaulting to the reference level.** All four were declared optional and read with optional chaining, contributing 0 when absent — so a clinician on the 4-hour window who left admission source blank was handed the OR/PACU reference curve. This is the reference-patient form of the very defect the first pass removed. **Fixed** by withholding the probability outright when any of the four is blank; see [A blank covariate withholds the probability](#a-blank-covariate-withholds-the-probability--it-is-never-read-as-the-reference-level). Flipping the inputs to `required: true` was rejected: they are meaningless on the 12- and 24-hour windows and would have blocked a legitimate score-only entry.
2. **The provenance strings contradicted each other.** The implementation's notes and one reference note claimed the CPCCRN calculators _"returned HTTP 503 behind a rate limit at every attempt"_ while a sibling reference recorded _"Retrieved 2026-08-03"_, and the source document records **both calculators' input and output sets as VERIFIED, retrieved 3 Aug 2026**. This page already had it right. **Fixed** in the implementation: both input and output sets were read on 2026-08-03; what is still outstanding is that **no case has been round-tripped** through either, so the constructed fixtures remain unreconciled against the authors' implementation. (The 2026-08-01 HTTP 503 records elsewhere on this page are dated observations of that pass and stand as written.)
3. **`interpretationStatus: "pending"` asserted strata that do not exist.** **Fixed** to `not-applicable`; see [Interpretation bands](#interpretation-bands-non-directive-wording-with-source) and `[NEEDS SOURCE]` item 5.

**Implementation version 2.1.0.** No threshold, age band, point value, subscore or coefficient moved in this pass either, and a fully answered 4-hour entry returns exactly the probability it returned before.

**The transferable lesson**, and it is the second one this page has recorded: "verified against the patent" and "verified" are not the same claim. The patent was treated as a proxy for a paywalled paper for four review passes. It is a proxy for the parts the paper publishes. It is not a proxy for the parts the paper withholds — and the difference between those two categories is exactly where the uncitable number was hiding.

## IP status

> ## NARROWED 2026-08-03 — the score publishes; PRISM III's mortality equations do not
>
> The 2026-08-02 decision below stands **for the score**, which is what this
> calculator ships: a table of physiologic cut-points, published in full at
> Figure 1 of the derivation paper, plus PRISM IV's equation, whose authors
> placed it in the public domain and whose coefficients are printed in Table 3.
>
> **PRISM III's mortality equations are removed, and the reason is not primarily
> the licence.** It is that they are **not published in the article the platform
> cites**, so no page could be given for them — the project's own rule that no
> clinical number ships without a citation. Once the full text was read, the
> licence question stopped being the load-bearing one. See
> [The 2026-08-03 finding](#the-2026-08-03-finding--prism-iiis-mortality-equations-are-not-published).
>
> Two things this does **not** mean. It is not a reversal of the 2026-08-02
> decision — nothing about 17 USC 102(b) changed, and the score still publishes
> on exactly that reasoning. And it is not a claim that the equations are
> unavailable: they are in the patent, cited below, for anyone verifying this
> finding. They are simply not something this platform can cite to a page, and
> the author note puts a free public clinical calculator on the non-research
> side of a line the authors themselves drew.
>
> **What would reopen it:** the authoritative coefficients supplied by the
> rights holder together with written clearance for this use — which the paper
> itself invites, offering the equations free for research uses including
> independent verification. See `[NEEDS SOURCE]` item 8. Finding the numbers on
> another site or in another bundle reopens nothing.
>
> ---
>
> ## DECIDED 2026-08-02 — publish, treating the algorithms as uncopyrightable
>
> **Founder decision:** publish PRISM III and PRISM IV with full attribution to
> the derivation study, on the basis that a table of physiologic cut-points and
> a logistic equation is a method of operation under 17 USC 102(b) rather than
> copyrightable expression. See `docs/decisions/ADR-tier-b-ip.md`, third
> addendum.
>
> **The obligation that comes with it:** every published surface names the study,
> and `references` must resolve. Attribution is an academic-integrity duty
> independent of copyright, and it is what makes this position defensible rather
> than merely convenient.
>
> **The evidence below is unchanged and stays on the record.** The footnote
> exists, says what it says, and has not been withdrawn; the current patent
> assignee is VPS LLC, not Children's National. The decision is taken in view of
> those facts, not in ignorance of them. What would reopen it is a communication
> from VPS LLC or Children's National asserting a claim against this specific
> use — nothing else.
>
> ---
>
> ## The evidence, as recorded 2026-08-01
>
> This section previously read **"Freely reproducible"** and concluded the
> licence question was closed. An adversarial re-check found it answered the
> wrong claim, and two of its factual premises are wrong. The implementation
> still declares `ipStatus: { kind: "freely-reproducible" }`; that declaration
> and this section now disagree, deliberately, until a human decides.
>
> **1. Patent expiry does not retire the copyright assertion.** Pollack's own
> derivation papers carry a rights footnote (Crit Care Med 1996;24(5):743-752 at
> p.752; repeated in J Pediatr 1997;131(4):575-81) whose substance is:
>
> > "PRISM III and updated PRISM algorithms are copyrighted and may be the
> > subject of one or more patents held by Children's Research Institute.
> > However, the equations are available without charge for research uses
> > including the independent verification of their accuracy and reliability.
> > Children's National Medical Center may receive compensation resulting from
> > nonresearch uses of PRISM III and PRISM algorithms."
>
> That is three assertions joined by "and" — copyright, patent, and a
> research/non-research split. The 2015 patent expiry retires exactly one. Note
> the footnote's own hedging: the patent is "may be", the copyright is flat. A
> free public calculator for practising clinicians is a **clinical** use, not
> "research uses including the independent verification of their accuracy" — it
> falls on the wrong side of the line the authors themselves drew.
>
> **2. The rights holder is not who this document said.** The assignment chain
> on the patent record, verified independently 2026-08-01:
> Children's Research Institute → **Children's Hospital of Los Angeles**
> (2007-11-01) → **VPS LLC** (2008-04-07). VPS LLC is Virtual Pediatric Systems,
> a for-profit subscription PICU benchmarking product that markets PRISM 3.
> Naming Children's National has been wrong since 2008, and it means any
> permission approach has at least two possible counterparties.
>
> **3. The public-domain grant names PRISM IV, not PRISM III.** Pollack 2016
> opens "the prediction algorithms (Pediatric Risk of Mortality IV)". This
> calculator also implements the PRISM III-12 and PRISM III-24 score-only
> quadratic mortality equations, which are outside that grant and are the most
> direct target of "PRISM III and updated PRISM algorithms are copyrighted".
>
> **4. The footnote was never read.** It is in the body of a paywalled paper at
> p.752; this note's own reference 2 records the full text as not obtained. The
> one document that settles the question is the one the research skipped.
>
> **Why this matters even though the claim is probably weak.** A table of
> physiologic cut-offs and a logistic equation is thin ground under 17 USC
> 102(b), and the "facts and formulae are not copyrightable" bullet below is
> probably right on the merits. But this project declined **PEWS, FLACC,
> COMFORT-B, CAPD and SOS-PD** on asserted claims without waiting to see whether
> those claims would hold. The same standard applied here puts PRISM back at
> `NEEDS-LEGAL-REVIEW` — which is where `ADR-tier-b-ip.md` originally had it,
> and the 2026-07-31 addendum retired that row without ever quoting or answering
> this footnote. It answered Wikipedia and medicalalgorithms.com, both of which
> are patent-based.
>
> **What closes it:** obtain Pollack 1996 p.752 and read the footnote in context
> — a one-page read that resolves it either way — or get a written statement
> from whichever of Children's National or VPS LLC holds the copyright.
>
> **The narrower de-risking path, if a decision is wanted sooner:** ship
> **PRISM IV only**. Its algorithms carry an explicit public-domain grant from
> the authors, the physiologic table is unchanged between the two ("the PRISM
> score for physiologic variables and their ranges did not change") so the table
> travels with the grant, and dropping the PRISM III-12/-24 equations removes
> the only component whose clearance depends on reading patent expiry as
> extinguishing a copyright claim.
>
> Note there is **nothing to strip**: unlike FLACC or COMFORT-B, PRISM has no
> item wording of its own, so the paraphrase route that de-risks a prose scale
> does not apply. The assertion is over the algorithm itself.

The reasoning below is retained as originally written, because it is what the
`freely-reproducible` declaration currently rests on. Read it against the
correction above rather than instead of it. Full history in
`docs/decisions/ADR-tier-b-ip.md` (addendum, 2026-07-31).

- **The patent has expired.** US 5,809,477, which reproduces the entire PRISM III table and every mortality equation, shows status **"Expired - Lifetime"** with anticipated expiration **2015-09-21**. Verified directly against the patent record, and re-verified 2026-08-01.
- **PRISM IV was placed in the public domain by its own authors.** Pollack 2016's abstract states the work's objective included "placing the algorithms (Pediatric Risk of Mortality IV) in the public domain". The authors' own NIH-funded network (CPCCRN) publishes a free public calculator.
- **The content is facts and formulae, not item wording.** PRISM III is a table of physiologic cut-offs plus a logistic equation. Facts, numeric cut points, and mathematical scoring rules are **not copyrightable**. This is the category that `ADR-tier-b-ip.md` itself identifies as IP-clean, and it is why PRISM was always the odd one out in that document's Tier-B table.
- **No copyrightable item wording is reproduced.** PRISM has no descriptive response-option prose of its own. The one component with external wording is the **Glasgow Coma Scale**, and PRISM consumes only the **integer total** — no GCS eye/verbal/motor descriptor text is copied into this platform. If a GCS descriptor widget is built elsewhere, review that separately.
- **The "licence-only" claim is stale.** It is still repeated by Wikipedia and by medicalalgorithms.com (which declines to publish PRISM III because it "is protected by patent"). Those statements **pre-date the 2015 expiry** and were never revised. `ADR-tier-b-ip.md` originally inherited them and rated PRISM `NEEDS-LEGAL-REVIEW` for over a week on that basis.
  **← This bullet is the error.** Both cited sources are patent-based, so rebutting them rebuts only the patent claim. The ADR's original rating rested on the authors' copyright footnote, not on Wikipedia — see the correction at the top of this section.
- **Attribution** to Pollack et al. and to the patent is an academic-integrity expectation, not a copyright requirement, and is carried in the score's `references`.
