# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T07:30:27Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T07:24:56Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T07:20:03Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2220` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T07:24:56Z`, coverage
files grew from `272` to `50973`, a delta of `50701`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples include
nine `0.0000` samples and three recent `1.0000` recurrence samples, so the
latest clean point is not durable duplicate/noise recovery evidence by itself.
The latest pass has `0` quality issues, `0` warnings, `403.0G` free
memory, and a false monitor headroom flag. This report uses current-output
duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3436` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it still rejects
reading startup-failure suppression as durable recovery. The latest
duplicate/noise synthesis, `20260518T064914Z`, identified the remaining leak as
producer backpressure after no-product startup drains. The matching
feedback-action patched the supervisor to pause below-threshold zero-product
startup drains and made novelty scheduling honor the active drain cooldown. Its
post-restart check reported current-output duplicate share `0`, no current
pre-action startup failures, and product-evidence reload failures still visible.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T070538Z`, keeps the Cycle324/i40 ungrouped split with
`PR07B1A` after `PR07B1`, holds `HOLD-07B2` and `HOLD-07C`, and keeps reload
rows diagnostic-only. It says broad final-stack fuzzing, GitHub filing, and
rebuilt stack-wide validation remain blocked by PR07 owner evidence, root disk
pressure, seed `1020002`, route diagnostics, strict stale replay, and a durable
newest-manifest audit. The latest feedback-action says the earlier PR07B1A
bundle/manifest audit passed, but it also says owner replay and the `1030002`
route diagnostic were deferred while `/` was still below the replay threshold,
so it is evidence for the slot name and manifest audit rather than publication
readiness.

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
`403.0G`, and headroom false. The last twelve current-output duplicate-share
samples include nine `0.0000` samples and three recent `1.0000` recurrence
samples. The latest graph therefore shows a clean current-output point after a
short recurrence, while startup failures remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently has two enabled groups:
`novelty-ws-block-gauntlet` and `novelty-ws-common-blocks`.
Current-output duplicate share is `0.0000` and current summary startup failures
are `0`. The latest duplicate/noise feedback-action says the producer-side
startup-stall cooldown is now patched and restarted, but the recent recurrence
keeps the next check focused on sustained low current-output duplicate share and
active drain blocking, not whether the historical aggregate duplicate share
falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T07:20:03Z` show bursty CPU. The
latest 25 CPU samples range from `66.2%` to `83.3%` utilization, with the latest
sample at `81.2%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `18` windows, five-minute load in `21`, 15-minute load
in `22`, and at least one load window exceeded it in `23`. The newest
1/5/15-minute load sample is `93.40`, `81.20`, and `79.10`; all three latest
load windows are above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-block-gauntlet` and `novelty-ws-common-blocks`. The most recent
enabled event in the history is `novelty-ws-real-user-editing`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `28` browser/e2e lanes across `27` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T071443Z`, recommends a
narrow mix only: browser/e2e at or above `24`, `coverage-guided-lower-level=4`
capped, `unit-property=1`, `backend-api=1`, `protocol-server=1`, and standalone
`fuzz-assertion=0` until audited. It rejects broad rebalancing and more JS/Jest
lower-level lanes. It also says backend/protocol exact tmux sessions were absent
after infra failures, and that protocol/backend should only count as active with
exact sessions plus advancing `status.tsv` and `events.ndjson`. The latest
level-mix feedback-action file is empty. The committed graph supports the
caution: it shows zero collector-visible protocol-server, backend/API, or
standalone fuzz-assertion lanes.

The latest native-harness synthesis, `20260518T071839Z`, still keeps the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
AFL/libFuzzer. It did not edit files. The action context says rich-text CRDT and
multiblock continuous sessions exist, but the committed graph has only one
collector-visible coverage-guided lower-level lane.

The latest protocol-server synthesis, `20260518T071947Z`, keeps the HTTP polling
REST endpoint as the first protocol/server target. The latest action,
`20260518T070455Z`, says the harness was implemented and passed bounded
validation. The graph still has `0` protocol-server cumulative executions and no
current protocol rate, so the harness is ready evidence, not collector-visible
sustained fuzzing evidence. The newest fuzz-only assertion apply file is empty;
the previous non-empty apply added browser-gated assertions, while standalone
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

The latest collected execution data has about `5,596,353` completed test
executions: `166,996` browser/e2e, `3,006` transport/integration, `4,978,528`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `4,432` browser/e2e test executions/hour,
`16,256` unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `705` unique
likely-real findings over about `2,161.4` runner-hours, or `32.62` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,759` candidates
over `2,161.4` runner-hours (`266.45` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `34.3` runner-hours
(`14.58` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`172`), three-user late join (`123`), real-user
editing (`94`), permissions/auth/locks (`86`), and parser serialization (`43`).
The broader unique-output candidate view is led by three-user late join (`791`),
session lifecycle (`728`), real-user editing (`673`), revision persistence
(`497`), and permissions/auth/locks (`454`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `6604.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2093.9` for unit/property.

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
| `multi-reload-lifecycle` | 3714 | 154 | 0 | 4.1% |
| `revision-persistence` | 5543 | 234 | 0 | 4.2% |
| `parser-serialization` | 3724 | 231 | 0 | 6.2% |
| `real-user-editing` | 7894 | 602 | 0 | 7.6% |
| `common-blocks` | 4433 | 477 | 0 | 10.8% |
| `parser-transform` | 4663 | 507 | 0 | 10.9% |
| `long-session-large-doc` | 3427 | 580 | 0 | 16.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6681 | 1256 | 0 | 18.8% |
| `session-lifecycle` | 8829 | 2641 | 0 | 29.9% |
| `persistence-no-title` | 3664 | 1150 | 0 | 31.4% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1095 | 2000 |
| real-user title save/reload next 1000 tier | 551 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 610 | 1000 |
| action ui-format-paragraph next 2000 tier | 1888 | 2000 |

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
took roughly `6.0` to `16.1` minutes in this snapshot. The newest completed
review cycle, `20260518T070538Z`, took `12.6` minutes from
`2026-05-18T07:16:57Z` to `2026-05-18T07:29:33Z`. The latest synthesis rejects a
filing-ready interpretation and keeps PR07 on the Cycle324/i40 ungrouped base
with `PR07B1A` after `PR07B1`; `HOLD-07B2` and `HOLD-07C` remain held, and
reload/search/rich-text rows remain diagnostic-only without first-loss
ownership evidence. Filing, broad final-stack fuzzing, and rebuilt stack
validation remain blocked by PR07 owner evidence, root disk pressure, seed
`1020002`, route diagnostics, strict stale replay, and a durable newest-manifest
audit. The latest feedback-action renamed the slot to `PR07B1A`, kept `PR07B2`
as an alias, and completed a bundle/manifest audit that passed, but it deferred
owner replay and the `1030002` diagnostic while `/` was still below replay
threshold, so it does not override the filing blockers.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T07:18:27Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `0.0000`, after a short three-sample
`1.0000` recurrence in the last twelve samples. The latest full health sample
has headroom false, quality issues `0`, warnings `0`, and `403.0G` free memory.
The latest 1/5/15-minute load windows are `93.40`, `81.20`, and `79.10`;
all three are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says strict no-product
`pre_action_bootstrap_stall` records were mostly sealed from Codex analysis, but
browser producers still needed backpressure after no-product startup output had
been suppressed, drained, or family-capped. The feedback-action patched that
path and restarted the affected control plane. The refreshed graph now has a
clean latest current-output point after a recent recurrence, so both graph and
persona-loop evidence keep the next check focused on sustained low
current-output duplicate share and active drain blocking, not historical
aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T070538Z` synthesis keeps PR07 on Cycle324/i40 with `PR07B1A`
after `PR07B1`; held PR07 siblings stay held and reload rows remain diagnostic.
The latest feedback-action applied the `PR07B1A` naming, kept `PR07B2` as an
alias, and passed a bundle/manifest audit, but owner replay and the `1030002`
route diagnostic were deferred while `/` was below replay threshold. Filing and
broad final-stack fuzzing remain blocked on PR07 owner evidence, root disk
pressure, seed `1020002`, route diagnostics, strict stale replay, and rebuilt
validation.

The committed fuzzing graph is still browser/e2e-heavy: `28` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes a ready rich-text CRDT
coverage-guided lower-level target and a validated HTTP polling protocol/server
harness, plus browser-gated fuzz-only assertions, but the latest level-mix
synthesis and the graph reject treating protocol/backend as collector-visible
sustained fuzzing yet because both trend counters remain `0`. The next narrow
checks are sustained current-output duplicate/noise health, collector-visible
protocol/backend and assertion counts, PR07 replay evidence, disk relief, and
rebuilt validation before any filing or final-stack claim.
