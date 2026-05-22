# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T07:32:51Z`

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

The monitor data is current through `2026-05-22T07:24:47Z`, and the latest
current-run accounting row was sampled at `2026-05-22T07:31:35Z` for
`run-20260522T064303Z`. That row is trusted:
`current_run_metrics_trusted` is `TRUE`, `pending_until_first_pass` is `FALSE`,
and `full_pass_pending` is `FALSE`. The monitor has `3,931` passes from
`2026-05-15T01:21:42Z` onward. Cumulative coverage record observations are
`276,315`; current-scan coverage files are `1,375`. The parsed coverage-goal
table has `20` unmet target rows out of `136`.

The live duplicate/noise signal is current-output-dir accounting. The latest
trusted current-run row reports `duplicateShareCurrent` `0`, current-run top
duplicate share `0`, summary startup failures `0`, and current-run
signature/actionable-signature/product-evidence denominators of `0`/`0`/`0`.
Historical duplicate share is `0.1579` for context only; it is not the plotted
live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a producer/scheduler
control-plane leak around no-product startup failures. The latest
feedback-action file is empty. The refreshed graph contradicts a live
startup-storm reading: current-run accounting is trusted, summary startup
failures are `0`, and there are no current-run actionable or product-evidence
signatures. This report treats the startup-leak synthesis as a control-plane
watchpoint rather than as the current measured duplicate/noise rate.

Resource state is usable but pressure-sensitive. The latest monitor sample has
`403.8G` free memory; the latest disk sample has `91.2GiB` free on `/` and
`572.3GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU utilization is
`68.05%`, with `4.38%` iowait. Latest load averages are `47.97`, `53.40`, and
`54.19` on `64` logical CPUs, with `1` blocked task in the same sample.

The latest graph-counted fuzzing mix has `28` browser/e2e lanes across `28`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. Live graph-counted fuzzing remains
concentrated in browser/e2e. Current graph-counted lower-level work is narrow:
rich-text CRDT unit/property, the old rich-text CRDT coverage-guided lower-level
smoke row, and a protocol-server HTTP polling row. `transport-integration`,
`backend-api`, and standalone fuzz-only assertion work have no current
graph-counted lane.

The execution counter has `16,643,081` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T07:30:00Z` has `82` browser/e2e executions, `416` unit-property
executions, and `450` protocol-server executions, about `328`/hour,
`1,664`/hour, and `1,800`/hour. The preceding bucket had `1,704` browser/e2e,
`2,976` unit-property, and `3,085` protocol-server executions. The latest
nonzero coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z`
with `2` executions.

The PR-focused data is live. The controller table has `21` distinct work items:
`13` high-priority ready-product PR rows marked published, `5` high-priority
ready-product rows held by the controller, `1` runtime-held consumed row, and
deferred-family diagnostic/needs-product-decision rows. The current push
manifest is empty. The critical-path executor has `7` blockers: `3` runnable,
`1` queued, `1` held, and `2` terminal/downscoped. The latest PR-split
feedback keeps the fileable prefix through `PR15C` and rejects `PR16-RLH` as
fileable until strict seed `6000007` reaches the final persistence oracle and
owner rows prove it.

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
`run-20260522T064303Z` was taken at `2026-05-22T07:31:35Z` with
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`, and
`full_pass_pending` `FALSE`. The active current-run signature,
actionable-signature, and product-evidence denominators are `0`/`0`/`0`, and
the current-run top duplicate share is `0`. The latest completed monitor pass
was at `2026-05-22T07:24:47Z` and reports completed-pass duplicate share `0`,
with summary startup failures `0`.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says strict `pre_action_bootstrap_stall`
noise is mostly suppressed by triage and analysis consumers, but producer and
scheduler paths can still keep or re-materialize no-product startup groups
through short supervisor cooldowns, novelty/materialization floors, forced
publication, and inconsistent current-run scoping. The latest feedback-action
file is empty. The newest accounting row is trusted and shows zero current-run
signatures and zero startup failures, so the graph does not show a live
no-product startup storm. The synthesis remains useful as a control-plane
watchpoint if no-product startup groups re-enter the current output directory.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `83.8%` used and root is around `40.7%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,679`. The current enabled group
summary lists `novelty-ws-real-user-coverage-bridge` and
`novelty-ws-parser-transform`. The latest parsed enabled-group events
refreshed `novelty-http-existing-post-crdt-metadata`,
`novelty-http-persistence-probe`, `novelty-http-large-post-lifecycle`, and
`novelty-http-large-post-lifecycle-completion` at `2026-05-22T07:30:02Z`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `28` browser/e2e lanes across `28` groups. Lower-level work is
active but narrow: `unit-property`, `coverage-guided-lower-level`, and
`protocol-server` each have one current graph-counted lane.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

The active coverage-guided root, `run-20260522T064303Z`, has current
graph-counted novelty rows for WS parser transform, HTTP large-post lifecycle,
HTTP large-post lifecycle completion, HTTP existing-post CRDT metadata, and
HTTP persistence probe. Current browser/e2e rows also come from focused,
strict-expansion, and gap-booster lanes, including focused HTTP title reload,
existing-post CRDT, large HTTP lifecycle, real-user, three-user late join,
revision, parser, block-gauntlet, common-blocks, multi-reload, many-user,
collaboration UI, async/server, permissions, long-session, persistence, and
same-user stale-draft coverage.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The newest level-mix synthesis says to
avoid broad generic lower-level expansion, keep backend/API, protocol/server,
unit/property, and lower-level HTTP at sentinel/capped budgets, and first fix
benchmark-canary feedback preservation plus forced HTTP materialization. It
also says graph telemetry is currently inconsistent: title reload can be forced
in novelty status while absent from `supervisor-groups.json`, focused browser
counts can be inferred from artifacts/PIDs, and stale `fuzz-assertion` rows
should not be trusted as current capacity. The latest level-mix feedback-action
file is empty. The committed graph confirms protocol-server publication but no
backend/API lane, no transport-integration lane, no standalone fuzz-assertion
lane, no continuous parser-serialization lower-level lane, and no current
coverage-guided lower-level executions.

The latest native-harness synthesis selects parser serialization as the first
isolated Node/V8 coverage-guided harness, and the latest action reports a
smoke-validated parser harness. The current graph-counted coverage-guided
lower-level row remains rich-text CRDT, not a continuous parser serialization
lane. The latest protocol synthesis selects HTTP polling REST as the ready v1
protocol/server harness. The latest protocol action file is empty, but the
graph shows a protocol-server HTTP polling validation row with protocol-server
executions in the latest buckets. Protocol telemetry is present, while
long-lived protocol residency remains pressure-sensitive.

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
legacy batch-count fields. The latest totals are approximately `68,546`
browser/e2e, `5,650,560` unit-property, `458,097` coverage-guided lower-level,
and `10,465,878` protocol-server executions. Transport-integration,
backend-api, fuzz-assertion, and other buckets are `0` in the current
reconstructed table.

The latest 15-minute bucket at `2026-05-22T07:30:00Z` is partial and has `82`
browser/e2e executions (`328`/hour), `416` unit-property executions
(`1,664`/hour), and `450` protocol-server executions (`1,800`/hour).
Coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion are zero in that bucket. The preceding
`2026-05-22T07:15:00Z` bucket had `1,704` browser/e2e executions
(`6,816`/hour), `2,976` unit-property executions (`11,904`/hour), and `3,085`
protocol-server executions (`12,340`/hour). The latest nonzero
coverage-guided lower-level bucket remains `2026-05-21T11:00:00Z` with `2`
executions (`8`/hour).

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `111` likely-real
findings over about `538.4` runner-hours, or `20.62` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,225`
browser/e2e candidates, `6` unit-property candidates, and `2`
coverage-guided-lower-level candidates. Backend-api, protocol-server,
transport-integration, standalone fuzz-assertion, and other buckets have no
unique candidates in the latest graph-counted data.

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
the current sample: collaboration UI signals and table stale snapshot HTTP.
Parser serialization has `5` successful records. Revision persistence has `4`
successful records, multi-reload lifecycle has `8`, full-profile rows have
`16`, many-user lifecycle has `17`, three-user late join has `29`, common
blocks have `37`, large-post three-user HTTP has `39`, long-session large-doc
has `39`, parser transform has `68`, async/server blocks have `74`, media
cross-entity has `76`, block-gauntlet has `105`, and permissions/auth/locks has
`124`. This still argues for completion-depth repair in existing covered
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
three-user HTTP profile has `341` records seen with `39` successful records;
those adjacent hits still do not count as completed combined coverage unless
the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. A run only contributes to the active-user
series when distinct browser users actually perform successful editing actions,
not merely when those users are present in the room. The cross-product rows
then require the same active-editor threshold together with realistic editing
ingredients: save/reload lifecycle, late join, autosave, rich text/list/table
editing, synced notes, collaboration UI signals, large-document setup,
operation-ledger oracles, sync faults, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. Notes-lifecycle cross-products are also
`0` at the six- and twelve-active-editor thresholds. The new active-editing
groups are not currently marked enabled in the sampled state, so these graphs
should remain red until the monitor admits the new six-, twelve-, and
thirty-active-editor lanes and they start producing passed records.

Largest current unmet goal gaps:

| Goal                                                     | Current | Target |
| -------------------------------------------------------- | ------: | -----: |
| successful parser-serialization records                  |       5 |     50 |
| successful multi-reload-lifecycle records                |       8 |     50 |
| successful collaboration-ui-signals records              |       0 |     25 |
| remote selection and cursor visible                      |       1 |     25 |
| successful three-user late-join records                  |       2 |     25 |
| async/server block core/template-part                    |       0 |     20 |
| remote and local autosave checkpoints                    |       5 |     25 |
| local post recovery autosave                             |       5 |     25 |
| table stale snapshot oracle                              |       0 |     10 |
| successful twelve-user documents                         |       0 |     10 |
| successful twelve-user late join documents               |       0 |     10 |
| successful many-user lifecycle records with twelve users |       0 |     10 |
| successful table-stale-snapshot-http records             |       0 |     10 |
| successful large-post HTTP records with three users      |       1 |     10 |
| action table-stale-snapshot-html                         |       4 |     10 |
| table stale snapshot over HTTP                           |       4 |     10 |
| successful three-user large documents                    |       1 |      5 |
| successful thirty-user documents                         |       0 |      3 |
| successful thirty-user late join documents               |       0 |      3 |
| successful many-user lifecycle records with thirty users |       0 |      3 |

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

The current controller state has `21` distinct work items. The most important
live queue entries are `5` high-priority ready-product PR rows held by the
controller, `13` published ready-product rows still under validation, `1`
high-priority runtime-held consumed row, and deferred-family diagnostic plus
needs-product-decision rows.

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
owner rows. Cycle 446 applied that split state and launched one bounded
strict-head repair job for `8fb598778357` / seed `6000007`; its report was
still pending in the copied persona evidence.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: three runnable blockers
(`benchmark-canary-fuzzer-gap`, `productive-analysis-action`, and
`seed-5200005-reducer`), one queued blocker (`pr07c-owner-matrix`), one held
blocker (`reload-hydration`), and two terminal/downscoped blockers (`PR17`
seed `1020002` and `seed-1060015-reducer`). The current job queue has PR07C
owner-matrix and seed `5200005` reducer jobs queued, benchmark-canary and
productive-analysis jobs runnable, and reload-hydration gated by the deferred
single-flight hold. The repeated no-progress table has current rows for
`benchmark-canary-fuzzer-gap`: `exact_stack_promotion_blocked_without_active_repair`
and `zero_executor_artifact`, each with `1` rejection.

## Interpretation

The graph-refresh pipeline is current: the collector brings in the current
coverage-guided root, resource samples, PR-focused raw inputs, and the standard
persona-loop outputs. The active coverage root is `run-20260522T064303Z`, and
its latest current-run duplicate/noise accounting is trusted. The live row was
sampled at `2026-05-22T07:31:35Z` with `full_pass_pending` `FALSE`,
`pending_until_first_pass` `FALSE`, and `current_run_metrics_trusted` `TRUE`.
Current-run signature/actionable-signature/product-evidence denominators are
`0`/`0`/`0` in the refreshed CSV. The latest completed monitor pass reports
`duplicateShareCurrent` `0` and summary startup failures `0`, so the graph
does not show a live duplicate/noise or startup-failure storm.

The duplicate/noise persona synthesis still matters because it rejects a
product-bug reading and points at a plausible producer-side control-plane leak:
no-product strict startup failures may be suppressed downstream while
supervisor and novelty producer paths keep retrying or republishing them. That
interpretation is not the current measured live health signal. With trusted
current-run accounting, zero current-run signatures, and zero startup failures,
the graph rejects a live storm reading and instead leaves the startup leak as a
watchpoint.

The resource picture is usable but still pressure-sensitive. Latest CPU
utilization is `68.05%`, with `4.38%` iowait; load is `47.97`, `53.40`, and
`54.19` on `64` logical CPUs, with `1` blocked task. The graph-counted fuzzing
mix is browser/e2e-heavy: `28` browser/e2e lanes, plus one lane each for
unit-property, coverage-guided lower-level, and protocol-server. Persona
evidence is stricter than the graph and rejects raw row counts as trusted
useful capacity unless roots, sessions, PIDs, events, and summaries reconcile.
The refreshed graph confirms protocol-server telemetry but still has no
backend/API lane, no transport-integration lane, no standalone fuzz-assertion
row, no continuous parser-serialization lower-level row, and zero current-bucket
coverage-guided lower-level executions.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial: the
`2026-05-22T07:30:00Z` bucket has `82` browser/e2e executions, `416`
unit-property executions, and `450` protocol-server executions. The preceding
bucket shows the steadier live rate: `1,704` browser/e2e executions, `2,976`
unit-property executions, and `3,085` protocol-server executions. Lower-level
counts remain approximate where reconstructed from batch metadata or legacy
batch-count fields.

PR progress is visible again, but the controller is not advertising a non-empty
push manifest. The PR-split persona feedback keeps the fileable prefix through
`PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007` reaches
the final persistence oracle and owner rows prove it. The PR loop still needs
to convert held ready-product rows, the queued PR07C owner matrix, held
reload-hydration work, runnable benchmark-canary and productive-analysis
feedback, and the seed `5200005` reducer into validated publishable branches
rather than more blocked or no-progress artifacts.
