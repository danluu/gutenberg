# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T16:13:41Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T16:09:33Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2030` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T16:09:33Z`, coverage files grew from `272` to `46137`, a delta of
`45865`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `7` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample is no longer clean
on the live duplicate counter: `duplicateShareCurrent` is `0.5`, while current
summary startup failures are `0`. The same monitor pass has `0` quality issues,
`0` warnings, a false headroom flag, and `417.8G` free memory. This report
treats current-output-dir duplicate/noise and summary startup failure metrics
as live graph status; historical aggregate duplicate/noise is only context. The
latest historical aggregate duplicate share is `0.3453`, but it is not used as
the plotted live health signal.

Persona-loop evidence rejects treating product-evidence failures as infra
noise. The newest duplicate/noise synthesis, `20260517T154741Z`, says the
remaining issue is a control-plane contract failure for strict no-product
startup/discovery/readiness stalls, not a product regression and not just bad
reporting. It recommends enforcing the no-analysis bootstrap-stall invariant at
producer, triage, analysis, and live-monitor boundaries while preserving any
record with product evidence. The matching latest feedback-action file is
empty, so no newer applied fix supersedes that synthesis in the collected
persona inputs.

The newest PR-split synthesis, `20260517T155857Z`, rejects a filing-ready or
final-stack-fuzz-ready interpretation. It says the active Cycle 280 topology is
mostly right but `PR07B` should be split into `PR07B0` saved-response hydration
and `PR07B1` stale base-record/title filtering, then the manifest should be
refreshed because the `2026-05-17T15:43:25Z` Cycle 280 manifest is stale
against the `2026-05-17T15:53:11Z` deferred queue. It keeps `PR06B` and `PR07C`
as sidecars after `PR07B1`, rejects raw deferred refs as filing refs, and keeps
`PR07D`, `PR17`, `PR18`, and `PR18x` absent from current evidence. The latest
nonempty feedback-action, `20260517T152820Z`, had reported a completed Cycle
280 manifest refresh, but the newer synthesis rejects that as current filing
authority. Broad final-stack fuzzing, filing, GitHub push decisions, and
stack-wide validation remain deferred.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `7`
after restarts, expansion, and auto-ratcheting. The top facet shows continued
coverage-file growth. Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted current-output-dir sample has `duplicateShareCurrent=0.5`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `417.8G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state lists one enabled group:
`novelty-ws-common-blocks`. The latest duplicate/noise synthesis rejects broad
product-evidence suppression. It says strict startup noise still needs one
shared control-plane invariant before analysis can queue or launch, while
product-evidence records must remain visible. With the refreshed current
duplicate share at `0.5`, startup failures at `0`, and headroom false, live
status is mixed rather than green even though the latest quality and warning
counters are clean.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T16:10:03Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `35.9%` to `78.6%` utilization, with the latest sample at
`71.2%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `3` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `12`. The newest 1/5/15-minute load sample is `64.69`, `71.16`,
and `65.05` against `64` logical CPUs; the prior `2026-05-17T16:00:02Z` sample
was `103.49`, `78.18`, and `61.64`. Raw memory remains ample,
but the latest monitor headroom flag is false. Current duplicate share is
`0.5`, current startup failures are `0`, and the latest monitor sample has `0`
warnings and `0` quality issues.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-common-blocks`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0.5` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis calls the remaining problem a
shared-invariant failure for no-product bootstrap stalls before analysis
queueing/launch, not a reason for broad product-evidence suppression. The
refreshed startup, warning, and quality counters are clean, but current
duplicate share, headroom, and load are not clean, so the graph supports a mixed
live-health read.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `31` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes.
Lower-level targets visible in the graph are `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain `0` in the
committed graph counters.

The newest collected level-mix synthesis, `20260517T152209Z`, rejects adding
lower-level capacity this cycle. It says browser/e2e is under-materialized
(`20 < 24` live lanes in its audit), recommends focused browser backfill, and
keeps `coverage-guided-lower-level=2`, `unit-property=1`, and `backend-api`,
`protocol-server`, and fuzz-only assertion accounting at `0` until audited. The
matching feedback-action is nonempty: it raised focused browser shard
allocation, recreated the focused/strict/gap supervisor and watchdog sessions,
audited `25` live browser lanes twice, and regenerated context reporting
`browser-e2e: 24 lane(s)` with no current telemetry invariant failure. That
persona evidence rejects adding lower-level capacity, but it also says the
browser/e2e floor was restored after the graph-visible under-materialization.
The graph's `31` plotted browser/e2e lanes are supervisor-history telemetry, so
live mix decisions still need current-root PID/accounting evidence. The latest
execution bucket has current rate only for browser/e2e and `unit-property`;
`coverage-guided-lower-level` has a plotted lane and historical cumulative
executions but `0` current counted executions.

The latest native synthesis, `20260517T140513Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The `20260517T134230Z`
native action validated direct and bounded tmux smoke event accounting. The
newest protocol-server synthesis, `20260517T155927Z`, keeps the HTTP polling
REST protocol/server harness ahead of WebSocket relay fuzzing and repeats the
root/lane `events.ndjson` accounting needed for trend collectors. The
`20260517T154706Z` action reports that the protocol/server harness was
implemented and that a bounded 2-seed x 13-case validation passed with root and
lane `fuzzLevel:"protocol-server"` events. The refreshed graph still has `0`
counted `protocol-server` executions. This report therefore treats the protocol
work as harness evidence while leaving live protocol-server trend status at `0`
until collector-visible counts appear. `backend-api` remains blocked/`0`. The
latest fuzz-only assertion apply file reports browser/editor diagnostics and
loop restarts, but standalone fuzz-only assertion work remains `0` in the
graph.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit these
lane events. Lower-level counts reconstructed from batch metadata or legacy
batch-count fields are approximate.

The latest collected execution data has about `5,297,073` completed test
executions: `105,508` browser/e2e, `3,006` transport/integration, `4,760,224`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T16:00:00Z`, reports about `720` browser/e2e test
executions/hour, `6,400` unit-property executions/hour, and `0` for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone fuzz-assertion. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` levels remain at `0`
cumulative executions in this counter.
The summary still flags approximate execution rows somewhere in the history, so
lower-level totals reconstructed from batch metadata or legacy batch-count
fields should be read as approximate.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only, not total bug-finding
graphs. They count only non-duplicate `.triage-watcher/**/result.json` rows
classified `likely_real` per 100 runner-hours, deduped by canonical bug key and
attributed to the failure first-seen time. The compute proxy is summed runner
wall-clock `durationMs` from lane `events.ndjson`, reported as runner-hours.
This is best interpreted as per-runner triage-output efficiency, not per-core
efficiency and not all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates:
`576` unique likely-real outputs over about `1,857.4` runner-hours, or `31.01`
likely-real outputs per 100 runner-hours. `transport-integration`,
`unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` still have `0` triaged
likely-real outputs in the collected triage rows. That does not prove the
lower-level lanes are unproductive; it means their findings have not yet flowed
through the same non-duplicate likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The two unique bug-output candidate plots are the broader effectiveness view.
They dedupe by canonical output key and include non-infra likely-real/uncertain
triage rows, untriaged raw browser or transport failure signatures, and
lower-level assertion failures. Obvious infra, harness, and no-product-output
classifications are excluded from the candidate count. This is intentionally
broader than confirmed bugs and narrower than raw failed attempts; untriaged
candidates are not confirmed bugs and still need follow-up before being treated
as maintainer-ready bugs.

Current unique bug-output candidate rates are: browser/e2e `5,158` candidates
over `1,857.4` runner-hours (`277.70` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `22.6` runner-hours
(`17.71` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within-level candidate output is still dominated by browser/e2e raw signatures,
with transport/integration also producing a visible raw-signature stream. The
lower-level lanes now show nonzero assertion-output candidates, but the counts
are small because those lanes are much newer and still lack the same mature
promotion path into `.triage-watcher` likely-real results.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `4,485.6` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,368.1` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, cumulative likely-real triage output now spans multiple
profiles, led by session lifecycle, three-user late join, permissions/auth/locks,
and real-user editing. The broader unique-output candidate view is led by
three-user late join, session lifecycle, real-user editing, and
revision persistence, with coverage-guided lower-level and unit/property each
showing small nonzero candidate totals. Lower-level and transport lanes should
continue to be judged partly by the unique-output candidate graphs until their
triage pipeline is producing comparable likely-real and non-duplicate results.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. The scatter uses records seen on the x-axis, completion rate
on the y-axis, startup-failure rate as point size, and unmet success goals as
triangle markers. Low-completion profiles are the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 3272 | 109 | 0 | 3.3% |
| `revision-persistence` | 4515 | 161 | 0 | 3.6% |
| `parser-serialization` | 3277 | 162 | 0 | 4.9% |
| `real-user-editing` | 6932 | 561 | 0 | 8.1% |
| `parser-transform` | 4198 | 420 | 0 | 10.0% |
| `common-blocks` | 4045 | 418 | 0 | 10.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6213 | 1148 | 0 | 18.5% |
| `long-session-large-doc` | 2874 | 554 | 0 | 19.3% |
| `persistence-no-title` | 3240 | 830 | 0 | 25.6% |
| `session-lifecycle` | 8062 | 2425 | 0 | 30.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 475 | 1000 |
| action reload-post-action next 2000 tier | 1014 | 2000 |
| real-user body save/reload next 1000 tier | 534 | 1000 |
| successful real-user-editing records next 1000 tier | 561 | 1000 |
| action ui-format-paragraph next 2000 tier | 1463 | 2000 |
| real-user title save/reload next 500 tier | 475 | 500 |
| action ui-heading-shortcut next 1000 tier | 998 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, real-user UI,
payload-size, transport, profile, step-count, initial-content, and
media/cross-entity observations. Raw volume is still heavy in transport,
collaborator, payload-size, revision, autosave, fault, initial-content, reload,
save, and step-count observations. That is the right shape for RTC data-loss
work because the harness observes both semantic state transitions and
low-level block/action combinations. The plot separates breadth (`keys`) from
repeated observations (`total_count`) so broad coverage is not hidden inside raw
event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

With the live loop at `max_parallel=6`, the last 20 completed review cycles
took roughly `6.9` to `12.3` minutes in this snapshot; the latest completed
review, `20260517T155857Z`, took `9.1` minutes. The newest completed window
includes `20260517T144650Z` from
`2026-05-17T14:46:50Z` to `2026-05-17T14:54:51Z`, `20260517T145456Z` from
`2026-05-17T14:54:56Z` to `2026-05-17T15:01:50Z`, `20260517T151727Z` from
`2026-05-17T15:17:27Z` to `2026-05-17T15:28:15Z`, `20260517T152820Z` from
`2026-05-17T15:28:20Z` to `2026-05-17T15:37:45Z`, and `20260517T154634Z` from
`2026-05-17T15:46:34Z` to `2026-05-17T15:58:52Z`, plus `20260517T155857Z` from
`2026-05-17T15:58:57Z` to `2026-05-17T16:08:04Z`.

The newest PR-split synthesis, `20260517T155857Z`, says the split is still
blocked and is not filing-ready or final-stack-fuzz-ready. It replaces the
opaque `PR07A -> PR07B -> PR09` chain with
`PR07A -> PR07B0 -> PR07B1 -> PR09`: `PR07B0` is saved CRDT response hydration,
and `PR07B1` is stale base-record/title filtering. It keeps `PR06B` and `PR07C`
as sidecars after `PR07B1`, rejects raw deferred refs as filing refs, and keeps
`PR07D`, `PR17`, `PR18`, and `PR18x` absent unless fresh replay proves
non-coverage. The latest nonempty feedback-action, `20260517T152820Z`, had
reported a completed Cycle 280 manifest refresh after the deferred queue with
all `34` active rows verified. The newer synthesis rejects treating that as
current filing authority because the publication evidence is stale relative to
the `2026-05-17T15:53:11Z` deferred queue and later reload-hydration report.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T15:59:33Z`, has `15`
suggested rows totaling `8022` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 6` (`732`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `7`. The latest plotted
current-output-dir duplicate/startup sample is mixed: `duplicateShareCurrent`
is `0.5`, current summary startup failures are `0`, warnings and quality issues
are `0`, the headroom flag is false, and free memory is `417.8G`. The copied
novelty state has one enabled coverage-guided browser group:
`novelty-ws-common-blocks`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
The latest duplicate/noise synthesis, `20260517T154741Z`, says strict no-product
startup stalls are a control-plane invariant problem across producer,
supervisor, triage, analysis, and live monitor boundaries. The latest matching
feedback-action is empty, so this report treats that synthesis as the current
persona-loop status. The refreshed graph agrees that current startup, warning,
and quality counters are clean, but it does not support a fully green health
read because current duplicate share, headroom, and load are not clean.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T155857Z`, says the active Cycle 280
topology should split opaque `PR07B` into `PR07B0` saved-response hydration and
`PR07B1` stale base-record/title filtering, then refresh the manifest after the
newer deferred queue. It keeps `PR06B` and `PR07C` as sidecars after `PR07B1`,
rejects raw deferred refs as filing refs, and keeps `PR07D`, `PR17`, `PR18`,
and `PR18x` absent from current evidence. That newer synthesis overrides the
earlier nonempty feedback-action that had reported the Cycle 280 manifest
refresh as completed.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e (`31` plotted
lanes), with `unit-property` and one `coverage-guided-lower-level` lane active
as lower-level targets. The newest level-mix synthesis rejects adding
lower-level capacity now and says browser/e2e materialization was below the
`24` lane floor in its audit. Its matching feedback-action then raised focused
browser allocation, observed `25` live browser lanes twice, and regenerated
context with `browser-e2e: 24 lane(s)` and no current telemetry invariant
failure. The graph's `31` plotted browser/e2e lanes remain supervisor-history
telemetry, so live mix decisions still need audited current-root PID/accounting
evidence instead of graph counts alone.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest native action validated the
V8/Node rich-text CRDT lower-level harness. The latest protocol synthesis keeps
HTTP polling REST as the first protocol/server target; its matching action
reports an implemented harness plus a passing 2-seed x 13-case validation run
with root and lane protocol-server events. The graph still counts `0`
protocol-server executions, so the harness evidence has not yet become
collector-visible trend data. The latest execution bucket has about `720`
browser/e2e test executions/hour, `6,400` unit-property executions/hour, and
`0` for transport, coverage-guided lower-level, protocol-server, backend/API,
and standalone fuzz-assertion. The next narrow operational checks are health
under current load/headroom, current-root browser materialization/accounting,
lower-level and protocol lanes appearing in execution/output graphs, and PR
split fresh validation/local filing gates before any final-stack fuzz or filing
claim.
