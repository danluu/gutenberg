# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T18:29:30Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state started at `2026-05-18T18:23:46Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T18:20:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2283` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T18:16:42Z`, coverage files grew from
`272` to `54440`, a delta of `54168`. The monitor's visible likely-real maximum
reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. That follows a `2026-05-18T14:13:44Z` regression to
duplicate share `1` and a `2026-05-18T16:40:50Z` regression to duplicate share
`0.5`, so it is a clean latest duplicate/noise sample rather than proof of
durable recovery. The latest pass has `1` quality issue, `1` warning, `413.4G`
free memory, `no_progress=2`, and `headroom=true`. This report uses
current-output duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate
share is `0.3416` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects a
durable recovery read. The newest duplicate/noise synthesis,
`20260518T181318Z`, converges on a producer/scheduler control-plane bug:
historical or prior-output no-product `pre_action_bootstrap_stall` cooldown is
still able to act like current fleet evidence and block useful materialization.
The latest duplicate/noise feedback-action is zero-byte. The copied novelty
state now has one current run dir for `novelty-ws-structure`, but the canary
state still records a `pre_action_bootstrap_stall` hold with share `0.7778` and
the previous hard-blocked canary hold expires at `2026-05-18T23:45:39Z`.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T181143Z`, says the split is blocked, not fileable:
keep the Cycle378/Cycle380/Cycle382 replacement split, keep PR07 as a
runtime-gated owner fork, keep `PR02B` as blocked-validation work after `PR02`,
and do not promote raw `PR07D`, raw `deferred/*`, `PR17`, `PR18`, `PR18x`, or
stale fallback-tail proof. `PR07C/HOLD-07C` remains red owner evidence, not a
product PR. The next useful work is a bounded PR07 owner-matrix replay plus
independent `PR02B` validation if capacity exists; broad final-stack fuzzing,
GitHub filing, and stack-wide validation remain blocked.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `54440` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0`, current summary
startup failures `0`, quality issue count `1`, warning count `1`, free memory
`413.4G`, `no_progress=2`, and `headroom=true`. Startup failures remain
suppressed and the latest current-output duplicate share is clean after the
prior `0.5` sample. That makes the plotted live duplicate/noise signal clean,
but not the whole health sample and not recovered producer capacity. The health
graph does not use historical aggregate duplicate/noise as the plotted live
signal.

The enabled-groups summary field is now `novelty-ws-structure`, and the copied
novelty state has one current run dir:
`run-20260518T182335Z/novelty-ws-structure-gen-1-20260518T182353Z`. That is
movement from the prior empty state, but the persona loop still rejects a
durable recovery claim because the canary path is still entangled with
historical no-product `pre_action_bootstrap_stall` holds. The next check is
sustained low current-output duplicate share while useful fuzzing advances, not
whether historical aggregate duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T18:20:00Z` show bursty CPU and load.
The latest 25 CPU samples range from `45.39%` to `87.39%` utilization, with the
latest sample at `69.17%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `16` windows, five-minute load in `17`,
15-minute load in `17`, and at least one load window exceeded it in `18`. The
newest 1/5/15-minute load sample is `55.68`, `57.77`, and `58.28`; all three
latest load windows are below the logical CPU count, with `6` blocked tasks in
the latest sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent enable events include `novelty-ws-async-server-blocks`,
`novelty-ws-permissions-auth-locks`, `novelty-ws-long-session-large-doc`, and
`novelty-ws-media-cross-entity`. The refreshed summary's
`enabled_groups_current` value is `novelty-ws-structure`; current surface state
is still read from supervisor/group snapshots and lane events rather than from
the historical enable log alone.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `28` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is still concentrated in browser/e2e lanes:
`28` of the latest `30` graph-visible lanes are browser/e2e. Lower-level work is
active but narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters.

Persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The newest level-mix synthesis, `20260518T175748Z`, says this
is not a lower-level expansion moment: restore useful browser/e2e
materialization first, keep `unit-property`, `coverage-guided-lower-level`,
`protocol-server`, and `fuzz-assertion` capped at one lane each, and restore
`backend-api` to one preflighted lane only after build/wp-env checks pass. Its
paired feedback-action is zero-byte. The latest native action,
`20260518T180726Z`, validated a V8/Node coverage-guided rich-text CRDT
multiblock lower-level harness but did not start a duplicate long run because a
table/query-array lower-level lane was already active. The latest
protocol-server synthesis is zero-byte; the latest non-empty action,
`20260518T180538Z`, validated an HTTP polling REST state-machine harness with
`20` cases and did not move the protocol current-run-root pointer. The latest
fuzz-assertion apply, `20260518T170134Z`, added guarded fuzz-only assertions and
restarted affected browser and lower-level loops. These are active
persona-loop signals, but they have not moved the committed backend/API,
protocol-server, or standalone assertion counters above zero.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit lane
events. Lower-level counts are approximate when reconstructed from batch
metadata or legacy batch-count fields.

The latest collected execution data has about `5,845,150` completed test
executions: `235,185` browser/e2e, `3,006` transport/integration, `5,159,136`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `6,416` browser/e2e executions/hour and
`13,184` unit-property executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend/API,
protocol, and assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `767` unique
likely-real findings over about `2,444.6` runner-hours, or `31.38` per 100
runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` triaged likely-real outputs in the collected
triage rows. That does not prove the lower-level lanes are unproductive; it
means their findings have not yet flowed through the same non-duplicate
likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The unique bug-output candidate graphs are broader. They dedupe non-infra
`likely_real` or `uncertain` triage rows, untriaged raw browser/transport
failure signatures, and lower-level assertion failures by canonical output key.
These graphs are intentionally broader than confirmed bugs and narrower than
raw failed attempts; untriaged candidates are not confirmed bugs.

Current unique bug-output candidate rates are: browser/e2e `6,096` candidates
over `2,444.6` runner-hours (`249.37` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `45.1` runner-hours
(`11.08` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`202`), three-user late join (`126`), real-user
editing (`102`), permissions/auth/locks (`88`), and revision persistence
(`33`). The broader unique-output candidate view is led by three-user late join
(`840`), session lifecycle (`781`), real-user editing (`712`), revision
persistence (`549`), and permissions/auth/locks (`473`), with lower-level lanes
showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `8592.3` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1591.8` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Lower-level and transport lanes should continue to be judged partly by the
unique-output candidate graphs until their triage pipeline is producing
comparable likely-real and non-duplicate results.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4005 | 162 | 0 | 4.0% |
| `revision-persistence` | 6656 | 289 | 0 | 4.3% |
| `parser-serialization` | 4034 | 252 | 0 | 6.2% |
| `real-user-editing` | 8814 | 613 | 0 | 7.0% |
| `common-blocks` | 4814 | 501 | 0 | 10.4% |
| `parser-transform` | 5239 | 564 | 0 | 10.8% |
| `long-session-large-doc` | 3951 | 596 | 0 | 15.1% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7164 | 1340 | 0 | 18.7% |
| `session-lifecycle` | 9489 | 2743 | 0 | 28.9% |
| `media-cross-entity` | 522 | 163 | 0 | 31.2% |
| `three-user-late-join` | 11463 | 3933 | 0 | 34.3% |
| `persistence-no-title` | 3982 | 1415 | 0 | 35.5% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1143 | 2000 |
| real-user title save/reload next 1000 tier | 596 | 1000 |
| successful real-user-editing records next 1000 tier | 613 | 1000 |
| real-user body save/reload next 1000 tier | 655 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and reload-post action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The highest-volume feature categories are history, operation-ledger, invariant,
action-pair, block-depth, block, action, other, transport, collaborator,
revision, and payload-size observations. The plot separates breadth (`keys`)
from repeated observations (`total_count`) so broad coverage is not hidden
inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

With the live loop at `max_parallel=6`, the last 20 completed review cycles
took roughly `7.0` to `12.1` minutes in this snapshot. The newest completed
review cycle, `20260518T181143Z`, took `7.5` minutes.

The latest synthesis rejects a filing-ready interpretation. It keeps the
Cycle378/Cycle380/Cycle382 replacement split and says the stack is still gated
by `PR02B`, PR07 owner replay, broad final-stack validation, and GitHub filing.
It also rejects the `20260518T180659Z` finalization as evidence because its
report is zero-byte. The latest non-empty feedback-action remains the
Cycle382 classification of `PR07C/HOLD-07C` as red-held rather than promotable:
readiness passed, but five seeds still show marker-set divergence. The next
jobs are bounded PR07 owner-matrix replay and, if capacity exists, `PR02B`
validation; broad final-stack fuzzing, raw deferred promotion, and GitHub
filing remain blocked.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T18:20:45Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but the run
is not yet durable. The latest plotted duplicate/noise sample uses the
current-output-dir metric: startup failures are `0` and current-output
duplicate share is `0`. The latest full health sample has `headroom=true`,
quality issues `1`, warnings `1`, `no_progress=2`, and `413.4G` free memory.
The latest sysstat 1/5/15-minute load windows are `55.68`, `57.77`, and
`58.28`; all three are below the `64` logical CPU count, with `6` blocked
tasks. Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
or a single materialized canary into a durable recovery claim. The graph now
shows startup failures suppressed, latest current-output duplicate share clean,
and one current `novelty-ws-structure` run dir. The latest duplicate/noise
synthesis still says the remaining issue is producer and scheduler handling of
historical no-product `pre_action_bootstrap_stall` state. The right read is
"latest duplicate/noise point clean, canary materialized once, durable capacity
not yet proven."

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says the split needs PR07 owner replay, `PR02B` validation,
and a usable fresh finalization audit before filing. `PR07C/HOLD-07C` remains
held as red owner evidence because five seeds remain red with marker-set
divergence. Seed `1020002` still blocks final-stack fuzzing, filing, and
rebuilt stack-wide validation; it does not block independent PR07/PR02B work.

The committed fuzzing graph is browser/e2e-heavy: `28` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback rejects treating the
browser lane count alone as healthy materialization and calls for coverage
browser recovery before any lower-level expansion. Native/protocol/assertion
work has fresh action evidence, but it has not yet moved the committed
execution counters beyond the existing narrow lower-level rows. The next narrow
checks are sustained current-output duplicate/noise health while browser
capacity advances, collector-visible backend/protocol/assertion execution
counts, continued lower-level output accounting, and the `1020002` blocker
before any filing or final-stack claim.
