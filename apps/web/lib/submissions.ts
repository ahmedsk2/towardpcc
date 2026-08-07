import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { db, type SubmissionType } from "@towardpcc/db";
import { resolveClientIp } from "@/lib/client-ip";
import { notifyAdminOfSubmission } from "@/lib/email";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { saltedHash } from "@/lib/salted-hash";
import { classifyDrop } from "@/lib/submission-guards";

/**
 * The one server-side path every public form goes through (PRD §9): Zod
 * validation, honeypot + time-trap, per-IP + global rate limiting, salted+
 * truncated IP hashing, then a single parameterized Prisma write. CSRF is
 * covered by using this only from Server Actions (Next checks Origin). The
 * submitter is NOT emailed here — acknowledgement waits until a human triages
 * (threat-model), so success just means "stored".
 */

// ── Per-type payload schemas ────────────────────────────────────────────────
const name = z.string().trim().min(1, "Please enter your name").max(100);
const email = z.string().trim().toLowerCase().email("Enter a valid email").max(200);
const message = z.string().trim().min(10, "Please add a little more detail").max(2000);
const org = z.string().trim().min(1).max(150);
const country = z.string().trim().min(1).max(80);

const schemas = {
  CONTACT: z.object({ name, email, message }),
  SERVICE: z.object({
    name,
    email,
    affiliation: org,
    message,
  }),
  KNOWLEDGE_PILOT: z.object({
    name,
    email,
    unit: org,
    country,
    message,
  }),
  DATA_INTEREST: z.object({
    name,
    email,
    institution: org,
    country,
    message,
  }),
} satisfies Record<SubmissionType, z.ZodType>;

export type SubmitResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

// ── Rate limiting (in-memory sliding window) ────────────────────────────────
// Single-instance store — fine for v1. A shared store (Redis) is needed once
// the app runs more than one replica; tracked for P8.
const PER_IP = { max: 5, windowMs: 10 * 60_000 };
// The global cap counts ONLY accepted submissions and is checked after the
// per-IP gate, so a per-IP-rejected flood can never saturate it and lock
// everyone out (the old design's DoS). It bounds DB writes under a distributed
// attack; a genuine legitimate surge above it just degrades gracefully.
const GLOBAL = { max: 300, windowMs: 10 * 60_000 };
const MAX_TRACKED_IPS = 20_000;

// Fail-closed sliding-window limiter (see lib/rate-limit.ts for the invariants +
// its unit tests). Per-instance state; single-replica only until a shared store
// lands (P8).
const limiter = createRateLimiter(PER_IP, GLOBAL, MAX_TRACKED_IPS);

// ── IP hashing (abuse forensics only, never identity) ───────────────────────
// The salt accessor and the HMAC itself moved to `lib/salted-hash.ts` when
// `auth.ts` needed the same construction for a different value (the address a
// failed login was attempted against). Same property, same guarantees — see that
// file for why the salt is load-bearing rather than decorative.

// Client IP for rate limiting and the salted abuse hash. The header precedence
// and the reasoning about why cf-connecting-ip can be trusted here live in
// lib/client-ip.ts — the previous comment on this function claimed production
// ran behind "a single reverse proxy", which stopped being true when
// Cloudflare went in front and is what kept the bug invisible.
async function clientIp(): Promise<string> {
  return resolveClientIp(await headers());
}

async function hashClientIp(): Promise<string> {
  return saltedHash(await clientIp());
}

/**
 * Validate + persist a submission. `formData` comes straight from a Server
 * Action. `type` is fixed by the calling form, never trusted from input.
 */
export async function handleSubmission(
  type: SubmissionType,
  formData: FormData,
): Promise<SubmitResult> {
  // Honeypot + time-trap. Both accept-and-drop: the caller gets `ok: true` and
  // no row is written, so a bot cannot tell a rejection from a delivery.
  //
  // That is the right design against bots and the wrong one against ourselves.
  // A dropped submission and a delivered one look identical from the outside,
  // which is also true from the inside if nothing records the drop — and until
  // now nothing did. A visitor whose JavaScript had not run submitted `t` at its
  // rendered default of "0", landed in this branch, saw the success panel, and
  // left. No row, no log, no count. The reasoning behind each reason, and why
  // `no-timestamp` is kept distinct from `too-fast`, is in submission-guards.ts.
  const drop = classifyDrop({
    honeypot: formData.get("website") as string | null,
    stamp: formData.get("t") as string | null,
    now: Date.now(),
  });
  if (drop) {
    // Reason only. Never the payload: a submission we deliberately refused to
    // store must not reappear in the log, which is the one place it would
    // outlive the decision not to keep it.
    logger.warn({ type, reason: drop }, "submission dropped");
    return { ok: true };
  }

  const ipHash = await hashClientIp();
  if (!limiter.check(ipHash, Date.now())) {
    logger.warn({ ipHash, type }, "submission rate-limited");
    return { ok: false, error: "Too many messages from here. Please try again in a few minutes." };
  }

  const raw = Object.fromEntries(
    Array.from(formData.entries()).filter(
      ([k, v]) => typeof v === "string" && !["website", "t"].includes(k),
    ),
  );
  const parsed = schemas[type].safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const created = await db.submission.create({
    data: { type, payload: parsed.data, ipHash },
  });
  logger.info({ submissionId: created.id, type }, "submission stored");
  // Best-effort admin ping — a mail failure must never fail the submission.
  try {
    await notifyAdminOfSubmission(type, created.id);
  } catch (err) {
    logger.error({ submissionId: created.id, err }, "admin notification email failed");
  }
  return { ok: true };
}
