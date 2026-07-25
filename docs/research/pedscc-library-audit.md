# PedsCC Library — Feature Audit

Read-only audit to inform the TowardPCC `/knowledge` pillar page. Source repo cloned read-only at `…/scratchpad/pedscc-library` (586 files, JavaScript, not modified). No document content was copied; this describes capabilities only.

Audited: 2026-07-25. Repo self-reports "as of 12 Jul 2026", PR #1 merged.

## What it is

PedsCC Library is a **private, self-hosted, search-first digital library for a single pediatric critical care (PICU) team** — protocols, guidelines, articles, books, and slide decks, served behind invitation-only login with **full-text search inside every document** (per page / per slide, with open-at-page results). Clinicians search and read at the bedside; contributors suggest uploads; a librarian governs the collection (files, tags, archives, supersedes) through a web console. The canonical library stays as plain, canonically-named files on disk with a CSV catalogue — the database indexes the library but never imprisons it ("exit hatch").

## Tech stack

- **Runtime / framework:** Node.js ≥22.13, ESM, **Fastify 5**. Server-rendered HTML enhanced with **htmx** (vendored) — no SPA framework, no client build step. (`package.json`, `src/app/`)
- **Datastore:** **SQLite via `better-sqlite3`**, single portable file, **FTS5** full-text search (two virtual tables: `pages_fts` per page/slide/section, `docs_fts` for metadata). Migrations `001`–`011` in `src/db/migrations/`.
- **Auth:** self-hosted **invitation → password (Node `scrypt`) → TOTP MFA** (RFC 6238; MFA seeds AES-256-GCM-encrypted at rest; single-use hashed backup codes). Opaque **server-side revocable sessions** (idle 12 h / absolute 7 d; sign-out-everywhere; kill-on-deactivate), `HttpOnly`+`SameSite=Lax` cookies, per-account exponential lockout + per-IP limiting. `nodemailer` for email, vendored MIT QR encoder. (Migration `002-auth.sql`, `src/dal/{auth-attempts,sessions,mfa,invitations,credentials}.js`, `src/app/plugins/auth-gate.js`)
- **Ingest worker (cron):** crash-isolated child-process text extraction for PDF/DOCX/PPTX/EPUB/XLSX (`pdfjs-dist`, `mammoth`, `jszip`), chunked **OCR** (`tesseract.js`, vendored eng data), cover/thumbnail rendering (`@napi-rs/canvas`), nightly snapshot + integrity checks + CSV exports + retention. (`src/worker/`, `bin/worker.js`)
- **Migration toolkit:** separate **Python** package (`/toolkit`, `pyproject.toml`) for one-time source-file pre-processing (verify-hash → OCR/linearize/faststart/renditions → build seed DB → upload → re-verify). 69 pytest.
- **Security posture:** strict CSP (`script-src 'self'`, no CDN/remote assets), CSRF, `@fastify/rate-limit`, HSTS in prod, brotli/gzip compression. `pino` logging. Custom range-loading PDF.js viewer runs in an isolated iframe with its own tightened CSP and no scripting library.

## Core features

Each: name — one-line function — **status** (shipped | partial | planned). Status is judged from routes + DAL + migrations + tests + the design doc's "Evidence Wave 1" addendum; the repo reports 295 Node tests + 2 gated passing on a fresh clone.

- **In-document full-text search** — ranked search across every page/slide/section with highlighted snippets and "Open at page 8 / slide 4 / section 2" deep links. **shipped** (core). Real ingest indexed 2,272 docs / 64,388 pages.
- **Forgiving search** — librarian-curated abbreviation/synonym expansion, "did you mean" suggestions, designed zero-result recovery (browse links + ask CTA). **shipped** (`src/dal/synonyms.js`, migration `007`).
- **Browse tree + cover cards** — folder tree (type → topic → docs) with cover thumbnails, client-side faceted filters, single-open "peek", favorites. **shipped** (`views/browse-page.js`, `public/browse.js`).
- **Document reader** — custom range-loading PDF.js viewer (isolated iframe); native video/image; renditions for other MIME types; per-user resume-position, private notes, in-document search, related docs, optional "key facts". **shipped** (`views/doc-page.js`, `public/doc-shell.js`).
- **Contributor upload → inbox → filing** — multi-file upload with **SHA-256 dedup before accept**, allowlist, librarian inbox with live canonical-filename preview; approve (hash tripwire) moves into tree + publishes to search; reject → quarantine with reason. **shipped** (`routes/upload.js`, `routes/admin-inbox.js`).
- **Librarian console** — edit/rename/archive/quarantine/restore/**supersede** (old auto-archives), review-by dashboard, user & role management, tag/synonym vocabulary admin, audit + access log viewer with CSV export, per-document rate limiting. **shipped** (`routes/admin-*.js`).
- **"Our unit's approach" stances** — governed consensus cards (draft → approve/publish → review-by → retire/supersede) pinned atop matching documents and surfaced above search results. **shipped** (migration `009`, `routes/admin-stances.js`, `views/stance-block.js`).
- **Questions → FAQ flywheel** — "ask the librarian" capture on zero-result and `/faq`, admin answer queue with badge, published answers form the public `/faq`, any answer draftable into a stance in one click. **shipped** (migration `008`, `routes/questions.js`, `routes/admin-questions.js`).
- **Shelves / collections** — librarian-curated collections ("new fellow starter pack") + a return-to-work home (search → resume → shelves → new-this-week → favorites). **shipped** (migration `010`, `routes/admin-collections.js`).
- **Insights (the 2-minute test)** — median time-to-answer vs a 120 s evidence budget, click-through rate, top + zero-result queries with one-click add-synonym / draft-stance actions; **in-house telemetry only**. **shipped** (migration `011-search-log.sql`, `routes/admin-insights.js`).
- **Weekly digest email** — per-user opt-in; Monday nightly send of the week's new documents + stances; silent on empty weeks. **shipped** (`digest_opt_in` column, worker nightly).
- **Ask the Library (`/ask`)** — answers **from the corpus only**: quoted, highlighted passages with "Open at page N" citations. An optional citation-locked **AI summary** appears **only when an Anthropic API key is configured** (off by default; always degrades to retrieval on any failure). **partial** — retrieval is shipped; the AI summary is optional and disabled by default (`src/app/lib/ask-llm.js`).
- **PWA-lite** — installable manifest + icons; service worker caches **static assets only, never session content**; offline fallback page. **shipped**.
- **Governance / exit-hatch** — audit_log + access_log, review-by renewal policy, supersession chains, nightly CSV/xlsx export so `library tree + _admin/ exports` is always a complete human-usable snapshot. **shipped** (migration `001`, worker nightly).
- **White-label multi-tenant SaaS** — "your unit's brain, self-hosted", one deployment serving many units. **planned** only — listed as a commercial "bet" in `docs/product-ideas-2026-07.md` §D1; no tenant partitioning exists in the schema or code.

## Data / tenancy model

- **Single-tenant per instance.** One self-hosted deployment = **one PICU team's private library**. There is no tenant column, no cross-unit partitioning; isolation is by _separate instance_, not by multi-tenancy in one app. The `documents` table is a flat corpus for that one unit (`src/db/migrations/001-initial.sql`).
- **Files stay plain files.** Documents live on disk in a 3-level canonical tree (type → topic → document) with `TYPE_Topic_Descriptor_Source_Year(_vN).ext` naming; SQLite indexes them. This is a stated non-negotiable ("the database indexes the library; it must never imprison it").
- **Document shape:** `doc_type` (protocol/policy, guideline, article, book, presentation, other), `status` (intake → active → archived → quarantined), `source`, `year`, `review_by`, `superseded_by`, tags (seeded 69 tags / 11 topics from a vocabulary). Text is stored per unit (`unit_kind` ∈ page/slide/section) for open-at-page search.
- **"Internal (SK) only" filter** = `source = 'SK'` (`src/dal/search.js:67`). "SK" is the unit's own institutional source code (upload form lists example sources "NCS / SK / MISC", `views/inbox-page.js`), distinguishing the **unit's own authored content** from external guidelines/journal articles. It is a source tag, **not** a tenant boundary.
- **Ownership / governance = single-writer.** Contributors _suggest_ (upload to inbox); only librarians _file/publish_. Roles: **viewer / contributor / librarian**, enforced server-side on every route (migration `001`, `plugins/auth-gate.js`). Private notes are per-user. Stances ("our unit's approach") are the unit's own governed consensus. Invitation-only; **no public links possible by design**.
- **Data sovereignty.** Self-hosted, invitation-only, exportable at any time — the "each unit's documents stay their own" posture is achieved by per-unit self-hosting + the exit-hatch export, not by a shared SaaS backend.

## What this means for TowardPCC `/knowledge`

- **Frame it as "software, not content" honestly and literally.** The product _is_ the platform — in-document search, the contributor→librarian governance workflow, "our unit's approach" stances, the self-hosted invitation+MFA auth, and the ingest/export machinery. The clinical documents are each unit's own, owned by them, exportable by them at any moment (plain files + CSV). That maps cleanly to "we pilot the software, not the content."
- **Lead with the genuinely-shipped, differentiated capabilities:** full-text search _inside_ PDFs/slides with open-at-page results; forgiving/curated search; the governed contribute→file workflow; locally-authored "our unit's approach" stances (the real adoption differentiator); data-sovereign, invitation-only, exit-hatch design. All of these are built and tested.
- **State status as "in pilot / built and validated locally", not "in production at hospitals."** The system was run end-to-end on a real ~2,400-file / 10 GB corpus locally, but the production deploy (the "M0 go/no-go" host gate) is blocked on hosting credentials and **not yet live**. Say "piloting," not "deployed."
- **Do not overclaim AI.** The core is _retrieval over the unit's own corpus_. The AI summary is optional, off by default, citation-locked, and always degrades to retrieval. Describe it as "optional, cited, grounded in the unit's own documents" — never as an AI chatbot over medical knowledge.
- **Do not imply multi-tenant SaaS or a public library.** Today each unit = its own self-hosted instance; multi-tenant is an unbuilt future bet, and the design deliberately forbids public links. If the page implies "many units," be explicit that each runs its own private instance.

## Caveats / open questions

- **Not yet in production.** The M0 go/no-go gate (real Infomaniak host + Cloudflare zone verification) is blocked on credentials per `docs/PROJECT-STATUS.md`. Public copy should not claim live hospital deployment.
- **"SK" identity.** `source='SK'` is a specific institutional code. Confirm what SK denotes and whether the public `/knowledge` page should name a specific institution or stay generic.
- **Multi-tenancy is aspirational.** White-label/multi-tenant appears only as a commercial idea (`product-ideas-2026-07.md` §D1); nothing in the schema supports it today.
- **Auth history.** Earlier docs (`PedsCC-Developer-Plan-v1.0.md`) describe Cloudflare Access as the auth; that was **replaced 12 Jul 2026** by self-hosted invitation+password+TOTP. Use the current model when describing auth.
- **Sensitivity.** The real corpus and curation-provenance records contain clinical documents and potential PHI (kept git-ignored, disk-only). This audit describes capabilities; no document content should be lifted verbatim onto a public page.
- **Repo scope.** This is a _separate_ codebase from the TowardPCC scoring-engine repo you are usually in; findings above are about `pedscc-library` only.
