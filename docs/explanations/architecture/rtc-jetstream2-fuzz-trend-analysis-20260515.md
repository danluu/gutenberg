# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T07:11:26Z`

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

The graph-refresh pipeline is current through `2026-05-23T07:07:53Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-23T07:10:33Z`. The latest completed full duplicate/noise accounting
pass recorded in the active row is `2026-05-23T07:07:53Z`. The monitor has
`4,180` passes from
`2026-05-15T01:21:42Z` onward, cumulative coverage record observations are
`284,168`, current-scan coverage files are `3,199`, and the parsed
coverage-goal table has `15` unmet rows out of `149`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row for
`run-20260523T062410Z` is now trusted:
`current_run_metrics_trusted_last` is `TRUE` and
`pending_until_first_pass` is `FALSE`. The row reports
`duplicateShareCurrent` `0.25`, summary startup failures `0`, `8` current,
actionable, and product-evidence signatures, and `0.25` top-duplicate share.
Treat the current pressure as a measured but narrow current-run
duplicate/noise health signal, not as broad product-noise pressure.

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
graph is later and the trusted active row is at duplicate share `0.25` over
`8` actionable/product-evidence signatures, so the evidence supports a narrow
producer/noise issue rather than broad product-noise pressure.

Resources are constrained but still producing output. Latest CPU utilization
is `76.62%`, with `3.02%` iowait. Latest load averages are `76.68`, `71.39`,
and `63.42` on `64` logical CPUs, with `2` blocked tasks. The latest disk
sample has `89.3GiB` free on `/` and `301.1GiB`
free on `/media/volume/danluu-fuzz-data`; the data volume is `91.5%` used.

The latest graph-counted fuzzing mix is browser/e2e-dominant and above the
persona-loop floor: `43` browser/e2e lanes across `39` groups.
Lower-level graph evidence has one current `unit-property` static quote-check
HTTP polling manager canary row, one current `protocol-server` HTTP polling
validation row, and one stale `coverage-guided-lower-level` rich-text CRDT row
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only `fuzz-assertion` work have no current graph-counted lanes
or latest-bucket execution. The latest level-mix synthesis rejects broad
lower-level expansion, protects browser/e2e, reports inconsistent browser
counts (`12` active mix, `21` bug-yield, `6` coverage-guidance current-run
dirs, and `9` supervisor materialized), and rejects exact graph row counts
until active dirs, current roots, and runner PIDs reconcile. The latest level-mix
feedback-action says browser/e2e was protected, one focused
`large-http-lifecycle` shard was backfilled, backend/API and protocol/server
sentinel lanes were restored, and one bounded lower-level HTTP polling manager
run completed. The refreshed graph is later and contradicts the earlier
below-floor and blocked protocol-server read: it shows `43`/`24`
graph-counted browser/e2e lanes, current list/table HTTP rows, the focused
large HTTP shard, and a current protocol-server validation row. It still does
not show graph-counted backend/API, transport-integration, fuzz-assertion, or
fresh sustained parser lower-level capacity.

The execution counter has `17,010,848` estimated individual executions. The
trailing `2026-05-23T07:00:00Z` bucket is partial and has `210` browser/e2e,
`705` unit-property, and zero protocol-server,
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The prior `06:45` bucket had `783` browser/e2e,
`1,050` unit-property, and `360` protocol-server executions. The latest larger
protocol-server bucket remains `06:00`, with `1,080` executions.

The PR-focused data is live. The controller state has `35` counted work items:
`27` high-priority ready-product PR rows marked published, `4` high-priority
ready-product rows held by the controller, one low-priority superseded
ready-product row, one runtime-gated row consumed by runtime evidence, one
high-priority deferred-family row needing a product decision, and one
medium-priority deferred-family diagnostic row. The push manifest has `0`
graph-counted publishable branches. PR-split feedback keeps the fileable
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

The latest sample for `run-20260523T062410Z` was taken at
`2026-05-23T07:10:33Z`; the latest completed full duplicate/noise accounting
pass recorded in that row is `2026-05-23T07:07:53Z`, about `2.7` minutes old
at sample time. The row reports
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0.25`, summary startup failures `0`, `8` current,
actionable, and product-evidence signatures, and `0.25` top-duplicate share.
Read this as a measured but narrow current-run duplicate/noise signal, not as a
broad product duplicate storm.

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
later and still shows active duplicate share `0.25`, now over `8`
actionable/product-evidence signatures. Startup failures remain `0`, so do not
read the current pressure as broad product duplicate pressure.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.3GiB` free and `42.0%` used; the data volume has `301.1GiB`
free and is `91.5%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,848`. Current enabled groups in the
summary are `novelty-http-large-post-readiness`,
`novelty-http-list-move-refresh`, `novelty-http-table-stale-snapshot`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-same-user-stale-draft`,
`novelty-http-existing-post-crdt-metadata`,
`novelty-http-title-reload-convergence`, and `novelty-ws-real-user-editing`.
Use the fuzz-level mix and active supervisor rows below for live surface
residency.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant and above the persona-loop floor: `43` browser/e2e lanes across `39`
groups. Current browser/e2e rows include `22` coverage-guided HTTP/WS lanes
covering same-user stale draft, real-user editing, large-post
readiness/lifecycle/completion, list-move refresh, table stale snapshot,
title reload convergence, existing-post CRDT metadata, persistence probe,
revision recovery, parser serialization, and real-user rich text; one
focused-shard large HTTP lifecycle lane; `6` gap-booster WebSocket lanes; and
`14` strict-expansion lanes spanning WebSocket real-user, same-user, late-join,
revision, parser, block-gauntlet, common-block, multi-reload, many-user,
collaboration UI, plus HTTP persistence, same-user-stale-draft, and
large-lifecycle coverage.

Lower-level graph residency is still narrow but no longer zero. `unit-property`
has a current static quote-check HTTP polling manager canary row from
`2026-05-23T06:38:55Z`, and `protocol-server` has a current HTTP polling
validation row from
`2026-05-23T06:42:02Z`. The lone `coverage-guided-lower-level` row is stale
rich-text CRDT from `2026-05-21T11:14:10Z`. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane. Live graph-counted fuzzing is therefore still concentrated
in browser/e2e, with small active sentinel rows in `unit-property` and
`protocol-server`, stale `coverage-guided-lower-level` residency, and no live
graph evidence for `transport-integration`, `backend-api`, or
`fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis at
`2026-05-23T06:46:49Z` still recommends protecting browser/e2e and rejects
broad lower-level expansion. It says browser/e2e remains under floor by
persona accounting and that exact mix totals are not trustworthy until
same-root current-output-dir, fresh supervisor state, active run dirs, recent
events, and live runner PIDs reconcile. The latest feedback-action protected
browser/e2e, backfilled one focused `large-http-lifecycle` shard, restored
backend/API and protocol/server sentinel lanes, and ran one bounded
lower-level HTTP polling manager pass. The refreshed graph is later and is now
above floor at `43`/`24` graph-counted browser lanes, with current list/table
HTTP rows and the focused large HTTP shard present in the group set. It also
shows one current unit-property lane and one protocol-server validation row,
contradicting the persona read that browser/e2e is still below floor and that
protocol/server should still count as blocked/zero.
Because the persona synthesis explicitly rejects exact mix totals until active
dirs, current roots, and runner PIDs reconcile, read the graph as browser/e2e
residency above the plotted floor, not as proof of fully healthy browser
capacity. The graph still does not show sustained backend/API,
transport-integration, fuzz-assertion, or fresh parser lower-level capacity.
The level-mix feedback-action also reports a bounded lower-level HTTP polling
manager run with `48` executions, but the refreshed graph does not yet show
that as current coverage-guided-lower-level residency or latest-bucket
execution volume.

The latest non-empty native-harness synthesis recommends
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated lower-level harness. The latest non-empty native-harness action
implemented and validated
`coverage-guided-lower-level-block-parser-serialization` as a Node/V8
coverage-guided parser harness in a bounded smoke run, with root/lane
`events.ndjson` and `fuzzLevel: "coverage-guided-lower-level"` verified. The
refreshed graph still rejects treating that action evidence as sustained live
lower-level residency: the graph-counted coverage-guided-lower-level lane
remains the stale rich-text CRDT row and the latest execution buckets have zero
coverage-guided-lower-level executions. The latest native-harness synthesis at
`2026-05-23T05:06:59Z` still supports the parser harness. The matching
native-harness action tightened malformed-comment classification, validated a
bounded `12`-input smoke with `359` coverage keys and `112` feature keys, and
explicitly did not start a production continuous tmux session. The graph has
not yet counted that smoke as a current lower-level lane or execution bucket.
The latest non-empty protocol-server synthesis at `2026-05-23T06:41:27Z`
promotes `/wp-sync/v1/updates` HTTP polling REST fuzzing over the WebSocket
relay. The latest protocol-server action under `2026-05-23T06:17:25Z`
implemented and validated that harness, with `fuzzLevel: "protocol-server"`
event accounting, one preflight seed, `25` cases, populated oracle counters,
and a passing
tmux-run validation under
`validation-protocol-server-local-20260523T063534Z-codex-final`. The refreshed
graph has a current protocol-server validation row, zero protocol-server
executions in the trailing partial `07:00` bucket, `360` in the `06:45`
bucket, `385` in the `06:30` bucket, and the larger `1,080` execution bucket
at `06:00`. It still treats
protocol-server as one active validation/sentinel lane rather than broad
multi-lane capacity. The fuzz-only
assertion action added two gated assertions, but `fuzz-assertion` remains
graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `110,294` browser/e2e, `5,830,346`
unit-property, `458,097` coverage-guided lower-level, and `10,612,111`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T07:00:00Z` bucket is partial and has `210`
browser/e2e executions (`840`/hour), `705` unit-property executions
(`2,820`/hour), and zero protocol-server, coverage-guided-lower-level,
backend-api, transport-integration, and fuzz-assertion executions. The prior
`06:45` bucket had `783` browser/e2e (`3,132`/hour), `1,050` unit-property
(`4,200`/hour), and `360` protocol-server executions (`1,440`/hour);
protocol-server's latest larger bucket remains `06:00`, with `1,080`
executions (`4,320`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `162` likely-real
findings over about `610.3` runner-hours, or `26.54` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,598`
raw candidates. The by-level rate table attributes `1,590` browser/e2e
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
collaboration UI signals (`686` records) and list-move refresh HTTP (`88`
records). Table stale snapshot HTTP now has `78` successful records from `217`
records and has cleared its `10`-record goal. Full profile has `16` from
`207`, long-session large-doc has `39` from `585`, common-blocks has `43` from
`88`, many-user lifecycle has `71` from `206`, three-user late join has `138`
from `267`, code-editor smoke has `64` from `80`, parser serialization has
reached `85` from `277`, parser transform has `68` from `120`, revision
persistence has `147` from `281`, multi-reload lifecycle has `195` from `351`,
and the adjacent large-post three-user HTTP profile has `114` successful
records from `1,194` records. This still argues for completion-depth repair in
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
adjacent large-post three-user HTTP profile has `1,194` records seen with `114`
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
| CDP coverage records next coverage tier                     |   3,416 |  5,000 |
| successful two-user documents next coverage tier            |   1,096 |  2,000 |
| action ui-type-title next coverage tier                     |   1,181 |  2,000 |
| action ui-type-paragraph next coverage tier                 |   1,545 |  2,000 |
| successful documents edited by two users next tier          |   1,571 |  2,000 |
| action ui-undo-redo-paragraph next coverage tier            |     514 |  1,000 |
| successful real-user-editing records next coverage tier     |     823 |  1,000 |
| action ui-heading-shortcut next coverage tier               |     316 |    500 |
| action ui-format-paragraph next coverage tier               |     344 |    500 |
| real-user title save/reload next coverage tier              |     870 |  1,000 |
| real-user body save/reload next coverage tier               |     874 |  1,000 |
| action reload-post-action next coverage tier                |     392 |    500 |
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
`PR 14` at `276`.

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

The critical-path blocker table has `6` rows: terminal benchmark-canary
exact-stack promotion repair, held deferred-family `reload-hydration`, queued
PR07C owner-matrix work, and three other terminal blockers (`PR17` seed
`1020002`, `seed-5200005-reducer`, and `seed-1060015-reducer`). The repeated
no-progress summary now has one `benchmark-canary-fuzzer-gap` row:
`pre_oracle_or_preflight_only`.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T062410Z` and is trusted. It has
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0.25`, summary startup failures `0`, `8` current,
actionable, and product-evidence signatures, and `0.25` top-duplicate share in
the `2026-05-23T07:10:33Z` sample, with the latest completed full pass
recorded at `2026-05-23T07:07:53Z`. This is measured current-run pressure,
but the eight-signature denominator means it is a narrow duplicate/noise signal
rather than broad product duplicate pressure.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler and supervisor publication path. The latest feedback-action says one
scheduler fix was applied and validated, with post-restart active share `0.25`
at that time; the later synthesis still asks for pause-metadata preservation,
authoritative post-policy supervisor publication, and stronger product-evidence
duplicate holds. The refreshed graph therefore rejects a broad product
duplicate-storm interpretation, but the active current-run duplicate/noise row
still leaves a narrow producer/control-plane health item to resolve. Historical
output roots can still contain no-product artifacts.

The resource picture is constrained but still producing output, with storage
still tight: latest CPU utilization is `76.62%`, iowait is `3.02%`,
one-minute load is `76.68` on `64` logical CPUs with `2` blocked tasks, and
the data volume is `91.5%` used. Optional browser admission should still
respect load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and now above the persona
loop's `24`-lane browser/e2e floor with `43` lanes across `39` groups. Current
lower-level evidence is limited to a current unit-property static quote-check
HTTP polling canary row, a current protocol-server HTTP polling validation
row, and a stale coverage-guided-lower-level row. The graph still rejects
sustained live
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution. That conflicts with positive persona-loop action
evidence for the parser lower-level harness and fuzz-only assertions;
protocol-server is the exception, with a current validation/sentinel row.
Protocol-server has a current validation/sentinel row plus nonzero earlier
execution buckets, including zero executions in the trailing partial `07:00`
bucket, `360` in the `06:45` bucket, `385` in the `06:30` bucket, and `1,080`
in the `06:00` bucket. That matches the positive HTTP polling harness evidence
while still showing one lane rather than broad capacity. The latest level-mix
synthesis rejects trusting exact graph row counts as useful capacity until
same-root active dirs and runner PIDs reconcile, and still says browser is
underfilled by its own accounting. The latest level-mix feedback-action says
browser/e2e was protected, one focused large HTTP shard was backfilled,
backend/API and protocol/server sentinel lanes were restored, and one bounded
lower-level HTTP polling manager run completed. The refreshed graph is later,
reports `43`/`24` graph-counted browser lanes, confirms current list/table
HTTP rows, the focused `large-http-lifecycle` shard, the unit-property row,
and the protocol-server row, and still only confirms stale
coverage-guided-lower-level residency. The graph and persona feedback now
disagree on browser/e2e floor status and still disagree on whether parser
lower-level, backend/API, or fuzz-only assertion representation is live and
sustained.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The trailing execution bucket is partial
and has `210` browser/e2e, `705` unit-property, and zero protocol-server
executions; the prior `06:45` bucket has `783` browser/e2e, `1,050`
unit-property, and `360` protocol-server executions, while protocol-server's
latest larger bucket remains `06:00` with `1,080` executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `1,194` records and
`114` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, with `35` counted controller items, but the push
manifest currently has `0` publishable branches. Persona feedback still
rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The PR loop still needs to resolve held ready-product rows, consume the
terminal benchmark-canary exact-stack repair conclusion, run the queued PR07C
owner-matrix work, and move held reload-hydration work toward validated
publishable branches instead of more blocked or no-progress artifacts.
