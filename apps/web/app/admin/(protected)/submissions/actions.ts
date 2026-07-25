"use server";

import { revalidatePath } from "next/cache";
import { db, type SubmissionStatus } from "@towardpcc/db";
import { recordAudit } from "@/lib/admin/audit";
import { payloadField, STATUS_ORDER } from "@/lib/admin/submission-view";
import { requireAdmin } from "@/lib/auth/guard";
import { sendSubmitterAcknowledgement } from "@/lib/email";

function isStatus(v: string): v is SubmissionStatus {
  return (STATUS_ORDER as string[]).includes(v);
}

/**
 * All submission mutations run through here (re-guarded server-side — never
 * trust the layout alone). Intents: "triage" (→ TRIAGED + acknowledge the
 * submitter), "notes" (save internal notes), or a status value. Every change is
 * written to the append-only audit log.
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
    const email = payloadField(before.payload, "email");
    let acknowledged = false;
    if (email) {
      try {
        await sendSubmitterAcknowledgement(email, before.type);
        acknowledged = true;
      } catch {
        // acknowledgement email is best-effort; triage still stands
      }
    }
    await recordAudit({
      actorId: admin.id,
      action: "SUBMISSION_TRIAGED",
      entity: `Submission:${id}`,
      diff: {
        status: { from: before.status, to: "TRIAGED" },
        acknowledgementEmailed: acknowledged,
      },
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
