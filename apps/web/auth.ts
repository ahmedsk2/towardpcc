import { randomBytes } from "node:crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, type AdminRole, type AdminUser } from "@towardpcc/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  decryptSecret,
  hashRecoveryCode,
  matchRecoveryCode,
  verifyTotpStep,
} from "@/lib/auth/totp";
import { logger } from "@/lib/logger";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

// A fixed dummy Argon2id hash (of a random string, computed once) so the
// no-such-user path runs a real verify and costs the same as a real login —
// closing the enumeration / password-correctness timing oracle.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(randomBytes(24).toString("hex"));
  return dummyHashPromise;
}

/** Atomic failure bump + lockout (avoids the lost-update lockout bypass). */
async function bumpFailure(userId: string): Promise<void> {
  const updated = await db.adminUser.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
  });
  if (updated.failedLoginCount >= MAX_FAILED && !updated.lockedUntil) {
    await db.adminUser.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
    });
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
          totpStep = verifyTotpStep(decryptSecret(user.totpSecret), token);
          if (totpStep === null && matchRecoveryCode(token, user.totpRecoveryCodes) >= 0) {
            recoveryHash = hashRecoveryCode(token);
          }
        }
        const secondFactorOk = totpStep !== null || recoveryHash !== null;

        if (!user || locked || !passwordOk || !secondFactorOk) {
          if (user && !locked) await bumpFailure(user.id);
          logger.warn({ locked }, "admin login failed");
          return null;
        }

        const ok = (u: AdminUser) => {
          logger.info({ userId: u.id }, "admin login");
          return { id: u.id, email: u.email, role: u.role };
        };
        const resetData = { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() };

        if (totpStep !== null) {
          // Replay guard: reject a step already consumed.
          if (user.lastTotpStep !== null && BigInt(totpStep) <= user.lastTotpStep) {
            await bumpFailure(user.id);
            return null;
          }
          // Atomic: only succeed if no concurrent login consumed this step first.
          const res = await db.adminUser.updateMany({
            where: {
              id: user.id,
              OR: [{ lastTotpStep: null }, { lastTotpStep: { lt: BigInt(totpStep) } }],
            },
            data: { ...resetData, lastTotpStep: BigInt(totpStep) },
          });
          return res.count === 1 ? ok(user) : null;
        }

        // Recovery-code path — atomic single-use via a `has` guard.
        const res = await db.adminUser.updateMany({
          where: { id: user.id, totpRecoveryCodes: { has: recoveryHash! } },
          data: {
            ...resetData,
            totpRecoveryCodes: user.totpRecoveryCodes.filter((h) => h !== recoveryHash),
          },
        });
        return res.count === 1 ? ok(user) : null;
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
