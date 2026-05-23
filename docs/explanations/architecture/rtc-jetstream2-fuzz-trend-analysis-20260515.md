# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T17:37:17Z`

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

The graph-refresh pipeline is current through `2026-05-23T16:51:56Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-23T17:35:34Z`. The active accounting row has moved again to
`run-20260523T170419Z` and is still waiting for its first completed full pass:
the latest completed duplicate/noise pass recorded in the row is
`2026-05-23T16:51:56Z`, so sampled completed-pass lag is `43.6` minutes. The
monitor has `4,265` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `286,887`, current-scan coverage files are
`5,856`, and the parsed coverage-goal table has `14` unmet rows out of `149`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row for `run-20260523T170419Z`
reports `current_run_metrics_trusted_last` `FALSE`,
`pending_until_first_pass` `TRUE`, `duplicateShareCurrent` `0.2857`, summary
startup failures `0`, and `NA` for current, actionable, product-evidence, and
top-duplicate denominators; the same row sees `7` active dirs, `19`
supervisor-group entries, and `21` observed roots. Treat the duplicate/noise
share as incomplete current-run accounting and a control-plane health issue
until the active run completes a full pass. The last trusted prior row for
`run-20260523T062410Z`, sampled at `2026-05-23T16:52:07Z`, had `7` current,
actionable, and product-evidence signatures, so the carried share should not
be read as broad product duplicate pressure.

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
graph is later and the active row is now a new pending run, so it supports a
control-plane/accounting-completeness concern rather than a measured broad
product-noise storm.

Resources are constrained but still producing output. Latest CPU utilization
is `70.49%`, with `8.12%` iowait. Latest load averages are `45.17`,
`56.11`, and `50.77` on `64` logical CPUs, with `25` blocked tasks. The
latest disk sample has `88.8GiB` free on `/` and `129.7GiB` free on
`/media/volume/danluu-fuzz-data`; the data volume is `96.3%` used.

The latest graph-counted fuzzing mix is browser/e2e-dominant and now above the
plotted persona-loop floor: `30` browser/e2e lanes across `27` groups. Current
coverage-guided rows were sampled at `2026-05-23T17:33:57Z` and include WS
coverage for `novelty-ws-block-gauntlet`,
`novelty-ws-parser-serialization`, `novelty-ws-parser-transform`,
many-user lifecycle completion, multi-reload, real-user rich text,
revision, and same-user rows, plus HTTP large-post/list/table/title,
persistence, and stale-draft rows. Focused, gap-booster, and strict-expansion
rows remain present. Lower-level graph evidence has one current
`unit-property` HTTP polling canary row from `2026-05-23T17:31:47Z`, one
current `protocol-server` HTTP polling row from `2026-05-23T17:25:44Z`, and one
stale `coverage-guided-lower-level` rich-text CRDT row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only `fuzz-assertion` work have no current graph-counted lanes or
sustained latest-bucket execution. Live fuzzing is therefore concentrated in
browser/e2e, with narrow active lower-level sentinels in `unit-property` and
`protocol-server`. The latest level-mix synthesis still rejects treating graph
row counts alone as trusted useful capacity until active dirs, current roots,
exact sessions, recent events, and runner PIDs reconcile.

The execution counter has `17,191,344` estimated individual executions. The latest
plotted `2026-05-23T17:30:00Z` bucket is a partial bucket with `47`
browser/e2e executions, `3` unit-property executions, and `1,980`
protocol-server executions, with zero coverage-guided-lower-level,
backend-api, transport-integration, and fuzz-assertion executions. The
`17:15` bucket had `94` browser/e2e and `4,525` protocol-server executions;
`17:00` had `45` browser/e2e and `5,760` protocol-server executions; the
fuller `16:45` bucket had `97` browser/e2e and `5,425` protocol-server
executions; `16:30` had `128` browser/e2e, `3` unit-property, and `5,580`
protocol-server executions. The largest recent protocol bucket is still
`15:30` with `5,785`.

The PR-focused data is live. The controller state has `35` counted work items:
`27` high-priority ready-product PR rows marked published, `4` high-priority
ready-product rows held by the controller, one low-priority superseded
ready-product row, one runtime-gated row consumed by runtime evidence, one
high-priority deferred-family row needing a product decision, and one
medium-priority deferred-family diagnostic row. The current push manifest has
`0` graph-counted publishable branches and `0` publishable net LOC. PR-split
feedback keeps the fileable
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

The latest current-run accounting sample for `run-20260523T170419Z` was taken
at `2026-05-23T17:35:34Z`. The active row is pending its first full pass:
`current_run_metrics_trusted_last` is `FALSE`, `pending_until_first_pass` is
`TRUE`, the latest completed full duplicate/noise pass recorded in the row is
`2026-05-23T16:51:56Z`, and the sampled completed-pass lag is `43.6` minutes.
The row reports `duplicateShareCurrent` `0.2857`, summary startup failures
`0`, `7` active dirs, `19` supervisor-group entries, `21` observed roots, and
`NA` for current, actionable, product-evidence, and top-duplicate denominators.
Read the duplicate/noise share as incomplete current-run accounting and as a
control-plane health issue until the new active run completes a full pass. The
previous trusted `run-20260523T062410Z` row at
`2026-05-23T16:52:07Z` had a seven-signature denominator, so the carried share
is still not evidence of broad product duplicate pressure.

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
later and now shows a new active run whose accounting is incomplete. Startup
failures are `0`, so the live health issue is current-run accounting
completeness/control-plane status, not a measured broad product duplicate
storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `88.8GiB` free and `42.3%` used; the data volume has `129.7GiB`
free and is `96.3%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,854`. Current enabled groups in the
summary are `novelty-ws-many-user-lifecycle-completion`,
`novelty-http-large-post-readiness`, `novelty-http-list-move-refresh`,
`novelty-http-table-stale-snapshot`, `novelty-http-title-reload-convergence`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-same-user-stale-draft`, `novelty-ws-parser-transform`,
and `novelty-ws-parser-serialization`.
Use the fuzz-level mix and active supervisor rows below for live surface
residency.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant and above the plotted `24`-lane floor: `30` browser/e2e lanes across
`27` groups. Current browser/e2e rows include `22` coverage-guided lanes
sampled at `2026-05-23T17:33:57Z` across `19` groups: WS block-gauntlet,
parser serialization, parser transform, many-user lifecycle completion,
multi-reload, real-user rich text, revision, and same-user rows, plus HTTP
persistence, large-post/list/table/title, lifecycle, and stale-draft surfaces.
The other current browser/e2e rows are one focused-shard lane for
`focused-same-user-stale-tabs-http`, `6` gap-booster WebSocket lanes, and one
strict-expansion `http-large-lifecycle` lane.

Lower-level graph residency is still narrow. `unit-property` has a current
HTTP polling canary row from `2026-05-23T17:31:47Z`, and `protocol-server` has
a current HTTP polling row from `2026-05-23T17:25:44Z`. The lone
`coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane. Live
graph-counted fuzzing is therefore concentrated in browser/e2e, with small
active lower-level rows in `unit-property` and `protocol-server`, stale
`coverage-guided-lower-level` residency, and no live graph evidence for
`transport-integration`, `backend-api`, or `fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis asked for
narrow browser/e2e repair, not broad lower-level expansion: keep
backend/API, protocol/server, and unit/property as one-lane sentinels, keep
fuzz-assertion held, and treat coverage-guided lower-level as inactive until
it has minimized, executable, triage-ready output. It says that if
`novelty-ws-block-gauntlet` is already running, the next concrete target is
`novelty-ws-parser-serialization`. The refreshed graph now shows both
`novelty-ws-block-gauntlet` and `novelty-ws-parser-serialization`, so it
supports the narrow browser/e2e backfill direction. It still leaves the
telemetry caveat open: active dirs, current roots, exact sessions, recent
events, and runner PIDs need reconciliation before treating all rows as useful
capacity.

The latest non-empty feedback-action kept lower-level expansion capped and
patched browser/e2e materialization instead. It reports a bounded
`novelty-ws-block-gauntlet` backfill launch and says no new lower-level
executions should result from that decision. The committed graph confirms the
focused browser, strict browser, unit-property, and protocol rows and shows WS
browser/e2e movement, including block-gauntlet and parser-serialization, but
it still treats backend/API and parser lower-level work as action or plan
evidence rather than sustained current graph residency.

The latest native-harness action file in this loop is empty. The latest
native-harness synthesis promotes
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated lower-level harness because it avoids browser, `wp-env`, WebSocket,
REST, and editor boot while still exercising block parser/serializer
corruption boundaries. Because the action file is empty, the refreshed graph
treats this as a plan, not as new live lower-level residency: the graph-counted
coverage-guided-lower-level lane remains the stale rich-text CRDT row from
`2026-05-21T11:14:10Z`, and the latest execution buckets have zero
coverage-guided-lower-level executions.
The latest protocol-server synthesis and latest action agree on HTTP polling
REST as the first protocol/server target. The action implemented and
verified the protocol-server
`/wp-sync/v1/updates`
HTTP polling harness, wrote `fuzzLevel: "protocol-server"` root and lane event
accounting, populated oracle counters, and validated a bounded smoke
`validation-action-20260523T172544Z` with one seed, `25`
cases, pass classification, and nonzero oracle counters for dispatches,
rejections, accepted and delivered updates, awareness, convergence, storage,
duplicate-room ordering, compaction, storage lineage, response byte caps, and
Yjs wire-byte redelivery. The synthesis/action evidence keeps HTTP
polling REST fuzzing ahead of the WebSocket relay because it exercises
Gutenberg-owned REST validation, auth, room permission checks, durable
post-meta storage, cursoring, awareness, compaction, and response byte caps.
The latest action also says it did not stop productive browser fuzzing.
The refreshed graph has a current protocol-server row at
`2026-05-23T17:25:44Z`. Protocol-server executions are `1,980` in the latest
partial `17:30` bucket, while that same bucket has `47` browser/e2e and `3`
unit-property executions. The `17:15` bucket has `4,525` protocol-server
executions and `94` browser/e2e executions; `17:00` has `5,760`
protocol-server executions and `45` browser/e2e executions; the fuller `16:45`
bucket has `5,425` protocol-server executions and `97` browser/e2e executions;
`16:30` has
`5,580` protocol-server executions, `128` browser/e2e executions, and `3`
unit-property executions. Protocol-server's largest recent bucket remains
`15:30` with `5,785` executions.
It still treats protocol-server as one active validation/sentinel lane rather
than broad multi-lane capacity. The fuzz-only assertion action added two gated
assertions, but `fuzz-assertion` remains graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `123,545` browser/e2e, `5,837,153`
unit-property, `458,097` coverage-guided lower-level, and `10,772,549`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T17:30:00Z` bucket is a partial bucket with `47`
browser/e2e executions (`188`/hour), `3` unit-property executions (`12`/hour),
and `1,980` protocol-server executions (`7,920`/hour), with zero
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The `17:15` bucket had `94` browser/e2e
(`376`/hour) and `4,525` protocol-server executions (`18,100`/hour); `17:00`
had `45` browser/e2e (`180`/hour) and `5,760` protocol-server executions
(`23,040`/hour); the fuller `16:45` bucket had `97` browser/e2e (`388`/hour)
and `5,425` protocol-server executions (`21,700`/hour); `16:30` had `128`
browser/e2e (`512`/hour), `3` unit-property (`12`/hour), and `5,580`
protocol-server executions (`22,320`/hour).
Protocol-server's largest recent bucket is now the `15:30` bucket with
`5,785` executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `164` likely-real
findings over about `685.9` runner-hours, or `23.91` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,730`
raw candidates. The by-level rate table attributes `1,722` browser/e2e
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
list-move refresh HTTP (`239` records) and collaboration UI signals (`1,054`
records). Current-run summary startup failures are `0`; the historical profile
table has isolated startup failures in session lifecycle, table-stale-snapshot
HTTP, and many-user lifecycle.
Table stale snapshot HTTP now has `458` successful records from `688` records
and has cleared its `10`-record goal. Full profile has `16` from `207`,
long-session large-doc has `39` from `605`, common-blocks has `43` from `88`,
code-editor smoke has `64` from `80`, parser transform has `68` from `120`,
many-user lifecycle has `73` from `211`, parser serialization has reached
`91` from `289`, media cross-entity has `121` from `243`, three-user
late-join has `138` from `267`, async-server blocks has `155` from `809`,
revision persistence has `168` from `315`, the adjacent large-post three-user
HTTP profile has `190` successful records from `1,713` records,
permissions/auth-locks has `275` from `872`, block gauntlet has `470` from
`655`, real-user editing has `905` from `2,030`, and multi-reload lifecycle has
`539` from `855`.
This still argues for completion-depth repair in
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
combined group is not currently marked enabled in the sampled state, while the
adjacent large-post three-user HTTP profile has `1,713` records seen with `190`
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
| CDP coverage records next coverage tier                     |   4,985 |  5,000 |
| action ui-type-title next coverage tier                     |   1,492 |  2,000 |
| successful two-user documents next coverage tier            |   1,645 |  2,000 |
| action ui-undo-redo-paragraph next coverage tier            |     585 |  1,000 |
| successful real-user-editing records next coverage tier     |     905 |  1,000 |
| action ui-heading-shortcut next coverage tier               |     379 |    500 |
| action ui-format-paragraph next coverage tier               |     407 |    500 |
| action reload-post-action next coverage tier                |     455 |    500 |
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
publishable net LOC. The manifest CSV itself is empty apart from its header.
The latest PR-split persona feedback rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and
owner rows. The feedback requests exactly one bounded strict-head reproduction
repair job for `8fb598778357` / seed `6000007`.

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
summary is currently empty, so the graph no longer has a counted repeated
no-progress artifact row for this refresh.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T170419Z`, and it is not trusted yet:
`current_run_metrics_trusted_last` is `FALSE`,
`pending_until_first_pass` is `TRUE`, `duplicateShareCurrent` is `0.2857`,
summary startup failures are `0`, active dirs are `7`, supervisor-group
entries are `19`, observed roots are `21`, and current, actionable, and
product-evidence signature denominators are `NA` in the
`2026-05-23T17:35:34Z` sample. The latest completed full pass recorded in the
row is `2026-05-23T16:51:56Z`, with `43.6` minutes of sampled completed-pass
lag. Until this new active run
completes a full pass, read the duplicate/noise share as incomplete
current-run accounting and a control-plane health issue, not as a measured
product duplicate rate. The prior trusted row had a seven-signature
denominator, so it also did not support a broad duplicate-storm reading.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler and supervisor publication path. The latest feedback-action says one
scheduler fix was applied and validated, with post-restart active share `0.25`
at that time; the later synthesis still asks for pause-metadata preservation,
authoritative post-policy supervisor publication, and stronger product-evidence
duplicate holds. The refreshed graph therefore rejects a broad product
duplicate-storm interpretation, but the active current-run accounting state
leaves a producer/control-plane health item to resolve. Historical output
roots can still contain no-product artifacts.

The resource picture is constrained but still producing output, with storage
still tight: latest CPU utilization is `70.49%`, iowait is `8.12%`,
one-minute load is `45.17` on `64` logical CPUs with `25` blocked tasks, and
the data volume is `96.3%` used. Optional browser admission should still
respect load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and now above the plotted
`24`-lane browser/e2e floor with `30` lanes across `27` groups. The refreshed
graph shows WS coverage-guided rows for `novelty-ws-block-gauntlet`,
`novelty-ws-parser-serialization`, `novelty-ws-parser-transform`,
many-user lifecycle completion, multi-reload, real-user rich text, revision,
and same-user coverage, along with HTTP coverage-guided rows, focused
stale-tabs, gap-booster, and strict HTTP large-lifecycle rows. This supports
the narrow browser/e2e backfill requested by the level-mix synthesis and
feedback-action, but it does not settle capacity because the synthesis
explicitly rejects trusting row counts until active dirs, current roots, exact
sessions, recent events, and runner PIDs reconcile.

Current lower-level evidence remains limited to a current unit-property HTTP
polling canary row, a current protocol-server HTTP polling row, and a stale
coverage-guided-lower-level row. The graph still rejects sustained live
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution. That conflicts with persona-loop plan/action
evidence for parser lower-level work and fuzz-only assertions; those are
accepted as plan or action evidence, not sustained current graph residency.
Protocol-server is the exception, with a current HTTP polling row plus
nonzero execution evidence: `1,980` executions in the latest partial `17:30`
bucket, `4,525` in `17:15`, `5,760` in `17:00`, `5,425` in `16:45`, `5,580`
in `16:30`, and a recent peak of `5,785` in `15:30`.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest partial execution bucket has
`47` browser/e2e, `3` unit-property, and `1,980` protocol-server executions.
The `17:15` bucket has `94` browser/e2e and `4,525` protocol-server
executions; `17:00` has `45` browser/e2e and `5,760` protocol-server
executions; the fuller `16:45` bucket has `97` browser/e2e and `5,425`
protocol-server executions; `16:30` has `128` browser/e2e, `3` unit-property,
and `5,580` protocol-server executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `1,713` records and
`190` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, with `35` counted controller items and `0`
graph-counted publishable branches in the current push manifest. Treat the
manifest plot as the live filing surface and the controller table as broader
state. Persona feedback still
rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The PR loop still needs to resolve held ready-product rows, advance the active
benchmark-canary exact-stack repair, run the queued PR07C owner-matrix work,
and move held reload-hydration work toward validated publishable branches
instead of more blocked or no-progress artifacts.
