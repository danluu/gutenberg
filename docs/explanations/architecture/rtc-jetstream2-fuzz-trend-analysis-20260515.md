# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T03:57:27Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T03:50:04Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T03:50:02Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2189` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T03:50:04Z`, coverage
files grew from `272` to `49442`, a delta of `49170`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0.0000` and current summary startup failures
`0`. The last twelve current-output duplicate-share samples are three `0.0000`
samples, `0.5000`, six `0.0000` samples, `1.0000`, and `0.0000`, so the graph
shows improvement after a recent recurrence rather than a durable all-clear.
The latest pass has `0` quality issues, `0` warnings, `410.8G` free memory, and
a false monitor headroom flag. This report uses current-output duplicate/noise
and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share is
`0.3445` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the clean latest point or startup-failure suppression as durable recovery. The
latest duplicate/noise synthesis, `20260518T030811Z`, calls the remaining issue
producer/control-plane churn, not a product-failure spike. The matching
feedback-action tightened startup-stall pause thresholds, capped coverage-guided
producer fanout inside the novelty monitor, stopped materialization-floor
bypasses during startup-noise holds, restarted only the coverage-guided
control-plane sessions, and reported no current actionable startup signatures
after the restart. The refreshed graph now has one later clean monitor point,
but the feedback still rejects treating a single clean point as the desired live
steady state.

The PR-split persona loop rejects a filing-ready interpretation and rejects the
grouped i40 topology as the final review shape. The latest synthesis,
`20260518T034456Z`, uses the Cycle324/i40 ungrouped topology from the latest
completed nonzero finalization visible to the reviews, `20260518T033236Z`, and
rejects the later zero-byte `034240Z` finalization as review evidence for this
cycle. It adds `HARNESS-WS-URL` and `HARNESS-PLUGIN-STATUS` as ready harness
rows, not product fixes. Filing, broad final-stack fuzzing, and stack-wide
validation remain blocked by PR07 owner evidence, final-stack-only seed
`1020002`, and fresh manifest/finalization audit.

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
`410.8G`, and headroom false. The last twelve current-output duplicate-share
samples are three `0.0000` samples, `0.5000`, six `0.0000` samples, `1.0000`,
and `0.0000`. The latest graph therefore shows a clean current-output point
after a recent duplicate/noise recurrence, while startup failures remain
suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently lists `novelty-ws-async-server-blocks` and
`novelty-ws-three-user-late-join` as enabled groups. Current-output duplicate
share is `0.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis rejects treating this as a durable all-clear: it
frames the remaining problem as producer/control-plane churn that can keep
creating fresh no-product startup/setup duplicates while materialization
backfills browser groups. The matching feedback-action capped coverage-guided
producer fanout at two groups, tightened no-product startup-stall thresholds,
restarted the coverage-guided control plane, and reported no queued, analyzed,
deep-analyzed, or live-analysis-launched strict startup family afterward. The
new graph point is consistent with that remediation, but one clean sample is
not enough to prove the churn is gone.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T03:50:02Z` show bursty CPU. The
latest 25 CPU samples range from `61.0%` to `82.7%` utilization, with the latest
sample at `82.7%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `11` windows, five-minute load in `14`, 15-minute load
in `11`, and at least one load window exceeded it in `16`. The newest
1/5/15-minute load sample is `80.15`, `80.75`, and `71.98`; all three latest
load windows are above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-async-server-blocks` and `novelty-ws-three-user-late-join`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `30` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T033934Z`, says to keep
browser/e2e at or above `24` lanes, keep `coverage-guided-lower-level=3` and
`unit-property=1` capped, and restore exactly one audited
`protocol-server-http-polling` lane only after fixing the protocol bootstrap and
root-accounting blockers. Its matching feedback-action file is empty; the
previous `20260518T023623Z` action restored browser materialization, validated
browser PID samples of `24` then `25`, and reported `29` active browser lanes.
The graph now shows `30` browser/e2e lanes, but it still shows only one
coverage-guided lower-level lane and zero trusted protocol-server, backend-api,
or standalone fuzz-only assertion lanes. The feedback treats `fuzz-assertion`
tmux activity as zero until audited current-run-root `status.tsv` and
`events.ndjson` wiring exists.

The latest native-harness synthesis, `20260518T034413Z`, still selects the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, using Node/V8 coverage-guided JS rather than C/C++
libFuzzer/AFL; its matching action file is empty. The previous
`20260518T032150Z` native-harness action implemented/adopted that harness and
validated a bounded smoke with `fuzzLevel: "coverage-guided-lower-level"` event
output. The latest protocol-server synthesis file, `20260518T035118Z`, is
empty; the previous `20260518T033926Z` synthesis/action selected and validated
the HTTP polling REST protocol/server harness. The trend counters still show
`0` sustained protocol-server executions. The latest fuzz-only assertion apply
file, `20260518T011940Z`, added fuzz-gated persistence and real-user formatting
witnesses and restarted browser loops, but standalone `fuzz-assertion`
executions remain `0` in the committed graph.

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

The latest collected execution data has about `5,511,530` completed test
executions: `144,765` browser/e2e, `3,006` transport/integration, `4,915,936`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `5,824` browser/e2e test executions/hour,
`13,824` unit-property executions/hour, and `0` coverage-guided-lower-level
executions/hour, with `0` current rate for transport/integration, backend/API,
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

On that triage-output metric, browser/e2e currently dominates: `674` unique
likely-real findings over about `2,046.3` runner-hours, or `32.94` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,602` candidates
over `2,046.3` runner-hours (`273.76` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `30.8` runner-hours
(`16.24` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`156`), three-user late join (`118`), real-user
editing (`91`), permissions/auth/locks (`86`), and parser serialization (`41`).
The broader unique-output candidate view is led by three-user late join (`765`),
session lifecycle (`700`), real-user editing (`664`), revision persistence
(`464`), and permissions/auth/locks (`445`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5911.9` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2331.6` for unit/property.

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
| `revision-persistence` | 4867 | 194 | 0 | 4.0% |
| `multi-reload-lifecycle` | 3480 | 142 | 0 | 4.1% |
| `parser-serialization` | 3547 | 212 | 0 | 6.0% |
| `real-user-editing` | 7655 | 602 | 0 | 7.9% |
| `common-blocks` | 4316 | 466 | 0 | 10.8% |
| `parser-transform` | 4464 | 491 | 0 | 11.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `long-session-large-doc` | 3185 | 578 | 0 | 18.1% |
| `block-gauntlet` | 6456 | 1213 | 0 | 18.8% |
| `persistence-no-title` | 3514 | 1011 | 0 | 28.8% |
| `session-lifecycle` | 8580 | 2598 | 0 | 30.3% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1091 | 2000 |
| real-user title save/reload next 1000 tier | 547 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 606 | 1000 |
| action ui-format-paragraph next 2000 tier | 1815 | 2000 |

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
took roughly `7.2` to `13.5` minutes in this snapshot. The newest completed
review cycle, `20260518T034456Z`, took `10.8` minutes from
`2026-05-18T03:44:56Z` to `2026-05-18T03:55:45Z`. The latest synthesis rejects a
filing-ready interpretation and supersedes the grouped i40 working hypothesis:
the grouped shape should be replaced by the Cycle324/i40 ungrouped topology from
the latest completed nonzero finalization visible to the reviews,
`20260518T033236Z`. The later `034240Z` finalization was zero-byte at review
time and is not evidence for this cycle. The latest feedback-action before that
synthesis had refreshed a `50`-row manifest with `PASS` and started PR07
stale-session cleanup plus replacement owner replay, but the newer synthesis
still blocks filing, broad final-stack fuzzing, and stack-wide validation until
PR07 owner evidence, seed `1020002`, and fresh manifest/finalization audit are
resolved.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T03:46:14Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. Recent
samples still include `1.0000` and `0.5000` duplicate-share recurrences, so the
latest graph is a post-remediation clean point rather than an all-clear. The
latest full health sample has headroom false, quality issues `0`, warnings `0`,
and `410.8G` free memory. The latest 1/5/15-minute load windows are `80.15`,
`80.75`, and `71.98`; all are above the `64` logical CPU count. Historical
aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop also rejects converting the latest graph into a
durable all-clear. The latest synthesis says strict no-product
`pre_action_bootstrap_stall` is mostly blocked from expensive analysis, but the
remaining issue is producer/control-plane churn: supervisor and novelty
scheduling can still emit fresh no-product startup/setup failures while browser
materialization backfills groups. The latest feedback-action implemented the
producer cap and startup-threshold tightening, restarted coverage-guided
control-plane sessions, and reported no current strict startup family or global
setup REST empty-JSON family in producer/consumer state. The refreshed graph has
one later clean monitor pass using current-output duplicate/share and summary
startup failures, but the next check is continued live stability, not historical
aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T034456Z` synthesis says the grouped i40 topology should be
replaced by the Cycle324/i40 ungrouped shape from the latest completed nonzero
finalization visible to the reviews, `20260518T033236Z`, while the later
`034240Z` finalization was zero-byte at review time. The report still treats
filing as blocked until PR07 owner replay, seed `1020002`, fresh
finalization/manifest evidence, and rebuilt validation are resolved.

The committed fuzzing graph is still browser/e2e-heavy: `30` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes a ready rich-text CRDT
coverage-guided lower-level harness, a validated HTTP polling protocol/server
harness, and diagnostic fuzz-only browser assertions, but the committed graph
still shows `0` sustained protocol-server executions and no standalone
`fuzz-assertion` executions. The latest level-mix synthesis rejects adding more
JS lower-level capacity, keeps browser/e2e protected, and allows only one
audited protocol-server lane after bootstrap/accounting blockers are fixed. The
report therefore treats protocol, backend, and assertion work as harness/action
evidence until collector-visible counts appear. The next narrow checks are live
duplicate/noise stability, collector-visible protocol and assertion counts, PR07
replay evidence, and rebuilt validation before any filing or final-stack claim.
