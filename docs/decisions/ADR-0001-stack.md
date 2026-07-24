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

Resolved at P0 execution (2026-07-24): Next.js 16.2.11, React 19.2.8,
Tailwind 4.3.3, TypeScript 5.9.3 (unified at ^5 — Next's typecheck
integration rejects the TS 7 Go-native compiler), ESLint 9 (^10 is
incompatible with eslint-plugin-react via eslint-config-next), pnpm 10.34.5
pinned via corepack `packageManager`.

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
