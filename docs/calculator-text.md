# Calculator text, in full

Every word the calculators put in front of a clinician, pulled straight from the score definitions so it cannot drift from what the site renders. Generated, not written: regenerate rather than edit.

25 calculators. Generated from the registry at HEAD.

## How to read the two counts

`—` counts em dashes and `CAPS` counts runs of shouted words, in user-visible text only. They are the two mechanically countable tells from the 10 August review, and they are here so the editorial pass has a target rather than an impression. Neither is a defect on its own.

## Conditional notices

Shown only when the entered values make them true, beside the number they explain and beside the field they name. Not in the counts below, because they are emitted rather than declared.

**Phoenix Sepsis Score**

- Respiratory component — The SpO₂ entered is above 97%, where the SpO₂:FiO₂ ratio saturates, so it was not used. The PaO₂ still counts, but this subscore carries no contribution from the saturation and may read lower than the child is.
- Respiratory component — The SpO₂ entered is above 97%, where the SpO₂:FiO₂ ratio saturates, so it was not used and this subscore is 0. Enter a PaO₂ if one is available; otherwise read the total as a lower bound.

**pSOFA (Pediatric SOFA)**

- Respiratory subscore — The SpO₂ entered is above 97%, where the SpO₂:FiO₂ ratio saturates, so it was not used and this subscore is 0. Enter a PaO₂ if one is available; otherwise read the total as a lower bound.

## Where the work is

| Calculator | Version | Inputs | Strings | Em dashes | Caps runs |
| --- | --- | ---: | ---: | ---: | ---: |
| [Pediatric Risk of Mortality (PRISM III and PRISM IV)](#prism) | 1.0.0 | 26 | 94 | 18 | 45 |
| [Paediatric Index of Mortality 3 (PIM3)](#pim3) | 1.0.0 | 11 | 60 | 16 | 10 |
| [KDIGO AKI staging (pediatric)](#kdigo-aki) | 1.1.0 | 8 | 31 | 16 | 8 |
| [Serum osmolality (calculated) and osmolar gap](#serum-osmolality) | 1.0.0 | 5 | 22 | 12 | 5 |
| [Pediatric burn fluid resuscitation (Parkland / modified Brooke)](#burn-resuscitation) | 1.0.0 | 4 | 12 | 3 | 12 |
| [FOUR score (Full Outline of UnResponsiveness)](#four-score) | 1.1.0 | 4 | 33 | 8 | 6 |
| [Phoenix Sepsis Score](#phoenix) | 1.1.0 | 15 | 56 | 7 | 4 |
| [Percent cumulative fluid balance (fluid overload %)](#fluid-balance) | 1.0.0 | 4 | 13 | 2 | 2 |
| [Corrected QT interval (QTc — Bazett & Fridericia)](#qtc) | 1.0.0 | 2 | 15 | 2 | 0 |
| [Oxygen Saturation Index (OSI)](#oxygen-saturation-index) | 1.1.0 | 3 | 15 | 2 | 0 |
| [Pediatric Glasgow Coma Scale (pGCS)](#pediatric-gcs) | 1.0.0 | 3 | 30 | 1 | 1 |
| [pSOFA (Pediatric SOFA)](#psofa) | 1.1.0 | 14 | 49 | 2 | 0 |
| [Corrected sodium for hyperglycemia](#corrected-sodium) | 1.0.0 | 2 | 7 | 0 | 1 |
| [ETT size and depth (pediatric)](#ett-size) | 1.1.0 | 1 | 5 | 0 | 1 |
| [PELOD-2 (Pediatric Logistic Organ Dysfunction-2)](#pelod2) | 1.0.0 | 11 | 39 | 0 | 1 |
| [SpO₂/FiO₂ ratio (S/F)](#sf-ratio) | 1.0.0 | 2 | 13 | 0 | 1 |
| [Anion gap (with albumin correction)](#anion-gap) | 1.0.0 | 5 | 13 | 0 | 0 |
| [APLS age-based weight estimate (pediatric)](#apls-weight) | 1.1.0 | 1 | 5 | 0 | 0 |
| [Body surface area (Mosteller)](#bsa-mosteller) | 1.0.0 | 2 | 7 | 0 | 0 |
| [Corrected calcium for albumin](#corrected-calcium) | 1.0.0 | 2 | 7 | 0 | 0 |
| [Holliday-Segar maintenance fluids](#holliday-segar) | 1.0.0 | 1 | 6 | 0 | 0 |
| [Ideal body weight (pediatric)](#ideal-body-weight) | 1.0.0 | 2 | 9 | 0 | 0 |
| [Oxygenation Index (OI)](#oxygenation-index) | 1.1.0 | 3 | 15 | 0 | 0 |
| [PaO₂/FiO₂ ratio (P/F)](#pf-ratio) | 1.1.0 | 2 | 15 | 0 | 0 |
| [Vasoactive-Inotropic Score (VIS)](#vis) | 1.0.0 | 6 | 15 | 0 | 0 |
| **Total** | | | **586** | **89** | **97** |

---

## Anion gap (with albumin correction)

<a id="anion-gap"></a>

`anion-gap` · v1.0.0 · published · renal-metabolic

### Inputs

- **Serum sodium (Na⁺)** — numeric, mEq/L / mmol/L, accepts 100 to 180, required
  - Help: From the electrolyte panel. Accepts mEq/L or mmol/L (identical).
- **Serum chloride (Cl⁻)** — numeric, mEq/L / mmol/L, accepts 70 to 130, required
  - Help: From the electrolyte panel. Accepts mEq/L or mmol/L (identical).
- **Serum bicarbonate (HCO₃⁻ or total CO₂)** — numeric, mEq/L / mmol/L, accepts 3 to 45, required
  - Help: Bicarbonate or the total CO₂ reported on a basic metabolic panel (used interchangeably here). Accepts mEq/L or mmol/L (identical).
- **Serum potassium (K⁺, optional)** — numeric, mEq/L / mmol/L, accepts 1.5 to 9, optional
  - Help: Optional. Supply only to also compute the potassium-inclusive AG, which uses a higher reference interval.
- **Serum albumin (optional)** — numeric, g/dL / g/L, accepts 1 to 6, optional
  - Help: Optional. Supply to also compute the albumin-corrected AG (baseline 4.0 g/dL). Accepts g/dL or g/L.

### Interpretation bands

_None declared._

### How it is calculated

Base anion gap = sodium − (chloride + bicarbonate). The potassium-inclusive anion gap = (sodium + potassium) − (chloride + bicarbonate), which runs about 3.5 to 5 units higher and uses a higher reference interval, so the two forms are shown separately. The albumin-corrected anion gap = anion gap + 2.5 × (4.0 − albumin in g/dL) (Figge 1998), so each 1 g/dL below 4.0 adds 2.5 mEq/L, unmasking a high-anion-gap acidosis that hypoalbuminemia would hide. mEq/L and mmol/L are numerically equal for these ions, and total CO₂ is used interchangeably with HCO₃.

### Limitations and notes

No interpretation bands are emitted. Reference intervals are strongly method-dependent: flame photometry gave about 12 ± 4 mEq/L, ion-selective electrodes shifted it to about 6 ± 3, and verified intervals span, for example, 10 to 18. Classify against the reporting lab’s own interval, never a fixed cutoff, and never compare a potassium-inclusive value with a potassium-exclusive range. The anion gap is a diagnostic index, not a severity score. The albumin correction increases sensitivity, not specificity, and is an adjunct to direct measurement of lactate and ketones. The 2.5 coefficient and the reference intervals are adult-derived, applied to children by convention. Spurious electrolytes (pseudohyponatremia, bromide interference) distort the gap directly.

### References

- Figge J, Jabor A, Kazda A, Fencl V. Anion gap and hypoalbuminemia. Crit Care Med. 1998;26(11):1807–1810. (PMID 9824071)
- Kraut JA, Madias NE. Serum anion gap: its uses and limitations in clinical medicine. Clin J Am Soc Nephrol. 2007;2(1):162–174. (PMID 17699401)
- Chionh CY, Poh CB, Roy DM, et al. Serum anion gap revisited: a verified reference interval for contemporary use. Intern Med J. 2022;52(9):1531–1537. (PMID 34028972)
- Anion Gap and Non–Anion Gap Metabolic Acidosis. StatPearls (NCBI Bookshelf), NBK448090. (https://www.ncbi.nlm.nih.gov/books/NBK448090/)

### Rights

**freely-reproducible** — The anion gap is an arithmetic identity (Na − [Cl + HCO₃], optionally + K) and the Figge albumin correction is a regression coefficient (2.5 per g/dL) applied to a linear formula; formulas, coefficients, and reference intervals are facts, not copyrightable expression. No verbatim scale wording is embedded (anion-gap.md IP status).

---

## APLS age-based weight estimate (pediatric)

<a id="apls-weight"></a>

`apls-weight` · v1.1.0 · published · general

### Inputs

- **Age** — numeric, years / months / days, accepts 0 to 12, required
  - Help: Age in years (a 6-month-old is 0.5). Also accepts months or days. The formula band is chosen from age: under 1 year, 1–5 years, or 6–12 years. Outside 0–12 years there is no APLS age-based formula.

### Interpretation bands

_None declared._

### How it is calculated

Estimated body weight in kilograms, chosen by age band. Under 1 year: 0.5 × age in months + 4. 1–5 years: 2 × age + 8. 6–12 years: 3 × age + 7 (Luscombe & Owens, replacing the legacy (age + 4) × 2, which underestimated measured weight by a mean of 18.8%). Age is taken in whole years at the last birthday for the child bands. A single age input converts internally, because the infant formula runs in months, a classic unit trap.

### Limitations and notes

A population point estimate for use only when weighing is impossible. A measured weight is always preferred, and the Broselow tape is the length-based alternative, which needs the tape and the child supine and loses accuracy above ~25 kg. Systematically underestimates in overweight and obese children. Not defined outside 0–12 years, and NOT to be extrapolated to a preterm or low-birth-weight neonate: the infant band is anchored to an average term newborn and returns 4 kg at age 0, which over-estimates a small preterm baby several-fold.

### References

- Luscombe M, Owens B. Weight estimation in resuscitation: is the current formula still valid? Arch Dis Child. 2007;92(5):412–415. (PMID 17213259)
  - Origin of the 6–12y formula weight = (3 × age) + 7 (derived/validated 1–10y); legacy (age+4)×2 underestimated measured weight by a mean of 18.8% (n=17,244), the reason it was replaced.
- Advanced Life Support Group. Advanced Paediatric Life Support: The Practical Approach. 5th ed. Wiley-Blackwell; 2011. ISBN 978-1-4443-3059-5. (https://www.alsg.org/en/?q=APLS)
  - Manual that introduced the three age-banded formulas: infant (0.5×months)+4, 1–5y (2×age)+8, 6–12y (3×age)+7.
- Kelly A-M, Nguyen K, Krieser D. Validation of the Luscombe weight formula for estimating children's weight. Emerg Med Australas. 2011;23(1):59–62. (PMID 21134132)
  - Independent validation of (3×age)+7 for ages 1–10y.
- Lubitz DS, Seidel JS, Chameides L, et al. A rapid method for estimating weight and resuscitation drug dosages from length in the pediatric age group. Ann Emerg Med. 1988;17(6):576–581. (PMID 3377285)
  - Original Broselow length-based tape — a length-based (not age-based) alternative.

### Rights

**freely-reproducible** — The equations (0.5×months)+4, (2×age)+8, (3×age)+7 and the age-band selection are mathematical facts / uncopyrightable methods; coefficients are facts (research §"IP status"). Program name (APLS) referenced factually, not reproduced; no Broselow proprietary zone tables are used.

---

## Body surface area (Mosteller)

<a id="bsa-mosteller"></a>

`bsa-mosteller` · v1.0.0 · published · general

### Inputs

- **Height** — numeric, cm / in / m, accepts 30 to 220, required
  - Help: Body length / height. Accepts centimetres (default), inches, or metres.
- **Weight** — numeric, kg / lb / g, accepts 0.3 to 250, required
  - Help: Body weight. Accepts kilograms (default), pounds, or grams.

### Interpretation bands

_None declared._

### How it is calculated

BSA in square metres is the square root of (height in cm × weight in kg ÷ 3600). There are no age or sex terms. Compute in full floating point and round once at display.

### Limitations and notes

BSA is a body-size scalar consumed by downstream calculations such as mg/m² dosing and cardiac index, so it carries no bands. Mosteller was validated against the Du Bois formula, itself fit to 9 adults in 1916, rather than against direct measurement. Agreement with pediatric-fit estimators widens at the extremes (neonates, severe obesity), so any platform indexing by BSA should record which formula it uses. The main failure mode is unit transposition (lb↔kg, in↔cm): because BSA scales as a square root, a swapped unit yields a wrong-but-plausible number the formula cannot self-detect.

### References

- Mosteller RD. Simplified calculation of body-surface area. N Engl J Med. 1987;317(17):1098. (PMID 3657876)
  - Primary source: BSA = sqrt(height·weight/3600) (metric) and the sqrt(height·weight/3131) imperial variant.
- Du Bois D, Du Bois EF. A formula to estimate the approximate surface area if height and weight be known. Arch Intern Med. 1916;17(6):863–871. (Reprinted: Nutrition. 1989;5(5):303–311.) (PMID 2520314)
  - The comparator/gold-standard formula the Mosteller estimator was designed to approximate; cited for the limitations discussion, not implemented.
- Evidencio — Body surface area (Mosteller formula), model 518. (https://www.evidencio.com/models/show/518)
  - Secondary confirmation of the metric formula BSA(m²) = sqrt(height_cm × weight_kg / 3600) and the Mosteller 1987 citation.
- Omnicalculator — BSA Calculator (Body Surface Area). (https://www.omnicalculator.com/health/bsa)
  - Secondary confirmation and the 170 cm / 60 kg worked example (Example D) reproduced as an external check.

### Rights

**freely-reproducible** — The Mosteller estimator is a single mathematical expression (a square root of a product over the constant 3600); formulas, constants, and the ½-power are facts/algorithms, not copyrightable expression, and there is no proprietary scale wording (research §"IP status").

---

## Corrected calcium for albumin

<a id="corrected-calcium"></a>

`corrected-calcium` · v1.0.0 · published · renal-metabolic

### Inputs

- **Measured total calcium** — numeric, mg/dL / mmol/L, accepts 4 to 20, required
  - Help: Total (not ionized) serum calcium. Accepts mg/dL or mmol/L.
- **Serum albumin** — numeric, g/dL / g/L, accepts 1 to 6, required
  - Help: Serum albumin. Accepts g/dL or g/L.

### Interpretation bands

_None declared._

### How it is calculated

Corrected calcium (mg/dL) = measured total calcium + 0.8 × (4.0 − serum albumin in g/dL). In SI units: corrected calcium (mmol/L) = measured + 0.02 × (40 − albumin in g/L). The result is reported in both conventions, with ÷ 4.008 between them. The 0.8 is the rounded form of Payne’s original 1.0 slope.

### Limitations and notes

No bands: read the result against the age-specific paediatric total-calcium reference range (Roizen 2013). Unreliable in critical illness: adjusted calcium tracked ionized calcium poorly (sensitivity 78%, specificity 63%, AUC 0.78 for ionized hypocalcemia; Steele 2013), so ionized calcium is the reference standard in the critically ill, in acid-base disturbance, after citrate-containing transfusion, and with rapid albumin shifts. The fixed linear coefficient overestimates ionized calcium at low albumin, and the slope is assay- and population-specific. Payne’s cohort was 200 adults with no ionized validation, and no paediatric derivation exists, so prefer ionized calcium in neonates and unstable children.

### References

- Payne RB, Little AJ, Williams RB, Milner JR. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J. 1973;4(5893):643–646. (PMID 4758544)
- Steele T, Kolamunnage-Dona R, Downey C, Toh CH, Welters I. Albumin-adjusted calcium concentration should not be used to identify hypocalcaemia in critical illness. Crit Care. 2013;17(Suppl 2):P446. (DOI 10.1186/cc12384)
- Roizen JD, Shah V, Levine MA, Carlow DC. Determination of Reference Intervals for Serum Total Calcium in the Vitamin D-Replete Pediatric Population. J Clin Endocrinol Metab. 2013;98(12):E1946–E1950. (PMID 24217904)

### Rights

**freely-reproducible** — Linear arithmetic transformation of two lab values with a numeric coefficient (0.8/0.02) and reference constant (4.0 g/dL); facts and mathematics, no proprietary scale text (corrected-calcium.md IP status).

---

## Corrected QT interval (QTc — Bazett & Fridericia)

<a id="qtc"></a>

`qtc` · v1.0.0 · published · general

### Inputs

- **Measured QT interval** — numeric, ms / s, accepts 200 to 700, required
  - Help: QT measured from QRS onset to end of the T wave (lead II or V5), U wave excluded. Accepts ms or s; QTc is returned in the same unit (ms).
- **Heart rate (or R–R interval)** — numeric, bpm / ms / s, accepts 30 to 250, required
  - Help: Enter the heart rate in beats/min, or the R–R interval directly (unit ms or s). Internally converted to RR in seconds (RR = 60 / HR).

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `qtc_bazett` | [-inf, 440] | ≤ 440 ms | At or below the pediatric upper limit of normal for a Bazett-corrected QTc (Andršová 2020; Phan 2015). |
| `qtc_bazett` | (440, 460] | > 440 to ≤ 460 ms | Borderline zone between the pediatric upper limit of normal (~440 ms) and the prolonged threshold (460 ms) for a Bazett QTc (Andršová 2020; Phan 2015). |
| `qtc_bazett` | (460, 480) | > 460 to < 480 ms | Above the pediatric prolonged-QTc threshold of 460 ms for a Bazett QTc (Phan 2015 endorsed 460 ms in infants/young children; Andršová 2020). |
| `qtc_bazett` | [480, +inf) | ≥ 480 ms | At or above the level Andršová 2020 cite as diagnostic of long QT syndrome for a Bazett QTc. QTc alone is not diagnostic — LQTS is established with full criteria (Schwartz score, symptoms, family history, genetics). |

### How it is calculated

RR in seconds = 60 ÷ HR, or the R–R interval as entered directly. Bazett QTc = QT ÷ √RR. Fridericia QTc = QT ÷ RR^(1/3). Both return the QTc in the unit the QT was entered in, and at a heart rate of 60 both equal the raw QT.

### Limitations and notes

The bands are applied to the Bazett value only, because the pediatric thresholds were derived with Bazett and are not equivalent for Fridericia. QTc alone is never diagnostic; long QT syndrome requires full criteria (Schwartz score, symptoms, family history, genetics). Formula choice changes the answer: Bazett over-corrects at fast rates and so systematically over-calls prolongation in children. Outside roughly 60 to 100 bpm, Fridericia is the more defensible correction, and it is reported here without bands. Adult sex-specific cutoffs must not be applied to children. The QTc is only as good as the QT measurement (lead, tangent method, U-wave exclusion, machine vs manual).

### References

- Bazett HC. An analysis of the time-relations of electrocardiograms. Heart. 1920;7:353–370. Reprinted Ann Noninvasive Electrocardiol. 1997;2(2):177–194. (DOI 10.1111/j.1542-474X.1997.tb00325.x)
- Fridericia LS. Die Systolendauer im Elektrokardiogramm bei normalen Menschen und bei Herzkranken. Acta Med Scand. 1920;53:469–486. English translation Ann Noninvasive Electrocardiol. 2003;8(4):343–351. (DOI 10.1111/j.0954-6820.1920.tb18266.x)
- Phan DQ, Silka MJ, Lan Y-T, Chang R-KR. Comparison of formulas for calculation of the corrected QT interval in infants and young children. J Pediatr. 2015;166(4):960–964. (PMID 25648293)
- Andršová I, Hnatkova K, Helánová K, et al. Problems with Bazett QTc correction in paediatric screening of prolonged QTc interval. BMC Pediatr. 2020;20:558. (PMID 33317470)
- Goldenberg I, Moss AJ, Zareba W. QT interval: how to measure it and what is "normal." J Cardiovasc Electrophysiol. 2006;17(3):333–336. (PMID 16643414)

### Rights

**freely-reproducible** — Both corrections are mathematical formulas (√RR and RR^(1/3) normalizations) and the pediatric thresholds (440/460/480 ms) are numeric facts from the literature — neither is copyrightable (qtc.md IP status).

---

## Corrected sodium for hyperglycemia

<a id="corrected-sodium"></a>

`corrected-sodium` · v1.0.0 · published · renal-metabolic

### Inputs

- **Measured serum sodium** — numeric, mEq/L / mmol/L, accepts 90 to 180, required
  - Help: Serum sodium as reported by the lab. mEq/L and mmol/L are numerically identical (sodium is monovalent).
- **Serum glucose** — numeric, mg/dL / mmol/L, accepts 0 to 2000, required
  - Help: Serum glucose in mg/dL (accepts mmol/L, ×18). The correction applies only above the 100 mg/dL reference.

### Interpretation bands

_None declared._

### How it is calculated

Corrected Na = measured Na + (factor ÷ 100) × (glucose − 100), with glucose in mg/dL (mmol/L × 18). No correction is applied at or below 100. Both published factors are shown: Katz 1.6 (1973, theoretical) and Hillier 2.4 (1999, measured in 6 healthy adults).

### Limitations and notes

A corrected lab value read against the ordinary sodium reference frame, so there are no bands. Both factors are adult-derived with no paediatric validation [NEEDS SOURCE for a paediatric factor or DKA-guideline endorsement]. Hillier’s data are non-linear: above ~400 mg/dL the true factor climbs toward ~4.0, so the real corrected sodium may exceed even the 2.4 estimate. Units are the main hazard: glucose must be mg/dL for these coefficients.

### References

- Katz MA. Hyperglycemia-induced hyponatremia — calculation of expected serum sodium depression. N Engl J Med. 1973;289(16):843–844. (PMID 4763428)
- Hillier TA, Abbott RD, Barrett EJ. Hyponatremia: evaluating the correction factor for hyperglycemia. Am J Med. 1999;106(4):399–403. (PMID 10225241)
- MDCalc / Scholastica. Sodium Correction for Hyperglycemia. Independent reproduction of both formulas (Katz +0.016·(glucose−100); Hillier +0.024·(glucose−100)) with the 100 mg/dL reference. (https://mdcalc.scholasticahq.com/article/143117-sodium-correction-for-hyperglycemia)

### Rights

**freely-reproducible** — Simple published linear correction formulas; the coefficients 1.6/2.4 and the 100 mg/dL reference are facts, not copyrightable expression, and there is no verbatim scale text (corrected-sodium.md §IP status).

---

## ETT size and depth (pediatric)

<a id="ett-size"></a>

`ett-size` · v1.1.0 · published · airway-equipment

### Inputs

- **Age** — numeric, years / months / days, accepts 1 to 12, required
  - Help: Age in years (an 18-month-old is 1.5). Also accepts months or days. These formulas apply roughly 1–10 years and are accepted up to 12. Below 1 year they are NOT valid and are refused: use weight- and gestational-age-based neonatal sizing instead. Above ~12 years use adult sizing.

### Interpretation bands

_None declared._

### How it is calculated

Uncuffed internal diameter (mm) = age in years ÷ 4 + 4 (Cole). Cuffed internal diameter (mm) = age in years ÷ 4 + 3.5, pinned to the APLS/Motoyama/Duracher constant; the classic Khine +3.0 gives a tube 0.5 mm smaller and is still widely taught. Oral depth at the lips (cm) = age in years ÷ 2 + 12. Each raw diameter is also snapped to the nearest manufactured 0.5 mm size, with exact half-steps resolved DOWN, both because that reproduces the conventional taught sizes (1 y cuffed 3.5, 3 y 4.0, 5 y 4.5) and because the errors are asymmetric: a tube 0.5 mm small is exchanged or tolerated, one 0.5 mm large is the mechanism of subglottic injury.

### Limitations and notes

Scope is age 1 to 12 years, with the lower bound enforced: below 1 year these formulas are invalid and are refused, so use weight- and gestational-age-based neonatal sizing instead. Above about 12 years, use adult sizing. The ID × 3 depth rule is deliberately not emitted: it diverges from age ÷ 2 + 12 by about 2 cm at 1 year and about 3 cm at 12, so printing both would put two oral depths for one child on one screen. Keep tubes 0.5 mm larger and smaller at hand. The formulas mis-size a meaningful minority of children (Cole over-sizes the youngest in range), so confirm by air-leak test (about 20 to 30 cmH₂O uncuffed), auscultation, capnography, chest rise, and imaging. [NEEDS SOURCE]: the nasal-route depth offset (about +2 to 3 cm) and the fixed infant depth steps are unverified and not implemented.

### References

- Cole F. Pediatric formulas for the anesthesiologist. AMA J Dis Child. 1957;94(6):672–673. (PMID 13478300)
  - Origin of the uncuffed formula ID = age/4 + 4.
- Khine HH, et al. Comparison of cuffed and uncuffed endotracheal tubes in young children during general anesthesia. Anesthesiology. 1997;86(3):627–631. (PMID 9066329)
  - Classic cuffed formula ID = age/4 + 3.0 (0.5 mm smaller than the pinned +3.5).
- Duracher C, et al. Evaluation of cuffed tracheal tube size predicted using the Khine formula in children. Paediatr Anaesth. 2008;18(2):113–118. (PMID 18184241)
  - Khine +3.0 under-sizes by ~0.5 mm in children > 1 y; supports the pinned cuffed ID = age/4 + 3.5 (also the APLS/Motoyama constant).
- Weber MD, et al. Recommendations for endotracheal tube insertion depths in children. Respir Care. 2023. (PMID 37336629)
  - Attributes oral depth = age/2 + 12 to PALS 2000 and lists ID (mm) × 3 as the oral-intubation depth cross-check.
- Endotracheal Tube. StatPearls [Internet]. NCBI Bookshelf NBK539747. (https://www.ncbi.nlm.nih.gov/books/NBK539747/)
  - Uncuffed age/4 + 4; cuffed one-half size smaller; oral depth ≈ 3 × tube ID (e.g. a 4.0 mm tube at ~12 cm); round to nearest available 0.5 mm.

### Rights

**freely-reproducible** — age/4 + 4, age/4 + 3.5, and age/2 + 12 are mathematical facts / clinical methods (ideas and procedures), not copyrightable expression; coefficients are facts (research §"IP status"). Program names (APLS/PALS) are referenced factually, not reproduced.

---

## FOUR score (Full Outline of UnResponsiveness)

<a id="four-score"></a>

`four-score` · v1.1.0 · published · general · interpretation not-applicable

### Inputs

- **Eye response** — choice of 5, required
  - _Eyes open, or opened by the examiner, and then obey an instruction — follow a moving target, or blink on request (4)_
  - _Eyes open, but the gaze follows nothing and no instruction is obeyed (3)_
  - _Eyes stay shut until a loud voice opens them (2)_
  - _Eyes stay shut until a painful stimulus opens them (1)_
  - _Eyes stay shut even to a painful stimulus (0)_
  - Help: Score the best observed eye response. The top level requires the patient to obey an instruction with their eyes, so it is unattainable in a child too young to comply — see the limitations note.
- **Motor response** — choice of 5, required
  - _Carries out a requested hand gesture — a fist, a thumbs-up, or a V-sign (4)_
  - _No gesture on request, but reaches toward the site of a painful stimulus (3)_
  - _Any flexion of the arm to pain — pulling away from it, or bending it inward in the decorticate pattern; this scale does not separate the two (2)_
  - _Straightens the arm away from pain — abnormal extension, the decerebrate pattern (1)_
  - _Nothing at all to pain, or generalised myoclonus status rather than a purposeful response (0)_
  - Help: Score the best response in the upper limbs. As with the eye component, the top level requires the patient to carry out a request, which a preverbal child cannot do.
- **Brainstem reflexes** — choice of 5, required
  - _Pupillary and corneal responses both intact (4)_
  - _One pupil dilated and unreactive; the other pupillary response and the corneal response remain (3)_
  - _Exactly one of the pair is lost — pupillary or corneal, not both (2)_
  - _Both pupillary and corneal responses lost; the cough response is still there (1)_
  - _Pupillary, corneal and cough responses all lost (0)_
  - Help: Which reflexes remain, not how brisk they are. Read the middle two levels carefully: losing ONE of the pupillary/corneal pair is a different level from losing BOTH, and it is worth one point.
- **Respiration** — choice of 5, required
  - _Not intubated, and breathing in a regular rhythm (4)_
  - _Not intubated, breathing in a waxing-and-waning periodic cycle (Cheyne–Stokes) (3)_
  - _Not intubated, and breathing in an irregular rhythm (2)_
  - _Intubated, and triggering breaths above the ventilator's set rate (1)_
  - _Intubated with no breaths beyond the set rate, or apnoeic (0)_
  - Help: THE SPLIT IS INTUBATION, NOT VENTILATOR SUPPORT. The top three levels describe the breathing pattern of a patient who is not intubated — including one on mask CPAP, BiPAP or high-flow, all of which still score on rhythm alone. The bottom two describe how an intubated patient interacts with the set rate. An intubated patient therefore cannot score above 1 here, capping their total at 13.

### Composition

Total `four_total`, made of:

- `eye` — 0 to 4
- `motor` — 0 to 4
- `brainstem` — 0 to 4
- `respiration` — 0 to 4

### Interpretation bands

_None declared._

### Cautions

> Adult-derived. Six studies, 571 children (Almojuela 2019): equivalent to the GCS in outcome prediction, reliably rated, superiority not established, in cohorts that were mostly school-age (2-12 y) with neonates and infants effectively absent. Eye 4 and motor 4 require obeying an instruction, so a neurologically intact preverbal child caps at 14. This implements the adult instrument, not the modified Pediatric FOUR Score Scale (Czaikowski 2014).

> An INTUBATED patient can score at most 1 on respiration, capping the total at 13. Intubation, not ventilator support, is what the scale splits on: a child on mask CPAP, BiPAP or high-flow still scores the top three levels on rhythm alone. Intubated and non-intubated totals are different rulers and are not comparable. Sedation and neuromuscular blockade make the eye and motor components uninformative.

### How it is calculated

Total = Eye + Motor + Brainstem + Respiration, each scored 0-4, giving a range of 0-16. Low is worse. There is no verbal component, which is why the score stays complete in an intubated patient, and every component has a true 0. This implements the adult instrument (Wijdicks 2005), not the modified Pediatric FOUR Score Scale (Czaikowski 2014).

### Limitations and notes

STRUCTURAL CEILINGS, BUILT INTO THE INSTRUMENT. An INTUBATED patient can score at most 1 on respiration, capping the total at 13 — intubation is the split, not ventilator support, so a child on mask CPAP or high-flow is scored on rhythm like any unsupported patient; intubated and non-intubated totals are different rulers and are not comparable. Eye 4 and motor 4 require obeying an instruction, so a neurologically intact preverbal child caps at 14. That ceiling is reasoned from the item definitions; [NEEDS SOURCE] for a published youngest applicable age. BRAINSTEM READING TRAP: level 2 is exactly ONE of the pupillary/corneal pair lost; level 1 is BOTH lost with cough retained; level 0 is cough lost too. The or/and distinction is one point wide. Sedation and neuromuscular blockade make the eye and motor components uninformative. PAEDIATRIC STANDING: six studies, 571 children (Almojuela 2019): equivalent to the GCS in outcome prediction, reliably rated, superiority not established. The cohorts were mostly school-age (2-12 y), with neonates and infants effectively absent. Not interchangeable with the GCS, which has different components, ranges and floors. NO INTERPRETATION BANDS, DELIBERATELY. Wijdicks 2005 proposes none, and published cut-points are cohort- and outcome-specific and disagree, with values from 4 to 14 appearing for different populations and endpoints. Do not attach any of them to a computed result.

### References

- Wijdicks EFM, Bamlet WR, Maramattom BV, Manno EM, McClelland RL. Validation of a new coma scale: The FOUR score. Ann Neurol. 2005;58(4):585-593. (PMID 16178024)
  - Derivation and validation in 120 adult ICU patients (Mayo Clinic); interrater kappa 0.82. Source of the four components, the sixteen levels this implementation paraphrases, and the 0-16 total.
- Almojuela A, Hasen M, Zeiler FA. The Full Outline of UnResponsiveness (FOUR) Score and Its Use in Outcome Prediction: A Scoping Review of the Pediatric Literature. J Child Neurol. 2019;34(4):189-198. (PMID 30630377)
  - The paediatric evidence base assembled: 6 studies, 571 children. FOUR equivalent to GCS in outcome prediction in all six; interobserver reliability good to excellent; superiority over GCS NOT established.
- Cohen J. Interrater reliability and predictive validity of the FOUR score coma scale in a pediatric population. J Neurosci Nurs. 2009;41(5):261-267. (PMID 19835239)
  - First paediatric application, PICU. Weighted kappa 0.951 (FOUR) vs 0.738 (GCS). Excluded sedated and neuromuscularly blocked patients.
- Czaikowski BL, Liang H, Stewart CT. A pediatric FOUR score coma scale: interrater reliability and predictive validity. J Neurosci Nurs. 2014;46(2):79-87. (PMID 24556655)
  - The Pediatric FOUR Score Scale (PFSS) — a MODIFIED instrument for all paediatric ages including intubated/sedated children. Cited because its existence is the evidence that the adult scale needed adapting. This implementation is NOT the PFSS.
- Jamal A, Sankhyan N, Jayashree M, Singhi S, Singhi P. Full Outline of Unresponsiveness score and the Glasgow Coma Scale in prediction of pediatric coma. World J Emerg Med. 2017;8(1):55-60. (PMID 28123622)
  - 63 children aged 5-12 y, paediatric ED. In-hospital mortality AUC 0.80 (FOUR) vs 0.83 (GCS), p=0.27 — no difference. Adult instrument applied unmodified.
- Khajeh A, Fayyazi A, Miri-Aliabad G, Askari H, Noori N, Khajeh B. Comparison between the Ability of Glasgow Coma Scale and Full Outline of Unresponsiveness Score to Predict the Mortality and Discharge Rate of Pediatric Intensive Care Unit Patients. Iran J Pediatr. 2014;24(5):603-608. (PMID 25793069)
  - 200 children aged 2-12 y, PICU. Per-component kappa 0.72-0.82; cut-point 8; mean total 12.5 +/- 2.1 in survivors vs 5.1 +/- 2.8 in non-survivors. No DOI is registered for this article.
- Pandwar U, Navindana, Ramteke S, Motwani B, Agrawal A. Comparison of Full Outline of Unresponsiveness Score and Glasgow Coma Scale for Assessment of Consciousness in Children With Acute Encephalitis Syndrome. Indian Pediatr. 2022;59(12):933-935. (PMID 36511207)
  - 150 children with acute encephalitis syndrome; FOUR and GCS strongly correlated (r=0.82) and comparable.
- Foo CC, Loan JJM, Brennan PM. The Relationship of the FOUR Score to Patient Outcome: A Systematic Review. J Neurotrauma. 2019;36(17):2469-2483. (PMID 31044668)
  - 37 studies. Good-to-excellent prognostication of in-hospital mortality (AUC >0.80); motor and eye components more prognostic than the brainstem component; closes by calling for further standardised research across populations — the basis for shipping no interpretation bands.

### Rights

**freely-reproducible** — The scoring math is an ordinal sum of four integers (E+M+B+R, 0-16) — under 17 USC 102(b) a procedure or method of operation, not copyrightable expression — and the numeric levels and total range are facts. The DESCRIPTOR PROSE is a different matter: the scale was developed at the Mayo Clinic (Wijdicks) and the derivation and validation papers are publisher-copyrighted, and the developer is reported to have fielded several hundred requests for permission to use the scale. No explicit reproduction restriction on the scale text was located, and no explicit grant was either. This implementation therefore reproduces NONE of it: every option label is this project's own paraphrase of what the level represents, per the binding constraint in ADR-tier-b-ip.md third addendum (2026-08-02), with Wijdicks 2005 attributed here, in references, in formula and in notes (four-score.md IP status).

---

## Holliday-Segar maintenance fluids

<a id="holliday-segar"></a>

`holliday-segar` · v1.0.0 · published · fluids-resuscitation · interpretation not-applicable

### Inputs

- **Body weight** — numeric, kg / lb / g, accepts 4 to 150, required
  - Help: Actual body weight. Accepts kilograms, pounds, or grams. Below 4 kg is out of scope and is rejected rather than estimated.

### Interpretation bands

_None declared._

### Cautions

> This is a ceiling, not a prescription. Current guidance recommends infusing less than the calculated volume in most hospitalised children: a two-thirds default (RCH), 65–80% for ADH risk or 50–60% for oedematous states (ESPNIC), and 50–80% (NICE). Count concurrent IV fluids, blood products, drug volumes and flushes, and enteral intake before prescribing.

### How it is calculated

Daily volume uses the 100-50-20 rule: 100 mL/kg for the first 10 kg, plus 50 mL/kg for each kg from 10 to 20 kg, plus 20 mL/kg for each kg above 20. The hourly rate uses the 4-2-1 rule, which applies 4, 2 and 1 mL/kg/h across those same three brackets. Its coefficients are the daily coefficients divided by 24 and rounded, so the hourly rate multiplied by 24 does not equal the daily volume, by design. A third output caps the hourly rate at 100 mL/h, the one figure every current guideline states identically (NICE, Leung 2021, RCH, Be-PIV). Under the 4-2-1 rule that cap binds at exactly 60 kg. The cap is a guideline overlay. Holliday and Segar’s function has no ceiling.

### Limitations and notes

Weight is accepted from 4 to 150 kg, and below 4 kg the score refuses to compute. The 4 kg floor is this project’s own proxy and is stated as such: every guideline scope that excludes neonates is written in age (term, 28 days, one month), which a weight input cannot implement, and the populations overlap in weight. A 3.2 kg term neonate on day 2 needs roughly 70–80 mL/kg/day while a well 3.2 kg two-month-old needs 100. NICE’s separate neonatal day-of-life ladder, rising from 50–60 to 120–150 mL/kg/day over the first 28 days, is not implemented here. This is a ceiling, not a prescription. Current guidance recommends infusing less than the calculated volume in most hospitalised children: a two-thirds default (RCH), 65–80% for ADH risk or 50–60% for oedematous states (ESPNIC), and 50–80% (NICE). Count concurrent IV fluids, blood products, drug volumes and flushes, and enteral intake before prescribing. Restriction is not hyponatraemia prophylaxis; tonicity is what protects. Neville 2010 randomised tonicity and rate independently (2 × 2, n = 124) and found that hyponatraemia risk decreased by isotonic saline “but not fluid restriction”, and the AAP found that hypotonic-fluid risk persisted even at restricted rates. Give isotonic maintenance fluid with appropriate potassium chloride and dextrose (AAP 2018 statement 1A, evidence A; number needed to treat 7.5 to prevent one sodium below 135), preferably balanced (ESPNIC), avoiding lactate-buffered solutions in severe liver dysfunction. Check electrolytes and glucose at baseline and at least every 24 h. No daily cap is applied, because guidelines disagree (2000, 2400 and 2500 mL figures for the same question) and no evidence-based daily ceiling exists. The circulating 2400 traces to a citation error and is arithmetically 100 mL/h × 24. The formula over-estimates in illness. Measured energy expenditure in acutely ill children runs 50–60 kcal/kg/day against the formula’s assumed 100 for the first 10 kg, and accuracy falls further in fever, burns, tachypnoea, hypothermia, and altered-ADH states. The output excludes deficit and ongoing losses, which are added separately. For infants aged 1–3 months, prefer a dextrose-containing balanced solution with lower sodium chloride content and monitor electrolytes (Leung statement 5.4). Above about 60 kg, and in obesity, acute kidney injury, chronic kidney disease or cancer, switch to BSA-based or adult forms per NICE. Never prescribe above the calculated maintenance rate (Leung 6.1). The 1957 electrolyte figures (3 mEq sodium, 2 mEq potassium per 100 kcal) are per 100 kcal metabolised, not per kg. The volume rule stands; the 1957 composition is superseded. The burn-resuscitation calculator on this site deliberately reimplements this arithmetic from 0.5 kg, because refusing a burned neonate would withhold the resuscitation volume too. It discloses the scope limit instead of refusing.

### References

- Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823–832. (PMID 13431307)
  - Origin of the method. SECOND-HAND — every figure attributed to it arrives through the AAP 2018 guideline's direct citation, the AAP structured summary, and Chesney's 1998 commentary. The journal is Pediatrics, not Journal of Pediatrics, and the page range is 823–832; both errors circulate widely.
- Feld LG, Neuspiel DR, Foster BA, et al. Clinical Practice Guideline: Maintenance Intravenous Fluids in Children. Pediatrics. 2018;142(6):e20183083. (DOI 10.1542/peds.2018-3083)
  - Isotonic key action statement 1A (28 days to 18 years, evidence A, strength strong; NNT 7.5 to prevent one Na<135, 27.8 for Na<130). Source of the measured 50–60 kcal/kg/day expenditure figure, of the 3 mEq Na / 2 mEq K per 100 kcal composition cited directly from the 1957 original, and of the finding that hypotonic-fluid hyponatraemia risk persisted even in rate-restricted patients. AAP explicitly declines to recommend a rate or a volume, so it must never be cited for one.
- Brossier DW, Tume LN, Briant AR, et al. ESPNIC clinical practice guidelines: intravenous maintenance fluid therapy in acute and critically ill children. Intensive Care Med. 2022;48(12):1691–1708. (DOI 10.1007/s00134-022-06882-z)
  - Restriction percentages (65–80% for ADH risk, 50–60% for oedematous states), the fluid-creep inclusion list, balanced-solution and lactate recommendations, and the PICO 5 counter-evidence. States no daily cap. Grades its own volume recommendations C, D and GCP — the weakest in the document.
- Brossier DW, Goyer I, Verbruggen SCAT, et al. Intravenous maintenance fluid therapy in acutely and critically ill children: state of the evidence. Lancet Child Adolesc Health. 2024;8(3):236–244. (DOI 10.1016/S2352-4642(23)00288-2)
  - Source of the 2000 mL/day figure in the ESPNIC group's own prescribing box — the fourth and most conservative of the four circulating daily maxima. Renders the bottom weight band as 3–10 kg.
- Leung LCK, So LY, Ng YK, et al. Initial intravenous fluid prescription in general paediatric in-patients aged >28 days and <18 years: consensus statements. Hong Kong Med J. 2021;27(4):276–286. (DOI 10.12809/hkmj209010)
  - Statement 6.1 (2 L/day girls, 2.5 L/day boys or 100 mL/hour, citing NICE; do not prescribe above the calculated maintenance rate), 6.2 restriction bands, 5.4 the 1–3 month fluid-type band, and the statement 6 conclusion that fluid TYPE matters more than fluid RATE for preventing hyponatraemia.
- NICE. Intravenous fluid therapy in children and young people in hospital. NG29. Published 9 December 2015, last updated 11 June 2020. (https://www.nice.org.uk/guidance/ng29)
  - Rec 1.4.1 (males rarely need more than 2500 mL and females more than 2000 mL over 24 h — an awareness note, not a cap — and 100 mL/hour), 1.4.2 the term-neonate day-of-life ladder (50–150 mL/kg/day), 1.4.4 monitoring, 1.4.9 the 50–80% restriction band, 1.4.10 the BSA insensible-loss form, and the 91st-centile trigger for switching to BSA.
- Royal Children's Hospital Melbourne. Clinical Practice Guideline: Intravenous fluids. Updated January 2026. (https://www.rch.org.au/clinicalguide/guideline_index/Intravenous_fluids/)
  - Source of the 60 kg upper anchor (where the band structure stops and the cap begins), the 100 mL/hour rate, the 3 kg table floor, the 1 month scope statement, and the two-thirds operational default for unwell children. Its guideline states 2400 mL/day without citation while its own fluids calculator page states 2500 — the contradiction is left visible rather than reconciled.
- Chang AJ, York DJ, Chen W, Heidenreich KN, Shah MD. Maintenance Fluids for Late Preterm and Term Infants: Is it Time to Reconsider? Pediatr Open Sci. 2025;1(2). (DOI 10.1542/pedsos.2024-000372)
  - 174 infants ≥34 weeks GA; serum sodium fell 0.07 mEq/L per mL/kg of positive fluid balance, and term infants fared WORSE than late preterm (31% vs 17% reaching Na ≤132; OR 2.22). The counterintuitive direction is the evidence against extrapolating paediatric bands downward on the assumption that bigger is safer.
- Amer BE, Abdelwahab OA, Abdelaziz A, et al. Efficacy and safety of isotonic versus hypotonic intravenous maintenance fluids in hospitalized children: an updated systematic review and meta-analysis of RCTs. Pediatr Nephrol. 2024;39(1):57–84. (DOI 10.1007/s00467-023-06032-7)
  - Isotonic fluid significantly increased hypernatraemia risk specifically in neonates (RR 3.74, 95% CI 1.42–9.85), a subgroup signal running opposite to the overall finding. Also the source of the ≤70% = restricted, 80–120% = maintenance definition.
- Friedman AL, Ray PE. Maintenance fluid therapy: what it is and what it is not. Pediatr Nephrol. 2008;23(5):677–680. (DOI 10.1007/s00467-007-0610-3)
  - Independent corroboration that the electrolyte figures rest on a per-100-kcal (per-100-mL-infused) basis, and that this is the detail routinely dropped when the method is restated per kilogram.
- Neville KA, et al. J Pediatr. 2010;156(2):313–319. (2 × 2 factorial randomised trial in 124 postoperative children: 0.9% versus 0.45% saline crossed with 100% versus 50% of the maintenance rate. Conclusion, verbatim in part: hyponatraemia risk was decreased by isotonic saline solution 'but not fluid restriction'.) (PMID 19818450)
  - The direct source for this score's restriction-is-not-prophylaxis rule, which otherwise rests only on the AAP's rate-restricted subgroup observation and Leung's reading of Cochrane. Its 2 × 2 crossing is what makes it decisive: it varies fluid TYPE and fluid RATE independently, which a single restriction arm cannot. NO TITLE IS CARRIED — the record for this trial reaches us without one, and a plausible-looking title is not invented to fill the field. It is also one of the three RCTs ESPNIC's PICO 5 pools, so it was already in this score's evidence base indirectly. No 2016-2026 trial repeated the design.
- University of Iowa Head and Neck Protocols — Pediatric Fluid Management. Secondary confirmation of the 4-2-1 hourly rule and the 35 kg → 75 mL/hr worked example. (https://iowaprotocols.medicine.uiowa.edu/protocols/pediatric-fluid-management)
  - Used for the 35 kg worked example only. This page miscites the 1957 paper's journal, so it is not relied on for provenance.

### Rights

**freely-reproducible** — Piecewise-linear arithmetic function of body weight; the coefficients (100/50/20, 4/2/1), the weight-bracket thresholds (10 kg, 20 kg) and the 100 mL/h guideline rate cap are facts and a mathematical formula, not copyrightable expression. No proprietary scale wording exists to reproduce — every element is a number in and a volume out — and all prose here is this project's own (holliday-segar.md IP status).

---

## Ideal body weight (pediatric)

<a id="ideal-body-weight"></a>

`ideal-body-weight` · v1.0.0 · published · general

### Inputs

- **Height / recumbent length** — numeric, cm / in / m, accepts 45 to 200, required
  - Help: Standing height (or recumbent length in infants). Accepts cm, inches, or metres. The Traub methods are validated 1–17 years; the Devine method appears only at or above 152.4 cm (60 inches).
- **Sex** — choice of 2, required
  - _Male_
  - _Female_
  - Help: Used only by the Devine method (male base 50.0 kg, female 45.5 kg). The Traub–Kichen and simplified Traub equations are sex-independent by design, so sex does not change those values.

### Interpretation bands

_None declared._

### How it is calculated

Ideal body weight (kg) is estimated from height. The formulas are shown side by side because no consensus method exists. Traub–Kichen: IBW = 2.396 × e^(0.01863 × height in cm). It is sex-independent, validated 1–17 years, and is the primary paediatric height-based equation. Simplified Traub (Lexicomp): IBW = height² × 1.65 ÷ 1000, with height in centimetres. Moylan prints “inches”, an apparent transcription error yielding non-physiologic values. This method runs about 7% higher than Traub–Kichen. Devine (adult-derived, sex-based) is shown only at height ≥ 152.4 cm (60 in): 50.0 (male) or 45.5 (female) + 2.3 × (inches − 60). It over-estimates versus paediatric methods.

### Limitations and notes

The methods disagree by ≥ 10 kg in some children and change prescribed tidal volumes in pediatric ARDS (Ward 2018), which is why each one is shown and none is silently chosen. IBW carries no bands: it feeds weight-based dosing, %-IBW nutritional classification, and lung-protective tidal-volume setting. The McLaren & Read categories attach to the %IBW ratio, not to IBW. Growth-chart reference methods (McLaren, Moore, ADA, BMI50) need percentile-table lookups and are documented, not implemented. Height-only equations are weakest below about 1–2 years.

### References

- Traub SL, Kichen L. Estimating ideal body mass in children. Am J Hosp Pharm. 1983;40(1):107–110. (PMID 6823980)
  - Primary height-based pediatric IBW equation (A1); IBM = 50th-percentile weight for height; ages 1–17 y; sex-independent.
- Kang K, Absher R, Farrington E, Ackley R, So T-Y. Evaluation of Different Methods Used to Calculate Ideal Body Weight in the Pediatric Population. J Pediatr Pharmacol Ther. 2019;24(5):421–430. (PMID 31598106)
  - Source for the simplified Traub (A2) and Devine (A3) formulas and for the seven-method comparison.
- Ward SL, Quinn CM, Steurer MA, Liu KD, Flori HR, Matthay MA. Variability in Pediatric Ideal Body Weight Calculation: Implications for Lung-Protective Mechanical Ventilation Strategies in Pediatric ARDS. Pediatr Crit Care Med. 2018;19(12):e643–e652. (PMID 30277896)
  - PICU relevance: method choice shifts IBW by ≥10 kg in some children and changes prescribed tidal volume; the BMI method was usable in only 61% of a cohort.
- Moylan A, et al. Assessing the Agreement of 5 Ideal Body Weight Calculations for Selecting Medication Dosages for Children With Obesity. 2019. (https://pmc.ncbi.nlm.nih.gov/articles/PMC6547219/)
  - Cross-check of five methods; source of the simplified-Traub inches-vs-centimetres transcription-error flag (use centimetres).
- physiology R package — ideal_weight_Traub. (https://rdrr.io/cran/physiology/man/ideal_weight_Traub.html)
  - Independent encoding of the Traub 1983 equation; cross-checks Worked example 1 (returns 15.44 kg at 100 cm); validated ages 1–17 y.

### Rights

**freely-reproducible** — Formulas, coefficients, and numeric thresholds are facts / mathematical relationships, not copyrightable expression — Traub, simplified Traub, and Devine may be implemented freely (research §"IP status"). No verbatim proprietary scale text is reproduced.

---

## KDIGO AKI staging (pediatric)

<a id="kdigo-aki"></a>

`kdigo-aki` · v1.1.0 · published · renal-metabolic

### Inputs

- **Age** — numeric, years / months / days, accepts 0 to 120, required
  - Help: Patient age (accepts years, months or days). KDIGO's estimated-GFR < 35 mL/min/1.73 m² route to Stage 3 applies only to patients under 18 years, so the age is what keeps that branch off an adult. Nothing else in the staging is age-dependent — the urine-output thresholds are identical for children and adults.
- **Current serum creatinine** — numeric, mg/dL / µmol/L, accepts 0.1 to 15, optional
  - Help: The current measured serum creatinine. Accepts mg/dL or µmol/L. Drives the ×-baseline ratio and the ≥ 4.0 mg/dL Stage-3 threshold. That threshold is not read on its own: KDIGO requires the AKI definition (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline) to be met first, so a value of 4.0 or above entered without a baseline is reported as Stage 3 but flagged as not settled — a chronically high creatinine that never rose is not Stage 3 AKI.
- **Baseline serum creatinine** — numeric, mg/dL / µmol/L, accepts 0.1 to 15, optional
  - Help: The patient's baseline creatinine (known outpatient value, or a dynamic 7-day baseline). Needed for the ×-baseline ratio, for the ≥ 0.3 mg/dL rise, and to settle the ≥ 4.0 mg/dL Stage-3 route — without it a high creatinine cannot be told apart from a chronically high one. Accepts mg/dL or µmol/L. WITH NO PRIOR VALUE ON FILE, the surrogate the PAEDIATRIC evidence supports is the LOWEST creatinine measured during this admission — in 710 children aged 1 month to 18 years it detected AKI with sensitivity 87.8% and specificity 71.0% (Lee 2022, DOI 10.23876/j.krcp.21.120). Do not use KDIGO's own appendix suggestion of back-calculating from an assumed GFR of 75 mL/min/1.73 m²: in those same children it was 31.5% sensitive and put AKI incidence at 19.1% against a true 58.7%, missing roughly two thirds of it. Under-staging is the dangerous direction in a PICU, and adult reports that back-calculation OVER-estimates AKI do not transfer — in children it under-estimates severely. Whatever is entered, it is a surrogate, and the stage it produces should be read as such.
- **Urine output (rate)** — numeric, mL/kg/h, accepts 0 to 10, optional
  - Help: Weight-indexed urine output in mL/kg/h over the collection window. Compute as volume ÷ weight ÷ hours. The rate alone does not give a stage — Table 2 pairs each rate with a duration, so enter the window below as well.
- **How long that rate has been sustained** — choice of 4, optional
  - _Less than 6 hours_
  - _6 hours to under 12 hours_
  - _12 hours or more_
  - _24 hours or more_
  - Help: The KDIGO Table 2 window, as bands rather than free-typed hours — the bands are what the table states, and an hours box invites false precision about a figure read off a nursing chart. The boundaries are the guideline's own: 6 hours to under 12 is a different row from 12 or more. Pick '24 hours or more' when the window has reached 24 hours; '12 hours or more' asserts only 12, so it leaves the 24-hour Stage-3 row open — and where that open row could actually raise the stage (a rate below 0.3 mL/kg/h) the result is reported as a lower bound. Where it could not, the result is settled and no bound is shown.
- **Anuria** — yes/no, optional
  - Help: Anuria is a row of its own in Table 2 — anuria for 12 hours or more is Stage 3, whatever the rate rows say. Enter it as the clinical finding it is: KDIGO defines no millilitre figure for anuria and nephrology has no agreed one either, so no rate is invented for it here. What it does establish without any number is that the output is below every positive cutoff: there is no urine, so anuria is necessarily under 0.5 mL/kg/h and satisfies the rows built on that threshold too — anuria for 6 hours to under 12 hours is Stage 1. Enter the measured rate as well if you have one; it can only make the answer more specific.
- **Estimated GFR (pediatric, bedside Schwartz)** — numeric, mL/min/1.73m2, accepts 1 to 200, optional
  - Help: Estimated GFR in mL/min/1.73 m² (bedside Schwartz: 0.413 × height[cm] ÷ creatinine[mg/dL]). < 35 forces Stage 3, but only for a patient under 18 years — the age entered above gates it, so an eGFR supplied for an adult is ignored on this branch.
- **Renal replacement therapy started** — yes/no, optional
  - Help: Initiation of dialysis / CRRT. When yes, KDIGO assigns Stage 3 regardless of the creatinine and urine-output axes.

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `kdigo_stage` | [-inf, 1) | Stage 0 (no AKI by KDIGO criteria) | The KDIGO 2012 definition of acute kidney injury is not met on the criteria entered. Interpret in the full clinical context; absence of a criterion here reflects the data provided, not proof that AKI is absent. Check whether the result is flagged as a lower bound: when a low urine output was entered without a duration window, the urine-output axis could not be evaluated at all, and that is not the same finding as no AKI. |
| `kdigo_stage` | [1, 2) | Stage 1 | KDIGO Stage 1 — the least severe AKI category: serum creatinine 1.5–1.9× baseline or a rise of ≥ 0.3 mg/dL, or urine output < 0.5 mL/kg/h sustained for 6 hours to under 12 hours. Higher stages are associated with worse outcomes in the literature; the stage is a descriptive classification, not a treatment threshold. |
| `kdigo_stage` | [2, 3) | Stage 2 | KDIGO Stage 2 — an intermediate AKI category: serum creatinine 2.0–2.9× baseline, or urine output < 0.5 mL/kg/h sustained for 12 hours or more. |
| `kdigo_stage` | [3, +inf) | Stage 3 | KDIGO Stage 3 — the most severe AKI category: serum creatinine ≥ 3.0× baseline, or ≥ 4.0 mg/dL once the AKI definition itself is met, initiation of renal replacement therapy, urine output < 0.3 mL/kg/h for 24 hours or more, anuria for 12 hours or more, or — in a patient under 18 years — an estimated GFR < 35 mL/min/1.73 m². Check whether the result is flagged as not settled: a creatinine of 4.0 mg/dL or above entered with no baseline reaches this stage on the value alone, and a baseline showing no acute rise would take it back out of AKI altogether. |

### How it is calculated

KDIGO stage is the maximum of two independently evaluated axes, never a sum. SERUM-CREATININE AXIS: 1.5–1.9× baseline, or a rise of ≥ 0.3 mg/dL, is Stage 1; 2.0–2.9× baseline is Stage 2; ≥ 3.0× baseline, renal replacement therapy initiated, an estimated GFR < 35 mL/min/1.73 m² (patients under 18 years only), or a creatinine ≥ 4.0 mg/dL is Stage 3. The ≥ 4.0 mg/dL route is not standalone: KDIGO requires the AKI definition (a rise of ≥ 0.3 mg/dL, or ≥ 1.5× baseline) to be met first, so a chronically elevated creatinine that never rose is not Stage 3 AKI. With no baseline entered, ≥ 4.0 mg/dL reports Stage 3 flagged as not settled. URINE-OUTPUT AXIS: the four Table 2 rows are (rate, duration) pairs, not rate bands, and each is tested independently with the highest satisfied row governing. < 0.5 mL/kg/h for 6 to under 12 hours is Stage 1; < 0.5 mL/kg/h for 12 hours or more is Stage 2; < 0.3 mL/kg/h for 24 hours or more is Stage 3; anuria for 12 hours or more is Stage 3. Branching on the rate first is the classic defect: 0.25 mL/kg/h for 8 hours is Stage 1, not Stage 3. A rate < 0.5 mL/kg/h held for less than 6 hours meets no row. Anuria is a clinical flag, because KDIGO defines no millilitre figure and none is invented here, and it necessarily satisfies the < 0.5 mL/kg/h rows too, so anuria for 6 to under 12 hours is Stage 1. UNRESOLVABLE AXIS: when the duration is missing, or “12 hours or more” is chosen with a rate < 0.3 mL/kg/h leaving the 24-hour row open, the stage shown is the highest certain stage with a “≥” flag, which is KDIGO’s own Table 10 notation. No duration is ever guessed, and the flag is set only where an open row could change the answer.

### Limitations and notes

Stage 0 means the KDIGO definition is not met on the criteria entered, which is not proof that AKI is absent. Higher stage associates with mortality and renal replacement therapy in the outcome literature, but the staging is a classification, not a treatment threshold. BASELINE CREATININE IS THE HARDEST INPUT. With no prior value, enter the LOWEST creatinine of this admission: in 710 critically ill children with true baselines it detected AKI with sensitivity 87.8% and specificity 71.0% (Lee 2022, 7-day window). Do not back-calculate from an assumed GFR of 75, which is KDIGO’s own appendix suggestion: in the same children it was 31.5% sensitive and missed roughly two thirds of the AKI. The direction reverses between adults and children, so adult reassurance that back-calculation over-diagnoses must not be carried across, and under-staging is the dangerous direction in a PICU. Record which window the entered value came from. KDIGO defines the ≥ 0.3 mg/dL rise as a rise WITHIN 48 HOURS; this calculator applies it as current minus the baseline you enter, with no window, so a baseline from weeks or months back can produce Stage 1 from a rise that was never acute. There is no paediatric modification of the urine-output thresholds. pRIFLE is a separate instrument and is neither reproduced nor blended in here. The bedside Schwartz equation (0.413 × height in cm ÷ serum creatinine in mg/dL) behind the eGFR branch was validated at roughly 1 to 16 years, so do not extrapolate it to neonates. KDIGO does not state which weight indexes the mL/kg/h [NEEDS SOURCE], nor is there a KDIGO-endorsed paediatric baseline rule [NEEDS SOURCE]. Conversion uses 1 mg/dL = 88.42 µmol/L with two-decimal rounding so KDIGO’s printed SI equivalents stage as intended (353.6 µmol/L resolves to 4.00 mg/dL).

### References

- KDIGO Acute Kidney Injury Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1–138. Definition = Rec 2.1.1; staging = Rec 2.1.2 / Table 2 (p. 19); indeterminate-staging precedent = Chapter 2.4, Table 10 (p. 30). (DOI 10.1038/kisup.2012.1)
  - Primary source of record for every staging threshold, the max-of-two-axes rule, the four (rate, duration) urine-output rows, and the '≥ 1' / '?' notation used when an axis cannot be resolved.
- Palevsky PM, et al. Reading between the (guide)lines — the KDIGO practice guideline on acute kidney injury in the individual patient. Kidney Int. 2014;85(1):49–61. (https://pmc.ncbi.nlm.nih.gov/articles/PMC3877708/)
  - Reproduces KDIGO Table 2 including the '<18 years, eGFR < 35' Stage-3 branch. Corroborating secondary source ONLY. Its urine-output rows are laid out as a rate ladder, which is an easy thing to implement from by mistake; the (rate, duration) row structure this calculator implements is taken from the primary guideline itself (first reference above), not from this reproduction.
- Schwartz GJ, Muñoz A, Schneider MF, et al. New equations to estimate GFR in children with CKD. J Am Soc Nephrol. 2009;20(3):629–637. (PMID 19158356)
  - Bedside equation eGFR = 0.413 × height(cm) ÷ SCr(mg/dL) used by the Stage-3 pediatric branch; validated ~1–16 y.
- Palevsky PM, et al. KDOQI US Commentary on the 2012 KDIGO Clinical Practice Guideline for Acute Kidney Injury. Am J Kidney Dis. 2013;61(5):649–672. (PMID 23499048)
  - National-society commentary confirming the KDIGO definition and staging.
- Lee YJ, Park YS, Park SJ, Jhang WK. Comparison of methods for estimating baseline serum creatinine to predict acute kidney injury in critically ill children. Kidney Res Clin Pract. 2022;41(3):322–331. (DOI 10.23876/j.krcp.21.120)
  - PRIMARY support for the surrogate-baseline guidance, and it is PAEDIATRIC — 710 patients aged 1 month to 18 years, single centre, all with a measured baseline within 3 months to compare against. The lowest creatinine within 7 days of PICU admission performed best (ICC 0.62; AKI sensitivity 87.8%, specificity 71.0%; misclassification 19.2%; kappa 0.60; incidence 63.5% against a true 58.7%, a slight OVER-estimate). Back-calculation from an assumed eGFR was far worse and worse in the dangerous direction (sensitivity 31.5%, specificity 98.3%, misclassification 40.3%; incidence 19.1% against the same true 58.7%). The paper contrasts this with adult reports of back-calculation OVER-estimating AKI — the direction reverses in children. Note the 7-day window is the paper's choice, not a standard.
- Cooper DJ, Plewes K, Grigg MJ, Patel A, Rajahram GS, William T, Hiemstra TF, Wang Z, Barber BE, Anstey NM. An Evaluation of Commonly Used Surrogate Baseline Creatinine Values to Classify AKI During Acute Infection. Kidney Int Rep. 2021;6(3):645–656. (PMID 33732979)
  - SECONDARY SUPPORT — the paediatric Lee 2022 above is the primary support here, and this is kept only for what Lee does not test. It compared MDRD against CKD-EPI, an assumed GFR of 100 as well as KDIGO's suggested 75, and age/sex-standardised reference tables: every method built on an assumed GFR of 75 missed over half of all AKI; CKD-EPI at an assumed GFR of 100 tracked overall incidence best but still misassigned stages; the lowest creatinine measured during the admission over-called AKI by about a fifth yet correlated best with the reference value. CAUTION — 247 ADULTS with Plasmodium knowlesi malaria in Malaysian Borneo, so adult single-infection evidence, no longer relied on for any paediatric claim. It is also the reason the notes do not present 'the adult literature' as uniform: this adult cohort found back-calculation UNDER-detecting AKI, the same direction Lee found in children, not the over-estimation Lee contrasts against.

### Rights

**freely-reproducible** — KDIGO AKI staging is a set of factual numeric cut-points and mathematical rules (multipliers, absolute SCr/eGFR/UO thresholds, durations); facts and mathematical criteria are not copyrightable and may be implemented directly with attribution. No proprietary response-descriptor prose is reproduced — every option label and explanation here is written in this project's own words. The bedside Schwartz equation is likewise a formula (kdigo-aki.md IP status).

---

## Oxygen Saturation Index (OSI)

<a id="oxygen-saturation-index"></a>

`oxygen-saturation-index` · v1.1.0 · published · respiratory

### Inputs

- **Mean airway pressure (MAP)** — numeric, cmH2O, accepts 5 to 50, required
  - Help: Ventilator-reported mean airway pressure in cm H₂O. Only defined on positive-pressure ventilation (conventional IMV or HFOV).
- **Fraction of inspired oxygen (FiO₂)** — numeric, fraction / %, accepts 0.21 to 1, required
  - Help: Room air is 0.21. Accepts a fraction or a percentage.
- **Pulse oximeter oxygen saturation (SpO₂)** — numeric, %, accepts 80 to 97, required
  - Help: Measured at steady state, not during a transient desaturation. Valid for OSI only when 80–97%; above 97% the index is not interpretable, and below 80% it is outside the window the SpO₂-based indices were validated in.

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `osi` | [-inf, 5) | OSI < 5 | Below the PALICC-2 (2023) invasive-ventilation oxygenation criterion for PARDS (OSI ≥ 5). Valid only for SpO₂ 80–97%. Interpret in the full clinical context. |
| `osi` | [5, 12) | OSI 5 to < 12 | Corresponds to the mild–moderate category for invasively ventilated children in PALICC-2 (2023) (OSI ≥ 5 meets the oxygenation criterion; OSI < 12; SpO₂ 80–97%). |
| `osi` | [12, +inf) | OSI ≥ 12 | Corresponds to the severe category for invasively ventilated children in PALICC-2 (2023) (OSI ≥ 12; SpO₂ 80–97%). PALICC-2 lowered this cutoff from the 2015 value of 12.3, and 12 — not 12.3 — is the value applied here; tertiary sources routinely conflate the two editions. |

### How it is calculated

OSI = (mean airway pressure × FiO₂ × 100) ÷ SpO₂. FiO₂ enters as a fraction, and the ×100 factor is exactly what converts it to the percentage rendering, so the two forms give the identical number. This is the same convention as the Oxygenation Index, and carries the same 100-fold trap: applying both conventions, or neither, is a 100-fold error. The index is valid only for SpO₂ 80–97%, and a saturation outside that window is rejected rather than scored. Bands are the PALICC-2 (2023) cutoffs for invasively ventilated children: OSI < 5 is below the criterion, 5 to < 12 is mild–moderate, and OSI ≥ 12 is severe.

### Limitations and notes

OSI substitutes SpO₂ for PaO₂, sparing an arterial draw. It is valid only for SpO₂ 80–97%, and the two ends of that window are sourced differently. The ceiling is cited: the dissociation curve plateaus above it, so SpO₂ no longer tracks PaO₂ (Thomas 2010; PALICC-2). The floor of 80% is a documented implementation choice, being the lower edge of the window the paediatric SpO₂-based indices were derived in (Khemani 2009/2012). Below 80% the score declines to grade rather than extrapolate. The bands are PALICC-2 (2023) and apply to invasively ventilated children. PALICC-2 moved the severe cutoff from 12.3 (2015) to 12. Tertiary sources routinely conflate the editions, and 12 is current.

### References

- Emeriaud G, López-Fernández YM, Iyer NP, et al; Second Pediatric Acute Lung Injury Consensus Conference (PALICC-2) of the PALISI Network. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric Acute Respiratory Distress Syndrome (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168. (PMID 36661420)
- Pediatric Acute Lung Injury Consensus Conference Group. Pediatric acute respiratory distress syndrome: consensus recommendations from the Pediatric Acute Lung Injury Consensus Conference. Pediatr Crit Care Med. 2015;16(5):428–439. (PMID 25647235)
- Thomas NJ, Shaffer ML, Willson DF, Shih MC, Curley MAQ. Defining acute lung disease in children with the oxygenation saturation index. Pediatr Crit Care Med. 2010;11(1):12–17. (PMID 19561556)
  - OSI derivation in children; SpO₂ ≤ 97% data restriction.
- Khemani RG, Patel NR, Bart RD 3rd, Newth CJL. Comparison of the pulse oximetric saturation/fraction of inspired oxygen ratio and the PaO2/fraction of inspired oxygen ratio in children. Chest. 2009;135(3):662–668. (PMID 19029434)
  - Pediatric SpO₂-based derivation restricted to SpO₂ 80–97% — the source of this score's 80% floor.
- Khemani RG, Thomas NJ, Venkatachalam V, et al; PALISI. Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. Crit Care Med. 2012;40(4):1309–1316. (PMID 22202709)
  - Pediatric prospective validation in the same SpO₂ 80–97% window.
- Slaughter J, Sites J, Ballard H, Bauer J, Schadler A, Severyn N. Comparison of the oxygenation index and the oxygen saturation index as clinical indicators for neonatal ECMO. Front Pediatr. 2025;13:1586985. (PMID 40630719)

### Rights

**freely-reproducible** — OSI is an arithmetic formula; the PALICC 2015 / PALICC-2 diagnostic and severity thresholds (5, 7.5, 12.3, 12), the Thomas cutoffs and the Khemani SpO₂ 80–97% validity window are facts (numbers, formulas), not copyrightable expression. No verbatim scale-item wording is embedded; surrounding guideline prose is paraphrased (oi-osi.md IP status).

---

## Oxygenation Index (OI)

<a id="oxygenation-index"></a>

`oxygenation-index` · v1.1.0 · published · respiratory

### Inputs

- **Mean airway pressure (MAP)** — numeric, cmH2O, accepts 5 to 50, required
  - Help: Ventilator-reported mean airway pressure in cm H₂O. Only defined on positive-pressure ventilation (conventional IMV or HFOV).
- **Fraction of inspired oxygen (FiO₂)** — numeric, fraction / %, accepts 0.21 to 1, required
  - Help: Room air is 0.21. Accepts a fraction or a percentage.
- **Arterial oxygen tension (PaO₂)** — numeric, mmHg / kPa, accepts 10 to 700, required
  - Help: From an arterial blood gas. Accepts mmHg or kPa.

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `oi` | [-inf, 4) | OI < 4 | Below the PALICC-2 (2023) invasive-ventilation oxygenation criterion for PARDS (OI ≥ 4). Interpret in the full clinical context. |
| `oi` | [4, 16) | OI 4 to < 16 | Corresponds to the mild–moderate category for invasively ventilated children in PALICC-2 (2023) (OI ≥ 4 meets the oxygenation criterion; OI < 16). |
| `oi` | [16, +inf) | OI ≥ 16 | Corresponds to the severe category for invasively ventilated children in PALICC-2 (2023) (OI ≥ 16). |

### How it is calculated

OI = (mean airway pressure × FiO₂ × 100) ÷ PaO₂, with MAP in cmH₂O, FiO₂ a fraction, and PaO₂ in mmHg. The ×100 converts the fraction into the percentage form PALICC-2 prints, so the two renderings are the same number. Applying both conventions, or neither, is a 100-fold error, and it is the single most likely implementation mistake: if another calculator disagrees by a factor of 100, check this first. Bands (PALICC-2 2023, invasively ventilated) are OI < 4 below the PARDS oxygenation criterion, 4 to < 16 mild–moderate, and ≥ 16 severe.

### Limitations and notes

Requires an arterial line, and is defined only on positive-pressure ventilation, conventional or HFOV. PALICC 2015 used three tiers, 4/8/16; PALICC-2 merged the lower two, and the severe cutoff did not move.

### References

- Emeriaud G, López-Fernández YM, Iyer NP, et al; Second Pediatric Acute Lung Injury Consensus Conference (PALICC-2) of the PALISI Network. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric Acute Respiratory Distress Syndrome (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168. (PMID 36661420)
- Pediatric Acute Lung Injury Consensus Conference Group. Pediatric acute respiratory distress syndrome: consensus recommendations from the Pediatric Acute Lung Injury Consensus Conference. Pediatr Crit Care Med. 2015;16(5):428–439. (PMID 25647235)
- Khemani RG, Smith LS, Zimmerman JJ, Erickson S; Pediatric Acute Lung Injury Consensus Conference Group. Pediatric acute respiratory distress syndrome: definition, incidence, and epidemiology: proceedings from the Pediatric Acute Lung Injury Consensus Conference. Pediatr Crit Care Med. 2015;16(5 Suppl 1):S23–S40. (PMID 26035358)
- Slaughter J, Sites J, Ballard H, Bauer J, Schadler A, Severyn N. Comparison of the oxygenation index and the oxygen saturation index as clinical indicators for neonatal ECMO. Front Pediatr. 2025;13:1586985. (PMID 40630719)

### Rights

**freely-reproducible** — OI is an arithmetic formula; the PALICC 2015 / PALICC-2 diagnostic and severity thresholds (4, 8, 16) are facts (numbers, formulas), not copyrightable expression. No verbatim scale-item wording is embedded; surrounding guideline prose is paraphrased (oi-osi.md IP status).

---

## Paediatric Index of Mortality 3 (PIM3)

<a id="pim3"></a>

`pim3` · v1.0.0 · published · mortality-severity · interpretation not-applicable

### Inputs

**Admission and first-hour assessment**

- **Pupils fixed to bright light** — yes/no, required
  - Help: Yes only when BOTH pupils are larger than 3 mm and fixed to bright light. Anything else — reactive, unequal, or not known — is no. A fixed pupil that can be attributed to drugs, toxins or direct injury to the eye is not recorded as abnormal (Straney 2013, Appendix 1, p680).
- **Mechanically ventilated in the first hour** — yes/no, required
  - Help: Yes if the child received any of these at any point in the first hour in ICU: invasive ventilation, CPAP by mask or nasal prongs, BiPAP, or negative-pressure ventilation (Straney 2013, Appendix 1, p680). A tracheostomy with unassisted spontaneous breathing is no — that is the ANZPIC Registry's data-entry convention (PIM2 & PIM3 for the ANZPIC Registry — Information Booklet, version January 2019), not a rule stated in the paper, which lists only what the criterion includes.
- **Elective ICU admission** — yes/no, required
  - Help: Yes when the admission could have been put off by more than six hours without harm — the paper's test for elective (Straney 2013, Appendix 1, p680). Planned surgery and planned monitoring or procedures normally meet it; an admission that had to happen now does not.
- **Recovery from a procedure** — choice of 4, required
  - _Not a post-procedure recovery admission_
  - _Recovery after a cardiac procedure with cardiopulmonary bypass_
  - _Recovery after a cardiac procedure without bypass_
  - _Recovery after a non-cardiac procedure_
  - Help: Choose a category only when recovering from the procedure IS the reason for the ICU admission. Radiology procedures and cardiac catheterisation count. Coming from theatre is not enough on its own — a child admitted after insertion of an ICP monitor is admitted for the head injury, not for the procedure (Straney 2013, Appendix 1, p680). The categories are mutually exclusive; a post-procedure admission may also carry a risk diagnosis below.
**Risk diagnosis (main reason for admission)**

- **Very high-risk diagnosis** — choice of 6, required
  - _None of these_
  - _Cardiac arrest before ICU admission_
  - _Severe combined immune deficiency_
  - _Leukaemia or lymphoma, after the first induction_
  - _Bone marrow transplant recipient_
  - _Liver failure_
  - Help: The list is complete as published — five conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Cardiac arrest counts whether it happened inside or outside hospital and needs a documented absent pulse or chest compressions — a past arrest does not count. Leukaemia or lymphoma counts only when the admission is about the malignancy or its treatment. Liver failure may be acute or chronic. THE TWO CUSTODIAN REGISTRIES CODE THE POST-TRANSPLANT CASE OPPOSITELY, and this is not resolvable by reading the paper harder: ANZPICR (Jan 2019) says do NOT include patients admitted for recovery following a liver transplant done for acute or chronic liver failure, and flags that this differs from PIM2; PICANet (v5.4, Nov 2020) says DO include them. ANZICS PSG and PICANet jointly supplied the derivation data, so the disagreement is downstream of Straney 2013 and live in practice. This score follows ANZPICR — the stricter reading, and the custodian of the ratio the model was built to produce — so a planned post-transplant admission is excluded here. Both registries agree that a readmission whose main reason is failure OF THE GRAFT does qualify. If a condition from a lower tier also applies, still record it there: the model applies the highest tier only.
- **High-risk diagnosis** — choice of 6, required
  - _None of these_
  - _Spontaneous cerebral haemorrhage_
  - _Cardiomyopathy or myocarditis_
  - _Hypoplastic left heart syndrome_
  - _Neurodegenerative disorder_
  - _Necrotising enterocolitis_
  - Help: The list is complete as published — five conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Cerebral haemorrhage must be spontaneous (aneurysm or arteriovenous malformation): traumatic bleeds are excluded, as are intracranial bleeds outside the brain itself such as a subdural. Hypoplastic left heart syndrome counts at any age, but only where a Norwood or equivalent operation was needed in the newborn period to keep the child alive. Neurodegenerative disorder needs a progressive loss of milestones, or a diagnosis in which that loss is certain, and does not need a name. A very high-risk diagnosis, if also present, takes precedence over this one.
- **Low-risk diagnosis** — choice of 7, required
  - _None of these_
  - _Asthma_
  - _Bronchiolitis_
  - _Croup_
  - _Obstructive sleep apnoea_
  - _Diabetic ketoacidosis_
  - _Seizure disorder_
  - Help: The list is complete as published — six conditions (Straney 2013, Appendix 1, p680). Record one only when it is the MAIN reason for the ICU admission; if you are unsure, record none. Bronchiolitis covers a child presenting with either respiratory distress or central apnoea where the clinical diagnosis is bronchiolitis. Obstructive sleep apnoea covers admission after adenoidectomy or tonsillectomy when the apnoea is the main reason — record the procedure recovery above as well, since such a case carries both terms. Seizure disorder covers status epilepticus, epilepsy, a febrile convulsion or another epileptic syndrome where the admission is to control the seizures or to recover from them or their treatment. A very high-risk or high-risk diagnosis, if also present, takes precedence over this one.
**Observations at first contact**

- **Systolic blood pressure** — numeric, mmHg, accepts 0 to 300, optional
  - Help: First systolic BP from first ICU-team contact to one hour after ICU arrival — the first value in that window, not the worst. Three coded entries carry weight and are not measurements: leave blank if unknown (the model substitutes 120), enter 0 if the child was in cardiac arrest at admission, and enter 30 if shocked with a blood pressure that could not be measured (Straney 2013, Appendix 1, p680).
- **Base excess** — numeric, mmol/L, accepts -40 to 40, optional
  - Help: Arterial or capillary base excess in mmol/L. The equation uses its absolute value, so sign does not matter. Leave blank if unknown — the model substitutes 0 (Straney 2013, Appendix 1, p680).
- **FiO₂ at the time of the PaO₂** — numeric, fraction / %, accepts 0.21 to 1, optional
  - Help: Fraction of inspired oxygen taken at the same moment as the PaO₂. Room air is 0.21. If either FiO₂ or PaO₂ is unknown the whole oxygenation term becomes 0.23, so leaving one blank makes the other one unused.
- **Arterial PaO₂** — numeric, mmHg / kPa, accepts 20 to 600, optional
  - Help: Arterial PaO₂ taken at the same moment as the FiO₂. Accepts mmHg or kPa. If either FiO₂ or PaO₂ is unknown the whole oxygenation term becomes 0.23 — PIM3's substitute for a normal value, and NOT PIM2's 0.

### Interpretation bands

_None declared._

### Cautions

> PIM3 is for GROUPS of patients, not for one individual patient. The derivation paper says so itself: “These models are not intended for prognostic use on individual patients” (Straney 2013). It estimates hospital-mortality probability for unit-level case-mix and SMR benchmarking, so the number shown here should not be used to describe, or to decide anything about, the child in front of you.

### How it is calculated

PIM3 score (logit) = 3.8233 × pupils + 0.9763 × ventilated − 0.5378 × elective + 0.0671 × |base excess| − 0.0431 × SBP + 0.1716 × (SBP² ÷ 1000) + 0.4214 × (FiO₂ × 100 ÷ PaO₂) − 1.2246 × bypass-cardiac recovery − 0.8762 × non-bypass-cardiac recovery − 1.5164 × non-cardiac recovery + 1.6225 × very-high-risk diagnosis + 1.0725 × high-risk diagnosis − 2.1766 × low-risk diagnosis − 1.7928, where each indicator is 1 when present and 0 otherwise. Predicted mortality (probability) = 1 ÷ (1 + e^−logit). No severity bands are published, so none are shown. THE THREE DIAGNOSIS TIERS ARE ONE VARIABLE, NOT THREE. Very-high-risk outranks high-risk, which outranks low-risk, and only the highest applies. Counting two tiers together is the commonest porting defect: on the paper’s own worked example it yields 72.34% instead of 47.22%. MISSING VALUES SUBSTITUTE THE MODEL’S OWN FIGURES rather than being dropped or read as normal: SBP → 120, base excess → 0, oxygenation term → 0.23 (a PIM3 correction; PIM2 used 0). This is the ordinary path, not an edge case, PaO₂ having been missing in 55.8% of the derivation cohort. Systolic BP also carries three coded entries that are not measurements: cardiac arrest at admission → 0, shocked with an unmeasurable BP → 30, unknown → blank, which the model reads as 120. The paired SBP terms are U-shaped with a minimum near 125.6 mmHg, which is how the arrest code acquires its weight, about +2.70 logit against the default.

### Limitations and notes

PIM3 estimates hospital-mortality probability from data at first ICU contact, for unit-level case-mix and SMR benchmarking. The derivation paper states the limit itself: “These models are not intended for prognostic use on individual patients” (Straney 2013). MEASUREMENT WINDOW AND CODING. Use the FIRST value of each variable from first face-to-face ICU-team contact to 1 hour after ICU arrival, not the worst. Pupils count only when both are larger than 3 mm and fixed to bright light; a drug, toxin or direct eye-injury explanation does not count. Ventilated in the first hour covers invasive ventilation, mask or nasal CPAP, BiPAP and negative-pressure ventilation. A tracheostomy breathing spontaneously without support is no, which is an ANZPIC Registry data-entry convention (January 2019 booklet) rather than a rule in the paper, and the paper is silent on the case. Elective means the admission could have been deferred by more than 6 hours without harm. Each of the three diagnosis-tier lists is complete as published and applies to the main reason for admission; if you are unsure, record none. POST-LIVER-TRANSPLANT ADMISSIONS ARE CODED OPPOSITELY BY THE TWO CUSTODIAN REGISTRIES. ANZPICR excludes planned post-transplant recovery from liver failure; PICANet includes it. This score follows ANZPICR, the stricter reading. Both agree that a readmission for graft failure qualifies. AGE. Read the model as applying to children younger than 16. The paper CONTRADICTS itself here, its abstract saying younger than 18 and its inclusion criteria younger than 16, and the contradiction is in the source rather than resolved here. CALIBRATION TRAVELS FAR WORSE THAN DISCRIMINATION. Italy AUC 0.88 with SMR 0.98; Argentina 0.83 with SMR 1.3; South Africa 0.81 with SMR 1.28, its highest SMR of 6.67 falling in the LOWEST-risk decile. The Gulf has its own evidence. Dubai (n = 583): AUC 0.78 with an overall SMR of 0.53, yet SMR 2.1 in SEPSIS, an under-prediction inside an over-predicting unit, and that sepsis signal is the finding that survives its own paper. Riyadh (n = 3,396): sufficient discrimination, poor calibration, worst in infants under 12 months. Newborns are systematically over-predicted, sitting below the SBP nadir, and haemato-oncology admissions are under-predicted, observed mortality 18.73% against 7.13% predicted. Recalibrate and monitor locally before comparative use. DO NOT MIX COEFFICIENT SETS. ANZICS publishes regional recalibrations, PIM3-anz13 and PIM3-anz15, whose coefficients are entirely different. Registry exports use sentinel values, 999 meaning unknown, so any future import path must map them before scoring. PICANet publishes citable plausibility ranges for systolic BP, PaO₂ and base excess; no registry publishes ranges for platelets, bilirubin, creatinine or MAP, because none collects them.

### References

- Straney L, Clements A, Parslow RC, et al; ANZICS Paediatric Study Group and PICANet. Paediatric index of mortality 3: an updated model for predicting mortality in pediatric intensive care. Pediatr Crit Care Med. 2013;14(7):673–681. (PMID 23863821)
  - Derivation paper: the 13 coefficients and intercept (Table 3, p677), the three diagnosis-tier lists with their qualifying rules and the precedence rule, and the variable coding and missing-value conventions (Appendix 1, p680). The ANZICS 'PIM2 & PIM3 for the ANZPIC Registry — Information Booklet (Version Jan 2019)' is a supporting document for registry data entry, and the only source for the rule that a tracheostomy with unassisted spontaneous breathing is not ventilation, a rule the paper does not address. It is grey literature with no DOI and is no longer retrievable at its published URL (HTTP 404), so it is credited here rather than carried as its own reference.
- Wolfler A, Osello R, Gualino J, et al; Italian Network of Pediatric Intensive Care Units. The importance of mortality risk assessment: validation of the Pediatric Index of Mortality 3 score. Pediatr Crit Care Med. 2016;17(3):251–256. (DOI 10.1097/PCC.0000000000000657)
  - Italian multicentre validation: AUC 0.88, SMR 0.98 (Hosmer-Lemeshow p = 0.21). Source for the neonatal over-prediction observed for both PIM2 and PIM3, and for the measured cost of migrating a PIM2 cohort to PIM3 (roughly one admission in eleven changes risk tier).
- Lee OJ, Jung M, Kim M, Yang HK, Cho J. Validation of the Pediatric Index of Mortality 3 in a Single Pediatric Intensive Care Unit in Korea. J Korean Med Sci. 2017;32(2):365–370. (DOI 10.3346/jkms.2017.32.2.365)
  - Independent reproduction of the full PIM3 equation, probability transform, and the risk-diagnosis lists. Source for the haemato-oncology under-prediction (c-index 0.66 against 0.74–0.83 in other subgroups; observed mortality 18.73% against 7.13% predicted).
- Arias López MdP, Fernández AL, Ratto ME, et al. Pediatric Index of Mortality 3: an evaluation of function among ICUs in Argentina. Pediatr Crit Care Med. 2018;19(12):e653–e661. (DOI 10.1097/PCC.0000000000001741)
  - Argentine multicentre evaluation: AUC 0.83, SMR 1.3, Hosmer-Lemeshow p < 0.001. Source for the observation that HIV infection and post-liver-transplant admission — both dropped from the model as non-predictive in the derivation population — remain associated with higher mortality in a resource-varied setting.
- Solomon LJ, Morrow BM, Argent AC. Paediatric Index of Mortality scores: an evaluation of function in the Paediatric Intensive Care Units of a South African province. Pediatr Crit Care Med. 2021;22(9):813–821. (DOI 10.1097/PCC.0000000000002693)
  - South African multicentre evaluation: AUC 0.81, SMR 1.28, Hosmer-Lemeshow p < 0.001, with the highest SMR (6.67) in the LOWEST risk decile. The closest published comparator for deployment in a resource-varied setting, being the only multicentre evaluation of PIM3 in one.
- Baloglu O, Nagy LR, Sonawane A, et al. Simplified Pediatric Index of Mortality 3 score by explainable machine learning algorithm. Crit Care Explor. 2021;3(10):e0561. (DOI 10.1097/CCE.0000000000000561)
  - Source for the scale of real-world missingness in the PIM3 blood-gas inputs: base excess missing in 97.2% and the oxygenation ratio in 97.3% of a single-centre US series — the reason the imputation path is the ordinary path rather than an edge case.
- Malhotra D, Nour N, El Halik M, Zidan M. Performance of Pediatric Index of Mortality 3 score in a tertiary pediatric ICU in Dubai. Dubai Med J. 2019;3(1):19–25. (DOI 10.1159/000505205)
  - Latifa Hospital, Dubai; single centre, n = 583 with 46 deaths (7.9%). Three findings are stable and are what this page rests on: AUC 0.78 (95% CI 0.69–0.87), an overall SMR of 0.53 — the model OVER-predicted deaths across the unit — and SMR 2.1 in the sepsis subgroup, an UNDER-prediction that nothing else in the paper contradicts. Its predicted-probability strata do contradict each other and are carried as unstable rather than as a finding: SMR 2.67 in the 1–5% band (severe under-prediction) against SMR 0.33 below a predicted probability of 14.3% and 0.72 above it (over-prediction across that same low range). Both cuts are this study's own, so neither direction can be asserted for the low end of the scale.
- Alkhalifah AS, AlSoqati A, Zahraa J. Performance of pediatric risk of mortality III and pediatric index of mortality scores in a tertiary pediatric intensive care unit in Saudi Arabia. Front Pediatr. 2022;10:926686. (DOI 10.3389/fped.2022.926686)
  - King Fahad Medical City, Riyadh; n = 3396, children under 14. The models it evaluated had, in its own words, 'sufficient discrimination ability and poor calibration', and both the worst calibration and the worst discrimination were in infants under 12 months. The one per-model figure carried here is PRISM III's (best in the 60–120-month band, AUC 0.87); no PIM3-specific statistic from this study is asserted, because none was captured in the review that supplied it.

### Rights

**freely-reproducible** — The formula, its 13 coefficients, the intercept, the logistic transform and the tier-precedence rule are mathematical facts / a method and are freely implementable (pim3.md IP status). Which conditions sit in which risk tier is likewise a fact and is used; the condition names are ordinary clinical terms. The paper's and the ANZICS booklet's descriptive prose — the qualifying rules, the pupil descriptor and the SBP special-value instructions — is paraphrased in this project's own words rather than transcribed (pim3.md IP FLAG).

---

## PaO₂/FiO₂ ratio (P/F)

<a id="pf-ratio"></a>

`pf-ratio` · v1.1.0 · published · respiratory

### Inputs

- **Arterial oxygen tension (PaO₂)** — numeric, mmHg / kPa, accepts 10 to 700, required
  - Help: From an arterial blood gas. Accepts mmHg or kPa.
- **Fraction of inspired oxygen (FiO₂)** — numeric, fraction / %, accepts 0.21 to 1, required
  - Help: Room air is 0.21. Accepts a fraction or a percentage.

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `pf_ratio` | [-inf, 100] | ≤ 100 | Corresponds to the severe category in the Berlin ARDS definition (with PEEP or CPAP ≥ 5 cm H₂O). |
| `pf_ratio` | (100, 200] | > 100 to ≤ 200 | Corresponds to the moderate category in the Berlin ARDS definition (with PEEP or CPAP ≥ 5 cm H₂O). |
| `pf_ratio` | (200, 300] | > 200 to ≤ 300 | Corresponds to the mild category in the Berlin ARDS definition (with PEEP or CPAP ≥ 5 cm H₂O). |
| `pf_ratio` | (300, +inf) | > 300 | Above the Berlin ARDS oxygenation threshold. Interpret in the full clinical context. |

### How it is calculated

P/F = PaO₂ in mmHg ÷ FiO₂ as a fraction from 0.21 to 1.0. A PaO₂ entered in kPa converts at 1 kPa = 7.50062 mmHg. The ratio is displayed rounded to a whole number, but the bands are matched against the unrounded ratio. Bands follow the Berlin (2012) ARDS severity strata: ≤ 100 severe, > 100 to ≤ 200 moderate, > 200 to ≤ 300 mild, and > 300 above the ARDS oxygenation threshold.

### Limitations and notes

The Berlin bands are adult bands and require PEEP or CPAP ≥ 5 cm H₂O. In children, PALICC-2 grades invasive-ventilation severity by oxygenation index (OI/OSI) rather than P/F, and uses P/F on non-invasive support. Berlin mortality figures are population associations.

### References

- ARDS Definition Task Force; Ranieri VM, et al. Acute respiratory distress syndrome: the Berlin Definition. JAMA. 2012;307(23):2526–2533. (PMID 22797452)
- Emeriaud G, et al. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168. (PMID 36661420)

### Rights

**freely-reproducible** — Arithmetic ratio; Berlin/PALICC-2 numeric thresholds are facts, not copyrightable expression (pf-sf.md IP status).

---

## Pediatric burn fluid resuscitation (Parkland / modified Brooke)

<a id="burn-resuscitation"></a>

`burn-resuscitation` · v1.0.0 · published · fluids-resuscitation

### Inputs

- **Body weight** — numeric, kg / lb / g, accepts 0.5 to 150, required
  - Help: Pediatric weight in kg (accepts lb or g). Drives the crystalloid dose and the Holliday-Segar maintenance volume. Below about 4 kg the maintenance figure is outside the scope of the standalone maintenance calculator on this site and must be replaced by a neonatal regimen — the resuscitation figures are unaffected. See cautions.
- **%TBSA burned (2nd + 3rd degree)** — numeric, %, accepts 0 to 100, required
  - Help: Percent total body surface area with partial- or full-thickness burn, estimated by the Lund-Browder chart in children (NOT the Rule of Nines). Superficial/erythema is excluded.
- **Time elapsed since the burn** — numeric, h / min, accepts 0 to 24, optional
  - Help: Hours since the BURN, not since arrival — the eight-hour phase is timed from injury, so a child who took three hours to reach you has five hours left in it, not eight. Accepts minutes, which is usually the easier subtraction from a clock time. Enter this together with fluid already given to get infusion rates.
- **Resuscitation fluid already given** — numeric, L / mL, accepts 0 to 10, optional
  - Help: Resuscitation crystalloid given since the burn, from all sources including pre-hospital and the referring hospital — not maintenance, not blood, not the fluid used to carry drugs. Enter 0 if none. This is subtracted from the first-eight-hour allocation only.

### Interpretation bands

_None declared._

### Cautions

> The 3 mL/kg/%TBSA coefficient is paediatric convention with no primary derivation in the 2016-2026 window. Starting coefficients across five ABA-verified paediatric burn centres run 2 to 4 with no modal value, and for the same 25 kg child with a 20% TBSA burn the centre estimates span 1500 to 3560 mL. This score returns the bottom of that spread, 1500 mL, or 3100 mL with maintenance added. Delivered volumes cluster near 6.35 mL/kg/%TBSA. Treat every output as a starting estimate to titrate, never a fixed prescription.

### How it is calculated

24-hour resuscitation crystalloid (lactated Ringer’s) = 3 mL x weight (kg) x %TBSA. Pediatric Parkland and pediatric modified Brooke both use 3; the adult coefficients, 4 and 2, are deliberately not emitted. Give half in the first 8 h, timed from the burn, and the rest over the next 16 h. Holliday-Segar maintenance (100/50/20) is added on top at every weight, so the combined total is resuscitation plus maintenance. %TBSA counts 2nd- and 3rd-degree burn only, estimated by the age-adjusted Lund-Browder chart in children, never the Rule of Nines.

### Limitations and notes

INPUTS AND RATES. Weight 0.5 to 150 kg; %TBSA 0 to 100; optional time since burn (0 to 24 h) and resuscitation fluid already given (0 to 10 L, all sources including pre-hospital, not maintenance, blood, or drug carriers). Supply BOTH optional inputs to get infusion rates. Pre-arrival fluid is deducted from the first-8-h allocation only, a founder decision of 2026-08-08, where the alternative deducts from the 24-h total; the remainder is spread over the hours left in each phase. Past 8 h no first-phase rate is emitted, and the remaining volume persists as a shortfall, since concealing that a child is behind is the more dangerous silence. Neither input alone produces a rate: defaulting fluid-given to zero would print a confident rate for a child arriving with a litre already run. THE CLOCK RUNS FROM INJURY, NOT ARRIVAL. A child arriving 3 h post-burn has 5 h of the first phase left, and late presentation compresses the rate, not the volume. THE COEFFICIENT IS CONVENTION. The 3 mL/kg/%TBSA coefficient is paediatric convention with no primary derivation in the 2016-2026 window. Starting coefficients across five ABA-verified paediatric burn centres run 2 to 4 with no modal value, and for the same 25 kg child with a 20% TBSA burn the centre estimates span 1500 to 3560 mL. This score returns the bottom of that spread, 1500 mL, or 3100 mL with maintenance. NO INHALATION MODIFIER IS APPLIED HERE: protocols that escalate for inhalation injury run as high as 6 mL/kg/%TBSA, and this score emits the unmodified coefficient, so that adjustment has to be made outside it. Delivered volumes cluster near 6.35 mL/kg/%TBSA. Treat every output as a starting estimate to titrate, never a fixed prescription. MAINTENANCE BELOW ABOUT 4 kg. The Holliday-Segar line over-estimates a term neonate, and over-estimating maintenance compounds fluid creep in the patient least able to absorb it. The two resuscitation figures are unaffected. Replace the maintenance line, and the combined total containing it, with the unit’s neonatal regimen before prescribing. This calculator accepts from 0.5 kg on purpose so a burned neonate is never refused. THE MAINTENANCE WEIGHT THRESHOLD. Maintenance is added at every weight here, which is the AWMF 2024 structure. Published centre practice spans below 20 kg to below 40 kg, or age under 1 year, or none at all, and the circulating 30 kg figure is the ABA position as the weight below which maintenance is added. No derivation exists for any of them, so follow local protocol where it differs. THE 8-H/16-H SPLIT derives from a canine experiment, Baxter & Shires 1968, read from the source: 50% TBSA flame-burn dogs, with plasma volume and functional extracellular fluid as the endpoints, and on its own figures the first 8 h carried two-thirds, not half. No human or paediatric re-derivation exists, and no guideline states the split. Titrate to the patient, not to the fraction. UNDER-RESUSCITATION IS A REAL FAILURE DIRECTION TOO. In the German Burn Registry (407 children, 30 centres) 86.5% received less than Parkland plus maintenance, and six of the seven deaths were under-resuscitated relative to it. Effect estimates are weak, so no warning threshold is built on either direction. URINE-OUTPUT TARGETS GENUINELY DISAGREE: children commonly 1.0 to 1.5 mL/kg/h, infants about 1 to 2, adults about 0.5, one published protocol 0.3 to 0.7 above 30 kg, and AWMF bands by developmental stage instead of weight. The optimal paediatric goal is settled-absent. AWMF Empfehlung 10, by consensus, is not to initially exceed 10 mL/kg/h in children with 10% TBSA or more; that is stated here, not enforced. Read urine output with blood pressure, lactate, and the clinical state. Oliguria in intra-abdominal hypertension is not hypovolaemia. NO PAEDIATRIC GUIDELINE COVERS THE STARTING RATE. The 2024 ABA CPG, whose adult starting rate is 2 mL/kg/%TBSA, scopes itself to adults with 20% TBSA or more. No paediatric equivalent exists, which is settled-absent, and ABRUPT’s delivered 4.6 mL/kg/%TBSA in 379 adults contradicts the 2 within the same organisation. Neither licenses a paediatric coefficient. THE LUND-BROWDER CHART ships as verified data, 19 segments across 6 age bands, after Lund & Browder 1944 as reproduced in the 2025 JTS worksheets. Every column sums to exactly 100, which most circulating charts do not: the common 101% chart traces to a typographic hand-value error. It does not account for obesity, breast tissue, pregnancy, or amputation, and simple erythema is excluded from %TBSA.

### References

- Baxter CR, Shires T. Physiological response to crystalloid resuscitation of severe burns. Ann N Y Acad Sci. 1968;150(3):874-894. (The Parkland primary. p883 derives the eight-hour/sixteen-hour schedule experimentally: in a 50% TBSA flame-burn canine model the best plasma-volume and functional-extracellular-fluid response came from 16-20% of body weight in the first eight hours after the burn, at 20 cc/kg/h, maintained with a further 8-10% of body weight as lactated Ringer's, at 5 cc/kg/h, across the next sixteen. A figure legend on the same page describes a treatment schedule split the same way.) (DOI 10.1111/j.1749-6632.1968.tb14738.x)
  - PRIMARY SOURCE — not a secondary review, a restatement or a review finding, and that distinction is the point, because this is where the two-phase split is actually derived rather than merely repeated. Three qualifications travel with it and must not be dropped: the derivation is in DOGS at 50% TBSA flame burn with plasma volume and functional extracellular fluid as the endpoints, not a human outcome trial and not paediatric; the doses are expressed as PERCENT OF BODY WEIGHT, not as mL/kg/%TBSA, so the paper fixes the two-phase shape of the schedule and not the coefficient this calculator uses; and on the paper's own figures the first eight hours carry two-thirds of the 24-hour volume, not the half in clinical use.
- Mehta M, Tudor GJ. Burn Fluid Resuscitation. StatPearls Publishing; updated 2023. (Parkland peds 3 mL, modified Brooke adult 2/peds 3 mL, LR, half in first 8 h, Lund-Browder, urine-output targets.) (https://www.ncbi.nlm.nih.gov/books/NBK534227/)
- Baartmans MG, et al. Parkland Formula. StatPearls Publishing. (4 mL adult / 3 mL pediatric; half in first 8 h from injury; pediatric maintenance addition; urine 1.0-1.5 mL/kg/h in children.) (https://www.ncbi.nlm.nih.gov/books/NBK537190/)
- Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics. 1957;19(5):823-832. (100/50/20 mL/kg/day maintenance.) (PMID 13431307)
- Romanowski KS, Palmieri TL. Pediatric burn resuscitation: past, present, and future. Burns Trauma. 2017;5:26. (Pediatric maintenance addition; dextrose for infants; SA-based formulas.) (PMID 28879205)
- Cartotto R, Johnson LS, Savetamal A, et al. American Burn Association Clinical Practice Guidelines on Burn Shock Resuscitation. J Burn Care Res. 2024;45(3):565-589. (Adult starting rate 2 mL/kg/%TBSA to counter fluid creep; UOP 0.5 mL/kg/h; scope adults >=20% TBSA.) (PMID 38051821)
- Institutional pediatric burn protocol assessment (modified Parkland 3 mL/%TBSA/kg/day; resuscitation triggers TBSA >=15% if <10 kg, >=20% if >=10 kg; mean UOP 1.74 mL/kg/h). J Burn Care Res 2025 abstract. (https://pmc.ncbi.nlm.nih.gov/articles/PMC11958416/)
- US Department of Defense, Joint Trauma System. Burn Care Clinical Practice Guideline (CPG ID 12), Lund Browder Burn Estimate & Diagram worksheets: Infant (July 2025), Pediatric (June 2025), Adult (June 2025). Dated modern reproduction of the Lund-Browder chart and the source of the exact per-segment percentages shipped here; the adult worksheet prints a column total of 100, which is what makes the arithmetic self-checking. (https://jts.health.mil/index.cfm/CPGs/cpgs)
  - Provenance, fact by fact, because these did not come from one place. (1) The per-segment percentages and the three worksheet dates above are the ones recorded in this project's implementation reference note (docs/research/scores/burn-resuscitation.md) from the three JTS worksheets; they are FORM dates, not the CPG's. (2) The guideline identifier and its own date — Burn Care, CPG ID 12, dated 10 June 2025 — come from the JTS CPG index at jts.health.mil on 2026-08-03; that reference note carries no CPG-level date, so this one is not sourced from it. (3) The chart of record is Lund CC, Browder NC, 'The estimation of areas of burns', Surg Gynecol Obstet 1944;79:352-358. That paper was NOT obtained — the volume is not digitised in a reachable open repository — so the values here are attributed 'after Lund & Browder (1944), as reproduced in the JTS worksheets', never to the 1944 original directly, and whether the 19-row tabular layout is a 1944 artefact or a later worksheet reformatting is unconfirmed.
- Lundin K, Alsbjorn B. The 101 percent in Lund-Browder charts - a commentary. Burns. 2013;39(4):819-820. (Traces the widely circulated 101% charts to a typographic error: one aspect of each hand is 1.25%, not 1.5%, so each hand is 2.5% and not 3%.) (PMID 22980775)
- Murari A, Singh KN. Lund and Browder chart - modified versus original: a comparative study. Acute Crit Care. 2019;34(4):276-281. (Open access; restates the 101% defect and the chart's clinimetric limitations.) (DOI 10.4266/acc.2019.00647)
- Greenhalgh DG, Cartotto R, Taylor SL, et al. Burn resuscitation practices in North America: results of the Acute Burn ResUscitation Multicenter Prospective Trial (ABRUPT). Ann Surg. 2023;277(3):512-519. (379 adults >=20% TBSA across 21 centres; 24-h delivered volume 4.6 +/- 2.2 mL/kg/%TBSA; time 0 is the time of injury; mean 1553 +/- 1782 mL already given before arrival; states 4 mL/kg/%TBSA is accurate and a 2 mL/kg/%TBSA goal may not be feasible.) (DOI 10.1097/SLA.0000000000005166)
  - Cited here for the controversy it creates with the 2024 ABA CPG, not to settle it. Adult data; it licenses no paediatric coefficient.
- Pisano C, Fabia R, Shi J, et al. Variation in acute fluid resuscitation among pediatric burn centers. Burns. 2021;47(3):545-550. (Table 2 tabulates five ABA-verified paediatric burn centres plus the ABA column: maintenance IV fluid initiated below 30 kg per ABA, 20-40 kg across centres, one centre by age <1 year; source of the 25 kg / 20% TBSA five-centre spread of 1500-3560 mL.) (DOI 10.1016/j.burns.2020.04.013)
- Vasileiadis V, Najem S, Reinshagen K, et al. Fluid management and outcomes in children with burns, German Burn Registry 2015-2022. Eur J Pediatr. 2024;183:5479-5488. (407 children <16 y with >=15% TBSA across 30 centres; 86.5% received less than Parkland plus Holliday-Segar maintenance; six of the seven children who died were under-resuscitated.) (DOI 10.1007/s00431-024-05797-9)
- Stevens JV, Prieto NS, Ridelman E, et al. Weight-based versus body surface area-based fluid resuscitation predictions in pediatric burn patients. Burns. 2023;49(1):120-128. (110 children; Galveston underpredicts delivered volume; Fig. A.1 gives the Children's Hospital of Michigan algorithm with its time-of-injury clock, pre-arrival subtraction step and urine targets of 0.8-1.2 mL/kg/h at <=30 kg and 0.3-0.7 mL/kg/h above it.) (DOI 10.1016/j.burns.2022.03.007)
- Palmieri TL, et al. Fluid Resuscitation of Severely Burned Children. ePlasty (PMC11166384). (States the adult 2 and 4 mL/kg/%TBSA coefficients, then that children require approximately 6 mL/kg/%TBSA burned, and that single-figure adult formulas may omit maintenance and 'underestimate needs in small children and overhydrate large children'.) (https://pmc.ncbi.nlm.nih.gov/articles/PMC11166384/)
  - NOT A RIVAL COEFFICIENT, and the most tempting way to misread it. Its approximately 6 looks like a contradiction of the 3 mL/kg/%TBSA this score emits — two paediatric figures differing by a factor of two, with the objection running toward UNDER-resuscitation of small children. That reading is wrong. Its approximately 6 is a TOTAL 24-hour volume including maintenance, restating Graves 1988, whose own recommendation is to supply maintenance and initiate resuscitation at 3. What this reference does establish, and what it is cited for, is the clause quoted above: a SINGLE-FIGURE formula underestimates small children and overhydrates large ones — which is an argument for the two-part maintenance-plus-resuscitation shape this score already implements, and against applying any flat single figure (including 6) at every weight.
- Graves TA, Cioffi WG, McManus WF, Mason AD Jr, Pruitt BA Jr. Fluid resuscitation of infants and children with massive thermal injury. J Trauma. 1988;28(12):1656-1659. (43 children aged 1.5-108 months, 25-89% TBSB, all <=25 kg. Average TOTAL 24-h fluid 6.3 +/- 2.2 cc/kg/%TBSB; NET resuscitation fluid, i.e. total minus calculated maintenance, 3.91 +/- 2.2 cc/kg/%TBSB. Recommends supplying maintenance volume and initiating burn resuscitation at 3 cc/kg/%TBSB.) (PMID 3199467)
  - SCOPE — only the two summary figures and the recommendation sentence are claimed from this reference, and nothing beyond them. THIS IS THE REFERENCE THAT RESOLVES THE APPARENT 3-VERSUS-6 CONFLICT, because it reports both numbers from one cohort and names which is which: 6.3 is the TOTAL, 3.91 the resuscitation component after maintenance is removed. It is also the source that vindicates this score's structure rather than merely permitting it — maintenance supplied, resuscitation initiated at 3, which is what `calculate` emits. Pre-window (1988) by the 2016-2026 review's rule, so it is a primary of record, not in-window evidence.
- Merrell SW, Saffle JR, Sullivan JJ, Navar PD, Kravitz M, Warden GD. Fluid resuscitation in thermally injured children. Am J Surg. 1986;152(6):664-669. (177 children, mean burn 27% TBSA; mean TOTAL 24-h fluid 5.8 +/- 0.25 mL/kg/%TBSA.) (PMID 3789292)
  - Carried for one purpose: independent corroboration that the ~6 mL/kg/%TBSA figure circulating for children is a TOTAL delivered volume and not a resuscitation coefficient, which is what makes it consistent with Graves' 3 plus maintenance rather than a rival to it.
- Cartotto RC, Innes M, Musgrave MA, et al. How well does the Parkland formula estimate actual fluid resuscitation volumes? J Burn Care Rehabil. 2002;23(4):258-265. (n=31 adults >=15% TBSA; actual 24-h volume 6.7 +/- 2.8 mL/kg/%TBSA, exceeding the Parkland prediction in 84%; after the first 8 hours the infusion rate decreased 34% in 16 patients and increased 47% in 15, two-way ANOVA P<0.001.) (PMID 12142578)
  - ADULT, single centre, n=31, and PRE-WINDOW (2002) — it licenses nothing paediatric and is not in-window evidence. Carried for one fact only: the change in infusion rate at the 8-hour mark is BIDIRECTIONAL and patient-dependent, which is what falsifies reading the printed first-8-hour figure as a description of delivery. It is the only measurement of the two phases' behaviour this review located, and that scarcity is itself recorded as a settled absence.
- DGKCH, DGV, DGKJ, et al. Behandlung thermischer Verletzungen im Kindesalter. AWMF S2k-Leitlinie 006/128, Version 3.0, 15.08.2024 (valid to 14.08.2029). (Holliday-Segar maintenance for ALL children with no weight threshold; an added burn requirement of 3-4 mL/kg/%TBSA from 15% TBSA; urine 1-2 mL/kg/h in infants and toddlers and 0.5-1 mL/kg/h at school age; Empfehlung 10, 12/12 consensus, do not initially exceed 10 mL/kg/h; all fluid statements graded expert consensus, evidence level IV.) (https://register.awmf.org/de/leitlinien/detail/006-128)
  - The authoritative locator is the AWMF register number 006/128 with version 3.0 dated 15.08.2024; the URL is the register's detail page for that number.

### Rights

**freely-reproducible** — Parkland, modified Brooke, and Holliday-Segar are arithmetic formulas built from coefficients (3 mL/kg/%TBSA; 100/50/20 mL/kg/day) and the 8h/16h split — facts, not copyrightable expression. No proprietary scale wording is reproduced (burn-resuscitation.md IP status). The Lund-Browder chart is reproduced as numbers only: the per-segment percentages are facts, while the chart's body diagrams and the JTS worksheet layout are expression and are not copied, and every segment label is this project's own anatomical wording.

---

## Pediatric Glasgow Coma Scale (pGCS)

<a id="pediatric-gcs"></a>

`pediatric-gcs` · v1.0.0 · published · general

### Inputs

- **Eye-opening response** — choice of 4, required
  - _Opens eyes on their own, without prompting (4)_
  - _Opens eyes when spoken to (3)_
  - _Opens eyes only to a painful stimulus (2)_
  - _Does not open eyes (1)_
  - Help: Score the best observed eye-opening response. Wording is the same for all ages.
- **Verbal / vocal response** — choice of 5, required
  - _Age-appropriate best response: oriented speech, or coos/babbles as usual (5)_
  - _Confused speech, or irritable / less-than-usual crying (4)_
  - _Inappropriate words, or cries to pain (3)_
  - _Incomprehensible sounds, or moans to pain (2)_
  - _No verbal or vocal response (1)_
  - Help: Score the best age-appropriate response. Each level pairs the verbal-child descriptor with its infant/preverbal equivalent — apply the one matching the child's developmental band.
- **Motor response** — choice of 6, required
  - _Obeys commands, or moves spontaneously and purposefully (6)_
  - _Localizes a painful stimulus, or withdraws to touch (5)_
  - _Withdraws from a painful stimulus (4)_
  - _Abnormal flexion to pain (decorticate posturing) (3)_
  - _Abnormal extension to pain (decerebrate posturing) (2)_
  - _No motor response (1)_
  - Help: Score the best age-appropriate motor response. Each level pairs the verbal-child descriptor with its infant/preverbal equivalent.

### Composition

Total `pgcs_total`, made of:

- `eye` — 1 to 4
- `verbal` — 1 to 5
- `motor` — 1 to 6

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `pgcs_total` | [-inf, 9) | 3 to 8 | Conventionally categorized as the 'severe' range in GCS-based TBI severity stratification. This tri-band originated in adult work; pediatric literature notes a threshold of 5 or less may identify severe injury more accurately in young children. |
| `pgcs_total` | [9, 13) | 9 to 12 | Conventionally categorized as the 'moderate' range in GCS-based TBI severity stratification. Descriptive only; interpret in the full clinical context. |
| `pgcs_total` | [13, +inf) | 13 to 15 | Conventionally categorized as the 'mild' range in GCS-based TBI severity stratification. A reassuring total does not rule out intracranial injury, which is a documented limitation in infants. |

### How it is calculated

Total = E (1–4) + V (1–5) + M (1–6), each component scored as the best observed age-appropriate response, giving a range of 3–15. No zero exists. Each verbal and motor level pairs the verbal-child descriptor with its infant or preverbal equivalent, and the option labels here are neutral paraphrases; GCS wording is stewarded by RCPS Glasgow / Teasdale. The total is read against the conventional TBI tri-band, which is adult-derived: 3–8 severe, 9–12 moderate, 13–15 mild.

### Limitations and notes

Paediatric literature notes that a total of 5 or less may identify severe injury more accurately in young children, and a reassuring total does not rule out intracranial injury in infants. Two lineages with different age cutoffs exist: James/PECARN (preverbal <2 y vs ≥2 y) and BPNA ‘Child’s GCS’ (<5 y vs >5 y). Totals are not comparable across schemes unless the scheme and age band are recorded with each score. Intubation breaks the plain sum: BPNA records V as a non-numeric ‘T’ (hence the grimace score, Tatman 1997), while some US practice records V=1 with a ‘T’ suffix. This score computes a plain E+V+M and does not model ‘T’. [NEEDS SOURCE]: no canonical rule for numerically substituting V=1 in the James/PECARN branch. Sedation or paralysis makes V and M uninformative; flag such scores.

### References

- Teasdale G, Jennett B. Assessment of coma and impaired consciousness. A practical scale. Lancet. 1974;2(7872):81–84. (PMID 4136544)
  - Original adult GCS: source of the ordinal levels, the E+V+M sum (3–15), and the best-response rule.
- Reilly PL, Simpson DA, Sprod R, Thomas L. Assessing the conscious level in infants and young children: a paediatric version of the Glasgow Coma Scale. Childs Nerv Syst. 1988;4(1):30–33. (PMID 3135935)
  - Adelaide paediatric adaptation with age-related expected responses.
- James HE. Neurologic evaluation and support in the child with an acute brain insult. Pediatr Ann. 1986;15(1):16–22. (PMID 3951884)
  - James adaptation (the 'J' in JGCS); James/PECARN lineage.
- Tatman A, Warren A, Williams A, Powell JE, Whitehouse W. Development of a modified paediatric coma scale in intensive care clinical practice. Arch Dis Child. 1997;77(6):519–521. (PMID 9496188)
  - Grimace score for intubated children (no verbal score); feeds the BPNA revision.
- British Paediatric Neurology Association. Child's Glasgow Coma Scale (Revised BPNA 2001). Audit chart. (https://bpna.org.uk/audit/GCS.PDF)
  - UK standard scale; <5 y vs >5 y bands, plus the 'C' (eyes closed) and 'T' (intubated) non-numeric codes.
- Holmes JF, Palchak MJ, MacFarlane T, Kuppermann N. Performance of the pediatric Glasgow Coma Scale in children with blunt head trauma. Acad Emerg Med. 2005;12(9):814–819. (PMID 16141014)
  - First validation; <2 y age cut-off for the pediatric column.
- Borgialli DA, Mahajan P, Hoyle JD Jr, et al; PECARN. Performance of the Pediatric Glasgow Coma Scale Score in the Evaluation of Children With Blunt Head Trauma. Acad Emerg Med. 2016;23(8):878–884. (PMID 27197686)
  - Large PECARN validation (n=42,041); <2 y vs ≥2 y split.
- Jain S, Iverson LM. Glasgow Coma Scale. StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing. (https://www.ncbi.nlm.nih.gov/books/NBK513298/)
  - Secondary reference: James/PECARN descriptor layout, <2 y vs >2 y age cut-off, and the 13–15/9–12/3–8 severity tri-band.

### Rights

**freely-reproducible** — The scoring math is an ordinal sum (E+V+M, 3–15) — a method/idea, not copyrightable expression. The numeric levels and severity thresholds are facts. GCS descriptor wording is stewarded by the Royal College of Physicians and Surgeons of Glasgow (associated with Sir Graham Teasdale) via glasgowcomascale.org; pediatric descriptors are reproduced freely across open sources (StatPearls NBK513298, CHOP pathway, BPNA audit chart). This implementation uses NEUTRAL PARAPHRASES rather than verbatim stewarded wording and attributes stewardship here and in notes (pgcs.md IP status).

---

## Pediatric Risk of Mortality (PRISM III and PRISM IV)

<a id="prism"></a>

`prism` · v1.0.0 · published · mortality-severity · blank scores as normal · interpretation not-applicable

### Inputs

**Assessment**

- **Model, by the data you collected** — choice of 2, required
  - _PRISM IV (score and mortality probability)_
  - _PRISM III (severity score only)_
  - Help: CHOOSE BY THE DATA YOU HAVE, NOT BY THE OUTPUT YOU WANT. The two options are two models with two different collection periods, and each is only valid on the data it was built for. Scoring a 12-hour dataset as PRISM IV does not give you a probability for that patient; it gives you a probability computed from variables gathered over the wrong period. WHAT TO COLLECT, AND OVER WHAT PERIOD — this is the part that changes your answer. Enter the single most abnormal value reached inside the period for each variable: the lowest, the highest, or both where a row asks for both. PRISM IV — FIRST 4 HOURS: physiologic variables from the first 4 hours of PICU care ONLY, and laboratory variables from 2 hours BEFORE PICU admission through the first 4 hours. The two halves have different windows and the laboratory one starts before the child arrives — a gas or a chemistry drawn in the referring unit two hours out counts, while a blood pressure from the same moment does not. That split is the authors’ own (Pollack 2013, the ideal-time-interval study) and is exactly how their CPCCRN calculator states it. PRISM III — FIRST 12 OR 24 HOURS: the most abnormal value for each variable within the period you collected, whether that was the first 12 hours of PICU care or the first 24. THE 12- AND 24-HOUR COLLECTIONS ARE ONE OPTION HERE, and it is worth knowing why rather than assuming a field was lost. The SCORE is computed identically for both — same seventeen variables, same age bands, same cut-points — so no choice you could make between them would change a number on this page. What the published literature separates as PRISM III-12 and PRISM III-24 are two MORTALITY MODELS, with different coefficients and different calibration, and this platform ships neither: those equations are not in the source article and are separately licensed. Offering a choice whose only consequence has been removed would suggest the choice still does something. BUT THE PERIOD YOU COLLECTED STILL MATTERS TO HOW THE NUMBER READS. A longer period usually produces a HIGHER score, because it catches more extreme values, never because the arithmetic differs — so a PRISM III collected over 24 hours and one collected over 12 are not directly comparable, and a series should hold the period constant. Record which you used alongside the score if that comparison matters to you. WHAT THE CHOICE DECIDES is whether a mortality estimate can be shown. PRISM IV’s equation is published in full and is shown here, and it produces a probability only once all four admission-context questions have been answered — leave any of them blank and the score still appears while the probability is withheld, because a blank is not an answer of "no". PRISM III gives the score and its two subscores and no probability, because its mortality equations are not published in the source article and are separately licensed. The four admission-context questions belong to PRISM IV alone, so they are asked ONLY when PRISM IV is selected and are not shown at all under PRISM III — they are not hidden answers being ignored, they are questions with no destination there.
- **Age** — numeric, years / months / days, accepts 0 to 18, required
  - Help: Sets the age band for blood pressure, heart rate, creatinine, BUN and PTT, and is separately a term in the PRISM IV equation. PRISM III bands: neonate under 1 month, infant 1 to under 12 months, child 12 months to under 12 years, adolescent 12 years and over.
**Cardiovascular**

- **Systolic blood pressure (lowest)** — numeric, mmHg / kPa, accepts 0 to 300, optional
  - Help: The lowest value recorded in the window.
- **Temperature (lowest)** — numeric, °C, accepts 20 to 45, optional
  - Help: Rectal, oral, blood or axillary. Under 33 °C scores 3; a patient with both a low and a high excursion still scores 3 once, not twice.
- **Temperature (highest)** — numeric, °C, accepts 20 to 45, optional
  - Help: Above 40.0 °C scores 3, on the same single row.
**Neurological**

- **Glasgow Coma Scale (lowest)** — numeric, no unit, accepts 3 to 15, optional
  - Help: Enter ONLY for a patient with known or suspected acute CNS disease; leave blank otherwise. Do not assess within 2 hours of sedation, paralysis or anaesthesia — use the closest period free of them. Under 8 scores 5. One of the two neurologic items.
- **Pupillary reflexes** — choice of 3, required
  - _Both reactive_
  - _One fixed, one reactive_
  - _Both fixed_
  - Help: A non-reactive pupil must be larger than 3 mm. Do not assess after iatrogenic dilation. At 11 points this is the heaviest single item in the score, and the other neurologic item.
**Cardiovascular**

- **Heart rate (highest)** — numeric, bpm, accepts 0 to 350, optional
  - Help: Do not assess during crying or iatrogenic agitation. Thresholds are age-banded.
**Acid–base and blood gas**

- **pH (lowest)** — numeric, no unit, accepts 6.5 to 8, optional
  - Help: Arterial, capillary or venous. Shares one row with the lowest total CO₂ — whichever is worse scores once, never both.
- **pH (highest)** — numeric, no unit, accepts 6.5 to 8, optional
  - Help: A separate row from the lowest pH, and both can score in the same patient: the source is explicit that points may be assigned for the low and the high ranges together.
- **Total CO₂ (lowest)** — numeric, mmol/L, accepts 0 to 60, optional
  - Help: Total CO₂ or bicarbonate. Use a calculated bicarbonate from a blood gas only if total CO₂ is not measured routinely.
- **Total CO₂ (highest)** — numeric, mmol/L, accepts 0 to 60, optional
  - Help: Above 34.0 scores 4, independently of the lowest value's row.
- **PCO₂ (highest)** — numeric, mmHg / kPa, accepts 0 to 200, optional
  - Help: Arterial, capillary or venous.
- **PaO₂ (lowest)** — numeric, mmHg / kPa, accepts 0 to 700, optional
  - Help: Arterial measurements only.
**Chemistry**

- **Glucose (highest)** — numeric, mg/dL / mmol/L, accepts 0 to 1500, optional
  - Help: Above 200 mg/dL scores 2 — in SI units, above 11.11 mmol/L (the cutoff is 200 ÷ 18, so 11.1 does not score and 11.2 does). The comparison is made in mg/dL after conversion, because that is the unit the source table is printed in. A whole-blood value should be increased by 10% before scoring.
- **Potassium (highest)** — numeric, mEq/L / mmol/L, accepts 0 to 15, optional
  - Help: Above 6.9 scores 3. A whole-blood value should be increased by 0.4 mmol/L before scoring.
- **Creatinine (highest)** — numeric, mg/dL / µmol/L, accepts 0 to 25, optional
  - Help: Age-banded; infant and child share one cutoff. Scores 2 above 0.85 mg/dL (neonate), 0.9 (infant and child) or 1.3 (adolescent) — approximately 75, 80 and 115 µmol/L. The comparison is made in mg/dL after conversion, and a value entered in µmol/L is rounded to 2 decimal places on the way, so a µmol reading sitting exactly on a cutoff (115 µmol/L becomes 1.30 mg/dL) does not score, while 1.301 mg/dL entered directly does. The published SI columns are themselves rounded, so treat either unit as a knife-edge at the boundary rather than as an exact equivalence.
- **Blood urea nitrogen (highest)** — numeric, mg/dL / mmol/L, accepts 0 to 300, optional
  - Help: A two-band split only: neonates above 11.9 mg/dL, everyone else above 14.9.
**Haematology**

- **White blood cell count (lowest)** — numeric, cells/mm³, accepts 0 to 200000, optional
  - Help: Only leukopenia scores: under 3,000 scores 4, and a high count scores nothing.
- **Platelet count (lowest)** — numeric, cells/mm³, accepts 0 to 2000000, optional
  - Help: Unusually shaped: a merely low-normal 150,000 already scores 2, 50,000-99,999 scores 4, and under 50,000 scores 5.
- **Prothrombin time (highest)** — numeric, s, accepts 0 to 200, optional
  - Help: Shares one row with PTT. Above 22.0 s at any age; the row awards 3 once even when both analytes qualify.
- **Partial thromboplastin time (highest)** — numeric, s, accepts 0 to 400, optional
  - Help: Above 85.0 s in a neonate, above 57.0 s at every other age.
**Admission context**

- **Admission source** — choice of 4, optional
  - Asked only when `collection_window` is first_4h
  - Blank is not an answer here
  - _Operating room or post-anaesthesia care_
  - _Emergency department_
  - _Another hospital_
  - _Inpatient unit_
  - Help: PRISM IV only. Operating room or post-anaesthesia care is the reference category; an unplanned deterioration on an inpatient unit carries the heaviest weight of the four. On the 4-hour window this must be answered before any probability is shown: leaving it blank withholds the estimate rather than assuming the operating-room reference.
- **CPR within 24 hours before admission** — yes/no, optional
  - Asked only when `collection_window` is first_4h
  - Blank is not an answer here
  - Help: PRISM IV only. Cardiopulmonary resuscitation in the 24 hours preceding PICU admission. On the 4-hour window this must be answered before any probability is shown: left blank it withholds the estimate rather than being read as "no".
- **Cancer, acute or chronic** — yes/no, optional
  - Asked only when `collection_window` is first_4h
  - Blank is not an answer here
  - Help: PRISM IV only. On the 4-hour window this must be answered before any probability is shown: left blank it withholds the estimate rather than being read as "no".
- **Low-risk system of primary dysfunction** — yes/no, optional
  - Asked only when `collection_window` is first_4h
  - Blank is not an answer here
  - Help: PRISM IV only: endocrine, haematologic, musculoskeletal or renal. The model's single protective term, and a large one. On the 4-hour window this must be answered before any probability is shown: left blank it withholds the estimate rather than being read as "no".

### Composition

Total `prism_total`, made of:

- `neurologic_subscore` — 0 to 16
- `non_neurologic_subscore` — 0 to 58

### Derived output

**PRISM IV mortality estimate** — from `neurologic_subscore` and `non_neurologic_subscore`

Derived from the two subscores above, weighted separately — 0.197 per neurologic point and 0.163 per non-neurologic point — plus age and the four admission-context answers. It is not computed from the total. The figure is the estimated probability of HOSPITAL mortality for a FIRST PICU admission, for a POPULATION: summed across a cohort it gives an expected death count, and applied to one patient it says nothing actionable.

> UN-CALIBRATED FOR THIS POPULATION. Every published Gulf and Middle Eastern cohort found PRISM under-predicting death. At King Fahad Medical City in Riyadh — 4,019 admissions from the same VPS database that supplies much of the world's PRISM data — observed mortality was 6.54% against 2.50% predicted, an SMR of 2.61, and 3.96 in infants of 12 months and under. Discrimination was fine (AUC 0.81); it is calibration that failed, which is the half this number depends on. Roughly half those deaths carried a DNR order and the SMR falls to 1.52 excluding them, so much of the gap is local end-of-life practice rather than model failure — which is itself why a North American calibration does not transfer. This applies to the PRISM IV figure above, which is not exempt merely because its equation is citable.

### Interpretation bands

_None declared._

### Cautions

> Use the PRISM SCORE for severity and case-mix description, which is what it is good for here, and treat any PRISM mortality probability as uncalibrated for this region until it has been locally recalibrated. The Saudi findings behind that sit with the estimate itself, under the number they are about, rather than being repeated here.

### How it is calculated

One physiologic score, one published mortality model. Choose the model by the data you collected, not by the output you want. PRISM IV covers the first 4 hours of PICU care, with laboratory values from 2 hours before admission through the first 4 hours (Pollack 2013), and gives the score and a mortality probability. PRISM III covers the first 12 or 24 hours and gives the score and its subscores only, with no probability. The 12- and 24-hour collections are one option here because the score arithmetic is identical for both. What the literature calls PRISM III-12 and PRISM III-24 are two mortality models this platform does not ship. A longer window catches more extreme values and so runs higher, so hold the collection period constant within any series and record which one was used. Seventeen variables are scored against age-banded thresholds and summed, 0 to 74, decomposing into a neurologic subscore (pupillary reflexes 0 to 11 plus mental status 0 to 5, maximum 16) and a non-neurologic subscore (the other fifteen variables, maximum 58). The age bands are neonate under 1 month, infant 1 to under 12 months, child 12 months to under 12 years, and adolescent 12 years and over. Enter the single most abnormal value reached inside the window for each variable. Several row shapes are easy to get wrong. Acidosis is one row satisfied by either the lowest pH or the lowest total CO₂, scored once at the worse tier, while the highest pH is a separate row, so a pH swinging from 6.9 to 7.6 scores on both. Total CO₂ likewise scores once at the low end and again at the high end. Prothrombin and partial thromboplastin time share a single row, scored once even when both qualify. Both pupils fixed, each larger than 3 mm, is the heaviest single item at 11 points. Enter the Glasgow Coma Scale only for known or suspected acute CNS disease, and never within 2 hours of sedation, paralysis or anaesthesia. Correct whole-blood chemistry before entry: glucose up by 10%, potassium by 0.4 mmol/L. Blank components score zero, so a partially entered score reads lower than the patient is. The PRISM IV probability is not computed from the total. It weights the neurologic subscore at 0.197 per point and the non-neurologic subscore at 0.163 per point, then adds age, admission source (operating room or post-anaesthesia care is the reference, and unplanned inpatient deterioration is the heaviest), CPR in the prior 24 hours, cancer, and low-risk system of primary dysfunction (endocrine, haematologic, musculoskeletal or renal, the model’s one protective term), and finishes with P = 1 / (1 + e^-R). That gives the estimated hospital mortality for a first PICU admission. The probability appears only when all four admission-context questions have been answered; a blank withholds it rather than assuming the reference patient.

### Limitations and notes

PRISM is a case-mix and benchmarking instrument for groups of patients, not a bedside prognosis for the child in front of you. PRISM III shows no probability because Pollack 1996 prints the full score sheet and no regression coefficients, and the author note reserves the mortality equations for research use. The authors’ own network (CPCCRN) ships a score-only PRISM III calculator, which this implementation matches. PRISM IV’s coefficients, by contrast, were published with the stated objective of placing the algorithm in the public domain (Pollack 2016). Regional calibration. In the largest Saudi cohort (Riyadh, n = 4,019 admissions) PRISM III under-predicted death: SMR 2.61 overall, 3.96 in infants of 12 months and under, and 1.52 after excluding DNR patients, with AUC 0.81. Discrimination travels between populations; calibration frequently does not. Use the score for severity and case-mix description, and treat any PRISM mortality probability as uncalibrated for this region until it has been locally recalibrated. These evaluations cover PRISM III, not PRISM IV. Known source defects, handled explicitly. The patent’s neonate heart-rate band appears to carry an OCR error, printing 215-255 against a >225 cutoff; 215 to 225 is used here, following an independent reproduction. The glucose row prints 200 mg/dL and 11.0 mmol/L as if equivalent, and the mg/dL limb is authoritative: 200 mg/dL is 11.1 mmol/L. [NEEDS SOURCE]: no published worked example exists for either model, so the test fixtures were constructed from the threshold table, and round-trip reconciliation against the CPCCRN calculators is pending.

### References

- Pollack MM, Patel KM, Ruttimann UE. PRISM III: an updated Pediatric Risk of Mortality score. Crit Care Med. 1996;24(5):743-752. (PMID 8706448)
  - The derivation paper, and the source of the score. It publishes the score sheet in full (Figure 1) and NO regression coefficients: its eight tables were enumerated against the full text and Table 3, the one the Results section points to for the risk-factor models, compares model fit (chi-square, df, AIC, AUC, Hosmer-Lemeshow) rather than listing coefficients. There is no supplement. Its author note reserves the mortality equations for research use and states that non-research uses may attract compensation.
- Pollack MM, Holubkov R, Funai T, et al. The Pediatric Risk of Mortality Score: Update 2015. Pediatr Crit Care Med. 2016;17(1):2-9. (PMID 26492059)
  - PRISM IV. Source of the subscore split and every coefficient in Table 3. Its stated objective included placing the algorithms in the public domain.
- Pollack MM. Method, apparatus and medium for allocating beds in a pediatric intensive care unit and for evaluating quality of care. US patent 5,809,477. 1998. (https://patents.google.com/patent/US5809477A/en)
  - Primary source for the full PRISM III threshold table and the scoring notes quoted in the help text — the parts of the score the 1996 paper also publishes. Status: Expired - Lifetime, anticipated expiration 2015-09-21. It also states mortality equations the paper does not, but those are NOT implemented: the document is a single source for them, its transcription carries known internal inconsistencies, and it offers no page or table to cite.
- Collaborative Pediatric Critical Care Research Network. PRISM IV calculator. (https://www.cpccrn.org/calculators/prismivcalculator/)
  - The authors' own implementation, and the natural oracle for reconciling this one. Input and output sets read 2026-08-03: its input list matches Table 3 of Pollack 2016 one-to-one — same variables, same categories, same reference levels — and its reference age band tops out at 18 years. No case has been round-tripped through it, so the constructed fixtures here remain unreconciled against it.
- Collaborative Pediatric Critical Care Research Network. PRISM III calculator. (https://www.cpccrn.org/calculators/prismiiicalculator/)
  - Retrieved 2026-08-03. Takes the 17 physiologic variables and an age band and returns SCORE, NEUROLOGIC and NON-NEUROLOGIC — no mortality, and it collects no risk factors with which to produce one. Pollack's own network had the coefficients and shipped the score without them, which is the practice this calculator now matches.
- Alkhalifah AS, AlSoqati A, Zahraa J. Performance of pediatric risk of mortality III and pediatric index of mortality scores in a tertiary pediatric intensive care unit in Saudi Arabia. Front Pediatr. 2022;10:926686. (DOI 10.3389/fped.2022.926686)
  - King Fahad Medical City, Riyadh; n = 3396, children under 14. Its conclusion for the models it evaluated was 'sufficient discrimination ability and poor calibration', with the worst calibration AND discrimination in infants under 12 months. PRISM III discriminated best in the 60-120-month band (AUC 0.87). It evaluated PRISM III, not PRISM IV.
- Malhotra D, Nour N, El Halik M, Zidan M. Performance of Pediatric Index of Mortality 3 score in a tertiary pediatric ICU in Dubai. Dubai Med J. 2019;3(1):19–25. (DOI 10.1159/000505205)
  - A PIM3 evaluation, not a PRISM one, and cited here for that reason explicitly. Latifa Hospital, Dubai; n = 583, 46 deaths (7.9%). Stable findings: AUC 0.78 (95% CI 0.69-0.87), overall SMR 0.53, and SMR 2.1 in sepsis. Its predicted-probability strata contradict each other and are carried as unstable: SMR 2.67 in the 1-5% band against SMR 0.33 below a predicted probability of 14.3% and 0.72 above it, so the same paper shows under-prediction and over-prediction in the same low range depending on where the bands are cut. It is the second Gulf data point for the pattern that does hold — discrimination survives the move between populations, calibration does not — which is why this page carries it alongside the Riyadh series rather than only naming its own model.
- Pollack MM, Dean JM, Butler J, et al. The ideal time interval for critical care severity-of-illness assessment. Pediatr Crit Care Med. 2013;14(5):448-453. (PMID 23628831)
  - Source of the PRISM IV collection window this calculator states on the window field: physiologic variables from the first 4 hours of PICU care only, laboratory variables from 2 hours BEFORE admission through the first 4 hours. Added 2026-08-09, when that text was rewritten - the split was already being described on screen without naming where it came from. It is also the citation the authors' own CPCCRN calculators print beneath the same sentence.
- Alkhalifah AS, AlSoqati A, Zahraa J. Performance of Pediatric Risk of Mortality III and Pediatric Index of Mortality III Scores in Tertiary Pediatric Intensive Unit in Saudi Arabia. Front Pediatr. 2022;10:926686. (PMID 35874581)
  - FIRST-HAND — every figure below is taken from the paper itself (PMC9300935), not from a summary of it. 4,019 admissions across 2,620 patients at King Fahad Medical City, Riyadh, 2015-2019, drawn from the Virtual Pediatric Systems database. PRISM III SMR 2.61 (2.44-2.79) against PIM III 2.75; observed mortality 6.54% against 2.50% predicted; AUC-ROC 0.81 (0.79-0.84), rising to 0.87 (0.84-0.90) once DNR patients are excluded; SMR 3.96 (3.16-4.76) in infants 12 months and under; SMR 1.52 (1.24-1.80) excluding DNR. Authors' conclusion, quoted: 'Both models showed adequate discrimination ability, but poor calibration.'

### Rights

**freely-reproducible** — The PRISM III score — the variables, their age-banded ranges and every point value — is published in full in Pollack 1996 (Figure 1) and reproduced verbatim in US patent 5,809,477 (Pollack), which shows status 'Expired - Lifetime' with an anticipated expiration of 2015-09-21. PRISM IV's coefficients are printed in Table 3 of Pollack 2016 (PMID 26492059), whose stated objective included 'placing the algorithms (Pediatric Risk of Mortality IV) in the public domain', and the authors' own network publishes a free public calculator of it. PRISM III's MORTALITY equations are a separate matter and are NOT shipped: they appear in no table of the 1996 article, that paper's author note reserves them for research use and states that non-research uses may attract compensation, and their only source is the patent's transcription, which carries known internal inconsistencies and offers no page to cite. They are not shipped here in any form, and no PRISM III probability is emitted on any window.

---

## PELOD-2 (Pediatric Logistic Organ Dysfunction-2)

<a id="pelod2"></a>

`pelod2` · v1.0.0 · published · organ-dysfunction · interpretation not-applicable

### Inputs

**Patient**

- **Patient age** — numeric, months, accepts 0 to 216, required
  - Help: In months. Selects the age band for mean arterial pressure and creatinine. The derivation cohort excluded patients aged 18 years or older, so 216 months (18.0 years) and above is outside the score and is rejected.
**Neurological**

- **Glasgow Coma Scale (lowest)** — numeric, no unit, accepts 3 to 15, required
  - Help: Lowest total GCS in the window; use the pre-sedation estimate if sedated.
- **Pupillary reaction** — choice of 2, required
  - _Both reactive_
  - _Both fixed_
  - Help: A nonreactive pupil must be > 3 mm; do not assess after iatrogenic dilatation.
**Cardiovascular**

- **Lactatemia** — numeric, mmol/L / mg/dL, accepts 0 to 30, required
  - Help: Blood lactate. Accepts mmol/L or mg/dL.
- **Mean arterial pressure** — numeric, mmHg, accepts 0 to 200, required
  - Help: Do not assess during crying or iatrogenic agitation. Scored against the age band.
**Renal**

- **Serum creatinine** — numeric, µmol/L / mg/dL, accepts 0 to 1500, required
  - Help: Accepts µmol/L or mg/dL. Scored against the age band.
**Respiratory**

- **PaO₂/FiO₂ ratio** — numeric, no unit, accepts 0 to 600, required
  - Help: Arterial PaO₂ (mmHg) ÷ FiO₂ (0–1). Considered normal in cyanotic congenital heart disease.
- **PaCO₂** — numeric, mmHg / kPa, accepts 10 to 200, required
  - Help: Arterial, capillary, or venous. Accepts mmHg or kPa.
- **Invasive mechanical ventilation** — yes/no, required
  - Help: Mask ventilation does not count as invasive.
**Haematological**

- **White blood cell count** — numeric, 10^9/L, accepts 0 to 100, required
  - Help: In ×10⁹/L (equivalently ×10³/µL).
- **Platelet count** — numeric, 10^9/L, accepts 0 to 1000, required
  - Help: In ×10⁹/L (equivalently ×10³/µL).

### Composition

Total `pelod2`, made of:

- `neurologic` — 0 to 9
- `cardiovascular` — 0 to 10
- `renal` — 0 to 2
- `respiratory` — 0 to 8
- `haematologic` — 0 to 4

### Interpretation bands

_None declared._

### Cautions

> Every item is required, and per the source an unmeasured variable is scored normal, so the caller must enter a normal value for anything that was not measured. A partial dataset therefore understates the score.

### How it is calculated

PELOD-2 total = the sum of 10 items across 5 organ systems, range 0–33, taking the worst value in the window for each item. Neurologic: Glasgow Coma Scale ≥ 11 → 0, 5–10 → 1, 3–4 → 4; pupils both fixed → 5, both reactive → 0. Cardiovascular: lactate < 5 mmol/L → 0, 5–10.9 → 1, ≥ 11 → 4; mean arterial pressure is scored 0, 2, 3 or 6 against age-banded cutoffs, across six bands (0–<1, 1–11, 12–23, 24–59, 60–143 and ≥ 144 months). Renal: serum creatinine at or above the age-band threshold → 2. Respiratory: PaO₂/FiO₂ ≤ 60 → 2; PaCO₂ ≤ 58 mmHg → 0, 59–94 → 1, ≥ 95 → 3; invasive mechanical ventilation → 3, and mask ventilation does not count. Haematologic: white cell count ≤ 2 ×10⁹/L → 2; platelets ≥ 142 → 0, 77–141 → 1, ≤ 76 → 2 (×10⁹/L). A second output reports predicted in-hospital mortality = 1/(1 + e^−logit), with logit = −6.61 + 0.47 × total.

### Limitations and notes

Every item is required. Per the source an unmeasured variable is scored normal, so the caller enters a normal value for anything not measured and a partial dataset understates the score. Pupillary reaction is binary here: a unilateral fixed pupil has no published point value [NEEDS SOURCE], only the both-fixed option scores, and unilateral findings need an explicit local rule. The predicted-mortality output is a population-level association from the derivation cohort (France/Belgium, n = 3,671, 6% mortality) and requires recalibration before predictive use elsewhere. No severity bands exist or are shown. That is a settled decision, and the organ-count mortality figures in the paper are context, not a banding. One published-table gap is resolved conservatively: in the 24–59-month band, Table 6 leaves a MAP of exactly 45 mmHg in no printed range. This calculator scores it 3, the higher-severity reading; the public ESPNIC calculator scores it 2. It is the only value at which the two tools disagree. Scope: the derivation excluded premature newborns and patients aged 18 years or older, so 216 months and above is rejected as an exclusive ceiling. PaO₂/FiO₂ is considered normal in cyanotic congenital heart disease. Use the pre-sedation GCS estimate if sedated.

### References

- Leteurtre S, Duhamel A, Salleron J, Grandbastien B, Lacroix J, Leclerc F; GFRUP. PELOD-2: an update of the PEdiatric logistic organ dysfunction score. Crit Care Med. 2013;41(7):1761–1773. (PMID 23685639)
- Leteurtre S, Duhamel A, Deken V, Lacroix J, Leclerc F; GFRUP. Daily estimation of the severity of organ dysfunctions in critically ill children by using the PELOD-2 score. Crit Care. 2015;19:324. (PMID 26369662)

### Rights

**freely-reproducible** — PELOD-2's algorithm, thresholds, coefficients and age bands are non-copyrightable facts; the authors state the score 'will be in the public domain' and may be freely used (Leteurtre 2013, Abstract/Discussion). Item labels (Both reactive/Both fixed, yes/no) are functional. GCS is an external instrument (Teasdale & Jennett) whose response-descriptor wording must be sourced separately if a GCS entry widget is built (pelod2.md IP status).

---

## Percent cumulative fluid balance (fluid overload %)

<a id="fluid-balance"></a>

`fluid-balance` · v1.0.0 · published · fluids-resuscitation · interpretation not-applicable

### Inputs

- **Anchor weight (usually ICU admission weight)** — numeric, kg / lb / g, accepts 0.5 to 150, required
  - Help: The reference weight both forms are measured against — most commonly the ICU admission weight, which is what the published outcome literature used. In NEONATES the common anchor is instead the birthweight during the first two postnatal weeks (ADQI). Accepts kilograms, pounds, or grams. ADQI names the choice of anchor weight an unresolved knowledge gap with no gold standard: it is the denominator, so it scales the whole result. Record which anchor you used.
- **Cumulative fluid intake since the anchor** — numeric, L / mL, accepts 0 to 200, optional
  - Help: Total fluid in since the anchor point (not a per-day figure). Accepts litres or millilitres. Supply this together with cumulative output to get the fluid-based form; supplying only one of the pair produces no fluid-based value.
- **Cumulative fluid output since the anchor** — numeric, L / mL, accepts 0 to 200, optional
  - Help: Total fluid out since the anchor point (not a per-day figure). Accepts litres or millilitres. This is charted output only — it cannot include insensible losses, which is the specific gap the weight-based form closes.
- **Current weight** — numeric, kg / lb / g, accepts 0.5 to 150, optional
  - Help: Today's measured weight. Supply this to get the weight-based form, which captures insensible losses the flowsheet cannot see and is generally preferred in neonates. Accepts kilograms, pounds, or grams.

### Interpretation bands

_None declared._

### Cautions

> This is a percentage describing accumulated volume, not a diagnosis. ADQI reserves 'fluid overload' for a pathologic state, which remains a clinical judgement.

> The anchor weight scales the entire result, and ADQI names its selection an unresolved gap with no gold standard. The outcome literature used the ICU admission weight; in neonates the convention is the birthweight during the first two postnatal weeks. Record which anchor was used, because results on different anchors are not comparable.

### How it is calculated

Both published forms are shown, because the Pediatric ADQI consensus prints both without choosing between them. Fluid-based form: (cumulative intake − cumulative output, in litres) × 100 ÷ anchor weight in kilograms. Weight-based form: (current weight − anchor weight, in kilograms) × 100 ÷ anchor weight in kilograms. Both divide by the ANCHOR weight, never the current one. Negative results are real (diuresis, ultrafiltration) and are reported as such. The two forms agree only when every retained millilitre was charted and all mass change is fluid; insensible losses usually put the weight-based figure BELOW the fluid-based one. The raw balance in mL and the raw weight change in kg are emitted alongside the percentages.

### Limitations and notes

NO BANDS, DELIBERATELY. The well-known 10% and 20% figures are cohort associations measured at CRRT initiation in children already on renal replacement therapy: observed mortality was 29.4% below 10%, 43.1% at 10-20%, and 65.6% at or above 20%, with an adjusted OR of 1.03 per 1% and an OR of 8.5 at or above 20% (Sutherland 2010). The lowest stratum is a population with near-30% mortality, which is a statement about who receives CRRT rather than about what 9% means on a ward. ADQI states that no threshold alone can define fluid overload across all sick children. FAILURE MODES: uncharted output returns a confidently over-positive percentage with no sign anything is missing. The weight-based form measures mass, so catabolism understates and growth overstates fluid, and scale technique bites hardest in the smallest patients.

### References

- Goldstein SL, Currier H, Graf CD, Cosio CC, Brewer ED, Sachdeva R. Outcome in children receiving continuous venovenous hemofiltration. Pediatrics. 2001;107(6):1309-1312. (PMID 11389248)
  - Origin of the metric: fluid accumulation as a percentage of body weight in critically ill children.
- Sutherland SM, Zappitelli M, Alexander SR, et al. Fluid overload and mortality in children receiving continuous renal replacement therapy: the Prospective Pediatric Continuous Renal Replacement Therapy Registry. Am J Kidney Dis. 2010;55(2):316-325. (PMID 20042260)
  - Formula stated verbatim; source of the <10% / 10-20% / >=20% strata and their observed mortality (29.4% / 43.1% / 65.6%), the adjusted OR of 1.03 per 1%, and the OR of 8.5 at >=20% — associations in a CRRT cohort, NOT interpretation bands.
- Selewski DT, Cornell TT, Lombel RM, et al. Weight-based determination of fluid overload status and mortality in pediatric intensive care unit patients requiring continuous renal replacement therapy. Intensive Care Med. 2011;37(7):1166-1173. (PMID 21533569)
  - Validates the weight-based form as a practical substitute for the fluid-based form; UNIVARIATE per-1% PICU-mortality OR 1.044 (weight-based, PICU admission weight) vs 1.056 (fluid-balance method). On multivariate analysis all three methods only APPROACHED significance.
- Foland JA, Fortenberry JD, Warshaw BL, et al. Fluid overload before continuous hemofiltration and survival in critically ill children: a retrospective analysis. Crit Care Med. 2004;32(8):1771-1776. (PMID 15286557)
  - Supporting paediatric CRRT fluid-overload literature. Cited as lineage only — no numeric value in this implementation is taken from it.
- Selewski DT, Barhight MF, Bjornstad EC, Ricci Z, de Sousa Tavares M, Akcan-Arikan A, Goldstein SL, Basu R, Bagshaw SM; Pediatric Acute Disease Quality Initiative (ADQI) Consensus Committee. Fluid assessment, fluid balance, and fluid overload in sick children: a report from the Pediatric Acute Disease Quality Initiative (ADQI) conference. Pediatr Nephrol. 2024;39(3):955-979. Epub 2023 Nov 7. (PMID 37934274)
  - Current consensus. Prints BOTH formulae in Table 1 without choosing; defines 'fluid overload' as a pathologic state of positive fluid balance associated with clinically observable event(s), with 'percent cumulative fluid balance' as the neutral descriptor; states no specific threshold of positive fluid balance alone can define fluid overload across all sick children; names anchor-weight selection a knowledge gap with no gold standard.

### Rights

**freely-reproducible** — Both forms are elementary arithmetic over measured volumes and weights — one subtraction, one multiplication by 100, one division. Mathematical formulae and the measurements they operate on are facts, not copyrightable expression. There is no item wording, no response descriptor and no table to license, and no rights claim appears in Goldstein 2001, Sutherland 2010, Selewski 2011 or the Pediatric ADQI consensus (fluid-balance.md IP status).

---

## Phoenix Sepsis Score

<a id="phoenix"></a>

`phoenix` · v1.1.0 · published · sepsis · blank scores as normal

### Inputs

**Patient**

- **Age** — numeric, months, accepts 0 to 216, required
  - Help: In whole months. Determines the age-adjusted MAP band. The criteria were derived in children under 18 years — age 216 months (18.0 years) and over is outside them and is rejected — and exclude newborns during the birth hospitalization and infants under 37 weeks post-conceptional age.
- **Suspected or confirmed infection** — yes/no, required
  - Help: Clinical judgment. Phoenix sepsis requires suspected/confirmed infection AND a score ≥ 2 — the score alone does not decide whether infection is present.
**Respiratory**

- **Respiratory support** — choice of 3, optional
  - _No respiratory support_
  - _Non-invasive support (supplemental O₂, high-flow nasal cannula, or non-invasive ventilation)_
  - _Invasive mechanical ventilation_
  - Help: The 1-point tier needs any support; the 2- and 3-point tiers need invasive mechanical ventilation. A low ratio with no support scores 0. High-flow nasal cannula counts as support here — Phoenix includes it explicitly — while PICANet and ANZPIC both exclude high flow from the ventilation field they collect, so the same child reads as supported on this score and as not ventilated in either registry. Answer from what the child is actually on: entering an FiO₂ above 0.21 alongside 'no respiratory support' is contradictory, and the task force's own extraction code would treat that FiO₂ as support where this calculator takes the answer given.
- **Arterial PaO₂** — numeric, mmHg / kPa, accepts 20 to 700, optional
  - Help: From an arterial blood gas. Gives the PaO₂:FiO₂ (P/F) ratio. P/F and SpO₂:FiO₂ are evaluated together and either can trigger a tier, so supplying both is not redundant. Accepts mmHg or kPa.
- **Fraction of inspired oxygen (FiO₂)** — numeric, fraction / %, accepts 0.21 to 1, optional
  - Help: Room air is 0.21. Needed for the P/F or S/F ratio. Accepts a fraction or a percentage.
- **Pulse-oximeter oxygen saturation (SpO₂)** — numeric, %, accepts 50 to 100, optional
  - Help: Gives the SpO₂:FiO₂ (S/F) ratio, which is valid only when SpO₂ ≤ 97% (above that the ratio saturates and is uninformative). S/F and PaO₂:FiO₂ are evaluated together and either can trigger a tier.
**Cardiovascular**

- **Number of distinct vasoactive agents** — numeric, no unit, accepts 0 to 6, optional
  - Help: Count of distinct systemic vasoactive medications running (dobutamine, dopamine, epinephrine, milrinone, norepinephrine, vasopressin): 0 → 0 pts, 1 → 1 pt, ≥ 2 → 2 pts.
- **Blood lactate** — numeric, mmol/L / mg/dL, accepts 0.3 to 30, optional
  - Help: 0 pts if < 5, 1 pt if 5 to < 11, 2 pts if ≥ 11 mmol/L. Accepts mmol/L or mg/dL.
- **Mean arterial pressure (MAP)** — numeric, mmHg / kPa, accepts 10 to 200, optional
  - Help: Age-adjusted scoring (0–2 pts). May be computed as DBP + (SBP − DBP)/3. Accepts mmHg or kPa.
**Coagulation**

- **Platelet count** — numeric, 10^3/uL, accepts 5 to 1000, optional
  - Help: In ×10³/µL (K/µL). Contributes 1 coagulation point when < 100.
- **INR** — numeric, no unit, accepts 0.8 to 10, optional
  - Help: International normalized ratio (unitless). Contributes 1 coagulation point when > 1.3.
- **D-dimer** — numeric, mg/L FEU / ng/mL FEU / µg/mL FEU, accepts 0.1 to 50, optional
  - Help: Contributes 1 coagulation point above 2 mg/L fibrinogen-equivalent units (FEU). Laboratories report FEU three ways: mg/L and µg/mL are the same number, while ng/mL is a thousand times larger (2 mg/L FEU = 2 µg/mL FEU = 2000 ng/mL FEU). Select the unit your report uses rather than converting by hand.
- **Fibrinogen** — numeric, mg/dL / g/L, accepts 30 to 800, optional
  - Help: Contributes 1 coagulation point when < 100 mg/dL. Accepts mg/dL or g/L.
**Neurological**

- **Glasgow Coma Scale (total)** — numeric, no unit, accepts 3 to 15, optional
  - Help: Total GCS 3–15. Scores 1 neurologic point when ≤ 10 — but bilaterally fixed pupils score 2 whatever the GCS, so this value only decides between 0 and 1. Left blank it is taken as 15, which is why it cannot mask a fixed-pupils score. Only the numeric total is used.
- **Bilaterally fixed pupils** — yes/no, optional
  - Help: Scores the full 2 neurologic points on its own, whatever the GCS — it is not additive with the GCS point. Left blank it is taken as not fixed.

### Composition

Total `phoenix_total`, made of:

- `respiratory` — 0 to 3
- `cardiovascular` — 0 to 6
- `coagulation` — 0 to 2
- `neurologic` — 0 to 2

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `phoenix_total` | [-inf, 2) | 0–1 | Below the Phoenix threshold: in a child with suspected infection this does not meet the Phoenix criterion for sepsis. Interpret in the full clinical context. |
| `phoenix_total` | [2, +inf) | ≥ 2 | In a child with suspected/confirmed infection, meets the Phoenix criterion for sepsis. Reported in-hospital mortality in the derivation/validation cohorts was ~7.1% (higher-resource) and ~28.5% (lower-resource); with ≥ 1 cardiovascular point the septic-shock criterion is also met (~10.8% / ~33.5%). These are population associations, not individual predictions. |

### Cautions

> A half-entered Phoenix reads FALSELY LOW. Every unentered value is imputed at its normal end, each independently of the others: an uncomputable oxygenation ratio as 500, GCS as 15, pupils as not fixed, respiratory support as absent, lactate and vasoactive agents as 0, the coagulation labs as normal. A total below 2 on an incomplete entry is not evidence against sepsis. Enter every value that was actually measured before reading the total, and read a blank as “not measured”, never as “normal”.

### How it is calculated

Total (0–13) = respiratory (0–3) + cardiovascular (0–6) + coagulation (0–2) + neurologic (0–2), each per JAMA 2024 Table 2. RESPIRATORY is support-gated and cumulative. The PaO₂:FiO₂ (P/F) and SpO₂:FiO₂ (S/F) ratios are evaluated together, S/F only when SpO₂ ≤ 97%, and either can trigger a tier: 1 point for any support with P/F < 400 or S/F < 292, 1 more for invasive ventilation with P/F < 200 or S/F < 220, and 1 more for invasive ventilation with P/F < 100 or S/F < 148. No support scores 0 regardless of the ratio, and non-invasive support cannot exceed 1. High-flow nasal cannula counts as support here, because Phoenix includes it explicitly. CARDIOVASCULAR sums three independent 0–2 sub-scores with no cap: vasoactive agents (0 → 0, 1 → 1, ≥ 2 → 2, counting dobutamine, dopamine, epinephrine, milrinone, norepinephrine and vasopressin), lactate (< 5 → 0, 5 to < 11 → 1, ≥ 11 → 2 mmol/L), and age-banded MAP (0, 1 or 2). COAGULATION adds 1 point each for platelets < 100 ×10³/µL, INR > 1.3, D-dimer > 2 mg/L FEU and fibrinogen < 100 mg/dL, capped at 2. For D-dimer, mg/L and µg/mL are the same number while ng/mL is a thousand times larger, so select the unit the report uses. NEUROLOGIC is hierarchical, not additive: bilaterally fixed pupils score 2 outright, whatever the GCS; otherwise GCS ≤ 10 scores 1; otherwise 0. An uncapped sum, which would return 3 for fixed pupils at GCS 8, is wrong. MISSING INPUTS are imputed at their normal end, each independently of the others: an uncomputable ratio as 500, GCS as 15, pupils as not fixed, respiratory support as absent, lactate and vasoactive agents as 0, the coagulation labs as normal. A fixed-pupils entry therefore scores its 2 points even with no GCS recorded. BOUNDARIES are compared continuously, matching the task force’s reference software rather than the integer bedside tables, at the four values where the two disagree: MAP 30.5 in a child under 1 month scores 1, lactate 10.95 scores 1, and a P/F of exactly 200 or an S/F of exactly 220 on invasive ventilation scores 1. Sepsis is reported when infection is suspected or confirmed and the total is ≥ 2; septic shock when sepsis is met and the cardiovascular component is ≥ 1, not merely when the total is ≥ 2.

### Limitations and notes

A diagnostic criterion, not a graded severity ladder. A HALF-ENTERED PHOENIX READS FALSELY LOW, because every unentered value is imputed at its normal end, and a total below 2 on an incomplete entry is not evidence against sepsis. The same convention produces one discontinuity worth stating outright: with no arterial gas, a child on invasive ventilation at FiO₂ 1.0 scores respiratory 3 at SpO₂ 97 but 0 at SpO₂ 98, because the ratio is simply not computable above 97. Read that as “not measurable”, never as “not hypoxaemic”, and obtain a gas. HIGH-FLOW NASAL CANNULA counts as respiratory support here, while PICANet and ANZPIC exclude it from the ventilation field they collect, so the same child reads differently against registry data. SCOPE. The criteria were derived in children under 18 years (216 months, an exclusive ceiling) and exclude newborns during the birth hospitalization and infants under 37 weeks post-conceptional age; age is not adjusted for prematurity. A sedated child’s neurologic point may be measuring the sedation, which is the authors’ own caveat. The 8-organ Phoenix-8 extension is research-only and out of scope.

### References

- Sanchez-Pinto LN, Bennett TD, DeWitt PE, et al; SCCM Pediatric Sepsis Definition Task Force. Development and Validation of the Phoenix Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):675–686. (PMID 38245897)
  - Primary derivation/validation; Table 2 is the score.
- Schlapbach LJ, Watson RS, Sorce LR, et al; SCCM Pediatric Sepsis Definition Task Force. International Consensus Criteria for Pediatric Sepsis and Septic Shock. JAMA. 2024;331(8):665–674. (PMID 38245889)
  - Companion consensus definition (sepsis = suspected infection + Phoenix ≥ 2; septic shock).
- DeWitt PE, Russell S, Rebull MN, Sanchez-Pinto LN, Bennett TD. phoenix: an R package and Python module for calculating the Phoenix pediatric sepsis score and criteria. JAMIA Open. 2024;7(3):ooae066. (DOI 10.1093/jamiaopen/ooae066)
  - Reference implementation by task-force members; source of the worked vignettes and the half-open MAP interval detail. Its implementation-notes documentation additionally publishes the reasonable-value table this score's input bounds are compared against, and the SQL from which the respiratory support gate is read (other respiratory support = FiO₂ > 0.21 OR invasive ventilation). The machine-readable units file that page refers to could not be retrieved; nothing here is cited to it.

### Rights

**freely-reproducible** — Threshold/branch-rule clinical score — cutoffs, arithmetic, and age bands are facts/procedures, not copyrightable expression. The authors additionally released an open-source reference implementation (CRAN/PyPI) and open-access papers. Only the numeric total GCS is consumed; no GCS response-descriptor item wording is reproduced (phoenix.md IP status).

---

## pSOFA (Pediatric SOFA)

<a id="psofa"></a>

`psofa` · v1.1.0 · published · organ-dysfunction · blank scores as normal

### Inputs

**Patient**

- **Patient age** — numeric, months, accepts 0 to 250, required
  - Help: In months. Sets the age-adjusted cardiovascular (MAP) and renal (creatinine) thresholds. Above 216 months those thresholds are the adult SOFA cut points, not paediatric ones.
**Respiratory**

- **Arterial PaO₂** — numeric, mmHg / kPa, accepts 20 to 600, optional
  - Help: From an arterial blood gas. Accepts mmHg or kPa. When present, PaO₂:FiO₂ is used for the respiratory subscore.
- **Pulse-oximetry SpO₂** — numeric, %, accepts 0 to 100, optional
  - Help: Used only when no PaO₂ is available, and only at ≤97% — above that the ratio saturates. The ≤97% ceiling is the paper's own (Matics 2017, Table 1 footnote) and matches the window the ratio was derived over (SpO₂ 80–97%, Khemani 2009/2012).
- **Fraction of inspired oxygen (FiO₂)** — numeric, fraction / %, accepts 0.21 to 1, required
  - Help: Room air is 0.21. Accepts a fraction or a percentage. Denominator of the oxygenation ratio.
- **On respiratory support** — yes/no, required
  - Help: Invasive or non-invasive support both count here. Table 1 gates respiratory subscores 3–4 on being on respiratory support and never says what counts as support, so treating non-invasive support as sufficient is this calculator's reading rather than the paper's. Without support the respiratory subscore is capped at 2. High-flow nasal cannula falls inside that broad reading and counts here — worth knowing because the major paediatric registries go the other way: PICANet and ANZPIC both exclude high flow from the ventilation field they collect, so the same child counts as supported on this score and as not ventilated in either registry.
**Coagulation**

- **Platelet count** — numeric, 10^3/µL / 10^9/L, accepts 1 to 1000, required
  - Help: In ×10³/µL (equal to ×10⁹/L).
**Hepatic**

- **Total bilirubin** — numeric, mg/dL / µmol/L, accepts 0.1 to 50, required
  - Help: Accepts mg/dL or µmol/L.
**Cardiovascular**

- **Mean arterial pressure** — numeric, mmHg, accepts 10 to 150, optional
  - Help: Sets cardiovascular subscore 0 vs 1 by age band. Vasoactive infusions override it for subscores 2–4.
- **Dopamine infusion rate** — numeric, µg/kg/min, accepts 0 to 50, optional
  - Help: In µg/kg/min. 0 or omitted means not infusing.
- **Dobutamine infusion rate** — numeric, µg/kg/min, accepts 0 to 40, optional
  - Help: In µg/kg/min. Any dose qualifies for cardiovascular subscore 2.
- **Epinephrine infusion rate** — numeric, µg/kg/min, accepts 0 to 5, optional
  - Help: In µg/kg/min. 0 or omitted means not infusing.
- **Norepinephrine infusion rate** — numeric, µg/kg/min, accepts 0 to 5, optional
  - Help: In µg/kg/min. 0 or omitted means not infusing.
**Neurological**

- **Glasgow Coma Scale total** — numeric, no unit, accepts 3 to 15, required
  - Help: Total GCS only (3–15). Document sedation/intubation confounders separately.
**Renal**

- **Serum creatinine** — numeric, mg/dL / µmol/L, accepts 0.1 to 20, required
  - Help: Accepts mg/dL or µmol/L. Thresholds are age-adjusted.

### Composition

Total `total`, made of:

- `respiratory` — 0 to 4
- `coagulation` — 0 to 4
- `hepatic` — 0 to 4
- `cardiovascular` — 0 to 4
- `neurologic` — 0 to 4
- `renal` — 0 to 4

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `total` | [-inf, 9) | 0–8 | At or below the >8 cut point reported by Matics & Sanchez-Pinto (2017). Lower maximum pSOFA was associated with lower observed in-hospital mortality in the single-center derivation cohort. |
| `total` | [9, +inf) | >8 | Above the maximum-pSOFA cut point (>8) that best separated survivors from non-survivors in the derivation cohort (AUROC 0.94). This is a statistical association for the encounter maximum, not a treatment threshold. |

### How it is calculated

pSOFA total = respiratory + coagulation + hepatic + cardiovascular + neurologic + renal: six organ subscores, each 0–4, summed to 0–24 (Matics & Sanchez-Pinto 2017). Respiratory uses P/F when a PaO₂ exists (≥400 → 0; 300–399 → 1; 200–299 → 2; 100–199 → 3; <100 → 4), otherwise S/F, only at SpO₂ ≤ 97% (≥292 → 0; 264–291 → 1; 221–264 → 2; 148–220 → 3; <148 → 4); an exact 264 resolves to the worse subscore (2), per the worst-value rule. Subscores 3–4 require respiratory support, so a 3/4-band ratio without support is capped at 2; that cap is entailed by the published table, not added here. Coagulation from platelets (×10³/µL): ≥150 → 0; 100–149 → 1; 50–99 → 2; 20–49 → 3; <20 → 4. Hepatic from total bilirubin (mg/dL): <1.2 → 0; 1.2–1.9 → 1; 2.0–5.9 → 2; 6.0–11.9 → 3; ≥12 → 4. Cardiovascular is the worse of the age-banded MAP subscore (0 or 1) and the vasoactive tier: dobutamine any dose or dopamine ≤5 → 2; dopamine >5 or epinephrine ≤0.1 or norepinephrine ≤0.1 → 3; dopamine >15 or epinephrine >0.1 or norepinephrine >0.1 → 4 (µg/kg/min). Neurologic from total GCS: 15 → 0; 13–14 → 1; 10–12 → 2; 6–9 → 3; <6 → 4. Renal from serum creatinine against age-banded cut points. Seven age bands (<1, 1–11, 12–23, 24–59, 60–143, 144–216, >216 months); above 216 months the MAP and creatinine cut points are adult SOFA’s. Missing data scores that organ 0, which is the paper’s own rule that a variable unmeasured in the 24 h window is taken as normal, so a partial entry reads lower than a complete one.

### Limitations and notes

Missing data scores that organ 0. That is the paper’s own rule, a variable unmeasured in the 24 h window taken as normal, so a partial entry reads lower than a complete one. An SpO₂ above 97% with no PaO₂ falls into that trap WITHOUT the field being blank: the ratio is unusable above 97%, so the respiratory subscore is taken as 0 and the total reads lower than the child is. The published S/F table prints 264 in two rows at once, as the lower bound of the subscore-1 row and the upper bound of the subscore-2 row, so the source assigns an exact 264 to both; this calculator resolves it to the worse subscore (2), per the worst-value rule. Subscores 3–4 require respiratory support, and a 3/4-band ratio without support is capped at 2; that cap is entailed by the published table, not added here. What counts as support is undefined in the paper, and this calculator’s reading is that invasive or non-invasive support both qualify, high-flow included. Phoenix contrast, worth stating once: pSOFA attaches its support requirement to the top two respiratory bands, capping an unsupported child at 2, while Phoenix multiplies every tier by a support flag, flooring an unsupported child at 0. The same child at the same ratio can be pSOFA respiratory 2 and Phoenix respiratory 0 simultaneously. Both implement their own instrument correctly; neither should be harmonised to the other. A total above 8 sits above the maximum-pSOFA cut point that best separated survivors from non-survivors in the single-center derivation cohort (AUROC 0.94). That is a statistical association on the encounter maximum, not a treatment threshold. Scope: pSOFA was derived in children 21 years and younger. The <1-month band exists, but neonates were not the derivation population; nSOFA is the score derived for preterm very-low-birth-weight infants. Age input runs to 250 months deliberately, since the cohort ran to 252.

### References

- Matics TJ, Sanchez-Pinto LN. Adaptation and Validation of a Pediatric Sequential Organ Failure Assessment Score and Evaluation of the Sepsis-3 Definitions in Critically Ill Children. JAMA Pediatr. 2017;171(10):e172352. (PMID 28783810)
- Vincent JL, et al. The SOFA (Sepsis-related Organ Failure Assessment) score to describe organ dysfunction/failure. Intensive Care Med. 1996;22(7):707-710. (PMID 8844239)
  - Adult SOFA lineage adapted by pSOFA; no adult-SOFA number is used directly here.
- Khemani RG, Patel NR, Bart RD 3rd, Newth CJL. Comparison of the pulse oximetric saturation/fraction of inspired oxygen ratio and the PaO2/fraction of inspired oxygen ratio in children. Chest. 2009;135(3):662-668. (PMID 19029434)
  - Derivation of the SpO₂:FiO₂ ratio, restricted to SpO₂ 80–97% — the origin of the ≤97% ceiling pSOFA's Table 1 footnote applies.
- Khemani RG, Thomas NJ, Venkatachalam V, et al. Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. Crit Care Med. 2012;40(4):1309-1316. (PMID 22202709)
  - Multicentre re-derivation of the SpO₂-based markers over the same SpO₂ 80–97% window.
- Wynn JL, Polin RA. A neonatal sequential organ failure assessment score predicts mortality to late-onset sepsis in preterm very low birth weight infants. Pediatr Res. 2020;88(1):85-90. (PMID 31394566)
  - nSOFA, the organ-dysfunction score derived FOR neonates (0–15). Named here so the neonatal caveat points somewhere; no nSOFA number is used in this score.

### Rights

**freely-reproducible** — pSOFA is a threshold/formula-based score; numeric cut points and scoring rules are facts, not copyrightable expression (psofa.md IP status). No verbatim scale-item prose is reproduced. The neurologic subscore consumes only the integer GCS total, so no GCS eye/verbal/motor response-descriptor wording is copied into this platform.

---

## Serum osmolality (calculated) and osmolar gap

<a id="serum-osmolality"></a>

`serum-osmolality` · v1.0.0 · published · renal-metabolic

### Inputs

- **Sodium** — numeric, mmol/L / mEq/L, accepts 100 to 200, required
  - Help: Serum sodium in mmol/L (equivalently mEq/L — monovalent, 1:1).
- **Glucose** — numeric, mg/dL / mmol/L, accepts 10 to 2000, required
  - Help: Serum glucose. Accepts mg/dL (US) or mmol/L (SI, ×18).
- **Blood urea nitrogen (BUN)** — numeric, mg/dL / mmol/L, accepts 1 to 300, required
  - Help: Blood urea NITROGEN. Accepts mg/dL (US) or, if the lab reports whole-molecule urea (SI), mmol/L (×2.8). BUN ≠ urea — they differ by the ×2.8 factor.
- **Measured osmolality (optional)** — numeric, mOsm/kg, accepts 100 to 600, optional
  - Help: Osmometer value in mOsm/kg. Enter it to compute the osmolar gap (measured − calculated).
- **Ethanol (optional)** — numeric, mg/dL / mmol/L, accepts 0 to 1000, optional
  - Help: Measured ethanol. Accepts mg/dL or mmol/L (×4.6). When entered, the calculated osmolality and residual gap are shown with both the ÷3.7 (empiric) and ÷4.6 (ideal) ethanol terms.

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `osm_gap` | [-inf, 10) | < 10 mOsm/kg | Below the reference limit of 10 mOsm/kg for the osmolar gap computed with the Smithline–Gardner formula (Choy 2016). The limit is partly conventional rather than a derived cut-point, and the spread behind it is wider than one number suggests: measured in 321 subjects the gap centres near −2 with an SD of about 6 mOsm, and across different equations the measured gaps ranged from about −5 to +15 (Hoffman 1993); secondary sources render the same distribution as a 95% population range of roughly −14 to +10, whose upper bound is where the cut-off of 10 sits (−2 + 2 SD). A gap below 10 does NOT exclude toxic alcohol ingestion, and the arithmetic above is the reason: an individual's own true baseline may be NEGATIVE, so a patient starting near −14 can acquire more than 20 mOsm/kg of unmeasured osmole and still measure only +10 — at the cut-off rather than far above it. An early presentation before metabolism does the same, and the test is not used in isolation (Lynd 2008). PAEDIATRIC DATA DOES EXIST — an earlier version of this page said none existed and called that absence settled; the claim is WITHDRAWN — and what it shows is a wide normal: across 192 children (median age 6.6 years, 7 days to 17.9 years) the range of normal osmolar gaps is about 22 mOsm whichever equation is used (McQuillen 1999), more than twice the width of the 10 mOsm/kg limit itself. A gap below 10 in a child is therefore unremarkable rather than reassuring. A negative gap is ordinary biological variation, measurement imprecision, or an artefact of an additive formula (which yields osmolarity) being compared with an osmometer (which yields osmolality); it is not a finding in itself. |
| `osm_gap` | [10, +inf) | ≥ 10 mOsm/kg | At or above the reference limit of 10 mOsm/kg proposed for the Smithline–Gardner osmolar gap (Choy 2016) — the most common clinically applied cut-off (Lynd 2008). The threshold's performance depends on the question asked, and on which ethanol coefficient is used — the same fork this score already emits (1.0 ≡ ÷4.6 ideal; 1.25 ≡ ÷3.7 empiric). In Lynd 2008 a cut-off of 10 identified patients for whom HAEMODIALYSIS was recommended with sensitivity 1.0 (95% CI 0.80–1.00) and negative predictive value 1.0 under BOTH coefficients, at specificity 0.23 (coefficient 1.0) or 0.51 (coefficient 1.25), AUC 0.827 and 0.870. For identifying patients needing ANTIDOTAL THERAPY the same cut-off gave sensitivity 0.90 (95% CI 0.68–0.99) at specificity 0.22 with coefficient 1.0, and sensitivity 0.85 at specificity 0.50 with coefficient 1.25, AUC 0.736 and 0.785. (An earlier version of this page reported 0.90 and 0.85 as a sensitivity/NPV pair for the antidote question; they are two sensitivities, one per ethanol coefficient. Corrected here from the full text.) Suggests osmotically active solute not captured by sodium, glucose, and urea (e.g. a toxic alcohol, ethanol, mannitol, glycerol, propylene glycol, isopropanol, or a pseudo-gap from severe hyperlipidaemia/hyperproteinaemia). Some older sources use a wider normal up to ~14–15, and the measured normal range varies with the formula used: −2 ± 6 in 321 subjects, about −5 to +15 across equations (Hoffman 1993), and roughly −14 to +10 as a 95% population range in secondary renderings of the same data. A value just above 10 therefore sits at the edge of the healthy distribution rather than outside it. PAEDIATRIC DATA DOES EXIST, and this page's earlier claim that it did not — recorded as settled absent — is WITHDRAWN. It widens the same point: in 192 children (median age 6.6 years) the range of normal osmolar gaps is about 22 mOsm (McQuillen 1999), and in 101 children with chronic renal failure the gaps ran 13.7 ± 14.5 mOsm/kg on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis (Dursun 2007). The boundary stays at 10 because that is what the reference-limit literature supports, not because paediatric normals are narrow — a gap a little above 10 in a child is weaker evidence of an unmeasured osmole than the sharpness of the cut-off suggests. The gap does not identify the substance; interpret with the full clinical picture. |
| `osm_gap_ethanol_explained` | [-inf, +inf) | Accounted for by the measured ethanol | The entered ethanol accounts for more than the whole measured-minus-calculated difference: with the ethanol term added, the residual gap is negative under BOTH published divisors (÷3.7 empiric and ÷4.6 ideal). The raw gap is shown for reference and is not read against the 10 mOsm/kg limit, which applies to a gap the ethanol term has not already absorbed. A negative residual is ordinary biological variation, measurement imprecision, or a formula artefact — the measured normal gap centres near −2, not 0 (Hoffman 1993). This does not exclude a co-ingested toxic alcohol; it says only that no unmeasured osmole is needed to explain this pair of numbers (Lynd 2008). |

### Cautions

> Age matters for the calculated value and this calculator does not ask for age, so it will compute a confident-looking osmolality for a neonate. Below 3 months every calculated formula showed both systematic and proportional error, and osmolality in that group should be MEASURED rather than calculated (Berska 2023). From 3 months to 2 years a different equation agreed best with the osmometer; it is not computed here because it needs a potassium this score does not collect.

> A NORMAL OSMOLAR GAP DOES NOT EXCLUDE TOXIC ALCOHOL INGESTION. The measured normal gap centres near −2 with an SD of about 6 (n = 321) and spans about −5 to +15 across equations, so an individual whose own baseline may be NEGATIVE can gain more than 20 mOsm/kg of unmeasured osmole and still read +10. Early presentation before metabolism keeps the gap low for a different reason. The cutoff of 10 sits at the edge of the healthy distribution, not outside it, and the test is never used in isolation.

> THE NORMAL OSMOLAR GAP IN CHILDREN IS WIDE, WIDER THAN THE THRESHOLD ITSELF. Across 192 children the normal range spans about 22 mOsm whichever equation is used (McQuillen 1999), and children in chronic renal failure ran 13.7 ± 14.5 to 15.2 ± 17.6 mOsm/kg. A gap slightly above 10 in a child is weaker evidence of an unmeasured osmole than the cutoff’s sharpness implies. The boundary stays at 10 because that is what the reference-limit literature supports.

### How it is calculated

Calculated osmolality (Smithline–Gardner, the form Choy recommends and guidelines endorse) = 2 × sodium + glucose ÷ 18 + blood urea nitrogen ÷ 2.8 with mg/dL inputs, equivalently 2 × sodium + glucose + urea with every analyte in mmol/L. Osmolar gap = measured − calculated, and a normal gap is conventionally < 10 mOsm/kg. When a measured ethanol is entered the ethanol term is shown both ways, ÷ 3.7 (Purssell empiric) and ÷ 4.6 (ideal molar mass), and the abnormal-gap flag is suppressed only when the residual is negative under both divisors. BUN is not urea, the two differ by a factor of 2.8, and glucose and BUN must be in mg/dL for the divisors to apply.

### Limitations and notes

A gap below 10 does not exclude toxic alcohol ingestion. The measured normal gap centres near −2 with an SD of about 6 (n = 321), spanning about −5 to +15 across equations, so an individual whose own baseline is negative can gain more than 20 mOsm/kg of unmeasured osmole and still read +10; early presentation before metabolism also keeps the gap low. The cutoff of 10 sits at the edge of the healthy distribution rather than outside it, and the test is never used in isolation. Paediatric normal gaps are wide, wider than the threshold itself: across 192 children the normal range spans about 22 mOsm whichever equation is used (McQuillen 1999), and children in chronic renal failure ran 13.7 ± 14.5 to 15.2 ± 17.6 mOsm/kg. A gap slightly above 10 in a child is weaker evidence than the sharpness of the cutoff implies, and the boundary stays at 10 because that is what the reference-limit literature supports. Below 3 months, measure rather than calculate: every calculated formula showed systematic and proportional error under 3 months (Berska 2023), and from 3 months to 2 years a different equation, which needs a potassium this score does not collect, agreed best with the osmometer. This calculator does not ask for age and will still compute for a neonate. Performance at the cutoff of 10 depends on the use case and on the ethanol coefficient, and every figure that follows is ADULT (Lynd 2008), as is the derivation of the 10 cutoff itself (Choy 2016) — the arithmetic is population-independent but this performance is not: for identifying the need for haemodialysis, sensitivity 1.0 and NPV 1.0 under both coefficients, at specificity 0.23 to 0.51; for identifying the need for antidotal therapy, sensitivity 0.90 with coefficient 1.0 (≡ ÷ 4.6) or 0.85 with coefficient 1.25 (≡ ÷ 3.7). The additive formula yields osmolarity while the osmometer yields osmolality, which is one reason a normal gap is non-zero, and a negative gap is ordinary variation rather than a finding. A raised gap does not identify the substance. Reference range for the osmolality value itself is 275–295 mOsm/kg, and the paediatric 280–295 mOsm/kg sits inside it.

### References

- Smithline N, Gardner KD Jr. Gaps—anionic and osmolal. JAMA. 1976;236(14):1594–1597. (PMID 989132)
  - Original Smithline–Gardner formula (default calculated osmolality).
- Choy KW, Wijeratne N, Lu ZX, Doery JCG. Harmonisation of Osmolal Gap — Can We Use a Common Formula? Clin Biochem Rev. 2016;37(3):113–119. (PMID 27872505)
  - Recommends Smithline–Gardner; proposes the gap reference limit of 10 mOsm/kg; healthy SD ≈ 4, uncertainty ≈ ±7.
- Purssell RA, Pudek M, Brubacher J, Abu-Laban RB. Derivation and validation of a formula to calculate the contribution of ethanol to the osmolal gap. Ann Emerg Med. 2001;38(6):653–659. (PMID 11719745)
  - Empiric ethanol divisor 3.7 (factor 1.25 in SI).
- Lynd LD, Richardson KJ, Purssell RA, et al. An evaluation of the osmole gap as a screening test for toxic alcohol poisoning. BMC Emerg Med. 2008;8:5. (PMID 18442409)
  - 10 = most common cut-off; high sensitivity, low specificity; not to be used in isolation.
- Dorwart WV, Chalmers L. Comparison of methods for calculating serum osmolality from chemical concentrations. Clin Chem. 1975;21(2):190–194. (PMID 1112025)
  - Alternate formula (1.86·Na + glucose/18 + BUN/2.8 + 9); not implemented — documented for cross-reference.
- Bhagat CI, Garcia-Webb P, Fletcher E, Beilby JP. Calculated vs measured plasma osmolalities revisited. Clin Chem. 1984;30(10):1703–1705. (PMID 6537784)
  - Alternate formula (Bhagat); not implemented — documented for cross-reference.
- Ranadive SA, Rosenthal SM. Pediatric Disorders of Water Balance. Pediatr Clin North Am. 2011;58(5):1271–1280. (PMID 21981960)
  - Pediatric normal plasma-osmolality range 280–295 mOsm/kg (the value's reference range, not the gap threshold).
- Hoffman RS, Smilkstein MJ, Howland MA, Goldfrank LR. Osmol gaps revisited: normal values and limitations. J Toxicol Clin Toxicol. 1993;31(1):81–93. (PMID 8433417)
  - N = 321. Measured normal gap centres at −2 with SD ≈ 6 mOsm and ranges about −5 to +15 depending on the equation — the basis for calling the 10 cut-off partly conventional (≈ mean + 2 SD), and for treating a negative gap as normal variation. The 95% population range of about −14 to +10 quoted alongside it is a secondary rendering of this distribution (and is arithmetically −2 ± 2 SD), not a figure this abstract prints.
- StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing. Serum-osmolality chapter, NCBI Bookshelf ID NBK567764. (https://www.ncbi.nlm.nih.gov/books/NBK567764/)
  - Reference range 275–295 mOsm/kg for the osmolality VALUE. Tertiary/grey source cited with a retrieval date (retrieved 2026-08-03); the paediatric-specific 280–295 (Ranadive 2011) sits inside it.
- Berska J, Bugajska J, Sztefko K. The accuracy of serum osmolarity calculation in small children. J Med Biochem. 2023;42(1):67–77. (PMID 36819138)
  - 280 samples, first day of life to 2 years (mean age 8.2 ± 7.6 months); measured osmolality 285.8 ± 5.1 mOsm/kgH₂O. Below 3 months every calculated formula showed BOTH systematic and proportional error on Passing–Bablok regression, so osmolality should be measured rather than calculated in that group; from 3 months to 2 years 1.86·(Na+K) + 1.15·glucose + urea + 14 agreed best with the osmometer. RESOLVES a [NEEDS SOURCE]: this is the paper the round-2 pass carried by PMCID alone (PMC9920940) and described as an uncited 'Kraków cohort' — same 280 samples, same day-1-to-2-years range, same 285.8 ± 5.1, same equation. Full bibliographic record confirmed 2026-08-04.
- McQuillen KK, Anderson AC. Osmol gaps in the pediatric population. Acad Emerg Med. 1999;6(1):27–30. (PMID 9928973)
  - PAEDIATRIC OSMOLAR-GAP DATA — the study whose existence this score previously denied. 192 children (median age 6.6 years, 7 days to 17.9 years) in a paediatric ED; mean measured osmolality 284.2 ± 6.9, range 265–311. Concludes that whichever equation is used, the range of normal paediatric osmol gaps is approximately 22 mOsm — more than twice the width of the 10 mOsm/kg limit. (The abstract prints the osmolality unit as mOsm/dL, which is not a unit of osmolality; the magnitude is unambiguously mOsm/kg and sits inside the 275–295 reference range.)
- Dursun H, Noyan A, Cengiz N, et al. Changes in osmolal gap and osmolality in children with chronic and end-stage renal failure. Nephron Physiol. 2007;105(2):p19–21. (PMID 17139190)
  - 101 children with chronic renal failure; osmolar gap 13.7 ± 14.5 mOsm/kg on peritoneal dialysis and 15.2 ± 17.6 after haemodialysis. Corroborates a wide paediatric spread, in a special population rather than a normal reference sample. Bibliographic record confirmed on PubMed 2026-08-04; PubMed carries no abstract for this article, so the numeric values come from the round-4 finding and were not independently re-read here.

### Rights

**freely-reproducible** — The osmolality formulas (coefficients 2, ÷18, ÷2.8), the ethanol divisors (3.7, 4.6), the gap definition (measured − calculated), and the < 10 mOsm/kg reference limit are mathematical facts and numeric thresholds — outside copyright. No verbatim scale-item wording is embedded (serum-osmolality.md IP status).

---

## SpO₂/FiO₂ ratio (S/F)

<a id="sf-ratio"></a>

`sf-ratio` · v1.0.0 · published · respiratory

### Inputs

- **Pulse oximeter oxygen saturation (SpO₂)** — numeric, %, accepts 80 to 97, required
  - Help: Measured at steady state, not during a transient desaturation. Valid for S/F only when 80–97%; above 97% the ratio is not interpretable.
- **Fraction of inspired oxygen (FiO₂)** — numeric, fraction / %, accepts 0.21 to 1, required
  - Help: Room air is 0.21. Accepts a fraction or a percentage.

### Interpretation bands

| Applies to | Range | Label | Description |
| --- | --- | --- | --- |
| `sf_ratio` | [-inf, 150] | ≤ 150 | Corresponds to the severe category for non-invasive-ventilation PARDS in PALICC-2 (2023) (full-facemask CPAP/BiPAP with PEEP ≥ 5 cm H₂O; SpO₂ ≤ 97%). |
| `sf_ratio` | (150, 250] | > 150 to ≤ 250 | Meets the PALICC-2 (2023) non-invasive-ventilation PARDS oxygenation criterion (S/F ≤ 250) and corresponds to the mild/moderate category (S/F > 150). |
| `sf_ratio` | (250, +inf) | > 250 | Above the PALICC-2 non-invasive-ventilation PARDS oxygenation threshold (S/F ≤ 250). Interpret in the full clinical context. |

### How it is calculated

S/F = SpO₂ (%) ÷ FiO₂ (fraction). It is computed only for SpO₂ 80–97%. Above 97% the dissociation curve plateaus and the ratio cannot discriminate, so a value outside that window is rejected rather than scored. The bands are the PALICC-2 (2023) strata for non-invasive-ventilation PARDS (full-facemask CPAP/BiPAP with PEEP ≥ 5 cmH₂O): ≤ 150 is severe, > 150 to ≤ 250 is mild/moderate (≤ 250 meets the NIV-PARDS oxygenation criterion), and > 250 is above the threshold.

### Limitations and notes

The 2024 global adult ARDS definition cuts S/F at ≤ 315, so a value between 250 and 315 is below the adult threshold while above the paediatric one. Both frameworks are correct, so read the number against the one intended. FiO₂ estimation on nasal cannula or low-flow is unreliable. Prefer P/F when a gas is available, and prefer OI/OSI on invasive ventilation.

### References

- Emeriaud G, López-Fernández YM, Iyer NP, et al; PALICC-2. Executive Summary of the Second International Guidelines for the Diagnosis and Management of Pediatric ARDS (PALICC-2). Pediatr Crit Care Med. 2023;24(2):143–168. (PMID 36661420)
- Khemani RG, Thomas NJ, Venkatachalam V, et al; PALISI. Comparison of SpO2 to PaO2 based markers of lung disease severity for children with acute lung injury. Crit Care Med. 2012;40(4):1309–1316. (PMID 22202709)
- Rice TW, Wheeler AP, Bernard GR, et al; NIH NHLBI ARDS Network. Comparison of the SpO2/FiO2 ratio and the PaO2/FiO2 ratio in patients with acute lung injury or ARDS. Chest. 2007;132(2):410–417. (PMID 17573487)

### Rights

**freely-reproducible** — Arithmetic ratio; PALICC-2 numeric thresholds and the Rice/Khemani regression coefficients are facts, not copyrightable expression (pf-sf.md IP status). No verbatim scale-item wording is reproduced.

---

## Vasoactive-Inotropic Score (VIS)

<a id="vis"></a>

`vis` · v1.0.0 · published · fluids-resuscitation · blank scores as normal

### Inputs

- **Dopamine** — numeric, µg/kg/min / mcg/kg/min (spelling), accepts 0 to 50, optional
  - Help: Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×1. Leave blank if not running.
- **Dobutamine** — numeric, µg/kg/min / mcg/kg/min (spelling), accepts 0 to 40, optional
  - Help: Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×1. Leave blank if not running.
- **Epinephrine (adrenaline)** — numeric, µg/kg/min / mcg/kg/min (spelling), accepts 0 to 2, optional
  - Help: Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×100. Leave blank if not running.
- **Milrinone** — numeric, µg/kg/min / mcg/kg/min (spelling), accepts 0 to 1.5, optional
  - Help: Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×10. Leave blank if not running.
- **Vasopressin** — numeric, units/kg/min / milliunits/kg/min, accepts 0 to 0.01, optional
  - Help: Infusion rate in units/kg/min (NOT mcg). Coefficient ×10,000. Accepts milliunits/kg/min. Leave blank if not running.
- **Norepinephrine (noradrenaline)** — numeric, µg/kg/min / mcg/kg/min (spelling), accepts 0 to 2, optional
  - Help: Infusion rate in µg/kg/min (also written mcg/kg/min). Coefficient ×100. Leave blank if not running.

### Interpretation bands

_None declared._

### How it is calculated

VIS = dopamine + dobutamine + 100 × epinephrine + 10 × milrinone + 10,000 × vasopressin + 100 × norepinephrine. This is the original six-drug formula of Gaies 2010, with coefficients unchanged in Gaies 2014. All rates are in µg/kg/min except vasopressin, which is in units/kg/min, the one unit trap in the score. An agent not running contributes 0. The result is a continuous index with no floor, ceiling, age adjustment, or bands.

### Limitations and notes

Phenylephrine is not part of VIS. It is absent from both Gaies papers, so its absence here is correct, not a gap. Newer agents are excluded as a positive decision: proposed coefficients disagree up to 100-fold between sources (methylene blue 1 vs 20, angiotensin II 0.25 vs 25), so including any would break comparability with the literature. The output is always a true Gaies VIS. No cut-point is applied, because none transfers: reported optima span roughly 10–30 across populations (Belletti 2021). For reference, with their effect sizes: Gaies 2010 high VIS means a maximum of 20 or more in the first 24 h or 15 or more in hours 24–48 (adjusted OR 8.1, 95% CI 3.4–19.2); Gaies 2014 uses a single flat maximum of 20 or more in the first 24 h (OR 6.5, 2.9–14.6); Davidson 2012 gives a cohort-specific VIS-at-48-h of 10.5 in neonates and infants after cardiac surgery. VIS is a snapshot; the prognostic quantity in the literature is the maximum over a defined window, which must be defined and labelled. No per-drug dose ceilings are published for VIS (confirmed absent); the input maxima here are local validity bounds with no clinical authority.

### References

- Gaies MG, Gurney JG, Yen AH, Napoli ML, Gajarski RJ, Ohye RG, Charpie JR, Hirsch JC. Vasoactive-inotropic score as a predictor of morbidity and mortality in infants after cardiopulmonary bypass. Pediatr Crit Care Med. 2010;11(2):234–238. (PMID 19794327)
  - Original VIS derivation (primary). Table 1 (p235) is the source of the adjusted OR 8.1 (95% CI 3.4–19.2, p<0.001), of the six coefficients (Box 1), and of the five-group, two-period classification with its per-group cut-points, all now stated in the notes. No extraction gap remains.
- Gaies MG, Jeffries HE, Niebler RA, Pasquali SK, Donohue JE, Yu S, Gall C, Rice TB, Thiagarajan RR. Vasoactive-inotropic score is associated with outcome after infant cardiac surgery: an analysis from the Pediatric Cardiac Critical Care Consortium and Virtual PICU System Registries. Pediatr Crit Care Med. 2014;15(6):529–537. (PMID 24777300)
  - Re-derivation on the same six coefficients (no phenylephrine); source of the single flat threshold quoted in the notes — maximum VIS ≥ 20 in the first 24 h, adjusted OR 6.5 (95% CI 2.9–14.6).
- Davidson J, Tong S, Hancock H, Hauck A, da Cruz E, Kaufman J. Prospective validation of the vasoactive-inotropic score and correlation to short-term outcomes in neonates and infants after cardiothoracic surgery. Intensive Care Med. 2012;38(7):1184–1190. (PMID 22527067)
  - Reproduces the exact formula (Fig 1); provides a cohort-specific VIS48 cut-point of 10.5.
- Wernovsky G, Wypij D, Jonas RA, Mayer JE Jr, Hanley FL, Hickey PR, Walsh AZ, Chang AC, Castañeda AR, Newburger JW, Wessel DL. Postoperative course and hemodynamic profile after the arterial switch operation in neonates and infants. Circulation. 1995;92(8):2226–2235. (PMID 7554206)
  - Original Inotrope Score (dopamine + dobutamine + 100×epinephrine) that VIS extends.
- Sun Y, Wu W, Yao Y. The association of vasoactive-inotropic score and surgical patients' outcomes: a systematic review and meta-analysis. Syst Rev. 2024;13:20. (DOI 10.1186/s13643-023-02403-1)
  - Independent confirmation of the fully expanded six-drug formula and coefficients.
- Belletti A, Lerose CC, Zangrillo A, Landoni G. Vasoactive-Inotropic Score: Evolution, Clinical Utility, and Pitfalls. J Cardiothorac Vasc Anesth. 2021;35(10):3067–3077. (PMID 33069558)
  - Cited for the cut-point controversy quoted in the notes: optimal cut-points reported across studies span roughly 10–30 with no convergence on a single value. That finding comes from the 2026-08-04 review and this full text has not been fetched here; the bibliographic details were resolved against the NCBI E-utilities record for PMID 33069558 on 2026-08-04 rather than recalled.

### Rights

**freely-reproducible** — VIS is a weighted arithmetic sum of drug infusion rates (facts plus a mathematical formula). Coefficients and the formula are not copyrightable, and VIS has no free-text scale-item descriptors to license (vis.md IP status).

---
