/* global process, console, fetch */
/**
 * Lookalike-domain canary.
 *
 * A domain that looks like ours and resolves is the raw material for a
 * phishing page or a spoofed "TowardPCC" — and for a clinical-calculator site
 * the damage is a clinician trusting a number from a page we never published.
 * Nobody is watching the registries for that on our behalf, so this does: it
 * generates the plausible variants of the names we own and reports any that
 * has nameservers, which is what a registered, parked-or-live domain has and
 * an unregistered one never does.
 *
 * WHY THIS ASSERTS A PROPERTY, NOT A BASELINE. "Record the variants that exist
 * today and alarm on change" needs a file that drifts and a memory of why each
 * entry is there. "No variant we do not own has nameservers" needs neither: it
 * is true or false on every run, and the only state is the list of names we
 * own. If a variant is ever taken deliberately (a defensive registration), it
 * is added to OWNED with the date, which is the record.
 *
 * WHAT IT DOES NOT CATCH. Homoglyphs in other scripts (Cyrillic "о"), domains
 * that are registered but have no nameservers yet, and lookalikes under TLDs
 * not listed here. Those are the price of a canary that runs daily with no
 * baseline and no paid feed; the list of TLDs and transforms is deliberately
 * short so that a red result is read rather than ignored.
 *
 * Resolution goes through DNS-over-HTTPS (Cloudflare, then Google as a second
 * opinion when the first answer is empty), the same path the residency canary
 * already trusts. An NS answer means registered. NXDOMAIN or an empty answer
 * with a SOA in authority means not registered. A transport failure is
 * reported as such and does not count as clean.
 */

const OWNED = new Set([
  "towardpcc.com",
  "towardpicu.com", // the mail domain; expiry 2027-04-17
  // Defensive .net registrations, confirmed ours by registry RDAP on 2026-09-03:
  // GoDaddy, the same client-lock set, registered 2022-07-20 and 2022-04-17 in
  // step with the .com pair, matching expiries. The canary found them on its
  // first run, which is what it is for.
  "towardpcc.net",
  "towardpicu.net",
]);

/** Second-level labels whose variants we generate. */
const LABELS = ["towardpcc", "towardpicu"];

/** TLDs where a lookalike would be credible to a Saudi or English-reading clinician. */
const TLDS = ["com", "net", "org", "co", "sa", "com.sa", "med.sa", "info", "health", "io"];

/** Adjacent-key and confusable substitutions worth checking, per label. */
const SUBSTITUTIONS = [
  ["o", "0"],
  ["i", "1"],
  ["i", "l"],
  ["l", "1"],
  ["a", "4"],
  ["e", "3"],
  ["w", "vv"],
  ["rn", "m"],
  ["m", "rn"],
  ["cc", "c"],
  ["c", "cc"],
];

const DOH = [
  (name) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=NS`,
  (name) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=NS`,
];

let failures = 0;
const record = (name, ok, detail) => {
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}`);
  if (detail) console.log(`         ${detail}`);
  if (!ok) failures += 1;
};

/** Every variant of one label: substitutions, one-character deletions, doubled letters, dropped hyphen forms. */
function variantsOf(label) {
  const out = new Set();
  for (const [from, to] of SUBSTITUTIONS) {
    let idx = label.indexOf(from);
    while (idx !== -1) {
      out.add(label.slice(0, idx) + to + label.slice(idx + from.length));
      idx = label.indexOf(from, idx + 1);
    }
  }
  for (let i = 0; i < label.length; i++) {
    out.add(label.slice(0, i) + label.slice(i + 1)); // one character missing
    out.add(label.slice(0, i + 1) + label[i] + label.slice(i + 1)); // one character doubled
  }
  for (let i = 1; i < label.length; i++) {
    out.add(label.slice(0, i) + "-" + label.slice(i)); // a hyphen inserted
  }
  out.delete(label);
  return [...out];
}

/** The full candidate list: the exact labels on every TLD, plus every variant on .com. */
function candidates() {
  const names = new Set();
  for (const label of LABELS) {
    for (const tld of TLDS) names.add(`${label}.${tld}`);
    for (const v of variantsOf(label)) names.add(`${v}.com`);
  }
  for (const owned of OWNED) names.delete(owned);
  return [...names].sort();
}

/** true = has nameservers, false = does not, null = could not tell. */
async function hasNameservers(name) {
  for (const url of DOH) {
    try {
      const res = await fetch(url(name), { headers: { accept: "application/dns-json" } });
      if (!res.ok) continue;
      const d = await res.json();
      if (d.Status === 3) return false; // NXDOMAIN
      if (d.Status !== 0) continue;
      const ns = (d.Answer ?? []).filter((a) => a.type === 2);
      if (ns.length > 0) return true;
      // NOERROR with no NS answer: registered-but-empty is rare; treat as not registered
      // only when the authority section carries the parent's SOA.
      const soa = (d.Authority ?? []).some((a) => a.type === 6);
      if (soa) return false;
    } catch {
      // try the next resolver
    }
  }
  return null;
}

async function main() {
  const names = candidates();
  console.log(
    `Lookalike-domain canary — ${names.length} candidates around ${[...OWNED].join(", ")}`,
  );

  const taken = [];
  const unknown = [];
  // Modest concurrency: a daily run of ~150 lookups should not look like a scan.
  const queue = [...names];
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const name = queue.shift();
      const r = await hasNameservers(name);
      if (r === true) taken.push(name);
      else if (r === null) unknown.push(name);
    }
  });
  await Promise.all(workers);

  record(
    "no lookalike we do not own has nameservers",
    taken.length === 0,
    taken.length === 0
      ? `${names.length - unknown.length} variants checked, none registered`
      : `REGISTERED BY SOMEONE: ${taken.sort().join(", ")} — look at what each serves before deciding; a defensive registration of our own goes in OWNED with the date.`,
  );
  record(
    "every candidate could be resolved",
    unknown.length === 0,
    unknown.length === 0
      ? "both resolvers answered"
      : `no answer for: ${unknown.sort().join(", ")}`,
  );

  if (failures > 0) {
    console.log(`\n${failures} lookalike check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nNo lookalike of our names is registered by anyone else.");
  }
}

main().catch((err) => {
  console.error(`lookalike canary crashed: ${err?.message ?? err}`);
  process.exitCode = 1;
});
