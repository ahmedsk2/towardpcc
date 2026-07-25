# ADR-security-headers: CSP and security headers (P5)

- Status: **accepted** — the security-header baseline shipping with P5
  (threat-model TM-005: CSP ships WITH forms/admin, not later).
- Date: 2026-07-25
- Deciders: founding engineer, against PRD §9 (security baseline).

## Context

PRD §9 asks for a strict, **nonce-based** Content-Security-Policy graded A by
`sec-web`. That collides with an architecture decision made earlier for the perf
budget (§10): the public pages (home, the 22 calculators, legal, about) are
**statically prerendered (SSG)** and cached. Two facts follow:

1. A per-request nonce cannot be baked into HTML generated at build time.
2. Every static Next App-Router page ships ~17 inline `self.__next_f.push(...)`
   RSC-payload scripts whose contents differ per page and per build, so
   per-response hashing is not maintainable either.

Verified empirically: a strict `script-src 'self' 'nonce-…' 'strict-dynamic'`
policy leaves the prerendered scripts un-nonced, `strict-dynamic` ignores the
`'self'` allowlist, and the page fails to hydrate (`window.__next_f` never
populates) — the site becomes a dead static shell.

## Decision

A **two-tier** policy, by route, in `apps/web/proxy.ts`:

- **Public / static pages** — `script-src 'self' 'unsafe-inline'`. Accepted
  because these pages render **no user-controlled content** (calculators compute
  client-side and echo only their own numbers; everything else is fixed copy),
  so there is no script-injection surface to exploit. All the other directives
  stay strict.
- **`/admin` (built later)** — `script-src 'self' 'nonce-…' 'strict-dynamic'`,
  no `'unsafe-inline'`. The admin is dynamically rendered (behind auth, reading
  the DB) so the nonce injects correctly, and it is the one surface that renders
  submitted content — exactly where strict CSP matters. This tier is wired when
  the admin ships and verified end-to-end then.

Constant across both tiers (verified present on responses):
`default-src 'self'`, `style-src 'self' 'unsafe-inline'` (React sets a few inline
style attributes; style injection is far lower risk than script), `img-src
'self' data:`, `font-src 'self'` (self-hosted, §8.1), `connect-src 'self'`,
`worker-src 'self'` (the Serwist SW), `object-src 'none'`, `base-uri 'none'`,
`form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`.
Dev adds only `'unsafe-eval'` + `ws:` for HMR; production gets neither.

Static headers (`next.config.ts` `headers()`): HSTS
(`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options:
DENY`, a restrictive `Permissions-Policy`, `Cross-Origin-Opener-Policy:
same-origin`.

### The R3F hero needs no CSP carve-out

three.js compiles GLSL on the GPU (not via `eval`), opens no external
connections, and injects no inline scripts, so the hero runs under
`default-src 'self'` with nothing added — the "document the exact carve-outs the
R3F hero needs and no more" requirement resolves to _none_.

## Consequences

- Public pages keep SSG + the perf budget; their CSP is strong on every
  directive except the scoped, injection-free `script-src 'unsafe-inline'`.
- `sec-web`/securityheaders will flag `'unsafe-inline'` on public pages; that is
  the known, bounded trade-off recorded here. The A-grade nonce policy applies
  where content is user-influenced (`/admin`).
- **Follow-up (with the admin build):** implement + verify the `/admin` nonce
  tier; re-run `sec-web` and record the grade. Tracked in LAUNCH-BLOCKERS.
