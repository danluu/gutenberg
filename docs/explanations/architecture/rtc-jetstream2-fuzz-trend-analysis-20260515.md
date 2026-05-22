# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T11:06:09Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance, resource,
and PR-progress logs. The plotting data is generated with R, ggplot2, tidyverse
packages, and ColorBrewer palettes. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...` inputs
so PR-controller graphs track current raw state instead of stale local state.

## High-Level Readout

The monitor data is current through `2026-05-22T11:04:04Z`, and the latest
current-run accounting row was sampled at `2026-05-22T11:04:54Z` for
`run-20260522T104926Z`. That active-run row is trusted:
`current_run_metrics_trusted` is `TRUE`, `pending_until_first_pass` is `FALSE`,
and `full_pass_pending` is `FALSE`. The monitor has `3,954` passes from
`2026-05-15T01:21:42Z` onward. Cumulative coverage record observations are
`277,277`; current-scan coverage files are `1,942`. The parsed coverage-goal
table still has `21` unmet target rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting. The latest
row reports current-output-dir `duplicateShareCurrent` `0.5` and summary
startup failures `0`. Because the active `run-20260522T104926Z` row is now
trusted, its duplicate share is measured, but the denominator is tiny:
`2` current-run signatures, `2` actionable signatures, and `2`
product-evidence signatures, with top-duplicate share `0.5`. Historical
duplicate share is `0.1765` for context; it is not the plotted live health
signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak: benchmark-canary/P0 groups can bypass duplicate/noise holds
after they already have a current-run product-evidence representative. The
newest duplicate/noise feedback-action file is empty; the latest non-empty
feedback-action says the bounded novelty-monitor fix was applied and one
product-evidence `assertion` representative was intentionally preserved.

Resource state is usable but pressure-sensitive. The latest monitor sample has
`410.6G` free memory; the latest disk sample has `91.0GiB` free on `/` and
`521.5GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`61.26%`, with `3.27%` iowait. Latest load averages are `74.26`, `57.84`, and
`50.96` on `64` logical CPUs, with `2` blocked tasks in the same sample.

The latest graph-counted fuzzing mix has `39` browser/e2e lanes across `36`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing remains
concentrated in browser/e2e. Current graph-counted lower-level work is narrow:
rich-text CRDT unit/property, a rich-text CRDT coverage-guided lower-level row,
and a protocol-server HTTP polling validation row. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane.

The execution counter has `16,720,039` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T11:00:00Z` has `38` browser/e2e executions, `704`
unit-property executions, and `960` protocol-server executions, about
`152`/hour, `2,816`/hour, and `3,840`/hour. The preceding bucket had
`149` browser/e2e, `2,848` unit-property, and `2,185` protocol-server
executions.
The latest nonzero coverage-guided lower-level bucket remains
`2026-05-21T11:00:00Z` with `2` executions.

The PR-focused data is live. The controller table has `21` distinct work items
in `27` current rows: `13` high-priority ready-product PR rows marked
published, `5` high-priority ready-product rows held by the controller, `1`
runtime-held consumed row, and repeated deferred-family diagnostic plus
needs-product-decision rows. The current push manifest is empty. The
critical-path executor has `7` blockers: `2` active, `1` queued, `1` runnable,
and `3` terminal/downscoped. The latest PR-split feedback
keeps the fileable prefix through `PR15C` and rejects `PR16-RLH` as fileable
until strict seed `6000007` reaches the final persistence oracle and owner rows
prove it. The seed `5200005` reducer and reload-hydration jobs are active.

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
active run completes a full pass. The latest sample for
`run-20260522T104926Z` was taken at `2026-05-22T11:04:54Z` with
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`, and
`full_pass_pending` `FALSE`. The collector's latest completed monitor pass is
`2026-05-22T11:04:04Z`. The latest row carries current-output-dir
`duplicateShareCurrent` `0.5` and summary startup failures `0`. The active run
has `2` current-run signatures, `2` actionable signatures, `2`
product-evidence signatures, and current-run top duplicate share `0.5`, so the
measured duplicate share is based on a two-signature denominator, not broad
duplicate/noise volume.

The previous `run-20260522T104926Z` row at `2026-05-22T10:56:54Z` was pending
first-pass accounting, with `current_run_metrics_trusted` `FALSE` and `NA`
current-run signature denominators. The active root has completed a full pass
since then, so the current row is trusted, but still too small a denominator to
call a broad product duplicate storm.

The previous trusted `run-20260522T094411Z` rows with a top duplicate share of
`1.0` had only `1` current-run signature, `1` actionable signature, and `1`
product-evidence signature. That earlier one-signature denominator also should
not be read as broad product duplication.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is a
producer/scheduler leak in which benchmark-canary/P0 groups bypass duplicate
holds even after the current run already has a product-evidence representative,
so duplicate-heavy `assertion` product-evidence families can keep being
generated while downstream triage and analysis mostly cap siblings. The newest
duplicate/noise feedback-action file is empty; the latest non-empty
feedback-action says the bounded novelty-monitor fix was applied, strict
no-product startup rows were absent in the checked root, and one
product-evidence `assertion` representative was intentionally preserved. The
refreshed graph now has trusted current-run accounting on the newest active
root, but only over two signatures. The right reading is a narrow measured
duplicate share plus a known producer-side duplicate-bypass risk to recheck as
the active root accumulates a larger denominator, not a broad product
duplicate/noise storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `85.3%` used and root is around `40.9%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,691`. The current enabled group
summary lists `novelty-http-existing-post-crdt-metadata`,
`novelty-http-persistence-probe`, `novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-ws-real-user-coverage-bridge`, and `novelty-ws-parser-transform`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `39` browser/e2e lanes across `36` groups. Lower-level work is
active but narrow: `unit-property`, `coverage-guided-lower-level`, and
`protocol-server` each have one current graph-counted lane.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

The active coverage-guided root, `run-20260522T104926Z`, has current
graph-counted novelty rows for HTTP existing-post CRDT metadata, HTTP
persistence probe, HTTP large-post lifecycle, HTTP large-post lifecycle
completion, and WS parser transform. Current browser/e2e rows also come from
focused, strict-expansion, and gap-booster lanes, including async/server,
long-doc, real-user, three-user late join, revision, parser
transform/serialization, block-gauntlet, common-blocks, multi-reload,
many-user, collaboration UI, same-user lifecycle, same-user stale draft,
permissions/auth/locks, title reload, existing-post CRDT HTTP, and HTTP
lifecycle coverage.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis says to
avoid broad generic lower-level expansion, keep backend/API and protocol/server
as one-lane sentinels, keep unit/property capped, and repair forced browser
materialization/accounting before trusting the mix totals. It also says graph
telemetry can disagree with novelty status and supervisor state, active browser
lanes should require current root, live PID or exact tmux session, active run
dir, and fresh `lanes.json`/`events.ndjson`/`summary.ndjson`, and stale
`fuzz-assertion` rows should count as zero useful capacity. The newest
level-mix feedback-action retargeted the lower-level slot away from generic
HTTP polling toward bounded block-parser serialization and says optional
focused browser backfill was shed under autoscaler `severe_pressure`.
The refreshed graph contradicts the synthesis premise that browser/e2e is
below a `24`-lane floor: the graph has `39` current browser/e2e lanes. It does
not currently show a Code Editor smoke lane, and `code-editor-smoke` still has
only `5` profile records and `0` successful records. The only current
graph-counted coverage-guided lower-level row is rich-text CRDT, and the
current coverage-guided lower-level execution bucket is zero. The refreshed
graph accepts focused-browser and protocol-server telemetry as present, but it
rejects treating backend/API, transport-integration, standalone
fuzz-assertion, or continuous parser/block-parser serialization as current
graph-counted residency.

The latest native-harness synthesis selects parser serialization as the first
isolated Node/V8 coverage-guided harness and cites a productive smoke artifact.
The latest native-harness action implemented and smoke-validated the parser
serialization harness, with one `seed-attempt-complete` and nonzero coverage
keys. That smoke artifact is not yet current graph-counted residency: the
current graph-counted coverage-guided lower-level row remains rich-text CRDT,
and the current coverage-guided lower-level execution bucket is zero. The
level-mix action claims new block-parser lower-level executions should appear;
the refreshed graph does not yet show that as current graph-counted residency.
The latest protocol-server synthesis selects the HTTP polling REST target first,
with the WS-only target deferred as a second surface. The newest protocol action
file is empty, but the prior action implemented and smoke-validated that HTTP
polling harness, kept productive browser fuzzing untouched, and produced a
validation protocol-server row. The graph shows that protocol-server HTTP
polling validation row and protocol-server executions in the latest buckets, so
protocol telemetry is present while long-lived protocol residency remains
admission- and pressure-sensitive.

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
legacy batch-count fields. The latest totals are approximately `78,137`
browser/e2e, `5,686,336` unit-property, `458,097` coverage-guided lower-level,
and `10,497,469` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T11:00:00Z` is partial and has
`38` browser/e2e executions (`152`/hour), `704` unit-property executions
(`2,816`/hour), and `960` protocol-server executions (`3,840`/hour).
Coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The preceding
`2026-05-22T10:45:00Z` bucket had `149` browser/e2e executions
(`596`/hour), `2,848` unit-property executions (`11,392`/hour), and `2,185`
protocol-server executions (`8,740`/hour). The
latest nonzero coverage-guided lower-level bucket remains
`2026-05-21T11:00:00Z` with `2` executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `117` likely-real
findings over about `576.9` runner-hours, or `20.28` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,257`
browser/e2e candidates, `6` unit-property candidates, and `2`
coverage-guided-lower-level candidates. Backend-api, protocol-server,
transport-integration, standalone fuzz-assertion, and other buckets have no
unique candidates in the latest graph-counted data.

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

The latest weak-completion profiles have successful record counts at zero in
the current sample: table stale snapshot HTTP (`4` records), code-editor smoke
(`5` records), and collaboration UI signals (`61` records).
Revision persistence has `4` successful records, parser serialization has `5`,
full-profile rows have `16`, many-user lifecycle has `17`, multi-reload
lifecycle has `35`, common blocks have `39`, long-session large-doc has `39`,
large-post three-user HTTP has `41`, three-user late join has `51`, parser
transform has `68`, async/server blocks have `74`, media cross-entity has
`88`, block-gauntlet has `105`, and permissions/auth/locks has `157`. This
still argues for completion-depth repair in existing covered
surfaces before adding another broad surface class.

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
browser users, lifecycle reloads, save/autosave checkpoints, strict persistence
oracles, and a passed run. Separate ingredient-lane hits do not increment this
cross-product count. The goal-progress graph also includes nearby large-post,
HTTP, and three-user goals so already-running combined-ish lanes remain visible
while the stricter cross-product key ramps up.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is currently marked enabled, and the adjacent large-post
three-user HTTP profile has `433` records seen with `41` successful records.
Those adjacent hits still do not count as completed combined coverage unless
the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. A run only contributes to the active-user
series when distinct browser users actually perform successful editing actions,
not merely when those users are present in the room, and final UI witness-sweep
edits do not count as active-editor evidence. The cross-product rows then
require the same active-editor threshold together with realistic editing
ingredients: save/reload lifecycle, late join, autosave, rich text/list/table
editing, synced notes, collaboration UI signals, large-document setup, HTTP
polling with an explicit client-limit override, same-user tabs, revision
restore, publish transition, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. Notes-lifecycle cross-products are also
`0` at the six- and twelve-active-editor thresholds. The refreshed lifecycle
(late-join plus save/reload/autosave), rich/list, UI-signal, and
large-document cross-product rows remain `0` at the 6/10/12/30 active-editor
thresholds, and the synced-notes rows remain `0` at the 6/12 thresholds. The
six-editor HTTP polling, HTTP client-limit override, same-user-tab,
revision-restore, and publish-transition cross-products are also `0`/`10`.
The new active-editing groups are not currently marked enabled in the sampled
state, so these graphs should remain red until the monitor admits the new six-,
twelve-, and thirty-active-editor lanes and they start producing passed
records.

Largest current unmet goal and active-editing gaps:

| Goal                                                   | Current | Target |
| ------------------------------------------------------ | ------: | -----: |
| successful parser-serialization records                |       5 |     50 |
| successful multi-reload-lifecycle records              |      35 |     50 |
| strict combined HTTP large-post three-user lifecycle   |       0 |     25 |
| successful collaboration-ui-signals records            |       0 |     25 |
| many-user active-editing records                       |       0 |     25 |
| six-active-editor lifecycle cross-product              |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product    |       0 |     25 |
| six-active-editor UI-signal cross-product              |       0 |     25 |
| six-active-editor large-document cross-product         |       0 |     25 |
| remote selection and cursor visible                    |       1 |     25 |
| remote and local autosave checkpoints                  |      11 |     25 |
| local post recovery autosave                           |      11 |     25 |
| successful three-user late-join records                |      18 |     25 |
| async/server block core/template-part                  |       0 |     20 |
| twelve-active-editor progress                          |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product |       0 |     10 |
| HTTP client-limit override for active editing          |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product |       0 |     10 |
| six-active-editor revision-restore cross-product       |       0 |     10 |
| six-active-editor publish-transition cross-product     |       0 |     10 |
| table stale snapshot oracle                            |       0 |     10 |
| successful large-post HTTP records with three users    |       1 |     10 |
| action replace-code-editor-content                     |       5 |     10 |
| thirty-active-editor progress                          |       0 |      3 |

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

The current controller state has `21` distinct work items in `27` current rows.
The most important live queue entries are `5` high-priority ready-product PR
rows held by the controller, `13` published ready-product rows still under
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

The current push manifest is empty, so there are no graph-counted publishable
branch rows in this snapshot. Published and held branches are still visible in
the progress table. The latest PR-split persona feedback rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and
owner rows. Cycle 446 applied that split state and launched one bounded
strict-head repair job for `8fb598778357` / seed `6000007`; its report was
still pending in the copied persona evidence.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: two active blockers
(`seed-5200005-reducer` and `reload-hydration`), one queued blocker
(`pr07c-owner-matrix`), one runnable blocker (`productive-analysis-action`),
and three terminal/downscoped blockers
(`benchmark-canary-fuzzer-gap`, `PR17` seed `1020002`, and
`seed-1060015-reducer`). The current job queue has PR07C owner-matrix queued,
seed `5200005` reducer and reload-hydration adopted as active jobs,
benchmark-canary terminal with fresh exact-stack green evidence, and
productive-analysis runnable. The repeated no-progress table
currently has two `benchmark-canary-fuzzer-gap` rows:
`zero_executor_artifact` and `pre_oracle_or_preflight_only`.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the current
coverage-guided root, resource samples, PR-focused raw inputs, and the standard
persona-loop outputs. The active coverage root is `run-20260522T104926Z`, and
its latest accounting row is trusted. The live row was sampled at
`2026-05-22T11:04:54Z` with `full_pass_pending`
`FALSE`, `pending_until_first_pass` `FALSE`, and
`current_run_metrics_trusted` `TRUE`. The latest row reports current-output-dir
`duplicateShareCurrent` `0.5` with summary startup failures `0`, over only
`2` current-run signatures, `2` actionable signatures, and `2`
product-evidence signatures. That measured row is still too small a denominator
to call a broad duplicate storm.

The duplicate/noise persona synthesis still matters because it rejects a
product-bug reading and points at a plausible producer-side control-plane leak:
benchmark-canary/P0 producers can keep bypassing duplicate holds after a
current-run product-evidence representative exists. The latest duplicate/noise
feedback-action file is empty, while the latest non-empty action says the
bounded monitor fix was applied and one product-evidence representative was
preserved. The graph and persona evidence agree that the latest sample should
not be interpreted as a broad product duplicate storm. The latest graph row is
trusted but tiny-denominator accounting, and the synthesis remains evidence of
a producer-side control-plane risk that should be rechecked as the active run
builds more current-run signatures.

The resource picture is usable but still pressure-sensitive. Latest CPU
utilization is `61.26%`, with `3.27%` iowait; load is `74.26`, `57.84`, and
`50.96` on `64` logical CPUs, with `2` blocked tasks. The graph-counted fuzzing
mix is browser/e2e-heavy: `39` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted
useful capacity unless roots, sessions, PIDs, events, and summaries reconcile.
The refreshed graph confirms current HTTP rows and protocol-server telemetry.
It contradicts the level-mix synthesis premise that browser/e2e is below a
`24`-lane floor, because the graph has `39` current browser/e2e lanes. It does
not currently show a Code Editor smoke lane, and that profile still has only
`5` records and `0` successes. It has no backend/API lane, no backend/API
execution count, no transport-integration lane, no standalone fuzz-assertion
row, no continuous parser/block-parser lower-level row, and zero current-bucket
coverage-guided lower-level executions. The native-harness and level-mix actions
did implement and smoke-validate parser/block-parser lower-level work, but those
artifacts are not yet reflected as current graph-counted lower-level residency.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T11:00:00Z` bucket has `38` browser/e2e executions, `704`
unit-property executions, and `960` protocol-server executions. The preceding
`2026-05-22T10:45:00Z` bucket shows `149` browser/e2e executions, `2,848`
unit-property executions, and `2,185` protocol-server executions. Lower-level
counts remain approximate where
reconstructed from batch metadata or legacy batch-count fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. The PR loop still needs
to convert held ready-product rows, the queued PR07C owner matrix, active
reload-hydration work, the active seed `5200005` reducer, and runnable
productive-analysis feedback into validated publishable branches rather than
more blocked or no-progress artifacts. Benchmark-canary is terminal for now
because current feedback has fresh exact-stack green evidence.
