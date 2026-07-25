import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@towardpcc/db";
import { requireAdmin } from "@/lib/auth/guard";
import {
  payloadEntries,
  STATUS_LABELS,
  STATUS_ORDER,
  TYPE_LABELS,
} from "@/lib/admin/submission-view";
import { submissionAction } from "../actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const s = await db.submission.findUnique({ where: { id } });
  if (!s) notFound();

  const audit = await db.auditLog.findMany({
    where: { entity: `Submission:${id}` },
    orderBy: { ts: "desc" },
    take: 20,
    include: { actor: { select: { email: true } } },
  });

  return (
    <div className="max-w-[760px]">
      <Link href="/admin" className="text-sm text-accent-deep hover:text-accent">
        ← Inbox
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-medium text-ink-strong">{TYPE_LABELS[s.type]}</h1>
        <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-numeric text-[11px] tracking-wide text-ink-body uppercase">
          {STATUS_LABELS[s.status]}
        </span>
      </div>
      <p className="mt-1 font-numeric text-xs text-ink-muted">
        Received {s.createdAt.toISOString().replace("T", " ").slice(0, 16)} · ip{" "}
        {s.ipHash?.slice(0, 10) ?? "—"}
      </p>

      {/* Submitted content — plain text, React-escaped (no dangerouslySetInnerHTML). */}
      <dl className="mt-6 divide-y divide-surface-sunken rounded-lg border border-surface-sunken">
        {payloadEntries(s.payload).map((e) => (
          <div key={e.key} className="grid grid-cols-[130px_1fr] gap-3 px-4 py-3">
            <dt className="font-numeric text-xs text-ink-muted uppercase">{e.key}</dt>
            <dd className="text-[15px] whitespace-pre-wrap text-ink-body">{e.value}</dd>
          </div>
        ))}
      </dl>

      {/* Triage: sends the submitter acknowledgement (only from NEW). */}
      {s.status === "NEW" && (
        <form action={submissionAction} className="mt-6">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="intent" value="triage" />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-[15px] font-semibold text-ink-on-accent hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Triage &amp; acknowledge submitter
          </button>
        </form>
      )}

      {/* Status controls */}
      <div className="mt-8">
        <h2 className="font-numeric text-xs tracking-wide text-ink-muted uppercase">Set status</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_ORDER.map((st) => (
            <form key={st} action={submissionAction}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="intent" value={st} />
              <button
                type="submit"
                disabled={st === s.status}
                className="rounded-md border border-edge px-3 py-1.5 text-sm text-ink-strong hover:bg-surface-sunken/60 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {STATUS_LABELS[st]}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Internal notes — admin-only, never shown to the submitter. */}
      <form action={submissionAction} className="mt-8">
        <input type="hidden" name="id" value={s.id} />
        <input type="hidden" name="intent" value="notes" />
        <label
          htmlFor="notes"
          className="font-numeric text-xs tracking-wide text-ink-muted uppercase"
        >
          Internal notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={s.internalNotes ?? ""}
          className="mt-2 w-full rounded-md border border-edge bg-surface-raised px-3.5 py-2.5 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
        <button
          type="submit"
          className="mt-2 rounded-md border border-edge px-4 py-2 text-sm font-medium text-ink-strong hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Save notes
        </button>
      </form>

      {/* Audit trail for this submission */}
      <div className="mt-10">
        <h2 className="font-numeric text-xs tracking-wide text-ink-muted uppercase">History</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {audit.length === 0 && <li className="text-sm text-ink-muted">No changes yet.</li>}
          {audit.map((a) => (
            <li key={a.id} className="font-numeric text-xs text-ink-muted">
              {a.ts.toISOString().replace("T", " ").slice(0, 16)} · {a.action} · {a.actor.email}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
