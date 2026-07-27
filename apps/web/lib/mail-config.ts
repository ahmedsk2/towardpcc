/**
 * Whether outbound mail can actually work.
 *
 * Deliberately separate from `lib/email.ts`: this is pure, has no `server-only`
 * or transport dependencies, and is therefore unit-testable and safe to call
 * from a server component (the admin inbox renders a warning from it).
 *
 * It exists because of a specific, quiet failure. `SMTP_HOST` shipped to
 * production as an EMPTY STRING, and the transport read
 * `process.env.SMTP_HOST ?? "localhost"`. `??` only falls back on null or
 * undefined, so the host stayed `""` — every send failed, the caller swallowed
 * the error as best-effort, and enquiries accumulated in the admin inbox with
 * nobody told. The defect was not that mail broke; it was that nothing said so.
 */

/** Trimmed env read that treats "" and "   " as absent, which `??` does not. */
export const env = (key: string): string | undefined => {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
};

/** A local relay (Mailpit in dev) needs no credentials; a public one does. */
const isLocalRelay = (host: string) => host === "localhost" || host === "127.0.0.1";

export type MailConfigurationStatus = {
  configured: boolean;
  /** Env keys that are absent or blank, in the order they should be filled. */
  missing: string[];
};

export function mailConfigurationStatus(): MailConfigurationStatus {
  const missing: string[] = [];
  const host = env("SMTP_HOST");
  if (!host) missing.push("SMTP_HOST");
  if (!env("ADMIN_EMAIL")) missing.push("ADMIN_EMAIL");
  if (host && !isLocalRelay(host)) {
    // A relay reachable but unauthenticated is rejected at RCPT TO. Better to
    // report it as misconfiguration than to rediscover it per submission.
    if (!env("SMTP_USER")) missing.push("SMTP_USER");
    if (!env("SMTP_PASSWORD")) missing.push("SMTP_PASSWORD");
  }
  return { configured: missing.length === 0, missing };
}
