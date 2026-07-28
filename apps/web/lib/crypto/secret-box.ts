import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Application-layer encryption for secrets held in the database.
 *
 * AES-256-GCM, serialised as `iv.tag.ciphertext` in base64. Authenticated, so
 * a tampered value fails to decrypt rather than silently yielding garbage.
 *
 * This is a layer ON TOP of the volume's at-rest encryption, not a replacement
 * for it. The threat it addresses is narrower and more realistic: a database
 * dump, a backup file, or a `SELECT` by anything with read access. None of
 * those cross the disk boundary, so at-rest encryption does nothing about them.
 *
 * WHY ONE KEY FOR BOTH TOTP SECRETS AND THE SMTP PASSWORD.
 *
 * Separate keys per secret type is the textbook answer, and it is the wrong
 * trade here. Both secrets live in the same database, and both keys would live
 * in the same process environment on the same host — so a compromise that
 * reaches one reaches the other, and the separation buys nothing real. What it
 * would cost is concrete: a second key to generate, provision and never lose,
 * and a settings page that throws at exactly the moment someone is trying to
 * configure mail because the new variable was missed.
 *
 * `TOTP_ENC_KEY` keeps its name because renaming it would mean a coordinated
 * env change on a running production host to gain nothing. The name is now
 * narrower than the job; that is recorded here rather than fixed.
 */
function key(): Buffer {
  const raw = process.env.TOTP_ENC_KEY;
  if (!raw) throw new Error("TOTP_ENC_KEY is not set");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("TOTP_ENC_KEY must decode to 32 bytes");
  return k;
}

/** Seals a value as `iv.tag.ciphertext`, all base64. */
export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

/** Throws on a malformed or tampered box — never returns a partial result. */
export function open(sealed: string): string {
  const [ivB, tagB, ctB] = sealed.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("malformed sealed value");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB, "base64")), decipher.final()]).toString(
    "utf8",
  );
}
