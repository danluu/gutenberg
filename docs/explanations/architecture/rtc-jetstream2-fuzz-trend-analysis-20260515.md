# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T03:32:54Z`

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

The graph-refresh pipeline is current through `2026-05-24T03:30:22Z` for
monitor passes and through `2026-05-24T03:30:55Z` for current-run accounting.
The active accounting row is `run-20260524T032127Z`;
`current_run_metrics_trusted_last` is `TRUE`, the first full pass is no longer
pending, and the latest completed full-pass timestamp is
`2026-05-24T03:30:22Z`.

The monitor has `4,305` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `293,035`, and the current-scan coverage-file
count is `1,045`. Current coverage/profile intake is populated again:
`coverage_goals.csv` has `137` goals with `67` unmet, and `profile_counts.csv`
has `8` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest trusted row has `duplicateShareCurrent` `1.0`
and summary startup failures `0`, with `1` current signature, `1` actionable
signature, `1` product-evidence signature, and top duplicate share `1.0`.
That high share is a one-actionable-signature denominator, not broad
duplicate pressure.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says a
scheduler fix previously brought actionable duplicate share to `0.25`; the
refreshed graph now has a trusted `1`/`1` current-run denominator, so that
below-threshold observation no longer describes the newest sample.

CPU and load are not saturated in the newest samples. At
`2026-05-24T03:30:00Z`, CPU utilization is `17.05%`, iowait is `0.47%`, and
load averages are `19.44`, `15.39`, and `13.44` on `64` logical CPUs. Disk is
still the live constraint: at `2026-05-24T03:31:29Z`, root has `87.9GiB` free
and the data volume has `73.3GiB` free while `97.9%` used.

The latest graph-counted fuzzing mix has `9` browser/e2e lanes, one
unit-property lane, one protocol-server lane, and one stale
coverage-guided-lower-level lane. Persona-loop evidence rejects treating that
as trusted live capacity: the latest level-mix synthesis says browser/e2e
capacity is effectively `0` until disk/materialization and current-root
supervisor/session evidence are repaired. Its recommendation is deadline-mode
tightening: preserve evidence, free disk, run one bounded large-post browser
canary, and keep lower-level work to bounded sentinel or replay validation.
The latest level-mix feedback-action file is empty. The later protocol-server
action did implement and smoke-test the HTTP polling REST harness.

The execution counter has `17,245,139` estimated individual executions. The
latest nonzero plotted bucket, `2026-05-24T03:30:00Z`, has `3` browser/e2e
executions; the preceding `03:15` bucket has `5` browser/e2e and `25`
protocol-server executions.

The PR-focused critical-path data is live. The state-count table has `35`
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
`2026-05-24T03:30:55Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`, and a
completed current-run full pass at `2026-05-24T03:30:22Z`. Latest completed
`duplicateShareCurrent` is `1.0` and summary startup failures are `0`.
Current signatures, actionable signatures, and product-evidence signatures
are each `1`; current top duplicate share is `1.0`. Report that as a high
current-run duplicate share over a one-actionable-signature denominator, not
as a broad duplicate storm. Historical aggregate duplicate/noise is not used
as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the scheduler patch was
syntax-checked, restarted, and observed actionable duplicate share `0.25`,
below threshold. The refreshed graph now has trusted current-run accounting
and shows `1`/`1`, so the feedback's below-threshold sample is stale for the
current active pass; it still rejects interpreting the graph as a product bug
or broad product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.9GiB` free and `42.9%` used. The data
volume recovered from hard-zero free-space samples to `73.3GiB` free, but it
is still `97.9%` used, so output-size budgeting remains the dominant resource
constraint.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,910`, but the current active
enabled-group state is only `novelty-http-large-post-readiness`. Historical
enable events are useful for context; current lane residency should be read
from the fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`12` lanes: `9` browser/e2e lanes, `1` unit-property lane, `1`
protocol-server lane, and `1` stale coverage-guided-lower-level lane.

The newest current-root row is one browser/e2e HTTP lane,
`novelty-http-large-post-readiness`, sampled at `2026-05-24T03:29:35Z`.
Other browser/e2e `is_latest` rows are older: one strict-expansion HTTP
large-lifecycle lane, one focused-shard HTTP same-user stale-tabs lane, and
six gap-booster WebSocket lanes for real-user title/rich-text, three-user
late-join, revision autosave recovery, async/server blocks,
permissions/auth-locks, and long-session large-doc.

Lower-level graph residency is narrow. `unit-property` has a current
in-process HTTP polling canary row from `2026-05-24T00:19:43Z`, and
`protocol-server` has a current HTTP polling REST row from
`2026-05-24T03:25:52Z`. The lone plotted `coverage-guided-lower-level` row is
stale rich-text CRDT from `2026-05-21T11:14:10Z`. `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` work have no current
graph-counted lane. The native parser/serialization action did pass a bounded
V8 lower-level smoke, but it is not sustained plotted residency.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis says the
current browser/e2e capacity should be treated as effectively `0` until
materialization is repaired and supervisor/session/root telemetry agrees. It
also says lower-level work should remain bounded: protocol/server and
backend/API held or sentinel-only, unit/property as bounded replay/canary,
persistent coverage-guided lower-level and fuzz-assertion expansion held, and
one repaired large-post browser canary before broader browser scheduling. The
empty latest level-mix feedback-action file adds no separate action result.

The latest native-harness synthesis selects
`coverage-guided-lower-level-block-parser-serialization` as the first bounded
Node/V8 parser/serialization harness. The latest native action validates that
path with syntax checks, spec-parser `build:js`, the fuzz-gated parser Jest
target, bounded lower-level smoke, and the ordinary unit gate. The smoke wrote
root/lane `events.ndjson`, `seed-attempt-complete`, `coverageKeys=192`,
`featureKeys=38`, `productYield=true`, and `testExecutionCount=2`, but did
not start an unbounded lane because the parser group remains held.

The latest protocol-server synthesis chooses the HTTP polling REST sync server
as the first protocol/server harness and keeps WebSocket relay fuzzing as a
secondary lane. The latest protocol-server action implemented and validated
the harness: `node --check`, `bash -n`, PHP lint, targeted PHPCS, targeted JS
lint, `wp-env status`, and a bounded smoke with `OK (1 test, 1589 assertions)`.
The graph has a current `protocol-server-http-polling` row and recent
protocol-server execution volume through the `03:15` bucket.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,764,898` browser/e2e,
`1,132,740` unit-property, `458,097` coverage-guided lower-level, and
`10,889,404` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest nonzero `2026-05-24T03:30:00Z` bucket has `3` browser/e2e
executions (`12`/hour), with zero unit-property, coverage-guided-lower-level,
backend-api, protocol-server, transport-integration, and fuzz-assertion
executions. The preceding nonzero `03:15` bucket had `5` browser/e2e and `25`
protocol-server executions; `02:45` had `25` protocol-server executions;
`00:30` had `18` browser/e2e executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `58` likely-real
findings over about `523.3` runner-hours, or `11.08` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,327`
raw candidates: `1,320` browser/e2e candidates, `5` unit-property candidates,
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

The refreshed active novelty state has `8` profile rows. Weak-completion
profiles are still visible: async/server blocks have `425` records and `0`
successes, collaboration UI signals have `264` and `0`, long-session large-doc
has `37` and `0`, and permissions/auth-locks has `35` and `0`. The
large-post three-user HTTP lifecycle profile has `246` records, `2`
successes, and `1` profile-row startup failure. Live startup health should
continue to use current-run summary startup failures from the health section,
which are currently `0`.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `70` met and `67`
unmet. Zero-count misses still include list movement, table stale-snapshot
HTML, rich-text UI format/heading/cut-copy/reload actions,
media-cross-entity insertion, template parts, and media-cross-entity block
types. The strict combined-ingredient and many-user sections below preserve
their generated goal tables so critical coverage floors remain visible even
when the generic table changes shape.

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
marked enabled, and the adjacent large-post three-user HTTP profile has `246`
records seen, `2` successful records, and a `0.0081` success rate. The
generated goal table also shows the related successful-profile goal at `2`/`10`
and successful three-user HTTP records at `3`/`10`, but the strict
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
largest feature categories by total count are history (`18,640`), invariant
(`10,989`), operation-ledger (`10,270`), block-depth (`4,394`), other
(`4,142`), block (`3,978`), action (`3,421`), action-pair (`3,359`), and
transport (`3,004`). Successful actions remain concentrated in a few paths:
`edit-title` (`690`), `append-paragraph` (`414`), and
`concurrent-paragraphs` (`276`) are all from session-lifecycle.

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
`2026-05-24T03:29:41Z`. The state-count table has `35` counted items:
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
The repeated no-progress summary has three rows: benchmark-canary exact-stack
promotion blocked without active repair, benchmark-canary zero executor
artifact, and productive-analysis zero current input.

## Interpretation

The active run has completed a trusted current-run accounting pass.
`run-20260524T032127Z` reports `duplicateShareCurrent=1.0` with summary
startup failures `0`, but the denominator is only `1` current signature and
`1` actionable signature. Treat the health graph as a live duplicate/noise
warning over a tiny current-run denominator, not as evidence of broad product
duplicate pressure.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and
keep startup-ish duplicate producers held unless there is strong product
evidence. Its below-threshold feedback sample is stale relative to the newest
trusted graph row.

The resource picture is disk-constrained but not CPU/load-bound in the latest
sample. CPU utilization is `17.05%`, iowait is `0.47%`, load is far below the
`64`-core line, and the data volume remains very full at `97.9%` used. Broad
browser expansion should still wait on evidence-preserving cleanup and
materialization repair.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
but persona-loop evidence explicitly rejects crediting those rows as trusted
active browser capacity. The operational read is one bounded large-post
browser canary after disk/materialization repair, plus bounded lower-level
sentinel/replay work. Protocol-server now has both a validated HTTP polling
REST smoke and the freshest lower-level graph-counted execution evidence;
unit-property has a bounded canary row; coverage-guided lower-level has only
stale plotted residency plus a separate bounded parser/serialization smoke;
transport-integration, backend-api, and fuzz-assertion remain graph-inactive.

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
