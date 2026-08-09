# Research prompt — which PRISM variants should TowardPCC ship?

Paste the block below into a research-capable session (Claude.ai with web search,
or equivalent). It is written to be self-contained: it states what is already
established here so the reviewer spends its effort on what is genuinely open,
and it asks for a recommendation with the evidence attached rather than an
opinion.

Keep the "what is already settled" section intact when pasting. Deleting it
invites a confident re-derivation of work that is already done, which is how
this project has previously received answers that were wrong in familiar ways.

---

## The prompt

You are advising a paediatric critical-care calculator site (TowardPCC) on which
PRISM variants it should publish. Answer as a careful clinical-informatics
reviewer, not a summariser. **Cite everything.** Where you cannot find a source,
say "not established" rather than reasoning to a plausible answer — an unsourced
confident answer is worse than an admitted gap, because it will be acted on.

### What the site ships today

One PRISM calculator with a data-collection-window selector:

| Window     | Variant      | Emits                                                  |
| ---------- | ------------ | ------------------------------------------------------ |
| First 4 h  | PRISM IV     | score, both subscores, **and a mortality probability** |
| First 12 h | PRISM III-12 | score + subscores only                                 |
| First 24 h | PRISM III-24 | score + subscores only                                 |

The **score is computed identically for all three** — same 17 variables, same
cut-points, same point values. Verified by execution: III-12 and III-24 return
byte-identical output on identical input. The window changes only whether a
mortality probability can be shown.

### What is already settled — do not re-derive these

1. **PRISM III's mortality equations are not in Pollack 1996.** The article
   publishes the score sheet in full (Fig. 1, p. 6: every variable, range and
   point value, plus collection rules) and **no logistic coefficients anywhere**.
   Established by enumerating all eight tables and four figures against the full
   text; Table 3 is a model-comparison table (chi-square, df, AIC, AUC,
   Hosmer-Lemeshow) containing no regression coefficients. There is no
   supplement. Those equations were therefore **removed** from this site on
   2026-08-03; the score is untouched.
2. **PRISM IV's coefficients are Table 3 of Pollack 2016** (Pediatr Crit Care
   Med 17(1):2-9), published in full in a paper whose stated objective included
   placing the algorithms in the public domain. That is what the 4-hour window
   uses.
3. **The removed PRISM III models were the weakest available.** The 1996 paper's
   own comparison shows III-12-with-squared-term was the weakest _passing_
   model, and III-24-with-squared-term — the one that shipped — **failed the
   authors' own Hosmer-Lemeshow criterion** at p = .0677. The Discussion
   recommends the models _with_ the additional risk variables, and treats III-12
   as a quality-assessment instrument while III-24 is the more accurate one for
   **individual patient** risk.
4. **IP position.** The patent covering the PRISM III table shows "Expired -
   Lifetime" (anticipated expiry 2015-09-21). The assignment chain runs
   Children's Research Institute → Children's Hospital of Los Angeles
   (2007-11-01) → **VPS LLC** (2008-04-07) — Virtual Pediatric Systems, a
   for-profit subscription registry. Separately, the Pollack 1996 p. 752 rights
   footnote was never withdrawn and names Children's National. A founder
   decision on 2026-08-02 was to publish the score on 17 USC 102(b) grounds
   (a cut-point table plus a regression is a method, not expression).
5. **No published worked example exists** for either PRISM III or PRISM IV — not
   in the 1996 paper, the 2016 paper, the patent, or any secondary source. The
   authors' own CPCCRN calculators are the natural oracle; their input and
   output sets have been read, but **no case has been round-tripped through
   them.**

### What to answer

Answer each with sources, and say plainly where the evidence is thin.

**A. Is PRISM III still in current use, or has PRISM IV superseded it?**
Look for practice surveys, registry documentation, recent trial protocols and
guideline references from roughly 2016 onward. Distinguish _cited in the
literature_ from _actually used to score patients today_.

**B. What does VPS (Virtual Pediatric Systems, VPS LLC) actually use?**
This is the most concrete question and the most useful. VPS runs the largest
paediatric ICU registry in North America and holds the PRISM III patent
assignment. Determine, with sources:

- Which PRISM variant(s) VPS collects and reports — PRISM III, PRISM IV, or both.
- Which collection window they use.
- Whether they publish a mortality model, and whose.
- Whether their documentation, data dictionary, or published papers using VPS
  data state the variant and window explicitly.
  Papers analysing VPS data usually name the score in their methods — that is a
  good route in if VPS's own documentation is behind a subscription.

**C. Does a PRISM score WITHOUT a mortality probability have clinical value?**
This decides whether the two PRISM III windows should exist on the site at all.
Consider: severity description and case-mix adjustment, trending within a stay,
research and audit use, and comparison against the alternative of showing
nothing. Is a score-only PRISM III useful, or is it a number without a purpose
that invites a clinician to look up a mortality figure elsewhere and misapply it?

**D. Has PRISM been revised since PRISM IV (2016)?**
Any PRISM V, recalibration, or externally validated update. Include
recalibrations published by groups other than the original authors.

**E. External validation outside North America — especially the Gulf and KSA.**
The site is Saudi-based and pilots in a Gulf PICU. Report any validation in
Middle Eastern, South Asian or other non-Western cohorts, with the calibration
findings (observed-to-expected ratios, Hosmer-Lemeshow, AUC). Under- or
over-prediction in a comparable case mix matters more here than another North
American validation.

**F. Are the PRISM III mortality coefficients published ANYWHERE citable?**
The site removed them for lack of a citable source. If a peer-reviewed paper,
official erratum, or authoritative reproduction prints them, name it with page
numbers. A patent transcription does not count — the one available has known
internal inconsistencies. If they genuinely are not published, say so; that
confirms the removal and closes the question.

### What to produce

1. **A recommendation**, in one paragraph: keep all three windows, drop one, or
   restructure. State the strongest argument _against_ your own recommendation.
2. **A table** of every PRISM variant found: name, year, window, what it outputs,
   whether its coefficients are published, and current usage status.
3. **The VPS answer specifically**, or an explicit "could not establish" naming
   what you tried.
4. **A source list** with PMIDs/DOIs, marking each as primary, secondary
   reproduction, or vendor documentation.
5. **Anything that contradicts the five settled points above.** Say so loudly if
   found — those are load-bearing here, and one of them being wrong is more
   valuable than a confirmation of all five.

### Constraints

- Do not recommend adding a mortality equation this site cannot cite to a
  primary source.
- Distinguish clearly throughout between the SCORE (a cut-point table) and the
  MORTALITY MODEL (a regression). They have different sourcing, different
  licensing and different answers.
- Note that a score used for individual patient prognosis carries different
  evidentiary requirements than one used for case-mix adjustment, and say which
  use each of your findings supports.
