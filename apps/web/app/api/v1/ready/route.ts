import { db } from "@towardpcc/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Readiness (distinct from the liveness probe at /api/v1/health): confirms the
 * database is actually reachable, so a broken dependency returns 503 instead of
 * being handed traffic (prod-readiness OBS-07). The pool's statement/connection
 * timeouts (packages/db) bound a hung check. No input, no PII — just SELECT 1.
 */
export async function GET(): Promise<Response> {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
