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

---

# Revision 2026-08-08 — what needs you now

In priority order. The first one blocks everything else.

## 1. GitHub Actions billing — BLOCKING, and it is silent

CI stopped mid-session. Every job on every pull request now fails instantly with:

> The job was not started because recent account payments have failed or your
> spending limit needs to be increased.

Last green run 22:51 on 2026-08-07; the next two runs, 04:36 and 04:42 on
2026-08-08, failed before executing a line. Nothing in the code changed between
them.

**Fix:** GitHub → Settings → Billing & plans → check the payment method and the
Actions spending limit.

**Why it matters more than it looks.** Push-to-deploy runs through a Coolify
webhook, which is entirely independent of GitHub Actions — so `main` still
deploys to production even with CI dead. The safety net is gone while the
delivery pipe stays open. Do not merge anything until this is fixed.

Four pull requests are waiting on it, all reviewed and green locally:

| PR  | What                                                                            |
| --- | ------------------------------------------------------------------------------- |
| #65 | Session revocation (SPC-TM-002) — closes the last security launch blocker       |
| #66 | Deployed OCI region verified from instance metadata                             |
| #67 | Hero mesh payload measurement (documentation)                                   |
| #38 | Dependabot dev-dependencies — held deliberately, see the TypeScript/ESLint pins |

## 2. Preview deployments write to the PRODUCTION database

Found while enabling database TLS. Coolify stores each variable twice, once for
production and once for previews, and both copies of `DATABASE_URL` have the
**same fingerprint** — the same credential, against the same `towardpcc`
database.

Nothing is running a preview today, so nothing is happening right now. But the
moment a preview deployment starts, its code writes to live submissions, live
audit rows and live admin accounts.

**Fix, one of:**

- Point the preview copy at its own database (`towardpcc_preview`, its own role,
  same container), or
- turn preview deployments off in Coolify if they are not being used.

Either is a two-minute change in Coolify → the application → Environment
Variables, on the row marked as preview. The second is the honest choice if
previews are not part of the workflow.

## 3. Back the single-region claim with a control, not with state

`LAUNCH-BLOCKERS.md` puts this precisely: the tenancy is subscribed to one region
today, but that is **state, not a control** — an admin can add a region in one
click, and OCI never allows unsubscribing.

The deployed region itself is now **verified**, so this is about keeping it true
rather than establishing it. Instance metadata reports `me-riyadh-1`,
`rvud:ME-RIYADH-1-AD-1`.

**Do it with a quota rather than an IAM policy.** Quotas are the instrument
designed for the job and they fail closed; a deny policy has to enumerate
services and will drift as you add them. In the OCI console: Governance →
Quotas → create a quota in the root compartment setting compute and storage
limits to zero in every region other than me-riyadh-1.

This needs tenancy-admin credentials, so it is yours. It is also **preventive
only** — do it before you need it, because it cannot be applied retroactively to
a region someone has already added.

## 4. DNS cutover — one blocker, and a sequence that matters

The staged edge is genuinely ready: the OCI load balancer serves the whole site
over HTTPS with a healthy backend, an HTTP→HTTPS redirect, and a WAF verified to
return 403 on XSS, boolean SQL injection and UNION SELECT probes while normal
routes still return 200. Client-IP resolution is solved.

**The blocker is the certificate.** The load balancer's certificate expires
**2026-10-27** and nothing renews it. That was a deliberate call, not an
oversight: automating it means an OCI API key with load-balancer write access
sitting on a host that also runs an application holding real patient data, in
order to keep a certificate alive on a path currently serving nobody.

At cutover that trade flips, because the path starts serving everybody.

**Sequence, and the order is the point:**

1. Create a **dedicated OCI user** with a policy narrow enough to touch only the
   load balancer's certificate — not the tenancy admin key.
2. Automate renewal with it, and prove it by forcing one renewal.
3. Rewrite the residency copy **in the same deploy as the cutover**.
   `apps/web/content/privacy-claims.test.ts` fails the build if site copy claims
   residency absolutely, so the caveats come out and the claim goes unqualified
   in one commit — never a day early.
4. Cut DNS to the load balancer.
5. Re-run `pnpm check:residency` and confirm the daily canary is green against
   the new path.

**Two things stay true even after cutover**, so the ADR-0004 exceptions do not
all disappear: MX is still on SiteGround, and the operator notification relays
through a US host.

I can make the DNS change itself — the Cloudflare token can edit records. I am
not making it without you, because it is irreversible in practice within the
propagation window and steps 1–3 have to land first.

## 5. Read-only container filesystem — decision, then a two-minute check

Measured and ready, not applied. Coolify already carries
`--cap-drop=ALL` in the application's custom Docker run options, so this is
appending to a field that already exists:

```
--read-only --tmpfs /tmp:size=64m --tmpfs /app/apps/web/.next/cache:uid=100,gid=101,mode=0700,size=64m
```

`uid=100,gid=101` are the `app` user's ids in the image and are **not optional** —
a root-owned tmpfs is as unwritable as the read-only layer under it.

**Why I did not just apply it.** The second mount exists because without it every
optimised image request throws `ENOENT` on `.next/cache` while `/api/v1/health`
still returns 200 and the container still reports healthy. That silent shape is
exactly what fooled me once already this session. I verified the public paths
recover with the mount, but I could not verify the **authenticated** admin
surface — the admin server actions call `revalidatePath`, which targets the same
cache directory, and I have no admin credentials.

**So:** apply it, then log in once and change a submission's status. If that
works, it is done. If anything errors, remove the two `--tmpfs` flags and the
`--read-only` flag and redeploy — it reverts cleanly.

## Still open from the earlier revision

Counsel review of the legal pages, the 72-hour PDPL breach clock and its hour-60
default, two independent validators, and NDGP registration. Unchanged.
