# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T05:39:08Z`

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

The graph-refresh pipeline is current through `2026-05-24T05:35:40Z` for
monitor passes and through `2026-05-24T05:37:01Z` for current-run accounting.
The active accounting row is `run-20260524T032127Z`;
`current_run_metrics_trusted_last` is `TRUE`, the first full pass is no longer
pending, and the latest completed full-pass timestamp is
`2026-05-24T05:35:40Z`.

The monitor has `4,351` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `293,269`, and the current-scan coverage-file
count is `1,157`. Current coverage/profile intake is populated again:
`coverage_goals.csv` has `137` goals with `46` unmet, and `profile_counts.csv`
has `15` profiles.

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

CPU and load are below the `64`-core line in the newest samples, though load
rose. At `2026-05-24T05:30:01Z`, CPU utilization is `31.26%`, iowait is
`2.51%`, and load averages are `35.21`, `27.00`, and `22.22` on `64` logical
CPUs. Disk is still the live constraint: at `2026-05-24T05:38:03Z`, root has
`87.8GiB` free and the data volume has `49.8GiB` free while `98.6%` used.

The latest graph-counted fuzzing mix has `9` browser/e2e lanes, one
unit-property lane, one protocol-server lane, and one stale
coverage-guided-lower-level lane. The latest current-root browser/e2e row is
`novelty-http-existing-post-crdt-metadata`, sampled at
`2026-05-24T05:38:04Z`. Level-mix persona feedback rejects broad expansion
under deadline/disk pressure and says browser/e2e should stay tight, with
backend/API and protocol/server only as cheap sentinels and lower-level work
bounded to a replay. The latest feedback-action reports a backend/API
sentinel, a protocol/server sentinel, and one bounded lower-level replay were
started. The refreshed graph agrees on protocol-server and browser/e2e
residency, but still has no graph-counted backend/API lane and only stale
coverage-guided-lower-level residency, so the feedback rejects reading the
graph as broad lower-level/backend/protocol expansion or productive throughput.

The execution counter has `17,250,028` estimated individual executions. The
latest nonzero plotted bucket, `2026-05-24T05:30:00Z`, has `2` browser/e2e
executions and `875` protocol-server executions. The `05:15` bucket has `6`
browser/e2e and `1,325` protocol-server executions, the `05:00` bucket has
`14` browser/e2e and `25` protocol-server executions, and the `04:45` bucket
has `9` browser/e2e and `25` protocol-server executions.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T05:36:00Z`. The state-count table has `35`
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
`2026-05-24T05:37:01Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`, and a
completed current-run full pass at `2026-05-24T05:35:40Z`. Latest completed
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
sample, root pressure is stable at `87.8GiB` free and `42.9%` used. The data
volume recovered from hard-zero free-space samples but has drifted down to
`49.8GiB` free and is still `98.6%` used, so output-size budgeting remains the
dominant resource constraint.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,932`, and the newest enabled-group
event is `novelty-ws-many-user-lifecycle`. Historical enable events
are useful for context; current lane residency should be read from the
fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`12` lanes: `9` browser/e2e lanes, `1` unit-property lane, `1`
protocol-server lane, and `1` stale coverage-guided-lower-level lane.

The newest current-root row is one browser/e2e HTTP lane sampled at
`2026-05-24T05:38:04Z`: `novelty-http-existing-post-crdt-metadata`, profile
`persistence-no-title`. Other browser/e2e `is_latest` rows are older: one
strict-expansion HTTP large-lifecycle lane, one focused-shard HTTP same-user
stale-tabs lane, and six gap-booster WebSocket lanes for real-user
title/rich-text, three-user late-join, revision autosave recovery,
async/server blocks, permissions/auth-locks, and long-session large-doc.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an `is_latest` in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, and `protocol-server` has a current HTTP polling REST
row from `2026-05-24T05:17:24Z`. The lone plotted
`coverage-guided-lower-level` row is stale rich-text CRDT from
`2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone `fuzz-assertion` work have no current graph-counted lane. Native
parser/serialization work has only bounded smoke/synthesis evidence, not
sustained plotted residency.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis calls for
deadline-mode tightening: broad browser expansion stays frozen under disk
pressure, one browser/e2e lane stays alive, backend/API and protocol/server are
cheap sentinels, unit/property is capped, and persistent lower-level work stays
bounded. It also warns that supervisor and novelty state can disagree during
rotation, so stale roots must not be treated as active capacity. The latest
feedback-action reports backend/API and protocol/server sentinels plus one
bounded PR17 HTTP-polling lower-level replay, and says regenerated telemetry is
clean for active decisions. The refreshed graph agrees on protocol-server and
browser/e2e, but still has no graph-counted backend/API lane, no current
graph-counted transport-integration lane, no standalone fuzz-assertion lane,
and only stale coverage-guided-lower-level residency. Therefore the feedback
rejects a graph-only broad-expansion or productive lower-level/backend read:
live fuzzing remains concentrated in browser/e2e, with protocol-server
graph-active and backend/lower-level evidence bounded or not yet sustained in
the graph.

The latest non-empty native-harness synthesis selected
`coverage-guided-lower-level-block-parser-serialization` as the first bounded
Node/V8 parser/serialization harness. The latest non-empty native action
implemented and validated it: syntax/build checks passed, a focused
unit/preflight test passed, and a bounded lower-level smoke emitted
`fuzzLevel=coverage-guided-lower-level` with `ok=true`,
`coverageCanaryOk=true`, and `coverageKeys=192`. No unbounded tmux fuzz loop
was started. This remains separate from sustained graph residency: the graph
still shows only stale coverage-guided-lower-level rich-text CRDT residency
from `2026-05-21T11:14:10Z`.

The latest protocol-server synthesis selects the HTTP polling REST endpoint,
`POST /wp-sync/v1/updates`, rather than the WebSocket relay. The latest
protocol action implemented and validated that harness: syntax checks and PHP
lint passed, the preflight produced `1,589` assertions, and a bounded
`2`-seed/`25`-case validation emitted matching root/lane `events.ndjson` with
`fuzzLevel="protocol-server"` and non-empty oracle counts. The graph has a
current `protocol-server-http-polling` row and recent protocol-server
execution volume through the `05:30` bucket.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,764,987` browser/e2e,
`1,132,740` unit-property, `458,097` coverage-guided lower-level, and
`10,894,204` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest nonzero `2026-05-24T05:30:00Z` bucket has `2` browser/e2e
executions (`8`/hour) and `875` protocol-server executions (`3,500`/hour),
with zero unit-property, coverage-guided-lower-level, backend-api,
transport-integration, and fuzz-assertion executions in that bucket. The
`05:15` bucket had `6` browser/e2e and `1,325` protocol-server executions,
the `05:00` bucket had `14` browser/e2e and `25` protocol-server executions,
the `04:45` bucket had `9` browser/e2e and `25` protocol-server executions,
and the `04:30` bucket had `7` browser/e2e and `1,175` protocol-server
executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `59` likely-real
findings over about `525.3` runner-hours, or `11.23` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,330`
raw candidates: `1,323` browser/e2e candidates, `5` unit-property candidates,
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

The refreshed active novelty state has `15` profile rows. Weak-completion
profiles are still visible: async/server blocks have `425` records and `0`
successes, collaboration UI signals have `374` and `0`, long-session large-doc
has `37` and `0`, permissions/auth-locks has `35` and `0`,
persistence-no-title has `8` and `0`, list-move-refresh HTTP has `4` and
`0`, and parser serialization has `3` and `0`. The large-post three-user HTTP
lifecycle profile has `281` records, `14` successes, and `0` profile-row
startup failures. The many-user lifecycle profile has `30` records and `10`
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
refreshed sampled progress table, `novelty-http-large-post-lifecycle` is not
marked enabled, and the adjacent large-post three-user HTTP profile has `281`
records seen, `14` successful records, and a `0.0498` success rate. The
generated goal table also shows the related successful-profile goal at
`14`/`10`, HTTP lifecycle scale at `281`/`10`, and successful three-user HTTP
records at `14`/`10`, but the strict
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
largest feature categories by total count are history (`22,870`), invariant
(`13,805`), operation-ledger (`12,598`), block-depth (`5,241`), other
(`4,905`), block (`4,814`), action (`4,181`), action-pair (`4,089`), and
transport (`3,472`). Successful actions remain concentrated in a few paths:
`edit-title` (`690`), `append-paragraph` (`414`), and
`concurrent-paragraphs` (`276`).

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
`2026-05-24T05:36:00Z`. The state-count table has `35` counted items:
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
The repeated no-progress summary has two rows: benchmark-canary exact-stack
promotion blocked without active repair and benchmark-canary zero executor
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

The resource picture is disk-constrained but not CPU/load-bound in the latest
sample. CPU utilization is `31.26%`, iowait is `2.51%`, load remains below the
`64`-core line, and the data volume remains very full at `98.6%` used with
`49.8GiB` free. Level-mix feedback rejects broad expansion under deadline and
disk pressure, and the refreshed graph's current-root supervisor row is
`novelty-http-existing-post-crdt-metadata`. The feedback-action reports
starting backend/API and protocol sentinels plus a bounded lower-level replay,
but the refreshed graph only sustains protocol-server. Treat that feedback as
rejecting a graph-only broad-expansion or productive lower-level/backend read;
broad browser expansion should still stay held while disk remains tight.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
and the current-root row is a browser/e2e HTTP persistence/no-title lane. This
matches the deadline-mode "keep one browser lane alive" read. Protocol-server
now has both a validated HTTP polling REST smoke and recent graph-counted
execution evidence; unit-property has a bounded canary row; coverage-guided
lower-level has only stale plotted residency plus separate parser/serialization
and replay evidence; transport-integration, backend-api, and fuzz-assertion
remain graph-inactive in the refreshed CSVs.

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
