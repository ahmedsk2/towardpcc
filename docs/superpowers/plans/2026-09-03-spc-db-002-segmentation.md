# SPC-DB-002 — keeping co-tenant containers away from the database

**Status: PLAN. Nothing in this document has been executed.** It is written so
the founder can read it and choose; the change touches Coolify-managed
production on a host that also runs an application holding real patient data.

## What was measured, 2026-09-03, read-only

- The Postgres container (`tjuvmq29ogsdoocz59qigcoc`, `postgres:16`) holds two
  databases: `postgres` and `towardpcc`. No co-tenant data lives in it, so the
  blast radius of any change here is TowardPCC's own database and nothing else.
- It publishes no ports and sits on the shared `coolify` bridge at
  `10.0.2.13`, together with **sixteen** other containers — the other tenants'
  applications, Coolify itself, its proxy, Redis and database.
- `listen_addresses = *`, `ssl = on`, and `pg_hba.conf` ends in
  `host all all all scram-sha-256`. So any container on that bridge can open a
  connection to port 5432 and present a password. Password strength and the
  least-privilege `towardpcc_app` role are the whole defence today — which is
  what the record said, now confirmed.
- The application container is on the same bridge at `10.0.2.20`. Coolify
  created a per-application network (`gpsokvxzncr7ks1vzqz7wkr4`) but the
  Dockerfile-buildpack container is not attached to it.
- The app already connects over TLS (`TLSv1.3`, verified live); the "TLS second"
  half of the original item is done.

## What Coolify 4.1.2 can and cannot express — from its source, not memory

`bootstrap/helpers/docker.php` at tag `v4.1.2`:

- `convertDockerRunToCompose()` recognises `--cap-add`, `--cap-drop`,
  `--security-opt`, `--sysctl`, `--ulimit`, `--device`, `--shm-size`, `--dns`,
  `--init`, `--privileged`, `--ip`, `--ip6`, `--hostname`, `--entrypoint`,
  `--gpus`. **It does not recognise `--network`.** Its value regex is
  `([^\s-]+)?`, so any value containing a hyphen is dropped — the same defect
  that makes `no-new-privileges` inexpressible (recorded under "Settled").
- `generateCustomDockerRunOptionsForDatabases()` honours only `--ip`/`--ip6`,
  setting `ipv4_address` on the database's existing network.
- `app/Jobs/ApplicationDeploymentJob.php` (4,894 lines at `v4.1.2`): an
  application's `--ip` becomes `ipv4_address` on `$this->destination->network`
  — the `coolify` bridge — at lines 3299–3308 (Dockerfile buildpack, the
  `$this->container_name` branch at 3317–3326). And at line 1921 the job treats
  `--ip`/`--ip6` like a host port mapping: it logs "Custom IP address is set,
  rolling update is not supported", then `stop_running_container(force: true)`
  followed by `start_by_compose_file()` (lines 1936–1940). A fixed address
  cannot be held by two containers at once, so the rolling update is gone.
- The `coolify` bridge is `10.0.2.0/24`, gateway `10.0.2.1`, no reserved
  allocation pool; Docker hands out the low addresses (`.2`–`.20` in use on
  2026-09-03). A static address high in the range — `10.0.2.250` below — is
  reserved by Docker's IPAM the moment the container is created, so dynamic
  allocation cannot collide with it afterwards.

So: a dedicated network for web↔postgres, the topology the threat model asked
for at §2.5, **cannot be expressed through Coolify 4.1.2** for a managed
database. Anything done with `docker network connect/disconnect` by hand is
undone the next time Coolify recreates either container — every deploy for the
application — and would need a host-side reconciler to survive, which is a
second system to get wrong on a shared host. Not recommended.

## The two options that Coolify can hold

### A. Fixed application IP + `pg_hba` allow-list (recommended, with one cost)

1. Application → Coolify → Custom Docker Options: `--ip 10.0.2.250` (an
   address inside the `coolify` bridge's subnet but outside Docker's dynamic
   pool; confirm the pool with `docker network inspect coolify` first). No
   hyphen in the value, so the parser keeps it.
2. Postgres `pg_hba.conf` (in the data volume, survives container recreation;
   edited with `docker exec … sed` and reloaded with `pg_ctl reload`):
   ```
   hostssl towardpcc  towardpcc_app  10.0.2.250/32  scram-sha-256
   host    all        all            all            reject
   ```
   plus the existing `local`/loopback lines, which Coolify's own `docker exec`
   backup job uses and which are unaffected.
3. Verify from a throwaway container on the `coolify` network that a
   connection to `10.0.2.13:5432` is refused at the hba stage (`FATAL: no
pg_hba.conf entry`) — before any password is checked — and that
   `/api/v1/ready` still returns `ready` from the application.
4. Re-run the restore drill (the record requires it after any change here).

**Cost, stated plainly:** with `--ip` set, every deploy becomes stop-then-start
instead of a rolling update — a gap of roughly the container's start time
(seconds to tens of seconds) on each merge to `main`. The runbook's promise
that "the OLD container keeps serving until the new one is healthy" would no
longer hold for this application. That is a real trade against a real gap;
the founder chooses.

**Rollback:** remove the `--ip` option and redeploy; restore the previous
`pg_hba.conf` lines and reload. Both are minutes.

### B. Client-certificate authentication (keeps rolling updates)

Postgres `hostssl towardpcc towardpcc_app all cert clientcert=verify-full`,
with a client certificate and key delivered to the application as base64
single-line environment variables (the multi-line-value trap is recorded in
the runbook) and passed to the driver as `sslcert`/`sslkey`. Any container can
still reach the port, but no connection without the key gets past the TLS
handshake. More moving parts — a CA to run, a certificate to rotate, a driver
option to wire and test — and the failure mode when it goes wrong is the site
losing its database. Better security property than A, higher build cost.

### C. Status quo, deliberately

`scram-sha-256` with a strong password and a least-privilege role, on a bridge
whose other members are the founder's own applications. The record accepted
this on 2026-07-27 as the interim state. It remains defensible only while the
host's tenants are all trusted; it stops being so the first time an untrusted
workload lands on the box.

## Recommendation

A, if the founder accepts the loss of rolling updates for this one application
(and it can be revisited if Coolify gains `--network` support in a later
release — worth checking on each Coolify upgrade). Otherwise B, planned as its
own piece of work with a staging rehearsal. Not C, now that the reachability
gap is measured rather than assumed.

## What is NOT touched under any option

The shared security list, Traefik, the `coolify` network's definition, every
co-tenant container, and Coolify's own services. Every command above runs
against TowardPCC's application, TowardPCC's database container, and a
throwaway test container that is removed afterwards.
