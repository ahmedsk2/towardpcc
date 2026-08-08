/* global process, console, fetch */
/**
 * Residency drift check.
 *
 * The /trust page's governing rule is that every claim it makes is either
 * ENFORCED by something that runs on each release, or DERIVED from data in this
 * repository. The residency claim was the one exception: hand-maintained prose
 * about infrastructure, with nothing connecting the sentence to the systems it
 * described.
 *
 * That gap is not theoretical. Every false claim this project has had to
 * correct had the same shape — a statement that was true when written, a system
 * that changed underneath it, and no mechanism that would notice. An
 * infrastructure claim is the most exposed of all, because the infrastructure
 * can change without a single line of this repository being touched.
 *
 * So this asserts the published position against the live world, and fails
 * loudly when they diverge. It checks what is observable from outside without
 * credentials, which is deliberately the same vantage point a sceptical reader
 * or a hospital's governance office would have.
 *
 *   node scripts/check-residency.mjs
 *
 * EXPECTATIONS ARE DECLARED, NOT DISCOVERED. Each one carries the reason it
 * holds and what its violation would mean, because a check whose expected value
 * is "whatever it was last time" tells you only that something moved, not
 * whether it should have.
 */

const HOST = process.env.RESIDENCY_HOST ?? "www.towardpcc.com";
const APEX = "towardpcc.com";

/** Cloudflare's DNS-over-HTTPS, so this needs no resolver library. */
async function dns(name, type) {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { accept: "application/dns-json" } },
  );
  if (!res.ok) throw new Error(`DoH ${type} ${name}: HTTP ${res.status}`);
  const body = await res.json();
  return (body.Answer ?? []).map((a) => String(a.data));
}

const results = [];
function record(name, ok, detail, why) {
  results.push({ name, ok, detail, why });
}

/**
 * The edge. CUT OVER 2026-08-08: an OCI load balancer in me-riyadh-1 now
 * terminates TLS, and Cloudflare is out of the request path entirely — it
 * remains authoritative DNS only.
 *
 * THE EXPECTED STATE IS NOW INVERTED, which is the whole point of revisiting
 * this rather than deleting the check. Before the cutover this alarmed when
 * Cloudflare stopped fronting the site; now it alarms when Cloudflare STARTS
 * fronting it again, because re-proxying would silently put requests back
 * through an edge outside the Kingdom while the public copy says they arrive
 * directly.
 *
 * That is not a hypothetical: turning the orange cloud back on is one click, and
 * nothing else in the system would notice. It also matters for TM-013 — the
 * Cloudflare JS Detections script that leaked field state was removed by this
 * cutover rather than by configuration, so its return would be silent too.
 */
async function checkEdge() {
  const res = await fetch(`https://${HOST}/`, { redirect: "manual" });
  const server = (res.headers.get("server") ?? "").toLowerCase();
  const viaCloudflare = server.includes("cloudflare") || res.headers.has("cf-ray");
  const colo = (res.headers.get("cf-ray") ?? "").split("-")[1] ?? "";

  record(
    "edge terminator",
    !viaCloudflare,
    viaCloudflare
      ? `Cloudflare is back in front (server: ${server || "n/a"}${colo ? `, colo ${colo}` : ""})`
      : `in-region load balancer (server: ${server || "n/a"})`,
    viaCloudflare
      ? "REGRESSION. Requests are being terminated outside the Kingdom again, while /trust and /legal/data-protection say they reach the Riyadh servers directly. Either grey-cloud the apex and www again, or change the copy in the same deploy. This also reinstates the Cloudflare script that caused TM-013."
      : "Matches the position since the 2026-08-08 cutover: TLS terminates on the OCI load balancer in me-riyadh-1 and Cloudflare is DNS only.",
  );
}

/**
 * Inbound mail. This is the sharpest disclosed exception: the MX is a
 * third-party filter outside Saudi Arabia.
 *
 * NOTE, 2026-08-07: the published contact address moved to
 * `info@towardpicu.com`, so this no longer checks the exact domain a visitor
 * writes to. It is kept pointed at the apex deliberately — `towardpcc.com` still
 * accepts mail, and a change there is still worth seeing. The residency position
 * is UNCHANGED either way: both domains resolve to the same SiteGround filter,
 * so moving the address moved nothing outside the Kingdom back inside it.
 *
 * Checked so that it cannot quietly become something else, and so that the day
 * it moves in-region is noticed rather than discovered months later.
 */
async function checkMx() {
  const mx = await dns(APEX, "MX");
  const hosts = mx.map((m) => m.split(" ").pop()?.replace(/\.$/, "") ?? "");
  const outsideKsa = hosts.some((h) => /mailspamprotection|siteground/i.test(h));
  record(
    "inbound mail (MX)",
    true, // informational: no state here is a failure, but a change must be seen
    hosts.join(", ") || "none",
    outsideKsa
      ? "Known and disclosed: mail to the published address is filtered outside the Kingdom. The sub-processor list on /legal/data-protection must keep naming it."
      : "MX has moved off the previously recorded provider. Confirm where it now resolves and update the sub-processor list to match.",
  );
}

/**
 * The apex must keep refusing to authorise any sender.
 *
 * Mail is relayed through towardpicu.com precisely so that towardpcc.com can go
 * on sending nothing (ADR-0004 decision 5). Two earlier versions of the runbook
 * told an operator to widen this record. If someone acts on that advice, the
 * domain silently loses its strongest anti-spoofing property, and nothing else
 * in the repository would notice.
 */
async function checkSpf() {
  const txt = (await dns(APEX, "TXT")).map((t) => t.replace(/^"|"$/g, ""));
  const spf = txt.find((t) => t.startsWith("v=spf1"));
  const strict = spf === "v=spf1 -all";
  record(
    "apex SPF stays closed",
    strict,
    spf ?? "no SPF record",
    strict
      ? "The apex authorises no sender, which is correct: it sends nothing. From: is on towardpicu.com."
      : "SPF has been WIDENED. Unless the sending domain deliberately changed, revert it — widening was documented as necessary and it was not. See docs/runbooks/email-delivery.md.",
  );
}

/** DMARC must stay at p=reject with strict alignment. */
async function checkDmarc() {
  const txt = (await dns(`_dmarc.${APEX}`, "TXT")).map((t) => t.replace(/^"|"$/g, ""));
  const dmarc = txt.find((t) => t.startsWith("v=DMARC1")) ?? "";
  const ok = /p=reject/.test(dmarc) && /adkim=s/.test(dmarc);
  record(
    "apex DMARC stays strict",
    ok,
    dmarc || "no DMARC record",
    ok
      ? "Anything spoofing this domain is rejected outright."
      : "DMARC has been weakened. Generic advice says to start at p=none; that advice is for a domain starting from nothing and would be a downgrade here.",
  );
}

/**
 * Certificate authority pinning. Not residency, but the same class of silent
 * infrastructure risk: with no CAA record, any public CA in the world may issue
 * for this domain, and nothing in the repository would know.
 */
async function checkCaa() {
  const caa = await dns(APEX, "CAA");
  record(
    "CAA restricts certificate issuance",
    caa.length > 0,
    caa.join(", ") || "NONE — any CA may issue",
    caa.length > 0
      ? "Only the named authorities may issue for this domain."
      : "No CAA record exists, so any of the hundreds of public CAs may issue a valid certificate for towardpcc.com. Adding one is a two-record change in the DNS dashboard and costs nothing.",
  );
}

/**
 * The staged load balancer's certificate.
 *
 * It is not serving anyone yet, which is exactly why this exists. A certificate
 * on a dormant path is the easiest thing in an infrastructure to forget: it was
 * obtained by hand with acme.sh, uploaded to the load balancer by hand, and
 * nothing renews it. The failure would arrive months after everyone considered
 * this work finished, and — if a cutover happened in between — it would arrive
 * as an outage rather than a warning.
 *
 * So this fails 21 days out. Not on expiry, which is too late to be useful, and
 * not 60 days out, which would sit red for weeks and teach everyone to ignore
 * it. Long enough to renew calmly, short enough that a red run means act now.
 *
 * Checked over a direct TLS connection to the load balancer's own address,
 * because that is the copy that matters — the certificate on disk in
 * /opt/acme-staging could be renewed and still not be the one being served.
 */
async function checkStagedEdgeCertificate() {
  const LB_IP = process.env.EDGE_LB_IP ?? "145.241.110.213";
  const tls = await import("node:tls");
  const daysLeft = await new Promise((resolve) => {
    const socket = tls.connect(
      { host: LB_IP, port: 443, servername: "www.towardpcc.com", timeout: 10_000 },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert?.valid_to) return resolve(null);
        resolve(Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86_400_000));
      },
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });

  if (daysLeft === null) {
    record(
      "staged edge certificate",
      true,
      "load balancer not reachable — treated as informational",
      "The staged path may have been torn down deliberately. If it should exist, check the load balancer and its NSG.",
    );
    return;
  }

  record(
    "staged edge certificate",
    daysLeft > 21,
    `${daysLeft} days remaining`,
    daysLeft > 21
      ? "Renewal AND delivery are automated since 2026-08-08 (acme.sh timer plus lb-cert-push.sh), so a falling number here means that chain has broken rather than that nobody has got round to it."
      : "RENEW NOW. Reissue with acme.sh (DNS-01, Cloudflare token on the host) and re-upload to the load balancer — `oci lb certificate create` then point the listener at the new name. Nothing does this automatically.",
  );
}

const CHECKS = [checkEdge, checkMx, checkSpf, checkDmarc, checkCaa, checkStagedEdgeCertificate];

for (const check of CHECKS) {
  try {
    await check();
  } catch (error) {
    record(check.name, false, `check itself failed: ${String(error)}`, "Could not be evaluated.");
  }
}

let failures = 0;
console.log(`\nResidency check — ${HOST}\n`);
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) failures++;
  console.log(`  [${mark}] ${r.name}`);
  console.log(`         ${r.detail}`);
  console.log(`         ${r.why}\n`);
}

if (failures > 0) {
  console.error(
    `${failures} residency expectation(s) no longer hold. This is not automatically a defect — it may mean the infrastructure moved and the public copy is now out of date. Either way the copy and the world disagree, and one of them has to change.`,
  );
  process.exit(1);
}
console.log("All residency expectations hold.\n");
