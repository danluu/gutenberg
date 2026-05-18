# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T03:05:36Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T03:00:07Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T03:00:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2182` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T03:00:07Z`, coverage
files grew from `272` to `49246`, a delta of `48974`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0.0000` and current summary startup failures
`0`. The last twelve current-output duplicate-share samples are six `0.0000`
samples, then `1.0000`, then three `0.0000` samples, then `0.5000`, then
`0.0000`, so the graph shows recent duplicate/noise recurrences but not a dirty
latest point. The latest pass has `0` quality issues, `0` warnings, `420.6G`
free memory, and a false monitor headroom flag. This report uses current-output
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3447` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
recent clean samples or the latest startup-failure suppression as durable
recovery. The latest duplicate/noise
synthesis, `20260518T022520Z`, says strict no-product startup failures are now
mostly blocked at analysis consumers, but upstream producer/scheduler policy can
still relaunch startup-noise lanes before durable `no-analysis`/pause state is
enforced. It also says product-evidence duplicate families such as
`reload_rejoin_awareness_stall` remain visible but need earlier representative
caps. The matching feedback-action, `20260518T022520Z`, implemented the bounded
producer/consumer fix, restarted the active root, found no queued or running
strict no-product startup noise, and left product-evidence representatives
visible. It still treats product-evidence representatives at the duplicate-share
threshold as an intentional remaining risk, not an all-clear.

The PR-split persona loop rejects a filing-ready interpretation and rejects the
grouped i40 topology as the final review shape. The latest synthesis,
`20260518T024108Z`, says the grouped i40 split should be replaced by the
Cycle324 ungrouped `finalized/cycle324-i40/*` shape. The latest non-empty
feedback-action updated the current split, recorded a usable Cycle324
finalization with `46/46` audited ranges, completed a fresh non-Docker
manifest/audit refresh with `46` rows and `PASS`, and verified root space above
threshold. Filing and final-stack validation remain blocked by missing PR07
owner evidence, a stale active PR07 replay, and final-stack-only seed
`1020002`. The latest synthesis also rejects zero-byte finalization reports and
stale manifests as evidence.

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
`420.6G`, and headroom false. The last twelve current-output duplicate-share
samples are six `0.0000` samples, then `1.0000`, then three `0.0000` samples,
then `0.5000`, then `0.0000`. The latest graph therefore shows a clean latest
current-output point, but recent duplicate/noise recurrences keep it from being
durable recovery. The health graph does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-revision-persistence` and
`novelty-ws-revision-recovery` as enabled groups. Current-output duplicate share
is `0.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis rejects treating this as a durable all-clear, while
the matching feedback-action says the bounded producer/consumer fix is now
applied and no no-product strict startup noise remains queued in the active
root. Product-evidence representatives remain visible by design.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T03:00:01Z` show bursty CPU. The
latest 25 CPU samples range from `61.0%` to `81.0%` utilization, with the latest
sample at `73.4%`. Over those same 25 samples, one-minute, five-minute, and
15-minute load all exceeded the `64` logical CPU count in `7` windows, and at
least one load window exceeded it in `16`. The newest 1/5/15-minute load sample
is `84.10`, `67.64`, and `60.80`; the one-minute and five-minute windows are
above the logical CPU count, while the 15-minute window is below it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-revision-persistence` and `novelty-ws-revision-recovery`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `27` browser/e2e lanes across `27` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest non-empty level-mix synthesis, `20260518T023623Z`,
says the trusted live mix should still prioritize materializing durable
browser/e2e capacity at or above `24` verified runner PIDs after disk/load
preflight, not adding more JS lower-level lanes now. It treats
`coverage-guided-lower-level=3` and `unit-property=1` as capped useful
sidecars, and treats `protocol-server`, standalone fuzz-only assertion work, and
`backend-api` as `0` trusted active lanes until audited current-root wiring and
fresh `status.tsv`/`events.ndjson` evidence exist.

The latest native-harness synthesis, `20260518T024846Z`, keeps rich-text CRDT
merge as the first ready isolated coverage-guided lower-level target and
explicitly says this is Node/V8 coverage-guided JS, not C/C++ libFuzzer/AFL. The
latest protocol-server synthesis, `20260518T025700Z`, keeps the HTTP polling
REST endpoint as the first protocol/server target and requires trend-visible
`fuzzLevel: "protocol-server"` event accounting before it should count as live
throughput. The latest fuzz-only assertion apply file, `20260518T011940Z`, added
fuzz-gated persistence and real-user formatting witnesses and restarted the
coverage-guided, focused-shards, and strict-expansion browser loops. These are
harness and assertion evidence, not yet collector-visible protocol/backend or
standalone assertion throughput in this graph: the refreshed counters still show
`0` `protocol-server`, `0` `backend-api`, and `0` standalone `fuzz-assertion`
executions.

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

The latest collected execution data has about `5,492,336` completed test
executions: `141,315` browser/e2e, `3,006` transport/integration, `4,900,192`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `1,300` browser/e2e test executions/hour, `5,888`
unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `665` unique
likely-real findings over about `2,028.4` runner-hours, or `32.78` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,573` candidates
over `2,028.4` runner-hours (`274.75` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `29.9` runner-hours
(`16.70` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`152`), three-user late join (`115`), real-user
editing (`90`), permissions/auth/locks (`86`), and parser serialization (`40`).
The broader unique-output candidate view is led by three-user late join (`759`),
session lifecycle (`693`), real-user editing (`662`), revision persistence
(`462`), and permissions/auth/locks (`441`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5798.6` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2397.8` for unit/property.

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
| `multi-reload-lifecycle` | 3459 | 136 | 0 | 3.9% |
| `revision-persistence` | 4840 | 191 | 0 | 3.9% |
| `parser-serialization` | 3538 | 212 | 0 | 6.0% |
| `real-user-editing` | 7639 | 602 | 0 | 7.9% |
| `common-blocks` | 4309 | 466 | 0 | 10.8% |
| `parser-transform` | 4445 | 482 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `long-session-large-doc` | 3125 | 578 | 0 | 18.5% |
| `block-gauntlet` | 6448 | 1213 | 0 | 18.8% |
| `persistence-no-title` | 3512 | 1009 | 0 | 28.7% |
| `session-lifecycle` | 8541 | 2583 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1091 | 2000 |
| real-user title save/reload next 1000 tier | 547 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 606 | 1000 |
| action ui-format-paragraph next 2000 tier | 1809 | 2000 |

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
review cycle, `20260518T024108Z`, took `8.6` minutes from
`2026-05-18T02:41:08Z` to `2026-05-18T02:49:43Z`. The latest synthesis rejects a
filing-ready interpretation and supersedes the grouped i40 working hypothesis:
the grouped shape should be replaced by Cycle324 ungrouped
`finalized/cycle324-i40/*` refs. The matching feedback-action applied the
ungrouped split, recorded usable `20260518T024222Z` finalization evidence with
`46/46` audited ranges, completed a fresh non-Docker manifest/audit refresh with
`46` rows and `PASS`, and verified root space is above threshold. Filing and
final-stack validation still remain blocked by missing PR07 owner evidence, a
stale active PR07 replay, and final-stack-only seed `1020002`; stale
Cycle293/Cycle306/local-publish rows, fallback-tail `PR05D`, raw `PR07D`,
`PR17`, `PR18`, and `PR18x` are still rejected as filing sources.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T02:51:22Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), and `PR 10` (`141`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. Recent
samples still include `1.0000` and `0.5000` duplicate-share recurrences, so the
latest clean point is not durable recovery by itself. The latest full health
sample has headroom false, quality issues `0`, warnings `0`, and `420.6G` free
memory. The latest 1/5/15-minute load windows are `84.10`, `67.64`, and
`60.80`; one-minute and five-minute load are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop also rejects converting the latest graph into a
durable all-clear. The latest synthesis says strict no-product startup rows are
mostly blocked at analysis consumers, but producer/scheduler lag can still
relaunch startup-noise lanes before durable `no-analysis`/pause state is
enforced, and product-evidence duplicate siblings still need earlier caps after
one representative exists. The matching feedback-action says the bounded
producer/consumer fix has landed and no no-product strict startup noise remains
queued in the active root; the next check is current-root duplicate/share triage
after that restart, not another historical aggregate readout.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T024108Z` synthesis says the grouped i40 topology should be
replaced by the Cycle324 ungrouped shape from `finalized/cycle324-i40/*`. Filing
remains blocked by PR07 owner evidence, a stale active PR07 replay,
final-stack-only seed `1020002`, and rebuilt validation. The matching
feedback-action moved root space above threshold and refreshed the Cycle324
manifest, but the latest synthesis still rejects zero-byte finalization reports
and stale manifests as evidence.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes a rich-text CRDT coverage-guided
lower-level harness decision, an HTTP polling protocol/server harness decision,
and diagnostic fuzz-only browser assertions, but the committed graph still shows
`0` protocol-server executions and no standalone `fuzz-assertion` executions.
The latest level-mix synthesis rejects adding more JS lower-level lanes before
browser/e2e materialization is stable and treats protocol, backend, and
standalone assertion work as zero trusted active lanes until collector-visible
current-root evidence appears. The report therefore treats protocol, backend,
and assertion work as harness/action evidence until collector-visible counts
appear. The next narrow checks are post-restart duplicate/noise validation, live
browser materialization under current load, collector-visible lower-level,
protocol, and assertion counts, PR07 replay evidence, and rebuilt validation
before any filing or final-stack claim.
