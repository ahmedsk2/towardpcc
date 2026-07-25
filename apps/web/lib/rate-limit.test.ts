import { describe, expect, it } from "vitest";
import { createRateLimiter, tryConsume, type Window } from "./rate-limit";

const PER_IP: Window = { max: 3, windowMs: 1000 };
const GLOBAL: Window = { max: 5, windowMs: 1000 };

describe("tryConsume", () => {
  it("accepts while under the cap and records the hit", () => {
    const r = tryConsume([0, 100], 200, PER_IP);
    expect(r.ok).toBe(true);
    expect(r.fresh).toEqual([0, 100, 200]);
  });

  it("rejects at the cap and does NOT record the hit (fail-closed, no growth)", () => {
    const r = tryConsume([0, 100, 200], 300, PER_IP);
    expect(r.ok).toBe(false);
    expect(r.fresh).toEqual([0, 100, 200]); // unchanged — rejected hits never pin the window
  });

  it("prunes entries older than the window", () => {
    const r = tryConsume([0, 100, 2000], 2500, PER_IP);
    // 0 and 100 are stale (>1000ms before now); only 2000 survives, then 2500 is added.
    expect(r.fresh).toEqual([2000, 2500]);
    expect(r.ok).toBe(true);
  });
});

describe("createRateLimiter", () => {
  it("allows up to the per-IP cap in a window, then rejects", () => {
    const rl = createRateLimiter(PER_IP, GLOBAL, 100);
    expect(rl.check("a", 0)).toBe(true);
    expect(rl.check("a", 1)).toBe(true);
    expect(rl.check("a", 2)).toBe(true);
    expect(rl.check("a", 3)).toBe(false); // 4th within window
  });

  it("frees the per-IP window after windowMs elapses", () => {
    const rl = createRateLimiter(PER_IP, GLOBAL, 100);
    for (let i = 0; i < 3; i++) rl.check("a", i);
    expect(rl.check("a", 3)).toBe(false);
    expect(rl.check("a", 1001)).toBe(true); // first three now stale
  });

  it("does not charge the global bucket for per-IP-rejected requests", () => {
    const rl = createRateLimiter(PER_IP, GLOBAL, 100);
    // Exhaust one IP (3 accepted) then hammer it 10 more times (all per-IP rejects).
    for (let i = 0; i < 3; i++) rl.check("a", i);
    for (let i = 0; i < 10; i++) expect(rl.check("a", 10 + i)).toBe(false);
    // Global consumed only 3, so 2 more distinct IPs still fit under GLOBAL.max=5.
    expect(rl.check("b", 100)).toBe(true);
    expect(rl.check("c", 101)).toBe(true);
  });

  it("enforces the global cap across distinct IPs", () => {
    const rl = createRateLimiter(PER_IP, GLOBAL, 100);
    // 5 distinct IPs, one accepted each → global reaches its cap of 5.
    for (let i = 0; i < 5; i++) expect(rl.check(`ip${i}`, i)).toBe(true);
    expect(rl.check("ip5", 6)).toBe(false); // 6th accepted-attempt exceeds GLOBAL.max
  });

  it("rejects everything and retains no key when the per-IP cap is zero", () => {
    // Drains the window to empty (fresh.length === 0) → the key is dropped, not stored.
    const rl = createRateLimiter({ max: 0, windowMs: 1000 }, GLOBAL, 100);
    expect(rl.check("a", 0)).toBe(false);
    expect(rl.check("a", 1)).toBe(false);
  });

  it("bounds the tracked-IP map by evicting oldest keys", () => {
    const rl = createRateLimiter(PER_IP, { max: 10_000, windowMs: 1000 }, 2);
    rl.check("a", 0);
    rl.check("b", 1);
    rl.check("c", 2); // exceeds maxTrackedIps=2 → oldest ("a") evicted
    // "a" was evicted, so it gets a fresh per-IP window (3 more allowed).
    expect(rl.check("a", 3)).toBe(true);
    expect(rl.check("a", 4)).toBe(true);
    expect(rl.check("a", 5)).toBe(true);
    expect(rl.check("a", 6)).toBe(false);
  });
});
