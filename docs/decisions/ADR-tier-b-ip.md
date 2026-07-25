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

| Instrument                                                                               | Rights holder / developer                                                                                                                                     | Reproduction status                                                                                                                                                                                                                                                                                                                                   | Permission route                                                                                                                                      | Recommendation                                                                                                                                                                   | Source   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **PRISM III / PRISM IV** (Pediatric Risk of Mortality)                                   | Murray M. Pollack et al.; algorithms copyrighted and possibly patented by Children's Research Institute / Children's National Medical Center (Washington, DC) | Algorithm/coefficients described as available _without charge for research uses_ (incl. independent verification); **non-research / commercial uses may require compensation/licensing**. It is largely formula/threshold-based, but the rights holder makes an explicit copyright + patent claim, so it does not sit cleanly in the IP-clean bucket. | Contact Children's National Medical Center / Children's Research Institute technology-transfer for non-research use terms                             | **NEEDS-LEGAL-REVIEW** (formula-shaped but explicit copyright/patent claim; a free public clinical calculator is arguably a non-research use)                                    | [1][2]   |
| **COMFORT-B** (behavioral sedation scale)                                                | © B. Ambuel, K. Hamlett, C. Marx (COMFORT scale lineage)                                                                                                      | Copyrighted; source documents carry an explicit "do not reproduce without permission" notice                                                                                                                                                                                                                                                          | Contact the copyright holders for reproduction permission (scale is distributed through institutional/comfort-assessment channels)                    | **BUILD-BLOCKED** (needs permission)                                                                                                                                             | [3][4]   |
| **CAPD** (Cornell Assessment of Pediatric Delirium)                                      | Chani Traube & Gabrielle Silver; Copyright © 2012 Cornell University (distributed via CIBS Center / Vanderbilt University Medical Center)                     | Copyrighted by Cornell University; reproduction of the tool requires permission from the rights holder. (Individual open-access _articles about_ CAPD may be CC BY, but that does not license the instrument itself.)                                                                                                                                 | Contact Cornell University (tech transfer) and/or the CIBS Center distributor                                                                         | **BUILD-BLOCKED** (needs permission)                                                                                                                                             | [5][6]   |
| **WAT-1** (Withdrawal Assessment Tool-1)                                                 | © 2007 Linda S. Franck & Martha A.Q. Curley; released under **Creative Commons Attribution-NoDerivatives (CC BY-ND 2.0)**                                     | Free to reproduce/use for research or clinical practice **with attribution and the embedded copyright unaltered**; may be placed on hospital forms/EHRs. **No commercial use / monetization without written permission; no derivatives / no alteration.** An interactive calculator may count as a derivative and needs confirming.                   | Terms on Franck/Curley permission page (UCSF Family Nursing / marthaaqcurley.com); written permission for anything beyond verbatim non-commercial use | **NEEDS-LEGAL-REVIEW** (closest to buildable: CC BY-ND permits attributed reproduction, but no-derivatives + non-commercial clauses vs. an interactive web tool must be cleared) | [7][8]   |
| **SOS-PD** (Sophia Observation withdrawal Symptoms – Pediatric Delirium)                 | © E. Ista, M. van Dijk, M. de Hoog — Erasmus MC-Sophia Children's Hospital, Rotterdam                                                                         | Copyrighted; reproduction not permitted without permission (distributed via comfortassessment.nl)                                                                                                                                                                                                                                                     | Contact Erasmus MC (w.ista@erasmusmc.nl per the developer's distribution site)                                                                        | **BUILD-BLOCKED** (needs permission)                                                                                                                                             | [9][10]  |
| **Braden QD** (pediatric pressure-injury risk)                                           | Copyright © 2018 Martha A.Q. Curley, All Rights Reserved (Curley, Hasbani, Quigley et al., J Pediatr 2018;192:189-95)                                         | Free to reproduce/use **without modification** for research or clinical practice, incl. hospital forms and EHR systems, **provided the citation + copyright footer are kept and not altered**. No explicit non-commercial clause found, but "without modification" vs. an interactive scoring UI needs confirming.                                    | Terms on marthaaqcurley.com Braden QD page; contact Curley for anything beyond verbatim unaltered reproduction                                        | **NEEDS-LEGAL-REVIEW** (leaning buildable: generous clinical-use permission, but no-modification vs. interactive tool must be cleared)                                           | [11]     |
| **FLACC** (Face, Legs, Activity, Cry, Consolability)                                     | © 2002 The Regents of the University of Michigan (Merkel, Voepel-Lewis, Shayevitz, Malviya, 1997)                                                             | Copyrighted; **a license is required** (separate academic/research-use and academic-publishing licenses) and copyright notice must be reproduced. Not free to reproduce without a license.                                                                                                                                                            | University of Michigan Office of Technology Transfer (Innovation Partnerships) — FLACC / rFLACC license                                               | **BUILD-BLOCKED** (needs license)                                                                                                                                                | [12][13] |
| **PEWS — Bedside PEWS** (Parshuram/Duncan, SickKids)                                     | Christopher Parshuram et al., The Hospital for Sick Children (SickKids), Toronto                                                                              | **Commercialized and proprietary**: BedsidePEWS™ is trademarked, holds FDA 510(k) clearance, and was commercialized via SickKids Industry Partnerships (MaRS Innovation / Bedside Clinical Systems). Licensed technology, not free.                                                                                                                   | SickKids Industry Partnerships & Commercialization (ipc.sickkids.ca)                                                                                  | **BUILD-BLOCKED** (needs license; trademarked/commercial)                                                                                                                        | [14][15] |
| **PEWS — other variants** (Brighton/Monaghan; Tibballs; Haines; modified local variants) | Various (e.g., Monaghan 2005, Brighton/Royal Alexandra Children's Hospital); copyright typically held by the journal publisher of each source table           | Mixed / unverified. These are largely vital-sign threshold tables (more formula-like), but the **specific published table wording and layout are usually under the journal publisher's copyright**. No blanket free-use license confirmed for any named variant.                                                                                      | Per variant: check the source publication's copyright / request permission from the journal publisher                                                 | **NEEDS-LEGAL-REVIEW** per named variant `[NEEDS SOURCE]` for each — do not reproduce a specific published table without checking that publication                               | [16][17] |

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
7. **PRISM III / PRISM IV** — obtain a written statement from Children's National
   Medical Center on whether a free public clinical calculator is a permitted
   (research-equivalent) use or a licensable non-research use; resolve the
   patent question.
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
