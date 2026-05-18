# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T17:07:57Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T17:05:44Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T17:00:02Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2276` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T17:05:44Z`, coverage files grew from
`272` to `54288`, a delta of `54016`. The monitor's visible likely-real maximum
reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. That follows a `2026-05-18T14:13:44Z` regression to
duplicate share `1` and a `2026-05-18T16:40:50Z` regression to duplicate share
`0.5`, so it is a clean latest sample rather than proof of durable recovery. The
latest pass has `0` quality issues, `0` warnings, `428.5G` free memory,
`no_progress=0`, and `headroom=true`. This report uses current-output
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3418` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects a
durable recovery read. The latest duplicate/noise synthesis,
`20260518T165312Z`, says the remaining duplicate/noise loop is
producer-side scheduler/control-plane behavior: historical startup-noise memory
is treated like a current fleet-wide hold, then the bootstrap escape hatch can
re-enable a default noisy canary. The latest feedback-action,
`20260518T162155Z`, added a no-product startup-noise fleet hold, preserved
product-evidence metadata on reused startup pauses, allowed one canary escape
hatch, restarted the active novelty/supervisor/live-analysis processes, and
ended with `supervisor-groups.json` set to `[]` because no safe replacement
producer was available. The newer synthesis still rejects a recovered-capacity
read and recommends separating current holds from historical cooldowns and
disabling or tightly gating the canary path. The graph's latest
duplicate/share sample is clean, but the persona loop rejects interpreting that
as durable recovery.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T165336Z`, says filing and broad final-stack fuzzing
remain blocked and preserves the runtime-gated PR07 decision fork around
`PR07B0A-155713`. It keeps ready/local and CRDT lanes usable, keeps `PR02B`
blocked after `PR02`, rejects raw `PR07D`, raw `deferred/*`, `PR17`, `PR18`,
`PR18x`, reload-hydration publication, and fallback-tail `PR05D` proofs, and
explicitly says a zero-byte `20260518T165635Z/finalization.report.md` is not
evidence. The latest non-empty feedback-action, `20260518T163556Z`, updated the
split, launched the bounded post-`163628` finalization audit, and got `PASS`
with `0` hard failures and `55` warnings, but it deferred PR07 replay, PR02B
validation, reload replays, broad final-stack fuzzing, filing, and stack
validation.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `54288` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`428.5G`, `no_progress=0`, and `headroom=true`. Startup failures remain
suppressed and the latest current-output duplicate share is clean after the
prior `0.5` sample. That makes the plotted live health clean on duplicate/noise,
but it does not prove recovered producer capacity. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The enabled-groups summary field lists only `novelty-ws-media-cross-entity` in the
latest collection, so full current surface state is read from
supervisor/lane snapshots in the level-mix section rather than from the
historical enable log alone. The latest duplicate/noise synthesis rejects
reading startup-failure suppression as full recovery by itself and points to
producer-side startup-noise scheduling: historical startup-noise memory should
be a cooldown, not a fleet-wide blocker, and the canary path should be disabled
or tightly gated. The latest feedback-action implemented a fleet hold and left
`supervisor-groups.json` empty because no safe replacement producer was
available, while the newer synthesis says that hold/canary path still needs a
narrower scheduler fix. The next check is sustained low current-output duplicate
share while useful fuzzing advances, not whether historical aggregate
duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T17:00:02Z` show bursty CPU followed
by a lower latest sample. The latest 25 CPU samples range from `45.39%` to
`87.39%` utilization, with the latest sample at `45.39%`. Over those same 25
samples, one-minute load exceeded the `64` logical CPU count in `19` windows,
five-minute load in `22`, 15-minute load in `22`, and at least one load window
exceeded it in `23`. The newest 1/5/15-minute load sample is `28.89`, `35.57`,
and `54.59`; none of those windows is above the logical CPU count, with `1`
blocked task in the prior sample and `6` blocked tasks in the latest sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent enable events include `novelty-ws-async-server-blocks`,
`novelty-ws-permissions-auth-locks`, `novelty-ws-long-session-large-doc`, and
`novelty-ws-media-cross-entity`. The refreshed summary's
`enabled_groups_current` value is `novelty-ws-media-cross-entity`, so current
surface state is read from supervisor/group snapshots and lane events rather
than from the historical enable log alone.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `28` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph:
`28` of the latest `30` graph-visible lanes are browser/e2e. The graph-visible
lower-level activity is narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters, even though persona-loop action evidence reports
backend oracle work, protocol-server validation, and browser-gated fuzz-only
assertions.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T164452Z`, says
the effective mix should change now, but narrowly: browser/e2e is
under-materialized, strict had `0` active dirs in that context, backend/API was
dead or untrusted, and accounting was inconsistent. The refreshed graph now
shows a collector-visible strict-expansion snapshot at `2026-05-18T17:05:15Z`,
so the strict-`0` observation is stale or from a narrower operational view. The
persona loop still rejects treating the browser-heavy graph as healthy
materialization until telemetry fails closed and backend/API is restored. It
recommends keeping `unit-property`, `coverage-guided-lower-level`,
`protocol-server`, and `fuzz-assertion` capped at one lane each.

The latest native-harness synthesis, `20260518T165426Z`, keeps
`coverage-guided-lower-level-rich-text-multiblock` as the first ready isolated
lower-level target and labels it as V8/Node coverage-guided fuzzing, not
AFL/libFuzzer or C/C++ native fuzzing. The latest protocol-server synthesis,
`20260518T165419Z`, keeps the HTTP polling REST endpoint harness first, through
real REST dispatch into `WP_HTTP_Polling_Sync_Server` and
`WP_Sync_Post_Meta_Storage`; the latest non-empty action,
`20260518T163957Z`, validated two passing `fuzzLevel: "protocol-server"`
`seed-attempt-complete` records with `20` cases each without moving the protocol
current-run pointer. The latest fuzz-assertion apply, `20260518T152353Z`, added
guarded fuzz-only assertions and restarted only affected browser RTC loops.
These are active persona-loop signals, but collector-visible trend counters
still show `0` backend/API, protocol-server, and standalone fuzz-assertion
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

The latest collected execution data has about `5,817,505` completed test
executions: `228,724` browser/e2e, `3,006` transport/integration, `5,137,952`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `2,108` browser/e2e test executions/hour and
`7,936` unit-property executions/hour, with `0` current rate for
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

On that triage-output metric, browser/e2e currently dominates: `766` unique
likely-real findings over about `2,426.2` runner-hours, or `31.57` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,091` candidates
over `2,426.2` runner-hours (`251.05` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `43.8` runner-hours
(`11.42` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`201`), three-user late join (`126`), real-user
editing (`102`), permissions/auth/locks (`88`), and parser serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`840`),
session lifecycle (`780`), real-user editing (`712`), revision persistence
(`549`), and permissions/auth/locks (`473`), with lower-level lanes showing only
small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `8393.7` for browser/e2e, `4537.5` for transport/integration, `759.3`
for coverage-guided lower-level, and `1640.0` for unit/property.

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
| `multi-reload-lifecycle` | 4000 | 162 | 0 | 4.1% |
| `revision-persistence` | 6620 | 284 | 0 | 4.3% |
| `parser-serialization` | 4031 | 252 | 0 | 6.3% |
| `real-user-editing` | 8778 | 612 | 0 | 7.0% |
| `common-blocks` | 4807 | 501 | 0 | 10.4% |
| `parser-transform` | 5205 | 564 | 0 | 10.8% |
| `long-session-large-doc` | 3913 | 594 | 0 | 15.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7155 | 1340 | 0 | 18.7% |
| `session-lifecycle` | 9465 | 2739 | 0 | 28.9% |
| `media-cross-entity` | 510 | 160 | 0 | 31.4% |
| `three-user-late-join` | 11432 | 3928 | 0 | 34.4% |
| `persistence-no-title` | 3968 | 1405 | 0 | 35.4% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1134 | 2000 |
| real-user title save/reload next 1000 tier | 587 | 1000 |
| successful real-user-editing records next 1000 tier | 612 | 1000 |
| real-user body save/reload next 1000 tier | 646 | 1000 |

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
took roughly `7.0` to `12.6` minutes in this snapshot. The newest completed
review cycle, `20260518T165336Z`, took `10.0` minutes.

The latest synthesis rejects a filing-ready interpretation. It says the split
is not fileable and should replace the old PR07 tail with a runtime-gated
decision fork centered on `PR07B0A-155713`. `PR02B` stays a blocked-validation
sidecar after `PR02`, and ready/local plus CRDT lanes remain usable. Raw
`PR07D`, raw `deferred/*`, `PR17`, `PR18`, `PR18x`, reload-hydration
publication, fallback-tail `PR05D` proofs, active sessions, and zero-byte
reports remain rejected or held. The latest non-empty feedback-action updated
`current-pr-split.md`, launched the bounded post-`163628`
current-finalization audit, and got `PASS` with `0` hard failures and `55`
warnings. That still is not filing authority; PR07 replay, PR02B validation,
reload marker/lifecycle replay, broad final-stack fuzzing, filing, and stack
validation remain deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T16:54:43Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but the run
is not yet durable. The latest plotted duplicate/noise sample uses the
current-output-dir metric: startup failures are `0` and current-output
duplicate share is `0`. `2026-05-18T14:13:44Z` regressed to duplicate share
`1`, `2026-05-18T16:40:50Z` regressed to duplicate share `0.5`, and the latest
point is clean again. The latest full health sample has `headroom=true`,
quality issues `0`, warnings `0`, `no_progress=0`, and `428.5G` free memory.
The latest sysstat 1/5/15-minute load windows are `28.89`, `35.57`, and
`54.59`; none is above the `64` logical CPU count, with `6` blocked tasks.
Historical aggregate
duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The graph now shows startup failures suppressed
and latest current-output duplicate share clean, but the latest feedback-action
held the producer fleet and left `supervisor-groups.json` empty because no safe
replacement producer was available, and the newer synthesis says the canary
escape hatch and current-vs-historical hold scope still need correction. The
right read is "duplicate/noise clean at the latest point, capacity not
recovered."

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says the split needs a runtime-gated PR07 decision fork,
`PR02B` remains blocked-validation work after `PR02`, and `PR07B0A-155713` is a
blocked comparison candidate rather than a ready PR. It also rejects zero-byte
reports as evidence. The latest non-empty feedback-action records a passing
bounded finalization audit with `0` hard failures and `55` warnings, but it also
rejects filing. Seed `1020002` still blocks final-stack fuzzing, filing, and
rebuilt stack-wide validation; `PR02B` validation, `PR07` owner replay, and
reload-marker/lifecycle replay remain open.

The committed fuzzing graph is still browser/e2e-heavy: `28` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback rejects treating the
graph-visible browser count as healthy materialization: the refreshed graph now
shows strict-expansion active, but backend/API is still dead or untrusted and
telemetry must fail closed on current-root/status/events disagreements. It
recommends restoring backend/API as one lane only after browser materialization
is reliable, while keeping unit/property, coverage-guided lower-level,
protocol/server, and fuzz-assertion capped at one lane. Native-harness evidence
reports a rich-text CRDT multiblock lower-level target as the first ready
isolated harness; protocol evidence reports a bounded validated HTTP polling
REST harness with `fuzzLevel: "protocol-server"` and two passing `20`-case seed
attempts.
Collector-visible trend counters still show zero current lower-level rate and
zero protocol/backend/assertion executions. The latest execution-rate bucket has
`2,108` browser/e2e executions/hour and `7,936` unit-property executions/hour;
coverage-guided-lower-level, transport-integration, backend/API,
protocol-server, and standalone `fuzz-assertion` are at `0` current rate in the
committed counters. The next narrow checks are sustained current-output
duplicate/noise health while browser capacity advances, collector-visible
backend, protocol, or assertion counts, continued lower-level output accounting,
and the `1020002` blocker before any filing or final-stack claim.
