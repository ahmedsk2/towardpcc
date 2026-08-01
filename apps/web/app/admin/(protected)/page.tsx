import Link from "next/link";
import type { SubmissionStatus } from "@towardpcc/db";
import { db } from "@towardpcc/db";
import { requireAdmin } from "@/lib/auth/guard";
import { mailConfigurationStatus } from "@/lib/mail-config";
import { resolveMailSettings } from "@/lib/mail-settings";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
  payloadField,
} from "@/lib/admin/submission-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isStatus(v: string | undefined): v is SubmissionStatus {
  return !!v && (STATUS_ORDER as string[]).includes(v);
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = isStatus(status) ? status : undefined;

  const [submissions, counts] = await Promise.all([
    db.submission.findMany({
      where: filter ? { status: filter } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.submission.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (s: SubmissionStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + (c._count as number), 0);
  const mailStatus = mailConfigurationStatus(await resolveMailSettings());

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink-strong">Inbox</h1>

      {/* Outbound mail failing is invisible by design: a submission is stored
          first and the notification is best-effort, so a broken relay looks
          exactly like "nobody has written to us". This page is the one place
          the problem would actually be noticed, so it says so here. */}
      {mailStatus.configured ? null : (
        <div
          role="status"
          className="mt-5 rounded-lg border border-alert-text/40 bg-alert-bg p-4 text-sm text-alert-text"
        >
          <p className="m-0 font-semibold">Email notifications are not being sent.</p>
          <p className="m-0 mt-1.5 leading-relaxed">
            Submissions below are still being stored safely — but nothing is emailing you when one
            arrives, so this page is the only way to see them. Missing configuration:{" "}
            <span className="numeric">{mailStatus.missing.join(", ")}</span>.{" "}
            <Link
              href="/admin/settings"
              className="underline underline-offset-2 transition-[color] duration-150 ease-[var(--motion-ease)] hover:text-accent motion-reduce:transition-none"
            >
              See Settings
            </Link>
            .
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterTab href="/admin" active={!filter} label={`All (${total})`} />
        {STATUS_ORDER.map((s) => (
          <FilterTab
            key={s}
            href={`/admin?status=${s}`}
            active={filter === s}
            label={`${STATUS_LABELS[s]} (${countFor(s)})`}
          />
        ))}
      </div>

      {submissions.length === 0 ? (
        <p className="mt-10 text-ink-muted">No submissions{filter ? " with this status" : ""}.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-subtle bg-surface-sunken/40 text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Type
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  From
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Received
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b border-border-subtle/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/submissions/${s.id}`}
                      className="font-medium text-accent-deep hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {TYPE_LABELS[s.type]}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-body">
                    {payloadField(s.payload, "name") || "—"}
                    <span className="ml-2 font-numeric text-xs text-ink-muted">
                      {payloadField(s.payload, "email")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-numeric text-[11px] tracking-wide text-ink-muted uppercase">
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-numeric text-xs text-ink-muted">
                    {s.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-accent-tint px-3 py-1 text-sm font-semibold text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          : "rounded-full border border-border-strong px-3 py-1 text-sm text-ink-body hover:border-ink-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      }
    >
      {active && <span aria-hidden="true">✓ </span>}
      {label}
    </Link>
  );
}
