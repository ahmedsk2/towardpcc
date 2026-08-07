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

/**
 * A named User-Agent, because the default one gets this check blocked.
 *
 * Node's `fetch` sends no browser UA, and Cloudflare's bot protection answers
 * it with 403 from GitHub's runners — which is what turned this job red on
 * 2026-07-31 and 2026-08-01 while the site was serving 200 to every real
 * visitor throughout. Identifying the canary honestly is the fix; spoofing a
 * browser string would be the wrong one, since the point is to be allowed
 * deliberately rather than to sneak past.
 */
const UA = "TowardPCC-integrity-canary (+https://github.com/ahmedsk2/towardpcc)";

async function get(path) {
  const res = await fetch(`${HOST}${path}`, {
    redirect: "manual",
    headers: { "user-agent": UA, accept: "text/html,*/*" },
  });
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
 * What the EDGE injects, pinned rather than merely tolerated.
 *
 * `checkNoForeignScripts` above deliberately judges by origin, because
 * Cloudflare serves its injected scripts from `/cdn-cgi/` on our own hostname —
 * so they are same-origin and sail past an origin test while still being code
 * this repository never wrote, running on the one page whose promise is that
 * nothing it touches leaves the browser.
 *
 * Tolerating that as an open-ended exemption means Cloudflare can switch on a
 * new feature — Rocket Loader, Automatic Platform Optimization, a challenge
 * script — and nothing here would notice. So the exemption is pinned to the
 * exact filenames known to be enabled, and anything new fails.
 *
 * THE LIST HELD NOTHING FOR A WHILE, AND NOW HOLDS EXACTLY ONE THING.
 *
 * It briefly held `email-decode.min.js` — Cloudflare's Email Address
 * Obfuscation, switched on in the dashboard and required by nothing this site
 * does. Scrape Shield was turned off on 2026-08-01, along with Real User
 * Measurements, which had been injecting `static.cloudflareinsights.com` into
 * every calculator page. Neither had ever collected anything: the CSP
 * (`script-src 'self'`) blocked the third-party beacon outright.
 *
 * `jsd/main.js` is different, and is pinned on 2026-08-07 for reasons worth
 * stating in full, because a pin is how an exemption becomes permanent by
 * accident.
 *
 * It is Cloudflare's JS Detections. Unlike the two above it CANNOT BE TURNED
 * OFF: the zone is on the Free plan, where JS Detections ships with bot
 * protection and the dashboard renders the control read-only. Bot Fight Mode was
 * switched off on 2026-08-05 and this script kept being injected. So the choice
 * is not "allow it or remove it" — it is "record it, or leave this check red
 * every day until the DNS cutover". A canary that is always red is one nobody
 * reads, which would cost more than it protects.
 *
 * What it does was MEASURED, not assumed, on 2026-08-05: the script was
 * deobfuscated (269-entry string table recovered, 462 call sites resolved, none
 * left unresolved) and executed in real Chromium against a stubbed calculator
 * page with a server-side capture. It reads `document.location.href` and posts
 * it as `{"lhr": …}`. Sixteen magic tokens seeded into input values, selects,
 * textarea, checkbox, sessionStorage, localStorage, `document.cookie`, a text
 * node, `<title>`, form name, `window.name` and a global reached the wire in
 * NONE of the runs; only fragment tokens did. Instrumented getters recorded zero
 * accesses to `.value`, `.checked`, storage or `innerHTML`, and the only
 * listener it registers is `DOMContentLoaded`.
 *
 * That is why the pin is defensible TODAY and was not defensible before: the
 * one thing it could reach was the URL, and TM-013 removed entered values from
 * the URL entirely (2026-08-05). It now reads a path and nothing else.
 *
 * REMOVE THIS PIN when the DNS cutover lands and Cloudflare stops fronting the
 * site — at which point this script disappears and the entry becomes a lie that
 * would silently permit a future one. Anything else the edge injects still
 * fails, which is the whole point of pinning a filename rather than widening
 * the pattern.
 */
const EDGE_SCRIPTS_ALLOWED = new Set(["jsd/main.js"]);

/**
 * Why this scans the whole body and not just `<script src=…>`.
 *
 * It used to match only `<script[^>]+src="/cdn-cgi/…"`, and that made the check
 * a FALSE PASS for the entire time it ran. Cloudflare's JS Detections does not
 * emit a script tag with a src attribute at all. It emits an INLINE script that
 * builds the element at runtime:
 *
 *   var a=document.createElement('script');
 *   a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';
 *   document.getElementsByTagName('head')[0].appendChild(a);
 *
 * There is no `src=` attribute anywhere in that markup, so the old pattern
 * returned zero matches while the script was demonstrably in the body and
 * running on every calculator page. Measured on 2026-08-05: regex matches 0,
 * `body.includes("jsd/main.js")` true. An empty allow-list above a pattern that
 * cannot match anything is not strictness, it is silence.
 *
 * So the test is now the presence of a `/cdn-cgi/` script path ANYWHERE in the
 * document, however it is introduced. That is narrow enough not to fire on
 * Next's own runtime — which does create script elements, but never from
 * `/cdn-cgi/` — and broad enough that the next edge feature cannot hide from it
 * by using a loader instead of a tag.
 */
async function checkEdgeInjectedScripts() {
  const { body } = await get("/calculators/pim3");
  const injected = [...body.matchAll(/\/cdn-cgi\/[^"'\s<>()]*?\.js/g)]
    /*
     * Keyed on the LAST TWO path segments, not the filename.
     *
     * `main.js` alone is far too generic to pin — it would exempt any future
     * `/cdn-cgi/**\/main.js` from a feature nobody has evaluated, which is
     * exactly the open-ended exemption this list exists to refuse. `jsd/main.js`
     * names the product.
     *
     * Two segments is also all that is stable. The NETWORK request for this
     * script carries a rotating cache-busting segment
     * (`/h/g/scripts/jsd/<hash>/main.js`), which is where the previous comment's
     * warning came from — but this reads the HTML BODY, and the bootstrap there
     * writes a fixed `/cdn-cgi/challenge-platform/scripts/jsd/main.js`. Measured
     * across three consecutive fetches on 2026-08-07: identical every time, no
     * hash. If that ever changes, this check fails loudly, which is correct.
     */
    .map((m) => m[0].split("/").slice(-2).join("/"))
    .filter(Boolean);
  const unexpected = [...new Set(injected)].filter((f) => !EDGE_SCRIPTS_ALLOWED.has(f));
  record(
    "no unexpected edge-injected scripts",
    unexpected.length === 0,
    unexpected.length
      ? `unexpected: ${unexpected.join(", ")}`
      : injected.length
        ? `only the pinned set (${[...new Set(injected)].join(", ")})`
        : "none — the edge injects nothing",
    unexpected.length
      ? "The CDN is injecting a script this repository does not know about. It is same-origin, so CSP permits it and the foreign-origin check cannot see it — establish what enabled it before trusting the page."
      : "Pinned, so a newly enabled CDN feature would fail this.",
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
  // Paths that must NOT exist. Only the statuses that actually mean "no such
  // route" count as the pass.
  //
  // This was `status >= 400`, which let an edge block stand in for evidence of
  // absence: on 2026-08-01 Cloudflare answered every path with 403 and these
  // three checks reported PASS while the rest of the file reported FAIL. A
  // check that passes because nothing was reached is worse than one that fails,
  // because it reads as a verified negative.
  const ABSENT = new Set([404, 405, 410]);
  for (const path of ["/api/v1/score", "/api/v1/calculate", "/api/v1/submissions"]) {
    const { status } = await get(path);
    record(
      `api: ${path} does not exist`,
      ABSENT.has(status),
      `HTTP ${status}`,
      status < 400
        ? "An endpoint exists that ADR-0005 rules out. Score computation must never move server-side, on any platform."
        : "Not a 404/405/410, so this run did not establish the route is absent.",
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
  checkEdgeInjectedScripts,
  checkApiSurface,
  checkSecurityHeaders,
];

/**
 * Prove we can reach the origin BEFORE asserting anything about what it serves.
 *
 * Every check below reads a response body or a status code, so none of them can
 * tell "the site changed" from "we never got to the site". On 2026-08-01 that
 * distinction mattered: Cloudflare answered this runner with 403 on every path,
 * and the report said four calculator pages had lost their names and /trust had
 * stopped making its claims. All of it was false — the site was serving 200 to
 * real visitors the whole time — and the three api-absence checks reported PASS
 * off the same 403.
 *
 * A monitor that misreports its own blindness as a defacement gets muted, and a
 * muted canary is worse than no canary. So it reports BLOCKED distinctly, with
 * exit 2, and says plainly what it does not know.
 *
 * Returns false rather than calling `process.exit()`. The first version exited
 * inline and, measured on Windows, aborted with a libuv assertion and exit 127
 * instead of 2 — killing the process while a socket was still open, so the
 * distinct code this exists to provide was the one thing that did not survive.
 */
async function preflight() {
  let status, headers;
  try {
    ({ status, headers } = await get("/"));
  } catch (error) {
    console.error(`\nIntegrity canary — ${HOST}\n`);
    console.error(`  [BLOCKED] the origin could not be reached at all: ${String(error)}`);
    console.error("\n  This run proves NOTHING about the site's integrity.\n");
    return false;
  }
  if (status === 200) return true;

  const viaEdge = headers.get("cf-ray") ?? headers.get("server") ?? "";
  console.error(`\nIntegrity canary — ${HOST}\n`);
  console.error(`  [BLOCKED] GET / returned HTTP ${status}, so nothing below was measurable.`);
  if (viaEdge) console.error(`            answered by an edge (${viaEdge}), not the application`);
  console.error(
    "\n  This run proves NOTHING about the site's integrity — it did not reach it.\n" +
      "  If the site is up for real visitors, the checker is being blocked: allow\n" +
      `  its User-Agent (${UA}) through the WAF or bot rules.\n`,
  );
  return false;
}

if (!(await preflight())) {
  process.exitCode = 2;
} else {
  for (const check of CHECKS) {
    try {
      await check();
    } catch (error) {
      record(check.name, false, `check failed: ${String(error)}`, "Could not be evaluated.");
    }
  }
  report();
}

function report() {
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
    // exitCode, not exit(): same reason as preflight — an abrupt exit with a
    // socket still open aborts on Windows and loses the code.
    process.exitCode = 1;
    return;
  }
  console.log("\nThe live site matches what it should be.\n");
}
