/**
 * The two anti-bot gates every public form passes, as a pure decision.
 *
 * Split out of `submissions.ts` for the same reason `mergeMailSettings` is split
 * out of `mail-settings.ts` and `lockoutArm` out of `auth.ts`: that module
 * reaches for `next/headers` and the database, so the branch that decides
 * whether a person's message is thrown away had no test at all. It is a strange
 * thing to leave untested — it is the only code path on the site that can
 * discard a clinician's enquiry and tell them it was delivered.
 */

/**
 * Why the form is being dropped.
 *
 * `no-timestamp` is deliberately NOT folded into `too-fast`, though both mean
 * "the time-trap rejected this". They mean opposite things about who sent it:
 *
 *  - `too-fast` is a real stamp with an implausible fill duration. That is a bot.
 *  - `no-timestamp` means the field was never stamped. It renders as "0" and is
 *    set in a `useEffect`, so it is absent exactly when that effect has not run:
 *    JavaScript disabled, or a hydration failure. That is a person, and their
 *    message is being discarded.
 *
 * Collapsing the two would hide the only one worth acting on. A rising
 * `no-timestamp` count means the form is broken for real visitors, and until
 * now that was indistinguishable from nobody having written to us — the same
 * shape of silent failure the mail-settings panel was built to end.
 */
export type DropReason = "honeypot" | "no-timestamp" | "too-fast";

/** Faster than this = almost certainly a bot. */
export const MIN_FILL_MS = 2_500;

export interface DropInput {
  /** The honeypot field. Real users never see it, so any content is a bot. */
  honeypot: string | null;
  /** The render-time stamp the form carries, as it arrived over the wire. */
  stamp: string | null;
  /** Current time, injected so this stays pure and testable. */
  now: number;
}

/**
 * Returns the reason to drop the submission, or `null` to let it through.
 *
 * Order matters: the honeypot is checked first because a filled honeypot is
 * conclusive, while a missing stamp is ambiguous. A bot that both fills the
 * honeypot and omits the stamp should be recorded as the former.
 */
export function classifyDrop({ honeypot, stamp, now }: DropInput): DropReason | null {
  if (honeypot !== null && honeypot.length > 0) return "honeypot";

  const renderedAt = Number(stamp ?? 0);

  // Covers absent, empty, "0" and non-numeric — `Number("")` is 0 and
  // `Number("abc")` is NaN, and neither is a stamp a real form produced.
  if (!Number.isFinite(renderedAt) || renderedAt <= 0) return "no-timestamp";

  // A stamp in the future makes the elapsed time negative, which lands here.
  // That is the intended outcome: it means clock skew or a tampered field, and
  // neither should be treated as a genuine slow fill.
  if (now - renderedAt < MIN_FILL_MS) return "too-fast";

  return null;
}
