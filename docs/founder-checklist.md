# Founder checklist — the nine things only Ahmed can do

Written 2026-08-07. Everything else on `LAUNCH-BLOCKERS.md` is either done or is
work that does not need you. This is the residue: purchases, credentials, people,
legal judgement, and two clicks.

Ordered by lead time, not importance — the slow ones are first because they
finish last.

---

## 1. Counsel review of the legal pages

**Lead time: weeks. Start this one first.**

Two pages ship today telling readers they are provisional. The markers are at
`apps/web/content/site.ts:777` (privacy policy) and `:810` (terms), and each
renders a visible `pendingNote` to every visitor:

> "Summary terms pending a counsel review before public launch."

**What to send counsel.** The live URLs — `/legal/data-protection`,
`/legal/terms`, `/legal/disclaimer` — plus these four questions, which are the
ones the repository cannot answer for itself:

1. Does the privacy policy accurately describe PDPL obligations for a service
   that stores contact-form submissions in Saudi Arabia and processes nothing
   else? Note that calculator inputs never reach a server.
2. Are the terms adequate for a free clinical-calculator service aimed at
   clinicians, given the medical disclaimer on `/legal/disclaimer`?
3. **Does TowardPCC need to appoint a Data Protection Officer?** Our reading is
   no — the mandatory criteria are public-entity-at-scale, regular systematic
   monitoring, or sensitive data as a core activity, and we plausibly meet none.
   The SDAIA breach-notice form asks for a DPO "if any", so "none appointed" is
   a legitimate answer if that reading holds.
4. **Do the three sub-processors need executed DPAs?** They are Oracle Cloud
   (hosting, in-Kingdom), Cloudflare (edge, transit only), and a non-KSA mail
   relay for operator notifications. See item 2 — this one is not just
   paperwork.

**Done when:** counsel has answered, the copy is corrected, and both
`TODO(counsel-review)` markers plus both `pendingNote` strings are deleted.

---

## 2. Counsel — the 72-hour breach clock, and one decision

**Do this in the same engagement as item 1.** It is a different question and it
has a deadline attached.

Saudi PDPL gives a controller **72 hours from becoming aware** of a personal-data
breach to notify SDAIA, on a harm test with no size floor. Notifying affected
data subjects is a separate duty on a looser clock — "without undue delay". There
is **no encryption carve-out**, unlike GDPR. Full detail with sources is in
`docs/runbooks/incident.md` under "Regulatory notification (PDPL)".

That is research, not legal advice. What is needed from you:

### Confirm counsel can actually answer inside 72 hours

A lawyer who replies in a week is no use against a three-day clock. Ask
explicitly whether they offer same-day or next-day turnaround for a suspected
breach, and get the contact route for that — not the general office address.

### Settle the hour-60 default NOW

The runbook says to get counsel the same day and not to notify a regulator on
your own initiative. That is incomplete against a hard deadline, because
**silence from counsel at hour 60 is itself a decision** and nobody should be
improvising it mid-incident.

My recommendation is to **notify**: the notice carries no admission of fault, and
late notice is the sanctionable failure rather than early notice. But it is your
call to own. Whatever you decide, tell me and I will record it in
`LAUNCH-BLOCKERS.md` so it is a standing decision rather than a judgement call
made at 4am.

---

## 3. Recruit two independent clinical validators

**Lead time: weeks. The site's core credibility claim depends on it.**

Every calculator currently renders "Independent clinical validation: pending" —
**50 empty slots across 25 scores**, none filled.

**What a slot needs.** Exactly three fields per validator: name, credentials,
and the date they signed off. The type is compile-enforced at two slots per
score, so a score cannot silently ship with one reviewer or three.

**You do not need fifty people.** Two clinicians reviewing an agreed subset is a
real start, and the badge tells the truth either way. A sensible first tranche is
the scores most likely to be used at a bedside — pSOFA, PRISM, Phoenix, PELOD-2,
and the fluid calculators.

**What to ask them for.** Confirmation that the thresholds, bands and worked
examples on the page match the source publication. Every score already carries
its citation and a cited worked example, so this is a check rather than a
derivation.

**Done when:** you send me name, credentials and sign-off date per score. I wire
them in; the badge flips automatically.

---

## 4. Register on the National Data Governance Platform

**Lead time: days to weeks. Cannot be done during an incident.**

Breach notification is not an email or a phone number — it is an e-service at
**`dgp.sdaia.gov.sa`** → sign in → Electronic Services → Personal Data Breach
Notification. Registration is a prerequisite, and a 72-hour clock cannot absorb
the onboarding.

**The blocker you may hit first.** Private-entity registration runs through
Saudi Business Center authorisation, which needs a legal entity. The repo still
carries `[ORG_LEGAL_NAME]` as "Toward Pediatric Critical Care" without a
commercial registration behind it. If no CR exists yet, that is the real first
step, and worth raising with counsel in item 1.

Whether registration is legally _mandatory_ for TowardPCC is arguable. That it is
a _functional_ prerequisite to filing a notice is not.

**Done when:** you can log in to the platform and see the breach-notification
service. Tell me and I will note it in the incident runbook so a future reader
does not rediscover the gap under pressure.

---

## 5. Name a secondary on-call contact

**Lead time: as long as it takes to ask someone.**

Escalation today is you, alone. `docs/runbooks/incident.md` says so in three
places, and Uptime Kuma alerts route to one mailbox. If you are unreachable
during an incident, nothing happens.

**What the person needs to be able to do.** Not necessarily fix it — recognise
that something is wrong, reach you, and if truly unreachable, take the site to a
maintenance page. A technically-minded colleague is enough.

**Done when:** you give me a name and an email. I add them to the incident
runbook, create a `CODEOWNERS` file (there is none today), and add them to Uptime
Kuma's notification list.

---

## 6. Verify `info@towardpcc.com` actually receives mail

**Two minutes. Do it now.**

That address is printed on `/contact`, named on `/legal/data-protection` as the
route for deletion requests, and published in `SECURITY.md` and
`/.well-known/security.txt` as the security-disclosure contact.

Nobody has confirmed a message reaches a human. MX records resolve, so mail goes
_somewhere_ — that is not the same as arriving.

**Do this:** send a message to `info@towardpcc.com` from an address unrelated to
the domain (a personal Gmail is ideal — it tests the path an outside reporter
would use). Then confirm it arrives, and check the spam folder before concluding
it did not.

**Done when:** you have the message in front of you. Tell me and I tick it.

---

## 7. Confirm the `/admin` password is in a password manager

**Ten seconds. Genuinely optional, but cheap.**

The earlier alarm here was wrong and is now corrected: your TOTP situation is
**fully recoverable**. All ten recovery codes are unused, and if your phone
disappeared I could mint a fresh code with a single `psql` command — the
procedure is in `docs/runbooks/deploy-production.md` under "Break-glass".

**The password is the one thing that is not recoverable that way**, because
Argon2id cannot be recomputed on the host. Losing it costs about an hour of
re-seeding over an SSH tunnel rather than the account — so this is a courtesy
check, not an emergency.

---

## 8. Install gitleaks

**One command, no admin rights.**

```bash
winget install Gitleaks.Gitleaks --version 8.24.3 --accept-package-agreements --accept-source-agreements
```

The pre-commit hook is already in place and already runs — it currently prints
"gitleaks not installed — skipping the local secret scan" on every commit.
Installing the binary switches it from warning to enforcing, so a secret is
caught before it enters a commit rather than after.

Version 8.24.3 is pinned deliberately: it is exactly what CI uses, and winget's
installer checksum was verified against the upstream checksums file. CI scans
full history either way, so this only changes how early you find out.

**Done when:** `gitleaks version` prints 8.24.3 in a new terminal.

---

## 9. The pilot dashboard screenshot

**A decision, then either a conversation or a file.**

I removed this from `/data` on 2026-08-07. It was a screenshot of the pilot
unit's Command Center showing their **real daily admissions and discharges for
29 June – 20 July 2026**, with real dates, published for eleven days while the
repository's own comment said it could not be published. No patient names and no
hospital named — but their operating figures.

Two ways to restore imagery, and you only need one:

### Option A — get written permission

Ask the pilot unit's medical or clinical director to confirm in writing that the
cropped chart may be published, **unattributed and with the unit unnamed**. Send
me the confirmation and I will restore it with the permission recorded next to
the guard.

### Option B — send a different screenshot

A demo or seeded instance of the Command Center showing no real unit's figures.
Same visual purpose, no permission needed, no ongoing exposure. **This is what I
would do** — it is faster, it never needs revisiting, and it cannot age badly if
the pilot relationship changes.

Either way the page reads correctly today: the stage timeline stands on its own
and the image slot degrades to a designed placeholder.
