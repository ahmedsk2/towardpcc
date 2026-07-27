import { describe, expect, it } from "vitest";
import { LOGIN_THROTTLE_LIMITS, allowLoginAttempt } from "./login-throttle";

const { PER_IP, GLOBAL } = LOGIN_THROTTLE_LIMITS;

/**
 * The limiter holds module-level state, so each test uses its own IP key and
 * its own point on the clock rather than resetting shared state.
 */
let clock = 1_000_000;
const at = (offset = 0) => clock + offset;
const freshIp = (() => {
  let n = 0;
  return () => `198.51.100.${++n}`;
})();

describe("allowLoginAttempt", () => {
  it("allows a normal sequence of attempts from one address", () => {
    clock += 10_000_000;
    const ip = freshIp();
    for (let i = 0; i < PER_IP.max; i++) {
      expect(allowLoginAttempt(ip, at(i))).toBe(true);
    }
  });

  it("blocks the attempt after the per-IP allowance is spent", () => {
    clock += 10_000_000;
    const ip = freshIp();
    for (let i = 0; i < PER_IP.max; i++) allowLoginAttempt(ip, at(i));
    expect(allowLoginAttempt(ip, at(PER_IP.max))).toBe(false);
  });

  it("lets the same address back in once the window has slid past", () => {
    clock += 10_000_000;
    const ip = freshIp();
    for (let i = 0; i < PER_IP.max; i++) allowLoginAttempt(ip, at(i));
    expect(allowLoginAttempt(ip, at(PER_IP.max))).toBe(false);
    // A lockout that never lifts is a denial-of-service against the real admin.
    expect(allowLoginAttempt(ip, at(PER_IP.windowMs + 1))).toBe(true);
  });

  it("does not let one exhausted address block a different one", () => {
    clock += 10_000_000;
    const attacker = freshIp();
    const admin = freshIp();
    for (let i = 0; i < PER_IP.max + 5; i++) allowLoginAttempt(attacker, at(i));
    // The whole point of keying per address: the real admin still gets in.
    expect(allowLoginAttempt(admin, at(1))).toBe(true);
  });

  it("still enforces a global ceiling across many distinct addresses", () => {
    clock += 10_000_000;
    let allowed = 0;
    // Far more addresses than the global allowance, one attempt each, so the
    // per-IP window is never the thing rejecting them.
    for (let i = 0; i < GLOBAL.max + 40; i++) {
      if (allowLoginAttempt(`203.0.113.${i % 256}-${i}`, at(i))) allowed++;
    }
    expect(allowed).toBeLessThanOrEqual(GLOBAL.max);
    expect(allowed).toBeGreaterThan(0);
  });

  it("is configured tightly enough to be worth having", () => {
    // A throttle looser than the per-account lockout would never fire first,
    // which would make it decorative.
    expect(PER_IP.max).toBeGreaterThan(5);
    expect(PER_IP.max).toBeLessThanOrEqual(20);
    expect(PER_IP.windowMs).toBeGreaterThanOrEqual(5 * 60 * 1000);
  });
});
