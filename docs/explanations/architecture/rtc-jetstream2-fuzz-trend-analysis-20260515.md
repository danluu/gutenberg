# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T00:13:26Z`

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

The graph-refresh pipeline is current through `2026-05-23T00:00:58Z` for
monitor passes and through `2026-05-23T00:06:23Z` for current-run accounting.
The monitor has `4,113` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `280,749`, current-scan coverage files are
`1,796`, and the parsed coverage-goal table has `12` unmet rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest accounting row is for `run-20260523T000214Z`
and is not trusted yet (`current_run_metrics_trusted` `FALSE`,
`pending_until_first_pass` `TRUE`). It shows `duplicateShareCurrent` `1`, but
the current signature and actionable-signature denominators are `NA` because
the active run has not completed its first full pass. Treat that as incomplete
current-run accounting and a control-plane health watch item, not a measured
product duplicate storm. The last trusted row, for `run-20260522T232201Z` at
`2026-05-22T23:59:51Z`, reported `duplicateShareCurrent` `0`, summary startup
failures `0`, current signatures `0`, actionable signatures `0`,
product-evidence signatures `0`, and top duplicate share `0`. Historical
duplicate share is `0.1304` for context only.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It points to a producer-side control-plane
leak where no-product startup/infra/`unknown` runs can be misclassified or kept
alive when product-evidence checks are loose or benchmark-canary paths bypass
holds. The feedback-action says the no-product gate was hardened, user count
alone stopped counting as product evidence, and no-product live-analysis drains
were excluded. That action also verified the readiness group was disabled at
the time. The refreshed enabled-state summary now shows
`novelty-http-large-post-readiness` and `novelty-http-list-move-refresh` in the
new active run, so the graph contradicts any interpretation that the readiness
lane is still absent. Because the active accounting row is pending, this is a
control-plane follow-up signal until the run completes a full pass.

Resources are usable but not idle. Latest CPU utilization is `59.27%`, with
`5.01%` iowait. Latest load averages are `62.7`, `55.45`, and `53.05` on `64`
logical CPUs, with `0` blocked tasks. The latest disk sample has `89.8GiB`
free on `/` and `413.4GiB` free on `/media/volume/danluu-fuzz-data`; the data
volume is `88.3%` used.

The latest graph-counted fuzzing mix is concentrated in browser/e2e:
`23` browser/e2e lanes across `23` groups, plus one `unit-property` row, one
`protocol-server` row, and one stale `coverage-guided-lower-level` row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only `fuzz-assertion` work have no current graph-counted lanes or
execution buckets. The latest level-mix synthesis still rejects treating raw
supervisor rows as fully trusted useful capacity and said browser/e2e was
below the `24`-lane floor; the refreshed graph agrees with that below-floor
part and preserves the capacity-trust caveat.

The execution counter has `16,928,710` estimated individual executions. The
trailing `2026-05-23T00:00:00Z` bucket is partial: `339` browser/e2e
executions, `320` unit-property executions, and `25` protocol-server
executions, with zero coverage-guided-lower-level, backend-api,
transport-integration, and fuzz-assertion executions. The prior full `23:45`
bucket had `751` browser/e2e, `672` unit-property, and `25` protocol-server
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
`current_run_metrics_trusted` is `FALSE`, treat the duplicate/noise share as
incomplete current-run accounting and as a control-plane health issue until the
active run completes a full pass.

The latest sample for `run-20260523T000214Z` was taken at
`2026-05-23T00:06:23Z`; the latest completed full pass was
`2026-05-23T00:00:58Z`. The row reports `current_run_metrics_trusted` `FALSE`,
`pending_until_first_pass` `TRUE`, `duplicateShareCurrent` `1`, summary startup
failures `0`, and `NA` for current signatures, actionable signatures,
product-evidence signatures, and top duplicate share because accounting is not
complete for the active run. The `1` share has no trusted denominator yet, so
it should be read as pending current-run accounting and a control-plane health
issue until the first full pass completes. The last trusted row was
`run-20260522T232201Z` at `2026-05-22T23:59:51Z`; it had
`duplicateShareCurrent` `0`, summary startup failures `0`, current signatures
`0`, actionable signatures `0`, product-evidence signatures `0`, and top
duplicate share `0`.

The duplicate/noise persona synthesis rejects a product-bug or broad product
duplicate-storm interpretation, and the latest feedback-action says the
control-plane no-product gates were hardened. The latest graph does not yet
confirm the active run because current accounting is pending; the last trusted
row supports the fixed health read, while the new pending row remains a
control-plane/accounting watch item.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.8GiB` free and `41.7%` used; the data volume has `413.4GiB` free
and is `88.3%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,818`. Current enabled groups in the
summary are `novelty-http-large-post-readiness` and
`novelty-http-list-move-refresh`. Recent enable events also touched parser
serialization, large-post lifecycle completion, title reload convergence,
same-user stale draft, and multi-reload lifecycle, but they are not in the
current enabled-group summary.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
heavy: `23` browser/e2e lanes across `23` groups. Current browser/e2e rows
include coverage-guided `novelty-http-large-post-readiness` and
`novelty-http-list-move-refresh`; focused collaboration UI signals; six
gap-booster rows; and fourteen strict-expansion
rows covering large-post HTTP lifecycle, persistence probing, stale drafts,
block gauntlet, UI signals, common blocks, many-user lifecycle, multi-reload
lifecycle, parser serialization/transform, real-user editing, revision
persistence, same-user lifecycle, and three-user late join.

Lower-level graph residency is narrow. `unit-property` is current for
`unit-property-table-query-array-crdt`, and `protocol-server` is current for
`protocol-server-http-polling` from
`validation-protocol-server-local-20260522Treview`. The lone
`coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis calls for a
narrow browser materialization repair and warns that supervisor, novelty,
status, stale gap-booster, fuzz-assertion, and lower-level state can disagree.
Its latest feedback-action file is empty, so there is no newer action result
to apply. The refreshed graph agrees with the below-floor browser/e2e claim by
counting `23` lanes, and it still does not confirm sustained
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution.

The native-harness persona action implemented and validated the
`coverage-guided-lower-level-block-parser-serialization` Node/V8
coverage-guided harness and produced collector-style events in a bounded smoke
run, but it did not start a continuous loop. The graph therefore still rejects
treating that action as sustained live lower-level residency. The
protocol-server persona action implemented and validated the HTTP polling REST
harness; the refreshed graph now has current protocol-server validation rows
and small `23:45`/`00:00` execution buckets, so protocol-server is present but
still sentinel-scale rather than broad capacity. The fuzz-only assertion action
added two gated assertions, but `fuzz-assertion` remains graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `95,185` browser/e2e, `5,799,488`
unit-property, `458,097` coverage-guided lower-level, and `10,575,940`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T00:00:00Z` bucket is a partial trailing bucket with
`339` browser/e2e executions (`1,356`/hour), `320` unit-property executions
(`1,280`/hour), and `25` protocol-server executions (`100`/hour), with zero
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `23:45` bucket had `751` browser/e2e
(`3,004`/hour), `672` unit-property (`2,688`/hour), and `25` protocol-server
(`100`/hour). The `23:15` bucket had `2,210` protocol-server executions
(`8,840`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `143` likely-real
findings over about `561.0` runner-hours, or `25.49` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,311`
total candidates: `1,303` browser/e2e candidates, `6` unit-property
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
collaboration UI signals (`136` records) and list-move refresh HTTP (`10`
records). Table stale snapshot HTTP has `4` successful records from `30`
records. Revision persistence has `8` successful records from `40`, full
profile has `16`, long-session large-doc has `39`, common-blocks has `43`,
parser serialization has `45`, many-user lifecycle has `52`, code-editor smoke
has `64`, multi-reload lifecycle has `67`, parser transform has `68`, and the
adjacent large-post three-user HTTP profile has `70` successful records from
`894` records. This still argues for completion-depth repair in existing
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
adjacent large-post three-user HTTP profile has `894` records seen with `70`
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
compaction, title/content/excerpt boundary, visible remote block delete,
code-editor embed stability, nested table awareness, and strict 30-user
operation-ledger cross-products remain `0` at the 6/10/12/30 active-editor
thresholds where they apply. The active-editing groups are not currently
marked enabled in the active-editing progress table.

Largest current unmet goal and active-editing gaps:

| Goal                                                      | Current | Target |
| --------------------------------------------------------- | ------: | -----: |
| successful collaboration-ui-signals records               |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle      |       0 |     25 |
| many-user active-editing records                          |       0 |     25 |
| six-active-editor lifecycle cross-product                 |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product       |       0 |     25 |
| six-active-editor UI-signal cross-product                 |       0 |     25 |
| six-active-editor large-document cross-product            |       0 |     25 |
| six-active-editor visible remote delete cross-product     |       0 |     25 |
| six-active-editor code-editor embed stability cross-product |       0 |     25 |
| six-active-editor nested table awareness cross-product    |       0 |     25 |
| remote selection and cursor visible                       |       2 |     25 |
| async/server block core/template-part                     |       0 |     20 |
| remote and local autosave checkpoints                     |      14 |     25 |
| table stale snapshot oracle                               |       0 |     10 |
| successful table-stale-snapshot-http records              |       4 |     10 |
| successful large-post HTTP records with three users       |       7 |     10 |
| successful three-user late-join records                   |      17 |     25 |
| local post recovery autosave                              |      19 |     25 |
| ten-active-editor progress                                |       0 |     10 |
| twelve-active-editor progress                             |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product    |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product    |       0 |     10 |
| HTTP client-limit override for active editing             |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product   |       0 |     10 |
| six-active-editor revision-restore cross-product          |       0 |     10 |
| six-active-editor publish-transition cross-product        |       0 |     10 |
| six-active-editor mixed-identity lifecycle cross-product  |       0 |     10 |
| six-active-editor same-block contention cross-product     |       0 |     10 |
| six-active-editor note-thread lifecycle cross-product     |       0 |     10 |
| six-active-editor persistence-race cross-product          |       0 |     10 |
| six-active-editor WS reconnect/background cross-product   |       0 |     10 |
| six-active-editor HTTP 413 compaction cross-product       |       0 |     10 |
| six-active-editor post-field boundary cross-product       |       0 |     10 |
| twelve-active-editor synced-notes/lifecycle cross-product |       0 |      5 |
| thirty-active-editor progress                             |       0 |      3 |
| strict 30-user operation ledger                           |       0 |      3 |

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

The critical-path table has `7` rows: active benchmark-canary exact-stack
repair, one blank continuation row, held deferred-family `reload-hydration`,
queued PR07C owner-matrix work, and three terminal blockers (`PR17` seed
`1020002`, `seed-5200005-reducer`, and `seed-1060015-reducer`). The repeated
no-progress table currently has one `benchmark-canary-fuzzer-gap` row:
`pre_oracle_or_preflight_only`.

## Interpretation

The latest current-output-dir accounting row is not trusted yet. It shows
`duplicateShareCurrent` `1`, summary startup failures `0`, and `NA`
denominators for current signatures, actionable signatures, and
product-evidence signatures for `run-20260523T000214Z` because the active run
is still pending its first full pass. Historical aggregate duplicate/noise
remains context only. The live health read is therefore incomplete current-run
accounting and a control-plane watch item, not a broad product duplicate storm.
The last trusted row for `run-20260522T232201Z` had a zero duplicate share and
zero signature denominators.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation. The last trusted graph
row supports the bounded control-plane fix at the health-signal level, although
the refreshed active-run row is pending and the enabled-state summary shows the
readiness lane active again. Historical output roots can still contain
no-product artifacts.

The resource picture is usable but under pressure: latest CPU utilization is
`59.27%`, iowait is `5.01%`, one-minute load is `62.7` on `64` logical CPUs,
and the data volume is `88.3%` used. Optional browser admission should still
respect load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and is one lane below the
persona loop's `24`-lane browser/e2e floor. Current lower-level evidence is
limited to a unit-property table query-array CRDT row and a protocol-server
HTTP polling validation row. The graph still rejects sustained live
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution despite positive persona-loop action evidence for the
parser lower-level harness, protocol-server harness, backend/API sentinel, and
fuzz-only assertions.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The trailing execution bucket is partial
but now has browser/e2e, unit-property, and protocol-server activity; the prior
`23:45` bucket remains the better full-bucket read: `751` browser/e2e, `672`
unit-property, and `25` protocol-server executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `894` records and
`70` successful records. Many-user active editing is also still `0` at the
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
