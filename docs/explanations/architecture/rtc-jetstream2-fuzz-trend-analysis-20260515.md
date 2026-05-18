# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T14:42:00Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T14:35:58Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T14:40:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2263` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T14:35:58Z`, coverage files grew from
`272` to `53371`, a delta of `53099`. The monitor's visible likely-real maximum
reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live health point is clean on the current-output-dir metric:
current summary startup failures are `0` and `duplicateShareCurrent=0`. Seven of
the latest eight current-output duplicate-share samples were clean, with the
one regression at `2026-05-18T14:13:44Z`. A sample at
`2026-05-18T12:46:08Z` had one quality issue and one warning. The latest pass
has `0` quality issues, `0` warnings, `415.1G` free memory, `no_progress=0`, and
`headroom=false`. This report uses current-output duplicate/noise and summary
startup failures for live health. Historical aggregate duplicate/noise is
context only; its latest duplicate share is `0.3423` and is not the plotted live
health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects a
durable recovery read. The latest duplicate/noise synthesis,
`20260518T141322Z`, says the remaining leak is producer/control-plane
scheduling around no-product startup-noise sentinels, not downstream analysis.
The latest feedback-action file is empty; the latest non-empty feedback-action,
`20260518T133351Z`, implemented a bounded control-plane fix and reported
startup drains outside live launch scope, while full duplicate-share metrics
were still pending. The refreshed graph has startup failures still suppressed
and latest current-output duplicate share back at `0` after a one-sample
regression, so the right read is improving live health, not durable recovery
yet.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T142714Z`, says the split needs replacement and is
not fileable as-is. It adds `PR02B` as an HTTP polling awareness rejoin retry
sidecar from `20260518T140108Z`, now present in the live `142548Z`
finalization, but still requiring post-finalization audit and seed `1030001`
replay. It keeps `PR07` as a runtime-gated decision fork, rejects raw `PR07D`,
raw reload-hydration publication, and `PR18x`, and says seed `1020002` blocks
final-stack fuzzing, GitHub filing, and stack-wide validation only. Independent
PR02B audit, PR07 materialization/owner replay, strict owner checks, and loop
repair should continue. The latest feedback-action, `20260518T140417Z`, applied
the earlier split change and completed PR07 fork, deferred-manifest, and PR05
owner-comparison jobs with `0` hard failures.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `53371` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0`, current summary startup
failures `0`, quality issue count `0`, warning count `0`, free memory `415.1G`,
`no_progress=0`, and `headroom=false`. Seven of the latest eight
current-output duplicate-share samples were clean, and startup failures remain
suppressed, but the `2026-05-18T14:13:44Z` duplicate-share regression means this
is not durable recovery. The health graph does not use historical aggregate
duplicate/noise as the plotted live signal.

The refreshed current enabled group is `novelty-ws-async-server-blocks`. The
latest duplicate/noise synthesis rejects reading startup-failure suppression as
full recovery by itself and points to novelty-monitor scheduling and sentinel
handling: producer-scoped duplicate/noise holds, no-product startup drains, and
product-evidence drain analysis must stay distinct. The next check is sustained
low current-output duplicate share while useful fuzzing advances, not whether
historical aggregate duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T14:40:00Z` show bursty CPU. The
latest 25 CPU samples range from `67.16%` to `83.69%` utilization, with the
latest sample at `76.53%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `19` windows, five-minute load in `22`,
15-minute load in `21`, and at least one load window exceeded it in `23`. The
newest 1/5/15-minute load sample is `79.09`, `70.26`, and `69.73`; all three
latest load windows are above the logical CPU count, with `1` blocked task in
the latest sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent enable events include `novelty-http-persistence-probe`,
`novelty-ws-same-user-stale-tabs`, `novelty-ws-async-server-blocks`, and
`novelty-ws-permissions-auth-locks`, while the refreshed current enabled group
is `novelty-ws-async-server-blocks`. Current surface state is read from both
supervisor/group snapshots and lane events rather than from the historical
enable log alone.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `26` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph:
`26` of the latest `28` graph-visible lanes are browser/e2e. The graph-visible
lower-level activity is narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters, even though persona-loop action evidence reports
backend oracle work, protocol-server validation, and browser-gated fuzz-only
assertions.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T141752Z`, says browser
materialization was below the `24` lane floor in live persona samples
(`16`-`18` active browser lanes, with context at `17/24`) and recommends
repairing strict browser materialization before adding lower-level capacity. It
keeps `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and `fuzz-assertion` at one lane each, but treats
`fuzz-assertion` as unaudited/zero useful capacity until accounting is fixed.
The latest feedback-action file is empty; the latest non-empty feedback-action,
`20260518T125540Z`, enabled the backend revision-restore oracle and reconciled
telemetry, but its final context still had browser yield below floor (`13`
versus `24`) and coverage-guided lower-level had zero bug/assertion output. The
committed graph shows `26` browser/e2e lanes, so the right read is
"browser-heavy with narrow lower-level activity, with persona evidence warning
browser materialization is not yet trustworthy", not "safe to rebalance
broadly."

The latest native-harness synthesis, `20260518T143036Z`, keeps the rich-text
CRDT multiblock harness as the first isolated coverage-guided-lower-level
target and says not to start with parser/serialization or table-query-array.
The latest action, `20260518T141455Z`, reports an adopted harness, a passing
smoke run with root/lane `events.ndjson`, `fuzzLevel: "coverage-guided-lower-level"`,
`testExecutionCount=2`, and a live continuous session sampled at attempt `601`.
The committed graph has one collector-visible
coverage-guided-lower-level lane but `0` current lower-level execution rate in
the latest bucket, so this is active persona-loop evidence rather than sustained
trend evidence.

The latest protocol-server synthesis and action, both `20260518T142316Z`, keep
the HTTP polling REST endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`. The bounded
validation produced `fuzzLevel: "protocol-server"` root/lane events, a passing
`seed-attempt-complete`, `caseCount=20`, `testExecutionCount=20`, and non-empty
oracle counts, but intentionally did not move the protocol current-run-root
pointer. The graph still has `0` protocol-server cumulative executions and no
current protocol rate. Protocol work is therefore strong persona-loop evidence
but not collector-visible sustained trend evidence. The latest fuzz-only
assertion apply file, `20260518T123807Z`, added three browser-gated diagnostics
and restarted affected browser fuzz loops. Standalone `fuzz-assertion`
executions remain `0` in the graph.

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

The latest collected execution data has about `5,761,170` completed test
executions: `211,493` browser/e2e, `3,006` transport/integration, `5,098,848`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `5,788` browser/e2e test executions/hour and
`11,648` unit-property executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend oracle
work, protocol validation, and browser-gated/audited fuzz-only assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `748` unique
likely-real findings over about `2,346.8` runner-hours, or `31.87` per 100
runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` triaged likely-real outputs in the collected
triage rows. That does not prove the lower-level lanes are unproductive; it
means their findings have not yet flowed through the same non-duplicate
likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The unique bug-output candidate graphs are broader. They dedupe non-infra
`likely_real` or `uncertain` triage rows, untriaged raw browser/transport
failure signatures, and lower-level assertion failures by canonical output key.
These graphs are intentionally broader than confirmed bugs and narrower than
raw failed attempts; untriaged candidates are not confirmed bugs.

Current unique bug-output candidate rates are: browser/e2e `5,998` candidates
over `2,346.8` runner-hours (`255.59` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `41.4` runner-hours
(`12.09` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`191`), three-user late join (`126`), real-user
editing (`101`), permissions/auth/locks (`88`), and parser serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`823`),
session lifecycle (`767`), real-user editing (`704`), revision persistence
(`533`), and permissions/auth/locks (`472`), with lower-level lanes showing only
small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7951.8` for browser/e2e, `4537.5` for transport/integration, `759.3`
for coverage-guided lower-level, and `1735.7` for unit/property.

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
| `multi-reload-lifecycle` | 3936 | 160 | 0 | 4.1% |
| `revision-persistence` | 6302 | 274 | 0 | 4.3% |
| `parser-serialization` | 3949 | 249 | 0 | 6.3% |
| `real-user-editing` | 8549 | 611 | 0 | 7.1% |
| `common-blocks` | 4739 | 500 | 0 | 10.6% |
| `parser-transform` | 5005 | 543 | 0 | 10.8% |
| `long-session-large-doc` | 3821 | 592 | 0 | 15.5% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7070 | 1328 | 0 | 18.8% |
| `session-lifecycle` | 9251 | 2722 | 0 | 29.4% |
| `media-cross-entity` | 498 | 160 | 0 | 32.1% |
| `persistence-no-title` | 3892 | 1343 | 0 | 34.5% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1118 | 2000 |
| real-user title save/reload next 1000 tier | 573 | 1000 |
| successful real-user-editing records next 1000 tier | 611 | 1000 |
| real-user body save/reload next 1000 tier | 632 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and reload-post action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The highest-volume feature categories are history, operation-ledger, invariant,
action pairs, block depth, block, action, other, transport, collaborator,
revision, and payload-size observations. The plot separates breadth (`keys`)
from repeated observations (`total_count`) so broad coverage is not hidden
inside raw event volume.

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
took roughly `8.1` to `15.4` minutes in this snapshot. The newest completed
review cycle, `20260518T142714Z`, took `11.4` minutes.

The latest synthesis rejects a filing-ready interpretation. It says the split
needs replacement, adds `PR02B` as a sidecar that still needs audit and seed
`1030001` replay, and keeps `PR07` as a runtime-gated decision fork rather than
a linear tail. `PR07B0` must still be compared with conflict-resolved
`121507`/`134558`, and `PR07B1A` must compete with
`111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`. Raw `PR07D`,
raw reload-hydration publication, `PR18x`, and fallback-tail manifests based on
`fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or PR15/fallback
tails remain rejected. Broad final-stack fuzzing, GitHub filing, and rebuilt
stack validation remain deferred until seed `1020002` and PR07 ownership are
resolved.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T14:17:52Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, and the
latest live health point is clean, but the run is not yet durable. The latest
plotted duplicate/noise sample uses the current-output-dir metric: startup
failures are `0` and current-output duplicate share is `0`. A recent sample at
`2026-05-18T12:46:08Z` had one quality issue and one warning, and
`2026-05-18T14:13:44Z` briefly regressed to duplicate share `1`. The latest
full health sample has `headroom=false`, quality issues `0`, warnings `0`,
`no_progress=0`, and `415.1G` free memory. The latest sysstat 1/5/15-minute
load windows are `79.09`, `70.26`, and `69.73`; all three are above the `64`
logical CPU count. Historical aggregate duplicate/noise is not the live health
signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The graph now shows startup failures still
suppressed and latest current-output duplicate share back at `0`, but more
monitor passes are needed before claiming recovery.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says the split needs replacement, PR02B needs audit/replay,
and PR07 remains a decision fork with unresolved ownership. Seed `1020002`
still blocks final-stack fuzzing, filing, and rebuilt stack-wide validation. It
should not block independent PR02B audit, PR07 materialization/owner replay,
strict owner checks, deferred audits, PR05 owner comparison, or loop repair.

The committed fuzzing graph is still browser/e2e-heavy: `26` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback says not to rebalance
broadly: repair browser materialization first, keep browser/e2e at or above
`24`, cap the other levels at one lane each, and improve oracle/target quality.
It also contradicts a simple "26 browser lanes means healthy" read because live
persona samples saw browser materialization below floor. Native-harness evidence
reports a rich-text CRDT lower-level smoke run and an advancing continuous
session. Protocol action evidence reports a bounded validated HTTP polling REST
harness with `fuzzLevel: "protocol-server"`, a passing
`seed-attempt-complete`, `caseCount=20`, and non-empty oracle counts, and
fuzz-only assertion evidence reports three newer browser-gated diagnostics.
Collector-visible trend counters still show zero current lower-level rate and
zero protocol/backend/assertion executions. The next narrow checks are
sustained current-output duplicate/noise health, collector-visible backend,
protocol, or assertion counts, continued lower-level output accounting, and the
`1020002` blocker before any filing or final-stack claim.
