# syntax=docker/dockerfile:1
FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/scoring-engine/package.json packages/scoring-engine/
COPY packages/db/package.json packages/db/
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
# busybox sh does not fail a pipeline when an earlier command fails — only the
# last one counts. The WASM copy below pipes `find` into `head`, so without
# pipefail a failing `find` would be masked by a succeeding `head` and the
# build would carry on with an empty result. Caught by hadolint DL4006.
SHELL ["/bin/ash", "-o", "pipefail", "-c"]
COPY . .
# The container serves the standalone server (server.js) — opt into it here.
# The web build's prebuild runs `prisma generate` for the driver-adapter client.
ENV NEXT_OUTPUT_STANDALONE=1
# Next.js reports anonymous build metrics to Vercel by default. It carries no
# application data, but it is an outbound call from the build to a third party
# for no benefit to us, and this project's residency posture is that every
# external dependency is a deliberate choice (ADR-0004).
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @towardpcc/web build
# Next's standalone tracer misses Prisma's WASM query compiler. Copy it out of
# the generated client into the standalone tree at its resolved path so the
# runner has it (hash-independent).
#
# Matched by glob, not by exact filename. Prisma 7 renamed this file from
# query_compiler_bg.wasm to query_compiler_fast_bg.wasm — a rename that an
# exact-name `find` turns into a build failure on upgrade, which is how this
# was caught. The glob also copies every variant present rather than the first
# one `head -1` happened to return, so a future fast/small split ships whole.
#
# The count is asserted BEFORE any copying: matching nothing must abort the
# build. The failure this whole step exists to prevent is a container where
# every query dies with ENOENT while /api/v1/health cheerfully returns 200.
#
# `find -exec` rather than a `for` loop over `find` output — the loop form is
# fragile on paths with whitespace, and hadolint rejects it (SC2044).
RUN set -eu; SA=apps/web/.next/standalone; \
  test "$(find node_modules -type f -name 'query_compiler*_bg.wasm' -path '*.prisma/client*' | wc -l)" -gt 0; \
  find node_modules -type f -name 'query_compiler*_bg.wasm' -path '*.prisma/client*' \
    -exec sh -c 'mkdir -p "$1/$(dirname "$2")"; cp "$2" "$1/$2"; echo "bundled prisma wasm: $2"' _ "$SA" {} \;

# The retention purge needs a runtime of its own, because the standalone tree
# has none. /app/node_modules in the shipped image is EMPTY — verified in the
# running container 2026-08-07, `ls | wc -l` returns 0 — and Next bundles every
# dependency into .next/server/chunks, so `import pg` there dies with
# ERR_MODULE_NOT_FOUND.
#
# This is ~2 MB, not the ~88 MB an equivalent Prisma runtime would cost, because
# the purge was rewritten onto `pg` alone: it is two counts and two deletes on
# one indexed date column each, and Prisma bought nothing for that.
#
# Flat and symlink-free (--node-linker=hoisted) so a plain `node` can resolve it
# with no pnpm store present. The version is pinned to the workspace resolution;
# if pnpm-lock.yaml moves pg, move it here in the same commit.
#
# --ignore-workspace, or pnpm resolves the whole monorepo and installs hundreds
# of packages this job will never call.
#
# THE MANIFEST AND LOCKFILE ARE COMMITTED (apps/web/purge-runtime/), and both
# halves of that matter. An earlier revision synthesised the manifest inline and
# installed with --no-lockfile, which looked isolated and was actually a
# supply-chain regression against the rest of this build:
#
#   * The three-day quarantine silently stopped applying. `.npmrc` sets
#     minimum-release-age=4320, but pnpm reads the PROJECT .npmrc from whatever
#     --dir points at, and /purge had none. Demonstrated: with the age set to
#     100 years the install still exited 0 and installed 14 packages, while the
#     same install with .npmrc present failed correctly with
#     ERR_PNPM_NO_MATURE_MATCHING_VERSION. (It is --dir that causes this, not
#     --ignore-workspace — dropping that flag does not restore it.)
#
#   * Only `pg` itself was pinned. It declares its own dependencies as ranges
#     (^2.14.0, ^3.14.0, ^1.15.0), so thirteen transitive micro-packages —
#     split2, xtend, pg-int8, postgres-bytea, pgpass and the rest — resolved
#     fresh on every Coolify build. They happened to match pnpm-lock.yaml, but
#     nothing enforced it.
#
# Copying .npmrc in restores the quarantine; --frozen-lockfile pins all fourteen.
RUN set -eu; \
  mkdir -p /purge; \
  cp /repo/.npmrc /purge/.npmrc; \
  cp /repo/apps/web/purge-runtime/package.json /repo/apps/web/purge-runtime/pnpm-lock.yaml /purge/; \
  pnpm install --dir /purge --node-linker=hoisted --ignore-workspace --prod --frozen-lockfile; \
  rm /purge/.npmrc; \
  cp /repo/packages/db/scripts/purge-retention.mjs /purge/purge-retention.mjs; \
  node -e "import('/purge/node_modules/pg/lib/index.js').then(() => console.log('purge runtime: pg resolves'))"

FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS runner
ENV NODE_ENV=production
# dumb-init as PID 1 → correct SIGTERM forwarding + zombie reaping on redeploy.
#
# npm, npx and corepack are then deleted. This image runs exactly one command —
# `node apps/web/server.js` — and never installs anything, so a package manager
# here is pure attack surface: a foothold in the container would otherwise come
# with the ability to fetch and execute arbitrary packages.
#
# It also removes a whole class of scanner noise. Every HIGH/CRITICAL finding in
# the first Trivy run (brace-expansion, undici and friends) came from npm's own
# bundled dependencies under /usr/local/lib/node_modules/npm — nothing this
# application depends on, and unfixable by changing our lockfile. Deleting npm
# fixes them properly rather than suppressing them.
# Upgrade Alpine's own packages before adding ours. The digest above pins the
# base image's LAYERS, and a base rebuild lags Alpine's security releases by
# weeks: on 2026-09-03 Trivy failed every code push on libcrypto3 3.5.7-r0
# (CVE-2026-14456, HIGH) while Alpine's index already carried 3.5.8-r0 — and
# the newest node:24-alpine build shared the very same base layer, so bumping
# the digest would have shipped the same hole. `apk upgrade` resolves against
# the live index at build time, exactly as `apk add` below already does for
# dumb-init, and the Trivy scan in CI is what verifies the result.
#
# hadolint's DL3017 objects that `apk upgrade` makes the package set
# unreproducible. It was never reproducible: the digest pins the base LAYERS,
# and `apk add` has always resolved against the live index — the DL3018 note
# in ci.yml records why that stays unpinned (a pin drops out of the index when
# the branch moves and turns a security update into a hard build failure).
# The control that actually holds is Trivy on every code commit, and this
# change relies on that one, so DL3017 is ignored here on the same footing.
# hadolint ignore=DL3017
RUN apk upgrade --no-cache \
  && apk add --no-cache dumb-init \
  # PINNED, both halves. The comments below reason about "uid=100, verified
  # in the built image", but 100 was only what Alpine's system range handed
  # out first — a base-image change could have moved it and quietly
  # falsified them. Pinned, it fails the build loudly instead: a base that
  # has claimed the id aborts this RUN with "uid in use".
  #
  # THE GID IS 101, NOT 100, AND THAT IS NOT A TYPO: gid 100 is `users` in
  # this base image. It is pinned as well so the asymmetry cannot be tidied
  # away later — `USER 100:100` would SILENTLY run with primary group
  # `users` instead of `app`, which is not the group the tree is chowned to.
  && addgroup -S -g 101 app && adduser -S -u 100 app -G app \
  && rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm /usr/local/bin/npx \
    /usr/local/lib/node_modules/corepack /usr/local/bin/corepack
WORKDIR /app
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
# public/ is NOT part of the standalone output — Next expects it to be copied
# alongside. Without this the service worker (sw.js), every PWA icon and
# security.txt 404 in production, which silently breaks offline support.
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public
# Retention purge + its own minimal runtime. Run by a Coolify scheduled task as
# `node /app/purge/purge-retention.mjs --skip-audit` — see SPC-DB-005. The
# --skip-audit flag is not optional there: the app role holds INSERT and SELECT
# only on AuditLog by design, so without it the nightly job fails half its work.
#
# DELIBERATELY NOT --chown=app:app, unlike every COPY above it. The web process
# never imports anything under this path — the scheduler executes it — so `app`
# ownership buys nothing and costs a persistence gadget: with the tree owned by
# `app` (verified in the built image as uid=100, both writes succeeded) any RCE
# in the Next.js process could rewrite purge-retention.mjs or pg/lib/index.js and
# have the next scheduled run execute it, surviving a restart.
#
# Bare COPY leaves it root:root, 0755 dirs / 0644 files — still world-readable
# and traversable, so a scheduled task running as the default USER app executes
# it fine and cannot alter it. Verified in a root-owned build: the purge ran as
# uid 100 while both the script and pg were read-only to it.
COPY --from=build /purge ./purge
# Numeric, and measured equivalent to `USER app`: both give
# uid=100(app) gid=101(app). NOT because it avoids needing /etc/passwd —
# that is backwards. The runtime resolves 100 against the IMAGE's passwd
# entry `app:x:100:101`, which is exactly what supplies gid 101; without
# that entry this would fall back to gid 0. The numeric form is MORE
# dependent on it, not less. It is kept because it asserts non-root in a
# form an admission controller can verify (Kubernetes `runAsNonRoot`
# refuses a username it cannot prove), which is free and forward-looking.
# It is NOT what was failing CI: DL3066 is severity `info` and the job
# runs `failure-threshold: warning`, so only DL3025 below was red.
USER 100
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
# Exec form, so no shell is spawned per probe (hadolint DL3025, the one
# finding that was actually failing this job). `wget` is a real binary here
# and Docker treats any non-zero exit as failure, so the `|| exit 1` this
# carried normalised nothing. Discarding the body costs no diagnostic
# signal either: the endpoint returns a constant `{"status":"ok"}` and the
# build fingerprint travels in a HEADER, which `-qO-` never printed.
#
# --start-period MATCHES docker-compose.yaml's 40s. Without it, probes
# counted against `retries` from the first second, and in build-pack mode
# this is the healthcheck Coolify actually uses — so a slow cold start
# could delay or block a rolling cutover. The endpoint differs from the
# compose file's `/api/v1/ready` on purpose: this one is liveness, so a
# database outage cannot turn into a restart loop.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/api/v1/health"]
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
