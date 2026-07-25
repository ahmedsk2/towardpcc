import "server-only";
import { db, Prisma } from "@towardpcc/db";

/**
 * Append-only audit trail (PRD §9). The ONLY way admin code writes AuditLog —
 * always create(), never update/delete — so the trail is tamper-evident by
 * construction. `diff` should carry before/after of changed fields with any PII
 * redacted; `entity` is "table:id".
 */
export async function recordAudit(params: {
  actorId: string;
  action: string;
  entity: string;
  diff: Record<string, unknown>;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      diff: params.diff as Prisma.InputJsonValue,
    },
  });
}
