import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` (crimson) is the single most important action — once per screen. */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * `translate` is named alongside the colours because the 1px press is a
 * `translate` utility, and Tailwind v4 compiles those to the `translate`
 * property — `transition-colors` alone left the press snapping. Same class of
 * bug that made eight hover lifts inert across the site.
 *
 * `box-shadow` is here for the response glow below. Naming three properties is
 * still not `transition: all`, which stays banned: the point of the rule is
 * that a reader can see what moves.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-body font-semibold " +
  "transition-[color,background-color,border-color,box-shadow,translate] duration-150 " +
  "ease-[var(--motion-ease)] select-none motion-reduce:transition-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  /**
   * Hover keeps `accent-deep` (9.05:1 under white) and gains a crimson glow.
   * NOT `accent-bright`, which is the obvious-looking choice and fails: white
   * on #ea3a57 is 4.01:1, under the 4.5:1 this text size needs.
   */
  primary: "bg-accent text-ink-on-accent hover:bg-accent-deep hover:shadow-[var(--shadow-accent)]",
  // A button outline identifies a control, so it takes the 3:1 tier
  // (WCAG 1.4.11) rather than a tinted ink. Hover moves to the accent.
  //
  // The fill stays `surface-sunken/60` — about 1.04:1 against the raised
  // ground, so it is atmosphere and cannot be the cue. The border carries the
  // state, which is why it moves to full accent rather than a tint.
  secondary:
    "border border-border-strong bg-surface-raised text-ink-strong hover:border-accent hover:bg-surface-sunken/60 hover:shadow-[var(--shadow-accent)]",
  // Ghost has no border and no fill worth the name — accent-tint is 1.09:1 on
  // white. The ink darkening to full accent is the honest cue here, so it is
  // stated rather than left to a background nobody can see.
  ghost: "text-accent-deep hover:bg-accent-tint hover:text-accent",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-[15px]",
  sm: "min-h-9 px-3.5 text-sm",
};

/**
 * The button's classes, without the button.
 *
 * `<Button>` is used in exactly one place in this app — app/error.tsx — while
 * roughly a dozen real buttons are hand-rolled, each carrying its own copy of
 * "inline-flex min-h-11 items-center justify-center rounded-md bg-accent…".
 * That is why they had drifted apart and why improving the component alone
 * changed nothing anyone could see.
 *
 * Most of them cannot become `<Button>` and should not: several are `<Link>`,
 * several are form submits with their own pending state. Exporting the class
 * string lets every one of them share the same hover, press and focus
 * behaviour while staying whatever element it needs to be.
 */
export function buttonClasses(opts?: {
  // `| undefined` spelled out because exactOptionalPropertyTypes is on, and
  // Button forwards its own optional props straight through.
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}): string {
  const { variant = "secondary", size = "md", className } = opts ?? {};
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
