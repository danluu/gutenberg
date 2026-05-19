# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T03:09:01Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage novelty state updated at `2026-05-19T02:44:03.942Z`
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
  sample `2026-05-19T03:00:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2319` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-19T02:44:04Z`, coverage files grew from
`272` to `55671`, a delta of `55399`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest live duplicate/noise sample is startup-clean and not duplicate-heavy
on the current-output-dir metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest pass has `0` quality issues, `0`
warnings, `420G` free memory, `no_progress=0`, and `headroom=false`. This
report uses current-output duplicate/noise and summary startup failures for live
health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3407` and is not the plotted live health signal.

Persona-loop evidence supports a clean current-output sample, but rejects a
durable-capacity claim. The newest duplicate/noise synthesis file,
`20260519T023513Z`, still puts the active risk in producer admission and
re-admission: no-product startup noise can leak back through product-evidence
escape hatches, stale no-analysis preservation, mixed-attempt records, or
replacement groups before downstream triage gates matter. The newest matching
feedback-action file, `20260519T023513Z`, implemented the bounded
control-plane fix: stale/no-product startup cooldown bypasses are blocked,
stale bypass state is cleared on output-root changes, parser-serialization is
held in the duplicate-family set, stale/no-analysis product-evidence bypasses
now require explicit product evidence, and active consumer-path validation found
no launchable strict startup jobs. The graph point with
`duplicateShareCurrent=0` and summary startup failures `0` is live clean-status
evidence after those fixes; it is not proof of sustained useful browser
materialization, especially with `headroom=false` and the restarted novelty
monitor still pending a full enforcement pass at cutoff.

The PR-split persona loop still rejects filing. The latest synthesis,
`20260519T024021Z`, replaces the Cycle418 tail with durable split
`finalized/rtc-pr-stack-20260519T022936Z`: ready/local through `PR06D`, sidecars
`PR02A` and `PR06E`, CRDT through `PR15C`, plus
`HARNESS-WS-CONFIG-022004` as harness-only. It rejects the zero-byte
`20260519T023939Z` finalization report as evidence. Fresh replay evidence says
current clean `PR15C` itself fails seed `1000009` entity serialization and seed
`6000007` marker-set convergence, so raw `012938` and `020456` stay
non-fileable owner-reduction problems. Seed `1020002` still blocks final-stack
validation and filing only. The latest completed feedback action,
`20260519T024021Z`, appended Cycle420 feedback, added non-fileable
`ENTITY-SERIALIZATION-1000009` and `PERSISTENCE-PARITY-6000007` owner queues,
kept raw/stale PR07, PR15D, PR17, PR18, and PR18x work non-fileable, patched the
loop rule for current-control product failures, and launched
`rtc-cycle420-pr15c-persistence-entity-owner-reduction`. Graph events show the
`20260519T024021Z` review finished at `2026-05-19T02:50:51Z`, feedback finished
at `2026-05-19T02:58:16Z`, and the next review cycle,
`20260519T025821Z`, started at `2026-05-19T02:58:21Z`.

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
The top facet shows continued coverage-file growth to `55671` files. Dense
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
`420G`, `no_progress=0`, and `headroom=false`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state was updated at `2026-05-19T02:44:03.942Z`.
It has enabled group `novelty-ws-parser-serialization`, one materialized active
current run dir, no health warnings, and active-scope triage yield with `0` raw
signatures and `0` summary startup failures. Its paused no-analysis drain scope
still has duplicate product-evidence history, but the live plotted monitor point
uses the current-output-dir metric: `duplicateShareCurrent=0` and summary
startup failures `0`. That is a clean duplicate/noise point, not a durable
capacity recovery claim.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T03:00:00Z` show bursty CPU and load.
The latest 25 CPU samples range from `55.08%` to `89.75%` utilization, with the
latest sample at `76.76%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `19` windows, five-minute load in `20`,
15-minute load in `20`, and at least one load window exceeded it in `21`. The
newest 1/5/15-minute load sample is `100.66`, `78.07`, and `70.30`; all three
load windows are above the logical CPU count in the newest sample. The latest
sample has `52` blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has one materialized active current run dir and enabled group
`novelty-ws-parser-serialization`, no health warnings, active current triage
yield of `0` raw signatures, and a monitor-level current duplicate share of `0`.

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
`20260519T025909Z`, is empty, so the latest substantive synthesis remains
`20260519T024446Z`: protect browser/e2e capacity and make no lower-level
expansion. It keeps `unit-property`, `coverage-guided-lower-level`,
`backend-api`, `protocol-server`, and `fuzz-assertion` capped at one sentinel
lane each, with browser floor repair as the binding bug-yield action. The
latest substantive feedback-action file, `20260519T021904Z`, stopped trusting
heartbeat-stale `novelty-status.md` yield, relaxed floor-repair admission short
of severe pressure, and launched gap backfill
`gap-booster-20260519T023707Z`. Its validation poll still found browser below
floor, with `15` running lanes and `12` active run dirs; the later synthesis
keeps that as a browser repair problem, not a reason to add lower-level
capacity.

The newest native-harness synthesis, `20260519T025351Z`, keeps the rich-text
CRDT multiblock harness as the first ready isolated V8/Node coverage-guided
lower-level target and parser/serialization as the second lane. Its matching
action file is empty; the previous substantive native action,
`20260519T022758Z`, implemented and validated the rich-text lower-level harness
with root and lane events carrying
`fuzzLevel: "coverage-guided-lower-level"`, but did not start a duplicate
continuous rich-text lane because an existing hold kept the table/query-array
lower-level lane running. The newest protocol-server synthesis,
`20260519T025448Z`, keeps the HTTP polling REST endpoint
`POST /wp-sync/v1/updates` ahead of WebSocket fuzzing; its matching action file
is empty, and the previous substantive protocol action, `20260519T023044Z`,
implemented and validated that harness with
`fuzzLevel: "protocol-server"` root and lane events in a bounded validation
run. The newest fuzz-only assertion apply, `20260519T020224Z`, is empty; the
latest substantive apply, `20260519T002715Z`, added a query-array CRDT
hydration assertion and restarted affected browser fuzz loops. These
persona-loop outputs are evidence for lower-level, protocol-server, and
assertion work, but they have not moved the committed backend/API,
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

The latest collected execution data has about `6,057,127` completed test
executions: `313,178` browser/e2e, `3,006` transport/integration, `5,293,120`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `3,444` browser/e2e executions/hour and `7,168`
unit-property executions/hour, with `0` current counted rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` remain at `0`
cumulative executions in this counter despite persona-loop evidence for
protocol-server and assertion work. The committed graph data does not yet show
backend/API, protocol-server, or standalone assertion rows above zero.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `782` unique
likely-real findings over about `2,611.7` runner-hours, or `29.94` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,171` candidates
over `2,611.7` runner-hours (`236.28` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `53.7` runner-hours
(`9.32` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `11011.3` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1338.2` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4097 | 163 | 0 | 4.0% |
| `revision-persistence` | 6866 | 289 | 0 | 4.2% |
| `parser-serialization` | 4138 | 255 | 0 | 6.2% |
| `real-user-editing` | 9096 | 650 | 0 | 7.1% |
| `common-blocks` | 4897 | 502 | 0 | 10.3% |
| `parser-transform` | 5426 | 602 | 0 | 11.1% |
| `long-session-large-doc` | 4147 | 596 | 0 | 14.4% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7266 | 1348 | 0 | 18.6% |
| `session-lifecycle` | 9603 | 2744 | 0 | 28.6% |
| `media-cross-entity` | 529 | 164 | 0 | 31.0% |
| `three-user-late-join` | 11729 | 3947 | 0 | 33.7% |
| `persistence-no-title` | 4179 | 1576 | 0 | 37.7% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1181 | 2000 |
| real-user title save/reload next 1000 tier | 634 | 1000 |
| successful real-user-editing records next 1000 tier | 650 | 1000 |
| real-user body save/reload next 1000 tier | 693 | 1000 |

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
the collected graph data is `20260519T024021Z`; it took `10.50` minutes. The
loop finished that review at `2026-05-19T02:50:51Z`, completed feedback action
cycle `420` at `2026-05-19T02:58:16Z`, then started `20260519T025821Z` at
`2026-05-19T02:58:21Z`.

The latest persona synthesis, `20260519T024021Z`, rejects a filing-ready
interpretation. It replaces the Cycle418 tail with durable split
`finalized/rtc-pr-stack-20260519T022936Z`: ready/local lanes through `PR06D`,
sidecars `PR02A` and `PR06E`, CRDT through `PR15C`, and
`HARNESS-WS-CONFIG-022004` as harness-only. It rejects the zero-byte
`20260519T023939Z` finalization report as evidence and says current clean
`PR15C` already fails seed `1000009` entity serialization and seed `6000007`
marker-set convergence. Raw `012938`, raw `020456`, raw `003407`, PR07 arms,
`PR15D`, `PR17`, `PR18`, and `PR18x` remain non-fileable; seed `1020002`
blocks final-stack validation and filing only. The latest completed feedback
action, `20260519T024021Z`, added the `ENTITY-SERIALIZATION-1000009` and
`PERSISTENCE-PARITY-6000007` owner queues, patched current-control product
failure gating, and launched only the bounded Cycle420 PR15C
persistence/entity owner-reduction job. It did not clear filing, broad
final-stack fuzzing, rebuilt stack-wide validation, PR07 promotion, or
reload-hydration promotion.

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

The graph remains positive on coverage intake and goal reduction, and the
latest live health point is clean on current-output duplicate/noise:
`duplicateShareCurrent=0` and current summary startup failures are `0`, while
`headroom=false`. The latest full health sample has quality issues `0`,
warnings `0`, `no_progress=0`, and `420G` free memory. Historical aggregate
duplicate/noise, currently `0.3407`, is context only and is not the live health
signal. Recent load was overloaded in many of the latest 25 windows, and the
newest 1/5/15-minute load values, `100.66`, `78.07`, and `70.30`, are all above
the `64` logical CPU count, with `52` blocked tasks.

The duplicate/noise persona loop rejects converting one clean live point into a
durable recovery claim. The newest duplicate/noise synthesis file,
`20260519T023513Z`, again identifies producer admission/refill policy as the
active risk: strict no-product startup stalls are mostly suppressed downstream,
but stale no-analysis state, product-evidence escape hatches, mixed-attempt
records, and replacement groups can re-admit them. The newest feedback-action
file, `20260519T023513Z`, implemented the bounded control-plane fix: blocked
stale/no-product startup cooldown bypasses, cleared stale bypass state on output
root changes, added parser-serialization to duplicate-family holds, required
explicit product evidence for stale/no-analysis bypasses, and validated that no
strict startup jobs were launchable on active consumer paths. The graph now
shows clean current-output duplicate/noise, while the copied novelty state has
one active current run dir, no active-scope raw signatures, and no health
warnings. Useful browser capacity is still not proved durable, and full
enforcement of the parser hold was still pending the restarted monitor's next
pass at cutoff.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis, `20260519T024021Z`, replaces the Cycle418 tail with durable
split `finalized/rtc-pr-stack-20260519T022936Z`: ready/local through `PR06D`,
sidecars `PR02A` and `PR06E`, CRDT through `PR15C`, and
`HARNESS-WS-CONFIG-022004` as harness-only. It rejects the zero-byte
`20260519T023939Z` finalization report and says current clean `PR15C` itself
fails seed `1000009` entity serialization and seed `6000007` marker-set
convergence. The latest feedback action, `20260519T024021Z`, added those two
non-fileable owner queues, patched current-control product failure gating, and
launched only the bounded Cycle420 PR15C owner-reduction job; it did not clear
filing, broad final-stack fuzzing, rebuilt stack-wide validation, PR07
promotion, or reload-hydration promotion. Seed `1020002` remains a
final-stack-only blocker.

The PR-focused queue/blocker graphs make the current waits explicit. Publication
has plenty of nominally ready rows, but the controller is blocking stack-shaped
publication behind PR07C owner proof, PR07B/PR14 repair, duplicate-branch
selection, and diagnostic relaunch cooldowns. The repeated-failure graphs show
where validation work is cycling without new product evidence: deferred
reload/http/pre-save/rich-text heads, PR03B, and pre-oracle PR17/seed-reducer
continuations.

The committed fuzzing graph is browser/e2e-heavy: `28` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The level-mix persona loop agrees with
browser/e2e concentration; its newest synthesis, `20260519T025909Z`, is empty,
so the latest substantive synthesis remains `20260519T024446Z`, which says to
protect browser/e2e and make no lower-level expansion. The latest
substantive feedback action fixed stale yield accounting, launched gap
backfill, and still found the browser floor short at `15` running lanes and
`12` active run dirs. Keep lower-level, backend/API, protocol-server, and
standalone assertion lanes capped at sentinel budgets while browser floor
repair remains the binding bug-yield action. Lower-level work is real but
narrow in the committed graph: unit-property and coverage-guided lower-level
are active counters; transport has historical output but no current counted
rate; backend/API, protocol-server, and standalone `fuzz-assertion` execution
counters remain zero. Persona-loop evidence says protocol/server, native
lower-level, and assertion work exists: the latest native and protocol syntheses
still select rich-text CRDT lower-level and HTTP polling protocol-server work,
though their matching action files are empty; the prior native action validated
the rich-text CRDT V8/Node coverage-guided harness without starting a duplicate
continuous lane; the prior protocol action implemented and validated
`protocol-server` HTTP polling root/lane events in a bounded run; and the latest
substantive fuzz-only assertion action added query-array CRDT hydration checks
and restarted affected browser loops. Those outputs have not yet moved the
committed backend/API,
protocol-server, or standalone assertion counters above zero. The next narrow
checks are sustained current-output duplicate/noise health with useful browser
materialization, collector-visible backend/protocol/assertion execution counts,
continued lower-level output accounting, and PR07/owner-reduction closure
before any filing or final-stack claim.
