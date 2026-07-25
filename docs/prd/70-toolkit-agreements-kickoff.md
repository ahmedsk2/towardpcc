<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 14, 16, 17). Load only the slice a phase needs. -->

## 14. Installed toolkit (inventory — know what's on hand)

Plugins/skills available in this workspace: **superpowers** (using-superpowers, brainstorming, writing-plans, executing-plans, subagent-driven-development, dispatching-parallel-agents, test-driven-development, systematic-debugging, requesting/receiving-code-review, verification-before-completion, finishing-a-development-branch, using-git-worktrees, writing-skills) · **anthropic-skills** (idea-refine, skill-creator, consolidate-memory, docx/pptx/xlsx/pdf, schedule, setup-cowork) · **taskmanager** (init, plan, run, show, update, research, memory, export; SQLite/FTS5) · **security-pan-check** (security-audit, sec-code/api/web/ai/database/container/iac/mobile/supplychain/threatmodel/report + scanner agents) · **prod-ready** (audit, scorecard, fix, and 20 category deep-dives) · **code-cleanup** (cleanup-code + 11 dimension agents incl. dead-code-hunter, weak-type-eliminator, async-pattern-fixer, slop-remover) · **feature-dev** (feature-dev; code-architect/explorer/reviewer agents) · **frontend/design** (frontend-design, taste-skill:_, ui-ux-pro-max:_, dataviz, artifact-design) · **built-ins** (deep-research, code-review, simplify, security-review, verify, run, claude-api, claude-automation-recommender, loop, schedule, update-config) · **agents** (general-purpose, Explore, Plan, code-simplifier, claude-code-guide, taskmanager, plus the scanner/review agents above) · **MCP** (Claude_Browser — connected; claude-in-chrome — deferred; visualize; ccd_session*; mcp-registry; scheduled-tasks; SaaS connectors present but unauthenticated — **do not OAuth any without asking**). Skills scoped to the NeuroSim ICU simulator repo (session-start, domain-grounding, clinical-validator, etc.) do **not** apply here. The `test-specialist` (Pest/Laravel) plugin is N/A to this Node stack.

## 16. Working agreements

1. **Never fabricate** content, data, names, logos, or claims (§2.1). Placeholders are explicitly marked and listed in a `LAUNCH-BLOCKERS.md`.
2. **Ask before:** creating accounts on external services, authenticating any MCP connector, spending money, deploying to the public internet, deleting data, or deviating from a locked decision in §1.
3. Formula changes to any score go through code + tests + version bump only — never through the admin CMS.
4. Conventional Commits; one reviewable slice per branch; ADR for every significant decision; keep `.env.example`, runbooks, and README current as you go.
5. Definition of done for any slice: tests green, review received and addressed, verified live in the browser with evidence, a11y/perf budgets respected, docs updated, branch finished cleanly.
6. When this document and reality conflict (e.g., a PedsCC Library feature I described doesn't exist), reality wins — flag it, propose the fix, update the doc.

## 17. Kickoff — your first actions, in order

1. Invoke `using-superpowers`; read this entire document; list any ambiguities or missing variables in one batch of questions.
2. Run the Kickoff row of §15 (plan → taskmanager breakdown → memories).
3. Present the P0–P8 task tree for approval.
4. On approval, execute P0 — and from that moment, every phase ends with evidence, not assertions.
   Build something a PICU clinician anywhere in the world would trust at first sight and still respect after a year of daily use. That is the bar.
