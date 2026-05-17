# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T18:51:06Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T18:48:24Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2074` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T18:48:24Z`, coverage files grew from `272` to `47164`, a delta of
`46892`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/startup sample is not fully
clean on the live inputs: `duplicateShareCurrent` is `1`, while current summary
startup failures are `0`. The same monitor pass has `0` quality issues, `0`
warnings, a false headroom flag, and `416.1G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context. The latest
historical aggregate duplicate share is `0.3465`, but it is not used as the
plotted live health signal.

Persona-loop evidence rejects both raw historical duplicate/noise and a fully
green duplicate/noise interpretation. The newest duplicate/noise synthesis and
feedback-action, `20260517T180225Z`, say strict no-product
`pre_action_bootstrap_stall` is mostly fixed in the consumer path and that the
feedback action patched active-current scheduling, stale/dead running-job
accounting, durable family caps, and exact helper-noise classification. That
feedback action reports post-restart `topDuplicateFamilyShare: 0` with no queued
signatures, but the refreshed graph's later monitor sample has
`duplicateShareCurrent=1`. This report therefore keeps live duplicate status red
until collector-visible current-output-dir samples settle. The remaining policy
risk is product-evidence duplicate families, paused drain/no-analysis policy
leakage, and the narrow `insertMediaCrossEntityBlock` /
`fuzz_helper_rest_endpoint_construction` harness family, not a reason for broad
product-evidence suppression.

The newest PR-split synthesis, `20260517T183858Z`, rejects the old
`origin/trunk` / `ready-*` / monolithic `PR07B` publication shape. It says the
explicit-base Cycle 292/293 topology is the replacement shape, but Cycle 293 is
not filing-ready until a fresh manifest, bundle, and head audit exists. Root
disk is below the `2048` MB replay threshold, and PR07 replay evidence is still
setup-gated at `collaborationEnabled=null`, so filing, pushing, broad
final-stack fuzzing, and stack-wide validation remain blocked. It keeps
`PR07B0 -> PR07B1`, keeps `PR06B` and `PR07C` as sidecars, keeps `PR03B` held,
and keeps raw `PR07D`, `PR17`, `PR18`, and `PR18x` absent.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `6`
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

The latest plotted current-output-dir sample has
`duplicateShareCurrent=1` and current summary startup failures of `0`. It also
has `0` quality issues, `0` warnings, `416.1G` free memory, and a false monitor
headroom flag. The plot uses `duplicateShareCurrent` and current summary startup
failures for the live health view; it does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-real-user-save-reload` and
`novelty-ws-real-user-editing` as enabled groups. The latest duplicate/noise
synthesis says the remaining gate is not historical aggregate duplicate/noise
and is not a current startup failure: it is stale drain/no-analysis policy input,
skipped durable family-capping reconciliation for product-evidence duplicates,
and a narrow helper-family harness issue. The latest feedback-action reports
that it tightened active-current policy scope and exact helper classification,
but the refreshed graph's latest current duplicate share is `1`. With startup
failures at `0`, warnings at `0`, quality issues at `0`, and headroom false, the
live graph sample is clean on startup and local warning counters but still red on
current duplicate share and resource headroom.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T18:40:01Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `39.9%` to `78.8%` utilization, with the latest sample at
`70.8%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `2` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `10`. The newest 1/5/15-minute load sample is `47.98`, `57.49`,
and `62.39` against `64` logical CPUs, so the latest load sample is below the
core count after recent pressure. Raw memory remains ample, but the latest
monitor headroom flag is false. Current duplicate share is `1`, current startup
failures are `0`, and the latest monitor sample has `0` warnings and `0` quality
issues.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-real-user-save-reload` and `novelty-ws-real-user-editing`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis shifts the remaining problem
to active-current policy scope, skipped durable product-evidence family capping,
and a narrow helper noise family. Startup failures are `0`, the current
duplicate metric is `1`, and memory is ample, but recent load windows still show
pressure and the latest monitor headroom flag is false.
The mixed-health read
comes from current-output-dir metrics and recent load context, not from
historical aggregate duplicate/noise.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `35` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes.
Lower-level targets visible in the graph are `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain `0` in the
committed graph counters.

The newest level-mix synthesis, `20260517T181724Z`, rejects adding lower-level
JS capacity and says to repair browser/e2e materialization first. Its read-only
live check saw `16` live browser PIDs across current roots, below the `24` lane
floor, even though the graph's supervisor snapshots now show `35` browser/e2e
lanes. It keeps `unit-property=1` and `coverage-guided-lower-level=2`, rejects
new parser/unit capacity, and says protocol-server should wait until browser is
stable and the protocol bootstrap fatal is fixed. Its matching feedback-action
kept lower-level allocation capped, backfilled focused browser lanes, and
regenerated validation context with no current telemetry invariant failure, but
still reported only `21` materialized browser/e2e lane PIDs, below the `24` lane
floor, with root disk exhaustion blocking materialization. The committed
collector-visible graph still shows one `coverage-guided-lower-level` lane and
`0` protocol-server executions, so this report treats protocol and browser-PID
persona outputs as evidence that has not yet landed in the plotted trend
counters. The latest execution bucket has current rate only for browser/e2e and
`unit-property`; `coverage-guided-lower-level` has a plotted lane and historical
cumulative executions but `0` current counted executions. Live fuzzing remains
concentrated in browser/e2e lanes in the committed graph; the only
collector-visible lower-level lanes are `unit-property` and
`coverage-guided-lower-level`. `transport-integration` is historical only in the
current rate, while `protocol-server`, `backend-api`, and standalone fuzz-only
assertion work are not yet active in the committed counters.

The latest native synthesis and action, `20260517T140513Z`, keep rich-text CRDT
merge as the first ready isolated lower-level target and label the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The latest protocol-server
synthesis, `20260517T183056Z`, keeps HTTP polling REST protocol/server fuzzing
as the first protocol target and specifies the required root and lane
`events.ndjson` accounting. Its action implemented and smoke-tested the protocol
runner with `13` cases, but did not start a long tmux run because `/` was full.
The refreshed graph still has `0` counted `protocol-server` executions, so this
report keeps live protocol-server trend status at `0` until collector-visible
counts appear. `backend-api` remains blocked/`0`.
The latest fuzz-only assertion apply, `20260517T171831Z`, is substantive and
restarted affected browser loops, but standalone `fuzz-assertion` remains `0` in
the graph because that loop still lacks audited current-run-root/status/events
wiring.

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

The latest collected execution data has about `5,328,249` completed test
executions: `111,852` browser/e2e, `3,006` transport/integration, `4,785,056`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `1,628` browser/e2e test executions/hour,
`3,200` unit-property executions/hour, and `0` for
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
`581` unique likely-real outputs over about `1,895.9` runner-hours, or `30.65`
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

Current unique bug-output candidate rates are: browser/e2e `5,247` candidates
over `1,895.9` runner-hours (`276.76` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `23.8` runner-hours
(`16.78` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,694.9` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,975.8` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, cumulative likely-real triage output now spans multiple
profiles, led by three-user late join, permissions/auth/locks, real-user editing,
and parser serialization. The broader unique-output candidate view is led by
three-user late join, real-user editing, revision persistence, and
permissions/auth/locks, with coverage-guided lower-level and unit/property each
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
| `multi-reload-lifecycle` | 3294 | 111 | 0 | 3.4% |
| `revision-persistence` | 4589 | 168 | 0 | 3.7% |
| `parser-serialization` | 3336 | 176 | 0 | 5.3% |
| `real-user-editing` | 7073 | 564 | 0 | 8.0% |
| `parser-transform` | 4239 | 430 | 0 | 10.1% |
| `common-blocks` | 4130 | 446 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6261 | 1164 | 0 | 18.6% |
| `long-session-large-doc` | 2931 | 577 | 0 | 19.7% |
| `persistence-no-title` | 3274 | 853 | 0 | 26.1% |
| `session-lifecycle` | 8190 | 2469 | 0 | 30.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 479 | 1000 |
| action reload-post-action next 2000 tier | 1023 | 2000 |
| real-user body save/reload next 1000 tier | 538 | 1000 |
| successful real-user-editing records next 1000 tier | 564 | 1000 |
| action ui-format-paragraph next 2000 tier | 1501 | 2000 |
| real-user title save/reload next 500 tier | 479 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, action pairs, real-user UI,
history, operation-ledger, payload-size, block-depth, invariant, block, action,
and transport observations. Raw volume is still heavy in history,
operation-ledger, invariant, action-pair, block-depth, block, action, other, and
transport observations. That is the right shape for RTC data-loss work because
the harness observes both semantic state transitions and low-level block/action
combinations. The plot separates breadth (`keys`) from repeated observations
(`total_count`) so broad coverage is not hidden inside raw event volume.

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
took roughly `6.9` to `12.3` minutes in this snapshot. The newest completed
review, `20260517T183858Z`, took `8.6` minutes from
`2026-05-17T18:38:58Z` to `2026-05-17T18:47:31Z`, so the loop is still turning
while final publication remains blocked. Its synthesis says the split is still
blocked and is not filing-ready, push-ready, or final-fuzz-ready. It
replaces the old `origin/trunk` / `ready-*` / monolithic `PR07B` shape with an
explicit-base Cycle 292/293 topology, but requires a fresh manifest, bundle, and
head audit before Cycle 293 can be filing evidence. Root disk is below the
`2048` MB replay threshold, and PR07 replay remains setup-gated at
`collaborationEnabled=null`. The latest feedback-action, `20260517T181644Z`,
verified corrected Cycle 292 finalized refs and a two-file `PR01` delta, but
that audit is now superseded by the Cycle 293 synthesis. Broad final-stack
fuzzing, filing, pushing, raw `PR07D`, `PR17`, `PR18`, `PR18x`, and new
`1020002` work remain rejected.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T18:28:13Z`, has `14`
suggested rows totaling `7626` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
`PR 6` (`732`), `PR 13C` (`294`), `PR 14` (`276`), and `PR 9` (`183`). These
charts remain size telemetry from parsed status snapshots, not filing authority
for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `6`. The latest plotted
current-output-dir duplicate/startup sample is not fully clean on those live
health inputs: `duplicateShareCurrent` is `1`, while current summary startup
failures are `0`. Resource status is mixed: the monitor headroom flag is false,
free memory is `416.1G`, warnings are `0`, quality issues are `0`, and the
latest load sample is below the `64` logical CPU count after recent pressure.
The copied novelty state currently lists `novelty-ws-real-user-save-reload` and
`novelty-ws-real-user-editing`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects a fully green read. The latest duplicate/noise
synthesis and feedback-action, `20260517T180225Z`, say strict no-product startup
stalls are mostly fixed and apply active-current policy scope, liveness-aware
running-job checks, durable family caps, and narrow helper-noise classification.
The feedback action reports a clean post-restart active state, but the refreshed
graph's later current-output-dir sample has `duplicateShareCurrent=1`. This
contradiction is evidence to track, not a reason to mark duplicate/noise green.
The next safe direction remains durable product-evidence family capping,
active-current-only scheduling, and narrow helper-family canonicalization, not
broad product-evidence suppression.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T183858Z`, replaces the stale
`origin/trunk` / `ready-*` / monolithic `PR07B` shape with an explicit-base
Cycle 292/293 topology, but says Cycle 293 still needs a fresh manifest, bundle,
and head audit before it can be filing evidence. Root disk is below the `2048`
MB replay threshold and PR07 replay is setup-gated at
`collaborationEnabled=null`. The prior `20260517T181644Z` feedback-action
verified corrected Cycle 292 refs and the two-file `PR01` delta, but the newer
synthesis supersedes that as filing authority. Final-stack fuzzing, pushing,
filing, raw `PR07D`, `PR17`, `PR18`, `PR18x`, and new `1020002` work remain
blocked while root cleanup, PR07 runtime-readiness repair, and a fresh
non-Docker manifest audit proceed.

The remaining fuzzing weakness is completion depth, live materialization, and
collector-visible level diversity. The graph's latest snapshots are still
concentrated in browser/e2e (`35` plotted lanes), with `unit-property` and one
`coverage-guided-lower-level` lane visible as lower-level targets. The latest
level-mix synthesis saw only `16` live browser PIDs; its feedback action
backfilled focused browser lanes but still saw only `21`, below the `24` floor,
with root disk exhaustion blocking materialization. The native harness action
implemented the rich-text CRDT coverage-guided lower-level target, and the
protocol action smoke-tested the HTTP polling runner with `13` cases, but no
long protocol run started because `/` was full. The committed graph still shows
`protocol-server=0` and only one coverage-guided-lower-level lane, so protocol
and extra lower-level persona evidence are not yet live trend counters.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest execution bucket has about
`1,628` browser/e2e test executions/hour, `3,200` unit-property executions/hour,
and `0` for transport, coverage-guided lower-level, protocol-server,
backend/API, and standalone fuzz-assertion. The next narrow operational checks
are active-current duplicate/noise policy, load/headroom, current-root browser
materialization/accounting, protocol and lower-level counts becoming
collector-visible, and PR split replay/local filing gates before any final-stack
fuzz or filing claim.
