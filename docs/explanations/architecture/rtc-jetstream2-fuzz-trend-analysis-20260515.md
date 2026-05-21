# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T18:47:34Z`

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

The graph data is current through `2026-05-21T18:46:08Z`. The monitor has
`3,825` passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `273,477`; current-scan coverage files are `311`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table has
`85` unmet target rows out of `137`.

Current-run duplicate/noise accounting is trusted again for the active root.
The latest current-output-dir row is `run-20260521T184428Z` with
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0`, summary startup failures `0`, current-run
signatures `0`, actionable signatures `0`, product-evidence signatures `0`, and
top duplicate share `0`. The latest monitor sample has `0` quality issues.
Historical duplicate share is `0.5` for context, but it is not the plotted live
health signal. The previous active-root row, `run-20260521T183957Z`, had
current-output duplicate share `1` while its signature denominator was
unavailable; that was incomplete current-run accounting, not evidence of a broad
product duplicate storm. Persona-loop duplicate/noise feedback says the strict
no-product `pre_action_bootstrap_stall` producer/scheduler leak was narrowed,
while productive browser materialization was still blocked by a
launcher/default-`wp-env-test` config mismatch in its copied evidence.

Resource state still needs watching. The latest sample has `379.5G` free memory,
`24.6GiB` free on `/`, and `662.2GiB` free on
`/media/volume/danluu-fuzz-data`. The latest CPU utilization sample is
`29.5%`. The latest load averages are `28.54`, `26.79`, and `24.22` on `64`
logical CPUs.

The latest graph-counted fuzzing mix has `31` browser/e2e lanes across `26`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.548M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The graph-counted mix is now concentrated in browser/e2e lanes, including the
focused `large-http-lifecycle` shard and current coverage-guided browser groups.
Current graph-counted lower-level work remains narrow:
`unit-property-table-query-array-crdt`,
`coverage-guided-lower-level-rich-text-crdt`, and
`protocol-server-http-polling` are active, while `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current lane. The latest
level-mix persona feedback rejects treating those graph-counted rows as trusted
useful live capacity: it reports effective browser/e2e active lanes at `0`,
coverage browser `active_run_dirs=0`, stale operator correctness groups, and
lower-level counts carrying much of the apparent activity. That feedback
conflicts with the refreshed graph count and should be treated as evidence that
capacity accounting still needs fail-closed live-lane validation.
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
latest sample is trusted for current-run duplicate/noise measurement:
`run-20260521T184428Z` completed a full pass with `duplicateShareCurrent` `0`,
startup failures `0`, current-run signatures `0`, actionable signatures `0`,
product-evidence signatures `0`, and top duplicate share `0`. The previous
untrusted row, `run-20260521T183957Z`, had current-output duplicate share `1`
with no current-run signature/actionable-signature denominator yet, so that row
should be read as incomplete accounting rather than a broad duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `81.3%` used and root is around `84.0%` used, so cleanup and output-size
budgeting still matter.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

Current coverage-guided groups cover real-user editing/rich-text/save-reload
bridges, async-server-blocks bridges, large HTTP post lifecycle completion, and
permissions/auth/locks. Historical enabled events cover additional media
cross-entity, many-user/thirty-user lifecycle, same-user lifecycle, HTTP table
stale snapshots, HTTP title reload convergence, existing-post CRDT metadata,
block-gauntlet, revision/autosave/recovery, parser transform, multi-reload
lifecycle, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e at `31` of `34` lanes, above the `24` lane floor
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
`large-http-lifecycle` shard only if operator artifacts stay stale. The refreshed
graph now includes a focused `large-http-lifecycle` row and trusted current-run
accounting, so the feedback should be read as a rejection of unvalidated
capacity interpretation rather than a rejection of the raw row count.
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
The latest totals are approximately `39,916` browser/e2e, `5,617,920`
unit-property, `458,097` coverage-guided lower-level, and `10,431,976`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `15` browser/e2e executions, or about `60`
executions/hour, and `22` protocol-server cases, or about `88`
executions/hour. Unit-property's latest nonzero bucket is
`2026-05-21T16:15:00Z` with `160` reconstructed executions; coverage-guided
lower-level's latest nonzero bucket is `2026-05-21T11:00:00Z` with `2`
executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `176` likely-real findings
over about `773.5` runner-hours, or `22.75` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,631`
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
long-session large docs, and permissions/auth/locks. Media cross-entity has `1`
successful record, session lifecycle has `2`, revision persistence has `3`,
async/server blocks has `6`, and large HTTP lifecycle has `10`. This argues for
completion-depth repair in existing covered surfaces before adding another broad
surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 110 | 500 |
| three-user late join | 41 | 300 |
| same-user two-tab mode | 28 | 150 |
| multi reload | 10 | 100 |
| successful real-user-editing records | 0 | 80 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 0 | 50 |
| successful two-user documents | 56 | 100 |
| remote selection and cursor visible | 0 | 25 |
| successful three-user late-join records | 0 | 25 |
| successful collaboration-ui-signals records | 0 | 25 |
| same-user stale/reloaded tabs | 25 | 50 |
| successful media-cross-entity records | 1 | 25 |
| successful same-user tab documents | 2 | 25 |
| remote and local autosave checkpoints | 3 | 25 |
| local post recovery autosave | 3 | 25 |

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

Current-run duplicate/noise is cleanly measurable for the active root again.
`run-20260521T184428Z` completed a full pass with `duplicateShareCurrent` `0`,
current summary startup failures `0`, current-run signatures `0`, actionable
signatures `0`, product-evidence signatures `0`, and top duplicate share `0`.
The immediately previous untrusted root had duplicate share `1` with an
unavailable denominator, so it remains a control-plane/accounting completeness
sample rather than a measured duplicate storm. Persona feedback reinforces that
interpretation: the strict no-product startup-noise producer leak was narrowed,
but the copied evidence still flags browser materialization/accounting risk
after the launcher/default `wp-env-test` mismatch.

The current fuzzing mix is browser/e2e-heavy, graph-counted at `31` browser/e2e
lanes, plus one lane each for unit-property, coverage-guided-lower-level, and
protocol-server. Browser/e2e is still the only level producing triaged
likely-real findings in the committed triage-output metric, while lower-level
lanes produce broader candidate output but little confirmed output. The current
rate bucket shows `15` browser/e2e executions and `22` protocol-server cases.
The protocol harness evidence is readiness/execution evidence, not proof of
useful live capacity by itself. The latest level-mix synthesis rejects trusting
the graph-counted live mix as capacity accounting: it reports effective
browser/e2e active lanes at `0`, coverage browser `active_run_dirs=0`, stale
operator artifacts, and zero useful backend/protocol capacity without exact live
sessions. The refreshed graph conflicts with that effective-capacity claim, so
the next useful accounting change is fail-closed live-lane validation plus
continued recovery of operator HTTP correctness.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. Cycle 446 launched
one bounded repair job for that strict-head proof, but the report was still
pending in the copied evidence. The PR loop still needs to turn held
ready-product rows, the benchmark-canary blocker, and the active
reload-hydration plus queued PR07C blockers into validated publishable branches
rather than just accumulating blocked or no-progress artifacts.
