import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { db, type SubmissionType } from "@towardpcc/db";
import { notifyAdminOfSubmission } from "@/lib/email";

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
// the app runs more than one replica; tracked for P8. Bounded to avoid growth.
const PER_IP = { max: 5, windowMs: 10 * 60_000 };
const GLOBAL = { max: 200, windowMs: 10 * 60_000 };
const MIN_FILL_MS = 2_500; // faster than this = almost certainly a bot

const ipHits = new Map<string, number[]>();
let globalHits: number[] = [];

function withinLimit(store: number[], now: number, cfg: { max: number; windowMs: number }) {
  const fresh = store.filter((t) => now - t < cfg.windowMs);
  fresh.push(now);
  return { ok: fresh.length <= cfg.max, fresh };
}

function rateLimit(ipHash: string, now: number): boolean {
  const g = withinLimit(globalHits, now, GLOBAL);
  globalHits = g.fresh;
  if (ipHits.size > 5000) ipHits.clear(); // hard cap on map growth
  const perIp = withinLimit(ipHits.get(ipHash) ?? [], now, PER_IP);
  ipHits.set(ipHash, perIp.fresh);
  return g.ok && perIp.ok;
}

// ── IP hashing (abuse forensics only, never identity) ───────────────────────
async function hashClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip"))?.trim() || "unknown";
  const salt = process.env.SUBMISSION_IP_SALT ?? "dev-only-salt-set-in-prod";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
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
  if (!rateLimit(ipHash, Date.now())) {
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
  // Best-effort admin ping — a mail failure must never fail the submission.
  try {
    await notifyAdminOfSubmission(type, created.id);
  } catch {
    // swallow — the submission is stored; the operator will see it in the inbox
  }
  return { ok: true };
}
