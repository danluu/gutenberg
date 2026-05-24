# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T10:43:25Z`

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

The graph-refresh pipeline is current through `2026-05-24T10:40:53Z` for
completed monitor passes and through `2026-05-24T10:42:00Z` for current-run
accounting. The active accounting row is `run-20260524T104146Z`;
`current_run_metrics_trusted_last` is `FALSE`, because the new output dir is
still pending its first full pass.

The monitor has `4,434` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `295,426`, and the current-scan coverage-file
count is `2,660`. Current coverage/profile intake is populated:
`coverage_goals.csv` has `137` goals with `12` unmet, and `profile_counts.csv`
has `19` profiles.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest current-run row has `duplicateShareCurrent=0`
and summary startup failures `0`, but the signature/actionable-signature/
product-evidence denominators are unavailable because
`current_run_metrics_trusted=FALSE`. Treat this as incomplete current-run
accounting and a control-plane health issue until the active run completes a
full pass, not as a measured product duplicate/noise rate. The previous trusted
completed-pass row, from `2026-05-24T10:35:29Z`, had
`duplicateShareCurrent=0` with `0`/`0`/`0` current denominators. An earlier
high-share trusted row, from `2026-05-24T09:59:33Z`, had
`duplicateShareCurrent=0.5` over `2`/`2`/`2` current
signature/actionable-signature/product-evidence denominators, so its
one-signature top duplicate was narrow.

The duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/scheduler leakage in novelty
monitoring and supervisor publication. The latest feedback-action says a
scheduler fix previously brought actionable duplicate share to `0.25`; the
previous trusted completed-pass row is now at `0` current signatures, while
the active row is pending and untrusted. The feedback's producer/control-plane
interpretation still fits better than a product-bug or broad product
duplicate-storm interpretation.

CPU and load remain below the earlier pressure spike. At
`2026-05-24T10:40:01Z`, CPU utilization is `21.36%`, iowait is `0.05%`, and
load averages are `14.10`, `18.08`, and `21.62` on `64` logical CPUs. Disk is
still the main resource constraint: at `2026-05-24T10:42:42Z`, root has
`87.9GiB` free and the data volume has `200.9GiB` free while `94.3%` used.

The latest graph-counted fuzzing mix has `19` browser/e2e lanes across `16`
groups, plus one unit-property lane, one protocol-server lane, and one
coverage-guided-lower-level lane. The newest graph-counted coverage-guided
browser row is `novelty-ws-real-user-rich-text` at `2026-05-24T10:42:12Z`
with `4` lanes; it is not the forced HTTP deadline canary that the persona
loop requested. The other latest browser/e2e rows are the focused-shard rows
from `2026-05-24T08:42:57Z`, a strict HTTP large-lifecycle row from
`2026-05-23T15:52:21Z`, and six gap-booster WS rows from
`2026-05-23T12:47:07Z`. The graph remains browser/e2e-heavy by lane count, but
bounded lower-level coverage is present: rich-text CRDT lower-level, a current
protocol-server HTTP polling validation row from `2026-05-24T10:13:02Z`, and a
unit-property HTTP polling canary.
Transport-integration, backend-api, and standalone fuzz-only assertion work
remain graph-inactive.

The execution counter has `17,234,334` estimated individual executions. The
latest plotted bucket, `2026-05-24T10:00:00Z`, has `4` browser/e2e executions,
`0` coverage-guided lower-level executions, and `25` protocol-server executions.
The preceding `09:45` bucket has `190` browser/e2e, `0`
coverage-guided-lower-level, and `0` protocol-server executions; the `09:30`
bucket has `255`, `0`, and `50` respectively.

The PR-focused critical-path data is live. The current controller snapshot is
`2026-05-24T10:42:13Z`. The state-count table has `35`
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

The latest accounting sample is `run-20260524T104146Z` at
`2026-05-24T10:42:00Z`. It has `status_available=TRUE`,
`pending_until_first_pass=TRUE`, `current_run_metrics_trusted=FALSE`,
`duplicateShareCurrent=0`, summary startup failures `0`, and unavailable
current signatures/actionable signatures/product-evidence signatures. This is
incomplete current-run accounting and a control-plane health issue for the
active interval, not a measured product duplicate/noise rate. Historical
aggregate duplicate/noise is not used as the live health signal.

The previous trusted completed-pass sample was `run-20260524T102504Z` at
`2026-05-24T10:35:29Z`: `duplicateShareCurrent=0`, summary startup failures
`0`, and current signatures/actionable signatures/product-evidence signatures
`0`/`0`/`0`.

The earlier high-share trusted completed-pass sample was
`run-20260524T082929Z` at
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
below threshold. The refreshed active row is now untrusted and pending, while
the previous trusted completed-pass row had no current signatures. That keeps
the below-threshold duplicate/noise read for completed accounting, but live
health is currently blocked on first-pass accounting completion.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. In the latest
sample, root pressure is stable at `87.9GiB` free and `42.9%` used. The data
volume has `200.9GiB` free while still `94.3%` used. Latest CPU iowait is
`0.05%`; output-size and disk headroom remain the dominant resource constraints.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `2,006`. The latest enabled rows are
`novelty-http-large-post-readiness` at `2026-05-24T10:38:10Z` and
`2026-05-24T10:40:53Z`; the previous latest rows through
`2026-05-24T10:06:16Z` were `novelty-ws-media-cross-entity`. The active
enabled group reported in the summary is `novelty-ws-real-user-rich-text`.
Historical
enable events are useful for context; current lane residency should be read
from the fuzzing-level mix table below and cross-checked against current-root
supervisor/session evidence.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted `is_latest` rows are
`22` lanes: `19` browser/e2e lanes across `16` groups, `1` unit-property lane,
`1` protocol-server lane, and `1` coverage-guided-lower-level lane.

The latest coverage-guided browser row is `novelty-ws-real-user-rich-text` at
`2026-05-24T10:42:12Z`, with `4` WebSocket real-user editing lanes. The other
graph-counted browser/e2e `is_latest` rows are focused-shard rows from
`2026-05-24T08:42:57Z` for same-user, title reload, existing-post CRDT, code
editor, UI signals, large HTTP lifecycle, and large HTTP readiness. The
remaining browser/e2e rows are one strict-expansion HTTP large-lifecycle lane
from `2026-05-23T15:52:21Z` and six gap-booster WebSocket lanes from
`2026-05-23T12:47:07Z` for async/server blocks, long-session large-doc,
permissions/auth-locks, real-user editing, revision persistence, and
three-user late join. The current graph-counted mix is still browser/e2e-heavy
by lane count, but it is tighter than the previous 33-lane state.

Lower-level graph residency is narrow but present in bounded lanes:
`unit-property` has an `is_latest` in-process HTTP polling canary row from
`2026-05-24T00:19:43Z`, `protocol-server` has a current HTTP polling REST
validation row from `2026-05-24T10:13:02Z`, and
`coverage-guided-lower-level` has rich-text
CRDT from `2026-05-24T06:34:42Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane.

Persona-loop evidence rejects the simple interpretation that all graph-counted
rows equal trusted useful capacity. The latest nonempty level-mix synthesis says
the deadline-mode mix should tighten toward PR-finalization evidence, fix the
browser novelty/materialization control first, and avoid broad WS novelty,
parser, rich-text, table, fuzz-assertion, focused/strict/gap, or generic
deferred relaunch expansion. It reports a novelty-monitor TDZ crash in the
deadline canary path and says forced HTTP benchmark-canary materialization was
still not healthy: tmux sessions were present, but forced canary rows had zero
current-run successful records. The latest level-mix feedback-action file is
empty; the previous feedback-action reported that `run-20260524T102504Z` had
one active browser group, `novelty-ws-real-user-rich-text`. The refreshed graph
now also has that group as the latest coverage-guided browser row, so treat it
as partial materialization evidence and as confirmation that the forced HTTP
deadline canaries are still not proven productive. That same level-mix evidence
still treats backend/API,
protocol/server, and fuzz-assertion expansion as blocked or downscoped; the
separate protocol-server action and graph evidence below supersede that for the
HTTP polling validation lane.

The refreshed graph partially supports deadline tightening because browser
residency is down to `19` graph-counted rows, not the previous `33`, but the
persona synthesis rejects treating those rows as proof of useful live capacity
or healthy forced-HTTP materialization. The refreshed execution count/rate
tables still show `0` coverage-guided-lower-level executions in the `09:00`,
`09:15`, `09:30`, `09:45`, and `10:00` buckets, and the only current
lower-level mix row is rich-text CRDT. Earlier lower-level CRDT executions are
visible at `06:30`, `06:45`, and `07:00`, but they have not continued into the
latest buckets. Treat the empty-browser-policy synthesis and the later
TDZ/materialization rejection as control-plane evidence that constrains the
graph interpretation. The no-expansion guidance still fits the graph because
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

The latest nonempty protocol-server synthesis selects the HTTP polling REST
endpoint, `POST /wp-sync/v1/updates`, rather than the WebSocket relay. The
latest nonempty protocol action reports the HTTP polling REST harness
implemented and validated with `validation-action-20260524T101302Z`: syntax
checks passed, `npm run wp-env status` found wp-env running, the bounded run
passed with `OK (1 test, 1589 assertions)`, and root/lane events emitted
`seed-attempt-complete` with `fuzzLevel=protocol-server`. The graph has a
current `protocol-server-http-polling` row from `2026-05-24T10:13:02Z` and
protocol-server execution evidence in the `09:00`, `09:30`, and `10:00`
buckets, with `25` executions in the latest bucket. The WebSocket relay remains
second-pass.

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
`10,915,507` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The latest `2026-05-24T10:00:00Z` bucket has `4` browser/e2e executions
(`16`/hour), `0` coverage-guided-lower-level executions (`0`/hour), and `25`
protocol-server executions (`100`/hour), with zero unit-property, backend-api,
transport-integration, and fuzz-assertion executions in that bucket. The
preceding `09:45` bucket had `190` browser/e2e, `0`
coverage-guided-lower-level, and `0` protocol-server executions; the `09:30`
bucket had `255`, `0`, and `50` respectively. The refreshed execution CSV has
picked up the protocol-server validation and earlier rich-text CRDT
lower-level throughput at `06:30`, `06:45`, and `07:00`, but still has not
picked up coverage-guided-lower-level throughput in the latest buckets.

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
profiles are still visible: collaboration UI signals have `878` records and
`0` successes, async/server blocks have `426` and `0`, long-session large-doc
has `40` and `0`, list-move refresh HTTP has `69` and `0`,
permissions/auth-locks has `37` and `1`, many-user lifecycle has `65` and
`16`, persistence-no-title has `149` and `44`, revision persistence has `173`
and `66`, parser serialization has `86` and `21`, and multi-reload lifecycle
has `85` and `39`. The large-post three-user HTTP lifecycle profile has `504`
records, `42` successes, and `0` profile-row startup failures. The many-user
lifecycle profile still has `0` active-editing strict cross-products below.
Live startup health should continue to use current-run summary startup failures
from the health section; the latest trusted current-run row reports `0`
startup failures.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

The refreshed `coverage_goals.csv` has `137` goals, with `125` met and `12`
unmet. Zero-progress misses still include template parts, HTTP 401/403 fault
paths, remote-selection cursor history, three-user late join, and collaboration
UI signals. Low-progress misses include media cross-entity (`3`/`25`), parser
serialization (`21`/`50`), multi-reload lifecycle (`39`/`50`), real-user editing
(`79`/`80`), and weak HTML (`19`/`20`) and calendar (`17`/`20`) block edges.
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
largest feature categories by total count are history (`69,887`),
operation-ledger (`41,595`), invariant (`41,453`), block-depth (`17,044`),
action-pair (`15,727`), block (`15,567`), action (`13,565`), other (`12,345`),
transport (`7,668`), and collaborator (`7,530`). Successful actions remain
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
`2026-05-24T10:42:13Z`. The state-count table has `35` counted items:
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
queue updated at `2026-05-24T10:40:48Z` and reports the exact-stack repair as
active in
`rtc-critical-continuation-benchmark-canary-fuzzer-gap-20260524T103520Z`, plus
a gated reload-hydration deferred-family job. The active exact-stack repair is
still not a graph-counted publishable PR branch.
The repeated no-progress summary has two rows: benchmark-canary zero executor
artifact and exact-stack promotion blocked without an active repair.

## Interpretation

The active run is pending first-pass accounting. `run-20260524T104146Z`
reports `current_run_metrics_trusted=FALSE`,
`pending_until_first_pass=TRUE`, `duplicateShareCurrent=0`, summary startup
failures `0`, and unavailable current signature/actionable-signature/
product-evidence denominators. Treat the health graph as current-output-dir
accounting: pending/incomplete accounting is its own control-plane health
signal, not a measured product duplicate/noise rate. The previous trusted
completed-pass row at `2026-05-24T10:35:29Z` was
`duplicateShareCurrent=0` over `0`/`0`/`0` current denominators. The earlier
high-share trusted row at `2026-05-24T09:59:33Z` was
`duplicateShareCurrent=0.5` over `2`/`2`/`2` current
signature/actionable-signature/product-evidence denominators, so that high
share was one signature over a two-actionable-signature denominator.

Duplicate/noise persona evidence rejects a product-bug or broad product
duplicate-storm read and points to producer/control-plane hardening: preserve
pause metadata, make post-policy supervisor publication authoritative, and
keep startup-ish duplicate producers held unless there is strong product
evidence. Its below-threshold feedback sample was `0.25`; the refreshed
active current-run row is incomplete, while the previous trusted current-run
row had no current signatures. That supports below-threshold duplicate/noise
status for completed accounting while preserving the producer/control-plane
follow-up and treating the active interval as an accounting health issue.

The resource picture is still disk-constrained, while CPU/load remain below the
earlier pressure spike. CPU utilization is `21.36%`, iowait is `0.05%`,
five-minute load is below the `64`-core line at `18.08`, the 15-minute load is
below it at `21.62`, and the data volume is `94.3%` used with `200.9GiB` free.
Level-mix persona output rejects broad expansion under deadline and disk
pressure. The latest nonempty synthesis recommends tightening toward
PR-finalization evidence and says the browser materialization path still has a
deadline-canary TDZ/control-plane blocker; the previous feedback-action's
one-browser-group repair is only partial evidence. Its protocol-server
absence/downscope note conflicts with the separate protocol-server action and
graph evidence. The refreshed graph now partially supports the deadline
tightening: the latest mix rows include `19` graph-counted browser/e2e lanes
instead of `33`, plus protocol-server and coverage-guided-lower-level
residency. It also shows the active coverage-guided browser row as
`novelty-ws-real-user-rich-text`, which supports the persona rejection of a
healthy forced-HTTP deadline-canary materialization read. The graph supports
the HTTP polling protocol handoff with a current row and `25` protocol-server
executions in the `10:00` bucket. Coverage-guided lower-level throughput still
contradicts the hoped-for handoff in the latest window: the execution CSV shows
zero lower-level executions in the `09:00`, `09:15`, `09:30`, `09:45`, and
`10:00` buckets, despite earlier rich-text CRDT lower-level executions at
`06:30`, `06:45`, and `07:00`. Backend-api, transport-integration, and
standalone fuzz-assertion lanes remain graph-inactive.

The graph-counted fuzzing mix is browser/e2e-heavy in historical/current rows,
but live activity is not only browser/e2e. Browser/e2e executions continue at
low volume in the latest buckets, protocol-server has current HTTP polling REST
residency and execution evidence in the `09:00`, `09:30`, and `10:00` buckets,
unit-property has a bounded canary row, and coverage-guided lower-level has
fresh plotted rich-text CRDT residency. The latest native-harness synthesis and
action choose rich-text CRDT as the first ready isolated harness and leave
parser/serialization second because of duplicate `RTC_BLOCK_PARSER_*` churn.
The latest nonempty protocol-server synthesis supports the HTTP polling REST
harness; the latest nonempty action reports implementation plus passing
validation at `validation-action-20260524T101302Z`, with lane/root
`protocol-server` events. The WebSocket relay remains second-pass.

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
