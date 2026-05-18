# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T21:20:50Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage novelty state updated at `2026-05-18T21:14:43Z`
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
  sample `2026-05-18T21:10:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2294` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T21:14:43Z`, coverage files grew from
`272` to `54996`, a delta of `54724`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest live duplicate/noise sample is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest pass has `1` quality issue, `1`
warning, `431.9G` free memory, `no_progress=1`, and `headroom=true`. This
report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3412` and is not the plotted live health signal.

Persona-loop evidence rejects a durable recovery read. The newest
duplicate/noise synthesis file, `20260518T211045Z`, is empty and adds no new
evidence; the latest usable synthesis remains `20260518T205858Z`. It calls this
producer-side scheduler starvation rather than downstream triage/analysis
leakage: restored or one-seed no-product `pre_action_bootstrap_stall`
cooldowns can block every fallback/productive group, leaving
`supervisor-groups.json`, enabled groups, and current run dirs empty. The
paired latest non-empty feedback action remains `20260518T203635Z`:
product-evidence duplicate-family holds and no-analysis sentinels were added
across novelty scheduling and analysis admission, but it also reports the
active root has `enabledGroups=[]`, `currentRunDirs=[]`, and
`supervisor-groups.json=[]`. Current-output duplicate/noise is clean in the
latest plotted sample, but durable browser recovery is not proven until a
bounded producer canary materializes useful current output.

The PR-split persona loop still rejects filing. The latest synthesis,
`20260518T204719Z`, keeps the parallel-lane replacement split and rejects the
old linear `PR07 -> PR17 -> PR18/PR18x` tail. It now treats
`PR07B0B-195150` and corrected `PR07B0C-201201` as sibling decision-fork arms
on `PR07B0`; neither is fileable. The latest collected feedback action,
`20260518T204719Z`, applied that split update, generated a passing PR07B0C
audit bundle, kept raw `203210` out after restack conflicts, and patched loop
hardening. It still defers actual PR07 B0B/B0C replay/adjudication, PR02B
validation, final-stack fuzzing, GitHub filing, and raw PR07D/PR17/PR18/PR18x
promotion.

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
The top facet shows continued coverage-file growth to `54996` files. Dense
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
startup failures `0`, quality issue count `1`, warning count `1`, free memory
`431.9G`, `no_progress=1`, and `headroom=true`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state has run-local noise policy version `32`, no
enabled groups, no active current-run dirs, and zero active-current triage
roots/signatures. The latest duplicate/noise synthesis file is empty; the
latest usable synthesis says the remaining control-plane bug is producer
starvation from restored or one-seed no-product startup cooldowns. The latest
non-empty feedback action says product-evidence duplicate-family holds and
no-analysis sentinels were patched, but also reports the active producer set is
empty. The clean plotted point is therefore a live-health sample, not proof of
sustained useful browser materialization.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T21:10:00Z` show bursty CPU and load.
The latest 25 CPU samples range from `56.62%` to `80.83%` utilization, with the
latest sample at `57.31%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `9` windows, five-minute load in `14`, 15-minute
load in `13`, and at least one load window exceeded it in `15`. The newest
1/5/15-minute load sample is `59.22`, `45.98`, and `54.99`; all three windows
are below the logical CPU count, with `3` blocked tasks in the latest sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has run-local noise policy version `32`, no current enabled
groups, no active current-run dirs, and zero active-current triage-yield
roots/signatures.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `27` browser/e2e lanes across `24` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is still concentrated in browser/e2e lanes:
`27` of the latest `29` graph-visible lanes are browser/e2e. Lower-level work is
active but narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters.

Persona-loop evidence adds important caveats. The newest level-mix synthesis,
`20260518T210720Z`, rejects lower-level expansion and calls for browser/e2e
materialization first. It says lane accounting must distinguish configured
lanes, tmux presence, and useful active run dirs; that rejects a simple "27
browser lanes means healthy" interpretation. Its live checks saw only `9-17`
active browser dirs versus the `24` floor, with coverage-guided browser as the
main hole: `supervisor-groups.json=[]`, `supervisor-state.groups=[]`, and
`activeRunDirs=0`. The current concrete recommendation is to fix empty-group
telemetry/materialization, then restart one bounded coverage-guided browser
canary; do not add lower-level lanes now.

The latest native synthesis identifies
`coverage-guided-lower-level-rich-text-multiblock` as the first ready isolated
V8/Node coverage-guided lower-level target, with parser/serialization second
and table/query-array CRDT third. The latest protocol-server synthesis,
`20260518T210301Z`, identifies a seeded PHPUnit protocol/server harness for
`POST /wp-sync/v1/updates` as the first protocol target and rejects the
WebSocket relay as the first target because it lacks auth and persistence. Its
paired action reports a bounded 2-seed by 20-case validation passed and that
protocol events/supervisor accounting are emitted, but the committed trend
counters still show `0` protocol-server executions. The latest fuzz-only
assertion apply file reports core-data assertion work and browser loop
restarts, but this is not a standalone `fuzz-assertion` lane in the committed
counters. These persona-loop outputs are evidence for planned or narrowly
validated work, but they have not moved the committed backend/API,
protocol-server, or standalone assertion trend counters above zero.

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

The latest collected execution data has about `5,909,707` completed test
executions: `254,174` browser/e2e, `3,006` transport/integration, `5,204,704`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `1,932` browser/e2e executions/hour and `5,376`
unit-property executions/hour, with `0` current rate for
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

On that triage-output metric, browser/e2e currently dominates: `774` unique
likely-real findings over about `2,497.4` runner-hours, or `30.99` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,123` candidates
over `2,497.4` runner-hours (`245.18` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `47.9` runner-hours
(`10.43` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `9166.9` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1497.6` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4065 | 163 | 0 | 4.0% |
| `revision-persistence` | 6786 | 289 | 0 | 4.3% |
| `parser-serialization` | 4089 | 253 | 0 | 6.2% |
| `real-user-editing` | 8957 | 613 | 0 | 6.8% |
| `common-blocks` | 4863 | 502 | 0 | 10.3% |
| `parser-transform` | 5326 | 564 | 0 | 10.6% |
| `long-session-large-doc` | 4063 | 596 | 0 | 14.7% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7219 | 1340 | 0 | 18.6% |
| `session-lifecycle` | 9547 | 2743 | 0 | 28.7% |
| `media-cross-entity` | 522 | 163 | 0 | 31.2% |
| `three-user-late-join` | 11628 | 3933 | 0 | 33.8% |
| `persistence-no-title` | 4051 | 1473 | 0 | 36.4% |

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
the collected graph data is `20260518T204719Z`; it took `10.0` minutes. The
loop then started feedback after cycle `394` at `2026-05-18T20:57:19Z`.

The latest persona synthesis, `20260518T204719Z`, rejects a filing-ready
interpretation. It keeps the parallel-lane replacement, adds corrected
`PR07B0C-201201` beside `PR07B0B-195150` as a PR07B0 decision fork, and says
neither arm is fileable. PR07 B0B/B0C owner replay, PR02B validation, and loop
hardening are the bounded next jobs; broad final-stack fuzzing, raw deferred
promotion, stale progress-controller manifest rows, and GitHub filing remain
blocked. The matching cycle `394` feedback file is present in this input set:
it updated `current-pr-split.md`, generated a passing PR07B0C audit bundle,
kept `203210` out after restack conflicts, and patched loop hardening. It did
not complete the actual PR07 replay/adjudication or PR02B validation evidence
needed for filing.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T21:04:45Z`, has `10`
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
duplicate share is `0`. The latest full health sample has `headroom=true`,
quality issues `1`, warnings `1`, `no_progress=1`, and `431.9G` free memory.
Historical aggregate duplicate/noise is not the live health signal, and the
latest load sample is below core count on all three windows.

The duplicate/noise persona loop rejects converting that clean point into a
durable recovery claim. The newest duplicate/noise synthesis file is empty, and
the latest usable synthesis names producer starvation from restored or
single-seed no-product startup cooldowns, not a remaining downstream triage
leak. The feedback action says the family-cap/no-analysis guards were patched,
but the copied current novelty state and feedback both show no enabled groups,
no active current-run dirs, and no active supervisor groups. The right read is
"latest plotted duplicate/noise point clean, duplicate-family relaunch guard
patched, useful current browser materialization still not proved."

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis, `20260518T204719Z`, keeps the parallel-lane replacement shape
and makes `PR07B0B-195150` plus corrected `PR07B0C-201201` sibling
decision-fork arms, not fileable PRs. PR07 B0B/B0C owner replay, PR02B
validation, and final-stack evidence remain open before any PR07 promotion or
final-stack claim. Cycle `394` feedback is now present and useful for split
bookkeeping and loop hardening, but it produced only prompts/plans for actual
PR07 replay and PR02B validation, not filing evidence.

The PR-focused queue/blocker graphs make the current waits explicit. Publication
has plenty of nominally ready rows, but the controller is blocking stack-shaped
publication behind PR07C owner proof, PR07B/PR14 repair, duplicate-branch
selection, and diagnostic relaunch cooldowns. The repeated-failure graphs show
where validation work is cycling without new product evidence: deferred
reload/http/pre-save/rich-text heads, PR03B, and pre-oracle PR17/seed-reducer
continuations.

The committed fuzzing graph is browser/e2e-heavy: `27` current browser/e2e
lanes across `24` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The level-mix persona loop rejects using
that graph count as a healthy-capacity claim: its live checks saw only `9-17`
active browser dirs, with coverage-guided browser still empty. Browser/e2e
materialization comes before lower-level expansion. Lower-level work is real
but narrow: the
latest native synthesis identifies the rich-text multiblock lower-level target
as ready, while the latest protocol synthesis identifies the HTTP polling REST
state-machine harness as the first protocol/server target and reports a bounded
validation pass. Fuzz-only assertion work is active as browser/core-data
assertion deployment, not as a standalone `fuzz-assertion` lane. Backend/API,
protocol-server, and standalone assertion counters are still zero in the
committed graph data. The next narrow checks are sustained current-output
duplicate/noise health with useful browser materialization, collector-visible
backend/protocol/assertion execution counts, continued lower-level output
accounting, and PR07/`PR02B` closure before any filing or final-stack claim.
