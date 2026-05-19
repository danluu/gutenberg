# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-19T08:17:24Z`

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
  sample `2026-05-19T08:10:01Z`

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
latest copied current novelty state is sourced from supervisor active run dirs,
has enabled group `novelty-ws-common-blocks`, and reports `1` root, `1` file,
`1` raw no-product assertion-family signature, `0` actionable signatures, no
product-evidence signatures, `0` family-capped signatures, `0` summary
product-evidence records, `1` current summary strict startup failure, and `0`
suppressed strict startup records.

This report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0` and is not the plotted live health signal.

Persona-loop evidence is no longer just a caveat: the latest duplicate/noise
synthesis, `20260519T074321Z`, still rejects treating the noise as a confirmed
RTC product failure. It calls the root cause no-product startup/setup infra
escaping the producer/control-plane boundary, with REST/global-setup discovery
noise still reaching first-level analysis. The latest feedback file,
`20260519T074321Z`, is zero bytes; the latest completed feedback action remains
`20260519T070558Z`, which added a mixed-run strict startup absolute guard in
supervisor and novelty monitor, preserved product evidence, restarted the active
coverage-guided control plane, and verified drain roots. The newer synthesis says
durable recovery still needs a product-evidence-preserving scheduler hard hold
and narrow REST setup source suppression.

The PR-split persona loop rejects filing from the graph alone and requires the
split feedback to stay in force. The latest synthesis, `20260519T075928Z`, keeps
the clean main/CRDT split prefix usable and adds a blocked `PR16-RLH` replay
candidate at `0788a6e3713`, patch-equivalent to the clean reload-hydration
deferred head. It is still not fileable: seed `1020002`, upstream rebase/CI, and
unresolved strict `8fb598778357` / seed `6000007` owner evidence keep final-stack
validation blocked. The latest completed feedback action, `20260519T073322Z`,
updated the split and launched exactly one bounded non-`1020002` strict parity
continuation job. The graph event stream records review cycle
`20260519T075928Z` finishing at `2026-05-19T08:10:15Z`, followed by feedback
cycle `444` starting with no collected finish row yet. The strict owner gap
remains open, so the graph still does not justify raw reload/PR07D publication,
PR16 filing, or broad final-stack fuzzing.

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

The copied current novelty state has no health warnings, uses supervisor active
run dirs, has enabled group `novelty-ws-common-blocks`, and reports
`currentRunDirSource=supervisor-active-run-dirs`. Inline `triageYieldCurrent`
has no product-evidence signatures: `roots=1`, `files=1`,
`rawSignatureCount=1`, `signatureCount=0`, `noProductRawSignatureCount=1`,
`noProductSignatureCount=0`, `actionableSignatureCount=0`,
`knownInfraSignatures=1`, `productEvidenceSignatures=0`,
`familyCappedSignatures=0`, `bootstrapStalls=0`,
`suppressedStrictStartupRecords=0`, `suppressedStrictStartupIdentities=0`,
`summaryProductEvidenceRecords=0`, and `summaryStrictStartupFailures=1`. The
monitor current-output-dir sample remains the plotted live health signal.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-19T08:10:01Z` show bursty CPU and load.
The latest 25 CPU samples range from `72.69%` to `86.99%` utilization, with the
latest sample at `76.51%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `19` windows, five-minute load in `20`,
15-minute load in `25`, and at least one load window exceeded it in `25`. The
newest 1/5/15-minute load sample is `64.52`, `65.02`, and `65.47`; all three
windows are above the `64` logical CPU count. The newest sample has `1`
blocked task.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent live state should be read from supervisor/group snapshots and
lane events rather than from the historical enable log alone; the refreshed
novelty state has enabled group `novelty-ws-common-blocks`, no health warnings,
`currentRunDirSource=supervisor-active-run-dirs`, no current product-evidence
signature, `1` raw no-product assertion-family signature, `0` actionable
signatures, `1` inline current summary strict startup failure, `0` suppressed
strict startup records, and a monitor-level current duplicate share of `0`.

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
`20260519T075952Z`, rejects broad mix reallocation and keeps the target
browser-heavy, with `unit-property`, `coverage-guided-lower-level`,
`backend-api`, `protocol-server`, and `fuzz-assertion` capped at one sentinel
lane each. It says the reported mix overstates useful work because the
coverage-guided browser lane is counted as materialized while still producing
REST discovery failures from the `9540` versus `8889` WordPress base URL
mismatch. The latest completed feedback action, `20260519T070603Z`, made a
targeted change inside the cap: it held the stalled table/query-array
coverage-guided lower-level lane, launched continuous block-parser
serialization, repaired coverage-guided browser materialization, and restarted
backend/API fuzz. That feedback contradicts a graph-only read that backend/API
is inactive, but the committed backend/API execution counter is still `0` and
the latest coverage-guided lower-level rate bucket is also `0`; those launches
should be treated as live persona evidence awaiting collector-visible events.

The latest native-harness synthesis and action, both `20260519T075228Z`, select
and validate the rich-text CRDT merge harness as the first ready isolated JS/V8
coverage-guided lower-level harness, with parser/serialization kept as the
second lane. The latest protocol-server synthesis, `20260519T080137Z`, keeps
`POST /wp-sync/v1/updates` through the HTTP polling REST server as the first
ready protocol/server target; its paired action file is zero bytes, so the
latest substantive protocol action remains `20260519T073654Z`, which implemented
the harness and passed a bounded smoke that emitted `fuzzLevel: "protocol-server"`
events. The committed `protocol-server` execution counter remains `0`. The
latest fuzz-only assertion action, `20260519T034502Z`, added
two gated browser/e2e assertions and restarted the affected loops. Persona-loop
evidence therefore says lower-level, backend/API, protocol-server, and gated
assertion work exist, but the committed `backend-api`, `protocol-server`, and
standalone `fuzz-assertion` execution counters and output metrics have not yet
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

The latest collected execution data has about `6,187,348` completed test
executions: `367,751` browser/e2e, `3,006` transport/integration, `5,368,768`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `536` browser/e2e executions/hour and `896`
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

On that triage-output metric, browser/e2e currently dominates: `790` unique
likely-real findings over about `2,728.8` runner-hours, or `28.95` per 100
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

Current unique bug-output candidate rates are: browser/e2e `6,272` candidates
over `2,728.8` runner-hours (`229.85` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `58.7` runner-hours
(`8.51` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `12528.5` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1222.7` for unit/property.

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
the collected graph data is `20260519T075928Z`; it took `10.78` minutes and
finished at `2026-05-19T08:10:15Z`. Feedback cycle `444` then started with no
collected finish row yet. The most recent completed feedback action remains
cycle `20260519T073322Z`, which finished at `2026-05-19T07:48:50Z` after the
loop logged that wait-only feedback was not independent progress while gate rows
remained actionable.

The latest persona synthesis, `20260519T075928Z`, rejects a filing-ready
graph-only interpretation. It keeps the clean current split prefix and adds a
blocked targeted-replay `PR16-RLH` candidate at `0788a6e3713`, patch-equivalent
to the clean reload-hydration deferred head. `PR16-RLH` is not fileable until
strict replay reaches the final persistence parity oracle and proves distinct
ownership and green behavior for seed `6000007`. Seed `1020002` still blocks
final-stack fuzzing and filing, but not PR16 replay, diagnostic audits, branch
audits, or loop repair. The latest completed feedback action,
`20260519T073322Z`, updated the split and launched one bounded strict parity
continuation owner replay, so the strict owner matrix remains open.

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
memory. The tradeoff is capacity pressure plus current novelty-state no-product
noise: `headroom=false`, and the copied current novelty state reports
`currentRunDirSource=supervisor-active-run-dirs`, a single live common-blocks
group, `1` raw no-product assertion-family signature, no current
product-evidence signature, `1` inline current summary strict startup failure,
and `0` suppressed strict startup records. Historical aggregate duplicate/noise
is currently `0`; it is context only and is not the live health signal. Recent
load was overloaded in all of the latest 25 windows; the newest 1/5/15-minute
load values are `64.52`, `65.02`, and `65.47`, all above the `64` logical CPU
count. The newest sample has `1` blocked task.

The duplicate/noise persona loop rejects converting the cleaner current triage
snapshot into a durable product-bug claim. The latest synthesis,
`20260519T074321Z`, says the issue is no-product startup/setup infra escaping the
producer/control-plane boundary, not a confirmed RTC product regression. The
latest completed feedback action, `20260519T070558Z`, implemented the mixed-run
strict-startup drain in supervisor and novelty monitor, preserved product
evidence, restarted the active coverage-guided control plane, and reported drain
roots. The newer synthesis still asks for no-product hard holds at the
novelty/scheduler boundary plus REST/global-setup source suppression. Treat the
clean graph point as current-output status after a control-plane fix, not proof
that nearby setup, REST discovery, endpoint-mismatch, or runtime-config families
cannot waste work.

The PR-split persona loop rejects filing and broad final-stack fuzzing. The
latest synthesis, `20260519T075928Z`, keeps the clean current prefix usable and
adds a blocked targeted-replay `PR16-RLH` candidate only if strict replay proves
the reload-hydration head is distinct, owned, and green for seed `6000007`.
Feedback cycle `444` has started but has no collected finish row yet, so the
graph does not justify filing, rebuilt stack validation, raw reload promotion,
`PR18x` naming, or broad final-stack fuzzing. The latest completed feedback
updated the split and launched one bounded non-`1020002` strict parity
continuation owner replay, but the active strict owner gap remains open.

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
browser/e2e concentration and rejects broad lower-level expansion. It also
rejects trusting raw lane presence as useful work while the coverage-guided
browser lane may still be infra-only because of the `9540` versus `8889` REST
discovery mismatch. The latest completed feedback retargeted the lower-level
sentinel by holding the stalled table/query-array CRDT lane and launching
block-parser serialization, repaired coverage-guided browser materialization,
and restarted backend/API fuzz. Lower-level work is real but narrow in the
committed graph: unit-property and coverage-guided lower-level are active
counters; transport has historical output but no current counted rate;
backend-api, protocol-server, and standalone `fuzz-assertion` execution counters
remain zero. Persona-loop evidence says native lower-level, backend/API,
protocol-server, and gated assertion work exist, including a smoke-validated
rich-text CRDT merge lower-level target, a running parser lower-level lane, a
restored backend/API lane, a smoke-validated HTTP polling REST protocol/server
harness, and two gated fuzz-only assertions. That contradicts a graph-only "no
backend, protocol, or assertion work exists" read, but those outputs have not
yet moved the committed backend-api, protocol-server, or standalone assertion
counters above zero. The next narrow checks are sustained current-output
duplicate/noise health, useful browser materialization, collector-visible
backend-api, protocol-server, and fuzz-assertion execution counts, continued
lower-level output accounting, and final-stack validation only after the PR
split's owner-replay and gate-repair evidence is accepted by the filing path.
