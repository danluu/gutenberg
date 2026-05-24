# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T10:12:03Z`

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

The graph-refresh pipeline is current through `2026-05-24T10:07:08Z` for
completed monitor passes and through `2026-05-24T10:10:51Z` for current-run
accounting. The active accounting row is `run-20260524T100709Z`;
`current_run_metrics_trusted_last` is `FALSE`, because the monitor has started
but the new output dir is still pending its first full coverage pass.

The monitor has `4,424` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `294,977`, and the current-scan coverage-file
count is `1,814`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `12` unmet, and `profile_counts.csv`
has `19` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest current-run row has `duplicateShareCurrent=0`
and summary startup failures `0`, but `current_run_metrics_trusted_last=FALSE`
and the current signature/actionable-signature/product-evidence denominators
are not yet available. Treat that duplicate/noise share as incomplete
current-run accounting and as a control-plane health issue until the active run
completes a full pass. The previous trusted row, from
`2026-05-24T09:59:33Z`, had `duplicateShareCurrent=0.5` over `2`/`2`/`2`
current signature/actionable-signature/product-evidence denominators, so its
one-signature top duplicate was narrow rather than a broad duplicate storm.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says a
scheduler fix previously brought actionable duplicate share to `0.25`; the
refreshed active run is now pending and cannot confirm that below-threshold
status yet. The feedback's producer/control-plane interpretation still fits
better than a product-bug or broad product duplicate-storm interpretation.

CPU and load eased in the newest samples. At `2026-05-24T10:10:01Z`, CPU
utilization is `25.86%`, iowait is `0.26%`, and load averages are `22.81`,
`22.88`, and `37.72` on `64` logical CPUs. Disk is still the main resource
constraint: at `2026-05-24T10:11:20Z`, root has `87.9GiB` free and the data
volume has `200.7GiB` free while `94.3%` used.

The latest graph-counted fuzzing mix has `15` browser/e2e lanes across `15`
groups, plus one unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. The newest active-run coverage-guided rows at
`2026-05-24T10:06:16Z` are not trusted `is_latest` rows yet because current-run
accounting is pending. The latest graph-counted browser/e2e rows are the
focused-shard rows from `2026-05-24T08:42:57Z`, a strict HTTP large-lifecycle
row from `2026-05-23T15:52:21Z`, and six gap-booster WS rows from
`2026-05-23T12:47:07Z`. The graph remains browser/e2e-heavy by lane count, but
bounded lower-level coverage is present: rich-text CRDT lower-level,
protocol-server HTTP polling, and a unit-property HTTP polling canary.
Transport-integration, backend-api, and standalone fuzz-only assertion work
remain graph-inactive.

The execution counter has `17,234,309` estimated individual executions. The
latest plotted bucket, `2026-05-24T10:00:00Z`, has `4` browser/e2e executions,
`0` coverage-guided lower-level executions, and `0` protocol-server executions.
The preceding `09:45` bucket has `190` browser/e2e, `0`
coverage-guided-lower-level, and `0` protocol-server executions; the `09:30`
bucket has `255`, `0`, and `50` respectively.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T10:11:10Z`. The state-count table has `35`
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

The latest accounting sample is `run-20260524T100709Z` at
`2026-05-24T10:10:51Z`. It has `status_available=TRUE`,
`pending_until_first_pass=TRUE`, `current_run_metrics_trusted=FALSE`, and
startup status `monitor started; full coverage pass pending`. The reported
`duplicateShareCurrent=0` and summary startup failures `0` are incomplete
current-run accounting because current signatures, actionable signatures, and
product-evidence signatures are not available yet. Historical aggregate
duplicate/noise is not used as the live health signal. Until this active run
completes its first full pass, read the duplicate/noise/accounting row as a
control-plane health issue rather than a measured product duplicate/noise rate.

The previous trusted completed-pass sample was `run-20260524T082929Z` at
`2026-05-24T09:59:33Z`: `duplicateShareCurrent=0.5`, summary startup failures
`0`, and current signatures/actionable signatures/product-evidence signatures
`2`/`2`/`2`. That was one top duplicate signature over a two-signature current
denominator, not evidence of a broad duplicate storm.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation. It identifies the remaining risk as a
novelty-monitor producer and supervisor-publication leak: benchmark canary
forcing, non-authoritative `supervisor-groups.json`, pause metadata loss,
narrow duplicate-family holds, and startup-ish `editor_open_post_timeout`
producers. The latest feedback-action says the scheduler patch was
syntax-checked, restarted, and observed actionable duplicate share `0.25`,
below threshold. The refreshed active-run graph is pending first full pass and
cannot confirm that below-threshold status yet. That preserves the
producer/control-plane root-cause interpretation but rejects reading the latest
`0` duplicate share as a healthy measured product duplicate/noise rate.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.9GiB` free and `42.9%` used. The data
volume has `200.7GiB` free while still `94.3%` used. Latest CPU iowait is
`0.26%`; output-size and disk headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `2,000`. The latest enabled row is
`novelty-ws-media-cross-entity` at `2026-05-24T10:06:16Z`; the previous latest
rows at `2026-05-24T10:01:41Z` and `2026-05-24T10:04:01Z` were the same
group. Historical
enable events are useful for context; current lane residency should be read
from the fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`18` lanes: `15` browser/e2e lanes across `15` groups, `1` unit-property lane,
`1` protocol-server lane, and `1` coverage-guided-lower-level lane.

The active run has coverage-guided rows at `2026-05-24T10:06:16Z`, but they
are not trusted `is_latest` rows while current-run accounting is pending first
full pass. The graph-counted browser/e2e `is_latest` rows are focused-shard
rows from `2026-05-24T08:42:57Z` for same-user, title reload, existing-post
CRDT, code editor, UI signals, large HTTP lifecycle, and large HTTP readiness.
The remaining browser/e2e rows are one strict-expansion HTTP large-lifecycle
lane from `2026-05-23T15:52:21Z` and six gap-booster WebSocket lanes from
`2026-05-23T12:47:07Z` for async/server blocks, long-session large-doc,
permissions/auth-locks, real-user editing, revision persistence, and
three-user late join. The current graph-counted mix is still browser/e2e-heavy
by lane count, but it is much tighter than the previous 33-lane state.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an `is_latest` in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, `protocol-server` has a current HTTP polling REST row
from `2026-05-24T09:37:29Z`, and `coverage-guided-lower-level` has rich-text
CRDT from `2026-05-24T06:34:42Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest nonempty level-mix synthesis says
the deadline-mode mix should tighten toward PR-finalization evidence, fix the
browser novelty/materialization control first, and avoid broad WS novelty,
parser, rich-text, table, fuzz-assertion, focused/strict/gap, or generic
deferred relaunch expansion. Its live spot check saw autoscaler budget
`target=1 max=2` but `18` enabled/running groups, so it treats budget accounting
as suspect. The refreshed graph now partially supports that tightening: browser
residency is down to `15` graph-counted rows, not the previous `33`, but it is
still not a durable one-browser-lane state. The latest feedback-action also
expected a bounded HTTP polling lower-level handoff to be visible. The refreshed
execution count/rate tables still show `0` coverage-guided-lower-level
executions in the `09:00`, `09:15`, `09:30`, `09:45`, and `10:00` buckets, and
the only current lower-level mix row is rich-text CRDT. Treat that part as persona
evidence contradicting the graph, not as confirmed plotted lower-level
throughput. The no-expansion guidance still fits the graph because backend-api,
transport-integration, and standalone fuzz-assertion lanes remain
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

The latest nonempty protocol-server synthesis selects the HTTP polling REST endpoint,
`POST /wp-sync/v1/updates`, rather than the WebSocket relay. The latest nonempty
protocol action reports the HTTP polling REST harness implemented and validated:
direct smoke `validation-20260524T093433Z` and tmux launcher smoke
`validation-start-20260524T093556Z` both passed, emitted root and lane
`seed-attempt-complete` events with `fuzzLevel=protocol-server`, and left
`supervisor-groups.json` with the protocol-server identity. The
graph has a current `protocol-server-http-polling` row from
`2026-05-24T09:37:29Z` and protocol-server execution evidence in the `09:00`
and `09:30` buckets, after the `09:15` bucket went to zero following the
pressure-gated sentinel kill reported by level-mix feedback. The latest
`09:45` and `10:00` buckets have not added protocol-server executions. The
WebSocket relay remains second-pass.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,727,478` browser/e2e,
`1,132,740` unit-property, `458,609` coverage-guided lower-level, and
`10,915,482` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T10:00:00Z` bucket has `4` browser/e2e executions
(`16`/hour), `0` coverage-guided-lower-level executions (`0`/hour), and `0`
protocol-server executions (`0`/hour), with zero unit-property, backend-api,
transport-integration, and fuzz-assertion executions in that bucket. The
preceding `09:45` bucket had `190` browser/e2e, `0`
coverage-guided-lower-level, and `0` protocol-server executions; the `09:30`
bucket had `255`, `0`, and `50` respectively. The latest level-mix feedback
says a bounded HTTP polling lower-level handoff emitted `64` inputs, but the
refreshed execution CSV has not picked that up as plotted lower-level
count/rate yet.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output has `25` unique likely-real findings: `16`
browser/e2e over about `128.6` runner-hours, `1` protocol-server over about
`126.6` runner-hours, and `8` transport-integration findings from historical
or reconstructed rows with no current graph-counted lane. Unit-property and
coverage-guided lower-level remain `0` over about `89.8` and `22.3`
runner-hours respectively.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `284`
raw candidates: `204` browser/e2e candidates, `64` transport-integration
candidates, `9` protocol-server candidates, `5` unit-property candidates, and
`2` coverage-guided-lower-level candidates. Backend-api, standalone
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

The refreshed active novelty state has `19` profile rows. Weak-completion
profiles are still visible: collaboration UI signals have `867` records and
`0` successes, async/server blocks have `426` and `0`, long-session large-doc
has `40` and `0`, permissions/auth-locks has `37` and `1`,
persistence-no-title has `149` and `44`, revision persistence has `173` and
`66`, parser serialization has `86` and `21`, and multi-reload lifecycle has
`85` and `39`. The large-post three-user HTTP lifecycle profile has `504`
records, `42` successes, and `0` profile-row startup failures. The many-user
lifecycle profile remains at `0` active-editing strict cross-products below.
Live startup health should continue to use current-run summary startup failures
from the health section; the active run is pending and currently reports `0`
incomplete startup failures.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `125` met and `12`
unmet. Zero-progress misses still include template parts, HTTP 401/403 fault
paths, remote-selection cursor history, three-user late join, and collaboration
UI signals. Low-progress misses include media cross-entity (`3`/`25`), parser
serialization (`21`/`50`), multi-reload lifecycle (`39`/`50`), real-user editing
(`78`/`80`), and weak HTML (`19`/`20`) and calendar (`17`/`20`) block edges.
The strict
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
not marked enabled, and the adjacent large-post three-user HTTP profile has
`504` records seen, `42` successful records, and a `0.0833` success rate. The
generated goal table also shows the related successful-profile goal at
`42`/`10`, HTTP lifecycle scale at `504`/`10`, and successful three-user HTTP
records at `42`/`10`, but the strict
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
largest feature categories by total count are history (`69,699`),
operation-ledger (`41,484`), invariant (`41,292`), block-depth (`17,011`),
action-pair (`15,702`), block (`15,534`), action (`13,527`), other (`12,302`),
transport (`7,640`), and collaborator (`7,502`). Successful actions remain
concentrated in a few paths: `edit-title` (`922`), `append-paragraph` (`666`),
`concurrent-paragraphs` (`458`), block-gauntlet insert/edit actions
(`270`/`254`), `insert-nested-group` (`247`),
`edit-table-array-attributes` (`239`), `delete-block` (`215`), and
`move-block` (`214`).

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
`2026-05-24T10:11:10Z`. The state-count table has `35` counted items:
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
queue updated at `2026-05-24T10:09:40Z` and reports the exact-stack repair as
active in `rtc-benchmark-canary-feedback-refresh-20260524T100227Z`, plus a
gated reload-hydration deferred-family job. The active exact-stack repair is
still not a graph-counted publishable PR branch.
The repeated no-progress summary has one row: benchmark-canary zero executor
artifact.

## Interpretation

The active run has not completed a trusted current-run accounting pass.
`run-20260524T100709Z` reports `current_run_metrics_trusted=FALSE`,
`pending_until_first_pass=TRUE`, startup status `monitor started; full coverage
pass pending`, `duplicateShareCurrent=0`, and summary startup failures `0`.
Current signatures, actionable signatures, and product-evidence signatures are
not available yet. Treat the health graph as current-output-dir accounting:
pending/incomplete accounting is its own control-plane health signal, not a
measured product duplicate/noise rate. The previous trusted row at
`2026-05-24T09:59:33Z` was `duplicateShareCurrent=0.5` over `2`/`2`/`2`
current signature/actionable-signature/product-evidence denominators, so that
high share was one signature over a two-actionable-signature denominator.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and
keep startup-ish duplicate producers held unless there is strong product
evidence. Its below-threshold feedback sample was `0.25`; the refreshed active
run is pending first full pass, so the graph cannot confirm that below-threshold
live status yet. The graph therefore rejects reading the latest `0` duplicate
share as healthy measured product status while preserving the
producer/control-plane follow-up.

The resource picture is still disk-constrained, but CPU/load eased in the
latest sample. CPU utilization is `25.86%`, iowait is `0.26%`, five-minute load
is below the `64`-core line at `22.88`, the 15-minute load is below it at
`37.72`, and the data volume is `94.3%` used with `200.7GiB` free.
Level-mix persona output rejects broad expansion under deadline and disk
pressure. The latest nonempty synthesis recommends tightening toward
PR-finalization evidence, and the latest feedback-action says backend/API and
protocol/server sentinels were autoscaler-killed under high/severe pressure
after bounded checks. The refreshed graph now partially supports the deadline
tightening: the latest mix rows include `15` graph-counted browser/e2e lanes
instead of `33`, plus protocol-server and coverage-guided-lower-level residency.
It still contradicts the feedback claim that the HTTP polling lower-level
handoff should already be visible in graph counts; the refreshed execution CSV
still shows zero lower-level executions in the `09:00`, `09:15`, `09:30`,
`09:45`, and `10:00` buckets. Backend-api, transport-integration, and standalone
fuzz-assertion lanes remain graph-inactive.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
but live activity is not only browser/e2e. Browser/e2e executions continue at
low volume in the latest buckets, protocol-server has current HTTP polling REST
residency and execution evidence in the `09:00` and `09:30` buckets,
unit-property has a bounded canary row, and coverage-guided lower-level has
fresh plotted rich-text CRDT residency. The latest native-harness synthesis and
action choose rich-text CRDT as the first ready isolated harness and leave
parser/serialization second because of duplicate `RTC_BLOCK_PARSER_*` churn.
The latest nonempty
protocol-server synthesis supports the HTTP polling REST harness; the latest
nonempty action reports implementation plus passing direct and launcher smokes
at `validation-20260524T093433Z` and `validation-start-20260524T093556Z`, with
lane/root `protocol-server` events. The WebSocket relay remains second-pass.

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
