# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T22:13:00Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...`
inputs so PR-controller graphs track current raw state instead of stale local
state.

## High-Level Readout

The graph-refresh pipeline is current through `2026-05-22T22:11:02Z` for
current-run accounting and `2026-05-22T22:09:11Z` for monitor passes. The
monitor has `4,100` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are
`280,228`, and current-scan coverage files are `1,363`. The parsed
coverage-goal table has `10` unmet target rows out of `136`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest active run is `run-20260522T212524Z`; its
current-run accounting row at `2026-05-22T22:11:02Z` is trusted
(`current_run_metrics_trusted` `TRUE`, `full_pass_pending` `FALSE`,
`pending_until_first_pass` `FALSE`). It reports latest completed
`duplicateShareCurrent` `0.5`, summary startup failures `0`, and `2` current /
`2` actionable / `2` product-evidence signatures, with top duplicate share
`0.5`. Historical duplicate share is `0.2105` for context only and is not the
plotted live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer-side
novelty-monitor control-plane leak: no-product startup/infra/`unknown` runs can
be misclassified or kept alive because product-evidence detection is too loose,
and benchmark-canary or pause paths can bypass duplicate/noise holds. The
refreshed live row no longer shows pending accounting; the current duplicate
share is high but is on a two-signature denominator, so it should not be read
as a broad product duplicate storm. The persona-loop feedback still calls for
strict local same-family product evidence, non-bypassable no-product
duplicate/noise sentinels, and stopping exact no-product producers.

Resource state is usable, but still not idle. The latest monitor sample has
`399.4G` free memory; the latest disk sample has `90.3GiB` free on `/` and
`458.5GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`63.78%`, with `3.63%` iowait. Latest load averages are `58.92`, `52.99`, and
`53.32` on `64` logical CPUs, with `12` blocked tasks in the same sample.

The latest graph-counted fuzzing mix is concentrated in browser/e2e: `21`
browser/e2e lanes across `18` groups, plus one `unit-property` lane, one
`protocol-server` lane, and one stale `coverage-guided-lower-level` row.
Browser/e2e remains below the persona loop's `24`-lane floor. The active
coverage-guided root contributes eight browser/e2e supervisor rows:
same-user stale draft, parser serialization/transform, real-user rich text,
multi-reload lifecycle, large-post readiness, large-post lifecycle, and
large-post lifecycle completion. Graph-latest append campaigns also contribute
three focused HTTP rows, six gap-booster rows, and one strict HTTP persistence
row. Current graph-confirmed lower-level work is narrow: one table query-array
CRDT unit/property lane, one HTTP polling protocol-server row, and one stale
rich-text CRDT coverage-guided-lower-level row.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion work
have no current graph-counted lane. Persona-loop evidence rejects treating raw
row counts as fully trusted useful capacity: the latest non-empty level-mix
synthesis calls for narrow browser materialization repair instead of generic
lower-level expansion, flags stale or contradictory telemetry, and keeps
sentinels capped. The latest feedback-action reports the shared dependency
repair, a bounded unit/property retarget to table query-array CRDT, one
protocol/server sentinel, and browser backfill blocked by autoscaler pressure.
The refreshed graph now shows graph-counted browser rows and protocol-server
execution, but still has zero backend-api lanes/executions and no current
coverage-guided-lower-level execution bucket, so keep parser/backend action
results as action evidence until graph-visible current residency appears.

The execution counter has `16,913,093` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T22:00:00Z` has `512` unit-property executions (`2,048`/hour) and
`181` browser/e2e executions (`724`/hour). Protocol-server is zero in that
partial bucket, after `2,725` executions in the `21:45` bucket. The latest
bucket has zero coverage-guided lower-level, backend-api,
transport-integration, and fuzz-assertion executions.

The PR-focused data is live. The controller state has `21` counted work items:
`13` high-priority ready-product PR rows marked published, `5` high-priority
ready-product rows held by the controller, one runtime-gated PR row needing
owner evidence, one high-priority reload-hydration deferred-family row needing
a product decision, and one medium-priority pre-save-search diagnostic row. The
current push manifest has no graph-counted publishable branch. The
critical-path executor has `7` blockers: active benchmark-canary exact-stack
repair, active productive-analysis control feedback, an active PR07C
owner-matrix blocker, held reload-hydration, and three terminal blockers. PR17
seed `1020002`, seed `5200005`, and seed `1060015` are terminal. PR07C owner
matrix should be consumed before promotion, benchmark-canary exact-stack
promotion repair remains active, productive-analysis is active, and
reload-hydration is held by a single-flight manifest. The latest PR-split
feedback keeps the fileable prefix through `PR15C` and rejects
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
not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted` is `FALSE`, treat the duplicate/noise share as
incomplete current-run accounting and as a control-plane health issue until the
active run completes a full pass.

The latest sample for `run-20260522T212524Z` was taken at
`2026-05-22T22:11:02Z`; it reports `current_run_metrics_trusted` `TRUE`,
`pending_until_first_pass` `FALSE`, and `full_pass_pending` `FALSE`. The latest
completed duplicate share field is `0.5`, summary startup failures are `0`,
and the current-run denominator is `2` current signatures / `2` actionable
signatures / `2` product-evidence signatures with top duplicate share `0.5`.
The latest completed full pass ended at `2026-05-22T22:09:11Z`, about `1.85`
minutes before the accounting snapshot. The earlier `21:27:54Z` row for the
same active run was pending first-pass accounting; that pending state has
cleared in the refreshed data.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is still in the
producer-side control plane: no-product startup/infra/`unknown` runs can be
misclassified or kept alive because product-evidence checks count loose,
global, raw, or unrelated signals, and benchmark-canary or producer pause paths
can bypass stopping the noisy group. Earlier feedback-actions applied bounded
fixes, but the latest synthesis still asks for strict local same-family product
evidence, non-bypassable no-product duplicate/noise sentinels, and exact
no-product producer stops. The latest graph row is trusted and has a
two-signature denominator; the remaining risk is control-plane recurrence, not a
measured broad product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The latest sample
has `90.3GiB` free on root and `458.5GiB` free on the data volume; the data
volume is around `87.1%` used and root is around `41.3%` used. Root pressure
remains stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,808`. Current enabled groups in the
summary are:
`novelty-http-large-post-readiness`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-ws-parser-serialization`,
`novelty-ws-real-user-rich-text`,
`novelty-ws-multi-reload-lifecycle`,
`novelty-http-same-user-stale-draft`,
`novelty-ws-real-user-coverage-bridge`, and
`novelty-ws-parser-transform`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `21` browser/e2e lanes across `18` groups. Lower-level work is
narrow: `unit-property` and `protocol-server` each have one current
graph-counted row, while the lone `coverage-guided-lower-level` row is stale
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only `fuzz-assertion` work have no current graph-counted lane
in this snapshot.

The active accounting root is `run-20260522T212524Z`. Current graph-counted
browser/e2e supervisor rows include eight coverage-guided rows, three focused
rows, six gap-booster rows, and one strict HTTP expansion row. Those rows cover
same-user stale draft, parser serialization/transform, real-user rich text,
multi-reload lifecycle, large-post readiness/lifecycle/completion, focused
existing-post CRDT HTTP, focused large HTTP lifecycle, focused title reload
HTTP, async/server blocks, three-user late join, revision/autosave recovery,
long-doc, permissions/auth locks, real-user title/rich-text, and persistence
probing. The summary also marks large-post readiness/lifecycle, parser
serialization, real-user rich text, multi-reload lifecycle, same-user stale
draft, real-user coverage bridge, and parser transform groups as enabled. The
graph sees a current protocol-server HTTP polling row and a current
unit-property table query-array CRDT row.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest non-empty level-mix synthesis
says to make a narrow browser materialization repair, not a capacity expansion:
fix the fake `large-post-readiness` producer profile, recover
`table-stale-snapshot` when startup noise is clear, and evict or disable dead
parser-transform work to keep net load flat. It also calls out telemetry
defects where supervisor, novelty, status, stale gap-booster, fuzz-assertion,
and lower-level state can disagree, so raw graph rows still should not be read
as fully trusted useful capacity. The latest feedback-action reports the
dependency repair, keeps `unit-property` capped through a bounded table
query-array CRDT retarget, starts one protocol/server sentinel, and says
additional browser backfill was blocked by autoscaler pressure. The refreshed
graph now has `21` graph-counted browser/e2e lanes, still below the `24`-lane
floor, plus protocol-server execution buckets. It still has zero backend-api
rows and zero backend-api executions, no current coverage-guided-lower-level
execution bucket, and a stale rich-text CRDT coverage-guided-lower-level row.
Treat protocol-server as graph-present sentinel evidence, and keep
parser/backend action results as action evidence until graph-visible current
residency appears.

The latest native-harness synthesis selects
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated Node/V8 coverage-guided lower-level target. The latest native action
implemented the runner, launcher, Jest target, and npm script, then validated a
targeted Jest run plus a one-attempt smoke with collector-style
`fuzzLevel: "coverage-guided-lower-level"` events. That is positive action
evidence, but the graph still rejects treating this as sustained live
lower-level residency: the latest graph-counted coverage-guided lower-level row
is a stale rich-text CRDT row and current execution buckets remain zero.

The latest protocol-server synthesis file is empty; the latest non-empty
synthesis selects the HTTP polling REST harness for `POST /wp-sync/v1/updates`.
The latest action implemented and validated that protocol-server fuzz harness
with a passing 25-case smoke seed, collector-style root/lane artifacts, and
`fuzzLevel: "protocol-server"` events. The level-mix action later attempted a
bounded protocol/server sentinel that passed some seeds and then stopped on
timeout/wp-env infra failures. The refreshed graph has a protocol-server row
and execution buckets through `2026-05-22T21:45:00Z`; protocol-server was
nonzero at `20:30`, `21:00`, `21:30`, and `21:45`, with `2,365` executions in
the `20:30` bucket and `1,800` executions in the `21:30` bucket. The latest
`22:00` partial bucket has no protocol-server executions, after `2,725`
executions in the `21:45` bucket.
Treat protocol-server as present but still sentinel-scale rather than broad
expansion. The latest protocol-server synthesis and action evidence still
select and validate the HTTP polling REST harness.

Fuzz-only assertion work is not graph-counted as active. The latest assertion
action added two gated assertions; level-mix evidence still treats
`fuzz-assertion` as stale rather than current graph capacity.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `90,508`
browser/e2e, `5,794,688` unit-property, `458,097`
coverage-guided lower-level, and `10,569,800`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the current reconstructed table.

The latest 15-minute bucket at `2026-05-22T22:00:00Z` is partial and has
`512` unit-property executions (`2,048`/hour), `181` browser/e2e executions
(`724`/hour), and zero protocol-server executions. The previous `21:45` bucket
had `2,725` protocol-server executions (`10,900`/hour), the `21:30` bucket had
`1,800` protocol-server executions (`7,200`/hour), and the `20:30` bucket had
`2,365` protocol-server executions (`9,460`/hour). Coverage-guided lower-level,
backend-api, transport-integration, and fuzz-assertion are zero in the latest
bucket. The persona feedback reports a validated lower-level harness and a
protocol/server sentinel; the committed execution-count graph now shows
protocol/server execution, but not a current coverage-guided lower-level bucket.
That lower-level mismatch remains for the next accounting pass.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `138` likely-real
findings over about `589.2` runner-hours, or `23.42` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,287`
total candidates: `1,279` browser/e2e candidates, `6` unit-property
candidates, and `2` coverage-guided-lower-level candidates. Backend-api,
protocol-server, transport-integration, standalone fuzz-assertion, and other
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

The latest weak-completion profiles have successful record counts at zero for
collaboration UI signals (`114` records). Table stale snapshot HTTP now has
`1` successful record from `15` records. Revision persistence has `8`
successful records, full-profile rows have `16`, parser serialization has
`35`, multi-reload lifecycle has `56`, long-session large-doc has `39`,
many-user lifecycle has `47`, common blocks have `43`, code-editor smoke has
`64`, large-post three-user HTTP has `67`, parser transform has `68`,
three-user late join has `113`, media cross-entity has `121`,
block-gauntlet has `142`, async/server blocks have `143`, and
permissions/auth/locks has `268`. This
still argues for completion-depth repair in existing covered surfaces before
adding another broad surface class.

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
browser users, lifecycle reloads, save/autosave checkpoints, strict
persistence oracles, and a passed run. Separate ingredient-lane hits do not
increment this cross-product count. The goal-progress graph also includes
nearby large-post, HTTP, and three-user goals so already-running combined-ish
lanes remain visible while the stricter cross-product key ramps up.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is currently marked enabled in the sampled state, and the
adjacent large-post three-user HTTP profile has `800` records seen with `67`
successful records. Those adjacent hits still do not count as completed
combined coverage unless the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. Users present in a room are not enough. A run
only contributes to the active-user series when distinct browser users
actually perform successful editing actions, and final UI witness-sweep-only
edits do not count as active-editor evidence. The cross-product rows require
the same active-editor threshold together with realistic editing ingredients:
save/reload lifecycle, late join, autosave, rich text/list/table editing,
synced notes, collaboration UI signals, large-document setup, HTTP polling
with an explicit client-limit override, same-user tabs, mixed same/distinct
identities, revision restore, publish transition, persistence races,
same-block contention, note reply/resolve/delete lifecycle, WS
reconnect/background churn, HTTP 413 compaction, title/content/excerpt
boundaries, strict 30-user operation ledgers, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. The rich/list, synced notes, HTTP
polling, HTTP client-limit override, same-user tabs, same/distinct identity
mix, revision restore, publish transition, UI-signal, save/reload/autosave,
concurrent save/autosave/publish races, late-join, large-document, same-block
contention, note reply/resolve/delete lifecycle, WS reconnect/background churn,
HTTP 413 compaction, title/content/excerpt boundary, and strict 30-user
operation-ledger cross-products remain `0` at the 6/10/12/30 active-editor
thresholds where they apply. The active-editing groups are not currently marked
enabled in the active-editing progress table, so these graphs should remain red
until the monitor admits the six-, twelve-, and thirty-active-editor lanes and
they start producing passed records.

Largest current unmet goal and active-editing gaps:

| Goal                                                    | Current | Target |
| ------------------------------------------------------- | ------: | -----: |
| successful collaboration-ui-signals records             |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle    |       0 |     25 |
| many-user active-editing records                        |       0 |     25 |
| six-active-editor lifecycle cross-product               |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product     |       0 |     25 |
| six-active-editor UI-signal cross-product               |       0 |     25 |
| six-active-editor large-document cross-product          |       0 |     25 |
| remote selection and cursor visible                     |       1 |     25 |
| successful parser-serialization records                 |      35 |     50 |
| async/server block core/template-part                   |       0 |     20 |
| remote and local autosave checkpoints                   |      14 |     25 |
| successful three-user late-join records                 |      17 |     25 |
| table stale snapshot oracle                             |       0 |     10 |
| successful table-stale-snapshot-http records            |       1 |     10 |
| action table-stale-snapshot-html                        |       4 |     10 |
| local post recovery autosave                            |      19 |     25 |
| ten-active-editor progress                              |       0 |     10 |
| twelve-active-editor progress                           |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product  |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product  |       0 |     10 |
| HTTP client-limit override for active editing           |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product |       0 |     10 |
| six-active-editor revision-restore cross-product        |       0 |     10 |
| six-active-editor publish-transition cross-product      |       0 |     10 |
| six-active-editor mixed-identity lifecycle cross-product |       0 |     10 |
| six-active-editor same-block contention cross-product   |       0 |     10 |
| six-active-editor note-thread lifecycle cross-product   |       0 |     10 |
| six-active-editor persistence-race cross-product        |       0 |     10 |
| six-active-editor WS reconnect/background cross-product |       0 |     10 |
| six-active-editor HTTP 413 compaction cross-product     |       0 |     10 |
| six-active-editor post-field boundary cross-product     |       0 |     10 |
| twelve-active-editor synced-notes/lifecycle cross-product |       0 |      5 |
| thirty-active-editor progress                           |       0 |      3 |
| strict 30-user operation ledger                         |       0 |      3 |

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

The current controller state has `21` counted work items. The most important
live queue entries are `5` high-priority ready-product PR rows held by the
controller, `13` published ready-product rows still under validation, one
runtime-gated PR row needing owner evidence, one high-priority
reload-hydration deferred-family row needing a product decision, and one
medium-priority pre-save-search diagnostic row.

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

The current push manifest has no graph-counted publishable branch. Published
and held branches remain visible in the progress table. The latest PR-split
persona feedback rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and
owner rows. The copied feedback requests exactly one bounded strict-head
reproduction repair job for `8fb598778357` / seed `6000007`; do not treat
wait-only or no-progress cycles as acceptance while actionable rows remain.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: active benchmark-canary exact-stack
repair, active productive-analysis control-feedback work, active PR07C
owner-matrix work, one held deferred-family blocker
(`reload-hydration`), and three terminal blockers (`PR17` seed `1020002`,
`seed-5200005-reducer`, and `seed-1060015-reducer`). The current active job
sessions include the critical-path loop, benchmark-canary continuation,
productive-analysis continuation, and level-mix loop/watchdog sessions. PR07C
owner matrix is active in the blocker table and should not be promoted without
fresh owner rows; benchmark-canary fuzzer-gap exact-stack promotion repair is
active, productive-analysis is active, and reload-hydration is gated by a
single-flight manifest.
The repeated no-progress table currently has one `benchmark-canary-fuzzer-gap`
row: `pre_oracle_or_preflight_only`.

## Interpretation

The active coverage root is `run-20260522T212524Z`, and its latest accounting
row is trusted. The row was sampled at `2026-05-22T22:11:02Z`; it reports
`full_pass_pending` `FALSE`, `pending_until_first_pass` `FALSE`,
`current_run_metrics_trusted` `TRUE`, latest completed
`duplicateShareCurrent` `0.5`, and summary startup failures `0`. The current
signature denominator is `2` current signatures / `2` actionable signatures /
`2` product-evidence signatures, with top duplicate share `0.5`. Historical
aggregate duplicate/noise remains context only. The live graph should be read
as a trusted current-output-dir sample with a high share on a tiny denominator,
not as proof of a broad product duplicate storm.

The latest duplicate/noise persona synthesis rejects a product-bug reading and
points at a producer-side control-plane leak in novelty-monitor
scheduling/accounting: no-product startup/infra/`unknown` runs can masquerade
as product-evidence work or stay active while pause paths, benchmark-canary
exceptions, and no-analysis sentinels defer stopping exact noisy groups. The
latest synthesis recommends strict local same-family product evidence and
non-bypassable no-product duplicate/noise sentinels before benchmark-canary
bypass or representative holds.

The resource picture is usable but not idle: latest CPU utilization is
`63.78%`, with `3.63%` iowait; load is `58.92`, `52.99`, and `53.32` on `64`
logical CPUs, with `12` blocked tasks. Five-minute load is below the core count,
but optional browser admission still needs to respect short-window load,
blocked-task, and iowait pressure.

The graph-counted fuzzing mix is browser/e2e-heavy: `21` browser/e2e lanes,
plus one current unit-property lane, one current protocol-server lane, and one
stale rich-text CRDT coverage-guided lower-level row. Persona evidence is
stricter than the graph and rejects raw row counts as trusted useful capacity
unless roots, sessions, PIDs, events, and summaries reconcile. The latest
level-mix synthesis calls for narrow browser materialization repair, not broad
lower-level expansion, and flags stale or contradictory telemetry as a reason
to keep graph row counts conservative. The level-mix feedback-action reports
dependency repair and graph-visible browser rows are now higher, but still
below the persona floor. Native-harness evidence reports a promoted parser
coverage-guided lower-level harness with a passing targeted Jest run and
one-attempt smoke, but the graph still shows only a stale rich-text CRDT
coverage-guided lower-level row and no current coverage-guided lower-level
execution bucket. Protocol-server evidence reports a passing 25-case HTTP
polling validation and then a bounded sentinel that hit infra failures. The
refreshed graph has protocol-server telemetry, so it confirms sentinel-scale
protocol-server activity. It does not confirm backend/API,
transport-integration, standalone fuzz-only assertion work, or current-bucket
coverage-guided lower-level execution.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial:
the `2026-05-22T22:00:00Z` bucket has `512` unit-property executions, `181`
browser/e2e executions, and zero protocol-server executions. Protocol-server
was nonzero in the previous `21:45` bucket with `2,725` executions, at `21:30`
with `1,800` executions, and in the `20:30` bucket with `2,365` executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `800` records and
`67` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, but the current push manifest advertises no
publishable branch. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it; the
feedback-action launched one
bounded strict-head repair job for that family. The PR loop still needs to
convert held ready-product rows, active productive-analysis feedback, active
benchmark-canary exact-stack promotion repair, active PR07C owner-matrix work,
and held reload-hydration work into validated publishable branches rather than
more blocked or no-progress artifacts. Seed `5200005` is terminal, and PR07C
owner-matrix work is active in the graph; persona evidence still rejects
promotion without fresh owner rows.
