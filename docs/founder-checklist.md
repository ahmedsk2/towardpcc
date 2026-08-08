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

## 2. Preview deployments — checked, and there is nothing to fix

I flagged this as a live risk. **It is not, and the earlier wording overstated
it.** Read from Coolify's own database rather than its API, which does not expose
the toggle:

```
is_auto_deploy_enabled | is_preview_deployments_enabled
         t             |               f
```

Preview deployments are **off**. Nothing is writing to production from a preview
and nothing has.

What remains is dormant rather than active: Coolify keeps a preview copy of every
variable, and the preview `DATABASE_URL` holds the **same credential and the same
database** as production. That is only a landmine if previews are ever switched
on.

**So the rule is: if you enable preview deployments, give them their own database
first** — `towardpcc_preview` with its own role in the same container. Do not
enable them and fix the variable afterwards; the first preview build would reach
live submissions, audit rows and admin accounts before anyone noticed.

## 3. Single-region quota — DONE 2026-08-08

Applied. No action needed from you; recorded here so the control is not a
surprise later.

**What was found first.** The tenancy is subscribed to exactly one region,
`me-riyadh-1`, which is also the home region — so there was nothing outside KSA
to clean up, and a quota scoped to other regions could not affect anything
running. `Administrators` has exactly one member (you), so there were no stray
admins either.

**What was applied.** A quota named `ksa-data-residency` in the root compartment,
zeroing ten data-bearing families — analytics, block-storage, compute,
container-engine, database, filesystem, load-balancer, object-storage, streaming,
vcn — in every region other than `me-riyadh-1`:

```
zero <family> quotas in tenancy where request.region != me-riyadh-1
```

It has no effect today by design. It exists so that subscribing to a second
region does not silently permit resources there, and OCI never allows
unsubscribing once a region is added — which is why this is worth having before
it is needed rather than after.

**Verified rather than assumed**, because a wrong `!=` would have zeroed
production's own region:

| limit in me-riyadh-1                                 | value |
| ---------------------------------------------------- | ----- |
| `standard-a1-core-count` (the shape production runs) | 41    |
| `standard-a1-memory-count`                           | 277   |
| `object-storage` bucket-count                        | 10000 |

Unchanged. To remove it — which should be a deliberate decision to process
outside KSA, not a convenience:
`oci limits quota delete --quota-id <id>`.

**One thing this does NOT control, and you should know it.** The OCI API key on
the development laptop belongs to your `Administrators` user. It can subscribe to
a new region, and it can reach the co-tenant application that holds real patient
data. The quota constrains what can be created; it does not constrain that key.
A narrower user for day-to-day automation is worth doing at the same time as the
load-balancer certificate user below.

## 4. DNS cutover — mechanically ready, blocked on ONE dated risk

Re-verified 2026-08-08, so this is current rather than inherited.

**The edge works.** `curl --resolve www.towardpcc.com:443:145.241.110.213`
returns **HTTP 200** from outside the network — so the load balancer is publicly
reachable and serving, independently of Cloudflare. Its certificate is a valid
Let's Encrypt cert.

**The DNS side is a two-field change.** Every record currently points at the host
`145.241.105.239`, proxied through Cloudflare. Cutover means the apex A record
becomes `145.241.110.213` with proxying **off**; `www` is a CNAME to the apex and
follows automatically. I hold a Cloudflare token that can make that edit.

Note the zone also carries nine other subdomains on the same host — `db`,
`deploy`, `endorse`, `mnm`, `mylibrary`, `next`, `stg-mylibrary`, `uptime`. Those
are the co-tenant applications and **must not be touched**. Only the apex and
`www` move.

### The blocker: 80 days, and nothing renews it

The load balancer's certificate expires **2026-10-27** — 80 days from today — and
nothing renews it. Today that is harmless because the path serves nobody. **The
moment DNS points at it, that becomes a dated outage** with no automation behind
it.

That was a deliberate call, not an oversight: automating renewal means an OCI API
key with load-balancer write access living on a host that also runs an
application holding real patient data. The repo's position is that the trade is
worth making _at_ cutover and not before. Cutting over first would take the risk
without taking the mitigation.

### Why I have not done it, even though I can

I have the access and the mechanics are verified. Three things say wait:

Renewal is not automated, and 80 days is short enough to matter.

**CI is down** (item 1), and the residency copy rewrite has to ship in the _same
deploy_ as the cutover — `privacy-claims.test.ts` fails the build if the claim
goes unqualified early. Right now that deploy cannot be verified.

Cutover is effectively irreversible inside the propagation window, so it wants a
green safety net, not a red one.

### The order, when you want it done

1. Create a **dedicated OCI user** with a policy scoped to the load balancer's
   certificate only — explicitly not the `Administrators` key currently on the
   laptop. I can create both.
2. Automate renewal with it and force one renewal to prove it works.
3. Fix CI (item 1).
4. Rewrite the residency copy and cut DNS **in that order, same day**.
5. Re-run `pnpm check:residency` and confirm the daily canary is green on the new
   path.

**Two exceptions survive the cutover**, so ADR-0004 does not become unqualified:
MX is still on SiteGround, and the operator notification relays through a US
host.

Say the word and I will do steps 1, 2, 4 and 5 — step 3 is yours.

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
