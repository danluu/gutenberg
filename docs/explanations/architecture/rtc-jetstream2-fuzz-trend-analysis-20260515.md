# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T18:00:31Z`

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

The graph data is current through `2026-05-21T17:58:53Z`. The monitor has
`3,803` passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `273,460`; current-scan coverage files are `294`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table has
`91` unmet target rows out of `137`.

Current-run duplicate/noise is quiet in the measured live metric:
`duplicateShareCurrent` is `0`, current summary startup failures are `0`, and
the current-run accounting sample is trusted. The latest monitor sample also
has `1` quality issue. Historical duplicate share is `0` for context, but it is
not the live health signal. The active output root has `0` current signatures
and `0` actionable current signatures, so this is not hiding a one-signature
duplicate spike.
Persona-loop duplicate/noise feedback treated strict no-product
`pre_action_bootstrap_stall` recycling as a producer/scheduler control-plane
leak. The latest action says the novelty/supervisor hold was patched and
restarted; the active root is fresh and has not re-hit the duplicate family, so
the clean graph metric is current status rather than proof of long-term browser
producer stability.

Resource state is improved but still needs watching. The latest sample has
`388.1G` free memory, `31.2GiB` free on `/`, and `595.5GiB` free on
`/media/volume/danluu-fuzz-data`. The latest load averages are `15.97`,
`18.89`, and `21.85` on `64` logical CPUs.

The latest graph-counted fuzzing mix has `26` browser/e2e lanes across `26`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.9M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The level-mix persona feedback rejects treating these graph counts as fully
trusted live useful capacity until current root, exact tmux sessions, live PIDs,
fresh events, and fresh summaries agree. The refreshed graph now has browser/e2e
above the `24` lane floor, which contradicts the older persona-loop observation
that browser/e2e was below floor, but the feedback's fail-closed direction still
applies: recover operator HTTP correctness first, use one focused HTTP fallback
if operator artifacts stay stale, and count backend/protocol capacity as zero
when exact sessions are missing. Protocol-server evidence says the isolated HTTP
polling harness passed validation and event-contract checks, so the graph can
show protocol execution without overriding that fail-closed live-capacity rule.

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
latest sample is trusted and has no current signatures; if a future current-run
duplicate share is high, read it against the refreshed denominator. This sample
has `0` current signatures and `0` actionable current signatures.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `83%` used and root is around `80%` used, so cleanup and output-size
budgeting still matter.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

Recent enable events cover real-user and media cross-entity coverage bridges,
permissions/auth/locks, three-user late join, long-session large docs, revision
persistence, and parser serialization. Historical enabled events cover
additional real-user editing, same-user lifecycle, HTTP table stale snapshots,
HTTP title reload convergence, existing-post CRDT metadata, block-gauntlet,
rich-text UI, revision/autosave/recovery, async/server-backed, parser
transform, multi-reload lifecycle, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e at `26` of `29` lanes. Lower-level work is visible:
`unit-property`, `coverage-guided-lower-level`, and `protocol-server` each have
one current lane. The current graph-counted lower-level targets are
table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that these graph-counted
rows equal trusted useful live capacity. Level-mix synthesis requires fail-closed
checks for exact sessions, PIDs, fresh event files, and fresh non-empty
summaries. It also says to recover operator HTTP correctness first, then append
one focused `large-http-lifecycle` shard only if operator artifacts stay stale.
Native-harness action reports the parser-serialization lower-level harness
passed direct and tmux smoke validation with `2` inputs, `92` coverage keys, and
`21` semantic feature keys, but the current graph-counted coverage-guided
lower-level row is still rich-text CRDT. Protocol-server action reports the HTTP
polling harness is ready and passed a one-lane validation seed with `22` cases
and event-contract checks, but the level-mix feedback still says
protocol/server capacity should count as zero when exact tmux sessions are
missing.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `389,921` browser/e2e, `161`
transport/integration, `5,617,920` unit-property, `458,097` coverage-guided
lower-level, and `10,431,932` protocol-server executions. The current
15-minute rate bucket has `1` browser/e2e execution, or about `4`
executions/hour, and `22` protocol-server executions, or about `88`
executions/hour. Unit-property, coverage-guided-lower-level, backend,
fuzz-assertion, and other current-rate buckets are `0` in this sample even
though their cumulative reconstructed counts are large.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `526` likely-real findings
over about `2,869.3` runner-hours, or `18.33` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `4,277`
browser/e2e candidates, `46` transport/integration candidates, `6`
unit-property candidates, and `2` coverage-guided lower-level candidates.
Backend-api, protocol-server, standalone fuzz-assertion, and other buckets have
no unique candidates in the latest graph-counted data.

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

The latest weak-completion profiles are dominated by profiles with successful
record counts at zero in the current sample: async/server blocks,
block-gauntlet, collaboration UI signals, common blocks, long-session large
docs, many-user lifecycle, multi-reload lifecycle, parser serialization,
parser transform, permissions/auth/locks, real-user editing,
revision persistence, table stale snapshot HTTP, and three-user late join. This
argues for completion-depth repair in existing covered surfaces before adding
another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 107 | 500 |
| three-user late join | 39 | 300 |
| same-user two-tab mode | 28 | 150 |
| multi reload | 8 | 100 |
| successful real-user-editing records | 0 | 80 |
| successful two-user documents | 46 | 100 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 0 | 50 |
| same-user stale/reloaded tabs | 22 | 50 |
| remote and local autosave checkpoints | 0 | 25 |
| local post recovery autosave | 0 | 25 |
| remote selection and cursor visible | 0 | 25 |
| successful media-cross-entity records | 0 | 25 |
| successful collaboration-ui-signals records | 0 | 25 |
| successful three-user late-join records | 0 | 25 |

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
rows.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `6` blockers: one active reload-hydration
blocker, one runnable benchmark-canary coverage-promotion blocker, one queued
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

Current-run duplicate/noise is clean in the live metric. That should not be
overread as proof that all producers are stable under load; it only says the
latest measured active-root accounting is complete and quiet. Persona feedback
contradicts any stronger interpretation: it identified strict no-product startup
noise as a producer hard-hold/control-plane issue, then reported a
novelty/supervisor patch and restart. The latest active root is clean but fresh,
so the remaining risk is a repeat of the leaking family after root churn.

The current fuzzing mix is browser/e2e-heavy and now graph-counted at `26`
browser/e2e lanes, plus one lane each for unit-property,
coverage-guided-lower-level, and protocol-server. Browser/e2e is still the only
level producing triaged likely-real findings in the committed triage-output
metric, while transport and lower-level lanes produce broader candidate output
but little confirmed output. The current execution bucket includes `22`
protocol-server case executions from the validated HTTP polling harness, but
that is harness readiness evidence, not proof of useful live capacity. The
level-mix persona feedback rejects trusting the graph-counted live mix as
capacity accounting until fail-closed checks confirm current roots, exact
sessions, PIDs, and fresh summaries. It also rejects adding generic lower-level
capacity before operator HTTP correctness is recovered or one focused HTTP
fallback is needed.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. The PR loop still
needs to turn held ready-product rows, the benchmark-canary blocker, and the
active reload-hydration and queued PR07C blockers into validated publishable
branches rather than just accumulating blocked or no-progress artifacts.
