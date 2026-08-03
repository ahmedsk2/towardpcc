# Holliday-Segar Maintenance Fluid Requirement (Pediatric)

> Scope: the **Holliday & Segar 1957** method for estimating the **maintenance** water
> requirement of a hospitalized child, plus the derivative bedside **"4-2-1" hourly rule**, plus
> the current-guidance layer that now governs how the number may be used. This is a
> **dosing/target calculation**, not a severity or diagnostic score: it outputs a fluid volume
> (mL/day and mL/hr) as a function of body weight only. It does **not** compute deficit
> (dehydration) replacement or ongoing/abnormal losses — those are added separately in clinical
> practice and are out of scope here.

## Provenance discipline

Every numeric claim below carries one of three tags. This is the discipline of the source review
this file was rebuilt from (`holliday-segar-maintenance-fluids-final.md`, 3 August 2026), and it
is preserved verbatim in spirit because the whole point of this score is that the folklore around
it is heavily mis-sourced.

| Tag            | Meaning                                                               |
| -------------- | --------------------------------------------------------------------- |
| `[1957]`       | Attributable to Holliday & Segar 1957                                 |
| `[LATER]`      | Added by subsequent guidance or convention, **not** in the 1957 paper |
| `[UNVERIFIED]` | Not confirmed against a primary source                                |

**The single most important provenance fact on this page: the 1957 original was NOT read in
full.** Everything tagged `[1957]` reaches us through the AAP 2018 guideline's direct citation of
it, the AAP structured summary, and Chesney's 1998 commentary summary — three secondary routes
that agree with each other. Nothing here may be presented as "we read the original and it says X".
Where the original's own content is genuinely unknown (§Lower bound), this file says so.

Eleven sources were read in full for the 2026-08-03 review: ESPNIC 2022 (Brossier, _Intensive Care
Med_), Brossier 2024 (_Lancet Child Adolesc Health_), AAP 2018 (Feld, _Pediatrics_), Leung 2021
(_Hong Kong Med J_), Chang 2025 (_Pediatr Open Sci_), NICE NG29, RCH Melbourne IV fluids CPG
(updated Jan 2026), Friedman & Ray 2008, Amer 2024, the Be-PIV Belgian consensus, and ReLiSCh-II.

## Formula / algorithm (exact — every coefficient and branch)

Holliday & Segar's central observation was a **direct linear relationship between physiologic
water need (insensible + renal loss, minus water of oxidation) and energy metabolism**, so water
need can be expressed **per unit of caloric expenditure**, and caloric expenditure can in turn be
approximated from body weight.

**Step 1 — water need per 100 kcal metabolized (the physiologic basis) `[1957]`:**

```
insensible water loss      = 50.0   mL / 100 kcal / day
renal (urinary) water loss = 66.7   mL / 100 kcal / day
                             --------------------------
gross loss                 = 116.7  mL / 100 kcal / day
minus water of oxidation   = 16.7   mL / 100 kcal / day
                             --------------------------
net maintenance water need = 100    mL / 100 kcal / day   (≈ 1 mL water per 1 kcal)
```

The paper is denominated in **calories**, not millilitres; the mL/kg/day form in universal use is
a downstream substitution `[LATER]`. That matters operationally, because the electrolyte figures
do not survive the substitution intact (see Electrolytes below). AAP 2018 states the equivalence
as one millilitre of fluid per kilocalorie expended and gives **1500 mL/m²/day** as an alternative
expression of the same quantity `[LATER]`.

**Step 2 — caloric expenditure estimated from body weight (piecewise-linear brackets) `[1957]`:**

| Body-weight bracket | Caloric expenditure                              |
| ------------------- | ------------------------------------------------ |
| 0–10 kg             | 100 cal/kg/day                                   |
| 10–20 kg            | 1000 cal + 50 cal/kg/day for each kg above 10 kg |
| > 20 kg             | 1500 cal + 20 cal/kg/day for each kg above 20 kg |

**Step 3 — maintenance water = caloric expenditure × (100 mL / 100 kcal) ≈ 1 mL/kcal.**
This gives the canonical daily **"100-50-20" rule** — `[1957]` in structure, `[LATER]` in its
mL/kg/day expression:

```
Daily maintenance volume (mL/day), by weight bracket (additive across brackets):

  first 10 kg              : 100 mL/kg/day   × (weight, capped at 10 kg)
  next 10 kg  (10 < kg ≤ 20): 50 mL/kg/day   × (weight above 10 kg, capped at 10 kg)
  each kg > 20 kg          :  20 mL/kg/day   × (weight above 20 kg)
```

Closed form by weight `W` (kg):

```
W ≤ 10:            V_day = 100 * W
10 < W ≤ 20:       V_day = 1000 + 50 * (W - 10)
W  > 20:           V_day = 1500 + 20 * (W - 20)
```

Note that both the ESPNIC 2024 prescribing figure and the RCH 2026 table render the bottom band as
**3–10 kg**, not 0–10 kg `[LATER]`. Neither states a rationale, but the convergence is a
lower-bound signal (see Lower bound).

**Derivative bedside rule — the "4-2-1" hourly rule `[LATER]`.** Each daily rate ÷ 24 h, rounded
to a whole number. **This is not in the 1957 paper**; it is a later anaesthetic simplification, and
a separate, slightly different simplification was published by Oh (_Anesthesiology_ 1980;53(4):351).

```
Hourly maintenance rate (mL/hr), by weight bracket (additive):

  first 10 kg     : 4 mL/kg/hr
  next 10 kg      : 2 mL/kg/hr
  each kg > 20 kg : 1 mL/kg/hr
```

Closed form by weight `W` (kg):

```
W ≤ 10:            V_hr = 4 * W
10 < W ≤ 20:       V_hr = 40 + 2 * (W - 10)
W  > 20:           V_hr = 60 + 1 * (W - 20)
```

**Branch note / two coefficients, one method.** One branch structure (three weight brackets), two
coefficient sets meant to represent the same quantity: daily **100 / 50 / 20 mL/kg/day** and hourly
**4 / 2 / 1 mL/kg/hr**. They are **not exactly equal**: 100 ÷ 24 = 4.167 (rounded to 4),
50 ÷ 24 = 2.083 (rounded to 2), 20 ÷ 24 = 0.833 (rounded to 1). So `V_hr × 24` is close to but not
identical to `V_day` (the 4-2-1 rule slightly _underestimates_ in the first two brackets and
slightly _overestimates_ above 20 kg). An implementation must pick one canonical method per output
and label it.

**The rate cap `[LATER]` — the only capping this implementation performs:**

```
V_hr_capped = min(V_hr, 100)      // 100 mL/hour
```

100 mL/hour is **the one figure every source read for the review states**: NICE NG29, Leung 2021
statement 6.1, RCH 2026, and the Be-PIV Belgian consensus all give it. It is **not** from Holliday
& Segar — the 1957 function is monotonic with no ceiling — and this implementation never attributes
it to them. Under the 4-2-1 rule the cap binds at exactly **60 kg** (`60 + (60 − 20) = 100`), which
is also where RCH's band structure stops and its own cap begins. That coincidence is not a
derivation: it is the same arithmetic seen from two directions.

**Why no daily cap is applied `[LATER]`.** There is no cap in the original, and current guidance
disagrees with itself across a 500 mL range:

| Source                                          | Stated daily maximum                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| Brossier 2024 (ESPNIC group) prescribing figure | **2000 mL/day**                                                      |
| NICE NG29 rec 1.4.1                             | males rarely need >2500, females rarely >2000 (awareness, not a cap) |
| Leung 2021 statement 6.1                        | 2 L/day girls, 2.5 L/day boys, **or 100 mL/hour**; cites NICE        |
| RCH Melbourne CPG (Jan 2026)                    | >60 kg: **2400 mL/day**; 100 mL/hour                                 |
| RCH Melbourne fluids calculator page            | 100 mL/hour (**2500 mL/day**) is the normal maximum                  |
| Be-PIV Belgian consensus                        | a maximum of **2400 mL/day** should not be exceeded                  |
| ESPNIC 2022 (Table 1)                           | **no cap stated** — restriction expressed only as % of HSF           |
| AAP 2018                                        | **no cap stated** — explicitly declines to address rate or volume    |

**The 2400 mL/day figure is a citation error at its point of entry.** Be-PIV attributes it to two
sources, NICE and Leung 2021. Both were read in full for the review and **neither states 2400**;
NICE gives the 2500/2000 sex split and Leung gives the same figures citing NICE for them. 2400 is
arithmetically **100 mL/h × 24 h and nothing more**. RCH's January 2026 guideline states 2400
independently and without citation, and contradicts RCH's own calculator page, which says 2500.
Applied to 70 kg the 1957 arithmetic yields 2500 cal/day, so 2500 — not 2400 — is what the
original's own function produces there.

Consequently: the implementation displays the **uncapped** 100-50-20 daily volume, caps only the
rate, and surfaces the 2000–2500 disagreement as text rather than picking a winner. If a single
daily figure is ever required, ESPNIC's 2000 mL/day is the most defensible for a PICU-facing tool
(same group that sets the restriction percentages, and the most conservative) — but it would still
be a choice among disagreeing sources, not a derived value.

**Electrolyte companion values — per 100 kcal, NOT per kg `[1957]`.** AAP 2018, citing Holliday &
Segar directly, states the final composition as **3 mEq sodium and 2 mEq potassium per 100 kcal
metabolised**; **chloride 2 mEq/100 cal** comes from secondary summaries. Friedman & Ray (2008)
independently flag the per-100-mL-infused basis as the detail routinely dropped from the original.
**Any implementation that scales these per kilogram is wrong, and wrong in a direction that matters
at the extremes of weight.** This implementation computes no electrolytes at all, so it cannot make
that error; the figures are documented here so that a future composition feature starts from the
correct denominator. Three of the five guideline sources read (AAP 2018, Brossier 2024, Leung 2021)
independently state that the 1957 electrolyte and glucose concentrations were estimated to reflect
the composition of **human and cow's milk** `[LATER]` — the shortest citable explanation of why the
original prescription was hypotonic, and none of the three treats it as a defensible modern basis.

## Inputs (id, label, type, units + conversions, plausible min/max with source)

The method takes a **single required input**: body weight.

| id       | label       | type   | units | conversions                                                                                  | plausible min                       | plausible max                |
| -------- | ----------- | ------ | ----- | -------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| `weight` | Body weight | number | kg    | If entered in pounds, kg = lb ÷ 2.20462 (exact unit conversion). If in grams, kg = g ÷ 1000. | **4 kg** (scope floor, hard reject) | ~150 kg (validation ceiling) |

### Lower bound — 4 kg, and why it is a rejection rather than a warning

**The commonly quoted boundaries are not traceable to 1957 `[UNVERIFIED]`.**

- "Applicable only above 2 weeks of age" — traced to a medical-calculator web page carrying a
  **1998 modification date**, from which it propagates into Wikipedia and downstream calculators.
  This claim shipped in v1.0.0 of this score and has been removed.
- "Not suitable for neonates <14 days" — Harriet Lane–derived teaching material.

The AAP structured summary notes that possible exceptions to the 100 mL/100 cal/day figure are
discussed in the body of the 1957 paper, but **the content of those exceptions remains unverified**
and no secondary source read reproduces them.

**Guideline scopes disagree at the bottom `[LATER]`:**

| Source      | Lower bound                                                 | Note                             |
| ----------- | ----------------------------------------------------------- | -------------------------------- |
| ESPNIC 2022 | **term** (37 weeks GA); preterm and intraoperative excluded | outlier — includes term neonates |
| AAP 2018    | **28 days**; NICU excluded                                  |                                  |
| Leung 2021  | **>28 days**; neonatal units and ICU/PICU excluded          |                                  |
| NICE NG29   | covers term neonates via a **separate day-of-life ladder**  |                                  |
| RCH 2026    | **1 month**; excludes neonates and premature babies         | table band starts at 3 kg        |

ESPNIC's own limitations section states that apart from phototherapy trials, term neonates were
rarely analysed as a distinct group and extrapolation to them should be cautious.

**Why a weight guard cannot do this job.** A 3.2 kg term neonate on day 2 needs roughly
**70–80 mL/kg/day** `[LATER]` (NICE day-of-life ladder, below), and weight alone cannot distinguish
that infant from a well 3.2 kg two-month-old for whom 100 mL/kg/day is right. The two answers
differ by about 25% at the same weight. The review's recommended behaviour is therefore: **require
postnatal age; reject or hard-warn below 4 kg; flag 1–3 months for fluid-type caution; do not
silently compute.**

This implementation does not collect postnatal age, so it takes the strictest available option: a
**hard rejection below 4 kg**, plus a caution stating in terms that between 4 kg and roughly one
month of postnatal age the tool is still out of scope and the number must not be used. 4 kg is a
scope floor, not a physiologic threshold — it is the smallest weight at which a patient is unlikely
to be a neonate, chosen because it is the review's recommendation and because everything below it
is exactly the population five guidelines exclude.

**NICE term-neonate rates `[LATER]` — the ladder this score does NOT implement:**

| Postnatal age  | Rate              |
| -------------- | ----------------- |
| Birth to day 1 | 50–60 mL/kg/day   |
| Day 2          | 70–80 mL/kg/day   |
| Day 3          | 80–100 mL/kg/day  |
| Day 4          | 100–120 mL/kg/day |
| Days 5–28      | 120–150 mL/kg/day |

NICE defines neonates as 28 days and under, born at term or at corrected term age.

**Evidence that the neonatal exclusion is warranted `[LATER]`.** Chang et al. 2025 studied 174
infants ≥34 weeks GA on dextrose-containing fluids at a mean intake of 57.2 mL/kg/day at 24 hours:
75% had positive fluid balance, 39% had sodium ≤134 mEq/L, 24% had sodium ≤132 mEq/L, and serum
sodium fell 0.07 mEq/L per mL/kg of positive fluid balance (95% CI −0.09 to −0.05, p<0.001).
**Term infants fared worse than late preterm** — 31% vs 17% reached sodium ≤132 (OR 2.22, 95% CI
1.08–4.54, p=0.03). The direction is counterintuitive and argues specifically against extrapolating
downward from paediatric bands on the assumption that bigger is safer. Amer et al. 2024 found
isotonic fluid significantly increased hypernatraemia risk specifically in neonates (RR 3.74, 95%
CI 1.42–9.85, p=0.008), a subgroup signal running opposite to that review's overall finding.

**A distinct 1–3 month sub-band `[LATER]`.** Leung 2021 statement 5.4 identifies a band no other
guideline separates: most tonicity RCTs recruited infants from 3 months of age and all contained
few young infants, so because of immature kidneys, infants aged **1 to 3 months** may need
electrolyte monitoring to catch hypernatraemia or hyperchloraemic acidosis, particularly on 0.9%
NaCl; Leung suggests a dextrose-containing **balanced** solution with lower sodium chloride content
for this band. This is a fluid-**type** flag, entirely separate from the volume calculation, and is
carried in notes rather than in arithmetic.

### Upper bound — 60 kg is the defensible anchor; 70 kg is not

**60 kg `[LATER]`** is where RCH's band structure stops and its cap begins. No source read supports
a higher paediatric anchor. Under the 4-2-1 rule it is also exactly where the 100 mL/h rate cap
binds, which is why this implementation needs no separate 60 kg constant.

**70 kg `[UNVERIFIED]`.** The 70 kg upper anchor, based on the third linear segment of the 1957
figure spanning 20–70 kg, rests on secondary description. **The figure itself was not inspected and
none of the eleven full texts reproduces or describes it. 70 kg must not be shipped as an
original-source claim**, and this implementation ships no 70 kg constant anywhere.

The ~150 kg maximum is an **input-sanity ceiling only** — it stops nonsensical entry and asserts
nothing clinical. It is deliberately not lowered to 60 kg: RCH does not reject above 60 kg, it caps
there, and rejecting would over-read the source.

**What replaces the formula above the paediatric range `[LATER]`:** BSA insensible-loss form
300–400 mL/m²/24 h plus urine output (NICE 1.4.10; Leung 6.1; ESPNIC); BSA total form
1500 mL/m²/24 h (Leung 6.1, for patients >10 kg); ideal body weight for the maintenance rate
(RCH 2026); adult guidance 25–30 mL/kg/day (NICE CG174; IFA 2020). NICE's operative trigger for
switching to BSA is weight above the **91st centile**, AKI, known CKD, or cancer; Leung's trigger
is concordant. Leung 6.1 additionally states that clinicians should **not prescribe maintenance IVF
at rates above the calculated maintenance rate** — a standing warning, not a computation.

Weight is a positive real number; `min > 0` is inherent, and the 4 kg floor subsumes it.

## Worked examples

All examples are derived step-by-step from the closed forms above. The band structure they exercise
is the one printed identically by NICE NG29 1.4.1, RCH 2026 and Brossier 2024, all three of which
cite Holliday & Segar 1957 for it. Example 4's hourly figure (75 mL/hr for 35 kg) is additionally
the worked example printed in the University of Iowa Head and Neck Protocols.

**Example 1 — infant, 8 kg (first bracket only):**

```
Daily : V_day = 100 * 8               = 800 mL/day
Hourly: V_hr  = 4 * 8                 = 32 mL/hr
Capped: min(32, 100)                  = 32 mL/hr   (cap not binding)
```

(Cross-check: 800/24 = 33.3 mL/hr against the 4-2-1 rule's 32 — the expected rounding gap.)

**Example 2 — child, 32 kg (all three brackets):**

```
Daily : V_day = 1500 + 20 * (32 - 20) = 1740 mL/day
Hourly: V_hr  = 60   + 1  * (32 - 20) = 72   mL/hr
Capped: min(72, 100)                  = 72   mL/hr   (cap not binding)
```

Equivalent additive form (daily): (10×100) + (10×50) + (12×20) = 1000 + 500 + 240 = **1740 mL/day**.

**Example 3 — child, 15 kg (first two brackets):**

```
Daily : V_day = 1000 + 50 * (15 - 10) = 1250 mL/day
Hourly: V_hr  = 40   + 2  * (15 - 10) = 50   mL/hr
```

Additive form (hourly): (10×4) + (5×2) = 40 + 10 = **50 mL/hr**.

**Example 4 — child, 35 kg (Iowa protocol worked example for the hourly figure):**

```
Daily : V_day = 1500 + 20 * (35 - 20) = 1800 mL/day
Hourly: V_hr  = 60   + 1  * (35 - 20) = 75   mL/hr
```

Additive form (hourly): (10×4) + (10×2) + (15×1) = 40 + 20 + 15 = **75 mL/hr**.

**Boundary check — exactly 10 kg and exactly 20 kg:** at W = 10, V_day = 100×10 = 1000
(= 1000 + 50×0); at W = 20, V_day = 1000 + 50×10 = 1500 (= 1500 + 20×0). The piecewise brackets
join continuously — no discontinuity at the knots.

**Rate-cap boundary — exactly 60 kg, and above it:**

```
W = 60 : V_day = 1500 + 20*40 = 2300 mL/day ; V_hr = 60 + 40 = 100 ; capped = 100  (attained, not cut)
W = 70 : V_day = 1500 + 20*50 = 2500 mL/day ; V_hr = 60 + 50 = 110 ; capped = 100  (cap binds)
W = 150: V_day = 1500 + 20*130 = 4100 mL/day; V_hr = 60 + 130 = 190; capped = 100  (cap binds)
```

60 kg is the exact weight at which the 4-2-1 rule reaches 100 mL/h — the cap is **attained** there
and **binds** above it. Note also that the uncapped daily volume at 70 kg is 2500 mL/day. That
figure is worth stating because it falsifies the 2400 mL/day maximum arithmetically rather than
rhetorically, and because no guideline daily cap matches it exactly. It is **not** evidence that
70 kg is the top of the 1957 range: the 20–70 kg third segment is `[UNVERIFIED]` (see Upper bound),
and 70 kg appears here only as a weight the band structure is evaluated at.

**No-daily-cap check.** A cap reintroduced at any of the circulating figures would show as a
plateau, so the daily volume is asserted to rise strictly across the whole accepted range, and
2400 mL/day specifically is asserted to be passed through rather than stopped at (65 kg → 2400,
66 kg → 2420).

**Lower-bound rejection:** 3.2 kg is rejected. It is the review's own example — a term neonate on
day 2 at that weight needs 70–80 mL/kg/day, and the formula would return 320 mL/day (100 mL/kg/day)
for it, roughly 25–45% too much.

## Interpretation bands (non-directive, with source)

**This score has no interpretation/risk bands.** Holliday-Segar is a maintenance-fluid dosing
estimate, not a severity index or diagnostic classifier: its output is a target volume, not a
category, and there is no published cut-point that stratifies patients into risk groups.

Non-directive framing for display: present the computed maintenance volume as an **estimate of
baseline water need under basal conditions**, explicitly noting that it (a) excludes any
pre-existing fluid deficit and ongoing abnormal losses, (b) is an unrestricted ceiling from which
current guidance subtracts rather than a rate to prescribe, and (c) requires clinical adjustment.
Do not present the number as a prescription or an automated order.

## Current guidance modifying the 1957 method `[LATER]`

The volume structure survived. The fluid did not, and the volume is now under active revision.

### Tonicity — settled

**AAP 2018** single key action statement 1A: patients 28 days to 18 years requiring maintenance IVF
should receive **isotonic** solutions with appropriate potassium chloride and dextrose, because
these significantly reduce hyponatraemia risk. Evidence quality A, strength strong. Supporting
data: 17 RCTs, 2455 patients (2313 with primary outcome data); 16 of 17 favoured isotonic.
**Number needed to treat with isotonic to prevent one case of hyponatraemia (Na <135) is 7.5; for
moderate hyponatraemia (Na <130), 27.8.**

**AAP explicitly makes no recommendation on volume, rate, buffered-vs-saline choice, or potassium
provision, and says so in its own conclusions. Any calculator citing AAP for a rate is misciting
it.**

**ESPNIC 2022:** 17 RCTs, 3356 patients — isotonic reduced hyponatraemia risk, OR 0.41 (95% CI
0.26–0.67), p=0.0003, with high heterogeneity (I²=72%). Grade A, strong consensus. ESPNIC also
recommends **balanced** solutions (Grade A acutely ill, Grade B critically ill) on a
length-of-stay basis: mean difference −0.20 days (95% CI −0.33 to −0.08, p=0.001) across 5 studies,
283 patients; Brossier 2024 cites a second pooled estimate of −0.33 days (95% CI −0.58 to −0.09,
p=0.007) in 213 children. **Lactate-buffered solution should not be used in severe liver
dysfunction** (ESPNIC, Grade D).

### Volume — the newer, weaker, internally contested recommendation

**ESPNIC 2022 Table 1 (GCP, strong consensus):** restrict to **65–80%** of the calculated volume
where there is risk of increased endogenous ADH secretion; **50–60%** where there is greater risk
of oedematous states (heart, renal, hepatic failure). ESPNIC's separate Grade C recommendation
states that the amount and duration of restriction are **uncertain** — the guideline says so in its
own recommendation text.

**NICE 1.4.9:** restrict to **50–80%** of routine maintenance, or reduce on insensible losses of
300–400 mL/m²/24 h plus urine output. NICE does not split the band.

**Leung 6.2:** **60–80%** for SIADH risk; **50%** for CNS conditions (meningitis, encephalitis,
major head injury) where cerebral oedema is a concern.

**RCH 2026 operational default:** the majority of unwell children retain water and require **less
than full maintenance, e.g. two-thirds**; the full-maintenance table applies to well children only.
High-risk groups named: acute CNS conditions, pulmonary conditions including mechanical
ventilation, post-operative, trauma.

Three sources, three bands, plus a fourth default. **A calculator offering a restriction toggle
must name which one it implements.** This implementation offers none, and says so.

**Fluid creep — what counts toward the total** (ESPNIC Grade D, strong consensus; Leung statement 6
concurs): IV fluids, blood products, all IV medications including infusions and bolus drugs,
arterial and venous line flush solutions, and enteral intake — but **not** replacement fluids or
massive transfusion. A maintenance calculator that returns a number without prompting for
concurrent fluids is giving a figure the guidelines say should be reduced before prescribing.

### The counter-evidence on volume — state it, do not bury it

**ESPNIC PICO 5 meta-analysis:** restrictive strategy associated with a smaller change in plasma
sodium at ≥12 h — mean difference 1.95 (95% CI 0.29–3.62), p=0.02. But this pools **167 patients in
six subgroups from three RCTs** (Singhi 1995, Yung 2009, Neville 2010), whose restriction arms used
65%, <2/3 and <50% of the calculated volume respectively. ESPNIC grades its own volume
recommendations C, D and GCP — the weakest in the document.

**Leung statement 6 reaches the opposite emphasis:** citing the Cochrane review's four mostly
surgical RCTs with restricted-rate arms, 0.45% NaCl at under 70% maintenance did **not** protect
against hyponatraemia, and Leung concludes that **fluid type matters more than fluid rate**.

**AAP concurs on that point:** the increased hyponatraemia risk with hypotonic fluid **persisted in
the subgroup of patients who received fluid at a restricted rate**.

**Therefore: restriction is defensible for avoiding fluid overload, and ESPNIC recommends it on
that basis. It is NOT established as a substitute for correct tonicity. A calculator must not
present restriction as hyponatraemia prophylaxis.** This is a hard content rule for this score's
user-visible text.

**Brossier 2024 states the residual uncertainty:** there is currently no reliable way to predict
the daily maintenance fluid volume requirement for children in acute or critical care, and a
causative link between restriction strategies and reduced fluid overload remains to be shown.

### Glucose, potassium, monitoring

- **Glucose:** ESPNIC — sufficient to prevent hypoglycaemia, guided by at least daily blood glucose
  (GCP); not excessive in critically ill children (Grade B). Perioperative 1–2.5% (AWMF); general
  paediatric practice 5%, or 10% in the youngest.
- **Potassium:** ESPNIC — appropriate amount considered and added with regular monitoring (GCP).
  Leung 5.8 — no evidence-based recommendation exists, but many guidelines suggest 10–20 mmol/L KCl
  after confirming normal serum potassium and creatinine and no renal impairment risk.
- **Other electrolytes:** ESPNIC — insufficient evidence for routine magnesium, calcium, phosphate,
  vitamins or trace elements (GCP, strong consensus).
- **Monitoring:** NICE 1.4.4 — plasma electrolytes and blood glucose at initiation and at least
  every 24 hours. ESPNIC — at least daily reassessment of fluid balance and clinical status, regular
  sodium (Grade D). Leung 8.3 — review fluid status, ongoing loss, oral tolerance and continued IVF
  need preferably at least twice daily; note weight fluctuation beyond ±3% in 24 hours. RCH 2026 —
  electrolytes and glucose before starting, then at least every 24 h if continuing above 50%
  maintenance, and 4–6 h after starting in more unwell children.

## References (full, PMID/DOI/URL)

1. **Holliday MA, Segar WE.** The maintenance need for water in parenteral fluid therapy.
   _Pediatrics._ 1957 May;19(5):823–832. **PMID 13431307. DOI 10.1542/peds.19.5.823.** — _Origin of
   the method._ **Not read in full**; everything attributed to it here reaches us through AAP 2018's
   direct citation, the AAP structured summary, and Chesney's 1998 commentary. Citation hazards
   worth not propagating: the journal is _Pediatrics_, **not** _Journal of Pediatrics_ (the Iowa
   protocols carry that error), and the page range is 823–832 (some lists render 823–8232).
2. **Feld LG, Neuspiel DR, Foster BA, et al.** Clinical Practice Guideline: Maintenance Intravenous
   Fluids in Children. _Pediatrics._ 2018;142(6):e20183083. **DOI 10.1542/peds.2018-3083.** —
   _Isotonic key action statement 1A; NNT 7.5 / 27.8; 50–60 kcal/kg/day measured expenditure; the
   3 Na / 2 K per 100 kcal composition cited directly from the original; explicit refusal to
   recommend a rate or volume._
3. **Brossier DW, Tume LN, Briant AR, et al.** ESPNIC clinical practice guidelines: intravenous
   maintenance fluid therapy in acute and critically ill children. _Intensive Care Med._
   2022;48(12):1691–1708. **DOI 10.1007/s00134-022-06882-z.** — _Restriction percentages (65–80% /
   50–60%), fluid-creep inclusion list, balanced-solution and lactate recommendations, PICO 5
   counter-evidence, self-graded C/D/GCP volume recommendations._
4. **Brossier DW, Goyer I, Verbruggen SCAT, et al.** Intravenous maintenance fluid therapy in
   acutely and critically ill children: state of the evidence. _Lancet Child Adolesc Health._
   2024;8(3):236–244. **DOI 10.1016/S2352-4642(23)00288-2.** — _2000 mL/day figure in the
   prescribing box; 3–10 kg bottom band; "developed from studies of healthy children"; residual
   uncertainty statement._
5. **Leung LCK, So LY, Ng YK, et al.** Initial intravenous fluid prescription in general paediatric
   in-patients aged >28 days and <18 years: consensus statements. _Hong Kong Med J._
   2021;27(4):276–286. **DOI 10.12809/hkmj209010.** — _Statement 6.1 (2 L girls / 2.5 L boys or
   100 mL/hour; do not exceed calculated maintenance), statement 6.2 restriction bands, statement
   5.4 the 1–3 month band, statement 6 "fluid type matters more than fluid rate", statement 8.3
   monitoring._
6. **NICE.** Intravenous fluid therapy in children and young people in hospital. NG29, published
   9 Dec 2015, last updated 11 Jun 2020. URL: https://www.nice.org.uk/guidance/ng29 — _Rec 1.4.1
   sex-split awareness volumes and 100 mL/hour; 1.4.2 day-of-life neonatal ladder; 1.4.4 monitoring;
   1.4.9 50–80% restriction; 1.4.10 BSA insensible-loss form; 91st-centile BSA trigger._
7. **Royal Children's Hospital Melbourne.** Clinical Practice Guideline: Intravenous fluids,
   updated January 2026. URL: https://www.rch.org.au/clinicalguide/guideline_index/Intravenous_fluids/
   — _>60 kg band and 2400 mL/day maximum with 100 mL/hour; 3 kg table floor; 1 month scope;
   two-thirds operational default; ideal body weight in obesity. Its own calculator page states
   2500 mL/day, contradicting the guideline._
8. **Chang AJ, York DJ, Chen W, Heidenreich KN, Shah MD.** Maintenance Fluids for Late Preterm and
   Term Infants: Is it Time to Reconsider? _Pediatr Open Sci._ 2025;1(2).
   **DOI 10.1542/pedsos.2024-000372.** — _174 infants ≥34 weeks GA; the sodium-vs-fluid-balance
   slope; term worse than late preterm._
9. **Amer BE, Abdelwahab OA, Abdelaziz A, et al.** Efficacy and safety of isotonic versus hypotonic
   intravenous maintenance fluids in hospitalized children. _Pediatr Nephrol._ 2024;39(1):57–84.
   **DOI 10.1007/s00467-023-06032-7.** — _Neonatal hypernatraemia subgroup signal (RR 3.74);
   ≤70% = restricted, 80–120% = maintenance definition._
10. **Friedman AL, Ray PE.** Maintenance fluid therapy: what it is and what it is not.
    _Pediatr Nephrol._ 2008;23(5):677–680. **DOI 10.1007/s00467-007-0610-3.** — _Independent flag
    that the per-100-mL-infused electrolyte basis is the detail routinely dropped from the
    original._
11. **University of Iowa Head and Neck Protocols — Pediatric Fluid Management.** URL:
    https://iowaprotocols.medicine.uiowa.edu/protocols/pediatric-fluid-management — _Source of the
    35 kg → 75 mL/hr worked example only. **This page miscites the 1957 paper's journal**; use it
    for the worked example, not for provenance._
12. **Chesney RW.** Commentary on Holliday & Segar. _Pediatrics._ 1998;102(Suppl 1):229–230.
    **DOI 10.1542/peds.102.S1.229. PMID 9651436.** — _Historical commentary; a distinct record from
    the 1957 original, not to be conflated with it._

**Not carried as a formal reference:** the **Be-PIV Belgian consensus** (Boret A, Blits M, Raes A,
et al., _Belgian Journal of Paediatrics_), which is the point of entry for the 2400 mL/day citation
error and was read in full for the review. The review supplies no DOI or stable URL for it, and one
will not be invented here — it is named in the score's notes as the source of the error, which is
where the fact matters.

**Deliberately demoted from v1.0.0's reference list:** Wikipedia's Holliday–Segar entry and
OpenAnesthesia's perioperative-fluids page. Both were used in v1.0.0 to source the ">2 weeks of
age" limitation, which the 2026-08-03 review traced to a 1998-vintage calculator web page and which
is not attributable to 1957. Their arithmetic (the 32 kg → 1740 mL example) is reproducible from
the band structure and needs no secondary source.

## Limitations & notes

The seven bullets below are the review's own Recommended Limitations panel, adopted as-is; the rest
are implementation-specific.

- Derived from **estimated** caloric expenditure in mid-1950s hospitalised children, using a
  midpoint between basal and normal-activity energy requirements.
- **Measured** energy expenditure in acutely ill or postoperative children is closer to
  **50–60 kcal/kg/day** (AAP 2018, by calorimetry, sitting near Talbot's basal metabolic rate) —
  roughly **half** the formula's 100 kcal/kg assumption for the first 10 kg. This is the
  quantitative reason current guidance restricts. Brossier 2024 puts the structural objection
  plainly: the approach was developed from studies of healthy children, and hospitalised children
  are by definition not healthy.
- Electrolyte and glucose figures were estimated from the composition of **human and cow's milk**.
- Does not account for fever, burns, tachypnoea, or altered ADH physiology.
- Current guidance recommends infusing **less** than the calculated volume in most hospitalised
  children.
- Any daily cap displayed is a **guideline convention, not a derived value**; current guidelines
  give figures from **2000 to 2500 mL/day**.
- **Restriction is recommended to avoid fluid overload. It is NOT established as a substitute for
  correct tonicity in preventing hyponatraemia.**

Implementation-specific:

- **Not a clinical device; estimate only.** It excludes deficit (dehydration) replacement and
  ongoing/abnormal losses (fever, vomiting, diarrhoea, drains, third-spacing), which are computed
  and added separately.
- **Hypotonic-fluid hazard.** The 1957 method paired this volume with hypotonic,
  dextrose-containing solutions. The **volume** rule stands; the **composition** is superseded by
  AAP 2018 / ESPNIC 2022 in favour of isotonic, ideally balanced, solutions with glucose ±
  potassium. The `[NEEDS SOURCE]` marker that stood here in v1.0.0 is **closed** by references 2
  and 3.
- **Daily vs hourly rounding (implementation-critical).** 100/50/20 ÷ 24 = 4.167/2.083/0.833, so
  `V_hr × 24 ≠ V_day` in general. Both outputs are emitted and labelled by rule so neither is
  mistaken for the other.
- **The rate cap is a guideline overlay, not part of the method.** It is attributed to NICE, Leung,
  RCH and Be-PIV and never to Holliday & Segar.
- **Weight basis.** Standard practice uses actual body weight for maintenance in most children; in
  obesity, RCH 2026 suggests considering ideal body weight and NICE switches to BSA above the 91st
  centile — neither is implemented here.
- **Open items that do not block release.** (1) The exceptions passage in the 1957 original —
  materiality low, because five current guidelines set the lower bound independently and none
  defers to 1957 for it. (2) The 20–70 kg third segment — materiality low; 60 kg used instead.
  (3) Cochrane CD009457's rate/volume subgroup, known only through Leung's and AAP's descriptions —
  materiality moderate, and it is the reason this score's text carries no hyponatraemia claim for
  restriction.

## IP status

- **Formula/threshold-based method — not copyrightable.** A piecewise-linear arithmetic function of
  body weight. Coefficients (100/50/20, 4/2/1), bracket thresholds (10 kg, 20 kg) and the 100 mL/h
  guideline rate cap are facts and a mathematical formula, not protected expression.
- **No proprietary scale wording.** This method has no free-text response items or verbatim
  descriptors to license — every element is a number (a weight in, a volume out). All prose here and
  in the implementation is this project's own.
- **Attribution (academic norm, not a legal restriction):** cite Holliday & Segar 1957 as the origin
  of the method, and cite the guideline sources separately for every figure that is not theirs. The
  name "Holliday-Segar" is an eponym, not a trademark.
