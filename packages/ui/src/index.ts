/**
 * TowardPCC design system — Pulse Crimson.
 * Token values live in tokens.css (single source of truth); this module
 * exposes the typed token surface and the core primitives.
 */
export const tokens = {
  surfaceHero: "var(--color-surface-hero)",
  surfaceHeroRaised: "var(--color-surface-hero-raised)",
  surfacePage: "var(--color-surface-page)",
  surfaceRaised: "var(--color-surface-raised)",
  surfaceSunken: "var(--color-surface-sunken)",
  inkStrong: "var(--color-ink-strong)",
  inkBody: "var(--color-ink-body)",
  inkMuted: "var(--color-ink-muted)",
  inkOnDark: "var(--color-ink-on-dark)",
  accent: "var(--color-accent)",
  accentDeep: "var(--color-accent-deep)",
  accentBright: "var(--color-accent-bright)",
  accentTint: "var(--color-accent-tint)",
  coral: "var(--color-coral)",
  coralSoft: "var(--color-coral-soft)",
  peach: "var(--color-peach)",
  gradientHero: "var(--gradient-hero)",
  gradientAccent: "var(--gradient-accent)",
  gradientSoft: "var(--gradient-soft)",
  alertText: "var(--color-alert-text)",
  alertBg: "var(--color-alert-bg)",
  successText: "var(--color-success-text)",
  successBg: "var(--color-success-bg)",
} as const;

export type TokenName = keyof typeof tokens;

export { cn } from "./cn";
export {
  Button,
  buttonArrowClasses,
  buttonClasses,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "./button";
export { Card } from "./card";
export { StatusChip, type StatusChipProps } from "./status-chip";
export { Label, Input, Field, type FieldProps } from "./field";
export { Callout, type CalloutProps } from "./callout";
export { Skeleton } from "./skeleton";
export { Accordion, type AccordionItem } from "./accordion";
export { contrastRatio, relativeLuminance } from "./contrast";
