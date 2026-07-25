import {
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
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
        // border-edge: >=3:1 non-text contrast on both white and porcelain (WCAG 1.4.11)
        "h-11 w-full rounded-md border border-edge bg-surface-raised px-3.5",
        "text-ink-strong placeholder:text-ink-body/80",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
        "aria-invalid:border-alert-text",
        className,
      )}
      {...props}
    />
  );
}

type AriaControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

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

/**
 * Label above control, helper/error below (PRD §9 form discipline).
 * The message is programmatically associated: Field derives ids from
 * `htmlFor` and injects aria-describedby/aria-invalid into its child
 * control.
 */
export function Field({ label, htmlFor, children, helper, error, className }: FieldProps) {
  const messageId = error ? `${htmlFor}-error` : helper ? `${htmlFor}-helper` : undefined;
  const control =
    isValidElement(children) && messageId
      ? cloneElement(children as ReactElement<AriaControlProps>, {
          "aria-describedby": messageId,
          ...(error ? { "aria-invalid": true } : {}),
        })
      : children;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      {error ? (
        <p id={messageId} className="flex items-start gap-1.5 text-sm text-alert-text" role="alert">
          <span
            aria-hidden="true"
            className="numeric mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-alert-bg text-[11px] font-medium"
          >
            !
          </span>
          {error}
        </p>
      ) : helper ? (
        <p id={messageId} className="text-sm text-ink-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
