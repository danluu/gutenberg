# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T11:44:10Z`

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

The graph-refresh pipeline is current through `2026-05-24T11:42:36Z` for
completed monitor passes, with current-run accounting sampled at
`2026-05-24T11:43:13Z`. The active accounting row is
`run-20260524T112329Z`; `current_run_metrics_trusted_last` is `TRUE`, so the
active output dir has completed a full pass.

The monitor has `4,455` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `295,710`, and the current-scan coverage-file
count is `2,545`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `17` unmet, and `profile_counts.csv`
has `20` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest current-run row has
`duplicateShareCurrent=0` and summary startup failures `0`, with
`0`/`0`/`0` current signature/actionable-signature/product-evidence
denominators and a `current_run_top_duplicate_share` of `0`. The prior noisy
completed-pass row at `2026-05-24T11:01:22Z` had
`duplicateShareCurrent=0.2` over `5` current actionable signatures, and the
earlier `2026-05-24T10:50:40Z` spike was a one-signature row. Those rows should
be read as narrow current-run accounting, not broad product duplicate storms.
The pending row at `2026-05-24T10:42:00Z` was incomplete and untrusted;
pending/incomplete rows are a control-plane accounting signal until a full pass
completes.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says the
scheduler fix brought actionable duplicate share to `0.25`; the refreshed
trusted row is `0`, which supports the persona rejection while leaving
producer/control-plane hardening as follow-up.

CPU/load are below the `64`-core line but disk is still the resource constraint.
At `2026-05-24T11:40:11Z`, CPU utilization is `20.29%`, iowait is `0.19%`, and
load averages are `13.83`, `17.69`, and `19.26` on `64` logical CPUs. At
`2026-05-24T11:43:20Z`, root has `87.9GiB` free and the data volume has
`204.5GiB` free while `94.2%` used.

The latest graph-counted fuzzing mix has `16` browser/e2e lanes across `16`
groups, plus one unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. Live graph residency is still concentrated in
browser/e2e lanes. The active coverage-guided output root currently has
`novelty-http-provider-persisted-crdt-large-post`; lower-level targets are not
completely absent from graph-counted latest rows because the graph also has
protocol-server HTTP polling, a unit-property HTTP polling canary, and
rich-text CRDT coverage-guided-lower-level rows. Transport-integration,
backend-api, and standalone fuzz-only assertion work remain graph-inactive.

The execution counter has `17,234,297` estimated individual executions. The
latest plotted bucket, `2026-05-24T11:30:00Z`, has `2` browser/e2e executions
and no lower-level executions. The preceding `11:15` bucket had `4` browser/e2e
executions, `2` coverage-guided-lower-level executions, and `25`
protocol-server executions.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T11:42:14Z`. The state-count table has `35` counted items:
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

The latest accounting sample is `run-20260524T112329Z` at
`2026-05-24T11:43:13Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`,
`duplicateShareCurrent=0`, summary startup failures `0`, current
signatures/actionable signatures/product-evidence signatures `0`/`0`/`0`, and
`current_run_top_duplicate_share=0`. The previous completed row was
`duplicateShareCurrent=0.2` over `5` current actionable signatures, and the
earlier `1.0` row had only `1` current actionable signature; those denominators
prevent reading either point as a broad duplicate storm. Historical aggregate
duplicate/noise is not used as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the benchmark canary path was
patched and restarted, and actionable duplicate share was observed at `0.25`,
below threshold. The refreshed trusted row is `0`, so the graph now agrees
with that persona read.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.9GiB` free and `42.9%` used. The data
volume has `204.5GiB` free while still `94.2%` used. Latest CPU iowait is
`0.19%`; output-size and disk headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `2,032`. The active enabled group
reported in the summary is `novelty-http-provider-persisted-crdt-large-post`.
Historical enable events are useful for context; current lane residency should
be read from the fuzzing-level mix table below and cross-checked against
current-root supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`19` lanes: `16` browser/e2e lanes across `16` groups, `1` unit-property lane,
`1` protocol-server lane, and `1` coverage-guided-lower-level lane.

The latest coverage-guided browser row is at `2026-05-24T11:41:38Z`:
`novelty-http-provider-persisted-crdt-large-post`. The other graph-counted
browser/e2e `is_latest` rows are focused-shard rows from
`2026-05-24T08:42:57Z`, a strict HTTP large-lifecycle row from
`2026-05-23T15:52:21Z`, and six gap-booster WebSocket rows from
`2026-05-23T12:47:07Z`. The mix remains browser/e2e-heavy by lane count, but
the active coverage-guided root has narrowed to one HTTP group rather than
broad browser residency.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, `protocol-server` has an HTTP polling REST validation
row from `2026-05-24T11:28:16Z`, and `coverage-guided-lower-level` has
rich-text CRDT from `2026-05-24T11:19:30Z`. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis says the
deadline-mode mix should tighten toward PR-finalization evidence, keep
browser/e2e primary, and hold broad lower-level/parser/table/rich-text/
fuzz-assertion/backend/protocol expansion. It also says forced HTTP pins should
be sticky until the current root records a successful group record or an
explicit blocker/downscope. Its live sanity check saw
`novelty-http-large-post-readiness` with `0` current-run records and successes.
The refreshed graph has since rotated to
`novelty-http-provider-persisted-crdt-large-post`; that supports the feedback's
warning that scheduled/running rows should not be read as proven useful capacity
until current-run successful group records appear. The latest level-mix
feedback-action file is empty, so the read-only synthesis is the current
standard persona evidence for this point.

The latest fuzz-assertion apply note added two gated fuzz-only assertions
and restarted affected focused, strict, gap, and coverage-guided loops, but the
refreshed graph still has no standalone fuzz-only assertion lane.

The latest nonempty native-harness synthesis chooses
`coverage-guided-lower-level-rich-text-crdt` as the first ready isolated
harness, using V8 coverage guidance rather than AFL/libFuzzer. The smoke
artifact had `coverageKeys=342`, `featureKeys=107`, `productYield=true`, and
no oracle failure keys. The latest native action file is empty. The graph agrees
on the selected target by showing the rich-text CRDT lower-level lane and a
small `11:15` bucket execution count, but it does not yet show sustained
lower-level throughput.

The latest protocol-server synthesis file is empty, but the latest action
reports implementation plus passing validation for the HTTP polling REST
endpoint: syntax checks, `npm run wp-env status`, one seed, `25` cases,
`OK (1 test, 1589 assertions)`, and root/lane `protocol-server` events. The
graph has a current `protocol-server-http-polling` row and protocol-server
execution evidence through the `11:15` bucket, with `25` executions in that
bucket. The latest `11:30` bucket has no protocol-server executions.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,727,389` browser/e2e,
`1,132,740` unit-property, `458,611` coverage-guided lower-level, and
`10,915,557` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T11:30:00Z` bucket has `2` browser/e2e executions
(`8`/hour) and zero unit-property, coverage-guided-lower-level, protocol-server,
backend-api, transport-integration, and fuzz-assertion executions. The `11:15`
bucket has `4` browser/e2e executions, `2` coverage-guided-lower-level
executions, and `25` protocol-server executions. The `10:45` bucket has `47`
browser/e2e executions and `25` protocol-server executions. Coverage-guided
lower-level throughput is present but still negligible despite the rich-text
CRDT lane being current in the mix table.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output has `26` unique likely-real findings: `21`
browser/e2e findings over about `125.6` runner-hours and `5`
transport-integration findings from historical or reconstructed rows with no
current graph-counted lane. Protocol-server, unit-property, coverage-guided
lower-level, backend-api, standalone fuzz-assertion, and other buckets remain
`0` likely-real findings.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `281` raw
candidates: `227` browser/e2e candidates, `47` transport-integration
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
profiles are still visible: collaboration UI signals have `1,061` records and
`0` successes, async/server blocks have `429` and `0`, long-session large-doc
has `40` and `0`, list-move refresh HTTP has `71` and `0`,
permissions/auth-locks has `39` and `2`, many-user lifecycle has `69` and
`17`, persistence-no-title has `149` and `44`, revision persistence has `173`
and `66`, parser transform has `90` and `37`, parser serialization has `86`
and `21`, and multi-reload lifecycle has `85` and `39`. The large-post
three-user HTTP lifecycle profile has `526` records, `55` successes, and `0`
profile-row startup failures. The many-user
lifecycle profile still has `0` active-editing strict cross-products below.
Live startup health should continue to use current-run summary startup failures
from the health section; the latest trusted current-run row reports `0`
startup failures.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `120` met and `17`
unmet. Zero-progress misses include template parts, remote-selection cursor
history, 30-user success and late-join goals, 30-user many-user lifecycle, and
collaboration UI signals. Low-progress misses include HTTP 401/403 fault paths
at `1`/`10`, three-user late join at `8`/`25`, parser serialization at
`21`/`50`, media cross-entity at `16`/`25`, 12-user and 12-user late-join goals
at `7`/`10`, many-user 12-user lifecycle at `7`/`10`, multi-reload lifecycle at
`39`/`50`, calendar at `17`/`20`, and weak HTML at `19`/`20`.
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
marked enabled, and the adjacent large-post three-user HTTP profile has `526`
records seen, `55` successful records, and a `0.1046` success rate. The
generated goal table also shows HTTP lifecycle scale at `526`/`10`, successful
profile records at `55`/`10`, and successful three-user HTTP records at
`33`/`10`, but the strict
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
largest feature categories by total count are history (`74,061`), invariant
(`44,827`), operation-ledger (`43,916`), block-depth (`17,975`), block
(`16,469`), action-pair (`16,343`), action (`14,294`), other (`13,237`),
transport (`8,234`), and collaborator (`8,096`). Successful actions remain
concentrated in a few paths: `append-paragraph` (`1,143`), `edit-title`
(`1,017`), `concurrent-paragraphs` (`759`), `move-block` (`737`),
`insert-heading` (`548`), `delete-block` (`489`), `insert-paragraph` (`464`),
`edit-paragraph` (`426`), and `edit-table-array-attributes` (`423`).

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
`2026-05-24T11:42:14Z`. The state-count table has `35` counted items:
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

The active run has completed first-pass accounting. `run-20260524T112329Z`
reports `current_run_metrics_trusted=TRUE`,
`pending_until_first_pass=FALSE`, `duplicateShareCurrent=0`, summary startup
failures `0`, and current signature/actionable-signature/product-evidence
denominators `0`/`0`/`0`. Treat the health graph as current-output-dir
accounting: the live duplicate/noise signal is below threshold, and the prior
`0.2` over `5` signatures plus one-signature `1.0` rows should not be read as
broad duplicate storms.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and keep
startup-ish duplicate producers held unless there is strong product evidence.
The refreshed graph now agrees with that feedback more than the previous
single-signature row did.

The resource picture is still disk-constrained. CPU utilization is `20.29%`,
iowait is `0.19%`, five-minute load is below the `64`-core line at `17.69`, and
the data volume is `94.2%` used with `204.5GiB` free. Level-mix persona output
rejects broad expansion under deadline and disk pressure, and it rejects
treating a scheduled forced-HTTP row as successful useful capacity without
current-run successful records. The refreshed graph supports a deadline-mode
shape: browser/e2e dominates lane count, forced HTTP browser work is active as
`novelty-http-provider-persisted-crdt-large-post`, protocol-server HTTP polling
has a current row and recent execution evidence, and lower-level rich-text CRDT
is present with only a small recent-bucket count. Backend-api,
transport-integration, and standalone fuzz-assertion lanes remain
graph-inactive.

Coverage-goal pressure remains at the strict cross-product edges. The generic
coverage-goal table is populated, but
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`.
Many-user active editing is still `0` at the 6/10/12/30 active-editor
thresholds, and those counts require distinct users who actually edited,
excluding final UI witness-sweep-only edits, not merely users present.

PR progress has current graph-counted controller state but no current
graph-counted filing surface: the controller has populated state counts, while
the push manifest has `0` publishable branches and `0` publishable net LOC.
PR-split persona feedback still rejects `PR16-RLH` as fileable until strict
seed `6000007` reaches the final persistence oracle and owner rows prove it.
The graph supports "blocked on exact-stack/deferred gates" more than "ready to
publish."
