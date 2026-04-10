# @wordpress/eslint-tools

Consolidated ESLint configuration for the Gutenberg monorepo. This is a **private** workspace package and is not published to npm.

## Files

-   **`config.mjs`** — Main ESLint flat config. The root `eslint.config.cjs` re-exports this so that ESLint, VS Code, and CI all resolve it transparently.
-   **`config.strict.mjs`** — Extends the base config with stricter rules (e.g., `import/order`). Used by lint-staged for pre-commit checks via the root `eslint.config.strict.cjs`.
-   **`import-resolver.cjs`** — Custom import resolver that maps `@wordpress/*` package imports to source files (`src/`) instead of built files (`build-module/`), so linting works without a build step.

## Why a workspace package?

Moving all ESLint plugins and config into a single package keeps the root `package.json` clean and makes future ESLint upgrades easier — all plugin dependencies live in one place rather than being scattered across root `devDependencies`.
