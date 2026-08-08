import type { AdminRole } from "@towardpcc/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: AdminRole;
    /**
     * The server-side session id minted in `authorize()`, carried into the JWT
     * and checked against `AdminSession` on every read (SPC-TM-002). Optional
     * only because Auth.js's own `User` is shared with flows that never set it.
     */
    sid?: string;
  }
  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AdminRole;
    uid: string;
    /**
     * Optional on purpose. Tokens issued before the allow-list shipped carry no
     * `sid`, and the `jwt` callback refuses them rather than treating absence as
     * permission — typing it as required would hide that case at the type level
     * while it still occurs at runtime.
     */
    sid?: string;
  }
}
