import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { SubmissionType } from "@towardpcc/db";
import { TYPE_LABELS } from "@/lib/admin/submission-view";

/**
 * Transactional email. Dev routes to Mailpit (localhost:1025); prod uses the
 * SMTP_* env. Two flows, per the threat model: the ADMIN is pinged when a
 * submission arrives (no submitter data in the mail), and the SUBMITTER is only
 * ever emailed AFTER a human triages — never an auto-reply that confirms a live
 * address to a spammer.
 */
let cached: Transporter | undefined;
function transporter(): Transporter {
  if (!cached) {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SECURE === "true",
      // Finite timeouts so a slow/hung SMTP relay can't stall the request path
      // for the library's multi-minute defaults (prod-readiness RES-01). Mail is
      // best-effort here and never fails a stored submission.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
        : {}),
    });
  }
  return cached;
}

const from = () => process.env.MAIL_FROM ?? "TowardPCC <info@towardpcc.com>";

async function send(opts: { to: string; subject: string; text: string }): Promise<void> {
  await transporter().sendMail({ from: from(), ...opts });
}

export async function notifyAdminOfSubmission(type: SubmissionType, id: string): Promise<void> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
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
