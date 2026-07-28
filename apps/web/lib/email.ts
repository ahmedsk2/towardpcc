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
function from(): string {
  const value = env("MAIL_FROM");
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
const replyTo = () => env("MAIL_REPLY_TO");

async function send(opts: { to: string; subject: string; text: string }): Promise<void> {
  const reply = replyTo();
  await transporter().sendMail({ from: from(), ...(reply ? { replyTo: reply } : {}), ...opts });
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
 * Note what this can and cannot tell you. The nodemailer transport is built
 * once per process and caches SMTP_HOST/PORT/SECURE/USER/PASSWORD, so this
 * exercises the configuration the container BOOTED with. Changing those in
 * Coolify triggers a redeploy, so in practice they agree — but a hot-edited
 * variable will not be reflected here.
 */
export async function sendAdminTestEmail(): Promise<void> {
  if (!warnIfUnconfigured()) throw new Error("outbound email is not configured");
  const to = env("ADMIN_EMAIL");
  if (!to) throw new Error("ADMIN_EMAIL is not set");
  await send({
    to,
    subject: "TowardPCC test message",
    text: `This is a test message sent from the TowardPCC admin area.

If you are reading it, the relay is configured and reachable, and submission
notifications will arrive the same way.

Nothing about any submission is included in this message.`,
  });
}
