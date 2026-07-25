import type { AdminRole } from "@towardpcc/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: AdminRole;
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
  }
}
