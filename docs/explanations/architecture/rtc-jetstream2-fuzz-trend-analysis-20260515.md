# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T17:54:49Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  `rtc-jetstream2-fuzz-trends-20260515/raw/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- PR-focused controller, critical-path executor, artifact index, and local
  publisher snapshots:
  `/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/`,
  `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/`,
  `/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518/`, and
  `/tmp/rtc-local-pr-branch-publisher-20260517/`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa19`, latest sysstat
  sample `2026-05-19T17:50:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving after the coverage-guided monitor restart. The
last completed monitor pass is rooted at `run-20260519T174114Z`, and the
repaired passes continue through `2026-05-19T17:51:25Z`. Across `2568` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-19T17:51:25Z`, cumulative
coverage record observations rose from `782` to `257568`. Coverage-file counts
are current-scan counts, not cumulative coverage; the latest current scan is
`3782` files after the latest root rollover. The monitor's visible likely-real
maximum remains `4`.

Coverage-goal pressure is lower than the initial queue but not finished. The
latest copied coverage-guidance state was refreshed at
`2026-05-19T17:51:25Z`; it has `143` total goals and `15` unmet goals
covering real-user save/reload depth, real-user editing completion, reload-post
action depth, UI action depth, CDP coverage tiers, and one gauntlet block tier.

The latest plotted live health sample uses current-output-dir duplicate/noise
and monitor-pass summary startup failures: `duplicateShareCurrent=0`,
current summary startup failures `0`, quality issues `0`, warnings `0`,
`no_progress=0`, and `411.4G` free memory. The latest monitor pass has
`headroom=true`. The newest one-, five-, and 15-minute loads are below the `64`
logical CPU count, though recent load still exceeded the CPU count in `17` of
the latest `25` windows. The newest sample has `3` blocked
tasks, so the current-output sample should not be read as a capacity claim.
Historical aggregate duplicate/noise is context only; its latest duplicate
share is `0.1429` but is not the plotted live health signal.

The copied novelty state has advanced to `run-20260519T174114Z` with enabled
`novelty-ws-parser-serialization` and `novelty-ws-block-gauntlet`, `4` paused
groups, `2` active current run dirs, empty current summary startup-failure maps,
and no active current-run records yet. The active current-run triage view is
empty: `0` roots, `0` files, `0` signatures, `0` summary strict startup
failures, and `0` startup/bootstrap stalls. The paused/no-analysis-inclusive
current-output view sees `2` roots, `2` files, `2` raw signatures, `1`
actionable product-evidence signature, `11` summary product-evidence records,
and `2` suppressed summary strict-startup failures. The plotted current
duplicate share is `0`, while the paused-inclusive view is capped around one
`collaboration_non_convergence` product-evidence family plus one no-product
startup-noise hold. The external-live view still sees one root, `10` files,
`94` signatures, and `55` merged likely-real signatures, with `5409` bootstrap
stalls and `2706` known `pre_action_bootstrap_stall` noise signatures.

Persona-loop evidence rejects several graph-only interpretations. The newest
duplicate/noise synthesis, `20260519T173654Z`, still calls the problem a
control-plane leak around `pre_action_bootstrap_stall` startup-noise state:
downstream triage mostly suppresses strict no-product startup stalls, but
novelty/supervisor scheduling can still refill capacity with retry/canary/rescue
producers or let historical startup pauses over-block the fleet. Its feedback
action file is empty, so the graph should be read as startup-noise improvement
with scoped producer holds still needing validation, not as durable proof that
producer selection is stable under load.

The PR-split persona loop rejects filing from the graph alone. The latest
synthesis, `20260519T082842Z`, keeps the ready main/CRDT split through `PR15C`
and keeps `PR16-RLH@0788a6e3713` as blocked, non-fileable
`RLH-6000007-candidate`. Cycle444 produced a fresh nonzero manifest/audit for
that clean candidate, but replay still stopped before the
`createPersistedCRDTDoc()` persistence parity oracle, so owner remains
undetermined. The latest feedback action, `20260519T082842Z`, kept the
candidate blocked and launched exactly one bounded strict `6000007`
head-reproduction repair. The strict owner gap remains open, so the graph still
does not justify raw reload/PR07D publication, PR16 filing, or broad final-stack
fuzzing.

The graph-visible fuzzing mix remains browser/e2e-heavy. The latest mix shows
`28` browser/e2e lanes across `19` groups, plus `1` `unit-property` lane and
`1` `coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260519T173717Z`, rejects lower-level expansion and treats the next action as
an e2e floor repair only: its binding signal is `browser-e2e=15 < 24`, with
persona live checks seeing `14-15` PID-backed lanes and admission blocked by
`high_pressure`. It says to keep `unit-property=1`,
`coverage-guided-lower-level=1`, `backend-api=1`, `protocol-server=1`, and
held/stale `fuzz-assertion=0` useful; after admission passes, backfill focused
browser/e2e with async-server coverage rather than adding lower-level capacity.
The latest non-empty feedback action, `20260519T163626Z`, kept lower-level
capacity capped, patched the focused browser lane path, and attempted to
relaunch `async-server-a`; it says no new lower-level lane should appear and the
focused launcher still needs live validation after a duplicate-plugin-mount fix.

Native/protocol persona evidence shows lower-level work exists and that some of
it is graph-visible. The latest native-harness synthesis,
`20260519T173809Z`, keeps
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated coverage-guided lower-level harness; its latest action file is empty.
The latest protocol-server synthesis, `20260519T174014Z`, keeps `POST
/wp-sync/v1/updates` as the first protocol-server target through real REST
dispatch and durable `WP_Sync_Post_Meta_Storage`. The latest non-empty protocol
action, `20260519T172622Z`, says the harness was implemented and a one-seed
smoke passed with `20` protocol/server test executions while leaving
`current-run-root.txt` unchanged, so it does not add committed graph-counted
execution evidence.
The committed `backend-api`, `protocol-server`, and standalone `fuzz-assertion`
graph counters still remain at `0`, so these persona outputs contradict a
graph-only "no work exists" read without yet moving those committed
execution/output metrics.

The graph-visible controller state is narrower than the PR-split loop. Its
current table has `24` rows covering `22` distinct work items: `10`
high-priority publishable product branches, `8` medium-priority ready-product
branches needing repair, `1` runtime-gated PR07C owner-evidence item, and `3`
deduped deferred-family items. The controller decision queue has `14` allowed
rows and `11` blocked rows. The critical-path queue currently has one queued
browser/e2e owner-matrix job, one queued critical lane, three active analysis
sessions, and one active deferred session.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `15`
after the latest auto-ratchet added deeper tiers.
The top facet shows cumulative coverage record observations increasing to
`257568`; coverage-file counts are tracked separately and reset when the active
output root rolls. The latest current-output sample is `3782` files from
`run-20260519T174114Z`. Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a
misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The health graph uses current-output-dir duplicate/noise and monitor-pass
summary startup failures for live status. The latest plotted sample has
`duplicateShareCurrent=0`, current summary startup failures `0`, quality
issues `0`, warnings `0`, `no_progress=0`, `411.4G` free memory, and
`headroom=true`.
Historical aggregate duplicate/noise is not the plotted live health signal.

The copied current novelty state has two enabled groups, `4` paused groups, `2`
active current run dirs, empty current summary startup-failure maps, and no
active current-run records yet. The active current-run triage view is empty. The
paused/no-analysis-inclusive current-output view sees `2` roots, `2` files,
`2` raw signatures, `1` actionable product-evidence signature, `11` summary
product-evidence records, `2` suppressed summary strict-startup failures, and
`0` startup/bootstrap stalls. The plotted current duplicate share is `0`; the
paused-inclusive view is still controlled by one capped product-evidence family
and one no-product startup-noise hold.
The external-live triage view sees one root, `10` files, `94` signatures, `55`
merged likely-real signatures, `5409` bootstrap stalls, and `2706` known
`pre_action_bootstrap_stall` noise signatures. Current-output startup noise is
quiet in the plotted live metric, while the paused-inclusive suppressed-startup
records and producer holds still need live-load scrutiny.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T17:50:01Z` show bursty CPU and load.
The latest 25 CPU samples range from `69.11%` to `82.46%` utilization, with the
latest sample at `74.55%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `13` windows, five-minute load in `13`,
15-minute load in `13`, and at least one load window exceeded it in `17`. The
newest 1/5/15-minute load sample is `63.57`, `61.09`, and `60.93`; all three
are below the `64` logical CPU count. The newest sample has `3` blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone. The latest copied
state has enabled `novelty-ws-parser-serialization` and
`novelty-ws-block-gauntlet`, `4` paused groups, empty current summary
startup-failure maps, `2` active current run dirs, and plotted current duplicate
share `0`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `28` browser/e2e lanes across `19` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is concentrated in browser/e2e lanes: `28` of the
latest `30` graph-visible lanes are browser/e2e. Lower-level work is active but
narrow: one `unit-property` lane and one `coverage-guided-lower-level` lane.
`transport-integration` has historical execution/output data but no current
counted rate. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` in the committed graph counters.

Persona-loop evidence adds caveats. The latest level-mix synthesis,
`20260519T173717Z`, says the intended mix should change only toward useful
browser/e2e capacity and only as an e2e floor repair. Its binding signal is
`browser-e2e=15 < 24`, with persona live checks seeing `14-15` PID-backed lanes
and admission blocked by `high_pressure`. It rejects lower-level expansion,
keeps stale/held `fuzz-assertion` at `0` useful, and says configured/supervisor
lane counts must not replace the PID-backed e2e floor signal. When admission
passes, it prefers preserving `async-server-a` and adding `async-server-b`
rather than compensating with backend/protocol/unit/property expansion. The
latest non-empty feedback action, `20260519T163626Z`, kept lower-level capacity
capped, repaired focused browser startup/port/plugin-mount handling, and
attempted the `async-server-a` canary. This rejects both a graph-only "add
lower-level capacity now" interpretation and a graph-only "`28` browser/e2e
lanes means healthy useful capacity" interpretation.

Native/protocol actions show useful work beyond what all committed counters can
currently show. The latest native synthesis, `20260519T173809Z`, keeps the
block parser/serialization coverage-guided lower-level target as the first ready
isolated harness, even though the committed level-mix row is still only a single
lower-level lane and the latest committed rate is `0`. The latest
protocol-server synthesis, `20260519T174014Z`, keeps `POST /wp-sync/v1/updates`
as the first target through real REST dispatch and durable post-meta storage.
The latest non-empty protocol action, `20260519T172622Z`, says the harness is
implemented and a one-seed smoke emitted `20` passing protocol/server test
executions, but the smoke left `current-run-root.txt` unchanged and still adds
no committed graph-counted execution evidence. The latest fuzz-only assertion
action, `20260519T034502Z`,
added two gated browser/e2e assertions and restarted affected loops, while the
latest level-mix synthesis says stale/held `fuzz-assertion` should count as `0`
useful. Persona output also observed backend/API, protocol-server, and
fuzz-only assertion sessions, but the committed `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` execution counters still read
zero.

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

The latest collected execution data has about `6,269,132` completed test
executions: `387,583` browser/e2e, `3,006` transport/integration,
`5,430,720` unit-property, and `447,823` coverage-guided-lower-level. The
latest partial 15-minute bucket reports about `696` browser/e2e executions/hour
and `3328` unit-property executions/hour, with `0` current counted rate for
coverage-guided-lower-level, transport/integration, backend-api,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend/API,
protocol-server target work, and assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `859` unique
likely-real findings over about `2882.4` runner-hours, or `29.80` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,645` candidates
over `2882.4` runner-hours (`230.54` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `6` over `66.2` runner-hours
(`9.06` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `12423.2` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `3219.0` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 1047 | 34 | 0 | 3.2% |
| `multi-reload-lifecycle` | 4582 | 168 | 0 | 3.7% |
| `revision-persistence` | 7874 | 289 | 0 | 3.7% |
| `parser-serialization` | 4759 | 318 | 0 | 6.7% |
| `real-user-editing` | 10466 | 970 | 0 | 9.3% |
| `common-blocks` | 5442 | 531 | 0 | 9.8% |
| `parser-transform` | 6176 | 716 | 0 | 11.6% |
| `long-session-large-doc` | 5823 | 974 | 0 | 16.7% |
| `block-gauntlet` | 7851 | 1387 | 0 | 17.7% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `session-lifecycle` | 10125 | 2791 | 0 | 27.6% |
| `media-cross-entity` | 570 | 172 | 0 | 30.2% |
| `three-user-late-join` | 12688 | 3962 | 0 | 31.2% |
| `permissions-auth-locks` | 11489 | 5078 | 0 | 44.2% |
| `async-server-blocks` | 12869 | 5716 | 0 | 44.4% |
| `persistence-no-title` | 4979 | 2218 | 0 | 44.5% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 974 | 1000 |
| successful real-user-editing records next 1000 tier | 970 | 1000 |
| action reload-post-action next 2000 tier | 1521 | 2000 |
| action ui-heading-shortcut next 2000 tier | 1650 | 2000 |
| real-user body save/reload next 2000 tier | 1033 | 2000 |
| real-user title save/reload next 2000 tier | 974 | 2000 |
| successful real-user-editing records next 2000 tier | 970 | 2000 |
| action ui-format-paragraph next 5000 tier | 2573 | 5000 |
| action ui-heading-shortcut next 5000 tier | 1650 | 5000 |
| action ui-type-paragraph next 5000 tier | 2708 | 5000 |
| action ui-type-title next 5000 tier | 2758 | 5000 |
| action ui-undo-redo-paragraph next 5000 tier | 2201 | 5000 |
| CDP coverage records next 10000 tier | 7731 | 10000 |
| CDP coverage records next 20000 tier | 7731 | 20000 |
| gauntlet block core/details next 1000 tier | 836 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, UI action depth, CDP coverage tiers, and one gauntlet block
tier.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The highest-volume feature categories are history, operation-ledger,
invariant, action-pair, block-depth, block, action, other, transport,
collaborator, revision, payload-size, autosave, initial-content, profile,
reload, save, step-count, users, and fault observations. The plot separates
breadth (`keys`)
from repeated observations (`total_count`) so broad coverage is not hidden
inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes do not hide the
profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

With the live loop at `max_parallel=6`, the newest completed review cycle in
the collected graph data is `20260519T082842Z`; it took `9.98` minutes and
finished at `2026-05-19T08:38:41Z`. Feedback after cycle 446 then finished at
`2026-05-19T08:46:13Z`, and the next review cycle `20260519T084618Z` started
with no collected finish row yet.

The latest persona synthesis, `20260519T082842Z`, rejects a filing-ready
graph-only interpretation. It keeps the clean current split prefix through
`PR15C` and keeps blocked targeted-replay `PR16-RLH@0788a6e3713` as
non-fileable. Cycle444 produced a fresh, nonzero manifest/audit for that clean
candidate, but strict seed `6000007` still did not reach the persistence parity
oracle, so owner remains undetermined. The latest completed feedback action
updated the split and launched one bounded strict `6000007` head-reproduction
repair tmux job; the strict owner matrix remains open.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-19T02:28:28Z`, has `10`
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

The event plot comes from the controller's `events.ndjson` feed when the older
log file is absent. This snapshot shows `5` persona-control rounds and no fresh
heavy-job deferral events in that stream.

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
consumes the artifact-index manifest-path list before falling back to
historical scans, keeping GitHub publication decoupled from Jetstream's lack of
GitHub access while reducing repeated manifest discovery work.

## Interpretation

The graph remains positive on coverage intake, with `257568` cumulative coverage
record observations and `3782` current-scan coverage files. Goal pressure is not
finished: the latest state has `143` goals with `15` unmet. The live health
graph has quiet current-output startup failures and a zero duplicate share in
the latest active current-output sample: `duplicateShareCurrent=0` while
monitor-pass summary startup failures are `0`. It also shows quality issues
`0`, warnings `0`, `no_progress=0`, and `411.4G` free memory. The same latest
pass has `headroom=true`. The newest one-, five-, and 15-minute loads are below
the `64` logical CPU count, but recent load exceeded the CPU count in `17` of
the latest `25` windows and the latest sample has `3` blocked tasks. The active
current triage view is empty even though the copied state has `2` current run
dirs. The paused-inclusive current-output view sees one capped product-evidence
family and one no-product startup-noise hold: `2` roots, `2` raw signatures, `1`
actionable product-evidence signature, `11` product-evidence summary records,
and `2` suppressed strict-startup records. Historical aggregate duplicate/noise
is `0.1429`, but it is context only and is not the live health signal.

The duplicate/noise persona loop rejects converting the quiet startup-failure
sample into a durable healthy-materialization claim. The newest synthesis,
`20260519T173654Z`, says strict no-product startup noise is mostly suppressed
downstream, but novelty/supervisor scheduling can still retry noisy producers
or over-block the fleet with historical startup pauses. Its feedback action file
is empty, so read the refreshed graph as startup-noise improvement plus scoped
producer holds needing validation, not as proof that producer selection is
stable under load.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis keeps the usable prefix through `PR15C` and keeps
`PR16-RLH@0788a6e3713` blocked because seed `6000007` did not reach the
persistence parity oracle. The latest feedback action launched one bounded
strict repair; until that produces owner rows, the graph does not justify PR16
filing, raw reload promotion, rebuilt stack validation, or broad final-stack
fuzzing.

The committed fuzzing graph is browser/e2e-heavy: `28` current browser/e2e
lanes across `19` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The latest level-mix persona synthesis,
`20260519T173717Z`, says useful browser/e2e capacity should be repaired only
after admission pressure clears; its live signal is `browser-e2e=15 < 24` with
`high_pressure`, and it rejects lower-level expansion. The latest non-empty
feedback action capped lower-level capacity, repaired the focused browser lane
path, and attempted `async-server-a`; it says no new lower-level lane should
appear and the focused fix still needs live validation. Lower-level work is real
but narrow: unit-property and coverage-guided lower-level have active graph
counters; transport has historical output but no current counted rate;
backend-api, protocol-server, and standalone `fuzz-assertion` counters remain
zero. Persona evidence says native coverage-guided lower-level, protocol-server,
backend/API, and gated assertion work exist. The latest native synthesis keeps
the block-parser/serialization lower-level harness as the first ready isolated
target. The latest protocol synthesis keeps the REST protocol-server harness as
the right first target, and the latest non-empty action says a one-seed smoke
passed, but that smoke did not move the committed graph counter. The committed
protocol counter remains zero, so the graph-only "none exists" interpretation
is also wrong.

The next browser-capacity check must show useful materialization above the
PID-backed floor under load, not just configured lanes or startup cleanliness.
The next
duplicate/noise check must prove no-analysis drains are not launchable, separate
acceptable product-evidence representatives from repeated no-product noise, and
keep validating scoped producer holds under live load. The next narrow
collector checks are backend-api, protocol-server, and fuzz-assertion execution
counts, continued lower-level output accounting, and final-stack validation only
after the PR split's owner-replay and gate-repair evidence is accepted by the
filing path.
