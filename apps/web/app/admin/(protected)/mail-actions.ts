"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { sendAdminTestEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { MAIL_KEYS } from "@/lib/mail-config";
import { saveMailSettings } from "@/lib/mail-settings";

export type TestMailState = { ok: boolean; message: string } | null;
export type SaveSettingsState = { ok: boolean; message: string } | null;

/**
 * Persist the operator's mail settings.
 *
 * Only the keys in MAIL_KEYS are read from the form, so a crafted request
 * cannot write arbitrary configuration rows — the allowlist is the schema.
 *
 * A blank field means "delete this override and fall back to the environment",
 * which is the only route back to a working default from a form that cannot
 * know what the environment holds.
 */
export async function saveSettings(
  _prev: SaveSettingsState,
  formData: FormData,
): Promise<SaveSettingsState> {
  const admin = await requireAdmin();

  const patch: Record<string, string> = {};
  for (const key of MAIL_KEYS) {
    const raw = formData.get(key);
    // Absent (not rendered) and blank (cleared) are different intents, so only
    // fields actually present in the submission are considered.
    if (typeof raw === "string") patch[key] = raw;
  }

  try {
    const { changed } = await saveMailSettings(patch, admin.id);
    if (changed.length === 0) {
      return { ok: true, message: "No changes to save." };
    }
    // Key names only, never values — a secret copied into an append-only log
    // the application can read is a secret with a second, longer-lived home.
    await recordAudit({
      actorId: admin.id,
      action: "MAIL_SETTINGS_CHANGED",
      entity: "AppSetting:mail",
      diff: { changed },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return {
      ok: true,
      message: `Saved ${changed.length} setting${changed.length === 1 ? "" : "s"}. Send a test to confirm the relay accepts them.`,
    };
  } catch (error) {
    logger.error({ err: error }, "saving mail settings failed");
    return {
      ok: false,
      message:
        "Could not save. If this is the first time, the AppSetting table may not exist yet — the full error is in the application log.",
    };
  }
}

/**
 * Send a fixed test message to ADMIN_EMAIL, so the relay can be proven without
 * submitting a fake enquiry through the public form.
 *
 * The founder previously had no way to distinguish "the relay is broken" from
 * "nobody has written to us" — the two look identical, by design, because a
 * submission is stored first and the notification is best-effort. The inbox
 * banner catches missing configuration; it cannot catch a wrong password, an
 * unapproved sender, or a relay that accepts and then drops.
 *
 * Three things make this safe rather than an open relay (TM-002):
 *
 *  - The recipient is read server-side from ADMIN_EMAIL and the body is a
 *    constant. Neither crosses the wire, so there is nothing for a caller to
 *    choose. This is deliberately not parameterised.
 *  - `requireAdmin()` runs first, before anything is read or sent. The layout
 *    guard is not trusted on its own; authorization is per-handler here.
 *  - It is a Server Action, so Next's Origin check supplies CSRF protection,
 *    and the CSP already restricts `form-action` to 'self'.
 *
 * Audited on both paths. A test send that failed is the more interesting event
 * of the two, and an audit log that only records successes would omit exactly
 * the case someone will later want to reconstruct.
 */
export async function sendTestEmail(
  _prev: TestMailState,
  _formData: FormData,
): Promise<TestMailState> {
  const admin = await requireAdmin();
  try {
    await sendAdminTestEmail();
    await recordAudit({
      actorId: admin.id,
      action: "MAIL_TEST_SENT",
      entity: "Mail",
      diff: { result: "sent" },
    });
    return {
      ok: true,
      message:
        "Test message sent. If it does not arrive within a few minutes, check the spam folder before assuming the relay is at fault.",
    };
  } catch (error) {
    // Full error to the log, short one to the screen: relay errors quote the
    // SMTP conversation, which can include the username.
    logger.error({ err: error }, "admin test email failed");
    await recordAudit({
      actorId: admin.id,
      action: "MAIL_TEST_SENT",
      entity: "Mail",
      diff: { result: "failed" },
    });
    return {
      ok: false,
      message:
        "The relay rejected the message or could not be reached. The full error is in the application log.",
    };
  }
}
