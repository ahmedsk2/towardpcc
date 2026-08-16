"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginResult = { ok: false; error: string } | null;

/**
 * Login Server Action. On success signIn throws NEXT_REDIRECT (to /admin) which
 * must propagate; only auth failures are converted to a generic message — the
 * cause (bad password vs bad TOTP vs locked) is never revealed.
 */
export async function loginAction(_prev: LoginResult, formData: FormData): Promise<LoginResult> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      token: formData.get("token"),
      redirectTo: "/admin",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Invalid email, password, or code." };
    }
    throw error;
  }
}
