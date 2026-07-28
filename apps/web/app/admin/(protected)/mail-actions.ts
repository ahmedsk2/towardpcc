"use server";

import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { sendAdminTestEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export type TestMailState = { ok: boolean; message: string } | null;

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
