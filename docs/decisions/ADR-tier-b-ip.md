# ADR: Tier-B instrument intellectual-property / reproduction status

- Status: informational
- Date: 2026-07-25
- Deciders: founding engineer / founder (records findings for permissions pursuit)
- Scope: PRD §6.4 — each Tier-B item-based instrument stays UNBUILT until its
  rights status is cleared.

## Framing (the copyright principle)

TowardPCC builds free PICU calculators. Formula- and threshold-based scores are
IP-clean because facts, mathematical formulae, and physiological cut-offs are
not copyrightable, so those ~22 scores are already built. **Tier-B instruments
are different: they are item-based observational scales whose value lives in the
_specific wording_ of their response descriptors and anchors.** That wording is
an original literary expression and is frequently copyrighted, trademarked, or
subject to an explicit license or permission requirement by its rights holder.
Reproducing copyrighted scale text verbatim without permission is a
professionalism and licensing failure. This document records, per instrument,
(1) who holds the rights, (2) whether the item wording is freely reproducible /
needs permission / is public domain, (3) the known permission route, and (4) a
recommendation. Nothing here reproduces the protected item wording itself — it
records rights status only. Where a claim could not be confirmed against an
authoritative source it is marked `[NEEDS SOURCE]` or routed to
`NEEDS-LEGAL-REVIEW`; no instrument is asserted "free" without a cited source.

## Findings

| Instrument                                                                                                  | Rights holder / developer                                                                                                                                     | Reproduction status                                                                                                                                                                                                                                                                                                                                   | Permission route                                                                                                                                      | Recommendation                                                                                                                                                                   | Source   |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **PRISM III / PRISM IV** (Pediatric Risk of Mortality) — **SUPERSEDED 2026-07-31, see addendum; now built** | Murray M. Pollack et al.; algorithms copyrighted and possibly patented by Children's Research Institute / Children's National Medical Center (Washington, DC) | Algorithm/coefficients described as available _without charge for research uses_ (incl. independent verification); **non-research / commercial uses may require compensation/licensing**. It is largely formula/threshold-based, but the rights holder makes an explicit copyright + patent claim, so it does not sit cleanly in the IP-clean bucket. | Contact Children's National Medical Center / Children's Research Institute technology-transfer for non-research use terms                             | **NEEDS-LEGAL-REVIEW** (formula-shaped but explicit copyright/patent claim; a free public clinical calculator is arguably a non-research use)                                    | [1][2]   |
| **COMFORT-B** (behavioral sedation scale)                                                                   | © B. Ambuel, K. Hamlett, C. Marx (COMFORT scale lineage)                                                                                                      | Copyrighted; source documents carry an explicit "do not reproduce without permission" notice                                                                                                                                                                                                                                                          | Contact the copyright holders for reproduction permission (scale is distributed through institutional/comfort-assessment channels)                    | **BUILD-BLOCKED** (needs permission)                                                                                                                                             | [3][4]   |
| **CAPD** (Cornell Assessment of Pediatric Delirium)                                                         | Chani Traube & Gabrielle Silver; Copyright © 2012 Cornell University (distributed via CIBS Center / Vanderbilt University Medical Center)                     | Copyrighted by Cornell University; reproduction of the tool requires permission from the rights holder. (Individual open-access _articles about_ CAPD may be CC BY, but that does not license the instrument itself.)                                                                                                                                 | Contact Cornell University (tech transfer) and/or the CIBS Center distributor                                                                         | **BUILD-BLOCKED** (needs permission)                                                                                                                                             | [5][6]   |
| **WAT-1** (Withdrawal Assessment Tool-1)                                                                    | © 2007 Linda S. Franck & Martha A.Q. Curley; released under **Creative Commons Attribution-NoDerivatives (CC BY-ND 2.0)**                                     | Free to reproduce/use for research or clinical practice **with attribution and the embedded copyright unaltered**; may be placed on hospital forms/EHRs. **No commercial use / monetization without written permission; no derivatives / no alteration.** An interactive calculator may count as a derivative and needs confirming.                   | Terms on Franck/Curley permission page (UCSF Family Nursing / marthaaqcurley.com); written permission for anything beyond verbatim non-commercial use | **NEEDS-LEGAL-REVIEW** (closest to buildable: CC BY-ND permits attributed reproduction, but no-derivatives + non-commercial clauses vs. an interactive web tool must be cleared) | [7][8]   |
| **SOS-PD** (Sophia Observation withdrawal Symptoms – Pediatric Delirium)                                    | © E. Ista, M. van Dijk, M. de Hoog — Erasmus MC-Sophia Children's Hospital, Rotterdam                                                                         | Copyrighted; reproduction not permitted without permission (distributed via comfortassessment.nl)                                                                                                                                                                                                                                                     | Contact Erasmus MC (w.ista@erasmusmc.nl per the developer's distribution site)                                                                        | **BUILD-BLOCKED** (needs permission)                                                                                                                                             | [9][10]  |
| **Braden QD** (pediatric pressure-injury risk)                                                              | Copyright © 2018 Martha A.Q. Curley, All Rights Reserved (Curley, Hasbani, Quigley et al., J Pediatr 2018;192:189-95)                                         | Free to reproduce/use **without modification** for research or clinical practice, incl. hospital forms and EHR systems, **provided the citation + copyright footer are kept and not altered**. No explicit non-commercial clause found, but "without modification" vs. an interactive scoring UI needs confirming.                                    | Terms on marthaaqcurley.com Braden QD page; contact Curley for anything beyond verbatim unaltered reproduction                                        | **NEEDS-LEGAL-REVIEW** (leaning buildable: generous clinical-use permission, but no-modification vs. interactive tool must be cleared)                                           | [11]     |
| **FLACC** (Face, Legs, Activity, Cry, Consolability)                                                        | © 2002 The Regents of the University of Michigan (Merkel, Voepel-Lewis, Shayevitz, Malviya, 1997)                                                             | Copyrighted; **a license is required** (separate academic/research-use and academic-publishing licenses) and copyright notice must be reproduced. Not free to reproduce without a license.                                                                                                                                                            | University of Michigan Office of Technology Transfer (Innovation Partnerships) — FLACC / rFLACC license                                               | **BUILD-BLOCKED** (needs license)                                                                                                                                                | [12][13] |
| **PEWS — Bedside PEWS** (Parshuram/Duncan, SickKids)                                                        | Christopher Parshuram et al., The Hospital for Sick Children (SickKids), Toronto                                                                              | **Commercialized and proprietary**: BedsidePEWS™ is trademarked, holds FDA 510(k) clearance, and was commercialized via SickKids Industry Partnerships (MaRS Innovation / Bedside Clinical Systems). Licensed technology, not free.                                                                                                                   | SickKids Industry Partnerships & Commercialization (ipc.sickkids.ca)                                                                                  | **BUILD-BLOCKED** (needs license; trademarked/commercial)                                                                                                                        | [14][15] |
| **PEWS — other variants** (Brighton/Monaghan; Tibballs; Haines; modified local variants)                    | Various (e.g., Monaghan 2005, Brighton/Royal Alexandra Children's Hospital); copyright typically held by the journal publisher of each source table           | Mixed / unverified. These are largely vital-sign threshold tables (more formula-like), but the **specific published table wording and layout are usually under the journal publisher's copyright**. No blanket free-use license confirmed for any named variant.                                                                                      | Per variant: check the source publication's copyright / request permission from the journal publisher                                                 | **NEEDS-LEGAL-REVIEW** per named variant `[NEEDS SOURCE]` for each — do not reproduce a specific published table without checking that publication                               | [16][17] |

## Next steps (which to pursue permission for)

Pursue written permission / licensing, in rough priority order:

1. **FLACC** — obtain the University of Michigan Innovation Partnerships license
   (clear, established route; high clinical demand). Confirm terms for a free web
   calculator specifically.
2. **CAPD** — request permission from Cornell University; confirm the CIBS Center
   distribution route and whether a free web tool is covered.
3. **COMFORT-B** — contact the copyright holders (Ambuel et al.) for reproduction
   permission.
4. **SOS-PD** — email Erasmus MC (w.ista@erasmusmc.nl) for reproduction/use
   permission for a free web tool.
5. **WAT-1** — confirm with Franck/Curley whether a free, non-commercial,
   attributed interactive calculator is permitted under CC BY-ND (derivative +
   non-commercial questions), or obtain written permission.
6. **Braden QD** — confirm with Curley whether an interactive scoring UI counts
   as "modification," or obtain written permission for it.
7. ~~**PRISM III / PRISM IV** — obtain a written statement from Children's
   National Medical Center on whether a free public clinical calculator is a
   permitted (research-equivalent) use or a licensable non-research use;
   resolve the patent question.~~ **Resolved 2026-07-31 — see the addendum
   below. Built and published.**
8. **Bedside PEWS** — only via a SickKids commercial license; likely out of
   scope for a free platform. Consider omitting in favour of clearly-licensable
   alternatives.

For each: do NOT ship the instrument (or reproduce its item wording anywhere in
the product or repo) until a written clearance is on file.

## Interim decision

All Tier-B item-based instruments above remain **unbuilt in v1** pending rights
clearance, per PRD §6.4. None of their protected item wording is reproduced in
the product or in this repository. The platform ships only the ~22 IP-clean
formula/threshold scores whose facts and cut-offs are not copyrightable. As
written permissions/licenses are secured (tracked via "Next steps" above), each
cleared instrument can be promoted from BUILD-BLOCKED / NEEDS-LEGAL-REVIEW to
built, one at a time, with its required attribution and copyright notice
preserved verbatim. Nothing in this document constitutes legal advice; items
marked NEEDS-LEGAL-REVIEW should be confirmed with qualified counsel before build.

## Sources

1. PRISM III: an updated Pediatric Risk of Mortality score (Pollack et al.), PubMed — https://pubmed.ncbi.nlm.nih.gov/8706448/
2. Comparative performance of PRISM IV (2016) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12186081/ ; PRISM copyright/patent + research-use terms held by Children's Research Institute / Children's National Medical Center (per rights notices accompanying the PRISM III algorithm)
3. COMFORT Behavior scale document with "© Ambuel/Hamlett/Marx — do not reproduce without permission" notice (Children's Health Ireland distribution) — https://www.childrenshealthireland.ie/documents/983/Pain-Comfort-Behaviour-Scale-.pdf
4. COMFORT Behaviour Scale (COMFORT-B) instrument listing, ePROVIDE / Mapi Trust — https://eprovide.mapi-trust.org/instruments/comfort-behaviour-scale
5. Cornell Assessment of Pediatric Delirium — CIBS Center / Vanderbilt distribution — https://www.icudelirium.org/resource-downloads/cornell-assessment-of-pediatric-delirium-capd
6. CAPD (Copyright © 2012 Cornell University), e.g. Turkish version deposit, Cornell eCommons — https://ecommons.cornell.edu/bitstreams/0c75e471-a127-414e-93f4-cde3b89da421/download ; MDCalc CAPD (creators Traube & Silver) — https://www.mdcalc.com/calc/10172/cornell-assessment-pediatric-delirium-capd
7. Permission to use the WAT-1 and Guidelines — © 2007 L.S. Franck & M.A.Q. Curley, CC BY-ND 2.0 (UCSF Family Nursing) — https://familynursing.ucsf.edu/sites/familynursing.ucsf.edu/files/wysiwyg/Permission%20to%20use%20the%20WAT-1%20and%20Guidelines_1.pdf
8. WAT-1 permission page, Martha A.Q. Curley — http://www.marthaaqcurley.com/wat-1.html
9. SOS-PD scale distribution (comfortassessment.nl, Erasmus MC) — https://comfortassessment.nl/web/files/7014/2919/5578/SOS-PD_scale_EN_April_2015.pdf
10. Validation of the SOS-PD scale (Ista, van Dijk, de Hoog et al.) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6247513/
11. Braden QD Scale — Copyright © 2018 Martha A.Q. Curley, permission-to-use terms — http://www.marthaaqcurley.com/braden-qd.html ; tool PDF — http://www.marthaaqcurley.com/uploads/8/9/8/6/8986925/braden_qd_tool.pdf
12. FLACC — Academic/Research Use License, University of Michigan Office of Technology Transfer — https://secure.nouvant.com/umich/technology/6581/license/473
13. FLACC — Individual Academic Publishing License, University of Michigan — https://secure.nouvant.com/umich/technology/6581/license/606
14. BedsidePEWS™ earns FDA 510(k) approval (MaRS Innovation, commercialization via SickKids) — http://marsinnovation.com/2013/10/bedside-paediatric-early-warning-system-bedsidepews-earns-fda-510k-approval/
15. SickKids Industry Partnerships & Commercialization — https://ipc.sickkids.ca/ ; Bedside PEWS development/validation (Parshuram et al.) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3387627/
16. Brighton/Monaghan Pediatric Early Warning Score (B-PEWS), source table — https://www.researchgate.net/figure/Brighton-Pediatric-Early-Warning-Score-B-PEWS_tbl1_347943969
17. PEWS variants overview (Monaghan, Tibballs, Duncan, Haines) — https://www.accjournal.org/journal/view.php?doi=10.4266%2Facc.004475

---

## Addendum, 2026-07-31 — PRISM III / PRISM IV resolved and built

The original PRISM row rated the instrument `NEEDS-LEGAL-REVIEW` on two
grounds: an "explicit copyright + patent claim", and the worry that a free
public calculator is "arguably a non-research use". Both were reasonable
readings of what was available in July 2026. Both turned out to rest on a
secondary claim that is stale, and neither survived checking the primary
sources.

**The patent has expired.** US 5,809,477 (inventor Murray M. Pollack), which
reproduces the complete PRISM III threshold table and all six mortality
equations, shows status **"Expired - Lifetime"** with an anticipated expiration
of **2015-09-21**. Verified directly against the patent record, not inferred.

**PRISM IV was placed in the public domain by its own authors.** The abstract of
Pollack MM et al., _The Pediatric Risk of Mortality Score: Update 2015_, Pediatr
Crit Care Med 2016;17(1):2-9 (PMID 26492059) states that the work
"recalibrates the Pediatric Risk of Mortality score, **placing the algorithms
(Pediatric Risk of Mortality IV) in the public domain**". The authors' own
NIH-funded network, CPCCRN, publishes a free public PRISM IV calculator.

**Where the original finding came from.** The "available only under licence"
framing is still repeated by Wikipedia and by medicalalgorithms.com, which
declines to publish PRISM III because it "is protected by patent". Those
statements pre-date the 2015 expiry and were not revised. This ADR inherited
them.

**Why this instrument was always the odd one out here.** This document's own
framing says formula- and threshold-based scores are IP-clean, "because facts,
mathematical formulae, and physiological cut-offs are not copyrightable", and
that Tier-B instruments are different because their value lives in the specific
wording of item descriptors. PRISM III is a table of physiologic cut-offs and a
logistic equation — the first category, not the second. The original row said as
much ("largely formula/threshold-based") and hedged only because of the patent
claim. With the patent expired, the hedge has nothing left to hang on.

**Status: built and published** as `packages/scoring-engine/src/scores/prism.ts`,
carrying `ipStatus: { kind: "freely-reproducible" }` with this evidence. The
other seven instruments in the table are unaffected and remain as recorded.

**What is still open, and it is not an IP question.** No published worked
example exists for either model, so the test cases are constructed from the
threshold table and labelled as such. The natural oracle — the CPCCRN
calculators — returned HTTP 503 behind a rate limit at every attempt during both
research and implementation. Reconciling against one of them is outstanding.

**The transferable lesson.** This row was wrong for over a week because it cited
secondary sources for a legal fact that a primary source states plainly and for
free. A rights claim about a specific patent should be checked against the
patent, and a claim about what authors permit should be checked against what the
authors wrote.

## Second addendum, 2026-08-01 — the PRISM row is reopened

The addendum above closes with: "a claim about what authors permit should be
checked against what the authors wrote." It did not do that. It is reopened
here, applying its own lesson to itself.

**What it answered.** Two secondary sources — Wikipedia and
medicalalgorithms.com — both of which say PRISM III "is protected by patent".
Against those, the rebuttal is sound: US 5,809,477 shows "Expired - Lifetime",
anticipated expiry 2015-09-21, and a rights claim about a specific patent should
indeed be checked against the patent.

**What it never answered.** The original row did not rest on Wikipedia. It rested
on the rights footnote the authors themselves published, which sources [1] and
[2] point at. Recovered 2026-08-01 from two independent routes:

> "PRISM III and updated PRISM algorithms are copyrighted and may be the subject
> of one or more patents held by Children's Research Institute. However, the
> equations are available without charge for **research uses** including the
> independent verification of their accuracy and reliability. Children's National
> Medical Center may receive **compensation resulting from nonresearch uses** of
> PRISM III and PRISM algorithms."

Three assertions joined by "and": copyright, patent, and a research/non-research
split. **Patent expiry retires exactly one of them.** The footnote's own hedging
is worth noticing — the patent is "may be", the copyright is flat. A free public
calculator for practising clinicians is a clinical use, not "research uses
including the independent verification of their accuracy and reliability"; it is
on the wrong side of the line the authors drew.

**Two factual corrections to the addendum above.**

1. **The rights holder is not Children's National.** The patent's assignment
   chain, verified directly against the record: Children's Research Institute →
   **Children's Hospital of Los Angeles** (2007-11-01) → **VPS LLC**
   (2008-04-07). VPS LLC is Virtual Pediatric Systems, a for-profit subscription
   PICU benchmarking product that markets PRISM 3. This row has named the wrong
   counterparty since 2008, and there are now at least two possible ones. The
   assignment table sits four lines below the "Expired - Lifetime" status the
   addendum quotes from the same page.
2. **The public-domain grant names PRISM IV.** Pollack 2016 opens "the
   prediction algorithms (Pediatric Risk of Mortality IV)". `prism.ts` also
   implements the PRISM III-12 and PRISM III-24 score-only quadratic mortality
   equations, which are outside that grant and are the most direct target of
   "PRISM III and updated PRISM algorithms are copyrighted".

**Status: `NEEDS-LEGAL-REVIEW`, as originally rated.** The instrument stays
built and published while this is open, and that is a deliberate choice rather
than an oversight — see below.

**Why it is not unpublished.** The claim is probably weak: a table of physiologic
cut-offs and a logistic equation is thin ground under 17 USC 102(b), and the
"facts and formulae are not copyrightable" reasoning above is likely right on the
merits. Removing a working clinical tool from a live site on the strength of a
footnote nobody has read in its original context would be an over-reaction with a
real cost to the clinicians using it. But the reverse — leaving the record saying
the question is closed — is a misrepresentation, and this project's entire posture
is that a claim it cannot substantiate gets disclosed rather than assumed away.

**The inconsistency is real and is stated rather than resolved.** PEWS, FLACC,
COMFORT-B, CAPD and SOS-PD were all declined on asserted claims without waiting
to see whether those claims would hold. PRISM is published under an assertion of
the same kind. The difference is that the others were declined before being
built, and this one is live. That is an explanation, not a justification, and it
is recorded so the next reader does not have to reconstruct it.

**What closes this, in order of cost.**

1. **Read Pollack 1996 p.752.** The footnote is in the body of the paywalled
   paper; this repository's own research note records the full text as never
   obtained. One page, institutional access, resolves it either way.
2. **If it reads as quoted: ship PRISM IV only.** Drop the PRISM III-12/-24
   quadratic equations. Their clearance is the only part that depends on reading
   patent expiry as extinguishing a copyright claim, and the score's own `notes`
   already tell the reader not to rely on them ("a PRISM III figure should not be
   read as a current estimate of anything"). The physiologic table is unchanged
   between the two models — Pollack 2016: "the PRISM score for physiologic
   variables and their ranges did not change" — so it travels with the PRISM IV
   public-domain grant.
3. **Or obtain a written statement** from whichever of Children's National or
   VPS LLC holds the copyright.

**Note there is nothing to strip.** Unlike FLACC or COMFORT-B, PRISM has no item
wording of its own — the only external wording is the GCS, and `prism.ts`
consumes an integer total exactly as `pediatric-gcs.ts` does. The paraphrase
route that de-risks a prose scale does not apply, because the assertion is over
the algorithm itself.

**The transferable lesson, restated.** The first addendum's version was right and
incompletely applied. Checking a rights claim against a primary source means
checking it against the source that _makes the claim you are answering_ — not
against a different primary source that answers an easier one.
