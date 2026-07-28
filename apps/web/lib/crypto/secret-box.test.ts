import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { open, seal } from "./secret-box";

const KEY = randomBytes(32).toString("base64");
let saved: string | undefined;

beforeEach(() => {
  saved = process.env.TOTP_ENC_KEY;
  process.env.TOTP_ENC_KEY = KEY;
});
afterEach(() => {
  if (saved === undefined) delete process.env.TOTP_ENC_KEY;
  else process.env.TOTP_ENC_KEY = saved;
});

describe("secret box", () => {
  it("round-trips a value", () => {
    const secret = "hunter2-with-üñïçø∂é-and-spaces ";
    expect(open(seal(secret))).toBe(secret);
  });

  it("produces a different box each time, so equal secrets are not equal ciphertext", () => {
    // A deterministic box would let anyone with read access to the table learn
    // that two rows share a password, and would leak when one stopped changing.
    const a = seal("same");
    const b = seal("same");
    expect(a).not.toBe(b);
    expect(open(a)).toBe(open(b));
  });

  it("refuses a tampered box rather than returning garbage", () => {
    // The whole reason for GCM over CBC. A silently-corrupted password would be
    // used to authenticate against the relay and fail with a misleading error.
    const box = seal("original");
    const [iv, tag, ct] = box.split(".");
    const flipped = Buffer.from(ct!, "base64");
    flipped[0] = flipped[0]! ^ 0xff;
    expect(() => open([iv, tag, flipped.toString("base64")].join("."))).toThrow();
  });

  it("refuses a box sealed under a different key", () => {
    const box = seal("original");
    process.env.TOTP_ENC_KEY = randomBytes(32).toString("base64");
    expect(() => open(box)).toThrow();
  });

  it("rejects a malformed box instead of throwing something unreadable", () => {
    expect(() => open("not-a-box")).toThrow(/malformed/);
    expect(() => open("only.two")).toThrow(/malformed/);
  });

  it("refuses to operate with a missing or wrong-length key", () => {
    delete process.env.TOTP_ENC_KEY;
    expect(() => seal("x")).toThrow(/not set/);
    process.env.TOTP_ENC_KEY = Buffer.alloc(16).toString("base64");
    expect(() => seal("x")).toThrow(/32 bytes/);
  });
});
