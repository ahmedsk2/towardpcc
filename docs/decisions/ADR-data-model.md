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
(truncated **HMAC-SHA-256** of the source IP under a server-secret key — **for
rate-limit forensics only**, not identity; see "The IP hash, corrected" below,
because this line said something false until 2026-08-09),
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

## The IP hash, corrected — 2026-08-09

The `Submission.ipHash` description above was wrong in two ways, and one of them
was a security claim. Corrected in place rather than quietly reworded, because
anyone who read it may have relied on it.

### It is HMAC, not a salted SHA-256

`apps/web/lib/salted-hash.ts` computes
`createHmac("sha256", siteSalt()).update(value).digest("hex").slice(0, 24)`.

That is **HMAC-SHA-256 truncated to 24 hex characters (96 bits)**, not the
"salted SHA-256" this ADR described. The distinction is not pedantry in the
direction you might expect: HMAC is the **stronger** construction. A literal
salted hash — `sha256(salt + value)` — is vulnerable to length-extension, and
naming it here invited someone to "simplify" the code toward the weaker thing
while believing they were matching the documentation.

### Truncation does NOT defeat reversal — the secret key does

The old text read "the salt is a server secret, truncation defeats reversal".
The second half is false and the first half is doing all the work.

There are about 4.3 billion IPv4 addresses. Anyone holding the key can hash the
entire space and match every digest in the table, in minutes, at any digest
length. Truncating to 96 bits removes nothing from that attack; it only makes
collisions marginally more likely.

**So the confidentiality of this column rests entirely on the key staying
secret.** Nothing else contributes. That is worth stating plainly, because the
old wording offered a second, imaginary line of defence, and a reader who
believed in it might reasonably be more relaxed about key handling than the
design can afford.

### Custody

- **`SUBMISSION_IP_SALT`**, an environment variable. `siteSalt()` requires at
  least 16 characters and **throws in production** if it is missing or shorter —
  it does not fall back. The dev-only literal in that file is unreachable in
  production for that reason.
- Stored in `/home/ubuntu/towardpcc-secrets.env` (mode 600) on the OCI host, and
  seeded into Coolify's environment from there. Retiring that file is an open
  item elsewhere in `LAUNCH-BLOCKERS.md`; it holds this key among others.
- Rotated once already, together with `AUTH_SECRET`.

### It protects more than this ADR knew — three consumers, two value classes

This document described one use. There are three, and only the first is a
submitter IP:

| Site                    | Value hashed            | Purpose                                       |
| ----------------------- | ----------------------- | --------------------------------------------- |
| `lib/submissions.ts:87` | public submitter IP     | rate-limit forensics on `Submission.ipHash`   |
| `auth.ts:237`           | **admin email address** | correlating failed admin logins in `AuditLog` |
| `auth.ts:318`           | admin session client IP | `AdminSession` provenance                     |

So the key protects **email addresses as well as IP addresses**, and an email
address is directly identifying in a way an IP is not. That belongs in any
assessment of what this key's disclosure would cost.

### What rotation costs, which is why it is not on a schedule

Rotating the key does not invalidate anything — it silently makes every existing
digest uncorrelatable with every new one. Rate-limit forensics lose history, and
failed-login correlation in `AuditLog` breaks across the boundary **without any
error being raised**. There is no re-keying path, because the plaintext IPs and
emails were never stored — that is the point of the column.

Rotate on suspected key disclosure. Do not rotate on a calendar, and if you do
rotate, record the date here so a later reader can explain the discontinuity.

### The `--skip-audit` carve-out

`packages/db/scripts/purge-retention.mjs` runs with `--skip-audit` in
production, so the 12-month `AuditLog` purge never executes. That is deliberate
and belongs on the record next to the hash it applies to: `AuditLog` is
append-only and the database **REVOKEs DELETE** on it, so a purge that tried
would fail loudly rather than quietly succeed. The retention promise published
on the site covers submissions, which are purged at 24 months; audit rows are
not submitter data.
