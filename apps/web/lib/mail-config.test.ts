import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mailConfigurationStatus, mergeMailSettings } from "./mail-config";

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

describe("mergeMailSettings — database over environment", () => {
  const ENV = { SMTP_HOST: "env.example.com", SMTP_PASSWORD: "env-pass" } as const;

  it("lets a stored value override the environment", () => {
    expect(
      mergeMailSettings(ENV, [{ key: "SMTP_HOST", value: "stored.example.com" }]).SMTP_HOST,
    ).toBe("stored.example.com");
  });

  it("falls back to the environment when there is no row", () => {
    expect(mergeMailSettings(ENV, []).SMTP_HOST).toBe("env.example.com");
  });

  it("falls back to the environment for a blank stored value, rather than setting it to ''", () => {
    // The empty-string defect, again. If a cleared field could store "", the
    // host would be blank-but-present and every send would fail silently.
    expect(mergeMailSettings(ENV, [{ key: "SMTP_HOST", value: "   " }]).SMTP_HOST).toBe(
      "env.example.com",
    );
  });

  it("DROPS a key whose stored value could not be decrypted, env included", () => {
    // The case that looks wrong and is not. If the operator saved a new
    // password and it cannot be read back, falling through to the old
    // environment password would send mail with credentials they believe they
    // replaced. Dropping it makes the config incomplete, which is reported.
    const merged = mergeMailSettings(ENV, [{ key: "SMTP_PASSWORD", value: null }]);
    expect(merged.SMTP_PASSWORD).toBeUndefined();
    expect(mailConfigurationStatus(merged).missing).toContain("SMTP_PASSWORD");
  });

  it("ignores rows whose key is not a mail setting", () => {
    // The table is shared with future settings; a stray key must not become
    // part of the mail configuration just by existing.
    const merged = mergeMailSettings(ENV, [{ key: "SOMETHING_ELSE", value: "x" }]);
    expect(merged).toEqual(ENV);
  });

  it("trims a stored value, so a trailing newline does not become part of a hostname", () => {
    expect(
      mergeMailSettings(ENV, [{ key: "SMTP_HOST", value: " a.example.com\n" }]).SMTP_HOST,
    ).toBe("a.example.com");
  });
});

/**
 * Read as source rather than imported: `email.ts` is "server-only" and resolves
 * through the `@/` alias, neither of which vitest can load.
 *
 * This replaced a narrower guard that asserted the hardcoded sender fallback
 * was not `@towardpcc.com`. That guard failed the moment the fallback was
 * deleted — correctly: it was watching a literal, and the literal was gone. The
 * property worth holding was never "which domain is hardcoded" but "no sender
 * is hardcoded at all", which is what these assert.
 */
describe("outbound mail cannot be aimed by a caller", () => {
  const source = readFileSync(new URL("./email.ts", import.meta.url), "utf8");

  it("has no hardcoded sender fallback", () => {
    // A guessed sender does not fail loudly — it fails at the relay, once per
    // message, and looks exactly like nobody having written to us. Under OCI
    // Email Delivery a sender that is not on the approved list is rejected, so
    // any literal here is a silent outage waiting for a blank env var.
    expect(
      /env\("MAIL_FROM"\)\s*\?\?/.test(source),
      "MAIL_FROM has a `??` fallback again — throw instead, so a missing sender reads as the configuration error it is",
    ).toBe(false);
    expect(source).toMatch(/MAIL_FROM is not set/);
  });

  it("exposes no sender that takes a recipient argument", () => {
    // The TM-002 invariant, held structurally rather than by review.
    //
    // The submitter acknowledgement — the one function that ever took an
    // address from stored data — was removed under ADR-0004. What remains must
    // read every recipient from the server's own environment, so there is no
    // parameter for an untrusted party to influence. If someone adds
    // `sendX(to: string)`, the app becomes a way to make towardpcc.com send
    // mail to an address of the sender's choosing, and this fails.
    const exported = [...source.matchAll(/export async function (\w+)\(([^)]*)\)/g)];
    expect(exported.length, "no exported senders found — has this file moved?").toBeGreaterThan(0);
    for (const [, name, params] of exported) {
      expect(
        /\bto\b\s*:|email\s*:|recipient/i.test(params ?? ""),
        `${name}() takes a recipient parameter. Every recipient must come from the server environment (ADMIN_EMAIL), never from a caller — see TM-002.`,
      ).toBe(false);
    }
  });
});
