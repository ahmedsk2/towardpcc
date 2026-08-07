# Batching work and scoping the gate — design

**Status:** approved 2026-08-07
**Goal:** cut the ceremony paid per change without weakening the rigour that
exists because a wrong number here reaches a bedside.

## The problem, measured

Seven pull requests landed between 2026-08-04 and 2026-08-07. **Four were
markdown-only**, together +249/−50 lines. Each of those four paid the full
ritual: a local `pnpm gate` including a complete Next build, a CI round trip, a
merge, a hand-triggered deploy, and a verification pass.

Three separate observations, all measured rather than assumed:

- **CI is already smarter than the local gate.** The `changes` job path-filters,
  so PR #44 skipped `e2e`, `container` and `lighthouse` automatically. The local
  gate has no such awareness and runs a full build for a markdown-only diff.
- **The gate ran eight times in one session, and three of those runs failed on
  things the pre-commit hook auto-fixes** — an unused `eslint-disable` directive
  and prettier on two markdown files. Each failure cost a full build to
  discover a formatting nit.
- **The open-work sweep was paid for twice.** A 112-item inventory, then a delta
  hours later that re-derived much of the same ground.

## Decisions

### 1. Batch by risk class

A change gets its own branch, its own full gate and its own pull request when it
can alter **a number a clinician reads, a claim the site makes, or how
production is built and served.** Everything else batches into one pull request
per session.

**Solo:**

- `packages/scoring-engine/**`
- `apps/web/components/calculator/**` and `apps/web/app/calculators/**`
- anything touching a privacy invariant — the URL/fragment handling, the
  sessionStorage allow-list, the `/api/v1` surface
- `apps/web/content/site.ts` where a public claim changes
- `apps/web/proxy.ts`, `apps/web/Dockerfile`, `.github/workflows/**`,
  `packages/db/prisma/schema.prisma`
- `scripts/check-*.mjs` — these assert production against published claims

**Batchable, one PR per session:** markdown anywhere (docs, research notes,
`LAUNCH-BLOCKERS.md`, the `CLAUDE.md` files) and comment-only edits.

The split is deliberately narrow. Applied to 2026-08-04..07 it would have turned
four documentation pull requests into one, while leaving the clinical-correction
and privacy pull requests exactly as they were — which is where reviewability
earns its cost.

### 2. A markdown-only fast path in `pnpm gate`

`pnpm gate` compares the working tree against the merge-base with `origin/main`.
If **every** changed path is markdown it runs `format:check` alone and prints
which steps it skipped and why. Any non-markdown path anywhere in the diff runs
the full gate, so a mixed batch is never scoped down.

**This is safe, and it was verified rather than assumed on 2026-08-07.** No test
in the repository reads a markdown file at runtime: every `docs/` reference
inside a test is a comment recording provenance, and the tests that do read from
disk (`border-usage`, `countup-scope`, `privacy-invariant`) scan `.ts`/`.tsx`
source. ESLint has no markdown coverage. Typecheck, build and the bundle budget
cannot observe a markdown change. `format:check` is therefore the only step
capable of failing on such a diff.

Two guards, because the gate exists to stop exactly this class of shortcut:

- `pnpm gate --full` always runs everything.
- **If the git comparison fails, errors, or returns no files, run the FULL
  gate.** Never fast-path on uncertainty.

The verification above is recorded in the script itself, so the next reader can
re-check it instead of trusting it.

### 3. Deploy once at end of session, with one carve-out

Merges accumulate; one deploy at the end, then one container-tag check against
`origin/main`.

**Carve-out:** a merge that closes something _actively wrong in production_ —
a live incorrect clinical number, a false public claim, or a privacy leak —
deploys immediately. On 2026-08-05 the fragment fix sat green and unmerged while
production leaked and `/trust` told visitors something untrue; end-of-session
batching would have lengthened that window rather than shortened it.

### 4. Fixers before the gate

Run `lint --fix` and `format` — or simply commit, letting husky's `lint-staged`
do it — **before** `pnpm gate`. Three of eight gate runs in one session died on
auto-fixable nits. The gate still runs in full afterwards, so this trades
nothing.

### 5. One open-work sweep per session

Run the sweep once at session start, write it to a file, and amend that file as
items close. Do not re-run a fresh sweep later to answer questions already
answered.

### 6. Background the deploy poll

Trigger the deploy, carry on working, and verify the container tag at the end
rather than blocking on an SSH polling loop.

## What changes

| Where                             | Change                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| `CLAUDE.md` — Conventions         | "One slice per branch" gains the risk-class split and the fixers-first rule |
| `CLAUDE.md` — gate section        | Documents the fast path, its proof, and both guards                         |
| `CLAUDE.md` — Production          | Tag check becomes end-of-session; names the immediate-deploy carve-out      |
| `scripts/` or root `package.json` | The gate gains diff detection, `--full`, and the fail-safe fallback         |
| `LAUNCH-BLOCKERS.md`              | Push-to-deploy diagnosis becomes a scheduled item, not another dated note   |

## Non-goals

- Changing what CI runs. CI's path filtering already works; this aligns the
  local gate with it, nothing more.
- Weakening any gate step for code. The full gate is unchanged whenever a
  non-markdown file is touched.
- Skipping e2e for UI work. Running it locally caught six `composition.spec.ts`
  failures on 2026-08-05 before CI ever saw them, which is exactly the round
  trip worth paying for.

## Risks

- **The fast path is the shortcut the gate was written to prevent.** Mitigated
  by the fail-safe fallback, the `--full` escape hatch, and by scoping it to a
  file type proven incapable of affecting any other step.
- **Batched pull requests are harder to revert selectively.** Accepted, and
  bounded: only markdown and comments batch, so a revert never unpicks a
  behavioural change.
- **End-of-session deploys leave production behind `main` for longer.** This is
  what the carve-out exists to bound, and the tag check still runs before the
  session closes.
