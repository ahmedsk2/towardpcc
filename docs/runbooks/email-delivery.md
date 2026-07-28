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

## Relay: mail.towardpicu.com

**Decided 2026-07-28 (ADR-0004 decision 5).** The relay is
`mail.towardpicu.com` and `MAIL_FROM` is `TowardPCC <info@towardpicu.com>`.

**It is outside Saudi Arabia** — `35.212.69.243`, Google Cloud in Washington DC,
answering on 587 as `gvam1201.siteground.biz`. That is a deliberate, recorded
carve-out from the KSA-only mandate, not an oversight, and ADR-0004 sets out
exactly what makes it defensible and what would break it. The short version:
the only message this relay carries is the admin notification, whose body is a
submission type and a link — no submitter data — delivered to a mailbox that is
already outside the Kingdom.

**Read ADR-0004 decision 5 before reinstating any submitter-facing mail.** The
carve-out does not survive that change.

**Configure it in the admin area, not here.** `/admin/settings` writes these
values to the database, encrypted where they are secret, and they override the
environment. That is now the supported path — it needs no redeploy, and the
transport picks up a changed password immediately because it is keyed on a
fingerprint of the settings rather than cached for the life of the process.

```
SMTP_HOST      mail.towardpicu.com
SMTP_PORT      587
SMTP_SECURE    false
SMTP_USER      info@towardpicu.com
SMTP_PASSWORD  (the mailbox password)
MAIL_FROM      TowardPCC <info@towardpicu.com>
MAIL_REPLY_TO  (blank)
```

`SMTP_SECURE=false` is correct and not a downgrade: `secure: true` in nodemailer
means implicit TLS on port 465. On 587 the connection starts plaintext and is
upgraded by STARTTLS, which nodemailer does automatically. If the provider only
offers 465, set port 465 and secure true **together** — one without the other
fails to connect.

### Why towardpcc.com's DNS is not touched

The From: domain is `towardpicu.com`, whose SPF already authorises this relay
and whose DMARC is `p=none`. towardpcc.com keeps `v=spf1 -all` and
`p=reject; adkim=s; aspf=s`, which is the strongest possible anti-spoofing
posture for a domain that sends nothing — and under this arrangement it still
sends nothing.

DMARC aligns on the **From: header domain**, not the relay, so sending as
`@towardpcc.com` through this relay would be rejected outright by every
conforming receiver — silently, with nothing in the application logs, because
from the app's side the relay accepted the message. That is why MAIL_FROM is on
towardpicu.com and why widening towardpcc.com's SPF would be the wrong fix to
the wrong problem.

**Residual, non-blocking:** towardpicu.com publishes no DKIM key, so SPF alone
must carry authentication and it breaks on forwarding. Its DMARC is `p=none`
with no `rua=`, so nothing is enforced or observed. Both are cheap to add and
neither is worth holding launch for at this volume.

### The in-region alternative, if the carve-out ever stops being acceptable

OCI Email Delivery in me-riyadh-1 was researched and verified available:
`smtp.email.me-riyadh-1.oci.oraclecloud.com` answers on 587 with a real ESMTP
banner, quotas are 200/day and 10/s, and nothing is configured yet. Taking it
would mean creating an email domain, a DKIM selector and an approved sender in
the OCI console, then publishing a verification TXT and a DKIM CNAME
(**grey-cloud**, and confirm zone-wide CNAME Flattening is off).

**Do NOT widen towardpcc.com's SPF for it.** SPF is evaluated against the
envelope MAIL FROM, which under OCI's default return path is an Oracle-owned
domain, so the apex record is never consulted — a strict-aligned DKIM signature
is what earns the DMARC pass under `adkim=s`. Keep `-all` untouched.

## Current state

**Not configured.** `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are empty, so
submissions are stored and nobody is notified. The founder sets them in
`/admin/settings`; nothing else is outstanding.

## Verify

1. Enter the settings at `/admin/settings` and save. The red banner is replaced
   by a green one and a **Send a test email** button appears.
2. Press it. This is the fastest check and needs no fake submission: it sends a
   fixed message to `ADMIN_EMAIL` and reports the relay's answer on screen, with
   the full error in the application log. It exercises what you just saved — the
   transport is keyed on a fingerprint of the settings, not cached for the life
   of the process.
3. Read the headers of the received message. Expect **`spf=pass`** with
   `smtp.mailfrom` on towardpicu.com. Expect **`dkim=none`** — that domain
   publishes no DKIM key, so there is nothing to verify against, and `none` is
   the correct result rather than a failure. `dkim=fail` would mean something is
   signing badly and needs looking at.
4. Confirm the From: header reads `info@towardpicu.com`, **not**
   `@towardpcc.com`. Mail claiming the latter is rejected outright by every
   conforming receiver, silently, with nothing in the logs.
5. Submit through `/contact` and confirm the notification arrives too — the test
   send and the real path share a transport but not a caller.

## What NOT to do to towardpcc.com's DNS (TM-008)

Nothing. That is the whole instruction, and it is worth a heading because two
earlier versions of this runbook said the opposite.

`towardpcc.com` publishes `v=spf1 -all` and
`p=reject; sp=reject; adkim=s; aspf=s`. For a domain that sends no mail — which,
under this arrangement, it does not — that is the strongest possible
anti-spoofing posture and it should stay exactly as it is. Widening SPF to
"accommodate the relay" would open a spoofing window on a domain whose whole
purpose is to send nothing, to solve a problem that choosing the right From:
domain already solved.

**Worth adding, and cheap:** a `rua=` tag, keeping `p=reject`:

```
v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:ahmedsk2@gmail.com
```

Today there is no `rua=`, so DMARC is enforcing silently and nobody collects the
reports that would show what is passing or failing. **Do not drop to `p=none`
to "ease the transition"** — that is generic advice for a domain starting from
nothing; here it would downgrade an already-correct policy for the sake of
something `rua=` reporting handles without weakening anything.

## If mail breaks later

The app never fails a submission because of mail, so a broken relay is quiet by
construction. The signals, in the order you will meet them:

- the `/admin` banner, if configuration went missing;
- `admin notification email failed` in the app logs, if the relay rejects or
  times out (the transport gives up after 10s connect / 20s socket, so a hung
  relay cannot stall the request path);
- nothing at all, if mail is being accepted and then filtered — which is what
  the DKIM/SPF check in step 3 above is for.
