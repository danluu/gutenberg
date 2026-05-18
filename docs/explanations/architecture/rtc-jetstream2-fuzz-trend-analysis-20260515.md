# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T16:48:37Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T16:40:50Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T16:40:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2274` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T16:40:50Z`, coverage files grew from
`272` to `54190`, a delta of `53918`. The monitor's visible likely-real maximum
reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live duplicate/noise point is no longer clean on the
current-output-dir metric: current summary startup failures are `0`, but
`duplicateShareCurrent=0.5`. The previous ten current-output duplicate-share
samples were clean after the `2026-05-18T14:13:44Z` regression, so the live read
is a renewed duplicate/noise warning rather than a startup-failure relapse. The
latest pass has `0` quality issues, `0` warnings, `409.5G` free memory,
`no_progress=0`, and `headroom=false`. This report uses current-output
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3418` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects a
durable recovery read. The latest duplicate/noise synthesis,
`20260518T162155Z`, says the normal analysis consumers are mostly guarded and
the remaining duplicate/noise loop is producer-side scheduler/control-plane
behavior: no-product `pre_action_bootstrap_stall` noise is detected and drained,
but scheduler feedback can still rotate capacity into fallback groups or block
all browser groups. The latest duplicate/noise feedback-action file is empty;
the latest non-empty feedback-action, `20260518T153904Z`, patched the scheduler
gate so empty materialization rescue is blocked by any current-output
startup-noise hold, restarted the novelty monitor, and validated startup-drain
analysis suppression. The refreshed graph has startup failures still suppressed,
but latest current-output duplicate share has moved back to `0.5`; that supports
the persona-loop rejection of durable recovery.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T163556Z`, says filing and broad final-stack fuzzing
remain blocked and replaces the old PR07 tail with a runtime-gated decision fork
around `PR07B0A-155713`. It keeps ready/local and CRDT lanes usable, keeps
`PR02B` blocked after `PR02`, and rejects raw `PR07D`, raw `deferred/*`, `PR17`,
`PR18`, `PR18x`, reload-hydration publication, and fallback-tail `PR05D` proofs.
The latest feedback-action is still `20260518T160500Z`; it reports a nonzero
`20260518T160619Z` audit with `0` hard failures and `11` warnings plus passing
`PR02B` and reload-marker preflights, but it also rejects filing until
`1020002`, `PR02B`, `PR07`, and reload replay work are resolved or downscoped.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `54190` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0.5`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`409.5G`, `no_progress=0`, and `headroom=false`. Startup failures remain
suppressed, but the latest current-output duplicate share has regressed after ten
clean samples. That makes live health mixed-to-bad despite the clean startup
counter. The health graph does not use historical aggregate duplicate/noise as
the plotted live signal.

The enabled-groups summary field lists only `novelty-ws-media-cross-entity` in the
latest collection, so full current surface state is read from
supervisor/lane snapshots in the level-mix section rather than from the
historical enable log alone. The latest duplicate/noise synthesis rejects
reading startup-failure suppression as full recovery by itself and points to
producer-side startup-noise scheduling: ordinary fallback rotation should stop
under no-product startup-noise saturation, with at most one bounded canary when
all browser groups are held. The latest non-empty feedback-action patched one
scheduler gate and restarted the novelty monitor, but the latest current-output
duplicate share shows that the next check is sustained low current-output
duplicate share while useful fuzzing advances, not whether historical aggregate
duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T16:40:01Z` show bursty CPU. The
latest 25 CPU samples range from `67.16%` to `87.39%` utilization, with the
latest sample at `83.78%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `21` windows, five-minute load in `24`,
15-minute load in `23`, and at least one load window exceeded it in `24`. The
newest 1/5/15-minute load sample is `95.65`, `92.52`, and `89.52`; all three
latest load windows are above the logical CPU count, with `11` blocked tasks in
the prior sample and `7` blocked tasks in the latest sample.

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
contradicts it. The latest level-mix synthesis, `20260518T163442Z`, says not to
change lane counts now: keep browser/e2e protected at `>=24` active dirs and
keep `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and `fuzz-assertion` capped at one lane each. It also says to
treat `fuzz-assertion` as untrusted or zero useful capacity until heartbeat and
state reporting are fixed, and to fail closed on browser-count/status/events
disagreements. The latest level-mix feedback-action remains `20260518T155036Z`
and reports backend/API restored plus browser/e2e, lower-level, protocol/server,
fuzz-assertion, and unit/property active in persona context. The committed graph
still shows only the collector-visible `28` browser/e2e lanes, one
`coverage-guided-lower-level` lane, and one `unit-property` lane, so the right
read is "browser-heavy in the graph with active backend/API, protocol/server,
fuzz-only assertion, unit/property, and coverage-guided lower-level evidence in
persona context", not "safe to rebalance broadly."

The latest native-harness synthesis/action, `20260518T162943Z`, keeps the
rich-text CRDT multiblock harness as the first ready isolated
coverage-guided-lower-level target and labels it as V8 coverage-guided
lower-level fuzzing, not AFL/libFuzzer or C/C++ native fuzzing. It also reports
the table/query-array CRDT lower-level lane left running. The latest
protocol-server synthesis/action keeps the HTTP polling REST endpoint harness
first, through real REST dispatch into `WP_HTTP_Polling_Sync_Server` and
`WP_Sync_Post_Meta_Storage`; validation evidence showed one passing
`fuzzLevel: "protocol-server"` seed with `20` cases. These are active
persona-loop signals, but collector-visible trend counters still show `0`
backend/API, protocol-server, and standalone fuzz-assertion executions.

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

The latest collected execution data has about `5,810,417` completed test
executions: `227,396` browser/e2e, `3,006` transport/integration, `5,132,192`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `516` browser/e2e test executions/hour and
`2,304` unit-property executions/hour, with `0` current rate for
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
likely-real findings over about `2,423.6` runner-hours, or `31.61` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,086` candidates
over `2,423.6` runner-hours (`251.12` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `43.5` runner-hours
(`11.51` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`201`), three-user late join (`126`), real-user
editing (`102`), permissions/auth/locks (`88`), and parser serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`838`),
session lifecycle (`780`), real-user editing (`711`), revision persistence
(`549`), and permissions/auth/locks (`473`), with lower-level lanes showing only
small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `8348.1` for browser/e2e, `4537.5` for transport/integration, `759.3`
for coverage-guided lower-level, and `1652.4` for unit/property.

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
| `multi-reload-lifecycle` | 3990 | 161 | 0 | 4.0% |
| `revision-persistence` | 6595 | 283 | 0 | 4.3% |
| `parser-serialization` | 4023 | 251 | 0 | 6.2% |
| `real-user-editing` | 8753 | 612 | 0 | 7.0% |
| `common-blocks` | 4802 | 500 | 0 | 10.4% |
| `parser-transform` | 5191 | 563 | 0 | 10.8% |
| `long-session-large-doc` | 3905 | 594 | 0 | 15.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7146 | 1339 | 0 | 18.7% |
| `session-lifecycle` | 9447 | 2737 | 0 | 29.0% |
| `media-cross-entity` | 506 | 160 | 0 | 31.6% |
| `three-user-late-join` | 11395 | 3928 | 0 | 34.5% |
| `persistence-no-title` | 3960 | 1402 | 0 | 35.4% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1132 | 2000 |
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
review cycle, `20260518T163556Z`, took `9.7` minutes.

The latest synthesis rejects a filing-ready interpretation. It says the split
is not fileable and should replace the old PR07 tail with a runtime-gated
decision fork centered on `PR07B0A-155713`. `PR02B` stays a blocked-validation
sidecar after `PR02`, and ready/local plus CRDT lanes remain usable. Raw `PR07D`,
raw `deferred/*`, `PR17`, `PR18`, `PR18x`, reload-hydration publication, and
fallback-tail `PR05D` proofs remain rejected or held. The latest feedback-action
is older than the synthesis and reports useful action evidence, but not filing
authority: broad final-stack fuzzing, GitHub filing, and rebuilt stack
validation still remain deferred behind seed `1020002`, unresolved `PR02B`
validation, `PR07` owner replay, reload-marker diagnostics, and newer deferred
reports.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T16:37:04Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but the run
is not yet durable. The latest plotted duplicate/noise sample uses the
current-output-dir metric: startup failures are `0` and current-output
duplicate share is `0.5`. `2026-05-18T14:13:44Z` regressed to duplicate share
`1`, the next run of samples was clean, and the latest point has regressed
again. The latest full health sample has `headroom=false`, quality issues `0`,
warnings `0`, `no_progress=0`, and `409.5G` free memory. The latest sysstat
1/5/15-minute load windows are `95.65`, `92.52`, and `89.52`; all three are
above the `64` logical CPU count, with `7` blocked tasks. Historical aggregate
duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The graph now shows startup failures still
suppressed but latest current-output duplicate share back at `0.5`. The latest
synthesis points specifically at producer/control-plane scheduling: startup
noise can be detected and drained while ordinary fallback rotation or all-group
browser holds still make the producer state wrong. The latest non-empty
feedback-action applied a narrow scheduler fix and restarted the novelty
monitor, but the latest current-output duplicate share already argues against
claiming recovery.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says the split needs a runtime-gated PR07 decision fork,
`PR02B` remains blocked-validation work after `PR02`, and `PR07B0A-155713` is a
blocked comparison candidate rather than a ready PR. The latest feedback-action
reports useful older audit/preflight evidence, but it also rejects filing. Seed
`1020002` still blocks final-stack fuzzing, filing, and rebuilt stack-wide
validation; `PR02B` validation, `PR07` owner replay, reload-marker replay, and
newer deferred reports remain open.

The committed fuzzing graph is still browser/e2e-heavy: `28` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback says to avoid a broad
rebalance: keep browser/e2e at or above `24`, cap backend/API, protocol/server,
unit/property, coverage-guided lower-level, and fuzz-assertion at one lane each,
and fail closed on current-root/status/events disagreements before the next mix
decision. Native-harness evidence reports a validated rich-text CRDT lower-level
harness and an active table/query-array lower-level lane; protocol evidence
reports a bounded validated HTTP polling REST harness with
`fuzzLevel: "protocol-server"` and one passing `20`-case seed. Collector-visible
trend counters still show zero current lower-level rate and zero
protocol/backend/assertion executions. The latest execution-rate bucket has
`516` browser/e2e executions/hour and `2,304` unit-property executions/hour;
coverage-guided-lower-level, transport-integration, backend/API,
protocol-server, and standalone `fuzz-assertion` are at `0` current rate in the
committed counters. The next narrow checks are sustained current-output
duplicate/noise health, collector-visible backend, protocol, or assertion
counts, continued lower-level output accounting, and the `1020002` blocker
before any filing or final-stack claim.
