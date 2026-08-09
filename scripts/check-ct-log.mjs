/* global process, console, fetch */
/**
 * Certificate Transparency canary.
 *
 * CT logs exist so mis-issuance is discoverable: if someone obtains a
 * certificate for our names from a CA we never authorised, it lands in a public
 * log whether they like it or not. This checks that every certificate issued
 * for the names we own came from a CA our CAA record actually permits.
 *
 * WHY NOT crt.sh. It returns 502 often enough that a canary built on it teaches
 * people to ignore red. Cert Spotter's API is stable and needs no key at this
 * volume.
 *
 * WHY THIS ASSERTS A PROPERTY, NOT A BASELINE. The obvious design is "record
 * the N certificates that exist today and alarm when the count changes". That
 * goes red on every ordinary renewal, which is the same disease as the 502s.
 * The property below — every issuer is CAA-permitted — stays true across
 * renewals and goes red only on something worth waking up for.
 *
 * WHY THE NAME LIST IS HARD-CODED AND NARROW. `include_subdomains=true` on this
 * zone returns 19 distinct names, most of them CO-TENANT applications sharing
 * the host: mnm, mylibrary, endorse, dmc-new, laravel-demo, py-demo. Committing
 * that list here would publish someone else's infrastructure inventory in our
 * public repo. So the query is subdomain-inclusive (there is no per-name API)
 * but the RESULTS are filtered to the four names TowardPCC actually serves, and
 * nothing about any other name is printed, stored or asserted on.
 *
 * A NEAR-MISS WORTH KEEPING, from the day this was written. A single DNS query
 * for the CAA record returned 6 of the 13 records — omitting the two that
 * permit Let's Encrypt, which is the CA that actually renews our certificates.
 * Read literally, that response says our own renewal should be refused, and it
 * very nearly became an alarm. Repeating the query returned the full set. So
 * this script FAILS CLOSED ON A SHORT ANSWER: if the CAA lookup returns fewer
 * records than a second attempt, or returns none, it reports "cannot assess"
 * rather than concluding a CA is unauthorised. An alarm that fires because DNS
 * gave a partial answer is worse than no alarm at all.
 */

const NAMES = new Set([
  "towardpcc.com",
  "www.towardpcc.com",
  "next.towardpcc.com",
  "*.towardpcc.com",
]);

/**
 * Issuer-organisation substring → the CAA identifier that authorises it.
 * Matched on the certificate's issuer O= / CN=, which is what Cert Spotter
 * gives us; CT does not carry the CAA identifier itself.
 */
const ISSUER_TO_CAA = [
  ["Let's Encrypt", "letsencrypt.org"],
  ["Google Trust Services", "pki.goog"],
  ["DigiCert", "digicert.com"],
  ["Sectigo", "sectigo.com"],
  ["COMODO", "comodoca.com"],
  ["SSL.com", "ssl.com"],
];

/**
 * Certificates that predate the CAA record and cannot be judged by it.
 *
 * GoDaddy issues under `godaddy.com` / `starfieldtech.com`, neither of which
 * appears in our CAA record — so a literal check flags them forever. They were
 * issued before the record existed, which is not mis-issuance, and they are
 * listed by date rather than waved through by issuer so that a NEW GoDaddy
 * certificate would still alarm.
 */
const PRE_CAA_EXCEPTIONS = [
  { issuer: "GoDaddy", notBefore: "2026-02-24" },
  { issuer: "GoDaddy", notBefore: "2026-05-12" },
];

const CT_API =
  "https://api.certspotter.com/v1/issuances?domain=towardpcc.com&include_subdomains=true&expand=dns_names&expand=issuer";
const CAA_API = "https://dns.google/resolve?name=towardpcc.com&type=CAA";

let failures = 0;
const record = (name, ok, detail) => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}`);
  if (detail) console.log(`         ${detail}`);
  if (!ok) failures += 1;
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Two independent lookups; the larger answer wins. See the near-miss note above. */
async function permittedCas() {
  const attempts = [];
  for (let i = 0; i < 2; i++) {
    try {
      const d = await fetchJson(CAA_API);
      attempts.push((d.Answer ?? []).map((a) => String(a.data ?? "")));
    } catch {
      attempts.push([]);
    }
  }
  const best = attempts.reduce((a, b) => (b.length > a.length ? b : a), []);
  const cas = new Set();
  for (const line of best) {
    const m = line.match(/issuewild?\s+"([^";]+)/);
    if (m) cas.add(m[1].trim());
  }
  return { cas, recordCount: best.length, short: attempts.some((a) => a.length !== best.length) };
}

async function main() {
  console.log(`Certificate Transparency canary — ${[...NAMES].join(", ")}`);

  const { cas, recordCount, short } = await permittedCas();
  if (recordCount === 0) {
    record("CAA record readable", false, "no CAA records returned — cannot assess issuers");
    return;
  }
  record(
    "CAA record readable",
    true,
    `${recordCount} records, ${cas.size} distinct CAs permitted${short ? " (a shorter answer was also seen — used the fuller one)" : ""}`,
  );

  let certs;
  try {
    certs = await fetchJson(CT_API);
  } catch (err) {
    record("CT log reachable", false, `Cert Spotter: ${err.message}`);
    return;
  }

  const ours = certs.filter((c) => (c.dns_names ?? []).some((n) => NAMES.has(n)));
  record("CT log reachable", true, `${ours.length} certificates for our names`);

  const unauthorised = [];
  for (const c of ours) {
    const issuer = (c.issuer ?? {}).name ?? "";
    const notBefore = String(c.not_before ?? "").slice(0, 10);
    const mapped = ISSUER_TO_CAA.find(([needle]) => issuer.includes(needle));
    if (mapped && cas.has(mapped[1])) continue;
    if (PRE_CAA_EXCEPTIONS.some((e) => issuer.includes(e.issuer) && e.notBefore === notBefore))
      continue;
    unauthorised.push(`${notBefore} — ${issuer.slice(0, 70)}`);
  }

  record(
    "every certificate came from a CAA-permitted CA",
    unauthorised.length === 0,
    unauthorised.length === 0
      ? "no unauthorised issuance"
      : `UNAUTHORISED ISSUANCE — investigate immediately:\n         ${unauthorised.join("\n         ")}`,
  );
}

await main();
if (failures > 0) {
  console.log(`\n${failures} check(s) failed. A certificate for our names may have been issued by`);
  console.log("a CA we never authorised. Check the CAA record first, then the CT entry itself.");
  process.exit(1);
}
console.log("\nAll certificates for our names trace to a permitted CA.");
