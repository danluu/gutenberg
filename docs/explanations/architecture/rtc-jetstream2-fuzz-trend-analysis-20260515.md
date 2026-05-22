# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T13:20:14Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance, resource,
and PR-progress logs. The plotting data is generated with R, ggplot2, tidyverse
packages, and ColorBrewer palettes. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...` inputs
so PR-controller graphs track current raw state instead of stale local state.

## High-Level Readout

The monitor data is current through `2026-05-22T13:19:20Z`, and the latest
current-run accounting row was sampled at `2026-05-22T13:19:19Z` for
`run-20260522T125322Z`. The latest completed full pass for that active run was
at `2026-05-22T13:19:19Z`, and the active-run row is trusted:
`current_run_metrics_trusted` is `TRUE`, `pending_until_first_pass` is
`FALSE`, and `full_pass_pending` is `FALSE`. The monitor has `3,979` passes
from `2026-05-15T01:21:42Z` onward. Cumulative coverage record observations
are `277,982`; current-scan coverage files are `1,964`. The parsed
coverage-goal table still has `19` unmet target rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting. The latest
trusted current-output-dir row carries `duplicateShareCurrent` `0` and summary
startup failures `0`, with `0` current-run signatures, `0` actionable
signatures, `0` product-evidence signatures, and current-run top duplicate
share `0`. The earlier `12:42`/`12:48` rows had a one-signature duplicate
denominator, so those rows were small-denominator control-plane/yield checks,
not evidence of a broad product duplicate storm. Historical duplicate share is
`0.2222` for context; it is not the plotted live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak: benchmark-canary/P0 groups can bypass duplicate/noise holds
after they already have a current-run product-evidence representative. The
newest duplicate/noise feedback-action says that bounded fix was applied: repo
artifact scans now ignore `repos`, and benchmark-canary duplicate-bypass stops
once current product evidence exists.

Resource state is usable in the latest sample. The latest monitor sample has
`397.3G` free memory; the latest disk sample has `90.8GiB` free on `/` and
`505.1GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`58.47%`, with `2.66%` iowait. Latest load averages are `60.54`, `48.32`, and
`39.84` on `64` logical CPUs, with `1` blocked task in the same sample.

The latest graph-counted fuzzing mix has `13` browser/e2e lanes across `13`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing is still
concentrated in browser/e2e, but it is below the persona loop's `24`-lane
browser/e2e floor. Current graph-counted lower-level work is narrow:
rich-text CRDT unit/property, a rich-text CRDT coverage-guided lower-level
smoke row, and a protocol-server HTTP polling validation row.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion work
have no current graph-counted lane.

The execution counter has `16,762,151` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T13:15:00Z` has `36` browser/e2e executions and `736`
unit-property executions, about `144`/hour and `2,944`/hour; protocol-server
is zero in that bucket. The preceding `2026-05-22T13:00:00Z` bucket had `132`
browser/e2e executions and `2,848` unit-property executions, about `528`/hour
and `11,392`/hour. The latest nonzero protocol-server bucket remains
`2026-05-22T12:45:00Z` with `25` executions (`100`/hour). The latest nonzero
coverage-guided lower-level bucket remains
`2026-05-21T11:00:00Z` with `2` executions.

The PR-focused data is live. The controller table has `21` distinct work items
in `27` current rows: `13` high-priority ready-product PR rows marked
published, `5` high-priority ready-product rows held by the controller, `1`
runtime-held consumed row, and repeated deferred-family diagnostic plus
needs-product-decision rows. The current push manifest is empty. The
critical-path executor has `7` blockers: `1` active, `2` runnable, `1` queued,
`1` held, and `2` terminal/downscoped. The latest PR-split feedback
keeps the fileable prefix through `PR15C` and rejects `PR16-RLH` as fileable
until strict seed `6000007` reaches the final persistence oracle and owner rows
prove it. The strict seed `6000007` repair job was launched and is still
pending. Benchmark-canary exact-stack repair is active, productive-analysis
feedback and the seed `5200005` reducer are runnable, the PR07C owner matrix is
queued, and reload-hydration is held by a single-flight manifest hold.

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
incomplete current-run accounting and as a control-plane health issue until the
active run completes a full pass. The latest sample for
`run-20260522T125322Z` was taken at `2026-05-22T13:19:19Z`; the latest
completed full pass was at `2026-05-22T13:19:19Z` with
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`, and
`full_pass_pending` `FALSE`. It carries `duplicateShareCurrent` `0` and summary
startup failures `0`, with `0` current-run signatures, `0` actionable
signatures, `0` product-evidence signatures, and current-run top duplicate
share `0`.

The earlier first-pass-pending row at `2026-05-22T12:34:41Z` was tracked
separately as incomplete accounting. The trusted rows at
`2026-05-22T12:42:33Z` and `2026-05-22T12:48:49Z` for
`run-20260522T123220Z` carried `duplicateShareCurrent` `1`, but that share had
only `1` current-run signature and `1` actionable signature, so it was a
one-signature control-plane/yield check rather than a broad duplicate/noise
rate. The completeness graph tracks pending windows and small-denominator
windows as their own control-plane health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is a
producer/scheduler leak in which benchmark-canary/P0 groups bypass duplicate
holds even after the current run already has a product-evidence representative,
so duplicate-heavy `assertion` product-evidence families can keep being
generated while downstream triage and analysis mostly cap siblings. The newest
duplicate/noise feedback-action reports that the bounded control-plane fix was
implemented: artifact scans now ignore `repos`, benchmark-canary duplicate
bypass stops once current product evidence exists, novelty was restarted, and
the post-start active-root checks saw `skipBenchmark=0`, `bypassBenchmark=0`,
and `blockBenchmark=4`. It also warns that the post-rotation sample was still a
small denominator: that feedback saw only `1` actionable signature out of `2`
raw current signatures, below the action gate minimum of `3`. The refreshed
graph has since rotated to `run-20260522T125322Z` and completed trusted
first-pass accounting with zero current/actionable/product-evidence
signatures. The right reading is no measured live duplicate/noise storm in the
latest current-output-dir row, plus a recently fixed producer-side bypass risk
to recheck after the active run accumulates a broader current-run denominator.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `85.7%` used and root is around `41.0%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,710`. Current enabled groups are
`novelty-ws-parser-transform` and `novelty-ws-real-user-coverage-bridge`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `13` browser/e2e lanes across `13` groups. Lower-level work is
narrow: `unit-property`, `coverage-guided-lower-level`, and `protocol-server`
each have one current graph-counted lane. `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current graph-counted
lane in this snapshot.

The active coverage-guided root is `run-20260522T125322Z`, and its latest
current-run accounting row is trusted. The latest graph-counted browser/e2e
rows include three novelty coverage-guided rows: parser transform,
code-editor smoke, and HTTP persistence. They also include one focused-shards
large HTTP lifecycle row, six gap-booster rows, and three strict HTTP expansion
rows for HTTP persistence, same-user stale draft, and large HTTP lifecycle.
Those rows cover persistence without title, large HTTP lifecycle, real-user
editing, three-user late join, revision, permissions/auth/locks, async/server,
long-doc, parser, code-editor smoke, and same-user stale draft coverage.
Current graph-counted lower-level rows are the rich-text CRDT unit/property
lane, a rich-text CRDT coverage-guided lower-level row whose current execution
bucket is zero, and the HTTP polling protocol-server validation row.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The newest level-mix synthesis says to
reject broad generic lower-level expansion, put the next admitted capacity into
browser/e2e because it is below the `24`-lane floor, keep `unit-property`
capped, keep coverage-guided lower-level reducer/oracle-only, restore
backend/API and protocol/server only as one-lane
sentinels after exact audited sessions exist, and count stale `fuzz-assertion`
rows as zero useful capacity. Its latest feedback-action file is empty, so this
refresh has no newer level-mix action evidence. The refreshed graph no longer
conflicts with that capacity warning: it shows only `13` current browser/e2e
lanes, below the `24`-lane floor, and the synthesis still says raw row counts
need exact root, session, PID, event, and summary reconciliation before they are
trusted as useful capacity.

The graph now shows a Code Editor smoke browser/e2e lane, but the
`code-editor-smoke` profile is still shallow at `25` records and `17`
successful records. The latest native-harness synthesis selected parser
serialization as the first isolated Node/V8 coverage-guided harness, and the
latest native-harness action implemented and validated that parser lower-level
harness with a bounded smoke run. It intentionally did not start continuous
tmux to avoid colliding with active work, so parser serialization is still not
current graph-counted lower-level residency. The only current graph-counted
coverage-guided lower-level row remains rich-text CRDT, and the current
coverage-guided lower-level execution bucket is zero.

The latest protocol-server synthesis and action converged on the HTTP polling
REST protocol harness for
`POST /wp-sync/v1/updates`. The action implemented and bounded-validated that
harness, kept productive browser fuzzing untouched, and produced a validation
protocol-server row with `25` executions. The graph shows that protocol-server
HTTP polling validation row and the `25` executions in the
`2026-05-22T12:45:00Z` bucket; the latest `13:15` bucket is zero, so protocol
telemetry is present while long-lived protocol residency remains admission- and
pressure-sensitive. The refreshed graph accepts focused-browser,
coverage-guided browser, strict HTTP, and protocol-server telemetry as present,
but it rejects treating backend/API, transport-integration, standalone
fuzz-assertion, or continuous parser/block-parser lower-level serialization as
current graph-counted residency.

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
legacy batch-count fields. The latest totals are approximately `78,894`
browser/e2e, `5,711,296` unit-property, `458,097` coverage-guided lower-level,
and `10,513,864` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T13:15:00Z` is partial and has
`36` browser/e2e executions (`144`/hour) and `736` unit-property executions
(`2,944`/hour). Protocol-server, coverage-guided lower-level, backend-api,
transport-integration, and fuzz-assertion are zero in that bucket. The
preceding `2026-05-22T13:00:00Z` bucket had `132` browser/e2e executions
(`528`/hour) and `2,848` unit-property executions (`11,392`/hour). The latest
nonzero protocol-server bucket remains `2026-05-22T12:45:00Z` with `25`
executions (`100`/hour). The latest nonzero coverage-guided lower-level bucket
remains
`2026-05-21T11:00:00Z` with `2` executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `124` likely-real
findings over about `591.2` runner-hours, or `20.98` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,303`
total candidates: `1,295` browser/e2e candidates, `6` unit-property
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
parser serialization has `11`, full-profile rows have `16`, many-user
lifecycle has `17`, multi-reload lifecycle has `37`,
long-session large-doc has `39`, common blocks have `41`, large-post
three-user HTTP has `42`, parser transform has `68`, three-user late join has
`83`, media cross-entity has `96`, block-gauntlet has `105`, async/server
blocks have `105`, and permissions/auth/locks has `224`. Code-editor smoke has
`25` records and `17` successful records. This
still argues for completion-depth repair in existing covered
surfaces before adding another broad surface class.

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
browser users, lifecycle reloads, save/autosave checkpoints, strict persistence
oracles, and a passed run. Separate ingredient-lane hits do not increment this
cross-product count. The goal-progress graph also includes nearby large-post,
HTTP, and three-user goals so already-running combined-ish lanes remain visible
while the stricter cross-product key ramps up.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is not currently marked enabled, and the adjacent large-post
three-user HTTP profile has `463` records seen with `42` successful records.
Those adjacent hits still do not count as completed combined coverage unless
the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. A run only contributes to the active-user
series when distinct browser users actually perform successful editing actions,
not merely when those users are present in the room, and final UI witness-sweep
edits do not count as active-editor evidence. The cross-product rows then
require the same active-editor threshold together with realistic editing
ingredients: save/reload lifecycle, late join, autosave, rich text/list/table
editing, synced notes, collaboration UI signals, large-document setup, HTTP
polling with an explicit client-limit override, same-user tabs, revision
restore, publish transition, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. Notes-lifecycle cross-products are also
`0` at the six- and twelve-active-editor thresholds. The refreshed lifecycle
(late-join plus save/reload/autosave), rich/list, UI-signal, and
large-document cross-product rows remain `0` at the 6/10/12/30 active-editor
thresholds, and the synced-notes rows remain `0` at the 6/12 thresholds. The
six-editor HTTP polling, HTTP client-limit override, same-user-tab,
revision-restore, and publish-transition cross-products are also `0`/`10`.
The new active-editing groups are not currently marked enabled in the sampled
state, so these graphs should remain red until the monitor admits the new six-,
twelve-, and thirty-active-editor lanes and they start producing passed
records.

Largest current unmet goal and active-editing gaps:

| Goal                                                   | Current | Target |
| ------------------------------------------------------ | ------: | -----: |
| successful parser-serialization records                |      11 |     50 |
| successful multi-reload-lifecycle records              |      37 |     50 |
| successful collaboration-ui-signals records            |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle   |       0 |     25 |
| many-user active-editing records                       |       0 |     25 |
| six-active-editor lifecycle cross-product              |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product    |       0 |     25 |
| six-active-editor UI-signal cross-product              |       0 |     25 |
| six-active-editor large-document cross-product         |       0 |     25 |
| remote selection and cursor visible                    |       1 |     25 |
| remote and local autosave checkpoints                  |      11 |     25 |
| local post recovery autosave                           |      12 |     25 |
| async/server block core/template-part                  |       0 |     20 |
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
| successful large-post HTTP records with three users    |       2 |     10 |
| action table-stale-snapshot-html                       |       4 |     10 |
| table stale snapshot over HTTP                         |       4 |     10 |
| successful three-user large documents                  |       0 |      5 |
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

The current controller state has `21` distinct work items in `27` current rows.
The most important live queue entries are `5` high-priority ready-product PR
rows held by the controller, `13` published ready-product rows still under
validation, `1` high-priority runtime-held consumed row, and repeated
deferred-family diagnostic plus needs-product-decision rows.

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
wait-only or no-progress cycles as acceptance while actionable rows remain. The
latest feedback-action says that bounded repair tmux job was launched and the
report is still pending.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: one active blocker
(`benchmark-canary-fuzzer-gap`), two runnable blockers
(`productive-analysis-action` and `seed-5200005-reducer`), one queued blocker
(`pr07c-owner-matrix`), one held blocker (`reload-hydration`), and two
terminal/downscoped blockers (`PR17` seed `1020002` and
`seed-1060015-reducer`). The current job queue has benchmark-canary exact-stack
repair active in
`rtc-critical-continuation-benchmark-canary-fuzzer-gap-20260522T125359Z`,
productive-analysis runnable, PR07C owner-matrix queued, the seed `5200005`
reducer queued for later, and reload-hydration gated by a single-flight
manifest. The repeated no-progress table currently has two
`benchmark-canary-fuzzer-gap` rows:
`zero_executor_artifact` and `pre_oracle_or_preflight_only`.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the current
coverage-guided root, resource samples, PR-focused raw inputs, and the standard
persona-loop outputs. The active coverage root is `run-20260522T125322Z`, and
its latest accounting row is trusted. The live row was sampled at
`2026-05-22T13:19:19Z`; the latest completed full pass was at
`2026-05-22T13:19:19Z` with `full_pass_pending` `FALSE`,
`pending_until_first_pass` `FALSE`, and `current_run_metrics_trusted` `TRUE`.
The latest current-output-dir metrics are `duplicateShareCurrent` `0` and
summary startup failures `0`, with `0` current-run signatures, `0` actionable
signatures, `0` product-evidence signatures, and current-run top duplicate
share `0`.

The duplicate/noise persona synthesis still matters because it rejects a
product-bug reading and points at a plausible producer-side control-plane leak:
benchmark-canary/P0 producers can keep bypassing duplicate holds after a
current-run product-evidence representative exists. It recommends a narrow
one-function novelty-monitor fix. The latest duplicate/noise feedback-action
says that fix has now been applied, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. The graph
and persona evidence agree that the latest sample should not be interpreted as
a broad product duplicate storm. The latest graph row is trusted and has zero
current signatures; the feedback-action also warned that its post-rotation
duplicate/noise sample had only `1` actionable signature out of `2` raw current
signatures. The synthesis remains evidence of a recently fixed producer-side
control-plane risk to recheck after the active run accumulates a broader
current-run signature denominator.

The resource picture is usable in the latest sample. Latest CPU utilization is
`58.47%`, with `2.66%` iowait; load is `60.54`, `48.32`, and `39.84` on `64`
logical CPUs, with `1` blocked task. The graph-counted fuzzing mix is
browser/e2e-heavy: `13` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted
useful capacity unless roots, sessions, PIDs, events, and summaries reconcile.
The refreshed graph confirms current HTTP rows, coverage-guided browser rows,
strict HTTP rows, and protocol-server telemetry. The newest level-mix synthesis
rejects broad lower-level expansion and says browser/e2e capacity should stay
at or above the `24`-lane floor; the refreshed graph is below that floor with
`13` current browser/e2e lanes, and the synthesis still rejects trusting raw
row counts without exact materialization/accounting evidence. It now shows a
Code Editor smoke lane, but that profile is still shallow at `25` records and
`17` successes. It has no backend/API lane, no
backend/API execution count, no transport-integration lane, no standalone
fuzz-assertion row, no continuous parser/block-parser lower-level row, and zero
current-bucket coverage-guided lower-level executions. The latest
native-harness action implemented and smoke-validated parser serialization but
left continuous tmux stopped, so it is not graph-counted live residency.
Protocol-server HTTP polling was implemented and bounded-validated, with
current graph telemetry but no latest-bucket executions.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T13:15:00Z` bucket has `36` browser/e2e executions, `736`
unit-property executions, and zero protocol-server executions. The preceding
`2026-05-22T13:00:00Z` bucket shows `132` browser/e2e executions and `2,848`
unit-property executions; the latest nonzero protocol-server bucket remains
`2026-05-22T12:45:00Z` with `25` executions. Lower-level counts remain
approximate where reconstructed from batch metadata or legacy batch-count
fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it; the corresponding repair
job has been launched and is pending. The PR loop still needs to convert held
ready-product rows, the runnable seed `5200005` reducer, queued PR07C owner
matrix, held reload-hydration work, active benchmark-canary exact-stack repair,
and runnable productive-analysis feedback into validated publishable branches
rather than more blocked or no-progress
artifacts. Benchmark-canary is active again as an exact-stack repair blocker,
and the no-progress table still rejects two earlier benchmark-canary artifacts.
