import "server-only";
import { randomBytes } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Argon2id password hashing (PRD §9), via hash-wasm (WASM — no native binary,
 * so it runs on the ARM64 dev box and Linux prod alike). Parameters follow the
 * OWASP minimum: 19 MiB memory, 2 iterations, 1 lane. The encoded PHC string
 * carries its own salt + params, so verification needs only the stored hash.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}
