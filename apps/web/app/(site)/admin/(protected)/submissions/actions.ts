"use server";

import { revalidatePath } from "next/cache";
import { db, type SubmissionStatus } from "@towardpcc/db";
import { recordAudit } from "@/lib/admin/audit";
import { STATUS_ORDER } from "@/lib/admin/submission-view";
import { requireAdmin } from "@/lib/auth/guard";

function isStatus(v: string): v is SubmissionStatus {
  return (STATUS_ORDER as string[]).includes(v);
}

/**
 * All submission mutations run through here (re-guarded server-side — never
 * trust the layout alone). Intents: "triage" (→ TRIAGED), "notes" (save
 * internal notes), or a status value. Every change is written to the
 * append-only audit log.
 *
 * Triage no longer emails the submitter. See ADR-0004: mail delivered to a
 * recipient-chosen mailbox leaves Saudi Arabia by construction, and no relay
 * choice changes that — so the acknowledgement was the one path that made
 * "nothing is processed outside KSA" impossible to state without a caveat.
 * Dropping it also retires the whole TM-002 surface, since the app can no
 * longer be induced to send anything to an address an untrusted party chose.
 */
export async function submissionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  if (!id) return;

  const before = await db.submission.findUnique({ where: { id } });
  if (!before) return;

  if (intent === "notes") {
    const notes = String(formData.get("notes") ?? "").slice(0, 5000);
    await db.submission.update({ where: { id }, data: { internalNotes: notes } });
    await recordAudit({
      actorId: admin.id,
      action: "SUBMISSION_NOTES_EDITED",
      entity: `Submission:${id}`,
      diff: { notes: "updated" },
    });
  } else if (intent === "triage") {
    if (before.status !== "NEW") return;
    await db.submission.update({
      where: { id },
      data: { status: "TRIAGED", triagedById: admin.id },
    });
    await recordAudit({
      actorId: admin.id,
      action: "SUBMISSION_TRIAGED",
      entity: `Submission:${id}`,
      diff: { status: { from: before.status, to: "TRIAGED" } },
    });
  } else if (isStatus(intent)) {
    await db.submission.update({ where: { id }, data: { status: intent } });
    await recordAudit({
      actorId: admin.id,
      action: "SUBMISSION_STATUS_CHANGED",
      entity: `Submission:${id}`,
      diff: { status: { from: before.status, to: intent } },
    });
  } else {
    return;
  }

  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath("/admin");
}
