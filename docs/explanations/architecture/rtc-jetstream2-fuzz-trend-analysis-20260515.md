# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T16:58:45Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...`
inputs so PR-controller graphs track current raw state instead of stale local
state.

## High-Level Readout

The monitor data is current through `2026-05-22T16:55:28Z`, and the latest
current-run accounting row was sampled at `2026-05-22T16:57:45Z` for
`run-20260522T151953Z`. That active run has completed a trusted current-run
accounting pass: `current_run_metrics_trusted` is `TRUE`,
`pending_until_first_pass` is `FALSE`, and `full_pass_pending` is `FALSE`.
The monitor has `4,049` passes from `2026-05-15T01:21:42Z` onward.
Cumulative coverage record observations are `279,014`; current-scan coverage
files are `2,302`. The parsed coverage-goal table has `18` unmet target rows
out of `137`.

The live duplicate/noise signal is current-output-dir accounting. The latest
current-output-dir row carries completed-pass `duplicateShareCurrent` `0.5`,
summary startup failures `0`, `2` current-run signatures, `2` actionable
signatures, `2` product-evidence signatures, and top duplicate share `0.5`.
That is a trusted but tiny current-run denominator: one duplicate family among
two actionable signatures is a control-plane health watch, not evidence for a
broad product duplicate/noise storm. Historical duplicate share is `0.1765`
for context; it is not the plotted live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak: benchmark-canary/P0 groups can bypass duplicate/noise
holds after they already have a current-run product-evidence representative.
The latest non-empty duplicate/noise feedback-action says the bounded fix was
applied: repo artifact scans now ignore `repos`, and benchmark-canary duplicate
bypass stops once current product evidence exists. Those persona-loop files
conflict on whether the fix has fully taken effect in the live loop, so the
refreshed graph should be read as a control-plane health watch rather than a
product-bug or broad duplicate-storm conclusion.

Resource state is usable in the latest sample. The latest monitor sample has
`391.4G` free memory; the latest disk sample has `90.6GiB` free on `/` and
`483.9GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization
is `64.47%`, with `3.73%` iowait. Latest load averages are `36.31`, `49.72`,
and `55.05` on `64` logical CPUs, with `1` blocked task in the same sample.

The latest graph-counted fuzzing mix has `15` browser/e2e lanes across `15`
groups, plus one `unit-property` lane, one stale
`coverage-guided-lower-level` row, and one `protocol-server` lane. Live
graph-counted fuzzing is still concentrated in browser/e2e and remains below
the persona loop's `24`-lane browser/e2e floor. Current graph-confirmed
lower-level work is narrow: one rich-text CRDT unit/property lane, one
protocol-server HTTP polling row, and no current-bucket coverage-guided
lower-level executions. The latest native-harness synthesis now picks HTTP
polling as the first ready isolated lower-level harness and rejects treating
the held parser row as ready live capacity. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane.

The execution counter has `16,823,468` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T16:45:00Z` has `105` browser/e2e executions, `2,496`
unit-property executions, and `1,740` protocol-server executions, about
`420`/hour, `9,984`/hour, and `6,960`/hour. The preceding
`2026-05-22T16:30:00Z` bucket had `107` browser/e2e executions, `2,784`
unit-property executions, and `1,800` protocol-server executions, about
`428`/hour, `11,136`/hour, and `7,200`/hour. The latest nonzero
coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with `2`
executions.

The PR-focused data is live. The controller table has `21` distinct work
items in `27` current rows: `13` high-priority ready-product PR rows marked
published, `5` high-priority ready-product rows held by the controller, `1`
runtime-held consumed row, and repeated deferred-family diagnostic plus
needs-product-decision rows. The current push manifest is empty. The
critical-path executor has `7` blockers: `1` active, `1` runnable, `1`
queued, `1` held, and `3` terminal/downscoped. Benchmark-canary exact-stack
repair is now terminal with fresh green evidence. Seed `5200005` reducer is
active; productive-analysis action is runnable; PR07C owner matrix is queued;
reload-hydration is held by a single-flight manifest. The executor queue
currently has PR07C owner matrix queued, seed `5200005` active, benchmark
canary terminal, productive-analysis runnable, and reload-hydration gated.
The latest PR-split feedback keeps the fileable prefix through `PR15C` and
rejects `PR16-RLH` as fileable until strict seed `6000007` reaches the final
persistence oracle and owner rows prove it.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative
total. It can fall when the active output root changes or when a cleanup pass
removes old per-run files. Cumulative coverage record observations are the
better long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
Pending/incomplete accounting is tracked as its own health signal and should
not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted` is `FALSE`, treat the duplicate/noise share as
incomplete current-run accounting and as a control-plane health issue until
the active run completes a full pass.

The latest sample for `run-20260522T151953Z` was taken at
`2026-05-22T16:57:45Z`; it reports `current_run_metrics_trusted` `TRUE`,
`pending_until_first_pass` `FALSE`, and `full_pass_pending` `FALSE`. The
latest completed current-run accounting pass was at `2026-05-22T16:55:27Z`,
and the latest completed monitor pass was at `2026-05-22T16:55:28Z`. This
row carries completed `duplicateShareCurrent` `0.5` and summary startup
failures `0`, with `2`
current-run signatures, `2` actionable signatures, `2` product-evidence
signatures, and top duplicate share `0.5`. The right reading is a trusted
current-output-dir health sample with a two-actionable-signature denominator,
not a measured broad product duplicate/noise rate. The same run had a
`0.3333` row on `3` actionable signatures at `2026-05-22T16:09:09Z` and
`0.5` rows on `2` actionable signatures from `2026-05-22T16:17:21Z` through
`2026-05-22T16:57:45Z`, so the apparent movement is still dominated by tiny
current-run denominators.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is a
producer/scheduler leak in which benchmark-canary/P0 groups bypass duplicate
holds even after the current run already has a product-evidence representative.
The latest non-empty duplicate/noise feedback-action reports that the bounded
control-plane fix was implemented, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. Because the
later synthesis still names the leak as remaining, the standard persona-loop
evidence is contradictory on whether the control-plane fix has fully taken
effect. The refreshed graph rejects a broad product duplicate-storm reading
but keeps the duplicate/noise control plane on watch until the denominator
grows.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume
is around `86.3%` used and root is around `41.1%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,758`. Current enabled groups are
`novelty-http-existing-post-crdt-metadata`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
and `novelty-http-large-post-readiness`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `15` browser/e2e lanes across `15` groups. Lower-level work is
narrow: `unit-property` and `protocol-server` each have one current
graph-counted row, while the lone `coverage-guided-lower-level` row is stale
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone `fuzz-assertion` have no current graph-counted lane in this
snapshot.

The active coverage-guided root is `run-20260522T151953Z`. Current
graph-counted browser/e2e rows include five coverage-guided HTTP rows, one
focused large-HTTP readiness row, six gap-booster rows, and three strict HTTP
expansion rows. Those rows cover large-post three-user HTTP lifecycle,
large-post readiness, existing-post CRDT metadata, HTTP persistence probing,
real-user title/rich-text editing, three-user late join, revision,
permissions/auth locks, async/server, long-doc, same-user stale draft, and
large HTTP lifecycle coverage.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful live capacity. The latest level-mix synthesis rejects
broad lower-level expansion, keeps `unit-property` capped at one smoke lane,
counts stale `fuzz-assertion` as zero useful capacity, and says browser/e2e
should backfill toward the `24`-lane floor. That synthesis cited `16`
browser/e2e lanes at its input time, while the refreshed graph now sees
`15`. The latest non-empty level-mix feedback-action partly disagrees on
sequencing by reporting a bounded lower-level/API/server action:
`large-http-readiness` and
`novelty-http-large-post-readiness` were added, HTTP polling lower-level
readiness produced `24` executions with `product_yield=1`, and protocol/server
sentinels were relaunched. The refreshed graph confirms browser/e2e readiness
rows and protocol-server telemetry, but it still has no graph-counted
`backend-api`, `transport-integration`, standalone `fuzz-assertion`, or
current-bucket coverage-guided lower-level execution. Treat the bounded
lower-level HTTP polling result as action evidence until graph-visible
residency or execution buckets appear.

The latest native-harness synthesis selects the HTTP polling manager as the
first ready isolated Node/V8 coverage-guided lower-level harness. It explicitly
keeps the parser/serialization harness behind a hold while it repeats
`RTC_BLOCK_PARSER_ROUNDTRIP_DRIFT` / `RTC_BLOCK_PARSER_SPEC_DIVERGENCE`
without new yield. An earlier native-harness action reports that the parser
harness was implemented and smoke-validated with `productYield=true`, but the
latest synthesis rejects treating that as ready live capacity. The graph also
rejects treating it as live lower-level residency because the latest
graph-counted coverage-guided lower-level row is stale and current execution
buckets remain zero.

The latest protocol-server synthesis converged on the HTTP polling REST
protocol harness for `POST /wp-sync/v1/updates`. The refreshed graph has a
protocol-server row and current execution buckets through
`2026-05-22T16:45:00Z`. The protocol action says the HTTP polling REST harness
was implemented and validated with root/lane `seed-attempt-complete` events
and `fuzzLevel:"protocol-server"` metadata, so the graph and action agree that
protocol-server telemetry is present.

Fuzz-only assertion work is not graph-counted as active. The latest assertion
action added two gated assertions; level-mix evidence still treats
`fuzz-assertion` as stale rather than current graph capacity.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `79,102`
browser/e2e, `5,748,480` unit-property, `458,097`
coverage-guided lower-level, and `10,537,789` protocol-server executions.
Transport-integration, backend-api, fuzz-assertion, and other buckets are `0`
in the current reconstructed table.

The latest 15-minute bucket at `2026-05-22T16:45:00Z` is partial and has
`105` browser/e2e executions (`420`/hour), `2,496` unit-property executions
(`9,984`/hour), and `1,740` protocol-server executions (`6,960`/hour);
coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The preceding
`2026-05-22T16:30:00Z` bucket had `107` browser/e2e executions (`428`/hour),
`2,784` unit-property executions (`11,136`/hour), and `1,800`
protocol-server executions (`7,200`/hour). The prior
`2026-05-22T16:15:00Z` bucket had `106` browser/e2e executions (`424`/hour),
`2,816` unit-property executions (`11,264`/hour), and `1,680`
protocol-server executions (`6,720`/hour). The earlier
`2026-05-22T16:00:00Z` bucket had `109` browser/e2e executions (`436`/hour),
`2,848` unit-property executions (`11,392`/hour), and `1,800`
protocol-server executions (`7,200`/hour). The latest nonzero
coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with `2`
executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `128` likely-real
findings over about `551.2` runner-hours, or `23.22` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,146`
total candidates: `1,138` browser/e2e candidates, `6` unit-property
candidates, and `2` coverage-guided-lower-level candidates. Backend-api,
protocol-server, transport-integration, standalone fuzz-assertion, and other
buckets have no unique candidates in the latest graph-counted data.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Failure-candidate rates are pre-triage lead indicators, not confirmed bug
counts. They remain useful for spotting whether a lane is producing work worth
triaging before duplicate/noise filtering catches up.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

The latest weak-completion profiles have successful record counts at zero in
the current sample: table stale snapshot HTTP (`4` records) and collaboration
UI signals (`80` records). Revision persistence has `4` successful records,
full-profile rows have `16`, many-user lifecycle has `17`, parser
serialization has `20`, multi-reload lifecycle has `37`, long-session
large-doc has `39`, common blocks have `43`, large-post three-user HTTP has
`49`, code-editor smoke has `64`, parser transform has `68`, three-user late
join has `96`, block-gauntlet has `106`, media cross-entity has `111`,
async/server blocks have `136`, and permissions/auth/locks has `265`. This
still argues for completion-depth repair in existing covered surfaces before
adding another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

![Combined-ingredient fuzzing progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-progress.png)

![Combined-ingredient fuzzing goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-goal-progress.png)

![Combined-ingredient fuzzing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-requirements.png)

The combined-ingredient graphs are generated by
`rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R`
from the novelty-state feature key
`cross-product:large-post-three-user-http-lifecycle`. They track the
benchmark-like conjunction: HTTP polling, large initial post, at least three
browser users, lifecycle reloads, save/autosave checkpoints, strict
persistence oracles, and a passed run. Separate ingredient-lane hits do not
increment this cross-product count. The goal-progress graph also includes
nearby large-post, HTTP, and three-user goals so already-running combined-ish
lanes remain visible while the stricter cross-product key ramps up.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is currently marked enabled, and the adjacent large-post
three-user HTTP profile has `583` records seen with `49` successful records.
Those adjacent hits still do not count as completed combined coverage unless
the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. Users present in a room are not enough. A run
only contributes to the active-user series when distinct browser users
actually perform successful editing actions, and final UI witness-sweep-only
edits do not count as active-editor evidence. The cross-product rows require
the same active-editor threshold together with realistic editing ingredients:
save/reload lifecycle, late join, autosave, rich text/list/table editing,
synced notes, collaboration UI signals, large-document setup, HTTP polling
with an explicit client-limit override, same-user tabs, revision restore,
publish transition, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. The rich/list, synced notes, HTTP
polling, HTTP client-limit override, same-user tabs, revision restore, publish
transition, UI-signal, save/reload/autosave, late-join, and large-document
cross-products remain `0` at the 6/10/12/30 active-editor thresholds where
they apply. The new active-editing groups are not currently marked enabled in
the sampled state, so these graphs should remain red until the monitor admits
the six-, twelve-, and thirty-active-editor lanes and they start producing
passed records.

Largest current unmet goal and active-editing gaps:

| Goal                                                   | Current | Target |
| ------------------------------------------------------ | ------: | -----: |
| successful parser-serialization records                |      20 |     50 |
| successful collaboration-ui-signals records            |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle   |       0 |     25 |
| many-user active-editing records                       |       0 |     25 |
| six-active-editor lifecycle cross-product              |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product    |       0 |     25 |
| six-active-editor UI-signal cross-product              |       0 |     25 |
| six-active-editor large-document cross-product         |       0 |     25 |
| remote selection and cursor visible                    |       1 |     25 |
| async/server block core/template-part                  |       0 |     20 |
| remote and local autosave checkpoints                  |      11 |     25 |
| local post recovery autosave                           |      12 |     25 |
| successful multi-reload-lifecycle records              |      37 |     50 |
| successful twelve-user late join documents             |       0 |     10 |
| successful twelve-user documents                       |       0 |     10 |
| twelve-active-editor progress                          |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product |       0 |     10 |
| HTTP client-limit override for active editing          |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product |       0 |     10 |
| six-active-editor revision-restore cross-product       |       0 |     10 |
| six-active-editor publish-transition cross-product     |       0 |     10 |
| table stale snapshot oracle                            |       0 |     10 |
| successful large-post HTTP records with three users    |       7 |     10 |
| action table-stale-snapshot-html                       |       4 |     10 |
| table stale snapshot over HTTP                         |       4 |     10 |
| successful thirty-user late join documents             |       0 |      3 |
| successful thirty-user documents                       |       0 |      3 |
| thirty-active-editor progress                          |       0 |      3 |

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

These plots separate breadth from repeated observations and focus action
completion on weak profiles so high-volume successful lanes do not hide stalled
profiles.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

The parsed suggested-PR split history has `457` snapshots. The latest parsed
proposed split totals `4,114` net LOC. These charts are size telemetry from
parsed status snapshots, not filing authority. The largest latest rows are
`PR 13B` at `1,668` net LOC, `PR 13A` at `1,126`, `PR 13C` at `294`, and
`PR 14` at `276`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current controller state has `21` distinct work items in `27` current
rows. The most important live queue entries are `5` high-priority
ready-product PR rows held by the controller, `13` published ready-product
rows still under validation, `1` high-priority runtime-held consumed row, and
repeated deferred-family diagnostic plus needs-product-decision rows.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates, deferred
family budget gates, resource reserve, single-flight guards, or repeated
critical-path continuations are slowing progress. It buckets controller stalls
and critical-path blocker launches by 30-minute UTC windows. A spike is not
automatically bad, but repeated spikes for the same blocker class mean the loop
is spending capacity on a gate or relaunch pattern that should be consumed,
downscoped, or converted into exact evidence.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest is empty, so there are no graph-counted publishable
branch rows in this snapshot. Published and held branches are still visible in
the progress table. The latest PR-split persona feedback rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and
owner rows. The copied feedback requests exactly one bounded strict-head
reproduction repair job for `8fb598778357` / seed `6000007`; do not treat
wait-only or no-progress cycles as acceptance while actionable rows remain.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: one active blocker
(`seed-5200005-reducer`), one runnable blocker (`productive-analysis-action`),
one queued owner-evidence blocker (`pr07c-owner-matrix`), one held
deferred-family blocker (`reload-hydration`), and three terminal/downscoped
blockers (`benchmark-canary-fuzzer-gap`, `PR17` seed `1020002`, and
`seed-1060015-reducer`). The current job queue has PR07C owner matrix queued,
seed `5200005` active, benchmark-canary exact-stack repair terminal with fresh
green evidence, productive-analysis runnable, and reload-hydration gated by a
single-flight manifest. The repeated no-progress table currently has two
`benchmark-canary-fuzzer-gap` rows: `pre_oracle_or_preflight_only` and
`zero_executor_artifact`.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the active
coverage-guided root, resource samples, PR-focused raw inputs, and the
standard persona-loop outputs. The active coverage root is
`run-20260522T151953Z`, and its latest accounting row is trusted. The row was
sampled at `2026-05-22T16:57:45Z`; the latest completed current-run
accounting pass was at `2026-05-22T16:55:27Z`, and the latest completed
monitor pass was at `2026-05-22T16:55:28Z`, with
`full_pass_pending` `FALSE`, `pending_until_first_pass` `FALSE`, and
`current_run_metrics_trusted` `TRUE`. The row carries completed
`duplicateShareCurrent` `0.5` and summary startup failures `0`; the current
run signature/actionable-signature denominator is `2`/`2`, with `2`
product-evidence signatures and top duplicate share `0.5`. That is a trusted
current-output-dir health signal with a tiny current-run denominator, not a
measured broad product duplicate/noise rate.

The duplicate/noise persona synthesis rejects a product-bug reading and points
at a plausible producer-side control-plane leak: benchmark-canary/P0 producers
can keep bypassing duplicate holds after a current-run product-evidence
representative exists. The latest non-empty duplicate/noise feedback-action
says that fix has now been applied, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. Because the
later synthesis still names the leak as remaining, the persona-loop evidence
rejects a broad product duplicate-storm reading but does not fully clear the
control-plane risk. The live health issue is watching whether the
control-plane fix holds as the denominator grows.

The resource picture is usable, and the short load sample is now below the
core count: latest CPU utilization is `64.47%`, with `3.73%` iowait; load is
`36.31`, `49.72`, and `55.05` on `64` logical CPUs, with `1` blocked task.
The graph-counted fuzzing mix is browser/e2e-heavy: `15` browser/e2e lanes,
plus one current unit-property lane, one current protocol-server lane, and one
stale coverage-guided lower-level row. Persona evidence is stricter than the
graph and rejects raw row counts as trusted useful capacity unless roots,
sessions, PIDs, events, and summaries reconcile. The graph confirms current
browser HTTP/readiness rows and protocol-server telemetry, but it does not
confirm backend/API, transport-integration, standalone fuzz-assertion, or
current-bucket coverage-guided lower-level execution. The latest native-harness
synthesis selects HTTP polling as the ready lower-level target and keeps the
parser harness held, despite an earlier parser smoke-validation action. The
level-mix feedback-action reports a bounded lower-level HTTP polling readiness
run with product yield, which conflicts with the graph's lack of current
lower-level residency; keep that as action evidence until the next
graph-visible row appears.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial:
the `2026-05-22T16:45:00Z` bucket has `105` browser/e2e executions, `2,496`
unit-property executions, and `1,740` protocol-server executions. Lower-level
counts remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

Coverage-goal pressure is unchanged at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `583` records and
`49` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds; those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, but the controller is not advertising a non-empty push
manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it; the feedback-action
launched one bounded strict-head repair job for that family. The PR loop still
needs to convert held ready-product rows, active seed `5200005` reducer,
runnable productive-analysis feedback, queued PR07C owner matrix, and held
reload-hydration work into validated publishable branches rather than more
blocked or no-progress artifacts. Benchmark-canary exact-stack repair is no
longer the active blocker in the refreshed graph; it is terminal with fresh
green evidence.
