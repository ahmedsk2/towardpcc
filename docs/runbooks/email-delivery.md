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

5. **DNS in Cloudflare** — add the records below. Take SPF and DKIM values
   verbatim from the console; they are tenancy- and region-specific, so do not
   copy them from documentation, including this file.

   | Type  | Name                    | Value                                             |
   | ----- | ----------------------- | ------------------------------------------------- |
   | TXT   | `@`                     | SPF — exactly as shown in the OCI console         |
   | CNAME | `<selector>._domainkey` | DKIM — exactly as shown in the OCI console        |
   | TXT   | `_dmarc`                | `v=DMARC1; p=none; rua=mailto:ahmedsk2@gmail.com` |

   Set these records to **DNS-only (grey cloud)**. Proxying a TXT record is not
   possible, but a proxied CNAME would break DKIM verification.

   Start DMARC at `p=none` — monitor only. Move to `p=quarantine` once the
   reports show legitimate mail passing. Publishing `p=reject` before the first
   send is how a domain silently blackholes its own mail.

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

SPF, DKIM and DMARC must all exist **before** the first message goes out. Early
unauthenticated mail trains receivers against the domain, and that reputation
is slow to rebuild — the reason this is a launch blocker rather than a
follow-up.

## If mail breaks later

The app never fails a submission because of mail, so a broken relay is quiet by
construction. The signals, in the order you will meet them:

- the `/admin` banner, if configuration went missing;
- `admin notification email failed` in the app logs, if the relay rejects or
  times out (the transport gives up after 10s connect / 20s socket, so a hung
  relay cannot stall the request path);
- nothing at all, if mail is being accepted and then filtered — which is what
  the DKIM/SPF check in step 3 above is for.
