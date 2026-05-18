# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T00:39:38Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T00:36:41Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2160` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T00:36:41Z`, coverage
files grew from `272` to `48531`, a delta of `48259`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is no longer clean on the
current-output-dir metric: the newest sample has
`duplicateShareCurrent=0.5000` and current summary startup failures `0`. The two
latest samples are both `0.5000`; they follow a three-sample clean stretch, two
`0.6667` samples, and earlier `1.0000` points. The same latest pass has `0`
quality issues, `0` warnings, `410.6G` free memory, and a false monitor
headroom flag. This report uses current-output-dir
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3452` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the duplicate/noise graph as recovery. The latest duplicate/noise synthesis,
`20260518T002413Z`, says this is still a fuzzer control-plane problem rather
than product-failure evidence: strict no-product `pre_action_bootstrap_stall`
is mostly suppressed before expensive analysis, while stale or mismatched
startup/noise orchestration, coverage-guided guard config, and current-output
pointer gaps can keep obsolete no-product work alive. The latest feedback-action
reports monitor/supervisor changes, a coverage-guided restart, active
startup-noise pauses, and no strict no-product startup signatures queued in that
current root. The refreshed graph contradicts treating that as durable recovery:
current-output duplicate share returned to `0.5000`.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T002449Z`, says the active target has advanced again to the
latest fresh alias, `fresh-prset/iteration-39`, over the same Cycle316/i36
topology. It keeps `PR03B`, `PR07B2`, and `PR07C` held pending owner evidence,
rejects fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, `PR18x`, stale local
publish manifests, raw deferred/candidate branches, and zero-byte artifacts as
filing evidence. The latest feedback-action only completed the now-superseded
i36 audit, so filing, broad final-stack fuzzing, and rebuilt stack validation
remain blocked on the latest-fresh audit, PR07 owner evidence, and the remaining
final-stack gates.

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
and summary startup failures: `duplicateShareCurrent=0.5000`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`410.6G`, and headroom false. The last eight current-output duplicate-share
samples are `0.0000`, `0.6667`, `0.6667`, `0.0000`, `0.0000`, `0.0000`,
`0.5000`, and `0.5000`. The latest graph therefore shows duplicate/noise
pressure resurfacing after a clean stretch, not sustained recovery. The health
graph does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` and
`novelty-ws-lifecycle` as enabled groups. Current-output duplicate share is
`0.5000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis says the consumer/analysis side is not the main
remaining leak; the feedback-action then patched the producer/control plane,
restarted coverage-guided novelty/supervisor, and restarted bounded live
analysis for the current root. The refreshed live metric says those changes have
not yet produced a stable all-clear, so the next narrow check is current-root
duplicate/noise after root rolls and cooldown expiry.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T00:30:01Z` show bursty CPU. The
latest 25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest
sample at `77.4%`. Over those same 25 samples, one-minute, five-minute, and
15-minute load all exceeded the `64` logical CPU count in `4` windows, and at
least one load window exceeded it in `10`. The newest 1/5/15-minute load sample
is `62.48`, `65.21`, and `65.43`, so the latest five-minute and 15-minute
windows are again above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-parser-serialization` and `novelty-ws-lifecycle`.

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

The persona-loop evidence is more specific than the plotted lane mix. The latest
level-mix synthesis, `20260518T001753Z`, rejects treating the plotted `27`
browser/e2e lanes as stable live health by itself: its two-sample check saw
browser PIDs fall from `27` to `7`. It recommends repairing browser
materialization and telemetry first, keeping `unit-property` capped, not
expanding coverage-guided lower-level capacity, and not starting a protocol lane
until browser/e2e stays above the `24` lane floor across repeated live samples.

The latest native-harness evidence keeps rich-text CRDT as the first ready
coverage-guided lower-level target. The latest protocol-server action validated
a bounded HTTP polling REST smoke with `fuzzLevel: "protocol-server"` events,
but the committed counters still show `0` `protocol-server` executions. The
latest fuzz-only assertion action added gated rich-text marker diagnostics and
restarted browser loops. These are harness and assertion evidence, not yet
collector-visible protocol/backend throughput in this graph: the refreshed
counters still show `0` `protocol-server`, `0` `backend-api`, and `0`
standalone `fuzz-assertion` executions.

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

The latest collected execution data has about `5,433,672` completed test
executions: `132,379` browser/e2e, `3,006` transport/integration, `4,854,080`
unit-property, and `444,207` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `2,056` browser/e2e test executions/hour,
`11,520` unit-property executions/hour, and `14,976`
coverage-guided-lower-level executions/hour, with `0` current rate for
transport/integration, backend/API, protocol-server, and standalone
`fuzz-assertion`. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` cumulative executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `642` unique
likely-real findings over about `1,985.5` runner-hours, or `32.34` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,490` candidates
over `1,985.5` runner-hours (`276.51` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.6` runner-hours
(`9.69` per 100 runner-hours), and unit/property `5` over `27.5` runner-hours
(`18.15` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`145`), three-user late join (`112`),
permissions/auth/locks (`86`), real-user editing (`83`), and parser
serialization (`39`). The broader unique-output candidate view is led by
three-user late join (`741`), session lifecycle (`681`), real-user editing
(`653`), revision persistence (`448`), and permissions/auth/locks (`437`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5489.5` for browser/e2e, `4537.5` for transport/integration,
`770.2` for coverage-guided lower-level, and `2606.7` for unit/property.

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
| `multi-reload-lifecycle` | 3380 | 125 | 0 | 3.7% |
| `revision-persistence` | 4729 | 183 | 0 | 3.9% |
| `parser-serialization` | 3503 | 209 | 0 | 6.0% |
| `real-user-editing` | 7497 | 602 | 0 | 8.0% |
| `parser-transform` | 4332 | 453 | 0 | 10.5% |
| `common-blocks` | 4234 | 454 | 0 | 10.7% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6352 | 1182 | 0 | 18.6% |
| `long-session-large-doc` | 3027 | 578 | 0 | 19.1% |
| `persistence-no-title` | 3450 | 956 | 0 | 27.7% |
| `session-lifecycle` | 8399 | 2532 | 0 | 30.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 539 | 1000 |
| action reload-post-action next 2000 tier | 1083 | 2000 |
| real-user body save/reload next 1000 tier | 598 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| action ui-format-paragraph next 2000 tier | 1742 | 2000 |

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
review cycle, `20260518T002449Z`, took `9.6` minutes from
`2026-05-18T00:24:49Z` to `2026-05-18T00:34:23Z`. The latest synthesis rejects a
filing-ready interpretation and says the active target should use the latest
fresh alias, currently `fresh-prset/iteration-39`, over the Cycle316/i36
topology, not stale Cycle293, Cycle306, Cycle312, i34, i35, i36, or i38 manifest
state. It keeps `PR03B`, `PR07B2`, and `PR07C` held pending owner replay and
first-divergence evidence, keeps PR09-PR15 forked from PR06, and rejects
stale/local manifests, fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and
`PR18x` as filing sources. The latest feedback-action only completed the
earlier i36 audit/manifest; the latest synthesis explicitly requires a
latest-fresh audit manifest before filing or final-stack fuzzing.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T00:31:07Z`, has `11`
suggested rows totaling `5,411` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 11` (`1141`), `PR 13A` (`1126`), `PR 6` (`732`),
`PR 14` (`276`), and `PR 9` (`183`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, and the latest
plotted live duplicate/noise sample is noisy again on the current-output-dir
metric: startup failures are `0`, but current-output duplicate share is
`0.5000`. That rules out a durable all-clear; the latest two `0.5000` samples
follow a short clean stretch and earlier `0.6667` and `1.0000` points. The
latest full health sample has headroom false, quality issues `0`, warnings `0`,
and `410.6G` free memory. The latest 1/5/15-minute load windows are `62.48`,
`65.21`, and `65.43`; the five-minute and 15-minute windows are above the `64`
logical CPU count. Historical aggregate duplicate/noise is not the live health
signal.

The duplicate/noise persona loop rejects converting the current live graph into
a durable all-clear. The latest synthesis says the remaining leak is
producer/control-plane behavior: no-product startup suppression is mostly
blocked from expensive analysis, but stale root state, coverage-guided guard
configuration, materialization-floor pause behavior, and missing current-output
context can still keep noisy producers alive. The latest feedback-action applied
producer-side monitor/supervisor changes and restarted bounded analysis, while
the refreshed graph shows duplicate share returning to `0.5000`. The next check
is sustained active/current cleanliness across root rolls and cooldown expiry.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes i34/i35/i36/i38 as active filing anchors with the
latest fresh alias, currently `fresh-prset/iteration-39`, keeps `PR03B`,
`PR07B2`, and `PR07C` held, and rejects stale Cycle293, Cycle306, Cycle312,
stale/local manifests, fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`,
`PR18x`, and zero-byte artifacts as filing authority. The latest
feedback-action completed the earlier i36 audit/manifest, but the synthesis
rejects treating that as current filing authority. Filing remains blocked by a
latest-fresh audit manifest, PR07 owner replay, final-stack fuzz, and rebuilt
validation.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes selected rich-text CRDT
coverage-guided lower-level runs and a validated HTTP polling protocol/server
smoke, but the latest level-mix synthesis says browser/e2e materialization was
unstable (`27` to `7` live PIDs) and blocks protocol start until browser counts
stay above the `24` floor. The report still treats protocol/backend outputs as
harness evidence until collector-visible protocol counts appear. The next narrow
checks are producer-side duplicate/noise stability, browser materialization,
collector-visible lower-level/protocol counts, and PR07 replay evidence before
any filing or final-stack claim.
