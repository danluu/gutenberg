# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T17:14:13Z`

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

The graph-refresh pipeline is current through `2026-05-24T17:08:17Z` for
completed monitor passes, with current-run accounting sampled at
`2026-05-24T17:13:09Z`. The active accounting row is
`run-20260524T170849Z`; `current_run_metrics_trusted_last` is `FALSE`, so the
new active output dir has not completed a trusted current-run accounting pass.

The monitor has `4,598` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `296,364`, and the current-scan coverage-file
count is `1,466`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `14` unmet, and `profile_counts.csv`
has `20` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest current-run row has
`current_run_metrics_trusted=FALSE`, `full_pass_pending=TRUE`,
`pending_until_first_pass=TRUE`, `active_run_dirs=2`,
`supervisor_groups_file=1`, `observed_roots=18`, summary startup failures `0`,
and no current-run signature/actionable-signature/product-evidence
denominators yet. The latest completed full-pass duplicate share is `0`; the
previous trusted row at `16:57` had `duplicateShareCurrent=1` over a
`1`/`1`/`1` current signature/actionable-signature/product-evidence
denominator. The current `17:13` row should be read as incomplete accounting
and a control-plane health issue until the active run completes a full pass,
not as a measured product duplicate/noise rate.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest synthesis says forced
benchmark HTTP canaries can still bypass duplicate/noise holds after one
representative exists; the earlier feedback-action patched one bypass path and
saw actionable duplicate share at `0.25`, but the latest synthesis still treats
producer publication as the residual risk. The refreshed graph now shows
untrusted first-pass accounting after a run-root change; the previous trusted
high row was a one-signature duplicate spike. This supports the
producer/control-plane residual-risk interpretation while rejecting a broad
product-storm read.

CPU/load are below the `64`-core line but disk is still the resource constraint.
At `2026-05-24T17:10:05Z`, CPU utilization is `30.27%`, iowait is `1.84%`,
and load averages are `22.00`, `24.88`, and `24.09` on `64` logical CPUs. Root
has `87.8GiB` free and the data volume has `206.5GiB` free while `94.2%` used.

The latest graph-counted fuzzing mix has `16` browser/e2e lanes across `16`
groups, plus one unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. Graph residency is still concentrated in
browser/e2e lanes, but the active coverage-guided output root is still in
first-pass accounting and the latest coverage-guided row only shows
`novelty-http-large-post-lifecycle-completion`. Lower-level targets are present
but narrow: the graph has
protocol-server HTTP polling, a unit-property HTTP polling canary, and rich-text
CRDT coverage-guided-lower-level rows. Transport-integration, backend-api, and
standalone fuzz-only assertion work remain graph-inactive. The latest
level-mix synthesis and feedback expected `novelty-http-list-move-refresh`
plus `novelty-http-existing-post-crdt-metadata`, so the refreshed graph rejects
that exact active-lane pair and currently shows incomplete materialization
accounting rather than a clean two-browser-lane state.

The execution counter has `17,350,485` estimated individual executions. The
latest plotted bucket, `2026-05-24T17:00:00Z`, is still the open bucket and has
`12` browser/e2e executions and `5,400` protocol-server executions. The
`16:45` bucket had `18` browser/e2e executions and `6,480` protocol-server
executions; the `16:30` bucket had `22` browser/e2e executions and `6,325`
protocol-server executions; the `16:15` bucket had `20` browser/e2e executions
and `6,300` protocol-server executions; and the `16:00` bucket had `14`
browser/e2e executions and `6,300` protocol-server executions. Recent
protocol-server execution volume dominates the rate graph; lower-level coverage-guided
execution remains present only as small earlier reconstructed counts and is
zero in the open `17:00` bucket.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T17:11:52Z`. The state-count table has `35` counted items:
`27` published ready-product rows, `4` held-by-controller ready-product rows,
`1` superseded ready-product row, `1` runtime-held-consumed PR07C owner-matrix
row, and `2` deferred-family rows. The current push manifest still has `0`
graph-counted publishable branches and `0` publishable net LOC.

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

The latest accounting sample is `run-20260524T170849Z` at
`2026-05-24T17:13:09Z`. It has `status_available=TRUE`,
`startup_status="monitor started; full coverage pass pending"`,
`full_pass_pending=TRUE`, `pending_until_first_pass=TRUE`,
`current_run_metrics_trusted=FALSE`, `active_run_dirs=2`,
`supervisor_groups_file=1`, `observed_roots=18`, and summary startup failures
`0`. The current-run signature/actionable-signature/product-evidence
denominators are not available yet; the latest completed full pass was clean
with `latest_completed_duplicate_share_current=0`. The previous trusted row at
`16:57` reported `duplicateShareCurrent=1` over a one-signature denominator:
current signatures/actionable signatures/product-evidence signatures
`1`/`1`/`1`, with `current_run_top_duplicate_share=1`. The current `17:13`
row is incomplete current-run accounting and should be treated as a
control-plane health issue until the new active run completes a full pass.
Historical aggregate duplicate/noise is not used as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, duplicate/noise holds that can be bypassed after one representative,
no-analysis sentinel handling, and non-authoritative supervisor publication.
The earlier feedback-action says one benchmark canary path was patched and
restarted, with actionable duplicate share observed at `0.25`, below
threshold; the latest synthesis still treats forced canary publication as the
producer-side residual. The refreshed latest row is not trusted yet, so it
cannot confirm a measured current duplicate/noise rate. It does show first-pass
accounting pending after a run-root change, which agrees with the
persona-loop control-plane risk interpretation while still rejecting a broad
product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.8GiB` free and `43.0%` used. The data
volume has `206.5GiB` free while still `94.2%` used. Latest CPU iowait is
`1.84%`; output-size and disk headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `2,155`. The active enabled-group
summary is empty for the new output root, while recent enabled events include
`novelty-http-large-post-lifecycle-completion`, `novelty-ws-async-server-blocks`,
`novelty-http-existing-post-crdt-metadata`, `novelty-http-list-move-refresh`,
`novelty-http-title-reload-convergence`, `novelty-http-large-post-readiness`,
and `novelty-ws-thirty-user-lifecycle`.
Historical enable events are useful for context; current lane residency should
be read from the fuzzing-level mix table below and cross-checked against
current-root supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`19` lanes: `16` browser/e2e lanes across `16` groups, `1` unit-property lane,
`1` protocol-server lane, and `1` coverage-guided-lower-level lane.

The latest coverage-guided browser row is at `2026-05-24T17:13:09Z`:
`novelty-http-large-post-lifecycle-completion`. The other graph-counted browser/e2e
`is_latest` rows are focused-shard rows from
`2026-05-24T08:42:57Z`, a strict HTTP large-lifecycle row from
`2026-05-23T15:52:21Z`, and six gap-booster WebSocket rows from
`2026-05-23T12:47:07Z`. The mix remains browser/e2e-heavy by lane count, but
the active coverage-guided root is still first-pass pending and only one
coverage-guided browser group is currently graph-counted. The latest level-mix
synthesis and feedback say the previous phantom browser row was pruned and
expected `novelty-http-existing-post-crdt-metadata` beside
`novelty-http-list-move-refresh`; the current graph rejects that exact pair and
does not yet show a trusted two-materialized-browser-lane state.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, `protocol-server` has an HTTP polling REST validation
row from `2026-05-24T16:38:56Z`, and `coverage-guided-lower-level` has
rich-text CRDT from `2026-05-24T14:10:08Z`. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest level-mix feedback keeps
deadline PR-evidence mode active at two live HTTP browser lanes while the data
disk is `94.2%` used, with backend/API and protocol sentinels and capped
unit/property work. The current graph disagrees with the feedback's named
browser-lane pair and, because first-pass accounting is pending, should be read
as control-plane materialization still settling. It still supports a
downscoped browser/e2e posture plus protocol-server throughput, and rejects
broad lower-level/parser/table/rich-text/fuzz-assertion expansion.

The latest fuzz-assertion apply note added two gated fuzz-only assertions
and restarted affected focused, strict, gap, and coverage-guided loops, but the
refreshed graph still has no standalone fuzz-only assertion lane.

The latest native-harness synthesis and latest non-empty action still prefer
and validate `coverage-guided-lower-level-rich-text-crdt` as the first ready
isolated lower-level harness, while an earlier synthesis preferred
`coverage-guided-lower-level-block-parser-serialization`. The prior action
implemented and validated the rich-text CRDT coverage-guided lower-level
harness with root/lane events and
`fuzzLevel: "coverage-guided-lower-level"`, passed bounded validation and a
bounded smoke, and left an existing continuous tmux lane running. The graph
currently shows the rich-text CRDT lower-level lane with a `14:10` smoke row
and `2` executions in the `14:00` bucket, with no lower-level executions in the
latest `17:00` bucket. It
aligns with the rich-text recommendation but does not yet show sustained
lower-level throughput or a current block-parser lower-level lane.

The latest non-empty protocol-server synthesis selects the HTTP polling REST
sync server state-machine fuzzer, with event accounting for root and lane
`events.ndjson`. The latest non-empty action implemented/promoted that direct
REST harness and passed a bounded one-seed, 25-case smoke. The graph has a current
`protocol-server-http-polling` row at
`2026-05-24T16:38:56Z` and protocol-server execution evidence through the
latest `17:00` bucket, with `6,325` in the `15:45` bucket, `6,300` in the
`16:00` bucket, `6,300` in the `16:15` bucket, `6,325` in the `16:30` bucket,
`6,480` in the `16:45` bucket, and `5,400` in the open `17:00` bucket.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,726,318` browser/e2e,
`1,132,740` unit-property, `458,615` coverage-guided lower-level, and
`11,032,812` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T17:00:00Z` bucket is still open: it has `12` browser/e2e
executions (`48`/hour) and `5,400` protocol-server executions (`21,600`/hour),
with zero unit-property, coverage-guided-lower-level, backend-api,
transport-integration, and fuzz-assertion executions. The `16:45` bucket has
`18` browser/e2e executions and `6,480` protocol-server executions; the `16:30`
bucket has `22` browser/e2e executions and `6,325` protocol-server executions;
the `16:15` bucket has `20` browser/e2e executions and `6,300`
protocol-server executions; the `16:00` bucket has `14` browser/e2e executions
and `6,300` protocol-server executions; and the `15:45` bucket has `9`
browser/e2e executions and `6,325` protocol-server executions. Coverage-guided
lower-level throughput is present in recent buckets but still negligible
despite the rich-text CRDT lane being current in the mix table, and it is zero
in the latest `16:45` complete bucket and the open `17:00` bucket.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output has `14` unique likely-real findings: `13`
browser/e2e findings over about `107.8` runner-hours and `1`
transport-integration finding. Protocol-server, unit-property,
coverage-guided lower-level, backend-api, standalone fuzz-assertion, and other
buckets remain `0` likely-real findings.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `97` raw
candidates: `80` browser/e2e candidates, `10` transport-integration
candidates, `5` unit-property candidates, and `2` coverage-guided-lower-level
candidates. Protocol-server, backend-api, standalone fuzz-assertion, and other
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

The refreshed active novelty state has `20` profile rows. Weak-completion
profiles are still visible: collaboration UI signals have `1,400` records and
`0` successes, async/server blocks have `432` and `0`, long-session large-doc
has `40` and `0`, list-move refresh HTTP has `121` and `0`,
permissions/auth-locks has `49` and `7`, many-user lifecycle has `92` and
`25`, persistence-no-title has `186` and `47`, revision persistence has `173`
and `66`, parser transform has `90` and `37`, parser serialization has `87`
and `21`, and multi-reload lifecycle has `85` and `39`. The large-post
three-user HTTP lifecycle profile has `644` records, `55` successes, and `0`
profile-row startup failures. The many-user
lifecycle profile still has `0` active-editing strict cross-products below.
Live startup health should continue to use current-run summary startup failures
from the health section; the latest current-run row reports `0` summary startup
failures, but its current-run metrics are still untrusted.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `123` met and `14`
unmet. Zero-progress misses include template parts, remote-selection cursor
history, and collaboration UI signals. Low-progress misses include same-user
tab documents at `2`/`25`, parser serialization at `21`/`50`, twelve-user
documents at `6`/`10`, twelve-user late join at `6`/`10`, many-user lifecycle
with twelve users at `6`/`10`, three-user late join at `18`/`25`,
multi-reload lifecycle at `39`/`50`, two-user documents at `84`/`100`,
media cross-entity at `21`/`25`, calendar at `17`/`20`, and weak HTML at
`19`/`20`.
The strict combined-ingredient and many-user sections below preserve their
generated goal tables so critical coverage floors remain visible even when the
generic table changes shape.

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
marked enabled, and the strict cross-product still has no completed records.
The adjacent large-post three-user HTTP profile has `644` records seen, `55`
successful records, and a `0.085` success rate. The generated goal table
also shows HTTP lifecycle scale at `644`/`10`, successful profile records at
`55`/`10`, and successful three-user HTTP records at
`13`/`10`, but the strict
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
transition, UI-signal, save/reload/autosave, concurrent save/autosave/publish
races, late-join, large-document, same-block contention, note
reply/resolve/delete lifecycle, WS reconnect/background churn, HTTP 413
compaction, title/content/excerpt boundary, visible remote delete,
code-editor embed stability, nested table awareness, and strict 30-user
operation-ledger cross-products remain `0` at the 6/10/12/30 active-editor
thresholds where they apply. The active-editing groups are not currently
marked enabled in the active-editing progress table.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The refreshed active novelty state has feature and action rows again. The
largest feature categories by total count are history (`88,323`), invariant
(`54,087`), operation-ledger (`52,323`), block-depth (`20,940`), block
(`19,289`), action-pair (`18,935`), action (`16,787`), other (`15,727`),
transport (`9,718`), and collaborator (`9,580`). Successful actions remain
concentrated in a few paths: `edit-title` (`926`), `append-paragraph`
(`674`), `concurrent-paragraphs` (`459`), `insert-block-gauntlet-block`
(`270`), `edit-block-gauntlet-attributes` (`254`), `insert-nested-group`
(`253`), `edit-table-array-attributes` (`241`), `delete-block` (`223`),
`move-block` (`216`), and `insert-paragraph` (`213`).

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
`2026-05-24T17:11:52Z`. The state-count table has `35` counted items:
`27` published ready-product rows, `4` held-by-controller ready-product rows,
`1` superseded ready-product row, `1` runtime-held-consumed PR07C owner-matrix
row, and `2` deferred-family rows split across needs-product-decision and
diagnostic states.

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
seed `6000007` was launched and was still pending in that loop.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path blocker table has `6` rows: one held reload-hydration
deferred-family row and five terminal rows covering benchmark-canary exact-stack
green evidence, `PR17` seed `1020002`, PR07C owner evidence, and two reducers.
The queue reports PR07C owner evidence and benchmark-canary as terminal, and
reload-hydration as gated by the deferred single-flight hold rather than a
graph-counted publishable PR branch.

## Interpretation

The active run has not completed first-pass accounting. `run-20260524T170849Z`
reports `current_run_metrics_trusted=FALSE`,
`pending_until_first_pass=TRUE`, `full_pass_pending=TRUE`, summary startup
failures `0`, and no current signature/actionable-signature/product-evidence
denominators yet. Treat the health graph as current-output-dir accounting:
because the latest row is untrusted, the duplicate/noise share is incomplete
current-run accounting and a control-plane health issue until the active run
completes a full pass. The previous trusted high row was `1` over a
`1`/`1`/`1` denominator, so the graph still does not support a broad product
duplicate-storm read.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and keep
startup-ish duplicate producers held unless there is strong product evidence.
The refreshed graph agrees with that residual-risk interpretation because the
new output root is still pending trusted accounting, while the last trusted
high duplicate row had only a one-signature denominator.

The resource picture is still disk-constrained. CPU utilization is `30.27%`,
iowait is `1.84%`, five-minute load is below the `64`-core line at `24.88`,
and the data volume is `94.2%` used with `206.5GiB` free. Level-mix persona output
rejects broad expansion under deadline and disk pressure. The latest
level-mix synthesis and feedback expected `novelty-http-list-move-refresh` and
`novelty-http-existing-post-crdt-metadata`, while the current graph shows only
`novelty-http-large-post-lifecycle-completion` as the latest coverage-guided
browser row and first-pass accounting is still pending. The graph therefore
rejects the feedback's exact active-lane pair and shows materialization
accounting still settling, while still rejecting broad browser or lower-level
expansion.

Protocol-server HTTP polling has a current row, a validated direct REST harness
action, and recent execution evidence through the open `17:00` bucket.
Lower-level rich-text CRDT is present with a fresh `14:10` smoke row and small
`13:45` and `14:00` execution counts after a validated bounded harness action,
but the latest `16:45` and open `17:00` buckets are back to zero lower-level
executions. Backend-api, transport-integration, and standalone fuzz-assertion
lanes remain graph-inactive.

Coverage-goal pressure remains at the strict cross-product edges. The generic
coverage-goal table is populated with `14` unmet goals, and
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25` even
though nearby large-post HTTP ingredient counts exist. Separate ingredient-lane
hits must not be read as true combined coverage. Many-user active editing is
still `0` at the 6/10/12/30 active-editor thresholds, and those counts require
distinct users who actually edited, excluding final UI witness-sweep-only edits,
not merely users present.

PR progress has current graph-counted controller state but no current
graph-counted filing surface: the controller has populated state counts, while
the push manifest has `0` publishable branches and `0` publishable net LOC.
PR-split persona feedback still rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The graph supports "blocked on exact-stack/deferred gates" more than "ready to
publish."
