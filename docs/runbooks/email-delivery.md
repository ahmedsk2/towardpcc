# Runbook: outbound email

Transactional mail only — two flows, both defined in `apps/web/lib/email.ts`:

- **Admin notification** when a submission arrives. Carries no submitter data,
  only a link into the admin inbox.
- **Submitter acknowledgement**, sent **only after a human triages**. Never an
  auto-reply: an instant reply confirms to a spammer that the address is live,
  and lets an attacker use towardpcc.com to send attacker-chosen text to an
  attacker-chosen address (threat-model TM-002).

## Current state

**Not configured.** `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are empty in
production, so submissions are stored and nobody is notified.

Until it is configured the admin inbox shows a warning banner naming the
missing variables, and the app logs one error per process:
`outbound email is NOT configured`. Both exist because the previous behaviour
was silent — mail is best-effort by design so a failure never loses a
submission, which also meant a broken relay looked exactly like "nobody has
written to us".

## Provider: OCI Email Delivery (me-riyadh-1)

Chosen over Resend/SES/Postmark for one reason that matters here: it runs in
**the same region and tenancy as the app**. Every alternative relays mail
through the US or EU, which would widen the §8.3 residency story further at a
moment when Cloudflare already terminates TLS outside the origin region
(threat-model TM-006a). Mail bodies contain the submitter's name and message,
so the relay is a processor of that data.

Verified 2026-07-27: the service is available in the tenancy (the API responds,
with zero domains configured) and `smtp.email.me-riyadh-1.oci.oraclecloud.com`
resolves.

| Setting    | Value                                        |
| ---------- | -------------------------------------------- |
| Host       | `smtp.email.me-riyadh-1.oci.oraclecloud.com` |
| Port       | `587`                                        |
| Encryption | STARTTLS → `SMTP_SECURE=false`               |
| Sender     | `info@towardpcc.com`                         |

`SMTP_SECURE=false` is correct and not a downgrade: `secure: true` in nodemailer
means implicit TLS on port 465. On 587 the connection starts plaintext and is
upgraded by STARTTLS, which nodemailer does automatically.

## Setup

Steps 1–4 are in the OCI console (Developer Services → Application Integration
→ Email Delivery). They mint a credential, so they are done by the owner, not
automated here.

1. **Email Domain** → create `towardpcc.com`.
2. **DKIM** → add a selector (e.g. `towardpcc`). OCI generates a CNAME or TXT
   record; copy the exact value it displays.
3. **Approved Sender** → add `info@towardpcc.com`. Mail from an unapproved
   sender is rejected.
4. **SMTP Credentials** (under your OCI _user_, not the domain) → generate.
   The password is shown **once**. It is not the console password.

5. **DNS in Cloudflare — these records already exist and must be CHANGED, not
   added.** Verified 2026-07-27:

   ```
   towardpcc.com         TXT  "v=spf1 -all"
   _dmarc.towardpcc.com  TXT  "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;"
   ```

   Read together, that says: _nothing on earth is authorised to send mail as
   this domain, and receivers should reject anything that claims to be._ For a
   domain that sends no mail this is exactly right — it is the strongest
   possible anti-spoofing posture, and it should stay in place until the moment
   the relay goes live.

   **It also means the first message you send will be rejected by every
   receiver** unless SPF is widened first. There will be no bounce you notice
   and no error in the app; the mail will simply not arrive. Change the DNS
   before the first send, not after.

   Do it in this order. Each step is safe on its own, and none of them weakens
   the domain at any point:

   1. **Add `rua=` to the existing DMARC record**, keeping `p=reject`:
      `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:ahmedsk2@gmail.com`
      Today there is no `rua=`, so DMARC is enforcing silently and no one is
      collecting the reports that would show what is passing or failing. Add
      this first so the later steps are observable.
   2. **Add the DKIM record** OCI generates for your selector.
   3. **Widen SPF** from `v=spf1 -all` to include OCI's sending hosts, keeping
      the `-all` hard fail:
      `v=spf1 include:<value from the OCI console> -all`
   4. **Send a test and read the headers** for `dkim=pass` and `spf=pass`
      before trusting it.

   Take the SPF include and DKIM values verbatim from the OCI console — they
   are tenancy- and region-specific, so do not copy them from documentation,
   including this file.

   Set every one of these to **DNS-only (grey cloud)**. A proxied CNAME breaks
   DKIM verification.

   **Do not drop DMARC to `p=none`.** Generic advice says to start permissive
   and tighten later, and an earlier version of this runbook repeated it — but
   that advice assumes you are starting from nothing. Here it would be a
   downgrade from an already-correct policy, opening a spoofing window for the
   sake of a transition that `rua=` reporting handles without weakening
   anything.

6. **Coolify env** — set on the application (production environment), then
   redeploy:

   ```
   SMTP_HOST=smtp.email.me-riyadh-1.oci.oraclecloud.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<the SMTP username from step 4>
   SMTP_PASSWORD=<the SMTP password from step 4>
   MAIL_FROM=TowardPCC <info@towardpcc.com>
   ```

   `ADMIN_EMAIL` is already set.

## Verify

1. The banner at `/admin` disappears.
2. Submit through `/contact` and confirm the mail arrives.
3. Check the headers of the received message for `dkim=pass` and `spf=pass`.
   A message that arrives but fails either will start landing in spam once
   volume rises.

## Send authentication before first send (TM-008)

SPF, DKIM and DMARC must all be **correct** before the first message goes out —
which for this domain means widened, not created. They already exist in their
most restrictive form.

The usual reason to get this right first is reputation: early unauthenticated
mail trains receivers against the domain and that is slow to rebuild. Here the
failure is more immediate than that. With `v=spf1 -all` and `p=reject`, mail
does not land in spam — it is rejected outright, silently, with nothing in the
application logs to explain it, because from the app's point of view the relay
accepted the message.

## If mail breaks later

The app never fails a submission because of mail, so a broken relay is quiet by
construction. The signals, in the order you will meet them:

- the `/admin` banner, if configuration went missing;
- `admin notification email failed` in the app logs, if the relay rejects or
  times out (the transport gives up after 10s connect / 20s socket, so a hung
  relay cannot stall the request path);
- nothing at all, if mail is being accepted and then filtered — which is what
  the DKIM/SPF check in step 3 above is for.
