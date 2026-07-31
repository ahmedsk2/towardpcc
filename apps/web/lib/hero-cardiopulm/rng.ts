/**
 * mulberry32 — a small, fast, seeded PRNG.
 *
 * Determinism is the point. Every visitor sees the same chest, and the
 * anatomical assertion suite can hash the generated geometry and compare it
 * across runs. `Math.random()` would make both impossible.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b_79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Uniform in [min, max). */
export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Uniform in [centre − spread, centre + spread). */
export function jitter(rng: () => number, centre: number, spread: number): number {
  return centre + (rng() * 2 - 1) * spread;
}

/**
 * Points spread evenly over a sphere by the Fibonacci lattice.
 *
 * Used for alveolar clusters. A naive `random × 4π` sampling clumps visibly at
 * the low counts this scene works at — with ~8 points per cluster, clumping is
 * the difference between a berry and a smudge.
 */
export function fibonacciSphere(count: number, radius: number): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
}
