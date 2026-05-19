# RTC Benchmark Handoff For A Quieter Machine

This handoff describes how to benchmark the current RTC maintainer snapshot against
the trunk/base it was built from on a less busy host. It is intentionally separate
from the Jetstream2 run because that machine is running many fuzzing and analysis
jobs, which makes wall-clock performance noisy.

## Target Refs

Benchmark exactly these refs from `danluu/gutenberg`:

- Base: `rtc-pr-stack-20260519T161502Z-base`
  - Commit: `c173c18fbcd60eac93612f7f3d9550ca4975db8d`
  - URL: https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-base
- Proposed all-merged stack: `rtc-pr-stack-20260519T161502Z-all-ready-merged`
  - Commit: `eae83fa6f594083c07bce4599a2a725704700e9b`
  - URL: https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-all-ready-merged

Do not compare against a moving trunk branch. Use the fixed base ref above.

## Current Jetstream Artifacts

The current Jetstream benchmark workspace is:

```sh
/media/volume/danluu-fuzz-data/rtc-benchmark-20260519
```

Useful files there:

- `run-benchmark.sh`: current runner.
- `summarize-benchmark.mjs`: report generator with base-vs-merged ratios.
- `launch-result-review.sh`: launches the result-review persona loop in tmux.
- `benchmark-plan.md`: design synthesis from the benchmark-design persona loop.
- `persona/design/current/*.report.md`: individual benchmark-design reports.

If the quieter machine can reach Jetstream, copy those files first:

```sh
rsync -av exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org:/media/volume/danluu-fuzz-data/rtc-benchmark-20260519/ \
  /data/rtc-benchmark-20260519/
```

If copying the full workspace is too large, copy only the four files above and
recreate the worktrees locally.

## Host Requirements

Use a host with:

- Enough CPU headroom to keep load average comfortably below logical core count.
- At least 64 GB RAM, preferably more.
- A large data volume for worktrees, wp-env homes, artifacts, and Docker data.
- Docker and Docker Compose working.
- Node 20.x. Jetstream used Node `20.19.0`.
- The Gutenberg repo dependency set installed once and shared or reused where
  possible.

Do not run the benchmark on a machine doing active fuzzing if the goal is a
maintainer-facing performance answer.

## Workspace Setup

Use a data volume, not the root disk:

```sh
ROOT=/data/rtc-benchmark-20260519
mkdir -p "$ROOT"
git clone git@github.com:danluu/gutenberg.git "$ROOT/repo"
cd "$ROOT/repo"
git fetch origin
git fetch origin \
  rtc-pr-stack-20260519T161502Z-base \
  rtc-pr-stack-20260519T161502Z-all-ready-merged

git worktree add "$ROOT/worktrees/base" \
  rtc-pr-stack-20260519T161502Z-base
git worktree add "$ROOT/worktrees/all-ready-merged" \
  rtc-pr-stack-20260519T161502Z-all-ready-merged
```

Install dependencies in a way that does not become part of measured timing. One
acceptable option:

```sh
cd "$ROOT/worktrees/base"
npm install
composer install

cd "$ROOT/worktrees/all-ready-merged"
npm install
composer install
```

If sharing `node_modules` between worktrees, record exactly how it was shared in
the result report.

## Build And Environment Rules

Do not include install, build, or wp-env startup in the measured timings.

Before timing browser tests, make both refs comparable:

```sh
for wt in "$ROOT/worktrees/base" "$ROOT/worktrees/all-ready-merged"; do
  cd "$wt"
  npm run build -- --skip-types
done
```

For e2e, use isolated wp-env homes and fixed ports per ref. Do not use or stop a
wp-env that belongs to fuzzing.

Important wp-env detail: `.wp-env.test.json` has `testsEnvironment: false`, so
the e2e base URL is `WP_ENV_PORT`, not `WP_ENV_TESTS_PORT`.

Example base env:

```sh
export WP_ENV_HOME="$ROOT/results/$RUN_ID/wp-env-home/base"
export WP_ENV_PORT=19089
export WP_ENV_TESTS_PORT=19090
export WP_BASE_URL=http://127.0.0.1:19089
export WP_ARTIFACTS_PATH="$ROOT/results/$RUN_ID/e2e-artifacts/base"
```

Example merged env:

```sh
export WP_ENV_HOME="$ROOT/results/$RUN_ID/wp-env-home/all-ready-merged"
export WP_ENV_PORT=19099
export WP_ENV_TESTS_PORT=19100
export WP_BASE_URL=http://127.0.0.1:19099
export WP_ARTIFACTS_PATH="$ROOT/results/$RUN_ID/e2e-artifacts/all-ready-merged"
```

Start wp-env before timing e2e:

```sh
npm run wp-env-test -- status
npm run wp-env-test -- start
```

## Benchmark Content

Use identical temporary benchmark files in both worktrees. The benchmark should
not compare tests that exist only on the proposed stack against missing tests on
base.

Lower-level coverage:

- CRDT merge cases:
  - `small_stale_suffix_append_50`
  - `large_stale_suffix_append_250`
  - `stale_top_level_delete_100`
  - `nested_group_move_with_remote_append`
  - `table_body_suffix_append_40_rows`
- HTML validation equivalence:
  - entity, whitespace, attribute order, boolean attribute, and self-closing tag
    equivalence cases that do not emit validation warnings.
- HTTP polling sync utilities:
  - base64 update encoding
  - take/restore queue behavior
  - compaction filtering
  - JSON payload generation across rooms
  - poll window rotation

Existing unit-suite smoke timing:

- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`
- `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`

Realistic e2e components:

- WebSocket RTC:

```sh
npm run test:e2e:rtc-websocket -- \
  test/e2e/specs/editor/collaboration/collaboration-code-editor-performance.spec.ts \
  --workers=1
```

- HTTP polling RTC:

```sh
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-sync-body-size.spec.ts \
  --workers=1
```

If adding a custom e2e benchmark, prefer measuring:

- editor open to collaboration-ready
- second user join to mutual awareness
- propagation latency for UI edits in a large post
- save latency
- reload consistency
- `/wp-sync/v1/updates` request count and body sizes
- browser long tasks

## Run Order

Preferred order on a quiet host:

```text
base lower-level
all-ready-merged lower-level
all-ready-merged lower-level
base lower-level
base e2e
all-ready-merged e2e
all-ready-merged e2e
base e2e
```

The ABBA order reduces drift from warm caches and ambient load. Keep Playwright
at `--workers=1` and Jest at `--runInBand`.

Record, at minimum:

- run id
- branch/ref
- commit SHA
- command
- exit code
- elapsed seconds
- user/system CPU seconds
- max RSS
- raw per-operation samples for microbenchmarks
- `/proc/loadavg`, CPU model, memory, disk free, Node/npm versions
- wp-env ports and `WP_ENV_HOME`

## Persona Loop

Before finalizing the benchmark, run the standard benchmark-design persona loop
in tmux at max parallelism:

```text
linus-torvalds
kyle-kingsbury
marc-brooker
dan-luu
tptacek
contrarian
```

Pass only the name as the persona label and ask each run to evaluate the proposed
benchmark design for validity, noise, missing RTC surfaces, and maintainer
usefulness.

After the first complete result, run the same set again against the actual
report. Ask for:

- invalid rows or harness mistakes
- likely true regressions
- cases that need rerun due to noise
- missing realistic e2e coverage
- benchmark changes before publishing a maintainer-facing result

Then synthesize the reports and rerun only if the synthesis finds a concrete
benchmark flaw.

## Known Pitfalls From Jetstream

- Do not set `WP_BASE_URL` to `WP_ENV_TESTS_PORT` for `.wp-env.test.json`.
  That config disables the separate tests environment.
- Do not time e2e before wp-env is started. Startup and WordPress clone/build
  behavior can dominate the result.
- Do not let a Playwright config be passed twice. Use
  `npm run test:e2e:rtc-websocket -- <spec>` for WebSocket RTC.
- Avoid HTML equivalence examples that intentionally warn; Jest console checks
  will fail the benchmark even if timing data was collected.
- Do not run the benchmark while load average is above the logical core count if
  the result is meant to answer performance. A busy host can still be useful for
  harness validation, not for final numbers.
- If base has expected failing tests because the stack fixes the bug, label those
  as correctness differences. Do not hide them as performance failures.

## Expected Output

Produce a final directory with:

- `summary.tsv`
- raw JSONL microbenchmark samples
- e2e logs and Playwright artifacts
- resource snapshots
- `report.md` with base-vs-merged ratios
- persona result-review reports
- final synthesis describing validity, regressions, improvements, and caveats

The final maintainer-facing result should separate:

- correctness failures
- pure timing changes
- CI-cost changes from added tests
- invalid/noisy rows that require rerun

