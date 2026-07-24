import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-medium text-ink-strong", className)} {...props} />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-ink-muted/40 bg-surface-raised px-3.5",
        "text-ink-strong placeholder:text-ink-muted/70",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        "aria-invalid:border-alert-text",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  /** Guidance shown below the control. */
  helper?: string;
  /** Error message — rendered amber with a leading marker, never crimson. */
  error?: string;
  className?: string;
}

/** Label above control, helper/error below — PRD §9 form discipline. */
export function Field({ label, htmlFor, children, helper, error, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-sm text-alert-text" role="alert">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-alert-bg font-numeric text-[11px] font-medium"
          >
            !
          </span>
          {error}
        </p>
      ) : helper ? (
        <p className="text-sm text-ink-muted">{helper}</p>
      ) : null}
    </div>
  );
}
