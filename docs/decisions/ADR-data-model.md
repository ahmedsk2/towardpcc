# ADR-data-model: TowardPCC persistence model (v1)

- Status: **accepted** — the v1 Prisma model for P5 (pillar forms, admin, audit).
- Date: 2026-07-25
- Deciders: founding engineer, against PRD §7 (data model) and §8 (privacy).
- Scope: what v1 actually persists. The calculators persist **nothing** (client-
  side only, §6.4) — this model exists only for the submission/admin surfaces.

## Principles

1. **Minimize.** Store the least that makes a feature work (§8.1). No analytics
   rows here (Umami is separate, cookie-less). No patient data, ever, in v1.
2. **Structured payloads, typed at the edge.** Free-form form fields live in a
   single JSONB `payload` per `Submission`, validated server-side by a per-type
   Zod schema before it is ever written — so the DB shape stays stable while the
   forms evolve, and nothing unvalidated reaches storage.
3. **Retention is a field-level decision, enforced by a job** (§8.4), not a
   promise. Every table below states its retention; the scheduled purge (P6)
   reads these same periods.
4. **The registry spine is designed now, dormant in v1.** `Organization`/`Unit`
   exist so the future PICU registry is a migration, not a redesign — but no v1
   feature writes to them.

## Tables

### `AdminUser`

Operator accounts for `/admin`. Fields: `id`, `email` (unique, citext),
`passwordHash` (**Argon2id**, §9), `totpSecret` (encrypted at rest; TOTP is
**mandatory**, §9), `totpRecoveryCodes` (hashed, single-use), `role`
(`OWNER|EDITOR`, enum — coarse RBAC for BFLA checks), `failedLoginCount` +
`lockedUntil` (login throttling/lockout), `createdAt`, `lastLoginAt`.
**Retention:** lifetime of the operator relationship; deleted on offboarding
(an audited action). Never auto-purged.

### `Submission`

Everything the public sends us. Fields: `id`, `type`
(`SERVICE|KNOWLEDGE_PILOT|DATA_INTEREST|CONTACT`, enum), `payload` (JSONB,
per-type Zod-validated), `status` (`NEW|TRIAGED|IN_PROGRESS|CLOSED|SPAM`),
`internalNotes` (text, admin-only, never shown to the submitter), `ipHash`
(salted + truncated SHA-256 of the source IP — **for rate-limit forensics
only**, not identity; the salt is a server secret, truncation defeats reversal),
`createdAt`, `updatedAt`, `triagedById` (FK → AdminUser, nullable).
**Retention: 24 months from `createdAt`, then purged** (§8.4). A submitter can
request earlier deletion via `[CONTACT_EMAIL]`.
**Threat-model note (TM):** ~~the submitter is emailed an acknowledgement only
_after_ a human triages (never an auto-reply that confirms the address is
monitored to a spammer)~~ — **struck 2026-08-07: no submitter acknowledgement
exists at all.** ADR-0004 decision 3 removed that path outright, so the only mail
the platform sends is the operator notification. The reasoning is kept because it
still governs any future acknowledgement: an auto-reply confirms to a spammer
that an address is monitored, so if one is ever added it waits for human triage.

Admin rendering of `payload`/`internalNotes` is always output-encoded (no
`dangerouslySetInnerHTML`), and that part is unchanged.

### `CalculatorMeta`

The editable presentation layer over the immutable scoring-engine. Fields:
`id`, `slug` (unique — must match a registered engine score id), `published`
(bool), `displayOverrides` (JSONB — presentation only; never formulas or bands,
which are engine-owned and immutable), `validatorSlots` (JSONB — the two
independent-validator slots, §6.4), `updatedAt`, `updatedById` (FK).
The engine remains the single source of truth for computation; this table only
governs _presentation and publish state_, so a content edit can never change a
clinical result.
**Retention:** lifetime (operational config, not personal data).

### `AuditLog`

Append-only trail of every admin mutation (§9). Fields: `id`, `actorId` (FK →
AdminUser), `action` (e.g. `SUBMISSION_TRIAGED`, `CALCMETA_PUBLISHED`,
`ADMINUSER_DELETED`), `entity` (table + id), `diff` (JSONB — before/after of
changed fields, with any PII fields redacted), `ts`. **Append-only:** no update
or delete path in code; enforced by only ever calling `create`.
**Retention: 12 months from `ts`, then purged** (§8.4).

### `Organization` / `Unit` (dormant)

The registry spine, designed now to avoid a later redesign. `Organization`
(name, country, contact) and `Unit` (FK → Organization, name, picuBeds).
**No v1 feature reads or writes these** — they exist only so the P-future
registry is additive. **Retention:** n/a in v1 (empty).

## Cross-cutting decisions

- **Encryption at rest**: the Postgres data volume is encrypted (§8.1); the
  `totpSecret` is additionally application-encrypted so a DB read alone does not
  yield working second factors.
- **No raw SQL**: Prisma parameterized queries only (§9). The purge job uses
  `deleteMany` with a date predicate, not raw SQL.
- **IP handling**: only the salted+truncated hash is stored, and only on
  `Submission`, only for abuse forensics. Raw IPs are never persisted.
- **Timestamps** are `timestamptz`; retention math is done in UTC.
