# Runbook: patient-identifiable data arrives in a submission

**Closes:** threat-model TM-011 and its audit-register entry `SPC-TM-011` — "No
procedure for accidental patient-identifiable data in service requests
(redaction, escalation, purge)", medium / tentative, phase P6
(`docs/security/threat-model.md`). The TM-011 row's stated mitigation is the
words "Warning text only"; §7 is about how little of that warning actually
renders.
**Status:** procedure is real and followable **today**, but two of its steps run
against the database by hand because the admin UI has no redaction or deletion
control. That gap is specified in §5 as a concrete change, not left as a wish.
**Related:** `docs/runbooks/incident.md` (severity, escalation),
`docs/decisions/ADR-data-model.md` (retention), `docs/decisions/ADR-0004-ksa-only-processing.md`
(why nothing is emailed back), `docs/runbooks/deploy-production.md` (database access).

---

## Why this document exists

The site tells people not to send patient data. A warning is not a control. It
asks a busy clinician, mid-thought, to notice a sentence and act on it — and the
sentence is not always where they are looking (§7 shows exactly where it is and
is not). Sooner or later somebody pastes a medical record number, a date of
birth, or three paragraphs lifted straight out of a progress note into "What
would you like help with?", presses send, and it lands in our database.

That is not a hypothetical failure of the writing. It is the predictable outcome
of asking humans to be careful. This runbook is what happens next.

The whole document turns on one constraint that is easy to get backwards, so it
is stated up front: **`AuditLog` is append-only, enforced at the database, not by
convention.** `docker/sql/10-audit-append-only.sql` runs
`REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM towardpcc_app`, and the one-line
command that re-checks the live grant is in `docs/runbooks/deploy-production.md`
§"Verify the hardening"
(`has_table_privilege('towardpcc_app','"AuditLog"','DELETE')` → `false`). Two
repo records say that check has passed in production; §4 cites them and says
what this document did and did not verify itself. That
property is deliberate and worth keeping: nobody, including a hijacked admin
session, can quietly rewrite history. But it cuts both ways. Anything you write
into the audit trail while cleaning this up is **permanent**. The obvious note —
"removed MRN 12345 from submission `abc`" — takes the identifier you just
deleted from a correctable field and copies it into an uncorrectable table, and
into every backup taken from then on. §4 is about not doing that.

---

## 0. The one-minute version

1. Do not copy the text anywhere. Not into a chat message, not into a ticket,
   not into an email to the founder. Every paste is a new copy in a system with
   no retention rule.
2. Write down the submission id from the URL (`/admin/submissions/<id>`) and the
   time. The id is the safe handle — it names the record without naming the
   content.
3. Declare **SEV1** (`incident.md`: "suspected breach / PII exposure") and tell
   the founder — today, `ahmedsk2@gmail.com`. Start a written timeline.
4. Redact or delete the row using the SQL in §3. Nothing in the admin UI does
   this yet.
5. Record what happened using the vocabulary in §4 — **never the value**.
6. Reply to the submitter by hand, from your own mailbox, without quoting what
   they sent (§6).

Everything below is the same six steps with the reasoning attached.

---

## 1. Recognising it

### The four places it can arrive

Every public form funnels through one server path,
`handleSubmission()` in `apps/web/lib/submissions.ts`, and writes one row into
`Submission.payload` (JSONB). The fields are defined per type in the same file
and their labels in `apps/web/content/site.ts` (`forms.*`):

| Type              | Route        | Fields (all free-text strings)                 | Free-text box                                        |
| ----------------- | ------------ | ---------------------------------------------- | ---------------------------------------------------- |
| `CONTACT`         | `/contact`   | name, email, **message**                       | "Message"                                            |
| `SERVICE`         | `/services`  | name, email, affiliation, **message**          | "What would you like help with?"                     |
| `KNOWLEDGE_PILOT` | `/knowledge` | name, email, unit, country, **message**        | "Tell us about your unit and what you're hoping for" |
| `DATA_INTEREST`   | `/data`      | name, email, institution, country, **message** | "What interests you about the registry?"             |

Two things are worth being precise about. First, _every_ field is free text —
`affiliation`, `unit`, `institution` and `country` are unconstrained strings
(Zod caps length only), so "PICU bed 4, [hospital]" fits perfectly well in
"Affiliation or unit". The textarea is the likely vector, not the only one.
Second, the `message` cap is 2000 characters, which is roughly a full clinical
narrative. There is no upload field anywhere in the app, so photographs, scanned
notes and screenshots cannot arrive this way — that bounds the problem usefully.

There is a fifth place, and it is the one people forget: **`internalNotes`**, the
5000-character admin-only box on the submission detail page. An operator
summarising a case into it creates exactly the same problem, with none of the
excuse. It is covered by this runbook too.

### What counts as identifiable, concretely, in a PICU

Not a legal definition — a working one. If a colleague in the submitter's unit
could read the text and know which child it is, it is identifiable.

**Direct identifiers.** Patient or parent name, including the constructions that
paediatrics and neonatology use as a matter of course — "Baby of [mother's
name]", "twin B of…". Medical record number, hospital or file number, encounter
or admission number. Saudi national ID or Iqama number (ten digits). Family
contact details.

**Dates, which are the ones clinicians consistently underrate.** Date of birth,
date of admission, date of surgery, date of death. In a PICU, a date plus a unit
is very often unique on its own — these are small populations. An exact age
under a year ("a 3-week-old", "born at 26 weeks on the 14th") behaves like a
date of birth.

**Structural pointers.** Bed number, ICU day counted from a stated admission
date, referring or transferring hospital combined with a timeframe.

**The one that gets missed: the case itself.** A rare diagnosis, an unusual
combination of findings, an ECMO run with a distinctive complication —
described in a named unit, with no direct identifier anywhere — is identifiable
to everyone who works there and to plenty of people who do not. Verbatim text
pasted out of a progress note is nearly always in this category even after the
name is stripped, because the timeline, the transfer, and the procedure sequence
survive the stripping.

**What is _not_ the problem.** The submitter's own name, email, affiliation and
country are exactly what the form asked for; they are lawful, expected, covered
by the notice next to the field, and retained for 24 months like everything
else. This runbook is about third-party data — data about a patient, sent by
someone else, that we never asked for and have no basis to hold.

### If you are not sure

Treat it as identifiable and follow the procedure. The cost of over-reacting is
one row redacted and twenty minutes; the cost of under-reacting is holding a
child's identifiers in a database for up to 24 months, in a system whose entire
public promise is that it does not do that.

---

## 2. Where the data is — and, usefully, where it is not

Before containing anything, know the blast radius. Most of this is good news,
and knowing it stops you chasing copies that do not exist.

**In systems we control, it is in exactly one live place:**
`Submission.payload` in the `towardpcc` Postgres database. Nothing else in the
request path retains it — each "not in" below is checked against the code, not
assumed. The one hop outside that boundary is the proxy, at the end of this
section.

**It is not in the application logs.** `handleSubmission()` makes exactly three
log calls and none of them touches the payload: `{ submissionId, type }` on a
stored submission, `{ ipHash, type }` on a rate-limited one, and
`{ submissionId, err }` when the admin notification fails. Behind that,
`apps/web/lib/logger.ts` configures pino with `redact.paths` covering `payload`,
`*.message`, `*.name`, `*.email`, `*.password` and `*.token` as a second net, so
a stray content field would come out `[redacted]`. Note what the net does _not_
cover: the redaction list is field-name-based, so content smuggled into a log
call under some other key — or embedded in the string message of an error object
— passes through it. The first line of defence is still "do not log payloads".

**It is not in any email.** Twice over, at the moment.

`notifyAdminOfSubmission()` in `apps/web/lib/email.ts` composes a type label and
a link into the admin inbox — by construction, no submitter data. And today
nothing sends at all: `SMTP_*` is empty in production, so submissions are stored
and no admin notification leaves the host (`deploy-production.md` §"Still
outstanding"; LAUNCH-BLOCKERS "SMTP relay"). Treat that second fact as temporary
— it is a missing credential, not a design.

The first fact is the one that matters and must survive the credential landing.
Under ADR-0004 decision 5 the notification will be relayed through
`mail.towardpicu.com` — verified there as `35.212.69.243`, a SiteGround relay on
Google Cloud in the United States — to a Gmail mailbox (decision 4). If the
notification carried the message body, a PICU patient's identifiers would leave
the Kingdom before you ever saw them. It does not, and the whole carve-out in
ADR-0004 decision 5 rests on it not doing so. Do not add anything to that
template.

**It is not in an error tracker.** No Sentry/GlitchTip DSN is wired; that is
still deploy-time configuration (LAUNCH-BLOCKERS, "Structured request logging").
When one is wired, `apps/web` payloads must be scrubbed before it ships — the
threat model already flags this under TM-001.

**It is in the backups, and this is the part you cannot undo.** `towardpcc` is
in the Coolify nightly shared-postgres job (`0 3 * * *`), dumping to
`/data/coolify/backups/databases/root-team-0/shared-postgres-<uuid>/` on the host
and copying offsite to the OCI Object Storage bucket `coolify-backups` in
me-riyadh-1 (`docs/runbooks/deploy-production.md` §Backups). Every dump taken
between the submission arriving and you redacting it contains the identifier, and
a dump cannot be edited. §3 step 5 covers the decision that follows.

**It is not in a page cache.** The admin inbox and detail pages both set
`export const dynamic = "force-dynamic"`, so nothing is persisted by Next.

**It transited Cloudflare, and that is the one hop we cannot speak for.** The
zone is proxied and the origin is firewalled to Cloudflare's ranges, so TLS
terminates at an edge node and the POST body — the whole payload, identifiers
included — passes through Cloudflare before it reaches the host. The threat
model records this as **TM-006a** and ADR-0004 is the decision to move off it.
Two honest halves: Cloudflare is not a store, and there is no reason to think a
proxied POST body is retained — but that is a vendor property this repository
does not verify, and the plan is on the Free plan with no data-localization
guarantee and no attestation. So "one live place" is true of _our_ systems and
is the right basis for containment; it is not a statement you can make to
counsel about every system the bytes touched. Say what is verifiable: the
payload persists in one place we control, and it crossed one proxy we do not.

---

## 3. Containment, in order

### Step 1 — Stop, and do not make copies

The reflex when you spot this is to tell someone, and the fastest way to tell
someone is to paste it. Don't. A screenshot in a chat thread, a quote in an
email, a paragraph in a ticket — each of those is a new copy of a child's
identifiers in a system that has no retention rule, no audit trail and probably
no residency guarantee. Everything downstream of here is done by **submission
id**.

If you have a terminal session that is being recorded (`script`, tmux logging,
the Coolify web terminal), be aware that a `SELECT` printing the payload writes
the content into that log. The commands below are written so that none of them
print the value.

### Step 2 — Capture the handle

From the browser: the submission id is the last path segment of
`/admin/submissions/<id>` (a cuid). Note it, the current time, and which field
carries the content. That is the entire record you need to work from.

### Step 3 — Declare SEV1 and escalate

`docs/runbooks/incident.md` classifies "suspected breach / PII exposure" as
**SEV1**: drop everything, escalate immediately, preserve logs and `AuditLog`,
start a written timeline. Escalate to the founder (`ahmedsk2@gmail.com`).

Two honest notes about that. There is currently no secondary contact — naming
one is an open launch blocker (`OPS-02`), and until it is closed this escalation
path has a bus factor of one. And "SEV1" here is about how fast to move, not a
legal conclusion that a reportable breach has occurred; see §6.

### Step 4 — Remove it from the live database

**The admin UI cannot do this.** `submissionAction` in
`apps/web/app/admin/(protected)/submissions/actions.ts` accepts exactly three
intents — `notes`, `triage`, and a status value — and nothing else. There is no
delete, no redact, no export. §5 specifies what to build; this step is the
manual path in the meantime.

Two things you might be tempted to click first, which do nothing:

- **Setting the status to Spam does not contain anything.** Status is a filter
  tab on the inbox, not a visibility control; the row, its payload and its
  position in the "All" list are unchanged. It also writes a permanent audit row
  for no benefit. Don't.
- **"Triage & acknowledge submitter" does not acknowledge anybody.** The button
  on the detail page still carries that label, but the submitter acknowledgement
  was removed under ADR-0004 and the action sends no mail at all. The label is
  stale (see §8). Pressing it just marks the row `TRIAGED`.

Run the real fix from the host as the container's `postgres` superuser — the
same access pattern `deploy-production.md` already uses for its hardening checks
and restore drill. (Not the app role, which reaches the database only over the
Docker network, and not `towardpcc_owner`, which is reserved for migrations.)

```bash
PGC=tjuvmq29ogsdoocz59qigcoc                 # shared-services Postgres container
SUB=<submission-id>                          # from step 2 — never the content

# Redact ONE field, keeping the record and its history:
sudo docker exec $PGC psql -U postgres -d towardpcc -v ON_ERROR_STOP=1 -tAc \
  "UPDATE \"Submission\"
      SET payload = jsonb_set(payload, '{message}', '\"[redacted: patient-identifiable content removed]\"')
    WHERE id = '$SUB'"

# Confirm — prints a boolean, never the value:
sudo docker exec $PGC psql -U postgres -d towardpcc -tAc \
  "SELECT payload->>'message' = '[redacted: patient-identifiable content removed]'
     FROM \"Submission\" WHERE id = '$SUB'"     # → t
```

Change `'{message}'` to whichever key carries the content (`affiliation`,
`unit`, `institution`, …). If several fields are affected, redact each; if the
whole submission is a case description with nothing salvageable, delete the row
instead:

```bash
sudo docker exec $PGC psql -U postgres -d towardpcc -v ON_ERROR_STOP=1 -tAc \
  "DELETE FROM \"Submission\" WHERE id = '$SUB'"
```

**Prefer redaction over deletion when the request is genuine.** A fellow who
pasted a case into an otherwise real request for statistical help still deserves
the help; deleting the row throws away their question along with the identifier,
and they will have to send it again — probably with the same paste. Delete when
the submission is _only_ the case, or when counsel says to.

Deleting a `Submission` is safe with respect to the audit trail: `AuditLog.entity`
is a plain string (`"Submission:<id>"`), not a foreign key, so the history rows
survive the deletion of the record they describe. That is the correct outcome —
the trail should still show that something was there and what was done to it.

### Step 5 — Decide about the backups, and write the decision down

Every nightly dump taken between arrival and redaction still contains the
identifier, on the host and in `coolify-backups`. You have two options and one
of them is usually wrong.

**Default: let them age out.** Deleting specific dumps to purge one record
trades a bounded, root-only-and-in-region confidentiality exposure for an
unbounded availability risk, in a system whose passed restore drill is the only
proof the backups work at all. Take that trade only if counsel asks or the
content is exceptional.

One caution while you weigh it, and it needs stating carefully because the site
makes a claim here. `backup-restore.md` specifies GPG encryption of the dump
before it leaves the host — but that describes _its_ procedure, and the job
actually running is Coolify's scheduled backup. Nothing in this repository states
that the Coolify job GPG-encrypts the dump itself. The public privacy page does
say "automated, encrypted backups with a tested restore procedure"; the restore
drill genuinely passed (2026-07-26), and the storage under the dumps is covered
by the 2026-07-28 boot-volume check, so "encrypted" is defensible as
storage-level encryption. It is not evidence of an encrypted dump _file_, which
is the stronger property `backup-restore.md` describes and the one that would
still hold if a dump were copied off the host.

So: file-level encryption of the running job's dumps is **unconfirmed**;
root-only local directory, in-region bucket, and storage-level encryption are
what is supported. Assume no more than that until someone checks, and see §8
item 7 — this is the same open volume question wearing a different hat.

Either way, record which option you chose and why in the incident timeline —
"we knowingly left it in backups until <date>" is a defensible position;
"nobody thought about backups" is not.

**Unverified, and you should close it:** the retention window of the Coolify
backup job is not recorded anywhere in this repository. `docs/runbooks/backup-restore.md`
describes a "30 daily + 12 monthly" bucket lifecycle for the procedure it
specifies, but the job actually running is Coolify's, and its retention is not
written down. Find the real number in the Coolify UI and put it here — without
it you cannot answer "when does this identifier stop existing?", which is the
first question anyone will ask.

---

## 4. What to record — and the trap in recording it

### The trap

You have just removed an identifier. The instinct is to leave a trail that says
what you removed:

> `SUBMISSION_REDACTED` — removed MRN 1234567 from submission `ckx…`

Do not write that. `AuditLog` cannot be updated or deleted by the application
role — that is enforced by a database grant — so that string is now permanent
for the life of the row, it is beyond the reach of any correction, and it will
be copied into every backup from tonight onwards. You would have moved the
identifier from a field you _can_ fix into a table you _cannot_, and made it
more durable in the process.

Two repository records say the grant is live rather than merely written:
`packages/db/scripts/purge-retention.mjs` states "the app role has ONLY INSERT
and SELECT. Verified in production 2026-07-28", and LAUNCH-BLOCKERS' deploy
header lists `SPC-DB-003` as "live and verified in production". This document
did not re-run that check itself; the command to re-run it is in
`deploy-production.md` §"Verify the hardening" and takes one line. Do run it if
you are about to rely on the property in an incident write-up — and see §8 for a
stale tickbox that still says the opposite.

The same trap is waiting in the future feature. The natural way to implement a
redaction action is to reuse `recordAudit()` and pass a before/after diff. Its
contract does warn you: `diff` "should carry before/after of changed fields with
any PII redacted", and the Prisma schema comment on the column says the same.
But "before/after of changed fields" is the instruction people actually follow,
and for a redaction the "before" _is_ the identifier — so the redaction case is
the one where the two halves of that sentence contradict each other, under time
pressure, in a table with no undo. §5 makes the call impossible to write rather
than merely discouraged, which is the only version of this rule that survives
contact with a hurried afternoon.

### The rule

**The audit entry records that a redaction happened, by whom, when, to which
record and which field. It never records the content.** Use a fixed vocabulary,
never free text — free text is where somebody will eventually type the number.

```ts
recordAudit({
  actorId: admin.id,
  action: "SUBMISSION_REDACTED",
  entity: `Submission:${id}`,
  diff: { fields: ["message"], reason: "patient-identifiable", categories: ["mrn", "dob"] },
});
```

`categories` comes from a closed set — `name`, `mrn`, `national-id`, `dob`,
`date-of-care`, `bed-or-encounter`, `narrative`, `contact-details`. That is
enough to answer every question anyone will legitimately ask later: what class
of identifier reached us, how often, through which form, and did the fix hold.

### Why not keep the value "just in case"

Because there is no case. We are not the controller for that patient. We cannot
verify the identifier, cannot correct it, cannot act on it, and have no lawful
basis to hold it — that is the entire reason we are deleting it. The only
scenario where the actual value would ever be needed is telling the submitter's
institution precisely which record was exposed, and in that scenario the
submitter has it already: they sent it. Our copy adds nothing except risk.

State it as a principle so it generalises: **if the identifier has no
operational use to us, there is no such thing as a safe place to keep it — and
the least safe place is the one table nobody can edit.**

### Where the human detail goes

Some incidents need more narrative than a category vocabulary carries — how it
was spotted, what was decided about backups, who was told. That belongs in the
SEV1 written timeline `incident.md` already requires, referenced by submission
id, and the same no-quoting rule applies there. If you want something in-app,
`internalNotes` on the submission is the least-bad option: it is editable, so a
mistake can be corrected, and it dies with the record if the record is deleted.
Still no verbatim identifiers.

---

## 5. The gap: what the admin UI needs

Everything in §3 step 4 is a database console operating on production data,
performed under time pressure, by a single person, with no second pair of eyes
and no audit entry unless they remember to write one. That is an acceptable
emergency path and an unacceptable steady state. Here is the concrete change.

**A fourth intent on `submissionAction`.** In
`apps/web/app/admin/(protected)/submissions/actions.ts`, alongside `notes` /
`triage` / status:

- `redact` — takes a field name **validated against the keys of that submission
  type's Zod schema** (the schemas already exist in `apps/web/lib/submissions.ts`;
  reuse them rather than accepting an arbitrary JSON path) and one or more
  categories from the closed set in §4. Replaces the value with a constant
  sentinel via a `db.submission.update`. No new database grants are needed —
  the `towardpcc_app` role already has CRUD on `Submission`; only `AuditLog` is
  restricted.
- `purge` — deletes the row, gated on `requireRole("OWNER")`. That helper
  already exists in `apps/web/lib/auth/guard.ts` and is currently called from
  nowhere; this is its first real use. Irreversible destruction of a record is
  the right place to spend the one role distinction the model has.

**Make the audit trap unreachable, not just documented.** Add a dedicated
`recordRedaction({ actorId, submissionId, fields, categories })` in
`apps/web/lib/admin/audit.ts` whose signature has **no parameter capable of
carrying a value** — `fields: string[]`, `categories: RedactionCategory[]`, and
nothing else. Then the mistake in §4 is not a discipline problem; it is a type
error. This is the difference between a rule that holds for six months and one
that holds.

**Guard it in CI.** `apps/web/content/privacy-invariant.test.ts` is the precedent:
a static grep-guard that fails the build when calculator routes reach for
`useSearchParams` or `"use server"`. Add the sibling — no call site passes a
`payload` value, or anything derived from `payloadEntries`/`payloadField`, into
`recordAudit`. Cheap, and it catches the regression that a code review will miss
because the diff will look reasonable.

**Then fix the surrounding text.** After `purge` exists, `incident.md`'s
"Data-deletion / retention request" section becomes true (see §8), and this
runbook's §3 step 4 collapses to two clicks with the SQL kept only as a
break-glass for when the app is down.

**Not proposed, deliberately:** a bulk "redact everything matching a pattern"
tool. One record at a time, read by a human who has decided it is identifiable,
is correct here. A bulk tool over a table of clinicians' genuine requests is a
much better way to destroy real data than to protect anyone.

---

## 6. Who to tell, and on what clock

### The founder — immediately

SEV1 per `incident.md`. No ambiguity, no clock to look up.

### The submitter — same day, by hand

Tell them: what they sent contained patient-identifiable information, it has been
removed from our systems, and please don't include it next time. This is not
only courtesy — the submitter is the only person who can stop the next one, and
they may have an obligation of their own on their hospital's side that they will
not discover unless somebody tells them.

Two constraints on how:

- **The platform will not send it, and must not learn to.** ADR-0004 removed all
  submitter-facing mail; `apps/web/lib/email.ts` deliberately exposes no
  function that takes a recipient or a body as a parameter, precisely so the app
  cannot be induced to send attacker-chosen text to an attacker-chosen address.
  Reply as a human from your own mailbox. Re-adding an automated submitter email
  would also break the carve-out in ADR-0004 decision 5, which holds only
  because the sole message the US relay carries contains nothing about a
  submitter.
- **Do not quote what they wrote back at them.** A reply that helpfully includes
  "the text you sent was: …" re-transmits the identifiers through a mail path
  that is, today, outside the Kingdom in both directions — outbound via the
  SiteGround relay, and inbound to `info@towardpcc.com` via SiteGround's
  SpamExperts filter on Google Cloud (ADR-0004 consequence 6). Reference it as
  "the request you sent on <date>" and nothing more.

### The hospital, the family, the regulator — ask counsel, and read this first

Here is the distinction that decides who is actually on a clock, and it is worth
getting right before anybody panics in either direction.

Nothing leaked _from_ us. Data we never asked for arrived, was held briefly,
was reachable only through pages that call `requireAdmin()`, and was removed.
The unauthorised disclosure — if there was one — happened when a clinician sent
identifiable patient data outside their institution. That is their institution's
incident to assess, which is another reason the submitter must be told promptly.

Whether it is _also_ ours to report is a legal question this repository cannot
answer, and it changes with the facts (how long it was held, who saw it, whether
it went anywhere else).

### One mitigating fact to state carefully: encryption at rest

You will want to say "and the database is encrypted at rest." It is the first
thing anyone reaches for when arguing an exposure was contained, which is exactly
why it deserves thirty seconds of care rather than a reflex. **The repository
does not speak with one voice on this, and you should know that before you put it
in writing.**

What supports it: `apps/web/content/site.ts` line 755 states publicly that "the
storage holding the database and its backups is encrypted at rest", and the
source comment above it (line 748) records the basis — "Verified 2026-07-28
rather than assumed: the host's boot volume in me-riyadh-1 reports encryption
with Oracle-managed keys." That is a real check with a date, not an assumption,
and it is the most recent evidence in the repo.

What cuts against it: `docs/go-live-checklist.md` still leaves "Encrypted block
volume for the DB" **unticked and deliberately so**, on the reasoning that
nothing records the volume's encryption state and "OCI encrypts by default" is a
vendor statement rather than a check. LAUNCH-BLOCKERS still lists at-rest volume
encryption as open under P8. Audit finding `SPC-DB-004` notes `Submission.payload`
is cleartext JSONB with no column encryption, so confidentiality rests entirely
on the storage layer, and `production-readiness-review` `[DATA-06]` still asks the
question outright. `ADR-data-model.md` asserts the volume is encrypted, but that
sentence states a PRD requirement rather than a finding.

The gap is probably narrower than it looks: what was verified is the **boot**
volume, and what the open items ask about is a **block** volume for `pgdata`.
Nothing in `deploy-production.md` describes a separate block volume, so the
Docker volumes most likely sit on the boot volume the 2026-07-28 check covered —
in which case the site's claim is sound and the checklist is simply stale. But
"most likely" is doing real work in that sentence, and nobody has written the
confirmation down.

So, for an incident write-up: say **"storage-level encryption at rest, verified
on the host's boot volume 2026-07-28 with Oracle-managed keys"** — which is
precisely true and cites its basis — rather than the unqualified "the database is
encrypted at rest". If the distinction turns out to matter to counsel, it is one
OCI console inspection to close, and closing it also resolves a contradiction
that currently sits under a live public claim (§8).

**On the PDPL clock, plainly: this repository cannot tell you what it is.** A
breach-notification figure appears in exactly one place — written `72h`, in
`docs/ops/production-readiness-review-2026-07-25.md` line 245 — and it appears
there as an **open question about work not yet done**: "❓ [CMP-03] … PDPL 72h
breach-notification clock + SDAIA contact in the incident runbook."

Be careful searching for it, because the obvious search misleads. The string
"72 hours" _does_ occur elsewhere in the repo — `SECURITY.md` line 11 and the
P0 plan that generated it — but that is the security-disclosure acknowledgement
SLA ("We aim to acknowledge within 72 hours"), an unrelated promise about
answering researchers. Do not let a grep hit on our own vulnerability-disclosure
courtesy get mistaken for a statutory deadline; that is precisely how a wrong
number acquires a citation.

There is no statutory citation anywhere in this repo, no DPIA, no signed DPAs,
and the counsel review of the legal pages is still outstanding (`CMP-06`, plus
the `TODO(counsel-review)` markers at `apps/web/content/site.ts` lines 779 and
812, and the `pendingNote` callouts those pages render telling the reader the
text awaits counsel). Treating that unsourced number as the rule would be exactly
the kind of confident-and-unverified claim this project has already had to
retract more than once.

So the honest operating instruction, until counsel replaces it:

- Escalate within the hour and start the timeline. If a clock does exist, it
  almost certainly starts at "became aware", and the timeline is what proves
  when that was.
- Do not notify a regulator or an institution on your own initiative, and do not
  decide you are exempt either. Get counsel on it the same day.
- **Before launch, replace this section** with the actual duty, the actual
  deadline, the actual SDAIA contact route, and a source. That work is already
  tracked as `CMP-03`; this runbook is where the answer belongs when it lands.

---

## 7. Reducing recurrence: warn at the field, not in a policy

The threat model's phrasing is exactly right — "warning text only" is listed as
the _mitigation_, and the residual gap is everything else. But verifying what
the site actually says produced a worse result than "the warning is in the wrong
place". Two of the three warnings written for this purpose are not rendered at
all.

**What is verifiably dead content:**

- `site.forms.noPatientData` — "Please do not include any patient-identifiable
  information." — is defined at `apps/web/content/site.ts:613` and referenced by
  **no component**. The one string written to be _the_ form-level warning
  appears on no page.
- `site.pillarPages.services.body[1]` — "Describe the question, not the patient:
  please do not include any patient-identifiable information in your request." —
  is also unrendered. `/services`, `/knowledge` and `/data` each read only
  `site.pillarPages.<pillar>.formHeading`; the `body` arrays are never passed to
  a component.

**What actually reaches a user, per form.** The `privacyLine` under the submit
button is the only per-form text that renders:

- `/services` — "…No patient-identifiable data — describe the question, not the
  patient. Stored in Saudi Arabia, kept up to 24 months." A real warning, in the
  wrong position: it sits _below_ the submit button, which is to say, after the
  message has already been written.
- `/contact` — "We collect your name, email, and message only to reply. Stored on
  our servers in Saudi Arabia, kept up to 24 months, never used for tracking."
  **No patient-data warning at all** — on the form most likely to receive a
  paragraph about a case, because "Message" invites exactly that.
- `/knowledge` — no patient-data warning.
- `/data` — "No patient data is collected in this version," which is a statement
  about the registry, not an instruction to the person typing.

The `/services` FAQ does answer "What should I not send?" properly — but it
renders inside `packages/ui/src/accordion.tsx`, which opens nothing by default
(`useState<number | null>(null)`), in a section that sits _above_ the form. So it
is a closed disclosure, above the fold of the thing it is warning about, on one
of four forms.

Add it up and the honest summary is: on three of four forms, a clinician can
type a full case description without ever seeing a rendered instruction not to;
on the fourth, they see it under the submit button once the typing is done.

### The fix

Put the warning **on the textarea, above it, tied to it**.

`SubmissionForm` (`apps/web/components/forms/submission-form.tsx`) already builds
an `aria-describedby` for field errors, so the plumbing exists. Add an optional
`hint` to the `FormField` type, render it between the label and the control, and
merge the hint id into `describedBy` alongside the error id. Then set the hint on
every `type: "textarea"` field in `site.ts` — reusing `forms.noPatientData`,
which finally gives that string the job it was written for — and on the
`internalNotes` box in the admin detail page, since §1 notes an operator can
create this problem too.

Why above and attached, specifically: a warning below the submit button is read
_after_ the text exists, when complying means deleting a paragraph you just
wrote, which people do not do. A warning attached to the field is read before the
first keystroke, when complying is free. The current placement means the first
time a clinician sees "no patient-identifiable data" is after they have already
typed the MRN — and that is the exact failure this runbook cleans up.

### Rejected, with reasons

- **Server-side detection and auto-rejection of pattern matches.** By the time
  the server can match a pattern it has already received and (in any
  implementation worth having) logged or stored the data — the thing we are
  trying to prevent. It also rejects genuine requests over false positives:
  study IDs, sample sizes, gestational weeks and p-values are all runs of digits.
- **A client-side pattern hint** (warn, never block, never transmit, when a
  textarea contains a long digit run or a date) is _not_ rejected but is not
  proposed here either. It is the only control that can stop the data existing on
  our side at all, which is a strong argument for it; against it, a check that
  fires on "n = 1,247,388" trains people to dismiss the one that fires on an MRN.
  Worth a separate decision with its own false-positive testing, not a bullet in
  a runbook.
- **Emailing the submitter automatically when we redact.** Would reinstate
  submitter-facing mail and break ADR-0004 decision 5 (see §6). Reply by hand.
- **Marking such submissions Spam so they drop out of the default view.** They do
  not drop out of the default view — "All" is the default — and it writes an
  irreversible audit row that misdescribes what happened.

---

## 8. Things this runbook depends on that are not true yet

Written down rather than quietly worked around, because each one changes a step
above.

1. **The admin UI has no redaction or deletion control** (§5). Until it does,
   §3 step 4 requires host and database access, which one person has.
2. **`docs/runbooks/incident.md` line 62 is currently wrong.** Its
   "Data-deletion / retention request" section says to "find the row in the admin
   inbox and delete it" — there is no delete action in the admin inbox.
   `submissionAction` handles `notes`, `triage` and status values only. Fix that
   line when §5 ships, or correct it now to point here.
3. **The retention purge is not scheduled anywhere in this repository.**
   `packages/db/scripts/purge-retention.mjs` is correct and parameterized (24
   months for `Submission`, 12 for `AuditLog`), but nothing invokes it on a
   timer: no cron entry, no npm script in the root or `packages/db`
   `package.json`, and no Coolify scheduled task recorded in the repo. The one
   scheduled GitHub Actions workflow, `.github/workflows/residency.yml`
   (`cron: "0 6 * * *"`), runs the residency check and not this; `ci.yml` has no
   `schedule:` at all. This matches audit finding `SPC-DB-005` ("Retention purge
   exists but has no scheduler; 24mo/12mo deletion unproven"). So the 24-month
   retention that every form's privacy line promises is, today, a documented
   intention rather than an enforced one.

   Two caveats on how far that goes. A host crontab or a Coolify scheduled task
   would not appear in this repository, so "not scheduled here" is not the same
   as "not running" — check the Coolify UI before repeating the stronger claim.
   And this does not affect the emergency path in §3, which deletes directly.
   It does mean "it will be purged anyway" is not an answer to anything.

4. **The submission detail page's triage button is mislabelled** — "Triage &
   acknowledge submitter" at
   `apps/web/app/admin/(protected)/submissions/[id]/page.tsx` line 70, when the
   acknowledgement was removed under ADR-0004 and the comment directly above the
   form says so ("It sends nothing"). Under panic, that label invites an operator
   to believe they have notified someone. Relabel it to "Mark as triaged".
5. **`docs/decisions/ADR-data-model.md` still describes the post-triage
   acknowledgement email** — line 47, in the `Submission` threat-model note:
   "the submitter is emailed an acknowledgement only _after_ a human triages".
   Stale since ADR-0004; worth a one-line correction so the two documents do not
   contradict each other about whether the platform ever emails a submitter.
6. **`LAUNCH-BLOCKERS.md` contradicts itself about the audit-log grant.** Its
   deploy header says `SPC-DB-001`/`SPC-DB-003` are "live and verified in
   production", while the security-audit section further down still carries both
   as `[~] prepared` with "**Remaining:** apply + verify live". §4 of this
   runbook leans on that grant being live, and `purge-retention.mjs` independently
   records the 2026-07-28 production verification — so the header is the current
   one and the tickboxes are stale. Close them, because the next person to check
   whether the audit log is really append-only will find the pessimistic entry
   first and reasonably conclude it is not.
7. **The repo contradicts itself about at-rest encryption, underneath a live
   public claim** (§6). `apps/web/content/site.ts` line 755 tells the world "the
   storage holding the database and its backups is encrypted at rest", sourced in
   its own comment to a 2026-07-28 check of the host's **boot** volume. Meanwhile
   `docs/go-live-checklist.md` leaves "Encrypted **block** volume for the DB"
   deliberately unticked as unverified, LAUNCH-BLOCKERS keeps it open under P8,
   and `[DATA-06]` still asks the question. These may well be the same storage
   and the answer may well be yes — but a published claim resting on a check of a
   differently-named volume, with three internal documents still saying "open", is
   the precise shape of every claim this project has had to correct. Confirm where
   `pgdata` actually lives, then either tick the checklist items or qualify the
   site copy. This is the highest-priority item in this list, because it is the
   only one that is already public.
8. **The PDPL notification duty and deadline are unverified** (§6), as are the
   Coolify backup job's retention window and whether its dumps are encrypted at
   all (§3 step 5). Note that the same site.ts block also tells the public
   "automated, encrypted backups with a tested restore procedure" — the restore
   drill genuinely passed on 2026-07-26, but the "encrypted" half is the claim
   §3 step 5 could not confirm for the job that actually runs. Same volume
   question, probably the same answer, still unwritten.

Items 2, 4, 5 and 6 are corrections to _other_ files and were found while
verifying this one. They are recorded rather than fixed here because a runbook
that quietly edits four unrelated documents is a runbook nobody can review.
