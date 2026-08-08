import { buildFingerprint } from "@/lib/build-fingerprint";

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
  /**
   * The BODY is unchanged, deliberately — SPC-API-005 above still holds and the
   * container healthcheck still reads `{"status":"ok"}`.
   *
   * The build fingerprint goes in a HEADER instead, and it is a digest rather
   * than the commit itself, so this route still tells a stranger nothing about
   * which version is running. See `lib/build-fingerprint.ts` for why a stale
   * deploy is invisible to a content canary and why the comparison is done on
   * digests.
   */
  return Response.json(
    { status: "ok" },
    { headers: { "x-build-fingerprint": buildFingerprint() } },
  );
}
