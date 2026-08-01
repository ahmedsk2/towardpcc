"use client";

import { useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);
  /**
   * What the visitor typed, so a rejected submission does not throw it away.
   *
   * React RESETS an uncontrolled `<form action={fn}>` once the action settles —
   * including when it settles with validation errors. So a single bad character
   * in the email emptied every field, and a 230-character message was
   * unrecoverable. Captured on submit and replayed as `defaultValue` on the
   * next render, keyed so React rebuilds the inputs rather than reusing the
   * reset DOM nodes.
   */
  const [submitted, setSubmitted] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);

  /**
   * The render-time stamp the server's time-trap reads. Kept out of SSR so it
   * reflects when the human actually loaded the form.
   *
   * CAPTURED ONCE AND REPLAYED — never re-read from the clock. The trap asks
   * "did at least MIN_FILL_MS elapse between render and submit", so stamping
   * with `Date.now()` at submit time makes every submission look instantaneous
   * and drops all of them as `too-fast`. That is a different way to lose the
   * message, and it fails on the FIRST submit rather than the second.
   */
  const mountedAtRef = useRef(0);
  const stamp = useCallback(() => {
    if (renderedAtRef.current) renderedAtRef.current.value = String(mountedAtRef.current);
  }, []);
  useEffect(() => {
    mountedAtRef.current = Date.now();
    stamp();
  }, [stamp]);

  /**
   * RE-STAMP ON EVERY SUBMIT, because React puts the stamp back to its
   * `defaultValue` of "0" when it resets the form.
   *
   * This was a silent data-loss bug, and the worst kind: the second submission
   * from any page load — the ordinary mistype-then-correct path — arrived with
   * `t = "0"`, `classifyDrop` read that as `no-timestamp`, and `handleSubmission`
   * returned `{ ok: true }` from the accept-and-drop branch ABOVE the rate
   * limiter, above Zod, above the database write. The visitor was shown
   * "Message sent. Thank you." for a message that was never stored, never
   * emailed and never counted. An entirely empty form was accepted this way.
   *
   * Accept-and-drop is the right design against bots — a bot must not be able
   * to tell a rejection from a delivery — which is exactly why the stamp has to
   * be right for humans: everything downstream trusts it completely.
   *
   * Also captures the field values for the replay above. `useActionState` runs
   * the action after this handler, so both happen before the reset.
   */
  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      stamp();
      const data = new FormData(e.currentTarget);
      const next: Record<string, string> = {};
      for (const field of fields) next[field.name] = String(data.get(field.name) ?? "");
      setSubmitted(next);
      setAttempt((n) => n + 1);
    },
    [stamp, fields],
  );

  if (state?.ok) {
    return (
      <div role="status" className="rounded-lg border border-success-text/30 bg-success-bg/60 p-6">
        <h2 className="font-display text-xl font-medium text-ink-strong">{successTitle}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-body">{successBody}</p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
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
                // Keyed on the attempt count so React remounts the control and
                // honours the new defaultValue instead of keeping the node it
                // has just reset.
                key={attempt}
                id={id}
                name={field.name}
                defaultValue={submitted[field.name] ?? ""}
                rows={5}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                aria-invalid={err ? true : undefined}
                aria-describedby={describedBy}
                className={fieldClass}
              />
            ) : (
              <input
                key={attempt}
                id={id}
                name={field.name}
                defaultValue={submitted[field.name] ?? ""}
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
