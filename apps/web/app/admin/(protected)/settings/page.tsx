import { requireAdmin } from "@/lib/auth/guard";
import { mailConfigurationStatus, mailSettingsFromEnv, type MailKey } from "@/lib/mail-config";
import { resolveMailSettings } from "@/lib/mail-settings";
import { TestMailButton } from "../test-mail-button";
import { MailForm, type Field } from "./mail-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false, follow: false } };

/**
 * Mail configuration, editable here rather than only in Coolify.
 *
 * Values are stored in the database and OVERRIDE the environment, so the relay
 * can be set up without shell or hosting-panel access. Clearing a field deletes
 * the override and falls back to the environment, which is the only way back to
 * a working default from a form that cannot know what the environment holds.
 *
 * The password is never sent to the browser — not as a value, not as a masked
 * string. The field renders empty with a placeholder saying one is saved, so an
 * empty box does not read as "none set".
 */
const FIELDS: ReadonlyArray<{ key: MailKey; label: string; hint: string; secret?: boolean }> = [
  {
    key: "SMTP_HOST",
    label: "SMTP_HOST",
    hint: "The relay's outgoing server, e.g. mail.example.com. This is the gate: nothing is sent while it is blank.",
  },
  {
    key: "SMTP_PORT",
    label: "SMTP_PORT",
    hint: "587 for STARTTLS, 465 for implicit TLS. Must agree with SMTP_SECURE below.",
  },
  {
    key: "SMTP_SECURE",
    label: "SMTP_SECURE",
    hint: 'Exactly "true" or "false". False is correct for port 587 — the connection starts plaintext and is upgraded by STARTTLS. Set true only with port 465.',
  },
  { key: "SMTP_USER", label: "SMTP_USER", hint: "Usually the full mailbox address." },
  {
    key: "SMTP_PASSWORD",
    label: "SMTP_PASSWORD",
    hint: "Encrypted before it is stored, and never displayed again. Leave blank to keep the saved one.",
    secret: true,
  },
  {
    key: "MAIL_FROM",
    label: "MAIL_FROM",
    hint: 'The From: header, e.g. "TowardPCC <info@example.com>". It must be an address the relay is authorised to send as, or every message is rejected.',
  },
  {
    key: "MAIL_REPLY_TO",
    label: "MAIL_REPLY_TO",
    hint: "Optional. Only needed when replies should go somewhere other than the From: address.",
  },
  {
    key: "ADMIN_EMAIL",
    label: "ADMIN_EMAIL",
    hint: "Where submission notifications and test messages are sent. The only recipient the application ever uses.",
  },
];

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await resolveMailSettings();
  const fromEnv = mailSettingsFromEnv();
  const status = mailConfigurationStatus(settings);

  const fields: Field[] = FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    hint: f.hint,
    // Secrets never leave the server; the form only learns that one exists.
    value: f.secret ? (settings[f.key] ? "saved" : "") : (settings[f.key] ?? ""),
    ...(f.secret ? { secret: true } : {}),
    // True when the effective value matches the environment, i.e. no override
    // has been saved. Tells the operator why a box they never filled has a
    // value in it.
    ...(settings[f.key] && settings[f.key] === fromEnv[f.key] ? { fromEnv: true } : {}),
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink-strong">Settings</h1>

      <section aria-labelledby="mail-heading" className="mt-8">
        <h2 id="mail-heading" className="font-display text-lg font-semibold text-ink-strong">
          Outbound email
        </h2>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          One message is ever sent automatically: a notification to{" "}
          <span className="numeric">{settings.ADMIN_EMAIL ?? "ADMIN_EMAIL"}</span> when a submission
          arrives. It carries no submitter data — only the type of enquiry and a link into the
          inbox. Submitters are never emailed; replying is a deliberate act from your own mailbox.
        </p>

        {status.configured ? (
          <div
            role="status"
            className="mt-5 rounded-lg border border-success-text/40 bg-success-bg p-4 text-sm text-success-text"
          >
            <p className="m-0 font-semibold">Configured.</p>
            <p className="m-0 mt-1.5 leading-relaxed">
              Every required value is present. That does not prove they are correct — send a test
              below to confirm the relay actually accepts them.
            </p>
          </div>
        ) : (
          <div
            role="status"
            className="mt-5 rounded-lg border border-alert-text/40 bg-alert-bg p-4 text-sm text-alert-text"
          >
            <p className="m-0 font-semibold">Not configured — nothing is being emailed.</p>
            <p className="m-0 mt-1.5 leading-relaxed">
              Submissions are still stored safely; the inbox is the only place you will see them.
              Missing: <span className="numeric">{status.missing.join(", ")}</span>.
            </p>
          </div>
        )}

        <MailForm fields={fields} />

        <h3 className="mt-10 font-display text-base font-semibold text-ink-strong">
          Test the relay
        </h3>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          The banner above only knows whether values are <em>present</em>. It cannot detect a wrong
          password, a sender the relay has not approved, or a relay that accepts a message and drops
          it — and from the inbox all three look identical to nobody having written in. This is the
          check that tells those apart, and it exercises what is saved here rather than what the
          server started with.
        </p>

        {status.configured ? (
          <TestMailButton recipient={settings.ADMIN_EMAIL} />
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Available once the settings above are complete. A test that can only fail teaches you to
            ignore it.
          </p>
        )}
      </section>
    </div>
  );
}
