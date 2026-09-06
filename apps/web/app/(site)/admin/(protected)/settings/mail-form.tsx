"use client";

import { useActionState } from "react";
import { buttonClasses } from "@towardpcc/ui";
import { saveSettings, type SaveSettingsState } from "../mail-actions";

export type Field = {
  key: string;
  label: string;
  hint: string;
  /** Present in the store, so the field has a saved value backing it. */
  value: string;
  /** Never round-trips a value to the browser; renders as a password input. */
  secret?: boolean;
  /** The value came from the environment, not from a saved override. */
  fromEnv?: boolean;
};

/**
 * The mail relay form.
 *
 * Deliberately plain inputs rather than a validated schema on the client: the
 * server is the only place validation can be trusted, and a client-side rule
 * that rejects an unusual-but-correct relay hostname would leave an operator
 * unable to configure their own mail with no way around it.
 */
export function MailForm({ fields }: { fields: readonly Field[] }) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(saveSettings, null);

  return (
    <form action={action} className="mt-6">
      <div className="grid gap-5">
        {fields.map((f) => (
          <div key={f.key}>
            <label
              htmlFor={f.key}
              className="block font-numeric text-xs font-semibold text-ink-strong"
            >
              {f.label}
            </label>
            <input
              id={f.key}
              name={f.key}
              type={f.secret ? "password" : "text"}
              // A saved password is never sent to the browser. The placeholder
              // is what tells the operator one exists, so an empty box does not
              // read as "no password set" and invite a needless re-entry.
              defaultValue={f.secret ? "" : f.value}
              placeholder={f.secret && f.value ? "•••••••• (saved — leave blank to keep)" : ""}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 block w-full max-w-[36rem] rounded-md border border-border-strong bg-surface-raised px-3 py-2 font-numeric text-sm text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            />
            <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-ink-muted">
              {f.hint}
              {f.fromEnv ? (
                <>
                  {" "}
                  <span className="text-ink-body">
                    Currently coming from the server environment; saving here overrides it.
                  </span>
                </>
              ) : null}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary" })}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        <p className="text-xs text-ink-muted">
          Clearing a field removes the override and falls back to the server environment.
        </p>
      </div>

      {state ? (
        <p
          role="status"
          className={`mt-3 text-sm leading-relaxed ${state.ok ? "text-success-text" : "text-alert-text"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
