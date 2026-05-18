# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T11:06:48Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T11:05:03Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T11:00:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2246` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T11:05:03Z`, coverage
files grew from `272` to `52124`, a delta of `51852`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and
reload-post action depth.

The latest plotted live duplicate/noise point is noisy on the current-output-dir
metric: `duplicateShareCurrent=1.0000`, while current summary startup failures
remain `0`. The two latest current-output duplicate-share samples were `1.0000`
after ten zero samples, so the live regression is still present.
The latest pass has `0` quality issues, `0` warnings, `414.5G` free memory,
`no_progress=0`, and a false monitor headroom flag. This report uses
current-output duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3430` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
startup-failure suppression as durable recovery by itself. The latest
duplicate/noise synthesis, `20260518T105507Z`, says the remaining duplicate/noise
problem is a producer/control-plane feedback loop: novelty/supervisor scheduling
can re-materialize known startup-noisy groups after output-root resets,
empty-materialization rescue, or historical pause bypasses. Its matching
feedback-action file is empty, so there is no newer action evidence that this
specific scheduler leak is fixed. The graph's latest
`duplicateShareCurrent=1.0000` means current-output duplicate/noise is not clean;
the next check is whether useful groups resume without refilling noisy browser
capacity.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T104730Z`, says the durable audited basis remains
`20260518T103442Z` Cycle325/i40 with `70` manifest rows and no audit failures.
The later `104444Z` report is nonzero but explicitly reuses that basis, so it
does not supersede the split. The synthesis keeps filing blocked, splits ready
local work from the blocked PR07 runtime lane, rejects raw `PR07D`, `PR17`,
`PR18`, and `PR18x`, and keeps seed `1020002` blocking final-stack validation
and filing only.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth. Dense monitor-pass
points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=1.0000`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`414.5G`, `no_progress=0`, and headroom false. The two newest current-output
duplicate-share samples are `1.0000`, while startup failures remained
suppressed; the latest state is therefore live duplicate/noise regression, not
a clean recovery point.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The refreshed copied novelty-state summary lists
`novelty-ws-same-user-lifecycle` and `novelty-ws-lifecycle` as the current
enabled groups; enabled history most recently added another
`novelty-ws-lifecycle` event at `2026-05-18T11:05:03Z`. Current-output duplicate
share is `1.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis rejects reading startup-failure suppression as full
recovery by itself and points to producer scheduling that can bypass or forget
startup-noise cooldowns. Its matching feedback-action is empty, so the report
does not treat that diagnosis as remediated. The next check is lower
current-output duplicate share while productive groups resume and advance, not
whether historical aggregate duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T11:00:00Z` show bursty CPU. The
latest 25 CPU samples range from `44.96%` to `87.69%` utilization, with the
latest sample at `76.33%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `18` windows, five-minute load in `20`, 15-minute
load in `20`, and at least one load window exceeded it in `22`. The newest
1/5/15-minute load sample is `103.45`, `83.51`, and `69.78`; all three latest
load windows exceed the logical CPU count, with `11` blocked tasks in the latest
sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty-state summary lists
`novelty-ws-same-user-lifecycle` and `novelty-ws-lifecycle` as the current
enabled groups; the most recent enabled-group event is
`novelty-ws-lifecycle` at `2026-05-18T11:05:03Z`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing is still concentrated in browser/e2e lanes in the committed graph,
with a narrow lower-level presence: `unit-property` and one
`coverage-guided-lower-level` lane are graph-visible. `transport-integration`
has historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T104849Z`, rejects a
broad rebalance and says the current action is narrow browser/e2e
materialization repair, not lower-level expansion. The latest non-empty
feedback-action, `20260518T102333Z`, reports browser/e2e restored to `27` active
lanes with a later live check still at `26`, backend-api, protocol-server,
unit-property, browser-e2e, and coverage-guided-lower-level audited as `ok`, and
standalone `fuzz-assertion` still unaudited and counted as zero. The committed
graph agrees browser/e2e is above the floor, but still has zero
collector-visible protocol-server, backend/API, or standalone `fuzz-assertion`
executions.

The latest native-harness synthesis, `20260518T105519Z`, again names the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
true AFL/libFuzzer. The latest native action file, `20260518T103927Z`, reports
the harness adopted, validation passed through syntax, formatting, unit, smoke,
`git diff --check`, and build checks, and root/lane `events.ndjson` records
emitted with `fuzzLevel="coverage-guided-lower-level"`. It also says a
continuous lower-level rich-text lane was already running and advancing. The
committed graph still has only one collector-visible coverage-guided lower-level
lane and no current lower-level execution rate.

The latest protocol-server synthesis, `20260518T105649Z`, recommends the HTTP
polling REST endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`, with durable
state-machine oracles and collector-compatible event accounting. The latest
protocol action file, `20260518T104057Z`, reports the protocol/server harness
implemented and revalidated in an isolated running wp-env on port `9540`; one
bounded validation seed passed `20` cases with root/lane `events.ndjson` and no
infra or oracle failures. The graph still has `0` protocol-server cumulative
executions and no current protocol rate because that work is not yet
collector-visible sustained trend evidence. The latest fuzz-only assertion
apply file, `20260518T092942Z`, added browser-gated assertions, stale CRDT
hydration diagnostics, HTTP polling cursor diagnostics, and a real-user
undo/redo marker assertion, then rebuilt and restarted affected browser fuzz
producers. Standalone `fuzz-assertion` executions remain `0`.

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

The latest collected execution data has about `5,676,769` completed test
executions: `186,708` browser/e2e, `3,006` transport/integration, `5,039,232`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `2,972` browser/e2e test executions/hour,
`6,912` unit-property executions/hour, and `0` coverage-guided-lower-level
executions/hour, with `0` current rate for transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence that backend/protocol
lanes were launched.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `735` unique
likely-real findings over about `2,248.9` runner-hours, or `32.68` per 100
runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` triaged likely-real outputs in the collected
triage rows. That does not prove the lower-level lanes are unproductive; it
means their findings have not yet flowed through the same non-duplicate
likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The unique bug-output candidate graphs are broader. They dedupe non-infra
`likely_real` or `uncertain` triage rows, untriaged raw browser/transport failure
signatures, and lower-level assertion failures by canonical output key. These
graphs are intentionally broader than confirmed bugs and narrower than raw
failed attempts; untriaged candidates are not confirmed bugs.

Current unique bug-output candidate rates are: browser/e2e `5,874` candidates
over `2,248.9` runner-hours (`261.20` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `37.8` runner-hours
(`13.21` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`184`), three-user late join (`126`), real-user
editing (`99`), permissions/auth/locks (`87`), and parser serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`809`),
session lifecycle (`750`), real-user editing (`691`), revision persistence
(`510`), and permissions/auth/locks (`461`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7211.3` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1897.0` for unit/property.

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
| `multi-reload-lifecycle` | 3832 | 155 | 0 | 4.0% |
| `revision-persistence` | 5825 | 245 | 0 | 4.2% |
| `parser-serialization` | 3844 | 244 | 0 | 6.3% |
| `real-user-editing` | 8310 | 609 | 0 | 7.3% |
| `common-blocks` | 4540 | 485 | 0 | 10.7% |
| `parser-transform` | 4862 | 530 | 0 | 10.9% |
| `long-session-large-doc` | 3602 | 587 | 0 | 16.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6831 | 1287 | 0 | 18.8% |
| `session-lifecycle` | 9027 | 2674 | 1 | 29.6% |
| `media-cross-entity` | 495 | 160 | 0 | 32.3% |
| `persistence-no-title` | 3764 | 1243 | 0 | 33.0% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1112 | 2000 |
| real-user title save/reload next 1000 tier | 567 | 1000 |
| successful real-user-editing records next 1000 tier | 609 | 1000 |
| real-user body save/reload next 1000 tier | 626 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and reload-post action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The highest-volume feature categories are history, operation-ledger, invariant,
action pairs, block depth, block, action, other, transport, collaborator,
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
took roughly `7.6` to `16.3` minutes in this snapshot. The newest completed
review cycle, `20260518T104730Z`, took `8.1` minutes. The latest synthesis
rejects a filing-ready interpretation: the durable audited basis remains
`20260518T103442Z` Cycle325/i40 with `70` manifest rows and no audit failures,
while the later `104444Z` report is a non-superseding wrapper over that basis.
It keeps ready/local filing work separate from the blocked PR07 runtime lane,
keeps raw `PR07D`, `PR17`, `PR18`, and `PR18x` out, and keeps filing, broad
final-stack fuzzing, and stack-wide validation blocked by seed `1020002`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T10:56:22Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `1.0000`; the two latest current-output
duplicate-share samples are `1.0000` after ten zero samples. The latest full
health sample has headroom false, quality issues `0`, warnings `0`,
`no_progress=0`, and `414.5G` free memory. The latest 1/5/15-minute load windows
are `103.45`, `83.51`, and `69.78`; all three exceed the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says the remaining primary
risk is a producer/control-plane leak where novelty/supervisor scheduling can
re-materialize known startup-noisy groups after output-root resets,
empty-materialization rescue, or historical pause bypasses. The matching
feedback-action is empty, so the report treats that as an unresolved diagnosis.
The refreshed graph's latest `duplicateShareCurrent=1.0000` rejects a
clean-current interpretation. Both graph and persona-loop evidence keep the next
check focused on reducing current-output duplicate share while useful fuzzing
resumes and advances, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T104730Z` synthesis keeps `20260518T103442Z` Cycle325/i40 as the
durable audited `70`-row basis and says the later `104444Z` report does not
supersede it. It splits ready/local filing work from the blocked PR07 runtime
lane, keeps `PR03B` hold-level pending focused comparison, and rejects raw
`PR07D`, `PR17`, `PR18`, and `PR18x`. Seed `1020002` still blocks filing, broad
final-stack fuzzing, and stack-wide validation; PR07 runtime repair/owner replay
and strict PR05B/PR05C/clean-PR05D owner comparison should continue.

The committed fuzzing graph is still browser/e2e-heavy: `29` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop feedback says backend/API and protocol/server are live
sentinels, the latest protocol action reports a passing protocol-server bounded
validation with root/lane events, fuzz-only assertion work has been added to
browser producers, and the latest native-harness action reports a continuous
lower-level rich-text lane beyond the one collector-visible lower-level lane.
That contradicts the committed graph counters, so the report treats those as
live persona-loop evidence but not yet sustained collector-visible graph
evidence. The next narrow checks are sustained current-output duplicate/noise
health, collector-visible backend/protocol and assertion counts, PR07 runtime
repair/owner replay evidence, and fresh manifest/finalization audit before any
filing or final-stack claim.
