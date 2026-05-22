# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T23:02:00Z`

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

The graph-refresh pipeline is current through `2026-05-22T23:00:15Z` for
current-run accounting and `2026-05-22T22:44:21Z` for monitor passes. The
monitor has `4,106` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `280,483`, and current-scan coverage files
are `1,533`. The parsed coverage-goal table has `12` unmet target rows out of
`137`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest current-run accounting row is for
`run-20260522T225303Z` at `2026-05-22T23:00:15Z`; it is not trusted yet
(`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`).
It carries the latest completed duplicate share of `1`, summary startup
failures `0`, and `NA` current / actionable / product-evidence signature
denominators. Read that as incomplete current-run accounting and a
control-plane health issue until the active run completes a full pass, not as
a measured product duplicate/noise rate. The previous trusted row for
`run-20260522T223547Z` had a one-signature denominator (`1` / `1` / `1`) and
top duplicate share `1`. Historical duplicate share is `0.2083` for context
only and is not the plotted live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer-side
novelty-monitor control-plane leak: no-product startup/infra/`unknown` runs can
be misclassified or kept alive because product-evidence detection is too loose,
and benchmark-canary or pause paths can bypass duplicate/noise holds. The
latest feedback-action reports the no-product gate was hardened, large-post
readiness switched to a supported initial profile, user count alone stopped
counting as product evidence, and no-product live-analysis drains were
excluded. The refreshed graph now has an untrusted pending current-run row with
the previous one-signature duplicate share carried forward, so the fix needs
continued verification until active-run accounting completes. The graph also
still lists `novelty-http-large-post-readiness` as current enabled state, which
contradicts the feedback-action's action-time claim that the group was excluded
from active publication; treat that as control-plane state to verify on the
next full pass.

Resource state is usable, but still not idle. The latest monitor sample has
`410.7G` free memory; the latest disk sample has `90.2GiB` free on `/` and
`440.2GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`60.96%`, with `5.08%` iowait. Latest load averages are `47.00`, `47.33`, and
`48.12` on `64` logical CPUs, with `1` blocked task in the same sample.

The latest graph-counted fuzzing mix is concentrated in browser/e2e but has
dropped below the previous snapshot: `12` browser/e2e lanes across `12` groups,
plus one `unit-property` lane, one `protocol-server` lane, and one stale
`coverage-guided-lower-level` row. Browser/e2e is well below the persona
loop's `24`-lane floor. Current graph-confirmed lower-level work is narrow:
table query-array CRDT unit/property and HTTP polling protocol-server are
graph-present; the rich-text CRDT coverage-guided-lower-level row is stale from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects treating raw graph rows as fully trusted useful
capacity. The latest non-empty level-mix synthesis calls for narrow browser
materialization repair instead of generic lower-level expansion, and the
feedback-action says the narrow repair, gap/protocol restarts, and one bounded
HTTP polling lower-level launch were applied. The graph confirms
protocol-server and browser/gap rows, but still does not confirm sustained
current coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution.

The execution counter has `16,920,998` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T23:00:00Z` has `71` browser/e2e executions and `64`
unit-property executions, with zero protocol-server,
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `22:45` bucket had `757` browser/e2e
executions (`3,028`/hour), `608` unit-property executions (`2,432`/hour), and
`50` protocol-server executions (`200`/hour); the `22:30` bucket had `2,545`
protocol-server executions (`10,180`/hour), `749` browser/e2e executions
(`2,996`/hour), and `672` unit-property executions (`2,688`/hour).

The PR-focused data is live. The controller state has `22` counted work items:
`13` high-priority ready-product PR rows marked published, `5` high-priority
ready-product rows held by the controller, one ready-product row now
publish-manifest-ready, one runtime-gated row consumed by runtime evidence, one
high-priority reload-hydration deferred-family row needing a product decision,
and one medium-priority pre-save-search diagnostic row. The push manifest now
has one graph-counted publishable branch, `ready/rtc-pr07c-reload-record-snapshots`,
at `977` net LOC. The critical-path executor still has `7` blockers:
benchmark-canary exact-stack repair, a blank continuation row, a queued PR07C
owner-matrix blocker, held reload-hydration, and three terminal blockers. The
latest PR-split feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it.

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

The latest sample for `run-20260522T225303Z` was taken at
`2026-05-22T23:00:15Z`; it reports `current_run_metrics_trusted` `FALSE`,
`pending_until_first_pass` `TRUE`, startup status `monitor started; full
coverage pass pending`, `2` active run dirs, `2` supervisor group files, and
`21` observed roots. It carries latest completed duplicate share `1`, summary
startup failures `0`, and `NA` signature denominators. Because the current-run
denominators are incomplete, this is a pending-accounting control-plane health
signal, not a measured product duplicate/noise rate. The previous trusted
`run-20260522T223547Z` rows at `22:45:07Z` and `22:52:07Z` had the same small
one-signature denominator: current signatures `1`, actionable signatures `1`,
product-evidence signatures `1`, and top duplicate share `1`. That earlier
trusted result was a one-signature event, not evidence of broad product
duplicate/noise.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is still in the
producer-side control plane: no-product startup/infra/`unknown` runs can be
misclassified or kept alive because product-evidence checks count loose,
global, raw, or unrelated signals, and benchmark-canary or producer pause paths
can bypass stopping the noisy group. The latest feedback-action applied the
bounded control-plane fix, stopped counting user count alone as product
evidence, and reported `0` active signatures at action time. The newest graph
row is not trusted yet and still shows `novelty-http-large-post-readiness` in
current enabled state, so the remaining live issue is current-run accounting
completion and recurrence watching under the hardened gates, not a measured
broad product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The latest sample
has `90.2GiB` free on root and `440.2GiB` free on the data volume; the data
volume is around `87.6%` used and root is around `41.4%` used. Root pressure
remains stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,809`. Current enabled groups in the
summary are:
`novelty-http-large-post-readiness` and
`novelty-http-list-move-refresh`. This current graph state contradicts the
duplicate/noise feedback-action's action-time claim that large-post readiness
was disabled and excluded from active supervisor publication, so treat the
enabled-state row as a control-plane reconciliation item until the new active
run completes a full monitor pass.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e but below target: `12` browser/e2e lanes across `12` groups.
Lower-level work is narrow: `unit-property` and `protocol-server` each have
one current graph-counted row, while the lone `coverage-guided-lower-level`
row is stale from `2026-05-21T11:14:10Z`. `transport-integration`,
`backend-api`, and standalone fuzz-only `fuzz-assertion` work have no current
graph-counted lane in this snapshot.

Current graph-counted browser/e2e supervisor rows include two coverage-guided
rows from the pending `run-20260522T225303Z`, three focused rows, six
gap-booster rows, and one strict HTTP expansion row. Those rows cover
large-post readiness, list-move refresh, focused existing-post CRDT HTTP,
focused large HTTP lifecycle, focused title reload HTTP, async/server blocks,
permissions/auth locks, long-doc, real-user title/rich-text, three-user late
join, revision/autosave recovery, and persistence probing. The graph sees a
current protocol-server HTTP polling row and a current unit-property table
query-array CRDT row.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest non-empty level-mix synthesis
says to make a narrow browser materialization repair, not a capacity expansion:
force benchmark `novelty-http-table-stale-snapshot` through a scoped startup
cooldown bypass, keep backend/protocol as sentinels, and defer broad
lower-level expansion until browser materialization is real. It also calls out
telemetry defects where supervisor, novelty, status, stale gap-booster,
fuzz-assertion, and lower-level state can disagree, so raw graph rows still
should not be read as fully trusted useful capacity. The latest level-mix
feedback-action reports that the narrow repair was applied, novelty restarted,
exact gap/protocol lanes started, and one bounded HTTP polling lower-level lane
launched. It also says the HTTP polling lower-level lane is low-throughput and
`fuzz-assertion` remains stale/held. The refreshed graph has only `12`
graph-counted browser/e2e lanes, still below the floor, plus protocol-server
execution buckets. It still has zero backend-api rows and zero backend-api
executions, no current coverage-guided-lower-level execution bucket, and a
stale rich-text CRDT coverage-guided-lower-level row. Treat protocol-server as
graph-present sentinel evidence, and keep parser/backend action results as
action evidence until graph-visible current residency appears.

The latest native-harness synthesis selects
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated Node/V8 coverage-guided lower-level target. The latest action
implemented and validated the runner, launcher, Jest target, and npm script,
then ran a one-attempt smoke with collector-style `fuzzLevel:
"coverage-guided-lower-level"` events, but did not start an unattended
continuous loop. That is positive action evidence, but the graph still rejects
treating this as sustained live lower-level residency: the latest graph-counted
coverage-guided lower-level row is a stale rich-text CRDT row and current
execution buckets remain zero.

The latest protocol-server synthesis still selects the HTTP polling REST
harness for `POST /wp-sync/v1/updates`; the latest action implemented and
validated that harness with a passing 25-case smoke seed, collector-style
root/lane artifacts, and `fuzzLevel: "protocol-server"` events. The level-mix
action later restarted the protocol sentinel. The refreshed graph has a
protocol-server row and execution buckets through `2026-05-22T22:45:00Z`;
protocol-server was nonzero at `20:30`, `21:00`, `21:30`, `21:45`, `22:15`,
`22:30`, and `22:45`, with `2,365` executions in the `20:30` bucket, `1,800`
executions in the `21:30` bucket, `2,725` executions in the `21:45` bucket,
`1,285` executions in the `22:15` bucket, `2,545` executions in the `22:30`
bucket, and `50` executions in the `22:45` bucket. The latest `23:00` partial
bucket has browser/e2e and unit-property executions, but no protocol-server
executions.
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
legacy batch-count fields. The latest totals are approximately `92,453`
browser/e2e, `5,796,768` unit-property, `458,097`
coverage-guided lower-level, and `10,573,630`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the current reconstructed table.

The latest 15-minute bucket at `2026-05-22T23:00:00Z` is partial and has `71`
browser/e2e executions (`284`/hour), `64` unit-property executions
(`256`/hour), and zero executions for protocol-server, coverage-guided
lower-level, backend-api, transport-integration, and fuzz-assertion. The
previous `22:45` bucket had `757` browser/e2e executions (`3,028`/hour),
`608` unit-property executions (`2,432`/hour), and `50` protocol-server
executions (`200`/hour). The `22:30` bucket had `2,545` protocol-server
executions (`10,180`/hour), `749` browser/e2e executions (`2,996`/hour), and
`672` unit-property executions (`2,688`/hour). The persona feedback reports a
validated lower-level harness and a protocol/server sentinel; the committed
execution-count graph now shows protocol/server execution, but not a current
coverage-guided lower-level bucket. That lower-level mismatch remains for the
next accounting pass.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `143` likely-real
findings over about `597.3` runner-hours, or `23.94` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,327`
total candidates: `1,319` browser/e2e candidates, `6` unit-property
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
collaboration UI signals (`122` records) and list-move refresh HTTP (`3`
records). Table stale snapshot HTTP has
`1` successful record from `16` records. Revision persistence has `8`
successful records, full profile has `16`, long-session large-doc has `39`,
common-blocks has `43`, parser serialization has `45`, many-user lifecycle has
`48`, code-editor smoke has `64`, multi-reload lifecycle has `67`, the
adjacent large-post three-user HTTP profile has `67`, and parser transform has
`68` successful records. This
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
combined group is not currently marked enabled in the sampled state, and the
adjacent large-post three-user HTTP profile has `858` records seen with `67`
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
| successful parser-serialization records                 |      45 |     50 |
| async/server block core/template-part                   |       0 |     20 |
| remote and local autosave checkpoints                   |      14 |     25 |
| successful three-user late-join records                 |      17 |     25 |
| table stale snapshot oracle                             |       0 |     10 |
| action move-list-item                                   |       3 |     10 |
| successful table-stale-snapshot-http records            |       1 |     10 |
| action table-stale-snapshot-html                        |       4 |     10 |
| successful large-post HTTP records with three users     |       4 |     10 |
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

The current controller state has `22` counted work items. The most important
live queue entries are `5` high-priority ready-product PR rows held by the
controller, `13` published ready-product rows still under validation, one
ready-product row in `publish-manifest-ready`, one runtime-gated row consumed
by runtime evidence, one high-priority reload-hydration deferred-family row
needing a product decision, and one medium-priority pre-save-search diagnostic
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

The current push manifest has one graph-counted publishable branch:
`ready/rtc-pr07c-reload-record-snapshots` at `977` net LOC. Published and held
branches remain visible in the progress table. The latest PR-split persona
feedback rejects promoting
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
repair, queued PR07C owner-matrix work, one held deferred-family blocker
(`reload-hydration`), three terminal blockers (`PR17` seed `1020002`,
`seed-5200005-reducer`, and `seed-1060015-reducer`), and one row with an empty
state. The current active job sessions include the benchmark-canary
continuation, the critical-path loop, and the level-mix loop/watchdog sessions.
PR07C owner matrix is queued in the blocker table and should not be promoted
without fresh owner rows; benchmark-canary fuzzer-gap exact-stack promotion
repair is active, and reload-hydration is gated by a single-flight manifest.
The repeated no-progress table currently has one `benchmark-canary-fuzzer-gap`
row: `pre_oracle_or_preflight_only`.

## Interpretation

The latest current-output-dir accounting row is not trusted yet because
`run-20260522T225303Z` is pending its first full pass. The duplicate share
currently carried into that row is incomplete current-run accounting with `NA`
signature denominators, so historical aggregate duplicate/noise remains
context only. The previous trusted row had a one-signature denominator: `1`
current signature, `1` actionable signature, and `1` product-evidence
signature. The current health read is therefore "complete current-run
accounting and verify the duplicate/noise control-plane hardening," not "broad
product duplicate storm."

The latest duplicate/noise persona synthesis rejects a product-bug reading and
points at a producer-side control-plane leak in novelty-monitor
scheduling/accounting: no-product startup/infra/`unknown` runs can masquerade
as product-evidence work or stay active while pause paths, benchmark-canary
exceptions, and no-analysis sentinels defer stopping exact noisy groups. The
latest feedback-action says those gates were hardened, user count alone no
longer counts as product evidence, and no-product drains were excluded from
live-analysis admission. The graph should be checked for recurrence under the
new gates, and the current enabled-state row for
`novelty-http-large-post-readiness` should be reconciled because it contradicts
the action-time report that the group was removed from active supervisor
publication.

The resource picture is usable but not idle: latest CPU utilization is
`60.96%`, with `5.08%` iowait; load is `47.00`, `47.33`, and `48.12` on `64`
logical CPUs, with `1` blocked task. Five-minute load is below the core count,
but optional browser admission still needs to respect short-window load,
blocked-task, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy: `12` browser/e2e lanes,
plus one current unit-property lane, one current protocol-server lane, and one
stale rich-text CRDT coverage-guided lower-level row. Persona evidence is
stricter than the graph and rejects raw row counts as trusted useful capacity
unless roots, sessions, PIDs, events, and summaries reconcile. Protocol-server
is now graph-present with recent execution buckets. Native-harness and
lower-level action evidence is positive, but the graph still does not confirm
current-bucket coverage-guided lower-level, backend/API,
transport-integration, or standalone fuzz-only assertion execution.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest `23:00` execution bucket is
partial with `71` browser/e2e executions and `64` unit-property executions.
The prior `22:45` bucket had `757` browser/e2e executions, `608`
unit-property executions, and `50` protocol-server executions; the `22:30`
bucket had `2,545` protocol-server executions, `749` browser/e2e executions,
and `672` unit-property executions. Lower-level counts remain approximate
where reconstructed from batch metadata or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `858` records and
`67` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible and the push manifest now has one publishable PR07C
branch at `977` net LOC, but persona feedback still rejects `PR16-RLH` as
fileable until strict seed `6000007` reaches the final persistence oracle and
owner rows prove it. The PR loop still needs to convert held ready-product
rows, benchmark-canary exact-stack promotion repair, queued PR07C owner-matrix
work, and held reload-hydration work into validated publishable branches
rather than more blocked or no-progress artifacts.
