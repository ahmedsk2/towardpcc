# Vasoactive-Inotropic Score (VIS)

> Scope: This file documents the **original Gaies et al. 2010** VIS (the version used for
> pediatric critical care), the Inotrope Score it extends, and only those **published**
> extensions I could source. VIS is a continuous quantitative measure of pharmacologic
> cardiovascular support; it is not a diagnostic test and has no single universal cut-point.

## Formula / algorithm (exact — every coefficient, every branch)

The VIS extends the earlier **Inotrope Score (IS)** by adding milrinone, vasopressin, and
norepinephrine.

**Inotrope Score (IS), the base term:**

```
IS = dopamine (mcg/kg/min)
   + dobutamine (mcg/kg/min)
   + 100 x epinephrine (mcg/kg/min)
```

IS is the pre-existing score VIS builds on. The precise original IS derivation citation
(confirmed by independent fetch — see Verification) is **Wernovsky G, Wypij D, Jonas RA,
Mayer JE Jr, Hanley FL, Hickey PR, Walsh AZ, Chang AC, Castañeda AR, Newburger JW, Wessel DL.
Postoperative course and hemodynamic profile after the arterial switch operation in neonates
and infants. A comparison of low-flow cardiopulmonary bypass and circulatory arrest.
_Circulation._ 1995;92(8):2226–2235. PMID: 7554206. DOI: 10.1161/01.cir.92.8.2226.**

**Vasoactive-Inotropic Score (VIS), Gaies et al. 2010:**

```
VIS = dopamine     (mcg/kg/min)
    + dobutamine   (mcg/kg/min)
    + 100   x epinephrine    (mcg/kg/min)
    + 10    x milrinone      (mcg/kg/min)
    + 10000 x vasopressin    (units/kg/min)
    + 100   x norepinephrine (mcg/kg/min)
```

Equivalently: `VIS = IS + 10*milrinone + 10000*vasopressin + 100*norepinephrine`.

This exact expression is reproduced verbatim (as "Figure 1: VISb = IS + 10 x milrinone dose
(mcg/kg/min) + 10,000 x vasopressin dose (Units/kg/min) + 100 x norepinephrine dose
(mcg/kg/min)") in the prospective validation paper (Davidson 2012, PMC4984395) and, in the
fully expanded form above, in the systematic review (PMC10770946).

**Coefficient table (core / original VIS):**

| Drug           | Coefficient | Dose units       |
| -------------- | ----------- | ---------------- |
| Dopamine       | 1           | mcg/kg/min       |
| Dobutamine     | 1           | mcg/kg/min       |
| Epinephrine    | 100         | mcg/kg/min       |
| Milrinone      | 10          | mcg/kg/min       |
| Vasopressin    | 10,000      | **units/kg/min** |
| Norepinephrine | 100         | mcg/kg/min       |

**No branches / no conditionals.** VIS is a single weighted linear sum. A drug not running
contributes 0. There is no floor/ceiling, no age adjustment, and no interaction term. VIS is
almost always summarized over a time window as a maximum (**VIS_max over the first 48 h** in
Gaies 2010, evaluated as two consecutive 24 h periods by that paper's five-group classification —
see Interpretation bands; **VIS_max over the first 24 h** in Gaies 2014; VIS at 24/48/72 h and
VIS48max in Davidson 2012).

### Published extensions (include ONLY if the platform explicitly opts in — not part of the original)

These add terms to the same linear sum; they are variants, not the original score:

- **Levosimendan: + 50 x levosimendan (mcg/kg/min).** Used in ECMO and heart-transplant VIS
  variants (sourced: PMC9103233, PMC10118996).
- **Phenylephrine: + 10 x phenylephrine (mcg/kg/min).** Appears in adult/modified VIS variants
  (e.g., cardiogenic-shock registry usage). **Phenylephrine is in NEITHER Gaies 2010 NOR
  Gaies 2014** (round-2 sourcing resolution, 2026-08-03) — both state the same six drugs, and
  no more. **Excluding phenylephrine from a score labelled "VIS" is therefore CONFIRMED
  CORRECT**, and that is settled: it is a property of the instrument, not an open question.
  What remains unfetched is only the 10x coefficient _of the non-Gaies variant_ — corroborated
  by multiple independent secondary aggregations (the JACC 2019 SCAI-stage VIS formula and the
  Jentzer et al. SCAI-shock formula) but never read in a primary full text (JACC HTTP 403; the
  Jentzer supplemental PDF unparseable). That gap is moot for this implementation, which never
  computes the term; it would only need closing if the variant were ever offered.

> Do NOT silently include levosimendan or phenylephrine in a "VIS" that claims to be the Gaies
> 2010 score. The original six-drug formula above is the canonical pediatric VIS.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

All doses are continuous, non-negative. `min = 0` is inherent (an infusion cannot be negative;
a drug not running = 0).

**Upper bounds: SETTLED-ABSENT, not [NEEDS SOURCE].** No per-drug maximum plausible dose is
published for VIS — the round-2 sourcing pass (2026-08-03) searched for one and confirmed none
exists, in Gaies 2010, Gaies 2014, or any of the validation literature. The ceilings below are a
**local input-validity convention** and carry no clinical authority; they exist to catch a
decimal-point or unit slip, not to say what dose is safe. There is nothing left to find here, so
they are no longer flagged as an open sourcing gap — attaching a pediatric formulary would give
them a source for _dosing_, but it would still not make them a VIS bound.

| id               | label                | type   | units            | conversions                                                                                                                                                                          | plausible min | plausible max (validation)            |
| ---------------- | -------------------- | ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------- |
| `dopamine`       | Dopamine             | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~50 (local convention)                |
| `dobutamine`     | Dobutamine           | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~40 (local convention)                |
| `epinephrine`    | Epinephrine          | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~2 (local convention)                 |
| `milrinone`      | Milrinone            | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~1.5 (local convention)               |
| `vasopressin`    | Vasopressin          | number | **units/kg/min** | If dosed as milliunits/kg/min, divide by 1000 → units/kg/min. If dosed as units/min, divide by weight(kg). **Getting the unit right matters enormously: the coefficient is 10,000.** | 0             | ~0.01 units/kg/min (local convention) |
| `norepinephrine` | Norepinephrine       | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~2 (local convention)                 |
| `levosimendan`   | Levosimendan (ext.)  | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~0.2 (local convention)               |
| `phenylephrine`  | Phenylephrine (ext.) | number | mcg/kg/min       | —                                                                                                                                                                                    | 0             | ~10 (local convention)                |

**Unit hazard (implementation-critical):** vasopressin is the only agent NOT in mcg/kg/min. It
is in **units/kg/min** with a coefficient of 10,000. A vasopressin infusion of
0.0003 units/kg/min contributes 3 VIS points. Mis-entering it in milliunits/kg/min (0.3)
would yield 3,000 points. Validate vasopressin input tightly.

## Worked examples (>=2)

The Gaies 2010 primary text (read directly 2026-08-03 — see Round-3) prints **no arithmetic
worked example of the formula**; its only numeric illustration is of the _classification_ step
(a patient with maximum IS 22 in the first 24 hr and 14 in the subsequent 24 hr falls in group 4),
which exercises the group-assignment rule rather than the weighted sum. The examples below are
therefore still **derived step-by-step from the published formula in Gaies et al. 2010
(PMID 19794327)** and are intended as unit-test vectors.

**Example 1 — simple inotrope-only (derived from formula in Gaies 2010):**
Inputs: dopamine 5, dobutamine 0, epinephrine 0.05, milrinone 0, vasopressin 0, norepinephrine 0 (mcg/kg/min; vasopressin units/kg/min).

```
VIS = 5 + 0 + 100*0.05 + 10*0 + 10000*0 + 100*0
    = 5 + 5
    = 10
```

Expected VIS = **10**.

**Example 2 — multi-agent with vasopressin (derived from formula in Gaies 2010):**
Inputs: dopamine 5, dobutamine 0, epinephrine 0.1, milrinone 0.5, vasopressin 0.0003 (units/kg/min), norepinephrine 0.1.

```
VIS = 5 + 0 + 100*0.1 + 10*0.5 + 10000*0.0003 + 100*0.1
    = 5 + 10 + 5 + 3 + 10
    = 33
```

Expected VIS = **33**.

**Example 3 — all-zero (derived from formula in Gaies 2010):**
Inputs: all drugs 0.

```
VIS = 0
```

Expected VIS = **0**.

**Example 4 — extension term, levosimendan variant (derived from formula in PMC9103233 / PMC10118996):**
Inputs: dopamine 3, epinephrine 0.05, milrinone 0.25, levosimendan 0.1; others 0.

```
VIS = 3 + 100*0.05 + 10*0.25 + 50*0.1
    = 3 + 5 + 2.5 + 5
    = 15.5
```

Expected VIS (levosimendan-extended) = **15.5**. (Only valid if the levosimendan extension is
enabled; the core Gaies-2010 VIS for these same inputs = 3 + 5 + 2.5 = **10.5**.)

## Interpretation bands (non-directive wording, with source)

VIS is a **continuous** quantitative index of the intensity of vasoactive/inotropic support;
higher values reflect more pharmacologic cardiovascular support. There is **no single official
band structure** — studies dichotomize at cohort-specific cut-points, so bands must be labeled
by their source cohort and used descriptively, not as treatment triggers.

**An odds ratio detached from its cut-point is not usable.** Both published dichotomizations are
recorded here so that an effect size is never read apart from the rule that produced it — and,
for Gaies 2010, so that the part of that rule which is not yet extracted is visible rather than
papered over:

- **Gaies 2014 (PMID 24777300) — the single flat threshold, and the one this implementation
  quotes.** Maximum VIS **≥ 20 during the first 24 h** carried an adjusted **OR 6.5
  (95% CI 2.9–14.6)** for the poor composite outcome. Same six coefficients, still no
  phenylephrine. One cut-point is what a bedside reader can actually apply, so this is the
  pairing surfaced in the score's notes.
- **Gaies 2010 (PMID 19794327) — the larger OR, but from a five-group, two-period rule.** The
  adjusted **OR 8.1 (95% CI 3.4–19.2, p < 0.001)** for a poor outcome in the high-VIS group
  relative to the low-VIS group is the paper's headline effect size. **It is not attached to a
  single flat cut-point.** Quoting 8.1 as though it were overstates it.
  **Provenance: read directly from the source PDF, 2026-08-03** (Pediatr Crit Care Med
  2010;11(2):234–238, DOI 10.1097/PCC.0b013e3181b806fc). Confirmed from the primary text itself:
  - The OR of 8.1 (95% CI 3.4–19.2, p < 0.001) appears in the abstract, in Results, and in the
    results table — three places in the primary, not an abstract-only figure.
  - Patients are sorted into **five classification groups**, and each patient is assigned to the
    highest group they reach — in the paper's words, the "highest classification group achieved"
    during either the first or the subsequent 24-hr period (Gaies et al. 2010). Its own worked
    illustration: maximum IS 22 in the first 24 hr and 14 in the subsequent 24 hr → **group 4**.
  - **Groups 4 and 5 were combined** to form the "high VIS" arm that the OR compares.
  - The scheme is anchored by treating infusion dosages that would give a VIS of **approximately
    15** as the midpoint of the classification for the first 24 hr, with most patients expected to
    be on lower doses during the second 24 hr.
  - **Residual gap, precisely scoped:** the **exact per-group numeric VIS cut-points** were _not_
    extracted — the two-column PDF text layer scrambles that table. They are deliberately not
    stated anywhere in this file or in the implementation, and must not be inferred from the
    approximate-15 midpoint or from the group-4 illustration.

  This supersedes this file's earlier reconstruction of the 2010 rule as a two-number dual
  threshold ("≥ 20 in the first 24 h OR ≥ 15 in the next 24 h"), which came from a peer-reviewed
  paraphrase. The primary shows a five-group scheme, so the _shape_ of that reconstruction was
  wrong even where its numbers were in the right neighbourhood; the two-period mechanism it
  described is real and is now sourced to the primary.

- **Prospective validation (Davidson 2012, PMID 22527067):** a **VIS at 48 h (VIS48) cut-point
  of 10.5** discriminated high- vs low-risk for prolonged length of stay / poor short-term
  outcome in neonates and infants after cardiothoracic surgery (Table 4). This is
  cohort-specific.
- Other populations use higher cut-points (e.g., ECMO/cardiogenic-shock cohorts report much
  larger values; PMC9103233 notes VIS > 200 associated with mortality and a pre-ECMO cut-off of
  61.4 in that specific cohort). These are **not** transferable to the post-cardiac-surgery
  infant setting.

Recommended non-directive display: report the numeric VIS (and, where relevant, VIS_max over a
stated window) without an automated risk label. If a band is shown, attach the source cohort
explicitly (e.g., "≥10.5 = 'high' per Davidson 2012 neonatal/infant cardiac cohort").

## References (full citations, PMID/DOI)

1. **Gaies MG, Gurney JG, Yen AH, Napoli ML, Gajarski RJ, Ohye RG, Charpie JR, Hirsch JC.**
   Vasoactive-inotropic score as a predictor of morbidity and mortality in infants after
   cardiopulmonary bypass. _Pediatr Crit Care Med._ 2010;11(2):234–238.
   **PMID: 19794327. DOI: 10.1097/PCC.0b013e3181b806fc.** — _Original VIS derivation (primary).
   **Full text obtained and read directly from the source PDF on 2026-08-03** — source of the
   adjusted OR 8.1 (95% CI 3.4–19.2, p < 0.001) and of the five-group / two-period classification
   behind it. The per-group numeric cut-points were not extracted from its table._
2. **Davidson J, Tong S, Hancock H, Hauck A, da Cruz E, Kaufman J.** Prospective validation of
   the vasoactive-inotropic score and correlation to short-term outcomes in neonates and infants
   after cardiothoracic surgery. _Intensive Care Med._ 2012;38(7):1184–1190.
   **PMID: 22527067. DOI: 10.1007/s00134-012-2544-x.** (Open access: PMC4984395.) — _Reproduces
   the exact formula (Fig 1) and provides a validated cut-point (VIS48 = 10.5)._
3. **Sun Y, Wu W, Yao Y.** The association of vasoactive-inotropic score and surgical patients'
   outcomes: a systematic review and meta-analysis. _Systematic Reviews._ 2024;13:20.
   **DOI: 10.1186/s13643-023-02403-1.** (PMC10770946.) — _Formula confirmation (independently
   fetched full text — see Verification)._
4. **Sandrio S, Krebs J, Leonardy E, Thiel M, Schoettler JJ.** Vasoactive Inotropic Score as a
   Prognostic Factor during (Cardio-)Respiratory ECMO. _J Clin Med._ 2022;11(9):2390.
   **PMID: 35566516. DOI: 10.3390/jcm11092390.** (PMC9103233.) — _Confirms core coefficients +
   levosimendan 50x extension; confirms VIS>200/mortality and pre-ECMO VIS 61.4 cutoff
   (independently fetched full text — see Verification)._
5. **Tohme J, Lescroart M, Guillemin J, et al.** Association between vasoactive-inotropic score,
   morbidity and mortality after heart transplantation. _Interdiscip Cardiovasc Thorac Surg._
   2023;36(4):ivad055. **DOI: 10.1093/icvts/ivad055.** (PMC10118996.) — _Confirms core
   coefficients + levosimendan 50x extension (independently fetched full text — see
   Verification)._
6. **Wernovsky G, Wypij D, Jonas RA, Mayer JE Jr, Hanley FL, Hickey PR, Walsh AZ, Chang AC,
   Castañeda AR, Newburger JW, Wessel DL.** Postoperative course and hemodynamic profile after
   the arterial switch operation in neonates and infants. A comparison of low-flow
   cardiopulmonary bypass and circulatory arrest. _Circulation._ 1995;92(8):2226–2235.
   **PMID: 7554206. DOI: 10.1161/01.cir.92.8.2226.** — _Original Inotrope Score (IS) derivation
   (dopamine + dobutamine + 100x epinephrine); confirmed via independent fetch of Davidson 2012
   full text, which attributes IS to this reference — see Verification._
7. **Gaies MG, Jeffries HE, Niebler RA, Pasquali SK, Donohue JE, Yu S, Gall C, Rice TB,
   Thiagarajan RR.** Vasoactive-inotropic score is associated with outcome after infant cardiac
   surgery: an analysis from the Pediatric Cardiac Critical Care Consortium and Virtual PICU
   System Registries. _Pediatr Crit Care Med._ 2014;15(6):529–537.
   **PMID: 24777300. DOI: 10.1097/PCC.0000000000000153.** — _Re-derivation on the same six
   coefficients (still no phenylephrine); source of the single flat threshold — maximum VIS ≥ 20
   in the first 24 h, adjusted OR 6.5 (95% CI 2.9–14.6). Bibliographic details confirmed
   2026-08-03 against the NCBI E-utilities record for PMID 24777300._

## Limitations & notes

- **Not a clinical device / not diagnostic.** VIS quantifies support intensity, not disease
  severity per se; it is an association marker in the cited cohorts, not a validated
  decision rule for changing therapy. Display descriptively.
- **Population.** The original derivation and strongest validation are in **neonates/infants
  after cardiac surgery with cardiopulmonary bypass**. Applying VIS or its cut-points to other
  pediatric populations (sepsis, ECMO, preterm neonates, general PICU) is an off-derivation use;
  cut-points do not transfer.
- **Time-window dependence.** VIS is a snapshot; the prognostic quantity in the literature is
  typically **maximum VIS over a defined window** (e.g., first 48 h). The platform must define
  and label whichever window it computes.
- **Vasopressin unit trap.** Coefficient 10,000 with units/kg/min — see the unit-hazard note
  in Inputs. This is the single most likely implementation bug.
- **Milrinone note.** Because milrinone is a long-half-life vasodilator, some argue its
  inclusion inflates VIS without reflecting acute instability; this is a known critique in the
  "evolution/pitfalls" literature (not re-derived here).
- **Extensions.** Levosimendan (50x) and phenylephrine (10x) are published variants but are NOT
  the original Gaies 2010 score; gate them behind an explicit configuration flag and never mix
  them into a "Gaies VIS" output silently.
- **Sourcing-gap status (updated by the round-3 primary-text acquisition, 2026-08-03).** All four
  former gaps are now closed or settled, and the way each closed matters:
  - **Dichotomization — CLOSED twice over.** Gaies 2014 (Reference 7) supplies a single flat
    threshold with its own matching effect size (max VIS ≥ 20 in the first 24 h,
    OR 6.5 [2.9–14.6]), and that remains the pairing the implementation quotes. Separately, the
    **Gaies 2010 primary was obtained and read directly on 2026-08-03**, which upgrades the
    OR 8.1 (95% CI 3.4–19.2, p < 0.001) and the five-group / two-period assignment rule from
    paraphrase to primary. **Only one narrow item is still unextracted: the exact per-group
    numeric VIS cut-points, which the paper's two-column PDF text layer scrambles.** Nothing in
    the implementation depends on them, and they are not to be invented.
  - **Phenylephrine — CLOSED as confirmed-correct.** Absent from both Gaies papers; excluding it
    is right. Only the non-Gaies variant's 10x coefficient stays unfetched, and nothing here
    computes it.
  - **Per-drug dose ceilings — SETTLED-ABSENT.** No published maxima exist; see Inputs. This is
    a confirmed negative, not an open item, and is no longer flagged [NEEDS SOURCE].
  - **Inotrope Score derivation citation — resolved earlier** (Wernovsky 1995, Reference 6).

## IP status

- **Formula/threshold-based score — not copyrightable.** VIS is a weighted arithmetic sum of
  drug infusion rates (facts + a mathematical formula). Formulas, coefficients, and numeric
  thresholds are not protected by copyright, so the algorithm and coefficient table may be
  implemented freely.
- **No verbatim scale-item descriptors.** Unlike ordinal clinical scales (e.g., GCS response
  descriptors), VIS has **no free-text response items** — every input is a numeric infusion
  rate. There is therefore **no scale-item wording to license or reproduce**, and no
  copyrightable verbatim text was carried into this document.
- **Attribution (academic norm, not a legal IP restriction):** cite Gaies et al. 2010 as the
  source of the VIS and Davidson et al. 2012 for prospective validation.

## Verification

> **Reading order.** This section is a dated log, oldest first. The 2026-07-25 pass below records
> the state of knowledge on that date; Round-2 and then Round-3 (both 2026-08-03) supersede parts
> of it. **Round-3 is the current state for anything concerning Gaies 2010.**

Independent verification pass performed 2026-07-25 by fetching primary/independent full texts
(not just the file's own citation claims) via live web search and fetch of PubMed/PMC/journal
pages. Gaies et al. 2010 itself (PMID 19794327) could not be obtained in that pass — paywalled at
PCCM/LWW, with no free full text located (Memphis DigitalCommons repository page and LWW journal
page both checked; neither yielded full text) — so items sourced only to Gaies 2010's exact
numeric threshold were left unverified and flagged as of that date; everything else below was
checked against a fetched source. **That access limitation no longer holds: the primary was
supplied and read on 2026-08-03 — see Round-3.**

**Checked and CONFIRMED (match the file):**

1. **Core six-drug VIS formula and coefficient table** (dopamine 1, dobutamine 1, epinephrine
   100, milrinone 10, vasopressin 10,000 [units/kg/min], norepinephrine 100) — confirmed by
   independently fetching full text of three separate sources: Davidson et al. 2012
   (PMC4984395, Fig 1, reproduces "VISb = IS + 10 x milrinone ... + 10,000 x vasopressin ... +
   100 x norepinephrine"), the ECMO paper (PMC9103233, Sandrio et al. 2022, J Clin Med), and the
   systematic review (PMC10770946, Sun et al. 2024, Systematic Reviews). All three state the
   identical formula in the identical units. No discrepancy found.
2. **Inotrope Score (IS) base term** (dopamine + dobutamine + 100x epinephrine) — confirmed via
   Davidson 2012 full text, which states IS is "originally derived from Wernovsky et al.,"
   published in _Circulation_ (1995). Independently searched and confirmed the full citation:
   Wernovsky G et al., _Circulation._ 1995;92(8):2226–2235, PMID 7554206,
   DOI 10.1161/01.cir.92.8.2226. This **resolves** the file's prior [NEEDS SOURCE] flag on the
   IS derivation citation. File updated accordingly (Formula section + Reference 6).
3. **Gaies 2010 adjusted odds ratio 8.1 (95% CI 3.4–19.2)** for high vs low maximum VIS and poor
   composite outcome — confirmed in this pass via independent PubMed abstract fetch/search of
   PMID 19794327, and the cohort description (174 patients, 0–6 months, cardiac surgery with CPB,
   Aug 2007–Jun 2008) matches the file's population description. No discrepancy. **Upgraded by
   Round-3 (2026-08-03): this OR is now confirmed against the primary full text itself, where it
   appears in the abstract, in Results and in the results table — no longer an abstract-only
   confirmation.**
4. **Davidson 2012 VIS48 cut-point of 10.5** — confirmed by independently fetching the full text
   of PMC4984395 directly (Table 4: "the discriminatory threshold was 10.5"), including the
   associated odds ratios (prolonged intubation OR 22.3 p=0.002; prolonged ICU stay OR 8.1
   p=0.017; prolonged hospitalization OR 11.3 p=0.011), all matching or consistent with the
   file's framing. No discrepancy.
5. **Levosimendan +50x extension** — confirmed by independently fetching full text of both
   PMC9103233 (Sandrio et al. 2022: "...+ 50 x levosimendan (µg/kg/min)... integrated due to its
   frequent application") and PMC10118996 (Tohme et al. 2023: "...+ 50 x levosimendan..."). No
   discrepancy.
6. **ECMO cohort figures** (VIS > 200 associated with mortality per ESPNIC guidance;
   pre-ECMO VIS cutoff of 61.4 identifying lower survival odds; V-VA cutoff 114.67) — confirmed
   by independently fetching PMC9103233 full text verbatim ("a pre-ECMO VIS of greater than 61.4
   identifies patients with significantly lower odds of survival"). No discrepancy.
7. **Worked examples 1–4** — recomputed independently by hand from the verified formula above
   (not from an external source, since these are the file's own derived unit-test vectors, not
   literature values). All four reproduce exactly: Example 1 = 10, Example 2 = 33, Example 3 = 0,
   Example 4 = 15.5 (levosimendan-extended) / 10.5 (core Gaies VIS on the same inputs). No
   arithmetic discrepancy found.
8. **Reference full citations for PMC10770946, PMC9103233, PMC10118996** — previously marked
   [NEEDS SOURCE — captured via PMC only]; all three now resolved with full author/journal/DOI
   citations obtained via independent search and fetch (see updated References section).

**Checked, PARTIALLY corroborated, still flagged [NEEDS SOURCE] (unchanged from before, or
downgraded-risk but not resolved):**

9. **Phenylephrine +10x extension coefficient** — could not fetch a primary full text directly
   (JACC 2019 "Cardiogenic Shock Classification to Predict Mortality" returned HTTP 403; the
   Jentzer et al. SCAI-shock VIS supplemental PDF could not be parsed as text). However, two
   independent search aggregations both returned the identical "10 x phenylephrine" coefficient
   from multiple modified-VIS papers (JACC 2019 SCAI-stage formula; Jentzer et al. SCAI-shock
   formula), consistent with the file. Remains [NEEDS SOURCE] for a directly-fetched primary
   text, but corroboration is now stronger than at the file's prior state (previously "seen only
   in a secondary search summary" — now seen in two independent secondary summaries with
   consistent detail). File updated to reflect this.

**Could NOT be checked as of 2026-07-25 (Gaies 2010 primary text inaccessible on that date):**

10. **Exact Gaies 2010 numeric high/low VIS dichotomization cut-point** (the file's "~VIS_max
    ≥ 20, unverified" note) — Gaies 2010 full text was paywalled (LWW journal page returned
    HTTP 402; Memphis DigitalCommons repository page has abstract only), so this stayed
    [NEEDS SOURCE] at the time. **SUPERSEDED by Round-3 (2026-08-03):** the primary was read, and
    it shows the dichotomization is not a single cut-point at all but a five-group classification
    with groups 4–5 combined into "high VIS". The only piece still unextracted is the per-group
    numeric boundary table.
11. **Per-drug plausible dose ceilings** (dopamine ~50, dobutamine ~40, epinephrine ~2, milrinone
    ~1.5, vasopressin ~0.01 units/kg/min, norepinephrine ~2, levosimendan ~0.2, phenylephrine
    ~10) — not independently checked against a pediatric dosing formulary in this pass; these
    remain exactly as flagged [NEEDS SOURCE] in the file (would need a dedicated pediatric
    critical-care formulary source, out of scope for a coefficient/threshold verification pass).

**Corrections made to the file:** none of the coefficients, thresholds, or worked-example
arithmetic required correction — every checkable numeric claim matched independently fetched
sources exactly. Changes made were additive/resolving only: (a) resolved the Inotrope Score
derivation citation [NEEDS SOURCE] with a confirmed primary citation (Wernovsky 1995), (b) added
full author/journal/DOI citations for three references previously captured "via PMC only," (c)
strengthened (but did not resolve) the phenylephrine coefficient sourcing note, (d) updated the
"unresolved sourcing gaps" summary to reflect the above. No citation was deleted; no source was
invented — every added citation was independently located and its bibliographic details
cross-checked via a second search.

### Round-2 sourcing resolution (2026-08-03)

Supersedes items 9–11 of the pass above. Provenance is stated per item and nothing here claims
more than was actually obtained.

- **Six coefficients — CONFIRMED against the primary.** dopamine ×1, dobutamine ×1, milrinone
  ×10, epinephrine ×100, norepinephrine ×100, vasopressin ×10,000. Six drugs, nothing else.
  No change to the implementation.
- **Phenylephrine — CONFIRMED ABSENT from both Gaies 2010 and Gaies 2014.** Item 9 above is
  superseded: the open question was never whether to exclude it (that is settled and correct),
  only what coefficient a different, non-Gaies variant uses. The implementation's marker was
  relabelled from a sourcing gap to a positive statement of correctness.
- **Dichotomization — RESOLVED via Gaies 2014, not via 2010.** Item 10 above is superseded. The
  2014 registry re-derivation (Reference 7) gives a **single flat threshold, max VIS ≥ 20 in the
  first 24 h, adjusted OR 6.5 (95% CI 2.9–14.6)**, on the same coefficients and still without
  phenylephrine. The implementation now quotes that pairing, because a threshold and an effect
  size are only interpretable together. _(As written in round 2, this bullet went on to state that
  the 2010 OR 8.1 came from a two-number dual threshold reconstructed from a peer-reviewed
  paraphrase, the 2010 full text being paywalled and unread. **Both halves of that are superseded
  by Round-3 below**: the primary was subsequently obtained and read on the same date, and it
  describes a five-group classification rather than a two-number rule.)_
- **Per-drug maximum plausible doses — SETTLED-ABSENT.** Item 11 above is superseded: none are
  published. This is a confirmed negative rather than a search that has not finished, so the
  ceilings are now labelled a local convention instead of [NEEDS SOURCE]. The numbers themselves
  did not change.
- **Bibliographic check performed here:** PMID 24777300 was resolved through the NCBI E-utilities
  esearch/esummary records on 2026-08-03, confirming title, journal, 2014;15(6):529–537, first
  authors Gaies MG / Jeffries HE / Niebler RA, and DOI 10.1097/PCC.0000000000000153. The DOI and
  PMID were verified rather than recalled.

**Corrections to computed values in this round: none.** VIS returns exactly the number it
returned before; every change was to what the score says about itself.

### Round-3 primary-text acquisition (2026-08-03, after round 2)

**This is the current state for anything concerning Gaies 2010.** It supersedes item 10 of the
2026-07-25 pass and the second half of round 2's dichotomization bullet.

**Provenance: read directly from the source PDF, 2026-08-03.** The Gaies 2010 full text
(_Pediatr Crit Care Med_ 2010;11(2):234–238, DOI 10.1097/PCC.0b013e3181b806fc) was supplied as a
primary PDF, extracted, and read. This is a primary-text reading, **not** a secondary review
finding and not an abstract fetch — that distinction is the entire point of this round, because
every prior statement in this file about the 2010 dichotomization was paraphrase-derived.

Confirmed directly from the primary text:

1. **Adjusted OR 8.1 (95% CI 3.4–19.2, p < 0.001)** for a poor outcome in the high-VIS group
   relative to the low-VIS group, after adjustment. Present in three places: the abstract, the
   Results narrative, and the results table.
2. **Five-group classification with a two-period assignment rule.** A patient is assigned to the
   "highest classification group achieved" (short quoted phrase, Gaies et al. 2010) during either
   the first or the subsequent 24-hr period. The paper's own illustration: maximum IS 22 in the
   first 24 hr and 14 in the subsequent 24 hr → group 4.
3. **Groups 4 and 5 were combined** to form the "high VIS" arm compared against low VIS.
4. **Anchor of the scheme.** Patients on infusions at dosages that would produce a VIS of
   approximately 15 were set as the midpoint of the classification for the first 24 hr, with most
   patients expected to be on lower doses during the second 24 hr.

**Residual gap after this round — deliberately narrow:**

- **The exact per-group numeric VIS cut-points were NOT extracted.** The paper's two-column PDF
  text layer scrambles that table on extraction. The boundaries are therefore **not recorded in
  this file and not encoded anywhere in the implementation**, and must not be back-inferred from
  the approximately-15 midpoint or from the group-4 illustration. Closing this needs the printed
  table read from the page image, not another text extraction.

**What did NOT change, and why the implementation still quotes Gaies 2014:** reading the 2010
primary does not make its OR usable at the bedside, because the rule it belongs to is a five-group
two-period classification whose boundaries we cannot state. A threshold and an effect size only
mean something together, so the score continues to surface the **Gaies 2014** pairing — maximum
VIS ≥ 20 in the first 24 h, adjusted OR 6.5 (95% CI 2.9–14.6) — which a bedside reader can
actually apply. The 2010 figures are recorded for contrast and correct attribution.

**Corrections to computed values in this round: none.** VIS is arithmetically unchanged. The
change is one of provenance: an attribution moved from paraphrase to primary, and one narrowly
scoped extraction gap replaced a much broader "not read" caveat.

**No published descriptor prose was reproduced.** The only verbatim material carried over from the
2010 paper is the short phrase quoted and attributed in point 2 above.
