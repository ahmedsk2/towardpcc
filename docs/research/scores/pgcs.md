# Pediatric Glasgow Coma Scale (pGCS)

> Age-adapted version of the Glasgow Coma Scale (GCS) for infants and young
> children who cannot yet give the adult verbal/motor responses. Two related
> lineages exist and are documented side by side below:
>
> - **James / Adelaide → PECARN lineage** (preverbal <2 y vs verbal ≥2 y). This
>   is the version used in the PECARN validation papers and reproduced by CHOP
>   and NCBI/StatPearls.
> - **BPNA "Child's Glasgow Coma Scale" (Revised 2001)** (<5 y vs >5 y), the UK
>   standard, which descends from James & Trauner and Tatman/Whitehouse and adds
>   an intubation ("T") code and a grimace option.
>
> **IMPORTANT:** the age cut-off, the exact descriptor wording, and whether an
> intubated verbal component is scored differ between schemes. Any implementation
> must pin ONE scheme per case and record which one. Do not silently mix them.

---

## Formula / algorithm (exact — every coefficient, every branch)

The total score is the simple sum of three independently-rated ordinal
components, exactly as in the adult GCS:

```
pGCS_total = E + V + M
```

- Eye opening (E): integer 1–4
- Verbal response (V): integer 1–5
- Motor response (M): integer 1–6
- **Total range: 3 (worst) to 15 (best).** There is no 0.
- Each component is scored as the **best** observed response (Reilly 1988;
  BPNA 2001: "Score the best response").

The ONLY thing the pediatric adaptation changes versus the adult GCS is the
**descriptor wording** attached to each numeric level of V and M (and, in some
schemes, which age band that wording applies to). The numeric levels, the point
values, and the summation are identical to the adult scale (Teasdale & Jennett
1974; the 3-component E/V/M structure was added by Jennett & Teasdale 1977).

### Branch A — James / PECARN lineage (as reproduced by CHOP & NCBI/StatPearls)

Age branch: apply the **infant / preverbal** column to children **younger than
2 years**; apply the **child** column (= standard adult descriptors) to children
**2 years and older**. (Cut-off per Holmes 2005 and Borgialli 2016, who applied
the pediatric GCS to children <2 y and the standard GCS to ≥2 y.)

Eye opening (E) — identical wording both ages:

| Score | Descriptor                                     |
| ----: | ---------------------------------------------- |
|     4 | Open spontaneously / spontaneous               |
|     3 | Open in response to verbal stimuli / to speech |
|     2 | Open in response to pain only                  |
|     1 | No response                                    |

Verbal response (V):

| Score | Child (≥2 y)                                 | Infant (<2 y)             |
| ----: | -------------------------------------------- | ------------------------- |
|     5 | Oriented, appropriate                        | Coos and babbles          |
|     4 | Confused                                     | Irritable cries           |
|     3 | Inappropriate words                          | Cries in response to pain |
|     2 | Incomprehensible words or nonspecific sounds | Moans in response to pain |
|     1 | No response                                  | No response               |

Motor response (M):

| Score | Child (≥2 y)                                          | Infant (<2 y)                        |
| ----: | ----------------------------------------------------- | ------------------------------------ |
|     6 | Obeys commands                                        | Moves spontaneously and purposefully |
|     5 | Localizes painful stimulus                            | Withdraws to touch                   |
|     4 | Withdraws in response to pain                         | Withdraws in response to pain        |
|     3 | Flexion in response to pain (decorticate posturing)   | (decorticate / abnormal flexion)     |
|     2 | Extension in response to pain (decerebrate posturing) | (decerebrate / abnormal extension)   |
|     1 | No response                                           | No response                          |

(Source of this exact layout: CHOP "Modified Glasgow Coma Scale for Infants and
Children" clinical pathway; NCBI/StatPearls NBK513298, which states these
"versions are derived from those of James and the Pediatric Emergency Care
Applied Research Network in preverbal children younger than 2 years and verbal
children older than 2 years.")

### Branch B — BPNA "Child's Glasgow Coma Scale" (Revised BPNA 2001) — verbatim

Age branch: **> 5 years** uses adult-style wording; **< 5 years** uses the
developmental wording. Reproduced verbatim from the BPNA audit chart
(bpna.org.uk/audit/GCS.PDF):

Eye opening (identical both ages):

| Code | Descriptor                                              |
| ---- | ------------------------------------------------------- |
| E4   | Spontaneous                                             |
| E3   | To voice                                                |
| E2   | To pain                                                 |
| E1   | None                                                    |
| C    | Eyes closed (by swelling or bandage) — non-numeric code |

Verbal:

| Code | > 5 years                                  | < 5 years                                                          |
| ---- | ------------------------------------------ | ------------------------------------------------------------------ |
| V5   | Orientated (in person or place or address) | Alert, babbles, coos, words or sentences to usual ability (normal) |
| V4   | Confused                                   | Less than usual ability, irritable cry                             |
| V3   | Inappropriate words                        | Cries to pain                                                      |
| V2   | Incomprehensible sounds                    | Moans to pain                                                      |
| V1   | No response to pain                        | No response to pain                                                |
| T    | Intubated — non-numeric code               | Intubated                                                          |

Motor:

| Code | > 5 years                                                               | < 5 years                    |
| ---- | ----------------------------------------------------------------------- | ---------------------------- |
| M6   | Obeys commands                                                          | Normal spontaneous movements |
| M5   | Localises to supraorbital pain (>9 months of age) or withdraws to touch | (same)                       |
| M4   | Withdraws from nailbed pain                                             | (same)                       |
| M3   | Flexion to supraorbital pain (decorticate)                              | (same)                       |
| M2   | Extension to supraorbital pain (decerebrate)                            | (same)                       |
| M1   | No response to supraorbital pain (flaccid)                              | (same)                       |

BPNA procedural rules (verbatim from chart): pain applied "by pressing hard on
the supra-orbital notch … with your thumb, except for M4, which is tested by
pressing hard on the flat nail surface with the barrel of a pencil." "Score the
best response with unclear or asymmetrical." "Score as usual in the presence of
sedative drugs."

**Intubation handling (differs by scheme):** In the BPNA scheme an intubated
patient's verbal component is recorded as **T** (non-numeric), not a 1; a
numeric total is therefore not straightforwardly summable, which is exactly the
gap the **grimace score** was introduced to fill (Tatman et al. 1997). Many US
implementations instead record intubated verbal as 1 with a "T" suffix (e.g.,
"11T"). Pin the convention per case. [NEEDS SOURCE — for a single canonical rule
on numeric handling of intubated verbal in the James/PECARN branch; primary
sources describe the code, not an arithmetic substitution.]

### Original Adelaide (Reilly 1988) note

Reilly et al. developed the Adelaide paediatric scale with **age-expected
normal** responses (the "normal" response, and hence the maximum attainable
total, rises with age up to ~5 years). The 1988 paper's abstract does not
reproduce a full numeric descriptor table in the sources fetched, so the
per-level Adelaide wording is documented here **only** via its descendants
(BPNA, James/PECARN). The exact original Adelaide expected-response-by-age
table is **[NEEDS SOURCE]** (full text of Reilly 1988 not retrieved).

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id           | label                       | type           | values / units                                      | min | max | source                                                        |
| ------------ | --------------------------- | -------------- | --------------------------------------------------- | --- | --- | ------------------------------------------------------------- |
| `gcs_eye`    | Eye-opening response        | ordinal (enum) | integer 1–4 (see tables)                            | 1   | 4   | Teasdale & Jennett 1974; Jennett & Teasdale 1977              |
| `gcs_verbal` | Verbal response             | ordinal (enum) | integer 1–5 (age-appropriate descriptor)            | 1   | 5   | Reilly 1988; James 1986; BPNA 2001                            |
| `gcs_motor`  | Motor response              | ordinal (enum) | integer 1–6 (age-appropriate descriptor)            | 1   | 6   | Reilly 1988; James 1986; BPNA 2001                            |
| `pgcs_total` | Total pGCS (derived)        | integer        | E + V + M                                           | 3   | 15  | derived from formula                                          |
| `age_band`   | Developmental band selector | enum           | James/PECARN: `<2y` \| `>=2y`; BPNA: `<5y` \| `>5y` | —   | —   | Holmes 2005; Borgialli 2016 (`<2y` cut); BPNA 2001 (`5y` cut) |
| `intubated`  | Airway status flag          | boolean        | affects V handling (T code)                         | —   | —   | BPNA 2001; Tatman 1997                                        |

Notes on units/conversions: **there are no physical units and no unit
conversions** — every input is a categorical response mapped to a fixed integer.
No component may be interpolated (no 4.5). The only "conversion" is selecting the
correct descriptor column by `age_band`. Component minimum is 1 (never 0), so the
total can never be below 3.

---

## Worked examples (each becomes a unit test)

No published _numeric_ worked example (a named patient vignette → printed total)
was located in the fetched primary sources; the derivation papers describe the
scale rather than tabulating example totals. The vectors below are therefore
**derived step-by-step from the published summation formula
`total = E + V + M`** (Teasdale & Jennett 1974 for the sum; component wording per
tables above). Each is labeled accordingly.

**Example 1 — Normal, alert 6-month-old infant (James/PECARN infant column).**
_Derived from formula in Teasdale & Jennett 1974 + James/PECARN descriptors._

- E = 4 (opens eyes spontaneously)
- V = 5 (coos and babbles)
- M = 6 (moves spontaneously and purposefully)
- **Total = 4 + 5 + 6 = 15** (best possible).

**Example 2 — Unresponsive infant, no response to any stimulus.**
_Derived from formula in Teasdale & Jennett 1974 + James/PECARN descriptors._

- E = 1 (no eye opening)
- V = 1 (no verbal response)
- M = 1 (no motor response)
- **Total = 1 + 1 + 1 = 3** (worst possible).

**Example 3 — Obtunded infant with painful-stimulus-only responses.**
_Derived from formula in Teasdale & Jennett 1974 + James/PECARN descriptors._

- E = 2 (opens eyes to pain only)
- V = 3 (cries in response to pain)
- M = 4 (withdraws in response to pain)
- **Total = 2 + 3 + 4 = 9.**

**Example 4 — Verbal child ≥2 y, standard descriptors, confused.**
_Derived from formula in Teasdale & Jennett 1974 + standard GCS descriptors._

- E = 3 (opens eyes to speech)
- V = 4 (confused)
- M = 5 (localizes to pain)
- **Total = 3 + 4 + 5 = 12.**

**Example 5 (edge case) — Intubated infant, BPNA scheme.**
_Illustrates the non-numeric branch, not a plain sum._

- E = 2 (to pain), V = **T** (intubated — no numeric verbal score in BPNA),
  M = 4 (withdraws from nailbed pain).
- BPNA records this as **"E2 VT M4"** and does **not** produce a clean 3–15
  integer; this is by design (Tatman 1997 introduced the grimace score precisely
  because intubated patients get no verbal score). A US-style implementation that
  substitutes V=1 would report **7T**. Implementation MUST declare which
  convention it uses. See "Formula" intubation note.

---

## Interpretation bands (non-directive wording, with source)

These bands describe how totals are conventionally categorized; they are
descriptive, not directive. Clinical action is a clinician decision.

**Conventional GCS severity categories (applied to the total):**

- 13–15 — commonly categorized as "mild"
- 9–12 — commonly categorized as "moderate"
- 3–8 — commonly categorized as "severe"

Source: widely used TBI severity stratification derived from the GCS; reproduced
in NCBI/StatPearls (NBK513298). Note this tri-band originated in adult TBI work
and is applied to children by extension.

**Pediatric-specific caveat (documented, non-directive):** NCBI/StatPearls notes
that in younger children "a GCS threshold of 5 or less identifies … severe injury
more accurately than the adult cut-off of 8, because pediatric … patients with
scores of 3 to 5 exhibit markedly higher mortality and morbidity." Treat the
adult 3–8 "severe" band as a starting point that pediatric literature refines
downward for young children. (StatPearls NBK513298.)

**Operational thresholds cited by a pediatric center (CHOP clinical pathway) —
descriptive, institution-specific, not a directive from this document:**

- total ≤ 12 — "suggests non-mild TBI"
- total ≤ 8 — "suggests need for intubation and ventilation"
- total ≤ 6 — "suggests need for intracranial pressure monitoring"

Source: CHOP "Acute Head Trauma — Modified Glasgow Coma Scale for Infants and
Children" clinical pathway (institutional guidance; ©2026 Children's Hospital of
Philadelphia).

**Discriminative performance (context for reliability, not a band):** In PECARN
data the pediatric GCS in children <2 y discriminated clinically-important TBI
with AUC 0.77 (95% CI 0.73–0.81) vs 0.81 (0.79–0.83) for standard GCS in ≥2 y;
for TBI on CT, AUC 0.61 (0.59–0.64) vs 0.71 (0.70–0.73) (Borgialli 2016). Holmes
2005 reported the pediatric GCS AUC 0.97 (0.94–1.00) for "TBI needing acute
intervention" in ≤2 y. Interpretation: the pediatric GCS is strong for severe /
intervention-needing injury but weaker for detecting radiographic injury in
infants — a documented limitation, not a scoring band.

---

## References (full citations, PMID/DOI)

1. **Teasdale G, Jennett B.** Assessment of coma and impaired consciousness. A
   practical scale. _Lancet._ 1974;2(7872):81–84. **PMID: 4136544.**
   **DOI: 10.1016/s0140-6736(74)91639-0.** (Original adult GCS; source of the
   ordinal levels and best-response rule.)
2. **Reilly PL, Simpson DA, Sprod R, Thomas L.** Assessing the conscious level in
   infants and young children: a paediatric version of the Glasgow Coma Scale.
   _Childs Nerv Syst._ 1988;4(1):30–33. **PMID: 3135935.**
   **DOI: 10.1007/BF00274080.** (Adelaide paediatric adaptation; age-related
   expected responses.)
3. **James HE.** Neurologic evaluation and support in the child with an acute
   brain insult. _Pediatr Ann._ 1986;15(1):16–22. **PMID: 3951884.**
   **DOI: 10.3928/0090-4481-19860101-05.** (James adaptation — the "J" in JGCS.)
4. **James HE, Trauner DA.** The Glasgow Coma Scale. In: _Brain Insults in
   Infants and Children._ Orlando: Grune & Stratton; 1985:179–182. (Book chapter
   cited by BPNA 2001 as a direct antecedent; no PMID — **[NEEDS SOURCE]** for
   DOI/verification of exact pagination beyond the BPNA citation.)
5. **Tatman A, Warren A, Williams A, Powell JE, Whitehouse W.** Development of a
   modified paediatric coma scale in intensive care clinical practice.
   _Arch Dis Child._ 1997;77(6):519–521. **PMID: 9496188. PMCID: PMC1717402.**
   **DOI: 10.1136/adc.77.6.519.** (Grimace score for intubated children; feeds
   the BPNA revision.)
6. **British Paediatric Neurology Association.** Child's Glasgow Coma Scale
   (Revised BPNA 2001). Audit chart. bpna.org.uk/audit/GCS.PDF. (Verbatim UK
   standard scale, reproduced above; acknowledges Jennett & Teasdale, James &
   Trauner, Eyre & Sharples, Tatman/Warren/Whitehouse.)
7. **Holmes JF, Palchak MJ, MacFarlane T, Kuppermann N.** Performance of the
   pediatric Glasgow Coma Scale in children with blunt head trauma.
   _Acad Emerg Med._ 2005;12(9):814–819. **PMID: 16141014.**
   **DOI: 10.1197/j.aem.2005.04.019.** (First validation; <2 y cut-off.)
8. **Borgialli DA, Mahajan P, Hoyle JD Jr, et al; PECARN.** Performance of the
   Pediatric Glasgow Coma Scale Score in the Evaluation of Children With Blunt
   Head Trauma. _Acad Emerg Med._ 2016;23(8):878–884. **PMID: 27197686.**
   **DOI: 10.1111/acem.13014.** (Large PECARN validation; n=42,041.)
9. **Kraus/Jain et al. — Glasgow Coma Scale.** _StatPearls_ [Internet]. NCBI
   Bookshelf ID **NBK513298.** (Secondary reference; pediatric modification
   layout and severity/threshold summary.)
10. **CHOP.** Acute Head Trauma Clinical Pathway — Modified Glasgow Coma Scale
    for Infants and Children. chop.edu clinical-pathway. (Secondary; operational
    thresholds, ©2026 CHOP.)
11. **glasgowcomascale.org** — Glasgow Structured Approach to Assessment of the
    GCS. Operated by the **Royal College of Physicians and Surgeons of Glasgow**
    (Muriel Cooke Bequest; stewardship associated with Sir Graham Teasdale).
    (Source for stewardship / IP context; notes the Adelaide paediatric version.)

---

## Limitations & notes

- **Two schemes, different age cut-offs.** James/PECARN splits at <2 y vs ≥2 y;
  BPNA splits at <5 y vs >5 y. A total of "11" is not comparable across schemes
  unless the scheme and age band are recorded. **Store the scheme + age_band with
  every score.**
- **Intubation breaks the plain sum.** BPNA records verbal as "T" (no number);
  US practice often uses V=1 with a "T" suffix. Reilly 1988 already noted the
  paediatric scale is "less sensitive to changes in the conscious level than the
  adult scale." Tatman 1997 added the grimace score specifically for intubated
  children. Decide and document one convention.
- **Sedation / paralysis confounds V and M.** BPNA says "Score as usual in the
  presence of sedative drugs," but neuromuscular blockade / deep sedation makes
  V and M uninformative; flag such scores.
- **Weaker for radiographic injury in infants.** Borgialli 2016 AUC 0.61 for
  TBI-on-CT in <2 y — do not treat a "reassuring" pGCS as ruling out intracranial
  injury in infants.
- **Inter-rater variability.** Reilly 1988 found assessments "reasonably
  consistent" only _after formal instruction_; expect rater drift without
  training.
- **Component values are non-interpolable ordinals.** Never average, never emit
  fractional components; the total is an ordinal sum, not a continuous measure.
- **Adelaide original table not fully verified from primary full text** — the
  per-level, age-expected Adelaide wording is documented here via descendants
  (BPNA, James/PECARN) and is marked **[NEEDS SOURCE]** where the original 1988
  numeric table is concerned.

---

## IP status

**Formula / scoring math — not copyrightable.** The pGCS total is an ordinal
sum (`E + V + M`, 3–15) of three response categories. Scoring systems, numeric
thresholds, point values, and the summation are ideas/methods, not creative
expression, and are not protected by copyright. TowardPCC may implement the
scoring logic freely.

**Verbatim descriptor wording — flag and attribute.** The GCS itself is
stewarded by the **Royal College of Physicians and Surgeons of Glasgow** via
glasgowcomascale.org (associated with Sir Graham Teasdale), which promotes a
standardized _structured approach_ and consistent terminology. The pages fetched
did **not** state an explicit copyright/permission restriction on reproducing the
scale text, but stewardship of the wording is real and worth honoring by
attribution.

Reproducibility across public guidelines (assessed from sources fetched):

- The pediatric descriptor wording ("Coos and babbles", "Irritable cries",
  "Cries in response to pain", "Moans in response to pain"; "Moves spontaneously
  and purposefully", "Withdraws to touch", etc.) appears **freely reproduced**
  across major public/open sources: **NCBI/StatPearls (NBK513298)**, the **CHOP
  clinical pathway**, and the **BPNA audit chart** (freely downloadable PDF).
  This is consistent with these short, factual clinical descriptors being treated
  as freely reproducible in practice.
- **Wording is not perfectly uniform** — e.g., PECARN/James "Coos and babbles"
  vs BPNA "Alert, babbles, coos, words or sentences to usual ability". Because
  wording varies by source, TowardPCC should **cite the specific source** whose
  wording it reproduces rather than presenting a merged "canonical" text.

Specific items to flag for review before shipping UI text:

1. **Response descriptors (V and M levels).** Short factual phrases; low
   copyright risk and reproduced across open guidelines, but **attribute** to the
   chosen source (recommend citing BPNA 2001 for the <5 y column or
   NCBI/StatPearls + CHOP for the James/PECARN layout).
2. **BPNA chart layout, procedural instructions, and the "C"/"T"/grimace
   codes.** The BPNA _chart_ is a specific document with acknowledgments; reuse
   the _scoring content_ freely but do not copy the chart's exact page layout /
   graphic design as-is without attribution.
3. **CHOP threshold phrasing** ("suggests non-mild TBI", etc.) sits inside a
   document marked "©2026 Children's Hospital of Philadelphia." Reuse the numeric
   thresholds (facts) but paraphrase CHOP's sentence wording; cite CHOP.
4. **glasgowcomascale.org structured-approach terminology.** If TowardPCC mirrors
   the Glasgow _structured approach_ (Check→Observe→Stimulate→Rate) or that
   site's specific phrasings, attribute to the Royal College of Physicians and
   Surgeons of Glasgow / Teasdale.

Bottom line: implement the math and numeric thresholds freely; treat the exact
descriptor strings as low-risk-but-attribute; pin and cite one source per
reproduced wording block.

---

## Verification

Independent re-verification pass (2026-07-25). Every coefficient, threshold, and
worked example in this file was checked against at least one source fetched
live in this pass, generally independent of (or in addition to) the file's own
primary citation. No numeric corrections were required — every coefficient,
cut-off, AUC, and worked-example sum below matched. Wording-level variance
between secondary reproductions (noted below) is a normal feature of secondary
sources and does not affect any number.

**Formula (E+V+M, range 3–15, no 0; best-response rule).** Confirmed against
Teasdale & Jennett 1974 (PMID 4136544, DOI 10.1016/s0140-6736(74)91639-0 —
verified live via PubMed: title/journal/year/pages/DOI all match) and against
NCBI/StatPearls NBK513298 (fetched live), which reproduces the same E1–4/V1–5/
M1–6 structure and severity bands.

**Branch A (James/PECARN) E/V/M tables and <2y vs ≥2y age split.** Fetched live
from the CHOP clinical pathway page itself
(chop.edu/clinical-pathway/acute-head-trauma-modified-glasgow-coma-scale-infants-and-children
— note: this is the correct current URL; the file's reference 10 cites only
"chop.edu clinical-pathway" without the full path, see correction below) and
cross-checked against NCBI/StatPearls NBK513298 and, as a third independent
source, the Merck Manual Professional Edition's reproduction of the same table.
Eye-opening and verbal rows matched the file's table exactly (word for word,
both columns, all four/five levels). Motor rows 6, 5, 4, and 1 matched exactly.
Motor rows 3 and 2 showed a _wording-placement_ variance across sources — the
live CHOP page phrases infant-M3 as "Responds to pain with decorticate
posturing" and child-M3 as "Responds to pain with flexion," while the Merck
Manual gives an identical phrase, "Responds to pain with decorticate posturing
(abnormal flexion)," for **both** age columns. All three sources (file, live
CHOP, Merck) agree on the substantive mapping — score 3 = decorticate/abnormal
flexion, score 2 = decerebrate/abnormal extension, for both ages — only the
exact clause each reproduction attaches to which column differs. This is
noted as source variance, not a numeric error; no change made.

**Age cut-off (<2y vs ≥2y) and its attribution to Holmes 2005 / Borgialli 2016.** Confirmed live: StatPearls NBK513298 states verbatim that its pediatric
GCS versions are "derived from those of James and the Pediatric Emergency Care
Applied Research Network in preverbal children younger than 2 years and verbal
children older than 2 years." Holmes 2005 (PMID 16141014) and Borgialli 2016
(PMID 27197686) both confirmed live via PubMed as using the <2y / ≥2y split.

**Branch B (BPNA 2001) tables, C/T codes, and procedural rules.** The BPNA PDF
(bpna.org.uk/audit/GCS.PDF) is binary and not directly text-extractable by the
fetch tool used, so it was verified two ways: (1) a text-extraction proxy
re-fetch of the same PDF, which returned E4–E1 wording ("Spontaneous"/"To
voice"/"To pain"/"None"), the "C" (eyes closed) code, the >5y/<5y verbal split,
the "T" (intubated) code, and M6–M1 wording (including "Localises to
supraorbital pain (>9 months of age)... or withdraws to touch," "Withdraws from
nailbed pain," decorticate/decerebrate/flaccid for M3/M2/M1) all matching the
file's Branch B table; (2) a targeted web search independently returned the
exact procedural sentences quoted in the file — "pressing hard on the
supra-orbital notch (beneath medial end of eyebrow)... with your thumb, except
for M4, which is tested by pressing hard on the flat nail surface with the
barrel of a pencil" and "Score as usual in the presence of sedative drugs" —
sourced to the same BPNA document. All matched; no changes made.

**Intubation / grimace score (Tatman 1997).** Confirmed live via PMC1717402
(PMID 9496188, Arch Dis Child 1997;77(6):519–521, DOI 10.1136/adc.77.6.519 —
DOI cross-checked via Crossref API): the grimace score was developed
specifically because the James/JGCS scale assigns no verbal score to intubated
children, supporting the file's framing of BPNA's non-numeric "T" handling and
the reason the grimace score exists. The file's existing **[NEEDS SOURCE]** flag
on a single canonical rule for numerically substituting V=1 in the James/PECARN
branch stands — no primary source surfaced that states this substitution as an
official rule (only that it is common US practice), so the flag is left in
place unchanged.

**Interpretation bands (13–15/9–12/3–8 mild/moderate/severe) and the pediatric
"≤5" caveat.** Both confirmed live, verbatim, against NCBI/StatPearls
NBK513298: the tri-band matched exactly, and the quoted caveat ("a GCS
threshold of 5 or less identifies the [pediatric traumatic brain injury]
severe injury more accurately than the adult cutoff of 8, because pediatric...
patients with scores of 3 to 5 exhibit markedly higher mortality and
morbidity") matched the file's quotation (file's ellipsis stands in for
"traumatic brain injury").

**CHOP operational thresholds (≤12 / ≤8 / ≤6).** Confirmed live against the
CHOP clinical pathway page itself: "≤ 12 suggests non-mild TBI," "≤ 8 suggests
need for intubation and ventilation," "≤ 6 suggests need for intracranial
pressure monitoring" — all three match the file exactly.

**Discriminative-performance AUCs (Borgialli 2016, Holmes 2005).** Confirmed
live via PubMed abstracts. Borgialli 2016, <2y pediatric GCS: ciTBI AUC 0.77
(95% CI 0.73–0.81), TBI-on-CT AUC 0.61 (95% CI 0.59–0.64); ≥2y standard GCS:
ciTBI AUC 0.81 (95% CI 0.79–0.83), TBI-on-CT AUC 0.71 (95% CI 0.70–0.73) — all
four values and both CIs match the file exactly. Holmes 2005, ≤2y: AUC 0.97
(95% CI 0.94–1.00) for TBI needing acute intervention — matches the file
exactly.

**Worked examples 1–4 (plain sums).** Recomputed independently: 4+5+6=15;
1+1+1=3; 2+3+4=9; 3+4+5=12. All four arithmetic sums in the file are correct,
and all component values map to descriptors that appear verbatim in the
verified tables above.

**Worked example 5 (BPNA intubated, non-numeric).** The BPNA T-code behavior
(no numeric verbal score for an intubated patient) is confirmed per the Branch
B verification above; the file's alternative "7T" (2+1+4=7 under a hypothetical
V=1 substitution) is arithmetically correct as stated and is explicitly labeled
non-canonical in the file, consistent with the still-open [NEEDS SOURCE] flag
on that substitution.

**References — PMID/DOI spot-check.** Verified live (PubMed and/or Crossref
API) and all matched the file exactly: ref 1 Teasdale & Jennett 1974 (PMID
4136544 / DOI 10.1016/s0140-6736(74)91639-0); ref 2 Reilly 1988 (PMID 3135935 /
DOI 10.1007/BF00274080, confirmed via Crossref); ref 3 James 1986 (PMID 3951884
/ DOI 10.3928/0090-4481-19860101-05); ref 5 Tatman 1997 (PMID 9496188 / PMCID
PMC1717402 / DOI 10.1136/adc.77.6.519); ref 7 Holmes 2005 (PMID 16141014 / DOI
10.1197/j.aem.2005.04.019); ref 8 Borgialli 2016 (PMID 27197686 / DOI
10.1111/acem.13014). Ref 6 (BPNA PDF) and ref 9 (StatPearls NBK513298) were
fetched live and their content matches as detailed above. Ref 11
(glasgowcomascale.org) was fetched live and confirmed: operated by the Royal
College of Physicians and Surgeons of Glasgow, supported by the Muriel Cooke
Bequest, with Sir Graham Teasdale associated with the site's authority — matches
the file's IP-status claims. That live fetch did not surface an explicit mention
of "the Adelaide paediatric version" on the page text retrieved (it does list
separate "GCS-P"/"GCS-PA Chart" navigation items whose content was not
retrieved) — this is a minor, non-numeric sourcing softness in the References
section, not in any coefficient/threshold/example, and is noted here rather than
edited, since the core stewardship claim it supports is confirmed.

**Still [NEEDS SOURCE] (unchanged from before this pass — not resolved by any
source found in this pass):**

1. A single canonical rule for numerically substituting V=1 for intubated
   verbal in the James/PECARN branch (Formula section, Branch B intubation
   note).
2. The original Reilly 1988 Adelaide per-level, age-expected numeric
   descriptor table (full text not retrieved in this pass either; only the
   abstract was accessible, which was consistent with but did not reproduce
   the full table).
3. James & Trauner 1985 book chapter (reference 4) — no PMID/DOI or online
   full text located to verify pagination independently of the BPNA citation.

No coefficient, threshold, or worked-example number in this file required
correction as a result of this verification pass.
