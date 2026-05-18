# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T17:34:16Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T17:29:40Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T17:30:09Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2277` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T17:29:40Z`, coverage files grew from
`272` to `54358`, a delta of `54086`. The monitor's visible likely-real maximum
reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. That follows a `2026-05-18T14:13:44Z` regression to
duplicate share `1` and a `2026-05-18T16:40:50Z` regression to duplicate share
`0.5`, so it is a clean latest duplicate/noise sample rather than proof of
durable recovery. The latest pass has `1` quality issue, `1` warning, `424.5G`
free memory, `no_progress=0`, and `headroom=true`. This report uses current-output
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3416` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects a
durable recovery read. The newest duplicate/noise synthesis,
`20260518T170450Z`, says the remaining problem is a producer/control-plane
leak, not a consumer-side triage leak: strict no-product
`pre_action_bootstrap_stall` is mostly suppressed downstream, but browser
capacity can still be spent by the novelty bootstrap/canary path and supervisor
seed-drain recovery. The matching feedback-action implemented the bounded
producer-side remediation: gate the fleet startup-noise canary, make no-product
startup drains real cooldowns, and keep product-evidence failures visible. It
restarted the affected sessions, but the current root
`run-20260518T172455Z` still has `supervisor-groups.json` set to `[]` and no
active novelty producer dirs while safe producer choices are under
startup-noise cooldown. The graph's latest duplicate/share sample is clean, but
the persona loop rejects interpreting that as durable recovered capacity.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T170339Z`, says the split is blocked, not fileable,
and must keep PR07 as a runtime-gated decision fork. It treats the nonzero
`20260518T165635Z` finalization as real progress but not durable publish or
manifest evidence until a matching post-`165635` audit runs. Ready/local and
CRDT lanes remain usable, `PR02B` remains blocked after `PR02`, raw `PR07D`,
raw `deferred/*`, `PR17`, `PR18`, `PR18x`, and stale fallback-tail proofs stay
rejected, and broad final-stack fuzzing and filing stay blocked. The matching
feedback-action updated the split, ran the post-`165635` finalization audit to
`PASS`, and started PR07C owner replay. The same-user replay group failed with
marker-set divergence rather than readiness failure, and late-join replay was
still running in the feedback artifact, so filing authority is still rejected.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `54358` files.
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
startup failures `0`, quality issue count `1`, warning count `1`, free memory
`424.5G`, `no_progress=0`, and `headroom=true`. Startup failures remain
suppressed and the latest current-output duplicate share is clean after the
prior `0.5` sample. That makes the plotted live duplicate/noise signal clean,
but not the whole health sample and not recovered producer capacity. The health
graph does not use historical aggregate duplicate/noise as the plotted live
signal.

The enabled-groups summary field is blank in the latest collection, so full
current surface state is read from supervisor/lane snapshots in the level-mix
section rather than from the historical enable log alone. The latest
duplicate/noise synthesis rejects reading startup-failure suppression as full
recovery by itself and points to producer-side startup-noise scheduling: the
fleet canary, seed-drain recovery, and paused/no-analysis/recovering producer
accounting were the remaining leak paths. The latest feedback-action applied a
bounded producer-side fix and restarted the affected sessions, but the current
root still has no active novelty producer dirs because safe producer choices are
under startup-noise cooldown. The next check is sustained low current-output
duplicate share while useful fuzzing advances, not whether historical aggregate
duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T17:30:09Z` show bursty CPU and load.
The latest 25 CPU samples range from `45.39%` to `87.39%` utilization, with the
latest sample at `61.74%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `17` windows, five-minute load in `20`, 15-minute
load in `20`, and at least one load window exceeded it in `21`. The newest
1/5/15-minute load sample is `31.19`, `47.72`, and `56.64`; all three are below
the logical CPU count, with `1` blocked task in the latest sample.

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
`enabled_groups_current` value is blank, so current surface state is read from
supervisor/group snapshots and lane events rather than from the historical
enable log alone.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `27` browser/e2e lanes across `24` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph:
`27` of the latest `29` graph-visible lanes are browser/e2e. The graph-visible
lower-level activity is narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters, even though persona-loop evidence reports a launched
backend/API lane, protocol-server harness planning, and browser-gated fuzz-only
assertions.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The newest level-mix synthesis, `20260518T171457Z`, says to
protect and restore useful browser/e2e capacity above the `24`-lane floor, not
add broad lower-level capacity now. It keeps backend/API, protocol-server,
unit-property, fuzz-assertion, and real lower-level lanes capped at one each
unless fresh unique output justifies expansion, and it warns that browser
"running" lanes can be overcounted when recent summaries are infra or
pre-action failures. The latest level-mix feedback-action restarted focused
shards, strict expansion, gap booster, coverage-guided materialization at
`run-20260518T171100Z`, and a backend/API lane at `20260518T170900Z`; its final
context reports `backend-api: 1` lane and `1000` executions with no
`TELEMETRY-INVARIANT-FAIL`. It also says browser/e2e improved but remained
below the `24` active-lane floor at `18` active lanes, which is a stricter
active-dir view than the graph-visible lane count. The committed graph counters
have not yet incorporated backend/API, protocol-server, or standalone
fuzz-assertion executions.

The latest native-harness synthesis, `20260518T171939Z`, keeps the rich-text
CRDT multiblock merge harness as the first ready isolated lower-level target
and labels it as V8/Node coverage-guided fuzzing, not AFL/libFuzzer or C/C++
native fuzzing; it says no files were edited. The latest protocol-server
synthesis, `20260518T172443Z`, still keeps `POST /wp-sync/v1/updates` over HTTP
polling REST as the first server harness, through real REST dispatch into
`WP_HTTP_Polling_Sync_Server` and `WP_Sync_Post_Meta_Storage`; it is a plan and
also says no files were edited. The latest fuzz-assertion apply,
`20260518T152353Z`, added guarded fuzz-only assertions and restarted only
affected browser RTC loops. These are active persona-loop signals, but
collector-visible trend counters still show `0` backend/API, protocol-server,
and standalone fuzz-assertion executions.

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

The latest collected execution data has about `5,825,584` completed test
executions: `229,987` browser/e2e, `3,006` transport/integration, `5,144,768`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `3,328` unit-property executions/hour and `0`
browser/e2e test executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for a launched
backend/API lane, protocol-server harness planning, and browser-gated/audited
fuzz-only assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `767` unique
likely-real findings over about `2,429.9` runner-hours, or `31.57` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,093` candidates
over `2,429.9` runner-hours (`250.75` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `44.2` runner-hours
(`11.31` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`202`), three-user late join (`126`), real-user
editing (`102`), permissions/auth/locks (`88`), and parser serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`840`),
session lifecycle (`781`), real-user editing (`712`), revision persistence
(`549`), and permissions/auth/locks (`473`), with lower-level lanes showing only
small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `8432.0` for browser/e2e, `4537.5` for transport/integration, `759.3`
for coverage-guided lower-level, and `1624.4` for unit/property.

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
| `multi-reload-lifecycle` | 4001 | 162 | 0 | 4.0% |
| `revision-persistence` | 6641 | 289 | 0 | 4.4% |
| `parser-serialization` | 4034 | 252 | 0 | 6.2% |
| `real-user-editing` | 8796 | 613 | 0 | 7.0% |
| `common-blocks` | 4810 | 501 | 0 | 10.4% |
| `parser-transform` | 5205 | 564 | 0 | 10.8% |
| `long-session-large-doc` | 3929 | 594 | 0 | 15.1% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7159 | 1340 | 0 | 18.7% |
| `session-lifecycle` | 9477 | 2743 | 0 | 28.9% |
| `media-cross-entity` | 521 | 163 | 0 | 31.3% |
| `three-user-late-join` | 11455 | 3933 | 0 | 34.3% |
| `persistence-no-title` | 3968 | 1405 | 0 | 35.4% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1143 | 2000 |
| real-user title save/reload next 1000 tier | 596 | 1000 |
| successful real-user-editing records next 1000 tier | 613 | 1000 |
| real-user body save/reload next 1000 tier | 655 | 1000 |

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
took roughly `7.0` to `12.1` minutes in this snapshot. The newest completed
review cycle, `20260518T170339Z`, took `10.6` minutes.

The latest synthesis rejects a filing-ready interpretation. It says the split
is blocked, not fileable, and should keep the old PR07 tail replaced by a
runtime-gated decision fork centered on `PR07B0A-155713`. `PR02B` stays a
blocked-validation sidecar after `PR02`, and ready/local plus CRDT lanes remain
usable. Raw `PR07D`, raw `deferred/*`, `PR17`, `PR18`, `PR18x`,
reload-hydration publication, fallback-tail `PR05D` proofs, active sessions,
and stale finalization proofs remain rejected or held. The matching
feedback-action updated `current-pr-split.md`, ran a post-`165635`
finalization audit to `PASS`, and launched PR07C owner replay. The rerun passed
live-runtime preflight, but the same-user replay group returned rc `1` from
marker-set divergence and the late-join group was still running in the feedback
artifact. That still is not filing authority; PR07 replay, PR02B validation,
reload marker/lifecycle replay, broad final-stack fuzzing, filing, and stack
validation remain deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T17:15:11Z`, has `10`
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
duplicate/noise point is clean again. The latest full health sample has
`headroom=true`, quality issues `1`, warnings `1`, `no_progress=0`, and
`424.5G` free memory. The latest sysstat 1/5/15-minute load windows are
`31.19`, `47.72`, and `56.64`; all three are below the `64` logical CPU count,
with `1` blocked task. Historical aggregate duplicate/noise is not the live
health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The graph now shows startup failures suppressed
and latest current-output duplicate share clean, but the latest non-empty
feedback-action applied the producer-side remediation and still ended with the
current root empty of active novelty producer dirs while startup-noise cooldowns
hold unsafe choices. The latest synthesis says the remaining issue was
producer/control-plane leakage through the startup-noise canary, supervisor
seed-drain recovery, and producer accounting for paused/no-analysis/recovering
dirs. The right read is "duplicate/noise clean at the latest point, capacity
not recovered."

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says the split needs a runtime-gated PR07 decision fork,
`PR02B` remains blocked-validation work after `PR02`, and `PR07B0A-155713` is a
blocked comparison candidate rather than a ready PR. It treats
`20260518T165635Z` as nonzero progress but says it needs a post-`165635` audit
before publish or manifest claims are durable. The latest feedback-action
records the post-`165635` audit as `PASS`, but PR07C owner replay is still not
settled: the same-user group failed with marker-set divergence and late-join
replay was still running in the feedback artifact. Seed `1020002` still blocks
final-stack fuzzing, filing, and rebuilt stack-wide validation; `PR02B`
validation, `PR07` owner replay, and reload-marker/lifecycle replay remain
open.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes across `24` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback rejects treating the
graph-visible browser count as healthy materialization: the latest level-mix
synthesis says to restore useful browser/e2e capacity above the `24`-lane floor
and cap non-browser lanes until fresh unique output justifies expansion. The
level-mix feedback-action reports a backend/API lane with `1000` executions in
its final context and also reports only `18` active browser lanes, still below
the floor. Native-harness evidence reports a rich-text CRDT multiblock
lower-level target as the first ready isolated harness; the latest
protocol-server synthesis keeps HTTP polling REST first as a plan and says no
files were edited.
Collector-visible trend counters still show zero current lower-level rate and
zero protocol/backend/assertion executions. The latest execution-rate bucket has
`0` browser/e2e executions/hour and `3,328` unit-property executions/hour;
coverage-guided-lower-level, transport-integration, backend/API,
protocol-server, and standalone `fuzz-assertion` are at `0` current rate in the
committed counters. The next narrow checks are sustained current-output
duplicate/noise health while browser capacity advances, collector-visible
backend, protocol, or assertion counts, continued lower-level output accounting,
and the `1020002` blocker before any filing or final-stack claim.
