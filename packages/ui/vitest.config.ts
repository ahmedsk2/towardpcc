import { defineConfig } from "vitest/config";

/**
 * `tsconfig.json` here sets `"jsx": "preserve"` — correct for a package whose
 * `.tsx` is compiled by Next's own SWC pipeline in every consumer, never by
 * this package itself. Vite/Rolldown's oxc transform reads that same
 * tsconfig value for its own SSR module transform, though, and "preserve"
 * there means "leave the JSX in the output" — which is not valid JavaScript,
 * so Vitest's import-rewrite pass then fails to parse the very .tsx file it
 * just transformed ("Unexpected JSX expression"), on every .tsx export in
 * this package, unconditionally. Overriding `jsx` to the automatic runtime
 * here affects test execution only; the tsconfig value (and Next's build)
 * is untouched.
 */
export default defineConfig({
  oxc: {
    jsx: { runtime: "automatic" },
  },
});
