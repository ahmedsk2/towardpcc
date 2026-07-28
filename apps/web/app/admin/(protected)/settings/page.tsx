import { requireAdmin } from "@/lib/auth/guard";
import { env, mailConfigurationStatus } from "@/lib/mail-config";
import { TestMailButton } from "../test-mail-button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false, follow: false } };

/**
 * Mail configuration, shown but not editable.
 *
 * Not editable on purpose, and the page says so rather than leaving it as an
 * absence someone reads as an oversight. These values are environment
 * variables supplied by Coolify. A container cannot durably change its own
 * environment — an edit here would survive until the next deploy and then
 * silently revert, which is worse than no edit form at all, because it would
 * look like it had worked.
 *
 * What this page IS for: seeing what the running container actually resolved,
 * and proving the relay end to end. Before it existed, the only way to check
 * mail was to submit a fake enquiry through the public form and wait.
 *
 * The password is never read, never rendered, and never sent to the browser.
 * Only whether one is set.
 */
export default async function SettingsPage() {
  await requireAdmin();
  const status = mailConfigurationStatus();

  const host = env("SMTP_HOST");
  const rows: Array<{ label: string; value: string | undefined; secret?: boolean }> = [
    { label: "SMTP_HOST", value: host },
    { label: "SMTP_PORT", value: env("SMTP_PORT") ?? "587 (default)" },
    { label: "SMTP_SECURE", value: process.env.SMTP_SECURE === "true" ? "true" : "false" },
    { label: "SMTP_USER", value: env("SMTP_USER") },
    { label: "SMTP_PASSWORD", value: env("SMTP_PASSWORD") ? "set" : undefined, secret: true },
    { label: "MAIL_FROM", value: env("MAIL_FROM") },
    { label: "MAIL_REPLY_TO", value: env("MAIL_REPLY_TO") },
    { label: "ADMIN_EMAIL", value: env("ADMIN_EMAIL") },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink-strong">Settings</h1>

      <section aria-labelledby="mail-heading" className="mt-8">
        <h2 id="mail-heading" className="font-display text-lg font-semibold text-ink-strong">
          Outbound email
        </h2>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          One message is ever sent automatically: a notification to the address below when a
          submission arrives. It carries no submitter data — only the type of enquiry and a link
          into the inbox. Submitters are never emailed; replying is a deliberate act from your own
          mailbox.
        </p>

        {status.configured ? (
          <div
            role="status"
            className="mt-5 rounded-lg border border-success-text/40 bg-success-bg p-4 text-sm text-success-text"
          >
            <p className="m-0 font-semibold">Configured.</p>
            <p className="m-0 mt-1.5 leading-relaxed">
              The relay details below are complete. That does not prove they are correct — send a
              test to confirm the relay accepts them.
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

        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Mail settings as resolved by the running container
            </caption>
            <thead className="border-b border-border-subtle bg-surface-sunken/40 text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Setting
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border-subtle/60 last:border-0">
                  <td className="px-4 py-2.5 font-numeric text-xs text-ink-body">{r.label}</td>
                  <td className="px-4 py-2.5">
                    {r.value ? (
                      <span className="font-numeric text-xs text-ink-strong">{r.value}</span>
                    ) : (
                      <span className="font-numeric text-xs text-ink-muted">not set</span>
                    )}
                    {/* Stated explicitly so nobody wonders whether the password
                        is being displayed somewhere they cannot see. */}
                    {r.secret ? (
                      <span className="ml-2 text-xs text-ink-muted">(never displayed)</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          These are read-only here. They are environment variables set in Coolify, and a container
          cannot durably change its own environment — an edit on this page would last until the next
          deploy and then silently revert, which is worse than no edit form, because it would look
          like it had worked. To change them, edit the application&rsquo;s environment in Coolify
          and redeploy. The full procedure, including the order the DNS records must be published
          in, is in <span className="numeric">docs/runbooks/email-delivery.md</span>.
        </p>

        <h3 className="mt-8 font-display text-base font-semibold text-ink-strong">
          Test the relay
        </h3>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
          The banner above only knows whether values are <em>present</em>. It cannot detect a wrong
          password, a sender the relay has not approved, or a relay that accepts a message and drops
          it — and from the inbox all three look identical to nobody having written in. This is the
          check that tells those apart.
        </p>

        {status.configured ? (
          <TestMailButton recipient={env("ADMIN_EMAIL")} />
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Available once the settings above are complete. A test that can only fail teaches you to
            ignore it.
          </p>
        )}

        <p className="mt-6 max-w-[70ch] text-xs leading-relaxed text-ink-muted">
          One limitation worth knowing: the mail transport is built once when the container starts
          and caches the host, port and credentials. A test therefore exercises the configuration
          the container <em>booted with</em>. Changing them in Coolify triggers a redeploy, so in
          practice they agree — but a hot-edited variable will not be reflected here.
        </p>
      </section>
    </div>
  );
}
