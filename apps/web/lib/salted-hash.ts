import { createHmac } from "node:crypto";

/**
 * Salted, truncated HMAC for values we need to CORRELATE but must never STORE.
 *
 * Two callers want the same property for different data: `lib/submissions.ts`
 * hashes a client IP for abuse forensics, and `auth.ts` hashes the address a
 * failed login was attempted against. In both cases the question is "is this the
 * same one again?", never "who is this?" — so the plaintext has no business
 * being in the database, and a salted digest answers the question without it.
 *
 * The salt is what makes that true. An unsalted sha256 of an email address is
 * reversible in practice: the input space is small enough to enumerate, so the
 * digest IS the address to anyone holding a dump. With a server-side secret
 * mixed in, a dump alone yields nothing.
 *
 * HMAC rather than a plain hash of salt + value, because HMAC is the
 * construction actually designed for keyed digests and is not vulnerable to
 * length extension. `SUBMISSION_IP_SALT` keeps its name for continuity with the
 * variable already deployed in production; rotating it makes previously stored
 * hashes stop correlating with new ones, which is acceptable for both uses and
 * is the reason neither is a durable identifier.
 */

/** Kept at 24 hex chars — 96 bits, matching the ipHash column already deployed. */
const DIGEST_CHARS = 24;

/**
 * Production refuses to start hashing without a real salt, rather than quietly
 * falling back and writing correlatable-by-anyone digests to a real database.
 * Development gets a fixed value so a fresh clone runs with no configuration.
 */
export function siteSalt(): string {
  const s = process.env.SUBMISSION_IP_SALT;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SUBMISSION_IP_SALT must be set (>=16 chars) in production");
  }
  return "dev-only-salt-not-for-production";
}

export function saltedHash(value: string): string {
  return createHmac("sha256", siteSalt()).update(value).digest("hex").slice(0, DIGEST_CHARS);
}
