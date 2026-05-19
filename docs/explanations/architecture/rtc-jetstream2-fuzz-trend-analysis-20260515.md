# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T03:28:00Z`

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
  sample `2026-05-19T03:20:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2320` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-19T03:22:09Z`, coverage files grew from
`272` to `55800`, a delta of `55528`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest live duplicate/noise sample is startup-clean and not duplicate-heavy
on the current-output-dir metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest pass has `0` quality issues, `0`
warnings, `424G` free memory, `no_progress=0`, and `headroom=true`. This
report uses current-output duplicate/noise and summary startup failures for live
health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3407` and is not the plotted live health signal.

Persona-loop evidence supports the clean plotted current-output sample, but
rejects a durable-capacity claim. The latest duplicate/noise synthesis file,
`20260519T031512Z`, is empty; the latest substantive synthesis,
`20260519T030248Z`, says normal consumers mostly reject no-product startup
stalls, while the active risk is stale or late current-run control-plane state
in the novelty monitor. Producer policy can act before fresh current-run triage
and duplicate/noise holds are persisted. The newest completed feedback-action
file, `20260519T023513Z`, implemented a bounded earlier fix: stale/no-product
startup cooldown bypasses are blocked, stale bypass state is cleared on
output-root changes, parser-serialization is held in the duplicate-family set,
stale/no-analysis product-evidence bypasses require explicit product evidence,
and active consumer-path validation found no launchable strict startup jobs.
The graph point with `duplicateShareCurrent=0` and summary startup failures `0`
is live clean-status evidence; the substantive synthesis says the next required
fix is current-run triage/policy freshness, not a claim that browser
materialization is now durably useful.

The PR-split persona loop still rejects filing. The latest synthesis,
`20260519T030649Z`, keeps the Cycle420 replacement split:
ready/local through clean `PR06D`, sidecars `PR02A` and `PR06E`, CRDT through
`PR15C`, `HARNESS-WS-CONFIG-022004` as harness-only, and non-fileable owner
queues for `PR07`, `ENTITY-SERIALIZATION-1000009`,
`PERSISTENCE-PARITY-6000007`, and strict `117126135e5e`. It says the active
Cycle420 owner-reduction job is progress but incomplete: `owner-matrix.tsv` has
rows, while `classification.tsv` and `manifest-audit.tsv` are still
header-only and `report.md` is missing. Fresh rows show seed `1000009` fails on
`PR05B`, `PR05C`, `PR05D`, and current `PR15C`, so it belongs in the
PR05/parser-entity owner area pending `PR04`/`PR05A` comparison. Seed
`6000007` still fails current `PR15C` and clean reload hydration, so reload
remains runtime-gated. Graph events show review cycle `20260519T030649Z`
finished at `2026-05-19T03:16:03Z`; feedback cycle `422` finished at
`2026-05-19T03:23:46Z` and review cycle `20260519T032351Z` then started. The
latest completed feedback action file, `20260519T030649Z`, applied Cycle422
feedback but kept filing, final-stack fuzzing, PR07 promotion, reload-hydration
filing, and PR18x naming blocked.

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
The top facet shows continued coverage-file growth to `55800` files. Dense
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
`424G`, `no_progress=0`, and `headroom=true`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state has enabled groups
`novelty-ws-parser-transform` and `novelty-ws-common-blocks`, one active
current run dir for common-blocks, and no health warnings. Its live
`triageYieldCurrent` has `0` raw signatures and `0` summary strict-startup
failures. Paused/no-analysis context still shows duplicate-family and startup
evidence, but that context is not the plotted live health signal. The plotted
monitor health point uses the current-output-dir metric from
`monitor_passes.csv`: `duplicateShareCurrent=0` and summary startup failures
`0`. That is a clean duplicate/noise graph point, not a durable capacity
recovery claim.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T03:20:00Z` show bursty CPU and load.
The latest 25 CPU samples range from `55.08%` to `91.77%` utilization, with the
latest sample at `73.85%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `19` windows, five-minute load in `21`,
15-minute load in `22`, and at least one load window exceeded it in `22`. The
newest 1/5/15-minute load sample is `60.33`, `65.82`, and `76.75`; the
five-minute and 15-minute windows are still above the logical CPU count, while
one-minute load is just below it. The latest sample has `6` blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has enabled groups `novelty-ws-parser-transform` and
`novelty-ws-common-blocks`, one active current run dir, no health warnings,
live current triage yield of `0` raw signatures, and a monitor-level current
duplicate share of `0`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The copied snapshot history covers `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live graph-visible fuzzing is still concentrated in browser/e2e lanes:
`29` of the latest `31` graph-visible lanes are browser/e2e. Lower-level work is
active but narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters.

Persona-loop evidence adds important caveats. The newest level-mix synthesis,
`20260519T025909Z`, says the effective mix should change only by restoring
browser/e2e capacity. It reports browser/e2e at `14` active lanes against a
`24` lane floor and keeps `unit-property`, `coverage-guided-lower-level`,
`backend-api`, `protocol-server`, and `fuzz-assertion` capped at one sentinel
lane each. Its concrete next change is a gap-booster port-base fix and a
gap-only restart on non-conflicting ports; it rejects focused-shard restarts
and lower-level expansion. The matching feedback-action file implemented the
gap-booster port-base fix and defaulted browser child commands away from
repeated Playwright installs, but admission blocked the restart under
`severe_pressure`; its final live summary still had `15` running browser lanes
and `12` active run dirs, below the `24` lane floor.

The latest substantive native-harness synthesis, `20260519T025351Z`, keeps the
rich-text CRDT multiblock harness as the first ready isolated V8/Node
coverage-guided lower-level target and parser/serialization as the second lane.
Its matching action implemented and validated the rich-text CRDT multiblock
lower-level harness with root and lane events carrying
`fuzzLevel: "coverage-guided-lower-level"`, but did not start a duplicate
continuous rich-text session because a table/query-array lower-level lane was
already active. The newest native-harness synthesis file, `20260519T031103Z`,
is a no-edit decision that keeps the same target. The newest protocol-server
synthesis, `20260519T031640Z`, keeps the HTTP polling REST endpoint
`POST /wp-sync/v1/updates` ahead of WebSocket fuzzing; the matching action file
is empty. The latest substantive protocol action, `20260519T025448Z`,
implemented and validated that harness with
`fuzzLevel: "protocol-server"` root and lane events in a bounded smoke run.
The newest fuzz-only assertion apply, `20260519T020224Z`, is empty; the latest
substantive apply, `20260519T002715Z`, added a query-array CRDT hydration
assertion and restarted affected browser fuzz loops. These persona-loop outputs
are evidence for lower-level, protocol-server, and assertion work, but they
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

The latest collected execution data has about `6,064,210` completed test
executions: `315,109` browser/e2e, `3,006` transport/integration, `5,298,272`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `3,548` browser/e2e executions/hour and `12,672`
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

On that triage-output metric, browser/e2e currently dominates: `783` unique
likely-real findings over about `2,617.5` runner-hours, or `29.91` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,176` candidates
over `2,617.5` runner-hours (`235.95` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `54.0` runner-hours
(`9.26` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `11045.2` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1330.1` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4103 | 163 | 0 | 4.0% |
| `revision-persistence` | 6892 | 289 | 0 | 4.2% |
| `parser-serialization` | 4163 | 264 | 0 | 6.3% |
| `real-user-editing` | 9116 | 652 | 0 | 7.2% |
| `common-blocks` | 4905 | 502 | 0 | 10.2% |
| `parser-transform` | 5434 | 602 | 0 | 11.1% |
| `long-session-large-doc` | 4162 | 596 | 0 | 14.3% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7274 | 1348 | 0 | 18.5% |
| `session-lifecycle` | 9621 | 2750 | 0 | 28.6% |
| `media-cross-entity` | 529 | 164 | 0 | 31.0% |
| `three-user-late-join` | 11740 | 3947 | 0 | 33.6% |
| `persistence-no-title` | 4215 | 1605 | 0 | 38.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1183 | 2000 |
| real-user title save/reload next 1000 tier | 636 | 1000 |
| successful real-user-editing records next 1000 tier | 652 | 1000 |
| real-user body save/reload next 1000 tier | 695 | 1000 |

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
the collected graph data is `20260519T030649Z`; it took `9.23` minutes. The
loop finished that review at `2026-05-19T03:16:03Z`, finished feedback action
cycle `422` at `2026-05-19T03:23:46Z`, and then started review cycle
`20260519T032351Z`.

The latest persona synthesis, `20260519T030649Z`, rejects a filing-ready
interpretation. It keeps the Cycle420 replacement split: ready/local through
clean `PR06D`, sidecars `PR02A` and `PR06E`, CRDT through `PR15C`,
`HARNESS-WS-CONFIG-022004` as harness-only, and non-fileable owner queues for
`PR07`, `ENTITY-SERIALIZATION-1000009`, `PERSISTENCE-PARITY-6000007`, and
strict `117126135e5e`. It says the active Cycle420 owner-reduction job is not
complete because `classification.tsv` and `manifest-audit.tsv` are header-only
and `report.md` is missing. Fresh rows put seed `1000009` in the
PR05/parser-entity owner area pending `PR04`/`PR05A` comparison, while seed
`6000007` still keeps reload hydration runtime-gated. The `20260519T030649Z`
feedback-action file applied Cycle422 feedback and generated a passing
`023939Z` ready/base/harness push-manifest audit with `36/36` rows. It still
kept final-stack fuzzing, rebuilt full-stack validation, GitHub filing, PR07
promotion, reload-hydration filing, validation/runtime-gated promotion, and
PR18x naming blocked.

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
`duplicateShareCurrent=0` and current summary startup failures are `0`, with
`headroom=true`. The latest full health sample has quality issues `0`,
warnings `0`, `no_progress=0`, and `424G` free memory. Historical aggregate
duplicate/noise, currently `0.3407`, is context only and is not the live health
signal. Recent load was overloaded in many of the latest 25 windows; the newest
1/5/15-minute load values are `60.33`, `65.82`, and `76.75`, so the 5-minute
and 15-minute windows remain above the `64` logical CPU count, with `6` blocked
tasks.

The duplicate/noise persona loop rejects converting one clean live point into a
durable recovery claim. The latest duplicate/noise synthesis file,
`20260519T031512Z`, is empty; the latest substantive synthesis,
`20260519T030248Z`, says the current leak is stale/late current-run
control-plane state in the novelty monitor, not missing downstream suppression:
producer policy can use stale or null `triageYieldCurrent` while the heartbeat
looks fresh. The newest completed feedback-action file, `20260519T023513Z`,
blocked stale/no-product startup cooldown bypasses, cleared stale bypass state
on output-root changes, added parser-serialization to duplicate-family holds,
required explicit product evidence for stale/no-analysis bypasses, and found no
strict startup jobs launchable on active consumer paths. The next required
duplicate/noise fix is to run fresh current-run triage before producer policy,
persist `triageYieldCurrent` before historical aggregation, and make completed
pass freshness separate from heartbeat freshness.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis, `20260519T030649Z`, keeps the Cycle420 split shape but says
owner reduction is incomplete: `owner-matrix.tsv` has rows, while
`classification.tsv`, `manifest-audit.tsv`, and `report.md` do not yet provide
fileable evidence. Seed `1000009` is now a PR05/parser-entity owner question,
seed `6000007` still runtime-gates reload hydration, seed `1020002` still
blocks final-stack validation and filing, and the latest completed feedback
action applied Cycle422 feedback but did not clear filing or broad final-stack
fuzzing.

The PR-focused queue/blocker graphs make the current waits explicit. Publication
has plenty of nominally ready rows, but the controller is blocking stack-shaped
publication behind PR07C owner proof, PR07B/PR14 repair, duplicate-branch
selection, and diagnostic relaunch cooldowns. The repeated-failure graphs show
where validation work is cycling without new product evidence: deferred
reload/http/pre-save/rich-text heads, PR03B, and pre-oracle PR17/seed-reducer
continuations.

The committed fuzzing graph is browser/e2e-heavy: `29` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. The level-mix persona loop agrees with
browser/e2e concentration and rejects lower-level expansion now; its newest
synthesis says to restore browser capacity first, with a gap-booster port-base
fix and gap-only restart, because browser/e2e was observed below the `24` lane
floor. The feedback action made that fix but was still blocked by severe host
pressure at `15` running browser lanes. Lower-level work is real but narrow in
the committed graph:
unit-property and coverage-guided lower-level are active counters; transport has
historical output but no current counted rate; backend/API, protocol-server,
and standalone `fuzz-assertion` execution counters remain zero. Persona-loop
evidence says native lower-level and protocol-server work has been implemented
and smoke-validated, and assertion work exists, but those outputs have not yet
moved the committed backend/API, protocol-server, or standalone assertion
counters above zero. The next narrow checks are sustained current-output
duplicate/noise health with useful browser materialization, collector-visible
backend/protocol/assertion execution counts, continued lower-level output
accounting, and PR07/owner-reduction closure before any filing or final-stack
claim.
