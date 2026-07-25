# Corrected QT interval — QTc (Bazett 1920 & Fridericia 1920)

> Scope: This file documents the two classic heart-rate corrections of the QT
> interval — **Bazett (1920)**, `QTc = QT / √RR`, and **Fridericia (1920)**,
> `QTc = QT / RR^(1/3)`, with **RR in seconds** (`RR = 60 / HR`). Both are simple
> rate-normalization formulas, not diagnostic scores: they estimate the QT
> interval the patient would have at a heart rate of 60 bpm (RR = 1 s), so QTc
> values across different heart rates can be compared. The document gives both
> formulas, the standard prolonged-QTc thresholds used in children, and the
> well-established caveat that **Bazett over-corrects at fast rates and
> under-corrects at slow rates** — clinically important in pediatrics because
> children run high heart rates.
>
> **Not a clinical device.** QTc is one input to a clinical judgment about
> repolarization; a prolonged QTc is not by itself a diagnosis, and the
> thresholds below are screening reference points, not treatment triggers.

## Formula / algorithm (exact — every coefficient and branch)

Let **QT** be the measured QT interval and **RR** the R–R interval **in seconds**
(`RR = 60 / HR`, HR in beats/min). By convention QTc carries the same units as
the QT you put in (measure QT in ms → QTc in ms), because at RR = 1 s (HR = 60)
the correction factor is exactly 1 and QTc = QT.

**Bazett (1920):**

```
QTc_Bazett = QT / sqrt(RR)          (RR in seconds)
           = QT / sqrt(60 / HR)
```

**Fridericia (1920):**

```
QTc_Fridericia = QT / RR^(1/3)      (RR in seconds; cube root of RR)
               = QT / (60 / HR)^(1/3)
```

**Key structural facts (not free parameters — they follow from the equations):**

- **No tunable coefficients.** Unlike Bazett's _original_ systole-prediction
  relation `systole = k·√cycle` (with k ≈ 0.37 s for men, 0.40 s for women,
  Bazett 1920), the modern _correction_ form has **no k**: dividing QT by √RR
  cancels k. Fridericia likewise reduced his fitted relation
  `s = K·(p^0.3558)` to the cube-root form; the modern QTc uses only the cube
  root, no K. So the implementable formulas contain **only** the QT value and RR.
- **Both agree at RR = 1 s (HR = 60):** √1 = 1 and 1^(1/3) = 1, so
  QTc_Bazett = QTc_Fridericia = QT there.
- **Divergence by rate (the central clinical point):** because √RR falls faster
  than RR^(1/3) as RR shrinks, **at HR > 60 (RR < 1 s) Bazett returns a _larger_
  QTc than Fridericia (over-correction), and at HR < 60 (RR > 1 s) Bazett returns
  a _smaller_ QTc (under-correction).** Bazett is regarded as adequate only for
  roughly 60–100 bpm; outside that range Fridericia (or Framingham) is preferred
  (LITFL QT-interval review). This is why pediatric screening with Bazett
  over-calls prolongation (see Interpretation bands and Limitations).
- **Unit discipline is the whole ballgame.** RR **must** be in seconds for the
  formulas as written. If RR is measured in ms, use `RR_s = RR_ms / 1000` (or
  equivalently `RR_s = 60000/HR ÷ 1000`). Feeding RR in ms into `√RR` or
  `RR^(1/3)` gives nonsense (off by √1000 ≈ 31.6× for Bazett).

**No branches.** There are no age terms, sex terms, floors, or ceilings inside
either correction — they are single continuous functions of QT and RR. (Sex- and
age-specific numbers appear only later, in the _interpretation_ thresholds, not
in the correction itself.)

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id   | label                | type   | units       | conversions                                                                   | plausible min | plausible max |
| ---- | -------------------- | ------ | ----------- | ----------------------------------------------------------------------------- | ------------- | ------------- |
| `qt` | Measured QT interval | number | ms          | 1 s = 1000 ms. QTc output inherits QT's unit.                                 | ~200 [sanity] | ~700 [sanity] |
| `hr` | Heart rate           | number | beats/min   | `RR_s = 60 / HR`; `RR_ms = 60000 / HR`                                        | ~30 [sanity]  | ~250 [sanity] |
| `rr` | R–R interval (alt.)  | number | ms **or** s | `RR_s = RR_ms / 1000`; if given, `HR = 60 / RR_s`. Supply **either** HR or RR | ~0.24 s       | ~2.0 s        |

- **QT / RR are entered as a pair; HR and RR are interchangeable** (`RR = 60/HR`).
  A UI may accept HR (most common on a monitor) or RR (measured on the ECG grid);
  internally convert to **RR in seconds** before applying either formula.
- **QT is normally measured in lead II or V5**, using the longest clearly
  definable QT, from QRS onset to the end of the T wave (tangent method), with
  the U wave excluded — a _measurement_ convention, not part of the arithmetic
  (LITFL QT-interval review). Documented here so implementers don't silently
  assume a machine QT is method-matched to the thresholds.
- **Plausible bounds above are input-validation sanity guards, not values from a
  fetched normative table.** A QT of ~200–700 ms and HR ~30–250 bpm span
  essentially all real pediatric ECGs; values outside are almost certainly
  mis-entries. **[NEEDS SOURCE]** for an authoritative pediatric QT/HR
  reference-interval table if the platform wants citable, age-binned limits
  rather than guards. (Children's resting HR is age-dependent and higher than
  adults'; a neonate at 140 bpm is normal, which is exactly why the correction
  choice matters.)

## Worked examples (>=2)

Neither Bazett 1920 nor Fridericia 1920 prints a modern QTc arithmetic worked
example with a specific QT/HR pair. The examples below are **derived directly
from the formulas in Bazett 1920 (Heart 1920;7:353–370) and Fridericia 1920
(Acta Med Scand 1920;53:469–486)** and are intended as unit-test vectors. They
are chosen to exercise the HR regimes where the two corrections agree and where
they diverge.

**Example 1 — HR 60, the fixed point (derived from formulas in Bazett 1920 & Fridericia 1920):**
QT = 400 ms, HR = 60 → RR = 60/60 = 1.000 s.

```
Bazett     = 400 / sqrt(1.000)   = 400 / 1.000   = 400.0 ms
Fridericia = 400 / 1.000^(1/3)   = 400 / 1.000   = 400.0 ms
```

At RR = 1 s the correction factor is 1, so both formulas equal the raw QT and
each other. Good sanity/regression anchor.

**Example 2 — tachycardia, Bazett over-corrects (derived from formulas in Bazett 1920 & Fridericia 1920):**
QT = 360 ms, HR = 120 → RR = 60/120 = 0.500 s.

```
Bazett     = 360 / sqrt(0.500)   = 360 / 0.70711 = 509.1 ms
Fridericia = 360 / 0.500^(1/3)   = 360 / 0.79370 = 453.6 ms
```

Same beat, ~55 ms apart. Bazett (509) crosses the pediatric "prolonged" line
(>460 ms) while Fridericia (454) sits below it — the textbook Bazett
over-correction at fast rates.

**Example 3 — bradycardia, Bazett under-corrects (derived from formulas in Bazett 1920 & Fridericia 1920):**
QT = 460 ms, HR = 50 → RR = 60/50 = 1.200 s.

```
Bazett     = 460 / sqrt(1.200)   = 460 / 1.09545 = 419.9 ms
Fridericia = 460 / 1.200^(1/3)   = 460 / 1.06266 = 432.9 ms
```

Here Bazett returns the _lower_ value — it under-corrects when RR > 1 s, so it
can under-call a genuinely long QT at slow rates.

**Example 4 — pediatric screening trap (derived from formulas in Bazett 1920 & Fridericia 1920):**
A 2-year-old at a normal toddler rate: QT = 340 ms, HR = 130 → RR = 60/130 = 0.4615 s.

```
Bazett     = 340 / sqrt(0.4615)  = 340 / 0.67934 = 500.5 ms
Fridericia = 340 / 0.4615^(1/3)  = 340 / 0.77277 = 440.0 ms
```

Identical raw QT, but Bazett (500) would flag this healthy child as markedly
prolonged while Fridericia (440) reads at the upper limit of normal. This is
exactly the failure mode Andršová et al. 2020 quantified (Bazett flagged 61.7%
of healthy standing children as QTc > 440 ms vs 1.81% with Fridericia).

## Interpretation bands (non-directive, with source)

QTc has **no ordinal risk score** — it is a corrected time in ms read against
reference cutoffs. The cutoffs are population reference points for _screening_,
not diagnoses; long QT syndrome is diagnosed with the full Schwartz/consensus
criteria (symptoms, family history, genetics), not a single QTc number.
**Reported thresholds are formula-dependent, and most published pediatric cutoffs
were derived with Bazett.**

**Pediatric QTc thresholds (Bazett-based unless noted):**

| Band                               | QTc (ms) | Source                                                                                                |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Upper limit / borderline of normal | ~440     | Andršová 2020 ("borderline upper limit of normality")                                                 |
| Prolonged / clear abnormality      | >460     | Andršová 2020; Phan 2015 ("460 ms is the best threshold for prolonged QTc" in infants/young children) |
| Diagnostic-level for LQTS          | ≥480     | Andršová 2020 ("definite … long QT syndrome")                                                         |

- The commonly quoted rule of thumb — **QTc ≤440 ms normal, 440–460 ms
  borderline, >460 ms prolonged in children** — is consistent with the above
  (Andršová 2020; Phan 2015). Phan et al. 2015 specifically found **Bazett gave
  the most consistent QTc across heart rates in infants and young children and
  endorsed 460 ms as the prolonged-QTc threshold** — notable because drug trials
  typically prefer Fridericia.
- **Adult reference points (for contrast, not for children):** normal QTc
  roughly **<450 ms (men)** and **<460 ms (women)**; Goldenberg/Moss/Zareba 2006
  report QTc is stable and sex-independent in children (ages 1–5 studied) but
  diverges by sex in adults. Common adult "prolonged" lines are ~450 ms (men) /
  ~470 ms (women), with **QTc > 500 ms** widely cited as high torsades-de-pointes
  risk (LITFL; Goldenberg 2006).
- **These bands are non-directive.** They indicate where a value falls relative
  to a reference population; they do not prescribe action. Display the QTc,
  the formula used, the heart rate, and a neutral band label — and, given the
  rate dependence, showing **both Bazett and Fridericia** (or Fridericia
  preferentially when HR is outside 60–100 bpm) is defensible.

## References (full, PMID/DOI/URL)

1. **Bazett HC.** An analysis of the time-relations of electrocardiograms.
   _Heart._ 1920;7:353–370. — _Original derivation of the √RR correction
   (`systole = k·√cycle`, k ≈ 0.37 s men / 0.40 s women; the modern
   `QTc = QT/√RR` cancels k). Derived from a small cohort (~39 young subjects,
   widely reported)._ Reprinted: **Ann Noninvasive Electrocardiol.**
   1997;2(2):177–194. **DOI: 10.1111/j.1542-474X.1997.tb00325.x.**
   URL: https://onlinelibrary.wiley.com/doi/epdf/10.1111/j.1542-474X.1997.tb00325.x
   (Original citation confirmed via multiple bibliographic records and LITFL
   Bazett-formula page.)

2. **Fridericia LS.** Die Systolendauer im Elektrokardiogramm bei normalen
   Menschen und bei Herzkranken (The duration of systole in the electrocardiogram
   of normal subjects and of patients with heart disease).
   _Acta Med Scand._ 1920;53:469–486. **DOI: 10.1111/j.0954-6820.1920.tb18266.x.**
   — _Original derivation of the cube-root correction `QTc = QT/RR^(1/3)`
   (reduced from `s = K·p^0.3558`)._ English translation:
   **Ann Noninvasive Electrocardiol.** 2003;8(4):343–351 (with introductory note
   by Moss AJ, pp. 341–342).
   URL: https://litfl.com/fridericia-formula/ (formula and citations confirmed).

3. **Phan DQ, Silka MJ, Lan Y-T, Chang R-KR.** Comparison of formulas for
   calculation of the corrected QT interval in infants and young children.
   _J Pediatr._ 2015 Apr;166(4):960–964.e1–2.
   **PMID: 25648293. DOI: 10.1016/j.jpeds.2014.12.037.**
   URL: https://pubmed.ncbi.nlm.nih.gov/25648293/ — _702 children (33% <1 y,
   81% <2 y; mean HR 122±20 bpm). Bazett gave the most consistent QTc; 460 ms is
   the best threshold for prolonged QTc; supports Bazett in infants/children._
   (Confirmed by independent PubMed fetch.)

4. **Andršová I, Hnatkova K, Helánová K, et al.** Problems with Bazett QTc
   correction in paediatric screening of prolonged QTc interval.
   _BMC Pediatr._ 2020;20:558. **PMID: 33317470.
   DOI: 10.1186/s12887-020-02460-8.**
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC7734859/ — _Thresholds cited:
   ~440 ms borderline upper limit of normal, 460 ms clear abnormality, 480 ms
   diagnostic of LQTS. Bazett over-corrects with the rate rise on standing
   (QTc +19.6±11.4 ms supine→standing) and falsely flagged 61.7% of healthy
   standing children as >440 ms vs 1.81% with Fridericia._ (Confirmed by
   independent PMC fetch.)

5. **Goldenberg I, Moss AJ, Zareba W.** QT interval: how to measure it and what
   is "normal." _J Cardiovasc Electrophysiol._ 2006 Mar;17(3):333–336.
   **PMID: 16643414. DOI: 10.1111/j.1540-8167.2006.00408.x.**
   URL: https://pubmed.ncbi.nlm.nih.gov/16643414/ — _581 healthy subjects
   (158 children 1–5 y, 423 adults). QTc stable and sex-independent in children,
   sex-divergent in adults; adult normal ≈ <450 ms (men) / <460 ms (women)._
   (Citation confirmed by independent PubMed fetch; exact age-binned rating table
   not retrievable from open sources — see Limitations.)

6. **LITFL ECG Library — QT interval / Bazett formula / Fridericia formula.**
   URLs: https://litfl.com/qt-interval-ecg-library/ ,
   https://litfl.com/bazett-formula/ , https://litfl.com/fridericia-formula/
   — *Secondary reference used to corroborate the exact modern formulas
   (`QTc = QT/√RR`, `QTc = QT/RR^(1/3)`, RR in seconds), the original Bazett/
   Fridericia citations, and the rate-range caveat (Bazett over-corrects
   > 100 bpm, under-corrects <60 bpm; use Fridericia/Framingham outside
   > 60–100 bpm).*

## Limitations & notes

- **Not a clinical device / not diagnostic.** QTc is a rate-normalized
  measurement, not a validated decision rule. A prolonged QTc is a screening
  flag; LQTS is diagnosed with full criteria (Schwartz score, symptoms, family
  history, genetics).
- **Formula choice changes the answer — and the pediatric literature disagrees.**
  Bazett over-corrects at fast rates and under-corrects at slow rates; because
  children run high heart rates, Bazett systematically over-calls prolongation
  (Andršová 2020). Yet Phan 2015 found Bazett the _most consistent_ in infants
  and young children and endorsed the 460 ms threshold, whereas drug-safety
  trials standardly prefer Fridericia. There is no single "correct" correction;
  the platform should report **which formula was used**, and ideally show both.
  When HR is outside ~60–100 bpm, Fridericia (or Framingham) is the more
  defensible default (LITFL).
- **Thresholds are formula- and population-specific.** The 440/460/480 ms
  pediatric cutoffs (Andršová 2020; Phan 2015) were derived with Bazett; applying
  them to a Fridericia QTc is not equivalent. Adult sex-specific cutoffs
  (Goldenberg 2006) must **not** be applied to children.
- **Exact Goldenberg 2006 age/sex rating table not verified.** The frequently
  reproduced "1–15 y / adult male / adult female" normal-borderline-prolonged
  grid attributed to Goldenberg 2006 could not be retrieved from an open
  full-text source in this pass; only the summary values (children stable/
  sex-independent; adult ≈ <450 men, <460 women) are sourced. **[NEEDS SOURCE]**
  for the exact age-binned millisecond boundaries if the platform displays that
  specific table.
- **Measurement dependence.** QTc is only as good as the QT measurement: lead
  choice (II or V5), tangent vs threshold end-of-T, U-wave inclusion, and
  automated-vs-manual reads all shift the value. Machine QTc and hand-measured
  QTc are not interchangeable.
- **Unit hazard.** RR must be in **seconds**. Passing RR in ms, or QT in s while
  expecting ms output, produces gross errors. Convert to RR-seconds first;
  QTc inherits QT's unit.
- **Fridericia at extremes still imperfect.** Fridericia is better than Bazett
  across a wider range but is not a universal rate corrector; individual-specific
  and other formulas (Framingham, Hodges, Rautaharju) exist. This file documents
  only Bazett and Fridericia as requested.

## IP status

- **Formula/threshold-based — not copyrightable.** Both corrections are
  mathematical formulas (√RR and RR^(1/3) normalizations); the pediatric
  thresholds (440/460/480 ms) are numeric facts from the literature. Neither
  formulas nor numeric thresholds are protected by copyright, so they may be
  implemented freely.
- **No verbatim scale wording.** There are no ordinal free-text descriptors here
  — inputs are numbers (QT, HR/RR) and the outputs are numbers (QTc). No
  copyrightable scale text was carried into this document.
- **Attribution (academic norm, not a legal restriction):** cite Bazett 1920 for
  the √RR correction and Fridericia 1920 for the RR^(1/3) correction; cite
  Phan 2015 / Andršová 2020 for the pediatric prolonged-QTc thresholds.
