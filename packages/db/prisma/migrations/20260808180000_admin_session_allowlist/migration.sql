-- Server-side allow-list for admin sessions, so one can be REVOKED (SPC-TM-002).
--
-- The DDL below is the verbatim output of `prisma migrate diff`. The GRANT at
-- the bottom is the part Prisma cannot express, and it is not optional — see the
-- note there.

CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- The lookup on every admin request goes through this, so it is the one index
-- that must exist for the design to be affordable rather than merely correct.
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- "log this operator out everywhere"
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");

-- the expired-row sweep
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CASCADE is correct here and differs from the AuditLog relation on purpose:
-- a deleted operator should lose their sessions, whereas their audit history
-- must survive them (that FK is pinned RESTRICT for exactly that reason).
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "AdminUser"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- WITHOUT THIS BLOCK ADMIN LOGIN BREAKS ON THE FIRST REQUEST AFTER DEPLOY.
--
-- Migrations run as `towardpcc_owner`, and production's ALTER DEFAULT PRIVILEGES
-- were set for a different role, so the app role inherits NOTHING on an
-- owner-created table — verified when `AppSetting` shipped, where the table
-- existed and every read failed with "permission denied".
--
-- Each verb earns its place: SELECT validates a token on every request, INSERT
-- writes the row at login, UPDATE advances lastSeenAt, DELETE is sign-out and
-- revocation.
--
-- TABLE-SCOPED, NEVER `ON ALL TABLES IN SCHEMA public`. That form was
-- demonstrated to restore UPDATE and DELETE on "AuditLog" and let the app role
-- run `UPDATE "AuditLog" SET action = 'tampered'`, killing SPC-DB-003 silently.
--
-- Guarded on the role existing so the migration still applies on a developer
-- machine and in CI, where it does not.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'towardpcc_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AdminSession" TO towardpcc_app;
  END IF;
END
$$;
