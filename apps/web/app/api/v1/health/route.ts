export const dynamic = "force-dynamic";

/**
 * Liveness. Deliberately says almost nothing (SPC-API-005).
 *
 * This used to return the scoring engine's version, unauthenticated. That is
 * not a vulnerability on its own — no PII, no credentials — but it hands a
 * stranger a precise version string to match against a future advisory, and it
 * bought nothing, because nothing consumed it. The audit rated it
 * informational; the fix costs one line, so there was no reason to keep it.
 *
 * The version is still published where it belongs — on each calculator page,
 * next to the score it describes, which is where a clinician might actually
 * need it.
 *
 * Kept separate from `/api/v1/ready`, which checks the database. This one
 * answers "is the process alive", so a container healthcheck can restart a
 * wedged process without a database outage causing a restart loop.
 */
export function GET(): Response {
  return Response.json({ status: "ok" });
}
