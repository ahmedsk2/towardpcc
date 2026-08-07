# Founder checklist — what still needs Ahmed

Written 2026-08-07, revised the same day after his decisions.

Everything else on `LAUNCH-BLOCKERS.md` is either done or is work that does not
need him. Two items were closed by decision rather than by doing them, and both
are recorded below so the reasoning survives.

**Nothing here blocks launch.** That is a founder decision taken 2026-08-07, not
an assessment that the items do not matter.

---

## Done

- [x] **Install gitleaks** — done 2026-08-07. Version 8.24.3, winget-verified
      installer hash, and the pre-commit hook now enforces rather than warns.
      Proven by staging a GitHub PAT pattern: gitleaks exits 1, the hook exits 1,
      the commit is blocked. It picks up in any newly-opened terminal.

One thing worth knowing: gitleaks allowlists the well-known AWS **documentation**
example key, so pasting that specific string will not trip it. Real credential
patterns are caught.

---

## Closed by decision, not by action

### Secondary on-call contact — DECLINED 2026-08-07

Ahmed will not name a second responder. Bus-factor-one is therefore an accepted
operating condition rather than an open gap.

What this means concretely, so nobody later reads the absence as an oversight:
if he is unreachable during an incident, nothing happens until he is reachable.
The calculators keep working — they are client-side, so a backend outage does not
touch the core clinical tool — which is what makes the risk tolerable. The
exposure is the submission pipeline and the admin surface, not the bedside.

### Pilot dashboard screenshot — REMOVED 2026-08-07

The screenshot is gone from `/data` and stays gone. No permission will be sought
and no replacement image is planned.

`/data` reads correctly without it: the stage timeline stands on its own and the
image slot degrades to a designed placeholder. The guard in
`apps/web/content/unpublished-imagery.test.ts` stays, so the file cannot return
without someone deliberately amending the allow-list.

---

## Open, and deliberately non-blocking

These four remain worth doing. None of them gates launch.

### 1. Counsel review of the legal pages

Two pages ship telling readers they are provisional. Markers at
`apps/web/content/site.ts:777` (privacy policy) and `:810` (terms); each renders
a visible `pendingNote`.

Send counsel the live URLs — `/legal/data-protection`, `/legal/terms`,
`/legal/disclaimer` — with four questions:

1. Does the privacy policy accurately describe PDPL obligations for a service
   that stores contact-form submissions in Saudi Arabia and processes nothing
   else? Calculator inputs never reach a server.
2. Are the terms adequate for a free clinical-calculator service aimed at
   clinicians, given the disclaimer on `/legal/disclaimer`?
3. **Is a Data Protection Officer required?** Our reading is no — the mandatory
   criteria are public-entity-at-scale, regular systematic monitoring, or
   sensitive data as a core activity. SDAIA's breach form asks for a DPO "if
   any", so "none appointed" is a legitimate answer if that reading holds.
4. **Do the three sub-processors need executed DPAs?** Oracle Cloud (hosting,
   in-Kingdom), Cloudflare (edge, transit only), and a non-KSA mail relay for
   operator notifications.

**Done when:** the copy is corrected and both `TODO(counsel-review)` markers and
both `pendingNote` strings are deleted.

### 2. Counsel — the 72-hour breach clock, and one standing decision

Same engagement as item 1, different question.

Saudi PDPL gives a controller **72 hours from becoming aware** of a personal-data
breach to notify SDAIA, on a harm test with no size floor. Notifying data
subjects is a separate, looser duty — "without undue delay". There is **no
encryption carve-out**, unlike GDPR. Sourced detail is in
`docs/runbooks/incident.md` under "Regulatory notification (PDPL)".

Two things to settle:

- **Can counsel actually answer inside 72 hours?** A reply in a week is no use
  against a three-day clock. Get the route for urgent contact, not the general
  office address.
- **What happens if they are unreachable at hour 60?** Silence at that point is
  itself a decision, and it should not be improvised mid-incident. The
  recommendation on file is to notify — the notice admits nothing, and late
  notice is the sanctionable failure — but the call is his to own.

### 3. Recruit two independent clinical validators

Every calculator renders "Independent clinical validation: pending" — 50 empty
slots across 25 scores.

A slot needs three fields: name, credentials, sign-off date. The type is
compile-enforced at exactly two slots per score.

**Fifty people are not required.** Two clinicians reviewing an agreed subset is a
real start, and the badge tells the truth either way. A sensible first tranche is
the scores most likely to be used at a bedside — pSOFA, PRISM, Phoenix, PELOD-2
and the fluid calculators.

What to ask them: confirm the thresholds, bands and worked examples match the
source publication. Every score already carries its citation and a cited worked
example, so it is a check rather than a derivation.

### 4. Register on the National Data Governance Platform

Breach notification is an e-service at **`dgp.sdaia.gov.sa`** → Electronic
Services → Personal Data Breach Notification. Registration is a prerequisite and
a 72-hour clock cannot absorb the onboarding.

**The likely first blocker:** private-entity registration runs through Saudi
Business Center authorisation, which needs a legal entity. The repo carries
`[ORG_LEGAL_NAME]` as "Toward Pediatric Critical Care" with no commercial
registration behind it. If no CR exists, that is the real first step — worth
raising with counsel in item 1.

---

## Two small open questions

### The published contact address — RESOLVED 2026-08-07

Every published address is now `info@towardpicu.com`, the mailbox confirmed
working: `/contact`, the footer, `/legal/data-protection` as the deletion route,
`SECURITY.md` and `/.well-known/security.txt`.

There is a better reason for this than "that mailbox works". `towardpcc.com`
publishes `v=spf1 -all` — it authorises **no** senders, deliberately, so that the
domain can never be spoofed (ADR-0004 decision 5). An address there could receive
mail but could never legitimately reply without failing its own SPF.
`towardpicu.com` is the domain actually authorised to send, so the address people
write to is now one that can answer.

**It changes nothing about residency, and the site should not imply otherwise.**
Both domains resolve to the same SiteGround filter outside the Kingdom, so
inbound mail is exactly as disclosed as it was. That remains the sharpest open
exception in ADR-0004.

### The `/admin` password

This is simply the password used at `/admin/login`, alongside the TOTP code — not
a server credential or anything hidden.

It is worth confirming it is in a password manager for one narrow reason.
Everything else about admin access is recoverable: all ten TOTP recovery codes
are unused, and if the authenticator phone were lost a fresh code can be minted
with a single `psql` command (procedure in `docs/runbooks/deploy-production.md`
under "Break-glass"). The password is the one piece that cannot be recovered that
way, because Argon2id hashes cannot be recomputed on the host.

Losing it costs about an hour of re-seeding a new admin over an SSH tunnel — not
the account, and not the platform. So this is housekeeping, not an emergency. The
earlier entry calling admin lockout "unrecoverable" was wrong and has been
corrected.
