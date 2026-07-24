# TowardPCC P0 — Foundation Implementation Plan

> **STATUS: EXECUTED 2026-07-24 — all 11 tasks complete.** Deviations are
> recorded in commit bodies, LAUNCH-BLOCKERS.md, and the amended notes below.
> Post-execution multi-lens review findings were fixed in the follow-up
> commit; the unchecked boxes remaining below are inside authored file
> content, not steps.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the TowardPCC pnpm monorepo so that a fresh clone gives `pnpm i && docker compose up` → a running Next.js app, with CI (typecheck → lint → unit → build), the Docker infra stack defined, design tokens stubbed, `.env.example` documented, and ADR-0001 recorded.

**Architecture:** pnpm workspace monorepo per the master PRD §3: `apps/web` (Next.js 15+ App Router, TS strict, Tailwind v4), `packages/scoring-engine` (pure TS, zero runtime deps, Vitest with 100% coverage gate), `packages/ui` (token stubs), `packages/config` (shared tsconfig). Docker compose defines postgres 16 (two DBs: app + umami), Umami, Mailpit, MinIO, and the web container (multi-stage, non-root, HEALTHCHECK).

**Tech Stack:** Node 24, pnpm 10 (via corepack), TypeScript strict, Next.js 15+ (App Router, standalone output), Tailwind CSS v4 (CSS-first `@theme`), Vitest + coverage-v8, ESLint flat config + typescript-eslint + eslint-config-next, Prettier, Husky + lint-staged + commitlint (Conventional Commits), gitleaks in CI, GitHub Actions.

**Environment notes (verified 2026-07-24; amended post-execution):** Node v24.15.0 and git 2.54 present. pnpm NOT installed → as executed: `corepack use pnpm@latest-10` pinned 10.34.5 into `packageManager`, but `corepack enable` failed (EPERM, non-admin Windows shell), so the binary was installed via `npm i -g pnpm@10.34.5` — documented in README. Docker NOT installed → compose files authored; live verification tracked in LAUNCH-BLOCKERS.md. Task 8's per-app `apps/web/.dockerignore` was intentionally not created: the build context is the repo root, so only the root `.dockerignore` is ever consulted — a per-app copy would be dead configuration.

**Execution conventions:** All commands run from repo root `C:\Users\ahmed\Documents\TowardPCC` unless stated. Shell is PowerShell-compatible unless a step says Bash. P0 bootstraps directly on `main` (there is nothing to branch from yet); branch-per-slice discipline starts at P1. Every commit is a Conventional Commit. Where a step installs `@latest`, the executor records the resolved version in the commit body; the lockfile is the pin.

---

### Task 1: Git repository + base hygiene files

**Files:**

- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.nvmrc`
- Create: `README.md`

- [x] **Step 1: Initialize the repository on `main`**

Run:

```bash
git init -b main
```

Expected: `Initialized empty Git repository in C:/Users/ahmed/Documents/TowardPCC/.git/`

- [x] **Step 2: Write `.gitignore`**

```gitignore
# dependencies
node_modules/
.pnpm-store/

# builds
.next/
out/
dist/
coverage/
*.tsbuildinfo

# env — only .env.example is committed
.env
.env.*
!.env.example

# tooling
.turbo/
.vercel/
*.log
.DS_Store
Thumbs.db

# test artifacts
playwright-report/
test-results/
```

- [x] **Step 3: Write `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

- [x] **Step 4: Write `.nvmrc`**

```
24
```

- [x] **Step 5: Write `README.md`**

````markdown
# TowardPCC

The digital home of pediatric critical care — free clinical calculators,
knowledge and data systems for PICU teams, and research support for
investigators. Built from Saudi Arabia for the world. https://towardpcc.com

## Monorepo layout

- `apps/web` — Next.js site, API, and admin
- `packages/scoring-engine` — pure-TypeScript clinical scoring engine (zero runtime deps)
- `packages/ui` — design tokens and UI primitives
- `packages/config` — shared tsconfig/lint/format config

## Prerequisites

- Node 24+ (`corepack enable` to get pnpm)
- Docker Desktop (for the local infra stack)

## Getting started

```bash
corepack enable
pnpm install
docker compose up -d   # postgres, umami, mailpit, minio, web
pnpm dev               # Next.js dev server on http://localhost:3000
```
````

## Scripts (root)

- `pnpm dev` — run the web app in dev mode
- `pnpm build` — build all packages and the app
- `pnpm test` — run all unit tests
- `pnpm typecheck` — `tsc --noEmit` across the workspace
- `pnpm lint` — ESLint across the workspace

## Documentation

- `docs/decisions/` — architecture decision records
- `docs/runbooks/` — operational runbooks
- `SECURITY.md` — security policy and responsible disclosure
- `PRIVACY-ENGINEERING.md` — privacy-by-design commitments

````

- [x] **Step 6: Commit**

```bash
git add .gitignore .editorconfig .nvmrc README.md docs/
git commit -m "chore: initialize repository with base hygiene files and P0 plan"
````

---

### Task 2: pnpm workspace root

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`

- [x] **Step 1: Enable corepack and pin pnpm**

Run:

```bash
corepack enable
```

Then create a minimal `package.json` and pin pnpm into it:

```bash
pnpm init
corepack use pnpm@latest-10
```

Expected: `package.json` gains a `"packageManager": "pnpm@10.x.y+sha512..."` field; `pnpm --version` prints that version.

- [x] **Step 2: Replace `package.json` with the workspace root manifest**

Keep the exact `packageManager` value corepack wrote; everything else becomes:

```json
{
  "name": "towardpcc",
  "private": true,
  "version": "0.0.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "pnpm --filter @towardpcc/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

- [x] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [x] **Step 4: Write `.npmrc`**

```ini
engine-strict=true
save-exact=false
```

- [x] **Step 5: Verify pnpm resolves the workspace**

Run: `pnpm install`
Expected: completes without error, creates `pnpm-lock.yaml` (empty-ish is fine — no deps yet).

- [x] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml .npmrc pnpm-lock.yaml
git commit -m "chore: scaffold pnpm workspace root"
```

---

### Task 3: `packages/config` — shared TypeScript base

**Files:**

- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.base.json`

- [x] **Step 1: Write `packages/config/package.json`**

```json
{
  "name": "@towardpcc/config",
  "version": "0.0.0",
  "private": true,
  "files": ["tsconfig.base.json"]
}
```

- [x] **Step 2: Write `packages/config/tsconfig.base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  }
}
```

- [x] **Step 3: Commit**

```bash
git add packages/config
git commit -m "chore(config): add shared strict tsconfig base"
```

---

### Task 4: `packages/scoring-engine` skeleton with test harness

The engine architecture is designed in P2. P0 proves the package boundary, the
strict compiler, the Vitest harness, and the 100% coverage gate with the
smallest honest module: an engine version constant and an (empty) score
registry.

**Files:**

- Create: `packages/scoring-engine/package.json`
- Create: `packages/scoring-engine/tsconfig.json`
- Create: `packages/scoring-engine/vitest.config.ts`
- Create: `packages/scoring-engine/src/index.ts`
- Test: `packages/scoring-engine/src/index.test.ts`

- [x] **Step 1: Write `packages/scoring-engine/package.json`**

```json
{
  "name": "@towardpcc/scoring-engine",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

(Consumed as TypeScript source inside the monorepo; a compile-to-dist step is
added only when the mobile app needs it — YAGNI. `build` runs the typecheck so
`pnpm -r build` still gates this package. Zero `dependencies` — enforced by
review and, from P2, by CI.)

- [x] **Step 2: Install dev dependencies**

Run:

```bash
pnpm --filter @towardpcc/scoring-engine add -D typescript vitest @vitest/coverage-v8
```

Expected: resolves current stable versions; lockfile updated.

- [x] **Step 3: Write `packages/scoring-engine/tsconfig.json`**

```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": []
  },
  "include": ["src"]
}
```

(No `dom` in `lib` and no ambient types: the engine must stay free of
browser/DOM APIs per PRD §12 — the compiler now enforces it.)

- [x] **Step 4: Write `packages/scoring-engine/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
```

- [x] **Step 5: Write the failing test `packages/scoring-engine/src/index.test.ts`**

```typescript
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, listScores } from "./index";

describe("scoring-engine skeleton", () => {
  it("exposes a semver engine version", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("starts with an empty score registry", () => {
    expect(listScores()).toEqual([]);
  });
});
```

- [x] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter @towardpcc/scoring-engine test`
Expected: FAIL — `Cannot find module './index'` (or missing exports).

- [x] **Step 7: Write minimal implementation `packages/scoring-engine/src/index.ts`**

```typescript
/**
 * TowardPCC scoring engine — pure TypeScript, zero runtime dependencies,
 * no DOM/browser APIs (enforced by tsconfig `lib`/`types`).
 * Score definitions, compute functions, and interpretation bands land in P2.
 */

export const ENGINE_VERSION = "0.1.0";

export interface ScoreSummary {
  id: string;
  slug: string;
  name: string;
  version: string;
}

const registry: ScoreSummary[] = [];

export function listScores(): readonly ScoreSummary[] {
  return registry;
}
```

- [x] **Step 8: Run tests to verify they pass with 100% coverage**

Run: `pnpm --filter @towardpcc/scoring-engine test`
Expected: PASS, coverage table shows 100% lines/branches/functions/statements, exit 0.

- [x] **Step 9: Typecheck**

Run: `pnpm --filter @towardpcc/scoring-engine typecheck`
Expected: exit 0, no output.

- [x] **Step 10: Commit**

```bash
git add packages/scoring-engine pnpm-lock.yaml
git commit -m "feat(scoring-engine): package skeleton with vitest harness and 100% coverage gate"
```

---

### Task 5: `packages/ui` — design token stubs

Real token values are decided in P1 through the design process (PRD §5). P0
creates the token _architecture_ so `apps/web` wires against stable names.
Stub values are neutral and clearly marked for P1 replacement.

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/tokens.css`
- Create: `packages/ui/src/index.ts`

- [x] **Step 1: Write `packages/ui/package.json`**

```json
{
  "name": "@towardpcc/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit",
    "lint": "eslint src"
  }
}
```

- [x] **Step 2: Install dev dependency**

Run:

```bash
pnpm --filter @towardpcc/ui add -D typescript
```

- [x] **Step 3: Write `packages/ui/tsconfig.json`**

```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve"
  },
  "include": ["src"]
}
```

- [x] **Step 4: Write `packages/ui/src/tokens.css`**

```css
/*
 * TowardPCC design tokens — P0 STUB.
 * Names are the contract; values are finalized in P1 via the §5 design
 * process (mood review → design plan → self-critique). Do not ship P1
 * without replacing the placeholder values below.
 */
:root {
  /* Surfaces — "midnight-petrol" dark hero band into "porcelain" light content */
  --color-surface-hero: #12242b; /* P1: refine midnight-petrol */
  --color-surface-page: #f7f7f5; /* P1: refine porcelain */
  --color-surface-raised: #ffffff;

  /* Ink */
  --color-ink-strong: #16262c;
  --color-ink-body: #33444b;
  --color-ink-muted: #5c6e75;
  --color-ink-on-dark: #eef4f5;

  /* Accents — one primary, one used sparingly */
  --color-accent-teal: #1fa8a0; /* P1: refine monitor-teal */
  --color-accent-coral: #f06455; /* P1: refine pulse-coral; alerts + single primary CTA only */

  /* Type roles — families finalized in P1 after license verification */
  --font-display: system-ui, sans-serif; /* P1: characterful grotesk, self-hosted */
  --font-body: system-ui, sans-serif; /* P1: quiet legible body face */
  --font-numeric: ui-monospace, monospace; /* P1: mono with tabular-nums for all scores/results */

  /* Spacing / radius / motion scaffolding */
  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1.25rem;
  --motion-duration-fast: 150ms;
  --motion-duration-slow: 400ms;
  --motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```

- [x] **Step 5: Write `packages/ui/src/index.ts`**

```typescript
/**
 * TowardPCC design system. Components land in P1; P0 exports token names so
 * consumers reference tokens through one typed surface from day one.
 */
export const tokens = {
  surfaceHero: "var(--color-surface-hero)",
  surfacePage: "var(--color-surface-page)",
  surfaceRaised: "var(--color-surface-raised)",
  inkStrong: "var(--color-ink-strong)",
  inkBody: "var(--color-ink-body)",
  inkMuted: "var(--color-ink-muted)",
  inkOnDark: "var(--color-ink-on-dark)",
  accentTeal: "var(--color-accent-teal)",
  accentCoral: "var(--color-accent-coral)",
} as const;

export type TokenName = keyof typeof tokens;
```

- [x] **Step 6: Typecheck**

Run: `pnpm --filter @towardpcc/ui typecheck`
Expected: exit 0.

- [x] **Step 7: Commit**

```bash
git add packages/ui pnpm-lock.yaml
git commit -m "feat(ui): design token architecture with P0 stub values"
```

---

### Task 6: `apps/web` — Next.js app boots

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/api/v1/health/route.ts`

- [x] **Step 1: Write `apps/web/package.json` (deps installed next step)**

```json
{
  "name": "@towardpcc/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "echo \"no unit tests yet (P2)\" && exit 0"
  }
}
```

- [x] **Step 2: Install dependencies**

Run:

```bash
pnpm --filter @towardpcc/web add next@latest react@latest react-dom@latest
pnpm --filter @towardpcc/web add @towardpcc/ui@workspace:* @towardpcc/scoring-engine@workspace:*
pnpm --filter @towardpcc/web add -D typescript @types/react @types/react-dom @types/node tailwindcss @tailwindcss/postcss postcss
```

Expected: Next.js ≥15 resolved (record actual in commit body); workspace links created.

- [x] **Step 3: Write `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@towardpcc/ui", "@towardpcc/scoring-engine"],
};

export default nextConfig;
```

- [x] **Step 4: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true,
    "incremental": true,
    "verbatimModuleSyntax": false,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

(`verbatimModuleSyntax` off here: Next's generated files don't conform; the
strict flags that matter — `strict`, `noUncheckedIndexedAccess` — inherit.)

- [x] **Step 5: Write `apps/web/postcss.config.mjs`**

```javascript
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

- [x] **Step 6: Write `apps/web/app/globals.css`**

```css
@import "tailwindcss";
@import "@towardpcc/ui/tokens.css";

@theme inline {
  --color-surface-hero: var(--color-surface-hero);
  --color-surface-page: var(--color-surface-page);
  --color-surface-raised: var(--color-surface-raised);
  --color-ink-strong: var(--color-ink-strong);
  --color-ink-body: var(--color-ink-body);
  --color-ink-muted: var(--color-ink-muted);
  --color-ink-on-dark: var(--color-ink-on-dark);
  --color-accent-teal: var(--color-accent-teal);
  --color-accent-coral: var(--color-accent-coral);
  --font-display: var(--font-display);
  --font-body: var(--font-body);
  --font-numeric: var(--font-numeric);
}

body {
  background: var(--color-surface-page);
  color: var(--color-ink-body);
  font-family: var(--font-body);
}
```

(If the executor finds the current Tailwind v4 release rejects the
self-referential `@theme inline` mapping, fall back to defining the Tailwind
theme names directly from the token values in `tokens.css` — the token file
stays the single source of truth either way.)

- [x] **Step 7: Write `apps/web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TowardPCC — the digital home of pediatric critical care",
    template: "%s · TowardPCC",
  },
  description:
    "Free clinical calculators, knowledge and data systems, and research support for the pediatric critical care community. Built from Saudi Arabia for the world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [x] **Step 8: Write `apps/web/app/page.tsx`**

Honest pre-launch placeholder — no fake claims, replaced in P4:

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold text-ink-strong">TowardPCC</h1>
      <p className="text-lg">
        The digital home of pediatric critical care — free clinical calculators, knowledge and data
        systems for PICU teams, and research support for investigators. Built from Saudi Arabia for
        the world.
      </p>
      <p className="text-ink-muted">In development. Launching soon.</p>
    </main>
  );
}
```

- [x] **Step 9: Write `apps/web/app/api/v1/health/route.ts`**

```typescript
import { ENGINE_VERSION } from "@towardpcc/scoring-engine";

export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    status: "ok",
    service: "towardpcc-web",
    engine: ENGINE_VERSION,
  });
}
```

(Also proves the workspace package boundary compiles into the app.)

- [x] **Step 10: Verify the app boots**

Run: `pnpm --filter @towardpcc/web dev` in the background; then request `http://localhost:3000/` and `http://localhost:3000/api/v1/health`.
Expected: page renders the headline; health returns `{"status":"ok","service":"towardpcc-web","engine":"0.1.0"}`. Stop the dev server.

- [x] **Step 11: Verify production build**

Run: `pnpm --filter @towardpcc/web build`
Expected: build succeeds; `.next/standalone` produced; typecheck clean.

- [x] **Step 12: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): Next.js app boots with token-wired Tailwind v4 and /api/v1/health"
```

---

### Task 7: Lint, format, and commit hygiene

**Files:**

- Create: `eslint.config.mjs`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `commitlint.config.mjs`
- Create: `.husky/pre-commit`
- Create: `.husky/commit-msg`
- Modify: `package.json` (root — add devDeps via install, `lint-staged` block, `prepare` script)

- [x] **Step 1: Install root dev dependencies**

Run:

```bash
pnpm add -w -D eslint @eslint/js typescript-eslint eslint-config-next eslint-config-prettier prettier husky lint-staged @commitlint/cli @commitlint/config-conventional
```

- [x] **Step 2: Write `eslint.config.mjs`**

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["**/.next/**", "**/node_modules/**", "**/coverage/**", "**/dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  prettier,
);
```

(`no-explicit-any: "error"` is the PRD's "no `any` in committed code" gate.
Next-specific rules: the executor wires `eslint-config-next` into
`apps/web`'s lint per the flat-config pattern the installed Next version
documents — verify against the resolved version rather than assuming.)

- [x] **Step 3: Write `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [x] **Step 4: Write `.prettierignore`**

```
node_modules
.next
coverage
dist
pnpm-lock.yaml
```

- [x] **Step 5: Write `commitlint.config.mjs`**

```javascript
export default { extends: ["@commitlint/config-conventional"] };
```

- [x] **Step 6: Initialize husky and write hooks**

Run:

```bash
pnpm exec husky init
```

Replace `.husky/pre-commit` with:

```sh
pnpm exec lint-staged
```

Create `.husky/commit-msg` with:

```sh
pnpm exec commitlint --edit "$1"
```

- [x] **Step 7: Add `lint-staged` block and `prepare` script to root `package.json`**

```json
{
  "scripts": { "prepare": "husky" },
  "lint-staged": {
    "*.{ts,tsx,mjs,js}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md,yaml,yml}": ["prettier --write"]
  }
}
```

(Merge into the existing file — keep all Task 2 scripts.)

- [x] **Step 8: Verify the gates work**

Run: `pnpm lint` → expected exit 0 across all packages.
Run: `pnpm format:check` → fix any drift with `pnpm format`.
Make a deliberately bad commit message to confirm commitlint rejects it:
`git commit --allow-empty -m "bad message"` → expected: commit-msg hook fails.

- [x] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: eslint flat config, prettier, husky, lint-staged, commitlint"
```

---

### Task 8: Docker stack + `.env.example`

**Files:**

- Create: `apps/web/Dockerfile`
- Create: `apps/web/.dockerignore`
- Create: `docker-compose.yml`
- Create: `docker/postgres-init/01-create-databases.sh`
- Create: `.env.example`

- [x] **Step 1: Write `apps/web/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/scoring-engine/package.json packages/scoring-engine/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @towardpcc/web build

FROM node:24-alpine AS runner
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
CMD ["node", "apps/web/server.js"]
```

(Base image is pinned by digest during P7 hardening; version tag pin now.
`apps/web/public/` is added to the runner stage once P1 creates it.)

- [x] **Step 2: Write `apps/web/.dockerignore`**

```
node_modules
.next
.git
coverage
*.md
.env*
```

Note: build context is the repo root (see compose), so also create an
identical root `.dockerignore`.

- [x] **Step 3: Write `docker/postgres-init/01-create-databases.sh`**

```bash
#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" <<SQL
  CREATE USER umami WITH PASSWORD '${UMAMI_DB_PASSWORD}';
  CREATE DATABASE umami OWNER umami;
SQL
```

- [x] **Step 4: Write `docker-compose.yml`**

```yaml
name: towardpcc

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      UMAMI_DB_PASSWORD: ${UMAMI_DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres-init:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    environment:
      DATABASE_URL: postgresql://umami:${UMAMI_DB_PASSWORD}@postgres:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: ${UMAMI_APP_SECRET}
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"
      - "8025:8025"

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  pgdata:
  miniodata:
```

(`:latest` tags on dev-only services are replaced with pinned versions at the
executor's discretion once Docker is available to test pulls; the prod compose
file in P8 pins everything by digest.)

- [x] **Step 5: Write `.env.example`**

```ini
# ── TowardPCC environment ──────────────────────────────────────────────
# Copy to .env and fill in. Never commit .env. Every variable used anywhere
# in the stack is documented here; keep this file current (working agreement).

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# PostgreSQL (main app database; dev runs in Docker)
POSTGRES_USER=towardpcc
POSTGRES_PASSWORD=change-me-dev-only
POSTGRES_DB=towardpcc
DATABASE_URL=postgresql://towardpcc:change-me-dev-only@localhost:5432/towardpcc

# Umami analytics (self-hosted, cookie-less)
UMAMI_DB_PASSWORD=change-me-dev-only
# Generate with: openssl rand -hex 32
UMAMI_APP_SECRET=

# SMTP (dev: Mailpit in Docker — UI at http://localhost:8025)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=no-reply@towardpcc.com

# S3-compatible storage (dev: MinIO — console at http://localhost:9001)
MINIO_ROOT_USER=towardpcc
MINIO_ROOT_PASSWORD=change-me-dev-only
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=towardpcc-dev
S3_ACCESS_KEY=towardpcc
S3_SECRET_KEY=change-me-dev-only
```

- [x] **Step 6: Validate compose syntax (Docker permitting)**

If Docker is installed: run `docker compose --env-file .env.example config` → expected: rendered config, exit 0.
If Docker is NOT installed: record in `LAUNCH-BLOCKERS.md` (Task 10) that the stack is unverified; validation happens the moment Docker Desktop lands.

- [x] **Step 7: Commit**

```bash
git add apps/web/Dockerfile apps/web/.dockerignore .dockerignore docker-compose.yml docker/ .env.example
git commit -m "chore: docker stack (web, postgres, umami, mailpit, minio) and documented .env.example"
```

---

### Task 9: CI skeleton (GitHub Actions)

**Files:**

- Create: `.github/workflows/ci.yml`

- [x] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

(e2e, axe, and Lighthouse jobs are added in P3/P4 when there is something to
test; `prod-ready:audit --ci` becomes the release gate in P7. Action versions
are current majors as of authoring — the executor bumps if setup-node/pnpm
majors have moved. Runs on GitHub once a remote exists — pending the founder's
answer on repo hosting.)

- [x] **Step 2: Commit**

```bash
git add .github
git commit -m "ci: typecheck, lint, unit, build, and gitleaks on push/PR"
```

---

### Task 10: Governance docs + ADR-0001

**Files:**

- Create: `docs/decisions/ADR-0001-stack.md`
- Create: `SECURITY.md`
- Create: `PRIVACY-ENGINEERING.md`
- Create: `CONTRIBUTING.md`
- Create: `LAUNCH-BLOCKERS.md`
- Create: `docs/runbooks/.gitkeep`, `docs/ideas/.gitkeep`

- [x] **Step 1: Write `docs/decisions/ADR-0001-stack.md`**

```markdown
# ADR-0001: Full TypeScript/Node stack on Next.js

- Status: accepted
- Date: 2026-07-24
- Deciders: founder (via master build PRD), founding engineer

## Context

TowardPCC needs a public site, client-side clinical calculators, form
pipelines with an admin, a future mobile app, and a future PICU registry.
The sibling PedsCC Library product is already a Node codebase. PHP/Laravel
was considered.

## Decision

One TypeScript system: Next.js 15+ (App Router/RSC) on Node, pnpm monorepo
with a pure-TS `scoring-engine` package, PostgreSQL 16 + Prisma, Auth.js
(admin-only in v1), Tailwind v4 + Motion + React Three Fiber, self-hosted
Umami, Docker deployment to a KSA-region host.

## Rationale

- The scoring engine must run identically in the browser (client-side
  privacy guarantee), on the server, and later in React Native — one
  language makes that a package import, not a port.
- PedsCC Library is Node; one runtime across products.
- The installed tooling/testing/cleanup toolchain is TypeScript-oriented.
- The animated/3D frontend requirement (R3F) is strongest in React.

## Consequences

- Single-language hiring/maintenance surface; shared Zod schemas
  client/server; OpenAPI-typed client reusable by mobile.
- We forgo Laravel's batteries (admin scaffolding, queues) and build minimal
  equivalents (Auth.js + TOTP, simple DB-backed queues) — acceptable at v1
  scope.
- Engine package must stay DOM-free (tsconfig-enforced) to keep the mobile
  path cheap.
```

- [x] **Step 2: Write `SECURITY.md`**

```markdown
# Security Policy

TowardPCC treats security as a launch requirement, not a feature. The
platform is healthcare-adjacent: it hosts clinical calculators (all
computation client-side; no inputs transmitted) and collects minimal
contact/request data through forms.

## Reporting a vulnerability

Email **[CONTACT_EMAIL] <!-- TODO:variable -->** with details and
reproduction steps. We aim to acknowledge within 72 hours. Please do not
open public issues for security reports and allow reasonable time for a fix
before disclosure.

## Scope

towardpcc.com and this repository. The separate PedsCC Library codebase has
its own process.

## Practices (v1 baseline)

Strict CSP and security headers · server-side Zod validation on every input
· Prisma parameterization only · CSRF protection and rate limiting on all
mutations · Argon2id password hashing, mandatory TOTP for admin · audit
logging of admin actions · dependency audit + gitleaks in CI · encrypted
backups with a tested restore runbook.
```

- [x] **Step 3: Write `PRIVACY-ENGINEERING.md`**

```markdown
# Privacy Engineering

Rules of construction for every feature in this repo (from PRD §8):

1. **Data minimization.** Collect only what a feature needs; prefer not
   collecting at all.
2. **Calculators are client-side.** Score computation happens entirely in
   the browser from `@towardpcc/scoring-engine`. Inputs are never
   transmitted or stored; analytics may record page views only, never input
   values. Shareable state lives in the URL fragment (`#…`), never the query
   string, so it does not reach server logs.
3. **No third-party trackers, fonts, or embeds that phone home.** Fonts are
   self-hosted. Analytics is self-hosted, cookie-less Umami.
4. **Residency.** Production servers are located in Saudi Arabia (Gulf
   region); the site states this where relevant. PDPL-aligned practices; no
   compliance-certification overclaims anywhere, ever.
5. **Notices at the point of entry.** Every form states what is collected,
   why, and where it is stored; every calculator carries the client-side
   line; /legal/data-protection is the canonical trust page.
6. **Retention.** Contact/interest submissions 24 months, audit logs 12
   months — enforced by a scheduled purge job (P6), documented per table in
   ADR-data-model.
7. **Secrets** live in env/secret stores only; `.env.example` documents
   names, never values; gitleaks guards the history.
```

- [x] **Step 4: Write `CONTRIBUTING.md`**

```markdown
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
```

- [x] **Step 5: Write `LAUNCH-BLOCKERS.md`**

```markdown
# Launch Blockers

Running list of everything that must be resolved before public launch.
Working agreement §16.1: every placeholder on the site is marked in code
AND listed here.

## Variables pending from founder

- [ ] `[CONTACT_EMAIL]` — public contact address (SECURITY.md, /contact, legal pages)
- [ ] `[ADMIN_EMAIL]` — form notification recipient (P5)
- [ ] `[HOSTING_TARGET]` — KSA-region host; verify region before DNS (P8)
- [ ] `[ORG_LEGAL_NAME]` — footer/terms; "TowardPCC" placeholder marked `TODO:legal`

## Environment

- [ ] Docker Desktop not installed on the dev machine — compose stack authored
      but unverified; verify `docker compose up` the moment it lands (P0 gap)
- [ ] GitHub remote not yet created — CI workflow committed but never run

## Content / legal

- [ ] Legal pages need counsel review (`TODO:counsel-review` markers, P6)
- [ ] Calculator validator slots empty by design — badge shows
      "Independent clinical validation: pending" until real names provided
- [ ] Tier-B instruments blocked on per-instrument IP checks (P3+)
```

- [x] **Step 6: Create empty runbook/ideas dirs**

Create `docs/runbooks/.gitkeep` and `docs/ideas/.gitkeep` (empty files).

- [x] **Step 7: Commit**

```bash
git add docs SECURITY.md PRIVACY-ENGINEERING.md CONTRIBUTING.md LAUNCH-BLOCKERS.md
git commit -m "docs: ADR-0001 stack decision, security policy, privacy engineering, contributing, launch blockers"
```

---

### Task 11: P0 acceptance verification

- [x] **Step 1: Clean-workspace verification**

Run, in order, each expected to exit 0:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- [x] **Step 2: Boot verification with evidence**

Start `pnpm dev`, load `http://localhost:3000/` in the connected browser,
screenshot it, hit `/api/v1/health`, confirm the JSON. Stop the server.

- [x] **Step 3: Compose verification (conditional)**

If Docker present: `docker compose --env-file .env.example config` exits 0,
then `docker compose up -d --build` and `wget -qO- localhost:3000/api/v1/health`.
If absent: confirm the LAUNCH-BLOCKERS.md entry exists; done.

- [x] **Step 4: Fresh-clone simulation**

```bash
git clone . ../towardpcc-clone-test
cd ../towardpcc-clone-test && corepack enable && pnpm install && pnpm build
```

Expected: green from a pristine checkout. Delete `../towardpcc-clone-test` after.

- [x] **Step 5: Close the slice**

Invoke `superpowers:requesting-code-review` on the P0 diff, address findings,
then `superpowers:verification-before-completion`, then report P0 complete
with evidence (command outputs + screenshot).

```

---

## Self-review (per writing-plans skill)

- **Spec coverage (PRD §13 P0):** repo ✓ (T1) · monorepo tooling ✓ (T2/T3/T7) · CI skeleton ✓ (T9) · Docker stack ✓ (T8) · Next.js boots ✓ (T6) · design tokens stubbed ✓ (T5) · `.env.example` ✓ (T8) · ADR-0001 ✓ (T10) · acceptance ✓ (T11). Scoring-engine skeleton (T4) is pulled forward from P2 only as harness proof — architecture still lands in P2.
- **Placeholder scan:** the only TODO markers are the PRD-mandated variable placeholders (`[CONTACT_EMAIL]` etc.), which are tracked in LAUNCH-BLOCKERS.md by design, and two explicitly version-dependent points (Tailwind `@theme inline` fallback, Next flat-config wiring) where the plan instructs verification against resolved versions instead of guessing.
- **Type consistency:** `ENGINE_VERSION`/`listScores` names match between T4 test/impl and T6 health route; token names match between `tokens.css`, `index.ts`, and `globals.css`.
```
