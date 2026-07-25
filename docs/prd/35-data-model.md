<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 7). Load only the slice a phase needs. -->

## 7. Data model (Prisma, v1)

`AdminUser` (email, hash, totpSecret, role) · `Submission` (type: SERVICE|KNOWLEDGE_PILOT|DATA_INTEREST|CONTACT; payload JSONB validated by per-type Zod schema; status; internal notes; timestamps; source IP hash for rate-limit forensics only, salted + truncated) · `CalculatorMeta` (slug ↔ engine id; editable presentation fields; validator slots; publish state) · `AuditLog` (actor, action, entity, diff, ts) · `Organization`/`Unit` (designed now, dormant in v1 — the registry spine). Add `docs/decisions/ADR-data-model.md` explaining each table's retention period (§8.4).
---
