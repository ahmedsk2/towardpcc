/**
 * The inline script that lifts an incoming URL fragment out of the address bar,
 * and the CSP hash that lets it run under the admin tier's nonce policy.
 *
 * WHY BOTH LIVE HERE. `app/layout.tsx` renders the script; `proxy.ts` has to
 * name its hash in `script-src`. Kept apart, those two drift the moment anyone
 * edits the script — and the failure is silent, because a stale hash simply
 * means the script is blocked on `/admin`, which looks like nothing at all.
 * `fragment-lift.test.ts` recomputes the digest from the source string and fails
 * the build if it no longer matches, so the pair cannot separate quietly.
 *
 * WHY A HASH AND NOT A NONCE. A nonce would mean reading `headers()` in the root
 * layout, which forces every route using that layout to render dynamically —
 * including the twelve statically prerendered public pages the route JS budget
 * depends on. A hash costs nothing at runtime and does not touch rendering.
 *
 * WHY IT IS ALLOWED ON /admin AT ALL, given it has no work to do there. It runs
 * from the root layout, so it is present on every page, and under the admin
 * tier's `'nonce-…' 'strict-dynamic'` policy an unhashed inline script is
 * refused — logging a CSP violation on every admin page load. Nothing breaks:
 * the script only acts on fragments containing `=`, and admin URLs have none.
 * But a violation that is always present is the kind of noise that teaches
 * people to ignore violations, and the next one might matter.
 *
 * THE SCRIPT ITSELF IS UNCHANGED. The `indexOf("=")` test is load-bearing in
 * both directions and the reasoning for it lives beside the element in
 * `app/layout.tsx` — read that before touching this string.
 */

export const FRAGMENT_LIFT_SCRIPT = `(function(){function l(){try{var h=location.hash;if(h&&h.length>1&&h.indexOf("=")>-1){window.__TPCC_FRAGMENT__=h;history.replaceState(null,"",location.pathname+location.search);window.dispatchEvent(new Event("tpcc:fragment"));}}catch(e){}}l();addEventListener("hashchange",l);})();`;

/**
 * base64 SHA-256 of exactly the string above.
 *
 * Hard-coded rather than computed, because `proxy.ts` runs as middleware where
 * `node:crypto` is unavailable and Web Crypto's digest is async while the CSP is
 * assembled synchronously. The test is what keeps it honest.
 */
export const FRAGMENT_LIFT_SHA256 = "sha256-NSmWwrcXlTObnD1erh/YiRENsm1DXFj5RYR7MVTmUhI=";
