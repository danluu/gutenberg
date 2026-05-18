# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T02:37:51Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T02:34:42Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T02:30:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2178` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T02:34:42Z`, coverage
files grew from `272` to `49146`, a delta of `48874`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric, but it follows an immediately preceding noisy point: the newest sample
has `duplicateShareCurrent=0.0000` and current summary startup failures `0`,
while the previous sample was `1.0000`. The ten samples before that were
`0.0000`, so the graph shows unstable cleanup after a live regression rather
than durable recovery. The latest pass has `0` quality issues, `0` warnings,
`415.5G` free memory, and a false monitor headroom flag. This report uses
current-output duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate
share is `0.3448` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the clean latest graph point as durable recovery. The latest non-empty
duplicate/noise synthesis, `20260518T021322Z`, says the consensus root cause is
still a producer-side no-product `pre_action_bootstrap_stall` leak:
below-threshold seed drains can fall out of current-run accounting without
durable `no-analysis.json` sentinels or group cooldowns, then be regenerated.
The latest duplicate/noise feedback-action file, `20260518T012323Z`, says a
bounded cross-root cooldown was implemented in the novelty monitor, but the
later synthesis says the smallest safe fix still belongs in the supervisor
seed-drain path. The graph's latest clean point is therefore treated as a
one-sample status improvement, not as sufficient evidence for durable recovery.

The PR-split persona loop rejects a filing-ready interpretation and now also
rejects the grouped i40 topology as the final review shape. The latest
synthesis, `20260518T020732Z`, says the Cycle320/i40 source family remains the
right base, but grouped `PR06`, `PR11`, `PR12`, and `PR15` should be replaced by
ungrouped split aliases before filing. The matching feedback-action updated the
current split and completed the non-Docker ungrouped manifest/audit refresh with
43 manifest rows and bundle `PASS`, but filing and final-stack validation remain
blocked by PR07 owner evidence, root disk below the replay threshold, and
final-stack-only seed `1020002`. It still rejects stale
Cycle293/Cycle306/local-publish rows, fallback-tail `PR05D`, raw `PR07D`,
`PR17`, `PR18`, and `PR18x` as filing evidence.

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
`415.5G`, and headroom false. The last twelve current-output duplicate-share
samples are ten `0.0000` samples, then `1.0000`, then `0.0000`. The latest graph
therefore shows a clean point after a live current-output duplicate/noise
regression, not sustained recovery. The health graph does not use historical
aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-multi-reload-lifecycle`,
`novelty-ws-three-user-late-join`, `novelty-ws-revision-persistence`, and
`novelty-ws-revision-recovery` as enabled groups. Current-output duplicate
share is `0.0000` and current summary startup failures are `0`. The latest
non-empty duplicate/noise synthesis rejects treating the clean sample as a
durable all-clear because no-product startup seed drains can disappear from
current-run accounting without durable sentinels or cooldowns. The latest
feedback-action says a novelty-monitor cooldown was implemented and the active
monitor moved to `run-20260518T021144Z`, but the later synthesis says the
supervisor seed-drain path still needs the product-preserving sentinel/cooldown
fix.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T02:30:00Z` show bursty CPU. The
latest 25 CPU samples range from `58.1%` to `84.1%` utilization, with the latest
sample at `79.7%`. Over those same 25 samples, one-minute, five-minute, and
15-minute load all exceeded the `64` logical CPU count in `7` windows, and at
least one load window exceeded it in `17`. The newest 1/5/15-minute load sample
is `83.67`, `75.96`, and `71.26`; all three windows are above the logical CPU
count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has four enabled groups:
`novelty-ws-multi-reload-lifecycle`, `novelty-ws-three-user-late-join`,
`novelty-ws-revision-persistence`, and `novelty-ws-revision-recovery`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `29` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest non-empty level-mix synthesis, `20260518T013745Z`,
rejects treating requested browser/e2e lane metadata as stable live health by
itself:
its context saw `browser-e2e=20` against a `24` floor, with live samples only
unstably recovering to about `24-26`. It recommends repairing browser/e2e
materialization and PID telemetry first, keeping `unit-property=1` and the
coverage-guided lower-level lanes capped, and not adding more JS lower-level
capacity. After browser is stable at `>=24` in two samples, the next mix
addition should be one audited `protocol-server-http-polling` lane. The
refreshed graph still has `0` protocol-server executions and one visible
`coverage-guided-lower-level` lane, so this report treats the lane mix as
supervisor metadata until live PID and collector-visible throughput checks
agree. The graph has browser/e2e above the `24` floor, and the latest level-mix
feedback-action reports live browser PID samples of `25`, `25`, and `25` with
no final telemetry invariant failure, but it still keeps protocol expansion
blocked by an infra bootstrap failure.

The latest native-harness synthesis, `20260518T022542Z`, keeps rich-text CRDT
merge as the first ready isolated coverage-guided lower-level target and
explicitly says this is Node/V8 coverage-guided JS, not C/C++ libFuzzer/AFL. The
latest native action, `20260518T021000Z`, adopted the rich-text CRDT
lower-level harness, passed syntax, formatting, dependency, fuzz-enabled Jest,
build, and bounded smoke checks, and emitted
`fuzzLevel: "coverage-guided-lower-level"` events for `2` smoke inputs.
The latest non-empty protocol-server synthesis, `20260518T021124Z`, still
selects the HTTP polling REST endpoint. The latest protocol action,
`20260518T021124Z`, implemented and validated the protocol/server harness with
`2` seeds, `13` cases each, and isolated storage PHPUnit passing `18` tests with
`86` assertions. The later level-mix feedback-action says the protocol sentinel
stopped after three infra failures from `Call to undefined function
gutenberg_override_style()`. The latest fuzz-only assertion apply file,
`20260518T011940Z`, added fuzz-gated persistence and real-user formatting
witnesses and restarted the coverage-guided, focused-shards, and
strict-expansion browser loops. These are harness and assertion evidence, not
yet collector-visible protocol/backend or standalone assertion throughput in
this graph: the refreshed counters still show `0` `protocol-server`, `0`
`backend-api`, and `0` standalone `fuzz-assertion` executions.

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

The latest collected execution data has about `5,482,364` completed test
executions: `140,207` browser/e2e, `3,006` transport/integration, `4,891,328`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `852` browser/e2e test executions/hour, `8,064`
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

On that triage-output metric, browser/e2e currently dominates: `657` unique
likely-real findings over about `2,020.0` runner-hours, or `32.52` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,555` candidates
over `2,020.0` runner-hours (`274.99` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `29.5` runner-hours
(`16.96` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`151`), three-user late join (`114`), real-user
editing (`88`), permissions/auth/locks (`86`), and parser serialization (`39`).
The broader unique-output candidate view is led by three-user late join (`756`),
session lifecycle (`691`), real-user editing (`660`), revision persistence
(`460`), and permissions/auth/locks (`441`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5770.5` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2436.1` for unit/property.

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
| `multi-reload-lifecycle` | 3439 | 133 | 1 | 3.9% |
| `revision-persistence` | 4818 | 190 | 0 | 3.9% |
| `parser-serialization` | 3534 | 212 | 0 | 6.0% |
| `real-user-editing` | 7628 | 602 | 0 | 7.9% |
| `parser-transform` | 4433 | 480 | 0 | 10.8% |
| `common-blocks` | 4301 | 466 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `long-session-large-doc` | 3104 | 578 | 0 | 18.6% |
| `block-gauntlet` | 6441 | 1212 | 0 | 18.8% |
| `persistence-no-title` | 3506 | 1006 | 0 | 28.7% |
| `session-lifecycle` | 8523 | 2577 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1090 | 2000 |
| real-user title save/reload next 1000 tier | 546 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 605 | 1000 |
| action ui-format-paragraph next 2000 tier | 1808 | 2000 |

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
review cycle, `20260518T020732Z`, took `11.9` minutes from
`2026-05-18T02:07:32Z` to `2026-05-18T02:19:26Z`. The latest synthesis rejects a
filing-ready interpretation and supersedes the grouped i40 working hypothesis:
current i40 refs remain the source family, but grouped `PR06`, `PR11`, `PR12`,
and `PR15` should be replaced by ungrouped aliases. PR07 owner evidence is still
not durable, and root space plus final-stack-only seed `1020002` still block
filing/final-stack validation. The matching feedback-action applied the
ungrouped split and completed the non-Docker manifest/audit refresh with 43
manifest rows and bundle `PASS`, but it keeps rejecting stale
Cycle293/Cycle306/local-publish rows, fallback-tail `PR05D`, raw `PR07D`,
`PR17`, `PR18`, and `PR18x` as filing sources.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T02:23:20Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), and `PR 10` (`141`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`, but
the immediately preceding sample was `1.0000`. The latest full health sample
has headroom false, quality issues `0`, warnings `0`, and `415.5G` free memory.
The latest 1/5/15-minute load windows are `83.67`, `75.96`, and `71.26`; all
three are above the `64` logical CPU count. Historical aggregate duplicate/noise
is not the live health signal.

The duplicate/noise persona loop rejects converting the clean latest sample into
a durable all-clear. The latest non-empty synthesis says below-threshold
no-product startup seed drains can lose current-run visibility without durable
`no-analysis.json` sentinels or cooldowns, so the same producer can recur. The
feedback-action says a novelty-monitor cross-root cooldown was implemented, but
the later synthesis says the supervisor seed-drain path still needs the
product-preserving sentinel/cooldown fix. The next check is not another
aggregate duplicate/noise readout; it is current-root triage after that
supervisor-side fix.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says current i40 refs remain the right source family but the
grouped topology should be replaced with ungrouped `PR06`, `PR11`, `PR12`, and
`PR15` aliases before filing. Filing remains blocked by PR07 owner evidence,
root disk below the replay threshold, final-stack-only seed `1020002`, and
rebuilt validation. The latest feedback-action applied the ungrouped split and
completed the non-Docker manifest/audit refresh with bundle `PASS`, but it
deferred PR07 owner replay because the older replay session was still active and
root space was still below threshold.

The committed fuzzing graph is still browser/e2e-heavy: `29` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes a validated rich-text CRDT
coverage-guided lower-level harness, validated HTTP polling protocol/server
smokes, and diagnostic fuzz-only browser assertions, but the committed graph
still shows `0` protocol-server executions and no standalone `fuzz-assertion`
executions. The latest level-mix feedback-action reports browser PID samples of
`25`, `25`, and `25`, but it also says the protocol sentinel stopped on the
`gutenberg_override_style()` infra bootstrap failure. The report therefore
treats protocol/backend/assertion work as harness/action evidence until
collector-visible counts appear. The next narrow checks are supervisor-side
startup-noise cooldown validation, live browser materialization,
collector-visible lower-level/protocol/assertion counts, PR07 replay evidence,
and rebuilt validation before any filing or final-stack claim.
