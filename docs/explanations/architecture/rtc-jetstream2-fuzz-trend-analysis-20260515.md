# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T18:17:37Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...`
inputs so PR-controller graphs track current raw state instead of stale local
state.

## High-Level Readout

The graph-refresh pipeline is current through `2026-05-22T18:07:47Z`.
The monitor has `4,071` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `279,536`, and current-scan coverage files are
`2,310`. The parsed coverage-goal table has `18` unmet target rows out of
`136`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest active run is `run-20260522T181432Z`; its
current-run accounting row at `2026-05-22T18:15:49Z` is not trusted yet
(`current_run_metrics_trusted` `FALSE`, `full_pass_pending` `TRUE`,
`pending_until_first_pass` `TRUE`). Treat the duplicate/noise share as
incomplete current-run accounting and a control-plane health issue until this
run completes a full pass. The latest completed-pass duplicate share is `0`,
summary startup failures are `0`, and the current-run signature/actionable
denominator is pending (`NA`/`NA`). Historical duplicate share is `0.15` for
context only.

The latest duplicate/noise synthesis still rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak: benchmark-canary/P0 groups can bypass duplicate/noise
holds after they already have a current-run product-evidence representative.
The latest non-empty duplicate/noise feedback-action says the bounded fix was
applied, but the later synthesis still recommends that same producer-bypass
and supervisor-publication fix. Interpret this as a control-plane watch item
until the active run has a trusted full pass and a longer post-fix window.

Resource state is usable. The latest monitor sample has `384.5G` free memory;
the latest disk sample has `90.6GiB` free on `/` and `480.0GiB` free on
`/media/volume/danluu-fuzz-data`. Latest CPU utilization is `54.67%`, with
`5.97%` iowait. Latest load averages are `42.82`, `43.93`, and `50.47` on
`64` logical CPUs, with `3` blocked tasks in the same sample.

The latest graph-counted fuzzing mix is still concentrated in browser/e2e:
`12` browser/e2e lanes across `12` groups, plus one `unit-property` lane, one
`protocol-server` lane, and one stale `coverage-guided-lower-level` row.
Browser/e2e remains below the persona loop's `24`-lane floor. The current
active accounting root has two browser/e2e WS many-user lifecycle rows; older
graph-latest append campaigns still contribute focused large-HTTP readiness,
gap-booster, and strict HTTP expansion rows. Current graph-confirmed
lower-level work is narrow: one rich-text CRDT unit/property lane and one HTTP
polling protocol-server row. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.
Coverage-guided lower-level persona/action evidence reports table-query-array
and block-parser confirmations, but the committed execution graph still has
zero current coverage-guided-lower-level executions; keep that as action
evidence until graph-visible residency appears.

The execution counter has `16,848,100` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T18:15:00Z` has `11` browser/e2e executions, `320`
unit-property executions, and `265` protocol-server executions, about
`44`/hour, `1,280`/hour, and `1,060`/hour. The latest nonzero
coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with `2`
executions.

The PR-focused data is live. The controller table has `21` distinct work items
in `27` current rows: `13` high-priority ready-product PR rows marked
published, `4` high-priority ready-product rows held by the controller, `1`
high-priority ready-product row marked publishable, `1` runtime-held consumed
row, and repeated deferred-family diagnostic plus needs-product-decision rows.
The current push manifest has one publishable branch,
`ready/rtc-pr07c-reload-record-snapshots`, at `316` net LOC. The
critical-path executor has `7` blockers: one active seed `5200005` reducer,
one runnable productive-analysis action, one queued PR07C owner-matrix item,
one held reload-hydration item, and three terminal blockers. Benchmark-canary
exact-stack repair is terminal with fresh green evidence, PR17 seed `1020002`
and seed `1060015` are terminal, and reload-hydration is held by a
single-flight manifest. The latest PR-split feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative
total. It can fall when the active output root changes or when a cleanup pass
removes old per-run files. Cumulative coverage record observations are the
better long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
Pending/incomplete accounting is tracked as its own health signal and should
not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted` is `FALSE`, treat the duplicate/noise share as
incomplete current-run accounting and as a control-plane health issue until the
active run completes a full pass.

The latest sample for `run-20260522T181432Z` was taken at
`2026-05-22T18:15:49Z`; it reports `current_run_metrics_trusted` `FALSE`,
`pending_until_first_pass` `TRUE`, and `full_pass_pending` `TRUE`. The row
carries latest completed-pass `duplicateShareCurrent` `0` and summary startup
failures `0`, but the active-run denominator is still pending (`NA`
signatures and `NA` actionable signatures). The prior trusted row for
`run-20260522T174740Z` at `2026-05-22T18:08:03Z` had a `0`/`0`
signature/actionable-signature denominator. The earlier one-signature
duplicate-share spike remains a tiny-denominator event, not evidence of a
broad product duplicate storm.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is a
producer/scheduler leak in which benchmark-canary/P0 groups bypass duplicate
holds even after the current run already has a product-evidence representative.
The latest non-empty duplicate/noise feedback-action reports that the bounded
control-plane fix was implemented, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. The graph no
longer shows a trusted live current-run duplicate/noise spike, but the latest
active run is still pending its first full pass. The later synthesis still
recommends the same producer-bypass and publication fix, so the report should
keep this as a control-plane watch item rather than a closed product-quality
signal.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The latest sample
has `90.6GiB` free on root and `480.0GiB` free on the data volume; the data
volume is around `86.4%` used and root is around `41.1%` used. Root pressure
remains stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,776`. Current enabled groups in the
summary are `novelty-ws-thirty-user-lifecycle` and
`novelty-ws-many-user-lifecycle-completion`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `12` browser/e2e lanes across `12` groups. Lower-level work is
narrow: `unit-property` and `protocol-server` each have one current
graph-counted row, while the lone `coverage-guided-lower-level` row is stale
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only `fuzz-assertion` work have no current graph-counted lane
in this snapshot.

The active accounting root is `run-20260522T181432Z`. Current graph-counted
browser/e2e rows include two coverage-guided WS many-user lifecycle rows, one
focused large-HTTP readiness row, six gap-booster rows, and three strict HTTP
expansion rows. Those rows cover many-user and thirty-user lifecycle
completion, large-post three-user HTTP lifecycle, real-user title/rich-text
editing, three-user late join, revision/autosave recovery, permissions/auth
locks, async/server, long-doc, HTTP persistence probing, same-user stale draft,
and large HTTP lifecycle coverage.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis rejects
broad lower-level expansion, keeps `unit-property` capped at one smoke lane,
keeps backend/API and protocol-server to sentinel-scale work, counts stale
`fuzz-assertion` as zero useful capacity, and keeps browser/e2e as the
admission-gated priority because it remains below the `24`-lane floor. The
refreshed graph sees `12`, still below that floor. The same synthesis says
hard-readiness appears live, so the next concrete correction is the broken
`table-stale-snapshot-http` profile/accounting path rather than blind duplicate
browser launches.

The latest level-mix feedback-action partly disagrees on sequencing: because
browser admission was under `high_pressure`, it made a narrow lower-level
correction plus coverage materialization repair instead of expanding
unit/property or stopping browser fuzzing. It reports a bounded exact
table-query-array coverage-guided lower-level run with one input, one attempt,
mutation disabled, `product_yield=1`, and clean final telemetry
reconciliation. The latest level-mix synthesis says hard-readiness appears
live and the next useful browser fix is the broken
`table-stale-snapshot-http` action-profile path, not blind duplicate browser
launches. The refreshed graph confirms browser HTTP/readiness rows and
protocol-server telemetry, but still has no current
coverage-guided-lower-level execution bucket. Treat the lower-level
table-query-array result as action evidence until graph-visible residency or
execution buckets appear.

The latest native-harness synthesis selects the block parser/serialization
harness as the first ready isolated Node/V8 coverage-guided lower-level target,
but also says the current hold should not be overridden for a long run until
known parser normalization drift is classified or triage-ready canonical
artifacts are produced. The latest native-harness action implemented and
validated the block-parser lower-level harness with direct and tmux one-attempt
smokes, `coverageKeys=170`, `featureKeys=32`, `productYield=true`, and
`failureKind=null`. The graph still rejects treating that as sustained live
lower-level residency because the latest graph-counted coverage-guided
lower-level row is stale and current execution buckets remain zero.

The latest protocol-server synthesis converged on the HTTP polling REST
protocol harness for `POST /wp-sync/v1/updates`. The refreshed graph has a
protocol-server row and current execution buckets through
`2026-05-22T18:15:00Z`. The latest protocol-server action file is empty, but
the synthesis cites a passed validation artifact and the graph agrees that
protocol-server telemetry is present.

Fuzz-only assertion work is not graph-counted as active. The latest assertion
action added two gated assertions; level-mix evidence still treats
`fuzz-assertion` as stale rather than current graph capacity.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `79,201`
browser/e2e, `5,763,328` unit-property, `458,097`
coverage-guided lower-level, and `10,547,474` protocol-server executions.
Transport-integration, backend-api, fuzz-assertion, and other buckets are `0`
in the current reconstructed table.

The latest 15-minute bucket at `2026-05-22T18:15:00Z` is partial and has `11`
browser/e2e executions (`44`/hour), `320` unit-property executions
(`1,280`/hour), and `265` protocol-server executions (`1,060`/hour);
coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The latest nonzero coverage-guided
lower-level bucket remains `2026-05-21T11:00:00Z` with `2` executions
(`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `122` likely-real
findings over about `557.8` runner-hours, or `21.87` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,141`
total candidates: `1,133` browser/e2e candidates, `6` unit-property
candidates, and `2` coverage-guided-lower-level candidates. Backend-api,
protocol-server, transport-integration, standalone fuzz-assertion, and other
buckets have no unique candidates in the latest graph-counted data.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Failure-candidate rates are pre-triage lead indicators, not confirmed bug
counts. They remain useful for spotting whether a lane is producing work worth
triaging before duplicate/noise filtering catches up.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

The latest weak-completion profiles have successful record counts at zero for
table stale snapshot HTTP (`4` records) and collaboration UI signals (`80`
records). Revision persistence has `4` successful records, full-profile rows
have `16`, many-user lifecycle has `19`, parser serialization has `20`,
multi-reload lifecycle has `37`, long-session large-doc has `39`, common
blocks have `43`, large-post three-user HTTP has `63`, code-editor smoke has
`64`, parser transform has `68`, three-user late join has `96`, block-gauntlet
has `106`, media cross-entity has `111`, async/server blocks have `136`, and
permissions/auth/locks has `265`. This still argues for completion-depth
repair in existing covered surfaces before adding another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

![Combined-ingredient fuzzing progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-progress.png)

![Combined-ingredient fuzzing goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-goal-progress.png)

![Combined-ingredient fuzzing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-requirements.png)

The combined-ingredient graphs are generated by
`rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R`
from the novelty-state feature key
`cross-product:large-post-three-user-http-lifecycle`. They track the
benchmark-like conjunction: HTTP polling, large initial post, at least three
browser users, lifecycle reloads, save/autosave checkpoints, strict
persistence oracles, and a passed run. Separate ingredient-lane hits do not
increment this cross-product count. The goal-progress graph also includes
nearby large-post, HTTP, and three-user goals so already-running combined-ish
lanes remain visible while the stricter cross-product key ramps up.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is not currently marked enabled, and the adjacent large-post
three-user HTTP profile has `689` records seen with `63` successful records.
Those adjacent hits still do not count as completed combined coverage unless
the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. Users present in a room are not enough. A run
only contributes to the active-user series when distinct browser users
actually perform successful editing actions, and final UI witness-sweep-only
edits do not count as active-editor evidence. The cross-product rows require
the same active-editor threshold together with realistic editing ingredients:
save/reload lifecycle, late join, autosave, rich text/list/table editing,
synced notes, collaboration UI signals, large-document setup, HTTP polling
with an explicit client-limit override, same-user tabs, revision restore,
publish transition, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. The rich/list, synced notes, HTTP
polling, HTTP client-limit override, same-user tabs, revision restore, publish
transition, UI-signal, save/reload/autosave, late-join, and large-document
cross-products remain `0` at the 6/10/12/30 active-editor thresholds where
they apply. The active-editing groups are not currently marked enabled in the
sampled state, so these graphs should remain red until the monitor admits the
six-, twelve-, and thirty-active-editor lanes and they start producing passed
records.

Largest current unmet goal and active-editing gaps:

| Goal                                                    | Current | Target |
| ------------------------------------------------------- | ------: | -----: |
| successful parser-serialization records                 |      20 |     50 |
| successful multi-reload-lifecycle records               |      37 |     50 |
| successful collaboration-ui-signals records             |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle    |       0 |     25 |
| many-user active-editing records                        |       0 |     25 |
| six-active-editor lifecycle cross-product               |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product     |       0 |     25 |
| six-active-editor UI-signal cross-product               |       0 |     25 |
| six-active-editor large-document cross-product          |       0 |     25 |
| remote selection and cursor visible                     |       1 |     25 |
| remote and local autosave checkpoints                   |      11 |     25 |
| local post recovery autosave                            |      12 |     25 |
| successful three-user late-join records                 |      13 |     25 |
| async/server block core/template-part                   |       0 |     20 |
| successful twelve-user documents                        |       2 |     10 |
| successful twelve-user late join documents              |       2 |     10 |
| successful many-user lifecycle records with twelve users |       2 |     10 |
| successful table-stale-snapshot-http records            |       0 |     10 |
| table stale snapshot oracle                             |       0 |     10 |
| ten-active-editor progress                              |       0 |     10 |
| twelve-active-editor progress                           |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product  |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product  |       0 |     10 |
| HTTP client-limit override for active editing           |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product |       0 |     10 |
| six-active-editor revision-restore cross-product        |       0 |     10 |
| six-active-editor publish-transition cross-product      |       0 |     10 |
| action table-stale-snapshot-html                        |       4 |     10 |
| table stale snapshot over HTTP                          |       4 |     10 |
| successful thirty-user documents                        |       0 |      3 |
| successful thirty-user late join documents              |       0 |      3 |
| thirty-active-editor progress                           |       0 |      3 |

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

These plots separate breadth from repeated observations and focus action
completion on weak profiles so high-volume successful lanes do not hide stalled
profiles.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

The parsed suggested-PR split history has `457` snapshots. The latest parsed
proposed split totals `4,114` net LOC. These charts are size telemetry from
parsed status snapshots, not filing authority. The largest latest rows are
`PR 13B` at `1,668` net LOC, `PR 13A` at `1,126`, `PR 13C` at `294`, and
`PR 14` at `276`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current controller state has `21` distinct work items in `27` current
rows. The most important live queue entries are `4` high-priority
ready-product PR rows held by the controller, `1` high-priority ready-product
PR row marked publishable, `13` published ready-product rows still under
validation, `1` high-priority runtime-held consumed row, and repeated
deferred-family diagnostic plus needs-product-decision rows.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates, deferred
family budget gates, resource reserve, single-flight guards, or repeated
critical-path continuations are slowing progress. It buckets controller stalls
and critical-path blocker launches by 30-minute UTC windows. A spike is not
automatically bad, but repeated spikes for the same blocker class mean the loop
is spending capacity on a gate or relaunch pattern that should be consumed,
downscoped, or converted into exact evidence.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has one graph-counted publishable branch:
`ready/rtc-pr07c-reload-record-snapshots`, `316` net LOC, with a passed
critical-path diff check. Published and held branches remain visible in the
progress table. The latest PR-split persona feedback rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and
owner rows. The copied feedback requests exactly one bounded strict-head
reproduction repair job for `8fb598778357` / seed `6000007`; do not treat
wait-only or no-progress cycles as acceptance while actionable rows remain.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: one active blocker
(`seed-5200005-reducer`), one runnable blocker
(`productive-analysis-action`), one queued blocker (`pr07c-owner-matrix`), one
held deferred-family blocker (`reload-hydration`), and three terminal blockers
(`benchmark-canary-fuzzer-gap`, `PR17` seed `1020002`, and
`seed-1060015-reducer`). The current job queue has seed `5200005` adopted by
active session `rtc-critical-continuation-seed-5200005-reducer-20260522T181201Z`,
PR07C owner matrix queued and owned by PR-split review, benchmark-canary
exact-stack repair terminal with fresh green evidence, productive-analysis
runnable, and reload-hydration gated by a single-flight manifest. The repeated
no-progress table currently has two
`benchmark-canary-fuzzer-gap` rows: `pre_oracle_or_preflight_only` and
`zero_executor_artifact`.

## Interpretation

The active coverage root is `run-20260522T181432Z`, and its latest accounting
row is not trusted yet because the run is still pending its first full pass.
The row was sampled at `2026-05-22T18:15:49Z`; it carries latest completed-pass
`duplicateShareCurrent` `0` and summary startup failures `0`, but the
active-run signature/actionable-signature denominator is incomplete
(`NA`/`NA`). The latest trusted row was the prior root
`run-20260522T174740Z` at `2026-05-22T18:08:03Z` with a `0`/`0` denominator.
This should not be described as a measured broad product duplicate/noise rate.

The duplicate/noise persona synthesis rejects a product-bug reading and points
at a plausible producer-side control-plane leak: benchmark-canary/P0 producers
can keep bypassing duplicate holds after a current-run product-evidence
representative exists. The latest non-empty duplicate/noise feedback-action
says that fix has now been applied, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. The graph no
longer shows a trusted live duplicate/noise spike, but the later synthesis
still recommends the same producer-bypass/publication fix and the active run is
pending accounting, so keep the producer-bypass risk on control-plane watch
until more post-fix trusted samples accrue.

The resource picture is usable: latest CPU utilization is `54.67%`, with
`5.97%` iowait; load is `42.82`, `43.93`, and `50.47` on `64` logical CPUs,
with `3` blocked tasks. Load is below the core count across the 1-, 5-, and
15-minute windows.

The graph-counted fuzzing mix is browser/e2e-heavy: `12` browser/e2e lanes,
plus one current unit-property lane, one current protocol-server lane, and one
stale coverage-guided lower-level row. Persona evidence is stricter than the
graph and rejects raw row counts as trusted useful capacity unless roots,
sessions, PIDs, events, and summaries reconcile. The latest level-mix
synthesis keeps browser/e2e underfilled but says the next useful browser fix is
the broken `table-stale-snapshot-http` profile/accounting path if hard-readiness
is already live. The latest level-mix feedback-action reports a narrow exact
table-query-array lower-level confirmation with product yield and clean
telemetry reconciliation. The latest native-harness action validates the block
parser lower-level harness, but the graph confirms only action evidence, not
sustained residency. The graph confirms current browser HTTP/readiness rows and
protocol-server telemetry, but it does not confirm backend/API,
transport-integration, standalone fuzz-only assertion work, or current-bucket
coverage-guided lower-level execution.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial:
the `2026-05-22T18:15:00Z` bucket has `11` browser/e2e executions, `320`
unit-property executions, and `265` protocol-server executions. Lower-level
counts remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `689` records and
`63` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, and the controller is advertising one publishable
branch: `ready/rtc-pr07c-reload-record-snapshots` at `316` net LOC. The
PR-split persona feedback keeps the fileable prefix through `PR15C` and
rejects `PR16-RLH` as fileable until strict seed `6000007` reaches the final
persistence oracle and owner rows prove it; the feedback-action launched one
bounded strict-head repair job for that family. The PR loop still needs to
convert held ready-product rows, the active seed `5200005` reducer, queued
PR07C owner-matrix work, runnable productive-analysis feedback, and held
reload-hydration work into validated publishable branches rather than more
blocked or no-progress artifacts. Benchmark-canary exact-stack repair is
terminal with fresh green evidence.
