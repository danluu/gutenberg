# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T08:13:23Z`

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

The graph-refresh pipeline is current through `2026-05-24T08:10:17Z` for
monitor passes and `2026-05-24T08:11:41Z` for current-run accounting.
The active accounting row is `run-20260524T073729Z`;
`current_run_metrics_trusted_last` is `TRUE`, the first full pass is complete,
and the latest completed full-pass timestamp carried into accounting is
`2026-05-24T08:10:17Z`.

The monitor has `4,393` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `293,714`, and the current-scan coverage-file
count is `928`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `39` unmet, and `profile_counts.csv`
has `18` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest trusted current-run row reports
`duplicateShareCurrent` `0.1111`, summary startup failures `0`, and current
signature/actionable-signature/product-evidence denominators of `9`/`9`/`9`.
The top current duplicate share is therefore a one-of-nine family, not broad
duplicate pressure.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says a
scheduler fix previously brought actionable duplicate share to `0.25`; the
refreshed current-run graph row is lower at `0.1111` on nine actionable
signatures. That supports the feedback's rejection of a broad product
duplicate-storm interpretation, while still leaving producer/control-plane
hardening as the relevant follow-up if noise rises again.

CPU and load are below the `64`-core line in the newest samples. At
`2026-05-24T08:10:00Z`, CPU utilization is `57.89%`, iowait is `1.84%`, and
load averages are `38.70`, `44.03`, and `41.09` on `64` logical CPUs. Disk is
still the main resource constraint: at `2026-05-24T08:12:15Z`, root has
`88.0GiB` free and the data volume has `142.6GiB` free while `96.0%` used.

The latest graph-counted fuzzing mix has `19` browser/e2e lanes, one
unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. Eleven fresh coverage-guided browser/e2e
rows are present in `run-20260524T073729Z` at `2026-05-24T08:10:13Z`,
including large-post lifecycle/readiness/completion, provider persisted CRDT,
list move, persistence probe, existing-post metadata, same-user stale draft,
table stale snapshot, title reload convergence, and a WebSocket block gauntlet.
The graph also shows a fresh `coverage-guided-lower-level` rich-text CRDT row
at `2026-05-24T06:34:42Z` and a fresh protocol-server HTTP polling row at
`2026-05-24T07:42:14Z`. The latest level-mix synthesis rejects broad
expansion, but also rejects treating all graph-counted rows as trusted useful
capacity: it says live browser materialization is over budget and canary
publication should be capped before any lower-level handoff. The graph agrees
that the latest mix is browser/e2e-heavy and over a strict one-canary
residency view, while transport-integration, backend-api, and standalone
fuzz-only assertion work remain graph-inactive.

The execution counter has `17,231,839` estimated individual executions. The
latest plotted bucket, `2026-05-24T08:00:00Z`, is a partial bucket with `111`
browser/e2e executions, `0` coverage-guided lower-level executions, and
`1,200` protocol-server executions. The preceding `07:45` bucket has `65`
browser/e2e, `0` coverage-guided-lower-level, and `1,375` protocol-server
executions; the `07:30` bucket has `4`, `0`, and `1,450` respectively.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T08:11:53Z`. The state-count table has `35`
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

The latest accounting sample is `run-20260524T073729Z` at
`2026-05-24T08:11:41Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`, and a
completed full-pass timestamp of `2026-05-24T08:10:17Z`.
`duplicateShareCurrent` is `0.1111` and summary startup failures are `0`.
Current signatures, actionable signatures, and product-evidence signatures are
all `9`, so the top duplicate share is one current family out of nine rather
than a broad duplicate/noise storm. Historical aggregate duplicate/noise is
not used as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the scheduler patch was
syntax-checked, restarted, and observed actionable duplicate share `0.25`,
below threshold. The refreshed graph is now a trusted current-run pass and is
lower at `0.1111` on nine actionable signatures. The feedback still rejects
interpreting the graph as a product bug or broad product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `88.0GiB` free and `42.8%` used. The data
volume recovered from hard-zero free-space samples and the newest graph sample
has `142.6GiB` free while still `96.0%` used. Latest CPU iowait is
`1.84%`, after a `17.12%` spike at `2026-05-24T07:00:04Z`; output-size and
disk headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,993`. The latest enabled rows are
`novelty-ws-many-user-lifecycle`,
`novelty-ws-many-user-lifecycle-completion`, and
`novelty-ws-permissions-auth-locks` at `2026-05-24T07:35:51Z`. Historical
enable events are useful for context; current lane residency should be read
from the fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`22` lanes: `19` browser/e2e lanes, `1` unit-property lane, `1`
protocol-server lane, and `1` coverage-guided-lower-level lane.

The graph-counted browser/e2e `is_latest` rows now include eleven fresh
coverage-guided rows from `run-20260524T073729Z` at
`2026-05-24T08:10:13Z`: `novelty-http-existing-post-crdt-metadata`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
`novelty-http-large-post-readiness`,
`novelty-http-list-move-refresh`, `novelty-http-persistence-probe`,
`novelty-http-provider-persisted-crdt-large-post`,
`novelty-http-same-user-stale-draft`,
`novelty-http-table-stale-snapshot`,
`novelty-http-title-reload-convergence`, and
`novelty-ws-block-gauntlet`. The remaining browser/e2e rows are one
strict-expansion HTTP large-lifecycle lane from `2026-05-23T15:52:21Z`, one
focused-shard HTTP same-user stale-tabs lane from `2026-05-23T15:40:43Z`, and
six gap-booster WebSocket lanes from `2026-05-23T12:47:07Z` for real-user
title/rich-text, three-user late-join, revision autosave recovery,
async/server blocks, permissions/auth-locks, and long-session large-doc. The
current graph-counted mix is browser/e2e-heavy, though the latest execution
bucket is dominated by protocol-server cases.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an `is_latest` in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, and `protocol-server` has a current HTTP polling REST
row from `2026-05-24T07:42:14Z`. The plotted
`coverage-guided-lower-level` row is now fresh rich-text CRDT from
`2026-05-24T06:34:42Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane. Native
parser/serialization work has a fresh bounded smoke/action record, but the
plotted lower-level lane is rich-text CRDT, not that parser smoke.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest level-mix feedback-action says
the monitor policy was changed toward one browser canary under severe disk
pressure, but the latest synthesis says the live state is still over budget:
`run-monitor.sh` targets/maxes `2`/`3` while the supervisor has `11` running
groups. It recommends fixing browser canary materialization first, keeping
HTTP polling/protocol work cheap and bounded, and avoiding broad
parser/table/rich-text/unit expansion. The refreshed graph accepts the
no-expansion part of that feedback, and it also supports the synthesis's
rejection of a strict one-browser-slot residency view: it shows eleven fresh
coverage-guided browser/e2e rows plus older browser/e2e rows, fresh
protocol-server residency, and fresh coverage-guided-lower-level residency,
with no graph-counted backend-api, transport-integration, or standalone
fuzz-assertion lane.

The latest fuzz-assertion feedback-action added two gated fuzz-only assertions
and restarted affected focused, strict, gap, and coverage-guided loops, but the
refreshed graph still has no standalone fuzz-only assertion lane.

The latest native-harness synthesis still selected
`coverage-guided-lower-level-block-parser-serialization` as the first bounded
Node/V8 parser/serialization harness. The latest action reports that the
parser harness was implemented and validated with honest V8/Node coverage
accounting, required root and lane event files, and a passing bounded smoke.
This remains separate from the plotted lower-level residency: the graph now
shows fresh
`coverage-guided-lower-level` rich-text CRDT activity from
`2026-05-24T06:34:42Z`, not the parser/serialization harness.

The latest protocol-server synthesis selects the HTTP polling REST endpoint,
`POST /wp-sync/v1/updates`, rather than the WebSocket relay. The latest action
file is empty, but the prior action reports that the HTTP polling REST fuzz
harness was implemented and smoke-validated with required root and lane
`events.ndjson`. The graph has a current `protocol-server-http-polling` row
from `2026-05-24T07:42:14Z` and protocol-server execution evidence into the
partial `08:00` bucket. The persona evidence still leaves the WebSocket relay
as a second pass.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,730,311` browser/e2e,
`1,132,740` unit-property, `458,609` coverage-guided lower-level, and
`10,910,179` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T08:00:00Z` bucket is partial: it has `111` browser/e2e
executions (`444`/hour), `0` coverage-guided-lower-level executions (`0`/hour),
and `1,200` protocol-server executions (`4,800`/hour), with zero unit-property,
backend-api, transport-integration, and fuzz-assertion executions in that
bucket. The preceding `07:45` bucket had `65` browser/e2e, `0`
coverage-guided-lower-level, and `1,375` protocol-server executions; the
`07:30` bucket had `4`, `0`, and `1,450` respectively.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `33` likely-real
findings over about `208.9` runner-hours, or `15.80` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `664`
raw candidates: `657` browser/e2e candidates, `5` unit-property candidates,
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

The refreshed active novelty state has `18` profile rows. Weak-completion
profiles are still visible: collaboration UI signals have `605` records and
`0` successes, async/server blocks have `426` and `0`, long-session large-doc
has `40` and `0`, permissions/auth-locks has `37` and `1`,
persistence-no-title has `23` and `8`, list-move-refresh HTTP has `11` and
`0`, and parser serialization and revision persistence have `3` and `0` each.
The large-post three-user HTTP
lifecycle profile has `349` records, `23` successes, and `0` profile-row
startup failures. The many-user lifecycle profile has `40` records and `10`
successes, but the active-editing strict cross-products below are still zero.
Live startup health should
continue to use current-run summary startup failures from the health section,
which are currently `0`.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `98` met and `39`
unmet. Low/zero-progress misses still include reload-post and rich-text UI
format/heading/cut-copy actions, autosave/local-autosave, template parts,
HTTP 401/403 fault paths, remote-selection cursor history, same-user
collaborator mode, three-user late-join, collaboration UI signals,
multi-reload lifecycle, parser serialization, and weak block/details edges. The
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
marked disabled, and the adjacent large-post three-user HTTP profile has `349`
records seen, `23` successful records, and a `0.0659` success rate. The
generated goal table also shows the related successful-profile goal at
`23`/`10`, HTTP lifecycle scale at `349`/`10`, and successful three-user HTTP
records at `19`/`10`, but the strict
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
largest feature categories by total count are history (`30,995`), invariant
(`19,165`), operation-ledger (`17,078`), block-depth (`6,885`), block
(`6,384`), other (`6,312`), action (`5,685`), action-pair (`5,665`), and
transport (`4,362`). Successful actions remain concentrated in a few paths:
`edit-title` (`704`), `append-paragraph` (`431`), `concurrent-paragraphs`
(`284`), `ui-toolbar-format-paragraph` (`55`), and the large-post HTTP actions
`append-paragraph`, `insert-heading`, `concurrent-paragraphs`, and `move-block`
at `46` each.

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
`2026-05-24T08:11:53Z`. The state-count table has `35` counted items:
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
active session is
`rtc-critical-continuation-benchmark-canary-fuzzer-gap-20260524T080452Z`; the
queue updated at `2026-05-24T08:10:39Z` and reports that exact-stack repair as
active plus a gated reload-hydration deferred-family job.
The repeated no-progress summary has one row: benchmark-canary zero executor
artifact.

## Interpretation

The active run has completed a trusted current-run accounting pass.
`run-20260524T073729Z` reports `current_run_metrics_trusted=TRUE` and
`pending_until_first_pass=FALSE`; current signatures, actionable signatures,
and product-evidence signatures are all `9`, with current top duplicate share
`0.1111` and summary startup failures `0`. Treat the health graph as
current-output-dir accounting. Pending/incomplete accounting remains its own
control-plane health signal, but the latest row is trusted.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and
keep startup-ish duplicate producers held unless there is strong product
evidence. Its below-threshold feedback sample was `0.25`; the refreshed
trusted graph row is lower at `0.1111` on nine actionable signatures. The graph
therefore still rejects a broad product duplicate-storm interpretation while
preserving producer/control-plane follow-up if noise rises.

The resource picture is disk-constrained but not CPU-saturated in the latest
sample. CPU utilization is `57.89%`, iowait is `1.84%`, load remains below
the `64`-core line, and the data volume is `96.0%` used with `142.6GiB` free.
Level-mix persona output rejects broad expansion under deadline and disk
pressure. The latest feedback-action says the browser budget should remain one
canary, but the later synthesis says live browser materialization is still
over budget and mix accounting should fail closed before any handoff. The
refreshed graph agrees with the no-expansion read and rejects a strict
one-browser-slot residency read: the latest mix rows include eleven fresh
coverage-guided browser/e2e rows, eight older browser/e2e rows, fresh
protocol-server residency, and fresh coverage-guided-lower-level residency.
Backend-api, transport-integration, and standalone fuzz-assertion lanes remain
graph-inactive.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
but live activity is not only browser/e2e. Browser/e2e executions continue at
low volume in the latest buckets, protocol-server has current HTTP polling REST
residency and execution evidence, unit-property has a bounded canary row, and
coverage-guided lower-level has fresh plotted rich-text CRDT residency. The
native-harness persona synthesis still selects parser/serialization; the latest
action says that lower-level harness was implemented and smoke-validated. The
plotted lower-level lane remains rich-text CRDT. The latest protocol-server
synthesis supports the HTTP polling REST harness; the latest action file is
empty, but the prior action reports implementation and smoke validation. The
WebSocket relay remains second-pass.

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
repair, so the graph no longer supports a simple "runnable but idle" blocker
read.
