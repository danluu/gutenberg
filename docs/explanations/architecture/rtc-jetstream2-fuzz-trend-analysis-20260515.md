# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T22:22:36Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance, resource,
and PR-progress logs. The plotting data is generated with R, ggplot2, tidyverse
packages, and ColorBrewer palettes. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The refreshed collector now copies
`raw/pr-focused/...` inputs instead of leaving PR-controller graphs to drift from
old local state.

## High-Level Readout

The monitor data is current through `2026-05-21T22:19:25Z`, and the latest
current-run accounting row was sampled at `2026-05-21T22:21:12Z` for
`run-20260521T221043Z` after a completed full pass. The monitor has `3,894`
passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `274,161`; current-scan coverage files are `858`. The
monitor reports `40` unmet live coverage items, while the parsed coverage-goal
table has `44` unmet target rows out of `136`.

Current-run duplicate/noise accounting is trusted for the newest active root:
`current_run_metrics_trusted` is `TRUE` and `pending_until_first_pass` is
`FALSE`. The latest current-output-dir metrics report `duplicateShareCurrent`
`1` and summary startup failures `0`, but the denominator is only one
current-run signature, one actionable signature, and one product-evidence
signature. That should be read as a one-signature current-run health warning,
not as a broad duplicate storm. Historical duplicate share is `0.2727` for
context only; it is not the plotted live health signal. The newest
duplicate/noise synthesis file is empty; the latest non-empty synthesis rejects
a broad product duplicate storm and instead identifies producer/control-plane
scheduling drift: paused no-product or duplicate/noise groups can still be
republished or live-admitted through novelty, supervisor, and live-analysis
mismatches. The prior feedback action patched
`page-wait-for-function-timeout` `pre-action-bootstrap-stall` classification
across the triage watcher and analysis consumers.

Resource state is mixed. The latest sample has `431.6G` free memory, `92.6GiB`
free on `/`, and `532.6GiB` free on `/media/volume/danluu-fuzz-data`. The
latest CPU utilization sample is `52.9%`. The latest load averages are
`32.54`, `39.2`, and `48.02` on `64` logical CPUs. The one-, five-, and
fifteen-minute loads are now below core count, but the `21:30:10Z` load sample
reached `555.87`, so the recent history still shows severe admission pressure.

The latest graph-counted fuzzing mix has `25` browser/e2e lanes across `25`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.552M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The graph-counted mix is concentrated in browser/e2e lanes, including current
coverage-guided, focused-shards, gap-booster, and strict-expansion browser
groups. Current graph-counted lower-level work remains narrow:
`unit-property-table-query-array-crdt`,
`coverage-guided-lower-level-rich-text-crdt`, and
`protocol-server-http-polling`. The protocol-server row is fresh in this
snapshot, the unit-property row is fresh, and the coverage-guided lower-level
row is the latest graph-counted campaign row but has no current nonzero
execution bucket. `transport-integration`, `backend-api`, and standalone
`fuzz-assertion` have no current graph-counted lane. The latest
level-mix persona synthesis is stricter than the refreshed lane graph and
contradicts it on raw browser capacity: it says useful mix is still too
browser-light and that raw rows are not trusted useful capacity unless roots,
sessions, PIDs, events, and summaries reconcile. The latest level-mix feedback
file is empty; the latest non-empty action reports a focused
`large-http-lifecycle` browser shard, coverage watchdog/materialization repair,
HTTP polling-manager coverage-guided work, and backend/API plus protocol/server
sentinel starts, but also says backend/API and protocol/server exact sessions
were killed by admission pressure and fuzz-assertion remains held/stale. The
refreshed graph now shows protocol-server activity again; backend/API remains
absent.
The latest native-harness synthesis file is empty; the latest non-empty
synthesis selects parser serialization as the first isolated V8 coverage-guided
harness and cites a validation run with
`coverage_keys=92`, `feature_keys=21`, and no crashes. The latest native action
file is empty. The latest protocol synthesis still selects HTTP polling REST as
the ready v1 protocol/server harness, with validation evidence for one seed,
`22` cases, and the required event accounting. The latest protocol action file
is empty.

The PR-focused data is live again. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` high-priority
deferred-family product-decision row, and `1` medium-priority deferred-family
diagnostic row, plus `1` high-priority runtime-gated PR row held as consumed.
The current push manifest is empty, so the controller is not advertising any
fresh branch-publish rows in this snapshot. The critical-path executor has `6`
blockers: `2` runnable blockers (`benchmark-canary-fuzzer-gap` and `PR17` seed
`1020002`), `1` active reload-hydration blocker, `1` queued `PR07C`
owner-matrix blocker, and `2` terminal seed-reducer blockers.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative total.
It can fall when the active output root changes or when a cleanup pass removes
old per-run files. Cumulative coverage record observations are the better
long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
When current-run accounting is pending, duplicate/noise should be read as a
control-plane completeness problem rather than a measured product duplicate
rate. Pending/incomplete accounting is tracked as its own health signal. The
latest sample for `run-20260521T221043Z` was taken at
`2026-05-21T22:21:12Z` with `current_run_metrics_trusted` `TRUE` and
`pending_until_first_pass` `FALSE`. Current-output-dir values are
`duplicateShareCurrent` `1` and summary startup failures `0`. That high share
has a one-signature denominator: one current-run signature, one actionable
signature, and one product-evidence signature, with top duplicate share `1`.
It is a current-run health warning, but it is not evidence of a broad duplicate
storm. Pending/incomplete accounting is tracked as its own health signal and
should not be read as a measured product duplicate/noise rate; the previous
pending row at `22:13:12Z` was a control-plane completeness issue until this
pass completed. The latest non-empty duplicate/noise synthesis and prior
feedback reject a broad product duplicate storm. They identify
producer-boundary drift after the strict-startup classifier patch: paused
duplicate/noise or no-product startup groups can be republished or
live-admitted unless novelty, supervisor, and live-analysis all enforce the
same holds.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `85.0%` used and root is around `39.9%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event is `novelty-ws-long-session-large-doc`; the
current active coverage-guided rows include HTTP title reload convergence, HTTP
existing-post CRDT metadata, HTTP persistence probe, and HTTP large-post
lifecycle. Historical enabled events cover additional WS collaboration UI
signals, WS multi-reload lifecycle, thirty-user and many-user lifecycle
variants, HTTP large-post lifecycle, real-user
editing/rich-text/save-reload bridges, async-server-blocks bridges,
permissions/auth/locks, media cross-entity, same-user lifecycle, HTTP table
stale snapshots, block-gauntlet, revision/autosave/recovery, parser transform,
and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e: `25` graph-counted browser/e2e lanes across `25`
groups, just above the `24` lane floor called out by earlier persona feedback.
Lower-level work is active but narrow: `unit-property`,
`coverage-guided-lower-level`, and `protocol-server` each have one current
graph-counted lane. The current graph-counted lower-level targets are
table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server. The
fresh execution bucket has protocol-server and unit-property work; the
coverage-guided lower-level slot has no current nonzero execution bucket.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis says the
useful mix was too browser-light and that stale roots, dead PIDs, missing
artifacts, and root rollover must fail closed. That synthesis contradicts the
refreshed raw lane graph on browser count, so the report treats the graph as
publication telemetry and the persona synthesis as a capacity-quality warning.
The latest feedback file is empty, so the latest non-empty action remains the
operational evidence: it kept browser fuzzing running, added one focused
`large-http-lifecycle` browser shard, repaired coverage
watchdog/materialization, improved the HTTP polling coverage-guided target, and
restored backend/API plus protocol/server sentinel lanes. Backend/API and
protocol/server exact sessions were admission-killed after fresh seed-starts,
and fuzz-assertion remains held/stale. The refreshed graph now shows fresh
protocol-server activity again, but backend/API and fuzz-assertion remain
absent. The graph therefore supports "browser/e2e-concentrated with narrow
lower-level sentinels", not broad durable lower-level capacity.

Duplicate/noise feedback points to the same control-plane class: the latest
synthesis says no-product startup holds can leak through producer admission
before supervisor enforcement. The newest active root has completed a full
pass and reports duplicate share `1`, but that is `1` current signature over
`1` actionable signature and `1` product-evidence signature. The report treats
it as a small-denominator current-run warning, not a broad duplicate storm.

The latest native-harness synthesis file is empty; the latest non-empty
synthesis recommends parser serialization as the first isolated V8
coverage-guided harness, with rich-text CRDT second after parser/serialization
accounting is clean. It cites a fresh validation with `coverage_keys=92`,
`feature_keys=21`, `corpus=11`, and no crashes or harness failures. The latest
native action file is empty. The current graph-counted
coverage-guided lower-level row remains rich-text CRDT, so parser serialization
is validated by persona evidence but not active as a current graph-counted
lane. The latest protocol synthesis selects HTTP polling REST over the
WebSocket/Yjs relay as the ready v1 protocol/server harness, and cites existing
validation for one seed and `22` cases with protocol-server event accounting.
The latest protocol action file is empty. Fuzz-only assertion work is not
graph-counted as active; the latest assertion action added two gated assertions,
while level-mix feedback says the fuzz-assertion loop remains held/stale.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `40,818` browser/e2e, `5,618,752`
unit-property, `458,097` coverage-guided lower-level, and `10,434,209`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `20` browser/e2e executions, or about `80`
executions/hour, `256` unit-property executions, or about `1,024`
executions/hour, and `540` protocol-server executions, or about `2,160`
executions/hour.
Coverage-guided lower-level's latest graph-counted nonzero
bucket is `2026-05-21T11:00:00Z` with `2` executions, or about `8`
executions/hour. Lower-level counts remain approximate when reconstructed from
batch metadata or legacy batch-count fields.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `187` likely-real findings
over about `791.3` runner-hours, or `23.63` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,776`
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
Media cross-entity has `1` successful record, many-user lifecycle has `4`,
revision persistence and parser transform have `4` each, multi-reload
lifecycle has `8`, three-user late join has `9`, full-profile rows have `16`,
large HTTP lifecycle has `17`, long-session large docs have `27`,
permissions/auth/locks have `29`, real-user editing has `58`, async/server
blocks have `51`, session lifecycle has `96`, and
persistence-no-title has `173`. This
argues for completion-depth repair in existing covered surfaces before adding
another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 347 | 500 |
| same-user two-tab mode | 61 | 150 |
| successful parser-serialization records | 0 | 50 |
| multi reload | 51 | 100 |
| successful multi-reload-lifecycle records | 8 | 50 |
| successful collaboration-ui-signals records | 0 | 25 |
| remote selection and cursor visible | 1 | 25 |
| successful media-cross-entity records | 1 | 25 |
| three-user late join | 277 | 300 |
| successful real-user-editing records | 58 | 80 |
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

The parsed suggested-PR split history still has `457` snapshots. The latest
parsed proposed split totals `4,114` net LOC. These charts are size telemetry
from parsed status snapshots, not filing authority. The largest latest rows are
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
the progress table. The latest PR-split persona feedback also rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and owner
rows. Cycle 446 applied that split state and launched one bounded strict-head
repair job for `8fb598778357` / seed `6000007`; its report was still pending in
the copied persona evidence.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `6` blockers: two runnable blockers
(`benchmark-canary-fuzzer-gap` and `PR17` seed `1020002`), one active
reload-hydration blocker, one queued `PR07C` owner-matrix blocker, and two
terminal seed-reducer blockers (`5200005` and `1060015`). Repeated no-progress
artifacts are dominated by `benchmark-canary-fuzzer-gap/zero_executor_artifact`
with `70` rows, followed by PR17 and seed-reducer pre-oracle/preflight rows.

## Interpretation

The graph-refresh pipeline is current again: the collector now brings in the
current coverage-guided root, resource samples, PR-focused raw inputs, and the
standard persona-loop outputs. The newest risk is not stale plotting; it is live
control-plane state. The active coverage root remains
`run-20260521T221043Z`, and its current-run duplicate/noise accounting has now
completed a full pass. The latest row is trusted and reports
`duplicateShareCurrent` `1` with summary startup failures `0`, but the
denominator is only one current-run signature, one actionable signature, and one
product-evidence signature. That is a small-denominator current-run warning,
not evidence of a broad duplicate storm. The latest non-empty duplicate/noise
persona synthesis and feedback reject a broad product duplicate storm and
identify
producer-boundary drift after the strict-startup predicate patch: paused
duplicate/noise or no-product startup producers can still be republished or
live-admitted unless novelty, supervisor, and live-analysis all enforce the
holds.

The resource picture is still pressure-affected but no longer looks like the
single worst spike. Latest CPU utilization is `52.9%`; load is `32.54`,
`39.2`, and `48.02` on `64` logical CPUs after a `21:30:10Z` one-minute load
spike of `555.87`. That is consistent with scheduler or admission pressure
clearing unevenly rather than a healthy saturated fuzzing fleet. The refreshed
graph now shows browser/e2e just above the `24` lane floor, while the level-mix
synthesis contradicts raw graph trust and says useful capacity must fail closed
unless roots, sessions, PIDs, events, and summaries reconcile.

The graph-counted fuzzing mix is browser/e2e-heavy: `25` browser/e2e lanes,
plus one lane each for unit-property, coverage-guided lower-level, and
protocol-server. Browser/e2e remains the only level producing triaged
likely-real findings in the committed triage-output metric. Current execution
rate is low in the freshest bucket (`20` browser/e2e executions, about
`80`/hour, `256` unit-property executions, about `1,024`/hour, and `540`
protocol-server executions, about `2,160`/hour). Persona evidence is stricter
than the graph: raw
supervisor rows do not prove useful live capacity unless roots, sessions, PIDs,
events, and summaries all reconcile. The immediate operational interpretation
is to keep targeted HTTP browser correctness running, fix fail-closed lane
accounting, and keep lower-level work to narrow sentinels until pressure clears.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. Cycle 446 launched one
bounded repair job for that strict-head proof, but the copied evidence still had
the report pending. The PR loop still needs to convert held ready-product rows,
the two runnable blockers, the active reload-hydration job, and the queued
`PR07C` blocker into validated publishable branches rather than more blocked or
no-progress artifacts.
