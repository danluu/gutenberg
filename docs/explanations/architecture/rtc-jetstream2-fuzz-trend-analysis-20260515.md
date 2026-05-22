# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T02:35:39Z`

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

The monitor data is current through `2026-05-22T02:23:41Z`, and the latest
current-run accounting row was sampled at `2026-05-22T02:34:06Z` for
`run-20260522T022632Z` while its first full coverage pass was still pending. The
monitor has `3,909` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `275,119`; current-scan coverage files are
`1,252`. The parsed coverage-goal table has `27` unmet target rows out of
`136`.

Current-output-dir duplicate/noise accounting is incomplete for the newest
active root: `current_run_metrics_trusted` is `FALSE`,
`pending_until_first_pass` is `TRUE`, and `full_pass_pending` is `TRUE`. The
latest row carries the last completed `duplicateShareCurrent` value, `0.5`, and
summary startup failures `0`, but current-run signature and actionable-signature
denominators are not populated for `run-20260522T022632Z`. Until that active run
completes a full pass, read the high duplicate/noise share as incomplete
current-run accounting and a control-plane health issue, not as a measured
product duplicate/noise rate. The previous trusted row for
`run-20260522T020520Z` had `2` current-run signatures, `2` actionable
signatures, `2` product-evidence signatures, and top duplicate share `0.5`.
Historical duplicate share is `0.2381` for context only; it is not the plotted
live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
duplicate-storm interpretation. It identifies a producer/scheduler
control-plane leak around no-product startup failures. The latest
feedback-action file is empty; the latest non-empty feedback-action says the
bounded producer-side filter was applied in the novelty monitor.

Resource state is usable but pressure-affected. The latest monitor sample has
`418.4G` free memory; the latest disk sample has `91.4GiB` free on `/` and
`431.0GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`60.93%`. Latest load averages are `45.95`, `44.29`, and `47.05` on `64`
logical CPUs, with `1` blocked task in the same sample.

The latest graph-counted fuzzing mix has `27` browser/e2e lanes across `27`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing is still concentrated
in browser/e2e. Current graph-counted lower-level work is the table-query-array
CRDT unit/property lane and the old rich-text CRDT coverage-guided lower-level
lane, while protocol/server work is active through HTTP polling.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion work
have no current graph-counted lane.

The execution counter has `16,599,780` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial 15-minute
bucket at `2026-05-22T02:30:00Z` has `787` browser/e2e executions, `128`
unit-property executions, and `900` protocol-server executions, about
`3,148`/hour, `512`/hour, and `3,600`/hour respectively. Coverage-guided
lower-level, backend-api, transport-integration, and fuzz-assertion are zero in
that latest committed graph bucket.

The PR-focused data is live. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` high-priority
deferred-family product-decision row, `1` medium-priority deferred-family
diagnostic row, and `1` high-priority runtime-gated PR row held as consumed.
The current push manifest is empty. The critical-path executor has `7`
blockers: `1` active blocker, `2` queued blockers, `2` runnable blockers, and
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
`run-20260522T022632Z` was taken at `2026-05-22T02:34:06Z` with
`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`, and
`full_pass_pending` `TRUE`. The row carries the last completed
`duplicateShareCurrent` value, `0.5`, and summary startup failures `0`, but
current-run signatures, actionable signatures, product-evidence signatures, and
top duplicate share are not populated yet. That means the active-run duplicate
denominator is unavailable. The previous trusted row for
`run-20260522T020520Z` had a two-signature/two-actionable-signature
denominator, so the high share should not be mistaken for a broad duplicate
storm.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says strict `pre_action_bootstrap_stall`
noise is mostly suppressed by triage and analysis consumers, but producer and
scheduler paths can still keep or re-materialize no-product startup groups
through short supervisor cooldowns, novelty/materialization floors, forced
publication, and inconsistent current-run scoping. The latest feedback-action
file is empty. The latest non-empty feedback-action says no-product startup
holds now block benchmark-canary and success-deficit producer publication unless
the same group has current-run product evidence, and a direct current-root
triage check showed `strictNoProductStartup=0`.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `87.8%` used and root is around `40.6%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,635`. The summary's current enabled
groups are WS parser transform, WS media cross-entity, WS real-user coverage
bridge, WS block-gauntlet, WS common blocks, WS permissions/auth/locks, and WS
real-user save/reload.
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
browser/e2e: `27` browser/e2e lanes across `27` groups. Lower-level work is
active but narrow: `unit-property`, `coverage-guided-lower-level`, and
`protocol-server` each have one current graph-counted lane. The graph-counted
lower-level targets are table-query-array CRDT and rich-text CRDT; HTTP polling
is present as a `protocol-server` lane. `transport-integration`, `backend-api`,
and standalone `fuzz-assertion` have no current graph-counted lane in this
snapshot.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis accepts only
a narrow browser/e2e mix change: preserve the exact HTTP canary lanes, append
`same-user-stale-tabs-http` only if admission allows it, backfill missing exact
HTTP rows only on PID/artifact failure, and fail closed until current roots,
exact sessions, live PIDs, fresh events, and summaries reconcile. The latest
feedback-action file is empty; the latest non-empty feedback-action keeps
browser/e2e protected under `severe_pressure`, starts a backend/API sentinel,
blocks optional browser/protocol starts under pressure, and strengthens the
lower-level HTTP polling oracle without a continuous lower-level restart. The
committed graph data partially corroborates that feedback: it shows the
browser/e2e lane floor, focused HTTP rows, fresh current WS novelty rows,
strict-expansion WS/HTTP rows, a current protocol-server HTTP polling row, and
the old rich-text CRDT lower-level smoke row. It still does not show a
backend/API lane, standalone fuzz-assertion lane, or restarted lower-level HTTP
polling lane. This report treats the graph as publication telemetry and the
persona evidence as the stricter capacity-quality check.

The latest native-harness synthesis selects parser serialization as the first
isolated Node/V8 coverage-guided harness. The latest action implemented and
smoke-validated that parser-only lower-level harness, but the current
graph-counted coverage-guided lower-level row remains rich-text CRDT, not a
continuous parser serialization lane. The latest protocol synthesis selects HTTP
polling REST over the WebSocket/Yjs relay as the ready v1 protocol/server
harness. The latest non-empty protocol action implemented and validated the HTTP
polling harness with direct-runner and tmux-launcher smokes, and the graph now
shows protocol-server execution in the current bucket.

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
legacy batch-count fields. The latest totals are approximately `68,980`
browser/e2e, `5,626,528` unit-property, `458,097` coverage-guided lower-level,
and `10,446,175` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The current partial 15-minute bucket at `2026-05-22T02:30:00Z` has `787`
browser/e2e executions, about `3,148`/hour; `128` unit-property executions,
about `512`/hour; and `900` protocol-server executions, about `3,600`/hour.
Coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that committed graph bucket. The latest graph-counted
nonzero coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with
`2` executions, about `8`/hour.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `203` likely-real findings
over about `843.9` runner-hours, or `24.06` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,892`
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
the current sample: collaboration UI signals, parser serialization, and table
stale snapshot HTTP. Revision persistence has `4` successful records,
multi-reload lifecycle has `8`, full-profile rows have `16`, many-user
lifecycle has `17`, common blocks have `18`, parser transform has `21`,
three-user late join has `25`, large-post three-user HTTP has `36`,
long-session large-doc has `39`, block-gauntlet has `50`, and media
cross-entity has `51`. This still argues for completion-depth repair in
existing covered surfaces before adding another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 8 | 50 |
| successful collaboration-ui-signals records | 0 | 25 |
| successful three-user late-join records | 0 | 25 |
| remote selection and cursor visible | 1 | 25 |
| async/server block core/template-part | 0 | 20 |
| local post recovery autosave | 5 | 25 |
| remote and local autosave checkpoints | 5 | 25 |
| same-user two-tab mode | 131 | 150 |
| table stale snapshot oracle | 0 | 10 |
| successful twelve-user documents | 0 | 10 |
| successful twelve-user late join documents | 0 | 10 |
| successful large-post HTTP records with three users | 0 | 10 |
| successful many-user lifecycle records with twelve users | 0 | 10 |
| successful table-stale-snapshot-http records | 0 | 10 |
| action table-stale-snapshot-html | 4 | 10 |
| gauntlet block core/details | 14 | 20 |
| table stale snapshot over HTTP | 4 | 10 |
| successful three-user large documents | 0 | 5 |
| successful thirty-user documents | 0 | 3 |
| successful thirty-user late join documents | 0 | 3 |
| successful many-user lifecycle records with thirty users | 0 | 3 |
| gauntlet block core/more | 16 | 20 |
| gauntlet block core/shortcode | 16 | 20 |
| gauntlet block core/html | 17 | 20 |
| gauntlet block core/social-link | 18 | 20 |
| gauntlet block core/social-links | 19 | 20 |

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
deferred-family diagnostic row, and `1` high-priority runtime-gated row held
as consumed.

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

The critical-path executor has `7` blockers: one active blocker
(`benchmark-canary-fuzzer-gap`), two queued blockers (`PR07C` owner matrix and
`reload-hydration`), two runnable blockers (`productive-analysis-action` and
`seed-5200005-reducer`), and two terminal/downscoped blockers (`PR17` seed
`1020002` and `seed-1060015-reducer`). The repeated no-progress table has one
current row: `benchmark-canary-fuzzer-gap/zero_executor_artifact` with `1`
rejection.

## Interpretation

The graph-refresh pipeline is current again: the collector brings in the
current coverage-guided root, resource samples, PR-focused raw inputs, and the
standard persona-loop outputs. The active coverage root is
`run-20260522T022632Z`, and its current-run duplicate/noise accounting is not
trusted yet because the first full pass is still pending. The live row was
sampled at `2026-05-22T02:34:06Z` and has
`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`,
`full_pass_pending` `TRUE`, last completed `duplicateShareCurrent` `0.5`, and
summary startup failures `0`, but no current-run signature or actionable
signature denominator. Treat this as incomplete current-run accounting and a
control-plane health signal until the active root completes a full pass. The
previous trusted row had only two current-run signatures and two actionable
signatures, so the high share still does not support a broad duplicate-storm
reading.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm reading. It says strict startup stalls are mostly suppressed by
triage/analysis consumers, but supervisor and novelty producer paths can still
keep or re-materialize no-product startup groups through cooldown,
materialization-floor, forced-publication, and current-run scoping gaps. The
latest feedback-action file is empty; the latest non-empty feedback-action says
the bounded producer-side filter was implemented in the novelty monitor. The
current active row shows no summary startup failures but incomplete current-run
accounting, so the graph still supports a control-plane interpretation over a
product-bug or broad duplicate-storm reading.

The resource picture remains pressure-affected. Latest CPU utilization is
`60.93%`; load is `45.95`, `44.29`, and `47.05` on `64` logical CPUs, with
`1` blocked task. The graph-counted fuzzing mix is browser/e2e-heavy: `27`
browser/e2e lanes, plus one lane each for unit-property, coverage-guided
lower-level, and protocol-server. Persona evidence is stricter than the graph
and rejects raw row counts as trusted useful capacity unless roots, sessions,
PIDs, events, and summaries reconcile. The latest non-empty level-mix feedback
protects browser/e2e under `severe_pressure`, starts a backend/API sentinel,
blocks optional browser and protocol starts under pressure, and strengthens
lower-level HTTP polling without restarting the continuous lane. The committed
graph confirms the browser/e2e lane floor, focused HTTP rows, fresh current WS
novelty rows, strict-expansion WS/HTTP rows, a current protocol-server HTTP
polling row, and the old rich-text CRDT lower-level smoke row. It still has no
backend/API row, no standalone fuzz-assertion row, no restarted lower-level HTTP
polling lane, and zero current-bucket coverage-guided lower-level executions.
Treat that contradiction as unresolved telemetry reconciliation rather than
proof that all feedback-reported work is contributing committed graph capacity.

The parser serialization lower-level harness is implemented and smoke-validated
by the latest persona action, but it is not yet the current graph-counted
continuous coverage-guided lower-level lane. The latest protocol synthesis file
selects HTTP polling REST as the ready v1 protocol/server harness, and the
latest non-empty action implemented and smoke-validated it. The graph now
records current-bucket protocol-server execution, so the previous missing
protocol sentinel has been reconciled in the committed data.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is active but
partial: about `3,148` browser/e2e executions/hour, `512` unit-property
executions/hour, and `3,600` protocol-server executions/hour in the
`2026-05-22T02:30:00Z` bucket. Coverage-guided lower-level's latest nonzero
graph-counted bucket remains `2026-05-21T11:00:00Z` with `2` executions.
Lower-level counts remain
approximate where reconstructed from batch metadata or legacy batch-count
fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. Cycle 446 launched one
bounded repair job for that strict-head proof, but the copied evidence still
had the report pending. The PR loop still needs to convert held ready-product
rows, queued PR07C owner evidence, queued reload-hydration work, active
benchmark-canary exact-stack work, runnable productive-analysis and
seed-5200005 blockers, and the pending strict seed proof into validated
publishable branches rather than more blocked or no-progress artifacts.
