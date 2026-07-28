# Runbook: outbound email

Transactional mail only — **one** flow, plus a manual test, both defined in
`apps/web/lib/email.ts`:

- **Admin notification** when a submission arrives. Carries no submitter data,
  only a type label and a link into the admin inbox.
- **A test send**, triggered by hand from `/admin`, to a recipient read from
  `ADMIN_EMAIL` with a fixed body.

Neither takes a recipient as an argument, and `lib/mail-config.test.ts` fails
the build if one ever does. That is TM-002 held structurally: the app cannot be
induced to send attacker-chosen text to an attacker-chosen address, because
there is no parameter through which to try.

The **submitter acknowledgement was removed** under ADR-0004 — see below.

## Sending domain and relay: OCI Email Delivery, me-riyadh-1

**Decided 2026-07-28 (ADR-0004).** Mail is relayed through **OCI Email Delivery
in me-riyadh-1**, and `MAIL_FROM` is `TowardPCC <info@towardpcc.com>`.

This reverses a decision made earlier the same day to relay through
towardpicu.com. That relay authorises `35.212.21.31` (Google Cloud) and
includes dnssmarthost, a SiteGround service — both outside Saudi Arabia. Under
the KSA-only mandate it is disqualified. It never sent a message, so this is a
plan being corrected, not a breach being remediated.

**Only ONE flow now exists.** The submitter acknowledgement was removed under
ADR-0004: mail delivered to a mailbox the recipient chose leaves the Kingdom by
construction, and no relay choice changes that. What remains is the admin
notification, which carries no submitter data — a type label and a link into the
admin inbox.

### Do NOT widen towardpcc.com's SPF

Earlier versions of this runbook said to widen `v=spf1 -all` to include the
relay's hosts. **That advice was wrong and has been removed.**

SPF is evaluated against the **envelope MAIL FROM**, which under OCI's default
return path is an Oracle-owned `*.rp.oracleemaildelivery.com` subdomain. The
apex record is never consulted. Oracle's own documentation notes that SPF
alignment fails by construction with the default return path, and that **DKIM
alignment is what earns the DMARC pass**. An OCI DKIM key for the towardpcc.com
email domain signs `d=towardpcc.com`, which satisfies the zone's `adkim=s`
exactly.

So `v=spf1 -all` stays untouched — strictly safer than widening it, and it keeps
the domain's anti-spoofing posture at maximum while it sends through a relay it
never has to authorise.

### Setup, in this order

Steps 1 and 3–5 are in the OCI console and mint credentials, so they are done by
the owner. **The order matters: getting it wrong means silent total failure.**

1. **Email Domain** → create `towardpcc.com` in Email Delivery (me-riyadh-1).
   This mints the verification ID, so the domain must exist before anything can
   be published. Authorises no sending on its own.
2. **Publish the verification TXT** that OCI displays, in Cloudflare.
3. **DKIM** → create a selector. Publish the CNAME OCI generates **as DNS-only
   (grey cloud)**, and separately confirm **zone-wide CNAME Flattening is off** —
   flattening breaks DKIM lookup even on a grey-clouded record.
4. **Wait for DKIM to report ACTIVE.** Do not proceed on a pending key.
5. **Approved Sender** → add `info@towardpcc.com`. Mail from an unapproved
   sender is rejected outright.
6. **SMTP Credentials** — under your OCI _user_, not the domain (Identity →
   Users → SMTP Credentials). The password is shown **once** and is
   unrecoverable. It is not your console password.
7. **Coolify env**, then redeploy:

   ```
   SMTP_HOST=smtp.email.me-riyadh-1.oci.oraclecloud.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<the SMTP username from step 6>
   SMTP_PASSWORD=<the SMTP password from step 6>
   ```

   `MAIL_FROM` and `ADMIN_EMAIL` are already set. `MAIL_REPLY_TO` is
   deliberately empty — From: is now the site's own domain, so replies reach it
   directly.

   **`SMTP_HOST` is the real gate.** Everything else can be set safely in
   advance because nothing sends while it is blank. Set it last, after DKIM is
   ACTIVE.

`SMTP_SECURE=false` is correct and not a downgrade: `secure: true` in nodemailer
means implicit TLS on port 465. On 587 the connection starts plaintext and is
upgraded by STARTTLS, which nodemailer does automatically.

### Verified available (2026-07-28)

- `get_email_configuration` in me-riyadh-1 returns
  `smtp.email.me-riyadh-1.oci.oraclecloud.com`.
- Region-scoped quotas provisioned: **200 emails/day, 10/s**, 2 MB max message.
  The admin notification fires once per submission, so this is comfortable.
- Endpoint live, not merely resolvable: TCP 587 answers with a real ESMTP
  banner.
- Nothing configured yet: 0 email domains, 0 senders, 0 return paths.

**One thing that could not be verified:** Oracle's internal handling of Email
Delivery — queueing, suppression lists, bounce processing, logs. Plausibly
in-region for a regional service, but no API exposes it and no contractual
in-region guarantee was found. **Do not state it publicly as fact.**

## Current state

**Not configured.** `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are empty in
production, so submissions are stored and nobody is notified.

## Verify

1. The banner at `/admin` disappears and a **Send a test email** button appears
   in its place.
2. Press it. This is the fastest check and it needs no fake submission: it
   sends a fixed message to `ADMIN_EMAIL` and reports the relay's answer on
   screen, with the full error in the application log.
3. Read the headers of the received message. Expect **`dkim=pass`** with
   `d=towardpcc.com` — that is what earns the DMARC pass under `adkim=s`.
   Expect SPF **not** to align, which is correct and expected: the envelope
   MAIL FROM is Oracle's return-path domain, not ours.
4. Submit through `/contact` and confirm the notification arrives too — the
   test send and the real path share a transport but not a caller.

One limitation worth knowing: the nodemailer transport is built once per
process and caches `SMTP_HOST/PORT/SECURE/USER/PASSWORD`. The test button
therefore exercises the configuration the container **booted with**. A Coolify
env change triggers a redeploy, so in practice they agree — but a hot-edited
variable will not be reflected.

## Send authentication before first send (TM-008)

The usual reason to get authentication right before the first send is
reputation: early unauthenticated mail trains receivers against the domain and
that is slow to rebuild.

Here the failure is more immediate than that. `towardpcc.com` publishes
`v=spf1 -all` and `p=reject`, so mail sent as that domain without a valid DKIM
signature is **rejected outright** — not spam-filed — with nothing in the
application logs, because from the app's point of view the relay accepted it.
**This is why DKIM must be ACTIVE before `SMTP_HOST` is set**, and why the
setup order above is not a suggestion.

**Still worth adding, once mail is live:** a `rua=` tag on the zone's DMARC
record, keeping `p=reject`:

```
v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:ahmedsk2@gmail.com
```

Today there is no `rua=`, so DMARC is enforcing silently and nobody collects the
reports that would show what is passing or failing. **Do not drop to `p=none`
to "ease the transition"** — that is generic advice for a domain starting from
nothing, and here it would be a downgrade from an already-correct policy for the
sake of something `rua=` reporting handles without weakening anything.

## If mail breaks later

The app never fails a submission because of mail, so a broken relay is quiet by
construction. The signals, in the order you will meet them:

- the `/admin` banner, if configuration went missing;
- `admin notification email failed` in the app logs, if the relay rejects or
  times out (the transport gives up after 10s connect / 20s socket, so a hung
  relay cannot stall the request path);
- nothing at all, if mail is being accepted and then filtered — which is what
  the DKIM/SPF check in step 3 above is for.
