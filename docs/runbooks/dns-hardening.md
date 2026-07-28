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

### The records

Add these at the **apex** (`towardpcc.com`). Eight records — four issuers ×
`issue` and `issuewild` — plus one reporting record.

| Type | Name            | Tag         | Value                                |
| ---- | --------------- | ----------- | ------------------------------------ |
| CAA  | `towardpcc.com` | `issue`     | `pki.goog; cansignhttpexchanges=yes` |
| CAA  | `towardpcc.com` | `issue`     | `letsencrypt.org`                    |
| CAA  | `towardpcc.com` | `issue`     | `ssl.com`                            |
| CAA  | `towardpcc.com` | `issue`     | `sectigo.com`                        |
| CAA  | `towardpcc.com` | `issuewild` | `pki.goog; cansignhttpexchanges=yes` |
| CAA  | `towardpcc.com` | `issuewild` | `letsencrypt.org`                    |
| CAA  | `towardpcc.com` | `issuewild` | `ssl.com`                            |
| CAA  | `towardpcc.com` | `issuewild` | `sectigo.com`                        |
| CAA  | `towardpcc.com` | `iodef`     | `mailto:ahmedsk2@gmail.com`          |

Flags stay `0` on all of them. In the Cloudflare UI the tag is a dropdown
("Only allow specific hostnames" = `issue`, "Only allow wildcards" = `issuewild`,
"Send violation reports to" = `iodef`).

`issuewild` is included deliberately even though no wildcard certificate is used
today. Omitting it does **not** mean "no wildcards" — a CAA set with `issue` but
no `issuewild` allows wildcard issuance by the same authorities, so leaving it
out buys nothing and leaves the intent unstated.

The `iodef` record asks a CA to email you when it refuses an issuance because of
these records. That is the only signal you will ever get that someone tried to
obtain a certificate for your domain.

### Verify

```bash
dig towardpcc.com CAA +short
```

Expect nine lines. Then, and this is the part people skip, **check the site's
certificate still renews**. Cloudflare's edge certificate renews automatically
about 30 days before expiry, so a CAA mistake surfaces roughly a month later.
Note the expiry now and put a reminder a week before it:

```bash
echo | openssl s_client -servername www.towardpcc.com -connect www.towardpcc.com:443 2>/dev/null \
  | openssl x509 -noout -dates -issuer
```

### After the edge migration

Once TLS terminates on the OCI load balancer instead of Cloudflare (ADR-0004),
the certificate is entirely ours and comes from Let's Encrypt via DNS-01. At
that point tighten this to `letsencrypt.org` alone and delete the other three —
the reason for the wide set disappears with Cloudflare.

---

## 2. DNSSEC — sign the zone

DNSSEC lets a resolver verify that a DNS answer really came from your zone and
was not forged in transit. Without it, an attacker positioned to spoof DNS can
send a visitor to another server, and the visitor's resolver cannot tell.

**This one can break the domain completely**, which the CAA change cannot. If
the DS record at the registrar does not match the key Cloudflare is signing
with, validating resolvers return SERVFAIL and the site becomes unreachable for
a large share of the internet — not slow, _gone_. It is also the failure mode
that produces the `dnssec: bogus` error that blocks certificate issuance.

So: two steps, in this order, and do not leave a gap between them.

1. **Cloudflare → DNS → Settings → DNSSEC → Enable.** Cloudflare starts signing
   the zone and shows you a DS record: key tag, algorithm, digest type, digest.
   Nothing is validated yet, because the parent zone has no DS.
2. **GoDaddy → domain → DNSSEC → add the DS record**, copying those four fields
   exactly. This is the moment validation begins.

Do not do step 2 from a screenshot or from memory — copy each field from the
Cloudflare panel while it is open.

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
