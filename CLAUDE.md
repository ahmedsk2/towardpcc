# TowardPCC — session guide (keep this file tiny)

Full requirements live in PRD slices: `docs/prd/README.md` has the per-phase
loading map — load ONLY the slice the current phase needs, never the whole PRD.

- Phase status + task tree: `.taskmanager/taskmanager.db` (no sqlite3 CLI on
  this machine — use `node:sqlite`). Locked decisions are taskmanager memories.
- Design authority: `docs/decisions/ADR-design-direction.md` (Pulse Crimson;
  crimson never means error; no blue/teal). Motion: `docs/design/motion.md`.
- Security gates: `docs/security/threat-model.md` (CSP ships with P5;
  zero-network calculator test in P3). Blockers: `LAUNCH-BLOCKERS.md`.
- Environment quirks: Docker absent; corepack enable fails (pnpm via npm -g,
  pinned 10.34.5); TypeScript ^5 and ESLint ^9 pins are deliberate.
- Conventions: Conventional Commits (commitlint enforces lowercase subjects);
  one slice per branch; TDD with cited worked examples for every score;
  filter command output (tail/grep/dot reporters); subagent review verifiers
  run model=sonnet effort=low; agents producing documents write the file
  themselves and return a short summary only.
