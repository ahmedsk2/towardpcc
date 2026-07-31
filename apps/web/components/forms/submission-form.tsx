"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { buttonClasses, cn } from "@towardpcc/ui";
import { site } from "@/content/site";
import type { SubmitResult } from "@/lib/submissions";

export type FormField = {
  name: string;
  label: string;
  type?: "text" | "email" | "textarea";
  autoComplete?: string;
  placeholder?: string;
};

type FormAction = (prev: SubmitResult | null, formData: FormData) => Promise<SubmitResult>;

const f = site.forms;

/**
 * The shared client shell for every pillar form (PRD §8.4: each form states
 * what's collected, why, where, and links to the policy). Progressive-
 * enhancement friendly: it posts a Server Action (CSRF-safe), carries the
 * honeypot + time-trap the server checks, and swaps to a success panel when the
 * submission is stored — no inputs are ever sent anywhere but our own server.
 */
export function SubmissionForm({
  action,
  fields,
  submitLabel,
  privacyLine,
  successTitle,
  successBody,
}: {
  action: FormAction;
  fields: readonly FormField[];
  submitLabel: string;
  privacyLine: string;
  successTitle: string;
  successBody: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const baseId = useId();
  const renderedAtRef = useRef<HTMLInputElement>(null);

  // Stamp the render time on mount (the server's time-trap reads it). Kept out
  // of SSR so it reflects when the human actually loaded the form.
  useEffect(() => {
    if (renderedAtRef.current) renderedAtRef.current.value = String(Date.now());
  }, []);

  if (state?.ok) {
    return (
      <div role="status" className="rounded-lg border border-success-text/30 bg-success-bg/60 p-6">
        <h2 className="font-display text-xl font-medium text-ink-strong">{successTitle}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-body">{successBody}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {fields.map((field) => {
        const id = `${baseId}-${field.name}`;
        const err = state && !state.ok ? state.fieldErrors?.[field.name] : undefined;
        const describedBy = err ? `${id}-error` : undefined;
        return (
          <div key={field.name} className="flex flex-col gap-2">
            <label htmlFor={id} className="text-sm font-medium text-ink-strong">
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={id}
                name={field.name}
                rows={5}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={fieldClass}
              />
            ) : (
              <input
                id={id}
                name={field.name}
                type={field.type ?? "text"}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={cn(fieldClass, "h-11")}
              />
            )}
            {err && (
              <p id={`${id}-error`} className="text-sm text-alert-text" role="alert">
                {err}
              </p>
            )}
          </div>
        );
      })}

      {/* Honeypot — visually and programmatically hidden from real users:
          aria-hidden on the wrapper, tabIndex -1 and autoComplete off on the
          input, moved off-screen rather than display:none because display:none
          is trivially detected by the bots this exists to catch.

          The label is a plausible field name, not an instruction. It used to
          read "Do not fill this in", which stays out of the a11y tree but does
          surface in text extraction and reader mode — telling any scraper
          reading the DOM exactly which field to skip, i.e. handing the trap its
          own answer key. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${baseId}-website`}>Website</label>
        <input
          id={`${baseId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input ref={renderedAtRef} name="t" type="hidden" defaultValue="0" />

      {state && !state.ok && !state.fieldErrors && (
        <p className="text-sm text-alert-text" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={pending}
          // Shares the primary button's classes rather than carrying its own
          // copy. This one had drifted to `disabled:opacity-60` against the
          // shared `disabled:opacity-50`, and had no press or glow at all.
          className={buttonClasses({ variant: "primary", className: "disabled:opacity-60" })}
        >
          {pending ? f.sending : submitLabel}
        </button>
        <p className="text-[13px] leading-relaxed text-ink-muted">{privacyLine}</p>
      </div>
    </form>
  );
}

const fieldClass =
  "w-full rounded-md border border-border-strong bg-surface-raised px-3.5 py-2.5 text-ink-strong placeholder:text-ink-body/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent aria-invalid:border-alert-text";
