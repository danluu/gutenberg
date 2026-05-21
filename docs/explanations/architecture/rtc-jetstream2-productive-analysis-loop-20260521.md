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

- updated: 2026-05-21T23:53:13Z
- session: rtc-productive-analysis-loop
- active lane jobs: 0
- actions: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv
- critical feedback: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.md

## Controller Feed
- current action rows: 39
- high-priority controller rows: 31
# RTC Productive Analysis Loop

- updated: 2026-05-21T23:53:13Z
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
2026-05-21T23:27:14Z  benchmark-canary-exact-stack-http-replay                        critical-path  P0        exact-stack-replay                              benchmark-canary-fuzzer-gap/14767c60a7ef5295366fd8a1f31a64d610acdf80        /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T232310Z/context.md                                                                                   Adopt or launch a bounded exact-stack replay on rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text at 14767c60a7ef5295366fd8a1f31a64d610acdf80 for title-reload-http and existing-post-crdt-http; keep benchmark-canary-fuzzer-gap blocking coverage-confidence and snapshot-publication until both rows produce fresh green exact-stack evidence.                                                                                                             /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T23:27:14Z  benchmark-canary-continuous-http-promotion-lanes                coverage       P0        promotion-coverage-hardening                    benchmark-canary-equivalent-http                                            /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T231312Z/supervisor-groups.json                                                                            Add existing-post-crdt-http to continuous P0 coverage alongside title-reload-http and large-http-lifecycle; require those lanes as promotion-blocking exact-stack evidence after reload-hydration, title/body reload, rich-text, saved-response, CRDT materialization, or all-merged stack changes, and keep large-post-three-user-http in the benchmark minimum until the large HTTP lane is fully equivalent.                                                                   /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
2026-05-21T23:23:10Z  reload-hydration-exact-stack-gate                               critical-path  P0        update-controller-rule                          reload-hydration/exact-stack-promotion-gate                                 /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260521T223947Z/reload-hydration/reload-hydration.report.md                                            Adopt deferred/rtc-reload-hydration-20260521T223947Z@fa801a6aa131f67087f333ffff9a547633b91c99 as the sole reload-hydration candidate; keep promotion blocked until a fresh exact stack including that head has title-reload-http and existing-post-crdt-http green evidence, with large-http-lifecycle retained in the benchmark minimum.                                                                                                                                         /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/rtc-critical-path-pr-executor-loop.sh
2026-05-21T23:23:10Z  deferred-family-budget-hard-gate                                deferred       P0        update-controller-rule                          overbudget-deferred-families                                                /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-status.md                                                                                     Enforce single-flight cooldown for reload-hydration, pre-save-search-live-collapse, and rich-text-suffix-corruption: do not interval-relaunch while an artifact-complete manifest exists; accept only a new product head, owner or replay evidence, exact green evidence, or explicit downscope.                                                                                                                                                                                  /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/deferred-work-promotion-loop.sh
2026-05-21T23:27:48Z  lower-table-query-array-remote-marker-quarantine                lower-level    high      retarget-accounting                             rtc-table-query-array-crdt                                                  /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/runs/unit-property-20260521T220305Z/status.tsv                                                                        Quarantine the current table-query-array-crdt seed churn after recording the remote-marker duplicate class: classify the 77 failures as one unresolved remote-marker-loss blocker, keep at most a bounded minimizer/reproducer lane, and retarget the main lower-level slot to already-approved canary/restore-state profiles until this blocker has a fix or oracle downscope.                                                                                                   /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/supervisor-groups.json
2026-05-21T23:27:48Z  table-query-array-remote-marker-pr-route                        pr-progress    high      create-fix-blocker                              ready/rtc-pr14b-table-query-array-local-suffix-append                       /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/runs/unit-property-20260521T220305Z/logs/unit-property-table-query-array-crdt-20260521T232306Z-seed-1592595164.log    Route one minimized reproducer from seed_start=1592595164 to PR progress as a PR14B follow-up or oracle-downscope decision: stale local table snapshots are dropping an acknowledged remote reorder-cell marker, and repeated lower-level rediscovery must not count as branch progress.                                                                                                                                                                                          /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/persona-runs/20260521T230831Z/control-decisions.tsv
2026-05-21T23:26:31Z  pr-blocker-router-pr07c-consume-owner-evidence                  critical-path  P0        consume-owner-evidence                          PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/report.md                       Consume the existing PR07C owner replay evidence, clear the queued duplicate browser-e2e owner-matrix job unless newer owner evidence exists, and classify PR07C as promote-or-hold from that artifact instead of relaunching the matrix.                                                                                                                                                                                                                                         /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T23:26:31Z  pr-blocker-router-lower-http-canary-retarget                    lower-level    P0        retarget-fuzz-lane                              benchmark-canary-fuzzer-gap                                                 /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T232310Z/context.md                                                                                   Retarget one lower-level lane from the current table-query-only unit-property profile to canary-equivalent HTTP reload coverage: title-reload-http plus existing-post-crdt-http exact-stack oracles, promotion-blocking on stack 14767c60a7ef5295366fd8a1f31a64d610acdf80.                                                                                                                                                                                                        /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/supervisor-groups.json
2026-05-21T23:45:42Z  btfc-20260521-focused-exact-stack                               coverage       P0        coverage-gap-repair                             title-reload-http+existing-post-crdt-http                                   /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/context.md                                                                                   Promote title-reload-http and existing-post-crdt-http to exact-stack P0 promotion-blocking lanes for commit 14767c60a7ef5295366fd8a1f31a64d610acdf80; schedule reruns after reload-hydration title/body reload rich-text saved-response or CRDT-persistence candidate changes and block all-merged finalization until both pass                                                                                                                                                   /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260521T233827Z/supervisor-groups.json
2026-05-21T23:45:42Z  btfc-20260521-large-http-gate                                   critical-path  P0        promotion-gate                                  large-http-lifecycle                                                        /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/context.md                                                                                   Keep large-post-three-user-http in the formal benchmark minimum and require exact-stack reruns for every all-merged snapshot candidate until large-http-lifecycle coverage is no longer partial and has passing promotion criteria                                                                                                                                                                                                                                                /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv
2026-05-21T23:43:11Z  deferred-reload-hydration-exact-blocker                         critical-path  P0        convert-to-exact-blocker                        reload-hydration                                                            /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260521T223947Z/reload-hydration/reload-hydration.report.md                                            Adopt deferred/rtc-reload-hydration-20260521T223947Z at fa801a6aa131f67087f333ffff9a547633b91c99 as the sole reload-hydration candidate; launch or adopt a fresh all-merged exact-stack validation including that head for title-reload-http and existing-post-crdt-http, keep large-http-lifecycle required, and keep publication blocked until those rows pass.                                                                                                                 /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/critical-path-pr-executor-loop.sh
2026-05-21T23:43:11Z  deferred-family-budget-hard-gate                                deferred       P0        update-controller-rule                          overbudget-and-downscoped-deferred-families                                 /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/context.md                                                                                   Enforce single-flight and manifest-hold gating: while reload-hydration, pre-save-search-live-collapse, or rich-text-suffix-corruption exceed the recent_43200s launch budget, and while malformed-save-payload or http-room-isolation are downscoped by canonical PR tracks, reject duplicate-head, setup-only, and interval-only launches; only schedule product-head exact replay, owner evidence, or explicit downscope work.                                                  /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/deferred-work-promotion-loop.sh
2026-05-21T23:46:23Z  llyr-001-table-query-array-oracle-bucket                        lower-level    high      oracle-dedupe-retarget                          unit-property-table-query-array-crdt                                        /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/runs/unit-property-20260521T220305Z/status.tsv                                                                        Pause or downweight the current table-query-array lower-level seed stream and launch a bounded reducer/classifier for the repeated RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE oracle family; resume broad fuzzing only after duplicate signatures are bucketed or a product-owned blocker is opened.                                                                                                                                                                                   /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/supervisor-groups.json
2026-05-21T23:46:23Z  llyr-002-http-polling-no-coverage-retarget                      lower-level    high      corpus-accounting-retarget                      coverage-guided-lower-level-http-polling-manager                            /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/runs/coverage-guided-lower-level-20260521T233838608696006Z/status.tsv                 Stop counting semantic corpus growth alone as productive for this group; retarget the seed corpus toward benchmark-canary HTTP lifecycle states title-reload-http existing-post-crdt-http and large-http-lifecycle or demote the group until it produces new coverage keys or actionable failures.                                                                                                                                                                                /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/supervisor-groups.json
2026-05-21T23:46:05Z  pbr-20260521T234311Z-pr07c-cancel-duplicate-owner-matrix        critical-path  P0        cancel-misqueued-owner-matrix                   PR07C/HOLD-07C                                                              /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv                                                                                   Remove job-pr07c-owner-matrix from critical-path queue state and keep PR07C/HOLD-07C held unless newer product-owner evidence appears; current PR progress decisions already consume Cycle380 owner evidence, reject another heavy browser owner matrix, and route useful work to exact replay or product-failure classification.                                                                                                                                                 /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/queue.tsv
2026-05-21T23:46:05Z  pbr-20260521T234311Z-seed-5200005-clear-terminal                critical-path  P0        clear-stale-reducer-blocker                     seed-5200005-reducer                                                        /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260521T232206Z/continuations/seed-5200005-reducer/classification.tsv                                  Consume the latest already_resolved_by_active_artifacts classification as terminal evidence; clear seed-5200005-reducer from runnable PR05 residual blocker and queued reducer job state unless fresh product-owned non-coverage evidence newer than this artifact appears.                                                                                                                                                                                                       /media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/blockers.tsv

## Recent Lane Reports

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget Report

Generated: 2026-05-21T23:46:23Z

Emitted two lower-level retargeting actions.

## Actions

1. `llyr-001-table-query-array-oracle-bucket`
   - Evidence: `/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/runs/unit-property-20260521T220305Z/status.tsv`
   - Current run has 108 rows, 100 failures, and `placement_case_count=0` for every row. Recent logs are dominated by `RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE` from `scenario-remote-reorder-*` / `path-direct-mergeCrdtBlocks` oracle checks, for example `/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/runs/unit-property-20260521T220305Z/logs/unit-property-table-query-array-crdt-20260521T234410Z-seed-1592595208.log`.
   - Control action: pause or downweight this broad lower-level stream and spend the slot on a bounded reducer/classifier for the repeated oracle family.

2. `llyr-002-http-polling-no-coverage-retarget`
   - Evidence: `/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/runs/coverage-guided-lower-level-20260521T233838608696006Z/status.tsv`
   - Current run has 25 successful batches with `new_coverage_keys=0` in every row and no actionable failures, while the same context reports benchmark-canary misses for `title-reload-http`, `existing-post-crdt-http`, and partial `large-http-lifecycle` coverage.
   - Control action: stop treating semantic corpus growth alone as productive for this group, and retarget seeds/accounting toward the benchmark-canary HTTP lifecycle states or demote this lower-level group.

No browser or e2e tests were run. No repository files were edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

Generated: 2026-05-21T23:46:05Z

Emitted 2 P0 critical-path actions.

## Routed Blockers

1. PR07C owner matrix is misqueued. Critical-path queue still has `job-pr07c-owner-matrix`, but PR progress control decisions say Cycle380 owner evidence is already consumed, `launch-owner-matrix` is `no`, and duplicate owner-matrix work should be suppressed. The smallest branch-changing controller action is to remove that queued browser-e2e job and keep PR07C held until newer product-owner evidence or exact product-failure classification appears.

2. Seed 5200005 reducer is stale. The latest continuation classification is `already_resolved_by_active_artifacts` and explicitly says to clear the runnable PR05 residual reducer blocker and queued reducer jobs unless newer product-owned non-coverage evidence appears. The smallest action is to consume that classification into `blockers.tsv`.

## No Row For Benchmark Canary

`benchmark-canary-fuzzer-gap` remains a real P0 blocker, but its current ownership and next action are already aligned: exact-stack `title-reload-http` and `existing-post-crdt-http` replay must stay promotion-blocking. This lane did not add another benchmark row because that would duplicate the active benchmark-to-fuzz closure path rather than correct a misrouted PR blocker.

No browser/e2e tests were run, and no repository files were edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer

Generated: 2026-05-21T23:43:11Z

Emitted two actions.

## reload-hydration

`reload-hydration` should stop being treated as a generic deferred family. The current product candidate is `deferred/rtc-reload-hydration-20260521T223947Z` at `fa801a6aa131f67087f333ffff9a547633b91c99`; its manifest/report show focused unit and lint coverage passed, but no exact-stack browser gate was rerun because the failed stack did not include this head.

The smallest useful controller move is to convert this family into an exact critical-path blocker: build or adopt a fresh all-merged stack containing `fa801a6aa13`, run `title-reload-http` and `existing-post-crdt-http`, keep `large-http-lifecycle` in the required minimum, and block publication until those rows pass.

Evidence:
- `/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260521T223947Z/reload-hydration/reload-hydration.report.md`
- `/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260521T223947Z/reload-hydration/push-manifest.tsv`

## Deferred Budget Gate

The deferred loop is still vulnerable to spending slots on interval-style re-analysis. Current context shows `reload-hydration` at 32 launches in the 43200s window against a max of 8, `pre-save-search-live-collapse` at 27/8, and `rich-text-suffix-corruption` at 17/8. The same context marks `malformed-save-payload` and `http-room-isolation` downscoped by canonical PR tracks.

The deferred controller should enforce single-flight plus manifest-hold gating for those families and accept only product-head exact replay, owner evidence, or explicit downscope work as progress. This prevents deferred work from re-analyzing families already reduced to exact blockers or superseded PR tracks.

Evidence:
- `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/context.md`

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T234311Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark-To-Fuzz Closure Report

Generated: 2026-05-21T23:45:42Z

Emitted two controller actions.

1. `btfc-20260521-focused-exact-stack`: the latest all-merged stack `rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text` at `14767c60a7ef5295366fd8a1f31a64d610acdf80` failed `focused/title-reload-http` and `focused/persistence-reload-http`. The context says equivalent lanes exist, but must be P0 and promotion-blocking on the exact stack. The current coverage run already has matching novelty groups in `supervisor-groups.json`; the useful control action is to schedule exact-stack replay and make the lanes block finalization until green.

2. `btfc-20260521-large-http-gate`: the known-bad `rtc-pr-stack-20260519T214027Z-validated-no-harness` canary still failed `large-post-three-user-http` 2/2, while `large-http-lifecycle` is only partial. The smallest controller action is to keep the formal benchmark row as a P0 promotion gate for all-merged candidates until continuous large-document HTTP lifecycle coverage has passing promotion criteria.

No repository files were edited and no browser/e2e tests were launched.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T232310Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget Report

Generated: 2026-05-21T23:27:48Z

## Decision

Emit two actions.

The active lower-level loop is no longer doing useful open-ended discovery. Its only configured group is `unit-property-table-query-array-crdt`, targeting `packages/core-data/src/utils/test/rtc-table-query-array-crdt.coverage-fuzz.test.js` through the `rtc-lower-level-fuzz-20260516` supervisor.

In the current run, `status.tsv` has 85 attempts: 77 exits with `exit=1` and 8 with `exit=0`. Every failure collapses to the same assertion family: `RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE`, direct `mergeCrdtBlocks`, `oracle-remote-marker`. The top prefixes are:

- 48 `scenario-remote-reorder-row`
- 16 `scenario-remote-reorder-cell`
- 13 `scenario-remote-cell-edit`

That is a yield/accounting problem for the lower-level loop. More random seeds mostly rediscover the same unresolved class. The loop should preserve a bounded minimizer/reproducer lane, quarantine this duplicate family from novelty accounting, and retarget the main slot to the already-approved lower-level canary/restore-state profiles visible in the current controller decisions.

## PR Route

The failure also needs a branch-level decision, not just fuzzer accounting. The representative log for seed `1592595164` shows a stale local table snapshot preserving `local-7-225` while dropping acknowledged remote marker `remote-7-143` after a remote reorder-cell operation. Current PR progress only shows `ready/rtc-pr14b-table-query-array-local-suffix-append` as published and does not list this remote-marker class, so the smallest useful branch action is to route one minimized reproducer as a PR14B follow-up or explicit oracle downscope.

No browser or e2e tests were run. No repository files were edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T232310Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-21T23:27:14Z

Emitted two P0 actions.

1. Critical path must close `benchmark-canary-fuzzer-gap` with fresh exact-stack evidence, not with generic focused fuzz output. The context shows `rtc-pr-stack-20260520T193645Z-all-merged-192647-latest-crdt-rich-text` at `14767c60a7ef5295366fd8a1f31a64d610acdf80` still fails `focused/title-reload-http` and `focused/persistence-reload-http`, so coverage-confidence and snapshot-publication should remain blocked until `title-reload-http` and `existing-post-crdt-http` pass on that exact stack.

2. Coverage scheduling should make the benchmark rows durable fuzz gates. The current coverage supervisor has title reload and large-post HTTP lifecycle coverage, but the canary feedback still requires `existing-post-crdt-http` as continuous P0 coverage and says `large-http-lifecycle` is only partial. Keep `large-post-three-user-http` in the formal benchmark minimum until the large HTTP lane has equivalent continuous coverage and exact-stack passing evidence.

I did not run browser or e2e tests and did not edit repository files.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T232310Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

Generated: 2026-05-21T23:26:31Z

## Routed Actions

1. PR07C owner evidence is already available from the pr-split review replay. Critical path still carries `pr07c-owner-matrix` as queued, with `owned_by_pr_split_review` in the queue and an older readiness classification saying to run the exact owner replay. The smallest useful action is to consume `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T170339Z/jobs/outputs/rtc-cycle380-pr07c-owner-replay-after-browser-ready/report.md`, clear the duplicate heavy owner-matrix launch unless newer evidence appears, and make the promote/hold decision from that artifact.

2. The benchmark canary blocker is still promotion-critical for `focused/title-reload-http` and `focused/persistence-reload-http` on stack `14767c60a7ef5295366fd8a1f31a64d610acdf80`. The lower-level fuzz loop currently has one configured profile, `rtc-table-query-array-crdt`, so it is not aimed at the active blocker. Retarget one lower-level lane to the canary-equivalent HTTP reload/CRDT persistence oracles while preserving other discovery capacity.

## Non-Actions

No action row for `seed-5200005-reducer`: the critical-path queue has already adopted the active continuation.

No extra deferred-family action row: PR progress and deferred status already have hard gates for reload-hydration, pre-save-search-live-collapse, and rich-text-suffix-corruption; another broad cooldown row would not change scheduling beyond the existing controller decisions.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260521T232310Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer Report

Generated: 2026-05-21T23:23:10Z

Emitted 2 controller actions.

The high-leverage deferred decision is to stop treating `reload-hydration` as a family needing more generic analysis. The latest artifact-complete candidate is `deferred/rtc-reload-hydration-20260521T223947Z` at `fa801a6aa131f67087f333ffff9a547633b91c99`; it has focused unit and lint validation, but no exact-stack browser promotion claim. That should become an exact-stack blocker consumed by the critical-path controller, not another interval relaunch.

The deferred loop is also over budget on families that already have manifests: `reload-hydration` has 33 launches in the 12-hour window against a max of 8, `pre-save-search-live-collapse` has 27, and `rich-text-suffix-corruption` has 17. Those should be single-flighted until new product/owner/replay evidence appears or the family is explicitly downscoped.

No action row was emitted for `malformed-save-payload` or `http-room-isolation`; the current deferred queue already marks them downscoped by canonical PR tracks.

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
```

## Notes

The loop currently runs targeted lanes for PR blocker routing,
benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing
yield retargeting. A lane that only writes commentary should not be added here;
new lanes should emit action rows with an explicit controller path.
