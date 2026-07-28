import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// Root config: covers packages/*. apps/web has its own flat config
// (Next-specific plugins) — ignored here to avoid double-linting.
export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/dist/**",
      "apps/web/**",
      // Agent worktrees are full copies of the repo. Without this, `pnpm lint`
      // lints the project two or three times over and reports errors against
      // paths that are not the working tree — including rules from whichever
      // plugin version that copy happens to have. CI never saw it (a fresh
      // checkout has no worktrees), so it failed only locally, which is the
      // worst place for it: the noise trains you to stop reading lint output.
      "**/.claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // Crown-jewel guard: the scoring engine must stay DOM/browser-free so the
    // same package runs unchanged in React Native (PRD §12, ADR-0002). The
    // tsconfig lib/types settings enforce this at compile time; this is the
    // lint-time backstop. Test files exercise Node/vitest globals, so exempt.
    files: ["packages/scoring-engine/src/**/*.ts"],
    ignores: ["packages/scoring-engine/src/**/*.test.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "scoring-engine must stay DOM-free (PRD §12)." },
        { name: "document", message: "scoring-engine must stay DOM-free (PRD §12)." },
        { name: "navigator", message: "scoring-engine must stay DOM-free (PRD §12)." },
        { name: "localStorage", message: "scoring-engine must stay DOM-free (PRD §12)." },
        { name: "fetch", message: "scoring-engine must stay dependency-free (PRD §6.3)." },
      ],
    },
  },
  prettier,
);
