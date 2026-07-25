import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { db, type SubmissionType } from "@towardpcc/db";
import { notifyAdminOfSubmission } from "@/lib/email";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";

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
const MIN_FILL_MS = 2_500; // faster than this = almost certainly a bot

// Fail-closed sliding-window limiter (see lib/rate-limit.ts for the invariants +
// its unit tests). Per-instance state; single-replica only until a shared store
// lands (P8).
const limiter = createRateLimiter(PER_IP, GLOBAL, MAX_TRACKED_IPS);

// ── IP hashing (abuse forensics only, never identity) ───────────────────────
function ipSalt(): string {
  const s = process.env.SUBMISSION_IP_SALT;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SUBMISSION_IP_SALT must be set (>=16 chars) in production");
  }
  return "dev-only-salt-not-for-production";
}

// Trusted-proxy client IP. Production runs behind a single reverse proxy that
// SETS x-real-ip to the connecting client (overwrite, not append). We trust
// that; if absent, fall back to the RIGHTMOST x-forwarded-for hop (the address
// our own proxy observed) — never the spoofable leftmost, attacker-controlled
// token (CWE-348).
async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length) return hops[hops.length - 1]!;
  }
  return "unknown";
}

async function hashClientIp(): Promise<string> {
  const ip = await clientIp();
  return createHmac("sha256", ipSalt()).update(ip).digest("hex").slice(0, 24);
}

/**
 * Validate + persist a submission. `formData` comes straight from a Server
 * Action. `type` is fixed by the calling form, never trusted from input.
 */
export async function handleSubmission(
  type: SubmissionType,
  formData: FormData,
): Promise<SubmitResult> {
  // Honeypot: a field real users never see; if filled, accept-and-drop so bots
  // get a success and no row is written.
  if ((formData.get("website") as string)?.length) return { ok: true };

  // Time-trap: forms carry the render time; an instant submit is a bot.
  const renderedAt = Number(formData.get("t") ?? 0);
  if (!renderedAt || Date.now() - renderedAt < MIN_FILL_MS) return { ok: true };

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
