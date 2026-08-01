import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
// The REAL ops script, imported rather than reimplemented — the whole point is
// to test the code that will actually run, not a copy of it that could drift.
import {
  migrate,
  open as openWith,
  seal as sealWith,
} from "../../../../packages/db/scripts/rotate-totp-enc-key.mjs";
import { open, seal } from "./secret-box";

/**
 * THE TEST THAT STOPS A ROTATION FROM DESTROYING EVERY SECRET.
 *
 * `packages/db/scripts/rotate-totp-enc-key.mjs` has to re-encrypt values that
 * this module sealed, and it cannot import this module — it is a plain `.mjs`
 * ops script and this is TypeScript inside the Next app. So it carries its own
 * copy of the AES-256-GCM box format.
 *
 * Duplicated crypto that is merely *believed* to match is exactly how a
 * rotation turns into an unrecoverable outage: every admin loses their second
 * factor and the SMTP password becomes unreadable, at the same instant, with
 * the only copy of the plaintext already overwritten. Reading both files and
 * judging them identical is not evidence. This is.
 */
const KEY = randomBytes(32);
let saved: string | undefined;

beforeEach(() => {
  saved = process.env.TOTP_ENC_KEY;
  process.env.TOTP_ENC_KEY = KEY.toString("base64");
});
afterEach(() => {
  if (saved === undefined) delete process.env.TOTP_ENC_KEY;
  else process.env.TOTP_ENC_KEY = saved;
});

describe("rotation script interoperates with secret-box", () => {
  it("the script can open a box the application sealed", () => {
    // The real direction of the migration: production rows were written by the
    // app, and the script has to read them.
    const box = seal("JBSWY3DPEHPK3PXP");
    expect(openWith(box, KEY)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("the application can open a box the script sealed", () => {
    // And the direction that matters afterwards: the app has to read what the
    // script wrote, or nobody logs in again.
    const box = sealWith("JBSWY3DPEHPK3PXP", KEY);
    expect(open(box)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("a full rotation leaves a value the application can still read", () => {
    const NEW = randomBytes(32);
    const original = seal("smtp-password-example");

    const rotated = migrate(original, "test", KEY, NEW);
    expect(rotated).not.toBeNull();

    // The app now runs with the new key, as it would after the env change.
    process.env.TOTP_ENC_KEY = NEW.toString("base64");
    expect(open(rotated as string)).toBe("smtp-password-example");

    // And the old key is genuinely retired, not merely unused.
    process.env.TOTP_ENC_KEY = KEY.toString("base64");
    expect(() => open(rotated as string)).toThrow();
  });

  it("sealing is non-deterministic, so a rotation is not detectable by equality", () => {
    // Guards the assumption behind `migrate`'s re-runnable branch: you cannot
    // tell a rotated row from an unrotated one by comparing ciphertexts, which
    // is why it decides by attempting decryption instead.
    expect(seal("same")).not.toBe(seal("same"));
  });
});
