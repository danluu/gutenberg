# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T07:16:06Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and copied standard
persona-loop outputs. The collector copies `raw/pr-focused/...` inputs so
PR-controller graphs track current raw state instead of stale local state.

## High-Level Readout

The graph-refresh pipeline is current through `2026-05-24T07:12:55Z` for
monitor passes and `2026-05-24T07:14:48Z` for current-run accounting.
The active accounting row is `run-20260524T032127Z`;
`current_run_metrics_trusted_last` is `TRUE`, the first full pass is no longer
pending, and the latest completed full-pass timestamp is
`2026-05-24T07:12:55Z`.

The monitor has `4,381` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `293,463`, and the current-scan coverage-file
count is `1,232`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `46` unmet, and `profile_counts.csv`
has `17` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest trusted row has `duplicateShareCurrent`
`0` and summary startup failures `0`, with `0` current signatures, `0`
actionable signatures, `0` product-evidence signatures, and top duplicate
share `0`. There is no current-run denominator to support a product duplicate
storm read.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says a
scheduler fix previously brought actionable duplicate share to `0.25`; the
newest graph row is now lower at `0`, with `0`/`0` current-run signatures.
That supports the feedback's rejection of a broad product duplicate-storm
interpretation, while still leaving the producer/control-plane hardening as
the relevant follow-up if noise returns.

CPU and load are below the `64`-core line in the newest samples. At
`2026-05-24T07:10:03Z`, CPU utilization is `30.55%`, iowait is `1.09%`, and
load averages are `27.15`, `25.93`, and `26.73` on `64` logical CPUs. Disk
remains the live constraint: at `2026-05-24T07:15:00Z`, root has `87.8GiB`
free and the data volume has `26.6GiB` free while `99.2%` used.

The latest graph-counted fuzzing mix has `9` browser/e2e lanes, one
unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. The latest current-root browser/e2e row is
`novelty-http-provider-persisted-crdt-large-post`, sampled with the active
coverage-guided root at `2026-05-24T07:13:59Z`. The refreshed graph also has a
fresh `coverage-guided-lower-level` rich-text CRDT row at
`2026-05-24T06:34:42Z` and a fresh protocol-server row at
`2026-05-24T06:57:48Z`. The latest level-mix feedback-action is empty, but the
latest non-empty synthesis still rejects broad expansion before the deadline.
It says to keep one browser/e2e canary under disk pressure and rotate from the
provider-persisted lane to `novelty-http-large-post-readiness` after preserving
provider evidence. The new graph data shows the provider lane remains live,
readiness is enabled but not the latest active browser/e2e row, a narrow
lower-level probe is active too, and transport-integration, backend-api, and
standalone fuzz-only assertion work remain graph-inactive.

The execution counter has `17,260,894` estimated individual executions. The
latest plotted bucket, `2026-05-24T07:00:00Z`, is a partial bucket with `10`
browser/e2e executions, `80` coverage-guided lower-level executions, and
`1,650` protocol-server executions. The preceding `06:45` bucket has `6`
browser/e2e, `112` coverage-guided-lower-level, and `1,450` protocol-server
executions; the `06:30` bucket has `6`, `320`, and `1,625` respectively.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T07:13:31Z`. The state-count table has `35`
counted items: `27` published ready-product rows, `4` held-by-controller
ready-product rows, `1` superseded ready-product row, `1`
runtime-held-consumed PR07C owner-matrix row, and `2` deferred-family rows.
The current push manifest still has `0` graph-counted publishable branches and
`0` publishable net LOC.

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
Pending or incomplete accounting is tracked as its own health signal and
should not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted_last` is `FALSE`, treat the duplicate/noise share
as incomplete current-run accounting and as a control-plane health issue until
the active run completes a full pass.

The latest accounting sample is `run-20260524T032127Z` at
`2026-05-24T07:14:48Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`, and a
completed current-run full pass at `2026-05-24T07:12:55Z`. Latest completed
`duplicateShareCurrent` is `0` and summary startup failures are `0`.
Current signatures, actionable signatures, and product-evidence signatures
are each `0`; current top duplicate share is `0`. Historical aggregate
duplicate/noise is not used as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the scheduler patch was
syntax-checked, restarted, and observed actionable duplicate share `0.25`,
below threshold. The refreshed graph now has trusted current-run accounting
and is lower at `0` over `0`/`0` current/actionable signatures; it does not
contradict that feedback. The feedback still rejects interpreting the graph as
a product bug or broad product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.8GiB` free and `43.0%` used. The data
volume recovered from hard-zero free-space samples but has drifted down to
`26.6GiB` free and is still `99.2%` used. Latest CPU iowait is only `1.09%`,
after a `17.12%` spike at `2026-05-24T07:00:04Z`; output-size and disk
headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,975`. The current enabled set now
includes `novelty-http-large-post-readiness`,
`novelty-http-provider-persisted-crdt-large-post`,
`novelty-http-large-post-lifecycle`, WebSocket many-user/permissions/structure
groups, and HTTP table/list/title/persistence probes. Historical enable events
are useful for context; current lane residency should be read from the
fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`12` lanes: `9` browser/e2e lanes, `1` unit-property lane, `1`
protocol-server lane, and `1` coverage-guided-lower-level lane.

The active coverage-guided root now contributes one fresh browser/e2e row
sampled at `2026-05-24T07:13:59Z`:
`novelty-http-provider-persisted-crdt-large-post` for profile
`large-post-three-user-http-lifecycle`. Other browser/e2e `is_latest` rows are
older: one strict-expansion HTTP large-lifecycle lane, one focused-shard HTTP
same-user stale-tabs lane, and six gap-booster WebSocket lanes for real-user
title/rich-text, three-user late-join, revision autosave recovery,
async/server blocks, permissions/auth-locks, and long-session large-doc.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an `is_latest` in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, and `protocol-server` has a current HTTP polling REST
row from `2026-05-24T06:57:48Z`. The plotted
`coverage-guided-lower-level` row is now fresh rich-text CRDT from
`2026-05-24T06:34:42Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane. Native
parser/serialization work has a fresh bounded smoke/action record, but the
plotted lower-level lane is rich-text CRDT, not that parser smoke.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest non-empty level-mix synthesis
calls for deadline-mode tightening: keep one browser/e2e canary under disk
pressure, rotate it from
`novelty-http-provider-persisted-crdt-large-post` to
`novelty-http-large-post-readiness` after preserving provider evidence, keep
backend-api and protocol-server as cheap sentinels, cap unit/property at one
sentinel, and keep lower-level work to bounded HTTP polling handoff. It also
warns that `supervisor-groups.json`, supervisor state, novelty state, and
benchmark canary state can disagree, so mix accounting should not be treated as
fully trusted active capacity until those invariants fail closed. The latest
feedback-action file is empty, so the latest synthesis is the current persona
evidence: it rejects treating the provider lane as the final desired target,
but the refreshed graph still shows provider live. Readiness is enabled, but
it is not the latest graph-counted active browser/e2e row. The graph also has
older browser/e2e rows, protocol-server residency, and fresh
coverage-guided-lower-level residency, but still no graph-counted backend-api
lane, no current graph-counted transport-integration lane, and no standalone
fuzz-assertion lane. Therefore the persona-loop output rejects a graph-only
broad-expansion or healthy backend read, while the refreshed graph contradicts
any stale-current-lower-level read: live fuzzing is the HTTP browser/e2e
provider canary plus protocol-server and a narrow lower-level rich-text CRDT
probe.

The latest fuzz-assertion feedback-action added two gated fuzz-only assertions
and restarted affected focused, strict, gap, and coverage-guided loops, but the
refreshed graph still has no standalone fuzz-only assertion lane.

The latest native-harness synthesis still selected
`coverage-guided-lower-level-block-parser-serialization` as the first bounded
Node/V8 parser/serialization harness. The latest native action implemented and
validated that harness: syntax/build checks passed, a direct gated unit oracle
passed, and a bounded lower-level smoke emitted
`fuzzLevel=coverage-guided-lower-level` with `ok=true`, `coverageKeys=192`,
`newCoverageKeys=192`, `featureKeys=38`, `productYield=true`, and
`coverageCanaryOk=true`. It documented a continuous tmux launcher but did not
start a broad parser run because the parser group still has an active hold for
duplicate `RTC_BLOCK_PARSER_*` no-yield cycles. This remains separate from the
plotted lower-level residency: the graph now shows fresh
`coverage-guided-lower-level` rich-text CRDT activity from
`2026-05-24T06:34:42Z`.

The latest non-empty protocol-server synthesis still selects the HTTP polling
REST endpoint, `POST /wp-sync/v1/updates`, rather than the WebSocket relay. The
latest protocol action implemented and validated the protocol/server harness:
syntax checks passed, `wp-env` was already running, and a two-seed `50`-case
validation passed with `fuzzLevel="protocol-server"` root/lane events plus
REST, update, delivery, convergence, storage, cursor, awareness, compaction,
and byte-window oracle counters. The graph has a current
`protocol-server-http-polling` row from `2026-05-24T06:57:48Z` and
protocol-server execution evidence into the partial `07:00` bucket.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,765,041` browser/e2e,
`1,132,740` unit-property, `458,609` coverage-guided lower-level, and
`10,904,504` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T07:00:00Z` bucket is partial: it has `10` browser/e2e
executions (`40`/hour), `80` coverage-guided-lower-level executions
(`320`/hour), and `1,650` protocol-server executions (`6,600`/hour), with zero
unit-property, backend-api, transport-integration, and fuzz-assertion
executions in that bucket. The
preceding `06:45` bucket had `6` browser/e2e, `112`
coverage-guided-lower-level, and `1,450` protocol-server executions; the
`06:30` bucket had `6`, `320`, and `1,625` respectively.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `59` likely-real
findings over about `527.0` runner-hours, or `11.20` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,332`
raw candidates: `1,325` browser/e2e candidates, `5` unit-property candidates,
and `2` coverage-guided-lower-level candidates. Backend-api, protocol-server,
transport-integration, standalone fuzz-assertion, and other buckets have no
unique candidates in the latest graph-counted data.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Failure-candidate rates are pre-triage lead indicators, not confirmed bug
counts.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

The refreshed active novelty state has `17` profile rows. Weak-completion
profiles are still visible: collaboration UI signals have `484` records and
`0` successes, async/server blocks have `426` and `0`, long-session large-doc
has `40` and `0`, permissions/auth-locks has `37` and `1`,
persistence-no-title has `8` and `0`, list-move-refresh HTTP has `4` and
`0`, and parser serialization has `3` and `0`. The large-post three-user HTTP
lifecycle profile has `319` records, `17` successes, and `0` profile-row
startup failures. The many-user lifecycle profile has `40` records and `10`
successes, but the active-editing strict cross-products below are still zero.
Live startup health should
continue to use current-run summary startup failures from the health section,
which are currently `0`.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `91` met and `46`
unmet. Low/zero-progress misses still include reload-post and rich-text UI
format/heading/cut-copy actions, autosave/local-autosave, template parts,
HTTP 401/403 fault paths, remote-selection cursor history, same-user
collaborator mode, three-user late-join, collaboration UI signals,
multi-reload lifecycle, parser serialization, and weak block/media edges. The
strict
combined-ingredient and many-user sections below preserve their generated goal
tables so critical coverage floors remain visible even when the generic table
changes shape.

![Combined-ingredient fuzzing progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-progress.png)

![Combined-ingredient fuzzing goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-goal-progress.png)

![Combined-ingredient fuzzing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-requirements.png)

The combined-ingredient graphs are generated by
`rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R`
from the strict feature key
`cross-product:large-post-three-user-http-lifecycle`. They track the strict
conjunction: HTTP polling, large initial post, at least three browser users,
lifecycle reloads, save/autosave checkpoints, strict persistence oracles, and
a passed run. Separate ingredient-lane hits do not increment this
cross-product count.

Latest combined progress is `0`/`25` strict cross-product records. In the
refreshed sampled progress table, `novelty-http-large-post-lifecycle` is
marked enabled, and the adjacent large-post three-user HTTP profile has `319`
records seen, `17` successful records, and a `0.0533` success rate. The
generated goal table also shows the related successful-profile goal at
`17`/`10`, HTTP lifecycle scale at `319`/`10`, and successful three-user HTTP
records at `17`/`10`, but the strict
`cross-product:large-post-three-user-http-lifecycle` count remains `0`.

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

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The refreshed active novelty state has feature and action rows again. The
largest feature categories by total count are history (`26,309`), invariant
(`16,054`), operation-ledger (`14,509`), block-depth (`5,871`), other
(`5,496`), block (`5,440`), action (`4,850`), action-pair (`4,781`), and
transport (`3,860`). Successful actions remain concentrated in a few paths:
`edit-title` (`690`), `append-paragraph` (`414`), `concurrent-paragraphs`
(`276`), `ui-toolbar-format-paragraph` (`44`), and the large-post HTTP actions
`append-paragraph`, `insert-heading`, `concurrent-paragraphs`, and `move-block`
at `34` each.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

The parsed suggested-PR split history has `457` snapshots. The latest parsed
proposed split totals `4,114` net LOC. These charts are size telemetry from
parsed status snapshots, not filing authority. The largest latest rows are
`PR 13B` at `1,668` net LOC, `PR 13A` at `1,126`, `PR 13C` at `294`, `PR 14`
at `276`, `PR 9` at `183`, `PR 1` at `162`, `PR 4` at `159`, and `PR 10` at
`141`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current PR-progress controller snapshot is populated at
`2026-05-24T07:13:31Z`. The state-count table has `35` counted items:
`27` published ready-product rows, `4` held-by-controller ready-product rows,
`1` superseded ready-product row, `1` runtime-held-consumed PR07C
owner-matrix row, and `2` deferred-family rows split across
needs-product-decision and diagnostic states.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates,
deferred family budget gates, resource reserve, single-flight guards, or
repeated critical-path continuations are slowing progress.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has `0` graph-counted publishable branches and `0`
publishable net LOC. The controller is populated, but its current rows do not
produce a graph-counted publishable filing surface.

The latest PR-split persona feedback rejects promoting `PR16-RLH` as fileable:
the ready prefix remains through `PR15C`, while `RLH-6000007-candidate` is
blocked pending strict seed `6000007` proof and owner rows. The feedback says
exactly one bounded strict-head reproduction repair job for `8fb598778357` /
seed `6000007` was launched and is still pending.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path blocker table has `6` rows: one active benchmark-canary
exact-stack promotion repair, one held deferred-family row, and four terminal
rows covering `PR17` seed `1020002`, PR07C owner evidence, and two reducers.
The benchmark-canary blocker has active session
`rtc-critical-continuation-benchmark-canary-fuzzer-gap-20260524T070122Z`;
the queue updated at `2026-05-24T07:12:57Z` and reports
`exact_stack_repair_active`.
The repeated no-progress summary has one row: benchmark-canary zero executor
artifact.

## Interpretation

The active run has completed a trusted current-run accounting pass.
`run-20260524T032127Z` reports `duplicateShareCurrent=0` with summary startup
failures `0`, over `0` current signatures and `0` actionable signatures. Treat
the health graph as a live duplicate/noise signal from current-output-dir
accounting; this row does not show current product duplicate pressure.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and
keep startup-ish duplicate producers held unless there is strong product
evidence. Its below-threshold feedback sample is stale relative to the newest
trusted graph row; the graph row is now lower at `0`, so the feedback still
rejects a broad product duplicate-storm interpretation.

The resource picture is disk-constrained but not CPU-saturated in the latest
sample. CPU utilization is `30.55%`, iowait is `1.09%`, load remains below
the `64`-core line, and the data volume remains very full at `99.2%` used
with `26.6GiB` free. Level-mix persona output rejects broad expansion
under deadline and disk pressure, while the refreshed graph now shows one
fresh browser/e2e row in the active coverage-guided root and nine browser/e2e
rows overall. The
latest feedback-action is empty, but the latest synthesis says to rotate the
single browser slot from provider-persisted to large-post readiness after
preserving provider evidence. The graph still shows provider-persisted live;
readiness is enabled but not the latest active browser/e2e row. It also has a
fresh coverage-guided lower-level rich-text CRDT row and protocol-server
residency, but still no backend-api,
transport-integration, or standalone fuzz-assertion lane. Treat the persona
output as rejecting broad expansion and a healthy backend read, not as
overriding the newer evidence that a narrow lower-level probe is active.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
while the active coverage-guided root is currently narrowed to one HTTP
browser/e2e provider-persisted large-post lane. The remaining browser/e2e
`is_latest` rows are older focused, strict, and gap-booster lanes, so the
persona feedback rejects treating them as fully trusted healthy capacity.
Protocol-server now has both a validated HTTP polling REST smoke and recent
graph-counted execution evidence; unit-property has a bounded canary row;
coverage-guided lower-level now has fresh plotted rich-text CRDT residency
plus separate parser/serialization smoke and bounded replay evidence.
Transport-integration, backend-api, and fuzz-only assertion remain
graph-inactive in the refreshed CSVs.

Coverage-goal pressure remains at the strict cross-product edges. The generic
coverage-goal table is populated again, but
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`.
Many-user active editing is still `0` at the 6/10/12/30 active-editor
thresholds, and those counts require distinct users who actually edited,
excluding final UI witness-sweep-only edits, not merely users present.

PR progress has current graph-counted controller state but no current
graph-counted filing surface: the controller has populated state counts, while
the push manifest has `0` publishable branches and `0` publishable net LOC.
PR-split persona feedback still rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The current critical-path queue also shows an active benchmark-canary
exact-stack repair session, so the graph no longer supports the previous
"runnable but idle" blocker read.
