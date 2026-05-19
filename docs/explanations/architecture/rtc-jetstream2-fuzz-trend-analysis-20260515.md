# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T07:42:39Z`

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
  sample `2026-05-19T07:40:03Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving, but the active coverage-output root rolled
over after the `2026-05-19T04:53:01Z` sample. Across `2333` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-19T06:04:39Z`, the historical
coverage-file maximum was `56184`; the new current-output root first appeared
at `20` files and is now at `36`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted duplicate/noise sample is clean on the monitor's
current-output-dir metric: monitor-pass current summary startup failures are
`0` and `duplicateShareCurrent=0`. The immediately preceding sample briefly showed
`duplicateShareCurrent=1`, so the clean point should be read as current status,
not durable recovery. The latest monitor pass has `0` quality issues, `0`
warnings, `413.5G` free memory, `no_progress=1`, and `headroom=false`. The
latest copied current novelty state is sourced from supervisor active startup
dirs, has enabled group `novelty-ws-block-gauntlet`, and reports `1` root, `0`
files, `0` raw signatures, no actionable product-evidence signatures, `0`
family-capped signatures, `0` summary product-evidence records, `0` current
summary strict startup failures, and `0` suppressed strict startup records.

This report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0` and is not the plotted live health signal.

Persona-loop evidence is no longer just a caveat: the latest duplicate/noise
synthesis, `20260519T070558Z`, still calls the root cause producer/control-plane
startup noise rather than a confirmed RTC product bug, and its feedback action
implemented the bounded control-plane fix. The patch added a mixed-run strict
startup absolute guard in supervisor and novelty monitor, preserved product
evidence, restarted the active coverage-guided control plane, and verified the
current drain roots wrote `.triage-watcher/no-analysis.json`,
`paused-startup-stall`, and `activeRunDirs=0`. The remaining risk is isolated
runner-side endpoint-mismatch recheck waste before the supervisor drain observes
the family.

The PR-split persona loop rejects filing from the graph alone and requires the
split feedback to stay in force. The latest synthesis, `20260519T072342Z`, uses
the Cycle436/Cycle440 replacement topology, refreshed by the nonzero
`20260519T071606Z` finalization refs for branch hygiene only. It says
final-stack fuzzing, GitHub filing, and full-stack validation remain blocked by
seed `1020002`, ownerless strict persistence parity `8fb598778357` / seed
`6000007`, upstream rebase/CI, and unresolved diagnostic queues. It rejects
reviving `PR07 -> PR17 -> PR18/PR18x`, raw PR07D, stale PR15D/PR05E, raw
reload-hydration heads, fallback/PR15-tail PR05D, and strict residuals named
`PR18x` before owner comparison. The latest completed feedback action,
`20260519T070410Z`, kept that split active, kept strict `8fb598778357`
ownerless, patched the progress-gate family matcher, completed one bounded
family-binding patch job with row-bearing tests, and deferred final-stack
fuzzing, filing, raw reload promotion, `PR18x` naming, and product-code edits.
The graph event stream records review cycle `20260519T072342Z` finishing at
`2026-05-19T07:33:17Z`, then cycle `20260519T073322Z` starting with no
collected finish row yet. The active `20260519T073109Z` finalization report is
zero bytes and is not evidence. The strict owner gap remains open, so the graph
still does not justify raw reload/PR07D publication.

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
The top facet shows the prior coverage-output root reaching `56184` files before
the active output root reset; the latest current-output sample is `36` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and monitor-pass summary startup failures: `duplicateShareCurrent=0`, current
summary startup failures `0`, quality issue count `0`, warning count `0`, free
memory `413.5G`, `no_progress=1`, and `headroom=false`. The health graph does
not use historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state has no health warnings, uses startup-source
active run dirs, has enabled group `novelty-ws-block-gauntlet`, and reports
`currentRunDirSource=supervisor-active-run-dirs-startup`. Inline
`triageYieldCurrent` has no raw endpoint-mismatch signature and no actionable
current product-evidence signatures: `roots=1`, `files=0`, `rawSignatureCount=0`,
`signatureCount=0`, `actionableSignatureCount=0`,
`productEvidenceSignatures=0`, `familyCappedSignatures=0`,
`bootstrapStalls=0`, `suppressedStrictStartupRecords=0`,
`suppressedStrictStartupIdentities=0`, `summaryProductEvidenceRecords=0`, and
`summaryStrictStartupFailures=0`. The monitor current-output-dir sample remains
the plotted live health signal.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T07:40:03Z` show bursty CPU and load.
The latest 25 CPU samples range from `71.11%` to `86.99%` utilization, with the
latest sample at `72.69%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `19` windows, five-minute load in `20`,
15-minute load in `23`, and at least one load window exceeded it in `23`. The
newest 1/5/15-minute load sample is `67.76`, `62.96`, and `71.01`; the one- and
15-minute windows are above the `64` logical CPU count, while the five-minute
window is just below it. The newest sample has `6` blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has enabled group `novelty-ws-block-gauntlet`, no health
warnings, `currentRunDirSource=supervisor-active-run-dirs-startup`, no current
actionable product-evidence signature, `0` inline current summary strict startup
failures, `0` suppressed strict startup records, and a monitor-level current
duplicate share of `0`.

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

Persona-loop evidence adds important caveats. The latest level-mix synthesis,
`20260519T070603Z`, rejects a broad mix change and keeps the target
browser-heavy, with `unit-property`, `coverage-guided-lower-level`,
`backend-api`, `protocol-server`, and `fuzz-assertion` capped at one sentinel
lane each. It treats the next action as browser repair: validate useful browser
lanes and endpoint-mismatch growth, fix the WS runtime-config issue if it is
still active, restart only coverage-guided materialization for that repair, and
run strict backfill only if two polls show fewer than `24` useful browser lanes
and admission allows it. The latest feedback-action file, `20260519T070603Z`,
is empty; the last substantive feedback, `20260519T062556Z`, held the
browser-heavy mix, launched no lower-level expansion and no browser restart, and
reported direct browser-lane polls moving `23 -> 24 -> 26`, a transient
admission sample at `22` under `severe_pressure`, then a direct poll back to
`24`. The graph-visible `28` browser/e2e lanes should not be read mechanically
as `28` useful materialized browser lanes.

The latest native-harness synthesis, `20260519T072705Z`, still picks
coverage-guided lower-level rich-text multiblock as the first ready isolated
harness and explicitly frames it as a JS/V8 coverage-guided harness, not C/C++
libFuzzer or AFL. The latest completed native action, `20260519T065610Z`,
implemented and smoke-validated that rich-text multiblock coverage-guided
lower-level harness, emitted `fuzzLevel: "coverage-guided-lower-level"`
root/lane events, reported `342` coverage keys and `107` feature keys, and did
not start a duplicate continuous lane because an operational hold remains active
while the table/query-array lower-level lane continues running. The latest
protocol-server synthesis, `20260519T072732Z`, keeps `POST
/wp-sync/v1/updates` through the HTTP polling REST server as the first
protocol/server target rather than the test WebSocket relay. Its latest
completed action, `20260519T071051Z`, reports the protocol/server harness in
place, with root/lane `events.ndjson`, `fuzzLevel: "protocol-server"`
supervisor metadata, and validation passing `node --check`, `bash -n`, PHP
lint, `git diff --check`, Prettier, PHPCS, a PHPUnit preflight, and one bounded
seed x 20 cases smoke run classified `pass`. It left the protocol current-run
pointer unchanged. The latest fuzz-only assertion action, `20260519T034502Z`,
added two gated browser/e2e assertions and restarted the affected loops. This
persona evidence contradicts a graph-only read that no protocol or assertion
work exists, but the committed `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` execution counters and output metrics have not yet moved above
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

The latest collected execution data has about `6,172,492` completed test
executions: `361,247` browser/e2e, `3,006` transport/integration, `5,360,416`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `8,936` browser/e2e executions/hour and `11,648`
unit-property executions/hour, with `0` current counted rate for
coverage-guided-lower-level, transport/integration, backend-api,
protocol-server, and standalone `fuzz-assertion`.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` remain at `0`
cumulative executions in this counter despite persona-loop evidence for
protocol-server and assertion work. The committed graph data does not yet show
backend-api, protocol-server, or standalone assertion rows above zero.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `790` unique
likely-real findings over about `2,715.3` runner-hours, or `29.09` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,271` candidates
over `2,715.3` runner-hours (`230.95` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `58.2` runner-hours
(`8.60` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `12351.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1234.5` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4135 | 163 | 0 | 3.9% |
| `revision-persistence` | 6985 | 289 | 0 | 4.1% |
| `parser-serialization` | 4209 | 268 | 0 | 6.4% |
| `real-user-editing` | 9193 | 652 | 0 | 7.1% |
| `common-blocks` | 4949 | 507 | 0 | 10.2% |
| `parser-transform` | 5488 | 610 | 0 | 11.1% |
| `long-session-large-doc` | 4243 | 596 | 0 | 14.0% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7331 | 1353 | 0 | 18.5% |
| `session-lifecycle` | 9662 | 2750 | 0 | 28.5% |
| `media-cross-entity` | 536 | 164 | 0 | 30.6% |
| `three-user-late-join` | 11810 | 3947 | 0 | 33.4% |
| `persistence-no-title` | 4296 | 1672 | 0 | 38.9% |

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
the collected graph data is `20260519T072342Z`; it took `9.58` minutes and
finished at `2026-05-19T07:33:17Z`. Cycle `20260519T073322Z` then started with
no collected finish row yet.

The latest persona synthesis, `20260519T072342Z`, rejects a filing-ready
graph-only interpretation and keeps the Cycle436/Cycle440 main, CRDT, and
harness split as the consensus replacement shape, refreshed by the nonzero
`071606Z` finalization refs for branch hygiene only. It says seed `1020002`
still blocks final-stack fuzzing and filing, strict `8fb598778357` / seed
`6000007` is still likely-real but ownerless, upstream rebase/CI remain, and
diagnostic queues are unresolved. It rejects reviving
`PR07 -> PR17 -> PR18/PR18x`, raw PR07D, stale PR15D/PR05E, raw
reload-hydration heads, fallback/PR15-tail PR05D, and strict residuals named
as PR18x before owner comparisons. The latest completed feedback action,
`20260519T070410Z`, kept that split active, kept strict `8fb598778357`
ownerless, patched the progress-gate family matcher so pre-save artifacts cannot
satisfy reload-hydration rows, and completed one bounded family-binding patch
job with row-bearing tests. It deferred rich-text suffix hardening, duplicate
strict work, final-stack fuzzing, GitHub filing, raw reload promotion, `PR18x`
naming, and product-code edits, so the strict owner matrix remains open. The
active `20260519T073109Z` finalization report is zero bytes and is not evidence.

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
health graph now reads clean on the monitor's current-output duplicate/noise
sample: `duplicateShareCurrent=0` and monitor-pass summary startup failures are
`0`, with quality issues `0`, warnings `0`, `no_progress=1`, and `413.5G` free
memory. The tradeoff is capacity pressure plus current novelty-state startup
noise: `headroom=false`, and the copied current novelty state reports
`currentRunDirSource=supervisor-active-run-dirs-startup`, a single live
block-gauntlet group, no actionable current product-evidence signature,
`0` inline current summary strict startup failures, `0` suppressed strict startup
records, and no raw endpoint-mismatch signature. Historical
aggregate duplicate/noise is currently `0`; it is context only and is not the
live health signal. Recent load was overloaded in most of the latest 25
windows; the newest 1/5/15-minute load values are `67.76`, `62.96`, and
`71.01`, so the one- and 15-minute windows are above the `64` logical CPU
count. The newest sample has `6` blocked tasks.

The duplicate/noise persona loop rejects converting the cleaner current triage
snapshot into a durable product-bug claim. The latest synthesis,
`20260519T070558Z`, still says the issue is producer/control-plane startup
noise, not a confirmed RTC product regression, and the matching feedback action
implemented the requested mixed-run strict-startup drain in supervisor and
novelty monitor. It preserved product evidence, restarted the active
coverage-guided control plane, and reported current drain roots with
`.triage-watcher/no-analysis.json`, `paused-startup-stall`, `activeRunDirs=0`,
no actionable signatures, and no active analysis/deep-analysis session. Treat
the clean graph point as current-output status with a fresh control-plane fix,
not proof that runner-side endpoint-mismatch rechecks cannot waste work before
the supervisor drain observes the family.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis, `20260519T072342Z`, keeps the Cycle436/Cycle440 main, CRDT,
and harness split as the consensus replacement shape, branch-hygiene refreshed
by `071606Z`, but says seed `1020002` still blocks final-stack fuzzing and
filing, strict `8fb598778357` / seed `6000007` is likely-real but still
ownerless, upstream rebase/CI remain, and unresolved diagnostic queues still
block full-stack validation. It rejects reviving `PR07 -> PR17 -> PR18/PR18x`,
raw PR07D, stale PR15D/PR05E, raw reload-hydration heads, fallback/PR15-tail
PR05D, and strict residuals named as PR18x before owner comparisons. The latest
applied feedback kept the split unchanged, kept `8fb598778357` ownerless,
patched the progress-gate family matcher, completed one bounded family-binding
patch job with row-bearing tests, and deferred final-stack fuzzing, filing, raw
reload promotion, `PR18x` naming, and product-code edits. The active strict
owner gap remains open.

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
browser/e2e concentration and rejects lower-level expansion now. Its latest
synthesis leaves lower-level, backend-api, protocol-server, and fuzz-assertion
work as capped sentinels while asking for browser repair only if lane and endpoint-noise
checks justify it; the latest feedback-action file is empty and the last
substantive feedback reported a direct browser recovery to `24` while admission
remained blocked by `severe_pressure`. Lower-level work is real but narrow in
the committed graph: unit-property and coverage-guided lower-level are active
counters; transport has historical output but no current counted rate;
backend-api, protocol-server, and standalone `fuzz-assertion` execution counters
remain zero. Persona-loop evidence says native lower-level, protocol-server, and
gated assertion work exist, including a newly validated protocol-server harness,
a smoke-validated rich-text multiblock lower-level harness, and two gated
fuzz-only assertions, contradicting a graph-only "no protocol or assertion work
exists" read. Those outputs have not yet moved the committed backend-api,
protocol-server, or standalone assertion counters above zero, partly because the
latest protocol validation left its current-run pointer unchanged. The next
narrow checks are sustained current-output duplicate/noise health, useful
browser materialization, collector-visible backend-api, protocol-server, and
fuzz-assertion execution counts, continued lower-level output accounting, and final-stack
validation only after the PR split's owner-replay and gate-repair evidence is
accepted by the filing path.
