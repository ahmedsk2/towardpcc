"use client";

import { useActionState } from "react";
import { buttonClasses } from "@towardpcc/ui";
import { sendTestEmail, type TestMailState } from "./mail-actions";

/**
 * Client component only because the result has to be shown.
 *
 * Every other admin action returns void and relies on revalidation, which is
 * right for a mutation whose effect is visible on the page. A test send has no
 * visible effect anywhere — the whole point is the outcome — so it uses the
 * `useActionState` shape that login already uses.
 */
export function TestMailButton({ recipient }: { recipient: string | undefined }) {
  const [state, action, pending] = useActionState<TestMailState, FormData>(sendTestEmail, null);

  return (
    <div className="mt-4">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className={buttonClasses({ variant: "secondary" })}
        >
          {pending ? "Sending…" : "Send a test email"}
        </button>
      </form>

      <p className="mt-2 text-sm text-ink-muted">
        {/* Named explicitly so it is obvious there is no recipient to choose.
            A reader who cannot see where it goes will assume it goes wherever
            they type, which is the feature this deliberately does not have. */}
        Sends a fixed message to{" "}
        <span className="numeric">{recipient ?? "ADMIN_EMAIL (not set)"}</span>. It contains nothing
        about any submission.
      </p>

      {state ? (
        <p
          role="status"
          className={`mt-2 text-sm leading-relaxed ${state.ok ? "text-success-text" : "text-alert-text"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
