# Runbook: outbound email

Transactional mail only — two flows, both defined in `apps/web/lib/email.ts`:

- **Admin notification** when a submission arrives. Carries no submitter data,
  only a link into the admin inbox.
- **Submitter acknowledgement**, sent **only after a human triages**. Never an
  auto-reply: an instant reply confirms to a spammer that the address is live,
  and lets an attacker use towardpcc.com to send attacker-chosen text to an
  attacker-chosen address (threat-model TM-002).

## Sending domain: towardpicu.com, not towardpcc.com

**Decided 2026-07-28.** Mail is relayed through **towardpicu.com**, and
`MAIL_FROM` is `TowardPCC <info@towardpicu.com>`.

This is not cosmetic. DMARC aligns against the **From: header domain**, not the
relay — so a message sent through any relay but addressed from
`@towardpcc.com` is judged against towardpcc.com's policy, which is:

```
towardpcc.com         TXT  "v=spf1 -all"
_dmarc.towardpcc.com  TXT  "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;"
```

Nothing may send as that domain, and receivers should reject anything that
claims to. Every message would have been **rejected outright** — not
spam-filed — with nothing in the application logs, because from the app's side
the relay accepted it.

towardpicu.com already authenticates:

```
towardpicu.com         TXT  "v=spf1 +a +mx +ip4:35.212.21.31 include:towardpicu.com.spf.auto.dnssmarthost.net ~all"
_dmarc.towardpicu.com  TXT  "v=DMARC1; p=none; aspf=r; adkim=r;"
```

`MAIL_REPLY_TO` is `info@towardpcc.com`, so the envelope and From: stay on the
domain that can authenticate while a clinician replying still reaches the
address printed on the site.

**Two things this leaves open.** towardpicu.com has no DKIM record, so mail
passes SPF but is unsigned — acceptable at low volume, worth adding before
volume rises. And its DMARC is `p=none`, meaning nobody is enforcing or
reporting on it; adding `rua=` there would make failures visible.

## Current state

**Not configured.** `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are still
empty in production, so submissions are stored and nobody is notified. The
relay exists on towardpicu.com; its host and credentials have not been entered
into Coolify.

Until it is configured the admin inbox shows a warning banner naming the
missing variables, and the app logs one error per process:
`outbound email is NOT configured`. Both exist because the previous behaviour
was silent — mail is best-effort by design so a failure never loses a
submission, which also meant a broken relay looked exactly like "nobody has
written to us".

## Setup: the towardpicu.com relay

Only one thing is left, and it mints a credential, so it is done by the owner
and not automated here: **the SMTP host, username and password for the mailbox
that already exists at towardpicu.com.** Take them from that domain's mail
provider — the SPF record points at dnssmarthost, so it is the SiteGround-side
mail service, not OCI.

Set them on the application in Coolify (production environment) and redeploy:

```
SMTP_HOST=<the provider's outgoing server>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@towardpicu.com
SMTP_PASSWORD=<the mailbox password>
```

`MAIL_FROM`, `MAIL_REPLY_TO`, `SMTP_PORT`, `SMTP_SECURE` and `ADMIN_EMAIL` are
already set.

`SMTP_SECURE=false` is correct and not a downgrade: `secure: true` in nodemailer
means implicit TLS on port 465. On 587 the connection starts plaintext and is
upgraded by STARTTLS, which nodemailer does automatically. If the provider only
offers 465, set `SMTP_PORT=465` and `SMTP_SECURE=true` together — one without
the other fails to connect.

**Do not change towardpcc.com's DNS to make this work.** Its `v=spf1 -all` and
`p=reject` are correct for a domain that sends no mail, and this setup means it
still sends none. Widening them would open a spoofing window to solve a problem
that choosing the right From: domain already solved.

## Residency: this relay is outside KSA

The app and database run in `me-riyadh-1`. This relay does not: the SPF record
authorises `35.212.21.31`, which is Google Cloud, and dnssmarthost's
infrastructure is EU/US. Mail bodies carry the submitter's name and message, so
the relay processes that data outside the region.

That is a widening of the §8.3 residency story, and it is a deliberate,
already-accepted one — the privacy notice states that processing may occur
outside KSA, which was written to cover exactly this and the Cloudflare TLS
termination in TM-006a. It is recorded here so the next person does not
discover it by surprise.

**The residency upgrade, if it is ever wanted:** OCI Email Delivery runs in the
same region and tenancy as the app. Verified 2026-07-27 that the service is
available in the tenancy and `smtp.email.me-riyadh-1.oci.oraclecloud.com`
resolves. Taking it would mean creating an email domain, a DKIM selector and an
approved sender in the OCI console, and then widening towardpcc.com's SPF to
include OCI's hosts while keeping `-all` — the DNS change this setup avoids.
Worth doing if mail volume or the residency commitment ever grows; not worth
doing for a contact form that fires a handful of times a month.

## Verify

1. The banner at `/admin` disappears.
2. Submit through `/contact` and confirm the mail arrives.
3. Read the headers of the received message. Expect `spf=pass`. Expect
   `dkim=none` — towardpicu.com publishes no DKIM key, so there is nothing to
   verify against, and `none` is the correct result rather than a failure.
   `dkim=fail` would mean something is signing badly and needs looking at.
4. Reply to the message and confirm it reaches `info@towardpcc.com`. This is
   what `MAIL_REPLY_TO` buys, and it is the only part of the setup a submitter
   ever sees.

## Send authentication before first send (TM-008)

The usual reason to get authentication right before the first send is
reputation: early unauthenticated mail trains receivers against the domain and
that is slow to rebuild.

Here the failure would have been more immediate than that. Sending as
`@towardpcc.com` — which is what `MAIL_FROM` said until 2026-07-28 — meant
being judged against `v=spf1 -all` and `p=reject`. Mail would not have landed
in spam; it would have been rejected outright, silently, with nothing in the
application logs to explain it, because from the app's point of view the relay
accepted the message. Sending from the domain that can authenticate is what
resolves this, not a DNS change.

**What is still worth adding**, in the order the return justifies the work:

1. **DKIM on towardpicu.com.** SPF alone breaks on forwarding — a mailing list
   or a `.forward` rewrites the envelope and the SPF pass is lost, while a DKIM
   signature survives. Low volume tolerates this; growth will not.
2. **`rua=` on towardpicu.com's DMARC.** It is `p=none` with no reporting
   address, so nothing is enforced and nothing is observed. Adding `rua=` costs
   nothing and makes failures visible before a submitter reports them.

## If mail breaks later

The app never fails a submission because of mail, so a broken relay is quiet by
construction. The signals, in the order you will meet them:

- the `/admin` banner, if configuration went missing;
- `admin notification email failed` in the app logs, if the relay rejects or
  times out (the transport gives up after 10s connect / 20s socket, so a hung
  relay cannot stall the request path);
- nothing at all, if mail is being accepted and then filtered — which is what
  the DKIM/SPF check in step 3 above is for.
