import "server-only";
import { createHash } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import type { SubmissionType } from "@towardpcc/db";
import { TYPE_LABELS } from "@/lib/admin/submission-view";
import { logger } from "@/lib/logger";
import { mailConfigurationStatus, type MailSettings } from "@/lib/mail-config";
import { resolveMailSettings } from "@/lib/mail-settings";
import { SITE_URL } from "@/lib/site-url";

/**
 * Transactional email. Dev routes to Mailpit (localhost:1025); prod uses the
 * relay configured in /admin/settings, falling back to the SMTP_* environment.
 *
 * ONE automatic flow: the admin is notified when a submission arrives, and that
 * message carries no submitter data — a type label and a link into the inbox.
 * Submitters are never emailed (ADR-0004), so the app cannot be induced to send
 * anything to an address an untrusted party chose.
 */
let warned = false;
/** Logs once per process rather than per submission, so it is visible without
 *  drowning the log during a spam flood. */
function warnIfUnconfigured(settings: MailSettings): boolean {
  const status = mailConfigurationStatus(settings);
  if (status.configured) return true;
  if (!warned) {
    warned = true;
    logger.error(
      { missing: status.missing },
      "outbound email is NOT configured — submissions will be stored but nobody will be notified",
    );
  }
  return false;
}

/**
 * The transport, rebuilt whenever the settings it was built from change.
 *
 * This used to cache one transport for the life of the process, which made the
 * host, port and credentials effectively immutable until a redeploy. That was
 * tolerable while they lived only in Coolify — editing them there triggers a
 * redeploy anyway. It stopped being tolerable the moment they became editable
 * in /admin/settings: an operator would save a corrected password, press "send
 * a test", and watch it fail against the old one with nothing on screen
 * explaining why.
 *
 * Keyed on a fingerprint rather than invalidated by the save path, because the
 * save happens in one process and the send may happen in another. A fingerprint
 * is correct across all of them with no coordination. It covers only the
 * connection settings; MAIL_FROM and MAIL_REPLY_TO are per-message and need no
 * new connection.
 */
let cached: { fingerprint: string; transport: Transporter } | undefined;

function transporter(settings: MailSettings): Transporter {
  // Explicit fallbacks rather than `??` on raw env, which does not catch "".
  const host = settings.SMTP_HOST ?? "localhost";
  const port = Number(settings.SMTP_PORT ?? 1025);
  const secure = settings.SMTP_SECURE === "true";
  const user = settings.SMTP_USER;
  const pass = settings.SMTP_PASSWORD;

  // The password is hashed in, never concatenated into a readable key, so a
  // credential cannot surface in a stack trace or a debugger view of this
  // module's state.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([host, port, secure, user ?? ""]))
    .update(pass ?? "")
    .digest("hex");

  if (cached?.fingerprint === fingerprint) return cached.transport;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    // Finite timeouts so a slow/hung SMTP relay can't stall the request path
    // for the library's multi-minute defaults (prod-readiness RES-01). Mail is
    // best-effort here and never fails a stored submission.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    ...(user ? { auth: { user, pass } } : {}),
  });
  cached = { fingerprint, transport };
  return transport;
}

/**
 * No default sender.
 *
 * There was one — `"TowardPCC <info@towardpicu.com>"` — from the brief period
 * when mail was going to be relayed through that domain. Under OCI Email
 * Delivery in me-riyadh-1 (ADR-0004) that address is neither an approved sender
 * nor a configured email domain, so a blank MAIL_FROM would make every send
 * fail at the relay: quietly, per-message, and indistinguishably from "nobody
 * has written to us". A missing sender is a configuration error and should
 * read as one.
 */
function from(settings: MailSettings): string {
  const value = settings.MAIL_FROM;
  if (!value) throw new Error("MAIL_FROM is not set — refusing to send with a guessed sender");
  return value;
}

/**
 * Where replies go, when it differs from where mail is sent from.
 *
 * Unset under the OCI relay, since From: goes back to info@towardpcc.com and
 * replies reach it directly. Kept because it costs nothing and the alternative
 * — deleting it and rediscovering the need — is how the towardpicu detour
 * started.
 */
async function send(
  settings: MailSettings,
  opts: { to: string; subject: string; text: string },
): Promise<void> {
  const reply = settings.MAIL_REPLY_TO;
  await transporter(settings).sendMail({
    from: from(settings),
    ...(reply ? { replyTo: reply } : {}),
    ...opts,
  });
}

export async function notifyAdminOfSubmission(type: SubmissionType, id: string): Promise<void> {
  // Fail loudly-in-logs rather than returning silently, which is what the old
  // `if (!to) return;` did — indistinguishable from a successful send.
  const settings = await resolveMailSettings();
  if (!warnIfUnconfigured(settings)) return;
  const to = settings.ADMIN_EMAIL;
  if (!to) return;
  // Falls back to the canonical origin rather than "": an empty base produced a
  // relative path, which is not clickable in an email client.
  const base = SITE_URL;
  await send(settings, {
    to,
    subject: `New ${TYPE_LABELS[type]} submission`,
    text: `A new ${TYPE_LABELS[type]} submission arrived.\n\nReview it in the admin inbox:\n${base}/admin/submissions/${id}`,
  });
}

/**
 * Proves the relay works, without giving anyone a way to make the platform
 * send mail on their behalf.
 *
 * The recipient is read from ADMIN_EMAIL on the server and the body is a
 * constant. Neither is a parameter, and that is the entire security design:
 * TM-002 is about the app being induced to send attacker-chosen text to an
 * attacker-chosen address, and a function that accepts neither cannot be.
 * If you are tempted to add a "send to:" field, don't — that is the feature
 * the threat model names.
 *
 * It now tests what is actually stored, not what the container booted with:
 * settings are resolved per call and the transport is keyed on a fingerprint of
 * them, so saving a corrected password and immediately pressing this button
 * exercises the new one.
 */
export async function sendAdminTestEmail(): Promise<void> {
  const settings = await resolveMailSettings();
  if (!warnIfUnconfigured(settings)) throw new Error("outbound email is not configured");
  const to = settings.ADMIN_EMAIL;
  if (!to) throw new Error("ADMIN_EMAIL is not set");
  await send(settings, {
    to,
    subject: "TowardPCC test message",
    text: `This is a test message sent from the TowardPCC admin area.

If you are reading it, the relay is configured and reachable, and submission
notifications will arrive the same way.

Nothing about any submission is included in this message.`,
  });
}
