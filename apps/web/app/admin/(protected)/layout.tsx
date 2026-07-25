import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guard";
import { signOutAction } from "./actions";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-dvh bg-surface-page">
      <header className="border-b border-surface-sunken bg-surface-raised">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-6 py-3">
          <nav className="flex items-center gap-5" aria-label="Admin">
            <Link
              href="/admin"
              className="rounded-sm font-display text-sm font-semibold text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              TowardPCC admin
            </Link>
            <Link
              href="/admin"
              className="rounded-sm text-sm text-ink-body hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Inbox
            </Link>
            <Link
              href="/admin/calculators"
              className="rounded-sm text-sm text-ink-body hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Calculators
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="font-numeric text-xs text-ink-muted">{user.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-edge px-3 py-1.5 text-sm font-medium text-ink-strong hover:bg-surface-sunken/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-6 py-8">{children}</main>
    </div>
  );
}
