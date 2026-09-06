import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * THE ONE BUTTON FAMILY (2026-09-06).
 *
 * Until this revision the site ran three idioms — marketing pills, square
 * outlined form buttons and underlined text resets — each with its own hover,
 * press and focus recipe. Every button and button-shaped link now takes its
 * classes from here, and `content/button-idiom.test.ts` fails the suite if the
 * primary fill is written anywhere else.
 *
 * Shape is pill in every variant. Inputs and cards stay soft-rectangle, so a
 * control you type into looks different from one you press.
 *
 * The primary fill is `--gradient-cta`, bounded to accent -> accent-deep
 * (white text 5.36:1 and 9.05:1). Hover slides the paint to its deeper end —
 * a `background-position` shift over a 160%-wide paint — adds the accent
 * glow and lifts 1px. Never `accent-bright`: white on it is 4.01:1.
 *
 * `translate` is named in the transition because the lift and the press are
 * `translate` utilities, which Tailwind v4 compiles to the `translate`
 * property; `background-position` because of the slide. Naming six
 * properties is still not `transition: all`.
 *
 * `className` ADDS, it does not override. `cn` is a plain join, so a utility
 * that conflicts with the base — `hidden` against `inline-flex`, another
 * radius, another padding — is decided by the stylesheet's order, not by
 * yours. Margins and responsive extras are fine; for a display or breakpoint
 * change, wrap the element and put the classes on the wrapper. The header CTA
 * learned this on 2026-09-06 (main-nav.tsx).
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "icon" | "on-dark" | "ghost-dark";
export type ButtonSize = "lg" | "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the single most important action — once per screen. */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  "group/btn inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold " +
  "select-none transition-[color,background-color,background-position,border-color,box-shadow,translate] " +
  "duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-cta [background-size:160%_100%] [background-position:0%_0%] text-ink-on-accent " +
    "hover:[background-position:100%_0%] hover:shadow-[var(--shadow-accent)] motion-safe:hover:-translate-y-px " +
    "focus-visible:outline-accent",
  // A button outline identifies a control, so it takes the 3:1 tier (WCAG
  // 1.4.11). The border carries the state and moves to full accent on hover.
  secondary:
    "border border-border-strong bg-surface-raised text-ink-strong " +
    "hover:border-accent hover:text-accent-deep hover:shadow-[var(--shadow-accent)] motion-safe:hover:-translate-y-px " +
    "focus-visible:outline-accent",
  // No border, no fill at rest. The tint on hover is 1.29:1 against white,
  // visible; the ink is already accent-deep (9.05:1) so it needs no change.
  // No lift and no glow on quiet or icon: a text action and a single glyph
  // are subordinate controls, and lifting them would rank them with the CTA.
  quiet: "text-accent-deep hover:bg-accent-tint focus-visible:outline-accent",
  // A 44px circle for a single glyph; give it an accessible name (aria-label
  // or an sr-only span).
  icon:
    "border border-border-strong bg-surface-raised text-ink-muted " +
    "hover:border-accent hover:text-accent focus-visible:outline-accent",
  // For the hero and the crimson CTA band: white on the gradient, tint on hover.
  "on-dark":
    "bg-surface-raised text-accent hover:bg-accent-tint hover:text-accent-deep " +
    "motion-safe:hover:-translate-y-px focus-visible:outline-coral",
  "ghost-dark":
    "border-2 border-white/50 text-ink-on-dark hover:border-white hover:bg-white/10 " +
    "motion-safe:hover:-translate-y-px focus-visible:outline-coral",
};

const sizes: Record<ButtonSize, string> = {
  lg: "min-h-12 px-6 text-[15px]",
  md: "min-h-11 px-5 text-[15px]",
  sm: "min-h-9 px-3.5 text-sm",
};

/** The icon variant is a circle: width matches the height of its size. */
const iconSizes: Record<ButtonSize, string> = {
  lg: "min-h-12 w-12 px-0",
  md: "min-h-11 w-11 px-0",
  sm: "min-h-9 w-9 px-0",
};

/**
 * The button's classes, without the button.
 *
 * Most buttons on the site are `<Link>`s or form submits with their own
 * pending state and cannot be `<Button>`; exporting the class string lets
 * every one of them share the same hover, press and focus behaviour while
 * staying whatever element it needs to be.
 */
export function buttonClasses(opts?: {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}): string {
  const { variant = "secondary", size = "md", className } = opts ?? {};
  const sizeClass = variant === "icon" ? iconSizes[size] : sizes[size];
  return cn(base, variants[variant], sizeClass, className);
}

/**
 * The travelling arrow for a primary or on-dark CTA. Sits inside the button
 * and moves 2px on hover (`translate-x-0.5`, the same step the nav's "All"
 * arrow already uses) via the `group/btn` on the base classes.
 */
export const buttonArrowClasses =
  "size-3.5 transition-[translate] duration-150 ease-[var(--motion-ease)] " +
  "group-hover/btn:translate-x-0.5 group-focus-visible/btn:translate-x-0.5 motion-reduce:transition-none";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
