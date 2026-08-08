# ADR-admin-auth: admin authentication (P5)

- Status: **accepted** — the /admin auth stack shipped in P5.
- Date: 2026-07-25
- Deciders: founding engineer, against PRD §9 (security baseline: Argon2id,
  mandatory TOTP, lockout, HttpOnly/Secure/SameSite cookies, server-side authz).

## Decisions

**Auth.js v5 (next-auth beta) with a Credentials provider.** Auth.js beta.32
declares `next: ^16.0.0` in its peer deps, so it's compatible with our Next 16
app — the PRD's named choice holds. Credentials is the right provider for an
email + password + TOTP operator login (no OAuth). The `authorize` callback runs
in the Node runtime (the `/api/auth/[...nextauth]` route pins `runtime =
"nodejs"`), so Prisma and the WASM crypto are available.

**Argon2id via `hash-wasm`, not a native module.** Prisma already taught us this
box (Windows-ARM64) has no native Argon2 binary either; `hash-wasm` is a WASM
implementation that runs on the dev box and the Linux prod host alike. OWASP
minimum params: 19 MiB memory, 2 iterations, 1 lane; the encoded PHC hash
carries its own salt.

**TOTP mandatory, via `otpauth`; the shared secret is app-encrypted.** Every
login requires a valid 6-digit TOTP (±1 step for clock skew) OR a single-use
recovery code. The secret is AES-256-GCM encrypted with `TOTP_ENC_KEY` on top of
the database's own at-rest encryption, so a DB read alone never yields a working
factor. Recovery codes are high-entropy, stored only as SHA-256 hashes, matched
in constant time, and consumed on use.

**Single-form two-factor.** Email + password + code are submitted together
rather than in two screens. For a low-frequency, technical operator login this
is simpler and removes a partial-auth intermediate state; the failure message is
deliberately generic (never "wrong password" vs "wrong code" vs "locked").

**Lockout.** 5 failed attempts locks the account for 15 minutes
(`failedLoginCount` / `lockedUntil` on AdminUser), reset on success.

**JWT sessions.** Credentials can't use database sessions in Auth.js, so sessions
are JWTs in an HttpOnly, SameSite=Lax cookie (Secure in prod, set by Auth.js),
8-hour max age. The token carries the user id + role for authz.

**Authz is enforced server-side, twice.** The `(protected)` route-group layout
calls `requireAdmin()`, and — because a Server Action is NOT protected by a
layout — every admin action re-checks `requireAdmin()` itself. The client is
never trusted.

**First operator via a CLI, not a public sign-up.** `packages/db/scripts/
create-admin.mjs` seeds an admin, printing the TOTP provisioning URI and the
one-time recovery codes once. A UI enrolment/user-management flow is a later
enhancement; v1 needs one or two operators.

## Consequences

- No native auth binaries — consistent with the Prisma driver-adapter decision.
- The `/admin` CSP is the strict nonce tier (ADR-security-headers); verified the
  admin pages hydrate under it.
- Follow-ups: admin user-management + TOTP enrolment UI; a shared rate-limit
  store if the app ever runs more than one replica (the login lockout is in the
  DB and is already shared-safe; the public-form limiter is in-memory).

## Addendum, 2026-08-08 — every authentication outcome is audited

Both halves of the login path now write to `AuditLog`. Successes record the
second factor used and the remaining recovery-code count; rejections record a
reason (`credentials`, `locked`, `totp-replay`, `concurrent`) under the action
`admin.login.failed`.

**The failure write is unconditional, and that is the design rather than an
implementation detail.** The generic failure message above is only half of the
enumeration defence — the other half is that a wrong address and a wrong password
must cost the same, which is why `authorize()` runs Argon2id against a dummy hash
when no user matches. Auditing only the attempts that hit a real account would
have added one INSERT to exactly one of those paths and handed the oracle back.
`AuditLog.actorId` was therefore made nullable first
(`20260808120000_audit_nullable_actor`) so the row can be written either way; a
null actor means "no such account", and a database CHECK constraint keeps that
the only situation in which null is legal.

The attempted address is recorded as a salted HMAC, never in plaintext — it is
attacker-controlled personal data landing in an append-only table that the
scheduled purge skips.

**JWT sessions are unchanged, and an adapter was tried and rejected.** Adding a
`Session` model shaped for `@auth/prisma-adapter` would not have made sessions
revocable: the adapter is not a dependency, it resolves `prisma.user` where this
schema has `AdminUser`, and Auth.js does not support database sessions on the
Credentials provider — which is what the JWT decision above already says. The
table would have stayed permanently empty.

## Addendum, 2026-08-08 — the JWT is now allow-listed, so a session can be revoked

The "JWT sessions" decision above stands, with one addition: the token is no
longer sufficient on its own.

`authorize()` mints a 256-bit random id, writes an `AdminSession` row holding
only `sha256(id)`, and returns the id in the user object. The `jwt` callback —
which runs on every `auth()` read, not only at sign-in — looks that row up and
returns `null` when it is missing or past `expiresAt`. Sign-out deletes the row.
Revoking a session is therefore deleting a row, effective on that session's next
request.

**This closes both halves of SPC-TM-002, and the second half is the less obvious
one.** `@auth/core` re-signs the token with a fresh expiry on every session read,
so a stateless JWT renews indefinitely for whoever holds the cookie; the 8-hour
`maxAge` above never actually bit. `AdminSession.expiresAt` is written once at
sign-in and nothing rewrites it, so the absolute limit is now real.

**Why not the adapter, again, in one line:** it cannot work here, for the three
reasons stated above — this is a hand-rolled allow-list precisely because the
supported path does not exist for Credentials.

**Verified against the installed packages rather than the documentation.**
`next-auth/lib/index.js` builds a Request to the session action and calls `Auth()`
with the same callbacks, so the check really does run per request.
`@auth/core/lib/actions/session.js` guards its response with
`if (token !== null)` and, in the `else` branch, calls `sessionStore.clean()` —
so a refused token also has its cookie cleared.

**Consequences.** One indexed lookup is added to every admin request; nothing
public pays it, because `auth()` is reached only from `requireAdmin()` and the
login page and `proxy.ts` never calls it. Tokens issued before this shipped carry
no session id and are refused, so operators sign in once more after the deploy —
accepting them would have left every pre-existing cookie permanently
unrevocable. Revocation is operable from
`packages/db/scripts/revoke-admin-sessions.mjs`, and rotating `AUTH_SECRET`
remains the blunt instrument for signing everyone out at once.
