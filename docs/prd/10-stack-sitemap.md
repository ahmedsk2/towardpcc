<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 3, 4). Load only the slice a phase needs. -->

## 3. Technology stack (decided — with rationale)

**Full TypeScript / Node stack.** PHP/Laravel was considered and rejected: the existing PedsCC Library is a Node codebase, your installed cleanup/testing toolchain is TypeScript-oriented (tsc, knip, madge, jscpd; the Pest/Laravel plugin is inventoried as N/A), the future mobile app will be React Native sharing TypeScript packages, and the animated/3D frontend is strongest in the React ecosystem. One language across web, API, scoring engine, and future mobile is the smallest total system.

| Layer                                  | Choice                                                         | Notes                                                                                                        |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Framework                              | **Next.js 15+ (App Router, React Server Components)**          | SSG/ISR for content pages, server actions/route handlers for forms                                           |
| Language                               | **TypeScript, `strict: true`**                                 | No `any` in committed code (the `weak-type-eliminator` agent enforces this)                                  |
| Styling                                | **Tailwind CSS v4** + design tokens (§5)                       | shadcn/ui primitives allowed as accessible base, **heavily restyled** — nothing may look like default shadcn |
| Motion                                 | **Motion (Framer Motion)**                                     | Orchestrated, restrained; all animation behind `prefers-reduced-motion` guards                               |
| 3D                                     | **React Three Fiber + drei**                                   | Hero only; lazy-loaded; static poster fallback (§5.4)                                                        |
| Forms/validation                       | **react-hook-form + Zod**                                      | Zod schemas shared client/server — single source of truth                                                    |
| Database                               | **PostgreSQL 16 + Prisma**                                     | Runs in Docker for dev; migrations checked in                                                                |
| Auth                                   | **Auth.js** — admin accounts only in v1                        | Credentials + mandatory TOTP 2FA for admin; **no public registration in v1**                                 |
| Email                                  | Nodemailer over SMTP behind a small `Mailer` interface         | Provider-agnostic (regional constraints); dev uses Mailpit in Docker                                         |
| Storage                                | S3-compatible client behind a `Storage` interface              | MinIO in dev; KSA-region object storage in prod; v1 barely needs it, but the interface exists                |
| Analytics                              | **Self-hosted Umami** (Docker)                                 | Cookie-less, no consent banner needed for it, EU/PDPL-friendly by design                                     |
| Anti-spam                              | Honeypot field + minimum-time trap + per-IP rate limiting      | No third-party CAPTCHA in v1 (offer Cloudflare Turnstile as a documented, off-by-default option)             |
| API                                    | REST under `/api/v1/*` with a generated **OpenAPI 3.1** spec   | The exact contract the future mobile app consumes                                                            |
| PWA                                    | **Serwist** service worker                                     | Calculators fully offline-capable and installable (§6.5)                                                     |
| Testing                                | **Vitest** (unit) · **Playwright** (e2e + axe a11y)            | Scoring engine coverage rules in §6.3 are absolute                                                           |
| Tooling                                | pnpm workspaces, ESLint, Prettier, Husky + lint-staged         | Conventional Commits                                                                                         |
| CI                                     | GitHub Actions                                                 | typecheck → lint → unit → build → e2e → axe; `prod-ready:audit --ci` as the release gate                     |
| Runtime                                | Docker + docker-compose (web, postgres, umami, mailpit, minio) | Deploys to any KSA-region VM/container host; no vendor lock-in                                               |
| **Repository layout (pnpm monorepo):** |

```
towardpcc/
├── apps/
│   └── web/                    # Next.js app (site + API + admin)
├── packages/
│   ├── scoring-engine/         # THE crown jewel: pure TS, zero runtime deps.
│   │                           # Score definitions, compute functions, interpretation
│   │                           # bands, reference metadata, versioning. Consumed by
│   │                           # web today; by mobile and the registry later.
│   ├── ui/                     # Design system: tokens, primitives, composed components
│   └── config/                 # Shared tsconfig / eslint / prettier
├── docs/
│   ├── decisions/              # ADRs (one per significant choice)
│   ├── runbooks/               # Deploy, backup/restore, incident (via operations:runbook style)
│   └── ideas/                  # Product one-pagers
├── docker-compose.yml
├── .env.example                # Every env var, documented, no real values
└── SECURITY.md · PRIVACY-ENGINEERING.md · CONTRIBUTING.md
```

---

## 4. Information architecture (v1 sitemap)

```
/                     Home (the statement piece — §5, §6.1)
/calculators          Calculator index: search, category filter, favorites (local-only)
/calculators/[slug]   Calculator detail (§6.4)
/knowledge            PedsCC Library product page + pilot request form
/data                 Registry & dashboards vision page + privacy commitments + interest form
/services             Free research aid / biostatistics / AI research guidance + request form
/about                Mission, vision, story, roadmap (honest), team (only real people, or omit)
/contact              Contact form + [CONTACT_EMAIL]
/legal/privacy        Privacy Policy
/legal/terms          Terms of Use
/legal/data-protection  Data Protection & Security page (§8.2 — a first-class trust page, linked in footer AND from /data)
/legal/disclaimer     Medical Disclaimer (also summarized on every calculator)
/admin/*              Admin app (auth + 2FA): services queue, pilot/interest/contact inboxes,
                      calculator content & version management, audit log
404 / 500             Designed, on-brand, helpful
```

Global elements: header (logo, four pillars, About, Contact), footer (pillars, legal, "Servers located in Saudi Arabia" trust line, contact, © [ORG_LEGAL_NAME]). No social links unless real accounts exist.
---
