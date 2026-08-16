import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function AdminLoginPage() {
  // Already signed in → skip the form.
  const session = await auth();
  if (session?.user?.id) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[400px] flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-medium text-ink-strong">Admin sign in</h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        This area is for TowardPCC operators. Access requires a password and your authenticator.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </div>
  );
}
