// Per-account brute-force lockout policy (PRD §9). Kept as a pure, dependency-
// free module (no `server-only`, no DB) so it can be unit-tested directly;
// auth.ts applies the returned window atomically against AdminUser.

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;

/** The fields to write when a lockout window must be (re-)armed, or null. */
export type LockoutArm = { lockedUntil: Date; failedLoginCount: number } | null;

/**
 * Decide, after a failed-login increment, whether to (re-)arm a lockout window.
 *
 * Re-arms whenever the failure threshold is met AND the account is not
 * *currently* locked. The "currently" is the crux: a stale, already-expired
 * `lockedUntil` must NOT suppress re-locking. The previous `!lockedUntil` guard
 * did exactly that — once the first window elapsed, `lockedUntil` held a past
 * (non-null) date, so the throttle never fired again and the account could be
 * brute-forced indefinitely (only TOTP remained). Re-arming on a stale lock
 * closes that gap and makes the throttle repeat every window.
 *
 * On arm, the counter is reset to 0 so each post-expiry window gets a fresh set
 * of attempts ("5 strikes → 15-min timeout → fresh 5 strikes").
 */
export function lockoutArm(failedCount: number, lockedUntil: Date | null, now: Date): LockoutArm {
  const currentlyLocked = lockedUntil !== null && lockedUntil > now;
  if (failedCount >= MAX_FAILED && !currentlyLocked) {
    return {
      lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000),
      failedLoginCount: 0,
    };
  }
  return null;
}
