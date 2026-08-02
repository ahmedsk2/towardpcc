import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7).
 *
 * Prisma 7 rejects `url` inside `datasource` in schema.prisma (P1012), so the
 * connection string has to be resolved here instead.
 *
 * Deliberately `process.env.DATABASE_URL` and not prisma/config's `env()`
 * helper. `env()` throws PrismaConfigEnvError while this file is being loaded —
 * before the CLI has looked at which command you ran — so an unset DATABASE_URL
 * fails `prisma generate` too. Generate needs no database: it reads the schema
 * and writes a client. Using `env()` here would mean `pnpm typecheck`, `pnpm
 * build` and the Docker image build all require a live connection string, and
 * the usual way that gets "fixed" is a dummy URL baked into the Dockerfile,
 * which is worse than the problem.
 *
 * Reading the variable directly keeps generate working with it unset, while
 * `migrate deploy` / `migrate dev` / `studio` still get the real value from the
 * environment and fail with Prisma's own clear error if it is missing.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
