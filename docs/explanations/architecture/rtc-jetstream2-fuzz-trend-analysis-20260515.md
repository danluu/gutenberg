# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T19:09:18Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state started at `2026-05-18T18:54:58Z`
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
  `2026-05-18T19:00:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2286` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T19:04:51Z`, coverage files grew from
`272` to `54623`, a delta of `54351`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest pass has `0` quality issues, `0`
warnings, `409.6G` free memory, `no_progress=0`, and `headroom=false`. This
report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3415` and is not the plotted live health signal.

Persona-loop evidence rejects a durable recovery read. The newest
duplicate/noise synthesis, `20260518T184526Z`, still treats the startup-noise
problem as a no-product control-plane leak, not an RTC product bug. The latest
duplicate/noise feedback-action, `20260518T181318Z`, installed current-run
startup-noise guards and restarted the novelty monitor and supervisor. The
copied novelty state now has `enabledGroups=[novelty-ws-real-user-editing]`,
one active current run dir, and `14` paused groups. The monitor also paused
`novelty-ws-real-user-rich-text` at `2026-05-18T19:00:50Z` on a
product-evidence duplicate family. Current-output duplicate/noise is clean, but
producer recovery is not proven durable.

The PR-split persona loop still rejects filing. The latest synthesis,
`20260518T183752Z`, keeps the Cycle378/Cycle380/Cycle382/Cycle384 replacement
split and rejects the old linear `PR07 -> PR17 -> PR18/PR18x` tail. The paired
feedback-action completed a local-publish/finalization audit and repaired PR07
owner replay, but the replay failed before oracle because the runtime setup
missed `gutenberg-test-plugin-disables-the-css-animations`. PR07 owner
adjudication and PR02B validation remain the filing gates.

The graph-visible controller state is narrower than the PR-split loop. Its
current table has `22` work items: `10` high-priority publishable product
branches, `8` medium-priority ready-product branches needing repair, `1`
runtime-gated PR07C owner-evidence item, and `3` deferred-family rows. The
controller event CSV is empty in this snapshot, so this refresh does not support
the older persona-control/deferral event-count read.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `4`.
The top facet shows continued coverage-file growth to `54623` files. Dense
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
`409.6G`, `no_progress=0`, and `headroom=false`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The enabled-groups summary field now names `novelty-ws-real-user-editing`, and
the copied novelty state has one active current run dir. It also has `14`
paused groups. The persona loop therefore rejects a durable recovery claim even
though the current-output duplicate/noise sample is clean.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T19:00:01Z` show bursty CPU and load.
The latest 25 CPU samples range from `45.39%` to `87.39%` utilization, with the
latest sample at `77.84%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `15` windows, five-minute load in `17`,
15-minute load in `17`, and at least one load window exceeded it in `18`. The
newest 1/5/15-minute load sample is `63.18`, `66.64`, and `69.48`; the 5- and
15-minute windows are above the logical CPU count, with `1` blocked task in the
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
summary's current enabled group is `novelty-ws-real-user-editing`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is still concentrated in browser/e2e lanes:
`29` of the latest `31` graph-visible lanes are browser/e2e. Lower-level work is
active but narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters.

Persona-loop evidence adds important caveats. The newest level-mix synthesis,
`20260518T183828Z`, rejects broad lower-level expansion and calls for bounded
browser/e2e recovery first. Its paired feedback-action restored a backend/API
sentinel and tried browser-floor repair, but optional browser starts were
blocked by severe pressure. The latest native synthesis, `20260518T185242Z`,
keeps the rich-text CRDT merge harness as the first ready isolated
coverage-guided lower-level target; the `20260518T183330Z` action validated it
but did not start a duplicate continuous rich-text lane because that target is
on hold. The latest protocol synthesis/action, `20260518T184953Z`, implemented
and validated an HTTP polling REST state-machine harness for
`POST /wp-sync/v1/updates`. Those backend/protocol persona actions are real
evidence, but they have not moved the committed backend/API or protocol-server
trend counters above zero.

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

The latest collected execution data has about `5,860,616` completed test
executions: `240,539` browser/e2e, `3,006` transport/integration, `5,169,248`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `4,304` browser/e2e executions/hour and `8,064`
unit-property executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend/API,
protocol, and assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `769` unique
likely-real findings over about `2,459.1` runner-hours, or `31.27` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,102` candidates
over `2,459.1` runner-hours (`248.14` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `45.8` runner-hours
(`10.92` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `8757.6` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1568.8` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4005 | 162 | 0 | 4.0% |
| `revision-persistence` | 6690 | 289 | 0 | 4.3% |
| `parser-serialization` | 4034 | 252 | 0 | 6.2% |
| `real-user-editing` | 8856 | 613 | 0 | 6.9% |
| `common-blocks` | 4814 | 501 | 0 | 10.4% |
| `parser-transform` | 5275 | 564 | 0 | 10.7% |
| `long-session-large-doc` | 4003 | 596 | 0 | 14.9% |
| `structure` | 540 | 96 | 0 | 17.8% |
| `block-gauntlet` | 7164 | 1340 | 0 | 18.7% |
| `session-lifecycle` | 9489 | 2743 | 0 | 28.9% |
| `media-cross-entity` | 522 | 163 | 0 | 31.2% |
| `three-user-late-join` | 11499 | 3933 | 0 | 34.2% |
| `persistence-no-title` | 4033 | 1460 | 0 | 36.2% |

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
the collected graph data is `20260518T183752Z`; it took `9.6` minutes. The loop
then ran Cycle386 feedback until `2026-05-18T19:03:50Z` and started the next
cycle at `2026-05-18T19:03:55Z`.

The latest synthesis rejects a filing-ready interpretation. It keeps the
Cycle378/Cycle380/Cycle382/Cycle384 replacement split and says the stack is
still gated by `PR02B`, PR07 owner replay, broad final-stack validation, and
GitHub filing. The latest feedback-action audited the latest nonzero
finalization/local-publish state and reran PR07 owner replay, but PR07 did not
promote because setup failed before the oracle. Broad final-stack fuzzing,
raw deferred promotion, and GitHub filing remain blocked.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T18:52:38Z`, has `10`
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

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

The refreshed `pr_progress_controller_events.csv` is empty, so this plot should
not be interpreted as evidence for new controller rounds or heavy-job deferral
counts in this snapshot. The current-state table and push manifest remain the
stronger graph-visible controller signals.

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
quality issues `0`, warnings `0`, `no_progress=0`, and `409.6G` free memory.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting that clean point into a
durable recovery claim. The current novelty state has one active
`novelty-ws-real-user-editing` run dir and `14` paused groups, and the monitor
just paused rich-text on a product-evidence duplicate family. The right read is
"latest duplicate/noise point clean, producer capacity still not durable."

The PR-split persona loop rejects filing or broad final-stack fuzzing. Cycle386
made progress by auditing finalization/local-publish state and rerunning PR07
owner replay, but PR07 still did not produce promotable owner evidence and
`PR02B` still needs validation. Old blocker-row waiting is not progress while
those gates remain open.

The committed fuzzing graph is browser/e2e-heavy: `29` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Persona-loop evidence shows backend/API,
protocol-server, native/lower-level, and fuzz-only assertion work happened, but
the backend/API, protocol-server, and standalone assertion counters are still
zero in the committed graph data. The next narrow checks are sustained
current-output duplicate/noise health while browser capacity advances,
collector-visible backend/protocol/assertion execution counts, continued
lower-level output accounting, and PR07/`PR02B` closure before any filing or
final-stack claim.
