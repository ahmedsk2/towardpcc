// Sliding-window rate limiting for the public submission path (PRD §9), kept as
// a pure, dependency-free module so its fail-closed behavior is unit-tested.
// State is encapsulated per limiter instance (no module-level globals) so tests
// are isolated. Single-instance only — a shared store (Redis) is needed before
// running more than one replica (tracked for P8).

export type Window = { max: number; windowMs: number };

/**
 * Records a hit ONLY when the request is accepted, so rejected attempts cannot
 * keep the sliding window pinned at saturation (the fail-open bug this avoids).
 * Returns whether the request is allowed and the pruned window to persist.
 */
export function tryConsume(
  store: readonly number[],
  now: number,
  cfg: Window,
): { ok: boolean; fresh: number[] } {
  const fresh = store.filter((t) => now - t < cfg.windowMs);
  const ok = fresh.length < cfg.max;
  if (ok) fresh.push(now);
  return { ok, fresh };
}

export type RateLimiter = { check: (ipKey: string, now: number) => boolean };

/**
 * Two-tier limiter: a per-IP window gates first, and ONLY accepted requests
 * touch the global window — so a per-IP-rejected flood can never saturate the
 * global bucket and lock everyone out. The tracked-IP map is bounded by evicting
 * the oldest keys rather than clearing it (which would wipe everyone's window).
 */
export function createRateLimiter(
  perIp: Window,
  global: Window,
  maxTrackedIps: number,
): RateLimiter {
  const ipHits = new Map<string, number[]>();
  let globalHits: number[] = [];

  return {
    check(ipKey: string, now: number): boolean {
      const perIpResult = tryConsume(ipHits.get(ipKey) ?? [], now, perIp);
      if (perIpResult.fresh.length === 0) ipHits.delete(ipKey);
      else ipHits.set(ipKey, perIpResult.fresh);
      if (!perIpResult.ok) return false; // rejected per-IP never touches the global bucket

      if (ipHits.size > maxTrackedIps) {
        let excess = ipHits.size - maxTrackedIps;
        for (const k of ipHits.keys()) {
          if (excess-- <= 0) break;
          ipHits.delete(k);
        }
      }

      const g = tryConsume(globalHits, now, global);
      globalHits = g.fresh;
      return g.ok;
    },
  };
}
