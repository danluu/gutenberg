# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T06:56:34Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T06:53:11Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T06:50:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2215` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T06:53:11Z`, coverage
files grew from `272` to `50739`, a delta of `50467`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is noisy on the current-output-dir
metric: `duplicateShareCurrent=1.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples include
eleven `0.0000` samples and one latest `1.0000` recurrence, so startup-failure
suppression is not durable duplicate/noise recovery evidence by itself. The
latest pass has `0` quality issues, `0` warnings, `407.8G` free memory, and a
false monitor headroom flag. This report uses current-output duplicate/noise
and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3435` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it still rejects
reading startup-failure suppression as durable recovery. The latest
duplicate/noise synthesis, `20260518T063340Z`, says strict no-product
`pre_action_bootstrap_stall` records are mostly sealed from analysis consumers,
but browser producer scheduling can miss paused `no-analysis` drain evidence
and backfill new no-product startup producers. The latest feedback-action,
`20260518T060527Z`, implemented the earlier bounded fuzzer-side fix, aligned
current coverage sessions on `run-20260518T062837Z`, and validated that young
active dirs were skipped as gate-only no-product startup drains. The newer
synthesis narrows the remaining fix to producer enable/fallback/materialization
decisions using active plus paused current drain evidence, not historical
aggregate noise.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T063339Z`, says the Cycle338 `HOLD-07EPOCH-SYNC` shape is
stale and should be replaced by the Cycle324/i40 ungrouped split with a clean
sync-manager epoch guard after `PR07B1` at `c1d8ca017bc`. It says broad
final-stack fuzzing, GitHub filing, and rebuilt stack-wide validation remain
blocked by PR07 owner evidence and seed `1020002`, while independent manifest
audit, PR07 owner replay, `1030002` route diagnostics, and loop repair should
continue. The latest feedback-action launched the earlier bounded PR07B2
restack/audit job, which hit a conflict confined to
`packages/sync/src/test/manager.ts`; it does not make PR07 publication-ready.

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
and summary startup failures: `duplicateShareCurrent=1.0000`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`407.8G`, and headroom false. The last twelve current-output duplicate-share
samples include eleven `0.0000` samples and one latest `1.0000` recurrence. The
latest graph therefore shows a live duplicate/noise recurrence while startup
failures remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently lists `novelty-ws-three-user-late-join` and
`novelty-ws-revision-persistence` as enabled groups. Current-output duplicate
share is `1.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis rejects treating startup-failure suppression as a
durable all-clear: it frames the remaining problem as producer scheduling that
can miss paused current no-analysis drain evidence and backfill strict
no-product startup-noise producers. The next check is active plus paused current
drain blocking for no-product startup holds plus sustained low current-output
duplicate share, not whether the historical aggregate duplicate share falls.
The earlier matching action validated consumer-path gating on a young current
root, but the refreshed graph now has a live current-output duplicate
recurrence.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T06:50:00Z` show bursty CPU. The
latest 25 CPU samples range from `61.0%` to `83.3%` utilization, with the latest
sample at `76.5%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `16` windows, five-minute load in `19`, 15-minute load
in `19`, and at least one load window exceeded it in `21`. The newest
1/5/15-minute load sample is `68.50`, `69.82`, and `72.31`; all three latest
load windows are above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-three-user-late-join` and `novelty-ws-revision-persistence`.

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
contradicts it. The latest level-mix synthesis, `20260518T063151Z`, recommends
a narrow mix change only: keep browser/e2e at or above `24`, cap
`coverage-guided-lower-level` at `4`, keep `unit-property=1`, run one
`protocol-server` lane, add one `backend-api` lane once accounting sees it, and
keep standalone `fuzz-assertion=0` until audited. It also says backend/API is
live in action context but omitted from observed root/yield accounting, while
paused startup-stall groups must not satisfy browser capacity. The committed
graph now shows `27` browser/e2e lanes, one coverage-guided lower-level lane,
one unit-property lane, and zero collector-visible protocol-server, backend/API,
or standalone fuzz-assertion lanes. That is a graph/persona contradiction on
protocol/backend activity: this report treats protocol/backend work as
action-context evidence until the trend counters ingest those lanes.

The latest native-harness synthesis, `20260518T064105Z`, keeps the rich-text
CRDT merge harness as the first ready isolated coverage-guided lower-level
target and requires root/lane `events.ndjson` accounting. The latest
native-harness action, `20260518T062343Z`, says the multiblock rich-text CRDT
lower-level target is running and emitted collector-style events, but the
committed graph still has only one collector-visible coverage-guided lower-level
lane.

The latest protocol-server synthesis and action, `20260518T064112Z`, keep HTTP
polling REST as the first protocol/server target and report a bounded validated
2-seed x 20-case run with `fuzzLevel: "protocol-server"` events. The committed
graph still has `0` protocol-server cumulative executions and no current
protocol rate, so the validated harness has not yet become collector-visible
sustained trend data. The latest fuzz-only assertion apply file added
browser-gated assertions and restarted affected browser loops, but standalone
`fuzz-assertion` executions remain `0`.

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

The latest collected execution data has about `5,583,584` completed test
executions: `163,859` browser/e2e, `3,006` transport/integration, `4,968,896`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `4,288` browser/e2e test executions/hour,
`12,032` unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `704` unique
likely-real findings over about `2,141.1` runner-hours, or `32.88` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,737` candidates
over `2,141.1` runner-hours (`267.95` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `33.7` runner-hours
(`14.82` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`172`), three-user late join (`122`), real-user
editing (`94`), permissions/auth/locks (`86`), and parser serialization (`43`).
The broader unique-output candidate view is led by three-user late join (`788`),
session lifecycle (`725`), real-user editing (`673`), revision persistence
(`491`), and permissions/auth/locks (`451`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `6524.3` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2128.7` for unit/property.

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
| `multi-reload-lifecycle` | 3686 | 153 | 0 | 4.2% |
| `revision-persistence` | 5404 | 232 | 0 | 4.3% |
| `parser-serialization` | 3682 | 228 | 0 | 6.2% |
| `real-user-editing` | 7858 | 602 | 0 | 7.7% |
| `common-blocks` | 4409 | 474 | 0 | 10.8% |
| `parser-transform` | 4640 | 504 | 0 | 10.9% |
| `long-session-large-doc` | 3417 | 580 | 0 | 17.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6629 | 1248 | 0 | 18.8% |
| `session-lifecycle` | 8785 | 2638 | 0 | 30.0% |
| `persistence-no-title` | 3642 | 1128 | 0 | 31.0% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1095 | 2000 |
| real-user title save/reload next 1000 tier | 551 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 610 | 1000 |
| action ui-format-paragraph next 2000 tier | 1880 | 2000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is led by code coverage, action pairs, real-user,
history, operation-ledger, payload-size, block-depth, other, invariant, block,
action, and transport observations. The plot separates breadth (`keys`) from
repeated observations (`total_count`) so broad coverage is not hidden inside raw
event volume.

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
took roughly `8.6` to `15.1` minutes in this snapshot. The newest completed
review cycle, `20260518T063339Z`, took `13.6` minutes from
`2026-05-18T06:33:39Z` to `2026-05-18T06:47:15Z`. The latest synthesis rejects a
filing-ready interpretation and says the Cycle338 `HOLD-07EPOCH-SYNC` shape is
stale. It returns PR07 to the Cycle324/i40 ungrouped base plus a clean
sync-manager epoch guard after `PR07B1` at `c1d8ca017bc`; `HOLD-07B2` and
`HOLD-07C` remain held. Filing, broad final-stack fuzzing, and rebuilt stack
validation remain blocked by PR07 owner evidence and seed `1020002`. The latest
feedback-action launched the earlier bounded PR07B2 restack/audit job, which
completed with a conflict confined to `packages/sync/src/test/manager.ts`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T06:46:27Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `1.0000`, after eleven clean samples and one
latest `1.0000` recurrence in the last twelve samples. The latest full health
sample has headroom false, quality issues `0`, warnings `0`, and `407.8G` free
memory. The latest 1/5/15-minute load windows are `68.50`, `69.82`, and `72.31`;
all three are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says strict no-product
`pre_action_bootstrap_stall` records are mostly sealed from Codex analysis, but
browser producer scheduling can still miss paused `no-analysis` drain evidence
and backfill strict no-product startup-noise producers. The next safe fix is a
narrow active plus paused current-drain producer block for no-product startup
holds while preserving failures with source product evidence. The earlier action
implemented the bounded fuzzer-side consumer/gate fix and validated a young
current root, but the refreshed graph has a latest live duplicate recurrence.
Both graph and persona-loop evidence keep the next check focused on producer
scheduling and sustained low current-output duplicate share, not historical
aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T063339Z` synthesis says the Cycle338 `HOLD-07EPOCH-SYNC` shape
is stale and returns PR07 to Cycle324/i40 plus a clean sync-manager epoch guard
after `PR07B1` at `c1d8ca017bc`; held PR07 siblings stay held. The latest
feedback-action attempted the earlier bounded PR07B2 restack/audit and found a
test-file conflict, so filing and broad final-stack fuzzing remain blocked on
PR07 owner evidence, seed `1020002`, route diagnostics, strict stale replay, and
rebuilt validation.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes a started rich-text CRDT
coverage-guided lower-level harness, browser-gated fuzz-only assertions, a
validated HTTP polling protocol/server harness, and level-mix evidence that a
backend/API lane is live but missing from accounting. The graph rejects treating
protocol/backend as collector-visible sustained fuzzing yet because both trend
counters remain `0`. The next narrow checks are active plus paused current-drain
duplicate/noise scheduling, collector-visible protocol/backend and assertion
counts, PR07 replay evidence, disk relief, and rebuilt validation before any
filing or final-stack claim.
