# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T00:34:28Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...`
inputs so PR-controller graphs track current raw state instead of stale local
state.

## High-Level Readout

The graph-refresh pipeline is current through `2026-05-23T00:21:21Z` for
monitor passes and through `2026-05-23T00:33:20Z` for current-run accounting.
The monitor has `4,117` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `280,873`, current-scan coverage files are
`1,790`, and the parsed coverage-goal table has `13` unmet rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row is for `run-20260523T002246Z`
and is not trusted yet: `current_run_metrics_trusted` is `FALSE`,
`pending_until_first_pass` is `TRUE`, and the active run has no current-run
signature denominator. Treat the duplicate/noise share as incomplete
current-run accounting and a control-plane health issue until the active run
completes a full pass. The carried-forward latest completed duplicate share is
`0.3333` with summary startup failures `0`; that came from the previous
trusted `run-20260523T000214Z` row, where current signatures and actionable
signatures were both `3`.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It points to a producer-side control-plane
leak where no-product startup/infra/`unknown` runs can be misclassified or
kept alive when product-evidence checks are loose or benchmark-canary paths
bypass holds. The feedback-action says the no-product gate was hardened, user
count alone stopped counting as product evidence, and no-product
live-analysis drains were excluded. The refreshed graph rejects a fully clear
status: readiness is enabled again and the active run is still pending
trusted duplicate/noise accounting.

Resources are usable, with output volume still tight. Latest CPU utilization
is `41.17%`, with `2.11%` iowait. Latest load averages are `32.22`, `30.43`,
and `34.54` on `64` logical CPUs, with `0` blocked tasks. The latest disk
sample has `89.7GiB` free on `/` and `397.1GiB` free on
`/media/volume/danluu-fuzz-data`; the data volume is `88.8%` used.

The latest graph-counted fuzzing mix is concentrated in browser/e2e:
`30` browser/e2e lanes across `30` groups. Lower-level graph evidence is
limited to one `unit-property` row, one `protocol-server` validation row, and
one stale `coverage-guided-lower-level` rich-text CRDT row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only `fuzz-assertion` work have no current graph-counted lanes or
execution buckets.

The execution counter has `16,933,318` estimated individual executions. The
trailing `2026-05-23T00:30:00Z` bucket is partial: `184` browser/e2e
executions, `160` unit-property executions, and `1,465` protocol-server
executions, with zero coverage-guided-lower-level, backend-api,
transport-integration, and fuzz-assertion executions. The prior `00:15`
bucket had `729` browser/e2e, `288` unit-property, and `1,081`
protocol-server executions.

The PR-focused data is live. The controller state has `35` counted work items:
`27` high-priority ready-product PR rows marked published, `4` high-priority
ready-product rows held by the controller, one low-priority superseded
ready-product row, one runtime-gated row consumed by runtime evidence, one
high-priority reload-hydration deferred-family row needing a product decision,
and one medium-priority pre-save-search diagnostic row. The push manifest has
`0` graph-counted publishable branches. PR-split feedback keeps the fileable
prefix through `PR15C` and rejects `PR16-RLH` as fileable until strict seed
`6000007` reaches the final persistence oracle and owner rows prove it.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative
total. It can fall when the active output root changes or cleanup removes old
per-run files. Cumulative coverage record observations are the better
long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
Pending/incomplete accounting is tracked as its own health signal and should
not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted` is `FALSE`, treat the duplicate/noise share as
incomplete current-run accounting and as a control-plane health issue until the
active run completes a full pass.

The latest sample for `run-20260523T002246Z` was taken at
`2026-05-23T00:33:20Z`; the latest completed full pass was
`2026-05-23T00:21:21Z`. The row reports `current_run_metrics_trusted` `FALSE`,
`pending_until_first_pass` `TRUE`, `active_run_dirs` `6`,
`supervisor_groups_file` `9`, `observed_roots` `21`, and no trusted
current-run signature denominator. The carried-forward latest completed
duplicate share is `0.3333` with summary startup failures `0`; the previous
trusted row had current signatures `3`, actionable signatures `3`,
product-evidence signatures `3`, and top duplicate share `0.3333`.

The duplicate/noise persona synthesis rejects a product-bug or broad product
duplicate-storm interpretation, and the feedback-action says the control-plane
no-product gates were hardened. It also reported
`novelty-http-large-post-readiness` disabled and no active current-run
signatures at the time. The refreshed graph rejects that fully-clear
interpretation: readiness is enabled again and the active run has incomplete
current-run duplicate/noise accounting. That keeps the issue in control-plane
follow-up territory, not product-bug territory.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.7GiB` free and `41.7%` used; the data volume has `397.1GiB` free
and is `88.8%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,830`. Current enabled groups in the
summary are `novelty-ws-thirty-user-lifecycle`,
`novelty-ws-collaboration-ui-signals`,
`novelty-http-table-stale-snapshot`,
`novelty-http-large-post-readiness`,
`novelty-http-list-move-refresh`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-same-user-stale-draft`, and `novelty-ws-block-gauntlet`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
heavy: `30` browser/e2e lanes across `30` groups. Current browser/e2e rows
include nine coverage-guided groups: block gauntlet, same-user stale draft,
thirty-user lifecycle, collaboration UI signals, large-post readiness,
large-post lifecycle, large-post lifecycle completion, list-move refresh, and
table stale snapshot. They also include focused collaboration UI signals, six
gap-booster rows, and fourteen strict-expansion rows covering large-post HTTP
lifecycle, persistence probing, stale drafts, common blocks, block gauntlet,
many-user lifecycle, multi-reload lifecycle, parser serialization/transform,
real-user editing, revision persistence, same-user lifecycle, UI signals, and
three-user late join.

Lower-level graph residency is narrow. `unit-property` is the latest
table-query-array CRDT row, and `protocol-server` is present as the direct
HTTP polling validation row from `validation-direct25-20260523T003007Z`. The
lone `coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis calls for a
narrow browser materialization repair and warns that supervisor, novelty,
status, stale gap-booster, fuzz-assertion, and lower-level state can disagree.
Its latest feedback-action file is empty, so there is no newer action result
to apply. The refreshed graph contradicts the below-floor browser/e2e claim by
counting `30` lanes, but it still agrees that lower-level capacity accounting
is weak: it does not confirm sustained coverage-guided-lower-level,
backend-api, transport-integration, or fuzz-assertion execution.

The native-harness persona action implemented and validated the
`coverage-guided-lower-level-block-parser-serialization` Node/V8
coverage-guided harness and produced collector-style events in a bounded smoke
run, but it did not start a continuous loop. The graph therefore still rejects
treating that action as sustained live lower-level residency. The
protocol-server persona action implemented and validated the HTTP polling REST
harness; the refreshed graph now has a protocol-server validation row and
`00:15`/partial `00:30` execution buckets, so protocol-server is present but
still sentinel/validation-scale rather than broad continuous capacity. The
fuzz-only assertion action added two gated assertions, but `fuzz-assertion`
remains graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `96,479` browser/e2e, `5,800,256`
unit-property, `458,097` coverage-guided lower-level, and `10,578,486`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T00:30:00Z` bucket is a partial trailing bucket with
`184` browser/e2e executions (`736`/hour), `160` unit-property executions
(`640`/hour), and `1,465` protocol-server executions (`5,860`/hour), with
zero coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `00:15` bucket had `729` browser/e2e
(`2,916`/hour), `288` unit-property (`1,152`/hour), and `1,081`
protocol-server (`4,324`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `145` likely-real
findings over about `565.4` runner-hours, or `25.65` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,317`
total candidates: `1,309` browser/e2e candidates, `6` unit-property
candidates, and `2` coverage-guided-lower-level candidates. Backend-api,
protocol-server, transport-integration, standalone fuzz-assertion, and other
buckets have no unique candidates in the latest graph-counted data.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Failure-candidate rates are pre-triage lead indicators, not confirmed bug
counts.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

The latest weak-completion profiles have successful record counts at zero for
collaboration UI signals (`140` records) and list-move refresh HTTP (`15`
records). Table stale snapshot HTTP has `6` successful records from `38`
records. Revision persistence has `8` successful records from `40`, full
profile has `16`, long-session large-doc has `39`, common-blocks has `43`,
parser serialization has `47`, many-user lifecycle has `52`, code-editor
smoke has `64`, parser transform has `68`, multi-reload lifecycle has `69`,
and the adjacent large-post three-user HTTP profile has `76` successful
records from `907` records. This still argues for completion-depth repair in
existing surfaces before adding another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

![Combined-ingredient fuzzing progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-progress.png)

![Combined-ingredient fuzzing goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-goal-progress.png)

![Combined-ingredient fuzzing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-requirements.png)

The combined-ingredient graphs are generated by
`rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R`
from the novelty-state feature key
`cross-product:large-post-three-user-http-lifecycle`. They track the strict
conjunction: HTTP polling, large initial post, at least three browser users,
lifecycle reloads, save/autosave checkpoints, strict persistence oracles, and
a passed run. Separate ingredient-lane hits do not increment this
cross-product count.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is currently marked enabled in the sampled state, while the
adjacent large-post three-user HTTP profile has `907` records seen with `76`
successful records. Those adjacent hits still do not count as completed
combined coverage unless the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track distinct users who edited, not just
users present in a room. Active-editor counts exclude final UI
witness-sweep-only edits. Latest many-user active-editing progress is `0`/`25`
records at six active editors, `0`/`10` at ten active editors, `0`/`10` at
twelve active editors, and `0`/`3` at thirty active editors.

The rich/list, synced notes, HTTP polling, HTTP client-limit override,
same-user tabs, mixed same/distinct identities, revision restore, publish
transition, UI-signal, save/reload/autosave, concurrent
save/autosave/publish races, late-join, large-document, same-block contention,
note reply/resolve/delete lifecycle, WS reconnect/background churn, HTTP 413
compaction, title/content/excerpt boundary, visible remote delete,
code-editor embed stability, nested table awareness, and strict 30-user
operation-ledger cross-products remain `0` at the 6/10/12/30 active-editor
thresholds where they apply. The active-editing groups are not currently
marked enabled in the active-editing progress table.

Largest current unmet goal and active-editing gaps:

| Goal                                                        | Current | Target |
| ----------------------------------------------------------- | ------: | -----: |
| successful parser-serialization records                     |      47 |     50 |
| successful collaboration-ui-signals records                 |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle        |       0 |     25 |
| many-user active-editing records                            |       0 |     25 |
| six-active-editor lifecycle cross-product                   |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product         |       0 |     25 |
| six-active-editor UI-signal cross-product                   |       0 |     25 |
| six-active-editor large-document cross-product              |       0 |     25 |
| six-active-editor visible remote delete cross-product       |       0 |     25 |
| six-active-editor code-editor embed stability cross-product |       0 |     25 |
| six-active-editor nested table awareness cross-product      |       0 |     25 |
| remote selection and cursor visible                         |       2 |     25 |
| remote and local autosave checkpoints                       |      14 |     25 |
| successful three-user late-join records                     |       7 |     25 |
| local post recovery autosave                                |      19 |     25 |
| async/server block core/template-part                       |       0 |     20 |
| table stale snapshot oracle                                 |       0 |     10 |
| action table-stale-snapshot-html                            |       4 |     10 |
| successful table-stale-snapshot-http records                |       6 |     10 |
| ten-active-editor progress                                  |       0 |     10 |
| twelve-active-editor progress                               |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product      |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product      |       0 |     10 |
| HTTP client-limit override for active editing               |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product     |       0 |     10 |
| six-active-editor revision-restore cross-product            |       0 |     10 |
| six-active-editor publish-transition cross-product          |       0 |     10 |
| six-active-editor mixed-identity lifecycle cross-product    |       0 |     10 |
| six-active-editor same-block contention cross-product       |       0 |     10 |
| six-active-editor note-thread lifecycle cross-product       |       0 |     10 |
| six-active-editor persistence-race cross-product            |       0 |     10 |
| six-active-editor WS reconnect/background cross-product     |       0 |     10 |
| six-active-editor HTTP 413 compaction cross-product         |       0 |     10 |
| six-active-editor post-field boundary cross-product         |       0 |     10 |
| twelve-active-editor synced-notes/lifecycle cross-product   |       0 |      5 |
| thirty-active-editor progress                               |       0 |      3 |
| successful many-user lifecycle records with thirty users    |       0 |      3 |
| successful thirty-user documents                            |       0 |      3 |
| successful thirty-user late join documents                  |       0 |      3 |
| thirty-active-editor lifecycle cross-product                |       0 |      3 |
| thirty-active-editor rich/list/lifecycle cross-product      |       0 |      3 |
| thirty-active-editor UI-signal cross-product                |       0 |      3 |
| thirty-active-editor large-document cross-product           |       0 |      3 |
| strict 30-user operation ledger                             |       0 |      3 |

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

The current controller state has `35` counted work items. The most important
live queue entries are `4` high-priority ready-product PR rows held by the
controller, `27` published ready-product rows still under validation, one
low-priority ready-product row marked superseded, one runtime-gated row
consumed by runtime evidence, one high-priority reload-hydration
deferred-family row needing a product decision, and one medium-priority
pre-save-search diagnostic row.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates, deferred
family budget gates, resource reserve, single-flight guards, or repeated
critical-path continuations are slowing progress.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has `0` graph-counted publishable branches. Published
and held branches remain visible in the progress table. The latest PR-split
persona feedback rejects promoting `PR16-RLH` as fileable: the ready prefix
remains through `PR15C`, while `RLH-6000007-candidate` is blocked pending
strict seed `6000007` proof and owner rows. The feedback requests exactly one
bounded strict-head reproduction repair job for `8fb598778357` / seed
`6000007`.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path table has `6` rows: runnable benchmark-canary exact-stack
repair, held deferred-family `reload-hydration`, queued PR07C owner-matrix
work, and three terminal blockers (`PR17` seed `1020002`,
`seed-5200005-reducer`, and `seed-1060015-reducer`). The repeated no-progress
table currently has one `benchmark-canary-fuzzer-gap` row:
`pre_oracle_or_preflight_only`.

## Interpretation

The latest active current-output-dir accounting row is not trusted because
`run-20260523T002246Z` has not completed a full pass. Do not read the plotted
pending duplicate/noise share as a measured product duplicate/noise rate.
Until a full pass completes, the live health signal is incomplete accounting
itself. The previous trusted row had `duplicateShareCurrent` `0.3333` over
three current/actionable signatures with summary startup failures `0`, so even
that completed high share was narrow, not a broad duplicate storm.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation. The feedback action
reported no-product gates hardened, readiness disabled, and zero active
signatures. The refreshed graph contradicts the fully-clear part of that
status: readiness is enabled again and the active run is still pending trusted
accounting. Historical output roots can still contain no-product artifacts.

The resource picture is usable, with storage still the tightest resource:
latest CPU utilization is `41.17%`, iowait is `2.11%`, one-minute load is
`32.22` on `64` logical CPUs, and the data volume is `88.8%` used. Optional
browser admission should still respect load, iowait, and output-volume
pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and now above the persona
loop's `24`-lane browser/e2e floor at `30` lanes. Current lower-level evidence
is limited to a unit-property table query-array CRDT row and a protocol-server
HTTP polling validation row; the coverage-guided-lower-level row is stale.
The graph still rejects sustained live coverage-guided-lower-level,
backend-api, transport-integration, or fuzz-assertion execution despite
positive persona-loop action evidence for the parser lower-level harness,
protocol-server harness, backend/API sentinel, and fuzz-only assertions.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The trailing execution bucket is partial
and has `184` browser/e2e, `160` unit-property, and `1,465` protocol-server
executions; the prior `00:15` bucket has `729` browser/e2e, `288`
unit-property, and `1,081` protocol-server executions. Lower-level counts
remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `907` records and
`76` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, but the push manifest currently has `0` publishable
branches. Persona feedback still rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The PR loop still needs to convert held ready-product rows, benchmark-canary
exact-stack promotion repair, queued PR07C owner-matrix work, and held
reload-hydration work into validated publishable branches rather than more
blocked or no-progress artifacts.
