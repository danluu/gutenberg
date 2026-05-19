# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T14:55:04Z`

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
  sample `2026-05-19T14:50:04Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving after the coverage-guided monitor restart. The
last completed monitor pass is rooted at `run-20260519T145026Z`, and the
repaired passes continue through `2026-05-19T14:53:17Z`. Across `2482` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-19T14:53:17Z`, cumulative
coverage record observations rose from `782` to `254613`. Coverage-file counts
are current-scan counts, not cumulative coverage; the latest current scan is
`2349` files after the latest root rollover. The monitor's visible likely-real
maximum remains `4`.

Coverage-goal pressure is lower but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live health sample uses current-output-dir duplicate/noise
and monitor-pass summary startup failures: `duplicateShareCurrent=0`,
current summary startup failures `0`, quality issues `0`, warnings `0`,
`no_progress=0`, and `398G` free memory. The latest monitor pass has
`headroom=false`. The newest 1/5/15-minute load samples are all above the `64`
logical CPU count, and recent load exceeded it in `16` of the latest `25`
windows, so the current-output sample should not be read as a capacity claim.
Historical aggregate duplicate/noise is context only; its latest duplicate
share is `0.2` but is not the plotted live health signal.

The copied novelty state has advanced to `run-20260519T145026Z` with one
enabled group, `novelty-ws-real-user-title-body-save-reload`, `4` paused
groups, one active current run dir, empty current summary startup-failure maps,
and `2` current-run records for the title/body save-reload group. The
current-run and paused/no-analysis-inclusive triage views each see one root,
one file, `0` raw signatures, `0` deduped signatures, `0` actionable
signatures, `0` visible likely-real signatures, and `0` startup/bootstrap
stalls. The current duplicate share is `0`. The external-live view sees one
root, `10` files, `94` signatures, and `55` merged likely-real signatures, with
`5409` bootstrap stalls and `2706` known `pre_action_bootstrap_stall` noise
signatures. Current materialization has rolled again; current-output startup
noise and duplicate share are quiet, while paused startup-noise and historical
product-evidence duplicate/family-cap pressure still need control-plane
scrutiny.

Persona-loop evidence rejects several graph-only interpretations. The newest
duplicate/noise synthesis, `20260519T143930Z`, says strict no-product
`pre_action_bootstrap_stall` is mostly suppressed, but
`preserveProductEvidence` and no-analysis drain state can still be treated as
broad launch authority instead of visibility. It recommends one active
representative per product-evidence semantic family, preserving likely-real or
already-running representatives instead of blanket-suppressing product-evidence
failures. The latest feedback-action file from that cycle is empty; the latest
non-empty feedback-action, `20260519T135628Z`, implemented the earlier bounded
control-plane fix and observed a clean active run, but it also says the change
was not validated by a live dominant-family reproduction. The refreshed graph
now shows quiet current-output startup noise and duplicate share, so read it as
a clean live sample under high load, not as proof that the producer and
analysis-selection policy is durably fixed.

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
`38` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane and
`1` `coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260519T144202Z`, rejects reading those graph-visible lanes as healthy useful
capacity: useful browser/e2e capacity is below the `24`-lane floor, focused
exact sessions are missing, and many browser lanes are paused or stale. It
recommends admission-gated focused-shards backfill only when pressure allows and
explicitly rejects adding lower-level lanes now. The latest non-empty
feedback-action,
`20260519T140210Z`, kept lower-level capacity capped, restored the
coverage-guided browser canary, did not launch focused-shards because admission
was blocked by `severe_pressure`, and regenerated context with coverage
materialization `ok`. Its final admission sample still had `17` live browser
lanes against a `24` floor, with load pressure blocking focused backfill.

Native/protocol persona evidence shows lower-level work exists and that some of
it is graph-visible. The latest native-harness synthesis,
`20260519T142509Z`, keeps
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated coverage-guided lower-level harness, with rich-text CRDT as a
follow-on. The latest native action, `20260519T142509Z`, implemented and
validated that lane, passed an action-local smoke with root/lane
`events.ndjson`, and left the continuous parser lane running. The latest
protocol-server synthesis, `20260519T143643Z`, keeps the production HTTP
polling REST endpoint ahead of WebSocket fuzzing, names
`POST /wp-sync/v1/updates` as the first target, and reports existing live-run
artifact evidence with `1582` seed attempts and `284760` case executions when
sampled. The latest protocol action,
`20260519T141110Z`, validated the HTTP polling REST harness with one passing
seed, `20` individual protocol cases, and `23` nonzero oracle counters without
overwriting the active protocol current-run root. The committed `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` graph counters still remain
at `0`, so these persona outputs contradict a graph-only "no work exists" read
without yet moving those committed execution/output metrics.

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

The bottom facet is the operational queue: unmet goals fell from `24` to `4`.
The top facet shows cumulative coverage record observations increasing to
`254613`; coverage-file counts are tracked separately and reset when the active
output root rolls. The latest current-output sample is `2349` files from
`run-20260519T145026Z`. Dense monitor-pass points are intentionally small and
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
issues `0`, warnings `0`, `no_progress=0`, `398G` free memory, and
`headroom=false`.
Historical aggregate duplicate/noise is not the plotted live health signal.

The copied current novelty state has one enabled group,
`novelty-ws-real-user-title-body-save-reload`, `4` paused groups, one active
current run dir, empty current summary startup-failure maps, and `2`
current-run records for the title/body save-reload group. The copied
current-run and paused/no-analysis-inclusive triage views each see one root,
one file, `0` raw signatures, `0` deduped signatures, `0` actionable
signatures, `0` visible likely-real signatures, and `0` startup/bootstrap
stalls. The current duplicate share is `0`. The external-live triage view sees
one root, `10` files, `94` signatures, `55` merged likely-real signatures,
`5409` bootstrap stalls, and `2706` known `pre_action_bootstrap_stall` noise
signatures. Current materialization has rolled again; current-output startup
noise and duplicate share are quiet in this sample, while paused startup-noise
and historical product-evidence duplicate pressure still need control-plane
scrutiny.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T14:50:04Z` show bursty CPU and load.
The latest 25 CPU samples range from `48.84%` to `82.46%` utilization, with the
latest sample at `73.02%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `11` windows, five-minute load in `11`,
15-minute load in `9`, and at least one load window exceeded it in `16`. The
newest 1/5/15-minute load sample is `89.40`, `70.97`, and `67.07`; all three
windows are above the `64` logical CPU count. The newest sample has `10`
blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone. The latest copied
state has one enabled group, `novelty-ws-real-user-title-body-save-reload`, `4`
paused groups, empty current summary startup-failure maps, one active current
run dir, and plotted current duplicate share `0`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `38` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is concentrated in browser/e2e lanes: `38` of the
latest `40` graph-visible lanes are browser/e2e. Lower-level work is active but
narrow: one `unit-property` lane and one `coverage-guided-lower-level` lane.
`transport-integration` has historical execution/output data but no current
counted rate. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` in the committed graph counters.

Persona-loop evidence adds caveats. The latest level-mix synthesis,
`20260519T144202Z`, says the intended mix should remain browser-heavy, but
useful browser/e2e capacity is below the `24`-lane floor, focused exact
sessions are missing, and stale/held `fuzz-assertion` should count as `0`
useful. It recommends admission-gated focused-shards backfill only after a
fresh PID-backed `<24` check and only if load pressure clears, and still keeps
lower-level lanes capped. The latest non-empty feedback-action,
`20260519T140210Z`, kept lower-level capacity capped, restarted only the
coverage-guided browser path, launched no new lower-level target, and blocked
focused-shards on `severe_pressure` with `17` live browser lanes against a `24`
floor. This rejects both a graph-only "add lower-level capacity now"
interpretation and a graph-only "`38` browser/e2e lanes means healthy useful
capacity" interpretation.

Native/protocol actions show useful work beyond what all committed counters can
currently show. The latest native synthesis, `20260519T142509Z`, chooses the
block parser/serialization
coverage-guided lower-level target as the first ready isolated harness and
treats rich-text CRDT as the next lane. The latest native action,
`20260519T142509Z`, implemented and validated the lane, passed a smoke with
root/lane `events.ndjson`, and left the continuous parser lane running. The
latest protocol-server synthesis, `20260519T143643Z`, still chooses the HTTP
polling REST harness over WebSocket fuzzing and says the existing live protocol
run already had `1582` seed attempts and `284760` case executions when sampled.
The latest protocol action, `20260519T141110Z`, validated that harness with
`20` individual
protocol cases and `23` nonzero oracle counters while leaving productive
browser fuzzing alone and not overwriting the active protocol current-run root.
The latest fuzz-only assertion action,
`20260519T034502Z`, added two gated browser/e2e assertions and restarted
affected loops, while the latest level-mix synthesis says stale/held
`fuzz-assertion` should count as `0` useful. These outputs are evidence,
but the committed `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` execution counters still read zero.

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

The latest collected execution data has about `6,249,362` completed test
executions: `384,581` browser/e2e, `3,006` transport/integration,
`5,413,952` unit-property, and `447,823` coverage-guided-lower-level. The
latest partial 15-minute bucket reports about `464` browser/e2e executions/hour
and `3200` unit-property executions/hour, with `0` current counted rate for
coverage-guided-lower-level, transport/integration, backend-api,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend/API,
protocol-server implementation, and assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `846` unique
likely-real findings over about `2831.5` runner-hours, or `29.88` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,465` candidates
over `2831.5` runner-hours (`228.33` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `6` over `63.9` runner-hours
(`9.39` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `12598.5` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2573.0` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 1047 | 34 | 0 | 3.2% |
| `multi-reload-lifecycle` | 4538 | 163 | 0 | 3.6% |
| `revision-persistence` | 7807 | 289 | 0 | 3.7% |
| `parser-serialization` | 4710 | 307 | 0 | 6.5% |
| `real-user-editing` | 10285 | 875 | 0 | 8.5% |
| `common-blocks` | 5378 | 512 | 0 | 9.5% |
| `parser-transform` | 6069 | 668 | 0 | 11.0% |
| `long-session-large-doc` | 5447 | 793 | 0 | 14.6% |
| `block-gauntlet` | 7781 | 1366 | 0 | 17.6% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `session-lifecycle` | 10082 | 2791 | 0 | 27.7% |
| `media-cross-entity` | 566 | 171 | 0 | 30.2% |
| `three-user-late-join` | 12617 | 3961 | 0 | 31.4% |
| `permissions-auth-locks` | 10713 | 4614 | 0 | 43.1% |
| `async-server-blocks` | 11932 | 5221 | 0 | 43.8% |
| `persistence-no-title` | 4887 | 2145 | 0 | 43.9% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1423 | 2000 |
| real-user title save/reload next 1000 tier | 876 | 1000 |
| successful real-user-editing records next 1000 tier | 875 | 1000 |
| real-user body save/reload next 1000 tier | 935 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and reload-post action depth.

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

The graph remains positive on coverage intake and goal reduction. The live
health graph has quiet current-output startup noise and duplicate share:
`duplicateShareCurrent=0` while monitor-pass summary startup failures are `0`.
It also shows quality issues `0`, warnings `0`, `no_progress=0`, and `398G`
free memory. The same latest pass has `headroom=false`. The newest 1/5/15-minute
load samples are all above the `64` logical CPU count, and recent load exceeded
it in `16` of the latest `25` windows. The current triage views see one file,
`0` deduped signatures, `0` actionable signatures, `0` visible likely-real
signatures, and `0` startup/bootstrap stalls. Historical aggregate
duplicate/noise is `0.2`, but it is context only and is not the live health
signal.

The duplicate/noise persona loop rejects converting the quiet startup-failure
sample into a durable healthy-materialization claim. The latest synthesis,
`20260519T143930Z`, says the remaining issue is product-evidence/no-analysis
admission: preserved product evidence can still become broad launch authority
instead of one representative per semantic family. Its latest feedback-action
file is empty; the latest non-empty action, `20260519T135628Z`, implemented the
earlier bounded control-plane fix and observed a clean active run, but the
feedback also says the patch was not validated by a live dominant-family
reproduction. Read the refreshed graph as startup-noise improvement plus a
clean current-output sample, not as proof that producer selection is stable
under load.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis keeps the usable prefix through `PR15C` and keeps
`PR16-RLH@0788a6e3713` blocked because seed `6000007` did not reach the
persistence parity oracle. The latest feedback action launched one bounded
strict repair; until that produces owner rows, the graph does not justify PR16
filing, raw reload promotion, rebuilt stack validation, or broad final-stack
fuzzing.

The committed fuzzing graph is browser/e2e-heavy: `38` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The latest level-mix persona synthesis,
`20260519T144202Z`, says useful browser/e2e capacity is still below the
`24`-lane floor despite the graph-visible lane count, focused exact sessions are
missing, and lower-level expansion should stay capped. The latest feedback kept
lower-level capacity capped, restarted only the coverage-guided browser path,
and blocked focused-shards on `severe_pressure` with `17` live browser lanes
against a `24` floor.
Lower-level work is real but narrow: unit-property and coverage-guided
lower-level have active graph counters; transport has historical output but no
current counted rate; backend-api, protocol-server, and standalone
`fuzz-assertion` counters remain zero. Persona evidence says native
coverage-guided lower-level, protocol-server, backend/API, and gated assertion
work exist. The latest native action implemented and validated the
block-parser/serialization lower-level harness and left the continuous lane
running. The latest protocol synthesis selects `POST /wp-sync/v1/updates` and
reports live-run evidence of `1582` seed attempts and `284760` cases; the latest
protocol action validated `20` REST protocol cases with `23` nonzero oracle
counters without overwriting the active protocol current-run root. The
graph-only "none exists" interpretation is also wrong.

The next browser-capacity check must show useful materialization above the
floor under load, not just startup cleanliness. The next duplicate/noise check
must keep current-output duplicate share and startup failures quiet while the
current group produces useful product output, then validate the product-evidence
representative cap against a live dominant-family reproduction. The next
narrow collector checks are backend-api, protocol-server, and fuzz-assertion
execution counts, continued lower-level output accounting, and final-stack
validation only after the PR split's owner-replay and gate-repair evidence is
accepted by the filing path.
