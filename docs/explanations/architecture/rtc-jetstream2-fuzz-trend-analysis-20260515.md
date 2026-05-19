# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T00:07:54Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage novelty state updated at `2026-05-19T00:04:13Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- PR-focused controller, critical-path executor, artifact index, and local
  publisher snapshots:
  `/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/`,
  `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/`,
  `/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518/`, and
  `/tmp/rtc-local-pr-branch-publisher-20260517/`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sysstat
  sample `2026-05-18T23:50:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2308` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-19T00:04:13Z`, coverage files grew from
`272` to `55460`, a delta of `55188`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest live duplicate/noise sample is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest pass has `0` quality issues,
`0` warnings, `421.8G` free memory,
`no_progress=5`, and `headroom=false`. This
report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3409` and is not the plotted live health signal.

Persona-loop evidence still rejects a durable recovery read. The newest
duplicate/noise synthesis, `20260518T234438Z`, says the old strict no-product
`pre_action_bootstrap_stall` leak is mostly fixed in the normal pipeline, but
the active leak is product-evidence duplicate handling:
`novelty-http-persistence-probe` is still consuming producer/browser capacity on
current-run `timeout` signatures that are already non-actionable and
family-capped with zero visible likely-real failures. It recommends a narrow
represented product-evidence family hold that preserves one analyzable
representative and does not globally suppress `timeout` or product-evidence
signatures. The latest duplicate/noise feedback action file remains
`20260518T231214Z`; it applied the previous bounded control-plane fix and
restarted the novelty and live-analysis monitors. The refreshed graph health
point has `duplicateShareCurrent=0` and no current summary startup failures, but
the latest synthesis rejects treating that as sustained useful browser
materialization while represented product-evidence duplicate families can still
consume capacity.

The PR-split persona loop still rejects filing. The latest synthesis,
`20260518T235127Z`, keeps the Cycle406 replacement split as the active shape
but says PR07, strict `117126135e5e`, `PR02B`, and final-stack validation are
not clear. Ready/local remains through `PR06D` plus `PR02A`/`PR06E`, CRDT
remains through `PR15D`, PR07 is only a non-fileable runtime-gated owner queue,
and old linear `PR07`/`PR17`/`PR18`/`PR18x` stay rejected. Raw
reload-hydration `233340` is new evidence, but the synthesis rejects it as a
pushable/product manifest until it is audited onto clean PR07 bases. The latest
feedback action remains `20260518T232725Z`; it launched shared collaboration
readiness repair and progress-gate hardening, but kept filing, broad
final-stack fuzzing, PR07 arms, `PR02B`, diagnostics, raw deferred heads,
`PR17`, `PR18`, and `PR18x` blocked.

The graph-visible controller state is narrower than the PR-split loop. Its
current table has `24` rows covering `22` distinct work items: `10`
high-priority publishable product branches, `8` medium-priority ready-product
branches needing repair, `1` runtime-gated PR07C owner-evidence item, and `3`
deduped deferred-family items. The controller decision queue has `14` allowed
rows and `11` blocked rows. The
critical-path queue currently has one queued browser/e2e owner-matrix job, one
queued critical lane, three active analysis sessions, and one active deferred
session. Repeated validation failures are concentrated in
deferred branches and one PR03B branch, while the no-progress ledger is `15`
pre-oracle/preflight-only artifacts for `pr17-1020002` and
`seed-1060015-reducer`.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `4`.
The top facet shows continued coverage-file growth to `55460` files. Dense
monitor-pass points are intentionally small and partially transparent so
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
`421.8G`, `no_progress=5`, and `headroom=false`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state has run-local noise policy version `35`, one
active current-run dir from `supervisor-active-run-dirs`, enabled
`novelty-http-persistence-probe`, no current summary startup failures, no
current startup evidence keys, and two raw product-evidence timeout signatures
that are family-capped and not visible as likely-real. The latest
duplicate/noise synthesis says strict no-product startup noise is mostly fixed
in the normal path, but represented product-evidence duplicate families still
need to become producer holds once a current representative exists. The latest
feedback action applied the previous bounded control-plane fix and restarted the
affected novelty/live-analysis monitors. The graph point is startup-clean and
duplicate-clean on the current-output metric, but the feedback still rejects
treating one clean point as sustained useful browser materialization.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T23:50:00Z` show bursty CPU and load.
The latest 25 CPU samples range from `57.31%` to `89.75%` utilization, with the
latest sample at `85.51%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `13` windows, five-minute load in `14`,
15-minute load in `12`, and at least one load window exceeded it in `16`. The
newest 1/5/15-minute load sample is `87.35`, `80.73`, and `77.43`; all three
load windows are above the logical CPU count. The latest sample has `9` blocked
tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has run-local noise policy version `35`, enabled
`novelty-http-persistence-probe`, one active current-run dir from
`supervisor-active-run-dirs`, no current summary startup failures, no current
startup evidence keys, and current duplicate share `0`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `41` browser/e2e lanes across `38` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is still concentrated in browser/e2e lanes:
`41` of the latest `43` graph-visible lanes are browser/e2e. Lower-level work is
active but narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters.

Persona-loop evidence adds important caveats. The newest level-mix synthesis,
`20260518T234745Z`, says not to add lower-level lanes: keep `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` capped at one-lane sentinel budgets, protect/restore the
browser/e2e floor, and fix controller/accounting drift before trusting mix
decisions. It reports browser/e2e nominally at the 24-lane floor but flags stale
strict/gap state and optional-browser shedding under severe pressure. The latest
level-mix feedback action file, `20260518T232500Z`, made
control-plane/accounting fixes: startup-stall recovery now honors explicit
recover mode, the autoscaler will not shed optional browser capacity at or below
the 24-lane floor, and telemetry reconciliation reported clean after
regeneration. This supports the graph's browser/e2e concentration while
rejecting configured lane count as proof of useful capacity or as a reason to
add lower-level lanes.

The newest native-harness synthesis, `20260518T234847Z`, still selects the
rich-text CRDT multiblock target as the first ready isolated V8/Node
coverage-guided lower-level harness and explicitly rejects describing it as a
C/C++ AFL/libFuzzer harness. The matching action reports a passing smoke with
root/lane `coverage-guided-lower-level` events, but it did not start a duplicate
continuous rich-text lane because that hold is active. The newest
protocol-server synthesis, `20260518T234942Z`, keeps the HTTP polling REST
server harness around `POST /wp-sync/v1/updates`; the matching action reports a
passing one-seed tmux smoke and collector-style root/lane
`fuzzLevel: "protocol-server"` events. The committed trend counters still show
`0` protocol-server executions, so collector-visible protocol trend data has not
caught up. The latest fuzz-only assertion apply file, `20260518T225934Z`, is
empty; the latest substantive apply report, `20260518T212727Z`, added
marker-preservation assertions and restarted browser loops, but this is not a
standalone `fuzz-assertion` lane in the committed counters. These persona-loop
outputs are evidence for active or narrowly validated lower-level, backend/API,
protocol-server, and assertion work, but they have not moved the committed
backend/API, protocol-server, or standalone assertion trend counters above zero.

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

The latest collected execution data has about `5,979,101` completed test
executions: `280,208` browser/e2e, `3,006` transport/integration, `5,248,064`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `5,832` browser/e2e executions/hour and
`6,144` unit-property executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend/API,
protocol, and assertion work. The committed graph data does not yet show
backend/API, protocol-server, or standalone assertion rows above zero.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `778` unique
likely-real findings over about `2,550.3` runner-hours, or `30.51` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,144` candidates
over `2,550.3` runner-hours (`240.92` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `50.7` runner-hours
(`9.87` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e still supplies nearly all
triaged likely-real output. Lower-level and transport lanes should continue to
be judged partly by the unique-output candidate graphs until their triage
pipeline is producing comparable likely-real and non-duplicate results.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `9991.5` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1416.8` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4092 | 163 | 0 | 4.0% |
| `revision-persistence` | 6852 | 289 | 0 | 4.2% |
| `parser-serialization` | 4129 | 255 | 0 | 6.2% |
| `real-user-editing` | 9032 | 613 | 0 | 6.8% |
| `common-blocks` | 4890 | 502 | 0 | 10.3% |
| `parser-transform` | 5382 | 578 | 0 | 10.7% |
| `long-session-large-doc` | 4141 | 596 | 0 | 14.4% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7261 | 1348 | 0 | 18.6% |
| `session-lifecycle` | 9587 | 2743 | 0 | 28.6% |
| `media-cross-entity` | 529 | 164 | 0 | 31.0% |
| `three-user-late-join` | 11699 | 3933 | 0 | 33.6% |
| `persistence-no-title` | 4169 | 1570 | 1 | 37.7% |

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
action-pair, block-depth, block, action, other, transport, collaborator,
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

With the live loop at `max_parallel=6`, the newest completed review cycle in
the collected graph data is `20260518T235127Z`; it took `12.55` minutes. The
loop then started feedback action after cycle `408` at `2026-05-19T00:04:00Z`.

The latest persona synthesis, `20260518T235127Z`, rejects a filing-ready
interpretation. It keeps the Cycle406 replacement split as the active shape but
says PR07, strict `117126135e5e`, `PR02B`, and final-stack validation are not
clear. Ready/local stays through `PR06D` plus `PR02A`/`PR06E`, CRDT stays
through `PR15D`, PR07 is a runtime-gated owner queue, and raw `PR07D`, raw
deferred heads, `PR17`, `PR18`, and `PR18x` remain out of the fileable split.
Raw reload-hydration `233340` is only a pending `PR07B0E-233340` audit
candidate until it is restacked and compared against clean PR07 bases. The
latest feedback action, `20260518T232725Z`, applied progress-gate hardening and
launched shared collaboration readiness repair, but it keeps filing, broad
final-stack fuzzing, PR07 arms, `PR02B`, diagnostics, raw deferred heads,
`PR17`, `PR18`, and `PR18x` blocked.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T23:53:23Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

The controller's current progress table has `24` rows covering `22` distinct
work items. The product-PR side is split between `10` high-priority publishable
branches and `8` medium-priority branches that still need repair before
publication. The remaining high-priority runtime-gated row is `PR07C/HOLD-07C`
owner evidence. The plotted state counts dedupe the deferred-family rows to
`1` high-priority product-decision item, `1` medium-priority diagnostic item,
and `1` low-priority cooldown item.

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The queue-depth graph combines the PR progress table, current controller
decisions, critical blockers, critical job queue, critical lanes, and active
PR-related sessions. The live shape is `10` publishable PR items, `8`
needs-repair items, `1` PR07C owner-evidence item, `14` allowed controller
decisions, `11` blocked controller decisions, `1` queued critical job, `1`
queued critical lane, `3` active analysis sessions, and `1` active deferred
session.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

The event plot now comes from the controller's `events.ndjson` feed when the
older log file is absent. This snapshot shows `5` persona-control rounds and no
fresh heavy-job deferral events in that stream.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current controller push manifest has `10` publishable branches totaling
`1,387` net LOC. The largest net additions are `PR07C` reload record snapshots
(`316` net LOC), the larger `PR06B` malformed-save-payload branch (`291`), and
the minimal `PR06B` sibling (`268`). Two fallback-group branches are net
negative because they remove more prior fallback code than they add.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The shared artifact index is graph-visible. This snapshot has `2,712` indexed
artifacts across critical-path, deferred, finalization, PR-split, and
PR-progress trees. The largest artifact classes are critical-path reports
(`861`), deferred reports (`449`), deferred push manifests (`334`), PR-split
reports (`271`), and finalization reports (`208`).

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

The critical-path executor currently has `5` blockers: `1` active, `1` queued,
and `3` terminal. The active row is `reload-hydration`; the queued row is
`PR07C/HOLD-07C` owner evidence. Terminal rows reopen only with fresh
product-owned evidence.

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

The blocked-decision graph shows the work the controller is deliberately
holding. The blocked rows are mostly high-priority publication gates: duplicate
PR06B sibling publication, PR07C owner/base gating, PR14 base repair, and PR15
stack selection. Diagnostic relaunches are also blocked for repeated
reload-hydration, pre-save-search-live-collapse, rich-text-suffix-corruption,
and old PR17/seed-reducer continuation artifacts.

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

The repeated-validation graph is the current way to see validation churn. The
largest repeated failures are deferred `http-room-isolation`,
`pre-save-search-live-collapse`, multiple `reload-hydration` heads, and
`rich-text-suffix-corruption`, each with `28` failed diff-check attempts in the
current audit. `ready/rtc-pr03b-browser-revision-restore-crdt-invalidation`
has `24` failed attempts.

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The no-progress graph groups artifacts the critical-path loop rejected as not
advancing a blocker. The current ledger has `15` rows: `11` for `pr17-1020002`
and `4` for `seed-1060015-reducer`, all classified as
`pre_oracle_or_preflight_only`.

![Local PR branch publisher activity](rtc-jetstream2-fuzz-trends-20260515/plots/pr-local-publisher-activity.png)

The local publisher graph shows `245` publication snapshots and branch pushes
from the local machine, with the latest snapshot at `2026-05-18T18:59:03Z`. It
consumes the artifact-index manifest-path list before falling back to historical
scans, keeping GitHub publication decoupled from Jetstream's lack of GitHub
access while reducing repeated manifest discovery work.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but the
latest live health point should be read narrowly: startup failures are `0` and
current-output duplicate share is `0`, while `headroom=false`. The latest full
health sample has quality issues `0`, warnings `0`, `no_progress=5`, and
`421.8G` free memory. Historical aggregate duplicate/noise is not the live
health signal. The newest load sample has the one-, five-, and 15-minute
windows above the `64` logical CPU count, with `9` blocked tasks.

The duplicate/noise persona loop rejects converting the startup-clean live point
into a durable recovery claim. The newest duplicate/noise synthesis says the
strict no-product startup-stall leak is mostly fixed in the normal pipeline, but
the current active leak is represented product-evidence duplicate handling:
`novelty-http-persistence-probe` still consumes capacity on current-run
`timeout` signatures that are non-actionable, family-capped, and not visible as
likely-real. The latest copied novelty state has run-local noise policy version
`35`, enabled `novelty-http-persistence-probe`, one active current run dir from
`supervisor-active-run-dirs`, no current summary startup failures, no current
startup evidence keys, current duplicate share `0`, and two raw
product-evidence timeout signatures. The latest feedback action applied the
previous bounded control-plane fix and restarted the affected
novelty/live-analysis monitors, but the newest synthesis still calls for a
narrow represented-product-evidence family hold. Useful current browser capacity
is not yet proved durable.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis, `20260518T235127Z`, keeps the Cycle406 replacement split as
the active shape, but PR07, strict `117126135e5e`, `PR02B`, and final-stack
validation remain blocked. PR07 is still a non-fileable runtime-gated owner
queue, strict has no accepted owner assignment, raw `233340` reload evidence is
only a pending audit candidate, and seed `1020002` blocks final-stack fuzzing
and filing only. The latest feedback action hardened progress-gate handling and
launched shared collaboration readiness repair, but it did not clear filing or
broad final-stack fuzzing.

The PR-focused queue/blocker graphs make the current waits explicit. Publication
has plenty of nominally ready rows, but the controller is blocking stack-shaped
publication behind PR07C owner proof, PR07B/PR14 repair, duplicate-branch
selection, and diagnostic relaunch cooldowns. The repeated-failure graphs show
where validation work is cycling without new product evidence: deferred
reload/http/pre-save/rich-text heads, PR03B, and pre-oracle PR17/seed-reducer
continuations.

The committed fuzzing graph is browser/e2e-heavy: `41` current browser/e2e
lanes across `38` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The level-mix persona loop agrees with
browser/e2e concentration, but it says the action is browser floor protection,
autoscaler/accounting repair, and stale strict/gap state reconciliation, not
lower-level expansion. Keep lower-level, backend/API, protocol-server, and
standalone assertion lanes capped while startup-stall recovery and telemetry
invariants are fixed. Lower-level work is real but narrow in the committed
graph: unit-property and coverage-guided lower-level are active counters;
transport has historical output but no current counted rate; backend/API,
protocol-server, and standalone `fuzz-assertion` execution counters remain zero.
Persona-loop evidence says protocol/server, native lower-level, backend/API, and
assertion work exists. The latest protocol synthesis/action pair keeps and
validates the HTTP polling REST harness with root/lane `protocol-server` events,
the native synthesis/action pair keeps and smoke-validates the rich-text CRDT
multiblock V8/Node lower-level harness, and the latest substantive fuzz-only
assertion action restarted affected browser loops. Those outputs have not yet
moved the committed backend/API, protocol-server, or standalone assertion
counters above zero. The next narrow checks are sustained current-output
duplicate/noise health with useful browser materialization, collector-visible
backend/protocol/assertion execution counts, continued lower-level output
accounting, and PR07/`PR02B` closure before any filing or final-stack claim.
