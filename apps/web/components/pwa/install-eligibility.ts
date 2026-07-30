/**
 * Whether to offer the install prompt, as a pure decision.
 *
 * Split from install-prompt.tsx because the interesting part is a four-way
 * condition that is nearly impossible to exercise in a browser: a headless pane
 * reports `innerWidth: 0`, which satisfies `max-width: 767px` and makes every
 * viewport look like a phone. The component keeps the job of reading the real
 * environment; this keeps the job of deciding, where it can be tested.
 */
export interface InstallEnvironment {
  /** Running as an installed app, per the `display-mode: standalone` query. */
  standalone: boolean;
  /** iOS Safari's own flag, which predates `display-mode` and is still needed. */
  iosStandalone: boolean;
  /** A phone: narrow viewport AND a coarse pointer, not either alone. */
  phone: boolean;
  /** The persisted "Not now". */
  dismissed: boolean;
}

/**
 * All four conditions must hold. Order is not significant to the result, but
 * the installed checks come first because they are the ones where showing the
 * banner would be actively wrong rather than merely unwanted: advising someone
 * to install an app they are currently running reads as a broken site.
 */
export function shouldOfferInstall(env: InstallEnvironment): boolean {
  if (env.standalone || env.iosStandalone) return false;
  if (!env.phone) return false;
  if (env.dismissed) return false;
  return true;
}
