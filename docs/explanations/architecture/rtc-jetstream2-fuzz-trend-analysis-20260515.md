# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T05:02:16Z`

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

The monitor data is current through `2026-05-22T04:43:11Z`, and the latest
current-run accounting row was sampled at `2026-05-22T05:00:25Z` for
`run-20260522T045104Z`. That row is still startup/full-pass pending: the
monitor reports `full coverage pass pending`, `current_run_metrics_trusted` is
`FALSE`, `pending_until_first_pass` is `TRUE`, and `full_pass_pending` is
`TRUE`. The monitor has `3,918` passes from `2026-05-15T01:21:42Z` onward.
Cumulative coverage record observations are `275,654`; current-scan coverage
files are `1,166`. The parsed coverage-goal table has `21` unmet target rows
out of `136`.

Current-output-dir duplicate/noise accounting is incomplete for the latest
active root, so the live duplicate/noise row is a control-plane health issue
until that root completes a full pass. The latest row carries
`duplicateShareCurrent` `1` and summary startup failures `0`, but current-run
signature/actionable-signature/product-evidence denominators are `NA` while
the pass is pending. The last trusted completed row, sampled at
`2026-05-22T04:44:41Z` for `run-20260522T041414Z`, had denominators
`1`/`1`/`1` and top duplicate share `1`. That prior denominator means one
duplicate/actionable/product-evidence signature, not a broad duplicate storm.
Historical duplicate share is `0.2414` for context only; it is not the plotted
live health signal.

The latest duplicate/noise synthesis still rejects a product-bug or broad
duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak around no-product startup failures. The latest
feedback-action file is empty; the latest non-empty feedback-action says the
bounded producer-side filter was applied in the novelty monitor. The newest
active row is not trusted yet, so it should be read as pending current-run
accounting rather than a measured product duplicate/noise rate.

Resource state is usable but still pressure-sensitive. The latest monitor
sample has `414.5G` free memory; the latest disk sample has `91.1GiB` free on
`/` and `371.8GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU
utilization is `41.38%`, with `6.35%` iowait. Latest load averages are
`32.09`, `33.66`, and `32.86` on `64` logical CPUs, with `1` blocked task in
the same sample.

The latest graph-counted fuzzing mix has `28` browser/e2e lanes across `28`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing remains concentrated
in browser/e2e. The active coverage-guided root now includes HTTP
title reload convergence, existing-post CRDT metadata, HTTP persistence-probe,
large-post lifecycle, large-post lifecycle completion, and WS many-user
lifecycle completion rows. Current graph rows also include
focused/strict/gap browser lanes with more HTTP persistence, same-user stale
draft, real-user, revision, parser, block-gauntlet, async/server, permissions,
common-blocks, and long-session coverage.
Current graph-counted lower-level work is still narrow: the table-query-array
CRDT unit/property lane, the old rich-text CRDT coverage-guided lower-level
lane, and a protocol-server HTTP polling sentinel. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane. This partly contradicts the latest level-mix feedback,
which says backend/API and protocol/server sentinels were started and should
show fresh rows: the graph confirms protocol-server publication but not
backend/API publication.

The execution counter has `16,621,031` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest 15-minute bucket
at `2026-05-22T05:00:00Z` is partial and has `6` browser/e2e executions and
`32` unit-property executions, about `24`/hour and `128`/hour, with
protocol-server at zero in that bucket. Coverage-guided lower-level,
backend-api, transport-integration, and fuzz-assertion are also zero in that
bucket. The preceding `2026-05-22T04:45:00Z` bucket had `59` browser/e2e
executions, `704` unit-property executions, and no protocol-server executions;
the latest nonzero protocol-server bucket was `2026-05-22T04:30:00Z` with `25`
executions.

The PR-focused data is live. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` high-priority
deferred-family product-decision row, `1` medium-priority deferred-family
diagnostic row, and `1` high-priority runtime-held consumed row.
The current push manifest is empty. The critical-path executor has `7`
blockers: `1` runnable blocker, `2` active blockers, `2` queued blockers, and
`2` terminal/downscoped blockers. The latest PR-split feedback keeps the
fileable prefix through `PR15C` and rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.

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
not be read as a measured product duplicate/noise rate. The latest sample for
`run-20260522T045104Z` was taken at `2026-05-22T05:00:25Z` with
`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`, and
`full_pass_pending` `TRUE`. The latest row carries current-output-dir
duplicate share `1` and summary startup failures `0`, but current-run
signature/actionable-signature/product-evidence denominators are `NA` until
the first full pass completes. Treat this as incomplete current-run accounting
and a control-plane health issue, not as a measured product duplicate/noise
rate. The last trusted completed row was `run-20260522T041414Z` at
`2026-05-22T04:44:41Z`; it had denominators `1`/`1`/`1` and top duplicate share
`1`, so that prior high share was one signature, not a broad duplicate storm.

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
newest active row is still pending a full pass, so it neither confirms a
product duplicate rate nor invalidates the bounded producer-side remediation.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `89.5%` used and root is around `40.8%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,660`. The current enabled group
summary lists `novelty-http-title-reload-convergence`,
`novelty-http-existing-post-crdt-metadata`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`, and
`novelty-ws-many-user-lifecycle-completion`. The latest parsed enabled-group
events refreshed HTTP existing-post CRDT metadata, persistence-probe,
large-post lifecycle, and large-post lifecycle completion at
`2026-05-22T04:48:39Z`.
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
browser/e2e: `28` browser/e2e lanes across `28` groups. Lower-level work is
active but narrow: `unit-property`, `coverage-guided-lower-level`, and
`protocol-server` each have one current graph-counted lane. The active
coverage-guided root, `run-20260522T045104Z`, has current novelty rows for HTTP
title reload convergence, HTTP existing-post CRDT metadata, HTTP
persistence-probe, HTTP large-post lifecycle, HTTP large-post lifecycle
completion, and WS many-user lifecycle completion. Current
browser/e2e rows also come from focused, strict-expansion, and gap-booster
lanes, including HTTP title reload, HTTP existing-post CRDT,
HTTP persistence-probe, HTTP same-user stale draft, large HTTP lifecycle,
real-user, revision, parser, block-gauntlet, common-blocks, async/server,
permissions, and long-session coverage. The graph-counted lower-level targets are
table-query-array CRDT and the old rich-text CRDT smoke row; HTTP polling is
present as a `protocol-server` lane.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The newest level-mix synthesis rejects
broad lower-level expansion, recommends validating protected HTTP rows first,
and says any new capacity should be a narrow browser/e2e HTTP product-bug lane
if admission allows it. The latest feedback-action says backend/API and
protocol/server sentinels were started and should show fresh rows. The
committed graph data supports only part of that: it shows current browser/e2e
HTTP rows, a protocol-server HTTP polling row, and the old rich-text CRDT
lower-level smoke row, but no backend/API lane, standalone fuzz-assertion lane,
or restarted lower-level HTTP polling lane. This report treats the graph as
publication telemetry and the persona evidence as the capacity-quality check.

The latest native-harness synthesis selects parser serialization as the first
isolated Node/V8 coverage-guided harness. The latest action implemented and
smoke-validated that parser-only lower-level harness, but the current
graph-counted coverage-guided lower-level row remains rich-text CRDT, not a
continuous parser serialization lane. The latest non-empty protocol synthesis
selects HTTP polling REST over the WebSocket/Yjs relay as the ready v1
protocol/server harness. The latest non-empty protocol action implemented and
validated the HTTP polling harness with `25` cases in
`validation-protocol-server-action-20260522T043018Z`. The graph shows a
protocol-server HTTP polling sentinel. It has `25` executions in the
`2026-05-22T04:30:00Z` bucket, after `25` executions in the `04:15` bucket,
`240` in the `04:00` bucket, and `2,220` in the `03:45` bucket, so long-lived
protocol residency remains pressure-sensitive even though the latest smoke is
now represented in graph telemetry.

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
legacy batch-count fields. The latest totals are approximately `75,821`
browser/e2e, `5,632,160` unit-property, `458,097` coverage-guided lower-level,
and `10,454,953` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T05:00:00Z` is partial and has `6`
browser/e2e executions (`24`/hour), `32` unit-property executions
(`128`/hour), and no protocol-server executions. Coverage-guided lower-level,
backend-api, transport-integration, and fuzz-assertion are also zero in that
bucket. The preceding `2026-05-22T04:45:00Z` bucket had `59` browser/e2e
executions (`236`/hour), `704` unit-property executions (`2,816`/hour), and no
protocol-server executions. The latest nonzero protocol-server bucket was
`2026-05-22T04:30:00Z` with `25` executions (`100`/hour). The latest
graph-counted nonzero coverage-guided lower-level bucket remains
`2026-05-21T11:00:00Z` with `2` executions, about `8`/hour.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `214` likely-real findings
over about `868.7` runner-hours, or `24.64` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,946`
browser/e2e candidates, `6` unit-property candidates, `2`
coverage-guided-lower-level candidates, and `1` transport-integration
candidate. Backend-api, protocol-server, standalone fuzz-assertion, and other
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

The latest weak-completion profiles have successful record counts at zero in
the current sample: collaboration UI signals and table stale snapshot HTTP.
Parser serialization now has `3` successful records. Revision persistence has
`4` successful records, multi-reload lifecycle has `8`, full-profile rows have
`16`, many-user lifecycle has `17`, three-user late join has `25`, common
blocks have `34`, large-post three-user HTTP has `38`, long-session large-doc
has `39`, parser transform has `50`, async/server blocks have `74`, media
cross-entity has `76`, permissions/auth/locks has `99`, and block-gauntlet has
`96`. This still argues for completion-depth repair in existing covered
surfaces before adding another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful parser-serialization records | 3 | 50 |
| successful multi-reload-lifecycle records | 8 | 50 |
| successful collaboration-ui-signals records | 0 | 25 |
| successful three-user late-join records | 0 | 25 |
| remote selection and cursor visible | 1 | 25 |
| async/server block core/template-part | 0 | 20 |
| local post recovery autosave | 5 | 25 |
| remote and local autosave checkpoints | 5 | 25 |
| successful many-user lifecycle records with twelve users | 0 | 10 |
| successful twelve-user documents | 0 | 10 |
| successful twelve-user late join documents | 0 | 10 |
| successful table-stale-snapshot-http records | 0 | 10 |
| table stale snapshot oracle | 0 | 10 |
| successful large-post HTTP records with three users | 1 | 10 |
| successful same-user tab documents | 17 | 25 |
| action table-stale-snapshot-html | 4 | 10 |
| table stale snapshot over HTTP | 4 | 10 |
| successful three-user large documents | 1 | 5 |
| successful many-user lifecycle records with thirty users | 0 | 3 |
| successful thirty-user documents | 0 | 3 |
| successful thirty-user late join documents | 0 | 3 |

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
high-priority deferred-family product-decision row, `1` medium-priority
deferred-family diagnostic row, and `1` high-priority runtime-held consumed
row.

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

The critical-path executor has `7` blockers: one runnable blocker
(`productive-analysis-action`), two active blockers
(`benchmark-canary-fuzzer-gap` and `seed-5200005-reducer`), two queued blockers
(`pr07c-owner-matrix` and `reload-hydration`), and two terminal/downscoped
blockers (`PR17` seed `1020002` and `seed-1060015-reducer`). The repeated
no-progress table has current rows for `benchmark-canary-fuzzer-gap`
(`zero_executor_artifact` with `3` rejections) and `seed-5200005-reducer`
(`zero_executor_artifact` with `1` rejection).

## Interpretation

The graph-refresh pipeline is current again: the collector brings in the
current coverage-guided root, resource samples, PR-focused raw inputs, and the
standard persona-loop outputs. The active coverage root is
`run-20260522T045104Z`, and its latest current-run duplicate/noise accounting
is not trusted yet because the first full pass is pending. The live row was
sampled at `2026-05-22T05:00:25Z` with `current_run_metrics_trusted` `FALSE`,
`pending_until_first_pass` `TRUE`, and `full_pass_pending` `TRUE`.
Current-output-dir `duplicateShareCurrent` is `1` and summary startup failures
are `0`, but the current-run signature/actionable-signature/product-evidence
denominators are `NA`. Read this as incomplete current-run accounting and a
control-plane health issue until the active root completes a full pass, not as
a historical aggregate duplicate/noise rate or a measured product duplicate
storm. The prior trusted completed root had a one-signature denominator.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm reading. It says strict startup stalls are mostly suppressed by
triage/analysis consumers, but supervisor and novelty producer paths can still
keep or re-materialize no-product startup groups through cooldown,
materialization-floor, forced-publication, and current-run scoping gaps. The
latest feedback-action file is empty; the latest non-empty feedback-action says
the novelty monitor blocks no-product startup holds from benchmark-canary and
success-deficit producer publication unless the same group has current-run
product evidence. Product-evidence representatives remain preserved. The graph
and persona evidence still point at a control-plane interpretation: the persona
reports identify the producer-side leak and applied a bounded filter, while
the refreshed active row is pending and cannot yet be used as a measured
product duplicate/noise rate.

The resource picture is usable but still pressure-sensitive. Latest CPU
utilization is `41.38%`, with `6.35%` iowait; load is `32.09`, `33.66`, and
`32.86` on `64` logical CPUs, with `1` blocked task. The graph-counted fuzzing
mix is browser/e2e-heavy: `28` browser/e2e lanes, plus
one lane each for unit-property, coverage-guided lower-level, and
protocol-server. Persona evidence is stricter than the graph and rejects raw
row counts as trusted useful capacity unless roots, sessions, PIDs, events, and
summaries reconcile. The newest level-mix synthesis rejects broad lower-level
expansion and recommends validating protected HTTP rows before adding at most
one focused browser/e2e HTTP product-bug lane. The active coverage-guided root
includes HTTP title reload convergence, existing-post CRDT metadata, HTTP
persistence-probe, large-post lifecycle, large-post lifecycle completion, and
WS many-user lifecycle completion. The latest level-mix feedback-action says
backend/API and protocol/server sentinels were started and expected to show
fresh rows; the refreshed graph confirms protocol-server publication but still
has no backend/API lane. The same persona evidence still
rejects broad lower-level expansion and stale exact-session counts. The graph
has no transport-integration lane, no standalone fuzz-assertion row, and zero
current-bucket coverage-guided lower-level executions. Treat those gaps as
unresolved telemetry/restart work rather than proof that all feedback-reported
work is contributing current graph capacity.

The parser serialization lower-level harness is implemented and smoke-validated
by the latest persona action, but it is not yet the current graph-counted
continuous coverage-guided lower-level lane. The latest protocol synthesis file
with content selects HTTP polling REST as the ready v1 protocol/server harness,
and the latest non-empty action implemented and smoke-validated it in
`validation-protocol-server-action-20260522T043018Z`. The graph records a
protocol-server HTTP polling sentinel, with `25` executions in the
`2026-05-22T04:30:00Z` bucket after `25` executions in the `04:15` bucket,
`240` in the `04:00` bucket, and `2,220` in the `03:45` bucket. The previous
missing protocol sentinel is reconciled for graph telemetry, but long-lived
protocol residency is still pressure-sensitive.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T05:00:00Z` bucket is partial and has `6` browser/e2e executions,
`32` unit-property executions, no protocol-server executions, and
coverage-guided lower-level at zero. The preceding `2026-05-22T04:45:00Z`
bucket had about `236` browser/e2e executions/hour and `2,816` unit-property
executions/hour. The latest nonzero protocol-server bucket was
`2026-05-22T04:30:00Z` with `25` executions, about `100`/hour.
Coverage-guided lower-level's latest nonzero graph-counted bucket remains
`2026-05-21T11:00:00Z` with `2` executions. Lower-level counts remain
approximate where reconstructed from batch metadata or legacy batch-count
fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. Cycle 446 launched one
bounded repair job for that strict-head proof, but the copied evidence still
had the report pending. The PR loop still needs to convert held ready-product
rows, the queued PR07C owner matrix, queued reload-hydration work, runnable
productive-analysis feedback, the active benchmark-canary exact-stack gate,
and the active seed `5200005` reducer into validated publishable branches
rather than more blocked or no-progress artifacts.
