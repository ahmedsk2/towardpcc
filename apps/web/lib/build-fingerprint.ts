import { createHash } from "node:crypto";

/**
 * An opaque fingerprint of the deployed commit, so a canary can detect a STALE
 * deploy without anyone learning which commit is running.
 *
 * THE PROBLEM IT SOLVES. A content canary cannot see a stale-but-healthy
 * deploy: the old container serves the old pages perfectly, every assertion
 * passes, and the only symptom is that a merge silently did not reach
 * production. That happened once for real, on 2026-08-03, and went unnoticed
 * until someone compared image tags by hand.
 *
 * WHY NOT JUST PUBLISH THE COMMIT. Because `/api/v1/health` deliberately says
 * almost nothing (SPC-API-005). It used to return the scoring engine's version
 * and that was removed — not because it was a vulnerability, but because it
 * handed a stranger a precise version string to match against a future
 * advisory, and nothing consumed it. A commit SHA is the same kind of string,
 * only sharper. Re-adding one to fix a monitoring gap would trade a real
 * decision for a convenience.
 *
 * SO THE CANARY COMPARES DIGESTS, NOT COMMITS. The site publishes
 * `sha256(commit)` truncated; the canary knows `origin/main`'s SHA and computes
 * the same digest. Equal means current, different means stale — and a stranger
 * holding the fingerprint learns nothing they could match against an advisory,
 * because the mapping only runs one way.
 *
 * Truncated to 16 hex characters — 64 bits. Far beyond collision range for the
 * one comparison it is used in, and short enough to eyeball in a log.
 */
export function buildFingerprint(): string {
  // Coolify injects SOURCE_COMMIT into the container; it is the same value as
  // the image tag. Absent in local dev and in tests, which is not an error —
  // there is no deploy to be stale.
  const commit = process.env.SOURCE_COMMIT?.trim();
  if (!commit) return "unknown";
  return fingerprintOf(commit);
}

/** Exported so the canary can derive the expected value from `origin/main`. */
export function fingerprintOf(commit: string): string {
  return createHash("sha256").update(commit.trim()).digest("hex").slice(0, 16);
}
