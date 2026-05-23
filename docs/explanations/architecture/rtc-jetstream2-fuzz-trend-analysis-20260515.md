# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T02:06:21Z`

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

The graph-refresh pipeline is current through `2026-05-23T02:02:06Z` for
monitor passes and through `2026-05-23T02:05:20Z` for current-run accounting.
The monitor has `4,130` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `281,297`, current-scan coverage files are
`1,931`, and the parsed coverage-goal table has `8` unmet rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row is for `run-20260523T012916Z`
and is trusted: `current_run_metrics_trusted_last` is `TRUE`,
`pending_until_first_pass` is `FALSE`, and the latest completed full pass is
`2026-05-23T02:02:06Z`. The row carries duplicate share `0.1667`, summary
startup failures `0`, and top duplicate share `0.1667` over `6` current
signatures, `6` actionable signatures, and `6` product-evidence signatures.
That is a measured current-run signal, but the denominator is still narrow and
should not be read as a broad duplicate storm.

The latest non-empty duplicate/noise synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It points to a
`rtc-browser-fuzz-novelty-monitor.mjs` producer/scheduler leak where forced
benchmark canary or sticky HTTP groups can bypass current duplicate/noise
holds, so product-evidence duplicate families need representative-capping at
the producer. The latest feedback-action file is empty, so the refreshed graph
does not show that this loop applied the scheduler fix. The live row is
improved from the prior sample but still has a nonzero duplicate share over a
narrow six-signature denominator.

Resources are usable, with output volume still tight. Latest CPU utilization
is `61.84%`, with `1.45%` iowait. Latest load averages are `62.57`, `53.15`,
and `49.42` on `64` logical CPUs, with `3` blocked tasks. The latest disk
sample has `89.7GiB` free on `/` and `385.8GiB` free on
`/media/volume/danluu-fuzz-data`; the data volume is `89.1%` used.

The latest graph-counted fuzzing mix is concentrated in browser/e2e:
`27` browser/e2e lanes across `27` groups. Lower-level graph evidence has one
latest `unit-property` row, one current `protocol-server` sentinel row, and
one stale `coverage-guided-lower-level` rich-text CRDT row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only `fuzz-assertion` work have no current graph-counted lanes or
execution buckets. The focused browser row is still the append-only
same-user-stale-tabs HTTP shard from an earlier feedback pass; the latest
level-mix synthesis requests `large-http-lifecycle`, and the latest
feedback-action file is empty.

The execution counter has `16,953,322` estimated individual executions. The
trailing `2026-05-23T02:00:00Z` bucket is partial: `279` browser/e2e
executions and `256` unit-property executions, with zero protocol-server,
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `01:45` bucket had `891` browser/e2e,
`448` unit-property, and `685` protocol-server executions.

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
`current_run_metrics_trusted_last` is `FALSE`, treat the duplicate/noise share
as incomplete current-run accounting and as a control-plane health issue until
the active run completes a full pass.

The latest sample for `run-20260523T012916Z` was taken at
`2026-05-23T02:05:20Z`; the latest completed full pass was
`2026-05-23T02:02:06Z`. The row reports `current_run_metrics_trusted_last`
`TRUE`, `pending_until_first_pass` `FALSE`, duplicate share `0.1667`, summary
startup failures `0`, and top duplicate share `0.1667`. The current-run
denominator is `6` current signatures, `6` actionable signatures, and `6`
product-evidence signatures, so the share is measured but narrow. Earlier
rows for this same run were pending; the latest row has completed the first
full accounting pass.

The latest non-empty duplicate/noise persona synthesis rejects a product-bug
or broad product duplicate-storm interpretation and calls the remaining issue
a novelty-monitor producer/scheduler leak: forced benchmark canary and sticky
HTTP groups can bypass active current-run holds, so product-evidence duplicate
families need one representative and then sibling producer pause/blocking. The
latest feedback-action file is empty, so there is no applied-remediation
evidence from this loop. Startup failures remain `0`, and the current
denominator is only six signatures, keeping this in control-plane follow-up
territory rather than product-bug territory.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.7GiB` free and `41.8%` used; the data volume has `385.8GiB` free
and is `89.1%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,836`. Current enabled groups in the
summary are `novelty-http-large-post-readiness`,
`novelty-http-list-move-refresh`, `novelty-http-table-stale-snapshot`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-same-user-stale-draft`, `novelty-ws-block-gauntlet`,
`novelty-ws-multi-reload-lifecycle`, `novelty-ws-parser-serialization`,
`novelty-ws-real-user-rich-text`, and
`novelty-ws-many-user-lifecycle-completion`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
heavy: `27` browser/e2e lanes across `27` groups. Current browser/e2e rows
include six coverage-guided HTTP groups: same-user stale draft, large-post
readiness, large-post lifecycle, large-post lifecycle completion, list-move
refresh, and table stale snapshot. They also include one focused
same-user-stale-tabs HTTP shard, six
gap-booster rows, and fourteen strict-expansion rows covering large-post HTTP
lifecycle, persistence probing, stale drafts, common blocks, block gauntlet,
many-user lifecycle, multi-reload lifecycle, parser serialization/transform,
real-user editing, revision persistence, same-user lifecycle, UI signals, and
three-user late join.

Lower-level graph residency is narrow. `unit-property` is the latest
table-query-array CRDT row, and `protocol-server` is present as the current
HTTP polling sentinel row from
`validation-protocol-server-current-20260523T014441Z`.
The lone `coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest non-empty level-mix synthesis
recommends one append-only `large-http-lifecycle` browser shard, keeps
protocol/server and backend/API at sentinel scale, keeps fuzz-assertion held,
and says not to expand generic lower-level fuzzing. Its browser/e2e
below-floor claim is rejected by the refreshed graph, which counts `27` lanes
above the stated `24`-lane floor. The latest feedback-action file is empty, so
this loop does not provide a new applied mix change. The graph still agrees
that lower-level capacity accounting is weak: live fuzzing remains
concentrated in browser/e2e lanes, with only one current unit-property row,
one protocol-server sentinel row, and one stale coverage-guided-lower-level
row. It does not confirm sustained coverage-guided-lower-level, backend-api,
transport-integration, or fuzz-assertion execution.

The native-harness persona action implemented and validated the
`coverage-guided-lower-level-block-parser-serialization` Node/V8
coverage-guided harness and produced collector-style events in a bounded smoke
run, but it did not start a continuous loop. The graph therefore still rejects
treating that action as sustained live lower-level residency. The
protocol-server persona action implemented and validated the HTTP polling REST
harness; the refreshed graph has a current protocol-server sentinel row plus
`01:45` execution evidence, but the latest partial `02:00` bucket has zero
protocol-server executions, so protocol-server is active at validation/sentinel
scale rather than broad continuous capacity. The
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

Latest cumulative totals are approximately `101,133` browser/e2e, `5,803,616`
unit-property, `458,097` coverage-guided lower-level, and `10,590,476`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T02:00:00Z` bucket is a partial trailing bucket with
`279` browser/e2e executions (`1,116`/hour) and `256` unit-property executions
(`1,024`/hour), with zero protocol-server, coverage-guided-lower-level,
backend-api, transport-integration, and fuzz-assertion executions. The prior
`01:45` bucket had `891` browser/e2e (`3,564`/hour), `448` unit-property
(`1,792`/hour), and `685` protocol-server (`2,740`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `153` likely-real
findings over about `584.2` runner-hours, or `26.19` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,381`
total candidates: `1,373` browser/e2e candidates, `6` unit-property
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
list-move refresh HTTP (`34` records) and collaboration UI signals (`146`
records). Table stale snapshot HTTP has `7` successful records from `77`
records. Revision persistence has `11` successful records from `46`, full
profile has `16` from `207`, long-session large-doc has `39` from `581`,
common-blocks has `43` from `88`, parser serialization has `47` from `173`,
many-user lifecycle has `56` from `165`, code-editor
smoke has `64` from `80`, parser transform has `68` from `120`,
multi-reload lifecycle has `71` from `149`, and the adjacent large-post
three-user HTTP profile has `84` successful records from `963` records. This
still argues for completion-depth repair in existing surfaces before adding
another broad surface class.

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
adjacent large-post three-user HTTP profile has `963` records seen with `84`
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
| remote and local autosave checkpoints                       |      15 |     25 |
| successful three-user late-join records                     |       7 |     25 |
| local post recovery autosave                                |      23 |     25 |
| async/server block core/template-part                       |       0 |     20 |
| successful table-stale-snapshot-http records                |       7 |     10 |
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
| thirty-active-editor many-user active-editing records       |       0 |      3 |
| thirty-active-editor 50-block documents                     |       0 |      3 |
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

The critical-path blocker table has `7` rows: an active benchmark-canary
exact-stack promotion repair, its active continuation row, held
deferred-family `reload-hydration`, queued PR07C owner-matrix work, and three
terminal blockers (`PR17` seed `1020002`, `seed-5200005-reducer`, and
`seed-1060015-reducer`). The repeated no-progress table currently has one
`benchmark-canary-fuzzer-gap` row: `pre_oracle_or_preflight_only`.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T012916Z` and is now trusted. It has
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0.1667`, summary startup failures `0`, and
`6` current/actionable/product-evidence signatures at
`2026-05-23T02:05:20Z`. Treat this as a measured live duplicate/noise signal,
but the denominator is narrow and should not be read as a broad duplicate
storm.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler. The latest feedback-action file is empty, so there is no applied
fix evidence from this loop. The refreshed graph shows improvement but not a
clear status: the trusted active accounting row still has duplicate share
`0.1667` over six signatures. Historical output roots can still contain
no-product artifacts.

The resource picture is usable, with storage still the tightest resource:
latest CPU utilization is `61.84%`, iowait is `1.45%`, one-minute load is
`62.57` on `64` logical CPUs, and the data volume is `89.1%` used. Optional
browser admission should still respect load, iowait, and output-volume
pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and now above the persona
loop's `24`-lane browser/e2e floor at `27` lanes across `27` groups. Current
lower-level evidence is limited to a unit-property table query-array CRDT row
and a protocol-server HTTP polling sentinel row; the
coverage-guided-lower-level row is stale. The graph still rejects sustained
live coverage-guided-lower-level,
backend-api, transport-integration, or fuzz-assertion execution despite
positive persona-loop action evidence for the parser lower-level harness,
protocol-server harness, lower-level HTTP polling, and fuzz-only assertions.
It also records that browser/e2e is now above floor, including an append-only
same-user-stale-tabs HTTP shard from an earlier pass; the latest requested
`large-http-lifecycle` focused shard is not separately confirmed by a new
feedback-action in this loop.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The trailing execution bucket is partial
and has `279` browser/e2e and `256` unit-property executions, with zero
protocol-server executions; the prior `01:45` bucket has `891` browser/e2e,
`448` unit-property, and `685` protocol-server executions. Lower-level counts
remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `963` records and
`84` successful records. Many-user active editing is also still `0` at the
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
