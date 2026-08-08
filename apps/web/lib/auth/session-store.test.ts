import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSessionId, LAST_SEEN_THROTTLE_MS, SESSION_MAX_AGE_MS } from "./session-rules";

/**
 * The database side of the session allow-list, against a mocked Prisma client.
 *
 * Mocked rather than run against a real Postgres on purpose. What needs pinning
 * here is the DECISION LOGIC — what is written, what is refused, and above all
 * that a database failure denies rather than allows. A live database proves the
 * SQL runs; it cannot easily be made to throw on demand, which is precisely the
 * branch that carries the security guarantee. The real thing is exercised by
 * `e2e/admin-session-revocation.spec.ts`.
 */

const adminSession = {
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
};

vi.mock("@towardpcc/db", () => ({ db: { adminSession } }));

const errorLog = vi.fn();
vi.mock("../logger", () => ({ logger: { error: (...a: unknown[]) => errorLog(...a) } }));

const { createSession, isSessionValid, revokeSession } = await import("./session-store");

const NOW = new Date("2026-08-08T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

beforeEach(() => {
  vi.clearAllMocks();
  adminSession.create.mockResolvedValue({});
  adminSession.update.mockResolvedValue({});
  adminSession.deleteMany.mockResolvedValue({ count: 1 });
});

describe("createSession", () => {
  it("stores the HASH and returns the raw id — the raw value must never be written", async () => {
    const id = await createSession({ userId: "u1", now: NOW });

    const written = adminSession.create.mock.calls[0]![0].data;
    expect(written.tokenHash).toBe(hashSessionId(id));
    expect(written.tokenHash).not.toBe(id);
    // Nothing in the row may contain the raw credential.
    expect(JSON.stringify(written)).not.toContain(id);
  });

  it("sets an absolute expiry one session-lifetime out", async () => {
    await createSession({ userId: "u1", now: NOW });
    const { expiresAt } = adminSession.create.mock.calls[0]![0].data;
    expect(expiresAt.getTime()).toBe(NOW.getTime() + SESSION_MAX_AGE_MS);
  });

  it("records the forensic fields when given, and null when not", async () => {
    await createSession({ userId: "u1", ipHash: "abc", userAgent: "UA", now: NOW });
    expect(adminSession.create.mock.calls[0]![0].data).toMatchObject({
      userId: "u1",
      ipHash: "abc",
      userAgent: "UA",
    });

    adminSession.create.mockClear();
    await createSession({ userId: "u2", now: NOW });
    expect(adminSession.create.mock.calls[0]![0].data).toMatchObject({
      ipHash: null,
      userAgent: null,
    });
  });

  it("mints a different id every time", async () => {
    const a = await createSession({ userId: "u1", now: NOW });
    const b = await createSession({ userId: "u1", now: NOW });
    expect(a).not.toBe(b);
  });
});

describe("isSessionValid", () => {
  it("looks the row up by hash, never by the raw id", async () => {
    adminSession.findUnique.mockResolvedValue(null);
    await isSessionValid("raw-id", NOW);
    expect(adminSession.findUnique.mock.calls[0]![0].where).toEqual({
      tokenHash: hashSessionId("raw-id"),
    });
  });

  it("refuses a revoked session (no row)", async () => {
    adminSession.findUnique.mockResolvedValue(null);
    expect(await isSessionValid("x", NOW)).toBe(false);
  });

  it("refuses an expired session even though the row still exists", async () => {
    adminSession.findUnique.mockResolvedValue({
      id: "s1",
      expiresAt: ago(1),
      lastSeenAt: NOW,
    });
    expect(await isSessionValid("x", NOW)).toBe(false);
  });

  it("accepts a live session", async () => {
    adminSession.findUnique.mockResolvedValue({
      id: "s1",
      expiresAt: new Date(NOW.getTime() + 1000),
      lastSeenAt: NOW,
    });
    expect(await isSessionValid("x", NOW)).toBe(true);
  });

  /**
   * THE BRANCH THAT CARRIES THE WHOLE GUARANTEE. If a database failure returned
   * true — or threw and were treated upstream as "carry on" — an unreachable
   * database would silently disable revocation while every page still rendered.
   */
  it("DENIES when the database throws, rather than allowing", async () => {
    adminSession.findUnique.mockRejectedValue(new Error("connection refused"));
    expect(await isSessionValid("x", NOW)).toBe(false);
  });

  it("advances lastSeenAt once it is stale", async () => {
    adminSession.findUnique.mockResolvedValue({
      id: "s1",
      expiresAt: new Date(NOW.getTime() + 1000),
      lastSeenAt: ago(LAST_SEEN_THROTTLE_MS + 1),
    });
    expect(await isSessionValid("x", NOW)).toBe(true);
    expect(adminSession.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { lastSeenAt: NOW },
    });
  });

  it("does not write when lastSeenAt is fresh — one write per minute, not per request", async () => {
    adminSession.findUnique.mockResolvedValue({
      id: "s1",
      expiresAt: new Date(NOW.getTime() + 1000),
      lastSeenAt: ago(1_000),
    });
    expect(await isSessionValid("x", NOW)).toBe(true);
    expect(adminSession.update).not.toHaveBeenCalled();
  });

  it("stays valid when only the lastSeenAt write fails — bookkeeping must not sign anyone out", async () => {
    adminSession.findUnique.mockResolvedValue({
      id: "s1",
      expiresAt: new Date(NOW.getTime() + 1000),
      lastSeenAt: ago(LAST_SEEN_THROTTLE_MS + 1),
    });
    adminSession.update.mockRejectedValue(new Error("write failed"));
    expect(await isSessionValid("x", NOW)).toBe(true);
  });
});

describe("revokeSession", () => {
  it("deletes by hash", async () => {
    await revokeSession("raw-id");
    expect(adminSession.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: hashSessionId("raw-id") },
    });
  });

  it("treats an already-deleted row as success", async () => {
    adminSession.deleteMany.mockResolvedValue({ count: 0 });
    await expect(revokeSession("x")).resolves.toBeUndefined();
    expect(errorLog).not.toHaveBeenCalled();
  });

  /**
   * Sign-out must still complete — but a surviving row means a captured cookie
   * stays valid for up to eight hours while the UI reports success, so the
   * failure has to be loud somewhere.
   */
  it("completes but LOGS when the delete fails, rather than failing silently", async () => {
    adminSession.deleteMany.mockRejectedValue(new Error("connection refused"));
    await expect(revokeSession("x")).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledTimes(1);
  });
});
