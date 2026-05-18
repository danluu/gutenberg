# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T05:32:34Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T05:30:50Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T05:30:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2203` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T05:30:50Z`, coverage
files grew from `272` to `50138`, a delta of `49866`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is noisy on the current-output-dir
metric: `duplicateShareCurrent=1.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples include ten
`0.0000` samples and two `1.0000` recurrences, including the latest sample. The
latest pass has `0` quality issues, `0` warnings, `410.6G` free memory, and a
false monitor headroom flag. This report uses current-output duplicate/noise and
summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3438` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
startup-failure suppression as durable recovery. The latest duplicate/noise
synthesis, `20260518T050842Z`, says the remaining leak is control-plane scoping:
paused/no-analysis drain dirs are still allowed to influence active scheduling
through `triageYieldCurrentIncludingPausedNoAnalysis` and active producer
attribution. The older `20260518T044446Z` feedback-action applied a bounded
startup-stall cooldown and product-evidence gate fix, but the newer synthesis
rejects treating that as complete. The next required fix is active-only novelty
scheduling and active-only producer attribution; the latest graph point is a
live duplicate/noise recurrence, not durable recovery evidence.

The PR-split persona loop rejects a filing-ready interpretation and treats the
Cycle324/Cycle330 ungrouped i40 stack as the replacement for older grouped or
linear shapes. The latest substantive synthesis, `20260518T045730Z`, says the
working split should use the latest nonzero `20260518T045301Z` Cycle324/i40
finalization, which verifies `54/54` rows and adds `DIAG-RELOAD-044058`. Filing
and broad final-stack validation remain blocked by PR07 owner evidence, seed
`1020002`, and root disk pressure; the synthesis rejects zero-byte `050304`
finalization. The matching `20260518T045730Z` feedback-action applied the split
refresh and manifest/audit work, but it still defers filing, broad final-stack
fuzzing, and rebuilt stack validation on the same blockers.

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
`410.6G`, and headroom false. The last twelve current-output duplicate-share
samples include ten `0.0000` samples and two `1.0000` recurrences. The latest
graph therefore shows a live duplicate/noise recurrence while startup failures
remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently lists `novelty-ws-revision-persistence` and
`novelty-ws-parser-transform` as enabled groups. Current-output duplicate share
is `1.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis rejects treating startup-failure suppression as a
durable all-clear: it frames the remaining problem as paused/no-analysis drain
scope leaking into active producer selection and duplicate/noise holds. The
older feedback-action reports that startup-stall cooldown and product-evidence
gating were implemented, but the newer synthesis rejects that as sufficient. The
next check is active-only scheduling plus sustained low current-output duplicate
share, not whether the historical aggregate duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T05:30:01Z` show bursty CPU. The
latest 25 CPU samples range from `61.0%` to `82.9%` utilization, with the latest
sample at `77.5%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `14` windows, five-minute load in `17`, 15-minute load
in `15`, and at least one load window exceeded it in `19`. The newest
1/5/15-minute load sample is `62.95`, `67.39`, and `68.28`; the five- and
15-minute load windows are above the logical CPU count while the latest
one-minute load dipped below it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-revision-persistence` and `novelty-ws-parser-transform`.

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
contradicts it. The newest level-mix synthesis, `20260518T045236Z`, recommends
one narrow mix change: restore exactly one audited
`protocol-server-http-polling` lane after disk/build/wp-env preflight, keep
browser/e2e at or above the `24`-lane floor, keep coverage-guided lower-level
capacity capped, keep `unit-property=1`, leave `backend-api=0`, and count
unaudited `fuzz-assertion` as `0`. Its matching feedback-action file is
not zero-byte: it reports freeing root disk, launching `rtc-protocol-server-fuzz`,
validating status/events advancement, and expecting protocol-server executions
to appear later. The committed graph's latest point still shows `27`
browser/e2e lanes, one coverage-guided lower-level lane, one unit-property lane,
and zero collector-visible protocol-server, backend-api, or standalone
fuzz-only assertion lanes, so the graph and persona-loop action evidence
contradict each other on protocol-server live visibility.

The latest native-harness synthesis, `20260518T052005Z`, still points at the
rich-text CRDT merge coverage-guided lower-level target; the matching
`20260518T050153Z` action validated the runner and smoke, left the existing
continuous tmux lane active, and reported a recent status sample from that lane.
The committed graph has one collector-visible coverage-guided lower-level lane.
The latest protocol-server synthesis, `20260518T051502Z`, identifies the HTTP
polling REST target as the ready first protocol/server target, and the matching
`20260518T050129Z` action validated a two-seed, 13-case smoke with
`fuzzLevel: "protocol-server"` root and lane events. Protocol-server executions
remain `0` in the committed trend counters, so this is harness/action evidence
rather than collector-visible sustained fuzzing. The latest fuzz-only assertion
apply file,
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

The latest collected execution data has about `5,549,948` completed test
executions: `155,055` browser/e2e, `3,006` transport/integration, `4,944,064`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `612` browser/e2e test executions/hour,
`1,664` unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `693` unique
likely-real findings over about `2,098.4` runner-hours, or `33.03` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,681` candidates
over `2,098.4` runner-hours (`270.73` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `32.4` runner-hours
(`15.46` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`166`), three-user late join (`121`), real-user
editing (`94`), permissions/auth/locks (`86`), and parser serialization (`42`).
The broader unique-output candidate view is led by three-user late join (`777`),
session lifecycle (`717`), real-user editing (`670`), revision persistence
(`483`), and permissions/auth/locks (`448`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `6246.3` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2219.5` for unit/property.

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
| `multi-reload-lifecycle` | 3594 | 147 | 0 | 4.1% |
| `revision-persistence` | 5084 | 213 | 0 | 4.2% |
| `parser-serialization` | 3605 | 221 | 0 | 6.1% |
| `real-user-editing` | 7772 | 602 | 0 | 7.7% |
| `common-blocks` | 4369 | 471 | 0 | 10.8% |
| `parser-transform` | 4557 | 499 | 0 | 11.0% |
| `long-session-large-doc` | 3375 | 579 | 0 | 17.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6533 | 1230 | 0 | 18.8% |
| `persistence-no-title` | 3579 | 1072 | 0 | 30.0% |
| `session-lifecycle` | 8664 | 2615 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1093 | 2000 |
| real-user title save/reload next 1000 tier | 549 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| real-user body save/reload next 1000 tier | 608 | 1000 |
| action ui-format-paragraph next 2000 tier | 1856 | 2000 |

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
review cycle, `20260518T045730Z`, took `9.3` minutes from
`2026-05-18T04:57:30Z` to `2026-05-18T05:06:47Z`. The latest synthesis rejects a
filing-ready interpretation and keeps the Cycle324/Cycle330 ungrouped i40 stack
as the replacement for older grouped/linear shapes. It says the latest nonzero
`20260518T045301Z` finalization verifies `54/54` rows and adds
`DIAG-RELOAD-044058`, but filing and broad final-stack validation remain blocked
by PR07 owner evidence, seed `1020002`, and root disk pressure; zero-byte
`050304` finalization does not count as evidence. The matching feedback-action
applied the split refresh and manifest/audit work, but still defers filing,
broad final-stack fuzzing, and rebuilt full-stack validation.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T05:15:49Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `1.0000`. The latest full health sample has
headroom false, quality issues `0`, warnings `0`, and `410.6G` free memory. The
latest 1/5/15-minute load windows are `62.95`, `67.39`, and `68.28`; the five-
and 15-minute windows are above the `64` logical CPU count while the one-minute
window is below it.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says strict no-product
`pre_action_bootstrap_stall` is mostly blocked from expensive analysis, but
paused/no-analysis drain dirs still bleed into active scheduling through
`triageYieldCurrentIncludingPausedNoAnalysis` and producer attribution. The
latest feedback-action predates that synthesis and only proves the earlier
startup-stall cooldown/product-evidence gate repair. The refreshed graph also
has a noisy latest live point, so both graph and persona-loop evidence keep the
next check focused on active-only scheduling and sustained low current-output
duplicate share, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest substantive `20260518T045730Z` synthesis supports the Cycle324/Cycle330
ungrouped i40 stack and the nonzero `045301` finalization, but filing remains
blocked by PR07 owner evidence, seed `1020002`, and root disk pressure. It
rejects zero-byte `050304` finalization as evidence. The latest feedback-action
applied the split refresh and manifest/audit work, but still defers filing and
broad final-stack fuzzing on PR07 owner evidence, seed `1020002`, and rebuilt
validation.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes a started rich-text CRDT
coverage-guided lower-level lane, a validated HTTP polling protocol/server
harness, and diagnostic fuzz-only browser assertions. The latest level-mix
synthesis recommends restoring exactly one audited protocol lane after preflight
while protecting the browser floor, and the later protocol action validates the
HTTP polling protocol/server harness. Collector-visible protocol counts are
still `0`, so the report treats protocol, backend, and standalone assertion work
as harness/action evidence until trend counters appear. The next narrow checks
are active-only duplicate/noise scheduling, collector-visible protocol and
assertion counts, PR07 replay evidence, disk relief, and rebuilt validation
before any filing or final-stack claim.
