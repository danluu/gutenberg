# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T05:18:37Z`

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
  sample `2026-05-19T05:10:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2322` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-19T04:53:01Z`, coverage files grew from
`272` to `56184`, a delta of `55912`. The monitor's visible likely-real maximum
remains `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted duplicate/noise sample is clean on the monitor's
current-output-dir metric: current summary startup failures are `0` and
`duplicateShareCurrent=0`. The latest monitor pass has `0` quality issues, `0`
warnings, `413.8G` free memory, `no_progress=0`, and `headroom=false`. The
latest copied current novelty state has one current run dir under
`novelty-ws-permissions-auth-locks`, no health warnings, `1` raw signature, `1`
canonical signature, `1` actionable signature, `1` product-evidence signature,
`2` summary product-evidence records, and `1` summary strict startup failure in
current triage. This report uses current-output duplicate/noise and summary
startup failures for live health. Historical aggregate duplicate/noise is
context only; its latest duplicate share is `0.3404` and is not the plotted live
health signal.

Persona-loop evidence still rejects reading the clean duplicate/noise point as
durable recovery, but the latest feedback did close the immediate supervisor
leak. The latest duplicate/noise synthesis, `20260519T045255Z`, says strict
no-product `pre_action_bootstrap_stall` was mostly gated before triage and
analysis, while producer scheduling could still re-feed noisy groups through
seed-drain recovery and output-root changes. The matching feedback action
patched supervisor recovery so no-product strict startup drains pause through
cooldown instead of immediately relaunching, restarted the active supervisor,
and left product-evidence families visible. The remaining risk is novelty
bootstrap/materialization re-admitting historical startup-noise groups, not a
reason to suppress product-evidence families such as
`reload_rejoin_awareness_stall`.

The PR-split persona loop rejects filing from the graph alone and requires the
split feedback to stay in force. The latest synthesis and feedback action,
`20260519T045950Z`, keep the Cycle428 replacement split as current, record `35`
non-base `044015Z` rows in the latest local publish manifest, and keep reload
hydration as non-fileable evidence pending owner replay. Seed `1020002` still
blocks final-stack fuzzing, rebuilt validation, GitHub filing, and its own
proof/reclassification, while the feedback launched bounded reload-hydration
owner replay and loop-progress repair jobs.

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
The top facet shows continued coverage-file growth to `56184` files. Dense
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
`413.8G`, `no_progress=0`, and `headroom=false`. The health graph does not use
historical aggregate duplicate/noise as the plotted live signal.

The copied current novelty state has enabled group
`novelty-ws-permissions-auth-locks`, one active current run dir under that
group, no health warnings, and inline `triageYieldCurrent` with
`rawSignatureCount=1`, `signatureCount=1`, `actionableSignatureCount=1`,
`productEvidenceSignatures=1`, `familyCappedSignatures=0`, `bootstrapStalls=0`,
`suppressedStrictStartupIdentities=1`, `summaryStrictStartupFailures=1`,
`summaryProductEvidenceRecords=2`, and `topDuplicateFamilyShare=1` on a
product-evidence family. This is still much cleaner than the historical
aggregate for no-product startup noise, but the persona-loop synthesis rejects
treating it as a durable capacity recovery claim.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T05:10:01Z` show bursty CPU and load.
The latest 25 CPU samples range from `55.08%` to `91.77%` utilization, with the
latest sample at `75.82%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `13` windows, five-minute load in `16`,
15-minute load in `20`, and at least one load window exceeded it in `20`. The
newest 1/5/15-minute load sample is `64.16`, `66.01`, and `67.82`; all three
load windows are now just above the `64` logical CPU count. The latest sample
has `2` blocked tasks.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has enabled group `novelty-ws-permissions-auth-locks`, one active
current run dir under that group, no health warnings, inline current-run triage
with one actionable product-evidence signature, two product-evidence summary
records, one summary strict startup failure, and a monitor-level current
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

Persona-loop evidence adds important caveats. The latest level-mix synthesis and
feedback action, `20260519T045601Z`, reject lower-level expansion and keep the
target browser-heavy: `browser-e2e >= 24` useful lanes, with lower-level,
backend/API, protocol, and fuzz-assertion capacity held to sentinels. The
feedback did not edit files or restart lanes because live browser materialization
recovered from `23` to `26` useful lanes with `zeroDirRunning=[]`. The
persona-loop outputs agree that the graph-visible `28` browser/e2e lanes should
not be read mechanically as `28` useful materialized browser lanes.

The latest native-harness synthesis, `20260519T050125Z`, still picks rich-text
CRDT multiblock as the first isolated lower-level target and explicitly frames
it as a Node/V8 coverage-guided harness, not C/C++ libFuzzer or AFL. The latest
non-empty native action, `20260519T044323Z`, implemented and smoke-validated
that harness but left the continuous lane on its existing operational hold. The
latest protocol-server synthesis, `20260519T050624Z`, still targets
`POST /wp-sync/v1/updates` through the HTTP polling REST server rather than the
test WebSocket relay; its matching action file is empty, so it adds no new
collector-visible execution. The latest fuzz-only assertion action,
`20260519T034502Z`, added two gated browser/e2e assertions and restarted the
affected loops. This persona evidence contradicts a graph-only read that no
protocol or assertion work exists, but the committed `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` trend counters have not yet
moved above zero.

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

The latest collected execution data has about `6,111,429` completed test
executions: `334,808` browser/e2e, `3,006` transport/integration, `5,325,792`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `1,780` browser/e2e executions/hour and `2,560`
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

On that triage-output metric, browser/e2e currently dominates: `788` unique
likely-real findings over about `2,655.8` runner-hours, or `29.67` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,231` candidates
over `2,655.8` runner-hours (`234.62` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `55.8` runner-hours
(`8.96` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `11636.4` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1286.8` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 4122 | 163 | 0 | 4.0% |
| `revision-persistence` | 6955 | 289 | 0 | 4.2% |
| `parser-serialization` | 4194 | 268 | 0 | 6.4% |
| `real-user-editing` | 9158 | 652 | 0 | 7.1% |
| `common-blocks` | 4935 | 507 | 0 | 10.3% |
| `parser-transform` | 5473 | 610 | 0 | 11.1% |
| `long-session-large-doc` | 4214 | 596 | 0 | 14.1% |
| `structure` | 541 | 96 | 0 | 17.7% |
| `block-gauntlet` | 7316 | 1353 | 0 | 18.5% |
| `session-lifecycle` | 9646 | 2750 | 0 | 28.5% |
| `media-cross-entity` | 529 | 164 | 0 | 31.0% |
| `three-user-late-join` | 11779 | 3947 | 0 | 33.5% |
| `persistence-no-title` | 4282 | 1662 | 0 | 38.8% |

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
the collected graph data is `20260519T045031Z`; it took `9.23` minutes and
finished at `2026-05-19T04:59:45Z`. The next review cycle
`20260519T045950Z` had started but not finished in the graph event stream, but
its persona synthesis and feedback files are present in the collected inputs.

The latest persona synthesis, `20260519T045950Z`, rejects a filing-ready
graph-only interpretation and keeps the Cycle428 replacement split as current.
It records `35` non-base `044015Z` rows from the latest local publish manifest,
keeps reload hydration as non-fileable evidence pending owner replay, and says
seed `1020002` blocks final-stack fuzzing, rebuilt validation, GitHub filing,
and its own proof/reclassification. The latest feedback action appended the
Cycle430 note to the active split file and launched bounded reload-hydration
owner replay plus loop-progress gate repair. Raw reload/PR07D filing, PR05E,
PR17, PR18, PR18x, and stale PR15D remain non-fileable.

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
`0`, with quality issues `0`, warnings `0`, `no_progress=0`, and `413.8G` free
memory. The tradeoff is capacity pressure: `headroom=false`, and the copied
current novelty state reports `summaryStrictStartupFailures=1`,
`familyCappedSignatures=0`, `productEvidenceSignatures=1`, `1` suppressed
strict-startup identity, and `2` summary product-evidence records. Historical
aggregate duplicate/noise, currently `0.3404`, is context only and is not the
live health signal. Recent load was overloaded in many of the latest 25 windows;
the newest 1/5/15-minute load values are `64.16`, `66.01`, and `67.82`, so all
three load windows are just above the `64` logical CPU count. The latest sample
has `2` blocked tasks.

The duplicate/noise persona loop rejects converting the cleaner current triage
snapshot into a durable recovery claim. The latest synthesis,
`20260519T045255Z`, identified producer-side startup-noise recovery as the leak;
the matching feedback action patched supervisor recovery, verified strict
startup records were suppressed and not queued for triage/analysis, and
restarted the active supervisor. Treat the clean graph point as current-root
status plus an applied supervisor fix, not proof that novelty admission can no
longer rematerialize historical startup-noise groups. Do not broaden suppression
to product-evidence duplicate families.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis and feedback action, `20260519T045950Z`, keep Cycle428 as the
current split, record `35` non-base locally published rows, launch bounded
reload-hydration owner replay and loop-progress gate repair, and still block
final-stack fuzzing, rebuilt validation, GitHub filing, raw reload/PR07D filing,
and seed `1020002`.

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
browser/e2e concentration and rejects lower-level expansion now. The latest
feedback saw live useful browser lanes recover to `26`, so it made no restart
and left lower-level, backend/API, protocol, and fuzz-assertion work as capped
sentinels. Lower-level work is real but narrow in the committed graph:
unit-property and coverage-guided lower-level are active counters; transport has
historical output but no current counted rate; backend/API, protocol-server,
and standalone `fuzz-assertion` execution counters remain zero. Persona-loop
evidence says native lower-level, protocol-server planning, and gated assertion
work exist, contradicting a graph-only "no protocol or assertion work exists"
read, but those outputs have not yet moved the committed backend/API,
protocol-server, or standalone assertion counters above zero. The next narrow
checks are sustained current-output duplicate/noise health, useful browser
materialization, collector-visible backend/protocol/assertion execution counts,
continued lower-level output accounting, and final-stack validation only after
the PR split's owner-replay and gate-repair evidence is accepted by the filing
path.
