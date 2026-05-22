# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T06:54:02Z`

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
For blocker diagnosis, use the PR blocker/stall event timeline together with
the current blocker-state plots: the timeline shows when controller stalls and
critical-path launches cluster, while the current-state plots show what is
blocked now and why.

## High-Level Readout

The monitor data is current through `2026-05-22T06:40:28Z`, and the latest
current-run accounting row was sampled at `2026-05-22T06:45:26Z` for
`run-20260522T064303Z`. That row is not trusted yet:
`current_run_metrics_trusted` is `FALSE`, `pending_until_first_pass` is `TRUE`,
and `full_pass_pending` is `TRUE`. The latest completed monitor pass is
`2026-05-22T06:40:28Z`. The monitor has `3,927` passes from
`2026-05-15T01:21:42Z` onward. Cumulative coverage record observations are
`276,110`; current-scan coverage files are `1,266`. The parsed coverage-goal
table has `20` unmet target rows out of `136`.

The live duplicate/noise signal is current-output-dir accounting. Because the
active current run is first-pass pending, the current-run
signature/actionable-signature/product-evidence denominators are not available
in the refreshed CSV: `NA`/`NA`/`NA`. The latest completed monitor pass reports
`duplicateShareCurrent` `1` and summary startup failures `0`, but that live
duplicate/noise share is incomplete current-run accounting until the active run
finishes a full pass. Treat it as a control-plane health issue, not as a
measured product duplicate storm. Historical duplicate share is `0.1034` for
context only; it is not the plotted live health signal.

The latest duplicate/noise synthesis still rejects a product-bug or broad
duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak around no-product startup failures. The latest
feedback-action file is empty; the latest non-empty feedback-action says the
bounded producer-side filter was applied in the novelty monitor. The refreshed
current row is untrusted because the active run has not completed its first full
pass, so this report treats the duplicate/noise graph as pending accounting and
keeps the producer/scheduler leak as the live control-plane watchpoint.

Resource state is usable but pressure-sensitive. The latest monitor sample has
`404G` free memory; the latest disk sample has `91.2GiB` free on `/` and
`575.6GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`65.22%`, with `7.07%` iowait. Latest load averages are `56.96`, `52.58`, and
`52.70` on `64` logical CPUs, with `3` blocked tasks in the same sample.

The latest graph-counted fuzzing mix has `26` browser/e2e lanes across `26`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing remains concentrated
in browser/e2e. The active coverage-guided root has four current
graph-counted browser rows: HTTP large-post lifecycle, HTTP title reload, HTTP
existing-post CRDT, and HTTP persistence. Current graph rows also include
focused/strict/gap browser lanes with HTTP title reload, existing-post CRDT,
persistence, same-user stale draft, large HTTP lifecycle, real-user, revision,
parser, block-gauntlet, async/server, permissions, common-blocks,
multi-reload, many-user, collaboration UI, three-user late join, and
long-session coverage.
Current graph-counted lower-level work is still narrow: one rich-text CRDT
unit/property lane, the old rich-text CRDT coverage-guided lower-level lane,
and a protocol-server HTTP polling sentinel. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane. This partly contradicts the latest level-mix feedback,
which says backend/API and protocol/server sentinels were started and should
show fresh rows: the graph confirms protocol-server publication but not
backend/API publication.

The execution counter has `16,620,074` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest 15-minute bucket
at `2026-05-22T06:45:00Z` is partial and has `109` browser/e2e executions,
`192` unit-property executions, and `270` protocol-server executions, about
`436`/hour, `768`/hour, and `1,080`/hour. Coverage-guided lower-level,
backend-api, transport-integration, and fuzz-assertion are zero in that latest
bucket. The preceding `2026-05-22T06:30:00Z` bucket had `1,450` browser/e2e
executions, `2,048` unit-property executions, and `1,710` protocol-server
executions. The latest nonzero protocol-server bucket is now the
`2026-05-22T06:45:00Z` bucket. The latest
nonzero coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with
`2` executions.

The PR-focused data is live. The controller table still has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` runtime-held
consumed row, and deferred-family reload-hydration and pre-save/search
families represented by multiple current evidence rows. The current push
manifest is empty. The critical-path executor has `7` blockers: `2` runnable,
`1` active, `1` queued, `1` held, and `2` terminal/downscoped blockers. The
latest PR-split feedback keeps the fileable prefix through `PR15C` and rejects
`PR16-RLH` as
fileable until strict seed `6000007` reaches the final persistence oracle and
owner rows prove it.

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
`run-20260522T064303Z` was taken at `2026-05-22T06:45:26Z` with
`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`, and
`full_pass_pending` `TRUE`. The active current-run signature,
actionable-signature, and product-evidence denominators are `NA`/`NA`/`NA` in
the refreshed CSV. The latest completed monitor pass was at
`2026-05-22T06:40:28Z` and reports completed-pass duplicate share `1`, with
summary startup failures `0`. Read that as incomplete current-run accounting
while the new active run is pending, not as a historical aggregate
duplicate/noise rate or a broad product duplicate storm. The prior trusted row
for `run-20260522T055342Z` had `0`/`0`/`0` denominators and duplicate share
`0`.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says strict `pre_action_bootstrap_stall`
noise is mostly suppressed by triage and analysis consumers, but producer and
scheduler paths can still keep or re-materialize no-product startup groups
through short supervisor cooldowns, novelty/materialization floors, forced
publication, and inconsistent current-run scoping. The latest feedback-action
file is empty. The latest non-empty feedback-action says the novelty monitor
now blocks no-product `pre_action_bootstrap_stall` holds from benchmark-canary
and success-deficit producer publication unless the same group has current-run
product evidence, while product-evidence representatives remain preserved. The
newest accounting row is not trusted yet because the new active run is
first-pass pending. That supports treating the graph as an accounting
completeness warning while the bounded producer-side remediation remains the
risk to watch if no-product startup groups re-enter the current output
directory.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `83.8%` used and root is around `40.7%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,670`. The current enabled group
summary lists `novelty-http-large-post-lifecycle`,
`novelty-http-title-reload-convergence`,
`novelty-http-existing-post-crdt-metadata`, and
`novelty-http-persistence-probe`. The latest parsed enabled-group event
refreshed `novelty-ws-real-user-rich-text` at `2026-05-22T06:18:18Z`; the
previous events refreshed `novelty-http-title-reload-convergence` and
`novelty-ws-real-user-coverage-bridge` at `2026-05-22T06:08:48Z`.
Historical enabled events cover parser serialization and parser transform, WS
multi-reload lifecycle, thirty-user and many-user lifecycle variants, HTTP
large-post lifecycle, real-user editing and rich-text bridges,
async-server-blocks bridges, permissions/auth/locks, media cross-entity,
same-user lifecycle, HTTP table stale snapshots, block-gauntlet,
revision/autosave/recovery, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `26` browser/e2e lanes across `26` groups. Lower-level work is
active but narrow: `unit-property`, `coverage-guided-lower-level`, and
`protocol-server` each have one current graph-counted lane. The active
coverage-guided root, `run-20260522T064303Z`, has current graph-counted novelty
rows for HTTP large-post lifecycle, HTTP title reload, HTTP existing-post CRDT,
and HTTP persistence-probe. Current
browser/e2e rows also come from focused, strict-expansion,
and gap-booster lanes, including HTTP title reload, HTTP existing-post CRDT,
HTTP persistence-probe, HTTP same-user stale draft, large HTTP lifecycle,
real-user, revision, parser, block-gauntlet, common-blocks, async/server,
permissions, multi-reload, many-user, collaboration UI, three-user late join,
and long-session coverage. The graph-counted lower-level targets are rich-text
CRDT unit/property and the old rich-text CRDT coverage-guided smoke row; HTTP
polling is present as a `protocol-server` lane. `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current graph-counted
lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The newest level-mix synthesis rejects
broad generic lower-level expansion, recommends validating protected HTTP rows
first, and says protocol/server should be restored or zero-accounted rather
than inferred from adjacent artifacts. The latest feedback-action file is
empty; the latest non-empty feedback-action says backend/API and protocol/server
sentinels were started and should show fresh rows. The committed graph data
supports only part of that: it shows current browser/e2e HTTP rows, a
protocol-server HTTP polling row, and the old rich-text CRDT lower-level smoke
row, but no backend/API lane, standalone fuzz-assertion lane, or restarted
parser-serialization lower-level lane. This report treats the graph as
publication telemetry and the persona
evidence as the capacity-quality check.

The latest native-harness synthesis selects parser serialization as the first
isolated Node/V8 coverage-guided harness. The latest action implemented and
smoke-validated that parser-only lower-level harness, but the current
graph-counted coverage-guided lower-level row remains rich-text CRDT, not a
continuous parser serialization lane. The latest non-empty protocol synthesis
selects HTTP polling REST over the WebSocket/Yjs relay as the ready v1
protocol/server harness. The latest protocol action implemented and validated
the HTTP polling harness with `25` cases in
`validation-protocol-server-action-20260522T061113Z`. The graph now shows a
`level-mix-protocol-server-sentinel-relaunch-20260522T063843Z` HTTP polling row
with `270` protocol-server executions in the partial
`2026-05-22T06:45:00Z` bucket and `1,710` executions in the preceding
`2026-05-22T06:30:00Z` bucket, after zero protocol executions in the
`2026-05-22T06:15:00Z` bucket. Protocol telemetry is present, but long-lived
protocol residency is still pressure-sensitive.

Fuzz-only assertion work is not graph-counted as active. The latest assertion
action added two gated assertions; level-mix feedback still treats the
fuzz-assertion loop as held/stale.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `63,529`
browser/e2e, `5,641,440` unit-property, `458,097` coverage-guided lower-level,
and `10,457,008` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T06:45:00Z` is partial and has `109`
browser/e2e executions (`436`/hour), `192` unit-property executions
(`768`/hour), and `270` protocol-server executions (`1,080`/hour).
Coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The preceding
`2026-05-22T06:30:00Z` bucket had `1,450` browser/e2e executions
(`5,800`/hour), `2,048` unit-property executions (`8,192`/hour), and `1,710`
protocol-server executions (`6,840`/hour). The latest nonzero
coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with `2`
executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `111` likely-real
findings over about `528.1` runner-hours, or `21.02` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,216`
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
the current sample: collaboration UI signals and table stale snapshot HTTP.
Parser serialization has `5` successful records. Revision persistence has
`4` successful records, multi-reload lifecycle has `8`, full-profile rows have
`16`, many-user lifecycle has `17`, three-user late join has `29`, common
blocks have `37`, large-post three-user HTTP has `39`, long-session large-doc
has `39`, parser transform has `68`, async/server blocks have `74`, media
cross-entity has `76`, permissions/auth/locks has `104`, and block-gauntlet has
`105`. This still argues for completion-depth repair in existing covered
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
combined group is enabled, and the adjacent large-post three-user HTTP profile
has `305` records seen with `39` successful records; those adjacent hits still
do not count as completed combined coverage unless the strict feature key
records the whole conjunction.

Largest current unmet goal gaps:

| Goal                                                     | Current | Target |
| -------------------------------------------------------- | ------: | -----: |
| successful parser-serialization records                  |       5 |     50 |
| successful multi-reload-lifecycle records                |       8 |     50 |
| successful collaboration-ui-signals records              |       0 |     25 |
| remote selection and cursor visible                      |       1 |     25 |
| successful three-user late-join records                  |       2 |     25 |
| async/server block core/template-part                    |       0 |     20 |
| remote and local autosave checkpoints                    |       5 |     25 |
| local post recovery autosave                             |       5 |     25 |
| table stale snapshot oracle                              |       0 |     10 |
| successful twelve-user documents                         |       0 |     10 |
| successful twelve-user late join documents               |       0 |     10 |
| successful many-user lifecycle records with twelve users |       0 |     10 |
| successful table-stale-snapshot-http records             |       0 |     10 |
| successful large-post HTTP records with three users      |       2 |     10 |
| action table-stale-snapshot-html                         |       4 |     10 |
| table stale snapshot over HTTP                           |       4 |     10 |
| successful thirty-user documents                         |       0 |      3 |
| successful thirty-user late join documents               |       0 |      3 |
| successful many-user lifecycle records with thirty users |       0 |      3 |
| successful three-user large documents                    |       2 |      5 |

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

The current controller state has `21` distinct work items. The most important
live queue entries are `5` high-priority ready-product PR rows held by the
controller, `13` published ready-product rows still under validation, `1`
high-priority runtime-held consumed row, and deferred-family reload-hydration
plus pre-save/search rows represented by multiple current evidence rows.

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

The critical-path executor has `7` blockers: one active exact-stack blocker
(`benchmark-canary-fuzzer-gap`), two runnable blockers
(`productive-analysis-action` and `seed-5200005-reducer`), one queued blocker
(`pr07c-owner-matrix`), one held blocker (`reload-hydration`), and two
terminal/downscoped blockers (`PR17` seed `1020002` and
`seed-1060015-reducer`). The repeated no-progress table has one current row
for `benchmark-canary-fuzzer-gap`: `zero_executor_artifact` with `1`
rejection.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the current
coverage-guided root, resource samples, PR-focused raw inputs, and the standard
persona-loop outputs. The active coverage root is `run-20260522T064303Z`, and
its latest current-run duplicate/noise accounting is not trusted yet. The live
row was sampled at `2026-05-22T06:45:26Z` with `full_pass_pending` `TRUE`,
`pending_until_first_pass` `TRUE`, and `current_run_metrics_trusted` `FALSE`.
Current-run signature/actionable-signature/product-evidence denominators are
`NA`/`NA`/`NA` in the refreshed CSV. The latest completed monitor pass reports
`duplicateShareCurrent` `1` and summary startup failures `0`; read that as
incomplete current-run accounting and a control-plane health issue until the
active run completes a full pass, not as a historical aggregate duplicate/noise
signal or a broad product duplicate storm.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm reading. It says strict startup stalls are mostly suppressed by
triage/analysis consumers, but supervisor and novelty producer paths can still
keep or re-materialize no-product startup groups through cooldown,
materialization-floor, forced-publication, and current-run scoping gaps. The
latest feedback-action file is empty; the latest non-empty feedback-action says
the novelty monitor blocks no-product startup holds from benchmark-canary and
success-deficit producer publication unless the same group has current-run
product evidence. Product-evidence representatives remain preserved. The graph
and persona evidence still point at a narrow control-plane interpretation; the
newest row is untrusted because the active run has not completed its first full
pass, so the duplicate/noise graph is an accounting completeness warning while
the producer-side leak remains the thing to watch if startup noise reappears.

The resource picture is usable but still pressure-sensitive. Latest CPU
utilization is `65.22%`, with `7.07%` iowait; load is `56.96`, `52.58`, and
`52.70` on `64` logical CPUs, with `3` blocked tasks. The graph-counted fuzzing
mix is browser/e2e-heavy: `26` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted
useful capacity unless roots, sessions, PIDs, events, and summaries reconcile.
The newest level-mix synthesis rejects broad lower-level expansion, recommends
validating protected HTTP rows first, and says protocol/server should be
restored or zero-accounted rather than inferred from adjacent artifacts. The
latest level-mix feedback-action file is empty; the latest non-empty action says
backend/API and protocol/server
sentinels were started and expected to show fresh rows; the refreshed graph
confirms a fresh protocol-server relaunch row but still has no backend/API
lane. The graph also has no transport-integration lane, no standalone
fuzz-assertion row, and zero current-bucket coverage-guided lower-level
executions. Treat those gaps as unresolved telemetry/restart work rather than
proof that all feedback-reported work is contributing current graph capacity.

The parser serialization lower-level harness is implemented and smoke-validated
by the latest persona action, but it is not yet the current graph-counted
continuous coverage-guided lower-level lane. The latest protocol synthesis file
with content selects HTTP polling REST as the ready v1 protocol/server harness.
The latest protocol action implemented and smoke-validated it in
`validation-protocol-server-action-20260522T061113Z`. The graph records a fresh
protocol-server HTTP polling relaunch row with `270` executions in the partial
`2026-05-22T06:45:00Z` bucket and `1,710` executions in the preceding
`2026-05-22T06:30:00Z` bucket, after zero protocol executions in the
`2026-05-22T06:15:00Z` bucket. Protocol telemetry is present, but long-lived
protocol residency is still pressure-sensitive.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T06:45:00Z` bucket has `109` browser/e2e executions, `192`
unit-property executions, and `270` protocol-server executions, with zero
coverage-guided lower-level executions. That is about `436` browser/e2e
executions/hour, `768` unit-property executions/hour, and `1,080`
protocol-server executions/hour. The preceding `2026-05-22T06:30:00Z` bucket
had about `5,800` browser/e2e executions/hour, `8,192` unit-property
executions/hour, and `6,840` protocol-server executions/hour. Coverage-guided
lower-level's latest nonzero graph-counted bucket remains
`2026-05-21T11:00:00Z` with `2` executions. Lower-level counts remain
approximate where reconstructed from batch metadata or legacy batch-count
fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. Cycle 446 launched one
bounded repair job for that strict-head proof, but the copied evidence still
had the report pending. The PR loop still needs to convert held ready-product
rows, the queued PR07C owner matrix, held reload-hydration work, runnable
productive-analysis feedback, the seed `5200005` reducer, and the active
benchmark-canary exact-stack gate into validated publishable branches rather
than more blocked or no-progress artifacts.
