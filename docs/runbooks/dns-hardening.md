# Runbook: CAA records and DNSSEC

Two DNS changes, both done by the owner in the Cloudflare and GoDaddy
dashboards. Neither is urgent, both are cheap, and **both can take the site
offline if done carelessly** — so the order and the verification steps matter
more than the records themselves.

Current state, verified 2026-07-29 from two independent resolvers
(Cloudflare `1.1.1.1` and Google `8.8.8.8`):

```
towardpcc.com      CAA  → none
_dmarc, SPF        → correct and unchanged
towardpcc.com      DS   → none          (DNSSEC not enabled)
AD flag            → false              (answers are not validated)
```

So today **any of the ~150 public certificate authorities can issue a valid
certificate for towardpcc.com**, and nothing would notice. That is the gap CAA
closes.

---

## 1. CAA — restrict who may issue certificates

### The trap, read this first

The obvious CAA record is `issue "letsencrypt.org"`, because Traefik uses Let's
Encrypt for the origin certificate. **That would eventually take the site
down.**

Cloudflare terminates TLS at the edge and issues its own certificate for
`towardpcc.com`. On the **Universal SSL** plan you cannot choose which CA it
uses — Cloudflare picks from its partners and may rotate between them for
operational reasons. A CAA record that names only Let's Encrypt tells every
other partner "you may not issue", and the next renewal fails with
`CAA records block issuance`. The certificate does not fail immediately; it
fails at renewal, weeks later, with no obvious connection to this change.

So the record set below permits **all four of Cloudflare's documented partner
CAs**. It narrows issuance from roughly 150 authorities to four, which is most
of the benefit, without betting the site on which one Cloudflare picks tomorrow.

### The records — APPLIED 2026-07-29

Nine records were created via the API: `issue` and `issuewild` for `pki.goog`,
`letsencrypt.org`, `ssl.com` and `sectigo.com`, plus an `iodef` reporting
address.

**DNS then returned thirteen.** Cloudflare silently added `comodoca.com` and
`digicert.com` for both tags, on its own initiative. That is the behaviour its
documentation describes — "if Cloudflare has automatically added CAA records on
your behalf, these records will not appear in the Cloudflare dashboard" — and it
is a safety net doing exactly its job: it noticed a CAA set that did not cover
every partner CA it might issue from, and widened it rather than letting a
future renewal fail.

Two things follow from that, both worth knowing:

- **The dashboard is not the source of truth for CAA on this zone.** Always
  check with `dig`, or you will be reasoning about nine records when thirteen
  are published.
- The trap described above is real but Cloudflare partially defends against it.
  Do not rely on that. It widened a set that was already close to correct; there
  is no promise it rescues a set naming only Let's Encrypt.

Verified after the change: the edge certificate is still valid — issued by
Let's Encrypt, expiring 2026-10-08 — and every public route still returns 200.

### After the edge migration

Once TLS terminates on the OCI load balancer instead of Cloudflare (ADR-0004),
the certificate is entirely ours and comes from Let's Encrypt via DNS-01. At
that point tighten this to `letsencrypt.org` alone and delete the other three —
the reason for the wide set disappears with Cloudflare.

---

## 2. DNSSEC — half done, one step left for you

DNSSEC lets a resolver verify that a DNS answer really came from your zone and
was not forged in transit. Without it, an attacker positioned to spoof DNS can
send a visitor elsewhere and the visitor's resolver cannot tell.

**Cloudflare-side: DONE 2026-07-29.** The zone is signed and reports `pending`,
which means signing has started but nothing validates yet, because the parent
zone has no DS record. That state is safe and can sit indefinitely.

**Registrar-side: yours, because I have no GoDaddy access.** Add this DS record
at GoDaddy → towardpcc.com → DNSSEC:

| Field       | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| Key tag     | `2371`                                                             |
| Algorithm   | `13` (ECDSA Curve P-256 with SHA-256)                              |
| Digest type | `2` (SHA-256)                                                      |
| Digest      | `237A6EA0A6C093FD1FA417EC295287E7203A1EA6303DDF9E7612058CB75B15ED` |

**This is the step that can break the domain**, which nothing before it could.
The moment that DS is published, validating resolvers start checking signatures.
If the DS does not match the key Cloudflare signs with, they return SERVFAIL and
the site becomes unreachable for a large share of the internet — not slow, gone.
It is also what produces the `dnssec: bogus` error that blocks certificate
issuance.

So copy each field from the table rather than retyping it, and verify
immediately afterwards.

### Verify, before you consider it done

```bash
dig towardpcc.com DS +short          # the DS is published at .com
dig +dnssec towardpcc.com A          # answers carry RRSIG records
```

Then confirm a validating resolver actually accepts it:

```bash
curl -s 'https://dns.google/resolve?name=towardpcc.com&type=A' | grep -o '"AD":[a-z]*'
```

`"AD":true` means validated. If it is still `false` an hour later, or anything
returns SERVFAIL, **remove the DS record at GoDaddy immediately** — that alone
restores resolution, because validation stops when the parent has no DS. Do not
try to fix it forwards under pressure.

Full DNSSEC chain diagnostics: <https://dnsviz.net/d/towardpcc.com/dnssec/>

### Why not do this first

DNSSEC and CAA interact in one direction: a broken DNSSEC chain makes CAA
lookups fail, and a failed CAA lookup blocks certificate issuance. Doing CAA
first means that if DNSSEC does go wrong, you are debugging one problem rather
than two.

---

## What this does not cover

Neither change protects against a compromise of the Cloudflare account itself,
which can rewrite both. That is what the registrar locks, and two-factor
authentication on the Cloudflare and GoDaddy accounts, are for — tracked
separately under TM-008.

`scripts/check-residency.mjs` asserts the CAA record exists and runs daily. It
currently fails on it, deliberately, and will go green once step 1 lands.
