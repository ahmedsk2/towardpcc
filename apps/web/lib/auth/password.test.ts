import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("Argon2id password hashing", () => {
  it("produces an encoded argon2id PHC string and verifies the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret-passphrase");
    expect(await verifyPassword("s3cret-passphras", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("uses a random salt (same password → different hashes)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-input", a)).toBe(true);
    expect(await verifyPassword("same-input", b)).toBe(true);
  });

  it("returns false (never throws) on a malformed stored hash", async () => {
    expect(await verifyPassword("whatever", "not-a-valid-hash")).toBe(false);
    expect(await verifyPassword("whatever", "")).toBe(false);
  });
});
