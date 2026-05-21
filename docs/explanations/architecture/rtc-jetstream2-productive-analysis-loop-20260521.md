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

- updated: 2026-05-21T23:13:10Z
- session: rtc-productive-analysis-loop
- active lane jobs: 0
- actions: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv
- critical feedback: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.md

## Controller Feed
- current action rows: 23
- high-priority controller rows: 19
# RTC Productive Analysis Loop

- updated: 2026-05-21T23:13:10Z
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
generated_at          action_id                                                       target_loop    priority  action_kind                                     family_or_pr                                                                evidence_path                                                                                                                                                                      next_action                                                                                                                                                                                                                                                                                                                                                                                                                                                                       control_path
2026-05-21T22:25:36Z  benchmark-canary-critical-exact-stack-gate                      critical-path  P0        promotion-blocker-tighten                       benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv                                                                                         Tighten benchmark-canary-fuzzer-gap from generic coverage repair to exact-stack closure for commit 14767c60a7ef5295366fd8a1f31a64d610acdf80: require fresh passing title-reload-http and existing-post-crdt-http evidence before coverage-confidence or snapshot-publication can unblock.                                                                                                                                                                                         /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T22:25:36Z  benchmark-canary-focused-http-replay                            deferred       P0        exact-stack-focused-replay                      benchmark-canary-focused-http                                               /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv                                                                   Execute the current exact-stack next_command rows for focused/title-reload-http and focused/persistence-reload-http on rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text at 14767c60a7ef5295366fd8a1f31a64d610acdf80; keep deferred and all-merged promotion blocked until both focused-shards summaries are green on that commit.                                                                                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv
2026-05-21T22:25:03Z  dfr-20260521T222503Z-family-budget-exact-gate                   deferred       P0        family-budget-hard-gate                         reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption  /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T222307Z/context.md                                                                                   Block generic interval relaunches for over-budget deferred families unless there is a new product fix head, focused owner evidence, explicit downscope, or exact-stack title-reload-http and existing-post-crdt-http promotion evidence.                                                                                                                                                                                                                                          /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
2026-05-21T22:25:03Z  dfr-20260521T222503Z-operator-regression-exact-gates            coverage       P0        convert-deferred-family-to-exact-coverage-gate  operator-correctness-regression                                             /media/volume/danluu-fuzz-data/rtc-operator-alerts/rtc-correctness-regression-alert-20260519.md                                                                                    Replace broad operator-correctness-regression re-analysis with exact coverage gates for large-post-three-user-http final saved-content union and list-item-move-refresh-http ordering, treating base-pass candidate-fail as a promotion blocker.                                                                                                                                                                                                                                  /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
2026-05-21T22:26:30Z  lower-http-polling-canary-oracle-retarget                       lower-level    P0        retarget-oracle                                 benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/runs/coverage-guided-lower-level-20260521T221909389020972Z/status.tsv                 Retarget one lower-level HTTP lane from generic polling-manager semantic exploration to a canary-derived oracle/seed bridge for title-reload-http and existing-post-crdt-http: seed from the exact-stack canary rows and assert synced title/body plus nonempty persisted CRDT state after reload.                                                                                                                                                                                /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json
2026-05-21T22:26:30Z  canary-equivalent-success-accounting                            coverage       P0        accounting-gate                                 benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T221043Z/novelty-status.md                                                                                 Do not count lower-level semantic-feature churn or current-run canary-forced group presence as progress for benchmark-canary-fuzzer-gap; require successful canary-equivalent rows for title-reload-http, existing-post-crdt-http, and large-http-lifecycle before clearing the blocker.                                                                                                                                                                                          /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv
2026-05-21T22:25:34Z  pr07c-consume-owner-evidence                                    pr-progress    P0        ownership-reconcile                             PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/replay-runs.tsv                 Consume Cycle380 PR07C owner replay as current owner evidence and change launch-owner-matrix from yes to no until a newer product-owned owner replay exists; keep ready/rtc-pr07c-reload-record-snapshots held and prevent another critical-path browser-e2e owner-matrix launch.                                                                                                                                                                                                 /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv
2026-05-21T22:25:34Z  reload-hydration-exact-stack-gate                               deferred       P0        exact-stack-promotion-gate                      reload-hydration                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-benchmark-minimum-block.tsv                                                                   Stop generic reload-hydration interval relaunches while launch_budget is exceeded; only promote or keep active a candidate that runs title-reload-http and existing-post-crdt-http green on the exact all-merged stack and keeps large-http-lifecycle in the benchmark minimum, otherwise downscope the family and leave benchmark-canary-fuzzer-gap blocking finalization.                                                                                                       /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv
2026-05-21T22:46:02Z  btfc-20260521-001                                               critical-path  P0        consume-coverage-repair                         benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260521T222259Z/continuations/benchmark-canary-fuzzer-gap/classification.tsv                           Consume the 20260521T222259Z benchmark-canary-fuzzer-gap classification and coverage-change artifacts; move the blocker from runnable fuzzer-feedback to coverage_repaired while keeping coverage-confidence and snapshot-publication blocked until fresh exact-stack title-reload-http and existing-post-crdt-http pass evidence exists.                                                                                                                                         /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/benchmark-canary-fuzzer-gap
2026-05-21T22:46:02Z  btfc-20260521-002                                               coverage       P0        force-canary-equivalent-lanes                   benchmark-canary-equivalent-http                                            /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260521T222259Z/continuations/benchmark-canary-fuzzer-gap/coverage-change.tsv                          Adopt title-reload-http existing-post-crdt-http and large-http-lifecycle as forced P0 promotion-blocking coverage; do not let zero-coverage rotation or duplicate product-evidence pause accounting disable these lanes before exact-stack green evidence and a retained large HTTP lifecycle rerun.                                                                                                                                                                              /media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo/bin/rtc-browser-fuzz-novelty-monitor.mjs
2026-05-21T22:43:08Z  dfr-20260521T224308Z-001                                        critical-path  P0        exact-blocker                                   reload-hydration                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260521T212458Z/reload-hydration/reload-hydration.report.md                                            Convert reload-hydration from a generic deferred-family candidate into an exact promotion blocker: require a candidate head plus exact-stack title-reload-http green, exact-stack existing-post-crdt-http green, and retained large-http-lifecycle coverage before publication or snapshot unblock; reject push-manifest or active-blocker progress that lacks those artifacts.                                                                                                   /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T22:43:08Z  dfr-20260521T224308Z-002                                        deferred       P0        update-controller-rule                          reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption  /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T224308Z/context.md                                                                                   Add a deferred-family budget hard gate: stop generic interval relaunches for these over-budget families unless the next job is tied to a new product fix head, focused owner evidence, exact-stack green promotion evidence, or explicit downscope classification; keep at most one artifact-complete active job per family.                                                                                                                                                      /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/rtc-deferred-work-promotion-loop.sh
2026-05-21T22:46:49Z  lower-http-polling-canary-oracle-retarget                       lower-level    P0        retarget-oracle                                 lower-http-polling/title-reload-existing-post-crdt                          /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T224308Z/context.md                                                                                   Retarget one active lower-level HTTP polling lane from generic cursor/payload mutation to canary-derived title/body reload plus persisted-CRDT reload oracles: seed two save checkpoints, HTTP reload after peer convergence, and assertions that newer title/body/CRDT markers cannot be replayed after restore; keep the existing discovery lane running separately.                                                                                                            /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json
2026-05-21T22:46:49Z  lower-php-sync-storage-restore-state                            lower-level    P0        retarget-target                                 lower-http-polling/revision-restore-room-meta                               /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-20260521T195839Z/http-persistence-probe-gen-5-20260521T211802Z/.triage-watcher/state.json  Add or schedule one lower-level PHP protocol/storage fuzz profile that seeds wp_sync_update_data and wp_sync_awareness_state for postType/<post_type>:<post_id>, triggers wp_restore_post_revision, and asserts _crdt_document, sync update data, and awareness state cannot resurrect newer checkpoint content on the next HTTP sync.                                                                                                                                            /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/supervisor-groups.json
2026-05-21T22:48:49Z  pbr-20260521T224308Z-001                                        critical-path  P0        cancel-misqueued-owner-matrix                   PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv                                                                                   Remove job-pr07c-owner-matrix from the critical-path queue and keep PR07C/HOLD-07C held until newer conclusive product-owned owner evidence appears; current PR progress control decisions already reject launching a new heavy owner matrix from the consumed Cycle380 evidence.                                                                                                                                                                                                 /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T22:48:49Z  pbr-20260521T224308Z-002                                        critical-path  P0        consume-terminal-classification                 seed-5200005-reducer                                                        /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260521T223434Z/continuations/seed-5200005-reducer/classification.tsv                                  Consume the already_resolved_by_active_artifacts classification as terminal evidence and clear seed-5200005-reducer from runnable PR05 residual reducer blockers and queued reducer jobs unless fresh newer non-coverage evidence appears.                                                                                                                                                                                                                                        /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T23:05:24Z  bench-canary-exact-stack-focused-http-replay                    critical-path  P0        launch-coverage-gap-repair                      benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/context.md:731                                                                               Start or adopt one artifact-complete exact-stack replay for title-reload-http and existing-post-crdt-http on commit 14767c60a7ef5295366fd8a1f31a64d610acdf80; keep coverage-confidence and snapshot-publication blocked until both rows are green and reject zero-byte, setup-only, or semantic-feature-churn artifacts as closure                                                                                                                                                /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/queue.tsv
2026-05-21T23:05:24Z  bench-canary-equivalent-http-promotion-lanes                    coverage       P0        force-promotion-coverage                        benchmark-canary-equivalent-http                                            /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/context.md:682                                                                               Keep title-reload-http, existing-post-crdt-http, and large-http-lifecycle as P0 promotion-blocking coverage for all-merged candidates; materialize the missing current-run existing-post-crdt-http lane before any coverage pass can clear benchmark-canary-fuzzer-gap                                                                                                                                                                                                            /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T225940Z/supervisor-groups.json
2026-05-21T23:03:09Z  deferred-family-budget-hard-gate                                deferred       P0        update-controller-rule                          reload-hydration;pre-save-search-live-collapse;rich-text-suffix-corruption  /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-status.md                                                                                     Block new generic interval launches for these over-budget deferred families; allow only a new product fix head, owner evidence, exact-stack green promotion evidence, or explicit downscope artifact. Let current active jobs finish but do not count duplicate setup-only or duplicate-head runs as progress.                                                                                                                                                                    /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/rtc-deferred-work-promotion-loop.sh
2026-05-21T23:03:09Z  reload-hydration-exact-blocker                                  critical-path  P0        convert-to-exact-blocker                        reload-hydration                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260521T214507Z/reload-hydration/reload-hydration.report.md                                            Replace broad reload-hydration deferred promotion with exact blockers: require fresh green title-reload-http and existing-post-crdt-http on the exact candidate stack, while retaining large-http-lifecycle coverage, before adopting or publishing a reload-hydration branch.                                                                                                                                                                                                    /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T23:06:35Z  lower-http-polling-canary-oracle-retarget                       lower-level    P0        update-controller-rule                          lower-http-polling/canary-oracle-retarget                                   /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/context.md                                                                                   Retarget one active lower-level HTTP polling lane to canary-derived reload/persistence oracle coverage: keep the generic polling-manager corpus as reserve, but add or weight seeds and assertions for title/body convergence after HTTP reload, persisted CRDT meta materialization, and stale wp_sync_storage replay after revision restore; export semantic features so success accounting cannot satisfy title-reload-http or existing-post-crdt-http without those oracles.  /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json
2026-05-21T23:03:09Z  pr-blocker-router-20260521T230309Z-seed-5200005-clear-terminal  critical-path  P0        clear-stale-reducer-blocker                     seed-5200005-reducer                                                        /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260521T223434Z/continuations/seed-5200005-reducer/classification.tsv                                  Consume the latest already_resolved_by_active_artifacts classification as terminal evidence; remove seed-5200005-reducer from runnable blocker and queued reducer state; relaunch only for fresh newer non-coverage evidence.                                                                                                                                                                                                                                                     /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T23:03:09Z  pr-blocker-router-20260521T230309Z-pr07c-owner-evidence-route   critical-path  P0        consume-owner-evidence-not-matrix               PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/report.md                       Consume Cycle380 owner replay as current PR07C owner evidence; suppress job-pr07c-owner-matrix unless newer owner evidence appears; keep ready/rtc-pr07c-reload-record-snapshots held and route branch work to product-failure classification or exact replay, not browser readiness setup.                                                                                                                                                                                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/queue.tsv

## Recent Lane Reports

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget Report

Generated: 2026-05-21T23:06:35Z

## Decision

Emit one P0 lower-level retargeting action.

The active lower-level HTTP polling manager has a single in-process V8 coverage-guided lane targeting `packages/sync/src/providers/http-polling/test/polling-manager.coverage-fuzz.test.ts` with generic polling-manager scenario pressure and no failure keys in the current coverage state. That is useful discovery, but it is not accounting for the canary-derived product failures that currently block promotion.

The benchmark canary feedback in the run context shows exact-stack failures for `focused/title-reload-http` and `focused/persistence-reload-http`. Those failures should have been promotion-blocking through continuous fuzz coverage, but the lower-level lane is still aimed at polling mechanics rather than reload/persistence closure. This is a yield/accounting mismatch, not a need for broad re-analysis.

## Action Contract

The lower-level controller should retarget one HTTP polling lane, not the whole loop:

- keep the existing generic polling-manager corpus as reserve;
- add or heavily weight seeds for HTTP title/body edit, save, reload, persisted CRDT materialization, and revision restore stale-room replay;
- add explicit oracles/semantic features for post-reload title/body convergence and nonempty persisted CRDT meta;
- require those semantic features before lower-level success can count toward `title-reload-http` or `existing-post-crdt-http` closure.

Evidence paths used:

- `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/context.md`
- `/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json`
- `/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/runs/coverage-guided-lower-level-20260521T230452750130057Z/coverage/coverage-state.json`

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-21T23:05:24Z

Emitted 2 P0 actions.

The highest-leverage closure is the exact-stack replay for `rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text` at `14767c60a7ef5295366fd8a1f31a64d610acdf80`. The benchmark feedback says `focused/title-reload-http` and `focused/persistence-reload-http` are still failing on that stack, so the critical-path queue should start or adopt one artifact-complete repair lane and keep publication blocked until both equivalent fuzz lanes are green.

The second action is a coverage scheduler correction. The current coverage supervisor has materialized title reload and large-post lifecycle groups, while the benchmark feedback still requires `existing-post-crdt-http` as a P0 promotion-blocking equivalent lane. Clearing `benchmark-canary-fuzzer-gap` should require all three canary-equivalent lanes: `title-reload-http`, `existing-post-crdt-http`, and `large-http-lifecycle`.

No browser or e2e tests were run, and no repository files were edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/lanes/pr-blocker-router/report.md
# PR Blocker Router

Generated: 2026-05-21T23:03:09Z

Emitted two controller actions.

1. `seed-5200005-reducer` is still runnable/queued in the critical path, but the newest reducer classification is `already_resolved_by_active_artifacts`. The smallest useful action is for the critical-path controller to consume that classification as terminal and clear the stale blocker/queue entry.

2. `PR07C/HOLD-07C` is being held as an owner-matrix/browser-e2e queue item, but current evidence has moved past readiness. The browser environment is repaired, and Cycle380 owner replay produced owner evidence with replay failures and no readiness-failure matches. The smallest useful action is to consume that owner evidence and suppress duplicate owner-matrix relaunches unless newer owner evidence appears.

No benchmark-canary row was emitted here because the current critical-path and PR-progress decisions already align on exact-stack closure for `title-reload-http`, `existing-post-crdt-http`, and `large-http-lifecycle`; another router row would duplicate existing scheduling rather than correct ownership or blocker state.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T230309Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer Report

Generated: 2026-05-21T23:03:09Z

Emitted two controller actions.

1. `deferred-family-budget-hard-gate` targets the deferred promotion loop. The current deferred status shows repeated high-volume relaunches for `reload-hydration` (402), `pre-save-search-live-collapse` (313), and `rich-text-suffix-corruption` (267). Further generic interval launches are unlikely to change blocker state; the loop should only schedule these families when there is a new product fix head, owner evidence, exact-stack green promotion evidence, or an explicit downscope artifact.

2. `reload-hydration-exact-blocker` targets the critical path blocker ledger. The 20260521T214507Z reload-hydration report says a product candidate was committed but no push manifest was written because exact reload/persistence HTTP rows are still required. This should be handled as exact blockers (`title-reload-http`, `existing-post-crdt-http`, with retained `large-http-lifecycle` coverage), not as more broad deferred-family analysis.

No browser or e2e tests were run. No repository files were edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T224308Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

Generated: 2026-05-21T22:48:49Z

Emitted two critical-path actions.

## Routed Actions

1. `PR07C/HOLD-07C`: critical-path still has `job-pr07c-owner-matrix` queued, but PR progress current control decisions say `launch-owner-matrix PR07C/HOLD-07C` is not allowed because Cycle380 owner replay evidence has already been consumed. Smallest useful controller action is to remove the queued heavy browser matrix and keep PR07C held until newer conclusive product-owned evidence appears.

2. `seed-5200005-reducer`: critical-path still lists this PR05 residual reducer as runnable/queued, but the fresh 2026-05-21T22:34:34Z continuation classifies it as `already_resolved_by_active_artifacts`. Smallest useful controller action is to consume that classification as terminal evidence and filter the queued reducer row.

## Non-Actions

Benchmark-canary and deferred-family blockers already have lane-owned action rows in this productive-analysis run, so this router did not duplicate those rows. No browser or e2e tests were run.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T224308Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget

Generated: 2026-05-21T22:46:49Z

## Actions

Emitted 2 P0 lower-level retargeting actions.

1. `lower-http-polling-canary-oracle-retarget` retargets one active lower-level HTTP polling lane from generic polling-manager cursor/payload churn to canary-derived reload oracles. Evidence: the context's benchmark canary feedback says `focused/title-reload-http` and `focused/persistence-reload-http` failed on exact stack `14767c60a7ef5295366fd8a1f31a64d610acdf80`, while the active lower-level polling-manager run is producing zero crash exits and zero new V8 coverage in `status.tsv`.

2. `lower-php-sync-storage-restore-state` targets the missing component boundary. The current TypeScript lower-level manager cannot observe WordPress post meta state, but the product mechanism in the reload-hydration report is HTTP room data surviving restore in `wp_sync_update_data` and `wp_sync_awareness_state` while only `_crdt_document` is cleared. The existing PHP protocol fuzz target already dispatches the real HTTP sync endpoint and durable storage, so the smallest useful retarget is a focused restore-room-state profile/seed there.

## Why Not More

I did not add rows for broad deferred relaunches, browser/e2e replay, or benchmark reruns. Those are already represented by the critical-path and PR-progress controllers. This lane's leverage is to fix the lower-level yield mismatch: current lower-level fuzzing is spending cycles on reachable polling-manager mechanics while the active promotion blockers require title/body reload and persisted room-state rollback oracles.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T224308Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-21T22:46:02Z

Wrote two controller actions.

The high-leverage closure is to consume the completed `benchmark-canary-fuzzer-gap` continuation rather than relaunch another analyzer. Its artifacts classify the scheduler repair as applied and show the benchmark-equivalent lanes running in `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T222330Z/supervisor-state.json`.

The promotion gate must remain closed: the latest all-merged stack at `14767c60a7ef5295366fd8a1f31a64d610acdf80` still lacks fresh exact-stack passing evidence for `focused/title-reload-http` and `focused/persistence-reload-http`, and the known-bad large HTTP canary still requires retained large-document HTTP lifecycle coverage.

No product branch publication action is emitted from this lane. No browser or e2e tests were run.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T224308Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer Report

Generated: 2026-05-21T22:43:08Z

Input was bounded to the provided context and existing controller paths. I emitted two controller actions.

## Actions

1. `reload-hydration` should stop being treated as a generic deferred-family activity signal. The latest deferred report says a product candidate exists, but no push manifest was written because exact canary-equivalent HTTP rows are still missing. The critical-path blocker should require exact-stack `title-reload-http`, exact-stack `existing-post-crdt-http`, and retained `large-http-lifecycle` coverage before publication or snapshot unblock.

2. The deferred loop is repeatedly relaunching the same high-count families: `reload-hydration` has 402 launches, `pre-save-search-live-collapse` has 312, and `rich-text-suffix-corruption` has 266. These should be budget-gated so relaunches require a new product fix head, focused owner evidence, exact-stack green promotion evidence, or explicit downscope classification.

## Non-Actions

I did not emit rows for `malformed-save-payload` or `http-room-isolation`. The context already has lower-priority cooldown decisions for those raw deferred heads, and the two emitted rows cover the larger scheduling waste and publication blocker risk.

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
```

## Notes

The loop currently runs targeted lanes for PR blocker routing,
benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing
yield retargeting. A lane that only writes commentary should not be added here;
new lanes should emit action rows with an explicit controller path.
