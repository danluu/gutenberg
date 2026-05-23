# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T22:30:57Z`

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

The graph-refresh pipeline is current through `2026-05-23T22:25:38Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-23T22:29:11Z`. The active accounting row is
`run-20260523T180044Z`, and it has completed a full duplicate/noise pass:
`current_run_metrics_trusted_last` is `TRUE`, the latest completed
duplicate/noise pass is `2026-05-23T22:25:37Z`, and sampled completed-pass lag
is about `3.6` minutes. The monitor has `4,293` passes from
`2026-05-15T01:21:42Z` onward, cumulative coverage record observations are
`290,321`, current-scan coverage files are `6,452`, and the parsed
coverage-goal table has `9` unmet rows out of `149`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row reports
`duplicateShareCurrent` `0.0`, summary startup failures `0`, `0` current
signatures, `0` actionable signatures, `0` product-evidence signatures, and
top duplicate share `0.0`. The earlier trusted sample at
`2026-05-23T21:21:48Z` had a `1/1` duplicate/noise point, so the latest row
looks like a transient one-signature control-plane blip rather than broad
current-run duplicate pressure.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It points instead to a producer/control-plane
leak in novelty-monitor and supervisor publication: benchmark canary forcing,
non-authoritative `supervisor-groups.json`, lost pause metadata, narrow
duplicate-family holds, and startup-ish `editor_open_post_timeout` can keep
producers alive. The latest feedback-action says the scheduler fix was
patched and restarted and saw actionable duplicate share below threshold. The
refreshed graph now agrees on the latest trusted sample, while the earlier
`1/1` point still supports watching the producer/supervisor hardening path.

Resources remain constrained. Latest CPU utilization is `78.30%`, with
`6.59%` iowait. Latest load averages are `68.97`, `75.25`, and `74.60` on
`64` logical CPUs, with `3` blocked tasks. Root has `88.5GiB` free and the
data volume has `32.1GiB` free while still `99.1%` used.

The latest graph-counted fuzzing mix is browser/e2e-dominant and above the
plotted `24`-lane persona-loop floor: `27` browser/e2e lanes across `27`
groups. Current lower-level graph residency is narrow: one bounded
`unit-property` HTTP polling canary row, one current `protocol-server` HTTP
polling row, and one stale `coverage-guided-lower-level` rich-text CRDT row.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion
work have no current graph-counted lane. Persona-loop actions add bounded
lower-level/protocol validation evidence, but the graph still rejects broad
sustained lower-level expansion.

The execution counter has `17,284,692` estimated individual executions. The
latest plotted `2026-05-23T22:15:00Z` bucket has `126` browser/e2e
executions, `3` unit-property executions, and `4,165` protocol-server
executions. Recent buckets are still browser/e2e plus protocol-server, with
only bounded unit-property blips.

The PR-focused data is live. The controller state has `35` counted work items:
`27` high-priority ready-product PR rows marked published, `4` high-priority
ready-product rows held by the controller, one low-priority superseded
ready-product row, one runtime-gated row consumed by runtime evidence, one
high-priority deferred-family row needing a product decision, and one
medium-priority deferred-family diagnostic row. The current push manifest has
`0` graph-counted publishable branches and `0` publishable net LOC.
PR-split feedback keeps the fileable prefix through `PR15C` and rejects
`PR16-RLH` as fileable until strict seed `6000007` reaches the final
persistence oracle and owner rows prove it.

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

The latest current-run accounting sample for `run-20260523T180044Z` was taken
at `2026-05-23T22:29:11Z`. The active row has completed a full pass:
`current_run_metrics_trusted_last` is `TRUE`, `pending_until_first_pass` is
`FALSE`, the latest completed full duplicate/noise pass recorded in the row is
`2026-05-23T22:25:37Z`, and the sampled completed-pass lag is about `3.6`
minutes. The row reports `duplicateShareCurrent` `0.0`, summary startup
failures `0`, `0` current signatures, `0` actionable signatures, `0`
product-evidence signatures, and top duplicate share `0.0`. The earlier
trusted sample at `2026-05-23T21:21:48Z` had a `1/1` duplicate/noise point,
but the latest row has a zero-signature denominator and should not be read as
broad current-run duplicate pressure.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation and calls the remaining issue a
novelty-monitor producer/supervisor scheduling leak. Its requested fixes are
pause-metadata preservation, authoritative post-policy supervisor publication,
product-evidence duplicate holds that include `editor_open_post_timeout`, and
one representative per meaningful product family. The latest feedback-action
says the scheduler patch was syntax-checked and restarted and reported
actionable share below threshold; the refreshed trusted graph is later and
again reports zero current signatures. The graph therefore supports the
feedback-action's live-status claim, while the earlier one-signature spike and
the synthesis keep producer/supervisor hardening live.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `88.5GiB` free and `42.5%` used; the data volume has `32.1GiB`
free and is `99.1%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,910`. The current enabled-groups
summary is mixed HTTP/WebSocket: `novelty-ws-parser-transform`,
`novelty-ws-revision-recovery`, and HTTP provider-persisted large-post, table
stale snapshot, list-move refresh, large-post readiness/lifecycle/completion,
same-user stale draft, and title reload convergence groups. Persona
feedback still says benchmark canary coverage readiness must fail closed until
current-run HTTP records and strict oracles prove it; lane presence is not the
same thing as strict benchmark coverage.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant and above the plotted `24`-lane floor: `27` browser/e2e lanes across
`27` groups. Current browser/e2e rows include `19` coverage-guided lanes
sampled at `2026-05-23T22:26:47Z`: `9` WebSocket
block-gauntlet/revision/session/parser/multi-reload/many-user lanes and `10`
HTTP stale-draft, large-post, provider-persisted large-post, list-move, table,
title reload, existing-post metadata, and persistence-probe lanes. The other
current browser/e2e rows are one focused-shard lane for
`focused-same-user-stale-tabs-http`, `6` gap-booster WebSocket lanes, and one
strict-expansion `http-large-lifecycle` lane.

Lower-level graph residency is still narrow. `unit-property` has a current
HTTP polling canary row from `2026-05-23T22:17:14Z`, and `protocol-server` has
a current HTTP polling row sampled at `2026-05-23T22:26:49Z`. The lone
graph-counted `coverage-guided-lower-level` row is still stale rich-text CRDT
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane. Live
graph-counted fuzzing is therefore concentrated in browser/e2e, with bounded
active lower-level action evidence in `unit-property` and `protocol-server`,
stale `coverage-guided-lower-level` residency, and no live graph evidence for
`transport-integration`, `backend-api`, or `fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis asks for
narrow PR-finalization retargeting: keep browser/e2e protected, keep
backend/API and protocol/server as sentinels, keep unit/property bounded to
PR17 reproducers, hold fuzz-assertion at zero, and fail closed on mix totals
until active dirs, current roots, exact sessions, recent events, and runner
PIDs reconcile. It also reports browser/e2e below the `24`-lane floor in its
manual live check, but the later refreshed graph contradicts that specific
claim with `27` browser/e2e lanes. The same-timestamp level-mix
feedback-action file is empty, so there is no newer applied-fix evidence to
prefer over the graph. The graph supports bounded lower-level action evidence
and browser/e2e residency above the floor, but it still rejects broad
lower-level expansion.

The newest native-harness synthesis is empty, but its latest action validates
a bounded `coverage-guided-lower-level-block-parser-serialization` smoke run.
The graph-counted coverage-guided lower-level lane still remains the stale
rich-text CRDT row, and the latest execution buckets have zero
coverage-guided-lower-level executions, so the action evidence should not be
read as sustained lower-level residency. The protocol-server synthesis and
action validate the product HTTP polling REST endpoint harness; the graph now
has a current `validation-direct-20260523T222649Z` protocol-server row and
sustained recent protocol-server execution volume.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `126,810` browser/e2e, `5,837,246`
unit-property, `458,097` coverage-guided lower-level, and `10,862,539`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T22:15:00Z` bucket has `126` browser/e2e
executions (`504`/hour), `3` unit-property executions (`12`/hour), and
`4,165` protocol-server executions (`16,660`/hour), with zero
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The preceding `22:00` bucket had `115` browser/e2e
and `4,550` protocol-server executions. The `21:45`
bucket had `122` browser/e2e (`488`/hour) and `4,525` protocol-server
executions (`18,100`/hour); `21:30` had `105` browser/e2e and `4,860`
protocol-server executions; `21:15` had `127` browser/e2e, `32`
unit-property, and `4,885` protocol-server executions; `21:00` had `210`
browser/e2e and `4,680` protocol-server executions; `20:45` had `233` and
`4,885`.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `174` likely-real
findings over about `763.9` runner-hours, or `22.78` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,872`
raw candidates. The by-level rate table attributes `1,865` browser/e2e
candidates, `5` unit-property candidates, and `2` coverage-guided-lower-level
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
list-move refresh HTTP (`304` records) and collaboration UI signals (`1,528`
records). Current-run summary startup failures are `0`; the profile table has
some historical startup failures in individual profile rows, but live health
should continue to use the current-run summary metric above.
Table stale snapshot HTTP has `560` successful records from `849` records and
has cleared its `10`-record goal. Full profile has `16` from `207`,
long-session large-doc has `39` from `646`, common-blocks has `45` from `92`,
code-editor smoke has `64` from `80`, parser transform has `68` from `120`,
many-user lifecycle has `115` from `284`, parser serialization has reached
`137` from `439`, media cross-entity has `229` from `413`, three-user
late-join has `182` from `333`, async-server blocks has `155` from `926`,
revision persistence has `250` from `528`, the adjacent large-post three-user
HTTP profile has `218` successful records from `2,005` records,
permissions/auth-locks has `299` from `901`, block gauntlet has `600` from
`870`, real-user editing has `978` from `2,185`, multi-reload lifecycle has
`640` from `1,017`, session lifecycle has `1,900` from `2,998`, and
persistence-no-title has `1,380` from `2,551`.

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
combined group is currently marked enabled in the sampled progress table, and
the adjacent large-post three-user HTTP profile has `2,005` records seen with
`218` successful records. Those adjacent hits still do not count as completed
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
| action ui-undo-redo-paragraph next coverage tier            |     649 |  1,000 |
| action ui-type-title next coverage tier                     |   1,694 |  2,000 |
| successful two-user documents next coverage tier            |   1,837 |  2,000 |
| action ui-heading-shortcut next coverage tier               |     446 |    500 |
| action ui-format-paragraph next coverage tier               |     475 |    500 |
| successful real-user-editing records next coverage tier     |     978 |  1,000 |
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
| async/server block core/template-part                       |       0 |     20 |
| ten-active-editor progress                                  |       0 |     10 |
| twelve-active-editor progress                               |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product      |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product      |       0 |     10 |
| HTTP client-limit override for active editing               |       0 |     10 |
| ten-active-editor lifecycle cross-product                   |       0 |     10 |
| twelve-active-editor lifecycle cross-product                |       0 |     10 |
| ten-active-editor rich/list/lifecycle cross-product         |       0 |     10 |
| twelve-active-editor rich/list/lifecycle cross-product      |       0 |     10 |
| ten-active-editor UI-signal cross-product                   |       0 |     10 |
| twelve-active-editor UI-signal cross-product                |       0 |     10 |
| ten-active-editor large-document cross-product              |       0 |     10 |
| twelve-active-editor large-document cross-product           |       0 |     10 |
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
`PR 14` at `276`, followed by `PR 9` at `183`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current controller state has `35` counted work items. The most important
live queue entries are `4` high-priority ready-product PR rows held by the
controller, `27` published ready-product rows still under validation, one
low-priority ready-product row marked superseded, one runtime-gated row
consumed by runtime evidence, one high-priority deferred-family row needing a
product decision, and one medium-priority deferred-family diagnostic row.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates, deferred
family budget gates, resource reserve, single-flight guards, or repeated
critical-path continuations are slowing progress.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has `0` graph-counted publishable branches and `0`
publishable net LOC. The refreshed controller state no longer has a
publish-manifest-ready PR07C row, so the empty manifest and controller table
now agree on no current graph-counted filing surface.
The latest PR-split persona feedback rejects promoting `PR16-RLH` as fileable:
the ready prefix remains through `PR15C`, while `RLH-6000007-candidate` is
blocked pending strict seed `6000007` proof and owner rows. The feedback
requests exactly one bounded strict-head reproduction repair job for
`8fb598778357` / seed `6000007`.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path blocker table has `6` rows: active benchmark-canary
exact-stack promotion repair, held deferred-family `reload-hydration`, queued
PR07C owner-matrix work, and three terminal blockers (`PR17` seed `1020002`,
`seed-5200005-reducer`, and `seed-1060015-reducer`). The repeated no-progress
summary is empty in the refreshed CSV.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T180044Z`, and it is trusted:
`current_run_metrics_trusted_last` is `TRUE`,
`pending_until_first_pass` is `FALSE`, `duplicateShareCurrent` is `0.0`,
and summary startup failures are `0` in the `2026-05-23T22:29:11Z` sample.
The denominator is `0` current signatures, `0` actionable signatures, and `0`
product-evidence signatures, with top duplicate share `0.0`. The latest
completed full pass recorded in the row is `2026-05-23T22:25:37Z`, with about
`3.6` minutes of sampled completed-pass lag. The earlier `21:21:48Z` trusted
sample had a `1/1` duplicate/noise point, but the current live sample rejects
broad current-run duplicate/noise pressure.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler and supervisor publication path. The latest feedback-action says a
scheduler fix was applied and validated and saw duplicate share below
threshold; the later trusted graph agrees on the latest sample while still
showing that a one-signature duplicate/noise blip occurred before the latest
completed pass. The remaining health item is producer/control-plane
hardening: preserve pause metadata, keep post-policy supervisor publication
authoritative, and keep startup-ish duplicate producers held unless there is
strong product evidence.

The resource picture is constrained but still producing output: latest CPU
utilization is `78.30%`, iowait is `6.59%`, one-minute load is `68.97` on
`64` logical CPUs with `3` blocked tasks, and the data volume is `99.1%`
used with `32.1GiB` free. Optional browser admission should still respect
load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and above the plotted
`24`-lane browser/e2e floor with `27` lanes across `27` groups. The refreshed
graph shows current WebSocket lifecycle/parser/revision rows and current
HTTP rows for same-user stale draft, large-post readiness/lifecycle/completion,
provider-persisted large-post, list-move refresh, table stale snapshot, title
reload convergence, existing-post metadata, and persistence probe, plus
focused stale-tabs, gap-booster, and strict HTTP large-lifecycle rows. The
latest level-mix synthesis rejects trusting stale raw row counts until
active-dir/current-root reconciliation and HTTP readiness are fail-closed. Its
manual live check also said browser/e2e was below the `24`-lane floor, but
the later refreshed graph contradicts that specific claim with `27`
browser/e2e lanes. The matching feedback-action file is empty, so the graph is
the only newer applied-status evidence for that claim. The graph still agrees
that strict current-run records and oracles are required before counting
benchmark coverage.

Current lower-level evidence remains limited. Unit-property has a bounded HTTP
polling canary row and recent `32`-execution graph evidence, plus `3`
executions in the latest bucket. Protocol-server now has a current HTTP
polling row and sustained recent execution volume, including `4,165`
executions in the latest `22:15` bucket, `4,550` in `22:00`, `4,525`
in `21:45`, `4,860` in `21:30`, and `4,885` in `21:15`. The newest
native-harness action validates a bounded parser/serialization lower-level
smoke, and the protocol-server synthesis/action validate the HTTP polling REST
harness. The graph-counted coverage-guided lower-level residency is still the
stale rich-text CRDT row and recent execution buckets are zero, so only
protocol-server has sustained current lower-level execution evidence.
Transport-integration, backend-api, and fuzz-assertion remain graph-inactive.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket has `126`
browser/e2e, `3` unit-property, and `4,165` protocol-server executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `2,005` records and
`218` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, with `35` counted controller items but `0`
graph-counted publishable branches in the current push manifest. Treat the
manifest plot as the live filing surface and the controller table as broader
state; the refreshed controller state no longer has a publish-manifest-ready
PR07C row, so controller state and manifest state agree on no current
graph-counted filing surface.
Persona feedback still rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The PR loop still needs to resolve held ready-product rows, advance the active
benchmark-canary exact-stack repair, run or consume the queued PR07C
owner-matrix work, and move held reload-hydration work toward validated
publishable branches instead of more blocked or no-progress artifacts. The
critical-path blocker table is `6` rows:
one active benchmark-canary coverage-promotion repair, one held
reload-hydration deferred-family row, one queued PR07C owner-matrix row, one
terminal `PR17` final-stack row, and two terminal reducers.
