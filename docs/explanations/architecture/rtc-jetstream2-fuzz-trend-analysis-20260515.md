# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T20:36:57Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state started at `2026-05-18T20:32:49Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- PR-focused controller, critical-path executor, artifact index, and local
  publisher snapshots:
  `/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/`,
  `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/`,
  `/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518/`, and
  `/tmp/rtc-local-pr-branch-publisher-20260517/`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T20:30:02Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2290` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T20:33:38Z`, coverage files grew from
`272` to `54890`, a delta of `54618`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest live duplicate/noise sample is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest pass has `0` quality issues, `0`
warnings, `404.2G` free memory, `no_progress=1`, and `headroom=false`. This
report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3414` and is not the plotted live health signal.

Persona-loop evidence rejects a durable recovery read. The newest
duplicate/noise synthesis file, `20260518T202122Z`, is empty; the latest
non-empty synthesis, `20260518T195055Z`, identifies a producer-side
scheduler escape hatch: the empty-materialization canary can relaunch groups
already under no-product `pre_action_bootstrap_stall` startup-noise cooldown.
The paired feedback-action installed policy `32`, hard-blocked those no-product
startup cooldowns from the fleet and empty-materialization canary paths, and
restarted the active coverage-guided monitor path. The copied current novelty
state has policy `32`, one enabled group
(`novelty-ws-multi-reload-lifecycle`), one current run dir under
`run-20260518T203240Z`, no current triage-yield sample yet, and null
current-state duplicate/startup fields until the fresh run writes a full sample.
Current-output duplicate/noise is clean in the latest plotted sample, but
durable recovery is not proven by one clean point plus a freshly restarted
current run.

The PR-split persona loop still rejects filing. The latest synthesis,
`20260518T202005Z`, keeps the Cycle378/Cycle386/Cycle390 parallel-lane
replacement split and rejects the old linear `PR07 -> PR17 -> PR18/PR18x`
tail. It adds `PR07B0B-195150` as a runtime-gated PR07 comparison arm, but says
PR02B is still reportless/stopped and PR07 is still setup-blocked. PR02B
reporting, PR07 setup/root-cause repair, PR07B0B audit, and owner replay remain
the filing gates.

The graph-visible controller state is narrower than the PR-split loop. Its
current table has `22` work items: `10` high-priority publishable product
branches, `8` medium-priority ready-product branches needing repair, `1`
runtime-gated PR07C owner-evidence item, and `3` deferred-family rows. The
controller decision queue has `14` allowed rows and `11` blocked rows. The
critical-path queue currently has one queued browser/e2e owner-matrix job, one
queued critical lane, three active analysis sessions, and one active deferred
session. Repeated validation failures are concentrated in
deferred branches and one PR03B branch, while the no-progress ledger is `15`
pre-oracle/preflight-only artifacts for `pr17-1020002` and
`seed-1060015-reducer`.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `4`.
The top facet shows continued coverage-file growth to `54890` files. Dense
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
`404.2G`, `no_progress=1`, and `headroom=false`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state has policy `32`, one enabled group, one current
run dir, no current triage-yield sample yet, and null current-state
duplicate/startup fields until the fresh run writes a full sample. The latest
duplicate/noise synthesis file is empty, so
the latest non-empty synthesis plus feedback-action remain the interpretive
evidence: no-product startup cooldown reuse through canary admission was a
producer-admission failure, and the paired action only just patched and
restarted that path.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T20:30:02Z` show bursty CPU and load.
The latest 25 CPU samples range from `45.39%` to `83.78%` utilization, with the
latest sample at `76.68%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `8` windows, five-minute load in `13`, 15-minute
load in `13`, and at least one load window exceeded it in `15`. The newest
1/5/15-minute load sample is `61.96`, `66.87`, and `67.10`; the five-minute and
15-minute windows are above the logical CPU count, with `4` blocked tasks in the
latest sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has policy `32`, one current enabled group
(`novelty-ws-multi-reload-lifecycle`), and one current run dir including
paused/no-analysis state under `run-20260518T203240Z`, but no current
triage-yield sample yet.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `28` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is still concentrated in browser/e2e lanes:
`28` of the latest `30` graph-visible lanes are browser/e2e. Lower-level work is
active but narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters.

Persona-loop evidence adds important caveats. The newest level-mix synthesis,
`20260518T200121Z`, rejects lower-level expansion and calls for restoring
browser/e2e capacity first while keeping non-browser lanes capped as sentinels.
It also says lane accounting must distinguish configured/running lanes and tmux
presence from useful active run dirs, so it rejects a simple "28 browser lanes
means healthy" read. The latest graph-visible strict-expansion run at
`2026-05-18T20:34:40Z` matches that strict-first recovery direction, but useful
browser capacity still needs active-dir and output validation. The newest native
synthesis file, `20260518T202743Z`, is empty; the latest non-empty native
action, `20260518T201251Z`, adopted and smoked the rich-text multiblock CRDT
coverage-guided lower-level harness while leaving the active table/query-array
lower-level lane running. The latest protocol action, `20260518T202116Z`,
implemented and validated the HTTP polling protocol-server harness with
`4` seeds by `40` cases and wrote protocol-server events, but it left the
current protocol pointer unchanged, so the committed protocol-server counter
remains `0`. Those backend/protocol/native persona actions are real evidence,
as is the latest non-empty fuzz-only assertion action, `20260518T182542Z`; they
have not moved the committed backend/API, protocol-server, or standalone
assertion trend counters above zero.

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

The latest collected execution data has about `5,893,087` completed test
executions: `249,362` browser/e2e, `3,006` transport/integration, `5,192,896`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `3,368` browser/e2e executions/hour and `6,400`
unit-property executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend/API,
protocol, and assertion work. The protocol action validated event output but
left the current protocol pointer unchanged, and the committed graph data does
not yet show backend/API, protocol-server, or standalone assertion rows above
zero.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `773` unique
likely-real findings over about `2,486.7` runner-hours, or `31.09` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,117` candidates
over `2,486.7` runner-hours (`245.99` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `47.2` runner-hours
(`10.59` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `9013.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1520.7` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4049 | 163 | 0 | 4.0% |
| `revision-persistence` | 6763 | 289 | 0 | 4.3% |
| `parser-serialization` | 4081 | 253 | 0 | 6.2% |
| `real-user-editing` | 8939 | 613 | 0 | 6.9% |
| `common-blocks` | 4856 | 502 | 0 | 10.3% |
| `parser-transform` | 5317 | 564 | 0 | 10.6% |
| `long-session-large-doc` | 4030 | 596 | 0 | 14.8% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7212 | 1340 | 0 | 18.6% |
| `session-lifecycle` | 9534 | 2743 | 0 | 28.8% |
| `media-cross-entity` | 522 | 163 | 0 | 31.2% |
| `three-user-late-join` | 11600 | 3933 | 0 | 33.9% |
| `persistence-no-title` | 4037 | 1461 | 0 | 36.2% |

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
the collected graph data is `20260518T202005Z`; it took `9.3` minutes. The
loop then started feedback action after cycle `392` at `2026-05-18T20:29:21Z`.

The latest persona synthesis, `20260518T202005Z`, rejects a filing-ready
interpretation. It keeps the Cycle378/Cycle386/Cycle390 parallel-lane
replacement, adds `PR07B0B-195150` only as a runtime-gated PR07 comparison arm,
and keeps PR02B report generation, PR07 setup repair, PR07B0B audit, and owner
replay as gates. Broad final-stack fuzzing, raw deferred promotion, and GitHub
filing remain blocked.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T20:27:57Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

The controller's current progress table has `22` distinct work items. The
product-PR side is split between `10` high-priority publishable branches and
`8` medium-priority branches that still need repair before publication. The
remaining high-priority runtime-gated row is `PR07C/HOLD-07C` owner evidence.
Deferred-family rows are still tracked, including an active reload-hydration
row.

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

The graph remains positive on coverage intake and goal reduction, but the run
is not durable. The latest live health point is clean on the correct
current-output-dir metrics: startup failures are `0` and current-output
duplicate share is `0`. The latest full health sample has `headroom=false`,
quality issues `0`, warnings `0`, `no_progress=1`, and `404.2G` free memory.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting that clean point into a
durable recovery claim. The newest duplicate/noise synthesis file is empty; the
latest non-empty synthesis still names no-product startup cooldown reuse through
empty-materialization canary admission as the producer-admission failure mode.
The copied current novelty state shows policy `32`, one enabled group, one
current run dir, no current triage-yield sample yet, and null current-state
duplicate/startup fields until the fresh run writes a full sample. The paired
action patched and restarted that path. The right read is "latest plotted
duplicate/noise point clean,
scheduler patch freshly applied, durability still not proved."

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis keeps the Cycle378/Cycle386/Cycle390 parallel-lane replacement
shape, adds `PR07B0B-195150` only as a runtime-gated comparison arm, and says
PR02B reporting, PR07 setup repair, PR07B0B audit, and owner replay remain
open. Old blocker-row waiting is not progress while those gates remain open.

The PR-focused queue/blocker graphs make the current waits explicit. Publication
has plenty of nominally ready rows, but the controller is blocking stack-shaped
publication behind PR07C owner proof, PR07B/PR14 repair, duplicate-branch
selection, and diagnostic relaunch cooldowns. The repeated-failure graphs show
where validation work is cycling without new product evidence: deferred
reload/http/pre-save/rich-text heads, PR03B, and pre-oracle PR17/seed-reducer
continuations.

The committed fuzzing graph is browser/e2e-heavy: `28` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The level-mix persona loop rejects using
that lane count as a healthy-capacity claim and says browser/e2e recovery comes
before lower-level expansion. Persona-loop evidence shows backend/API,
protocol-server, native/lower-level, and fuzz-only assertion work happened. The
latest protocol action even emitted protocol-server events in validation, but
the backend/API, protocol-server, and standalone assertion counters are still
zero in the committed graph data. The next narrow checks are sustained
current-output duplicate/noise health while useful browser capacity advances,
collector-visible backend/protocol/assertion execution counts, continued
lower-level output accounting, and PR07/`PR02B` closure before any filing or
final-stack claim.
