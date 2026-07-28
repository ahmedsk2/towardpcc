/* global process, console, fetch */
/**
 * Integrity canary (TM-012).
 *
 * Answers one question the rest of the suite cannot: **is the site that is
 * serving right now the site we built?**
 *
 * Everything else in CI proves the artifact was correct when it left the build.
 * Nothing proves it is still correct in production. The gap between those two
 * is where defacement, a tampered deploy, and a compromised dependency live —
 * and for a site whose numbers a clinician might act on, "the calculator now
 * returns something else" is the worst failure available and would otherwise
 * be discovered by a user.
 *
 *   node scripts/check-integrity.mjs
 *
 * WHAT IT DOES NOT DO. It cannot execute the client-side engine, so it does not
 * verify that a computed score is still arithmetically correct — that is what
 * the 628 engine tests and the cited worked examples are for, at build time.
 * This checks that the page a clinician receives still carries the score it
 * claims to, still says the things the platform's promises depend on, and still
 * loads nothing from anywhere it should not.
 */

const HOST = process.env.INTEGRITY_HOST ?? "https://www.towardpcc.com";

const results = [];
const record = (name, ok, detail, why) => results.push({ name, ok, detail, why });

async function get(path) {
  const res = await fetch(`${HOST}${path}`, { redirect: "manual" });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

/**
 * The pages are named here rather than derived from the registry, because this
 * script deliberately has no dependency on the repository it is checking. A
 * canary that imports the thing it is watching would pass happily against a
 * build that no longer matches the source.
 *
 * Each entry names a score and a phrase that must survive on its page. The
 * phrases are chosen to be things a defacer or a broken deploy would plausibly
 * destroy, and that carry meaning rather than decoration.
 */
const PAGES = [
  { path: "/calculators/pim3", must: ["PIM3", "Independent clinical validation"] },
  { path: "/calculators/pelod2", must: ["PELOD-2", "Independent clinical validation"] },
  { path: "/calculators/ett-size", must: ["endotracheal", "Independent clinical validation"] },
  { path: "/calculators/phoenix", must: ["Phoenix", "Independent clinical validation"] },
];

async function checkCalculatorPages() {
  for (const page of PAGES) {
    const { status, body } = await get(page.path);
    const missing = page.must.filter((m) => !new RegExp(m, "i").test(body));
    record(
      `content: ${page.path}`,
      status === 200 && missing.length === 0,
      status !== 200 ? `HTTP ${status}` : missing.length ? `missing: ${missing.join(", ")}` : "ok",
      "A calculator page that has lost its own name or its validation status is either broken or has been altered. Both need a human immediately.",
    );
  }
}

/**
 * The privacy promise, checked where a reader would check it.
 *
 * /trust and /legal/data-protection make specific, falsifiable claims. If a
 * deploy or an edit ever removes them while the behaviour stays, the site is
 * under-claiming, which is merely untidy. If it removes them because the
 * behaviour changed, that is the thing this catches.
 */
async function checkPrivacyClaims() {
  const { status, body } = await get("/trust");
  const required = ["transmit nothing", "Saudi Arabia"];
  const missing = required.filter((m) => !new RegExp(m, "i").test(body));
  record(
    "the trust page still makes its claims",
    status === 200 && missing.length === 0,
    status !== 200 ? `HTTP ${status}` : missing.length ? `missing: ${missing.join(", ")}` : "ok",
    "These sentences are the platform's central promises. Their disappearance is worth a look either way.",
  );
}

/**
 * Third-party scripts.
 *
 * The calculators' whole guarantee is that nothing they touch leaves the
 * browser. A script tag pointing anywhere but this origin is the single
 * clearest sign of a compromised page, and it is cheap to check.
 *
 * Cloudflare injects same-origin /cdn-cgi/ scripts while it fronts the site,
 * which is why this checks the ORIGIN of each src rather than banning
 * everything that is not a Next chunk.
 */
async function checkNoForeignScripts() {
  const { body } = await get("/calculators/pim3");
  const origins = [...body.matchAll(/<script[^>]+src="(https?:\/\/[^/"]+)/g)].map((m) => m[1]);
  const foreign = [...new Set(origins)].filter((o) => !o.includes("towardpcc.com"));
  record(
    "no third-party scripts on a calculator page",
    foreign.length === 0,
    foreign.length ? foreign.join(", ") : "all same-origin",
    foreign.length
      ? "A script is being loaded from another origin. On a page whose promise is that nothing is transmitted, treat this as a compromise until proven otherwise."
      : "Nothing executes on a calculator page that did not come from this origin.",
  );
}

/**
 * The API surface.
 *
 * ADR-0005 says /api/v1 never accepts calculator inputs and never returns a
 * computed score. That is an architectural commitment, and the way it erodes is
 * by someone adding a convenient endpoint. This asserts the surface is still
 * the two endpoints it is supposed to be — anything else answering is a
 * question worth asking.
 */
async function checkApiSurface() {
  const expected = { "/api/v1/health": 200, "/api/v1/ready": 200 };
  for (const [path, want] of Object.entries(expected)) {
    const { status } = await get(path);
    record(
      `api: ${path}`,
      status === want,
      `HTTP ${status} (expected ${want})`,
      "The two endpoints that are meant to exist.",
    );
  }
  // Paths that must NOT exist. A 404 or 405 is the pass; a 200 means someone
  // built the thing ADR-0005 forbids.
  for (const path of ["/api/v1/score", "/api/v1/calculate", "/api/v1/submissions"]) {
    const { status } = await get(path);
    record(
      `api: ${path} does not exist`,
      status >= 400,
      `HTTP ${status}`,
      status < 400
        ? "An endpoint exists that ADR-0005 rules out. Score computation must never move server-side, on any platform."
        : "Absent, as intended.",
    );
  }
}

/** The headers a compromise or a proxy misconfiguration would quietly drop. */
async function checkSecurityHeaders() {
  const { headers } = await get("/");
  const required = [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
  ];
  const missing = required.filter((h) => !headers.get(h));
  record(
    "security headers present",
    missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : "all present",
    "These are set by the application. Their absence means either a bad deploy or something else answering for this hostname.",
  );
}

const CHECKS = [
  checkCalculatorPages,
  checkPrivacyClaims,
  checkNoForeignScripts,
  checkApiSurface,
  checkSecurityHeaders,
];

for (const check of CHECKS) {
  try {
    await check();
  } catch (error) {
    record(check.name, false, `check failed: ${String(error)}`, "Could not be evaluated.");
  }
}

let failures = 0;
console.log(`\nIntegrity canary — ${HOST}\n`);
for (const r of results) {
  if (!r.ok) failures++;
  console.log(`  [${r.ok ? "PASS" : "FAIL"}] ${r.name}`);
  console.log(`         ${r.detail}`);
  if (!r.ok) console.log(`         ${r.why}`);
}

if (failures > 0) {
  console.error(
    `\n${failures} integrity check(s) failed. Treat this as "the live site may not be the site we built" until you have established otherwise — start by comparing the running image digest against the last successful deploy.`,
  );
  process.exit(1);
}
console.log("\nThe live site matches what it should be.\n");
