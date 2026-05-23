# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T20:33:42Z`

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

The graph-refresh pipeline is current through `2026-05-23T20:31:06Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-23T20:31:40Z`. The active accounting row is
`run-20260523T180044Z`, and it has completed a full duplicate/noise pass:
`current_run_metrics_trusted_last` is `TRUE`, the latest completed
duplicate/noise pass is `2026-05-23T20:31:06Z`, and sampled completed-pass lag
is `0.6` minutes. The monitor has `4,280` passes from
`2026-05-15T01:21:42Z` onward, cumulative coverage record observations are
`288,959`, current-scan coverage files are `5,490`, and the parsed
coverage-goal table has `9` unmet rows out of `149`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row for `run-20260523T180044Z`
reports `current_run_metrics_trusted_last` `TRUE`,
`pending_until_first_pass` `FALSE`, summary startup failures `0`, and no
pending full pass. The refreshed `20:31:40Z` accounting row reports
`duplicateShareCurrent` `0.0`, summary startup failures `0`, `0` current
signatures, `0` actionable signatures, `0` product-evidence signatures, and
top duplicate share `0.0`. Pending/incomplete accounting still has its own
health signal, but the latest live row is trusted and currently has no
current-run duplicate/noise denominator.

The latest non-empty duplicate/noise synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It still points to a
producer/control-plane leak in `rtc-browser-fuzz-novelty-monitor.mjs` and
supervisor publication: forced benchmark canary or sticky HTTP groups,
non-authoritative `supervisor-groups.json`, lost pause metadata, narrow
duplicate family holds, and startup-ish `editor_open_post_timeout` can keep
relaunching producers that should be paused. The latest feedback-action says a
scheduler fix was patched and restarted earlier, with benchmark bypass events
at `0` after `2026-05-23T02:21:15Z` and active duplicate share `0.25` at that
time. The later trusted graph has share `0.0` with `0` current signatures, so
it supports the feedback-action's active-run improvement while the
producer/control-plane hardening concern remains as a scheduling risk rather
than a measured live product-noise storm.

Resources are saturated again in the latest sample and storage remains tight.
Latest CPU utilization is `79.2%`, with `4.97%` iowait. Latest load averages
are `75.40`, `73.26`, and `72.86` on `64` logical CPUs, with `9` blocked
tasks. The latest disk sample has `88.6GiB` free on `/` and `71.1GiB` free on
`/media/volume/danluu-fuzz-data`; the data volume is `98.0%` used.

The latest graph-counted fuzzing mix is browser/e2e-dominant and back above
the plotted `24`-lane persona-loop floor: `28` browser/e2e lanes across `28`
groups. Current coverage-guided rows were sampled at
`2026-05-23T20:28:13Z` and include WebSocket lifecycle/parser/media/revision
lanes plus HTTP stale-draft, large-post readiness/lifecycle/completion,
provider-persisted large-post, list-move refresh, table stale snapshot, title
reload convergence, existing-post metadata, and persistence-probe lanes.
Focused, gap-booster, and strict-expansion rows remain present. Lower-level
graph evidence has one bounded `unit-property` HTTP polling canary row from
`2026-05-23T20:26:14Z`, one current `protocol-server` HTTP polling row from
`2026-05-23T20:17:02Z`, and one stale `coverage-guided-lower-level` rich-text
CRDT row from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`,
and standalone fuzz-only `fuzz-assertion` work have no current graph-counted
lanes or sustained latest-bucket execution. Live fuzzing is therefore
concentrated in browser/e2e, with narrow active lower-level sentinel/action
evidence in `unit-property` and `protocol-server`. The latest non-empty
level-mix synthesis rejects broad lower-level expansion before the May 25
PR-finalization deadline and rejects trusting stale raw row counts without
active-dir/current-root reconciliation. The latest non-empty feedback-action
says hard-discovery retargeting and active-dir reconciliation were applied, and
a bounded `unit-property` HTTP polling canary produced `4` useful executions
and one oracle failure. The refreshed graph agrees on bounded lower-level
action evidence and shows browser/e2e row count above the floor.

The execution counter has `17,246,715` estimated individual executions. The
latest plotted `2026-05-23T20:30:00Z` bucket is partial, with `33` browser/e2e
executions and `720` protocol-server executions, with zero unit-property,
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. Recent fuller buckets show the same shape with one
bounded unit-property blip: `20:15` had `234` browser/e2e, `7` unit-property,
and `4,345` protocol-server executions; `20:00` had `124` browser/e2e and
`5,220` protocol-server executions; `19:45` had `234` and `4,910`; `19:30`
had `245` and `4,680`; `19:15` had `208` browser/e2e, `48` unit-property,
and `3,650` protocol-server executions. Protocol-server remains the only
lower-level surface with sustained recent execution volume.

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

The latest current-run accounting sample for `run-20260523T180044Z` was taken
at `2026-05-23T20:31:40Z`. The active row has completed a full pass:
`current_run_metrics_trusted_last` is `TRUE`, `pending_until_first_pass` is
`FALSE`, the latest completed full duplicate/noise pass recorded in the row is
`2026-05-23T20:31:06Z`, and the sampled completed-pass lag is `0.6` minutes.
The row reports `duplicateShareCurrent` `0.0`, summary startup failures `0`,
`0` current signatures, `0` actionable signatures, `0` product-evidence
signatures, and top duplicate share `0.0`. There is currently no live
current-run duplicate/noise denominator.

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
later and trusted at `0.0` on zero signatures. Startup failures are `0`, so the
live health issue is producer/control-plane hardening, not a measured broad
product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `88.6GiB` free and `42.4%` used; the data volume has `71.1GiB`
free and is `98.0%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,896`. The current enabled-groups
summary lists `9` WebSocket novelty groups and no HTTP provider-persisted
large-post group, so live HTTP residency should be read from the fuzz-level
mix and active supervisor rows below.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant and above the plotted `24`-lane floor: `28` browser/e2e lanes across
`28` groups. Current browser/e2e rows include `20` coverage-guided lanes
sampled at `2026-05-23T20:28:13Z`: `10` WebSocket
revision/late-join/session/parser/media/multi-reload/large-doc/many-user
lanes and `10` HTTP stale-draft, large-post, list-move, table, title reload,
existing-post metadata, and persistence-probe lanes. The other current
browser/e2e rows are one focused-shard lane for
`focused-same-user-stale-tabs-http`, `6` gap-booster WebSocket lanes, and one
strict-expansion `http-large-lifecycle` lane.

Lower-level graph residency is still narrow. `unit-property` has a current
HTTP polling canary row from `2026-05-23T20:26:14Z`, and `protocol-server` has
a current HTTP polling row from `2026-05-23T20:17:02Z`. The lone
`coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane. Live
graph-counted fuzzing is therefore concentrated in browser/e2e, with small
active lower-level rows in `unit-property` and `protocol-server`, stale
`coverage-guided-lower-level` residency, and no live graph evidence for
`transport-integration`, `backend-api`, or `fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest non-empty level-mix synthesis
asked for narrow PR-finalization retargeting, not broad lower-level expansion:
keep browser/e2e protected, keep backend/API, protocol/server, and
unit/property as sentinels, hold fuzz-assertion at zero, and hand off HTTP
polling reproducers into the PR17 provider-persisted CRDT repair path. It also
called out active-dir/current-root accounting defects and disk pressure. The
latest non-empty level-mix feedback-action says the provider-persisted
hard-discovery retarget and active-dir reconciliation were applied and a
bounded `unit-property` HTTP polling canary produced `4` useful executions and
one oracle failure. The refreshed graph supports the bounded lower-level action
evidence and shows browser/e2e residency above the floor, but it still rejects
broad lower-level expansion.

The latest non-empty native-harness action implemented and validated a bounded
`coverage-guided-lower-level-block-parser-serialization` smoke run with
`fuzzLevel: "coverage-guided-lower-level"`, `coverageKeys: 259`,
`coverageCanaryOk: true`, and required root/lane `events.ndjson` plus
`supervisor-groups.json`. It did not stop productive browser fuzzing and did
not leave a new long-running lower-level tmux session active. The refreshed
graph therefore treats parser lower-level work as validation/action evidence,
not sustained live residency: the graph-counted coverage-guided-lower-level
lane remains the stale rich-text CRDT row from `2026-05-21T11:14:10Z`, and the
latest execution buckets have zero coverage-guided-lower-level executions.
The latest non-empty native-harness synthesis also points at HTTP polling as
the first ready isolated lower-level harness, but says not to relaunch the
broad HTTP corpus.
The latest non-empty protocol-server synthesis picked the HTTP polling REST
endpoint as the primary server fuzz surface, and the action implemented and
validated that harness with a 25-case passing run,
`validation-20260523T201701Z`, without retargeting active browser fuzzing
bookkeeping. The graph has a current protocol-server row at
`2026-05-23T20:17:02Z`. Protocol-server executions are
`720` in the latest partial `20:30` bucket, `4,345` in `20:15`, `5,220` in
`20:00`, `4,910` in `19:45`, `4,680` in `19:30`, and `3,650` in `19:15`. It
still treats protocol-server as one active validation/sentinel lane rather
than broad multi-lane capacity.
The fuzz-only assertion action added gated assertions, but `fuzz-assertion`
remains graph-inactive.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `125,558` browser/e2e, `5,837,211`
unit-property, `458,097` coverage-guided lower-level, and `10,825,849`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T20:30:00Z` bucket is partial: `33` browser/e2e
executions (`132`/hour) and `720` protocol-server executions (`2,880`/hour),
with zero unit-property, coverage-guided-lower-level, backend-api,
transport-integration, and fuzz-assertion executions. The preceding `20:15`
bucket had `234` browser/e2e (`936`/hour), `7` unit-property (`28`/hour), and
`4,345` protocol-server executions (`17,380`/hour); `20:00` had `124`
browser/e2e (`496`/hour) and `5,220` protocol-server executions
(`20,880`/hour); `19:45` had `234` browser/e2e (`936`/hour) and `4,910`
protocol-server executions (`19,640`/hour); `19:30` had `245` browser/e2e
(`980`/hour) and `4,680` protocol-server executions (`18,720`/hour); `19:15`
had `208` browser/e2e (`832`/hour), `48` unit-property (`192`/hour), and
`3,650` protocol-server executions (`14,600`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `174` likely-real
findings over about `734.1` runner-hours, or `23.70` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,823`
raw candidates. The by-level rate table attributes `1,814` browser/e2e
candidates, `7` unit-property candidates, and `2` coverage-guided-lower-level
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
list-move refresh HTTP (`274` records) and collaboration UI signals (`1,528`
records). Current-run summary startup failures are `0`, and the refreshed
profile table has no startup-failure rows.
Table stale snapshot HTTP now has `520` successful records from `780` records
and has cleared its `10`-record goal. Full profile has `16` from `207`,
long-session large-doc has `39` from `630`, common-blocks has `43` from `88`,
code-editor smoke has `64` from `80`, parser transform has `68` from `120`,
many-user lifecycle has `86` from `252`, parser serialization has reached
`120` from `366`, media cross-entity has `186` from `346`, three-user
late-join has `150` from `284`, async-server blocks has `155` from `881`,
revision persistence has `222` from `421`, the adjacent large-post three-user
HTTP profile has `207` successful records from `1,905` records,
permissions/auth-locks has `299` from `901`, block gauntlet has `576` from
`807`, real-user editing has `978` from `2,185`, and multi-reload lifecycle has
`579` from `917`.
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
adjacent large-post three-user HTTP profile has `1,905` records seen with `207`
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
| successful two-user documents next coverage tier            |   1,474 |  2,000 |
| action ui-type-title next coverage tier                     |   1,651 |  2,000 |
| action ui-undo-redo-paragraph next coverage tier            |     649 |  1,000 |
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
summary is empty in the refreshed CSV.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T180044Z`, and it is trusted:
`current_run_metrics_trusted_last` is `TRUE`,
`pending_until_first_pass` is `FALSE`, `duplicateShareCurrent` is `0.0`,
summary startup failures are `0`, and current, actionable, and
product-evidence signature denominators are all `0` in the
`2026-05-23T20:31:40Z` sample. The latest completed full pass recorded in the
row is `2026-05-23T20:31:06Z`, with `0.6` minutes of sampled completed-pass
lag. There is no measured live duplicate/noise denominator in the current row.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler and supervisor publication path. The latest feedback-action says one
scheduler fix was applied and validated, with post-restart active share `0.25`
at that time; the later synthesis still asks for pause-metadata preservation,
authoritative post-policy supervisor publication, and stronger product-evidence
duplicate holds. The refreshed graph now shows active share `0.0` with zero
current signatures, so it supports active-run improvement and rejects a broad
product duplicate-storm interpretation, while the producer/control-plane health
item remains as a hardening risk. Historical output roots can still contain
no-product artifacts.

The resource picture is constrained but still producing output, with storage
still tight: latest CPU utilization is `79.2%`, iowait is `4.97%`,
one-minute load is `75.40` on `64` logical CPUs with `9` blocked tasks, and
the data volume is `98.0%` used. Optional browser admission should still
respect load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy and now above the plotted
`24`-lane browser/e2e floor with `28` lanes across `28` groups. The refreshed
graph shows current WebSocket coverage-guided lifecycle/parser/media/revision
rows and current HTTP rows for same-user stale draft, large-post
readiness/lifecycle/completion, provider-persisted large-post, list-move
refresh, table stale snapshot, title reload convergence, existing-post
metadata, and persistence probe, plus focused stale-tabs, gap-booster, and
strict HTTP large-lifecycle rows. The latest level-mix synthesis still rejects
trusting stale raw row counts until active dirs, current roots, exact sessions,
recent events, and runner PIDs reconcile, but the feedback-action says the
active-dir reconciliation path was patched and a bounded `unit-property` HTTP
polling canary produced `4` useful executions plus one oracle failure. Treat
that lower-level canary as bounded evidence, not sustained live lower-level
capacity.

Current lower-level evidence remains limited to a current unit-property HTTP
polling canary row, a current protocol-server HTTP polling row, and a stale
coverage-guided-lower-level row. The graph still rejects sustained live
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution. That conflicts with persona-loop plan/action
evidence for parser lower-level work and fuzz-only assertions; those are
accepted as plan or action evidence, not sustained current graph residency.
Protocol-server is the exception, with a current HTTP polling row plus
nonzero execution evidence: `720` executions in the latest partial `20:30`
bucket, `4,345` in `20:15`, `5,220` in `20:00`, `4,910` in `19:45`, `4,680`
in `19:30`, and `3,650` in `19:15`.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest partial execution bucket has
`33` browser/e2e and `720` protocol-server executions. The `20:15` bucket has
`234` browser/e2e, `7` unit-property, and `4,345` protocol-server executions;
`20:00` has `124` browser/e2e and `5,220` protocol-server executions; `19:45`
has `234` browser/e2e and `4,910` protocol-server executions; `19:30` has
`245` browser/e2e and `4,680` protocol-server executions; `19:15` has `208`
browser/e2e, `48` unit-property, and `3,650` protocol-server executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `1,905` records and
`207` successful records. Many-user active editing is also still `0` at the
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
instead of more blocked or no-progress artifacts. The critical-path blocker
table is now `6` rows: one active benchmark-canary coverage-promotion repair,
one held reload-hydration deferred-family row, one queued PR07C owner-matrix
row, and three terminal reducers/final-stack blockers.
