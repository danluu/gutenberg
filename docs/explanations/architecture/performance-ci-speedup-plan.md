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

## Audit of the plan

These are perspective-style audits, not quotes from the named people.

### Linus Torvalds-style maintainer audit

The plan has the right instinct: remove duplicated work before touching test
coverage. But it still mixes small, obvious changes with changes that need more
proof.

`--skip-types` is the cleanest first patch. The performance workflow is not the
type-checking workflow, and other CI jobs already own that. It is a boring
change with a clear boundary.

Reusing the test-runner checkout as the plugin checkout is plausible, but it
needs a tighter invariant than "the ref is the same." The invariant should be:
the reused checkout must be treated as read-only by WordPress, Playwright, and
the performance tests. If that invariant is not proven, the change can become a
state leak between the runner and the measured environment. Add a check that
the reused checkout is clean before and after the matching branch's suites.

The Playwright browser cache should not be high in the list. It is safe, but it
is probably a small win. Putting small wins ahead of the build duplication
fixes makes the plan look unfocused.

Path filtering is a policy change, not a runner optimization. It can be good,
but do it only if maintainers agree docs-only PRs should not exercise the
performance workflow.

### Kyle Kingsbury / Jepsen-style audit

The plan needs clearer isolation guarantees. The performance workflow is an
experiment comparing branches. Every optimization should preserve the
experiment:

- Same tests for each branch.
- Same WordPress version.
- Same runner class.
- Separate WordPress data state per branch.
- No cross-branch mutation through shared directories.
- Branch comparisons close enough in time that runner drift is not the main
  signal.

`--skip-types` is safe because it removes a setup check that is outside the
runtime experiment. It should not affect the generated runtime artifacts used
by WordPress.

Reusing the test-runner checkout is the riskiest useful optimization. It
changes topology: the test process and the plugin under test would share a
filesystem tree. If any code path writes into the plugin checkout, it can
change later observations. The safer version is not to reuse the live
test-runner directory directly at first. Instead, create one built current-ref
copy and use it for both roles, or harden the direct reuse with explicit
read-only checks.

Caching Playwright browsers is observationally safe as long as the browser
revision remains pinned by Playwright. The install command should still run as
a verifier.

Path filtering preserves experimental validity for runs that happen, but it
changes which PRs run the experiment. Keep it narrow enough that a mixed PR
cannot skip performance CI.

### Dan Luu-style measurement audit

The plan should avoid pretending all speedups are equal. A useful plan should
separate expected impact from certainty.

Likely impact:

- `--skip-types`: probably minutes, because full type generation runs once for
  the test runner and once per measured branch.
- Reusing the matching current-ref build: probably several minutes, because it
  removes one copy, one install, and one build in normal PR and trunk runs.
- Playwright browser cache: probably 30 to 90 seconds, possibly less, because
  it only avoids browser download and extraction. It does not affect builds,
  `wp-env`, or test runtime.
- Docs-only path filtering: large when it applies, zero otherwise.
- Telemetry: no direct speedup, but it is what prevents the next plan from
  relying on guesses.

The plan also needs an implementation order that lets us learn. If we combine
`--skip-types`, build reuse, Playwright caching, and path filtering into one PR,
we will not know which change helped or broke something. The first follow-up
should add timing telemetry or make exactly one low-risk build change.

Do not oversell Playwright caching. It is worth doing if cheap, but it is not a
major answer to a 40 to 60 minute job.

## Revised plan after audit

### Phase 0: keep #77726 as the correctness baseline

The Site Editor helper must not wait on a transient loader edge. Keep #77726 as
the first change because it fixes a real readiness race and removes artificial
test time without weakening coverage.

### Phase 1: add minimal timing telemetry

Add phase timings before or alongside the first runner optimization. At minimum
record:

- test-runner install,
- test-runner build,
- Playwright install,
- per-branch install,
- per-branch build,
- `wp-env start`,
- suite runtime,
- `wp-env stop`.

Emit the timings to the workflow summary and archive JSON. Keep this out of
CodeVitals. This does not speed up CI, but it makes every later speedup
auditable.

### Phase 2: use `--skip-types` for performance builds

Change the performance command so the test-runner checkout and every plugin
checkout run:

```sh
npm run build -- --skip-types
```

instead of:

```sh
npm run build
```

This is the safest high-impact speedup. It removes type declaration work from a
runtime benchmark while preserving type coverage in static checks.

Validation:

- Run the performance workflow and confirm every suite still emits raw and
  curated result files.
- Confirm the built plugin loads under `wp-env`.
- Confirm static checks remain required for type coverage.

### Phase 3: remove the duplicate current-ref build

For PR and trunk push runs, `testRunnerBranch` is also a measured branch. Avoid
installing and building that ref twice.

Start with the safer implementation:

1. Build the test-runner checkout.
2. For the measured branch that equals `testRunnerBranch`, create a lightweight
   built-copy directory from the test-runner checkout instead of performing a
   fresh `npm ci` and build.
3. Point that branch's `.wp-env.json` plugin path at the built copy.
4. Check `git status --short` on the built copy before and after the branch's
   suites during validation.

If validation proves the plugin checkout is not mutated, a later patch can
consider direct reuse of `testRunnerDir`. The built-copy version captures most
of the win while keeping the test runner and plugin-under-test paths separate.

Validation:

- Compare result files against a control run.
- Confirm the current-ref branch and base branch still use separate `envDir`
  directories.
- Confirm no branch writes into another branch's plugin path.

### Phase 4: add Playwright browser caching as a modest setup win

Cache `~/.cache/ms-playwright` using a key that includes OS and the Playwright
version from `package-lock.json`. Keep:

```sh
npx playwright install chromium --with-deps
```

as a verifier after cache restore.

Expected speedup is modest, roughly 30 to 90 seconds on cache hits and possibly
less. This is worth doing only because it is low risk and independent of the
benchmark.

### Phase 5: add narrow docs-only path filtering if maintainers agree

Use a conservative `paths-ignore` rule only for files that cannot affect
runtime performance, such as docs-only markdown changes. Do not ignore
workflow, package, lockfile, source, schema, test, PHP, or route paths.

This saves large amounts of CI time when it applies, but it is a policy choice.
It should not be bundled with runner correctness changes.

### Phase 6: defer larger runner topology changes

Do not change suite ordering, branch parallelism, or suite sharding until the
timing telemetry shows where time is going after phases 2 through 4.

If a later change tries to reduce `wp-env` start/stop time, it must preserve:

- same test code across branches,
- separate WordPress data state per branch,
- close-in-time branch comparison per suite,
- no shared mutable plugin directory across branches,
- no lower sample counts,
- no retries as a substitute for readiness correctness.

## Further opportunities from deeper analysis

These are additional opportunities found by reading the workflow, the
performance runner, the `wp-env` cache code, and the performance specs. They
are not all equal-priority recommendations. Each one needs timing data before
implementation, and none should change benchmark samples, browser actions, or
coverage.

### 6. Deduplicate dependency installs when lockfiles match

Current shape:

- The workflow first runs `.github/setup-node`, which can restore root
  `node_modules`.
- The performance runner then creates `/tmp/wp-performance-tests`.
- Inside that temporary tree, it runs `npm ci` for the test-runner checkout.
- It then runs another `npm ci` for every branch checkout.

For normal PRs, the current commit and base branch usually have identical
dependency inputs: `.nvmrc`, `package.json`, `package-lock.json`, and
`patches/**`. In those cases, running a full clean install for each checkout is
probably duplicate work.

Potential fix:

1. Compute a dependency key for each checkout from Node version, `package.json`,
   `package-lock.json`, and `patches/**`.
2. Run `npm ci` once per unique key in the temporary performance workspace.
3. For another checkout with the same key, copy the installed `node_modules`
   tree into place before running that checkout's build.
4. Fall back to a fresh `npm ci` whenever the key differs.

Expected impact:

- Potentially minutes on typical PR runs, because this removes one or more full
  `npm ci` executions after the first matching checkout.
- Bigger impact on cache misses or slower runners.
- Low impact for PRs that intentionally change dependencies, because those
  must fall back to independent installs.

Correctness risks:

- npm workspace symlinks must remain valid after the copy.
- `postinstall` output and `patch-package` changes must be identical in the
  copied checkout.
- Native or generated artifacts must not embed the original checkout path in a
  way that affects the build.

Validation:

- Only reuse installs when the full dependency key matches.
- Preserve symlinks when copying.
- Run `npm ls --workspaces=false` or an equivalent cheap integrity check after
  reuse.
- Compare `git status --short` before and after build in reused checkouts.
- Roll out behind timing telemetry so failed assumptions are visible.

This is a better target than caching the whole temporary workspace. It has a
clear invalidation rule and does not share WordPress state or benchmark output.

### 7. Avoid repeated `nvm install` calls when `.nvmrc` matches

The workflow already runs `actions/setup-node` for the repository checkout and
then installs NVM. The performance runner still shells into every temporary
checkout with:

```sh
source $HOME/.nvm/nvm.sh && nvm install && npm ci && ...
```

That happens once for the test runner and once for every branch environment.
For most PRs, all compared refs use the same `.nvmrc`.

Potential fix:

- Read `.nvmrc` in each checkout.
- If it matches the already configured Node version, run the install/build
  command directly without `nvm install`.
- If it differs, keep the existing NVM path for that checkout.

Expected impact:

- Small to modest. This is probably seconds per checkout when the Node version
  is already present, but it is pure setup overhead.
- More useful when combined with dependency install reuse, because both changes
  make checkout setup less repetitive.

Correctness risks:

- Older release branches or reference commits may require a different Node
  version.
- The fallback must remain intact for release comparisons and
  `workflow_dispatch`.

Validation:

- Log the Node version selected for each checkout.
- Exercise a PR comparison where both refs match.
- Exercise a synthetic comparison where one checked-out ref has a different
  `.nvmrc`.

### 8. Use Git worktrees instead of copying the source repository

The runner initializes one shallow source repository, fetches the refs, then
uses `cp -R` to make the test-runner checkout and every branch plugin checkout.
That copies the repository metadata and working tree multiple times before any
dependency installation or build starts.

Potential fix:

1. Fetch every requested ref and record the resolved commit SHA.
2. Create the test-runner checkout with `git worktree add --detach`.
3. Create each branch plugin checkout with another detached worktree.
4. Remove worktrees during cleanup.

Expected impact:

- Probably modest: seconds to low minutes, depending on filesystem speed and
  the number of compared refs.
- It also reduces disk use, which helps when later changes copy built artifacts
  or `node_modules`.

Correctness risks:

- Ref names, SHAs, release branches, and `workflow_dispatch` inputs all need to
  resolve cleanly before worktree creation.
- Cleanup must not leave locked worktrees that break later local runs.

Validation:

- Store resolved SHAs in the timing artifact.
- Compare the checked-out SHA in each worktree with the current `cp -R` path.
- Run at least PR, push, and workflow-dispatch shaped inputs before replacing
  the copy path.

This does not change test coverage or benchmark semantics. It is mainly a
setup hygiene improvement.

### 9. Deduplicate and cache immutable `wp-env` downloads, not environments

`wp-env` uses `~/.wp-env` by default, but the actual work directory is keyed by
an md5 of the `.wp-env.json` path. The performance runner generates a separate
`.wp-env.json` under each branch environment, so identical external sources can
land under separate cache directories.

The runner also writes identical theme mappings for every branch:

- `twentytwentyone.1.7.zip`
- `twentytwentythree.1.0.zip`

Depending on `--wp-version`, it may also use the same WordPress zip URL for
every branch. Without `--wp-version`, each branch environment can clone
`WordPress/WordPress` under its own env-specific cache directory.

Potential fix:

- Add a run-level immutable source cache keyed by source URL/ref.
- Pre-resolve shared zip and git sources once.
- Write local paths into each branch `.wp-env.json`, or improve `wp-env` so
  downloads are globally cached by URL/ref while mutable environment state
  remains keyed by config path.
- Add GitHub Actions caching only for immutable downloaded sources, not for
  databases, containers, generated `docker-compose.yml`, or per-branch work
  directories.

Expected impact:

- Potentially meaningful on cold runs because WordPress and theme downloads are
  performed before measured suites can run.
- Smaller on warm local runs and on repeated starts of the same branch, because
  `wp-env` already reuses files within a single env-specific work directory.
- This needs telemetry around the first `wp-env start` for each branch before
  ranking it against build/install work.

Correctness risks:

- Caching all of `~/.wp-env` is unsafe because it can preserve mutable
  environment state.
- Sharing a prepared WordPress database or container state across branches would
  bias measurements and create isolation bugs.
- WordPress trunk refs and theme zip URLs need exact cache keys.

Validation:

- Time download/extract separately from container start and WordPress install.
- Assert that only immutable source directories are reused.
- Keep branch work directories and databases separate.
- Add a diagnostic listing of reused source cache keys to the workflow summary.

This is worth investigating because it targets repeated setup work while
preserving the key isolation property: each branch still gets its own WordPress
environment.

### 10. Split setup/build artifacts from suite execution

The current runner executes every suite serially in one job. A tempting fix is
to shard suites immediately, but naive sharding repeats all installs and builds
in every shard and makes the workflow more expensive without necessarily
reducing wall-clock time enough.

A safer topology change would be:

1. Run one setup job that fetches refs, installs dependencies, builds the
   test-runner checkout, and builds every branch plugin checkout.
2. Upload the built test-runner and plugin checkouts as artifacts.
3. Run a matrix where each job owns one performance suite.
4. Inside each suite job, compare all branches for that suite on the same
   runner, preserving close-in-time branch comparison.
5. Aggregate raw and curated result files in a final job.

Expected impact:

- Potentially large wall-clock reduction if suite runtime and repeated
  `wp-env` start/stop dominate after build improvements.
- Total runner minutes may increase because multiple Ubuntu runners are active
  at once.
- Artifact upload/download time can erase the win if built checkouts are too
  large.

Correctness risks:

- Artifacted builds must be byte-for-byte equivalent to local built checkouts.
- Each matrix job must still compare branches for the same suite under the same
  test code.
- Result aggregation must preserve existing raw and curated result file names
  and CodeVitals publishing behavior.
- The matrix must not reduce sample counts or skip suites.

Validation:

- Implement only after phase timing shows suite runtime dominates setup time.
- Start with one opt-in workflow-dispatch path.
- Compare artifacts and result files against the serial runner.
- Keep branch comparison inside each suite job; do not run current and base on
  separate runners for the same suite.

This is the highest-upside structural change, but it should come after the
single-run cleanup patches because it is harder to review and easier to get
wrong.

### 11. Use a thinner performance launcher

The workflow runs `.github/setup-node` before invoking `./bin/plugin/cli.js
perf`. That composite action can restore or install root dependencies, and on a
cache hit it still runs root and workspace postinstall scripts. The plugin CLI
also eagerly imports release package and changelog commands before it registers
the `perf` subcommand.

Potential fix:

- Lazy-load plugin CLI command modules so `perf` does not import release tooling.
- Consider a dedicated performance launcher with only the dependencies needed
  to fetch refs and start the temporary performance runner.
- If the launcher becomes dependency-light enough, replace the outer
  `.github/setup-node` step in this workflow with a narrower setup path.

Expected impact:

- Small on warm runs. In one sampled run, the outer setup step was tens of
  seconds while the compare step was tens of minutes.
- Larger on root `node_modules` cache misses.
- Mostly valuable because it removes duplicated setup before the runner creates
  and installs its own temporary checkouts.

Correctness risks:

- This must not break existing plugin CLI commands or aliases.
- The performance launcher still needs stable logging, artifact paths, and
  error handling.
- A custom launcher must not silently diverge from the current `perf` command.

Validation:

- Keep `./bin/plugin/cli.js perf` working.
- Add a focused test or smoke command for lazy command registration.
- Compare workflow environment variables and artifact paths before and after.

This is a cleanup and setup-speed patch, not a benchmark-speed patch. It should
not be prioritized ahead of build and install deduplication.

### 12. Be careful with spec-level shortcuts

The specs contain obvious-looking waits and sample counts:

- editor and site-editor specs use `BROWSER_IDLE_WAIT = 1000`,
- editor and site-editor loops collect ten samples plus throwaway iterations,
- front-end theme specs collect sixteen samples plus a throwaway iteration,
- media processing collects seven samples plus a throwaway iteration.

Reducing these would speed up CI, but it would also change the statistical
shape of the benchmark. The fixed waits are part of the measured interaction
model, and the sample counts are part of how noisy browser and WordPress
measurements are made interpretable.

Recommendation:

- Do not reduce sample counts or fixed waits as a CI speedup.
- Only revisit them with a separate benchmark-methodology change backed by
  variance data, false-positive/false-negative analysis, and CodeVitals impact.
- Prefer setup/build/download improvements first because they do not change the
  thing being measured.

### Updated priority after deeper analysis

After this pass, the best order is:

1. Add phase timing telemetry.
2. Use `npm run build -- --skip-types`.
3. Remove the duplicate current-ref build.
4. Deduplicate `npm ci` work when dependency keys match.
5. Skip repeated `nvm install` when `.nvmrc` matches.
6. Add Playwright browser caching.
7. Deduplicate immutable `wp-env` downloads.
8. Switch source copies to Git worktrees if setup timing justifies it.
9. Consider setup/build artifact fan-out only after serial runner timing shows
   suite runtime dominates.
10. Keep docs-only filtering as a separate policy change.

The main principle is unchanged: remove duplicated CI setup work first, and do
not make the benchmark cheaper by measuring less.
