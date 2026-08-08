# Endotracheal tube size and depth (pediatric)

> Age-based estimation of the correct **internal diameter (ID, mm)** of an
> endotracheal tube (ETT) and its **insertion depth at the lips (cm)** for a
> child. These are _selection/estimation formulas_, not a severity score: the
> output is a starting-point tube size and depth that must always be confirmed
> clinically (air-leak test, auscultation, capnography, chest rise, and — where
> used — imaging). Tubes 0.5 mm larger and smaller than the estimate must always
> be available.
>
> There are **two size lineages** and they must not be mixed:
>
> - **Uncuffed** — Cole formula: `ID = age/4 + 4` (Cole 1957).
> - **Cuffed** — Khine formula `ID = age/4 + 3.0` (Khine 1997) OR the modern
>   `ID = age/4 + 3.5` used by APLS / Motoyama / Duracher (Duracher 2008). These
>   two cuffed formulas differ by 0.5 mm — the implementation MUST pin and record
>   which one it uses.
>
> **Neonates and infants < 1 year are a separate regime**: the /4 age formulas
> collapse to a single fixed value at age 0 and do not track prematurity, so
> newborn sizing/depth is **weight- and gestational-age-based** (NRP table), not
> formula-based. See the neonatal branch and "Limitations & notes".

---

## Formula / algorithm (exact — every coefficient and branch)

### A. Tube internal diameter (ID, mm)

**A1 — Uncuffed (Cole 1957):**

```
ID_uncuffed (mm) = age_years / 4 + 4
```

Coefficients: multiply age-in-years by 0.25, add 4.0. (Cole 1957, PMID 13478300.)

**A2 — Cuffed, classic (Khine 1997):**

```
ID_cuffed_Khine (mm) = age_years / 4 + 3.0
```

The constant is dropped by 1.0 vs uncuffed (not 0.5) to accommodate the added
outer diameter of the cuff; Khine reported this fit 99% of full-term newborns
through 8-year-olds in their trial (Khine 1997, PMID 9066329).

**A3 — Cuffed, modern (APLS / Motoyama / Duracher):**

```
ID_cuffed_modern (mm) = age_years / 4 + 3.5
```

Duracher 2008 (PMID 18184241) showed the Khine constant of 3.0 **underestimates
optimal size by ~0.5 mm** in children > 1 year and recommended the +3.5 constant;
this is also the cuffed formula published in the APLS manual and attributed to
Motoyama. (Duracher 2008; APLS via aneskey; resus.me.)

**Relationship between cuffed and uncuffed:** a cuffed tube is chosen roughly
**0.5 mm ID smaller** than the uncuffed tube for the same child. Note the
formulas encode this differently: Cole→Duracher is exactly −0.5 (4 → 3.5);
Cole→Khine is −1.0 (4 → 3.0). (StatPearls NBK539747: "cuffed tubes being one-half
size smaller".)

**Rounding:** manufactured ETTs come in fixed 0.5 mm steps (…, 3.0, 3.5, 4.0 …).
The formula output is rounded to the nearest available 0.5 mm; a 0.5 mm larger
and smaller tube must be on hand.

### B. Insertion depth at the lips (oral, cm)

**B1 — Age formula (APLS / PALS), children > 2 years:**

```
depth_at_lips (cm) = age_years / 2 + 12
```

(APLS via aneskey; the same `age/2 + 12` is attributed to the PALS 2000
guideline by the depth review of Weber 2023, PMID 37336629.)

**B2 — Tube-diameter rule (PALS), oral intubation, all pediatric ages:**

```
depth_at_lips (cm) = ID_mm × 3
```

i.e. a 4.0 mm tube is taped at ≈ 12 cm. Validated prospectively for oral ETT
placement in children (StatPearls NBK539747; Weber 2023 lists "ETT ID (mm) × 3
for orotracheal intubation"). B1 and B2 are independent estimates that should
agree within ~1 cm; if they diverge, confirm position by other means.

Both B1 and B2 estimate the distance from the tube tip (mid-trachea) to the
**lips**. For **nasal** intubation add roughly 2–3 cm (nasal depth ≈ oral + 3).
[NEEDS SOURCE — exact nasal constant not verified from a primary source in this
pass; treat the oral formulas as the canonical ones.]

**Infant fixed depths (age < 2 y), where the age formula is not applied:** a
commonly cited step table is ≈ 10 cm at < 6 months, ≈ 11 cm at < 1 year, ≈ 12 cm
at < 2 years. (Reported in secondary summaries alongside APLS; use the neonatal
branch below for newborns. [NEEDS SOURCE — primary APLS pagination for these
three fixed infant values not fetched verbatim in this pass.])

### C. Neonatal branch (newborn / preterm — NOT the age formulas)

For the newborn period, size and depth are read from a **weight / gestational-age
table**, because `age_years ≈ 0` makes the /4 formulas useless and they ignore
prematurity. The NRP-derived table (reproduced by the Merck Manual, and depth
column derived from Kempley 2008, PMID 18372092) is:

| Weight (kg) | Gestational age (wk) | Tube ID (mm) | Depth at lips (cm) |
| ----------- | -------------------- | ------------ | ------------------ |
| 0.5–0.6     | 23–24                | 2.5          | 5.5                |
| 0.7–0.8     | 25–26                | 2.5          | 6.0                |
| 0.9–1.0     | 27–29                | 3.0          | 6.5                |
| 1.1–1.4     | 30–32                | 3.0          | 7.0                |
| 1.5–1.8     | 33–34                | 3.5          | 7.5                |
| 1.9–2.4     | 35–37                | 3.5          | 8.0                |
| 2.5–3.1     | 38–40                | 3.5          | 8.5                |
| 3.2–4.2     | 41–43                | 3.5–4.0      | 9.0                |

Weight thresholds (Merck/NRP): **2.5 mm** if < 1 kg or < 28 wk; **3.0 mm** if
1–2 kg or 28–34 wk; **3.5 mm** if > 2 kg or > 34 wk.

**Neonatal depth rules** (alternatives to the table):

```
depth_at_lips (cm) = weight_kg + 6      (Tochen "weight + 6" / 7-8-9 rule)
```

i.e. 1 kg → 7 cm, 2 kg → 8 cm, 3 kg → 9 cm. Tochen's underlying regression was
`depth = 1.17 × weight_kg + 5.58`, simplified to `weight + 6` (Tochen 1979, PMID
501484). NRP also offers the **nasal–tragus length + 1 cm** method. Both the
`weight + 6` rule and the GA table are known to be **inaccurate at the extremes**,
especially in extremely-low-birth-weight infants (< 750 g), where they tend to
over-insert.

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                | label                        | type   | units / conversion                              | min  | max  | source                                              |
| ----------------- | ---------------------------- | ------ | ----------------------------------------------- | ---- | ---- | --------------------------------------------------- |
| `age_years`       | Age                          | number | years; months ÷ 12, days ÷ 365.25               | 0    | ~12  | Cole 1957 (formula domain; adult size reached ~12y) |
| `cuff`            | Cuffed vs uncuffed           | enum   | `cuffed` \| `uncuffed`                          | —    | —    | Cole 1957 / Khine 1997 / Duracher 2008              |
| `cuffed_constant` | Cuffed formula selector      | enum   | `3.0` (Khine) \| `3.5` (APLS/Motoyama/Duracher) | —    | —    | Khine 1997; Duracher 2008; APLS                     |
| `weight_kg`       | Weight (neonatal path)       | number | kg                                              | 0.4  | ~5   | Merck/NRP; Tochen 1979                              |
| `ga_weeks`        | Gestational age (neonatal)   | number | completed weeks                                 | 23   | 43   | Merck/NRP; Kempley 2008                             |
| `route`           | Intubation route             | enum   | `oral` \| `nasal`                               | —    | —    | APLS (depth differs by route)                       |
| `ett_id_mm`       | Tube internal diameter (out) | number | mm, in fixed 0.5 mm steps                       | 2.0  | ~8.0 | derived; manufactured ETT range                     |
| `depth_cm`        | Depth at lips (out)          | number | cm                                              | ~5.5 | ~20  | derived from B1/B2/C                                |

**Units / conversion notes.** Age enters the ID formula in **years**; a 6-month-old
is age = 0.5. There are no other unit conversions in the age formulas. Standard
manufactured ETT internal diameters run 2.0–10.0 mm in 0.5 mm increments; the
pediatric-relevant window is ~2.0–6.5 mm ID (an ID of 7.0 mm — reached by Cole at
age 12 — is an adult female size, which is why the formula is not used past
adolescence). Depth outputs range from ~5.5 cm (extreme preterm) to ~18–20 cm
(adolescent). No output should ever be interpolated below the smallest
manufactured size (2.0 mm) or accepted without clinical confirmation.

**Domain guards.** `age/4 + 4` and `age/4 + 3.5|3.0` are meant for children
roughly **1–2 years up to ~10–12 years**. Below ~1 year, switch to the neonatal
weight/GA table (branch C). Above ~12 years, use adult sizing (≈ 7.0–7.5 mm
female, 7.5–8.0 mm male) rather than extrapolating the formula.

**The lower guard is enforced, not advisory (implementation v1.1.0,
2026-08-08).** The calculator accepted age 0 until then and returned uncuffed
4.0 mm — for a newborn whose true size is 3.0–3.5 mm. The formulas do not merely
lose accuracy below 1 year, they run in the **over-sizing** direction, which is
the direction that injures a subglottis. Ages below 1 year are now refused so
the reader is sent to branch C rather than handed a plausible wrong number.

**Rounding to a manufactured size, and why ties go down.** Tubes exist only in
0.5 mm steps, so a raw formula value names a real device only by accident:
`age/4 + 3.5` lands exactly between two sizes at **every odd whole year** (1 y →
3.75, 3 y → 4.25, 5 y → 4.75), and a fractional age misses more often still
(7.5 y → 5.375). The implementation rounds **half down**, to the smaller tube.
That is not an arbitrary tie-break — it is the rule that reproduces the sizes
these formulas are taught alongside (1 y cuffed 3.5 / uncuffed 4.0; 3 y cuffed
4.0 / uncuffed 4.5; 5 y cuffed 4.5), all of which rounding half up would
contradict. It also matches the asymmetry of the two errors: a tube 0.5 mm small
is exchanged or tolerated with a larger leak; one 0.5 mm large is the mechanism
of subglottic injury.

---

## Worked examples (each derived from the cited formula)

**Example 1 — Uncuffed tube, 4-year-old.**
_Derived from formula in Cole 1957 (PMID 13478300) + APLS/PALS depth._

- ID = 4 / 4 + 4 = 1 + 4 = **5.0 mm (uncuffed)**.
- Depth (B1) = 4 / 2 + 12 = 2 + 12 = **14 cm at lips**.
- Depth cross-check (B2) = ID × 3 = 5.0 × 3 = **15 cm** → the two estimates agree
  within 1 cm; tape near 14–15 cm and confirm.

**Example 2 — Cuffed tube, 8-year-old, both cuffed formulas.**
_Derived from formulas in Khine 1997 (PMID 9066329) and Duracher 2008 (PMID 18184241)._

- Khine: ID = 8 / 4 + 3.0 = 2 + 3.0 = **5.0 mm (cuffed)**.
- APLS/Duracher: ID = 8 / 4 + 3.5 = 2 + 3.5 = **5.5 mm (cuffed)**.
- The two cuffed formulas differ by exactly 0.5 mm here — this is the pinning
  decision the implementation must make explicit.
- Depth (B1) = 8 / 2 + 12 = 4 + 12 = **16 cm at lips**.
- Depth (B2, using 5.5 mm) = 5.5 × 3 = **16.5 cm** → agree within 1 cm.

**Example 3 — Cuffed tube, 2-year-old.**
_Derived from formulas in Khine 1997 and Duracher 2008 + APLS depth._

- Khine: ID = 2 / 4 + 3.0 = 0.5 + 3.0 = **3.5 mm (cuffed)**.
- APLS/Duracher: ID = 2 / 4 + 3.5 = 0.5 + 3.5 = **4.0 mm (cuffed)**.
- Depth (B1) = 2 / 2 + 12 = 1 + 12 = **13 cm at lips**;
  cross-check (B2, 3.5 mm) = 3.5 × 3 = **10.5 cm** — here the two methods diverge
  by 2.5 cm, illustrating why B1/B2 must be reconciled and position confirmed at
  this young age (B1 tends to over-estimate near its lower age bound).

**Example 4 — Term newborn, 3.2 kg, 40 weeks (neonatal branch).**
_Derived from the NRP/Merck weight-GA table + Tochen 1979 (PMID 501484)._

- Size: 3.2 kg / 40 wk → **3.5 mm ID** (table row 2.5–3.1 → 3.5; 3.2 sits at the
  3.5 vs 3.5–4.0 boundary — a 3.5 mm tube with a 4.0 mm backup).
- Depth (table) = **8.5–9.0 cm**; Tochen `weight + 6` = 3.2 + 6 = **9.2 cm** →
  concordant with the table's 9.0 cm.

**Example 5 (edge case) — Extremely preterm, 0.6 kg, 24 weeks.**
_Derived from the NRP/Merck table; shows why the age formula must NOT be used._

- The `age/4 + 4` formula would give a nonsensical ~4.0 mm ID for a 24-week
  infant. The table gives **2.5 mm ID, depth 5.5 cm**. Note `weight + 6` = 6.6 cm
  would **over-insert** at this weight — a documented failure of the weight rule
  at the extremes; use the GA table (5.5 cm) and confirm radiographically.

---

## Interpretation bands (non-directive, with source)

**This score has no severity / risk interpretation bands.** It is an equipment-
selection estimate, not a graded score, so there is no "normal vs abnormal" band
to report. The clinically meaningful _check_ is not a band but a **fit
verification**, documented here descriptively (non-directive):

- **Air-leak test (uncuffed tubes).** Convention is to aim for an audible leak
  around the tube at roughly **20–30 cmH₂O** of applied airway pressure: a leak
  present below this range may indicate the tube is too small; no leak at higher
  pressure may indicate it is too large. (APLS: correct size "should allow a
  small leak on application of moderate pressure while enabling adequate pulmonary
  inflation"; StatPearls NBK539747.) This range is a descriptive convention, not
  a directive.
- **Depth confirmation.** The depth formulas target a mid-tracheal tip (≈ T1–T2
  on chest radiograph in neonates; NRP). Formula depth is a starting estimate to
  be confirmed by auscultation, capnography, symmetric chest rise, and imaging —
  not an endpoint by itself.

No mortality/severity thresholds apply; do not present size or depth output as a
risk stratum.

---

## References (full, PMID/DOI/URL)

1. **Cole F.** Pediatric formulas for the anesthesiologist. _AMA J Dis Child._
   1957;94(6):672–673. **PMID: 13478300. DOI: 10.1001/archpedi.1957.04030070084009.**
   (Origin of uncuffed `ID = age/4 + 4`.)
2. **Khine HH, Corddry DH, Kettrick RG, Martin TM, McCloskey JJ, Rose JB,
   Theroux MC, Zagnoev M.** Comparison of cuffed and uncuffed endotracheal tubes
   in young children during general anesthesia. _Anesthesiology._
   1997;86(3):627–631. **PMID: 9066329. DOI: 10.1097/00000542-199703000-00015.**
   (Cuffed `ID = age/4 + 3.0`; fit 99% of newborns–8y in trial.)
3. **Duracher C, Schmautz E, Martinon C, Faivre J, Carli P, Orliaguet G.**
   Evaluation of cuffed tracheal tube size predicted using the Khine formula in
   children. _Paediatr Anaesth._ 2008;18(2):113–118. **PMID: 18184241.
   DOI: 10.1111/j.1460-9592.2007.02382.x.** (Khine under-sizes by 0.5 mm;
   recommends cuffed `ID = age/4 + 3.5` for children > 1 y.)
4. **Tochen ML.** Orotracheal intubation in the newborn infant: a method for
   determining depth of tube insertion. _J Pediatr._ 1979;95(6):1050–1051.
   **PMID: 501484.** (Neonatal depth `= 1.17 × weight_kg + 5.58` ≈ `weight + 6`,
   the "7-8-9 rule".)
5. **Kempley ST, Moreiras JW, Petrone FL.** Endotracheal tube length for neonatal
   intubation. _Resuscitation._ 2008;77(3):369–373. **PMID: 18372092.
   DOI: 10.1016/j.resuscitation.2008.02.002.** (Gestational-age depth table
   adopted by NRP; basis of the neonatal depth column above.)
6. **Weber MD, et al.** Recommendations for endotracheal tube insertion depths in
   children. _Respir Care_ / PMC. 2023. **PMID: 37336629. PMCID: PMC10423483.**
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC10423483/ (Reviews depth
   formulas: attributes `age/2 + 12` to PALS 2000 and lists `ID × 3` for oral
   intubation; finds age/height formulas outperform weight formulas.)
7. **StatPearls (Endotracheal Tube).** NCBI Bookshelf **NBK539747.**
   URL: https://www.ncbi.nlm.nih.gov/books/NBK539747/ (Uncuffed `age/4 + 4`,
   cuffed one-half size smaller; depth ≈ `3 × tube size`, e.g. 4.0 tube at 12 cm.)
8. **Advanced Paediatric Life Support (APLS)** tube-sizing summary, reproduced at
   Anesthesia Key. URL: https://aneskey.com/paediatric-advanced-life-support-pals-apls/
   (Uncuffed `age/4 + 4`; cuffed `age/4 + 3.5`; depth `age/2 + 12` for > 2 y;
   infant fixed sizes 2.5–4.0 mm; air-leak criterion.) — course-manual secondary
   source; primary APLS manual pagination not fetched.
9. **Merck Manual Professional — Endotracheal Intubation in Neonates (table).**
   URL: https://www.merckmanuals.com/professional/multimedia/table/endotracheal-intubation-in-neonates
   (Weight/GA → ID and depth table reproduced in branch C; NRP-derived.)
10. **Resus.me — "Kids tracheal tubes: formulas galore."**
    URL: https://resus.me/kids-tracheal-tubes-formulas-galore/ (Attributes cuffed
    `age/4 + 3.5` to Motoyama and `age/4 + 3.0` to Khine < 2 y; uncuffed Cole.) —
    secondary educational source used for the Motoyama attribution.
11. **Choice of the correct size of endotracheal tube in pediatric patients (review).**
    PMC. URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC9663958/ (Cole, Khine,
    Duracher formulas and age-range applicability; Duracher `age/4 + 3.5` "best
    determined" cuffed size.)

---

## Limitations & notes

- **Two cuffed formulas, 0.5 mm apart.** `age/4 + 3.0` (Khine) vs `age/4 + 3.5`
  (Duracher/APLS/Motoyama). Modern evidence favors +3.5 for children > 1 year,
  but the older Khine +3.0 is still widely taught. **Pin and record which
  constant is used** with every result — a "5.0 vs 5.5" difference is one whole
  tube size.
- **Formulas are estimates, not selections.** All published age formulas mis-size
  a meaningful minority of children (studies repeatedly show ~1 in 3 needing a
  tube change with age formulas; ultrasound / height-based methods can do better).
  Always have ±0.5 mm tubes ready and confirm fit clinically.
- **Age-formula domain.** Valid roughly 1–2 y to ~10–12 y. Below ~1 y use the
  neonatal weight/GA table (branch C); above ~12 y use adult sizing. Cole's
  `age/4 + 4` tends to **over-size** in the youngest children in its range.
- **Neonatal / prematurity regime is different.** The /4 formulas ignore weight
  and gestation and collapse at age 0, which is why the calculator refuses ages
  below 1 year outright rather than returning the collapsed value (v1.1.0; it
  previously returned uncuffed 4.0 mm against a true 3.0–3.5). Newborn sizing is
  weight/GA-based, and
  neonatal depth rules (`weight + 6`, the GA table, nasal–tragus + 1 cm) are all
  **inaccurate at the extremes**, over-inserting in ELBW (< 750 g) infants —
  confirm with radiograph.
- **Cuffed tubes in the very small.** Historically avoided < 3 kg; increasingly
  used with modern low-profile cuffs, but cuff position and pressure monitoring
  (≤ ~20–25 cmH₂O) become critical. Cuff status changes the ID formula constant —
  do not apply a cuffed constant to an uncuffed tube or vice-versa.
- **Depth methods can disagree.** `age/2 + 12` and `ID × 3` can differ by > 1 cm,
  especially at the young end (see Example 3). Neither replaces auscultation,
  capnography, and imaging for final tip position.
- **Nasal route not fully specified here.** The oral ("at lips") formulas are
  canonical; the nasal offset (~+2–3 cm) is flagged **[NEEDS SOURCE]**.
- **Non-airway confounders.** Airway anomalies, subglottic stenosis, Down
  syndrome (smaller airway), prior prolonged intubation, and craniofacial
  syndromes all invalidate the population formulas — size down and individualize.
- **Rounding.** Manufactured tubes step by 0.5 mm; formula output must be rounded
  to an available size, never used as a literal fractional ID.

---

## IP status

**Formulas and thresholds — not copyrightable.** `age/4 + 4`, `age/4 + 3.0`,
`age/4 + 3.5`, `age/2 + 12`, `ID × 3`, `weight + 6`, and the NRP weight/GA →
size/depth mapping are mathematical facts and clinical methods (ideas/procedures),
not creative expression. Numeric coefficients, thresholds, and the weight/GA
table values are facts and are freely implementable. TowardPCC may implement all
of the above scoring/selection logic without licensing.

**Items to flag for review before shipping UI text:**

1. **Verbatim guideline sentence wording.** The APLS air-leak phrasing ("should
   allow a small leak on application of moderate pressure…") and any Merck/NRP or
   StatPearls sentence text are expressive prose — reuse the _numbers and method_
   freely but **paraphrase** the sentences and attribute the source. Do not paste
   guideline sentences verbatim into the UI.
2. **Table layout.** The weight/GA/size/depth table _values_ are facts (freely
   reusable); do not copy the exact graphic layout/branding of the Merck or NRP
   chart. Re-typeset it as done here and cite NRP/Kempley + Merck.
3. **"APLS", "PALS", "NRP", "Broselow" are trademarks / program names.** Reference
   them factually as the source of a formula ("the APLS cuffed formula"); do not
   imply endorsement or reproduce their course materials.
4. **Motoyama attribution is secondary.** The `age/4 + 3.5` = "Motoyama" link
   here rests on secondary educational sources (resus.me, review PMC9663958) plus
   the primary Duracher 2008 trial; cite Duracher 2008 (primary) for the +3.5
   constant and treat "Motoyama"/"APLS" as corroborating attributions.

Bottom line: implement every formula, constant, and table value freely;
paraphrase (don't copy) guideline sentences; attribute program names factually.
