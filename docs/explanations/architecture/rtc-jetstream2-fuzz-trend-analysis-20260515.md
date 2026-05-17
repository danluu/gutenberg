# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T22:53:15Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T22:49:21Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2137` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T22:49:21Z`, coverage
files grew from `272` to `48107`, a delta of `47835`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise gate is clean again on the
current-output-dir metric: the newest sample has
`duplicateShareCurrent=0.0000` and current summary startup failures `0`. The
same pass has `0` quality issues, `0` warnings, `424G` free memory, and a true
monitor headroom flag. This report uses current-output-dir duplicate/noise and
summary startup failures for live health. Historical aggregate duplicate/noise
is context only; its latest duplicate share is `0.3458` and is not the plotted
live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T223439Z`, says the smallest safe fix is to
make no-product startup-noise holds producer-scoped: suppress the offending
producer, keep product-evidence signatures visible, and allow one bounded
fallback group when capacity would otherwise hit zero. The latest
feedback-action, `20260517T220328Z`, applied policy `21`, paused the leaking
startup producers, and restarted the novelty monitor. The refreshed graph now
shows `0` startup failures and `duplicateShareCurrent=0.0000`, so the live
health plot is clean on the current-output-dir duplicate metric. The
persona-loop evidence still rejects a durable all-clear until the new root
demonstrates sustained suppression under fresh volume.

The PR-split persona loop rejects a filing-ready interpretation, but the latest
feedback action has moved the audit forward. The latest synthesis,
`20260517T223220Z`, says the Cycle308 grouped iteration-26 shape is stale and
should be replaced by the consensus microhead split: common work through clean
`PR05D` and `PR06A-D`, PR07 isolated as a runtime-gated lane, and `PR09` through
`PR15A-C` forked from `PR06D`. It rejects Cycle293, Cycle306, Cycle308 grouped
manifests, `ready/*`, raw `PR07D`, `PR17`, `PR18`, and `PR18x` as active filing
sources. The matching feedback-action updated `current-pr-split.md`, launched
the Cycle310 fresh-split drift audit, and produced a 41-row manifest with `0`
hard, head/bundle, or manifest failures; it also says iteration-28 grouped heads
match terminal iteration-27 microhead SHAs. Filing, broad final-stack fuzz, and
stack-wide validation remain blocked by PR07 collaboration-ready owner evidence
and seed `1020002`.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting. The top facet shows continued
coverage-file growth. Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0.0000`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`424G`, and headroom true. The health graph does not use historical
aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-real-user-rich-text` as the
enabled group. Current-output duplicate share is `0.0000` and current summary
startup failures are `0`. The duplicate/noise feedback-action applied the
producer-side pause/block fix and restarted the monitor; the latest synthesis
still treats sustained fresh-volume suppression as the remaining proof point.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T22:50:00Z` show bursty CPU. The latest
25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest sample
at `73.0%`. Over those same 25 samples, one-minute, five-minute, and 15-minute
load all exceeded the `64` logical CPU count in `2` windows, and at least one
load window exceeded it in `9`. The newest 1/5/15-minute load sample is
`43.12`, `59.66`, and `62.82`, so the latest load windows are below the logical
CPU count even though recent bursts exceeded it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-real-user-rich-text`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted mix shows `29`
browser/e2e lanes across `26` groups, plus `1` `unit-property` lane and `1`
`coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server` has persona-loop harness planning evidence but `0`
collector-visible execution count/rate in this graph. `backend-api` and
standalone fuzz-only assertion work also remain `0` in the committed graph
counters.

The latest level-mix synthesis file is empty, but the latest nonempty
feedback-action reports that browser/e2e materialization was repaired in the
live context: `browser-e2e=30` and
`materialized_live_lane_pids_all_browser_roots=30`. It also reports
`coverage-guided-lower-level=5`, with rich-text lower-level throughput improved
by batch size and sleep changes. That contradicts a graph-only interpretation
that lower-level capacity is exactly one live lane; the committed graph still
shows one collector-visible lower-level lane, while persona-loop context says
more lower-level capacity is live or being repaired. Protocol/backend remain
blocked in that feedback-action, and standalone fuzz-only assertion work is
explicitly unaudited rather than counted healthy.

The latest native-harness synthesis selects the rich-text CRDT lower-level
harness as the first ready isolated lower-level target, with parser/serialization
as the next profile. The latest protocol-server synthesis selects the HTTP
polling REST harness plan, but the refreshed graph still has `0` counted
`protocol-server` executions. This contradicts any interpretation that the graph
already shows protocol/server throughput: protocol/server and standalone
fuzz-only assertion work remain harness evidence until collector-visible counts
appear.

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

The latest collected execution data has about `5,379,785` completed test
executions: `126,428` browser/e2e, `3,006` transport/integration, `4,822,016`
unit-property, and `428,335` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `448` browser/e2e test executions/hour, `3,840`
unit-property executions/hour, and `0` for transport/integration,
coverage-guided-lower-level, backend/API, protocol-server, and standalone
`fuzz-assertion`. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` cumulative executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `622` unique
likely-real findings over about `1,962.6` runner-hours, or `31.69` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5412` candidates
over `1,962.6` runner-hours (`275.76` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `5` over `25.8` runner-hours
(`19.36` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`135`), three-user late join (`111`),
permissions/auth/locks (`86`), real-user editing (`81`), and parser
serialization (`38`). The broader unique-output candidate view is led by
three-user late join (`736`), session lifecycle (`664`), real-user editing
(`649`), revision persistence (`443`), and permissions/auth/locks (`433`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5256.8` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2772.8` for unit/property.

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
| `multi-reload-lifecycle` | 3355 | 122 | 0 | 3.6% |
| `revision-persistence` | 4673 | 179 | 0 | 3.8% |
| `parser-serialization` | 3454 | 203 | 0 | 5.9% |
| `real-user-editing` | 7404 | 600 | 0 | 8.1% |
| `parser-transform` | 4306 | 446 | 0 | 10.4% |
| `common-blocks` | 4201 | 452 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6327 | 1179 | 0 | 18.6% |
| `long-session-large-doc` | 2968 | 577 | 0 | 19.4% |
| `persistence-no-title` | 3378 | 918 | 0 | 27.2% |
| `session-lifecycle` | 8325 | 2511 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 532 | 1000 |
| action reload-post-action next 2000 tier | 1076 | 2000 |
| real-user body save/reload next 1000 tier | 591 | 1000 |
| successful real-user-editing records next 1000 tier | 600 | 1000 |
| action ui-format-paragraph next 2000 tier | 1690 | 2000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is led by code coverage, action pairs, real-user UI,
history, operation-ledger, payload-size, block-depth, invariant, block, action,
and transport observations. The plot separates breadth (`keys`) from repeated
observations (`total_count`) so broad coverage is not hidden inside raw event
volume.

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
took roughly `7.4` to `12.7` minutes in this snapshot. The newest completed
review cycle, `20260517T223220Z`, took `8.6` minutes from
`2026-05-17T22:32:20Z` to `2026-05-17T22:40:58Z`. The latest synthesis rejects
Cycle293, Cycle306, Cycle308 grouped manifests, `ready/*`, raw `PR07D`, `PR17`,
`PR18`, and `PR18x` as active filing evidence. It says the Cycle308
iteration-26 shape is stale and should be replaced by the microhead consensus:
common work through clean `PR05D` and `PR06A-D`, PR07 as a runtime-gated lane,
and independent `PR09` through `PR15A-C` forked from `PR06D`. The matching
Cycle310 feedback-action updated the split status, ran a fresh-split drift
audit, and produced a 41-row manifest with `0` hard, head/bundle, or manifest
failures; it also says iteration-28 grouped heads match terminal iteration-27
microhead SHAs. Filing, broad final-stack fuzz, raw `PR07D`, `PR17`, `PR18`,
and `PR18x` remain deferred until PR07 runtime/owner evidence and seed
`1020002` are resolved.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T22:43:22Z`, has `6`
suggested rows totaling `1828` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 1` (`162`), `PR 4` (`159`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. The
latest full health sample has headroom true, quality issues `0`, warnings `0`,
and `424G` free memory. The latest 1/5/15-minute load windows are all below the
`64` logical CPU count, though recent samples still show bursty overload
windows. Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop still rejects converting the current live
graph into a durable all-clear. The latest synthesis says producer-side
scheduling must keep no-product startup holds scoped to offending producers,
preserve product-evidence signatures, and allow bounded fallback when capacity
would otherwise hit zero; the matching feedback-action applied policy `21`,
paused the leaking producers, and restarted the monitor path. Because the latest
graph has
`duplicateShareCurrent=0.0000` and `0` current summary startup failures, the
next check is sustained suppression under the new root, not a durable all-clear
claim.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes Cycle308 iteration 26 with a microhead consensus:
common work through clean `PR05D` and `PR06A-D`, runtime-gated PR07 work, and
independent `PR09` through `PR15A-C` forked from `PR06D`. The matching Cycle310
feedback-action completed the fresh-split drift audit with a 41-row manifest and
`0` hard, head/bundle, or manifest failures, but filing remains blocked by PR07
collaboration-ready owner evidence and seed `1020002` for final-stack work.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes validated rich-text lower-level and HTTP
polling protocol harness work. The level-mix feedback-action says browser/e2e
materialization is repaired to `30` live PIDs and coverage-guided lower-level
capacity is higher in live context than the graph shows, while the graph still
has `0` latest-rate coverage-guided lower-level and `0` cumulative
protocol-server executions. The report therefore treats lower-level and protocol
outputs as partially graph-visible harness evidence until collector-visible
lower-level/protocol counts and live PID checks agree. The next narrow checks
are duplicate-share stability, browser PID materialization, collector-visible
lower-level/protocol counts, and PR07 root/runtime plus replay evidence before
any filing or final-stack claim.
