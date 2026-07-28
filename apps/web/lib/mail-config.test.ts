import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailConfigurationStatus } from "./mail-config";

/**
 * The failure this guards against is not a crash — it is silence.
 *
 * SMTP_HOST shipped to production as an EMPTY STRING, and the transport read
 * `process.env.SMTP_HOST ?? "localhost"`. `??` only falls back on null or
 * undefined, so the host stayed "", every send failed, the error was caught as
 * "best-effort", and the founder had no way to know that enquiries were
 * arriving and nobody was being told.
 */
const KEYS = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "ADMIN_EMAIL", "NODE_ENV"] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("mailConfigurationStatus", () => {
  it("treats an EMPTY SMTP_HOST as unconfigured, not as a valid host", () => {
    // The exact production state that made submissions silent.
    process.env.SMTP_HOST = "";
    process.env.ADMIN_EMAIL = "someone@example.com";
    const status = mailConfigurationStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("SMTP_HOST");
  });

  it("treats a whitespace-only SMTP_HOST as unconfigured", () => {
    process.env.SMTP_HOST = "   ";
    process.env.ADMIN_EMAIL = "someone@example.com";
    expect(mailConfigurationStatus().configured).toBe(false);
  });

  it("reports a missing ADMIN_EMAIL, since nothing would be notified", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    delete process.env.ADMIN_EMAIL;
    const status = mailConfigurationStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("ADMIN_EMAIL");
  });

  it("is configured when a host and an admin recipient are both present", () => {
    process.env.SMTP_HOST = "smtp.email.me-riyadh-1.oci.oraclecloud.com";
    process.env.ADMIN_EMAIL = "someone@example.com";
    process.env.SMTP_USER = "ocid1.user.oc1..example";
    process.env.SMTP_PASSWORD = "secret";
    const status = mailConfigurationStatus();
    expect(status.configured).toBe(true);
    expect(status.missing).toEqual([]);
  });

  it("reports credentials as missing when a host needs auth but none is set", () => {
    // A relay reachable but unauthenticated will be rejected at RCPT TO; better
    // to surface it as misconfiguration than to discover it per-submission.
    process.env.SMTP_HOST = "smtp.email.me-riyadh-1.oci.oraclecloud.com";
    process.env.ADMIN_EMAIL = "someone@example.com";
    process.env.SMTP_USER = "";
    process.env.SMTP_PASSWORD = "";
    const status = mailConfigurationStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain("SMTP_USER");
  });

  it("does not require credentials for a local relay (Mailpit in dev)", () => {
    process.env.SMTP_HOST = "localhost";
    process.env.ADMIN_EMAIL = "dev@example.com";
    process.env.SMTP_USER = "";
    process.env.SMTP_PASSWORD = "";
    expect(mailConfigurationStatus().configured).toBe(true);
  });
});

/**
 * Read as source rather than imported: `email.ts` is "server-only" and resolves
 * through the `@/` alias, neither of which vitest can load. The invariant is
 * about a literal in the file, so reading the file tests it exactly.
 *
 * DELETE THIS TEST if towardpcc.com ever publishes an SPF record that
 * authorises a relay. Until then it holds a live constraint, not a preference.
 */
describe("the fallback sender domain", () => {
  const source = readFileSync(new URL("./email.ts", import.meta.url), "utf8");
  const fallback = /const from = \(\) => env\("MAIL_FROM"\) \?\? "([^"]+)"/.exec(source)?.[1];

  it("is a literal the test can actually find", () => {
    // Guards the guard: a refactor that renames `from` or moves the default
    // would otherwise leave the assertion below passing against `undefined`.
    expect(fallback).toBeTruthy();
  });

  it("does not send as @towardpcc.com, which publishes v=spf1 -all + p=reject", () => {
    // Not a style rule. DMARC aligns on the From: header domain, so mail sent
    // through any relay but addressed from towardpcc.com is rejected outright
    // by every conforming receiver — no bounce the app sees, nothing in the
    // logs, because the relay accepted it. The failure is invisible, which is
    // the only reason this is worth a test rather than a comment.
    expect(fallback).not.toContain("@towardpcc.com");
  });
});
