import { createHash, randomBytes } from "node:crypto";

/**
 * The pure half of the admin session allow-list (SPC-TM-002).
 *
 * Split from `session-store.ts` so the rules that decide whether a session is
 * still good can be tested without a database or a `server-only` import. The
 * store holds the Prisma calls; everything here is a function of its arguments.
 */

/** Matches `session.maxAge` in auth.ts. The row is the authority, not the token. */
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/**
 * How stale `lastSeenAt` may get before a request pays for a write.
 *
 * Without it, every admin page view is an UPDATE. A minute is far finer than any
 * human judgement about whether a session is "in use", and it collapses a burst
 * of page loads into a single write.
 */
export const LAST_SEEN_THROTTLE_MS = 60 * 1000;

/**
 * sha256, deliberately.
 *
 * The stored value protects a bearer credential that bypasses both the Argon2id
 * password and mandatory TOTP, so it must not be stored raw — nightly backups
 * and routine operator `psql` access would each hand over live admin sessions.
 * But a slow KDF is the wrong tool: the input is 256 bits of CSPRNG output, so
 * there is no guessable space to make expensive, and Argon2 here would only add
 * cost to every admin request. This is the same reasoning as `hashRecoveryCode`.
 */
export function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

/**
 * 256 bits from the CSPRNG.
 *
 * NOT `cuid()`, which the rest of the schema uses for ids. cuid is designed for
 * collision resistance and sortability, not unpredictability, and this value is
 * a credential — guessing one is a full admin session.
 */
export function mintSessionId(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Exclusive: a session whose expiry is exactly now is already gone.
 *
 * The direction matters more than the boundary. Both callers of this treat
 * "expired" as "refuse", so rounding the wrong way would extend a session past
 * its absolute limit rather than cutting one short.
 */
export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** Companion to the throttle above; keeps the write decision out of the store. */
export function shouldTouch(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() >= LAST_SEEN_THROTTLE_MS;
}
