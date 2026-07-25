import { describe, expect, it } from "vitest";
import { LOCK_MINUTES, MAX_FAILED, lockoutArm } from "./lockout";

const NOW = new Date("2026-07-25T12:00:00.000Z");
const future = (min: number) => new Date(NOW.getTime() + min * 60_000);
const past = (min: number) => new Date(NOW.getTime() - min * 60_000);

describe("lockoutArm", () => {
  it("does not arm below the failure threshold", () => {
    expect(lockoutArm(MAX_FAILED - 1, null, NOW)).toBeNull();
  });

  it("arms a fresh window when the threshold is first reached", () => {
    const arm = lockoutArm(MAX_FAILED, null, NOW);
    expect(arm).not.toBeNull();
    expect(arm!.lockedUntil.getTime()).toBe(future(LOCK_MINUTES).getTime());
    // Counter resets so the next window starts fresh.
    expect(arm!.failedLoginCount).toBe(0);
  });

  it("does not extend an already-active lock", () => {
    // Currently locked (lockedUntil in the future) → leave it alone.
    expect(lockoutArm(MAX_FAILED, future(5), NOW)).toBeNull();
  });

  it("RE-ARMS after a previous lock has expired (regression: SPC-CODE-001)", () => {
    // The bug: a stale, past lockedUntil used to suppress re-locking forever.
    const arm = lockoutArm(MAX_FAILED, past(1), NOW);
    expect(arm).not.toBeNull();
    expect(arm!.lockedUntil.getTime()).toBe(future(LOCK_MINUTES).getTime());
    expect(arm!.failedLoginCount).toBe(0);
  });

  it("re-arms even when the counter has drifted above the threshold post-expiry", () => {
    expect(lockoutArm(MAX_FAILED + 3, past(30), NOW)).not.toBeNull();
  });

  it("treats a lock expiring exactly now as not currently locked", () => {
    // lockedUntil === now is not strictly in the future → re-arm.
    expect(lockoutArm(MAX_FAILED, NOW, NOW)).not.toBeNull();
  });
});
