# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T17:12:42Z`

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
  sample `2026-05-19T17:10:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving after the coverage-guided monitor restart. The
last completed monitor pass is rooted at `run-20260519T170721Z`, and the
repaired passes continue through `2026-05-19T17:08:50Z`. Across `2550` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-19T17:08:50Z`, cumulative
coverage record observations rose from `782` to `256945`. Coverage-file counts
are current-scan counts, not cumulative coverage; the latest current scan is
`3888` files after the latest root rollover. The monitor's visible likely-real
maximum remains `4`.

Coverage-goal pressure is lower than the initial queue but not finished. The
latest copied coverage-guidance state was refreshed at
`2026-05-19T17:08:50Z`; it has `143` total goals and `15` unmet goals
covering real-user save/reload depth, real-user editing completion, reload-post
action depth, UI action depth, CDP coverage tiers, and one gauntlet block tier.

The latest plotted live health sample uses current-output-dir duplicate/noise
and monitor-pass summary startup failures: `duplicateShareCurrent=0`,
current summary startup failures `0`, quality issues `0`, warnings `0`,
`no_progress=1`, and `413.4G` free memory. The latest monitor pass has
`headroom=true`. The newest one-, five-, and 15-minute load samples are all
below the `64` logical CPU count, while recent load still exceeded the CPU
count in `17` of the latest `25` windows. The newest sample has `3` blocked
tasks, so the current-output sample should not be read as a capacity claim.
Historical aggregate duplicate/noise is context only; its latest duplicate
share is `0.125` but is not the plotted live health signal.

The copied novelty state has advanced to `run-20260519T170721Z` with `1`
enabled group, `novelty-ws-parser-transform`, `4` paused startup-noise groups,
`2` active current run dirs, empty current summary startup-failure maps, and
`2` current-run records. The current-run triage view sees `2` roots, `2` files,
`1` raw no-product known-infra signature, `0` actionable signatures, `0`
family-capped signatures, `0` visible likely-real signatures, `3` summary
product-evidence records, `0` summary strict-startup failures, and `0`
startup/bootstrap stalls. The paused/no-analysis-inclusive view sees the same
`2` roots and `2` files, `1` raw no-product known-infra signature, `0`
actionable signatures, `0` family-capped signatures, `0` visible likely-real
signatures, `3` summary product-evidence records, and `0` summary strict-startup
failures. The current duplicate share is `0`. The external-live view still sees
one root, `10` files, `94` signatures, and `55` merged likely-real signatures,
with `5409` bootstrap stalls and `2706` known `pre_action_bootstrap_stall` noise
signatures. Current-output startup noise is quiet by the plotted monitor metric,
and the current duplicate share is zero in this sample, but paused startup-noise
groups and no-product producer holds still need live-load scrutiny.

Persona-loop evidence rejects several graph-only interpretations. The newest
duplicate/noise synthesis, `20260519T165236Z`, still calls the problem a
control-plane leak: strict no-product `pre_action_bootstrap_stall` is mostly
blocked downstream, but novelty/supervisor scheduling, no-analysis drain
accounting, and stale sentinel metadata can still recycle no-product known-noise
families. The latest feedback-action file, `20260519T165236Z`, is empty; the
latest non-empty feedback action, `20260519T160532Z`, applied a bounded
live-analysis/drain family-cap fix and restarted the changed analysis and
novelty monitors. The refreshed graph should be read as quieter current-output
startup and a zero current duplicate-share sample after partial remediation, not
as durable proof that producer selection is stable under load.

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
`27` browser/e2e lanes across `18` groups, plus `1` `unit-property` lane and
`1` `coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260519T163626Z`, rejects lower-level expansion and treats the next action as
an e2e floor repair only: its binding signal is `browser-e2e=22 < 24`, with
persona live checks seeing `15-22` PID-backed lanes. It says to keep
`unit-property=1`, `coverage-guided-lower-level=1`, `backend-api=1`,
`protocol-server=1`, and `fuzz-assertion=0` useful; repair the focused browser
startup blocker, then run one admission-gated `async-server-a` canary. The
latest feedback-action file, `20260519T163626Z`, is empty, while the latest
non-empty feedback action, `20260519T161207Z`, launched a focused
`rich-text-b` backfill canary that ended below the floor and failed closed as
startup noise. No new lower-level executions should appear from that action.

Native/protocol persona evidence shows lower-level work exists and that some of
it is graph-visible. The latest native-harness synthesis,
`20260519T164914Z`, keeps
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated coverage-guided lower-level harness and notes the observed run already
completed `2775` attempts and `88800` covered input executions. The latest
protocol-server synthesis, `20260519T170108Z`, keeps `POST
/wp-sync/v1/updates` as the first protocol-server target through real REST
dispatch and durable `WP_Sync_Post_Meta_Storage`, but its latest action file is
empty and does not add new graph-counted execution evidence.
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
`256945`; coverage-file counts are tracked separately and reset when the active
output root rolls. The latest current-output sample is `3888` files from
`run-20260519T170721Z`. Dense monitor-pass points are intentionally small and
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
issues `0`, warnings `0`, `no_progress=1`, `413.4G` free memory, and
`headroom=true`.
Historical aggregate duplicate/noise is not the plotted live health signal.

The copied current novelty state has `1` enabled group,
`novelty-ws-parser-transform`, `4` paused startup-noise groups, `2` active
current run dirs, empty current summary startup-failure maps, and `2`
current-run records. The copied current-run triage view sees `2` roots, `2`
files, `1` raw no-product known-infra signature, `0` actionable signatures,
`0` family-capped signatures, `0` visible likely-real signatures, `3` summary
product-evidence records, `0` summary strict-startup failures, and `0`
startup/bootstrap stalls. The paused/no-analysis-inclusive view sees the same
`2` roots and `2` files, `1` raw no-product known-infra signature, `0`
actionable signatures, `0` family-capped signatures, `0` visible likely-real
signatures, `3` summary product-evidence records, `0` summary strict-startup
failures, and `0` startup/bootstrap stalls. The current duplicate share is `0`.
The external-live triage view sees one root, `10` files, `94` signatures, `55`
merged likely-real signatures, `5409` bootstrap stalls, and
`2706` known `pre_action_bootstrap_stall` noise signatures. Current-output
startup noise is quiet in this sample and the plotted current duplicate share
is zero, while paused startup-noise groups and no-product producer holds still
need live-load scrutiny.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T17:10:00Z` show bursty CPU and load.
The latest 25 CPU samples range from `61.83%` to `82.46%` utilization, with the
latest sample at `70.53%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `13` windows, five-minute load in `13`,
15-minute load in `13`, and at least one load window exceeded it in `17`. The
newest 1/5/15-minute load sample is `50.47`, `55.44`, and `58.13`; all three
windows are below the `64` logical CPU count. The newest sample has `3` blocked
tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone. The latest copied
state has `1` enabled group, `4` paused startup-noise groups, empty current
summary startup-failure maps, `2` active current run dirs, and plotted current
duplicate share `0`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `27` browser/e2e lanes across `18` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is concentrated in browser/e2e lanes: `27` of the
latest `29` graph-visible lanes are browser/e2e. Lower-level work is active but
narrow: one `unit-property` lane and one `coverage-guided-lower-level` lane.
`transport-integration` has historical execution/output data but no current
counted rate. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` in the committed graph counters.

Persona-loop evidence adds caveats. The latest level-mix synthesis,
`20260519T163626Z`, says the intended mix should change only toward useful
browser/e2e capacity and only as an e2e floor repair. Its binding signal is
`browser-e2e=22 < 24`, with persona live checks seeing `15-22` PID-backed
lanes. It rejects lower-level expansion, keeps stale/held `fuzz-assertion` at
`0` useful, and says configured/supervisor lane counts must not replace the
PID-backed e2e floor signal. It recommends repairing the focused browser
startup blocker, not retrying `focused-rich-text-b` unchanged, and then running
one admission-gated `async-server-a` canary. The latest feedback-action file,
`20260519T163626Z`, is empty. The latest non-empty feedback action,
`20260519T161207Z`, launched a focused `rich-text-b` backfill canary; PID-backed
browser lanes ended at `17`, still below the `24` floor, and that canary failed
closed as startup noise. This rejects both a graph-only "add lower-level
capacity now" interpretation and a graph-only "`27` browser/e2e lanes means
healthy useful capacity" interpretation.

Native/protocol actions show useful work beyond what all committed counters can
currently show. The latest native synthesis, `20260519T164914Z`, keeps the
block parser/serialization coverage-guided lower-level target as the first
ready isolated harness and notes the observed run already completed `2775`
attempts and `88800` covered input executions, even though the committed
level-mix row is still only a single lower-level lane. The latest
protocol-server synthesis, `20260519T170108Z`, keeps `POST
/wp-sync/v1/updates` as the first target through real REST dispatch and durable
post-meta storage, but its latest action file is empty and adds no new
graph-counted execution evidence. The latest fuzz-only assertion action,
`20260519T034502Z`, added two gated browser/e2e assertions and restarted
affected loops, while the latest level-mix synthesis says stale/held
`fuzz-assertion` should count as `0` useful. Persona output also observed
backend/API, protocol-server, and fuzz-only assertion sessions, but the
committed `backend-api`, `protocol-server`, and standalone `fuzz-assertion`
execution counters still read zero.

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

The latest collected execution data has about `6,264,395` completed test
executions: `386,814` browser/e2e, `3,006` transport/integration,
`5,426,752` unit-property, and `447,823` coverage-guided-lower-level. The
latest partial 15-minute bucket reports about `596` browser/e2e executions/hour
and `4480` unit-property executions/hour, with `0` current counted rate for
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
likely-real findings over about `2870.7` runner-hours, or `29.92` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,606` candidates
over `2870.7` runner-hours (`230.12` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `6` over `65.7` runner-hours
(`9.14` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `12459.9` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `3073.4` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 1047 | 34 | 0 | 3.2% |
| `revision-persistence` | 7867 | 289 | 0 | 3.7% |
| `multi-reload-lifecycle` | 4573 | 168 | 0 | 3.7% |
| `parser-serialization` | 4751 | 318 | 0 | 6.7% |
| `real-user-editing` | 10457 | 970 | 0 | 9.3% |
| `common-blocks` | 5434 | 531 | 0 | 9.8% |
| `parser-transform` | 6136 | 690 | 0 | 11.2% |
| `long-session-large-doc` | 5743 | 927 | 0 | 16.1% |
| `block-gauntlet` | 7825 | 1378 | 0 | 17.6% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `session-lifecycle` | 10116 | 2791 | 0 | 27.6% |
| `media-cross-entity` | 570 | 172 | 0 | 30.2% |
| `three-user-late-join` | 12680 | 3962 | 0 | 31.2% |
| `permissions-auth-locks` | 11327 | 4979 | 0 | 44.0% |
| `persistence-no-title` | 4946 | 2192 | 0 | 44.3% |
| `async-server-blocks` | 12688 | 5627 | 0 | 44.3% |

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
| CDP coverage records next 10000 tier | 7683 | 10000 |
| CDP coverage records next 20000 tier | 7683 | 20000 |
| gauntlet block core/details next 1000 tier | 834 | 1000 |

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

The graph remains positive on coverage intake, with `256945` cumulative coverage
record observations and `3888` current-scan coverage files. Goal pressure is
not finished: the latest state has `143` goals with `15` unmet. The live health
graph has quiet current-output startup failures and a zero duplicate share in
the latest current-output sample: `duplicateShareCurrent=0` while monitor-pass
summary startup failures are `0`. It also shows quality issues `0`, warnings
`0`, `no_progress=1`, and `413.4G` free memory. The same latest pass has
`headroom=true`. The newest one-, five-, and 15-minute load samples are all
below the `64` logical CPU count, recent load exceeded the CPU count in `17` of
the latest `25` windows, and the latest sample has `3` blocked tasks. The
current triage view sees `2` files, `1` raw no-product known-infra signature,
`0` actionable signatures, `0` visible likely-real signatures, `0`
family-capped signatures, `3` summary product-evidence records, and `0`
startup/bootstrap stalls. Historical aggregate duplicate/noise is `0.125`, but
it is context only and is not the
live health signal.

The duplicate/noise persona loop rejects converting the quiet startup-failure
sample into a durable healthy-materialization claim. The newest synthesis,
`20260519T165236Z`, says strict no-product startup noise is mostly blocked
downstream, but novelty/supervisor scheduling, no-analysis drain accounting,
and stale sentinel metadata can still recycle known-noise families. The latest
feedback-action file, `20260519T165236Z`, is empty; the latest non-empty
feedback action, `20260519T160532Z`, applied a bounded live-analysis/drain
family-cap fix and restarted the changed analysis and novelty monitors. Read
the refreshed graph as startup-noise improvement plus a zero current
duplicate-share sample after partial remediation, not as proof that producer
selection is stable under load.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis keeps the usable prefix through `PR15C` and keeps
`PR16-RLH@0788a6e3713` blocked because seed `6000007` did not reach the
persistence parity oracle. The latest feedback action launched one bounded
strict repair; until that produces owner rows, the graph does not justify PR16
filing, raw reload promotion, rebuilt stack validation, or broad final-stack
fuzzing.

The committed fuzzing graph is browser/e2e-heavy: `27` current browser/e2e
lanes across `18` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The latest level-mix persona synthesis,
`20260519T163626Z`, says useful browser/e2e capacity should be repaired with
one admission-gated `async-server-a` canary after fixing the focused browser
startup blocker; lower-level expansion should stay capped, and
configured/supervisor lane counts should not be treated as enough. The latest
feedback-action file is empty, while the latest non-empty feedback action
launched a `rich-text-b` backfill canary; PID-backed browser lanes remained at
`17` and the canary failed closed as startup noise. Lower-level work is real but
narrow: unit-property and coverage-guided lower-level have active graph
counters; transport has historical output but no current counted rate;
backend-api, protocol-server, and standalone `fuzz-assertion` counters remain
zero. Persona evidence says native coverage-guided lower-level, protocol-server,
backend/API, and gated assertion work exist. The latest native synthesis keeps
the block-parser/serialization lower-level harness as the first ready isolated
target. The latest protocol synthesis keeps the REST protocol-server harness as
the right first target, but the latest action file is empty and does not add
new committed execution evidence. The committed protocol counter remains zero,
so the graph-only "none exists" interpretation is also wrong.

The next browser-capacity check must show useful materialization above the
floor under load, not just startup cleanliness. The next duplicate/noise check
must keep current-output duplicate share at or near zero while startup failures
stay quiet and the current groups produce useful product output, then keep
validating no-product producer holds under live load. The next
narrow collector checks are backend-api, protocol-server, and fuzz-assertion
execution counts, continued lower-level output accounting, and final-stack
validation only after the PR split's owner-replay and gate-repair evidence is
accepted by the filing path.
