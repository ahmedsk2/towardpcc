<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 13, 15). Load only the slice a phase needs. -->

## 13. Phased delivery plan (each phase = plan → build → review → verify, per §15)

- **P0 — Foundation.** Repo, monorepo tooling, CI skeleton, Docker stack, Next.js app boots, design tokens stubbed, `.env.example`, ADR-0001 (stack). _Accept:_ fresh clone → `pnpm i && docker compose up` → running app; CI green.
- **P1 — Design system & shell.** §5 process executed (mood-reference review via browser, design plan, self-critique), tokens/typography/components in `packages/ui`, header/footer/404/500, motion guidelines. _Accept:_ design plan ADR written; shell screenshots reviewed against the brief at 5 viewports; axe-clean.
- **P2 — Scoring engine + first 8 calculators.** Engine architecture, versioning, test harness; 8 Tier-A scores end-to-end with the full detail UX (§6.4). _Accept:_ 100% engine coverage; every expected value cites its published source; validation-pending badge and client-side privacy line render; offline compute works.
- **P3 — Full Tier-A catalog + index + PWA.** Remaining Tier-A scores, index with search/filter/favorites, Serwist offline, install flows. _Accept:_ ~20 calculators live; airplane-mode e2e passes; Lighthouse budgets met on calculator pages.
- **P4 — Home & the signature hero.** R3F hero with poster fallback and reduced-motion path, bento pillars, trust strip, roadmap. _Accept:_ budgets in §5.4/§10 met on mid-tier hardware; hero degrades gracefully; the page is memorable — critique it honestly in-browser before calling it done.
- **P5 — Pillar pages + forms + admin.** /knowledge (with real PedsCC Library facts + screenshots), /data, /services, /about, /contact; Submission pipeline; admin with 2FA, inboxes, calculator meta/validator management, audit log; email notifications. _Accept:_ every form → inbox → status change → email, e2e-tested; authz verified server-side; rate limits demonstrably work.
- **P6 — Legal & trust pages.** §8 pages written, privacy notes placed everywhere §8.4 requires, retention job scheduled, `TODO:counsel-review` markers in place. _Accept:_ compliance wording matches §8.3 exactly in spirit; nothing overclaims.
- **P7 — Hardening & audits.** Full `security-pan-check:security-audit` → remediate criticals/highs → `prod-ready:audit --ci` green → `code-cleanup` pass → `sec-report` archived. _Accept:_ both audit gates pass; scorecard committed to `docs/`.
- **P8 — Launch readiness.** Runbooks written and restore rehearsed, staging deploy on `[HOSTING_TARGET]`, monitoring live, redirects for the sibling domains documented, final founder review checklist (validator names still pending is expected and fine). _Accept:_ staging is production-identical; go-live is a runbook step, not an adventure.

---

## 15. Phase ⇄ skill mapping (the mandate, applied)

| Phase                  | Invoke                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kickoff                | `using-superpowers` → `superpowers:writing-plans` on this document → `taskmanager:init` + `taskmanager:plan` (this file is the PRD) → store locked decisions (§1) as taskmanager memories                    |
| P1 design              | `frontend-design` + `taste-skill:*` / `ui-ux-pro-max:design-system`; `Claude_Browser` for §5.1 mood review and every self-critique screenshot; `dataviz` when admin stats appear                             |
| All build slices       | `subagent-driven-development` + `test-driven-development`; `feature-dev:code-architect` before each new module; `using-git-worktrees` for risky/parallel slices                                              |
| Research moments       | `taskmanager:research` / `deep-research` (e.g., Tier-B instrument IP status §6.4; PDPL wording sanity for §8; hosting-region verification §11)                                                               |
| Every slice completion | `requesting-code-review` → `receiving-code-review` → `verification-before-completion` → `run`/`verify` in-browser → `finishing-a-development-branch`                                                         |
| Security cadence       | `sec-threatmodel` after P1; targeted `security-review` on auth/forms/admin during P5; full `security-pan-check:security-audit` + `sec-report` in P7; `sec-ai` if any AI-assisted feature touches the product |
| Quality cadence        | `code-cleanup` dimensions before each release; `simplify` on churned code; `prod-ready:audit` at P7/P8 (`fix` for safe remediations)                                                                         |
| Ops                    | `update-config` for hooks/permissions early; `schedule`/`loop` for the retention purge job and recurring audits; runbooks in `operations:runbook` style                                                      |
