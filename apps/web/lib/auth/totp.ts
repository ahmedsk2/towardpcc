import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { Secret, TOTP } from "otpauth";

/**
 * TOTP second factor (mandatory, PRD §9) plus single-use recovery codes.
 * The shared secret is application-encrypted (AES-256-GCM) on top of the DB's
 * at-rest encryption, so a database read alone never yields a working factor.
 */

const ISSUER = "TowardPCC";

function encKey(): Buffer {
  const raw = process.env.TOTP_ENC_KEY;
  if (!raw) throw new Error("TOTP_ENC_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TOTP_ENC_KEY must decode to 32 bytes");
  return key;
}

/** iv.tag.ciphertext, all base64. */
export function encryptSecret(secretBase32: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(secretBase32, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

export function decryptSecret(enc: string): string {
  const [ivB, tagB, ctB] = enc.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("malformed encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString(
    "utf8",
  );
}

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export function totpProvisioningUri(secretBase32: string, accountEmail: string): string {
  return new TOTP({
    issuer: ISSUER,
    label: accountEmail,
    secret: Secret.fromBase32(secretBase32),
  }).toString();
}

/** Accepts the current step ±1 for clock skew. */
export function verifyTotp(secretBase32: string, token: string): boolean {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const totp = new TOTP({ issuer: ISSUER, secret: Secret.fromBase32(secretBase32) });
  return totp.validate({ token: clean, window: 1 }) !== null;
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

/** High-entropy single-use codes; returns plaintext (shown once) + hashes (stored). */
export function generateRecoveryCodes(count = 10): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex"); // 40 bits
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    plain.push(formatted);
    hashed.push(hashRecoveryCode(formatted));
  }
  return { plain, hashed };
}

/** Constant-time membership check; returns the matched index or -1. */
export function matchRecoveryCode(token: string, hashes: readonly string[]): number {
  const candidate = Buffer.from(hashRecoveryCode(token));
  for (let i = 0; i < hashes.length; i++) {
    const stored = Buffer.from(hashes[i]!);
    if (stored.length === candidate.length && timingSafeEqual(stored, candidate)) return i;
  }
  return -1;
}
