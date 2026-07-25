# TowardPCC

The digital home of pediatric critical care — free clinical calculators,
knowledge and data systems for PICU teams, and research support for
investigators. Built from Saudi Arabia for the world. https://towardpcc.com

## Monorepo layout

- `apps/web` — Next.js site, API, and admin
- `packages/scoring-engine` — pure-TypeScript clinical scoring engine (zero runtime deps)
- `packages/ui` — design tokens and UI primitives
- `packages/config` — shared strict tsconfig base (lint/format config live at the repo root)

## Prerequisites

- Node 24+ with pnpm 10 — `corepack enable` is the standard path. If it fails
  (Windows shells without admin rights hit an EPERM writing shims), use
  `npm install -g pnpm@10.34.5` instead; the `packageManager` field still
  pins the exact version either way.
- Docker Desktop (for the local infra stack)

## Getting started

```bash
corepack enable        # or: npm install -g pnpm@10.34.5 (see Prerequisites)
pnpm install
cp .env.example .env   # then fill in secrets — see the comments in the file
docker compose up -d   # postgres, umami, mailpit, minio, web
pnpm dev               # Next.js dev server on http://localhost:3000
```

## Scripts (root)

- `pnpm dev` — run the web app in dev mode
- `pnpm build` — build all packages and the app
- `pnpm test` — run all unit tests
- `pnpm typecheck` — `tsc --noEmit` across the workspace
- `pnpm lint` — ESLint across the workspace

## Documentation

- `docs/decisions/` — architecture decision records
- `docs/runbooks/` — operational runbooks (deploy, incident, backup-restore)
- `SECURITY.md` — security policy and responsible disclosure
- `PRIVACY-ENGINEERING.md` — privacy-by-design commitments
