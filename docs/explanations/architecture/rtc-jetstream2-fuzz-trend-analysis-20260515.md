# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T12:32:07Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T12:31:09.391Z`,
  `lastUpdatedAt=2026-05-17T12:28:28.619Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1971` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T12:28:28Z`, coverage files grew from `272` to `44089`, a delta of
`43817`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth and action depth.

The latest plotted current-output-dir duplicate/noise sample is clean on the
required live duplicate/startup metrics: `duplicateShareCurrent` is `0` and
current summary startup failures are `0`. The same monitor pass still has `1`
quality issue, `1` warning, a true headroom flag, and `428.9G` free memory. This
report treats current-output-dir duplicate/noise and summary startup failure
metrics as live graph status; historical aggregate duplicate/noise is only
context. The latest historical aggregate duplicate share is `0.352`, but it is
not used as the plotted live health signal.

Persona-loop evidence still rejects a product-bug interpretation of the
duplicate/noise control-plane issue. The newest duplicate/noise synthesis,
`20260517T121544Z`, says strict no-product startup stalls are mostly recognized
downstream, but the novelty scheduler can still burn browser capacity on groups
or profiles that recently emitted that startup-noise family; parser
serialization was enabled as fallback, then produced startup noise and was
paused at `2026-05-17T12:21:33Z`. It asks for a hard current-run no-product
startup quarantine in the novelty monitor while preserving product-evidence
analysis. The matching feedback-action file is empty, so the report treats that
fix as requested, not applied.

The newest PR-split synthesis, `20260517T121005Z`, rejects a filing-ready,
final-stack-fuzz, broad-fuzz, push, or wait-only interpretation. It keeps Cycle
264 as the replacement split and says PR05D is real after PR05C. The matching
feedback-action imported and verified the clean PR05D bundle, generated a fresh
push manifest, and built validation head
`cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
`b9bf4ccb794004b634d1427bf18d1a7d788af03f`. It still defers broad final-stack
fuzzing, filing, and GitHub push decisions until the refreshed validation
topology is consumed and durable sync undo/history owner artifacts exist.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `4`
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
warning, `428.9G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied novelty state lists one enabled group:
`novelty-ws-real-user-rich-text`. The latest duplicate/noise synthesis rejects
a product-bug interpretation and broad product-evidence suppression. It
identifies control-plane leakage where current-run no-product startup holds are
mostly recognized downstream, but fallback/recommendation can still spend
capacity on startup-noise-prone browser producers. The requested next fix is a
hard current-run startup-noise quarantine in the novelty monitor; the matching
feedback-action file is empty, so there is no applied scheduler-side fix in the
persona evidence.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T12:30:00Z` show bursty CPU and severe
load pressure. The latest 25 CPU samples range from `30.1%` to `81.0%`
utilization, with the latest sample at `66.1%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `5` of those `25` sampled
windows, and at least one of the three load windows exceeded it in `15` of
`25`. The latest sampled 1/5/15-minute load is `63.28`, `55.93`, and `47.34`
against `64` logical CPUs. Raw memory remains ample, and the latest monitor
headroom flag is true. Current duplicate share and startup failures are clean,
but quality and warning counts are not.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-real-user-rich-text`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis calls the remaining problem a
bounded novelty scheduler/control-plane issue, not a product bug and not a
reason for broad product-evidence suppression. It asks for current-run
no-product startup holds to quarantine producer continuation, fallback
replacement, and coverage-Codex launch while preserving product-evidence
analysis. The matching feedback-action file is empty, so that scheduler-side
change is still pending even though the latest graph sample is clean on the
required live duplicate/startup metrics.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `27` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes, with
counted lower-level activity in `unit-property` and one
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T121222Z`, rejects treating those plotted/requested browser lanes as
fully materialized live capacity. Its consensus says focused/strict/gap browser
supervisors and watchdogs are missing, stale supervisor state is being credited
as live work, and live browser PIDs are about `4` versus the `24` e2e floor. It
asks to restart only missing focused/strict/gap supervisors and watchdogs against
existing roots, keep lower-level allocation capped at
`coverage-guided-lower-level=2`, `unit-property=1`, and `protocol-server=1`, and
count `fuzz-assertion` and `backend-api` as zero.

The matching `20260517T121222Z` feedback-action says browser/e2e materialization
was repaired after that synthesis: exact focused/strict/gap and coverage
supervisor/watchdog sessions were present, browser/e2e recovered to `25` active
lanes, and aggregate materialized run dirs/live lanes were both `25`. This is a
case where the persona-loop evidence rejects the raw graph interpretation and
then reports a bounded recovery action; the supervisor snapshot still is not
enough by itself to prove live capacity.

Live plotted fuzzing is still concentrated in browser/e2e lanes. Lower-level
targets are active in the plotted mix through `unit-property` and one
`coverage-guided-lower-level` lane, and the latest execution bucket has current
rate only for browser/e2e and `unit-property`; the current unit/property profile
is `rtc-rich-text-crdt-merge`. `transport-integration` has historical activity
but no current counted rate. The latest native-harness synthesis,
`20260517T122222Z`, names rich-text CRDT merge as the first ready isolated
lower-level harness; the `20260517T120811Z` action validated the harness but
notes the production default rich-text lane remained under a hold. The
production lower-level graph still has `0` current counted
`coverage-guided-lower-level` executions. The latest protocol-server synthesis,
`20260517T121830Z`, and action, `20260517T120639Z`, choose and validate the
HTTP polling REST path through `POST /wp-sync/v1/updates` with root and lane
`events.ndjson` accounting, but the refreshed execution graph still has `0`
counted `protocol-server` executions. `backend-api` remains blocked/`0`, and
standalone
fuzz-only assertion work remains `0` in the graph even though fuzz-gated browser
assertions can affect browser/e2e output.

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

The latest collected execution data has about `5,252,070` completed test
executions: `102,617` browser/e2e, `3,006` transport/integration, `4,718,112`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T12:30:00Z`, reports about `100` browser/e2e test
executions/hour, `2,176` unit-property executions/hour, and `0` for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone fuzz-assertion. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` levels remain at `0`
cumulative executions in this counter.
The summary still flags approximate execution rows somewhere in the history, so
lower-level totals reconstructed from batch metadata or legacy batch-count
fields should be read as approximate.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

This graph has been relabeled because it is not a total bug-finding graph. It
counts only non-duplicate `.triage-watcher/**/result.json` rows classified
`likely_real` per 100 runner-hours, deduped by canonical bug key and attributed
to the failure first-seen time. The compute proxy is summed runner wall-clock
`durationMs` from lane `events.ndjson`, reported as runner-hours. This is best
interpreted as per-runner triage-output efficiency, not per-core efficiency and
not all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates:
`497` unique likely-real outputs over about `1,800.0` runner-hours, or `27.61`
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

Current unique bug-output candidate rates are: browser/e2e `4,885` candidates
over `1,800.0` runner-hours (`271.38` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `20.5` runner-hours
(`9.73` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,537.0` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `564.5` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, cumulative likely-real triage output now spans multiple
profiles, led by session lifecycle, three-user late join, and
permissions/auth/locks. The broader unique-output candidate view is led by
three-user late join, session lifecycle, and real-user editing, with
coverage-guided lower-level and unit/property each showing small nonzero
candidate totals. Lower-level and transport lanes should continue to be judged
partly by the unique-output candidate graphs until their triage pipeline is
producing comparable likely-real and non-duplicate results.

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
| `multi-reload-lifecycle` | 3231 | 107 | 0 | 3.3% |
| `revision-persistence` | 4404 | 155 | 0 | 3.5% |
| `parser-serialization` | 3177 | 153 | 0 | 4.8% |
| `real-user-editing` | 6611 | 531 | 0 | 8.0% |
| `common-blocks` | 3913 | 386 | 0 | 9.9% |
| `parser-transform` | 4134 | 410 | 0 | 9.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6107 | 1122 | 0 | 18.4% |
| `long-session-large-doc` | 2596 | 505 | 0 | 19.5% |
| `persistence-no-title` | 3124 | 749 | 0 | 24.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 412 | 500 |
| real-user body save/reload next coverage tier | 471 | 500 |
| action ui-heading-shortcut next coverage tier | 896 | 1000 |
| action reload-post-action next coverage tier | 925 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth and action
depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, action-pair, real-user,
history, operation-ledger, payload-size, block-depth, and other
observations. Raw volume is still heavy in history, operation-ledger, invariant,
and action-pair observations. That is the right shape for RTC data-loss work
because the harness observes both semantic state transitions and low-level
block/action combinations. The plot separates breadth (`keys`) from repeated
observations (`total_count`) so broad coverage is not hidden inside raw event
volume.

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
took roughly `6.9` to `14.3` minutes in this snapshot; the latest completed
review, `20260517T121005Z`, took `9.8` minutes. The newest completed window
shows review cycle `20260517T105433Z` running from
`2026-05-17T10:54:33Z` to `2026-05-17T11:04:04Z`, review cycle
`20260517T110409Z` running from `2026-05-17T11:04:09Z` to
`2026-05-17T11:14:26Z`, review cycle `20260517T112431Z` running from
`2026-05-17T11:24:31Z` to `2026-05-17T11:36:40Z`, review cycle
`20260517T113645Z` running from `2026-05-17T11:36:45Z` to
`2026-05-17T11:45:21Z`, review cycle `20260517T115956Z` running from
`2026-05-17T11:59:56Z` to `2026-05-17T12:10:00Z`, and review cycle
`20260517T121005Z` running from `2026-05-17T12:10:05Z` to
`2026-05-17T12:19:51Z`.

The newest PR-split synthesis, `20260517T121005Z`, says the split is blocked,
but not wait-only blocked. It adopts Cycle 264 with PR05D after PR05C, keeps
PR03B, PR06B, and PR07C as sidecars, and rejects the older wrong-base PR05D
manifest plus PR07D, PR17, PR18, and PR18x from current evidence. The matching
feedback-action applied the split update, consumed seed `1020002` as
downscoped/final-stack-only, imported and verified the clean PR05D bundle,
generated a fresh push manifest, and built validation head
`cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
`b9bf4ccb794004b634d1427bf18d1a7d788af03f`. Broad final-stack fuzzing, filing,
GitHub pushes, and rebuilt stack-wide validation remain deferred until the
refreshed topology is consumed and sync undo/history artifacts are durable.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T12:21:02Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `4`. The latest plotted
current-output-dir sample is clean on the required live duplicate/startup
signals: `duplicateShareCurrent=0` and current summary startup failures of `0`.
It still has `1` quality issue, `1` warning, a true headroom flag, and `428.9G`
free memory. The copied novelty state has one enabled coverage-guided browser
group: `novelty-ws-real-user-rich-text`. Historical aggregate duplicate/noise
remains context; the live graph status comes from current-output-dir duplicate
share and current summary startup failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
The latest synthesis, `20260517T121544Z`, says the remaining issue is
control-plane leakage: current-run no-product startup stalls are mostly
recognized downstream, but producer/fallback scheduling can still spend browser
capacity on startup-noise-prone groups. It explicitly rejects a product-bug
interpretation and asks for a hard current-run startup-noise quarantine in the
novelty monitor. The matching feedback-action file is empty, so that scheduler
fix is still pending even though the refreshed graph's live duplicate/startup
sample is clean.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T121005Z`, keeps Cycle 264 as the
replacement split, places PR05D after PR05C, and keeps PR03B, PR06B, and PR07C
as sidecars. Its feedback-action applied the split update, consumed `1020002` as
downscoped/final-stack-only, imported and verified the clean PR05D bundle,
generated a fresh push manifest, and built validation head
`cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars`. It still rejects
PR17, PR18, PR18x, PR07D, filing, pushes, broad/final-stack fuzz, and another
`1020002` job from current evidence until the refreshed topology is consumed and
sync undo/history artifacts are durable.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e, with
unit-property and coverage-guided-lower-level active as lower-level targets.
The latest level-mix synthesis rejects a simple graph-only "27 browser lanes are
live" read because browser materialization and accounting were stale; its
feedback-action then reports focused/strict/gap and coverage supervisor/watchdog
sessions present with browser/e2e recovered to `25` active lanes. Backend/API
remains inactive, transport-integration has historical but no current counted
rate, `coverage-guided-lower-level` has a plotted lane but `0` current counted
executions, and standalone fuzz-assertion remains `0` in the graph.
Native-harness evidence has validated rich-text CRDT merge as the first ready
isolated lower-level target, and protocol-server evidence has validated the HTTP
polling REST harness, but the graph still has `0` counted `protocol-server`
executions. The latest execution bucket has about `100` browser/e2e test
executions/hour, `2,176` unit-property executions/hour, and `0` for transport,
coverage-guided lower-level, protocol-server, backend/API, and standalone
fuzz-assertion. The next narrow operational checks are keeping duplicate
scheduler policy current-run scoped and fail-closed, watching browser
materialization stay above the floor, verifying protocol production execution
continuity, watching lower-level lanes appear in execution and output graphs,
and completing PR split sidecar/runtime gates before any final-stack fuzz or
filing claim.
