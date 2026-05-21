# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T22:40:15Z`

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

The monitor data is current through `2026-05-21T22:32:20Z`, and the latest
current-run accounting row was sampled at `2026-05-21T22:38:41Z` for
`run-20260521T223427Z` before a completed full pass. The monitor has `3,895`
passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `274,182`; current-scan coverage files are `883`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table
has `43` unmet target rows out of `136`.

Current-run duplicate/noise accounting is not trusted for the newest active
root: `current_run_metrics_trusted` is `FALSE` and
`pending_until_first_pass` is `TRUE`. The latest current-output-dir row carries
`duplicateShareCurrent` `1` and summary startup failures `0`, but current-run
signature, actionable-signature, and product-evidence denominators are not
available until the first full pass completes. This is a control-plane
accounting-completeness issue, not a measured product duplicate/noise rate. The
previous trusted row for `run-20260521T221043Z` had a one-signature
denominator: one current-run signature, one actionable signature, and one
product-evidence signature, with top duplicate share `1`. Historical duplicate
share is `0.2727` for context only; it is not the plotted live health signal.
The latest duplicate/noise synthesis rejects a broad product duplicate storm
and identifies a producer/control-plane leak: no-product startup and duplicate
holds can still be bypassed by novelty, supervisor, refill, or stale-process
paths unless admission and publication require current-run product evidence.

Resource state is usable but pressure-affected. The latest sample has `433.2G`
free memory, `92.5GiB` free on `/`, and `524.4GiB` free on
`/media/volume/danluu-fuzz-data`. Latest CPU utilization is `41.85%`. Latest
load averages are `37.63`, `33.71`, and `39.63` on `64` logical CPUs, with
`11` blocked tasks in the same sample. The load is below core count now, but
the run history includes severe pressure spikes, so admission and session
durability remain active risks.

The latest graph-counted fuzzing mix has `26` browser/e2e lanes across `26`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing is concentrated in
browser/e2e, with narrow lower-level sentinels. Current graph-counted
lower-level work is table-query-array CRDT, rich-text CRDT, and HTTP polling
protocol/server. `transport-integration`, `backend-api`, and standalone
`fuzz-assertion` have no current graph-counted lane. The latest level-mix
synthesis is stricter than the graph and rejects trusting raw lane counts as
useful capacity unless roots, exact sessions, PIDs, events, and summaries
reconcile; it says browser/e2e was still underweight in its input context. That
contradicts the refreshed graph count, so this report treats the graph as
publication telemetry and the persona evidence as a capacity-quality warning.

The execution counter has about `16.554M` estimated individual executions.
These are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest 15-minute bucket
has `36` browser/e2e executions, `320` unit-property executions, and `1,285`
protocol-server executions. Coverage-guided lower-level has no nonzero latest
bucket; its latest graph-counted nonzero bucket remains `2` executions at
`2026-05-21T11:00:00Z`.

The latest native-harness synthesis and action select parser serialization as
the first isolated Node/V8 coverage-guided harness. The action reports the
harness implemented and validated with `coverage_keys=92`, `feature_keys=21`,
and `coverageCanaryOk=true`, but no unbounded parser campaign was launched
because the parser lane is held. The current graph-counted coverage-guided
lower-level row is still rich-text CRDT, not parser serialization. The latest
protocol synthesis selects HTTP polling REST as the ready v1 protocol/server
harness. Its action reports syntax and discoverability checks passed, but the
bounded launcher validation was refused by the global CPU admission guard; the
graph nevertheless has fresh protocol-server execution events.

The PR-focused data is live. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` high-priority
deferred-family product-decision row, `1` medium-priority deferred-family
diagnostic row, and `1` high-priority runtime-gated PR row held as consumed.
The current push manifest is empty. The critical-path executor has `7`
blockers: `3` runnable blockers, `1` active reducer, `2` queued blockers, and
`1` terminal seed-reducer blocker. The latest PR-split feedback keeps the
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
`run-20260521T223427Z` was taken at `2026-05-21T22:38:41Z` with
`current_run_metrics_trusted` `FALSE` and `pending_until_first_pass` `TRUE`.
Current-output-dir values carry `duplicateShareCurrent` `1` and summary startup
failures `0`, but the current root has no current-run signature,
actionable-signature, or product-evidence denominator yet. Treat this as
incomplete current-run accounting and a control-plane health issue until a full
pass completes. The previous trusted row for `run-20260521T221043Z` had a
one-signature denominator: one current-run signature, one actionable signature,
and one product-evidence signature, with top duplicate share `1`.

The latest duplicate/noise synthesis and prior feedback reject a broad product
duplicate storm. They identify producer-boundary drift after strict startup
classification work: paused duplicate/noise or no-product startup groups can
still be republished or live-admitted unless novelty, supervisor, refill, and
publication enforce the same current-run product-evidence holds.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `85.2%` used and root is around `39.9%` used. Root pressure remains
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
browser/e2e: `26` browser/e2e lanes across `26` groups, above the `24` lane
floor called out by earlier persona feedback. Lower-level work is active but
narrow: `unit-property`, `coverage-guided-lower-level`, and `protocol-server`
each have one current graph-counted lane. The graph-counted lower-level targets
are table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis says useful
browser/e2e capacity was still underweight in its context and that stale roots,
dead PIDs, missing artifacts, and root rollover must fail closed. That
synthesis contradicts the refreshed raw lane graph on browser count, so the
report treats the graph as publication telemetry and the persona synthesis as a
capacity-quality warning. The latest feedback file is empty; the latest
non-empty action kept browser fuzzing running, added one focused
`large-http-lifecycle` browser shard, repaired coverage
watchdog/materialization, improved the HTTP polling coverage-guided target, and
restored backend/API plus protocol/server sentinel starts. Backend/API and
protocol/server exact sessions were admission-killed in that action, and
fuzz-assertion remained held/stale. The refreshed graph now shows
protocol-server activity again, but backend/API and fuzz-assertion remain
absent.

Duplicate/noise feedback points to the same control-plane class: the latest
synthesis says no-product startup holds can leak through producer admission
before supervisor enforcement. The newest active root has not completed a full
pass, so the current-run signature/actionable-signature/product-evidence
denominators are unavailable. The previous trusted root reported duplicate
share `1` over a one-signature denominator. The report treats the newest row as
pending control-plane accounting, not a broad duplicate storm.

The latest native-harness synthesis recommends parser serialization as the
first isolated Node/V8 coverage-guided harness, with rich-text CRDT second
after parser/serialization accounting is clean. The latest native action says
the parser harness was implemented and validated with `coverage_keys=92`,
`feature_keys=21`, and `coverageCanaryOk=true`, but an unbounded parser
campaign was not launched because the parser lane is held. The current
graph-counted coverage-guided lower-level row remains rich-text CRDT, so parser
serialization is validated by persona evidence but not active as a current
graph-counted lane. The latest protocol synthesis selects HTTP polling REST
over the WebSocket/Yjs relay as the ready v1 protocol/server harness. The
latest protocol action reports the harness is present and passes syntax and
discoverability checks, but current bounded launcher validation was denied by
the global CPU admission guard. Fuzz-only assertion work is not graph-counted
as active; the latest assertion action added two gated assertions, while
level-mix feedback says the fuzz-assertion loop remains held/stale.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `40,870`
browser/e2e, `5,619,200` unit-property, `458,097` coverage-guided lower-level,
and `10,436,034` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table. The current 15-minute bucket has `36` browser/e2e
executions, about `144` executions/hour; `320` unit-property executions, about
`1,280`/hour; and `1,285` protocol-server executions, about `5,140`/hour.
Coverage-guided lower-level's latest graph-counted nonzero bucket is
`2026-05-21T11:00:00Z` with `2` executions, about `8`/hour. Lower-level counts
remain approximate when reconstructed from batch metadata or legacy
batch-count fields.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `187` likely-real findings
over about `792.2` runner-hours, or `23.60` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,777`
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
the current sample: collaboration UI signals, parser serialization,
block-gauntlet, common blocks, and table stale snapshot HTTP.
Media cross-entity has `1` successful record, many-user lifecycle and revision
persistence have `4` each, parser transform has `4`, multi-reload lifecycle has
`8`, three-user late join has `9`, full-profile rows have `16`, large HTTP
lifecycle has `18`, long-session large docs have `27`, permissions/auth/locks
have `29`, async/server blocks have `51`, real-user editing has `65`, session
lifecycle has `96`, and persistence-no-title has `181`. This argues for
completion-depth repair in existing covered surfaces before adding another
broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 369 | 500 |
| same-user two-tab mode | 61 | 150 |
| successful parser-serialization records | 0 | 50 |
| multi reload | 52 | 100 |
| successful multi-reload-lifecycle records | 8 | 50 |
| successful collaboration-ui-signals records | 0 | 25 |
| remote selection and cursor visible | 1 | 25 |
| successful media-cross-entity records | 1 | 25 |
| async/server block core/template-part | 0 | 20 |
| local post recovery autosave | 5 | 25 |
| remote and local autosave checkpoints | 5 | 25 |
| gauntlet block core/details | 3 | 20 |
| gauntlet block core/file | 4 | 20 |
| gauntlet block core/gallery | 4 | 20 |
| gauntlet block core/more | 4 | 20 |
| gauntlet block core/shortcode | 4 | 20 |
| successful three-user late-join records | 9 | 25 |
| gauntlet block core/media-text | 5 | 20 |
| successful real-user-editing records | 65 | 80 |
| gauntlet block core/social-link | 6 | 20 |

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
`seed-1060015-reducer`), one active reducer (`seed-5200005-reducer`), two
queued blockers (`PR07C` owner matrix and reload-hydration), and one terminal
blocker (`PR17` seed `1020002`). Repeated no-progress artifacts are currently
led only by `benchmark-canary-fuzzer-gap/zero_executor_artifact` with `1` row.

## Interpretation

The graph-refresh pipeline is current again: the collector brings in the
current coverage-guided root, resource samples, PR-focused raw inputs, and the
standard persona-loop outputs. The newest live risk is still control-plane
state. The active coverage root is `run-20260521T223427Z`, and its
duplicate/noise accounting is pending its first full pass. The latest row has
`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`,
`duplicateShareCurrent` `1`, and summary startup failures `0`, but no
current-run signature, actionable-signature, or product-evidence denominator
yet. Treat that as incomplete current-run accounting, not a measured product
duplicate/noise rate. The previous trusted root had duplicate share `1` over a
one-signature denominator.

The latest duplicate/noise synthesis rejects a broad product duplicate storm
and points at producer-boundary drift: no-product startup and duplicate-family
holds can be bypassed by benchmark-canary, success-deficit, bootstrap, refill,
or stale-process paths unless producer admission and final publication require
current-run product evidence. That matches the health graph's live signal: the
problem is accounting/admission integrity while the active run is incomplete,
not a proven fleet-wide product duplicate storm.

The resource picture has cleared from the worst pressure state but is not clean.
Latest CPU utilization is `41.85%`; load is `37.63`, `33.71`, and `39.63` on
`64` logical CPUs, with `11` blocked tasks. The graph-counted fuzzing mix is
browser/e2e-heavy: `26` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted useful
capacity unless roots, sessions, PIDs, events, and summaries reconcile. The
immediate operational read is browser/e2e-concentrated fuzzing with narrow
lower-level sentinels, plus unresolved fail-closed accounting and admission
guards.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is active but
uneven: about `144` browser/e2e executions/hour, `1,280` unit-property
executions/hour, and `5,140` protocol-server executions/hour. Lower-level
counts remain approximate where reconstructed from batch metadata or legacy
batch-count fields. Native parser serialization is validated by persona action
but not active as a current graph-counted lane; protocol-server activity is
visible in the graph, but the latest action says a bounded launcher validation
was refused by global CPU admission.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. Cycle 446 launched one
bounded repair job for that strict-head proof, but the copied evidence still
had the report pending. The PR loop still needs to convert held ready-product
rows, the active reducer, the three runnable blockers, the two queued blockers,
and the pending strict seed proof into validated publishable branches rather
than more blocked or no-progress artifacts.
