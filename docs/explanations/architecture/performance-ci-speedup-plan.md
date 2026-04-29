# Performance CI speedup plan

## Summary

This branch carries the Site Editor helper fix from
[WordPress/gutenberg#77726](https://github.com/WordPress/gutenberg/pull/77726),
but #77726 only removes one artificial wait from the benchmark path. The
performance workflow has additional CI-only costs that can be reduced without
changing the benchmarked product behavior, reducing sample counts, or hiding
flaky tests.

The best follow-up speedups are:

1. Build performance-test plugin copies with `npm run build -- --skip-types`.
2. Reuse the already-built test-runner checkout as the plugin checkout when it
   is the same ref as a measured branch.
3. Cache Playwright browser downloads.
4. Skip the performance workflow for PRs that only change documentation or other
   files that cannot affect runtime performance.
5. Add runner timing telemetry so future timeouts identify setup, build,
   browser install, environment start, and test runtime separately.

These are separate from #77726. #77726 fixes a correctness bug in the Site
Editor readiness helper. The items below target duplicated CI setup work around
the benchmark.

## Current workflow shape

The performance workflow in `.github/workflows/performance.yml` checks out the
repository, runs `.github/setup-node`, installs NVM, and then calls
`./bin/plugin/cli.js perf`.

The `perf` command in `bin/plugin/commands/performance.js` then builds its own
world under `/tmp/wp-performance-tests`:

1. Create a shallow Git repository in `/tmp/wp-performance-tests/source`.
2. Fetch every branch or commit being compared.
3. Copy `source` to `/tmp/wp-performance-tests/tests`.
4. Check out `--tests-branch` in the test-runner copy.
5. Run `nvm install`, `npm ci`, `npx playwright install chromium --with-deps`,
   and `npm run build` in the test-runner copy.
6. For every measured branch, copy `source` to an environment plugin checkout,
   check out that branch, and run `nvm install`, `npm ci`, and `npm run build`.
7. For every performance suite, start the branch environment, run the suite,
   stop the environment, and repeat for the next branch.

For normal PR runs, the workflow invokes:

```sh
./bin/plugin/cli.js perf "$GITHUB_SHA" "$GITHUB_BASE_REF" \
	--tests-branch "$GITHUB_SHA"
```

That means the current PR commit is built twice: once as the test runner and
once as a measured plugin branch.

For trunk push runs, the workflow invokes:

```sh
./bin/plugin/cli.js perf "$GITHUB_SHA" dae102af1458310b05de3c1281b1654951a729ab \
	--tests-branch "$GITHUB_SHA" \
	--wp-version "$WP_MAJOR"
```

That has the same duplicate current-commit build.

## #77726 baseline

PR #77726 changes `visitSiteEditor()` so it no longer requires observing a
transient loader. The previous helper could miss a short-lived loader and then
spend the visible-state timeout waiting for an event edge that had already
happened.

The fix is correct because the helper's contract is not "observe the loader";
the contract is "return after the Site Editor canvas is usable and the loading
overlay is gone." The new predicate checks page state directly:

- `loading-or-ready`: the loader is visible, or the canvas is already ready.
- `loaded`: no visible loader and a ready canvas.

That preserves the large-entity timeout and the Site Editor coverage while
removing the artificial wait.

## Additional speedups

### 1. Use `--skip-types` for performance builds

`npm run build` currently runs `bin/build.mjs`, including:

- workspace builds,
- worker placeholder generation,
- TypeScript version validation,
- `tsc --build`,
- declaration file checks,
- vendor builds,
- production package builds,
- block manifest generation,
- workspace `build:wp` targets.

The performance benchmark needs runtime assets for WordPress: JS, CSS, PHP, and
block manifests. It does not need freshly generated package declaration files.
The repository already has dedicated type coverage in
`.github/workflows/static-checks.yml`, where "Type checking" runs
`npm run build`.

Change the performance command's build steps from:

```sh
npm run build
```

to:

```sh
npm run build -- --skip-types
```

for the test-runner checkout and every measured plugin checkout.

Why this is safe:

- It does not change any performance test, benchmark sample, browser action, or
  WordPress runtime path.
- It matches the precedent in the e2e and PHP-unit build workflows, which
  already use `npm run build -- --skip-types` for runtime assets.
- Type regressions remain covered by the static checks workflow.

What to validate:

- Run a performance PR with `--skip-types` and confirm the built plugin loads
  and all performance suites still produce the same result files.
- Keep the static checks workflow required, because it owns type coverage after
  this change.

### 2. Reuse the test-runner build for the current branch

On PR and trunk push runs, `--tests-branch` is the same ref as the first
measured branch. The command currently performs two full installs and two full
builds for that same ref.

When a measured branch equals `testRunnerBranch`, the runner can reuse the
test-runner checkout as the plugin path for that branch's `.wp-env.json`:

```js
const buildDir =
	branch === testRunnerBranch ? testRunnerDir : path.join( envDir, 'plugin' );
```

Then skip the copy, checkout, `npm ci`, and build for that branch only.

Why this is safe:

- The ref, source tree, dependencies, and built assets are identical.
- Each branch still gets a separate `envDir`, so WordPress database and
  container state remain separate.
- The performance test code is already run from the test-runner checkout; using
  that checkout as the plugin path does not make the benchmark use different
  code.

Risk and mitigation:

- If a test or `wp-env` unexpectedly writes into the plugin checkout, it could
  dirty the test-runner tree. Add a post-suite `git status --short` assertion
  during the first validation run. If that ever shows real writes, use a
  lightweight copy of the built tree for the matching branch instead of a second
  install and build.

Expected impact:

- Normal PR and trunk push runs save one source copy, one `nvm install`, one
  `npm ci`, and one build.
- Release runs only benefit when `--tests-branch` is also one of the compared
  branches.

### 3. Cache Playwright browser downloads

The test-runner setup runs:

```sh
npx playwright install chromium --with-deps
```

The Node dependency cache does not necessarily cache
`~/.cache/ms-playwright`. Add an Actions cache keyed by OS and the Playwright
version in `package-lock.json`, then keep the install command as the verifier
that the expected Chromium revision is present.

Why this is safe:

- The browser version remains pinned by the installed Playwright package.
- The install command still runs and can repair a missing cache.
- The benchmarked product code and test coverage do not change.

This is a setup-time speedup only; it should not affect measured performance
numbers.

### 4. Skip performance CI for docs-only PRs

Performance tests are useful for code that can affect runtime behavior. They do
not add signal for PRs that only change markdown documentation.

Add a conservative PR path filter to the workflow, for example:

```yaml
on:
    pull_request:
        paths-ignore:
            - 'docs/**'
            - '**/*.md'
```

Why this is safe:

- Runtime performance coverage is unchanged for code changes.
- Docs-only PRs stop consuming a long-running benchmark job.

Risk and mitigation:

- Do not ignore broad metadata paths such as `package.json`, `package-lock.json`,
  `.github/**`, `bin/**`, `packages/**`, `lib/**`, `routes/**`, `test/**`, or
  `schemas/**`.
- Keep the filter narrow. A mixed PR with any code file still runs the
  performance workflow.

### 5. Add phase timing telemetry

This is not itself a speedup, but it makes future speedups much less speculative
and makes CI timeouts actionable.

Record timings for:

- Git fetch and checkout setup,
- test-runner install,
- test-runner build,
- Playwright browser install,
- per-branch install,
- per-branch build,
- each `wp-env start`,
- each suite runtime,
- each `wp-env stop`.

Emit these timings to the workflow summary and archive a JSON artifact. Keep
them separate from CodeVitals benchmark metrics.

Why this is safe:

- It observes the runner; it does not change test behavior.
- It prevents future regressions from being misdiagnosed as product
  performance changes.

## Risky ideas to avoid

### Do not reduce sample counts

Reducing the Site Editor loading samples or removing the throwaway iteration
would improve wall clock by weakening the benchmark. That is not a CI speedup;
it is less data.

### Do not add retries

Retries make flaky tests less visible and can increase wall clock in failure
cases. The performance workflow should fail loudly when the benchmark path is
not reliable.

### Do not parallelize compared branches on the same runner

Running both compared branches at the same time on one runner would introduce
CPU, memory, disk, database, and browser contention. The benchmark compares
branches; it should not make the branches interfere with each other.

### Do not switch to branch-major suite ordering only to reduce starts

The current loop compares branches suite by suite. That keeps each suite's
branch comparison close in time on the same runner. Running all suites for one
branch and then all suites for the next branch might reduce environment starts,
but it increases temporal noise between paired measurements.

If environment startup is proven to dominate after telemetry is added, optimize
startup without sacrificing close-in-time branch comparisons.

### Do not shard suites without shared build artifacts

Suite-level matrix jobs can reduce wall clock, but a naive matrix would repeat
the expensive branch installs and builds in every suite job. That trades one
timeout risk for much higher total CI cost. Only consider suite sharding after
there is a shared build artifact plan that preserves per-suite branch
comparison isolation.

## Recommended order

1. Land #77726.
2. Change performance builds to `npm run build -- --skip-types`.
3. Reuse the test-runner build for the matching measured branch.
4. Add Playwright browser caching.
5. Add docs-only PR path filtering.
6. Add phase timing telemetry before larger runner changes.

This order removes duplicated CI work first and leaves the benchmark's
coverage, samples, branch isolation, and measured user flows intact.
