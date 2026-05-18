# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T14:03:46Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T13:53:10Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T14:00:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2259` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T13:53:10Z`, coverage
files grew from `272` to `53149`, a delta of `52877`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and
reload-post action depth.

The latest plotted live duplicate/noise point is clean on the
current-output-dir metric: `duplicateShareCurrent=0`, and current summary
startup failures remain `0`. That is only an initial recovery signal: one of
the latest eight current-output duplicate-share samples was `1`, at
`2026-05-18T12:19:24Z`, and a recent sample at `2026-05-18T12:46:08Z` still had
one quality issue and one warning. The latest pass has `0` quality issues, `0`
warnings, `408.1G` free memory, `no_progress=0`, and `headroom=false`. This
report uses current-output duplicate/noise and summary
startup failures for live health. Historical aggregate duplicate/noise is
context only; its latest duplicate share is `0.3425` and is not the plotted live
health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the clean current-output point as durable recovery by itself. The newest
duplicate/noise synthesis, `20260518T133351Z`, says the remaining leak is
control-plane scheduling: novelty producer holds must include current
no-analysis drains, and bootstrap or empty-materialization rescue must not
revive producers blocked by duplicate/noise or startup cooldowns. The latest
duplicate/noise feedback-action, `20260518T133351Z`, implemented the bounded
producer/consumer control-plane fix, restarted novelty, supervisor, and
analysis, and measured strict startup drains outside live launch scope. Full
current duplicate-share metrics were still pending the next complete monitor
pass after that restart, so the clean graph point remains point-in-time
evidence.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T133718Z`, keeps ready/local and CRDT lanes usable
but says PR07 is not reviewable as a linear tail. It keeps the PR07 decision
structure after `PR07A3`: current `PR07B0` versus `121507`, then the winner or
additive result versus current `PR07B1A`,
`111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`. It says seed
`1020002` blocks final-stack fuzzing, filing, and rebuilt stack-wide
validation, but must not block PR07 adjudication, deferred audits, or loop
repair. The latest feedback-action, `20260518T133718Z`, updated the split
document, launched the post-`133533` bundle/manifest audit, and reports `PASS`
with `0` hard failures and `6` warnings across `71` manifest rows. It also
confirms `133049` is the same blocked epoch-guard family as `056aa92f293`. PR07
owner replay/conflict resolution and seed `1100001` deep triage still did not
run in that pass, so raw `PR07D`, raw deferred reload heads, `PR17`, `PR18`, and
`PR18x` remain rejected.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `53149` files.
Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0`, current summary startup
failures `0`, quality issue count `0`, warning count `0`, free memory `408.1G`,
`no_progress=0`, and `headroom=false`. The latest sample follows a noisy
current-output duplicate-share sample at `2026-05-18T12:19:24Z` and a recent
quality/warning sample at `2026-05-18T12:46:08Z`, so it is initial remediation
evidence rather than durable recovery. The health graph does not use historical
aggregate duplicate/noise as the plotted live signal.

The refreshed current enabled group is `novelty-ws-block-gauntlet`.
Current-output duplicate share is `0` and current summary startup failures are
`0`. The latest duplicate/noise synthesis rejects reading startup-failure
suppression as full recovery by itself and points to novelty-monitor scheduling:
current no-analysis drains must count as duplicate/noise pressure, and rescue
paths must not bypass startup or duplicate/noise cooldowns. The latest action
implemented that bounded control-plane fix and restarted the novelty,
supervisor, and analysis sessions. It measured strict startup drains outside
live launch scope, but reported that full duplicate-share metrics were still
pending the next complete monitor pass after restart.
The next check is sustained low current-output duplicate share while useful
fuzzing advances, not whether historical aggregate duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T14:00:00Z` show bursty CPU. The
latest 25 CPU samples range from `44.96%` to `83.69%` utilization, with the
latest sample at `67.16%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `16` windows, five-minute load in `19`, 15-minute
load in `19`, and at least one load window exceeded it in `21`. The newest
1/5/15-minute load sample is `38.32`, `52.52`, and `61.97`; those latest load
windows are below the logical CPU count, with `8` blocked tasks in the latest
sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent enable events include `novelty-http-persistence-probe` and
`novelty-ws-multi-reload-lifecycle`, while the refreshed current enabled group
is `novelty-ws-block-gauntlet`, so current activity is read from both
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

Live fuzzing is still concentrated in browser/e2e lanes in the committed graph,
with a narrow graph-visible lower-level presence: `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain at `0` in the
committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T125540Z`, rejects a
broad lane-count change. It says to keep browser/e2e protected at `>=24` active
dirs and cap each non-browser level at one lane: `unit-property=1`,
`coverage-guided-lower-level=1`, `backend-api=1`, `protocol-server=1`, and
`fuzz-assertion=1`. It recommends changing the oracle/target mix instead,
specifically wiring the dormant backend revision-restore oracle into the active
backend/API lane, and it calls out stale fuzz-assertion and browser/novelty
accounting as defects to fix before trusting another mix decision. The graph
shows `26` browser/e2e lanes, while the persona synthesis says browser
accounting feeds should fail closed before another capacity decision. The latest
level-mix feedback-action file is empty; the latest nonempty one,
`20260518T122130Z`, says it fixed browser startup-stall recovery and unaudited
fuzz-assertion accounting without a broad rebalance. The committed graph still
shows only one graph-visible coverage-guided lower-level lane and zero
collector-visible protocol-server, backend/API, or standalone `fuzz-assertion`
executions, so those action reports are not yet sustained trend evidence.

The latest native-harness synthesis, `20260518T134922Z`, is empty. The latest
nonempty synthesis, `20260518T134101Z`, keeps the rich-text CRDT multiblock
harness as the first isolated coverage-guided lower-level target, labeled as a
V8/Node/Jest coverage-guided mutator rather than true AFL/libFuzzer. The latest
nonempty action, `20260518T132549Z`, reports a bounded smoke run with
lower-level event accounting and an advancing continuous session, but the
committed graph has one collector-visible coverage-guided lower-level lane and
`0` current lower-level execution rate in the latest bucket, so it is not yet
sustained trend evidence.

The latest protocol-server synthesis, `20260518T135212Z`, still keeps the HTTP
polling REST endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`, with durable
state-machine oracles and collector-compatible event accounting. The latest
action, `20260518T133941Z`, validated a bounded protocol/server run with
`fuzzLevel: "protocol-server"`, a passing `seed-attempt-complete`,
`caseCount=20`, and non-empty oracle counts. The graph still has `0`
protocol-server cumulative executions and no current protocol rate, so protocol
work is persona-loop evidence but not collector-visible sustained trend
evidence. The latest fuzz-only assertion apply file, `20260518T123807Z`, added
three browser-gated diagnostics and restarted affected browser fuzz loops.
Standalone `fuzz-assertion` executions remain `0` in the graph.

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

The latest collected execution data has about `5,745,571` completed test
executions: `206,262` browser/e2e, `3,006` transport/integration, `5,088,480`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `1,388` browser/e2e test executions/hour, `3,584`
unit-property executions/hour, and `0` coverage-guided-lower-level
executions/hour, with `0` current rate for transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for protocol validation
and browser-gated or audited fuzz-only assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `746` unique
likely-real findings over about `2,329.2` runner-hours, or `32.03` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,988` candidates
over `2,329.2` runner-hours (`257.08` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `40.8` runner-hours
(`12.27` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`191`), three-user late join (`126`), real-user
editing (`100`), permissions/auth/locks (`88`), and block gauntlet (`30`). The
broader unique-output candidate view is led by three-user late join (`823`),
session lifecycle (`766`), real-user editing (`703`),
permissions/auth/locks (`470`), and block gauntlet (`443`), with lower-level
lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7788.0` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1761.8` for unit/property.

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
| `revision-persistence` | 6263 | 272 | 0 | 4.3% |
| `parser-serialization` | 3949 | 249 | 0 | 6.3% |
| `real-user-editing` | 8513 | 611 | 0 | 7.2% |
| `common-blocks` | 4739 | 500 | 0 | 10.6% |
| `parser-transform` | 4992 | 542 | 0 | 10.9% |
| `long-session-large-doc` | 3785 | 592 | 0 | 15.6% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7062 | 1327 | 0 | 18.8% |
| `session-lifecycle` | 9223 | 2720 | 0 | 29.5% |
| `media-cross-entity` | 498 | 160 | 0 | 32.1% |
| `persistence-no-title` | 3889 | 1343 | 0 | 34.5% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1117 | 2000 |
| real-user title save/reload next 1000 tier | 572 | 1000 |
| successful real-user-editing records next 1000 tier | 611 | 1000 |
| real-user body save/reload next 1000 tier | 631 | 1000 |

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
took roughly `7.6` to `15.4` minutes in this snapshot. The newest completed
review cycle, `20260518T133718Z`, took `8.8` minutes. The latest synthesis
rejects a filing-ready interpretation: filing, final-stack fuzzing, PR07
filing, and stack-wide validation remain blocked. It keeps the ready/local and
CRDT lanes usable, but says PR07 is not reviewable as a linear tail. The PR07
tail remains a decision structure after `PR07A3`: compare current `PR07B0`
against `121507`, then compare the winner or additive result against current
`PR07B1A`, `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, with
PR03B/HOLD-07B2/HOLD-07C held as comparison arms. It also treats
`5817434bb6cf` / seed `1100001` as separate reload/provider rejoin evidence,
not coverage for the stale sync-manager epoch guard. The latest feedback-action,
`20260518T133718Z`, updated the split document and launched the post-`133533`
bundle/manifest audit. That audit passed with `0` hard failures and `6`
warnings over `71` manifest rows, and confirmed `133049` is the same blocked
epoch-guard family as `056aa92f293`, not a ready PR. PR07 owner replay/conflict
resolution and seed `1100001` deep triage remain unrun, so filing, broad
final-stack fuzzing, and stack-wide validation remain blocked. Raw `PR07D`, raw
deferred reload heads, `PR17`, `PR18`, and `PR18x` remain rejected.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T13:48:07Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health is still only a point-in-time recovery signal. The latest plotted
duplicate/noise sample uses the current-output-dir metric: startup failures are
`0` and current-output duplicate share is `0`. That improves on the noisy
current-output duplicate-share sample at `2026-05-18T12:19:24Z`, but a later
sample at `2026-05-18T12:46:08Z` still had one quality issue and one warning.
The latest full health sample has `headroom=false`, quality issues `0`, warnings
`0`, `no_progress=0`, and `408.1G` free memory. The latest sysstat
1/5/15-minute load windows are `38.32`, `52.52`, and `61.97`, below the `64`
logical CPU count, though recent windows were still oversubscribed. Historical
aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
or the clean current-output point into a durable recovery claim. The newest
duplicate/noise synthesis, `20260518T133351Z`, says the remaining root cause is
novelty-monitor scheduling: current no-analysis drains must count as
duplicate/noise pressure, and rescue paths must not bypass duplicate/noise or
startup cooldowns. The latest feedback-action implemented that bounded
producer/consumer fix and measured strict startup drains outside live launch
scope after restart. The graph still cannot claim durable recovery until the
next complete monitor passes show sustained low current-output duplicate share
while useful fuzzing advances.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T133718Z` synthesis keeps ready/local and CRDT lanes usable, but
says PR07 remains a two-stage decision fork rather than a linear tail:
`PR07B0` competes with `121507`, then the winner or additive result competes
against `PR07B1A`, `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`.
It also treats `5817434bb6cf` / seed `1100001` as separate reload/provider
rejoin evidence. The latest feedback action updated the split and passed a
post-`133533` manifest audit, but PR07 owner replay/conflict resolution and seed
`1100001` triage are still unrun. The stack is still not file-ready: seed
`1020002` still blocks final-stack fuzzing, filing, and rebuilt stack-wide
validation. It should not block PR07 adjudication, deferred audits, or loop
repair.

The committed fuzzing graph is still browser/e2e-heavy: `26` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback says not to rebalance
broadly: keep browser/e2e at or above `24`, cap the other levels at one lane
each, wire the backend revision-restore oracle next, and repair stale
browser/novelty and fuzz-assertion accounting before trusting another capacity
decision. Native-harness evidence reports a rich-text CRDT lower-level smoke run
and an advancing continuous session. Protocol action evidence reports a bounded
validated HTTP polling REST harness with `fuzzLevel: "protocol-server"`, a
passing `seed-attempt-complete`, `caseCount=20`, and non-empty oracle counts,
and fuzz-only assertion evidence reports three newer browser-gated diagnostics.
Collector-visible trend counters still show zero current lower-level rate and
zero protocol/backend/assertion executions. The next narrow checks are sustained
current-output duplicate/noise health, collector-visible backend/protocol/assertion
counts, PR07 owner replay for the `121507` and `133049` forks, and the `1020002`
blocker before any filing or final-stack claim.
