import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, type AdminRole, type AdminUser } from "@towardpcc/db";
import { resolveClientIp } from "@/lib/client-ip";
import { allowLoginAttempt } from "@/lib/auth/login-throttle";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  decryptSecret,
  hashRecoveryCode,
  matchRecoveryCode,
  verifyTotpStep,
} from "@/lib/auth/totp";
import { lockoutArm } from "@/lib/auth/lockout";
import { recordAudit } from "@/lib/admin/audit";
import { logger } from "@/lib/logger";
import { saltedHash } from "@/lib/salted-hash";

// A fixed dummy Argon2id hash (of a random string, computed once) so the
// no-such-user path runs a real verify and costs the same as a real login —
// closing the enumeration / password-correctness timing oracle.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString("hex"));
  return dummyHashPromise;
}

/** Why an attempt was rejected. Recorded for forensics, never returned to the caller. */
type FailureReason = "credentials" | "locked" | "totp-replay" | "concurrent";

/**
 * Record a rejected login — UNCONDITIONALLY, whether or not the address exists.
 *
 * THE UNCONDITIONAL PART IS THE WHOLE DESIGN. Until 2026-08-08 `AuditLog.actorId`
 * was a required FK, so a row could only be written when the account existed.
 * Auditing failures under that schema would have meant one extra INSERT on
 * attempts against REAL addresses and none against unknown ones — handing back
 * exactly the user-enumeration oracle the rest of `authorize()` is built to deny
 * (it runs Argon2id against a dummy hash when no user matches precisely so the
 * two paths cost the same). Making `actorId` nullable is what lets the write
 * happen on both paths, which is why the migration came first.
 *
 * SO DO NOT MAKE THIS CALL CONDITIONAL. Skipping it when `actorId` is null, or
 * short-circuiting it behind any test of whether the user exists, silently
 * restores the oracle — and it would restore it in the one shape no test would
 * notice, because both paths still return the same `null`.
 *
 * The attempted address is HASHED, never stored. It is attacker-controlled,
 * unbounded, and personal data, and the scheduled purge runs `--skip-audit`, so
 * a raw address written here would sit in an append-only table the app cannot
 * delete from until the 12-month retention sweep. The salted digest still
 * answers the only question worth asking of it — "is this the same address
 * again?" — without keeping the address.
 *
 * Row growth is bounded by the per-IP throttle above, which rejects before any
 * of this runs; that is what stops an attacker turning a cheap rejection into
 * unbounded writes.
 */
async function auditFailedLogin(
  actorId: string | null,
  attemptedHash: string,
  reason: FailureReason,
): Promise<null> {
  try {
    await recordAudit({
      actorId,
      // A CONSTANT, never derived from input: this string is on the CHECK
      // constraint's allow-list, and an unlisted action with a null actor throws.
      action: "admin.login.failed",
      entity: actorId ? `AdminUser:${actorId}` : `AdminUser:unknown:${attemptedHash}`,
      // No email, no password, no token — `reason` is a closed union, not user input.
      diff: { reason },
    });
  } catch (error) {
    // Mirrors `ok()`: a failed audit write must never change the outcome of the
    // login itself. Loud, because a trail that quietly stops recording is worse
    // than one that was never there.
    logger.error({ err: error, reason }, "AUDIT WRITE FAILED for failed admin login");
  }
  return null;
}

/** Atomic failure bump + lockout (avoids the lost-update lockout bypass). */
async function bumpFailure(userId: string): Promise<void> {
  const updated = await db.adminUser.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
  });
  // Re-arm on every threshold breach where the account is not currently locked,
  // so a stale (expired) lockedUntil can't permanently disable the throttle.
  const arm = lockoutArm(updated.failedLoginCount, updated.lockedUntil, new Date());
  if (arm) {
    await db.adminUser.update({ where: { id: userId }, data: arm });
  }
}

/**
 * Admin authentication (PRD §9): email + Argon2id password + MANDATORY TOTP (or
 * a single-use recovery code), per-account lockout, and TOTP anti-replay. JWT
 * sessions in an HttpOnly/SameSite=Lax cookie (Secure in prod). The authorize
 * callback runs in the Node runtime. Every failure returns null indistinguishably
 * and does password-independent work, so timing leaks nothing.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/admin/login" },
  trustHost: true,

  /**
   * The session cookie's Secure flag and `__Secure-` prefix, pinned rather than
   * inferred (SPC-WEB-003).
   *
   * Auth.js derives both from `X-Forwarded-Proto` when `trustHost` is set. That
   * worked because exactly one proxy chain existed and it set the header
   * correctly. It is no longer a safe thing to leave implicit: an OCI load
   * balancer now sits in front as a second possible path, and the failure mode
   * is silent and severe — a session cookie issued without `Secure`, under a
   * different name, on a login that appears to succeed and then does not stay
   * logged in. Nothing would log an error.
   *
   * Keyed off NODE_ENV rather than the header, so it cannot be influenced by a
   * request. Development stays plain so `http://localhost` still works — a
   * `__Secure-` cookie is rejected outright over http, which would make local
   * login impossible.
   */
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, token: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(creds?.password ?? "");
        const token = String(creds?.token ?? "").trim();
        if (!email || !password || !token) return null;

        // Per-IP throttle BEFORE any credential work (SPC-API-001). Argon2id is
        // deliberately expensive and runs on every attempt — including when no
        // user exists, to keep the timing flat — so an unthrottled endpoint is
        // a cheap way to burn the box's CPU, and the per-account lockout never
        // fires against a spray across many guessed addresses.
        //
        // Rejects exactly as a wrong password does: same `null`, no distinct
        // message, nothing the caller can use to tell "throttled" from
        // "incorrect" and therefore nothing that reveals which addresses exist.
        if (!allowLoginAttempt(resolveClientIp(await headers()))) {
          logger.warn({ throttled: true }, "admin login throttled");
          return null;
        }

        const user = await db.adminUser.findUnique({ where: { email } });
        const locked = !!(user?.lockedUntil && user.lockedUntil > new Date());

        // Always run a verify (dummy hash if no user) — constant-cost path.
        const passwordOk = await verifyPassword(
          password,
          user?.passwordHash ?? (await dummyHash()),
        );

        // Always evaluate the second factor too (only meaningful when a user exists).
        let totpStep: number | null = null;
        let recoveryHash: string | null = null;
        if (user) {
          /**
           * A sealed secret that will not open must fail THIS attempt, not the
           * whole login path.
           *
           * `decryptSecret` threw straight out of `authorize()` before, and the
           * consequence was specific and bad: `TOTP_ENC_KEY` is the key for the
           * TOTP secret but NOT for the recovery codes, which are hashed. So a
           * rotated or mis-provisioned key took down the one credential that
           * could still have worked, because the throw happened on the line
           * above the recovery-code branch. That turned a recoverable
           * misconfiguration into a total lockout with no way back except
           * direct database access.
           *
           * Logged at error, not warn: a box that will not open is an
           * operational fault, never a wrong password.
           */
          try {
            totpStep = verifyTotpStep(decryptSecret(user.totpSecret), token);
          } catch {
            totpStep = null;
            logger.error(
              "totp secret failed to decrypt — check TOTP_ENC_KEY; recovery codes still work",
            );
          }
          if (totpStep === null && matchRecoveryCode(token, user.totpRecoveryCodes) >= 0) {
            recoveryHash = hashRecoveryCode(token);
          }
        }
        const secondFactorOk = totpStep !== null || recoveryHash !== null;

        // Computed on every path, not just the failing one, so the hashing cost
        // is identical for a real and an unknown address.
        const attemptedHash = saltedHash(email);

        if (!user || locked || !passwordOk || !secondFactorOk) {
          if (user && !locked) await bumpFailure(user.id);
          logger.warn({ locked }, "admin login failed");
          return await auditFailedLogin(
            user?.id ?? null,
            attemptedHash,
            locked ? "locked" : "credentials",
          );
        }

        /**
         * The single success funnel for both second-factor paths.
         *
         * Failures are recorded too, by `auditFailedLogin` above — read the note
         * there before changing either, because the two halves are load-bearing
         * together. The comment that stood here until 2026-08-08 explained at
         * length why failures COULD NOT be audited: `AuditLog.actorId` was a
         * required FK, so a row could only exist when the account did, and
         * writing one would have leaked which addresses are real. That is no
         * longer true — the column is nullable as of
         * `20260808120000_audit_nullable_actor`, specifically so the failure
         * write happens on both paths and the timing stays flat.
         *
         * WHICH FACTOR WAS USED IS RECORDED. A recovery-code login is a rare
         * event that should be visible afterwards — it means the authenticator
         * was unavailable — and the remaining count makes depletion legible
         * before it becomes a lockout.
         */
        const ok = async (u: AdminUser, method: "totp" | "recovery-code", remaining?: number) => {
          logger.info({ userId: u.id, method }, "admin login");
          try {
            await recordAudit({
              actorId: u.id,
              action: "admin.login",
              entity: `AdminUser:${u.id}`,
              // No email, no code, no token — the model's contract is that
              // `diff` carries changed fields with PII redacted.
              diff:
                remaining === undefined
                  ? { method, role: u.role }
                  : { method, role: u.role, recoveryCodesRemaining: remaining },
            });
          } catch (error) {
            // A failed audit write must not lock the only operator out of the
            // platform, so this proceeds — but loudly, because a trail that
            // silently stops recording is worse than one that was never there.
            logger.error({ err: error, userId: u.id }, "AUDIT WRITE FAILED for admin login");
          }
          return { id: u.id, email: u.email, role: u.role };
        };
        const resetData = { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() };

        if (totpStep !== null) {
          // Replay guard: reject a step already consumed.
          if (user.lastTotpStep !== null && BigInt(totpStep) <= user.lastTotpStep) {
            await bumpFailure(user.id);
            // Worth its own reason: a replayed step means a correct code arrived
            // twice, which is a captured code rather than a guess.
            return await auditFailedLogin(user.id, attemptedHash, "totp-replay");
          }
          // Atomic: only succeed if no concurrent login consumed this step first.
          const res = await db.adminUser.updateMany({
            where: {
              id: user.id,
              OR: [{ lastTotpStep: null }, { lastTotpStep: { lt: BigInt(totpStep) } }],
            },
            data: { ...resetData, lastTotpStep: BigInt(totpStep) },
          });
          return res.count === 1
            ? await ok(user, "totp")
            : await auditFailedLogin(user.id, attemptedHash, "concurrent");
        }

        // Recovery-code path — atomic single-use via a `has` guard.
        const surviving = user.totpRecoveryCodes.filter((h) => h !== recoveryHash);
        const res = await db.adminUser.updateMany({
          where: { id: user.id, totpRecoveryCodes: { has: recoveryHash! } },
          data: { ...resetData, totpRecoveryCodes: surviving },
        });
        return res.count === 1
          ? await ok(user, "recovery-code", surviving.length)
          : await auditFailedLogin(user.id, attemptedHash, "concurrent");
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as AdminRole;
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
});
