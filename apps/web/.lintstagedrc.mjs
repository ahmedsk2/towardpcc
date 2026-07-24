// Nested lint-staged config: makes lint-staged run these tasks with
// apps/web as cwd, so ESLint resolves this app's own flat config instead
// of the root config (which ignores apps/web/**).
const lintstagedConfig = {
  "*.{ts,tsx,mjs,js}": ["eslint --fix", "prettier --write"],
  "*.{json,css,md}": ["prettier --write"],
};

export default lintstagedConfig;
