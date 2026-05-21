# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T23:00:49Z`

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

The monitor data is current through `2026-05-21T22:55:10Z`, and the latest
current-run accounting row was sampled at `2026-05-21T22:59:17Z` for
`run-20260521T224443Z` after a completed full pass. The monitor has `3,897`
passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `274,238`; current-scan coverage files are `804`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table
has `42` unmet target rows out of `136`.

Current-run duplicate/noise accounting is now trusted for the newest active
root: `current_run_metrics_trusted` is `TRUE`,
`pending_until_first_pass` is `FALSE`, and the completed full pass was at
`2026-05-21T22:55:09Z`. The current-output-dir live row carries
`duplicateShareCurrent` `1` and summary startup failures `0`, but the
denominator is only one current-run signature, one actionable signature, and one
product-evidence signature. Treat that as a one-signature current-run signal,
not a broad product duplicate/noise storm. Historical duplicate share is
`0.2667` for context only; it is not the plotted live health signal. The latest
non-empty duplicate/noise synthesis rejects a broad product duplicate storm and
identified a producer/control-plane leak. The follow-up feedback action reports
the bounded fix applied: no-product startup holds now block benchmark-canary and
success-deficit publication without current-run product evidence, historical
profile counts no longer bypass startup holds, and final publication is
filtered before writing supervisor groups.

Resource state is usable but pressure-affected. The latest sample has `423.7G`
free memory, `92.3GiB` free on `/`, and `510.0GiB` free on
`/media/volume/danluu-fuzz-data`. Latest CPU utilization is `66.41%`. Latest
load averages are `41.3`, `48.82`, and `45.65` on `64` logical CPUs, with `4`
blocked tasks in the same sample. The load is below core count now, but
the run history includes severe pressure spikes, so admission and session
durability remain active risks.

The latest graph-counted fuzzing mix has `28` browser/e2e lanes across `28`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing is concentrated in
browser/e2e, with narrow lower-level sentinels. Current graph-counted browser
work includes focused HTTP rows for title reload, existing-post CRDT, and large
HTTP lifecycle. Current graph-counted lower-level work is table-query-array
CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane. The latest level-mix synthesis says browser/e2e is
still underweight for active HTTP correctness blockers, recommends the queued
exact-stack HTTP replay rows, and rejects expanding generic lower-level
capacity; it also warns that raw lane counts are not trusted useful capacity
until roots, exact sessions, PIDs, events, and summaries reconcile. Treat the
graph as publication telemetry and the persona evidence as capacity-quality
validation, not as identical counters.

The execution counter has about `16.560M` estimated individual executions.
These are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial
15-minute bucket has `4` browser/e2e executions and `60` protocol-server
executions; unit-property and coverage-guided lower-level are zero in that
bucket. Unit-property's latest graph-counted nonzero bucket is `448`
executions at `2026-05-21T22:45:00Z`. Coverage-guided lower-level's latest
graph-counted nonzero bucket remains `2` executions at
`2026-05-21T11:00:00Z`.

The latest actionable native-harness evidence selects parser serialization as
the first isolated Node/V8 coverage-guided harness. The action reports the
harness implemented and validated with `coverage_keys=92`, `feature_keys=21`,
and `coverageCanaryOk=true`, but no unbounded parser campaign was launched
because the parser lane is held. The current graph-counted coverage-guided
lower-level row is still rich-text CRDT, not parser serialization. The latest
protocol synthesis selects HTTP polling REST as the ready v1 protocol/server
harness. The latest non-empty action reports syntax and discoverability checks
passed, but bounded launcher validation was refused by the global CPU admission
guard; the graph nevertheless has fresh protocol-server execution events.

The PR-focused data is live. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` high-priority
deferred-family product-decision row, `1` medium-priority deferred-family
diagnostic row, and `1` high-priority runtime-gated PR row held as consumed.
The current push manifest is empty. The critical-path executor has `7`
blockers: `3` runnable blockers, `1` active reload-hydration job, `1` queued
owner-evidence blocker, and `2` terminal/downscoped blockers. The latest
PR-split feedback keeps the fileable prefix through `PR15C` and rejects
`PR16-RLH` as fileable until strict seed `6000007` reaches the final
persistence oracle and owner rows prove it.

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
`run-20260521T224443Z` was taken at `2026-05-21T22:59:17Z` with
`current_run_metrics_trusted` `TRUE` and `pending_until_first_pass` `FALSE`.
Current-output-dir values carry `duplicateShareCurrent` `1` and summary startup
failures `0`, with a one-signature denominator: one current-run signature, one
actionable signature, and one product-evidence signature, with top duplicate
share `1`. The row before this was incomplete while the first full pass was
pending; that pending state is tracked separately from measured product
duplicate/noise.

The latest non-empty duplicate/noise synthesis rejects a broad product
duplicate storm. It identified producer-boundary drift after strict startup
classification work: paused duplicate/noise or no-product startup groups could
still be republished or live-admitted unless novelty, supervisor, refill, and
publication enforce the same current-run product-evidence holds. The follow-up
feedback action says that fix was applied and the current-root triage check had
`strictNoProductStartup=0` and `queuedOrRunningStrictStartup=0`. The trusted
current row confirms there are no summary startup failures, but the high
duplicate share is over one current-run signature, not a fleet-wide duplicate
storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `85.6%` used and root is around `40.0%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,626`. Current enabled groups are
HTTP title reload convergence, HTTP large-post lifecycle, HTTP large-post
lifecycle completion, WS collaboration UI signals, and WS many-user lifecycle
completion. Historical enabled events cover additional WS collaboration UI
signals, WS multi-reload lifecycle, thirty-user and many-user lifecycle
variants, HTTP large-post lifecycle, real-user editing/rich-text/save-reload
bridges, async-server-blocks bridges, permissions/auth/locks, media
cross-entity, same-user lifecycle, HTTP table stale snapshots, block-gauntlet,
revision/autosave/recovery, parser transform, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `28` browser/e2e lanes across `28` groups, above the `24` lane
floor called out by earlier persona feedback. Lower-level work is active but
narrow: `unit-property`, `coverage-guided-lower-level`, and `protocol-server`
each have one current graph-counted lane. The graph-counted lower-level targets
are table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis says
browser/e2e is still underweight for active HTTP correctness blockers and
recommends running the queued exact-stack HTTP replay rows
(`existing-post-crdt-http` and `title-reload-http`) while keeping
lower-level/backend/protocol work capped as sentinels. It rejects expanding
generic lower-level capacity now and says capacity should fail closed unless
current roots, exact sessions, live PIDs, fresh events, and summaries
reconcile. The refreshed graph-counted publication telemetry now shows `28`
browser/e2e lanes, including focused HTTP title reload, existing-post CRDT, and
large HTTP lifecycle rows, plus protocol-server activity. It still shows no
backend/API or standalone fuzz-assertion lane. This report treats the graph as
publication telemetry and the persona evidence as the stricter capacity-quality
check.

Duplicate/noise feedback points to the same control-plane class: the latest
synthesis said no-product startup holds could leak through producer admission
before supervisor enforcement. The follow-up action reports that producer
publication now requires current-run product evidence for those holds. The
newest trusted current-run row reports duplicate share `1` with one current-run
signature, one actionable signature, and one product-evidence signature; the
report treats that as a one-signature live status signal, not a broad duplicate
storm.

The latest copied native-harness synthesis file is empty, so the latest
actionable native evidence remains the parser serialization action. It says the
parser harness was implemented and validated with `coverage_keys=92`,
`feature_keys=21`, and `coverageCanaryOk=true`, but an unbounded parser
campaign was not launched because the parser lane is held. The current
graph-counted coverage-guided lower-level row remains rich-text CRDT, so parser
serialization is validated by persona evidence but not active as a current
graph-counted lane. The latest protocol synthesis selects HTTP polling REST
over the WebSocket/Yjs relay as the ready v1 protocol/server harness. The
latest protocol action file is empty, so the last non-empty action remains the
syntax/discoverability check plus CPU-admission refusal for bounded launcher
validation; the graph nevertheless has fresh protocol-server execution events.
Fuzz-only assertion work is not graph-counted as active; the latest assertion
action added two gated assertions, while level-mix feedback says the
fuzz-assertion loop remains held/stale.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `43,473`
browser/e2e, `5,619,872` unit-property, `458,097` coverage-guided lower-level,
and `10,438,674` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table. The current partial 15-minute bucket has `4` browser/e2e
executions, about `16` executions/hour, and `60` protocol-server executions,
about `240`/hour; unit-property and coverage-guided lower-level are zero in the
same bucket. Unit-property's latest graph-counted nonzero bucket is
`2026-05-21T22:45:00Z` with `448` executions, about `1,792`/hour.
Coverage-guided lower-level's latest graph-counted nonzero bucket is
`2026-05-21T11:00:00Z` with `2` executions, about `8`/hour. Lower-level counts
remain approximate when reconstructed from batch metadata or legacy
batch-count fields.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `188` likely-real findings
over about `797.3` runner-hours, or `23.58` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,782`
browser/e2e candidates, `6` unit-property candidates, and `2`
coverage-guided-lower-level candidates. Transport-integration, backend-api,
protocol-server, standalone fuzz-assertion, and other buckets have no unique
candidates in the latest graph-counted data.

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
the current sample: table stale snapshot HTTP, common blocks, block-gauntlet,
parser serialization, and collaboration UI signals.
Media cross-entity has `1` successful record, many-user lifecycle and revision
persistence have `4` each, parser transform has `4`, multi-reload lifecycle has
`8`, three-user late join has `9`, full-profile rows have `16`, large HTTP
lifecycle has `21`, long-session large docs have `27`, permissions/auth/locks
have `29`, async/server blocks have `51`, real-user editing has `76`, session
lifecycle has `96`, and persistence-no-title has `185`. This argues for
completion-depth repair in existing covered surfaces before adding another
broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 395 | 500 |
| same-user two-tab mode | 61 | 150 |
| successful parser-serialization records | 0 | 50 |
| multi reload | 56 | 100 |
| successful multi-reload-lifecycle records | 8 | 50 |
| successful collaboration-ui-signals records | 0 | 25 |
| remote selection and cursor visible | 1 | 25 |
| successful media-cross-entity records | 1 | 25 |
| async/server block core/template-part | 0 | 20 |
| remote and local autosave checkpoints | 5 | 25 |
| local post recovery autosave | 5 | 25 |
| gauntlet block core/details | 3 | 20 |
| gauntlet block core/file | 4 | 20 |
| gauntlet block core/gallery | 4 | 20 |
| gauntlet block core/more | 4 | 20 |
| gauntlet block core/shortcode | 4 | 20 |
| successful three-user late-join records | 9 | 25 |
| gauntlet block core/media-text | 5 | 20 |
| gauntlet block core/social-link | 6 | 20 |
| gauntlet block core/social-links | 7 | 20 |

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
high-priority deferred-family product-decision row, and `1` medium-priority
deferred-family diagnostic row, plus `1` high-priority runtime-gated row held
as consumed.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

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

The critical-path executor has `7` blockers: three runnable blockers
(`productive-analysis-action`, `benchmark-canary-fuzzer-gap`, and
`seed-5200005-reducer`), one active reload-hydration job, one queued `PR07C`
owner-matrix blocker, and two terminal/downscoped blockers (`PR17` seed
`1020002` and `seed-1060015-reducer`). The only repeated no-progress artifact
currently listed is `benchmark-canary-fuzzer-gap/zero_executor_artifact`, with
`1` row.

## Interpretation

The graph-refresh pipeline is current again: the collector brings in the
current coverage-guided root, resource samples, PR-focused raw inputs, and the
standard persona-loop outputs. The active coverage root is
`run-20260521T224443Z`, and its latest current-run duplicate/noise accounting is
trusted after a full pass at `2026-05-21T22:55:09Z`. The live row has
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `1`, and summary startup failures `0`, but the
denominator is one current-run signature, one actionable signature, and one
product-evidence signature. Treat the high duplicate share as a one-signature
current-run signal, not a broad duplicate storm.

The latest non-empty duplicate/noise synthesis rejects a broad product
duplicate storm and pointed at producer-boundary drift: no-product startup and
duplicate-family holds could bypass admission/publication unless the control
plane required current-run product evidence. The feedback action reports that
bounded fix applied. The trusted full-pass row now confirms no summary startup
failures, while still showing the remaining live duplicate signal is only a
one-signature denominator.

The resource picture has cleared from the worst pressure state but is not clean.
Latest CPU utilization is `66.41%`; load is `41.3`, `48.82`, and `45.65` on
`64` logical CPUs, with `4` blocked tasks. The graph-counted fuzzing mix is
browser/e2e-heavy: `28` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted useful
capacity unless roots, sessions, PIDs, events, and summaries reconcile. The
latest level-mix synthesis says browser/e2e is still underweight for HTTP
correctness blockers and recommends the exact-stack HTTP replay rows, while
keeping lower-level/backend/protocol as capped sentinels. The immediate
operational read is browser/e2e-concentrated fuzzing with narrow lower-level
sentinels, plus fail-closed accounting and admission guards.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is active but
uneven and partial: about `16` browser/e2e executions/hour and `240`
protocol-server executions/hour in the latest 15-minute bucket, while
unit-property and coverage-guided lower-level have no current-bucket
executions. Unit-property had a nonzero bucket at `2026-05-21T22:45:00Z`, and
coverage-guided lower-level's latest nonzero bucket remains
`2026-05-21T11:00:00Z`. Lower-level counts remain approximate where
reconstructed from batch metadata or legacy batch-count fields. Native parser
serialization is validated by persona action but not active as a current
graph-counted lane; protocol-server activity is visible in the graph, while
the last non-empty action says bounded launcher validation was refused by
global CPU admission.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. Cycle 446 launched one
bounded repair job for that strict-head proof, but the copied evidence still
had the report pending. The PR loop still needs to convert held ready-product
rows, the active reload-hydration job, the three runnable blockers, the queued
owner-matrix blocker, and the pending strict seed proof into validated
publishable branches rather than more blocked or no-progress artifacts.
