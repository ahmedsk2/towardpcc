import "server-only";
import { redirect } from "next/navigation";
import type { AdminRole } from "@towardpcc/db";
import { auth } from "@/auth";

/**
 * Server-side authz for /admin (PRD §9: authz enforced server-side on every
 * admin handler). Call at the top of every protected admin layout, page, and
 * Server Action — never rely on the client. Redirects to the login page when
 * there is no valid session.
 */
export async function requireAdmin(): Promise<{ id: string; email: string; role: AdminRole }> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/admin/login");
  return { id: user.id, email: user.email ?? "", role: user.role };
}

export async function requireRole(role: AdminRole) {
  const user = await requireAdmin();
  if (user.role !== role) redirect("/admin");
  return user;
}
