# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T18:41:00Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance, resource,
and PR-progress logs. The plotting data is generated with R, ggplot2, tidyverse
packages, and ColorBrewer palettes. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The refreshed collector now copies
`raw/pr-focused/...` inputs instead of leaving PR-controller graphs to drift from
old local state.

## High-Level Readout

The graph data is current through `2026-05-21T18:39:44Z`. The monitor has
`3,821` passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `273,465`; current-scan coverage files are `300`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table has
`89` unmet target rows out of `137`.

Current-run duplicate/noise accounting is incomplete again for the active root.
The latest current-output-dir row is `run-20260521T183957Z` with
`current_run_metrics_trusted` `FALSE`, `pending_until_first_pass` `TRUE`, and
startup status `launcher started; monitor process pending`. Its current-output
duplicate share is `1` and summary startup failures are `0`, but current-run
signatures, actionable signatures, product-evidence signatures, and top
duplicate share are not available yet. The latest monitor sample has `0` quality
issues. Historical duplicate share is `0` for context, but it is not the plotted
live health signal. This should be read as a control-plane
accounting/materialization health issue, not as measured clean product
duplicate/noise. Persona-loop duplicate/noise feedback says the strict
no-product `pre_action_bootstrap_stall` producer/scheduler leak was narrowed,
while productive browser materialization is still blocked by a
launcher/default-`wp-env-test` config mismatch.

Resource state is improved but still needs watching. The latest sample has
`378.0G` free memory, `26.4GiB` free on `/`, and `641.4GiB` free on
`/media/volume/danluu-fuzz-data`. The latest CPU utilization sample is
`29.5%`. The latest load averages are `28.54`, `26.79`, and `24.22` on `64`
logical CPUs.

The latest graph-counted fuzzing mix has `23` browser/e2e lanes across `23`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.657M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The graph-counted mix is concentrated in browser/e2e lanes, but the level-mix
persona feedback rejects treating those rows as useful live capacity: it reports
effective browser/e2e active lanes at `0` against the `24` lane floor, active
coverage browser run dirs at `0`, stale operator correctness groups, and
lower-level counts carrying much of the apparent activity. It says to fix the
wp-env config handoff first, recover operator HTTP correctness, and use one
focused `large-http-lifecycle` shard only as fallback. Current graph-counted
lower-level work is narrow:
`unit-property-table-query-array-crdt`,
`coverage-guided-lower-level-rich-text-crdt`, and
`protocol-server-http-polling` are active, while `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current lane.
Native-harness feedback validated a parser-serialization V8 coverage-guided
harness but left the unbounded parser campaign held. Protocol-server feedback
validated HTTP polling REST and event accounting, but level-mix feedback still
says backend/protocol capacity counts as zero when exact live sessions are
missing.

The PR-focused data is live again. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` runtime-gated row
consumed/held, and `2` deferred-family rows. The current push manifest is empty,
so the controller is not advertising any fresh branch-publish rows in this
snapshot. The critical-path executor has `6` blockers: `1` active, `1` queued,
`1` runnable, and `3` terminal.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative total.
It can fall when the active output root changes or when a cleanup pass removes
old per-run files. Cumulative coverage record observations are the better
long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
When current-run accounting is pending, duplicate/noise should be read as a
control-plane completeness problem rather than a measured product duplicate
rate. Pending/incomplete accounting is tracked as its own health signal. The
latest sample is not trusted for current-run duplicate/noise measurement:
`run-20260521T183957Z` is still pending its first full pass with launcher status
`monitor process pending`. Its current-output duplicate share is `1`, but it has
no current-run signature/actionable-signature denominator yet. The previous
untrusted sample, `run-20260521T183144Z`, had `active_run_dirs` `0`, `5`
supervisor groups, and `21` observed roots. The latest completed trusted root,
`run-20260521T182309Z`, completed a full pass with `duplicateShareCurrent` `0`,
startup failures `0`, current-run signatures `0`, actionable signatures `0`,
product-evidence signatures `0`, and top duplicate share `0`. The current high
duplicate share has an unavailable denominator, so it should not be treated as a
broad duplicate storm; the latest completed root has a `0`/`0` denominator and
no measured duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `81.9%` used and root is around `82.9%` used, so cleanup and output-size
budgeting still matter.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

Current coverage-guided groups cover media cross-entity and async-server-blocks
coverage bridges, thirty-user lifecycle, large HTTP post lifecycle completion,
and permissions/auth/locks. Historical enabled events cover additional
real-user editing, same-user lifecycle, HTTP table stale snapshots, HTTP title
reload convergence, existing-post CRDT metadata, block-gauntlet, rich-text UI,
revision/autosave/recovery, parser transform, multi-reload lifecycle, and
same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e at `23` of `26` lanes, below the `24` lane floor
called out by persona feedback. Lower-level work is active but narrow:
`unit-property`, `coverage-guided-lower-level`, and `protocol-server` each have
one current graph-counted lane. The current graph-counted lower-level targets
are table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that these graph-counted
rows equal trusted useful live capacity. The latest level-mix synthesis says the
effective mix is browser-dead/browser-light for the priority HTTP correctness
class: browser/e2e active lanes are `0`, current coverage browser
materialization has `active_run_dirs=0`, operator correctness groups are stale
with no live PIDs, backend/API and protocol/server should count as zero without
exact live sessions, and lower-level counts carry most of the apparent
activity. It says to fix the launcher/supervisor wp-env config handoff, recover
operator HTTP correctness first, and append one focused
`large-http-lifecycle` shard only if operator artifacts stay stale.
Duplicate/noise feedback points to the same launcher/default-`wp-env-test`
config mismatch after narrowing the startup-stall producer leak.
Native-harness feedback validated parser serialization as the first isolated V8
coverage-guided harness with `2` inputs, `92` coverage keys, and `21` semantic
feature keys, but left the unbounded parser campaign held; the current
graph-counted coverage-guided lower-level row remains rich-text CRDT.
Protocol-server feedback validated HTTP polling REST with one seed, `22` cases,
and passing event-contract checks, but level-mix feedback still says the
protocol row is execution evidence, not trusted live capacity by itself.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `148,814` browser/e2e, `5,617,920`
unit-property, `458,097` coverage-guided lower-level, and `10,431,954`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `10` browser/e2e executions, or about `40`
executions/hour. Protocol-server's latest nonzero bucket is the prior
`2026-05-21T18:15:00Z` bucket with `22` cases, or about `88` executions/hour.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `363` likely-real findings
over about `1,611.6` runner-hours, or `22.52` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `2,802`
browser/e2e candidates, `6` unit-property candidates, and `2`
coverage-guided-lower-level candidates. Transport-integration, backend-api,
protocol-server, standalone fuzz-assertion, and other buckets have no unique
candidates in the latest graph-counted data.

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
the current sample: real-user editing, collaboration UI signals, three-user late
join, parser transform, parser serialization, block-gauntlet, common blocks,
multi-reload lifecycle, many-user lifecycle, table stale snapshot HTTP,
long-session large docs, media cross-entity, and permissions/auth/locks.
Revision persistence has `1` successful record, async/server blocks and session
lifecycle have `2` each, and large HTTP lifecycle has `9`. This argues for
completion-depth repair in existing covered surfaces before adding another broad
surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 108 | 500 |
| three-user late join | 40 | 300 |
| same-user two-tab mode | 28 | 150 |
| multi reload | 9 | 100 |
| successful real-user-editing records | 0 | 80 |
| successful two-user documents | 49 | 100 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 0 | 50 |
| same-user stale/reloaded tabs | 23 | 50 |
| remote selection and cursor visible | 0 | 25 |
| successful three-user late-join records | 0 | 25 |
| successful media-cross-entity records | 0 | 25 |
| successful collaboration-ui-signals records | 0 | 25 |
| remote and local autosave checkpoints | 1 | 25 |
| local post recovery autosave | 1 | 25 |

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

The parsed suggested-PR split history still has `457` snapshots. The latest
parsed proposed split totals `4,114` net LOC. These charts are size telemetry
from parsed status snapshots, not filing authority. The largest latest rows are
`PR 13B` at `1,668` net LOC, `PR 13A` at `1,126`, `PR 13C` at `294`, and
`PR 14` at `276`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current controller state has `21` distinct work items. The most important
live queue entries are `5` high-priority ready-product PR rows held by the
controller, `13` published ready-product rows still under validation, `1`
runtime-gated row, `1` high-priority deferred-family product-decision row, and
`1` medium-priority deferred-family diagnostic row.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has only a header row, so there are no graph-counted
publishable branch rows in this snapshot. Published and held branches are still
visible in the progress table. The latest PR-split persona feedback also rejects
promoting `PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and owner
rows. Cycle 446 applied that split state and launched one bounded strict-head
repair job for `8fb598778357` / seed `6000007`; its report was still pending in
the copied persona evidence.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `6` blockers: one runnable benchmark-canary
coverage-promotion blocker, one active reload-hydration blocker, one queued
PR07C owner-matrix blocker, and three terminal blockers. Repeated no-progress
artifacts are dominated by `benchmark-canary-fuzzer-gap/zero_executor_artifact`
with `65` rows, followed by PR17 and seed-reducer pre-oracle/preflight rows.

## Interpretation

The immediate graph-loop bug was in the updater, not in ggplot. There was no
durable local tmux refresh session, the collector could scan too much historical
state and stall, the R script failed on boolean-like string columns in fresh
CSV input, and the collector was accidentally dropping all supervisor group
paths. After those fixes, the collector also needed to copy PR-focused raw
inputs so PR queue, blocker, and artifact graphs update from current controller
state.

Current-run duplicate/noise is not cleanly measurable for the active root yet.
`run-20260521T183957Z` is pending its first full pass and its launcher/monitor
startup is not complete, so the current-run signature/actionable-signature
denominator is unavailable. The current-output duplicate share is `1`, but the
latest completed trusted root, `run-20260521T182309Z`, had
`duplicateShareCurrent` `0`, current summary startup failures `0`, current-run
signatures `0`, and actionable signatures `0`. Persona feedback reinforces the
control-plane interpretation: the strict no-product startup-noise producer leak
was narrowed, but the live problem has moved to browser
materialization/accounting after the launcher/default `wp-env-test` mismatch.

The current fuzzing mix is browser/e2e-heavy but below target, graph-counted at
`23` browser/e2e lanes, plus one lane each for unit-property,
coverage-guided-lower-level, and protocol-server. Browser/e2e is still the only
level producing triaged likely-real findings in the committed triage-output
metric, while transport and lower-level lanes produce broader candidate output
but little confirmed output. The current rate bucket shows `10` browser/e2e
executions, and the previous protocol-server bucket includes the validated HTTP
polling harness work with `22` cases. That harness evidence is still
readiness/execution evidence, not proof of useful live capacity by itself.
The latest level-mix synthesis rejects trusting the graph-counted live mix as
capacity accounting: it reports effective browser/e2e active lanes at `0`,
coverage browser `active_run_dirs=0`, stale operator artifacts, and zero useful
backend/protocol capacity without exact live sessions. The next useful mix
change is to fix the wp-env config handoff and recover operator HTTP
correctness; one focused HTTP shard is only a fallback.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. Cycle 446 launched
one bounded repair job for that strict-head proof, but the report was still
pending in the copied evidence. The PR loop still needs to turn held
ready-product rows, the benchmark-canary blocker, and the active
reload-hydration plus queued PR07C blockers into validated publishable branches
rather than just accumulating blocked or no-progress artifacts.
