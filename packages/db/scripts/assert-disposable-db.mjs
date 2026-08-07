/* global URL */
/**
 * Refuse any connection string that is not a throwaway test database.
 *
 * This is the single control standing between a published OWNER password
 * (`e2e-admin-fixture.mjs`) and a real database. It is therefore worth more care
 * than the substring test it replaces, which a supply-chain review defeated four
 * ways on 2026-08-07 — every one verified against `pg-connection-string@2.14.0`,
 * the parser `pg` and `@prisma/adapter-pg` actually use:
 *
 *   postgresql://test:pw@localhost:5432@db.prod.internal:5432/towardpcc
 *     → passed. The authority is delimited by the LAST `@`, so "@localhost:"
 *       sat harmlessly in the userinfo while the real host followed.
 *
 *   postgresql://postgres:postgres@localhost:5432/towardpcc_e2e?host=db.prod.internal
 *     → passed. A `host` query parameter overrides the URI host entirely.
 *
 *   postgresql://towardpcc_app:Ae2eKq9x@postgres:5432/towardpcc
 *     → passed, and this is the worst of the four: `@postgres:` is THIS
 *       PROJECT'S OWN PRODUCTION DATABASE HOST (docker-compose.prod.yml:54), so
 *       the allowlist contained production. The only remaining barrier was an
 *       `e2e|test` substring that a generated password can satisfy by accident.
 *
 *   postgresql://postgres:pw@localhost:5433/towardpcc_prod?application_name=e2e
 *     → passed. Any query parameter, username or password containing "test" or
 *       "e2e" unlocked a local production database on a non-default port.
 *
 * The root cause was checking the RAW STRING while the driver connects to the
 * PARSED one. So this parses first, and asserts on the parts.
 *
 * `postgres` is deliberately NOT an allowed host any more. Losing it costs
 * nothing — a throwaway database is reachable on localhost — and keeping it
 * meant the guard permitted the production hostname.
 */

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** The database name must ANNOUNCE itself as disposable, as a whole word. */
const DISPOSABLE_NAME = /(^|[_-])(e2e|test)([_-]|$)/i;

export function assertDisposableDatabase(rawUrl) {
  const refuse = (why) => {
    throw new Error(
      `REFUSING TO USE THIS DATABASE: ${why}\n` +
        "The e2e fixtures include an OWNER account whose password is published in " +
        "this repository, so they may only ever touch a throwaway database. " +
        "Required: host is localhost/127.0.0.1/::1, the database name contains " +
        "'e2e' or 'test' as a whole word, and no 'host' query parameter overrides " +
        "the URI.",
    );
  };

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return refuse("it is not a parseable URL.");
  }

  // Strips the [] that URL keeps around IPv6 literals.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!ALLOWED_HOSTS.has(host) && !ALLOWED_HOSTS.has(url.hostname)) {
    return refuse(`host is "${url.hostname}", which is not a local address.`);
  }

  // libpq honours a `host` parameter over the URI's own host, so a string that
  // looks local can connect anywhere. There is no legitimate reason for one here.
  if (url.searchParams.has("host")) {
    return refuse("it carries a 'host' query parameter, which overrides the URI host.");
  }

  const database = url.pathname.replace(/^\//, "");
  if (!database) return refuse("no database name is present.");
  if (!DISPOSABLE_NAME.test(database)) {
    return refuse(`database is "${database}", which does not name itself as e2e or test.`);
  }
}
