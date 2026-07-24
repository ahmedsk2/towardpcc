# Contributing

Solo-founder project for now; these conventions keep the history reviewable
and the door open.

- **Commits:** Conventional Commits, enforced by commitlint. One reviewable
  slice per branch (from P1 onward).
- **Definition of done:** tests green · review received and addressed ·
  verified live in the browser with evidence · a11y/perf budgets respected ·
  docs updated · branch finished cleanly.
- **TDD is mandatory** for the scoring engine (100% line + branch coverage,
  worked-example tests citing their published source) and the default
  everywhere else.
- **Formula changes** to any score: code + tests + version bump + changelog
  only — never through the admin CMS.
- **ADRs** in `docs/decisions/` for every significant choice.
- **Never fabricate** content, data, names, logos, or claims. Placeholders
  are explicitly marked and tracked in `LAUNCH-BLOCKERS.md`.
