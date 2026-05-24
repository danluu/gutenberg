# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T09:20:46Z`

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

The graph-refresh pipeline is current through `2026-05-24T09:19:39Z` for
completed monitor passes and through `2026-05-24T09:19:39Z` for current-run
accounting. The active accounting row is `run-20260524T082929Z`;
`current_run_metrics_trusted_last` is `TRUE`, and the latest completed
current-run full-pass timestamp is `2026-05-24T09:19:39Z`.

The monitor has `4,408` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `294,445`, and the current-scan coverage-file
count is `1,359`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `23` unmet, and `profile_counts.csv`
has `19` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest trusted current-run row has
`duplicateShareCurrent=0.2`, summary startup failures `0`, and current
signature/actionable-signature/product-evidence denominators `5`/`5`/`5`.
That one-of-five top-duplicate share is below the action threshold and remains
a narrow current-run signal, not a broad duplicate storm.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says a
scheduler fix previously brought actionable duplicate share to `0.25`. The
refreshed trusted graph is now lower at `0.2` over five actionable
signatures, so the feedback's producer/control-plane interpretation still fits
better than a broad product duplicate-storm interpretation.

CPU and load are elevated above the `64`-core line in the newest samples. At
`2026-05-24T09:10:03Z`, CPU utilization is `77.37%`, iowait is `1.87%`, and
load averages are `76.49`, `73.35`, and `62.39` on `64` logical CPUs. Disk is
still the main resource constraint: at `2026-05-24T09:19:59Z`, root has
`87.9GiB` free and the data volume has `202.3GiB` free while `94.3%`
used.

The latest graph-counted fuzzing mix has `33` browser/e2e lanes across `33`
groups, plus one unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. The active coverage-guided browser/e2e run is
`run-20260524T082929Z`, with fresh rows at `2026-05-24T09:19:33Z` for WS
block-gauntlet, revision, parser, multi-reload, and same-user surfaces plus HTTP
large-post, list-move, same-user, table, title, existing-post, and
persistence-probe surfaces. Focused-shard rows also refreshed at
`2026-05-24T08:42:57Z`. The graph shows a fresh
`coverage-guided-lower-level` rich-text CRDT row at `2026-05-24T06:34:42Z` and
a current protocol-server HTTP polling row at `2026-05-24T09:06:52Z`. The graph
is browser/e2e-heavy by lane count. Recent complete-ish execution buckets remain
protocol-server-heavy through `09:00`; the latest partial bucket is browser-only.
Transport-integration, backend-api, and standalone fuzz-only assertion work
remain graph-inactive.

The execution counter has `17,233,782` estimated individual executions. The
latest plotted bucket, `2026-05-24T09:15:00Z`, is partial: `94` browser/e2e
executions, `0` coverage-guided lower-level executions, and `0` protocol-server
executions. The preceding `09:00` bucket has `264` browser/e2e, `0`
coverage-guided-lower-level, and `1,153` protocol-server executions; the `08:45`
bucket has `187`, `0`, and `1,175` respectively.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T09:18:50Z`. The state-count table has `35`
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

The latest accounting sample is `run-20260524T082929Z` at
`2026-05-24T09:19:39Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`, and a
completed current-run full-pass timestamp of `2026-05-24T09:19:39Z`. The
completed-pass `duplicateShareCurrent` and summary startup failures are
`0.2` and `0`. Current signatures, actionable signatures, and product-evidence
signatures are `5`/`5`/`5`, so the top duplicate share is one signature out of a
five-signature denominator. Historical aggregate
duplicate/noise is not used as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the scheduler patch was
syntax-checked, restarted, and observed actionable duplicate share `0.25`,
below threshold. The refreshed graph is now trusted and shows `0.2` over five
actionable signatures, also below threshold. That still rejects
interpreting the available evidence as a product bug or broad product duplicate
storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.9GiB` free and `42.9%` used. The data
volume recovered from hard-zero free-space samples and the newest graph sample
has `202.3GiB` free while still `94.3%` used. Latest CPU iowait is `1.87%`,
after a `17.12%` spike at `2026-05-24T07:00:04Z`; output-size and disk
headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,996`. The latest enabled rows are
`novelty-ws-parser-transform`, `novelty-ws-media-cross-entity`, and
`novelty-ws-real-user-rich-text` at `2026-05-24T08:27:31Z`. Historical
enable events are useful for context; current lane residency should be read
from the fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`36` lanes: `33` browser/e2e lanes across `33` groups, `1` unit-property lane,
`1` protocol-server lane, and `1` coverage-guided-lower-level lane.

The graph-counted browser/e2e `is_latest` rows include `18` fresh
coverage-guided rows from `run-20260524T082929Z` at `2026-05-24T09:19:33Z`.
Those cover WS block gauntlet, revision persistence/recovery, same-user
lifecycle/stale tabs, parser serialization/transform, multi-reload, and HTTP
large-post readiness/lifecycle/completion, provider persistence, list move,
same-user stale draft, table stale snapshot, title reload convergence,
existing-post CRDT metadata, and persistence probe.
Focused-shard rows also refreshed at `2026-05-24T08:42:57Z` for same-user,
title reload, existing-post CRDT, code editor, UI signals, large HTTP
lifecycle, and large HTTP readiness. The remaining browser/e2e rows are one
strict-expansion HTTP large-lifecycle lane from `2026-05-23T15:52:21Z` and six
gap-booster WebSocket lanes from `2026-05-23T12:47:07Z` for real-user
title/rich-text, three-user late-join, revision autosave recovery,
async/server blocks, permissions/auth-locks, and long-session large-doc. The
current graph-counted mix is browser/e2e-heavy by lane count. The latest
partial execution bucket is browser-only, while the preceding `09:00` bucket
still has protocol-server executions.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an `is_latest` in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, and `protocol-server` has a current HTTP polling REST
row from `2026-05-24T09:06:52Z`. The plotted
`coverage-guided-lower-level` row is fresh rich-text CRDT from
`2026-05-24T06:34:42Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis says the
deadline-mode mix should tighten toward PR-finalization evidence: force browser
HTTP benchmark-canary materialization, keep backend/API and protocol/server as
cheap sentinels, keep unit/property tiny, and hold broad parser, rich-text,
table, fuzz-assertion, and generic deferred relaunches. The latest
feedback-action says a bounded HTTP polling lower-level handoff was launched,
backend/API and protocol/server sentinels were restarted, and backend/API plus
protocol/server were then killed by the autoscaler under high/severe pressure.
The refreshed graph does not support a durable one-browser-lane interpretation:
graph-counted browser/e2e residency is `33` lanes across `33` groups. It also
does not yet show the claimed HTTP polling lower-level handoff in the execution
count/rate tables: the `09:00` and `09:15` coverage-guided-lower-level buckets
are still `0`, and the only current lower-level mix row is rich-text CRDT. Treat
that as persona evidence contradicting the graph, not as confirmed plotted
lower-level throughput. The no-expansion guidance still fits the graph because
backend-api, transport-integration, and standalone fuzz-assertion lanes remain
graph-inactive.

The latest fuzz-assertion feedback-action added two gated fuzz-only assertions
and restarted affected focused, strict, gap, and coverage-guided loops, but the
refreshed graph still has no standalone fuzz-only assertion lane.

The latest native-harness synthesis chooses
`coverage-guided-lower-level-rich-text-crdt` as the first ready isolated
harness. It treats parser/serialization as second because its current hold is
substantive duplicate `RTC_BLOCK_PARSER_*` churn. The graph agrees with that
persona evidence: the plotted lower-level lane is fresh rich-text CRDT activity
from `2026-05-24T06:34:42Z`. The latest native-harness action reports that the
rich-text CRDT lower-level harness was promoted and smoke-tested with
`coverageKeys=342`, `featureKeys=107`, and `productYield=true`; that action
evidence supports the same target but is not separately visible as a new current
mix row in the refreshed graph.

The latest protocol-server synthesis selects the HTTP polling REST endpoint,
`POST /wp-sync/v1/updates`, rather than the WebSocket relay. The latest protocol
action reports the HTTP polling REST harness implemented and validated:
`validation-20260524T084923Z` passed two seeds with `25` cases each, emitted
root and lane `seed-attempt-complete` events with
`fuzzLevel=protocol-server`, and passed the HTTP polling manager unit test. The
graph has a current `protocol-server-http-polling` row from
`2026-05-24T09:06:52Z` and protocol-server execution evidence into the latest
`09:00` bucket, but the `09:15` bucket is zero after the pressure-gated sentinel
kill reported by level-mix feedback. The WebSocket relay remains second-pass.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,727,001` browser/e2e,
`1,132,740` unit-property, `458,609` coverage-guided lower-level, and
`10,915,432` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T09:15:00Z` bucket is partial: it has `94` browser/e2e
executions (`376`/hour), `0` coverage-guided-lower-level executions (`0`/hour),
and `0` protocol-server executions, with zero unit-property, backend-api,
transport-integration, and fuzz-assertion executions in that bucket. The
preceding `09:00` bucket had `264` browser/e2e, `0`
coverage-guided-lower-level, and `1,153` protocol-server executions; the
`08:45` bucket had `187`, `0`, and `1,175` respectively. The latest level-mix
feedback says a bounded HTTP polling lower-level handoff emitted `64` inputs,
but the refreshed execution CSV has not picked that up as plotted lower-level
count/rate yet.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output has `25` unique likely-real findings, all
browser/e2e over about `119.5` runner-hours. Protocol-server has `0` likely-real
findings over about `126.6` runner-hours, unit-property has `0` over about
`89.8` runner-hours, and coverage-guided lower-level has `0` over about `22.3`
runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `194`
raw candidates: `187` browser/e2e candidates, `5` unit-property candidates,
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

The refreshed active novelty state has `19` profile rows. Weak-completion
profiles are still visible: collaboration UI signals have `852` records and
`0` successes, async/server blocks have `426` and `0`, long-session large-doc
has `40` and `0`, permissions/auth-locks has `37` and `1`,
persistence-no-title has `60` and `23`, list-move-refresh HTTP has `26` and
`0`, revision persistence has `54` and `28`, parser serialization has `23` and
`10`, and multi-reload lifecycle has `24` and `15`.
The large-post three-user HTTP
lifecycle profile has `386` records, `29` successes, and `0` profile-row
startup failures. The many-user lifecycle profile has `55` records and `15`
successes, but the active-editing strict cross-products below are still zero.
Live startup health should continue to use current-run summary startup failures
from the health section; the latest trusted current-run completed pass has `0`.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `114` met and `23`
unmet. Zero-progress misses still include template parts, HTTP 401/403 fault
paths, remote-selection cursor history, three-user late join, collaboration UI
signals, and several active-editing cross-products. Low-progress misses include
media cross-entity, parser serialization, multi-reload lifecycle,
autosave/local-autosave, same-user collaborator mode, revision eligibility,
real-user editing, and weak block/file/details/social/gallery edges. The strict
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
marked enabled, and the adjacent large-post three-user HTTP profile has `386`
records seen, `29` successful records, and a `0.0751` success rate. The
generated goal table also shows the related successful-profile goal at
`29`/`10`, HTTP lifecycle scale at `386`/`10`, and successful three-user HTTP
records at `26`/`10`, but the strict
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
largest feature categories by total count are history (`45,541`), invariant
(`28,277`), operation-ledger (`26,109`), block-depth (`10,579`), block
(`9,749`), action-pair (`9,171`), other (`8,776`), action (`8,640`), and
transport (`5,782`). Successful actions remain concentrated in a few paths:
`edit-title` (`779`), `append-paragraph` (`522`), `concurrent-paragraphs`
(`337`), block-gauntlet insert/edit actions (`151`/`149`),
`ui-toolbar-format-paragraph` (`77`), and the large-post HTTP actions
`append-paragraph`, `insert-heading`, `concurrent-paragraphs`, and `move-block`
at `58` each.

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
`2026-05-24T09:18:50Z`. The state-count table has `35` counted items:
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
exact-stack repair, one held deferred-family row, and four terminal rows
covering `PR17` seed `1020002`, PR07C owner evidence, and two reducers. The
queue updated at `2026-05-24T09:18:54Z` and reports the exact-stack repair as
active plus a gated reload-hydration deferred-family job. Current active
sessions are controller/persona loops and the benchmark-canary critical
continuation, not a graph-counted publishable PR branch.
The repeated no-progress summary has one row: benchmark-canary zero executor
artifact.

## Interpretation

The active run has completed a trusted current-run accounting pass.
`run-20260524T082929Z` reports `current_run_metrics_trusted=TRUE`,
`pending_until_first_pass=FALSE`, latest completed pass
`2026-05-24T09:19:39Z`, `duplicateShareCurrent=0.2`, and summary startup
failures `0`. Current signatures, actionable signatures, and product-evidence
signatures are `5`/`5`/`5`, so the duplicate share is one top duplicate over a
five-signature current-run denominator. Treat the health graph as
current-output-dir accounting; pending/incomplete accounting remains its own
control-plane health signal when present, not a measured product duplicate/noise
rate.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and
keep startup-ish duplicate producers held unless there is strong product
evidence. Its below-threshold feedback sample was `0.25`; the refreshed graph
is now trusted at `0.2` over five actionable signatures. The graph therefore
keeps duplicate/noise below threshold while preserving producer/control-plane
follow-up, and still rejects a broad product duplicate-storm interpretation.

The resource picture is disk-constrained with elevated CPU/load in the latest
sample. CPU utilization is `77.37%`, iowait is `1.87%`, one-minute load is
above the `64`-core line at `76.49`, and the data volume is `94.3%` used with
`202.3GiB` free.
Level-mix persona output rejects broad expansion under deadline and disk
pressure. The latest synthesis recommends tightening toward PR-finalization
evidence, and the latest feedback-action says backend/API and protocol/server
sentinels were autoscaler-killed under high/severe pressure after bounded
checks. The refreshed graph contradicts a durable one-browser-lane state: the
latest mix rows include `33` graph-counted browser/e2e lanes across `33` groups,
plus protocol-server and coverage-guided-lower-level residency. It also
contradicts the feedback claim that the HTTP polling lower-level handoff should
already be visible in graph counts; the refreshed execution CSV still shows
zero lower-level executions in the `09:00` and `09:15` buckets. Backend-api,
transport-integration, and standalone fuzz-assertion lanes remain graph-inactive.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
but live activity is not only browser/e2e. Browser/e2e executions continue at
low volume in the latest buckets, protocol-server has current HTTP polling REST
residency and execution evidence through the `09:00` bucket, unit-property has
a bounded canary row, and coverage-guided lower-level has fresh plotted
rich-text CRDT residency. The latest native-harness synthesis and action choose
rich-text CRDT as the first ready isolated harness and leave parser/serialization
second because of duplicate `RTC_BLOCK_PARSER_*` churn. The latest
protocol-server synthesis supports the HTTP polling REST harness; the latest
action reports implementation and a bounded `validation-20260524T084923Z` run
with two passing seeds and lane/root `protocol-server` events. The WebSocket
relay remains second-pass.

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
The current critical-path queue shows an active benchmark-canary exact-stack
repair and a gated reload-hydration deferred-family job, so the graph supports
"blocked on exact-stack/deferred gates" more than "ready to publish."
