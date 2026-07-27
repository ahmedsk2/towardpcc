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
COPY . .
# The container serves the standalone server (server.js) — opt into it here.
# The web build's prebuild runs `prisma generate` for the driver-adapter client.
ENV NEXT_OUTPUT_STANDALONE=1
RUN pnpm --filter @towardpcc/web build
# Next's standalone tracer misses Prisma's WASM query compiler (driver adapter,
# engineType=client). Copy the generated client's query_compiler_bg.wasm into the
# standalone tree at its resolved path so the runner has it (hash-independent).
RUN set -eu; SA=apps/web/.next/standalone; \
  WASM="$(find node_modules -type f -name 'query_compiler_bg.wasm' -path '*.prisma/client*' | head -1)"; \
  test -n "$WASM"; mkdir -p "$SA/$(dirname "$WASM")"; cp "$WASM" "$SA/$WASM"; \
  echo "bundled prisma wasm: $WASM"

FROM node:24-alpine@sha256:a0b9bf06e4e6193cf7a0f58816cc935ff8c2a908f81e6f1a95432d679c54fbfd AS runner
ENV NODE_ENV=production
# dumb-init as PID 1 → correct SIGTERM forwarding + zombie reaping on redeploy.
RUN apk add --no-cache dumb-init && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
# public/ is NOT part of the standalone output — Next expects it to be copied
# alongside. Without this the service worker (sw.js), every PWA icon and
# security.txt 404 in production, which silently breaks offline support.
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
