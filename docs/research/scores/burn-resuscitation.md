# Pediatric burn fluid resuscitation (Parkland, modified Brooke, Galveston, Cincinnati)

Estimated 24-hour intravenous fluid volume for acute burn shock resuscitation in
children. This is a **dosing/therapy formula, not a diagnostic severity score** —
it outputs a starting fluid volume and infusion rate that is then **titrated to
urine output**, not a risk band. Several formulas coexist; this note gives the
exact coefficients for each, plus the pediatric additions (maintenance fluid,
dextrose) that distinguish children from adults, and the TBSA-estimation method
(Lund–Browder) children require.

Key pediatric differences vs. adults, up front:

1. Children get a **lower weight coefficient** in the crystalloid formulas
   (typically 3 mL vs. 4 mL/kg/%TBSA for Parkland) but a **higher per-kg
   baseline need**, so pediatric protocols **add maintenance fluid** (Holliday–
   Segar) on top of the resuscitation volume — adults do not.
2. Children get **dextrose** in the maintenance fluid (limited glycogen stores →
   hypoglycemia risk).
3. **%TBSA must be estimated with the age-adjusted Lund–Browder chart**, not the
   Rule of Nines (a child's head is a much larger fraction of BSA than an
   adult's).
4. **Surface-area–based formulas** (Galveston, Cincinnati) exist specifically for
   children because burn losses and maintenance both scale with body surface
   area, which the weight-only formulas track poorly at the extremes of size.

---

## Formula / algorithm (exact — every coefficient and branch)

### Common structure

- Fluid: **lactated Ringer's (LR)** for initial resuscitation across all age
  groups.
- **Clock starts at the time of the burn injury, not the time of presentation.**
  The first-8-hour volume is counted from injury; if the patient arrives late,
  the already-elapsed time is subtracted and the remaining first-8h volume is
  given over the time left. (StatPearls NBK534227, NBK537190.)
- Standard temporal split (Parkland, modified Brooke, Galveston, Cincinnati):
  **half of the 24-hour resuscitation volume in the first 8 hours, the remaining
  half over the next 16 hours.** (StatPearls; Romanowski & Palmieri 2017.)
- %TBSA counts **second- and third-degree (partial- and full-thickness) burn
  only**; superficial (first-degree/erythema) is excluded. (StatPearls.)

### 1. Parkland formula (Baxter)

```
Adult:      24-h LR volume = 4 mL × weight(kg) × %TBSA
Pediatric:  24-h LR volume = 3 mL × weight(kg) × %TBSA   ("modified Parkland")
            half in first 8 h, remainder over next 16 h
```

- Adult coefficient **4 mL/kg/%TBSA**; pediatric commonly reduced to
  **3 mL/kg/%TBSA**. (StatPearls NBK534227 & NBK537190; the pediatric 3 mL rate
  is explicitly used as "modified Parkland formula rate (3 mL/%TBSA/kg/day)" in
  the institutional protocol assessment, PMC11958416.)
- **Pediatric addition — maintenance fluid** on top of the resuscitation volume,
  because the Parkland formula alone under-resuscitates small children (it
  ignores baseline metabolic water needs). Maintenance is computed by the
  **Holliday–Segar** method (below), typically as a dextrose-containing fluid.
  (StatPearls NBK537190; Romanowski & Palmieri 2017.)

### 2. Modified Brooke formula

```
Adult:      24-h LR volume = 2 mL × weight(kg) × %TBSA
Pediatric:  24-h LR volume = 3 mL × weight(kg) × %TBSA
            half in first 8 h, remainder over next 16 h
            + maintenance fluid (children)
```

- Adult **2 mL/kg/%TBSA**; pediatric **3 mL/kg/%TBSA**. (StatPearls NBK534227.)
- The 2024 **American Burn Association Clinical Practice Guideline** recommends
  _initiating_ adult resuscitation at the **modified-Brooke 2 mL/kg/%TBSA** rate
  (to reduce over-resuscitation/"fluid creep") and titrating up as needed; the
  CPG scope is **adults ≥20% TBSA only** and does not set a pediatric starting
  coefficient. (Cartotto et al. 2024, PMID 38051821.)

### 3. Galveston formula (Shriners–Galveston; surface-area based, includes maintenance)

```
24-h volume = 5000 mL/m² × (BSA burned, m²)      [resuscitation]
            + 2000 mL/m² × (total BSA, m²)        [maintenance]
            half in first 8 h, remainder over next 16 h
Fluid: lactated Ringer's + 12.5 g of 25% albumin per liter + 5% dextrose as needed
```

- `BSA burned (m²) = %TBSA/100 × total BSA (m²)`.
- Resuscitation term **5000 mL/m² of BSA burned**; maintenance term
  **2000 mL/m² of total BSA**. (Romanowski & Palmieri 2017, ref. to Carvajal;
  StatPearls NBK534227.)
- Maintenance is **built into** the formula (unlike Parkland/Brooke, where it is
  added separately). This is a major reason SA-based formulas are favored in
  small children.

### 4. Cincinnati formula (Shriners–Cincinnati; weight + surface-area, age-branched fluid)

```
24-h volume = 4 mL × weight(kg) × %TBSA  +  1500 mL/m² × (total BSA, m²)
            half in first 8 h, remainder over next 16 h

Older children — LR throughout.
Younger children — age-branched fluid composition:
   first 8 h:  LR + 50 mEq sodium bicarbonate per liter
   second 8 h: LR alone
   third 8 h:  LR + 12.5 g of 25% albumin per liter
```

- Weight term **4 mL/kg/%TBSA** plus surface-area term **1500 mL/m² total BSA**.
  (Romanowski & Palmieri 2017; StatPearls NBK534227 — the latter states the
  surface-area term as 1500 mL/m² of total BSA.)
- In **younger children**, add **5% dextrose** to the fluids (hypoglycemia risk).
  (Romanowski & Palmieri 2017.)

### Maintenance fluid — Holliday–Segar method (added to Parkland/modified-Brooke in children)

24-hour maintenance **water** volume:

```
first 10 kg:        100 mL/kg/day
next 10 kg (11–20): + 50 mL/kg/day
each kg above 20:   + 20 mL/kg/day
```

Equivalent hourly "**4–2–1 rule**": 4 mL/kg/h for the first 10 kg, +2 mL/kg/h for
the next 10 kg, +1 mL/kg/h for each kg above 20. (Holliday & Segar 1957,
PMID 13431307.)

- In burn maintenance, this is commonly delivered as a **dextrose-containing
  fluid** (e.g., 5% dextrose in LR, or D5 ½-normal saline) and run continuously,
  **in addition to** the LR resuscitation volume. One published pediatric-burn
  maintenance regimen: **LR with 5% dextrose at 4 mL/kg/h (0–10 kg) + 2 mL/kg/h
  (10–20 kg) + 1 mL/kg/h for each kg > 20 kg** — i.e., the 4-2-1 rule applied to
  a D5-LR maintenance drip. (StatPearls NBK534227.)

### Body-surface-area (BSA) for the SA-based formulas — Mosteller

```
BSA (m²) = √( height(cm) × weight(kg) / 3600 )
```

(Mosteller 1987, PMID 3657876. This is the standard US bedside BSA equation;
Du Bois is an alternative.)

### %TBSA estimation in children — Lund–Browder (NOT Rule of Nines)

- Use the **age-adjusted Lund–Browder chart** for children. The **Rule of Nines
  is inaccurate in children** because body proportions differ by age — the head
  is a much larger fraction of BSA and the legs a smaller fraction than in
  adults. (StatPearls NBK534227 & NBK537190.)
- The **"rule of palm"** (patient's palm+fingers ≈ 1% TBSA) is a supplementary
  estimate for small/scattered burns. (StatPearls.)

#### The table — resolved 2026-08-03

Percent of TBSA, **per side** for paired segments (each cell is one limb, not
the pair). Shipped as `packages/scoring-engine/src/data/lund-browder.ts`.

| Segment                     |   0 |   1 |   5 |  10 |  15 | Adult |
| --------------------------- | --: | --: | --: | --: | --: | ----: |
| Head                        |  19 |  17 |  13 |  11 |   9 |     7 |
| Neck                        |   2 |   2 |   2 |   2 |   2 |     2 |
| Trunk, front                |  13 |  13 |  13 |  13 |  13 |    13 |
| Trunk, back                 |  13 |  13 |  13 |  13 |  13 |    13 |
| Buttock (each)              | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 |   2.5 |
| Genitalia and perineum      |   1 |   1 |   1 |   1 |   1 |     1 |
| Upper arm (each)            |   4 |   4 |   4 |   4 |   4 |     4 |
| Forearm (each)              |   3 |   3 |   3 |   3 |   3 |     3 |
| Hand (each)                 | 2.5 | 2.5 | 2.5 | 2.5 | 2.5 |   2.5 |
| Thigh (each)                | 5.5 | 6.5 |   8 | 8.5 |   9 |   9.5 |
| Lower leg (each)            |   5 |   5 | 5.5 |   6 | 6.5 |     7 |
| Foot (each)                 | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 |   3.5 |
| **Total (all 19 segments)** | 100 | 100 | 100 | 100 | 100 |   100 |

"Lower leg" is knee to ankle, exclusive of the foot; "forearm" is elbow to
wrist, exclusive of the hand. Five rows vary with age (head, both thighs, both
lower legs); the other fourteen are constant. Head −12, thighs +8, lower legs +4
across birth → adult — a net of zero, which is why every column closes at 100.

**Age bands.** The chart labels columns as point ages; the JTS worksheets label
the same columns as bands. Bands are what is implemented: 0 → birth to <1 y,
1 → 1 to <5 y, 5 → 5 to <10 y, 10 → 10 to <15 y, 15 → 15 to <16 y, Adult → 16 y
and over. A 3-year-old takes the "1" column; a 7-year-old takes the "5".

**Attribution — read this before citing it, and note that it has three sources,
not one.** Collapsing them into a single sentence would give the least-checked
fact the standing of the best-checked one.

1. **The cells and the per-form dates — from the worksheets themselves.** The
   values are those of the US DoD **Joint Trauma System Burn Care CPG** Lund
   Browder Burn Estimate & Diagram worksheets, read in full for the compiled
   Lund–Browder implementation reference of 3 August 2026: Infant (July 2025)
   supplies the age-0 column, Pediatric (June 2025) ages 1/5/10/15, Adult (June 2025) the adult column and the printed 100 total. Those three dates are
   **form** dates, not the guideline's.
2. **The CPG identifier and its own date — checked live.** The JTS CPG index at
   `jts.health.mil` lists Burn Care as **CPG ID 12, dated 10 June 2025** and
   carries all three worksheets; that was read directly at jts.health.mil on
   **2026-08-03**. The compiled reference gives the CPG number but **no
   CPG-level date** — only the per-form dates in (1) — so 10 June 2025 is a
   live-index fact and must not be presented as coming from that document.
3. **The 1944 original — NOT obtained.** _Surg Gynecol Obstet_ vol. 79 is not
   digitised in any reachable open repository and no copy was read, so the
   correct attribution is **"after Lund & Browder (1944), as reproduced in the
   JTS worksheets"**, never a bare claim on the 1944 paper. Specifically
   unconfirmed: whether the 19-row tabular layout appears in that form in 1944;
   the 1944 publication is generally described as presenting body diagrams with
   an A/B/C growth inset, and the expanded table may be a later reformatting for
   worksheet use.

Two independent
reproductions agree cell-for-cell (Vanderbilt/Monroe Carell paediatric burn
fluid resuscitation protocol, March 2025, all five paediatric columns; Wayne
State University Surgery Burn Protocol #23, the 15-year and adult columns).

**Known transcription defects — this is why the totals are gated.** Most charts
in circulation sum to **101%**.

| Defect                 | Circulating value | Value used here     | Basis                                 |
| ---------------------- | ----------------- | ------------------- | ------------------------------------- |
| Hand, per aspect       | 1.5 (hand = 3)    | **1.25** (hand 2.5) | Lundin & Alsbjørn 2013; closes at 100 |
| Half a thigh at age 10 | 4½ (thigh = 9)    | **4¼** (thigh 8.5)  | Miminas 2007; closes at 100           |

The hand error adds 0.25 per aspect × 2 aspects × 2 hands = **+1.0 in every
column** and is the documented cause of the 101% charts (Lundin & Alsbjørn,
_Burns_ 2013;39(4):819–820). The thigh error inflates the **10-year column
alone**. A third, heavily degraded scanned variant carries several errors at
once (trunk-front 17 in the 1–4 band, buttocks and hands 2 instead of 2.5, head
10 instead of 11 at 10–14). **Rule: do not use any Lund–Browder chart you have
not summed yourself.**

**Cross-check against the printed inset.** The classic chart prints A/B/C "half"
values, where half means one aspect (front or back) of one limb — so B × 2 is a
whole thigh. Half-head 9½/8½/6½/5½/4½/3½, half-thigh 2¾/3¼/4/4¼/4½/4¾, half-leg
2½/2½/2¾/3/3¼/3½ each double exactly to the rows above. This lineage (Miminas,
_Wounds UK_ 2007) is independent of the JTS worksheets, so the agreement is a
second opinion rather than a restatement.

**Anterior/posterior split** is needed only if a single aspect of a segment can
be selected, which this calculator does not offer. It is **not** 50/50: trunk,
buttocks and genitalia are asymmetric, and the adult column totals 48 anterior /
52 posterior on the JTS form. The paediatric anterior/posterior totals shift
with the head/limb redistribution and are **not verified here** — check them
against the JTS paediatric form directly before implementing aspect-level
selection.

### Threshold to initiate formal IV resuscitation

- **ABLS / ABA:** formal resuscitation for burns **≥20% TBSA** (adults). Many
  pediatric centers use a **lower trigger (≥15% TBSA)**; some initiate at **>10%
  TBSA** in children. Practice varies. (StatPearls; ABA CPG scope ≥20% adults;
  institutional pediatric protocol PMC11958416 used **TBSA ≥15% if <10 kg and
  ≥20% if ≥10 kg**.)

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                  | label                                      | type   | units / conversion                                    | plausible min/max                                                                                            |
| ------------------- | ------------------------------------------ | ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `weight_kg`         | Body weight                                | number | kg. From lb: ÷2.2046                                  | ~0.5–150 kg (pediatric device bound; not a cited clinical threshold) [NEEDS SOURCE]                          |
| `tbsa_pct`          | %TBSA burned (2nd + 3rd degree)            | number | % (0–100), via **Lund–Browder** in children           | 0–100%; formal resuscitation typically triggered at ≥15–20% (StatPearls; PMC11958416)                        |
| `height_cm`         | Height/length (for BSA formulas)           | number | cm. From in: ×2.54                                    | ~30–200 cm (input-validity bound) [NEEDS SOURCE]                                                             |
| `bsa_m2`            | Total body surface area (derived)          | number | m² = √(height·weight/3600) (Mosteller)                | derived; ~0.1–2.2 m² typical (arithmetic consequence of height/weight bounds) [NEEDS SOURCE for hard bounds] |
| `formula`           | Formula selection                          | enum   | parkland / modified_brooke / galveston / cincinnati   | selection, not a measured value                                                                              |
| `age_band`          | Age (for Lund–Browder + Cincinnati branch) | enum   | 6 Lund–Browder bands: <1, 1–4, 5–9, 10–14, 15, ≥16 yr | determines head/thigh/lower-leg %; and Cincinnati "younger vs older" fluid branch                            |
| `time_since_burn_h` | Hours elapsed since injury                 | number | h. Used to back-date the first-8h window              | 0–24 (resuscitation clock runs from injury; StatPearls)                                                      |

Derived outputs:

| id             | meaning                                                     | formula                                                        |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `resus_24h_ml` | Total 24-h resuscitation crystalloid volume                 | per selected formula above                                     |
| `first8h_ml`   | Volume for first 8 h (from injury)                          | `resus_24h_ml / 2`                                             |
| `first8h_rate` | Infusion rate, first 8 h                                    | `first8h_ml / (8 − time_since_burn_h)` mL/h                    |
| `next16h_rate` | Infusion rate, next 16 h                                    | `(resus_24h_ml / 2) / 16` mL/h                                 |
| `maint_24h_ml` | Holliday–Segar maintenance (children; Parkland/Brooke only) | 100/50/20 mL/kg/day (Galveston/Cincinnati include maintenance) |

Notes on bounds: the fluid coefficients (4/3/2 mL, 5000/2000/1500 mL/m²), the
100/50/20 Holliday–Segar tiers, and the Mosteller denominator (3600) are exact
published constants. Weight/height outer bounds are engineering input-validation
limits, **not** publication-derived values — flagged [NEEDS SOURCE].

---

## Worked examples (each cited; all derived from the formulas above)

**Example 1 — Pediatric Parkland (3 mL) + Holliday–Segar maintenance**
_(derived from the modified-Parkland formula in StatPearls NBK537190 + Holliday–Segar 1957)_

- Child: 15 kg, 25% TBSA (partial+full thickness), presenting at time of injury.
- Resuscitation LR = 3 × 15 × 25 = **1125 mL** over 24 h.
  - First 8 h: 1125 / 2 = 562.5 mL → 562.5 / 8 = **70.3 mL/h**.
  - Next 16 h: 562.5 mL → 562.5 / 16 = **35.2 mL/h**.
- Maintenance (Holliday–Segar): first 10 kg × 100 + next 5 kg × 50 =
  1000 + 250 = **1250 mL/day** ≈ 52 mL/h, as D5-containing fluid, run
  continuously **on top** of the LR.
- Combined first-8h infusion ≈ 70.3 + 52 = **~122 mL/h**.

**Example 2 — Adult Parkland (4 mL), no maintenance added**
_(derived from the Parkland formula in StatPearls NBK537190)_

- Adult: 70 kg, 40% TBSA.
- LR = 4 × 70 × 40 = **11 200 mL** over 24 h.
  - First 8 h: 5600 mL → **700 mL/h**.
  - Next 16 h: 5600 mL → **350 mL/h**.
- Adults: **no separate maintenance fluid** is added. (Contrast with Ex. 1.)

**Example 3 — Pediatric modified Brooke (3 mL) + maintenance**
_(derived from the modified-Brooke pediatric coefficient in StatPearls NBK534227 + Holliday–Segar 1957)_

- Child: 20 kg, 30% TBSA.
- LR = 3 × 20 × 30 = **1800 mL** over 24 h → first 8 h 900 mL (**112.5 mL/h**);
  next 16 h 900 mL (**56.3 mL/h**).
- Maintenance (Holliday–Segar): 10 × 100 + 10 × 50 = **1500 mL/day** (~62.5 mL/h)
  as D5-containing fluid on top.

**Example 4 — Galveston (surface-area based, maintenance included)**
_(derived from the Galveston formula in Romanowski & Palmieri 2017; BSA via Mosteller 1987)_

- Child: height 95 cm, weight 15 kg, 30% TBSA.
- Total BSA = √(95 × 15 / 3600) = √(1425/3600) = √0.3958 = **0.629 m²**.
- BSA burned = 0.30 × 0.629 = **0.1888 m²**.
- Resuscitation = 5000 × 0.1888 = **943.8 mL**.
- Maintenance = 2000 × 0.629 = **1258.3 mL**.
- 24-h total = 943.8 + 1258.3 = **2202 mL** → first 8 h 1101 mL (**137.6 mL/h**);
  next 16 h 1101 mL (**68.8 mL/h**). Fluid: LR + 12.5 g 25% albumin/L + 5%
  dextrose as needed. (No separate maintenance drip — it is inside the formula.)

**Example 5 — Cincinnati (weight + surface-area, age-branched fluid)**
_(derived from the Cincinnati formula in Romanowski & Palmieri 2017 / StatPearls NBK534227; BSA via Mosteller)_

- Same child: 15 kg, 30% TBSA, BSA 0.629 m² (younger child).
- Volume = (4 × 15 × 30) + (1500 × 0.629) = 1800 + 943.5 = **2743.5 mL** over 24 h
  → first 8 h 1371.8 mL (**171.5 mL/h**); next 16 h (**85.7 mL/h**).
- Younger-child fluid branch: first 8 h **LR + 50 mEq NaHCO₃/L**; second 8 h
  **LR alone**; third 8 h **LR + 12.5 g 25% albumin/L**; add 5% dextrose.

**Example 6 — Holliday–Segar maintenance standalone (26 kg child)**
_(derived from Holliday & Segar 1957)_

- 26 kg: 10 × 100 + 10 × 50 + 6 × 20 = 1000 + 500 + 120 = **1620 mL/day**
  (= 67.5 mL/h). 4-2-1 check: 40 + 20 + 6 = 66 mL/h (rounding of 1620/24). ✓

---

## Interpretation bands (non-directive, with source)

**This formula has no severity/interpretation bands.** It is a **dosing
estimate**, not a classifier. The clinically meaningful "output interpretation"
is the **resuscitation endpoint (urine output)** that the calculated rate is then
titrated against, plus the injury-size threshold that triggers formal
resuscitation. These are targets/triggers, not risk strata:

**Urine-output titration targets** (report the source-specific value; the
literature is not uniform):

- **Adults:** 0.5–1.0 mL/kg/h, or ~30–50 mL/h. The 2024 ABA CPG target is
  **0.5 mL/kg/h (30–50 mL/h)**. (Cartotto et al. 2024; StatPearls.)
- **Children:** commonly **1.0–1.5 mL/kg/h** (StatPearls NBK537190); an
  alternative widely cited split is **1 mL/kg/h if <30 kg and 0.5 mL/kg/h if
  ≥30 kg** (StatPearls NBK534227). **Infants** are sometimes targeted higher
  (~1–2 mL/kg/h). Sources disagree by ~0.5 mL/kg/h; carry the range, do not pick
  one silently.

**Threshold to start formal resuscitation:** ≥20% TBSA (ABLS/ABA, adults); many
pediatric centers ≥15%; some >10% in children (see Formula section).

The formula volume is explicitly a **starting estimate to be titrated**, not a
volume to be delivered rigidly — over-resuscitation ("fluid creep") is a
recognized harm and is the reason the 2024 ABA CPG lowered the adult starting
coefficient to 2 mL/kg/%TBSA. (Cartotto et al. 2024.)

---

## References (full, PMID/DOI/URL)

1. **StatPearls — Burn Fluid Resuscitation** (Parkland, modified Brooke [adult 2
   / peds 3 mL], Galveston 5000+2000 mL/m², Cincinnati 4 mL/kg/%TBSA + 1500
   mL/m², LR, urine-output targets, Lund–Browder). Mehta M, Tudor GJ. _Burn
   Fluid Resuscitation._ StatPearls Publishing; updated 2023.
   URL: https://www.ncbi.nlm.nih.gov/books/NBK534227/ (Bookshelf ID NBK534227).

2. **StatPearls — Parkland Formula** (4 mL adult / 3 mL peds; half in first 8 h;
   pediatric maintenance addition; Lund–Browder; urine 1.0–1.5 mL/kg/h in
   children). Baartmans MG, et al. / StatPearls Publishing.
   URL: https://www.ncbi.nlm.nih.gov/books/NBK537190/ (Bookshelf ID NBK537190).

3. **Romanowski KS, Palmieri TL.** Pediatric burn resuscitation: past, present,
   and future. _Burns Trauma._ 2017;5:26. (Galveston and Cincinnati exact
   compositions incl. albumin/bicarbonate/dextrose; dextrose for infants.)
   PMID: **28879205**. DOI: **10.1186/s41038-017-0091-y**.

4. **Holliday MA, Segar WE.** The maintenance need for water in parenteral fluid
   therapy. _Pediatrics._ 1957;19(5):823–832. (100/50/20 mL/kg/day maintenance.)
   PMID: **13431307**.

5. **Mosteller RD.** Simplified calculation of body-surface area. _N Engl J Med._
   1987;317(17):1098. (BSA = √(ht·wt/3600).) PMID: **3657876**.
   DOI: **10.1056/NEJM198710223171717**.

6. **Cartotto R, Johnson LS, Savetamal A, et al.** American Burn Association
   Clinical Practice Guidelines on Burn Shock Resuscitation. _J Burn Care Res._
   2024;45(3):565–589. (Adult starting rate 2 mL/kg/%TBSA modified Brooke; UOP
   0.5 mL/kg/h; albumin; scope adults ≥20% TBSA.) PMID: **38051821**.
   DOI: **10.1093/jbcr/irad125**.

7. **Institutional pediatric protocol assessment** (modified Parkland 3
   mL/%TBSA/kg/day; resuscitation triggers TBSA ≥15% if <10 kg, ≥20% if ≥10 kg;
   mean UOP 1.74 mL/kg/h). _J Burn Care Res_ 2025 abstract, PMC11958416.
   URL: https://pmc.ncbi.nlm.nih.gov/articles/PMC11958416/.

8. **Lund CC, Browder NC.** The estimation of areas of burns. _Surg Gynecol
   Obstet._ 1944;79:352–358. (Chart of record. **Not obtained** — see the
   attribution note in the Lund–Browder table section.)

9. **US Department of Defense, Joint Trauma System.** _Burn Care_ Clinical
   Practice Guideline (CPG ID 12), with the Adult / Pediatric / Infant Lund
   Browder Burn Estimate & Diagram worksheets (June 2025, June 2025, July 2025).
   Source of the exact per-segment percentages shipped. Those three dates are
   the **worksheet** dates carried on the forms; the guideline's own date, **10
   June 2025**, is from the JTS CPG index page, read at jts.health.mil on
   2026-08-03 — see the attribution list in the Lund–Browder table section.
   URL: https://jts.health.mil/index.cfm/CPGs/cpgs.

10. **Lundin K, Alsbjørn B.** The 101 percent in Lund-Browder charts — a
    commentary. _Burns._ 2013;39(4):819–820. (One aspect of each hand is 1.25%,
    not 1.5% — the documented cause of the 101% charts.) PMID: **22980775**.
    DOI: **10.1016/j.burns.2012.08.016**.

11. **Murari A, Singh KN.** Lund and Browder chart — modified versus original: a
    comparative study. _Acute Crit Care._ 2019;34(4):276–281. (Open access;
    restates the 101% defect and the chart's clinimetric limitations.)
    DOI: **10.4266/acc.2019.00647**.

12. **Miminas DA.** A critical evaluation of the Lund and Browder chart. _Wounds
    UK._ 2007;3(3):58–68. (Half-body A/B/C inset values, including thigh-B at
    age 10 as 4¼; expert-panel and applicability limitations.)

13. **Rumpf RW, Stewart WC, Martinez SK, et al.** Comparison of the Lund and
    Browder table to computed tomography scan three-dimensional surface area
    measurement for a pediatric cohort. _J Surg Res._ 2018;221:275–284.
    DOI: **10.1016/j.jss.2017.08.019**.

Primary-source note: the **Galveston** formula originates with Carvajal HF
(pediatric surface-area resuscitation, 1980s Shriners–Galveston) and the
**Cincinnati** (Shriners–Cincinnati) formula with the Cincinnati Shriners group;
both are cited via Romanowski & Palmieri 2017 (refs 26–27 therein) rather than
fetched in the original — flagged in Limitations.

---

## Limitations & notes

- **Every formula is a starting estimate, titrated to urine output** (and
  hemodynamics). Delivered volume routinely differs from the formula: in
  PMC11958416 the modified-Parkland target was 3 mL/%TBSA/kg but mean delivered
  was 2.99 mL/%TBSA/kg — i.e., titration, not rigid delivery. Do not present the
  computed volume as a fixed prescription.
- **Pediatric-vs-adult divergence is the whole point of this note:** children get
  a lower crystalloid coefficient **but** an added maintenance fluid and
  dextrose, and SA-based formulas (Galveston/Cincinnati) that fold maintenance
  in. A tool that applies an adult Parkland (4 mL, no maintenance, no dextrose)
  to a child is clinically wrong on three axes.
- **Coefficient variability:** "pediatric Parkland" is quoted as **3 mL** in
  StatPearls/PMC11958416 but some references retain 4 mL for children and instead
  rely on maintenance to cover baseline needs. The modified-Brooke pediatric rate
  is 3 mL. Because centers differ, the formula and its coefficient should be an
  explicit, user-selected input, not hard-coded.
- **Fluid clock runs from the time of burn, not arrival.** Late presentation
  compresses the remaining first-8h volume into fewer hours — the rate, not the
  volume, changes. Build this in.
- **Urine-output targets disagree across sources** (adult 0.5 vs 0.5–1.0; child
  1.0–1.5 vs the <30 kg = 1 / ≥30 kg = 0.5 split; infants up to ~2). Carry the
  range with citations; do not silently pick one.
- **Over-resuscitation ("fluid creep")** is a documented harm; the 2024 ABA CPG
  responded by lowering the adult starting coefficient to 2 mL/kg/%TBSA and
  encouraging albumin to cap volumes. The CPG is **adults-only** — it does **not**
  license a 2 mL pediatric starting rate. [Pediatric-specific high-grade CPG for
  the starting coefficient: **NEEDS SOURCE** — current pediatric practice rests
  on 3–4 mL formulas + maintenance, not a graded RCT-backed pediatric CPG.]

### Lund–Browder — sourcing gap closed 2026-08-03, with one caveat that stays open

The full 19-segment × 6-band table is now sourced and shipped (see the table
section above). Two things did not close, and neither should be quietly dropped.

- **The 1944 original was still not read.** The attribution is "after Lund &
  Browder (1944), as reproduced in the JTS worksheets", and it must stay that
  way until the paper is obtained through a library. Whether the 19-row tabular
  layout is a 1944 artefact or a later worksheet reformatting is unconfirmed.
- **The chart's own validity is a real limitation, not a formality.** Its
  anthropometric substrate dates from Funke (1858), Du Bois (1915), Berkow
  (1924) and Boyd (1935) — Lund and Browder assembled it, they did not measure
  it — and it has never been revalidated against modern population data. It was
  never developed or validated by an expert panel using stringent scientific
  principles or defined protocols; concurrent validity against computerised
  planimetry appears high, but other clinimetric properties are largely
  unstudied. Lund and Browder claimed applicability to 95.5% of the population.
  The chart ignores obesity, breast size, pregnancy and amputation. Erythema
  (first-degree) is excluded from %TBSA. Inter-rater variability is substantial
  and grows with burn size, overestimation being the commoner direction of error
  outside burn centres.

The earlier note in this file also carried **wrong numbers** — it summarized the
head fraction as "≈19 → ~14 → ~11 → ~9 → ~7%", where the chart is
19/17/13/11/9/7. That is exactly the failure mode a tertiary summary produces
and is why the table is now gated rather than described.

- **Galveston/Cincinnati originals (Carvajal; Shriners–Cincinnati)** are cited
  secondhand via Romanowski & Palmieri 2017; the numeric coefficients
  (5000/2000/1500 mL/m², albumin 12.5 g/L, NaHCO₃ 50 mEq/L) are corroborated
  across Romanowski and StatPearls, but the **original derivation papers were not
  directly fetched** — flagged for a verification pass.
- **BSA method matters** for Galveston/Cincinnati: Mosteller vs Du Bois give
  slightly different BSA and thus different volumes; state which is used. Small
  infants are where BSA-based and weight-based formulas diverge most.
- **Not a standalone diagnosis of burn severity** — TBSA%, depth, inhalation
  injury, and comorbidity drive disposition; the resuscitation volume is one
  downstream calculation.
- Composition details (dextrose, albumin, bicarbonate) are **regimen-specific and
  institution-specific**; the core deliverable of a calculator is the crystalloid
  volume/rate + a maintenance volume, with additive composition surfaced as
  guidance, not auto-prescribed.

---

## IP status

- **Not copyrightable.** Parkland, modified Brooke, Galveston, Cincinnati, and
  Holliday–Segar are arithmetic formulas built from coefficients and thresholds
  (4/3/2 mL/kg/%TBSA; 5000/2000/1500 mL/m²; 100/50/20 mL/kg/day; the 8h/16h
  split; Mosteller's √(ht·wt/3600)). Numbers, formulas, and clinical thresholds
  are facts, not protected expression.
- **No verbatim copyrightable scale wording** is embedded — unlike ordinal
  symptom scales (e.g., GCS descriptors), these formulas have no proprietary
  response-descriptor text to reproduce.
- The **Lund–Browder chart diagram/artwork** and the **prose/table layout** of
  StatPearls, the ABA CPG, and the Romanowski review are copyrighted _expression_
  (figures, wording). Reproduce only the **numeric percentages/coefficients** and
  paraphrase — do not copy the chart image or guideline paragraphs verbatim. This
  note copies no figure and no verbatim guideline paragraph.
- The shipped Lund–Browder table is **numbers only**. No body diagram and no JTS
  worksheet layout is reproduced, and every segment label is this project's own
  anatomical wording ("Lower leg, right (knee to ankle)"), not transcribed from
  any published form.
- The names "Shriners", "Galveston", "Cincinnati", "Parkland", "Brooke" are place/
  institution names attached to the formulas by convention; using them to label a
  formula is nominative/descriptive, not an IP concern for the math.
