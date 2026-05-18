# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T01:03:24Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T00:53:24Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2164` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T00:53:24Z`, coverage
files grew from `272` to `48609`, a delta of `48337`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: the newest sample has `duplicateShareCurrent=0.0000` and current
summary startup failures `0`. The previous two samples were `0.5000`, after a
`0.6000` sample and a short clean stretch, so this is not yet a durable
all-clear. The same latest pass has `0` quality issues, `0` warnings, `420.3G`
free memory, and a true monitor headroom flag. This report uses current-output-dir
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3453` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the clean duplicate/noise point as durable recovery. The latest duplicate/noise
synthesis, `20260518T003742Z`, says strict no-product
`pre_action_bootstrap_stall` is not the current expensive-analysis leak. It
points instead at novelty scheduling, stale startup-noise state, live-analysis
wiring, and product-evidence duplicate-family steering. The latest
feedback-action file is empty. A prior non-empty duplicate/noise action tightened
startup gating and restarted live analysis, but this report still treats the
clean plotted point as a live status sample, not proof that the control-plane
issue is fixed.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T004223Z`, says the active target has advanced again to
`fresh-prset/iteration-40/*`; the earlier Cycle318/iteration-39 audit from the
latest feedback-action is now stale. It keeps the Cycle316/i36 split shape,
holds `PR03B`, `PR07B2`, and `PR07C`, rejects raw `candidate/*` or
`deferred/*`, fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, `PR18x`, and
stale local publish rows as filing evidence, and says seed `1020002` blocks
final-stack fuzz/filing only. Filing, broad final-stack fuzzing, and rebuilt
stack validation remain blocked on fresh i40 audit evidence and PR07 owner
replay.

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
`420.3G`, and headroom true. The last eight current-output duplicate-share
samples are `0.0000`, `0.0000`, `0.5000`, `0.5000`, `0.6000`, `0.5000`,
`0.5000`, and `0.0000`. The latest graph therefore shows a clean current sample
after recent duplicate/noise pressure, not sustained recovery. The health graph
does not use historical aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-block-gauntlet` and
`novelty-ws-common-blocks` as enabled groups. Current-output duplicate share is
`0.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis still says the remaining risk is producer/control-plane
behavior, especially live-analysis wiring, stale startup-noise pauses, and
product-evidence duplicate-family steering. The next narrow check is sustained
active/current cleanliness across root rolls and cooldown expiry.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T01:00:01Z` show bursty CPU. The
latest 25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest
sample at `72.6%`. Over those same 25 samples, one-minute, five-minute, and
15-minute load all exceeded the `64` logical CPU count in `4` windows, and at
least one load window exceeded it in `11`. The newest 1/5/15-minute load sample
is `36.47`, `56.94`, and `64.28`; the one- and five-minute windows are below
the logical CPU count, while the 15-minute window is still just above it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-block-gauntlet` and `novelty-ws-common-blocks`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `25` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix. The latest
level-mix synthesis, `20260518T001753Z`, rejects treating the browser/e2e-heavy
plot as stable live health by itself: its two-sample check saw browser PIDs
fall from `27` to `7`. It recommends repairing browser
materialization and telemetry first, keeping `unit-property` capped, not
expanding coverage-guided lower-level capacity, and not starting a protocol lane
until browser/e2e stays above the `24` lane floor across repeated live samples.
The matching feedback-action says a later context reached `25` live browser PIDs,
started one audited protocol/server lane, and replaced a duplicate rich-text
lower-level lane with a multiblock oracle. That action evidence is ahead of the
committed counters and partly contradicts them: the refreshed graph still has
`0` protocol-server executions and one visible `coverage-guided-lower-level`
lane, still named `coverage-guided-lower-level-rich-text-crdt`.

The latest native-harness evidence keeps rich-text CRDT as the first ready
coverage-guided lower-level target, and the action report validated smoke
events for that harness. The latest protocol-server synthesis and action,
`20260518T004243Z`, validate a bounded HTTP polling REST smoke with
`fuzzLevel: "protocol-server"` events but report no long-lived protocol/server
tmux session from that action. The latest fuzz-only assertion apply file is
empty. These are harness and assertion evidence, not yet collector-visible
protocol/backend throughput in this graph: the refreshed counters still show
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

The latest collected execution data has about `5,445,644` completed test
executions: `133,087` browser/e2e, `3,006` transport/integration, `4,861,728`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `24` browser/e2e test executions/hour, `3,328`
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

On that triage-output metric, browser/e2e currently dominates: `645` unique
likely-real findings over about `1,990.0` runner-hours, or `32.41` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,501` candidates
over `1,990.0` runner-hours (`276.43` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `27.9` runner-hours
(`17.90` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`146`), three-user late join (`113`),
permissions/auth/locks (`86`), real-user editing (`84`), and parser
serialization (`39`). The broader unique-output candidate view is led by
three-user late join (`743`), session lifecycle (`684`), real-user editing
(`654`), revision persistence (`449`), and permissions/auth/locks (`437`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5510.2` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2570.5` for unit/property.

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
| `multi-reload-lifecycle` | 3385 | 126 | 0 | 3.7% |
| `revision-persistence` | 4747 | 184 | 0 | 3.9% |
| `parser-serialization` | 3517 | 211 | 0 | 6.0% |
| `real-user-editing` | 7518 | 602 | 0 | 8.0% |
| `parser-transform` | 4340 | 455 | 0 | 10.5% |
| `common-blocks` | 4240 | 454 | 0 | 10.7% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6359 | 1183 | 0 | 18.6% |
| `long-session-large-doc` | 3037 | 578 | 0 | 19.0% |
| `persistence-no-title` | 3454 | 958 | 0 | 27.7% |
| `session-lifecycle` | 8419 | 2537 | 0 | 30.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 539 | 1000 |
| action reload-post-action next 2000 tier | 1083 | 2000 |
| real-user body save/reload next 1000 tier | 598 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| action ui-format-paragraph next 2000 tier | 1748 | 2000 |

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
took roughly `7.2` to `12.7` minutes in this snapshot. The newest completed
review cycle, `20260518T004223Z`, took `11.4` minutes from
`2026-05-18T00:42:23Z` to `2026-05-18T00:53:46Z`. The latest synthesis rejects a
filing-ready interpretation and says the active target should use
`fresh-prset/iteration-40/*`, superseding stale Cycle318/i39 audit state while
preserving the Cycle316/i36 split shape. It keeps `PR03B`, `PR07B2`, and
`PR07C` held pending owner replay and first-divergence evidence, keeps PR09-PR15
forked from PR06, and rejects stale/local manifests, fallback-tail `PR05D`, raw
`PR07D`, `PR17`, `PR18`, and `PR18x` as filing sources. The latest
feedback-action completed an iteration-39 audit with `31` manifest rows, `8/8`
topology checks passing, and no head/bundle/manifest failures, but the newer
synthesis rejects that as the active filing source after iteration 40 advanced.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T00:54:43Z`, has `11`
suggested rows totaling `5,411` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 11` (`1141`), `PR 13A` (`1126`), `PR 6` (`732`),
`PR 14` (`276`), and `PR 9` (`183`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, and the latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. That
does not prove durable recovery because the preceding samples include `0.5000`,
`0.5000`, and `0.6000`. The latest full health sample has headroom true, quality
issues `0`, warnings `0`, and `420.3G` free memory. The latest 1/5/15-minute
load windows are `36.47`, `56.94`, and `64.28`, with only the 15-minute window
just above the `64` logical CPU count. Historical aggregate duplicate/noise is
not the live health signal.

The duplicate/noise persona loop rejects converting the clean current point into
a durable all-clear. The latest synthesis says strict no-product bootstrap
suppression is mostly not the current expensive-analysis leak; the remaining
risk is novelty/scheduling/live-analysis wiring and product-evidence duplicate
family steering. A prior action restarted live analysis and tightened startup
gating, but the latest feedback-action file is empty, so the next check is
sustained active/current cleanliness across root rolls and cooldown expiry.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes the iteration-39 audit with
`fresh-prset/iteration-40/*`, keeps `PR03B`, `PR07B2`, and `PR07C` held, and
rejects stale Cycle293, Cycle306, Cycle312, stale/local manifests, fallback-tail
`PR05D`, raw `PR07D`, `PR17`, `PR18`, `PR18x`, and zero-byte artifacts as filing
authority. PR07 owner replay remains deferred and the synthesis still rejects
filing-ready status. Filing remains blocked by fresh i40 audit evidence, PR07
owner replay, final-stack fuzz, and rebuilt validation.

The committed fuzzing graph is still browser/e2e-heavy: `25` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes validated rich-text CRDT
coverage-guided lower-level and HTTP polling protocol/server smokes, and the
level-mix feedback-action says a protocol lane and a multiblock lower-level lane
were launched after browser materialization returned above floor. The committed
graph still shows `0` protocol-server executions and no multiblock lower-level
row, so the report treats those as harness/action evidence until
collector-visible counts appear. The next narrow checks are producer-side
duplicate/noise stability, browser materialization, collector-visible
lower-level/protocol counts, fresh i40 audit evidence, and PR07 replay evidence
before any filing or final-stack claim.
