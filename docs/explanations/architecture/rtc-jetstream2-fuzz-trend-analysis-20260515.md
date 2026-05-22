# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T13:52:54Z`

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

The monitor data is current through `2026-05-22T13:51:37Z`, and the latest
current-run accounting row was sampled at `2026-05-22T13:52:01Z` for
`run-20260522T134741Z`. That active run has completed a trusted full pass:
`current_run_metrics_trusted` is `TRUE`, `pending_until_first_pass` is `FALSE`,
and `full_pass_pending` is `FALSE`. The monitor has `3,988` passes from
`2026-05-15T01:21:42Z` onward. Cumulative coverage record observations are
`278,377`; current-scan coverage files are `1,921`. The parsed coverage-goal
table still has `19` unmet target rows out of `137`.

The live duplicate/noise signal is current-output-dir accounting. The latest
current-output-dir row carries `duplicateShareCurrent` `0` and summary startup
failures `0`. That row has `0` current-run signatures, `0` actionable
signatures, `0` product-evidence signatures, and current-run top duplicate
share `0`, so it is a trusted but empty-denominator current-output-dir health
sample rather than a measured product duplicate/noise rate. Historical
duplicate share is `0.2` for context; it is not the plotted live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak: benchmark-canary/P0 groups can bypass duplicate/noise holds
after they already have a current-run product-evidence representative. The
newest duplicate/noise feedback-action says that bounded fix was applied: repo
artifact scans now ignore `repos`, and benchmark-canary duplicate-bypass stops
once current product evidence exists.

Resource state is usable in the latest sample. The latest monitor sample has
`407.7G` free memory; the latest disk sample has `90.7GiB` free on `/` and
`495.1GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`51.27%`, with `3.51%` iowait. Latest load averages are `51.16`, `44.4`, and
`43.98` on `64` logical CPUs, with `2` blocked tasks in the same sample.

The latest graph-counted fuzzing mix has `18` browser/e2e lanes across `18`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing is still
concentrated in browser/e2e, but it is below the persona loop's `24`-lane
browser/e2e floor. Current graph-counted lower-level work is narrow:
rich-text CRDT unit/property, a rich-text CRDT coverage-guided lower-level
row with no current execution bucket, and a protocol-server HTTP polling
sentinel row.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion work
have no current graph-counted lane.

The execution counter has `16,772,153` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T13:45:00Z` has `269` browser/e2e executions, `1,376`
unit-property executions, and `1,165` protocol-server executions, about
`1,076`/hour, `5,504`/hour, and `4,660`/hour. The preceding
`2026-05-22T13:30:00Z` bucket had `91` browser/e2e executions, `2,464`
unit-property executions, and `2,220` protocol-server executions, about
`364`/hour, `9,856`/hour, and `8,880`/hour. The latest nonzero
protocol-server bucket is now `2026-05-22T13:45:00Z`. The latest nonzero
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
pending. Benchmark-canary exact-stack repair is active, the seed `5200005`
reducer and productive-analysis feedback are runnable, the PR07C owner matrix
is queued, and reload-hydration is held by a single-flight manifest hold.

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
`run-20260522T134741Z` was taken at `2026-05-22T13:52:01Z`; the latest
completed full pass was at `2026-05-22T13:51:37Z` with
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`, and
`full_pass_pending` `FALSE`. It carries latest completed
`duplicateShareCurrent` `0` and summary startup failures `0`, with `0`
current-run signatures, `0` actionable signatures, `0` product-evidence
signatures, and current-run top duplicate share `0`.

The earlier first-pass-pending row at `2026-05-22T13:27:03Z` for
`run-20260522T132644Z` was tracked separately as incomplete accounting and was
superseded by trusted full-pass rows. The trusted `2026-05-22T13:44:03Z` row
for that prior run carried `duplicateShareCurrent` `0.25`, but its
current-run/actionable denominator was only `4`, so it was a small-denominator
control-plane/yield check rather than a broad duplicate/noise rate. The latest
`13:52:01Z` row has a zero duplicate share and a zero current-run/actionable
denominator, so it should be read as no current-output-dir duplicate evidence
yet, not as a measured product duplicate/noise rate.

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
graph has since rolled to `run-20260522T134741Z` and completed trusted
accounting with `0` current/actionable signatures. The right reading is no
broad measured product duplicate/noise storm, plus an empty-denominator
current-output-dir signal that should be watched until the active run
accumulates actionable signatures.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `86.0%` used and root is around `41.1%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,712`. Current enabled groups are
`novelty-ws-code-editor-smoke`, `novelty-http-existing-post-crdt-metadata`,
`novelty-http-persistence-probe`, `novelty-http-large-post-lifecycle`,
`novelty-http-large-post-lifecycle-completion`, and
`novelty-ws-parser-serialization`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `18` browser/e2e lanes across `18` groups. Lower-level work is
narrow: `unit-property`, `coverage-guided-lower-level`, and `protocol-server`
each have one current graph-counted lane. `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current graph-counted
lane in this snapshot.

The active coverage-guided root is `run-20260522T134741Z`, and its latest
current-run accounting row is trusted. The latest graph-counted browser/e2e
rows include six coverage-guided rows: parser serialization, code-editor
smoke, large-post lifecycle, large-post lifecycle completion, existing-post
CRDT metadata, and HTTP persistence probe. They also include three
focused-shards HTTP rows, six gap-booster rows, and three strict HTTP expansion
rows for HTTP persistence, same-user stale draft, and large HTTP lifecycle.
Those rows cover persistence without title, large HTTP lifecycle, real-user
editing, three-user late join, revision, permissions/auth/locks, async/server,
long-doc, parser serialization, code-editor smoke, and same-user stale draft
coverage.
Current graph-counted lower-level rows are the rich-text CRDT unit/property
lane, a rich-text CRDT coverage-guided lower-level row whose current execution
bucket is zero, and an HTTP polling protocol-server sentinel row.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The newest level-mix synthesis says to
reject broad generic lower-level expansion, put the next admitted capacity into
browser/e2e because it is below the `24`-lane floor, keep `unit-property`
capped, keep coverage-guided lower-level reducer/oracle-only, restore
backend/API and protocol/server only as one-lane
sentinels after exact audited sessions exist, and count stale `fuzz-assertion`
rows as zero useful capacity. Its latest feedback-action says `unit-property`
remains capped at one lane, browser/protocol/backend control lanes were
restarted, and a bounded HTTP polling coverage-guided lower-level manager run
was launched. The refreshed graph only partly agrees: it shows `18` current
browser/e2e lanes, still below the `24`-lane floor, and protocol-server
telemetry is present, but there is still no graph-counted `backend-api` lane or
execution bucket, and the current coverage-guided lower-level execution bucket
is zero. Treat the HTTP polling lower-level action as persona-loop evidence
that has not yet appeared as current graph-counted lower-level residency.

The graph now shows parser serialization as a browser/e2e coverage-guided lane,
while the latest native-harness synthesis selected block parser serialization
as the first isolated Node/V8 coverage-guided lower-level harness. The latest
native-harness action implemented and smoke-validated that harness, but left
the continuous tmux lane stopped because the active hold reported duplicate
known failures with no new coverage/features. Parser serialization has `87`
records and `18` successful records. It is current browser/e2e residency, not
current graph-counted lower-level residency. The only current graph-counted
coverage-guided lower-level row remains rich-text CRDT, and the current
coverage-guided lower-level execution bucket is zero.

The latest protocol-server synthesis and action converged on the HTTP polling
REST protocol harness for
`POST /wp-sync/v1/updates`. The action implemented and bounded-validated that
harness, kept productive browser fuzzing untouched, and produced a validation
protocol-server row. The refreshed graph now also has a protocol-server
sentinel row and `1,165` executions in the `2026-05-22T13:45:00Z` bucket, so
protocol telemetry is present while long-lived protocol residency remains
admission- and pressure-sensitive. The refreshed graph accepts focused-browser,
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
legacy batch-count fields. The latest totals are approximately `78,674`
browser/e2e, `5,717,088` unit-property, `458,097` coverage-guided lower-level,
and `10,518,294` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T13:45:00Z` is partial and has
`269` browser/e2e executions (`1,076`/hour), `1,376` unit-property executions
(`5,504`/hour), and `1,165` protocol-server executions (`4,660`/hour).
Coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The preceding
`2026-05-22T13:30:00Z` bucket had `91` browser/e2e executions (`364`/hour),
`2,464` unit-property executions (`9,856`/hour), and `2,220`
protocol-server executions (`8,880`/hour). The latest nonzero protocol-server
bucket is now `2026-05-22T13:45:00Z`. The latest nonzero
coverage-guided lower-level bucket remains
`2026-05-21T11:00:00Z` with `2` executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `124` likely-real
findings over about `569.0` runner-hours, or `21.79` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,270`
total candidates: `1,262` browser/e2e candidates, `6` unit-property
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
parser serialization has `18`, full-profile rows have `16`, many-user
lifecycle has `17`, code-editor smoke has `25`, multi-reload lifecycle has
`37`, long-session large-doc has `39`, common blocks have `41`, large-post
three-user HTTP has `42`, parser transform has `68`, media cross-entity has
`101`, three-user late join has `96`, block-gauntlet has `105`, async/server
blocks have `136`, and permissions/auth/locks has `265`. This
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
three-user HTTP profile has `479` records seen with `42` successful records.
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
| successful parser-serialization records                |      18 |     50 |
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
| successful large-post HTTP records with three users    |       1 |     10 |
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
`rtc-critical-continuation-benchmark-canary-fuzzer-gap-20260522T132430Z`,
productive-analysis and the seed `5200005` reducer runnable, PR07C owner-matrix
queued, and reload-hydration gated by a single-flight manifest. The repeated
no-progress table currently has two
`benchmark-canary-fuzzer-gap` rows:
`zero_executor_artifact` and `pre_oracle_or_preflight_only`.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the current
coverage-guided root, resource samples, PR-focused raw inputs, and the standard
persona-loop outputs. The active coverage root is `run-20260522T134741Z`, and
its latest accounting row is trusted. The live row was sampled at
`2026-05-22T13:52:01Z`; the latest completed full pass was at
`2026-05-22T13:51:37Z` with `full_pass_pending` `FALSE`,
`pending_until_first_pass` `FALSE`, and `current_run_metrics_trusted` `TRUE`.
The latest completed current-output-dir metrics are `duplicateShareCurrent`
`0` and summary startup failures `0`, with `0` current-run signatures, `0`
actionable signatures, and `0` product-evidence signatures. That is a trusted
but empty-denominator current-output-dir row, not a broad product-duplicate
measurement.

The duplicate/noise persona synthesis still matters because it rejects a
product-bug reading and points at a plausible producer-side control-plane leak:
benchmark-canary/P0 producers can keep bypassing duplicate holds after a
current-run product-evidence representative exists. It recommends a narrow
one-function novelty-monitor fix. The latest duplicate/noise feedback-action
says that fix has now been applied, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. The graph
and persona evidence agree that the latest sample should not be interpreted as
a broad product duplicate storm. The feedback-action also warned that its
post-rotation duplicate/noise sample had only `1` actionable signature out of
`2` raw current signatures, and the refreshed graph now has a zero-signature
current/actionable denominator. The synthesis remains evidence of a recently
fixed producer-side control-plane risk; the live health issue now is
empty-denominator current-output-dir accounting, not a measured broad
duplicate/noise rate.

The resource picture is usable in the latest sample. Latest CPU utilization is
`51.27%`, with `3.51%` iowait; load is `51.16`, `44.4`, and `43.98` on `64`
logical CPUs, with `2` blocked tasks. The graph-counted fuzzing mix is
browser/e2e-heavy: `18` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted
useful capacity unless roots, sessions, PIDs, events, and summaries reconcile.
The refreshed graph confirms current HTTP rows, coverage-guided browser rows,
strict HTTP rows, and protocol-server telemetry. The newest level-mix synthesis
rejects broad lower-level expansion and says browser/e2e capacity should stay
at or above the `24`-lane floor; the refreshed graph is below that floor with
`18` current browser/e2e lanes, and the synthesis still rejects trusting raw
row counts without exact materialization/accounting evidence. It now shows a
parser-serialization browser/e2e lane, but that profile is still shallow at
`87` records and `18` successes. It has no backend/API lane, no
backend/API execution count, no transport-integration lane, no standalone
fuzz-assertion row, no continuous parser/block-parser lower-level row, and zero
current-bucket coverage-guided lower-level executions. The latest
native-harness synthesis selected block parser serialization as the first
isolated lower-level harness; the latest action implemented and smoke-validated
it, but continuous residency remains stopped under the duplicate/no-new-coverage
hold, so it is not graph-counted live lower-level residency. Protocol-server
HTTP polling was implemented and bounded-validated, with current graph telemetry
and `1,165` latest-bucket executions. The level-mix feedback-action says
backend/API and lower-level HTTP polling work were also restored or launched,
but the refreshed graph does not yet count a backend/API lane or a current
coverage-guided lower-level execution bucket, so that feedback should be treated
as contradictory action evidence pending graph-visible residency.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T13:45:00Z` bucket has `269` browser/e2e executions, `1,376`
unit-property executions, and `1,165` protocol-server executions. The preceding
`2026-05-22T13:30:00Z` bucket shows `91` browser/e2e executions, `2,464`
unit-property executions, and `2,220` protocol-server executions; the latest
nonzero protocol-server bucket is now `2026-05-22T13:45:00Z`. Lower-level
counts remain approximate where
reconstructed from batch metadata or legacy batch-count fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it; the corresponding repair
job has been launched and is pending. The PR loop still needs to convert held
ready-product rows, the runnable seed `5200005` reducer, queued PR07C owner
matrix, held reload-hydration work, active benchmark-canary exact-stack repair,
and runnable productive-analysis feedback into validated publishable branches
rather than more blocked or no-progress artifacts. Benchmark-canary remains the
active critical blocker, and the no-progress table still rejects two earlier
benchmark-canary artifacts.
