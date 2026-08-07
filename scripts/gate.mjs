/* global process, console */
/**
 * The pre-PR gate, with one narrow fast path.
 *
 * Runs the CI `quality` job verbatim and in order — typecheck, lint,
 * format:check, test, build, web bundle budget — because `pnpm test` does not
 * typecheck and running "the part that looks relevant" is exactly how a type
 * error reached `main` on 2026-08-01.
 *
 * THE FAST PATH, and why it is safe.
 *
 * CI already path-filters: its `changes` job skips e2e, container and
 * lighthouse for a documentation-only pull request. This script was the only
 * thing still running a full Next build to check a markdown diff — four
 * markdown-only pull requests between 2026-08-04 and 2026-08-07 each paid for
 * one.
 *
 * So when EVERY changed path is markdown, only `format:check` runs. That was
 * verified on 2026-08-07 rather than assumed:
 *
 *   - No test reads a markdown file at runtime. Every `docs/` reference inside
 *     a test is a comment recording provenance; the tests that do read from
 *     disk (border-usage, countup-scope, privacy-invariant) scan .ts/.tsx.
 *   - ESLint has no markdown coverage in this repo.
 *   - Typecheck, build and the bundle budget cannot observe a markdown change.
 *
 * `format:check` is therefore the only step capable of failing on such a diff.
 * Re-check that claim rather than trusting this comment if you widen the
 * pattern — the whole point of the gate is that it does not take shortcuts on
 * faith.
 *
 * FAILING SAFE IS THE POINT. Any doubt about what changed runs the full gate:
 * no `origin/main`, a git error, an empty file list, or `--full` on the command
 * line. A gate that guesses wrong in the permissive direction is worse than no
 * fast path at all.
 */

import { execFileSync, spawnSync } from "node:child_process";

const FULL = [
  ["pnpm", ["typecheck"]],
  ["pnpm", ["lint"]],
  ["pnpm", ["format:check"]],
  ["pnpm", ["test"]],
  ["pnpm", ["build"]],
  ["pnpm", ["--filter", "@towardpcc/web", "budget:check"]],
];

const MARKDOWN_ONLY = [["pnpm", ["format:check"]]];

const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * Everything this branch would put in a pull request: committed changes since
 * the merge-base, plus anything uncommitted, plus untracked files.
 *
 * Untracked files matter — a brand-new `.ts` file is invisible to `git diff`
 * and would otherwise let the fast path skip a build that genuinely needed to
 * run. This returns null on ANY uncertainty, and null means the full gate.
 */
function changedPaths() {
  try {
    const base = git(["merge-base", "origin/main", "HEAD"]).trim();
    if (!base) return null;
    const tracked = git(["diff", "--name-only", base]);
    const untracked = git(["ls-files", "--others", "--exclude-standard"]);
    const files = `${tracked}\n${untracked}`
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    // An empty list means either nothing changed or the comparison did not
    // measure what we think it did. Both are reasons to run everything.
    return files.length ? files : null;
  } catch {
    return null;
  }
}

function run(steps, label) {
  console.error(`\n[gate] ${label}\n`);
  for (const [cmd, args] of steps) {
    console.error(`[gate] → ${cmd} ${args.join(" ")}`);
    const res = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    if (res.status !== 0) {
      console.error(`\n[gate] FAILED at: ${cmd} ${args.join(" ")}`);
      process.exit(res.status ?? 1);
    }
  }
  console.error(`\n[gate] PASSED — ${label}`);
}

const forceFull = process.argv.includes("--full");
/**
 * `--explain` prints the decision and exits without running anything.
 *
 * It exists so the fast path can be tested rather than trusted: this project's
 * standing rule is to make a guard fail on purpose before believing it, and
 * without this the only way to check the routing was to sit through a full
 * build. It is also the honest answer to "what will the gate actually do here?"
 */
const explain = process.argv.includes("--explain");
const files = forceFull ? null : changedPaths();
const isMarkdown = (f) => f.toLowerCase().endsWith(".md");

if (explain) {
  const route =
    files && files.every(isMarkdown)
      ? "markdown-only fast path (format:check only)"
      : `FULL gate (${forceFull ? "--full requested" : files ? "non-markdown paths present" : "could not determine what changed — failing safe"})`;
  console.error(`[gate] would run: ${route}`);
  if (files) console.error(files.map((f) => `        ${f}`).join("\n"));
  process.exit(0);
}

if (files && files.every(isMarkdown)) {
  console.error(
    `[gate] ${files.length} changed path(s), all markdown:\n` +
      files.map((f) => `        ${f}`).join("\n") +
      "\n[gate] Skipping typecheck, lint, test, build and budget — none can\n" +
      "[gate] observe a markdown change (see the comment at the top of this\n" +
      "[gate] file for how that was verified). Run `pnpm gate --full` to\n" +
      "[gate] override.",
  );
  run(MARKDOWN_ONLY, "markdown-only fast path");
} else {
  const why = forceFull
    ? "--full requested"
    : files
      ? "non-markdown paths in the diff"
      : "could not determine what changed — failing safe";
  run(FULL, `full gate (${why})`);
}
