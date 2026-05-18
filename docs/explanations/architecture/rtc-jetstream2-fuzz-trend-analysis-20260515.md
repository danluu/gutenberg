# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T04:58:22Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T04:48:45Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T04:50:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2197` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T04:48:45Z`, coverage
files grew from `272` to `49851`, a delta of `49579`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is noisy on the current-output-dir
metric: `duplicateShareCurrent=1.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples include nine
`0.0000` samples and three `1.0000` recurrences, so the graph shows intermittent
duplicate/noise returns rather than durable recovery. The latest pass has `0`
quality issues, `0` warnings, `409.1G` free memory, and a false monitor headroom
flag. This report uses current-output duplicate/noise and summary startup
failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3441` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
startup-failure suppression as durable recovery. The latest duplicate/noise
synthesis, `20260518T044446Z`, still calls the issue producer-side churn: strict
no-product `pre_action_bootstrap_stall` is mostly blocked from expensive
analysis, but supervisor/novelty paths can drain a noisy seed and then relaunch
the same or same-profile producer. The matching feedback-action file is
zero-byte, so this report does not treat it as an applied fix. The latest graph
point is also noisy, so the scheduler is not fixed.

The PR-split persona loop rejects a filing-ready interpretation and treats the
Cycle324/Cycle330 ungrouped i40 stack as the replacement for older grouped or
linear shapes. The latest synthesis, `20260518T042224Z`, says filing and broad
final-stack validation remain blocked by PR07 owner evidence, seed `1020002`,
and stale publication/audit freshness. It also rejects zero-byte `042251Z`
finalization and setup-only PR07 output as evidence. The matching
`20260518T042224Z` feedback-action says it refreshed from `042251Z`; because the
synthesis rejects that zero-byte finalization, this report treats that feedback
as contradictory and still not filing authority.

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
`409.1G`, and headroom false. The last twelve current-output duplicate-share
samples include nine `0.0000` samples and three `1.0000` recurrences. The latest
graph therefore shows a live duplicate/noise return, while startup failures
remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently lists `novelty-ws-three-user-late-join` and
`novelty-ws-revision-persistence` as enabled groups. Current-output duplicate
share is `1.0000` and current summary startup failures are `0`; including paused
no-analysis drain dirs shows two suppressed strict startup identities. The
latest duplicate/noise synthesis rejects treating startup-failure suppression as
a durable all-clear: it frames the remaining problem as producer churn after
downstream triage has already suppressed strict no-product noise. Its matching
feedback-action file is empty, so the next check is an actual producer-side
cooldown/materialization repair plus sustained low current-output duplicate
share, not whether the historical aggregate duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T04:50:00Z` show bursty CPU. The
latest 25 CPU samples range from `61.0%` to `82.9%` utilization, with the latest
sample at `80.4%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `14` windows, five-minute load in `16`, 15-minute load
in `14`, and at least one load window exceeded it in `19`. The newest
1/5/15-minute load sample is `78.34`, `79.10`, and `75.69`; all three latest
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
contradicts it. The newest level-mix synthesis, `20260518T043935Z`, rejects lane
count changes and says the next work is accounting/control-plane repair: keep
browser/e2e at or above the `24`-lane floor, keep JS lower-level lanes capped,
keep `unit-property=1`, keep one protocol-server lane only when audited, and
fix lower-level root/status/event accounting before trusting mix decisions. The
latest feedback-action says it restored one audited
`protocol-server-http-polling` lane after browser samples reached `24` and
`27`. That evidence is allowed to contradict the graph: the committed graph's
latest point still shows `27` browser/e2e lanes, one coverage-guided lower-level
lane, one unit-property lane, and zero collector-visible protocol-server,
backend-api, or standalone fuzz-only assertion lanes.

The latest native-harness synthesis and action, `20260518T043629Z`, promote and
start the rich-text CRDT merge coverage-guided lower-level target, and the
committed graph has one collector-visible coverage-guided lower-level lane.
The latest protocol-server synthesis and action, `20260518T044026Z`, validate a
two-seed HTTP polling REST protocol/server smoke with
`fuzzLevel: "protocol-server"` events, but protocol-server executions remain
`0` in the committed graph. The latest fuzz-only assertion apply file,
`20260518T030901Z`, added browser-side fuzz-gated assertions and restarted
browser loops, but standalone `fuzz-assertion` executions remain `0`.

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

The latest collected execution data has about `5,535,852` completed test
executions: `151,359` browser/e2e, `3,006` transport/integration, `4,933,664`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `4,648` browser/e2e test executions/hour,
`13,312` unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `689` unique
likely-real findings over about `2,079.1` runner-hours, or `33.14` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,640` candidates
over `2,079.1` runner-hours (`271.27` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `31.8` runner-hours
(`15.74` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`162`), three-user late join (`121`), real-user
editing (`94`), permissions/auth/locks (`86`), and parser serialization (`42`).
The broader unique-output candidate view is led by three-user late join (`773`),
session lifecycle (`709`), real-user editing (`670`), revision persistence
(`471`), and permissions/auth/locks (`445`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `6129.5` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2259.7` for unit/property.

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
| `multi-reload-lifecycle` | 3541 | 144 | 0 | 4.1% |
| `revision-persistence` | 4963 | 205 | 0 | 4.1% |
| `parser-serialization` | 3584 | 220 | 0 | 6.1% |
| `real-user-editing` | 7724 | 602 | 0 | 7.8% |
| `common-blocks` | 4348 | 470 | 0 | 10.8% |
| `parser-transform` | 4522 | 499 | 0 | 11.0% |
| `long-session-large-doc` | 3298 | 578 | 0 | 17.5% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6501 | 1226 | 0 | 18.9% |
| `persistence-no-title` | 3550 | 1043 | 0 | 29.4% |
| `session-lifecycle` | 8643 | 2613 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1093 | 2000 |
| real-user title save/reload next 1000 tier | 549 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 608 | 1000 |
| action ui-format-paragraph next 2000 tier | 1844 | 2000 |

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
took roughly `7.2` to `15.1` minutes in this snapshot. The newest completed
review cycle, `20260518T042224Z`, took `9.3` minutes from
`2026-05-18T04:22:24Z` to `2026-05-18T04:31:45Z`. The latest synthesis rejects a
filing-ready interpretation and keeps the Cycle324/Cycle330 ungrouped i40 stack
as the replacement for older grouped/linear shapes. It says filing and broad
final-stack validation remain blocked by PR07 owner evidence, seed `1020002`,
and stale publication/audit freshness; zero-byte finalization and setup-only
PR07 outputs do not count as evidence. The same-cycle feedback-action says it
refreshed from `042251Z`; because the synthesis rejects that zero-byte
finalization, the report treats that feedback as contradictory and still not
filing authority.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T04:39:49Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `1.0000`, after intermittent `0.0000` and
`1.0000` samples.
The latest full health sample has headroom false, quality issues `0`, warnings
`0`, and `409.1G` free memory. The latest 1/5/15-minute load windows are
`78.34`, `79.10`, and `75.69`; all three are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says strict no-product
`pre_action_bootstrap_stall` is mostly blocked from expensive analysis, but the
remaining issue is producer-side churn: materialization and replacement logic
can relaunch the same or same-profile startup-stall producer. The latest
feedback-action file is empty, so there is no new applied fix to credit. The
refreshed graph has a noisy latest live point, so the next check is an actual
producer-side cooldown/materialization fix plus continued low current-output
duplicate share, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T042224Z` synthesis supports the Cycle324/Cycle330 ungrouped
i40 stack, but filing remains blocked by PR07 owner evidence, seed `1020002`,
and stale publication/audit freshness. It rejects zero-byte finalization and
setup-only PR07 output as evidence. The same-cycle feedback-action says it
refreshed from `042251Z`, which the synthesis rejects as zero-byte evidence, so
this remains contradictory rather than filing-ready.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes a started rich-text CRDT
coverage-guided lower-level lane, a validated HTTP polling protocol/server
harness with one audited lane reportedly restored, and diagnostic fuzz-only
browser assertions. The latest level-mix synthesis rejects lane expansion and
says telemetry/accounting repair comes first; the feedback-action says protocol
was restarted after browser samples hit `24` and `27`, but collector-visible
protocol counts are still `0`. The report therefore treats protocol, backend,
and standalone assertion work as harness/action evidence until collector-visible
counts appear. The next narrow checks are producer-side duplicate/noise repair,
collector-visible protocol and assertion counts, PR07 replay evidence, and
rebuilt validation before any filing or final-stack claim.
