/**
 * The inline stylesheet in `app/global-error.tsx`, and the CSP hash that lets it
 * apply under the admin tier's nonce policy.
 *
 * WHY IT EXISTS AT ALL. `global-error.tsx` is the last-resort boundary: the root
 * layout itself failed, so it renders a bare `<html>` with no stylesheet loaded.
 * Tailwind is not available, so the app's crimson `focus-visible` idiom is
 * inlined or the retry button — the only control on the page — has no focus
 * outline whatsoever. `apps/web/CLAUDE.md` names this as one of exactly two
 * places a raw hex is allowed in a component, for that reason.
 *
 * WHY IT NEEDS A HASH NOW, WHEN IT DID NOT BEFORE. The admin tier gained
 * `style-src-elem 'self' 'nonce-…'` on 2026-08-08. Browsers that support the
 * `style-src-elem`/`-attr` split IGNORE `style-src` entirely, so the permissive
 * `style-src 'self' 'unsafe-inline'` that used to cover this element stops
 * applying to it and the `<style>` is refused. The failure is invisible in the
 * ordinary case — this boundary only renders when the app has already crashed —
 * and its only symptom is the retry button losing its focus ring, which is
 * exactly the accessibility property the element was added to restore.
 *
 * A HASH RATHER THAN A NONCE, for the same reason `fragment-lift.ts` uses one:
 * a nonce would mean reading `headers()` in a component that must keep working
 * when everything else has failed. A hash costs nothing at runtime and cannot
 * fail at the moment it is most needed.
 *
 * `global-error-style.test.ts` recomputes the digest from the source string and
 * fails the build if the two drift, because a stale hash is silent — the style
 * is simply blocked, on a page nobody looks at until something has gone wrong.
 */

export const GLOBAL_ERROR_STYLE =
  "button:focus-visible{outline:2px solid #cf1f3d;outline-offset:2px}";

/**
 * base64 SHA-256 of exactly the string above.
 *
 * Hard-coded rather than computed, because `proxy.ts` assembles the CSP
 * synchronously in middleware where `node:crypto` does not exist. The colocated
 * test is what keeps it honest.
 */
export const GLOBAL_ERROR_STYLE_SHA256 = "sha256-1lcH20/BtctgK2CfU95GHSmDWLljT2+CnP66uhhp3E8=";
