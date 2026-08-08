import "server-only";
import { db } from "@towardpcc/db";
// Relative, not the `@/` alias: vitest resolves only the `server-only` alias, so
// every module under the coverage gate stays importable from a unit test. The
// other gated modules avoid the alias for the same reason.
import { logger } from "../logger";
import {
  hashSessionId,
  isExpired,
  mintSessionId,
  SESSION_MAX_AGE_MS,
  shouldTouch,
} from "./session-rules";

/**
 * The server-side allow-list that makes an admin session revocable (SPC-TM-002).
 *
 * WHAT WAS BROKEN. Sessions were stateless JWTs with no server-side record, so
 * nothing could invalidate one. A stolen cookie stayed valid until it expired,
 * and the only lever was rotating AUTH_SECRET, which signs every operator out at
 * once. Worse, it did not reliably expire either: `@auth/core` re-signs the token
 * with a fresh `exp` on every session read, so whoever holds the cookie can renew
 * it indefinitely.
 *
 * WHY NOT THE AUTH.JS ADAPTER. `@auth/prisma-adapter` cannot do this job here —
 * it is not a dependency, it resolves `prisma.user` where the schema has
 * `AdminUser`, and Auth.js does not support database sessions on the Credentials
 * provider (ADR-admin-auth). A table shaped for it was written and withdrawn on
 * 2026-08-07 because it would have stayed permanently empty while the launch
 * blocker looked closed.
 *
 * SO THE JWT STAYS AND GAINS AN ALLOW-LIST. `authorize()` mints a random id and
 * writes a row; the id travels in the token; the `jwt` callback rejects a token
 * whose row is missing or expired. Revoking is deleting the row. Both halves of
 * SPC-TM-002 close: revocation works, and `expiresAt` is written once and never
 * extended, so the renew-forever path leads to a dead session after eight hours.
 */

/**
 * Record a new session and return the id to embed in the token.
 *
 * The raw id is returned once and never stored — only its hash goes to the
 * database, so a dump yields nothing usable.
 */
export async function createSession(params: {
  userId: string;
  ipHash?: string | undefined;
  userAgent?: string | undefined;
  now?: Date;
}): Promise<string> {
  const sessionId = mintSessionId();
  const now = params.now ?? new Date();
  await db.adminSession.create({
    data: {
      tokenHash: hashSessionId(sessionId),
      userId: params.userId,
      expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_MS),
      createdAt: now,
      lastSeenAt: now,
      ipHash: params.ipHash ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
  return sessionId;
}

/**
 * Is this token still allowed in? Called on every `auth()` read.
 *
 * Returns false for missing, revoked and expired alike — the caller must not be
 * able to tell them apart, and there is nothing useful it could do differently.
 *
 * A DATABASE FAILURE MUST DENY, NOT ALLOW. If this threw and the caller treated
 * the throw as "carry on", an unreachable database would silently disable the
 * whole control while every page still rendered. It is caught here and reported
 * as "not valid", which fails closed: the operator is sent to the login page,
 * which is visible and recoverable, rather than the alternative where revocation
 * quietly stops working and nothing says so.
 */
export async function isSessionValid(sessionId: string, now: Date = new Date()): Promise<boolean> {
  try {
    const row = await db.adminSession.findUnique({
      where: { tokenHash: hashSessionId(sessionId) },
      select: { id: true, expiresAt: true, lastSeenAt: true },
    });
    if (!row) return false;
    if (isExpired(row.expiresAt, now)) return false;

    if (shouldTouch(row.lastSeenAt, now)) {
      // Best effort. Losing a lastSeenAt write must never sign anyone out.
      await db.adminSession
        .update({ where: { id: row.id }, data: { lastSeenAt: now } })
        .catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sign-out. Idempotent: an already-deleted row is a success, not an error.
 *
 * THE FAILURE IS SWALLOWED BUT NOT SILENT, and the distinction is the point.
 * Sign-out must complete either way — leaving an operator staring at an error
 * page mid-logout is worse than the alternative. But if the DELETE fails, the
 * row survives and a captured cookie stays valid for up to eight hours while the
 * UI reports a clean sign-out. That is a control failing quietly, which is the
 * exact shape this project keeps finding in its own guards, so it is logged at
 * error like the audit-write failure in `auth.ts`.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await db.adminSession.deleteMany({ where: { tokenHash: hashSessionId(sessionId) } });
  } catch (error) {
    logger.error(
      { err: error },
      "SESSION REVOKE FAILED — sign-out reported success but the session row survives",
    );
  }
}
