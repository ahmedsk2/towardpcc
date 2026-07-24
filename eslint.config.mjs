import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// Root config: covers packages/*. apps/web has its own flat config
// (Next-specific plugins) — ignored here to avoid double-linting.
export default tseslint.config(
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/coverage/**", "**/dist/**", "apps/web/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  prettier,
);
