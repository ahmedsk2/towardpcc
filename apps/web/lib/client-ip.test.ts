import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveClientIp } from "./client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("resolveClientIp", () => {
  describe("behind Cloudflare (production)", () => {
    it("prefers cf-connecting-ip, the only header carrying the real visitor", () => {
      // Traefik has no forwardedHeaders.trustedIPs, so it overwrites x-real-ip
      // with the connecting peer — a Cloudflare edge node. Without this
      // preference every visitor collapses onto a handful of edge addresses.
      expect(
        resolveClientIp(
          h({
            "cf-connecting-ip": "203.0.113.7",
            "x-real-ip": "172.68.42.1",
            "x-forwarded-for": "203.0.113.7, 172.68.42.1",
          }),
        ),
      ).toBe("203.0.113.7");
    });

    it("does not fall back to the Cloudflare edge address when the real IP is present", () => {
      const ip = resolveClientIp(
        h({ "cf-connecting-ip": "198.51.100.22", "x-real-ip": "104.16.0.1" }),
      );
      expect(ip).not.toBe("104.16.0.1");
    });
  });

  describe("without Cloudflare (local dev, direct origin)", () => {
    it("falls back to x-real-ip", () => {
      expect(resolveClientIp(h({ "x-real-ip": "192.0.2.5" }))).toBe("192.0.2.5");
    });

    it("falls back to the RIGHTMOST x-forwarded-for hop when x-real-ip is absent", () => {
      // The rightmost hop is what our own proxy observed. The leftmost is
      // whatever the client sent, and is therefore attacker-controlled.
      expect(resolveClientIp(h({ "x-forwarded-for": "10.0.0.9, 192.0.2.77" }))).toBe("192.0.2.77");
    });

    it("returns 'unknown' when nothing identifies the caller", () => {
      expect(resolveClientIp(h({}))).toBe("unknown");
    });
  });

  describe("spoofing resistance", () => {
    it("never returns the leftmost x-forwarded-for hop (CWE-348)", () => {
      const spoofed = "1.2.3.4";
      expect(resolveClientIp(h({ "x-forwarded-for": `${spoofed}, 192.0.2.77` }))).not.toBe(spoofed);
    });

    it("ignores an empty cf-connecting-ip rather than returning a blank bucket", () => {
      // A blank value must not become a shared rate-limit key that every
      // request collapses into.
      expect(resolveClientIp(h({ "cf-connecting-ip": "", "x-real-ip": "192.0.2.5" }))).toBe(
        "192.0.2.5",
      );
    });

    it("ignores a whitespace-only header value", () => {
      expect(resolveClientIp(h({ "cf-connecting-ip": "   ", "x-real-ip": "192.0.2.5" }))).toBe(
        "192.0.2.5",
      );
    });

    it("trims surrounding whitespace so one visitor cannot occupy two buckets", () => {
      expect(resolveClientIp(h({ "cf-connecting-ip": "  203.0.113.7  " }))).toBe("203.0.113.7");
    });

    it("ignores an x-forwarded-for of only separators", () => {
      expect(resolveClientIp(h({ "x-forwarded-for": " , , " }))).toBe("unknown");
    });
  });

  /**
   * Chain B — behind the OCI load balancer, after the KSA migration (ADR-0004).
   *
   * The whole point of this branch is that `cf-connecting-ip` stops being
   * trustworthy the moment the origin is reachable without passing Cloudflare.
   * The load balancer does not strip it, so it must not merely be demoted — it
   * must not be read.
   */
  /**
   * Chain B — behind the OCI load balancer, after the KSA migration (ADR-0004).
   *
   * These were rewritten on 2026-07-29 after measuring the real header chain,
   * which did not match what the first implementation assumed. Through the load
   * balancer a request arrives as:
   *
   *     X-Forwarded-For: <client-forged>, <real client>, <load balancer>
   *     X-Real-Ip:       <real client>          (forgeries overwritten)
   *     X-Via-Edge:      <the secret>           (forgeries overwritten)
   *
   * Two trusted proxies, not one: Traefik appends the load balancer because it
   * now trusts that subnet. Counting one hop from the right therefore resolved
   * every visitor to the load balancer's own address — the exact collapse this
   * code exists to prevent. The fixture below is that measured chain.
   */
  describe("behind the OCI load balancer", () => {
    const SECRET = "s3cr3t-edge-token";
    const REAL = "128.234.116.155";
    const LB = "10.0.1.45";

    beforeEach(() => {
      process.env.EDGE_SHARED_SECRET = SECRET;
    });
    afterEach(() => {
      delete process.env.EDGE_SHARED_SECRET;
    });

    /** The chain exactly as production produced it. */
    const realChain = (extra: Record<string, string> = {}) =>
      h({
        "x-via-edge": SECRET,
        "x-forwarded-for": `203.0.113.99, ${REAL}, ${LB}`,
        "x-real-ip": REAL,
        ...extra,
      });

    it("resolves the real client, not the load balancer", () => {
      // The regression that shipped and was caught by measurement: taking the
      // rightmost hop yields 10.0.1.45 for every visitor on earth.
      const ip = resolveClientIp(realChain());
      expect(ip).toBe(REAL);
      expect(ip).not.toBe(LB);
    });

    it("ignores the client-forged leftmost hop", () => {
      expect(resolveClientIp(realChain())).not.toBe("203.0.113.99");
    });

    it("IGNORES cf-connecting-ip, which is forgeable once Cloudflare is out of the path", () => {
      expect(resolveClientIp(realChain({ "cf-connecting-ip": "1.2.3.4" }))).toBe(REAL);
    });

    it("returns unknown rather than a non-address when the chain is malformed", () => {
      // If the rule set silently failed to apply, what arrives is whatever the
      // caller sent. Storing that as an address would poison the abuse hash.
      expect(resolveClientIp(h({ "x-via-edge": SECRET, "x-real-ip": "not-an-ip" }))).toBe(
        "unknown",
      );
      expect(resolveClientIp(h({ "x-via-edge": SECRET }))).toBe("unknown");
    });

    it("survives a client that also sends x-via-edge", () => {
      // Fetch joins duplicate headers with ", ", so a naive equality check on
      // the whole value would fail. Verified live that the load balancer
      // overwrites a forged value outright, but this must not depend on that.
      expect(resolveClientIp(h({ "x-via-edge": `forged, ${SECRET}`, "x-real-ip": REAL }))).toBe(
        REAL,
      );
    });
  });

  describe("the edge branch cannot be reached by guessing", () => {
    it("falls through to the Cloudflare path when the secret is wrong", () => {
      process.env.EDGE_SHARED_SECRET = "the-real-secret";
      try {
        expect(
          resolveClientIp(
            h({
              "x-via-edge": "guessed",
              "cf-connecting-ip": "203.0.113.7",
              "x-forwarded-for": "1.2.3.4, 172.68.42.1",
            }),
          ),
        ).toBe("203.0.113.7");
      } finally {
        delete process.env.EDGE_SHARED_SECRET;
      }
    });

    it("is unreachable entirely when EDGE_SHARED_SECRET is unset", () => {
      // This ships before the load balancer exists. An unconfigured secret must
      // never mean "trust whoever sets the header".
      delete process.env.EDGE_SHARED_SECRET;
      expect(
        resolveClientIp(
          h({
            "x-via-edge": "anything",
            "cf-connecting-ip": "203.0.113.7",
            "x-forwarded-for": "1.2.3.4, 172.68.42.1",
          }),
        ),
      ).toBe("203.0.113.7");
    });
  });
});
