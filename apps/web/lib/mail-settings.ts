import "server-only";
import { db } from "@towardpcc/db";
import { open, seal } from "@/lib/crypto/secret-box";
import { logger } from "@/lib/logger";
import {
  MAIL_KEYS,
  SECRET_MAIL_KEYS,
  mailSettingsFromEnv,
  mergeMailSettings,
  type MailKey,
  type MailSettings,
  type StoredSetting,
} from "@/lib/mail-config";

/**
 * Mail settings as the application actually sees them: database first,
 * environment as the fallback.
 *
 * That precedence is deliberate and worth stating, because the opposite is the
 * more common default. The admin form is the surface an operator can reach; a
 * value typed there that silently lost to an environment variable set months
 * ago would be the worst kind of surprise — the UI would show the new value,
 * the mail would use the old one, and nothing would report the disagreement.
 *
 * Deleting a row therefore means "fall back to the environment", not "unset".
 * That is how a bad edit is undone without console access.
 */
export async function resolveMailSettings(): Promise<MailSettings> {
  const fromEnv = mailSettingsFromEnv();
  let rows: Array<{ key: string; value: string; encrypted: boolean }>;
  try {
    rows = await db.appSetting.findMany({
      where: { key: { in: [...MAIL_KEYS] } },
      select: { key: true, value: true, encrypted: true },
    });
  } catch (error) {
    // A missing table (migration not yet applied) or an unreachable database
    // must not take mail down — the environment is still a complete, valid
    // source. Logged rather than swallowed, because silently degrading to env
    // while the admin form appears to work is exactly the confusion above.
    logger.error({ err: error }, "could not read mail settings from the database; using env only");
    return fromEnv;
  }

  const stored: StoredSetting[] = rows.map((row) => {
    if (!row.encrypted) return { key: row.key, value: row.value };
    try {
      return { key: row.key, value: open(row.value) };
    } catch (error) {
      // null, not undefined: mergeMailSettings treats it as "unusable", which
      // drops the key rather than falling back to a stale environment value.
      logger.error({ err: error, key: row.key }, "stored mail setting could not be decrypted");
      return { key: row.key, value: null };
    }
  });

  return mergeMailSettings(fromEnv, stored);
}

/**
 * Writes the operator's edits.
 *
 * Blank means delete, which is the only way back to the environment default
 * from a form that cannot know what the environment holds.
 *
 * The audit diff records which keys changed and never their values — a secret
 * copied into an append-only log the app can read is a secret with a second,
 * longer-lived home.
 */
export async function saveMailSettings(
  patch: Record<string, string>,
  adminId: string,
): Promise<{ changed: MailKey[] }> {
  const before = await db.appSetting.findMany({
    where: { key: { in: [...MAIL_KEYS] } },
    select: { key: true, value: true },
  });
  const previous = new Map(before.map((r) => [r.key, r.value]));
  const changed: MailKey[] = [];

  for (const key of MAIL_KEYS) {
    const raw = patch[key];
    if (raw === undefined) continue; // field absent from the form entirely
    const value = raw.trim();
    const secret = SECRET_MAIL_KEYS.has(key);

    if (!value) {
      if (previous.has(key)) {
        await db.appSetting.delete({ where: { key } });
        changed.push(key);
      }
      continue;
    }

    // A sealed value is a fresh box every time, so it can never be compared to
    // the stored one. Treat any submitted password as a change rather than
    // decrypting the old one just to answer a cosmetic question.
    if (!secret && previous.get(key) === value) continue;

    const stored = secret ? seal(value) : value;
    await db.appSetting.upsert({
      where: { key },
      create: { key, value: stored, encrypted: secret, updatedById: adminId },
      update: { value: stored, encrypted: secret, updatedById: adminId },
    });
    changed.push(key);
  }

  return { changed };
}
