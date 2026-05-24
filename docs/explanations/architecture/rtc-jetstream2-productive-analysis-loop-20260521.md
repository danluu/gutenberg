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

- updated: 2026-05-24T00:42:19Z
- session: rtc-productive-analysis-loop
- active lane jobs: 0
- actions: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv
- critical feedback: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.md

## Controller Feed
- current action rows: 0
- high-priority controller rows: 0
# RTC Productive Analysis Loop

- updated: 2026-05-24T00:42:19Z
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

## Recent Lane Reports

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260524T001213Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

Generated: 2026-05-24T00:15:38Z

Emitted two actions.

The PR07C owner-matrix blocker is still queued in the critical-path queue as a browser-e2e owner-matrix job, but current PR progress control already says the current-head owner replay is terminal and duplicate launch is not allowed. The smallest useful action is to consume `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/pr07c-owner-matrix/local-mac-20260522T172727Z/report.md` and mark `job-pr07c-owner-matrix` terminal/no-promote unless fresher product-owned evidence appears.

The reload-hydration blocker is also mis-owned. The 2026-05-24 deferred pass completed on the same candidate head `b01a3a21e2c83af903bc0f61cb9c875249d027ca` and explicitly says not to schedule another generic deferred relaunch; the useful next signal is same-head exact-stack replay after the b8ca benchmark harness gate. The critical-path queue still has `job-reload-hydration` queued as `deferred-single-flight`, so the action routes that queue item to terminal/held-by-pr-progress instead of another deferred fanout.

No action was emitted for `benchmark-canary-fuzzer-gap`: P0 benchmark-minimum harness packaging and exact rerun are already present in `/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-control-decisions.tsv`, and the active repair job should not be replaced with another analysis-only row.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260524T001213Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-24T00:15:38Z

Emitted two controller actions.

1. The exact b8ca all-merged stack is blocked by benchmark-minimum rows that did not run because the harness files were missing from the exact candidate worktree. This should be handled as harness packaging plus an exact rerun, not as green equivalent coverage and not as a publishable partial benchmark pass.

2. Current benchmark-canary coverage status still has forced canary gaps that cannot be credited: several groups have `coverage_ready=no` because they have no current-run records or are disabled. The coverage supervisor should repair those specific materialization gaps before the `benchmark-canary-fuzzer-gap` blocker is cleared on coverage grounds.

No browser/e2e tests were run, no broad filesystem scan was launched, and repository files were not edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260524T001213Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer Report

Generated: 2026-05-24T00:15:09Z

Emitted two control actions for `reload-hydration`.

The current deferred pass already completed at `/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260524T000039Z/reload-hydration/reload-hydration.report.md`. It fast-forwarded `deferred/rtc-reload-hydration-20260524T000039Z` to `b01a3a21e2c83af903bc0f61cb9c875249d027ca`, passed focused unit tests, lint, and diff-check, and explicitly left publication blocked on fresh same-head exact browser rows.

This should no longer be treated as a generic deferred-family relaunch. The smallest useful state change is to consume the completed report, cancel or skip the queued deferred-single-flight relaunch, and convert the family into an exact-stack promotion blocker.

The follow-on scheduler action is one bounded same-head exact replay after the benchmark-minimum harness gate clears: `title-reload-http`, `existing-post-crdt-http` or `persistence-reload-http`, and `large-http-lifecycle`. Red rows should become exact blockers using the report's replay seeds; green or explicitly downscoped rows are required before publication.

No action rows were emitted for `pre-save-search-live-collapse` or `rich-text-suffix-corruption`: current control already holds them as diagnostic candidates and there is no fresh owner evidence, green-stack adoption, or explicit downscope to change scheduling. No action rows were emitted for `malformed-save-payload` or `http-room-isolation` because they are already downscoped by PR06B minimal and PR02A respectively. Terminal reducer blockers stay closed absent newer product-owned evidence.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260524T001213Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget

generated_at: 2026-05-24T00:12:14Z

## Finding

The lower-level lane is not missing raw execution volume: level-mix reports 96,354 coverage-guided lower-level executions, 5 failed rows, and only 3 unique bug/assertion outputs. Most lower-level roots in the active mix are stale completed outputs; only `coverage-guided-lower-level-http-polling-manager` is fresh audited output.

The current PR progress decisions already say stale lower-level parser/rich-text/table/http broad corpus work should reopen only with an executable seed plus coverage delta or triage-ready oracle failure, and explicitly mark `coverage-guided-lower-level-rich-text-multiblock` as saturated low-yield. This should be enforced as scheduling/accounting behavior, not re-analyzed.

## Actions

1. `lower-level-yield-retarget-001`: make level-mix stop crediting stale-completed lower-level roots as active useful coverage. This prevents stale parser/rich-text/table roots from masking the low-yield state.

2. `lower-level-yield-retarget-002`: use the next lower-level slot for benchmark-minimum closure seeds instead of generic broad-corpus continuation. The blocking benchmark rows are `lower/micro-crdt`, `lower/micro-html`, `lower/micro-sync`, and `multi-user/many-users-sync`, all currently failing as exact-stack `No tests found` rows on `b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638`.

No browser or e2e tests were run.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T235210Z/lanes/lower-level-yield-retarget/report.md
# Lower-Level Yield Retarget

Generated: 2026-05-23T23:55:49Z

Emitted 2 action rows.

## Retargets

1. `benchmark-canary-fuzzer-gap/PR17-provider-persisted-crdt-seeds`

   The useful lower-level signal is already bounded: the HTTP polling manager run produced explicit oracle reproducers. Seeds `0022`, `0036`, and `0039` share `RTC_HTTP_POLLING_CANARY_PERSISTED_MULTIROOM_CONTENT_MISSING:target-large-http-readiness` and should feed PR17. Seed `0055` is a different `RTC_HTTP_POLLING_CANARY_BRIDGE_HARD_READINESS_UNION_INCOMPLETE` family, so bundling it into the same product-yield credit would blur the blocker state. The next controller action is seed handoff/classification, not more broad lower-level fuzzing.

2. `coverage-guided-lower-level-rich-text-multiblock`

   This target is saturated under the current corpus/oracle. Its latest status shows a 5000-file corpus, repeated batches with `new_coverage_keys=0`, no crash artifacts, and no triage-ready oracle failure. Keep it cooled down until the corpus or oracle changes enough to produce executable seed evidence with a coverage delta.

## Non-Actions

No action was emitted against the active HTTP polling lower-level lane itself. It has fresh audited output with `new_coverage_keys=137`, `admitted_new_feature_keys=10`, `product_yield=1`, and concrete reproducer files, so the scheduling change is to consume and split its seed evidence rather than retarget the active lane away from it.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T235210Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-23T23:55:09Z

Emitted one control action.

The latest benchmark-canary continuation classifies `benchmark-canary-fuzzer-gap` as `exact_stack_blocked`, not as a fuzz coverage miss. Coverage is present: the novelty monitor updated at `2026-05-23T23:51:14Z`, reports benchmark canary HTTP coverage ready, and has no blocked HTTP groups.

The remaining schedulable closure action is exact-stack harness packaging for the b8ca all-merged stack. `exact-file-presence.tsv` shows all four benchmark-minimum files are absent from both `b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638` and `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/benchmark-harness-source`, while `current-feedback.tsv` still has the lower/many-user benchmark rows red with `No tests found`. The emitted action routes that to `pr-progress` as the next branch-changing slot: populate or commit the harness files, run the generated exact benchmark-minimum rows, and keep final publication blocked until the exact rows are green or deliberately downscoped.

No coverage retarget row was emitted because the earlier large-post forced-coverage materialization gap is now represented by current-run HTTP records and `benchmark canary blocked HTTP groups: none`. Re-issuing that coverage action would not change scheduling.

No repository files were edited, and no browser or e2e tests were launched from this lane.

Evidence used:

- `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T235210Z/context.md`
- `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260523T234212Z/continuations/benchmark-canary-fuzzer-gap/classification.tsv`
- `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260523T234212Z/continuations/benchmark-canary-fuzzer-gap/exact-file-presence.tsv`
- `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260523T234212Z/continuations/benchmark-canary-fuzzer-gap/exact-stack-status.tsv`
- `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260523T180044Z/novelty-status.md`

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T235210Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer

Generated: 2026-05-23T23:54:40Z

Emitted 2 controller actions.

## Actions

1. `reload-hydration` should be converted from deferred-family re-analysis into a bounded same-head exact replay action. The current manifest is a product candidate at `b01a3a21e2c83af903bc0f61cb9c875249d027ca`, with unit/lint/diff validation but no exact-stack browser promotion evidence. Publication remains blocked on fresh same-head `title-reload-http`, `existing-post-crdt-http` or `persistence-reload-http`, and `large-http-lifecycle` evidence. This is a PR-progress scheduling action, not another generic deferred launch.

2. `pre-save-search-live-collapse` and `rich-text-suffix-corruption` should stay diagnostic-only. Their latest manifests contain focused diagnostic coverage or instrumentation, but current evidence lacks product-owned first-loss proof: pre-save still needs focused plane ownership, and rich-text is marker-timeout dominated with `likelyRealVisible=0`. The deferred loop should suppress generic relaunch/publication until product-owned first-loss evidence, owner evidence, green-stack adoption, or explicit downscope exists.

## No Action Rows

No rows were emitted for `malformed-save-payload` or `http-room-isolation`: both are already downscoped in the current deferred status, respectively covered by published PR06B minimal and PR02A absent fresh contrary product evidence.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T235210Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

Generated: 2026-05-23T23:54:25Z

Emitted one action.

The actionable mismatch is PR07C ownership. The critical-path queue still contains `job-pr07c-owner-matrix` as a queued browser-e2e owner-matrix job, while the PR progress decisions already say `consume-owner-matrix` is allowed for `PR07C/HOLD-07C@2f8247258316bde60869c06c383090904e9426bd` and duplicate launch is not allowed. The current-head local owner replay report is green with `product_owned_rows: 0`, so the smallest branch-changing/blocker-changing action is to consume that report and terminalize the stale queued owner-matrix work rather than spend another browser slot.

No new action was emitted for `benchmark-canary-fuzzer-gap`: exact-stack repair is already active, and the next valid branch-changing step is the existing benchmark-minimum harness packaging plus exact rerun gate.

No new action was emitted for `reload-hydration`: it is correctly held by the deferred single-flight manifest gate, and current control already blocks generic deferred fanout until same-head exact evidence, owner evidence, green stack adoption, or explicit downscope exists.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T233206Z/lanes/lower-level-yield-retarget/report.md
# lower-level-yield-retarget

Generated: 2026-05-23T23:35:46Z

Emitted 2 control actions.

The fresh lower-level HTTP-polling run is useful, but only as bounded blocker input: `status.tsv` shows one audited lane, 64 inputs, `product_yield=1`, and the active failure is `RTC_HTTP_POLLING_CANARY_PERSISTED_MULTIROOM_CONTENT_MISSING:target-large-http-readiness`. PR progress already routes this through `benchmark-canary-fuzzer-gap/http-polling-large-readiness`; the smallest scheduling change is to consume the known bounded reproducers and suppress broad HTTP-polling expansion until exact b8ca harness evidence is green.

The stale parser/rich-text/table lower-level family should stay cold. The rich-text-multiblock evidence shows repeated attempts with `new_coverage_keys=0`, no failures, and corpus already at 5000, while level mix lists related parser/table/rich-text lower-level roots as stale completed output. Relaunch should require executable seed plus coverage delta or a triage-ready oracle failure, otherwise it is accounting churn rather than yield.

No action rows were emitted for unit-property, backend-api, or protocol-server: the context marks them within cap/status, and there is no lower-level retarget evidence that would change scheduling or blocker state.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T233206Z/lanes/pr-blocker-router/report.md
# PR Blocker Router Report

- generated_at: 2026-05-23T23:35:40Z
- rows_emitted: 2

## Routed Actions

1. `benchmark-canary-fuzzer-gap` is still blocked by exact-stack benchmark-minimum harness absence, not by lack of coverage equivalents. The active continuation reports b8ca and the default harness source both lack four required benchmark files, while PR progress already allows the matching `repair-ready` route. The smallest branch-changing action is to spend the next product-progress slot on exact-stack harness packaging and rerun, keeping final publication and PR17 branch work blocked until those rows are green or explicitly downscoped.

2. `pr07c-owner-matrix` is still queued in critical-path even though the current-head owner replay is green with `product_owned_rows=0`. Consume that classification as terminal no-promote evidence and suppress the duplicate browser owner-matrix job unless newer current-head product-owned evidence appears.

## No Action Rows

- `reload-hydration` remains a concrete same-head exact-stack candidate at `b01a3a21e2c83af903bc0f61cb9c875249d027ca`, but PR progress already gates it behind the b8ca harness repair and blocks generic relaunch/publication. Re-emitting it here would not change scheduling before the P0 benchmark gate.
- Terminal reducer and PR17 rows were left closed; reopening needs fresh product evidence newer than the terminal classifications.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T233206Z/lanes/deferred-family-reducer/report.md
# Deferred Family Reducer Report

Generated: 2026-05-23T23:34:51Z

Emitted one action row.

`reload-hydration` should stop cycling through deferred-family re-analysis and become a concrete same-head exact-stack blocker. The current deferred control file has it single-flight-held on `/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/cycles/20260523T113939Z/reload-hydration/push-manifest.tsv`; the manifest points to `deferred/rtc-reload-hydration-20260523T113939Z@b01a3a21e2c83af903bc0f61cb9c875249d027ca` with focused unit, JS lint, and diff-check validation, but no exact-stack browser promotion evidence.

The controller-changing next step is one exact all-merged replay at that head for `title-reload-http`, `existing-post-crdt-http` or `persistence-reload-http`, and `large-http-lifecycle`. Generic deferred relaunch and publication remain blocked unless those rows are fresh green or explicitly downscoped with replay evidence.

No rows were emitted for `pre-save-search-live-collapse` or `rich-text-suffix-corruption`: both are already single-flight-held diagnostic candidates, and the current controls already require focused replay, owner evidence, green-stack adoption, or explicit downscope before relaunch. No rows were emitted for `malformed-save-payload` or `http-room-isolation` because current deferred control already downscopes them under PR06B minimal and PR02A respectively.

No browser or e2e tests were run, and no repository files were edited.

### /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T233206Z/lanes/benchmark-to-fuzz-closure/report.md
# Benchmark To Fuzz Closure

Generated: 2026-05-23T23:34:13Z

Emitted two control actions.

The main blocker is not a new product-code repair yet. The latest continuation classifies `benchmark-canary-fuzzer-gap` as `coverage_present_exact_stack_red`: equivalent fuzz lanes are present or running, but exact-stack replay cannot prove the benchmark minimum because both `b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638` and `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/benchmark-harness-source` lack all four required harness files:

- `packages/core-data/src/utils/test/rtc-merge-benchmark.test.ts`
- `packages/blocks/src/api/test/rtc-html-equivalence-benchmark.js`
- `packages/sync/src/providers/http-polling/test/rtc-sync-benchmark.test.ts`
- `packages/sync/src/providers/http-polling/test/rtc-many-user-sync-benchmark.test.ts`

The first action routes this to the critical-path queue as an exact-stack harness-materialization gate. Running more coverage or treating `coverage_present` as repaired would not change blocker state; the next schedulable change is to provide the missing harness source and rerun the generated exact-stack command.

The second action is a smaller coverage correction. The current benchmark canary coverage status at `2026-05-23T23:33:08Z` shows `novelty-http-large-post-lifecycle` running but `coverage_ready=no` with `no-current-run-group-records`, while companion large-post groups have records. Closure should not count large-post lifecycle fuzz coverage complete until the primary lifecycle group itself emits current-run records.

No additional action rows were emitted. Micro-CRDT, micro-HTML, micro-sync, and many-user equivalents already have active or companion coverage records, so duplicating those schedules would not plausibly change the controllers.

Evidence used:

- `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/runs/20260523T233206Z/context.md`
- `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260523T231925Z/continuations/benchmark-canary-fuzzer-gap/classification.tsv`
- `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260523T231925Z/continuations/benchmark-canary-fuzzer-gap/exact-stack-status.tsv`
- `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/runs/20260523T231925Z/continuations/benchmark-canary-fuzzer-gap/coverage-change.tsv`
- `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260523T180044Z/benchmark-canary-coverage-status.tsv`
# Productive Analysis Feedback For Control Loops

- generated: 2026-05-24T00:42:19Z
- action source: /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv
- contract: these rows are meant to be consumed by the critical-path, PR-progress, deferred, coverage, and level-mix controllers.

## High Priority Action Rows
No high-priority action rows in the latest merge window.
```

## Notes

The loop currently runs targeted lanes for PR blocker routing,
benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing
yield retargeting. A lane that only writes commentary should not be added here;
new lanes should emit action rows with an explicit controller path.
