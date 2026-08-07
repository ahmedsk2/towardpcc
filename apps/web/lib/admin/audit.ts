import "server-only";
import { db, Prisma } from "@towardpcc/db";

/**
 * Append-only audit trail (PRD §9). The ONLY way admin code writes AuditLog —
 * always create(), never update/delete — so the trail is tamper-evident by
 * construction. `diff` should carry before/after of changed fields with any PII
 * redacted; `entity` is "table:id".
 */
export async function recordAudit(params: {
  /**
   * Null ONLY for an authentication event with no matching account — a failed
   * login against an address that does not exist. Every mutation carries a real
   * actor, and the database enforces that rather than trusting this comment:
   * `AuditLog_null_actor_is_auth_event` rejects a null actor on any action
   * outside the auth allow-list, so a caller that passes null here for a
   * mutation gets a constraint violation, not a silent unattributed row.
   */
  actorId: string | null;
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
