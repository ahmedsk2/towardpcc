/**
 * The fixed credentials of the end-to-end test admin.
 *
 * DEPENDENCY-FREE ON PURPOSE. This file is imported from two places that cannot
 * share a dependency graph: the seeder in this package (which needs Prisma and
 * hash-wasm) and the Playwright spec in `apps/web/e2e` (which resolves nothing
 * from here under pnpm's strict layout, so it imports this by relative path).
 * Adding an import to this file breaks the spec.
 *
 * THESE ARE NOT SECRETS AND MUST NEVER REACH A REAL DATABASE. They are safe only
 * because the seeder refuses to run against anything that does not look like a
 * throwaway test database — see `assertDisposableDatabase` in
 * `seed-e2e-admin.mjs`. A known-password OWNER account in production would be a
 * total compromise, so that check is the load-bearing part of this arrangement,
 * not the obscurity of the strings below.
 */
export const TEST_ADMIN = {
  email: "e2e-admin@example.test",
  password: "e2e-only-password-not-a-secret-3f9c",
  /** Fixed base32 so the spec can derive the current code deterministically. */
  totpSecret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  role: "OWNER",
  /** Plain codes; the database stores only their sha256 hashes. */
  recoveryCodes: ["aaaaa-bbbbb-ccccc-ddddd", "eeeee-fffff-ggggg-hhhhh"],
};
