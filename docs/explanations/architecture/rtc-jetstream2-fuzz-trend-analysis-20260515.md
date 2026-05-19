# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T10:09:25Z`

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
  sample `2026-05-19T10:00:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is moving again after the coverage-guided monitor restart. The
active coverage-output root rolled over after the `2026-05-19T04:53:01Z`
sample, and the repaired passes continue through `2026-05-19T10:06:37Z`.
Across `2360` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-19T10:06:37Z`, cumulative coverage record observations rose from
`782` to `250345`. Coverage-file counts are current-scan counts, not cumulative
coverage; after the restart the latest current scan is `1832` files. The
monitor's visible likely-real maximum remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted duplicate/noise sample is clean on the monitor's
current-output-dir metric: monitor-pass current summary startup failures are
`0` and `duplicateShareCurrent=0`. The latest monitor pass has `1` quality
issue, `1` warning, `413.0G` free memory, `no_progress=1`, and
`headroom=true`. The latest copied current novelty state is sourced from
`supervisor-no-active-run-dirs`; it points at `run-20260519T100500Z`, sees no
active current run dirs, no current-run signatures, and no current summary
lines. The live current-output signal is clean, but materialization is absent
rather than healthy.

This report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3333` and is not the plotted live health signal.

Persona-loop evidence is no longer just a caveat. The newest duplicate/noise
synthesis, `20260519T095415Z`, says the remaining duplicate/noise problem is a
novelty-monitor control-plane issue: historical or reusable
`pre_action_bootstrap_stall` pauses can become current fleet blockers and leave
`supervisor-groups.json` empty even when current active triage has `0`
roots/signatures. The paired `20260519T090846Z` feedback action applied
producer blocks and semantic family caps, restarted coverage-guided novelty,
supervisor, and analysis sessions, and reported browser materialization empty
while strict startup-noise cooldowns dominate. The refreshed graph's live
current-output signal is clean, but the persona loop rejects reading that as
healthy browser materialization or treating historical startup/noise families
as confirmed product failures.

The PR-split persona loop rejects filing from the graph alone and requires the
split feedback to stay in force. The latest synthesis, `20260519T082842Z`,
keeps the ready main/CRDT split through `PR15C`, and carries a blocked,
non-fileable `PR16-RLH@0788a6e3713` candidate. Cycle444 produced a fresh
nonzero manifest/audit for that clean candidate, but the replay still stopped
before the `createPersistedCRDTDoc()` persistence parity oracle, so owner
remains undetermined. The latest completed feedback action,
`20260519T082842Z`, applied cycle 446 by keeping `PR16-RLH` as blocked
`RLH-6000007-candidate` and launching exactly one bounded strict `6000007`
head-reproduction repair. The graph event stream records review cycle
`20260519T082842Z` finishing at `2026-05-19T08:38:41Z`, feedback after cycle
446 finishing at `2026-05-19T08:46:13Z`, and the next review cycle
`20260519T084618Z` starting with no collected finish row yet. The strict owner
gap remains open, so the graph still does not justify raw reload/PR07D
publication, PR16 filing, or broad final-stack fuzzing.

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
The top facet shows cumulative coverage record observations increasing to
`250345`; coverage-file counts are tracked separately and reset when the active
output root rolls. The prior coverage-output root reached `56184` files before
the active output root reset; the latest current-output sample is `1832` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and monitor-pass summary startup failures: `duplicateShareCurrent=0`,
current summary startup failures `0`, quality issue count `1`, warning count
`1`, free memory `413.0G`, `no_progress=1`, and `headroom=true`. The health
graph does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied current novelty state has
`currentRunDirSource=supervisor-no-active-run-dirs`, no active current run
dirs, no current-run signatures, and no current summary lines. It also reports
one health warning: no behavioral coverage files were found under the current
novelty output dir. That keeps the
current-output duplicate/noise read clean while making useful live
materialization weaker than a graph-only "healthy capacity" read. The paired
duplicate/noise feedback says browser materialization is intentionally empty
while strict startup-noise cooldowns dominate.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T10:00:01Z` show bursty CPU and load.
The latest 25 CPU samples range from `43.60%` to `85.60%` utilization, with the
latest sample at `43.60%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `13` windows, five-minute load in `13`,
15-minute load in `16`, and at least one load window exceeded it in `16`. The
newest 1/5/15-minute load sample is `24.64`, `31.53`, and `36.53`; all three
windows are below the `64` logical CPU count. The newest sample has `4`
blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has an empty `enabledGroups` list and
`currentRunDirSource=supervisor-no-active-run-dirs`. The monitor-level current
duplicate share remains `0`, with current summary startup failures also `0`;
the absence of active current run dirs makes this a narrow live-materialization
signal rather than a durable capacity claim.

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
`20260519T095456Z`, rejects reallocating toward broad lower-level fuzzing. It
says the intended shape should stay browser-heavy with one-lane sentinels for
`unit-property`, `coverage-guided-lower-level`, `backend-api`, and
`protocol-server`, but current browser materialization is broken:
`browser-e2e` has only `1` active lane against a `24` floor, `26` browser lanes
are paused, coverage-guided browser has `0` active run dirs, and
`supervisor-groups.json` is empty. The paired `20260519T090734Z` feedback
action restored backend/API and protocol/server sentinels, retargeted the
unit/property sidecar to a stronger bounded oracle, fixed WS runtime-config
isolation, and attempted a bounded coverage-guided browser materialization
restart. It still reports only `4` active browser lanes against a floor of
`24`, so this contradicts both a graph-only "lower-level work is idle" read and
a graph-only "`27` browser/e2e lanes means healthy useful capacity" read.

The committed graph shows lower-level work, but narrowly: one current
`unit-property` lane, one current `coverage-guided-lower-level` lane, and a
nonzero current unit-property execution rate. `transport-integration` has
historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` counters
still remain at `0`.

The latest native-harness synthesis file, `20260519T100053Z`, is empty; the
latest substantive native-harness synthesis, `20260519T095122Z`, recommends
`coverage-guided-lower-level-rich-text-multiblock` as the first ready isolated
coverage-guided lower-level harness. The paired action validated that harness
with a passing smoke, `fuzzLevel: "coverage-guided-lower-level"` events, `342`
coverage keys, `107` feature keys, and `12` corpus entries, but did not start a
duplicate continuous rich-text lane because an operational hold remains. The
latest protocol-server synthesis, `20260519T094933Z`, still targets the
deterministic `POST /wp-sync/v1/updates` REST state-machine harness. Its paired
`20260519T094933Z` action implemented and validated that harness with real REST
dispatch into `WP_HTTP_Polling_Sync_Server`, two passing
`seed-attempt-complete` records, `fuzzLevel: "protocol-server"`, and `23`
nonzero oracle counters while explicitly leaving the protocol current-run
pointer unchanged. The latest fuzz-only assertion action,
`20260519T034502Z`, added two gated browser/e2e assertions and restarted the
affected loops. Persona-loop evidence therefore says lower-level, backend/API,
protocol-server, and gated assertion work exist, but the committed
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` execution
counters and output metrics have not yet moved above zero.

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

The latest collected execution data has about `6,214,377` completed test
executions: `376,604` browser/e2e, `3,006` transport/integration, `5,386,944`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `1,272` browser/e2e executions/hour and `3,456`
unit-property executions/hour, with `0` current counted rate for
coverage-guided-lower-level, transport/integration, backend-api,
protocol-server, and standalone `fuzz-assertion`.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` remain at `0`
cumulative executions in this counter despite persona-loop evidence for
backend/API, protocol-server implementation, and assertion work. The committed
graph data does not yet show backend-api, protocol-server, or standalone
assertion rows above zero.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `793` unique
likely-real findings over about `2,761.0` runner-hours, or `28.72` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,297` candidates
over `2,761.0` runner-hours (`228.07` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `6` over `60.3` runner-hours
(`9.96` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `12698.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1427.3` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 1047 | 34 | 0 | 3.2% |
| `multi-reload-lifecycle` | 4427 | 163 | 0 | 3.7% |
| `revision-persistence` | 7604 | 289 | 0 | 3.8% |
| `parser-serialization` | 4561 | 283 | 0 | 6.2% |
| `real-user-editing` | 9854 | 691 | 0 | 7.0% |
| `common-blocks` | 5261 | 512 | 0 | 9.7% |
| `parser-transform` | 5933 | 657 | 0 | 11.1% |
| `long-session-large-doc` | 5026 | 596 | 0 | 11.9% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7665 | 1366 | 0 | 17.8% |
| `session-lifecycle` | 9986 | 2757 | 0 | 27.6% |
| `media-cross-entity` | 566 | 171 | 0 | 30.2% |
| `three-user-late-join` | 12423 | 3961 | 0 | 31.9% |
| `permissions-auth-locks` | 9665 | 3946 | 0 | 40.8% |
| `async-server-blocks` | 10764 | 4640 | 0 | 43.1% |
| `persistence-no-title` | 4768 | 2056 | 0 | 43.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1223 | 2000 |
| real-user title save/reload next 1000 tier | 676 | 1000 |
| successful real-user-editing records next 1000 tier | 691 | 1000 |
| real-user body save/reload next 1000 tier | 735 | 1000 |

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
the collected graph data is `20260519T082842Z`; it took `9.98` minutes and
finished at `2026-05-19T08:38:41Z`. Feedback after cycle 446 then finished at
`2026-05-19T08:46:13Z`, and the next review cycle `20260519T084618Z` started
with no collected finish row yet.

The latest persona synthesis, `20260519T082842Z`, rejects a filing-ready
graph-only interpretation. It keeps the clean current split prefix through
`PR15C` and keeps blocked targeted-replay `PR16-RLH@0788a6e3713` as
non-fileable. Cycle444 produced a fresh, nonzero manifest/audit for that clean
candidate, but strict seed `6000007` still did not reach the persistence parity
oracle, so owner remains undetermined. Seed `1020002` still blocks final-stack
fuzzing and filing, but not PR16 replay, diagnostic audits, branch audits, or
loop repair. The latest completed feedback action,
`20260519T082842Z`, updated the split and launched one bounded strict
`6000007` head-reproduction repair tmux job, so the strict owner matrix remains
open.

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

The graph remains positive on coverage intake and goal reduction. The live
health graph uses the monitor's current-output duplicate/noise sample:
`duplicateShareCurrent=0` and monitor-pass summary startup failures are `0`,
with quality issues `1`, warnings `1`, `no_progress=1`, `headroom=true`, and
`413.0G` free memory. The copied current novelty state reports
`currentRunDirSource=supervisor-no-active-run-dirs`, no active current run
dirs, no current signatures, no current summary lines, and one health warning
for no behavioral coverage files under the current novelty output dir.
Historical aggregate duplicate/noise is currently `0.3333`; it is context only
and is not the live health signal. Recent load exceeded the `64` logical CPU
count in most, but not all, of the latest 25 windows. The newest 1/5/15-minute
load values are `24.64`, `31.53`, and `36.53`, all below the logical CPU count.
The newest sample has `4` blocked tasks.

The duplicate/noise persona loop rejects converting current startup/noise status
into a durable product-bug or healthy-materialization claim. The latest
synthesis, `20260519T095415Z`, says historical/reusable startup-noise pauses
are being promoted into current fleet-wide holds, leaving
`supervisor-groups.json` empty even though current active triage has `0`
roots/signatures. Its smallest safe fix is to make historical startup pauses
advisory while still blocking true current no-product strict startup holds and
preserving product-evidence representatives. The paired feedback applied
producer blocks and semantic family caps, restarted the relevant sessions, and
reported materialization intentionally empty while startup-noise cooldowns
dominate. The graph should be read as clean live current-output duplicate/noise
plus unresolved materialization, not proof that setup, REST discovery,
endpoint-mismatch, or runtime-config families are product bugs.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis, `20260519T082842Z`, keeps the clean current prefix usable
through `PR15C` and keeps `PR16-RLH@0788a6e3713` as a blocked, non-fileable
candidate. Cycle444 output produced a fresh nonzero manifest/audit for the
clean candidate, but strict seed `6000007` still did not reach the persistence
parity oracle, so it is not owner evidence. The graph does not justify filing,
rebuilt stack validation, raw reload promotion, `PR18x` naming, or broad
final-stack fuzzing. The latest completed feedback updated the split, kept
`PR16-RLH` blocked rather than fileable, and launched one bounded non-`1020002`
strict `6000007` head-reproduction repair, but the active strict owner gap
remains open.

The PR-focused queue/blocker graphs make the current waits explicit. Publication
has plenty of nominally ready rows, but the controller is blocking stack-shaped
publication behind PR07C owner proof, PR07B/PR14 repair, duplicate-branch
selection, and diagnostic relaunch cooldowns. The repeated-failure graphs show
where validation work is cycling without new product evidence: deferred
reload/http/pre-save/rich-text heads, PR03B, and pre-oracle PR17/seed-reducer
continuations.

The committed fuzzing graph is browser/e2e-heavy: `27` current browser/e2e
lanes across `24` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The level-mix persona loop agrees with
browser/e2e concentration and rejects broad lower-level expansion. It also
rejects trusting raw lane presence as useful work: the newest synthesis says
browser materialization is broken, with `1` active browser/e2e lane against a
`24` floor, `26` paused browser lanes, `0` active coverage-guided browser run
dirs, and empty `supervisor-groups.json`. The paired feedback says WS
runtime-config isolation was fixed and backend/protocol sentinels are now
exact-session `ok`, but browser materialization still shows only `4` active
lanes against a floor of `24`.
Lower-level work is real but narrow in the committed graph: unit-property and
coverage-guided lower-level are active counters; transport has historical output
but no current counted rate; backend-api, protocol-server, and standalone
`fuzz-assertion` execution counters remain zero. Persona-loop evidence says
native lower-level, backend/API, protocol-server, and gated assertion work
exist, including a smoke-validated rich-text multiblock coverage-guided
lower-level target, a running parser/serialization lower-level lane,
unit-property table/query-array assertion output, backend/API and
protocol/server sentinel work, a smoke-validated HTTP polling REST
protocol/server harness with two passing seeds and `23` nonzero oracle
counters, and two gated fuzz-only assertions. That contradicts a graph-only "no
backend, protocol, or assertion work exists" read, but those outputs have not
yet moved the committed backend-api, protocol-server, or standalone assertion
counters above zero. The next browser-capacity check is not just
duplicate/noise cleanliness; it must show useful materialization despite the
no-active-current-run state. The next narrow checks are sustained
current-output duplicate/noise health,
collector-visible backend-api, protocol-server, and fuzz-assertion execution
counts, continued lower-level output accounting, and final-stack validation only
after the PR split's owner-replay and gate-repair evidence is accepted by the
filing path.
