import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { SubmissionType } from "@towardpcc/db";
import { TYPE_LABELS } from "@/lib/admin/submission-view";
import { logger } from "@/lib/logger";
import { env, mailConfigurationStatus } from "@/lib/mail-config";
import { SITE_URL } from "@/lib/site-url";

/**
 * Transactional email. Dev routes to Mailpit (localhost:1025); prod uses the
 * SMTP_* env. Two flows, per the threat model: the ADMIN is pinged when a
 * submission arrives (no submitter data in the mail), and the SUBMITTER is only
 * ever emailed AFTER a human triages — never an auto-reply that confirms a live
 * address to a spammer.
 */
let warned = false;
/** Logs once per process rather than per submission, so it is visible without
 *  drowning the log during a spam flood. */
function warnIfUnconfigured(): boolean {
  const status = mailConfigurationStatus();
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

let cached: Transporter | undefined;
function transporter(): Transporter {
  if (!cached) {
    cached = nodemailer.createTransport({
      // Explicit fallback rather than `??`, which does not catch "".
      host: env("SMTP_HOST") ?? "localhost",
      port: Number(env("SMTP_PORT") ?? 1025),
      secure: process.env.SMTP_SECURE === "true",
      // Finite timeouts so a slow/hung SMTP relay can't stall the request path
      // for the library's multi-minute defaults (prod-readiness RES-01). Mail is
      // best-effort here and never fails a stored submission.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      ...(env("SMTP_USER") ? { auth: { user: env("SMTP_USER"), pass: env("SMTP_PASSWORD") } } : {}),
    });
  }
  return cached;
}

const from = () => env("MAIL_FROM") ?? "TowardPCC <info@towardpcc.com>";

async function send(opts: { to: string; subject: string; text: string }): Promise<void> {
  await transporter().sendMail({ from: from(), ...opts });
}

export async function notifyAdminOfSubmission(type: SubmissionType, id: string): Promise<void> {
  // Fail loudly-in-logs rather than returning silently, which is what the old
  // `if (!to) return;` did — indistinguishable from a successful send.
  if (!warnIfUnconfigured()) return;
  const to = env("ADMIN_EMAIL");
  if (!to) return;
  // Falls back to the canonical origin rather than "": an empty base produced a
  // relative path, which is not clickable in an email client.
  const base = SITE_URL;
  await send({
    to,
    subject: `New ${TYPE_LABELS[type]} submission`,
    text: `A new ${TYPE_LABELS[type]} submission arrived.\n\nReview it in the admin inbox:\n${base}/admin/submissions/${id}`,
  });
}

export async function sendSubmitterAcknowledgement(
  to: string,
  type: SubmissionType,
): Promise<void> {
  await send({
    to,
    subject: "We received your message — TowardPCC",
    text: `Thank you for reaching out to TowardPCC.

We have received your ${TYPE_LABELS[type].toLowerCase()} message and a member of our team is looking at it. We will follow up with you personally.

— The TowardPCC team`,
  });
}
