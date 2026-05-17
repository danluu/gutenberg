# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T16:05:51Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T16:02:03Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2028` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T16:02:03Z`, coverage files grew from `272` to `46049`, a delta of
`45777`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `7` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample has clean live
duplicate and startup counters: `duplicateShareCurrent` is `0`, and current
summary startup failures are `0`. The same monitor pass has `1` quality issue,
`1` warning, a false headroom flag, and `414.3G` free memory. This report
treats current-output-dir duplicate/noise and summary startup failure metrics
as live graph status; historical aggregate duplicate/noise is only context. The
latest historical aggregate duplicate share is `0.3464`, but it is not used as
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

The newest PR-split synthesis, `20260517T154634Z`, rejects a filing-ready or
final-stack-fuzz-ready interpretation. It says the split does not need a new
product PR slot, keeps the Cycle 268/280 no-`PR07D` topology, and treats
`PR06B` and `PR07C` as sidecars after `PR07B`. It rejects `PR07D`, `PR17`,
`PR18`, and `PR18x` from current evidence. The latest nonempty feedback-action,
`20260517T152820Z`, had reported a completed Cycle 280 manifest refresh, but
the newer synthesis says publication evidence is stale again because the
current deferred queue is newer. Broad final-stack fuzzing, filing, GitHub push
decisions, and stack-wide validation remain deferred.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0` and
current summary startup failures of `0`. It also has `1` quality issue, `1`
warning, `414.3G` free memory, and a false monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied novelty state lists one enabled group:
`novelty-ws-common-blocks`. The latest duplicate/noise synthesis rejects broad
product-evidence suppression. It says strict startup noise still needs one
shared control-plane invariant before analysis can queue or launch, while
product-evidence records must remain visible. With the refreshed current
duplicate share at `0` and startup failures at `0`, the duplicate/startup live
signal is clean. The same sample is not fully healthy because quality issues,
warnings, and headroom are not clean, so live status is mixed rather than green.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T16:00:02Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `35.9%` to `78.6%` utilization, with the latest sample at
`76.6%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `2` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `12`. The latest sampled 1/5/15-minute load is `103.49`,
`78.18`, and `61.64` against `64` logical CPUs. Raw memory remains ample, but
the latest monitor headroom flag is false. Current duplicate share is `0`,
current startup failures are `0`, and the latest monitor sample has `1` warning
and `1` quality issue.

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
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis calls the remaining problem a
shared-invariant failure for no-product bootstrap stalls before analysis
queueing/launch, not a reason for broad product-evidence suppression. The
refreshed duplicate and startup counters are clean, but the latest warning,
quality, headroom, and load samples are not clean, so the graph supports a mixed
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
`protocol-server`, and fuzz-only assertion accounting at `0` until audited. Its
synthesis reports no file edits, and the matching feedback-action file is
empty. That persona audit contradicts the graph's `31` plotted browser/e2e
lanes, so this report treats the graph as supervisor-history telemetry and
keeps live operational status gated on audited current roots. The latest
execution bucket has current rate only for browser/e2e and `unit-property`;
`coverage-guided-lower-level` has a plotted lane and historical cumulative
executions but `0` current counted executions.

The latest native synthesis, `20260517T135702Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The `20260517T134230Z`
native action validated direct and bounded tmux smoke event accounting. The
newest protocol-server synthesis, `20260517T154706Z`, keeps the HTTP polling
REST protocol/server harness ahead of WebSocket relay fuzzing, says the landing
set is already present as untracked files, and repeats the root/lane
`events.ndjson` accounting needed for trend collectors. Its matching
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

The latest collected execution data has about `5,296,060` completed test
executions: `105,391` browser/e2e, `3,006` transport/integration, `4,759,328`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T16:00:00Z`, reports about `252` browser/e2e test
executions/hour, `2,816` unit-property executions/hour, and `0` for
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
`575` unique likely-real outputs over about `1,855.4` runner-hours, or `30.99`
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

Current unique bug-output candidate rates are: browser/e2e `5,145` candidates
over `1,855.4` runner-hours (`277.29` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `22.5` runner-hours
(`17.75` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,488.2` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,335.5` for unit/property.

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
| `multi-reload-lifecycle` | 3270 | 109 | 0 | 3.3% |
| `revision-persistence` | 4513 | 161 | 0 | 3.6% |
| `parser-serialization` | 3275 | 162 | 0 | 4.9% |
| `real-user-editing` | 6927 | 561 | 0 | 8.1% |
| `parser-transform` | 4196 | 420 | 0 | 10.0% |
| `common-blocks` | 4037 | 415 | 0 | 10.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6211 | 1148 | 0 | 18.5% |
| `long-session-large-doc` | 2872 | 552 | 0 | 19.2% |
| `persistence-no-title` | 3237 | 827 | 0 | 25.5% |
| `session-lifecycle` | 8052 | 2422 | 0 | 30.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 475 | 1000 |
| action reload-post-action next 2000 tier | 1013 | 2000 |
| real-user body save/reload next 1000 tier | 534 | 1000 |
| successful real-user-editing records next 1000 tier | 561 | 1000 |
| action ui-format-paragraph next 2000 tier | 1461 | 2000 |
| real-user title save/reload next 500 tier | 475 | 500 |
| action ui-heading-shortcut next 1000 tier | 997 | 1000 |

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
review, `20260517T154634Z`, took `12.3` minutes. The newest completed window
includes `20260517T142930Z` from
`2026-05-17T14:29:30Z` to `2026-05-17T14:37:09Z`, `20260517T144650Z` from
`2026-05-17T14:46:50Z` to `2026-05-17T14:54:51Z`, `20260517T145456Z` from
`2026-05-17T14:54:56Z` to `2026-05-17T15:01:50Z`, `20260517T151727Z` from
`2026-05-17T15:17:27Z` to `2026-05-17T15:28:15Z`, `20260517T152820Z` from
`2026-05-17T15:28:20Z` to `2026-05-17T15:37:45Z`, and `20260517T154634Z` from
`2026-05-17T15:46:34Z` to `2026-05-17T15:58:52Z`.

The newest PR-split synthesis, `20260517T154634Z`, says the split is still
blocked and is not filing-ready or final-stack-fuzz-ready. It keeps the Cycle
268/280 no-`PR07D` topology, keeps `PR06B` and `PR07C` as sidecars after
`PR07B`, and says raw `deferred/rtc-reload-hydration-20260517T153807Z` should
not be published as its own PR unless fresh replay proves non-coverage. It
rejects `PR07D`, `PR17`, `PR18`, `PR18x`, stale `1020002`, broad final-stack
fuzzing, filing, and pushes from current evidence. The latest nonempty
feedback-action, `20260517T152820Z`, had reported a completed Cycle 280
manifest refresh after the deferred queue with all `34` active rows verified.
The newer synthesis rejects treating that as current filing authority because
the publication evidence is stale relative to the `2026-05-17T15:53:11Z`
deferred queue.

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
current-output-dir duplicate/startup sample is clean on those live counters:
`duplicateShareCurrent=0` and current summary startup failures are `0`. It has
`1` quality issue, `1` warning, a false headroom flag, and `414.3G` free memory.
The copied novelty state has one enabled coverage-guided browser group:
`novelty-ws-common-blocks`.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures, with quality/warning/headroom/load treated separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
The latest duplicate/noise synthesis, `20260517T154741Z`, says strict no-product
startup stalls are a control-plane invariant problem across producer,
supervisor, triage, analysis, and live monitor boundaries. The latest matching
feedback-action is empty, so this report treats that synthesis as the current
persona-loop status. The refreshed graph agrees that current duplicate and
startup counters are clean, but it does not support a fully green health read
because the latest quality/warning/headroom/load samples are not clean.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T154634Z`, keeps the Cycle 268/280
no-`PR07D` topology but says the stack is blocked by stale publication evidence:
the newer deferred queue postdates the prior Cycle 280 manifest refresh. It
keeps `PR06B` and `PR07C` as sidecars after `PR07B`, rejects `PR07D`, `PR17`,
`PR18`, and `PR18x`, and says the raw reload-hydration deferred branch should
not be published as its own PR from current evidence. That newer synthesis
overrides the earlier nonempty feedback-action that had reported the Cycle 280
manifest refresh as completed.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e (`31` plotted
lanes), with `unit-property` and one `coverage-guided-lower-level` lane active
as lower-level targets. The newest level-mix synthesis rejects adding
lower-level capacity now and says browser/e2e materialization is still `20`
against the `24` lane floor in its live audit. It keeps
`coverage-guided-lower-level=2`, `unit-property=1`, and protocol/server,
backend/API, and fuzz-only assertion accounting constrained until current-root
wiring is audited. This contradicts the graph's `31` plotted browser/e2e lanes,
so live mix decisions still need audited current-root PID/accounting evidence
instead of supervisor-history counts alone.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest native action validated the
V8/Node rich-text CRDT lower-level harness. The latest protocol synthesis keeps
HTTP polling REST as the first protocol/server target and says the landing set
is already present as untracked files; its matching action reports an
implemented harness plus a passing 2-seed x 13-case validation run with root and
lane protocol-server events. The graph still counts `0` protocol-server
executions, so the harness evidence has not yet become collector-visible trend
data. The latest execution bucket has about `252` browser/e2e test
executions/hour, `2,816` unit-property executions/hour, and `0` for transport,
coverage-guided lower-level, protocol-server, backend/API, and standalone
fuzz-assertion. The next narrow operational checks are health under current
load/headroom, browser materialization/accounting, lower-level and protocol
lanes appearing in execution/output graphs, and PR split fresh validation/local
filing gates before any final-stack fuzz or filing claim.
