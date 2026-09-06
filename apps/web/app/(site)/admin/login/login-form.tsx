"use client";

import { useActionState } from "react";
import { buttonClasses, cn } from "@towardpcc/ui";
import { loginAction, type LoginResult } from "./actions";

const field =
  "h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3.5 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginResult, FormData>(loginAction, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-ink-strong">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={field}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-ink-strong">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="token" className="text-sm font-medium text-ink-strong">
          Authenticator code
        </label>
        <input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          required
          className={cn(field, "numeric tracking-widest")}
        />
        <p className="text-[13px] text-ink-muted">
          Enter the 6-digit code from your authenticator, or a recovery code.
        </p>
      </div>

      {state?.ok === false && (
        <p role="alert" className="text-sm text-alert-text">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary" })}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
