# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T22:44:59Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T22:41:11Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2135` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T22:41:11Z`, coverage
files grew from `272` to `48067`, a delta of `47795`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise gate is clean again on the
current-output-dir metric: the newest sample has
`duplicateShareCurrent=0.0000` and current summary startup failures `0`. The
same pass has `0` quality issues, `0` warnings, `413G` free memory, and a false
monitor headroom flag. This report uses current-output-dir duplicate/noise and
summary startup failures for live health. Historical aggregate duplicate/noise
is context only; its latest duplicate share is `0.3458` and is not the plotted
live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T220328Z`, rejects treating the producer
path as fixed before the bounded monitor change: mixed product-evidence
producers could classify current no-product `pre_action_bootstrap_stall` as
`known-noise`, write a product-preserving `no-analysis.json`, and keep browser
capacity running. The matching feedback-action applied policy `21`, paused the
leaking startup producers, restarted the novelty monitor, and left product
evidence visible. The refreshed graph now shows `0` startup failures and
`duplicateShareCurrent=0.0000`, so the live health plot is clean on the
current-output-dir duplicate metric. The persona-loop evidence still rejects a
durable all-clear until the new root proves the threshold-based gate under fresh
volume.

The PR-split persona loop also rejects a filing-ready interpretation. The
latest synthesis, `20260517T223220Z`, says the Cycle308 grouped iteration-26
shape is stale and should be replaced by the consensus microhead split: common
work through clean `PR05D` and `PR06A-D`, PR07 isolated as a runtime-gated lane,
and `PR09` through `PR15A-C` forked from `PR06D`. It rejects Cycle293,
Cycle306, Cycle308 grouped manifests, `ready/*`, raw `PR07D`, `PR17`, `PR18`,
and `PR18x` as active filing sources. The latest feedback-action is still
`20260517T220648Z`; it promoted iteration 26 and generated a newer manifest, but
that is now older than the latest synthesis. Filing, broad final-stack fuzz, and
stack-wide validation remain blocked by the fresh-split audit, PR07
collaboration-ready owner evidence, and seed `1020002`.

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
`413G`, and headroom false. The health graph does not use historical
aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-real-user-editing` and
`novelty-ws-real-user-rich-text` as enabled groups. Current-output duplicate
share is `0.0000` and current summary startup failures are `0`. The
duplicate/noise feedback-action applied the producer-side pause/block fix and
restarted the monitor; the synthesis still rejects a durable all-clear until the
new root demonstrates sustained suppression of no-product startup holds while
preserving product-evidence signatures.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T22:40:00Z` show bursty CPU. The latest
25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest sample
at `84.1%`. Over those same 25 samples, one-minute, five-minute, and 15-minute
load all exceeded the `64` logical CPU count in `2` windows, and at least one
load window exceeded it in `9`. The newest 1/5/15-minute load sample is
`93.34`, `78.93`, and `63.85`, so the latest one- and five-minute windows are
above the logical CPU count while the 15-minute window is just below it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-real-user-editing` and `novelty-ws-real-user-rich-text`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted mix shows `31`
browser/e2e lanes across `27` groups, plus `1` `unit-property` lane and `1`
`coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server` has persona-loop smoke evidence but `0` collector-visible
execution count/rate in this graph. `backend-api` and standalone fuzz-only
assertion work also remain `0` in the committed graph counters.

The latest level-mix synthesis, `20260517T221224Z`, rejects the realized mix as
valid live materialization proof. It reports only `7/24` live browser PIDs across
the roots it checked: `coverage=2`, `focused=2`, `strict=0`, and `gap=3`. Its
concrete recommendation is to repair existing focused, strict, and gap
browser/e2e watchdog/materialization paths first, keep `unit-property=1`, keep
coverage-guided lower-level lanes capped, and leave `fuzz-assertion` counted as
zero until it has audited run roots, status, and lane events. Its matching
feedback-action file is empty. Treat the graph as supervisor-history accounting,
not live PID proof.

The latest native-harness synthesis file is empty, but the latest native action
validated and started a rich-text CRDT `coverage-guided-lower-level` lane. The
latest protocol-server action reports a passing HTTP polling REST smoke with
root/lane `events.ndjson`, while the refreshed graph still has `0` counted
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

The latest collected execution data has about `5,378,476` completed test
executions: `126,271` browser/e2e, `3,006` transport/integration, `4,820,864`
unit-property, and `428,335` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `5,528` browser/e2e test executions/hour, `8,448`
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

On that triage-output metric, browser/e2e currently dominates: `621` unique
likely-real findings over about `1,961.3` runner-hours, or `31.66` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5407` candidates
over `1,961.3` runner-hours (`275.68` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `5` over `25.8` runner-hours
(`19.41` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`134`), three-user late join (`111`),
permissions/auth/locks (`86`), real-user editing (`81`), and parser
serialization (`38`). The broader unique-output candidate view is led by
three-user late join (`736`), session lifecycle (`662`), real-user editing
(`649`), revision persistence (`442`), and permissions/auth/locks (`432`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5252.7` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2740.7` for unit/property.

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
| `multi-reload-lifecycle` | 3350 | 122 | 0 | 3.6% |
| `revision-persistence` | 4669 | 179 | 0 | 3.8% |
| `parser-serialization` | 3448 | 202 | 0 | 5.9% |
| `real-user-editing` | 7390 | 592 | 0 | 8.0% |
| `parser-transform` | 4300 | 445 | 0 | 10.3% |
| `common-blocks` | 4198 | 452 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6323 | 1178 | 0 | 18.6% |
| `long-session-large-doc` | 2962 | 577 | 0 | 19.5% |
| `persistence-no-title` | 3373 | 914 | 0 | 27.1% |
| `session-lifecycle` | 8321 | 2510 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 524 | 1000 |
| action reload-post-action next 2000 tier | 1068 | 2000 |
| real-user body save/reload next 1000 tier | 583 | 1000 |
| successful real-user-editing records next 1000 tier | 592 | 1000 |
| action ui-format-paragraph next 2000 tier | 1677 | 2000 |

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
and independent `PR09` through `PR15A-C` forked from `PR06D`. The latest
feedback-action still only applied Cycle308 iteration-26 feedback and generated
a manifest at `2026-05-17T22:23:11Z`, so it is now stale relative to the latest
synthesis. Filing, broad final-stack fuzz, raw `PR07D`, `PR17`, `PR18`, and
`PR18x` remain deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T22:39:25Z`, has `13`
suggested rows totaling `8776` net LOC. The largest current rows by net LOC are
`PR 13B fallback` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 11`
(`1141`), `PR 13A` (`1126`), `PR 6` (`732`), `PR 7B` (`396`),
`PR 13C fallback` (`294`), `PR 14` (`276`), `PR 1` (`162`), `PR 4` (`159`),
`PR 3` (`53`), and `PR 2` (`52`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. The
latest full health sample has headroom false, quality issues `0`, warnings `0`,
and `413G` free memory. The latest one- and five-minute load windows are above
the `64` logical CPU count, while the 15-minute load window is just below it.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop still rejects converting the current live
graph into a durable all-clear. The latest synthesis says producer-side
scheduling could leak mixed product-evidence runs when no-product
`pre_action_bootstrap_stall` was classified as `known-noise`; the matching
feedback-action applied policy `21`, paused the leaking producers, and restarted
the monitor path. Because the latest graph has
`duplicateShareCurrent=0.0000` and `0` current summary startup failures, the
next check is sustained suppression under the new root, not a durable all-clear
claim.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes Cycle308 iteration 26 with a microhead consensus:
common work through clean `PR05D` and `PR06A-D`, runtime-gated PR07 work, and
independent `PR09` through `PR15A-C` forked from `PR06D`. The latest
feedback-action generated a Cycle308 manifest/deferred refresh, but the
following synthesis now calls that shape stale and notes unaudited iteration-28
drift. Filing remains blocked by a current fresh-split audit, PR07
collaboration-ready owner evidence, and seed `1020002` for final-stack work.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes validated rich-text lower-level and HTTP
polling protocol harness work, but the graph still shows `0` latest-rate
coverage-guided lower-level and `0` cumulative protocol-server executions.
The latest level-mix synthesis rejects the realized mix because it found only
`7/24` live browser PIDs and says to repair browser/e2e materialization before
adding JS lower-level capacity. The report therefore treats lower-level and
protocol outputs as harness evidence until collector-visible lower-level and
protocol counts plus live PID checks agree. The next narrow checks are
duplicate-share stability, browser PID materialization, collector-visible
lower-level/protocol counts, and PR07 root/runtime plus replay evidence before
any filing or final-stack claim.
