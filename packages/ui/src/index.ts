/**
 * TowardPCC design system. Components land in P1; P0 exports token names so
 * consumers reference tokens through one typed surface from day one.
 */
export const tokens = {
  surfaceHero: "var(--color-surface-hero)",
  surfacePage: "var(--color-surface-page)",
  surfaceRaised: "var(--color-surface-raised)",
  inkStrong: "var(--color-ink-strong)",
  inkBody: "var(--color-ink-body)",
  inkMuted: "var(--color-ink-muted)",
  inkOnDark: "var(--color-ink-on-dark)",
  accentTeal: "var(--color-accent-teal)",
  accentCoral: "var(--color-accent-coral)",
} as const;

export type TokenName = keyof typeof tokens;
