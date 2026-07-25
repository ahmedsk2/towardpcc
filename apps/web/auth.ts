import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, type AdminRole } from "@towardpcc/db";
import { verifyPassword } from "@/lib/auth/password";
import { decryptSecret, matchRecoveryCode, verifyTotp } from "@/lib/auth/totp";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/**
 * Admin authentication (PRD §9): email + Argon2id password + MANDATORY TOTP
 * (or a single-use recovery code), with per-account lockout. JWT sessions in an
 * HttpOnly/SameSite=Lax cookie (Secure in prod, set by Auth.js). The authorize
 * callback runs in the Node runtime, so Prisma + WASM crypto are available.
 * Failures are deliberately indistinguishable to the caller (always null).
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
        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const passwordOk = await verifyPassword(password, user.passwordHash);
        let secondFactorOk = false;
        let usedRecoveryIndex = -1;
        if (passwordOk) {
          const secret = decryptSecret(user.totpSecret);
          if (verifyTotp(secret, token)) {
            secondFactorOk = true;
          } else {
            usedRecoveryIndex = matchRecoveryCode(token, user.totpRecoveryCodes);
            secondFactorOk = usedRecoveryIndex >= 0;
          }
        }

        if (passwordOk && secondFactorOk) {
          await db.adminUser.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              ...(usedRecoveryIndex >= 0
                ? {
                    totpRecoveryCodes: user.totpRecoveryCodes.filter(
                      (_, i) => i !== usedRecoveryIndex,
                    ),
                  }
                : {}),
            },
          });
          return { id: user.id, email: user.email, role: user.role };
        }

        const failed = user.failedLoginCount + 1;
        await db.adminUser.update({
          where: { id: user.id },
          data: {
            failedLoginCount: failed,
            lockedUntil:
              failed >= MAX_FAILED
                ? new Date(Date.now() + LOCK_MINUTES * 60_000)
                : user.lockedUntil,
          },
        });
        return null;
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
