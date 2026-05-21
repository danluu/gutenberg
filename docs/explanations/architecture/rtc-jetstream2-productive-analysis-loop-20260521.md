# RTC Jetstream2 Productive Analysis Loop

This is the running report for the Jetstream2 productive-analysis loop. It is
refreshed from Jetstream by `rtc-productive-analysis-report-publisher`.

Script branch:
[`try/jetstream-fuzz`](https://github.com/danluu/gutenberg/tree/try/jetstream-fuzz)

## Control Contract

The productive-analysis loop emits machine-readable action rows. Those rows are
fed into control loops that can change scheduling, blocker state, branch work,
or fuzzing coverage:

- critical-path executor: consumes `critical-path-feedback.tsv` and creates
  `productive-analysis-action` blockers/jobs for high-priority rows;
- PR-progress controller: reads `current-actions.tsv` in its decision context;
- deferred-work promotion: reads the same feed per family;
- fuzz-level mix controller: reads the feed for coverage/lower-level/mix
  changes;
- structural watchdog: checks the loop status for freshness.

## Jetstream Paths

- loop base: `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521`
- status: `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-status.md`
- report: `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-report.md`
- actions: `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv`
- critical feedback: `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.tsv`

## Live Snapshot

```text
# Productive Analysis Loop Status

- updated: 2026-05-21T22:33:08Z
- session: rtc-productive-analysis-loop
- active lane jobs: 0
- actions: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv
- critical feedback: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.md

## Controller Feed
- current action rows: 8
- high-priority controller rows: 7
# RTC Productive Analysis Loop

- updated: 2026-05-21T22:33:08Z
- base: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521
- active lane jobs: 0
- cycle interval seconds: 600
- max active lanes: 4

## What This Loop Does

It runs targeted analysis lanes that look for work most likely to move the RTC project forward: PR blocker routing, benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing yield retargeting.

The loop is wired into controllers through:

- critical-path feedback: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.md
- critical-path feedback TSV: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.tsv
- all action rows: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv

## Current Actions
generated_at          action_id                                             target_loop    priority  action_kind                                     family_or_pr                                                                evidence_path                                                                                                                                                       next_action                                                                                                                                                                                                                                                                                                                                                                  control_path
2026-05-21T22:25:36Z  benchmark-canary-critical-exact-stack-gate            critical-path  P0        promotion-blocker-tighten                       benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv                                                                          Tighten benchmark-canary-fuzzer-gap from generic coverage repair to exact-stack closure for commit 14767c60a7ef5295366fd8a1f31a64d610acdf80: require fresh passing title-reload-http and existing-post-crdt-http evidence before coverage-confidence or snapshot-publication can unblock.                                                                                    /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T22:25:36Z  benchmark-canary-focused-http-replay                  deferred       P0        exact-stack-focused-replay                      benchmark-canary-focused-http                                               /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv                                                    Execute the current exact-stack next_command rows for focused/title-reload-http and focused/persistence-reload-http on rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text at 14767c60a7ef5295366fd8a1f31a64d610acdf80; keep deferred and all-merged promotion blocked until both focused-shards summaries are green on that commit.                       /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv
2026-05-21T22:25:03Z  dfr-20260521T222503Z-family-budget-exact-gate         deferred       P0        family-budget-hard-gate                         reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption  /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/context.md                                                                    Block generic interval relaunches for over-budget deferred families unless there is a new product fix head, focused owner evidence, explicit downscope, or exact-stack title-reload-http and existing-post-crdt-http promotion evidence.                                                                                                                                     /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
2026-05-21T22:25:03Z  dfr-20260521T222503Z-operator-regression-exact-gates  coverage       P0        convert-deferred-family-to-exact-coverage-gate  operator-correctness-regression                                             /media/volume/danluu-fuzz-data/rtc-operator-alerts/rtc-correctness-regression-alert-20260519.md                                                                     Replace broad operator-correctness-regression re-analysis with exact coverage gates for large-post-three-user-http final saved-content union and list-item-move-refresh-http ordering, treating base-pass candidate-fail as a promotion blocker.                                                                                                                             /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
2026-05-21T22:26:30Z  lower-http-polling-canary-oracle-retarget             lower-level    P0        retarget-oracle                                 benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/runs/coverage-guided-lower-level-20260521T221909389020972Z/status.tsv  Retarget one lower-level HTTP lane from generic polling-manager semantic exploration to a canary-derived oracle/seed bridge for title-reload-http and existing-post-crdt-http: seed from the exact-stack canary rows and assert synced title/body plus nonempty persisted CRDT state after reload.                                                                           /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json
2026-05-21T22:26:30Z  canary-equivalent-success-accounting                  coverage       P0        accounting-gate                                 benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T221043Z/novelty-status.md                                                                  Do not count lower-level semantic-feature churn or current-run canary-forced group presence as progress for benchmark-canary-fuzzer-gap; require successful canary-equivalent rows for title-reload-http, existing-post-crdt-http, and large-http-lifecycle before clearing the blocker.                                                                                     /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv
2026-05-21T22:25:34Z  pr07c-consume-owner-evidence                          pr-progress    P0        ownership-reconcile                             PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/replay-runs.tsv  Consume Cycle380 PR07C owner replay as current owner evidence and change launch-owner-matrix from yes to no until a newer product-owned owner replay exists; keep ready/rtc-pr07c-reload-record-snapshots held and prevent another critical-path browser-e2e owner-matrix launch.                                                                                            /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv
2026-05-21T22:25:34Z  reload-hydration-exact-stack-gate                     deferred       P0        exact-stack-promotion-gate                      reload-hydration                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv                                                    Stop generic reload-hydration interval relaunches while launch_budget is exceeded; only promote or keep active a candidate that runs title-reload-http and existing-post-crdt-http green on the exact all-merged stack and keeps large-http-lifecycle in the benchmark minimum, otherwise downscope the family and leave benchmark-canary-fuzzer-gap blocking finalization.  /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv

## Recent Lane Reports

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget Report

Generated: 2026-05-21T22:26:30Z

## Finding

The active lower-level HTTP polling manager lane is healthy but low-yield for the current blocker. Its current run has 20 completed attempts and 640 test executions with exit 0, no failures, and `new_coverage_keys=0` on every attempt; only semantic feature counts and corpus size are still moving. The target is an in-process mocked `polling-manager.coverage-fuzz.test.ts` diagnostic oracle, while the active product blocker is exact-stack browser behavior: `focused/title-reload-http` and `focused/persistence-reload-http` are failing, and `large-post-three-user-http` remains required canary coverage.

Current coverage scheduling has already forced related browser groups, but the novelty monitor shows only 9 current-run HTTP records and successful current-run records only for `persistence-no-title`. That is not enough to clear or materially reduce the benchmark-canary blocker.

## Actions

Emit a lower-level retarget action for one concrete lane: convert the current HTTP polling manager effort into a canary-derived oracle/seed bridge for `title-reload-http` and `existing-post-crdt-http`, with assertions on synced title/body and nonempty persisted CRDT state after reload.

Emit a coverage accounting action: semantic-feature churn or mere presence of canary-forced groups must not count as progress against `benchmark-canary-fuzzer-gap`; only successful canary-equivalent rows should clear that blocker.

No repository files were edited and no browser or e2e tests were run.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-21T22:25:36Z

The current benchmark canary feedback is actionable. The latest all-merged stack, `rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text` at `14767c60a7ef5295366fd8a1f31a64d610acdf80`, failed two current expanded coverage rows:

- `focused/title-reload-http`, exit code `1`
- `focused/persistence-reload-http`, exit code `1`

These are not external maintainer gates. They are promotion-loop misses for behaviors that already have equivalent fuzz lanes, so closure should be exact-stack focused replay plus a tightened critical-path blocker.

I emitted two P0 rows:

- `benchmark-canary-critical-exact-stack-gate` tells the critical-path blocker to require passing exact-stack `title-reload-http` and `existing-post-crdt-http` evidence before coverage confidence or snapshot publication can unblock.
- `benchmark-canary-focused-http-replay` points the deferred/focused controller at the current benchmark-minimum block file, which already contains the exact `next_command` rows for those two focused lanes.

I did not emit a separate row for historical `large-post-three-user-http`: it is already present in `current-deferred-benchmark-minimum-block.tsv`, and the coverage-guided loop has the large-post lifecycle forced groups enabled. A duplicate action would not change scheduling.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer Report

Generated: 2026-05-21T22:25:03Z

Emitted two controller actions.

1. `reload-hydration`, `pre-save-search-live-collapse`, and `rich-text-suffix-corruption` should not be relaunched as generic deferred families. The context shows repeated over-budget relaunching (`reload-hydration` 401 launches with 34 recent against max 8; `pre-save-search-live-collapse` 311 with 28 recent; `rich-text-suffix-corruption` 266 with 17 recent). The smallest useful control change is to require a new product fix head, focused owner evidence, explicit downscope, or exact-stack focused HTTP evidence before more launches.

2. `operator-correctness-regression` should be converted into exact coverage gates, not another broad deferred analysis family. The operator alert gives concrete base-pass/candidate-fail shapes: three-user large-post HTTP final-content convergence and two-user list-item move/refresh ordering. Those should become promotion-blocking coverage gates with final-state oracles.

No action row was emitted for `malformed-save-payload` or `http-room-isolation`: the provided context already marks them downscoped under canonical PR06B minimal and PR02A evidence, and there was no fresh product-owned evidence in the context that would justify re-promoting them.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

Generated: 2026-05-21T22:25:34Z

## Routed Actions

1. PR07C owner evidence is currently routed inconsistently. `current-control-decisions.tsv` allows `launch-owner-matrix`, while the progress table says the latest owner replay is already consumed and should not be relaunched without newer evidence. The Cycle380 replay has readiness pass, two replay failures, and no readiness failure matches, so the smallest branch-changing action is to make PR progress consume that evidence and stop requeueing another browser-e2e owner matrix.

2. `reload-hydration` is over budget with 401 launches and 34 recent launches against a max of 8, while benchmark feedback currently blocks promotion on exact-stack `title-reload-http`, `existing-post-crdt-http`, and large HTTP lifecycle evidence. The smallest branch-changing action is a deferred-loop gate: no generic interval relaunch; only product fix plus exact-stack green focused rows can keep the family alive for promotion.

## No Additional Rows

No separate coverage row was emitted because the active coverage scheduler already lists the benchmark canary forced groups, including title reload, existing-post CRDT metadata, persistence probe, and large-post lifecycle. No lower-level retarget row was emitted because the current yield snapshot has one actionable product-evidence signature and no visible likely-real lower-level backlog requiring an oracle or corpus retarget.
generated_at	action_id	target_loop	priority	action_kind	family_or_pr	evidence_path	next_action	control_path
2026-05-21T22:25:36Z	benchmark-canary-critical-exact-stack-gate	critical-path	P0	promotion-blocker-tighten	benchmark-canary-fuzzer-gap	/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv	Tighten benchmark-canary-fuzzer-gap from generic coverage repair to exact-stack closure for commit 14767c60a7ef5295366fd8a1f31a64d610acdf80: require fresh passing title-reload-http and existing-post-crdt-http evidence before coverage-confidence or snapshot-publication can unblock.	/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T22:25:36Z	benchmark-canary-focused-http-replay	deferred	P0	exact-stack-focused-replay	benchmark-canary-focused-http	/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv	Execute the current exact-stack next_command rows for focused/title-reload-http and focused/persistence-reload-http on rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text at 14767c60a7ef5295366fd8a1f31a64d610acdf80; keep deferred and all-merged promotion blocked until both focused-shards summaries are green on that commit.	/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv
2026-05-21T22:25:03Z	dfr-20260521T222503Z-family-budget-exact-gate	deferred	P0	family-budget-hard-gate	reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption	/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/context.md	Block generic interval relaunches for over-budget deferred families unless there is a new product fix head, focused owner evidence, explicit downscope, or exact-stack title-reload-http and existing-post-crdt-http promotion evidence.	/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
2026-05-21T22:25:03Z	dfr-20260521T222503Z-operator-regression-exact-gates	coverage	P0	convert-deferred-family-to-exact-coverage-gate	operator-correctness-regression	/media/volume/danluu-fuzz-data/rtc-operator-alerts/rtc-correctness-regression-alert-20260519.md	Replace broad operator-correctness-regression re-analysis with exact coverage gates for large-post-three-user-http final saved-content union and list-item-move-refresh-http ordering, treating base-pass candidate-fail as a promotion blocker.	/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
2026-05-21T22:26:30Z	lower-http-polling-canary-oracle-retarget	lower-level	P0	retarget-oracle	benchmark-canary-fuzzer-gap	/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/runs/coverage-guided-lower-level-20260521T221909389020972Z/status.tsv	Retarget one lower-level HTTP lane from generic polling-manager semantic exploration to a canary-derived oracle/seed bridge for title-reload-http and existing-post-crdt-http: seed from the exact-stack canary rows and assert synced title/body plus nonempty persisted CRDT state after reload.	/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json
2026-05-21T22:26:30Z	canary-equivalent-success-accounting	coverage	P0	accounting-gate	benchmark-canary-fuzzer-gap	/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T221043Z/novelty-status.md	Do not count lower-level semantic-feature churn or current-run canary-forced group presence as progress for benchmark-canary-fuzzer-gap; require successful canary-equivalent rows for title-reload-http, existing-post-crdt-http, and large-http-lifecycle before clearing the blocker.	/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv
2026-05-21T22:25:34Z	pr07c-consume-owner-evidence	pr-progress	P0	ownership-reconcile	PR07C/HOLD-07C	/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/replay-runs.tsv	Consume Cycle380 PR07C owner replay as current owner evidence and change launch-owner-matrix from yes to no until a newer product-owned owner replay exists; keep ready/rtc-pr07c-reload-record-snapshots held and prevent another critical-path browser-e2e owner-matrix launch.	/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv
2026-05-21T22:25:34Z	reload-hydration-exact-stack-gate	deferred	P0	exact-stack-promotion-gate	reload-hydration	/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv	Stop generic reload-hydration interval relaunches while launch_budget is exceeded; only promote or keep active a candidate that runs title-reload-http and existing-post-crdt-http green on the exact all-merged stack and keeps large-http-lifecycle in the benchmark minimum, otherwise downscope the family and leave benchmark-canary-fuzzer-gap blocking finalization.	/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
# Productive Analysis Feedback For Control Loops

- generated: 2026-05-21T22:33:08Z
- action source: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv
- contract: these rows are meant to be consumed by the critical-path, PR-progress, deferred, coverage, and level-mix controllers.

## High Priority Action Rows
generated_at          action_id                                             target_loop    priority  action_kind                                     family_or_pr                                                                evidence_path                                                                                                                                                       next_action                                                                                                                                                                                                                                                                                                                                                                  control_path
2026-05-21T22:25:36Z  benchmark-canary-critical-exact-stack-gate            critical-path  P0        promotion-blocker-tighten                       benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv                                                                          Tighten benchmark-canary-fuzzer-gap from generic coverage repair to exact-stack closure for commit 14767c60a7ef5295366fd8a1f31a64d610acdf80: require fresh passing title-reload-http and existing-post-crdt-http evidence before coverage-confidence or snapshot-publication can unblock.                                                                                    /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T22:25:36Z  benchmark-canary-focused-http-replay                  deferred       P0        exact-stack-focused-replay                      benchmark-canary-focused-http                                               /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv                                                    Execute the current exact-stack next_command rows for focused/title-reload-http and focused/persistence-reload-http on rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text at 14767c60a7ef5295366fd8a1f31a64d610acdf80; keep deferred and all-merged promotion blocked until both focused-shards summaries are green on that commit.                       /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv
2026-05-21T22:25:03Z  dfr-20260521T222503Z-family-budget-exact-gate         deferred       P0        family-budget-hard-gate                         reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption  /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/context.md                                                                    Block generic interval relaunches for over-budget deferred families unless there is a new product fix head, focused owner evidence, explicit downscope, or exact-stack title-reload-http and existing-post-crdt-http promotion evidence.                                                                                                                                     /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
2026-05-21T22:25:03Z  dfr-20260521T222503Z-operator-regression-exact-gates  coverage       P0        convert-deferred-family-to-exact-coverage-gate  operator-correctness-regression                                             /media/volume/danluu-fuzz-data/rtc-operator-alerts/rtc-correctness-regression-alert-20260519.md                                                                     Replace broad operator-correctness-regression re-analysis with exact coverage gates for large-post-three-user-http final saved-content union and list-item-move-refresh-http ordering, treating base-pass candidate-fail as a promotion blocker.                                                                                                                             /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
2026-05-21T22:26:30Z  canary-equivalent-success-accounting                  coverage       P0        accounting-gate                                 benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T221043Z/novelty-status.md                                                                  Do not count lower-level semantic-feature churn or current-run canary-forced group presence as progress for benchmark-canary-fuzzer-gap; require successful canary-equivalent rows for title-reload-http, existing-post-crdt-http, and large-http-lifecycle before clearing the blocker.                                                                                     /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv
2026-05-21T22:25:34Z  pr07c-consume-owner-evidence                          pr-progress    P0        ownership-reconcile                             PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/replay-runs.tsv  Consume Cycle380 PR07C owner replay as current owner evidence and change launch-owner-matrix from yes to no until a newer product-owned owner replay exists; keep ready/rtc-pr07c-reload-record-snapshots held and prevent another critical-path browser-e2e owner-matrix launch.                                                                                            /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv
2026-05-21T22:25:34Z  reload-hydration-exact-stack-gate                     deferred       P0        exact-stack-promotion-gate                      reload-hydration                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv                                                    Stop generic reload-hydration interval relaunches while launch_budget is exceeded; only promote or keep active a candidate that runs title-reload-http and existing-post-crdt-http green on the exact all-merged stack and keeps large-http-lifecycle in the benchmark minimum, otherwise downscope the family and leave benchmark-canary-fuzzer-gap blocking finalization.  /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
```

## Notes

The loop currently runs targeted lanes for PR blocker routing,
benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing
yield retargeting. A lane that only writes commentary should not be added here;
new lanes should emit action rows with an explicit controller path.
