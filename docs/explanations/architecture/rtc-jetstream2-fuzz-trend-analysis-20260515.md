# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T15:38:02Z`

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

The graph-refresh pipeline is current through `2026-05-24T15:35:48Z` for
completed monitor passes, with current-run accounting sampled at
`2026-05-24T15:37:05Z`. The active accounting row is
`run-20260524T112329Z`; `current_run_metrics_trusted_last` is `TRUE`, so the
active output dir has completed a full pass.

The monitor has `4,559` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `296,154`, and the current-scan coverage-file
count is `2,530`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `9` unmet, and `profile_counts.csv`
has `20` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest current-run row has
`duplicateShareCurrent=0` and summary startup failures `0`, with
`0`/`0`/`0` current signature/actionable-signature/product-evidence
denominators and a `current_run_top_duplicate_share` of `0`. The prior
`2026-05-24T14:59:04Z`, `2026-05-24T14:51:04Z`,
`2026-05-24T14:44:04Z`,
`2026-05-24T14:36:49Z`, `2026-05-24T14:29:04Z`,
`2026-05-24T14:21:35Z`, `2026-05-24T14:12:47Z`,
`2026-05-24T14:06:22Z`, and `2026-05-24T13:56:00Z` rows had the same
`0.5` share over two current actionable product-evidence signatures. The
`2026-05-24T13:48:47Z` and `2026-05-24T13:41:27Z` rows were one-signature
spikes. The
`2026-05-24T13:32:47Z`,
`2026-05-24T13:25:56Z`, `2026-05-24T13:17:56Z`,
`2026-05-24T13:09:56Z`, `2026-05-24T13:00:56Z`, and
`2026-05-24T12:52:55Z` rows were clean over zero signatures. The
`2026-05-24T12:45:55Z` and `2026-05-24T12:37:55Z` rows were high over one
signature each; the `2026-05-24T12:29:01Z`, `12:15:25Z`, and `12:07:51Z` rows
were clean over zero signatures. Earlier noisy completed-pass rows at
`2026-05-24T11:57:42Z` and
`2026-05-24T10:50:40Z` were also one-actionable-signature rows, while the
`2026-05-24T11:01:22Z` row had `duplicateShareCurrent=0.2` over `5` current
actionable signatures.
The pending row at `2026-05-24T10:42:00Z` was incomplete and untrusted;
pending/incomplete rows are a control-plane accounting signal until a full pass
completes.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says the
scheduler fix brought actionable duplicate share to `0.25`; the refreshed
trusted row is now cleaner at `0` over zero current actionable/product-evidence
signatures. The graph supports the persona rejection of a broad product
duplicate storm, while the earlier `0.5` rows keep the producer/control-plane
leakage history relevant.

CPU/load are below the `64`-core line but disk is still the resource constraint.
At `2026-05-24T15:30:13Z`, CPU utilization is `29.77%`, iowait is `0.77%`,
and load averages are `19.74`, `23.38`, and `24.52` on `64` logical CPUs. At
`2026-05-24T15:37:13Z`, root has `87.8GiB` free and the data volume has
`198.4GiB` free while `94.4%` used.

The latest graph-counted fuzzing mix has `16` browser/e2e lanes across `16`
groups, plus one unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. Live graph residency is still concentrated in
browser/e2e lanes. The active coverage-guided output root currently reports
`novelty-ws-real-user-coverage-bridge` and
`novelty-http-list-move-refresh`; the latest graph-counted coverage-guided
supervisor row is `novelty-http-list-move-refresh`.
Lower-level targets are not completely absent from graph-counted latest rows:
the graph also has protocol-server HTTP polling, a unit-property HTTP polling
canary, and rich-text CRDT coverage-guided-lower-level rows.
Transport-integration, backend-api, and standalone fuzz-only assertion work
remain graph-inactive; the latest non-empty level-mix feedback-action
continues to hold broad lower-level/backend expansion. Its requested
provider/title forced-HTTP pair is not the current graph-counted coverage-guided
residency, so the refreshed graph contradicts that part of the feedback.

The execution counter has `17,311,164` estimated individual executions. The
latest plotted bucket, `2026-05-24T15:30:00Z`, has `4` browser/e2e executions
and `3,240` protocol-server executions. The `15:15` bucket had `15` browser/e2e
executions and `6,170` protocol-server executions; the `15:00` bucket had `19`
browser/e2e executions and `6,840` protocol-server executions; the `14:45`
bucket had `20` browser/e2e executions and `6,685` protocol-server executions;
the `14:30` bucket had `19` browser/e2e executions and `6,300`
protocol-server executions; the `14:00` bucket had `16` browser/e2e
executions, `2` coverage-guided-lower-level executions, and `6,660`
protocol-server executions.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T15:36:28Z`. The state-count table has `35` counted items:
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
`2026-05-24T15:37:05Z`. It has `status_available=TRUE`,
`pending_until_first_pass=FALSE`, `current_run_metrics_trusted=TRUE`,
`duplicateShareCurrent=0`, summary startup failures `0`, current
signatures/actionable signatures/product-evidence signatures `0`/`0`/`0`, and
`current_run_top_duplicate_share=0`. The previous completed rows at
`2026-05-24T14:59:04Z`, `2026-05-24T14:51:04Z`, `2026-05-24T14:44:04Z`,
`2026-05-24T14:36:49Z`,
`2026-05-24T14:29:04Z`,
`2026-05-24T14:21:35Z`, `2026-05-24T14:12:47Z`,
`2026-05-24T14:06:22Z`, and `2026-05-24T13:56:00Z` had the same
`0.5` share over two current actionable product-evidence signatures. The rows
at `2026-05-24T13:48:47Z` and `2026-05-24T13:41:27Z` were high over one
current actionable product-evidence signature each. The rows at
`2026-05-24T13:32:47Z`,
`2026-05-24T13:25:56Z`,
`2026-05-24T13:17:56Z`, `2026-05-24T13:09:56Z`,
`2026-05-24T13:00:56Z`, and `2026-05-24T12:52:55Z` were clean over zero
signatures. The
`2026-05-24T12:45:55Z` and `2026-05-24T12:37:55Z` rows were high over one
signature each, while `2026-05-24T12:29:01Z`, `12:15:25Z`, and `12:07:51Z`
were `0` over zero signatures. Earlier noisy rows at
`2026-05-24T11:57:42Z` and `2026-05-24T10:50:40Z` were high over only `1`
current actionable signature each, and the `2026-05-24T11:01:22Z` row was
`0.2` over `5` current actionable signatures. The latest row is live trusted
current-run accounting and is clean over zero current actionable
product-evidence signatures. The earlier high rows remain narrow
producer/control-plane health history, not evidence of a broad product
duplicate storm.
Historical aggregate duplicate/noise is not used as the live health signal.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the benchmark canary path was
patched and restarted, and actionable duplicate share was observed at `0.25`,
below threshold. The refreshed trusted row now reports `0` over zero current
actionable product-evidence signatures, so it agrees with a clean live-status
read while still treating the earlier `0.5` rows as producer/control-plane
narrowness rather than a broad product duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.8GiB` free and `42.9%` used. The data
volume has `198.4GiB` free while still `94.4%` used. Latest CPU iowait is
`0.77%`; output-size and disk headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `2,089`. The active enabled groups
reported in the summary are `novelty-ws-real-user-coverage-bridge` and
`novelty-http-list-move-refresh`. Recent enabled events also include
`novelty-http-title-reload-convergence`,
`novelty-http-large-post-lifecycle`, `novelty-http-large-post-readiness`,
`novelty-ws-media-cross-entity`, and `novelty-ws-thirty-user-lifecycle`.
Historical enable events are useful for context; current lane residency should
be read from the fuzzing-level mix table below and cross-checked against
current-root supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`19` lanes: `16` browser/e2e lanes across `16` groups, `1` unit-property lane,
`1` protocol-server lane, and `1` coverage-guided-lower-level lane.

The latest coverage-guided browser row is at `2026-05-24T15:35:45Z`:
`novelty-http-list-move-refresh`. The enabled-group summary also reports
`novelty-ws-real-user-coverage-bridge`, but that group is not the latest
graph-counted coverage-guided supervisor row. The other graph-counted browser/e2e
`is_latest` rows are focused-shard rows from
`2026-05-24T08:42:57Z`, a strict HTTP large-lifecycle row from
`2026-05-23T15:52:21Z`, and six gap-booster WebSocket rows from
`2026-05-23T12:47:07Z`. The mix remains browser/e2e-heavy by lane count, with
the active coverage-guided root now focused on a list-move refresh HTTP row.
The level-mix synthesis asked to classify and rotate the stuck
`...-completion` forced canary toward the provider/title forced-HTTP pair; the
refreshed graph no longer shows that pair as current coverage-guided
residency, so do not treat the feedback's intended schedule as proof of useful
capacity.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, `protocol-server` has an HTTP polling REST validation
row from `2026-05-24T14:51:19Z`, and `coverage-guided-lower-level` has
rich-text CRDT from `2026-05-24T14:10:08Z`. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis says
deadline mode should keep the two forced HTTP PR canary lanes, keep broad
lower-level/parser/table/rich-text expansion held, and classify the stuck
browser canary blockage before adding more lower-level work. It reports the
two active HTTP canaries at `57` and `15` current-run records with `0`
successful records and calls for classifying/rotating stuck zero-success
canaries. The newest level-mix feedback-action applies that decision:
`novelty-http-large-post-lifecycle-completion` is explicitly deadline-downscoped
after `67` records and `0` successes, the slot is rotated to
`novelty-http-title-reload-convergence`, provider-persisted remains live, broad
lower-level expansion remains held, and no new lower-level executions are
expected from this control action. The refreshed graph shows the
protocol-server validation row, but the current coverage-guided browser row is
`novelty-http-list-move-refresh` rather than provider-persisted or
title/reload. It no longer shows the exact `...-completion` lane as current,
and it still does not show a backend-api lane. That rejects the narrow
interpretation that the provider/title pair is currently consuming the active
coverage-guided browser slot.
Treat the scheduled browser rows as residency, not proven useful capacity,
until successful records, triage-ready failures, or explicit blockers appear.

The latest fuzz-assertion apply note added two gated fuzz-only assertions
and restarted affected focused, strict, gap, and coverage-guided loops, but the
refreshed graph still has no standalone fuzz-only assertion lane.

The latest non-empty native-harness synthesis still prefers
`coverage-guided-lower-level-rich-text-crdt` as the first ready isolated
lower-level harness, while an earlier synthesis preferred
`coverage-guided-lower-level-block-parser-serialization`. The latest non-empty
action implemented and validated the rich-text CRDT coverage-guided lower-level
harness with root/lane events and
`fuzzLevel: "coverage-guided-lower-level"`, passed bounded validation, and did
not start an unbounded continuous loop. The newest native-harness synthesis
again selects rich-text CRDT, but its matching action file is empty; use the
`2026-05-24T14:03:00Z` action as the latest non-empty implementation evidence.
The graph currently shows the rich-text CRDT lower-level lane with a `14:10`
smoke row and `2` executions in both the `13:45` and `14:00` buckets, with no
lower-level executions in the latest `15:30` bucket. It aligns with the
rich-text recommendation but does not yet show sustained lower-level throughput
or a current block-parser lower-level lane.

The latest protocol-server synthesis selects the HTTP polling REST sync server
state-machine fuzzer, with event accounting for root and lane `events.ndjson`.
The latest protocol-server action implemented/promoted that direct REST
harness and passed a bounded two-seed, 25-case smoke. The graph has a current
`protocol-server-http-polling` row and protocol-server execution evidence
through the latest `15:30` bucket, with `6,660` in the `14:00` bucket, `6,480`
in the `14:15` bucket, `6,300` in the `14:30` bucket, `6,685` in the `14:45`
bucket, `6,840` in the `15:00` bucket, `6,170` in the `15:15` bucket, and
`3,240` in the partial `15:30` bucket.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,727,367` browser/e2e,
`1,132,740` unit-property, `458,615` coverage-guided lower-level, and
`10,992,442` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T15:30:00Z` bucket has `4` browser/e2e executions
(`16`/hour) and `3,240` protocol-server executions (`12,960`/hour), with zero
unit-property, coverage-guided-lower-level, backend-api, transport-integration,
and fuzz-assertion executions. The `15:15` bucket has `15` browser/e2e
executions and `6,170` protocol-server executions; the `15:00` bucket has `19`
browser/e2e executions and `6,840` protocol-server executions; the `14:45`
bucket has `20` browser/e2e executions and `6,685` protocol-server executions;
the `14:30` bucket has `19` browser/e2e executions and `6,300`
protocol-server executions; the `14:00` bucket has `16` browser/e2e
executions, `2` coverage-guided-lower-level executions, and `6,660`
protocol-server executions. Coverage-guided lower-level throughput
is present in recent buckets but still negligible despite the rich-text CRDT
lane being current in the mix table, and it is zero in the latest `15:30`
bucket.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output has `17` unique likely-real findings: `16`
browser/e2e findings over about `125.7` runner-hours and `1`
transport-integration finding in the reconstructed table. Protocol-server,
unit-property, coverage-guided lower-level, backend-api, standalone
fuzz-assertion, and other buckets remain `0` likely-real findings.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `275` raw
candidates: `224` browser/e2e candidates, `44` transport-integration
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
profiles are still visible: collaboration UI signals have `1,231` records and
`0` successes, async/server blocks have `432` and `0`, long-session large-doc
has `40` and `0`, list-move refresh HTTP has `78` and `0`,
permissions/auth-locks has `49` and `7`, many-user lifecycle has `90` and
`24`, persistence-no-title has `149` and `44`, revision persistence has `173`
and `66`, parser transform has `90` and `37`, parser serialization has `87`
and `21`, and multi-reload lifecycle has `85` and `39`. The large-post
three-user HTTP lifecycle profile has `644` records, `55` successes, and `0`
profile-row startup failures. The many-user
lifecycle profile still has `0` active-editing strict cross-products below.
Live startup health should continue to use current-run summary startup failures
from the health section; the latest trusted current-run row reports `0`
startup failures.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `128` met and `9`
unmet. Zero-progress misses include template parts, remote-selection cursor
history, and collaboration UI signals. Low-progress misses include parser
serialization at `21`/`50`, three-user late join at `17`/`25`,
media cross-entity at `19`/`25`, multi-reload lifecycle at `39`/`50`, calendar
at `17`/`20`, and weak HTML at `19`/`20`.
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
successful records, and a `0.087` success rate. The generated goal table
also shows HTTP lifecycle scale at `644`/`10`, successful profile records at
`55`/`10`, and successful three-user HTTP records at
`27`/`10`, but the strict
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
largest feature categories by total count are history (`83,277`), invariant
(`50,340`), operation-ledger (`49,450`), block-depth (`19,867`), block
(`18,319`), action-pair (`18,084`), action (`15,965`), other (`14,742`),
transport (`9,118`), and collaborator (`8,980`). Successful actions remain
concentrated in a few paths: `edit-title` (`922`), `append-paragraph`
(`666`), `concurrent-paragraphs` (`458`), `insert-block-gauntlet-block`
(`270`), `edit-block-gauntlet-attributes` (`254`), `insert-nested-group`
(`247`), `edit-table-array-attributes` (`239`), `delete-block` (`215`),
`move-block` (`214`), and `insert-paragraph` (`207`).

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
`2026-05-24T15:36:28Z`. The state-count table has `35` counted items:
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
accounting: the latest trusted row is clean over zero actionable
product-evidence signatures. The latest accounting sample is
`2026-05-24T15:37:05Z`; the prior `14:59`, `14:51`, `14:44`, `14:36`, `14:29`,
`14:21`, `14:12`, `14:06`, and `13:56` rows had `0.5` share over two
signatures, while the `13:48` and `13:41` rows were one-signature spikes. The
`13:32`, `13:25`, `13:17`, `13:09`, `13:00`, and `12:52` rows were clean over
zero signatures. The `12:45` and `12:37` rows were high over one actionable
product-evidence signature each, `12:29`, `12:15`, and `12:07` were clean over
zero signatures, the `11:57` and `10:50` rows were one-signature spikes, and
the `11:01` row was `0.2` over `5` signatures. The earlier spikes are
control-plane health signals, not evidence of a broad product duplicate storm.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and keep
startup-ish duplicate producers held unless there is strong product evidence.
The refreshed graph now supports a clean live-status interpretation for the
active output dir. It still agrees with the persona rejection of a product-bug
or broad duplicate-storm interpretation because the high rows had only one or
two actionable signatures.

The resource picture is still disk-constrained. CPU utilization is `29.77%`,
iowait is `0.77%`, five-minute load is below the `64`-core line at `23.38`, and
the data volume is `94.4%` used with `198.4GiB` free. Level-mix persona output
rejects broad expansion under deadline and disk pressure, and it rejects
treating a scheduled forced-HTTP row as successful useful capacity without
current-run successful records. The latest synthesis also rejects leaving a WS
reserve lane while forced HTTP canaries lack successful current-run records and
reports the active HTTP canaries at `57` and `15` records with `0` successes.
The newest level-mix feedback-action downscopes
`novelty-http-large-post-lifecycle-completion` after `67` records and `0`
successes, rotates that spend to `novelty-http-title-reload-convergence`, and
keeps broad lower-level expansion held until disk pressure and PR-evidence
needs clear.
The refreshed graph shows browser/e2e still dominates lane count, but the
active enabled groups are `novelty-ws-real-user-coverage-bridge` and
`novelty-http-list-move-refresh`, with the latest graph-counted
coverage-guided browser row on `novelty-http-list-move-refresh`. That
contradicts the feedback's intended provider/title forced-HTTP residency while
still supporting its warning that scheduled browser rows alone do not prove
useful capacity.
Protocol-server HTTP polling has a current row, a validated direct REST harness
action, and recent execution evidence through the `15:30` bucket.
Lower-level rich-text CRDT is present with a fresh `14:10` smoke row and small
`13:45` and `14:00` execution counts after a validated bounded harness action,
but the latest `15:30` bucket is back to zero lower-level executions.
Backend-api, transport-integration, and standalone fuzz-assertion lanes remain
graph-inactive.

Coverage-goal pressure remains at the strict cross-product edges. The generic
coverage-goal table is populated with `9` unmet goals, but
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
