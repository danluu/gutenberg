# RTC Benchmark Handoff For A Quieter Machine

This handoff describes how to benchmark the current RTC maintainer snapshot
against the trunk/base it was built from on a less busy host. It is intentionally
separate from the Jetstream2 run because that machine is running many fuzzing and
analysis jobs, which makes wall-clock performance noisy.

## Target Refs

Benchmark exactly these refs from `danluu/gutenberg`:

- Base: `rtc-pr-stack-20260519T161502Z-base`
  - Commit: `c173c18fbcd60eac93612f7f3d9550ca4975db8d`
  - URL: https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-base
- Proposed all-merged stack: `rtc-pr-stack-20260519T161502Z-all-ready-merged`
  - Commit: `eae83fa6f594083c07bce4599a2a725704700e9b`
  - URL: https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-all-ready-merged

Do not compare against a moving trunk branch. Use the fixed base ref above.

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
maintainer-facing performance answer. A busy host can validate harness behavior,
but it should not be used for final timing claims.

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

Install dependencies in a way that does not become part of measured timing:

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
base. This is especially important for the new workflow benchmarks below: copy
the benchmark spec and reporter-key changes into both worktrees or run them only
after both refs contain the same benchmark harness.

### Lower-Level Coverage

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

### RTC E2E Components

WebSocket RTC:

```sh
npm run test:e2e:rtc-websocket -- \
  test/e2e/specs/editor/collaboration/collaboration-code-editor-performance.spec.ts \
  --workers=1
```

HTTP polling RTC:

```sh
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-sync-body-size.spec.ts \
  --workers=1
```

If adding a custom RTC e2e benchmark, prefer measuring:

- editor open to collaboration-ready
- second user join to mutual awareness
- propagation latency for UI edits in a large post
- save latency
- reload consistency
- `/wp-sync/v1/updates` request count and body sizes
- browser long tasks

### Post Editor Workflow Benchmarks

The local benchmark suite now includes a first batch of realistic post-editor
workflow metrics in `test/performance/specs/post-editor.spec.js`, with curated
reporter keys in `test/performance/config/performance-reporter.ts`.

These are action-to-ready measurements using `performance.now()`. They should
not stop at raw browser `EventDispatch`; each one waits for visible or store
readiness that maps to a user being able to continue.

| Metric key | Workflow | Completion predicate |
| --- | --- | --- |
| `workflowWriteSave` | Create a post, load the large post fixture, append an empty paragraph, type sentinel text, and save. | Sentinel text is visible and the draft save completes through the existing `Saved` wait. |
| `workflowInserterInsert` | Open the block inserter, search for Heading, insert it, close the inserter, type sentinel heading text. | Sentinel text is visible and `core/block-editor` reports selected block `core/heading`. |
| `workflowPatternInsert` | Register a deterministic local pattern, open Patterns, choose the Test category, insert the pattern. | The pattern's sentinel body text is visible in the canvas. |
| `workflowUndoLargeChange` | In a large saved draft, insert a multi-block group and press primary undo. | Sentinel content from the inserted group is hidden. |
| `workflowRedoLargeChange` | Redo the same multi-block group insertion. | Sentinel content from the inserted group is visible again. |
| `workflowListViewSelect` | Open Document Overview/List View on nested content and select a Paragraph row. | The List View row is selected and `core/block-editor` reports selected block `core/paragraph`. |

Configuration knobs:

- `POST_EDITOR_WORKFLOW_SAMPLES`, default `5`
- `POST_EDITOR_WORKFLOW_THROWAWAY`, default `1`
- `POST_EDITOR_WORKFLOW_TYPING_DELAY_MS`, default `0`

The persona-loop consensus was to land this post-editor workflow batch first
because it covers low-flake, real workflows: save after edit, inserter
insertion, pattern insertion, history undo/redo, and List View selection.

Deferred workflow candidates:

- `typeVisualLatency`
- Site Editor template/page open to editable canvas
- DataViews/Site Pages search at 50-100 deterministic pages
- Global Styles variation apply with computed-style/CSS-variable readiness
- Query Loop updates, Navigation link editing, block move/transform,
  paste-large-HTML, and scroll-jank

Rejected as default benchmark additions:

- hover-only benchmarks
- open/close-only benchmarks
- click-to-`EventDispatch` timings
- fixed-sleep timings
- native `contenteditable` baselines as product metrics
- direct `wp.data.dispatch`, `resetBlocks`, parse, or serialize-only
  microbenchmarks as primary workflow metrics
- remote directory/media workflows
- screenshot/pixel tracing or CPU/CDP intervention modes
- huge 10k-flat-block stress fixtures as default CI coverage

## Local Workflow Smoke Validation

The workflow benchmark subset was smoke-validated locally after installing
dependencies, building with `npm run build -- --skip-types`, installing wp-env's
WordPress site, activating Gutenberg, and ensuring the performance global setup
could proceed.

Command:

```sh
WP_BASE_URL=http://localhost:8888 \
POST_EDITOR_WORKFLOW_SAMPLES=1 \
POST_EDITOR_WORKFLOW_THROWAWAY=0 \
PERFORMANCE_BROWSER_IDLE_WAIT_MS=0 \
PERFORMANCE_MEASUREMENT_IDLE_WAIT_MS=0 \
npm run test:performance -- specs/post-editor.spec.js -g "Workflow:" --project=chromium
```

Result:

```text
6 passed (22.3s)
workflowWriteSave        1222.61 ms
workflowInserterInsert   1025.84 ms
workflowPatternInsert     412.15 ms
workflowListViewSelect    263.79 ms
workflowUndoLargeChange  3929.35 ms
workflowRedoLargeChange  2002.37 ms
```

These one-sample values are only a harness smoke check. They are not a
maintainer-facing base-vs-merged performance result.

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

Pass only the name as the persona label and ask each run to evaluate the
proposed benchmark design for validity, noise, missing RTC surfaces, and
maintainer usefulness.

For the post-editor workflow benchmark expansion, the local persona-loop output
lives at:

```text
test/performance/reports/real-user-workflow-benchmark-persona-loop-20260519/
```

It contains three rounds:

- round 1: independent benchmark proposals
- round 2: cross-review of all round-1 proposals
- round 3: final review of the implemented benchmark set

After the first complete benchmark result, run the same persona set again
against the actual report. Ask for:

- invalid rows or harness mistakes
- likely true regressions
- cases that need rerun due to noise
- missing realistic e2e coverage
- benchmark changes before publishing a maintainer-facing result

Then synthesize the reports and rerun only if the synthesis finds a concrete
benchmark flaw.

## Known Pitfalls

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
- If base has expected failing tests because the stack fixes the bug, label
  those as correctness differences. Do not hide them as performance failures.
- For workflow benchmarks, keep setup outside the timed interval unless the
  setup is the workflow being measured. Pattern registration, post creation,
  dependency install, build, and wp-env startup should not be hidden inside a
  metric.
- Do not conflate insertion latency with save latency. `workflowInserterInsert`
  and `workflowPatternInsert` stop at insertion readiness; `workflowWriteSave`
  covers the save path.

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
