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
 *
 * Settings now come from two places — the database, edited in /admin/settings,
 * falling back to the environment. This module stays pure by taking the
 * resolved values as an argument; `lib/mail-settings.ts` does the resolving.
 */

/** Trimmed env read that treats "" and "   " as absent, which `??` does not. */
export const env = (key: string): string | undefined => {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
};

/**
 * Every setting the mail path reads, in the order an operator should fill them.
 * Single source of truth: the admin form, the env fallback and the status check
 * all iterate this, so a setting cannot be added to one and missed by another.
 */
export const MAIL_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "MAIL_FROM",
  "MAIL_REPLY_TO",
  "ADMIN_EMAIL",
] as const;

export type MailKey = (typeof MAIL_KEYS)[number];
export type MailSettings = Partial<Record<MailKey, string>>;

/** Keys whose values must never be rendered, logged or audited. */
export const SECRET_MAIL_KEYS: ReadonlySet<string> = new Set(["SMTP_PASSWORD"]);

export function mailSettingsFromEnv(): MailSettings {
  const out: MailSettings = {};
  for (const k of MAIL_KEYS) {
    const v = env(k);
    if (v) out[k] = v;
  }
  return out;
}

/**
 * A stored override, after decryption has been attempted.
 *
 * `value: null` means the row exists but could not be read — a sealed value
 * that would not open. That is a third state, distinct from "no row", and the
 * distinction matters: see mergeMailSettings.
 */
export type StoredSetting = { key: string; value: string | null };

/**
 * Database over environment, with the awkward cases made explicit.
 *
 * Pure, and separate from the query, so the three rules below can be tested.
 * They are easy to get subtly wrong and each one has a failure mode that is
 * silent in production:
 *
 *  - **No row** → the environment applies. This is the fallback that makes an
 *    override reversible without shell access.
 *  - **A blank stored value** → also the environment. Anything else would let a
 *    cleared field set the relay host to "", which is precisely the empty-string
 *    defect that made mail fail silently once already.
 *  - **A row that would not decrypt** → the key is dropped ENTIRELY, environment
 *    included. This is the one that looks wrong and is not: if an operator saved
 *    a new password and it cannot be read back, quietly falling through to a
 *    stale environment password would send mail with credentials they believe
 *    they replaced. Dropping it makes the configuration incomplete, which the
 *    admin banner reports out loud.
 */
export function mergeMailSettings(
  fromEnv: MailSettings,
  stored: readonly StoredSetting[],
): MailSettings {
  const merged: MailSettings = { ...fromEnv };
  for (const row of stored) {
    if (!(MAIL_KEYS as readonly string[]).includes(row.key)) continue;
    const key = row.key as MailKey;
    if (row.value === null) {
      delete merged[key];
      continue;
    }
    const trimmed = row.value.trim();
    if (trimmed) merged[key] = trimmed;
  }
  return merged;
}

/** A local relay (Mailpit in dev) needs no credentials; a public one does. */
const isLocalRelay = (host: string) => host === "localhost" || host === "127.0.0.1";

export type MailConfigurationStatus = {
  configured: boolean;
  /** Keys that are absent or blank, in the order they should be filled. */
  missing: string[];
};

export function mailConfigurationStatus(
  settings: MailSettings = mailSettingsFromEnv(),
): MailConfigurationStatus {
  const missing: string[] = [];
  const host = settings.SMTP_HOST;
  if (!host) missing.push("SMTP_HOST");
  if (!settings.ADMIN_EMAIL) missing.push("ADMIN_EMAIL");
  if (host && !isLocalRelay(host)) {
    // A relay reachable but unauthenticated is rejected at RCPT TO. Better to
    // report it as misconfiguration than to rediscover it per submission.
    if (!settings.SMTP_USER) missing.push("SMTP_USER");
    if (!settings.SMTP_PASSWORD) missing.push("SMTP_PASSWORD");
  }
  return { configured: missing.length === 0, missing };
}
