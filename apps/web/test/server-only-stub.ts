// Test-only stub for the `server-only` package. In a Node/vitest run there is
// no React Server Component boundary, so the real module throws on import;
// aliasing it here (see vitest.config.ts) lets us unit-test server modules
// (auth crypto, rate limiter) directly. This changes nothing at build/runtime.
export {};
