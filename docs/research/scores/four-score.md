# FOUR score (Full Outline of UnResponsiveness)

> A coma scale built to do the things the Glasgow Coma Scale cannot. It drops
> the verbal component entirely — which is why it still works in an intubated
> patient, where GCS's V is unscoreable — and spends the freed capacity on two
> things GCS never measured: **brainstem reflexes** and **breathing pattern**.
> Four components, each 0–4, summed to a total of **0–16**.
>
> **IMPORTANT, and it is the first thing a paediatric reader needs:** the FOUR
> score was derived and validated in **adults**. There is a real paediatric
> literature and it is summarised below, but what it establishes is _equivalence
> to GCS_, not superiority, and it was collected almost entirely in **school-age
> children who can follow a command**. Two of the sixteen available points — eye
> level 4 and motor level 4 — require command-following, so a neurologically
> intact infant cannot score 16 on the unmodified adult instrument. A separately
> published **Pediatric FOUR Score Scale (PFSS)** exists for that reason.
> **This document and this implementation describe the ADULT instrument
> (Wijdicks 2005), not the PFSS.**
>
> **WORDING NOTE (binding, see IP status).** This file deliberately does **not**
> transcribe the published descriptor prose for the sixteen scoring levels. Every
> level is stated in this project's own words. Where an exact clinical term of
> art is unavoidable (Cheyne–Stokes; decorticate/decerebrate posturing) it is
> used as the fact it is, not as a quotation of the instrument.

---

## Formula / algorithm (exact — every component, every level)

The total is the simple sum of four independently-rated ordinal components:

```
FOUR_total = E + M + B + R
```

- Eye response (E): integer 0–4
- Motor response (M): integer 0–4
- Brainstem reflexes (B): integer 0–4
- Respiration (R): integer 0–4
- **Total range: 0 (worst) to 16 (best).** Unlike GCS, **0 is real** — every
  component has a genuine zero, so the floor of the total is 0 and not 3.

There is no verbal component. That is the entire point of the instrument:
Wijdicks 2005 states the FOUR score's advantage over the GCS is precisely that
it remains scoreable in intubated patients and adds brainstem and respiratory
information the GCS never carried, letting it recognise a locked-in syndrome and
distinguish stages of herniation.

### The sixteen levels, in this project's own words

Paraphrased from the scoring table in Wijdicks 2005 (Ann Neurol 58:585–593),
cross-read against three independent secondary reproductions (MDCalc, the
Shirley Ryan AbilityLab RehabMeasures entry, and Wikipedia), which agree with
each other level for level. **Not a transcription** — see IP status.

**Eye response (E).** What the eyes do, and whether they obey.

| Score | What it means (paraphrase)                                                                                          |
| ----: | ------------------------------------------------------------------------------------------------------------------- |
|     4 | Eyes are open (spontaneously or when roused) **and follow instruction** — tracking a target, or blinking on request |
|     3 | Eyes are open, but the gaze does not follow and no instruction is obeyed                                            |
|     2 | Eyes stay shut until a loud voice opens them                                                                        |
|     1 | Eyes stay shut until a painful stimulus opens them                                                                  |
|     0 | Eyes stay shut even to a painful stimulus                                                                           |

**Motor response (M).** Best response in the upper limbs.

| Score | What it means (paraphrase)                                                                              |
| ----: | ------------------------------------------------------------------------------------------------------- |
|     4 | Performs a hand gesture **on request** — makes a fist, a thumbs-up, or a V-sign                         |
|     3 | No gesture on request, but reaches toward the site of a painful stimulus (localises)                    |
|     2 | Bends the arm inward to pain — abnormal flexion (decorticate pattern)                                   |
|     1 | Straightens the arm away from pain — abnormal extension (decerebrate pattern)                           |
|     0 | Nothing at all to pain, **or** generalised myoclonus status (jerking that is not a purposeful response) |

**Brainstem reflexes (B).** Pupillary, corneal and cough responses, in a fixed
loss order. The published levels distinguish _which_ reflexes remain, not how
brisk they are.

| Score | What it means (paraphrase)                                                                        |
| ----: | ------------------------------------------------------------------------------------------------- |
|     4 | Pupillary and corneal responses both intact                                                       |
|     3 | One pupil is dilated and unreactive; the other pupillary response and the corneal response remain |
|     2 | Exactly one of the pair is lost — pupillary **or** corneal, not both                              |
|     1 | Both pupillary and corneal responses are lost; the cough response is still there                  |
|     0 | Pupillary, corneal **and** cough responses are all lost                                           |

Note the **or / and** distinction between levels 2 and 1: it is the single
easiest thing to get wrong in this component, and it is a one-point difference.
Level 1's "cough still present" is an implication of the published pair (level 0
is the level that adds cough loss), not a separately printed clause.

**Respiration (R).** Breathing pattern in a non-ventilated patient; interaction
with the ventilator in a ventilated one.

| Score | What it means (paraphrase)                                                                  |
| ----: | ------------------------------------------------------------------------------------------- |
|     4 | Breathing without mechanical support, regular rhythm                                        |
|     3 | Breathing without mechanical support, in a waxing-and-waning periodic cycle (Cheyne–Stokes) |
|     2 | Breathing without mechanical support, irregular rhythm                                      |
|     1 | Mechanically ventilated, and triggering breaths **above** the set rate                      |
|     0 | Mechanically ventilated with no breaths beyond the set rate, or apnoeic                     |

The respiration component encodes ventilator status structurally: levels 4–3–2
are the non-ventilated ladder, levels 1–0 the ventilated one. **A ventilated
patient can never score above 1 on R**, which caps their attainable total at 13
regardless of how intact the rest of the neurological examination is. This is a
property of the instrument, not a limitation of any implementation, and it means
FOUR totals are not comparable between ventilated and non-ventilated patients.

---

## Inputs (id, label, type, units + conversions, plausible min/max with source)

| id                 | label              | type           | values / units | min | max | source        |
| ------------------ | ------------------ | -------------- | -------------- | --- | --- | ------------- |
| `four_eye`         | Eye response       | ordinal (enum) | integer 0–4    | 0   | 4   | Wijdicks 2005 |
| `four_motor`       | Motor response     | ordinal (enum) | integer 0–4    | 0   | 4   | Wijdicks 2005 |
| `four_brainstem`   | Brainstem reflexes | ordinal (enum) | integer 0–4    | 0   | 4   | Wijdicks 2005 |
| `four_respiration` | Respiration        | ordinal (enum) | integer 0–4    | 0   | 4   | Wijdicks 2005 |
| `four_total`       | Total (derived)    | integer        | E + M + B + R  | 0   | 16  | derived       |

**There are no physical units and no unit conversions** — every input is a
categorical observation mapped to a fixed integer. No component may be
interpolated (there is no 2.5). Component minimum is **0**, so the total floor is
0; this is the structural difference from GCS, whose components floor at 1 and
whose total therefore floors at 3.

---

## Worked examples (each becomes a unit test)

**No published numeric worked example exists.** Wijdicks 2005 describes and
validates the scale; it does not print a named patient vignette worked through
to a total, and no secondary source located in this pass does either. The
vectors below are therefore **constructed from the scoring table** — each is a
plain sum, annotated with the level that produced each term — and are labelled as
constructed in the test file's `locator`, exactly as `prism.test.ts` labels its
own. The arithmetic is auditable line by line; the _cases_ are not citable to a
published patient.

**Example 1 — intact neurological examination, breathing spontaneously (ceiling).**
_Constructed from the Wijdicks 2005 scoring table._

- E = 4 (eyes open and blink to request)
- M = 4 (makes a requested hand gesture)
- B = 4 (pupillary and corneal responses intact)
- R = 4 (spontaneous, regular breathing)
- **Total = 4 + 4 + 4 + 4 = 16** (best possible).

**Example 2 — no response on any component (floor).**
_Constructed from the Wijdicks 2005 scoring table._

- E = 0, M = 0, B = 0, R = 0
- **Total = 0** (worst possible). Note this is a total the GCS cannot produce;
  the two scales' floors are not the same number and do not describe the same
  patient.

**Example 3 — the case GCS handles badly: intubated, sedated-off, localising.**
_Constructed from the Wijdicks 2005 scoring table._

- E = 1 (eyes open only to pain)
- M = 3 (localises to a painful stimulus)
- B = 4 (pupillary and corneal responses intact)
- R = 1 (ventilated, triggering above the set rate)
- **Total = 1 + 3 + 4 + 1 = 9.** The GCS on this patient has an unscoreable
  verbal component; the FOUR score has no gap.

**Example 4 — the ventilated ceiling.**
_Constructed from the Wijdicks 2005 scoring table._

- E = 4, M = 4, B = 4, R = 1 (ventilated, breathing above the set rate)
- **Total = 13.** This is the **highest total a ventilated patient can reach**,
  and it is reached with an otherwise perfect examination. A reader who compares
  it to another patient's 15 without knowing both airway states is comparing two
  different scales.

**Example 5 — brainstem loss with preserved cough (the or/and boundary).**
_Constructed from the Wijdicks 2005 scoring table._

- E = 0, M = 0, B = 1 (pupillary and corneal both lost, cough retained), R = 0
  (apnoeic / no breaths above the set rate)
- **Total = 1.** Dropping the cough response as well moves B to 0 and the total
  to 0. That single point is the whole clinical distance between the two levels,
  which is why the or/and reading in the B table above matters.

---

## Interpretation bands (non-directive wording, with source)

**There are none, and that is a finding rather than a gap.**

Wijdicks 2005 introduces and validates a 0–16 ordinal total. It does **not**
propose severity categories, and no subsequent source located in this pass
establishes a canonical banding of the kind the GCS has (13–15 / 9–12 / 3–8).
What the literature contains instead is a scatter of **cohort-specific ROC-
derived optimal cut-points**, each fitted to one population and one outcome:

- a cut-point of **14** reported for poor outcome (sensitivity 0.77,
  specificity 0.95) in one population;
- a cut-point of **10** for in-hospital mortality (sensitivity 0.71,
  specificity 0.93) in another;
- a cut-point of **4** maximising sensitivity + specificity for mortality in a
  third (sensitivity 0.500, specificity 0.957);
- a cut-point of **7** with AUC 0.97 (sensitivity 97.5%, specificity 88.2%) in a
  fourth;
- in the paediatric PICU cohort of Khajeh 2014, a cut-point of **8**, with mean
  totals of 12.5 ± 2.1 in survivors versus 5.1 ± 2.8 in non-survivors.

The RehabMeasures summary of the instrument states the position plainly:
population-specific cut-offs exist across roughly FOUR < 4 to < 12 depending on
the condition studied. Foo, Loan & Brennan's systematic review of 37 studies
(J Neurotrauma 2019) found good-to-excellent prognostication of in-hospital
mortality (AUC > 0.80) **and closed by calling for further standardised research
across populations** — i.e. the reason no banding is quoted here is that the
review that would have to supply one says it does not yet exist.

**Consequence for implementation:** ship `interpretation: []` with
`interpretationStatus: "not-applicable"`, set explicitly. Rendering any of the
cut-points above as a band would take a number fitted to one cohort and one
outcome and present it as a classification of whoever types values in. The
figures live in `notes` with their cohorts named, as context, never attached to
a computed result. This is the same decision, for the same reason, that
`fluid-balance` records for the 10 % / 20 % CRRT figures.

**Directional context, not a band:** the total runs low-is-worse, the opposite
direction to most point scores in this catalogue. Wijdicks 2005 reports that the
lowest-scoring patients are the ones in whom mortality is best predicted.
Foo 2019 further reports that the **motor and eye components carry more
prognostic weight than the brainstem component** — a within-instrument finding,
not a re-weighting: the four components are summed with equal weight.

---

## Paediatric validation status (read this before shipping it on a paediatric platform)

**Derivation: adults.** Wijdicks 2005 was a prospective study of **120 ICU
patients** at the Mayo Clinic, rated by neurointensivists, neurology residents
and neuroscience nurses. Interrater agreement was excellent (κ = 0.82), matching
the GCS. No paediatric cohort.

**What the paediatric literature establishes.** Almojuela, Hasen & Zeiler
(J Child Neurol 2019) is the scoping review of exactly this question. From 1,709
citations they retained **6 studies totalling 571 paediatric patients**. Their
findings, stated in their own conclusion:

- **All six studies showed the FOUR score to be _equivalent_ to the GCS** in
  outcome prediction in children.
- Four studies examined interobserver reliability and found it **good to
  excellent** among both physicians and nurses.
- **Superiority over the GCS "has not yet been established"** in children.

That is the honest ceiling of the claim: _equivalent and reliable in children,
not proven better._ The primary paediatric studies underneath it:

| Study                             | n   | Ages                | Setting                                    | Finding                                                                                                                                                                                                                                     |
| --------------------------------- | --- | ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cohen 2009 (J Neurosci Nurs)      | —   | —                   | PICU, CHOC Children's, USA                 | First paediatric application. Interrater reliability κw = 0.951 (FOUR) vs 0.738 (GCS). **Excluded sedated / neuromuscularly blocked patients.**                                                                                             |
| Khajeh 2014 (Iran J Pediatr)      | 200 | 2–12 y              | PICU, Zahedan, Iran                        | FOUR OR 0.13 (0.06–0.29) vs GCS OR 2.49 (1.44–4.32), both p < 0.001; per-component κ 0.72–0.82; concluded FOUR **more** capable than GCS for mortality/discharge in this cohort. Neurological/neurosurgical admissions only, single centre. |
| Jamal 2017 (World J Emerg Med)    | 63  | 5–12 y              | Paediatric ED, tertiary, India             | AUC for in-hospital mortality 0.80 (FOUR) vs 0.83 (GCS), p = 0.27 — no difference. Interrater 0.98 vs 0.96. Underpowered for AUC differences < 0.1.                                                                                         |
| Pandwar 2022 (Indian Pediatr)     | 150 | children            | Tertiary paediatrics, India                | Acute encephalitis syndrome; FOUR and GCS strongly correlated (r = 0.82, p < 0.001) and "comparable".                                                                                                                                       |
| Czaikowski 2014 (J Neurosci Nurs) | —   | all paediatric ages | PICU, Marshfield/Ministry St Joseph's, USA | **Built a modified instrument** — see below.                                                                                                                                                                                                |

**What the paediatric literature does NOT establish, and this is the part that
matters most here.**

1. **The cohorts are school-age.** The two studies that report an age range
   enrolled **2–12 y** and **5–12 y**. Neonates and infants are essentially
   absent from the evidence base for the unmodified adult instrument.

2. **Two of the sixteen points require command-following.** Eye level 4 requires
   the patient to track or blink _to instruction_; motor level 4 requires a
   requested hand gesture. **A neurologically intact preverbal infant cannot
   attain either**, and therefore cannot score above 14 on an unmodified adult
   FOUR score — the same structural failure that made the paediatric GCS
   necessary in the first place. This is a direct consequence of the item
   definitions cited above; it is reasoning from the instrument, not a quoted
   finding, and it is flagged as such below.

3. **A paediatric adaptation exists and this is not it.** Czaikowski, Liang &
   Stewart (J Neurosci Nurs 2014) published a **Pediatric FOUR Score Scale
   (PFSS)** precisely to make the instrument usable across all paediatric ages
   and developmental stages, including intubated and sedated children —
   Cohen 2009 had excluded exactly those patients. They report excellent
   interrater reliability for trained nurse-rater pairs and good prediction of
   poor outcome and in-hospital mortality, with **no statistically significant
   difference from the GCS**. The very existence of the PFSS is the strongest
   available evidence that the adult instrument needed adapting for young
   children. **This implementation scores the adult instrument. It is not the
   PFSS and must not be labelled as one.**

4. **Sedation and neuromuscular blockade confound it**, as they confound the
   GCS. Cohen 2009 handled this by excluding such patients outright; Czaikowski
   2014 named including them as the reason a modified scale was needed.

**[NEEDS SOURCE]** for each of the following, none of which was resolved in this
pass and none of which is asserted anywhere in the implementation:

- The exact item-level content of the PFSS modification (the abstract states
  that it adapts the scale for all paediatric ages and for intubated/sedated
  children; the per-level table is in the paywalled full text and was not
  obtained). A secondary aggregator describes it as taking account of
  "age-appropriate spontaneous movements, breathing pattern and rate, and the
  varying methods of respiratory support" and as useful particularly under 2
  years — **that phrasing could not be traced to a resolvable primary source and
  is recorded here as unverified.**
- The sample size and age range of Cohen 2009 (abstract does not state them; the
  full text is paywalled — two independent retrieval attempts returned HTTP 402
  and an unextractable PDF).
- Any published statement of a **youngest age at which the unmodified adult FOUR
  score is applicable**. Point 2 above is derived from the item definitions, not
  quoted from a source that states it.
- Any paediatric-specific interpretation banding. None exists; see above.

---

## References (full citations, PMID/DOI)

1. **Wijdicks EFM, Bamlet WR, Maramattom BV, Manno EM, McClelland RL.**
   Validation of a new coma scale: The FOUR score. _Ann Neurol._
   2005;58(4):585–593. **PMID: 16178024. DOI: 10.1002/ana.20611.**
   (Derivation and validation; 120 adult ICU patients, Mayo Clinic; κ = 0.82;
   source of the four components, the sixteen levels, and the 0–16 total.)
2. **Almojuela A, Hasen M, Zeiler FA.** The Full Outline of UnResponsiveness
   (FOUR) Score and Its Use in Outcome Prediction: A Scoping Review of the
   Pediatric Literature. _J Child Neurol._ 2019;34(4):189–198.
   **PMID: 30630377. DOI: 10.1177/0883073818822359.** (The paediatric evidence
   base, assembled: 6 studies, 571 children; equivalent to GCS; superiority not
   established.)
3. **Cohen J.** Interrater reliability and predictive validity of the FOUR score
   coma scale in a pediatric population. _J Neurosci Nurs._ 2009;41(5):261–267.
   **PMID: 19835239. DOI: 10.1097/JNN.0b013e3181b2c766.** (First paediatric
   application; κw 0.951 vs 0.738; excluded sedated/paralysed patients.)
4. **Czaikowski BL, Liang H, Stewart CT.** A pediatric FOUR score coma scale:
   interrater reliability and predictive validity. _J Neurosci Nurs._
   2014;46(2):79–87. **PMID: 24556655. DOI: 10.1097/JNN.0000000000000041.**
   (The Pediatric FOUR Score Scale — a MODIFIED instrument, which this
   implementation does not implement.)
5. **Jamal A, Sankhyan N, Jayashree M, Singhi S, Singhi P.** Full Outline of
   Unresponsiveness score and the Glasgow Coma Scale in prediction of pediatric
   coma. _World J Emerg Med._ 2017;8(1):55–60. **PMID: 28123622.
   DOI: 10.5847/wjem.j.1920-8642.2017.01.010.** (63 children aged 5–12 y; FOUR
   as good as GCS, no significant difference.)
6. **Khajeh A, Fayyazi A, Miri-Aliabad G, Askari H, Noori N, Khajeh B.**
   Comparison between the Ability of Glasgow Coma Scale and Full Outline of
   Unresponsiveness Score to Predict the Mortality and Discharge Rate of
   Pediatric Intensive Care Unit Patients. _Iran J Pediatr._ 2014;24(5):603–608.
   **PMID: 25793069. PMCID: PMC4359415.** (200 children aged 2–12 y; cut-point
   8; no DOI is registered for this article.)
7. **Pandwar U, Navindana, Ramteke S, Motwani B, Agrawal A.** Comparison of Full
   Outline of Unresponsiveness Score and Glasgow Coma Scale for Assessment of
   Consciousness in Children With Acute Encephalitis Syndrome. _Indian Pediatr._
   2022;59(12):933–935. **PMID: 36511207.** (150 children; r = 0.82.)
8. **Foo CC, Loan JJM, Brennan PM.** The Relationship of the FOUR Score to
   Patient Outcome: A Systematic Review. _J Neurotrauma._ 2019;36(17):2469–2483.
   **PMID: 31044668. DOI: 10.1089/neu.2018.6243.** (37 studies; AUC > 0.80 for
   in-hospital mortality; motor and eye components more prognostic than
   brainstem; calls for further standardised research — the basis for shipping
   no interpretation bands.)
9. **Shirley Ryan AbilityLab, RehabMeasures Database.** Full Outline of
   UnResponsiveness Score.
   https://www.sralab.org/rehabilitation-measures/full-outline-unresponsiveness-score
   (Secondary; independent reproduction of the sixteen levels, psychometric
   summary, and the statement that cut-offs are population-specific — adult and
   older-adult populations only, **no paediatric data reported**.)

---

## Limitations & notes

- **Adult-derived.** See the paediatric section above. The honest claim is
  "equivalent to GCS and reliably rated in children, mostly school-age, not
  proven superior" — nothing stronger.
- **The ventilated ceiling.** R cannot exceed 1 in a ventilated patient, capping
  their total at 13. Totals are not comparable across airway status. This is the
  flip side of the instrument's headline advantage: it _has_ a score for the
  ventilated patient where GCS has a hole, but that score is drawn from a
  shorter ruler.
- **Command-following costs two points in the young.** E4 and M4 both require
  compliance. In a preverbal or developmentally young child, the _instrument_
  floors those two components at 3 regardless of neurological state.
- **Sedation and neuromuscular blockade** make E and M uninformative, exactly as
  they do for GCS. Flag such scores.
- **The or/and boundary in the brainstem component** (levels 2 and 1) is the
  single most error-prone reading in the scale and is worth one point.
- **No banding exists.** Every published cut-point is cohort- and
  outcome-specific. Do not attach one to a computed result.
- **Ordinal, non-interpolable.** Never average components, never emit a
  fractional level; the total is an ordinal sum, not a continuous measure.
- **No published worked example** — every test vector for this score is
  constructed from the scoring table and labelled as constructed.
- **Direction.** Low is worse. Most point scores in this catalogue run the other
  way, and the total shares a 0–16 range with nothing else here.

---

## IP status

**Formula / scoring math — not copyrightable.** The total is an ordinal sum of
four integers (`E + M + B + R`, 0–16). Under 17 USC 102(b) an idea, procedure,
process or method of operation is not copyrightable regardless of the form in
which it is described; a scoring table and a summation are that. The numeric
levels and the total range are facts. TowardPCC may implement the scoring logic
freely.

**Descriptor wording — deliberately NOT reproduced.** The FOUR score was
developed at the Mayo Clinic by Eelco F. M. Wijdicks; the derivation paper is
published by Wiley (Ann Neurol) and the subsequent validation series by Mayo
Clinic Proceedings, whose content is copyright Mayo Foundation for Medical
Education and Research. Public reporting notes that Dr Wijdicks received several
hundred outside requests for copies of the scale and permission to use it — i.e.
permission has in practice been _sought_ from the developer, which is a fact
about custom, not a licence term. No explicit reproduction restriction on the
scale text itself was located; equally, no explicit grant was located.

`docs/decisions/ADR-tier-b-ip.md`, third addendum (2026-08-02), records the
founder decision: **the FOUR score carries no IP obstacle for this project,
build it — with the binding constraint that it be built the way
`pediatric-gcs.ts` is built.**

> **State-of-the-repo caveat, recorded rather than glossed.** At the time this
> score was built, that third addendum existed only on the unmerged branch
> `docs/prism-ip-decision` (commit `84ef64f`, 2026-08-02). On `main` — which
> this work branched from — `ADR-tier-b-ip.md` still ends at the second
> addendum, so **every reference to the "third addendum" in this file, in
> `four-score.ts`'s `ipStatus` and `notes`, and in the CHANGELOG entry will not
> resolve until that branch merges.** The decision itself is real and is quoted
> accurately here; only its landing is outstanding. If `docs/prism-ip-decision`
> is abandoned rather than merged, this score's IP basis has to be re-recorded
> somewhere that exists, and that is a documentation fix, not a rebuild. Component scores are consumed as integers; no
> verbatim descriptor prose is reproduced; every level that needs explaining is
> explained in this project's own words with Wijdicks 2005 cited. That constraint
> is honoured throughout this file and in `four-score.ts`, and it is the reason
> the sixteen levels above read as paraphrase rather than as a table lifted from
> the source.

**Attribution is the obligation this carries, and it is not optional.** The
derivation study is named on the published page, in `references`, in `formula`
and in `notes`. That is an academic-integrity duty independent of copyright.

Bottom line: implement the arithmetic and the numeric levels freely; state every
descriptor in this project's own words; attribute Wijdicks 2005 everywhere the
score is shown.

---

## Verification

Research and verification pass, 2026-08-02. Sources fetched live in this pass
unless noted.

**Citation, cohort and reliability (Wijdicks 2005).** Confirmed live against
PubMed (PMID 16178024) and independently against the Europe PMC REST API by DOI
(10.1002/ana.20611): Ann Neurol 2005;58(4):585–593; authors Wijdicks EF, Bamlet
WR, Maramattom BV, Manno EM, McClelland RL; prospective study of 120 ICU
patients; κ = 0.82; the four components each scored to 4; conclusion that it
gives greater neurological detail than the GCS, recognises locked-in syndrome,
and better predicts mortality in the lowest-scoring patients. **The AUC figures
of 0.95 (poor outcome) and 0.92 (in-hospital mortality) that circulate attached
to "the FOUR score" are NOT in the Wijdicks 2005 abstract** — a search snippet
attributed them there and two independent retrievals of the abstract did not
contain them, so they are deliberately absent from this file and from the
implementation. They most likely belong to one of the subsequent Mayo validation
papers; that attribution was not run to ground and no number of that shape is
asserted anywhere here.

**The sixteen levels.** The neuroscand.com PDF of the primary paper and the
CHOC PDF of Cohen 2009 were both fetched but returned unextractable binary, so
the level definitions were established by **three independent secondary
reproductions** — MDCalc, Wikipedia, and the Shirley Ryan AbilityLab
RehabMeasures database entry. All three agree level-for-level on all four
components, including the or/and distinction at brainstem levels 2 and 1 and the
placement of generalised myoclonus status at motor 0. Total range 0–16 confirmed
by all three. This file's tables are paraphrases of that agreed content, not
transcriptions of any of them. **[NEEDS SOURCE]** on the primary-source table
itself: the level wording has not been read in the original Ann Neurol full
text, only in three concordant reproductions of it.

**Absence of interpretation bands.** Confirmed three ways: the Wijdicks 2005
abstract proposes none; the RehabMeasures entry describes cut-offs as
population-specific (roughly < 4 to < 12 by condition); and Foo 2019
(PMID 31044668, DOI 10.1089/neu.2018.6243, confirmed live via Europe PMC by DOI)
reviews 37 studies and closes by calling for further standardised research
across populations rather than proposing a banding. The individual cut-points
quoted in the interpretation section above were surfaced in search results
across several primary studies and are reported as _examples of the scatter_,
each without a claim about which population it came from where that was not
established — they are context in `notes`, never bands.

**Paediatric evidence.** Almojuela 2019 confirmed live via PubMed
(PMID 30630377, DOI 10.1177/0883073818822359): 1,709 citations screened, 6
studies, 571 paediatric patients, equivalence to GCS in all six, good-to-
excellent interobserver reliability in four, superiority not established.
Khajeh 2014 confirmed live via PMC (PMC4359415) and its citation metadata
independently via Europe PMC (PMID 25793069, Iran J Pediatr 2014;24(5):603–608,
no registered DOI): 200 children aged 2–12 y, mean age 4.4 y, 28.5 % mortality,
cut-point 8, per-component κ 0.72–0.82, applied unmodified after
translation/back-translation and nurse training. Jamal 2017 confirmed live via
PMC (PMC5263038): 63 children aged 5–12 y (mean 7.4 ± 2.1), Indian paediatric
ED, AUCs 0.80 vs 0.83 for in-hospital mortality (p = 0.2674), applied unmodified.
Pandwar 2022 confirmed live via PubMed (PMID 36511207): 150 children, acute
encephalitis syndrome, r = 0.82. Cohen 2009 confirmed live via PubMed
(PMID 19835239, DOI 10.1097/JNN.0b013e3181b2c766): κw 0.951 vs 0.738, CHOC
Children's PICU — **the abstract does not state n or age range and the full text
was not retrievable** (HTTP 402 from one host, unextractable PDF from another),
which is recorded as [NEEDS SOURCE] above rather than estimated.
Czaikowski 2014 confirmed live via PubMed (PMID 24556655,
DOI 10.1097/JNN.0000000000000041): the PFSS is a modified instrument for all
paediatric ages including intubated/sedated children, excellent interrater
reliability, **no statistically significant difference from GCS**; the
item-level modifications are in the paywalled full text and were not obtained.

**Worked examples.** All five constructed vectors were recomputed
independently: 4+4+4+4 = 16; 0+0+0+0 = 0; 1+3+4+1 = 9; 4+4+4+1 = 13;
0+0+1+0 = 1. Each component value maps to a level that appears in the verified
tables above. No published worked example was located to check them against, and
the test file's `locator` says so.

**Reference identifiers.** PMIDs 16178024, 30630377, 19835239, 24556655,
28123622, 25793069, 36511207 and 31044668 were each resolved live. DOIs
10.1002/ana.20611, 10.1177/0883073818822359, 10.1097/JNN.0b013e3181b2c766,
10.1097/JNN.0000000000000041, 10.5847/wjem.j.1920-8642.2017.01.010 and
10.1089/neu.2018.6243 were each seen on the record for their PMID. Khajeh 2014
and Pandwar 2022 carry no DOI on their PubMed records and are cited by PMID
alone, which the engine's `Reference` union permits.

**Still [NEEDS SOURCE] after this pass:**

1. The primary-source level table read in the Ann Neurol full text (established
   via three concordant secondary reproductions instead).
2. The item-level content of the PFSS modification (Czaikowski 2014 full text).
3. The sample size and age range of Cohen 2009.
4. Any published statement of a youngest applicable age for the unmodified adult
   instrument; the two-point command-following ceiling in infants is derived
   from the item definitions here, not quoted.
5. The provenance of the widely-circulated AUC 0.95 / 0.92 pair, which is
   consequently asserted nowhere.
