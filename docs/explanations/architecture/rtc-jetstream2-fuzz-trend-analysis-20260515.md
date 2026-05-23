# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T05:04:54Z`

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

The graph-refresh pipeline is current through `2026-05-23T05:01:06Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-23T05:03:17Z`. The latest completed full duplicate/noise accounting
pass is `2026-05-23T05:01:06Z`. The monitor has `4,163` passes from
`2026-05-15T01:21:42Z` onward, cumulative coverage record observations are
`283,062`, current-scan coverage files are `2,817`, and the parsed
coverage-goal table has `4` unmet rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row for
`run-20260523T042725Z` is trusted again:
`current_run_metrics_trusted_last` is `TRUE` and
`pending_until_first_pass` is `FALSE`. The row reports
`duplicateShareCurrent` `0.25`, summary startup failures `0`, four current
signatures, four actionable signatures, four product-evidence signatures, and
top duplicate share `0.25`. That is current-run producer/noise pressure, but
the denominator remains narrow enough that it is not evidence of a broad
product duplicate storm.

The latest non-empty duplicate/noise synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It still points to a
producer/control-plane leak in `rtc-browser-fuzz-novelty-monitor.mjs` and
supervisor publication: forced benchmark canary or sticky HTTP groups,
non-authoritative `supervisor-groups.json`, lost pause metadata, narrow
duplicate family holds, and startup-ish `editor_open_post_timeout` can keep
relaunching producers that should be paused. The latest feedback-action says a
scheduler fix was patched and restarted earlier, with benchmark bypass events
at `0` after `2026-05-23T02:21:15Z` and active duplicate share `0.25` at that
time. The later synthesis asks for more producer-side hardening. The refreshed
graph is later and trusted, but the duplicate share has a four-actionable
signature denominator, so it supports a narrow current producer/noise issue
rather than broad product-noise pressure.

Resources are usable but hot, with output volume tight and load up from the
prior sample. Latest CPU utilization is `69.88%`, with `5.06%` iowait. Latest
load averages are `73.50`, `60.81`, and `53.63` on `64` logical CPUs, with `2`
blocked tasks. The latest disk sample has `89.5GiB` free on `/` and `348.3GiB`
free on `/media/volume/danluu-fuzz-data`; the data volume is `90.2%` used.

The latest graph-counted fuzzing mix is browser/e2e-dominant and now above the
persona-loop floor: `32` browser/e2e lanes across `31` groups.
Lower-level graph evidence has one current `unit-property`
rich-text CRDT merge row, one current `protocol-server` HTTP polling validation
row, and one stale `coverage-guided-lower-level` rich-text CRDT row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only `fuzz-assertion` work have no current graph-counted lanes
or execution buckets. The latest non-empty level-mix synthesis rejects broad
lower-level expansion and recommends only narrow browser/e2e backfill, with
protocol/server counted as blocked-or-zero until timeout/harness accounting is
fixed. The latest non-empty feedback-action then started one focused browser
shard, backend/API and protocol/server sentinels, and a bounded parser
lower-level target, but its regenerated context still reported browser/e2e
below floor at `8`/`24`. The refreshed graph is later and contradicts the
below-floor browser/e2e read at `32`/`24` lanes. It captures a fresh focused
`large-http-lifecycle` browser shard, a fresh strict expansion browser set, and
the protocol-server validation row, but still not a graph-counted backend/API
lane or fresh parser lower-level lane, so the feedback evidence and
graph-counted residency still disagree on lower-level representation.

The execution counter has `16,992,680` estimated individual executions. The
trailing `2026-05-23T05:00:00Z` bucket has `230` browser/e2e executions,
`416` unit-property executions, and `25` protocol-server executions, with zero
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `04:45` bucket had `764` browser/e2e and
`2,464` unit-property executions.

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

The latest sample for `run-20260523T042725Z` was taken at
`2026-05-23T05:03:17Z`; the latest completed full duplicate/noise accounting
pass was `2026-05-23T05:01:06Z`, about `2.2` minutes behind the sample. The
row reports `current_run_metrics_trusted_last` `TRUE`,
`pending_until_first_pass` `FALSE`, `duplicateShareCurrent` `0.25`, summary
startup failures `0`, four current signatures, four actionable signatures,
four product-evidence signatures, and top duplicate share `0.25`. The
current-run duplicate share is still elevated enough to track as producer/noise
pressure, but its denominator is four actionable/product-evidence signatures.
Read this as a narrow current producer or duplicate-family health signal, not
a broad measured product duplicate storm.

The latest non-empty duplicate/noise persona synthesis rejects a product-bug
or broad product duplicate-storm interpretation and calls the remaining issue
a novelty-monitor producer/supervisor scheduling leak. Its requested next
fixes are to preserve pause/no-analysis metadata, make post-policy
`supervisor-groups.json` authoritative after benchmark-canary forcing, include
startup-ish `editor_open_post_timeout` in product-evidence duplicate holds,
and keep one representative for meaningful product-evidence families. The
latest feedback-action says an earlier scheduler fix was applied,
syntax-checked, and restarted, with strict startup suppressed rather than
analyzed and post-restart active duplicate share `0.25`; the refreshed graph is
later and trusted. Startup failures remain `0`, and `duplicateShareCurrent`
has moved back to `0.25` over four actionable signatures, so do not read the
current pressure as broad product duplicate pressure.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.5GiB` free and `41.9%` used; the data volume has `348.3GiB` free
and is `90.2%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,841`. Current enabled groups in the
summary are `novelty-ws-many-user-lifecycle-completion`,
`novelty-http-large-post-readiness`, `novelty-http-list-move-refresh`,
`novelty-http-table-stale-snapshot`, `novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-same-user-stale-draft`, `novelty-ws-block-gauntlet`,
`novelty-ws-multi-reload-lifecycle`, and `novelty-ws-real-user-editing`.
Use the fuzz-level mix and active supervisor rows below for live surface
residency.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant and now above the persona-loop floor: `32` browser/e2e lanes across
`31` groups. Current browser/e2e rows include coverage-guided WebSocket lanes
for block gauntlet, real-user editing, many-user lifecycle completion, and
multi-reload lifecycle; coverage-guided HTTP lanes for same-user stale draft,
large-post readiness/lifecycle/completion, list-move refresh, and table stale
snapshot; one focused `focused-large-http-lifecycle` shard; six gap-booster
rows covering real-user title rich-text, three-user late join, revision
autosave recovery, async/server blocks, permissions/auth locks, and
long-session large-doc; and fourteen strict-expansion rows spanning WebSocket
real-user, same-user, late-join, revision, parser, block-gauntlet,
common-block, multi-reload, many-user, collaboration UI, plus HTTP
persistence, same-user-stale-draft, and large-lifecycle coverage.

Lower-level graph residency is still narrow. `unit-property` has a current
rich-text CRDT merge row, and `protocol-server` has a current HTTP polling
validation row from `2026-05-23T05:01:28Z`. The lone
`coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only assertion work have no current graph-counted lane. Live graph-counted
fuzzing is therefore concentrated in browser/e2e, with small sentinel/current
activity in `unit-property` and `protocol-server`, stale
`coverage-guided-lower-level` residency, and no live graph evidence for
`transport-integration`, `backend-api`, or `fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest non-empty level-mix synthesis
recommends narrow browser/e2e backfill for `large-http-lifecycle`, rejects
broad lower-level expansion, keeps backend/API as a one-lane sentinel, caps
unit/property at one lane, and keeps fuzz-assertion held while protocol/server
is counted as blocked-or-zero until accounting proves otherwise. The latest
non-empty level-mix feedback-action started backend/API and protocol/server
sentinels, a focused `large-http-lifecycle` browser shard, and a bounded
parser lower-level target; it also added holds for duplicate lower-level
relaunches. That feedback says its regenerated context had backend/API,
protocol/server, coverage-guided lower-level, unit/property, and focused
browser represented, but still had browser/e2e below floor at `8`/`24` and
fuzz-assertion held. It also expected the bounded parser target to add
coverage-guided lower-level executions. The refreshed graph is later and now
above floor at `32`/`24` graph-counted browser lanes. It agrees with the
focused `large-http-lifecycle` browser shard and protocol-server evidence and
contradicts the stale below-floor browser/e2e read. It still does not agree
that backend/API or fresh parser lower-level work is live graph-counted
capacity. The latest level-mix feedback-action file at `2026-05-23T04:40:28Z`
is empty, so it adds no newer evidence.

The latest non-empty native-harness synthesis recommends
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated lower-level harness. The latest native-harness action implemented and
validated
`coverage-guided-lower-level-block-parser-serialization` as a Node/V8
coverage-guided parser harness in a bounded smoke run, with root/lane
`events.ndjson` and `fuzzLevel: "coverage-guided-lower-level"` verified. The
refreshed graph still rejects treating that action evidence as sustained live
lower-level residency: the graph-counted coverage-guided-lower-level lane
remains the stale rich-text CRDT row and the latest execution buckets have zero
coverage-guided-lower-level executions. The latest native-harness synthesis
file at `2026-05-23T04:54:26Z` is empty; the latest non-empty synthesis/action
still supports the parser harness but not sustained live residency. The latest
non-empty level-mix feedback-action reports a fresh bounded parser run that
should add `32` lower-level executions, but the graph has not yet counted it as
a current lower-level lane or execution bucket. The latest protocol-server
synthesis promotes `/wp-sync/v1/updates` HTTP polling REST fuzzing; the latest
protocol-server action file at `2026-05-23T04:41:42Z` is empty, while the
latest non-empty action validates a direct bounded run after global CPU
admission declined the tmux-backed launcher. The refreshed graph has a current
protocol-server validation row, `1,825` protocol-server executions in the
`04:15` bucket, and `25` in the `05:00` bucket. It still treats
protocol-server as one active validation/sentinel lane rather than broad
multi-lane capacity. The fuzz-only assertion action added two gated assertions,
but `fuzz-assertion` remains graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `104,435` browser/e2e, `5,822,432`
unit-property, `458,097` coverage-guided lower-level, and `10,607,716`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T05:00:00Z` bucket has
`230` browser/e2e executions (`920`/hour), `416` unit-property executions
(`1,664`/hour), and `25` protocol-server executions (`100`/hour), with zero
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `04:45` bucket had `764` browser/e2e
(`3,056`/hour), `2,464` unit-property (`9,856`/hour), and zero protocol-server
executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `155` likely-real
findings over about `599.7` runner-hours, or `25.84` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,562`
raw candidates. The by-level rate table attributes `1,554` browser/e2e
candidates, `6` unit-property candidates, and `2` coverage-guided-lower-level
candidates. Backend-api, protocol-server, transport-integration, standalone
fuzz-assertion, and other buckets have no unique candidates in the latest
graph-counted data.

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
list-move refresh HTTP (`71` records) and collaboration UI signals (`229`
records). Table stale snapshot HTTP now has `39` successful records from `164`
records and has cleared its `10`-record goal. Full profile has `16` from
`207`, long-session large-doc has `39` from `582`, common-blocks has `43` from
`88`, many-user lifecycle has `66` from `187`, code-editor smoke has `64` from
`80`, parser serialization has reached `85` from `277`, parser transform has
`68` from `120`, revision persistence has `147` from `281`, multi-reload
lifecycle has `147` from `274`, and the adjacent large-post three-user HTTP
profile has `99` successful records from `1,100` records. This still argues
for completion-depth repair in existing
surfaces before adding another broad surface class.

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
adjacent large-post three-user HTTP profile has `1,100` records seen with `99`
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
| successful three-user late-join records                     |       0 |     25 |
| async/server block core/template-part                       |       0 |     20 |
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

The critical-path blocker table has `6` rows: runnable benchmark-canary
exact-stack promotion repair, held deferred-family `reload-hydration`, queued
PR07C owner-matrix work, and three terminal blockers (`PR17` seed `1020002`,
`seed-5200005-reducer`, and `seed-1060015-reducer`). The repeated no-progress
summary has two `benchmark-canary-fuzzer-gap` rows:
`exact_stack_promotion_blocked_without_active_repair` and
`pre_oracle_or_preflight_only`.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T042725Z` and is trusted again. It has
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0.25`, summary startup failures `0`, four current
signatures, four actionable signatures, four product-evidence signatures, and
top duplicate share `0.25` at `2026-05-23T05:03:17Z`, with the latest
completed full pass at `2026-05-23T05:01:06Z`. This is measured current-run
accounting, but the duplicate/noise denominator is four actionable signatures,
so the health signal is narrow current producer/noise pressure rather than
broad product duplicate pressure.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler and supervisor publication path. The latest feedback-action says one
scheduler fix was applied and validated, with post-restart active share `0.25`
at that time; the later synthesis still asks for pause-metadata preservation,
authoritative post-policy supervisor publication, and stronger product-evidence
duplicate holds. The completed accounting before the run rollover had
duplicate share `0`; the current trusted active row now has duplicate share
`0.25` over four actionable signatures. The refreshed graph therefore
rejects a broad product duplicate-storm interpretation, but it still leaves a
narrow producer/control-plane health item to resolve. Historical output roots
can still contain no-product artifacts.

The resource picture is usable but hot, with storage still tight: latest CPU
utilization is `69.88%`, iowait is `5.06%`, one-minute load is `73.50` on
`64` logical CPUs with `2` blocked tasks, and the data volume is `90.2%` used.
Optional browser admission should still respect load, iowait, and output-volume
pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and now above the persona
loop's `24`-lane browser/e2e floor with `32` lanes across `31` groups. Current
lower-level evidence is limited to a current unit-property rich-text CRDT merge
row, a current protocol-server HTTP polling validation row, and a stale
coverage-guided-lower-level row. The graph still rejects sustained live
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution despite positive persona-loop action evidence for the
parser lower-level harness, backend/API sentinel, and fuzz-only assertions.
Protocol-server has a current validation/sentinel row plus `04:15` and `05:00`
bucket executions, matching the positive HTTP polling harness evidence, but it
is still one lane rather than broad capacity. The latest non-empty level-mix
feedback says browser/e2e was `8`/`24` in its regenerated context and lower
levels were represented; the refreshed graph is later, reports `32`/`24`
browser lanes, confirms the focused `large-http-lifecycle` shard and
protocol-server row, and still only confirms unit-property plus stale
coverage-guided-lower-level residency. The graph and persona feedback now
disagree on browser/e2e floor status and still disagree on whether lower-level
representation is live and sustained.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The trailing execution bucket is partial
and has `230` browser/e2e, `416` unit-property, and `25` protocol-server
executions; the prior `04:45` bucket has `764` browser/e2e and `2,464`
unit-property executions. Lower-level counts remain approximate where
reconstructed from batch metadata or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `1,100` records and
`99` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, but the push manifest currently has `0` publishable
branches. Persona feedback still rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The PR loop still needs to convert held ready-product rows, runnable
benchmark-canary exact-stack promotion repair, queued PR07C owner-matrix work,
and held reload-hydration work into validated publishable branches instead of
more blocked or no-progress artifacts.
