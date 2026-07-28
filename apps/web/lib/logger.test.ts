import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * No raw client address may reach a log.
 *
 * `docs/security/log-retention.md` states as fact that application logs contain
 * no raw IPs — only the salted, truncated `ipHash` — and uses that to argue the
 * retention question TM-009 raised largely does not arise. That argument is
 * only as good as the property, and the property is one line of code away from
 * being false: someone debugging a rate-limit problem adds `{ ip }` to a log
 * call, and a document about not logging addresses quietly becomes untrue.
 *
 * Read as source rather than by importing logger.ts, which is "server-only".
 */
const ROOTS = [join(__dirname, "..", "app"), join(__dirname, "..", "lib")];

function collect(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("logging never carries a raw client address", () => {
  const files = ROOTS.flatMap(collect);

  it("finds the source to scan", () => {
    // Guards the guard: an empty file list makes every assertion below vacuous.
    expect(files.length).toBeGreaterThan(20);
  });

  it("passes no bare ip to a log call", () => {
    // Matches the object literal a pino call takes: logger.warn({ ... }, "msg").
    // `ipHash` is explicitly fine — it is the hash, and the whole point.
    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(readFileSync(file, "utf8"));
      for (const m of src.matchAll(/logger\.\w+\(\s*\{([^}]*)\}/g)) {
        const fields = m[1] ?? "";
        // \bip\b matches `ip`, `ip:` and `ip,` but not `ipHash`.
        if (/\bip\b/.test(fields)) {
          offenders.push(`${file.replace(/^.*[\\/]apps[\\/]web[\\/]/, "")}: {${fields.trim()}}`);
        }
      }
    }
    expect(
      offenders,
      "a log call passes a raw client address. Log the salted ipHash instead — docs/security/log-retention.md states publicly that raw addresses are never logged, and that claim has to stay true",
    ).toEqual([]);
  });

  it("keeps the redaction net in place", () => {
    // Defence in depth rather than the control, but its removal would be
    // invisible: nothing fails, logs just start carrying more than intended.
    const src = readFileSync(join(__dirname, "logger.ts"), "utf8");
    for (const field of ["email", "password", "name", "message", "payload", "token"]) {
      expect(src, `pino redaction no longer covers "${field}"`).toMatch(
        new RegExp(`["'][*.]*${field}["']`),
      );
    }
  });
});
