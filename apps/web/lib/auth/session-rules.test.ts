import { describe, expect, it } from "vitest";
import {
  hashSessionId,
  isExpired,
  LAST_SEEN_THROTTLE_MS,
  mintSessionId,
  SESSION_MAX_AGE_MS,
  shouldTouch,
} from "./session-rules";

describe("hashSessionId", () => {
  it("is deterministic, so the same id finds the same row", () => {
    expect(hashSessionId("abc")).toBe(hashSessionId("abc"));
  });

  it("does not return the input — the raw id must never reach the database", () => {
    const id = mintSessionId();
    expect(hashSessionId(id)).not.toBe(id);
    expect(hashSessionId(id)).not.toContain(id);
  });

  it("is 64 hex characters (sha256), so the unique index is on a fixed width", () => {
    expect(hashSessionId(mintSessionId())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("separates ids that differ by one character", () => {
    expect(hashSessionId("session-a")).not.toBe(hashSessionId("session-b"));
  });
});

describe("mintSessionId", () => {
  it("is URL-safe, because the value travels inside a JWT", () => {
    for (let i = 0; i < 50; i++) expect(mintSessionId()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("carries 256 bits — 43 base64url characters, unpadded", () => {
    expect(mintSessionId()).toHaveLength(43);
  });

  /**
   * Not a statistical test of the CSPRNG — that is node's job. It catches the
   * specific regression that would matter: someone swapping this for a counter,
   * a timestamp, or `cuid()`, all of which collide or are predictable.
   */
  it("does not repeat across many mints", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(mintSessionId());
    expect(seen.size).toBe(1000);
  });
});

describe("isExpired", () => {
  const now = new Date("2026-08-08T12:00:00.000Z");

  it("a future expiry is live", () => {
    expect(isExpired(new Date("2026-08-08T12:00:01.000Z"), now)).toBe(false);
  });

  it("a past expiry is dead", () => {
    expect(isExpired(new Date("2026-08-08T11:59:59.000Z"), now)).toBe(true);
  });

  /**
   * The boundary rounds toward refusing. Rounding the other way would let a
   * session outlive its absolute limit, which is the half of SPC-TM-002 that
   * revocation alone does not fix.
   */
  it("an expiry exactly equal to now is dead, not alive", () => {
    expect(isExpired(new Date(now), now)).toBe(true);
  });
});

describe("shouldTouch", () => {
  const now = new Date("2026-08-08T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("skips the write for a session seen a moment ago", () => {
    expect(shouldTouch(ago(1_000), now)).toBe(false);
  });

  it("writes once the throttle window has passed", () => {
    expect(shouldTouch(ago(LAST_SEEN_THROTTLE_MS + 1), now)).toBe(true);
  });

  it("writes exactly at the window edge", () => {
    expect(shouldTouch(ago(LAST_SEEN_THROTTLE_MS), now)).toBe(true);
  });

  /**
   * A clock that jumps backwards must not produce a write storm: every request
   * would otherwise see a "future" lastSeenAt and, with a naive absolute
   * difference, decide it was stale.
   */
  it("does not write when lastSeenAt is in the future (clock skew)", () => {
    expect(shouldTouch(new Date(now.getTime() + 5 * LAST_SEEN_THROTTLE_MS), now)).toBe(false);
  });
});

describe("constants", () => {
  it("the session lifetime matches the 8h maxAge declared in auth.ts", () => {
    expect(SESSION_MAX_AGE_MS).toBe(8 * 60 * 60 * 1000);
  });

  /**
   * The throttle has to be far shorter than the lifetime, or `lastSeenAt` would
   * be written so rarely it could not distinguish a live session from an
   * abandoned one — which is the only reason the column exists.
   */
  it("the lastSeen throttle is much shorter than the session lifetime", () => {
    expect(LAST_SEEN_THROTTLE_MS).toBeLessThan(SESSION_MAX_AGE_MS / 60);
  });
});
