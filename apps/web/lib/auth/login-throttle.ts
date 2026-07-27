// Relative, not the `@/` alias: this module is unit-tested, and vitest resolves
// only real paths (the alias is a Next build-time concern).
import { createRateLimiter } from "../rate-limit";

/**
 * Per-IP throttle in front of the admin credentials flow (SPC-API-001).
 *
 * Two things it defends against, and one it deliberately does not.
 *
 * CREDENTIAL STUFFING. Without it, the only brake is the per-account lockout,
 * which arms after 5 failures. An attacker spraying one password across many
 * guessed addresses never trips that, because each miss is against a different
 * (usually non-existent) account.
 *
 * COST. `authorize` runs an Argon2id verification on every attempt — by design,
 * including when no user exists, so timing reveals nothing. Argon2id is
 * deliberately expensive, which makes an unthrottled login endpoint a cheap way
 * to burn the box's CPU. The throttle rejects before that work happens.
 *
 * WHAT IT DOES NOT FIX. The per-account lockout remains a targeted
 * denial-of-service: someone who knows the admin address can keep it armed by
 * failing five times every fifteen minutes, and this throttle does not change
 * that — it only raises the cost of driving it from a single address. Fixing it
 * properly needs either lockout scoped to account+IP or a challenge on the
 * lockout path, which is a larger change to the auth flow.
 *
 * IMPORTANT: this must be keyed on `resolveClientIp()`, never on a raw header.
 * Before that function existed, `x-real-ip` was a Cloudflare edge address for
 * every visitor, so a throttle built on it would have been worse than none —
 * every attacker and every legitimate admin would share one bucket, an
 * unrelated visitor could exhaust it, and a targeted attacker would simply
 * rotate edges.
 *
 * Single-instance only, like the submission limiter: the window lives in
 * process memory, so a second replica would double the effective allowance.
 * Tracked for P8 alongside the shared-store work.
 */

/** Generous enough for a fat-fingered password plus a stale TOTP code, tight
 *  enough that spraying from one address is pointless. */
const PER_IP = { max: 10, windowMs: 15 * 60 * 1000 };

/** A ceiling across all addresses, so a distributed attempt still meets a wall
 *  well below what would keep the CPU busy. Sized far above any believable
 *  human volume: this admin area has one user. */
const GLOBAL = { max: 60, windowMs: 15 * 60 * 1000 };

/** Bounded so the map cannot grow without limit under a distributed attack. */
const MAX_TRACKED_IPS = 2_000;

const limiter = createRateLimiter(PER_IP, GLOBAL, MAX_TRACKED_IPS);

/**
 * Returns false when the attempt should be rejected before any credential work.
 * The caller must fail exactly as it fails a wrong password — same return, same
 * shape — so the throttle never becomes an oracle for which addresses exist.
 */
export function allowLoginAttempt(ipKey: string, now: number = Date.now()): boolean {
  return limiter.check(ipKey, now);
}

export const LOGIN_THROTTLE_LIMITS = { PER_IP, GLOBAL, MAX_TRACKED_IPS } as const;
