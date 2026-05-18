# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T06:23:51Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T06:20:40Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T06:20:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2210` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T06:20:40Z`, coverage
files grew from `272` to `50511`, a delta of `50239`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples include
eleven `0.0000` samples and one `1.0000` recurrence, so the clean latest point
is not durable recovery evidence by itself. The latest pass has `0` quality
issues, `0` warnings, `409.1G` free memory, and a false monitor headroom flag.
This report
uses current-output duplicate/noise and summary startup failures for live
health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3437` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
startup-failure suppression as durable recovery. The latest duplicate/noise
synthesis, `20260518T060527Z`, says strict no-product
`pre_action_bootstrap_stall` records are mostly suppressed before Codex
analysis, but producer/control-plane paths can still repeatedly create or
surface the same startup-noise family through recommendations, bootstrap
fallback, materialization-floor replacement, cooldown mismatch, or stale
current-run accounting. Its proposed safe fix is narrow: quarantine only strict
pre-action/no-product startup stalls at the current-run/group level, block
automatic enable or re-enable while the hold is active, and preserve failures
with current source product evidence. The latest feedback-action file for that
loop is empty. The clean latest graph point therefore needs sustained low
current-output duplicate share before it can be read as durable recovery.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T060230Z`, keeps Cycle324/i40 as the base for ready rows but
says PR07 must change: `de083fcfb82` is a new reload-hydration product candidate
for stale sync-manager entity epochs and should become a held/runtime-gated
`PR07B2` only after restack and owner evidence. It treats `055317Z` as the
latest nonzero finalization, rejects `060321Z` as zero-byte/non-evidence, and
keeps filing, broad final-stack fuzzing, and rebuilt stack validation blocked by
PR07 owner evidence and seed `1020002`. The latest feedback-action launched the
bounded PR07B2 restack/audit job; it completed with a conflict confined to
`packages/sync/src/test/manager.ts`, so PR07 is still not publication-ready.

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
`409.1G`, and headroom false. The last twelve current-output duplicate-share
samples include eleven `0.0000` samples and one `1.0000` recurrence. The latest
graph therefore shows a clean current sample with recent live duplicate/noise
recurrences while startup failures remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently lists `novelty-ws-long-session-large-doc` and
`novelty-ws-media-cross-entity` as enabled groups. Current-output duplicate
share is `0.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis rejects treating startup-failure suppression as a
durable all-clear: it frames the remaining problem as producer/control-plane
paths that can re-enable or replace strict no-product startup-noise groups
despite analysis-tier suppression. The next check is hard current-run/group
quarantine plus sustained low current-output duplicate share, not whether the
historical aggregate duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T06:20:00Z` show bursty CPU. The
latest 25 CPU samples range from `61.0%` to `83.3%` utilization, with the latest
sample at `77.8%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `15` windows, five-minute load in `18`, 15-minute load
in `18`, and at least one load window exceeded it in `20`. The newest
1/5/15-minute load sample is `65.17`, `71.10`, and `73.14`; all three latest
load windows are above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-long-session-large-doc` and `novelty-ws-media-cross-entity`.

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
contradicts it. The latest level-mix synthesis, `20260518T054101Z`, says not to
broaden the mix or take capacity from browser fuzzing: keep browser/e2e at or
above `24`, keep `coverage-guided-lower-level` capped, keep `unit-property=1`,
run `protocol-server=1` only if clean, keep standalone `fuzz-assertion=0` until
audited, and add exactly one audited backend/API lane only after telemetry
repairs. The latest feedback-action says it repaired/restarted one
`protocol-server` lane and added one `backend-api` lane, with regenerated
context showing about `3,780` protocol/server and `800` backend/API executions.
The committed graph still shows `27` browser/e2e lanes, one coverage-guided
lower-level lane, one unit-property lane, and zero collector-visible
protocol-server, backend/API, or standalone fuzz-assertion lanes. That is a
graph/persona contradiction: the report treats protocol/backend work as
action-context evidence until the committed trend counters ingest those lanes.

The latest native-harness synthesis file is empty; the latest native action,
`20260518T055639Z`, keeps the rich-text CRDT merge harness as the first ready
isolated coverage-guided lower-level target and validates root/lane
`events.ndjson` accounting. It also reports an existing active rich-text
coverage-guided lower-level lane, while the committed graph has only one
collector-visible coverage-guided lower-level lane.

The latest protocol-server synthesis, `20260518T060959Z`, still chooses HTTP
polling REST as the first protocol/server target and specifies root/lane
`events.ndjson` accounting; its action file is empty. The committed graph still
has `0` protocol-server cumulative executions and no current protocol rate. The
latest fuzz-only assertion apply file added browser-gated assertions and
restarted affected browser loops, but standalone `fuzz-assertion` executions
remain `0`.

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

The latest collected execution data has about `5,570,387` completed test
executions: `160,422` browser/e2e, `3,006` transport/integration, `4,959,136`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `3,180` browser/e2e test executions/hour,
`9,088` unit-property executions/hour, and `0` coverage-guided-lower-level
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
likely-real findings over about `2,122.9` runner-hours, or `33.16` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,721` candidates
over `2,122.9` runner-hours (`269.48` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `33.2` runner-hours
(`15.07` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`172`), three-user late join (`122`), real-user
editing (`94`), permissions/auth/locks (`86`), and parser serialization (`43`).
The broader unique-output candidate view is led by three-user late join (`782`),
session lifecycle (`725`), real-user editing (`672`), revision persistence
(`488`), and permissions/auth/locks (`450`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `6421.4` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2163.4` for unit/property.

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
| `multi-reload-lifecycle` | 3653 | 153 | 0 | 4.2% |
| `revision-persistence` | 5260 | 226 | 0 | 4.3% |
| `parser-serialization` | 3643 | 227 | 0 | 6.2% |
| `real-user-editing` | 7822 | 602 | 0 | 7.7% |
| `common-blocks` | 4394 | 474 | 0 | 10.8% |
| `parser-transform` | 4619 | 502 | 0 | 10.9% |
| `long-session-large-doc` | 3405 | 580 | 0 | 17.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6575 | 1237 | 0 | 18.8% |
| `session-lifecycle` | 8737 | 2632 | 0 | 30.1% |
| `persistence-no-title` | 3619 | 1105 | 0 | 30.5% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1094 | 2000 |
| real-user title save/reload next 1000 tier | 550 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 609 | 1000 |
| action ui-format-paragraph next 2000 tier | 1871 | 2000 |

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
review cycle, `20260518T060230Z`, took `9.8` minutes from
`2026-05-18T06:02:30Z` to `2026-05-18T06:12:20Z`. The latest synthesis rejects a
filing-ready interpretation and keeps Cycle324/i40 as the base for ready rows,
but says PR07 must add a held/runtime-gated stale sync-manager entity epoch lane
from `de083fcfb82` after restack and owner evidence. It treats `055317Z` as the
latest nonzero finalization and `060321Z` as zero-byte/non-evidence. Filing,
broad final-stack fuzzing, and rebuilt stack validation remain blocked by PR07
owner evidence and seed `1020002`. The latest feedback-action launched the
bounded PR07B2 restack/audit job, which completed with a conflict confined to
`packages/sync/src/test/manager.ts`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T06:13:40Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `0.0000`, after one `1.0000` recurrence in
the last twelve samples. The latest full health sample has headroom false,
quality issues `0`, warnings `0`, and `409.1G` free memory. The
latest 1/5/15-minute load windows are `65.17`, `71.10`, and `73.14`; all three
are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says strict no-product
`pre_action_bootstrap_stall` records are mostly sealed from Codex analysis, but
producer/control-plane paths can still recreate or resurface strict no-product
startup-noise groups. The safe fix is a narrow current-run/group quarantine that
blocks automatic re-enable/replacement while preserving failures with source
product evidence. The refreshed graph has a clean latest live point but a recent
current-output duplicate recurrence, so both graph and persona-loop evidence
keep the next check focused on active scheduling and sustained low
current-output duplicate share, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T060230Z` synthesis keeps Cycle324/i40 as the base, but requires
a PR07 split change around `de083fcfb82` before publication evidence can be
claimed. The latest feedback-action attempted that bounded PR07B2 restack/audit
and found a test-file conflict, so filing and broad final-stack fuzzing remain
blocked on PR07 owner evidence, seed `1020002`, strict stale replay, and rebuilt
validation.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes a started rich-text CRDT
coverage-guided lower-level harness, browser-gated fuzz-only assertions, and a
level-mix action claiming repaired protocol-server plus new backend/API lanes.
The graph rejects treating protocol/backend as collector-visible sustained
fuzzing yet because both counters remain `0`. The next narrow checks are
active-only duplicate/noise scheduling, collector-visible protocol/backend and
assertion counts, PR07 replay evidence, disk relief, and rebuilt validation
before any filing or final-stack claim.
