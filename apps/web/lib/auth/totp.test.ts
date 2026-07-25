import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Secret, TOTP } from "otpauth";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  matchRecoveryCode,
  totpProvisioningUri,
  verifyTotpStep,
} from "./totp";

const KEY_B64 = Buffer.alloc(32, 7).toString("base64"); // 32 bytes → valid encKey
let savedKey: string | undefined;

beforeAll(() => {
  savedKey = process.env.TOTP_ENC_KEY;
  process.env.TOTP_ENC_KEY = KEY_B64;
});
afterAll(() => {
  if (savedKey === undefined) delete process.env.TOTP_ENC_KEY;
  else process.env.TOTP_ENC_KEY = savedKey;
});

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips a secret and never yields identical ciphertext (random IV)", () => {
    const secret = generateTotpSecret();
    const a = encryptSecret(secret);
    const b = encryptSecret(secret);
    expect(a).not.toBe(b); // fresh IV per encryption
    expect(decryptSecret(a)).toBe(secret);
    expect(decryptSecret(b)).toBe(secret);
  });

  it("throws on a malformed encrypted blob", () => {
    expect(() => decryptSecret("only.two")).toThrow(/malformed/);
  });

  it("rejects a tampered ciphertext (GCM auth tag)", () => {
    const enc = encryptSecret(generateTotpSecret());
    const [iv, tag, ct] = enc.split(".") as [string, string, string];
    const flipped = ct.slice(0, -2) + (ct.endsWith("A") ? "B" : "A") + ct.slice(-1);
    expect(() => decryptSecret([iv, tag, flipped].join("."))).toThrow();
  });

  it("rejects an absent or wrong-length encryption key", () => {
    const good = process.env.TOTP_ENC_KEY;
    try {
      delete process.env.TOTP_ENC_KEY;
      expect(() => encryptSecret("JBSWY3DPEHPK3PXP")).toThrow(/not set/);
      process.env.TOTP_ENC_KEY = Buffer.alloc(16).toString("base64"); // 16 bytes
      expect(() => encryptSecret("JBSWY3DPEHPK3PXP")).toThrow(/32 bytes/);
    } finally {
      process.env.TOTP_ENC_KEY = good;
    }
  });
});

describe("generateTotpSecret / provisioning URI", () => {
  it("generates a base32 secret and an otpauth URI carrying issuer + account", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const uri = totpProvisioningUri(secret, "admin@example.com");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("TowardPCC");
    expect(uri).toContain("admin%40example.com");
  });
});

describe("verifyTotpStep (replay-anchored, ±1 window)", () => {
  const secret = generateTotpSecret();
  const totp = new TOTP({ issuer: "TowardPCC", secret: Secret.fromBase32(secret) });

  it("accepts the current token and returns the absolute step (for anti-replay)", () => {
    const token = totp.generate();
    const step = verifyTotpStep(secret, token);
    expect(step).not.toBeNull();
    // Returned step is the absolute period; equals floor(now/30) for a current code.
    expect(Math.abs(step! - Math.floor(Date.now() / 1000 / 30))).toBeLessThanOrEqual(1);
  });

  it("strips whitespace from the entered token", () => {
    const token = totp.generate();
    const spaced = `${token.slice(0, 3)} ${token.slice(3)}`;
    expect(verifyTotpStep(secret, spaced)).not.toBeNull();
  });

  it("rejects a non-6-digit token", () => {
    expect(verifyTotpStep(secret, "12345")).toBeNull();
    expect(verifyTotpStep(secret, "abcdef")).toBeNull();
  });

  it("rejects a well-formed token outside the ±1 window", () => {
    // A token generated ~10 periods in the future is out of the validation window.
    const future = totp.generate({ timestamp: Date.now() + 10 * 30_000 });
    expect(verifyTotpStep(secret, future)).toBeNull();
  });
});

describe("recovery codes", () => {
  it("hashes case-insensitively and trims", () => {
    expect(hashRecoveryCode("AbC12 ")).toBe(hashRecoveryCode("abc12"));
    expect(hashRecoveryCode("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates the requested count of formatted single-use codes with matching hashes", () => {
    const { plain, hashed } = generateRecoveryCodes(4);
    expect(plain).toHaveLength(4);
    expect(hashed).toHaveLength(4);
    for (let i = 0; i < plain.length; i++) {
      expect(plain[i]).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}-[0-9a-f]{5}-[0-9a-f]{5}$/);
      expect(hashed[i]).toBe(hashRecoveryCode(plain[i]!));
    }
  });

  it("defaults to 10 codes", () => {
    expect(generateRecoveryCodes().plain).toHaveLength(10);
  });

  it("matches a valid code by constant-time compare and returns its index", () => {
    const { plain, hashed } = generateRecoveryCodes(3);
    expect(matchRecoveryCode(plain[1]!, hashed)).toBe(1);
    // Case-insensitive (hash lowercases).
    expect(matchRecoveryCode(plain[2]!.toUpperCase(), hashed)).toBe(2);
  });

  it("returns -1 for an unknown code and skips length-mismatched stored hashes", () => {
    const { plain, hashed } = generateRecoveryCodes(2);
    expect(matchRecoveryCode("00000-00000-00000-00000", hashed)).toBe(-1);
    // A malformed stored hash of a different length must be skipped, not crash.
    expect(matchRecoveryCode(plain[0]!, ["deadbeef", ...hashed])).toBe(1);
  });
});
