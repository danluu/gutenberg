# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T16:10:41Z`

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

The monitor data is current through `2026-05-22T16:09:00Z`, and the latest
current-run accounting row was sampled at `2026-05-22T16:09:09Z` for
`run-20260522T151953Z`. That active run has completed a trusted current-run
accounting pass: `current_run_metrics_trusted` is `TRUE`,
`pending_until_first_pass` is `FALSE`, and `full_pass_pending` is `FALSE`. The
monitor has `4,033` passes from `2026-05-15T01:21:42Z` onward. Cumulative
coverage record observations are `278,936`; current-scan coverage files are
`2,223`. The parsed coverage-goal table still has `19` unmet target rows out
of `137`.

The live duplicate/noise signal is current-output-dir accounting. The latest
current-output-dir row carries completed-pass `duplicateShareCurrent` `0.3333`,
summary startup failures `0`, `3` current-run signatures, `3` actionable
signatures, `3` product-evidence signatures, and top duplicate share `0.3333`.
That is a trusted but still small current-run denominator: one duplicate family
among three actionable signatures is a control-plane health watch, not evidence
for a broad product duplicate/noise storm. Historical duplicate share is
`0.1765` for context; it is not the plotted live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak: benchmark-canary/P0 groups can bypass duplicate/noise holds
after they already have a current-run product-evidence representative. The
newest duplicate/noise feedback-action says that bounded fix was applied: repo
artifact scans now ignore `repos`, and benchmark-canary duplicate-bypass stops
once current product evidence exists. Those persona-loop files conflict on
whether the fix has fully taken effect in the live loop, so the refreshed
graph should be read as a control-plane health watch rather than a product-bug
or broad duplicate-storm conclusion.

Resource state is usable in the latest sample, with short load just over the
core count and iowait lower than the previous sample but still nonzero. The
latest monitor sample has `393.5G` free memory; the latest disk sample has
`90.6GiB` free on `/` and `487.0GiB` free on
`/media/volume/danluu-fuzz-data`. Latest CPU utilization is `65.99%`, with
`4.03%` iowait. Latest load averages are `67.14`, `62.27`, and `56.99` on
`64` logical CPUs, with `2` blocked tasks in the same sample.

The latest graph-counted fuzzing mix has `16` browser/e2e lanes across `16`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` row,
and one `protocol-server` lane. Live graph-counted fuzzing is still
concentrated in browser/e2e and remains below the persona loop's `24`-lane
browser/e2e floor. Current graph-counted lower-level work is narrow: rich-text
CRDT unit/property, a stale rich-text CRDT coverage-guided lower-level row with
no current execution bucket, and a protocol-server HTTP polling row.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion work
have no current graph-counted lane.

The execution counter has `16,808,178` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T16:00:00Z` has `73` browser/e2e executions, `1,888`
unit-property executions, and `1,140` protocol-server executions, about
`292`/hour, `7,552`/hour, and `4,560`/hour. The preceding
`2026-05-22T15:45:00Z` bucket had `75` browser/e2e executions, `2,720`
unit-property executions, and `1,645` protocol-server executions, about
`300`/hour, `10,880`/hour, and `6,580`/hour. The prior
`2026-05-22T15:30:00Z` bucket had `72` browser/e2e executions, `2,816`
unit-property executions, and `1,705` protocol-server executions, about
`288`/hour, `11,264`/hour, and `6,820`/hour. The latest nonzero
protocol-server bucket is `2026-05-22T16:00:00Z`. The latest nonzero
coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with `2`
executions.

The PR-focused data is live. The controller table has `21` distinct work items
in `27` current rows: `13` high-priority ready-product PR rows marked
published, `5` high-priority ready-product rows held by the controller, `1`
runtime-held consumed row, and repeated deferred-family diagnostic plus
needs-product-decision rows. The current push manifest is empty. The
critical-path executor has `7` blockers: `2` runnable, `1` queued, `1` active,
`1` held, and `2` terminal/downscoped. The benchmark-canary exact-stack repair
and productive-analysis action are runnable, seed `5200005` is active, and the
PR07C owner matrix is queued. The latest PR-split feedback keeps the fileable
prefix through `PR15C` and rejects `PR16-RLH` as fileable until strict seed
`6000007` reaches the final persistence oracle and owner rows prove it. The
strict seed `6000007` repair job was launched and is still pending.
Reload-hydration is held by a single-flight manifest hold.

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
`run-20260522T151953Z` was taken at `2026-05-22T16:09:09Z`; it reports
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`, and
`full_pass_pending` `FALSE`. The latest completed monitor pass was at
`2026-05-22T16:09:00Z`, and the latest completed current-run accounting pass
was at `2026-05-22T16:08:59Z`. This row carries completed
`duplicateShareCurrent` `0.3333`
and summary startup failures `0`, with `3`
current-run signatures, `3` actionable signatures, `3` product-evidence
signatures, and top duplicate share `0.3333`. The right reading is a trusted
current-output-dir health sample with a three-actionable-signature denominator,
not a measured broad product duplicate/noise rate.

The previous active run, `run-20260522T142103Z`, had small-denominator trusted
samples before the roll. At `2026-05-22T14:46:35Z`, `duplicateShareCurrent` was
`1` on only `1` current signature and `1` actionable signature; at
`2026-05-22T14:37:35Z`, it was `0.3333` on `3` current and `3` actionable
signatures. Those rows show why the report keeps the signature/actionable
signature denominator next to a high duplicate share: a one-signature
denominator is not a broad duplicate storm. The intermediate
`run-20260522T150117Z` samples were also trusted and empty-denominator. The
completeness graph tracks pending or incomplete accounting as its own health
signal instead of folding it into the measured product duplicate/noise rate.

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
and `blockBenchmark=4`. The later synthesis still describes the same leak as
the remaining root cause, so the standard persona-loop evidence is
contradictory on whether the control-plane fix has fully taken effect. The
feedback-action also warns that the post-rotation sample was still a
small denominator: that feedback saw only `1` actionable signature out of `2`
raw current signatures, below the action gate minimum of `3`. The same active
run had an earlier trusted empty-denominator row at `2026-05-22T15:23:33Z`,
a one-signature row at `2026-05-22T15:35:10Z`, and a three-signature row at
`2026-05-22T15:52:10Z`; a later `2026-05-22T16:00:53Z` row was `0.5` on a
two-actionable-signature denominator. The latest trusted row at
`2026-05-22T16:09:09Z` now has `duplicateShareCurrent` `0.3333` on only `3`
current signatures and `3` actionable signatures, with `3` product-evidence
signatures and top duplicate share `0.3333`. That is still a small denominator:
no broad measured product duplicate/noise storm, plus a current-run accounting
watch as the active run accumulates more actionable signatures.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `86.3%` used and root is around `41.1%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,741`. Current enabled groups are
`novelty-http-title-reload-convergence`,
`novelty-http-existing-post-crdt-metadata`,
`novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`,
and `novelty-http-large-post-readiness`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `16` browser/e2e lanes across `16` groups. Lower-level work is
narrow: `unit-property`, `coverage-guided-lower-level`, and `protocol-server`
each have one current graph-counted lane. `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current graph-counted
lane in this snapshot.

The active coverage-guided root is `run-20260522T151953Z`, and its latest
current-run accounting row is trusted with `duplicateShareCurrent` `0.3333` on
a three-actionable-signature denominator. The latest graph-counted browser/e2e
rows include six coverage-guided rows, one focused HTTP row, six gap-booster
rows, and three strict HTTP expansion rows for HTTP persistence, same-user
stale draft, and large HTTP lifecycle. Those rows cover parser transform,
title reload, existing-post CRDT metadata, persistence probe, large-post
three-user HTTP lifecycle, focused large HTTP readiness, large-post readiness,
real-user editing, three-user late join, revision, permissions/auth/locks,
async/server, long-doc, HTTP persistence, same-user stale draft, and large HTTP
lifecycle coverage.
Current graph-counted lower-level rows are the rich-text CRDT unit/property
lane, a stale rich-text CRDT coverage-guided lower-level row whose current
execution bucket is zero, and an HTTP polling protocol-server row sampled at
`2026-05-22T15:45:57Z`.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix synthesis rejects
broad lower-level expansion, keeps `unit-property` capped at one smoke lane,
counts stale `fuzz-assertion` as zero useful capacity, and says browser/e2e
should backfill toward the `24`-lane floor with hard-readiness or focused HTTP
work. The latest non-empty level-mix feedback-action partly disagrees on
sequencing by reporting a bounded lower-level/API/server action: a
table-query-array coverage-guided run produced an oracle artifact, backend/API
and protocol/server sentinels were relaunched, and broad parser expansion was
rejected. The graph is the live residency check. It confirms protocol-server
telemetry and recent browser events, but still has no graph-counted
`backend-api`, `transport-integration`, standalone `fuzz-assertion`, or
current-bucket coverage-guided lower-level execution. Treat backend/API and
table-query-array lower-level reports as action evidence until graph-visible
residency or execution buckets appear.

The latest native-harness synthesis still selects block parser serialization as
the first isolated Node/V8 coverage-guided lower-level harness and says to land
that narrow target before broader lower-level expansion. Parser serialization
has `90` records and `20` successful records in the graph, and the latest
native-harness action says the block-parser harness was implemented and
smoke-validated with V8 coverage and required `coverage-guided-lower-level`
event accounting. It also says no unbounded tmux lane was started because the
production parser base is held for duplicate no-yield parser failures. The
current graph therefore still rejects treating block-parser serialization as
live lower-level residency.

The latest protocol-server synthesis converged on the HTTP polling REST
protocol harness for `POST /wp-sync/v1/updates`. The refreshed graph has a
validation protocol-server row and `1,140` executions in the latest partial
`2026-05-22T16:00:00Z` bucket, after `1,645` executions at
`2026-05-22T15:45:00Z` and `1,705` at `2026-05-22T15:30:00Z`. The newest
protocol action says the HTTP polling REST harness was implemented and
validated with root/lane `seed-attempt-complete` events and
`fuzzLevel:"protocol-server"` metadata, so the graph and action agree that
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
legacy batch-count fields. The latest totals are approximately `78,748`
browser/e2e, `5,739,424` unit-property, `458,097` coverage-guided lower-level,
and `10,531,909` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T16:00:00Z` is partial and has
`73` browser/e2e executions (`292`/hour), `1,888` unit-property executions
(`7,552`/hour), and `1,140` protocol-server executions (`4,560`/hour);
coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The preceding
`2026-05-22T15:45:00Z` bucket had `75` browser/e2e executions (`300`/hour),
`2,720` unit-property executions (`10,880`/hour), and `1,645`
protocol-server executions (`6,580`/hour). The prior
`2026-05-22T15:30:00Z` bucket had `72` browser/e2e executions (`288`/hour),
`2,816` unit-property executions (`11,264`/hour), and `1,705`
protocol-server executions (`6,820`/hour). The
`2026-05-22T15:15:00Z` bucket had `70` browser/e2e executions (`280`/hour),
`2,912` unit-property executions (`11,648`/hour), and `1,980`
protocol-server executions (`7,920`/hour). The latest
nonzero protocol-server bucket is `2026-05-22T16:00:00Z`. The latest
nonzero coverage-guided lower-level bucket remains
`2026-05-21T11:00:00Z` with `2` executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `125` likely-real
findings over about `539.8` runner-hours, or `23.16` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,128`
total candidates: `1,120` browser/e2e candidates, `6` unit-property
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
`45`, code-editor smoke has `64`, parser transform has `68`, three-user
late join has `96`, block-gauntlet has `106`, media cross-entity has `111`,
async/server blocks have `136`, and permissions/auth/locks has `265`. This
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
combined group is currently marked enabled, and the adjacent large-post
three-user HTTP profile has `550` records seen with `45` successful records.
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
| successful parser-serialization records                |      20 |     50 |
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
| successful large-post HTTP records with three users    |       3 |     10 |
| action table-stale-snapshot-html                       |       4 |     10 |
| table stale snapshot over HTTP                         |       4 |     10 |
| successful three-user large documents                  |       1 |      5 |
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

The critical-path executor has `7` blockers: two runnable blockers
(`benchmark-canary-fuzzer-gap` and `productive-analysis-action`), one active
reducer (`seed-5200005-reducer`), one queued owner-evidence blocker
(`pr07c-owner-matrix`), one held deferred-family blocker (`reload-hydration`),
and two terminal/downscoped blockers (`PR17` seed `1020002` and
`seed-1060015-reducer`). The current job queue has benchmark-canary
exact-stack repair and productive-analysis runnable, seed `5200005` active,
PR07C owner-matrix queued, and reload-hydration gated by a single-flight
manifest. The repeated no-progress table currently has three
`benchmark-canary-fuzzer-gap` rows: `exact_stack_promotion_blocked_without_active_repair`,
`pre_oracle_or_preflight_only`, and `zero_executor_artifact`.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the current
coverage-guided root, resource samples, PR-focused raw inputs, and the standard
persona-loop outputs. The active coverage root is `run-20260522T151953Z`, and
its latest accounting row is trusted. The live row was sampled at
`2026-05-22T16:09:09Z`; the latest completed monitor pass was at
`2026-05-22T16:09:00Z`, and the latest completed current-run accounting pass
was at `2026-05-22T16:08:59Z`, with `full_pass_pending` `FALSE`,
`pending_until_first_pass` `FALSE`, and `current_run_metrics_trusted` `TRUE`.
The row carries completed `duplicateShareCurrent` `0.3333` and summary startup
failures `0`; the current-run signature/actionable-signature denominator is
`3`/`3`, with `3` product-evidence signatures and top duplicate share
`0.3333`. That is a trusted current-output-dir health signal with a small
current-run denominator, not a measured broad product duplicate/noise rate. The
previous run had high-looking duplicate shares on tiny trusted denominators,
including `1`/`1` at `2026-05-22T14:46:35Z`; the accounting-completeness graph
keeps that denominator and any pending state separate from measured product
noise.

The duplicate/noise persona synthesis still matters because it rejects a
product-bug reading and points at a plausible producer-side control-plane leak:
benchmark-canary/P0 producers can keep bypassing duplicate holds after a
current-run product-evidence representative exists. It recommends a narrow
one-function novelty-monitor fix. The latest duplicate/noise feedback-action
says that fix has now been applied, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. Because the
later synthesis still names the leak as remaining, the persona-loop evidence
rejects a broad product duplicate-storm reading but does not fully clear the
control-plane risk. The live health issue is watching whether the control-plane
fix holds as the denominator grows, not a measured broad duplicate/noise rate.

The resource picture is usable in the latest sample, but the short load sample
is just over the core count: latest CPU utilization is `65.99%`, with `4.03%`
iowait; load is `67.14`, `62.27`, and `56.99` on `64` logical CPUs, with `2`
blocked tasks. The
graph-counted fuzzing mix is browser/e2e-heavy: `16` browser/e2e lanes, plus
one lane each for unit-property, coverage-guided lower-level, and
protocol-server. Persona evidence is stricter than the graph and rejects raw
row counts as trusted useful capacity unless roots, sessions, PIDs, events,
and summaries reconcile. The refreshed graph confirms current coverage-guided
browser HTTP/readiness rows, one focused large-HTTP readiness row, gap-booster
rows, strict HTTP rows, and protocol-server telemetry. The latest level-mix
synthesis rejects broad lower-level expansion and says browser/e2e capacity
should backfill toward the `24`-lane floor. The refreshed graph is below that
floor with `16` current browser/e2e lanes. Parser serialization is still shallow at `90` records and
`20` successes. There is no backend/API lane or execution count, no
transport-integration lane, no standalone fuzz-assertion row, no continuous
parser/block-parser lower-level row, and zero current-bucket coverage-guided
lower-level executions. The latest native-harness action says the block-parser
harness was smoke-validated, but no unbounded tmux lane was started, so it is
not graph-counted live lower-level residency. Protocol-server HTTP polling has
current graph telemetry and `1,140` executions in the latest partial
protocol-server bucket, and the protocol action says the REST harness now emits
the expected root/lane events. The level-mix feedback-action says backend/API
and protocol/server sentinels were relaunched and table-query-array lower-level
work found an oracle artifact, but the graph only confirms protocol-server
telemetry in the latest snapshot. Backend/API and lower-level expansion
evidence should remain provisional until graph-visible residency or execution
buckets appear.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T16:00:00Z` bucket has `73` browser/e2e executions, `1,888`
unit-property executions, and `1,140` protocol-server executions. The preceding
`2026-05-22T15:45:00Z` bucket shows `75` browser/e2e executions, `2,720`
unit-property executions, and `1,645` protocol-server executions; the latest
nonzero protocol-server bucket is `2026-05-22T16:00:00Z`. Lower-level counts
remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

Coverage-goal pressure is unchanged at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `550` records and
`45` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds; those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it; the corresponding repair
job has been launched and is pending. The PR loop still needs to convert held
ready-product rows, runnable benchmark-canary exact-stack repair, active seed
`5200005` reducer, queued PR07C owner matrix, held reload-hydration work, and
runnable productive-analysis feedback into validated publishable branches
rather than more blocked or no-progress artifacts. Benchmark-canary exact-stack
repair and productive-analysis are runnable, seed `5200005` is active, PR07C
owner matrix is queued, reload-hydration is gated by a single-flight manifest,
and the no-progress table rejects three benchmark-canary artifacts.
