# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T20:40:48Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T18:51:08.549Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1689` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T20:40:15Z`, coverage files grew from `272` to `36041`, a delta of
`35769`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `7` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate but is not startup-clean: `duplicateShareCurrent` is `0.4706` and current
summary startup failures are `2`. The same sample has `1` quality issue, `0`
warnings, `428.9G` free memory, and the monitor headroom flag is false. The
copied novelty state has six enabled coverage-guided groups after the latest
output-dir reset. This report treats current-output-dir duplicate/noise and
startup-failure metrics as live status; historical aggregate
duplicate/noise is only context.

Persona-loop evidence rejects the earlier clean-live-status interpretation. The
latest duplicate/noise synthesis, `20260516T201946Z`, says strict pre-action
startup suppression is mostly working downstream, but the remaining noise is a
scheduler/control-plane leak: duplicate/noise pauses are not sticky, so
coverage guidance can re-enable a noisy group after it drops out of current-run
triage. It cites `novelty-ws-block-gauntlet` being paused around `20:09Z` and
re-enabled around `20:13Z` for `auto-ratchet:block:core/html`. The latest
feedback-action, `20260516T201946Z`, is empty; the latest non-empty
feedback-action remains `20260516T194153Z`, which patched source-state
reconciliation and restarted novelty. The newer synthesis rejects treating that
patch, historical/raw duplicate noise, or graph-only `0` likely-real failures
as proof that the current run is clean.

The latest PR-split synthesis, `20260516T203203Z`, says the split is blocked for
filing and final-stack fuzz, but not blocked for all work. Cycle 188's
replacement tail is the `ready/rtc-*` PR01-PR15C prefix plus PR02A, a
conditional PR16 malformed-save payload after restack/replay, a separate PR17
seed `1020002` WebSocket/Yjs merge/update-emission repair, rebuilt combined
validation, focused seed gates, and only then final-stack fuzz. The latest
feedback-action remains `20260516T201519Z`; it applied the Cycle 190 loop
repair, completed `rtc-prsplit-loop-progress-gate-repair-20260516T202553Z`, and
kept PR16, PR17, filing, and final-stack fuzz deferred. The synthesis rejects
wait-only handling while independent lanes are available and rejects reading the
graph's `0` likely-real failures as filing approval.

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

The latest current-output-dir sample is below the live duplicate-share gate but
still fails the startup-cleanliness check: `duplicateShareCurrent=0.4706` and
current summary startup failures are `2`. The sample has `1` quality issue and
`0` warnings, with `428.9G` free memory and the monitor headroom flag false. The
plot uses `duplicateShareCurrent` and current summary startup failures for the
live health view; it does not use historical aggregate duplicate/noise as the
plotted live signal.

The latest duplicate/noise synthesis says strict startup noise is mostly blocked
at triage/analysis ingress, but duplicate/noise pauses are not sticky enough
against coverage-guidance re-enables. The latest non-empty feedback-action
patched source-state reconciliation and measured `0` bootstrap-stall signatures
and `15` actionable signatures at `2026-05-16T20:00:35Z`; the newer synthesis
and the refreshed current-output sample reject treating that earlier patch as a
clean live status. The remaining risk is current-run duplicate/noise leakage,
not historical aggregate duplicate/noise by itself.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T20:40:00Z` show sustained CPU
pressure with a late spike: the 16:50-20:40 samples range from `64.9%` to
`91.8%` utilization, with the latest sample at `77.7%`. One-minute load exceeded
the logical CPU count in `20` of those `24` sampled windows, and the latest
sampled 1/5/15-minute load is `69.7`, `72.4`, and `92.6` against `64` logical
CPUs. Raw memory headroom is still ample, but the current-output duplicate/noise
sample and PR-split repair decisions are live blockers.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, persistence, and long/large sessions. The current
copied novelty state has six enabled coverage-guided groups:
real-user-editing, real-user-rich-text, async-server-blocks,
long-session-large-doc, lifecycle, and HTTP persistence probe.
The duplicate/noise persona loop is stricter than a graph-only read:
raw/non-actionable signatures stay visible, but the live health read uses
current-output-dir duplicate/noise and startup failures. The latest current
sample has `duplicateShareCurrent=0.4706` and `2` current summary startup
failures, so startup pollution is not currently clean. The latest duplicate/noise
synthesis rejects treating the earlier source-state reconciliation patch as
sufficient without a sticky duplicate/noise cooldown respected by coverage
guidance.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `31` browser/e2e lanes across `31` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The browser/e2e
lanes are `6` coverage-guided, `9` focused-shards, `6` gap-booster, and `10`
strict-expansion.

Live fuzzing is still concentrated in browser/e2e lanes, but lower-level work
is active in `unit-property` and `coverage-guided-lower-level`, including the
rich-text CRDT lower-level lane. No active `transport-integration`,
`backend-api`, `protocol-server`, or standalone fuzz-only assertion lanes appear
in the latest level-mix snapshot.

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

The latest collected execution data has about `1,579,614` completed test
executions: `77,558` browser/e2e, `3,006` transport/integration, `1,395,920`
unit-property, and `103,130` coverage-guided-lower-level. The latest 15-minute
bucket reports about `4,616` browser/e2e test executions/hour, `134,848`
unit-property test executions/hour, `21,760` coverage-guided-lower-level test
executions/hour, and `0` transport/integration test executions/hour.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` levels remain
at `0` executions in this counter.

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
| `multi-reload-lifecycle` | 2779 | 81 | 0 | 2.9% |
| `revision-persistence` | 3719 | 111 | 0 | 3.0% |
| `parser-serialization` | 2394 | 87 | 0 | 3.6% |
| `real-user-editing` | 5490 | 345 | 0 | 6.3% |
| `parser-transform` | 3527 | 341 | 0 | 9.7% |
| `common-blocks` | 3384 | 343 | 0 | 10.1% |
| `long-session-large-doc` | 2234 | 319 | 0 | 14.3% |
| `block-gauntlet` | 4781 | 832 | 4 | 17.4% |
| `persistence-no-title` | 2474 | 434 | 5 | 17.5% |
| `structure` | 536 | 95 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 221 | 500 |
| real-user body save/reload next coverage tier | 280 | 500 |
| action reload-post-action next coverage tier | 607 | 1000 |
| action ui-heading-shortcut next coverage tier | 629 | 1000 |
| successful real-user-editing records next coverage tier | 345 | 500 |
| gauntlet block core/html next coverage tier | 449 | 500 |
| action ui-format-paragraph next coverage tier | 909 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
completed-record depth for real-user editing, and a gauntlet block ratchet.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because the harness observes both semantic state
transitions and low-level block/action combinations. The plot separates breadth
(`keys`) from repeated observations (`total_count`) so broad coverage is not
hidden inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

With the live loop at `max_parallel=6`, `191`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T203203Z`, took `7.6` minutes. The parsed
feedback-action duration series' latest row is cycle `98` at `3.1` minutes.

The latest PR-split synthesis, `20260516T203203Z`, says the split design is
blocked for filing and final-stack fuzz, not blocked for all work. The current
PR01-PR15C set plus PR02A is only a known-fix prefix. The consensus shape
remains the `ready/rtc-*` prefix, PR02A, a conditional PR16 malformed-save
payload candidate after restack/replay, a separate PR17 seed `1020002`
WebSocket/Yjs merge/update-emission repair, rebuilt combined validation,
focused seed gates, and only then final-stack fuzz.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Filing and final-stack fuzz remain blocked because
PR16 replay and PR17 seed `1020002` repair are unfinished and both active jobs
still lack `report.md`. The latest feedback-action, `20260516T201519Z`,
recorded the Cycle 190 loop repair, completed
`rtc-prsplit-loop-progress-gate-repair-20260516T202553Z`, and intentionally
avoided duplicate PR16/PR17 jobs. The synthesis rejects wait-only handling while
independent lanes are available.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T20:24:38Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `7`. The latest live
current-output sample is still not clean: current duplicate share is
`duplicateShareCurrent=0.4706`, latest current summary startup failures are `2`,
and the latest monitor row has `1` quality issue and `0` warnings, with `428.9G`
free memory and the headroom flag false.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and the previous clean-live-status interpretation. The
latest synthesis says strict startup noise is mostly blocked at triage/analysis
ingress, but current-run duplicate/noise pauses still need to be sticky against
coverage-guidance re-enables. The current copied state has six enabled
coverage-guided groups; historical aggregate duplicate/noise remains context,
while current-output-dir duplicate share and startup failures are the live
status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate after
restack/replay, and a separate PR17 seed `1020002` WebSocket/Yjs
merge/update-emission repair. The latest synthesis, `20260516T203203Z`, says
filing and final-stack fuzz remain blocked because PR16 replay and PR17 repair
are unfinished and reportless. The latest feedback-action confirms the loop was
repaired so active `1020002` alone no longer satisfies the progress gate, and
the manifest audit had already verified `12/12` rows. Wait-only handling is
invalid while independent artifact lanes are available.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has about `4,616` browser/e2e test executions/hour, `134,848`
unit-property test executions/hour, `21,760` coverage-guided-lower-level test
executions/hour, `0` transport/integration test executions/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions. The next narrow
operational checks are sticky duplicate/noise cooldown/gate handling,
malformed-save restack/replay evidence, and seed `1020002` WebSocket/Yjs
merge-update-emission repair evidence.
