# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T23:00:23Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T22:56:29Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2139` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T22:56:29Z`, coverage
files grew from `272` to `48118`, a delta of `47846`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise gate is clean again on the
current-output-dir metric: the newest sample has
`duplicateShareCurrent=0.0000` and current summary startup failures `0`. The
same pass has `0` quality issues, `0` warnings, `424.8G` free memory, and a true
monitor headroom flag. This report uses current-output-dir duplicate/noise and
summary startup failures for live health. Historical aggregate duplicate/noise
is context only; its latest duplicate share is `0.3458` and is not the plotted
live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T224618Z`, says the producer-side strict
startup path is mostly controlled, but the remaining root cause is a
live-analysis/drain-scope leak: `no-analysis` startup-noise drain dirs can still
start or retain analysis work for stale startup-noise and preserved
product-evidence siblings. It recommends allowing only active supervisor dirs to
launch Codex/live/deep analysis and keeping drain dirs to gate-only refresh,
cleanup, and bounded dedupe bookkeeping. The matching feedback-action file is
empty; the last nonempty feedback-action remains `20260517T220328Z`, which
applied policy `21`, paused leaking startup producers, and restarted the novelty
monitor. The refreshed graph now shows `0` startup failures and
`duplicateShareCurrent=0.0000`, so the live health plot is clean on the
current-output-dir duplicate metric. The persona-loop evidence still rejects a
durable all-clear until the live-analysis drain boundary is fixed and fresh
volume stays clean.

The PR-split persona loop rejects a filing-ready interpretation, but the latest
synthesis supersedes the earlier audit shape. The latest synthesis,
`20260517T224751Z`, says the Cycle310 iteration-27 microhead split should be
replaced by a `fresh-prset/iteration-29/*` grouped topology, pending a fresh
audit/manifest. The agreed shape keeps common work through clean `PR05D` and
`PR06`, makes `PR06E` a sidecar, isolates `PR07A-B` as runtime-gated work,
holds `PR07C` and raw `PR07D`, and forks `PR09` through `PR15` from `PR06`. It
rejects Cycle293, Cycle306, local-publish rows, raw `PR07D`, `PR17`, `PR18`, and
`PR18x` as active filing evidence. The previous `20260517T223220Z`
feedback-action produced a 41-row Cycle310 manifest with `0` hard,
head/bundle, or manifest failures, but the newer synthesis rejects treating that
microhead interpretation as filing-ready. Filing, broad final-stack fuzz, and
stack-wide validation remain blocked by seed `1020002`, PR07 runtime ownership,
and fresh i29 manifest evidence.

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
`424.8G`, and headroom true. The immediately preceding samples included one
current-output duplicate spike, so the clean newest point is live status rather
than proof of durable suppression. The health graph does not use historical
aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-real-user-rich-text` as the
enabled group. Current-output duplicate share is `0.0000` and current summary
startup failures are `0`. The duplicate/noise persona loop now points at a
live-analysis drain-scope leak, not a need for broader product-evidence
suppression. Drain dirs should not launch or retain new analysis sessions, while
product-evidence signatures remain visible.

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
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is intentionally more cautious than the plotted lane
mix. The latest level-mix synthesis, `20260517T224415Z`, says the browser/e2e
mix is not trustworthy as live health because only `7-9` browser PIDs were found
in its evidence set, below the `24` live-lane floor, and exact focused/strict/gap
supervisor and watchdog sessions were missing. It recommends repairing browser
materialization first, not adding more lower-level capacity; keep
`unit-property=1`, keep the current coverage-guided lower-level work capped, and
keep backend/API, protocol-server, and fuzz-assertion at zero trusted capacity
until audited wiring and preflight are fixed. The earlier nonempty level-mix
feedback-action reported `browser-e2e=30`,
`materialized_live_lane_pids_all_browser_roots=30`, and
`coverage-guided-lower-level=5`, so the files conflict on live materialization.
This report treats the graph as browser/e2e-heavy capacity telemetry and does
not claim stable live PID materialization.

The latest native-harness action implemented and smoke-tested a rich-text CRDT
coverage-guided lower-level lane, and the latest nonempty protocol-server
synthesis/action selected and validated an HTTP polling REST harness. Those are
harness evidence, not yet collector-visible protocol throughput in this graph:
the refreshed counters still show `0` `protocol-server`, `0` `backend-api`, and
`0` standalone `fuzz-assertion` executions.

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

The latest collected execution data has about `5,381,655` completed test
executions: `126,538` browser/e2e, `3,006` transport/integration, `4,823,776`
unit-property, and `428,335` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `888` browser/e2e test executions/hour and
`10,880` unit-property executions/hour, with `0` current rate for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `622` unique
likely-real findings over about `1,963.3` runner-hours, or `31.68` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5413` candidates
over `1,963.3` runner-hours (`275.70` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `5` over `25.9` runner-hours
(`19.29` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`135`), three-user late join (`111`),
permissions/auth/locks (`86`), real-user editing (`81`), and parser
serialization (`38`). The broader unique-output candidate view is led by
three-user late join (`736`), session lifecycle (`665`), real-user editing
(`649`), revision persistence (`443`), and permissions/auth/locks (`433`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5260.3` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2770.2` for unit/property.

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
| `real-user-editing` | 7411 | 600 | 0 | 8.1% |
| `parser-transform` | 4306 | 446 | 0 | 10.4% |
| `common-blocks` | 4201 | 452 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6327 | 1179 | 0 | 18.6% |
| `long-session-large-doc` | 2971 | 577 | 0 | 19.4% |
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
review cycle, `20260517T224751Z`, took `8.8` minutes from
`2026-05-17T22:47:51Z` to `2026-05-17T22:56:37Z`. The latest synthesis rejects a
filing-ready interpretation and says the Cycle310 iteration-27 microhead split
should be replaced by a fresh i29 grouped topology after a new audit/manifest:
common work through clean `PR05D` and `PR06`, `PR06E` as a sidecar, PR07 isolated
as runtime-gated work, and independent `PR09` through `PR15` forked from `PR06`.
It rejects Cycle293, Cycle306, local-publish rows, raw `PR07D`, `PR17`, `PR18`,
and `PR18x` as active filing evidence. The earlier Cycle310 feedback-action did
produce a clean 41-row manifest, but the newer synthesis says that evidence is
not enough for filing or broad final-stack fuzz. Filing remains deferred until
seed `1020002`, PR07 runtime ownership, stale or zero-byte publication evidence,
and a fresh i29 manifest are resolved.

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
and `424.8G` free memory. The latest 1/5/15-minute load windows are all below the
`64` logical CPU count, though recent samples still show bursty overload
windows. Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting the current live graph into
a durable all-clear. The latest synthesis says active-current strict startup
suppression is mostly working, but no-analysis drain dirs can still participate
in live-analysis launch or retention. Because the latest graph has
`duplicateShareCurrent=0.0000` and `0` current summary startup failures, the
next checks are fixing that drain boundary and proving sustained fresh-volume
suppression, not declaring the duplicate/noise issue closed.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes the earlier Cycle310 i27 microhead interpretation
with a requested i29 grouped topology and a fresh audit requirement. The earlier
Cycle310 feedback-action completed a 41-row manifest with `0` hard,
head/bundle, or manifest failures, but the later synthesis rejects treating it
as filing-ready. Filing remains blocked by seed `1020002`, PR07 runtime owner
evidence, and fresh i29 manifest/audit evidence.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes validated rich-text lower-level and HTTP
polling protocol harness work, but the latest level-mix synthesis also says live
browser PID materialization was below the floor in its evidence set. The report
therefore treats lower-level and protocol outputs as harness evidence until
collector-visible lower-level/protocol counts and live PID checks agree. The
next narrow checks are duplicate-share stability, browser PID materialization,
collector-visible lower-level/protocol counts, and PR07 root/runtime plus replay
evidence before any filing or final-stack claim.
