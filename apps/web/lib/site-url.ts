/**
 * The canonical public origin.
 *
 * Every absolute URL the site emits resolves against this — `metadataBase`,
 * the sitemap, robots.txt, and the links in transactional email. It must match
 * the host `proxy.ts` redirects to: if they disagree we advertise URLs that
 * immediately 308 elsewhere, which wastes a round trip and muddies canonical
 * signals for crawlers.
 *
 * It was previously inlined as a fallback in four separate files, which is
 * three too many places to keep in step.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.towardpcc.com";

/** Host only, no scheme — for comparisons against a request's Host header. */
export const CANONICAL_HOST = "www.towardpcc.com";

/**
 * The bare apex. Requests arriving here are redirected to CANONICAL_HOST.
 * Matched exactly and never as a suffix, so `next.towardpcc.com` (the
 * noindexed preview) and `localhost` are deliberately unaffected.
 */
export const APEX_HOST = "towardpcc.com";
