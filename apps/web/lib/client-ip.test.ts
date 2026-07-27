import { describe, expect, it } from "vitest";
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
});
