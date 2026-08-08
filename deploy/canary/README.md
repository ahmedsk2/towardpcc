# The daily production canaries, as a host timer

`check:residency` and `check:integrity` assert the LIVE site against what the
site publicly claims. They were GitHub Actions cron jobs; when Actions billing
was disabled they stopped, and **nothing was watching production** until
2026-08-08.

These units restore them on the OCI host, in-Kingdom, with no GitHub dependency.

## Why a container rather than installing Node

The host has no Node and no checkout of this repo, and it also runs a co-tenant
application holding real patient data. Installing a toolchain there to run two
scripts is surface added for no reason.

Both canaries are self-contained: their only import is `node:crypto`, they read
no repo files, and they take their configuration from the environment. So the
runner mounts just those two files into a stock `node:22-alpine`, read-only, and
throws the container away. Nothing is installed, and nothing persists.

## What it does NOT do, stated so nobody assumes otherwise

- **It does not assert the deployed commit.** `check-integrity` compares
  `x-build-fingerprint` against `sha256(EXPECTED_COMMIT)`, and the host has no
  checkout to derive `origin/main` from. Supplying it would mean putting a
  GitHub credential on the patient-data host, which is not a decision to take in
  passing. Without it the script **skips that one assertion** and runs the rest
  — content, security headers, and the `/api/v1` surface. The commit check stays
  a post-merge step run from a machine that has the repo.
- **It does not alert.** Failures land in the journal and in
  `systemctl status towardpcc-canary.service`. There is no mail on failure yet,
  because wiring one means SMTP credentials on the host and a verified delivery
  path, and an alert that has never been proven to arrive is worse than an
  honest absence. Until that exists this is a RECORD, not a page.

## Install

From a machine with this repo checked out, run from the repo root:

    scp -i ~/.ssh/oci_server scripts/check-residency.mjs scripts/check-integrity.mjs         deploy/canary/run-canaries.sh deploy/canary/towardpcc-canary.*         ubuntu@145.241.105.239:/tmp/canary/

    ssh -i ~/.ssh/oci_server ubuntu@145.241.105.239 '
      sudo install -m 0755 -d /opt/towardpcc-canary
      sudo install -m 0644 /tmp/canary/check-*.mjs /opt/towardpcc-canary/
      sudo install -m 0755 /tmp/canary/run-canaries.sh /opt/towardpcc-canary/
      sudo install -m 0644 /tmp/canary/towardpcc-canary.* /etc/systemd/system/
      sudo systemctl daemon-reload
      sudo systemctl enable --now towardpcc-canary.timer'

**The scripts are copied from `scripts/`, never duplicated into this directory.**
An earlier draft of this kept its own copies here; two files claiming to be the
same canary is exactly the drift these checks exist to catch, so the source of
truth stays `scripts/check-*.mjs` and this directory holds only the runner and
the units.

The copies on the host are a SNAPSHOT, not a mount, so re-run the install after
changing either script — otherwise the host quietly keeps testing yesterday's
assertions against today's site.

## Verify

    systemctl list-timers towardpcc-canary.timer    # next scheduled run
    sudo systemctl start towardpcc-canary.service   # fire one now
    journalctl -u towardpcc-canary.service -n 60 --no-pager
