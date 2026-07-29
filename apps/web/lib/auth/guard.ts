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

/**
 * Authorization for the actions an EDITOR must not perform.
 *
 * This existed and was never called, which made the two-tier model inert: every
 * protected page and action used `requireAdmin()` alone, so an EDITOR could do
 * everything an OWNER could (SPC-API-004). A role column that grants nothing is
 * worse than no role column — it reads like a control to whoever adds the
 * second account.
 *
 * Now enforced on the actions that touch a credential or send mail. Deliberately
 * NOT on submission triage or notes: an EDITOR exists precisely to work the
 * inbox, and locking that down would leave the tier with no purpose at all.
 *
 * Redirects rather than throwing, matching requireAdmin, so an EDITOR who
 * reaches an OWNER-only page lands somewhere useful instead of on an error.
 */
export async function requireRole(role: AdminRole) {
  const user = await requireAdmin();
  if (user.role !== role) redirect("/admin");
  return user;
}
