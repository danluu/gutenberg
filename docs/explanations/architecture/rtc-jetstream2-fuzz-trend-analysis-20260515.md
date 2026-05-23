# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-23T16:09:05Z`

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

The graph-refresh pipeline is current through `2026-05-23T16:03:07Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-23T16:08:05Z`. The latest completed full duplicate/noise accounting
pass recorded in the active row is `2026-05-23T16:03:07Z`, so the sampled
full-pass lag is `5.0` minutes. The monitor has
`4,257` passes from `2026-05-15T01:21:42Z` onward, cumulative coverage record
observations are `286,653`, current-scan coverage files are `5,625`, and the
parsed coverage-goal table has `12` unmet rows out of `149`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The active accounting row for
`run-20260523T062410Z` is now trusted:
`current_run_metrics_trusted_last` is `TRUE` and
`pending_until_first_pass` is `FALSE`. The row reports
`duplicateShareCurrent` `0.3333`, summary startup failures `0`, `6` current,
actionable, and product-evidence signatures, and `0.3333` top-duplicate share.
Treat the current pressure as a measured but narrow current-run
duplicate/noise health signal over a six-signature denominator, not as broad
product-noise pressure.

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
graph is later and the trusted active row is now at duplicate share `0.3333`
over `6` actionable and product-evidence signatures, so the evidence supports
a narrow producer/noise issue over a small denominator rather than broad
product-noise pressure.

Resources are constrained but still producing output. Latest CPU utilization
is `65.66%`, with `8.16%` iowait. Latest load averages are `67.85`,
`58.67`, and `51.93` on `64` logical CPUs, with `0` blocked tasks. The latest
disk sample has `88.8GiB` free on `/` and `139.3GiB`
free on `/media/volume/danluu-fuzz-data`; the data volume is `96.1%` used.

The latest graph-counted fuzzing mix is browser/e2e-dominant but below the
persona-loop floor on plotted rows: `18` browser/e2e lanes across `18` groups.
Lower-level graph evidence has one current `unit-property` HTTP polling
canary row from `2026-05-23T15:30:04Z`, one current `protocol-server` HTTP
polling row from `2026-05-23T15:57:47Z`, and one stale
`coverage-guided-lower-level` rich-text CRDT row from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and standalone
fuzz-only `fuzz-assertion` work have no current graph-counted lanes or
sustained latest-bucket execution. The latest non-empty level-mix synthesis
rejects broad lower-level expansion, recommends one narrow browser/e2e
`same-user-stale-tabs-http` backfill if admission allows, and rejects graph
row counts as useful capacity until active dirs, current roots, exact sessions,
and runner PIDs reconcile. The latest level-mix feedback-action says it
launched or repaired backend/API, protocol-server, focused browser, strict
browser, and one lower-level canary, and reports `64` fresh lower-level inputs
at `2026-05-23T15:59:51Z`. The refreshed graph is later and shows
the requested `focused-same-user-stale-tabs-http` row sampled at
`2026-05-23T15:40:43Z`, a refreshed coverage-guided row set sampled at
`2026-05-23T16:02:50Z`, the `gap-booster-20260523T124703Z` row set sampled at
`2026-05-23T12:47:07Z`, one strict-expansion `http-large-lifecycle` row
sampled at `2026-05-23T15:52:21Z`, the unit-property row sampled at
`2026-05-23T15:30:04Z`, and the protocol-server row sampled at
`2026-05-23T15:57:47Z`. It still does not show graph-counted backend/API,
transport-integration, fuzz-assertion, or fresh sustained parser/lower-level
capacity, so the latest feedback is positive action evidence but not yet
committed graph residency.

The execution counter has `17,160,070` estimated individual executions. The
latest plotted `2026-05-23T16:00:00Z` bucket is a partial bucket with
`67` browser/e2e executions and `3,240` protocol-server executions, with zero
unit-property, coverage-guided-lower-level,
backend-api, transport-integration, and fuzz-assertion executions. The prior
`15:45` bucket had `123` browser/e2e and `5,065` protocol-server executions;
`15:30` had `96` browser/e2e, `3` unit-property, and `5,785`
protocol-server executions; `15:15` had `138` browser/e2e and `2,730`
protocol-server executions; `15:00` had `278` browser/e2e and `5,245`
protocol-server executions; `14:45` had `232` browser/e2e and `5,040`
protocol-server executions; `14:30` had `212` browser/e2e and `5,040`
protocol-server executions; `14:15` had `644` browser/e2e, `3`
unit-property, and `5,425` protocol-server executions; `14:00` had `724`
browser/e2e and `5,223` protocol-server executions; `13:45` had `1,026`
browser/e2e and `5,425` protocol-server executions; and `13:30` had `1,259`
browser/e2e and `4,140` protocol-server executions.
The largest recent protocol bucket is now `15:30` with `5,785`.

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

The latest current-run accounting sample for `run-20260523T062410Z` was taken
at `2026-05-23T16:08:05Z`; the latest completed full duplicate/noise
accounting pass recorded in that row is `2026-05-23T16:03:07Z`, so the
sampled full-pass lag is `5.0` minutes. The row reports
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0.3333`, summary startup failures `0`, `6` current,
actionable, and product-evidence signatures, and `0.3333` top-duplicate share.
Read this as a measured but narrow current-run duplicate/noise signal over a
six-signature denominator, not as a broad product duplicate storm.

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
later and now shows active duplicate share `0.3333`, over `6` actionable and
product-evidence signatures, with trusted current-run accounting and `5.0`
minutes of sampled completed-pass lag. Startup
failures are `0`, so the current row is a narrow current-run health signal,
not broad product duplicate pressure.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `88.8GiB` free and `42.3%` used; the data volume has `139.3GiB`
free and is `96.1%` used, so output-size budgeting still matters.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,851`. Current enabled groups in the
summary are `novelty-http-large-post-readiness`,
`novelty-http-list-move-refresh`, `novelty-http-table-stale-snapshot`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-same-user-stale-draft`,
`novelty-http-existing-post-crdt-metadata`,
`novelty-http-title-reload-convergence`,
`novelty-http-persistence-probe`, and
`novelty-ws-multi-reload-lifecycle`.
Use the fuzz-level mix and active supervisor rows below for live surface
residency.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant but below the plotted persona-loop floor: `18` browser/e2e lanes
across `18` groups. Current browser/e2e rows include `10` coverage-guided
HTTP/WS lanes covering same-user stale draft, large-post
readiness/lifecycle/completion, list-move refresh, table stale snapshot,
persistence, title reload, and multi-reload lifecycle, sampled at
`2026-05-23T16:02:50Z`; `1` focused-shard lane from
`focused-shards-20260523T154020Z` for
`focused-same-user-stale-tabs-http`, sampled at `2026-05-23T15:40:43Z`; `6`
gap-booster WebSocket lanes from
`gap-booster-20260523T124703Z`, sampled at `2026-05-23T12:47:07Z`; and one
fresh strict-expansion `http-large-lifecycle` lane from
`strict-expansion-20260523T155221Z`, sampled at
`2026-05-23T15:52:21Z`.

Lower-level graph residency is still narrow but no longer zero. `unit-property`
has a current HTTP polling canary row from `2026-05-23T15:30:04Z`,
after earlier provider-persisted-CRDT large-post and manager-canary snapshots,
and `protocol-server` has a current HTTP polling row from
`2026-05-23T15:57:47Z`. The lone `coverage-guided-lower-level` row is stale
rich-text CRDT from `2026-05-21T11:14:10Z`. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane. Live graph-counted fuzzing is therefore still concentrated
in browser/e2e, with small active lower-level rows in `unit-property` and
`protocol-server`, stale `coverage-guided-lower-level` residency, and no live
graph evidence for `transport-integration`, `backend-api`, or
`fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest non-empty level-mix synthesis
recommends changing the mix only narrowly: keep browser/e2e productive work,
start one admitted `same-user-stale-tabs-http` focused shard if admission
allows, keep lower-level work to one-lane sentinels, and reject broad
lower-level, parser/rich-text, or fuzz-only expansion. It also says completed
lower-level roots without matching live sessions should not count as active
capacity, fuzz-assertion is stale or held, and graph mix totals remain
untrusted until active dirs, current roots, exact sessions, recent events, and
runner PIDs reconcile. The latest same-timestamp feedback-action applied that
narrow direction by launching or repairing `backend/API`,
`protocol-server`, `focused-same-user-stale-tabs-http`, strict
`http-large-lifecycle`, and a bounded `coverage-guided-lower-level` smoke. It
reports the active-lane telemetry as clean for backend/API, browser/e2e,
coverage-guided lower-level, and protocol-server, while leaving
unit-property stale-event checks and fuzz-assertion held/stale. It also says
the lower-level smoke added `64` fresh inputs with new coverage and one
product-yield record.

The refreshed graph is later and is below floor at `18`/`24`
graph-counted browser lanes, so it agrees with the below-floor persona-loop
feedback while contradicting any broad-capacity reading of the row count. It
has a refreshed coverage-guided row set, the focused-shards
`focused-same-user-stale-tabs-http` row requested by the synthesis, the
gap-booster row set, one strict-expansion HTTP large-lifecycle row, the newer
`unit-property` HTTP polling canary row, and the `protocol-server` HTTP
polling row. It still does not prove fully healthy browser capacity because
the persona-loop objection is about reconciling rows with current roots, exact
sessions, recent events, and runner PIDs. It confirms protocol-server and the
unit-property canary, but it does not show backend/API, transport-integration,
or fuzz-assertion sentinels as graph-counted current lanes. It also does not
show current sustained coverage-guided-lower-level residency or latest-bucket
coverage-guided executions. The latest feedback-action therefore rejects a
pure graph-only interpretation for backend/API and lower-level smoke, but the
committed graph still treats those as action evidence rather than sustained
live graph residency.

The latest native-harness synthesis promotes
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated lower-level harness because it avoids browser, `wp-env`, WebSocket,
REST, and editor boot while still exercising block parser/serializer
corruption boundaries. The latest native-harness action implemented and
validated that harness path, wrote collector-compatible root and lane events
with `fuzzLevel="coverage-guided-lower-level"`, and passed bounded direct and
wrapper smoke runs. It did not leave a long-lived parser session running. The
refreshed graph therefore accepts the parser harness as runnable evidence but
rejects treating it as sustained live lower-level residency: the graph-counted
coverage-guided-lower-level lane remains the stale rich-text CRDT row from
`2026-05-21T11:14:10Z`, and the latest execution buckets have zero
coverage-guided-lower-level executions.
The latest protocol-server action file is empty, but the latest synthesis and
prior non-empty action agree on HTTP polling REST as the first protocol/server
target. The prior action implemented and verified the protocol-server
`/wp-sync/v1/updates`
HTTP polling harness, wrote `fuzzLevel: "protocol-server"` root and lane event
accounting, populated oracle counters, and validated a bounded smoke
`validation-protocol-server-local-codex-20260523T153421Z` with one seed, `25`
cases, pass classification, and nonzero oracle counters for dispatches,
rejections, accepted and delivered updates, awareness, convergence, storage,
duplicate-room ordering, compaction, storage lineage, response byte caps, and
Yjs wire-byte redelivery. Prior non-empty synthesis/action evidence keeps HTTP
polling REST fuzzing ahead of the WebSocket relay because it exercises
Gutenberg-owned REST validation, auth, room permission checks, durable
post-meta storage, cursoring, awareness, compaction, and response byte caps.
A prior non-empty synthesis reports the current
`level-mix-cycle2-protocol-20260523T133054Z` artifacts already show `23`
completed passing `180`-case seeds through seed `1779543076`; an earlier
action also says the tmux start respected the shared CPU gate and did not
start another background protocol-server session.
The refreshed graph has a current protocol-server row at
`2026-05-23T15:57:47Z`. Protocol-server executions are `3,240` in the latest
partial `16:00` bucket, while that same bucket has `67` browser/e2e
executions. The prior `15:45` bucket has `5,065` protocol-server executions
and `123` browser/e2e executions. The `15:30` bucket has `5,785`
protocol-server executions, `96` browser/e2e executions, and `3` unit-property
executions. The `15:15`
bucket has `2,730` protocol-server executions and `138` browser/e2e
executions. The `15:00`
bucket has `5,245` protocol-server executions and `278`
browser/e2e executions. The `14:45` bucket has `5,040` protocol-server
executions and `232` browser/e2e executions. The `14:30` bucket has `5,040`
protocol-server executions and `212` browser/e2e executions. The `14:15`
bucket has `5,425` protocol-server executions, `644` browser/e2e executions,
and `3` unit-property executions. Protocol-server has `5,223` in `14:00`, `5,425` in
`13:45`, `4,140` in `13:30`,
`25` in `13:15`,
`0` in `13:00`, `0` in `12:45`, `25` in `12:30`,
`0` in `12:15`, `5,424` in `12:00`, `5,220` in `11:45`, `4,705` in `11:30`, `0` in
`11:15`, `3,625` in `11:00`, `4,680` in `10:45`, `2,545` in `10:30`, `50`
in `10:15`, `0` in `10:00`, `916` in `09:45`, `4,910` in `09:30`, `5,580`
in `09:15`, `5,245` in `09:00`, `5,040` in `08:45`, `5,245` in `08:30`,
`5,220` in `08:15`, `5,220` in `08:00`, `5,245` in `07:45`, and `5,400` in
`07:30`.
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

Latest cumulative totals are approximately `123,132` browser/e2e, `5,837,147`
unit-property, `458,097` coverage-guided lower-level, and `10,741,694`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-23T16:00:00Z` bucket is a partial bucket with `67`
browser/e2e executions (`268`/hour) and `3,240` protocol-server executions
(`12,960`/hour), with zero unit-property, coverage-guided-lower-level,
backend-api, transport-integration, and fuzz-assertion executions. The prior
`15:45` bucket had `123` browser/e2e (`492`/hour) and `5,065`
protocol-server executions (`20,260`/hour); `15:30` had `96` browser/e2e
(`384`/hour), `3` unit-property (`12`/hour), and `5,785` protocol-server
executions (`23,140`/hour); `15:15` had `138` browser/e2e
(`552`/hour) and `2,730` protocol-server executions (`10,920`/hour); `15:00`
had `278` browser/e2e (`1,112`/hour) and `5,245` protocol-server executions
(`20,980`/hour); `14:45` had `232`
browser/e2e (`928`/hour) and `5,040`
protocol-server executions (`20,160`/hour); `14:30` had `212` browser/e2e
(`848`/hour) and `5,040` protocol-server executions (`20,160`/hour);
`14:15` had `644` browser/e2e (`2,576`/hour), `3` unit-property (`12`/hour),
and `5,425` protocol-server executions (`21,700`/hour); `14:00` had `724`
browser/e2e (`2,896`/hour) and `5,223` protocol-server executions
(`20,892`/hour); `13:45` had `1,026` browser/e2e (`4,104`/hour) and `5,425`
protocol-server executions (`21,700`/hour); and `13:30` had `1,259`
browser/e2e (`5,036`/hour) and `4,140` protocol-server executions
(`16,560`/hour).
Protocol-server's largest recent bucket is now the `15:30` bucket with
`5,785` executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `165` likely-real
findings over about `675.2` runner-hours, or `24.44` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,721`
raw candidates. The by-level rate table attributes `1,713` browser/e2e
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
list-move refresh HTTP (`224` records, with `3` startup failures) and
collaboration UI signals (`686` records). Table stale snapshot HTTP now has
`409` successful records from `633` records, with `11` startup failures, and
has cleared its `10`-record goal. Full profile has `16` from `207`,
long-session large-doc has `39` from `585`, common-blocks has `43` from `88`,
code-editor smoke has `64` from `80`, parser transform has `68` from `120`,
many-user lifecycle has `71` from `206`, parser serialization has reached
`91` from `289`, media cross-entity has `121` from `243`, three-user
late-join has `138` from `267`, async-server blocks has `155` from `745`,
revision persistence has `168` from `315`, multi-reload lifecycle has `490`
from `789`, and the adjacent large-post three-user HTTP profile has `184`
successful records from `1,614` records with `14` startup failures.
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
combined group is currently marked enabled in the sampled state, while the
adjacent large-post three-user HTTP profile has `1,614` records seen with `184`
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
| action ui-type-title next coverage tier                     |   1,444 |  2,000 |
| action ui-undo-redo-paragraph next coverage tier            |     565 |  1,000 |
| successful two-user documents next coverage tier            |   1,660 |  2,000 |
| CDP coverage records next coverage tier                     |   4,795 |  5,000 |
| action ui-type-paragraph next coverage tier                 |   1,810 |  2,000 |
| successful real-user-editing records next coverage tier     |     872 |  1,000 |
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
summary currently has `0` artifacts.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260523T062410Z` and is trusted. It has
`current_run_metrics_trusted_last` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0.3333`, summary startup failures `0`, `6` current,
actionable, and product-evidence signatures, and `0.3333` top-duplicate share
in the `2026-05-23T16:08:05Z` sample, with the latest completed full pass
recorded at `2026-05-23T16:03:07Z` and `5.0` minutes of sampled
completed-pass lag.
This is measured current-run pressure, but
the six-actionable-signature denominator means it is a narrow duplicate/noise
signal rather than broad product duplicate pressure. Pending/incomplete
accounting is tracked separately and is currently not the live issue.

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
still tight: latest CPU utilization is `65.66%`, iowait is `8.16%`,
one-minute load is `67.85` on `64` logical CPUs with `0` blocked tasks, and
the data volume is `96.1%` used. Optional browser admission should still
respect load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy but below the plotted
`24`-lane browser/e2e floor with `18` lanes across `18` groups. Current
lower-level evidence is limited to a current unit-property HTTP polling canary
row, a current protocol-server HTTP polling row, and a
stale coverage-guided-lower-level row. The graph still rejects sustained live
coverage-guided-lower-level, backend-api, transport-integration, or
fuzz-assertion execution. That conflicts with positive persona-loop action
evidence for the parser lower-level harness and fuzz-only assertions; the
native-harness action validated the parser path, but it was bounded smoke and
left no long-lived parser session, so it is not yet reflected as sustained
fresh live execution. Protocol-server is the exception, with a current HTTP
polling row.
Protocol-server has a current HTTP polling row plus nonzero execution
bucket evidence, including `3,240` executions in the latest partial `16:00`
bucket, `5,065` in `15:45`, `5,785` in `15:30`, `2,730` in `15:15`,
`5,245` in `15:00`, `5,040` in `14:45`, `5,040` in `14:30`, `5,425` in
`14:15`, `5,223` in `14:00`, `5,425` in `13:45`, and `4,140` in `13:30`.
That matches the latest non-empty HTTP polling harness evidence while still
showing one lane rather than broad capacity. The latest non-empty level-mix
synthesis rejects trusting exact graph row counts as useful capacity until
same-root active dirs, exact sessions, recent events, and runner PIDs
reconcile. It recommends one admission-gated `same-user-stale-tabs-http`
browser backfill and no broad lower-level compensation. The latest
level-mix feedback-action reports launches or repairs for backend/API,
protocol-server, focused browser, strict browser, and a bounded lower-level
smoke, with backend/API and lower-level telemetry marked clean and `64` fresh
lower-level inputs. The
refreshed graph is later, reports `18`/`24`
graph-counted browser lanes, confirms the focused
`focused-same-user-stale-tabs-http` row, the gap-booster row set, one
strict-expansion HTTP large-lifecycle row, the refreshed coverage-guided HTTP
rows, the newer unit-property canary, and the protocol-server row. It agrees
with the below-floor persona-loop observation, but it also rejects treating
backend/API and parser lower-level action evidence as sustained current graph
residency: backend/API, parser lower-level, transport-integration, and
fuzz-only assertion representation are still not live and sustained in the
graphs.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest partial execution bucket has
`67` browser/e2e and `3,240` protocol-server executions.
The prior `15:45` bucket has `123` browser/e2e and `5,065` protocol-server
executions; `15:30` has `96` browser/e2e, `3` unit-property, and
`5,785` protocol-server executions; `15:15` has `138` browser/e2e and
`2,730` protocol-server executions; `15:00` has `278` browser/e2e and `5,245` protocol-server executions; `14:45`
has `232` browser/e2e and `5,040` protocol-server executions; `14:30` has
`212` browser/e2e and `5,040` protocol-server executions; `14:15` has `644`
browser/e2e, `3` unit-property, and `5,425` protocol-server executions;
`14:00` has `724` browser/e2e and `5,223` protocol-server
executions; `13:45` has `1,026` browser/e2e and `5,425` protocol-server
executions; and `13:30` has `1,259` browser/e2e and `4,140` protocol-server
executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `1,614` records and
`184` successful records. Many-user active editing is also still `0` at the
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
