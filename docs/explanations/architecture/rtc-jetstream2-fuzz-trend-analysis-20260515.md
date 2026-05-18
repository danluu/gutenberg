# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T01:39:53Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T01:34:25Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T01:30:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2172` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T01:34:25Z`, coverage
files grew from `272` to `48780`, a delta of `48508`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: the newest sample has `duplicateShareCurrent=0.0000` and current
summary startup failures `0`. The preceding pressure includes `0.5000`,
`0.5000`, and `0.6000` samples, so the clean duplicate/noise point is not yet a
durable all-clear. The same latest pass has `0` quality issues, `0` warnings,
`424.8G` free memory, and a true monitor headroom flag. This report uses current-output-dir
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3451` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the clean duplicate/noise point as durable recovery. The latest non-empty
duplicate/noise synthesis, `20260518T012323Z`, says the consensus root cause is
a producer/scheduler leak: explicit no-product `pre_action_bootstrap_stall`
startup-noise pauses are scoped to the current output root, so output-root
rotation can re-enable the same noisy browser groups until the supervisor
rediscovers and pauses them. The latest feedback-action file,
`20260518T012323Z`, is empty, so this report treats the clean plotted point as
live graph status only, not evidence that repeated startup-noise scheduling is
fixed.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T012015Z`, keeps the Cycle320/i40 three-lane split as the
active shape but says the stack is blocked, not file-ready: PR07 ownership
evidence is invalid because the Cycle320 wrapper reuses an old Cycle296 script
with Cycle293 refs and no `HOLD-07B2`, and publish/manifest evidence must be
refreshed when newer deferred outputs land. It still rejects stale Cycle293,
Cycle306, local-publish rows, fallback-tail `PR05D`, raw `PR07D`, `PR17`,
`PR18`, and `PR18x` as filing evidence. Seed `1020002` blocks final-stack
fuzz/filing only, not independent audit or deferred work.

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
`424.8G`, and headroom true. The last eight current-output duplicate-share
samples are all `0.0000`; the preceding pressure included `0.6000`, `0.5000`,
and `0.5000` samples. The latest graph therefore shows clean current
duplicate/noise status, not sustained recovery. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-parser-transform` and
`novelty-ws-parser-serialization` as enabled groups. Current-output duplicate
share is `0.0000` and current summary startup failures are `0`. The latest
non-empty duplicate/noise synthesis rejects treating that as a durable all-clear
because no-product startup-noise cooldowns can be lost across output-root
rotation. The next narrow check is a bounded cross-root cooldown for explicit
no-product `pre_action_bootstrap_stall` producers, while preserving
product-evidence bypasses, followed by non-empty current-root triage before
interpreting the duplicate/noise line as real cleanliness.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T01:30:01Z` show bursty CPU. The
latest 25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest
sample at `63.0%`. Over those same 25 samples, one-minute, five-minute, and
15-minute load all exceeded the `64` logical CPU count in `4` windows, and at
least one load window exceeded it in `12`. The newest 1/5/15-minute load sample
is `43.29`, `50.59`, and `57.01`; all three windows are now below the logical
CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-parser-transform` and `novelty-ws-parser-serialization`.

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
contradicts it. The latest level-mix synthesis, `20260518T010240Z`, rejects
treating requested browser/e2e lane metadata as stable live health by itself:
its context saw `browser-e2e: 2` while the policy floor is `24`, a current-root
coverage marker at `run-20260518T010505Z`, and a stale supervisor tied to
`run-20260518T010011Z`. It recommends rebinding/restarting browser/e2e
materialization first, validating at least `24` runner PIDs twice, keeping
`unit-property` and the three coverage-guided lower-level lanes capped, and not
adding lower-level capacity. The refreshed graph still has `0` protocol-server
executions and one visible `coverage-guided-lower-level` lane, so this report
treats the lane mix as supervisor metadata until live PID and collector-visible
throughput checks agree.

The latest native-harness synthesis keeps rich-text CRDT merge as the first
ready isolated coverage-guided lower-level target and explicitly says this is
Node/V8 coverage-guided JS, not C/C++ libFuzzer/AFL. Its latest action validated
the runner, launcher, Jest target, normal unit skip gate, fuzz-env test, build,
and a bounded smoke with `2` inputs and
`fuzzLevel: "coverage-guided-lower-level"` events. The latest protocol-server synthesis
selects the HTTP polling REST endpoint, and the latest action validates a
bounded protocol/server smoke with `fuzzLevel: "protocol-server"` events, one
passing seed, and `13` protocol cases. The latest fuzz-only assertion apply file
added diagnostic browser collaboration assertions and restarted browser
coverage-guided and strict-expansion fuzzing. These are harness and assertion
evidence, not yet collector-visible protocol/backend or standalone assertion
throughput in this graph: the refreshed counters still show `0`
`protocol-server`, `0` `backend-api`, and `0` standalone `fuzz-assertion`
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

The latest collected execution data has about `5,458,551` completed test
executions: `134,634` browser/e2e, `3,006` transport/integration, `4,873,088`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `592` browser/e2e test executions/hour,
`9,984` unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `652` unique
likely-real findings over about `1,998.2` runner-hours, or `32.63` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,513` candidates
over `1,998.2` runner-hours (`275.90` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `28.5` runner-hours
(`17.54` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`144`), three-user late join (`112`),
permissions/auth/locks (`86`), real-user editing (`83`), and parser
serialization (`39`). The broader unique-output candidate view is led by
three-user late join (`739`), session lifecycle (`678`), real-user editing
(`652`), revision persistence (`448`), and permissions/auth/locks (`436`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5562.8` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2518.1` for unit/property.

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
| `multi-reload-lifecycle` | 3393 | 127 | 0 | 3.7% |
| `revision-persistence` | 4761 | 184 | 0 | 3.9% |
| `parser-serialization` | 3526 | 212 | 0 | 6.0% |
| `real-user-editing` | 7570 | 602 | 0 | 8.0% |
| `parser-transform` | 4363 | 461 | 0 | 10.6% |
| `common-blocks` | 4261 | 459 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6384 | 1190 | 0 | 18.6% |
| `long-session-large-doc` | 3059 | 578 | 0 | 18.9% |
| `persistence-no-title` | 3465 | 967 | 0 | 27.9% |
| `session-lifecycle` | 8444 | 2544 | 0 | 30.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 540 | 1000 |
| action reload-post-action next 2000 tier | 1084 | 2000 |
| real-user body save/reload next 1000 tier | 599 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| action ui-format-paragraph next 2000 tier | 1778 | 2000 |

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
review cycle, `20260518T012015Z`, took `13.5` minutes from
`2026-05-18T01:20:15Z` to `2026-05-18T01:33:47Z`. The latest synthesis rejects a
filing-ready interpretation and keeps the Cycle320/i40 split shape as active,
but says PR07 ownership evidence is invalid because the wrapper reuses a stale
Cycle296/Cycle293 replay path and omits `HOLD-07B2`. It keeps `PR03B`,
`PR07B2`, and `PR07C` held, keeps PR09-PR15 forked from PR06, rejects
stale/local manifests, fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and
`PR18x` as filing sources, and requires a fresh i40 deferred refresh/manifest
audit before filing evidence is trusted.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T01:14:47Z`, has `11`
suggested rows totaling `5,411` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 11` (`1141`), `PR 13A` (`1126`), `PR 6` (`732`),
`PR 14` (`276`), and `PR 9` (`183`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, and the latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. That
does not prove durable recovery because the latest non-empty persona synthesis
says output-root rotation can re-enable no-product `pre_action_bootstrap_stall`
producers until startup-noise cooldowns are made reusable across roots. The
latest full health sample has headroom true, quality issues `0`, warnings `0`,
and `424.8G` free memory. The latest 1/5/15-minute load windows
are `43.29`, `50.59`, and `57.01`, with all three below the `64` logical CPU
count. Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting the clean current point into
a durable all-clear. The latest non-empty synthesis says no-product
startup-noise pauses are current-output-local, so the same producer can recur
after root rotation. The next check is not another aggregate duplicate/noise
readout; it is preserving bounded cross-root cooldowns for explicit no-product
`pre_action_bootstrap_stall` while preserving product-evidence bypasses, then
verifying non-empty current triage.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis keeps the Cycle320/i40 split as active but says it is blocked,
not file-ready. PR07 owner evidence is invalid because current replay wrappers
reuse stale Cycle296/Cycle293 refs and omit `HOLD-07B2`; fresh i40 deferred
refresh and manifest evidence are also required when newer deferred outputs
land. It also says seed `1020002` blocks final-stack fuzz/filing only, not
independent audit, deferred, or loop-repair work. Filing remains blocked by PR07
replay, final-stack fuzz, and rebuilt validation.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes a validated rich-text CRDT
coverage-guided lower-level harness, validated HTTP polling protocol/server
smokes, and diagnostic fuzz-only browser assertions, but the latest level-mix
synthesis rejects trusting requested lane metadata alone because current-root
browser materialization was below the floor and the coverage marker/supervisor
roots disagreed. The committed graph still shows `0` protocol-server executions
and no standalone `fuzz-assertion` executions, so the report treats those as
harness/action evidence until collector-visible counts appear. The next narrow
checks are cross-root startup-noise cooldown validation, live browser
materialization, collector-visible lower-level/protocol/assertion counts, PR07
replay evidence, and rebuilt validation before any filing or final-stack claim.
