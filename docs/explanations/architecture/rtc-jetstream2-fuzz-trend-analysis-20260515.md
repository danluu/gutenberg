# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T03:34:51Z`

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

The graph-refresh pipeline is current through `2026-05-23T03:28:59Z` for
monitor passes and completed current-run accounting, with the latest accounting
sample at `2026-05-23T03:33:19Z`. The monitor has `4,149` passes from
`2026-05-15T01:21:42Z` onward, cumulative coverage record observations are
`282,313`, current-scan coverage files are `2,726`, and the parsed
coverage-goal table has `4` unmet rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row is for `run-20260523T012916Z`
and is trusted: `current_run_metrics_trusted_last` is `TRUE`,
`pending_until_first_pass` is `FALSE`, and the latest completed full pass is
`2026-05-23T03:28:59Z`. The row carries duplicate share `0`, summary startup
failures `0`, and top duplicate share `0` over `0` current signatures, `0`
actionable signatures, and `0` product-evidence signatures. That is measured
current-run accounting with no live duplicate/noise family in the latest
sample.

The latest non-empty duplicate/noise synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It points to a
`rtc-browser-fuzz-novelty-monitor.mjs` producer/scheduler leak where forced
benchmark canary or sticky HTTP groups can bypass current duplicate/noise
holds, so product-evidence duplicate families need representative-capping at
the producer. The latest feedback-action says that novelty-monitor scheduling
was patched and restarted, with benchmark bypass events at `0` after
`2026-05-23T02:21:15Z`. The refreshed graph is later than that feedback status
and shows current duplicate/noise at `0`, over zero current signatures.

Resources are usable, with output volume, iowait, and load still tight. Latest
CPU utilization is `63.79%`, with `7.72%` iowait. Latest load averages are
`48.83`, `50.02`, and `52.35` on `64` logical CPUs, with `2` blocked tasks.
The latest disk sample has `89.6GiB` free on `/` and `377.0GiB` free on
`/media/volume/danluu-fuzz-data`; the data volume is `89.4%` used.

The latest graph-counted fuzzing mix is still concentrated in browser/e2e:
`24` browser/e2e lanes across `23` groups. Lower-level graph evidence has one
latest `unit-property` rich-text CRDT merge row, one current `protocol-server`
sentinel row, and one stale `coverage-guided-lower-level` rich-text CRDT row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only `fuzz-assertion` work have no current graph-counted lanes or
execution buckets. The latest level-mix synthesis again requested one
admitted append-only `large-http-lifecycle` browser shard and rejected broad
lower-level expansion; the refreshed graph now has a current focused
`focused-large-http-lifecycle` row. The latest level-mix feedback-action file
is empty, so the previous non-empty feedback still stands as a caution: it
reported browser capacity below floor and a focused large-HTTP append failure
before `wp-env` startup. The graph now counts browser/e2e exactly at the
`24`-lane floor and counts protocol-server activity but not backend-api
activity yet; the focused browser row should be read as telemetry presence
rather than proof of productive focused-shard throughput.

The execution counter has `16,974,042` estimated individual executions. The
trailing `2026-05-23T03:30:00Z` bucket is partial: `86` browser/e2e
executions, `768` unit-property executions, and `600` protocol-server
executions, with zero coverage-guided-lower-level, backend-api,
transport-integration, and fuzz-assertion executions. The prior `03:15` bucket
had `174` browser/e2e, `1,312` unit-property, and `2,425` protocol-server
executions.

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
`2026-05-23T03:33:19Z`; the latest completed full duplicate/noise accounting
pass was `2026-05-23T03:28:59Z`. The row reports
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
duplicate share `0`, summary startup failures `0`, and top duplicate share
`0`. The current-run denominator is `0` current signatures, `0` actionable
signatures, and `0` product-evidence signatures, so the latest sample has no
measured live duplicate/noise family. Earlier rows for this same run were
pending or had small-signature duplicate shares; the latest row has completed
the first full accounting pass and is the live health signal.

The latest non-empty duplicate/noise persona synthesis rejects a product-bug
or broad product duplicate-storm interpretation and calls the remaining issue
a novelty-monitor producer/scheduler leak: forced benchmark canary and sticky
HTTP groups can bypass active current-run holds, so product-evidence duplicate
families need one representative and then sibling producer pause/blocking. The
latest feedback-action says the scheduler fix was applied, syntax-checked, and
restarted, with strict startup suppressed rather than analyzed. It also reported
post-restart active duplicate share `0.25`; the refreshed graph is later and
now measures `0`, over zero current signatures. Startup failures remain `0`,
so the live graph no longer shows an active duplicate/noise follow-up signal.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.6GiB` free and `41.8%` used; the data volume has `377.0GiB` free
and is `89.4%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,840`. Current enabled groups in the
summary are `novelty-ws-real-user-save-reload` and
`novelty-ws-real-user-coverage-bridge`, plus
`novelty-ws-parser-transform`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
heavy: `24` browser/e2e lanes across `23` groups. Current browser/e2e rows
include active coverage-guided WS/HTTP groups for block gauntlet, revision
persistence and recovery, same-user lifecycle and stale tabs, same-user stale
draft, parser serialization/transform, real-user save/reload, multi-reload,
large-post HTTP readiness/lifecycle/completion, list-move refresh, and table
stale snapshot. They also include the current focused
`focused-large-http-lifecycle` shard, six gap-booster rows, and one
strict-expansion `http-large-lifecycle` row.

Lower-level graph residency is narrow. `unit-property` is the latest rich-text
CRDT merge row, and `protocol-server` is present as the current HTTP polling
sentinel row from `review-20260523T000000Z`.
The lone `coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest non-empty level-mix synthesis
recommends one append-only `large-http-lifecycle` browser shard, keeps
protocol/server and backend/API at sentinel scale, keeps fuzz-assertion held,
and says not to expand generic lower-level fuzzing. Its browser/e2e
below-floor claim is partially superseded by the refreshed graph, which counts
`24` lanes exactly at the stated floor. The requested focused
`large-http-lifecycle` row is now present in the graph. The latest level-mix
feedback-action file is empty; the previous non-empty feedback kept
browser/e2e protected, started backend/protocol sentinels, and reported
browser still below floor at `13`/`24` with a focused large-HTTP append
failure before `wp-env` startup. That feedback rejects treating the
graph-counted `24` lanes and focused row as proven productive capacity. The
refreshed graph counts the protocol-server sentinel, but it still has no
backend-api lane or execution bucket. It also agrees that lower-level capacity
accounting is weak: live fuzzing remains concentrated in browser/e2e lanes,
with only one current unit-property row, one protocol-server sentinel row,
and one stale coverage-guided-lower-level row. It does not confirm sustained
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution.

The latest native-harness synthesis file is empty; the latest native-harness
action implemented and validated
`coverage-guided-lower-level-block-parser-serialization` as a Node/V8
coverage-guided harness in a bounded smoke run without starting a continuous
loop. The refreshed graph still rejects treating the native-harness action
evidence as sustained live lower-level residency because the graph-counted
coverage-guided-lower-level lane remains the stale rich-text CRDT row. The
latest protocol-server persona synthesis keeps
`/wp-sync/v1/updates` HTTP polling REST fuzzing as the first protocol-server
target and points to validated bounded-run artifacts. The refreshed graph has
a current protocol-server sentinel row plus `02:15`, `02:30`, `02:45`, and
`03:00` execution evidence, plus partial `03:15` and `03:30` buckets, but
protocol-server remains validation/sentinel scale rather than broad continuous
capacity. The fuzz-only assertion action added two gated assertions, but
`fuzz-assertion` remains graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `103,053` browser/e2e, `5,808,576`
unit-property, `458,097` coverage-guided lower-level, and `10,603,536`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T03:30:00Z` bucket is a partial trailing bucket with
`86` browser/e2e executions (`344`/hour), `768` unit-property executions
(`3,072`/hour), and `600` protocol-server executions (`2,400`/hour), with
zero coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `03:15` bucket had `174` browser/e2e
(`696`/hour), `1,312` unit-property (`5,248`/hour), and `2,425`
protocol-server (`9,700`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `156` likely-real
findings over about `602.1` runner-hours, or `25.91` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,498`
raw candidates. The by-level rate table attributes `1,490` browser/e2e
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
list-move refresh HTTP (`53` records) and collaboration UI signals (`146`
records). Table stale snapshot HTTP now has `13` successful records from `132`
records and has cleared its `10`-record goal. Full profile has `16` from
`207`, long-session large-doc has `39` from `581`, common-blocks has `43` from
`88`, many-user lifecycle has `62` from `177`, code-editor smoke has `64` from
`80`, parser serialization has reached `73` from `240`, parser transform has
`68` from `120`, revision persistence has `105` from `205`, multi-reload
lifecycle has `122` from `229`, and the adjacent large-post three-user HTTP
profile has `91` successful records from `1,032` records. This still argues
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
combined group is not currently marked enabled in the sampled state, while the
adjacent large-post three-user HTTP profile has `1,032` records seen with `91`
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
| successful three-user late-join records                     |       7 |     25 |
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

The critical-path blocker table has `7` rows: an active benchmark-canary
exact-stack promotion repair, its active continuation-session marker row, held
deferred-family `reload-hydration`, queued PR07C owner-matrix work, and three
terminal blockers (`PR17` seed `1020002`, `seed-5200005-reducer`, and
`seed-1060015-reducer`). The repeated no-progress summary has one
`benchmark-canary-fuzzer-gap` row: `pre_oracle_or_preflight_only`.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T012916Z` and is now trusted. It has
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0`, summary startup failures `0`, and `0`
current/actionable/product-evidence signatures at `2026-05-23T03:33:19Z`,
with the completed pass at `2026-05-23T03:28:59Z`. Treat this as measured
live duplicate/noise accounting with no active duplicate/noise family in the
latest sample.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler. The latest feedback-action says the scheduler fix was applied and
validated, with post-restart active share `0.25` at that time. The trusted
active accounting row is later and has duplicate share `0`, over zero
signatures. The refreshed graph therefore no longer shows an active
duplicate/noise family, and historical output roots can still contain
no-product artifacts.

The resource picture is usable, with storage, iowait, and load still tight:
latest CPU utilization is `63.79%`, iowait is `7.72%`, one-minute load is
`48.83` on `64` logical CPUs with `2` blocked tasks, and the data volume is
`89.4%` used. Optional browser admission should still respect load, iowait, and
output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and exactly at the persona
loop's `24`-lane browser/e2e floor with `24` lanes across `23` groups. Current
lower-level evidence is limited to a unit-property rich-text CRDT merge row
and a protocol-server HTTP polling sentinel row; the
coverage-guided-lower-level row is stale. The graph still rejects sustained
live coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution despite positive persona-loop action evidence for the
parser lower-level harness, protocol-server harness, lower-level HTTP polling,
and fuzz-only assertions.
It also records that browser/e2e is at floor and includes the requested
`large-http-lifecycle` focused shard. The latest level-mix feedback-action is
empty; the previous non-empty feedback rejects treating those graph rows as
enough productive capacity because it reported `13`/`24` browser capacity and
a focused append failure before `wp-env` startup. It also started
backend/protocol sentinels, but the refreshed graph only counts the
protocol-server sentinel so far.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The trailing execution bucket is partial
and has `86` browser/e2e, `768` unit-property, and `600` protocol-server
executions; the prior `03:15` bucket has `174` browser/e2e, `1,312`
unit-property, and `2,425` protocol-server executions. Lower-level counts
remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `1,032` records and
`91` successful records. Many-user active editing is also still `0` at the
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
