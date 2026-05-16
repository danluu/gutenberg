# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T13:35:57Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T130839Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1514` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T13:35:29Z`, coverage files grew from `272` to `32537`, a delta of
`32265`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `6` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, CDP coverage
records, and the heading shortcut action.

The active output directory is `run-20260516T130839Z`. Its latest live-health
sample is noisy again: `duplicateShareCurrent` is `0.8696`, summary startup
failures are `2`, quality issues are `2`, warnings are `1`, free memory is
`427.7G`, and resource headroom is true. The current enabled group set has
collapsed to `novelty-ws-real-user-editing`. This report treats
current-output-dir duplicate/noise and startup-failure metrics as live status;
historical aggregate duplicate/noise is only context.

Persona-loop evidence rejects a clean graph-only interpretation. The latest
duplicate/noise synthesis, `20260516T132455Z`, says the novelty monitor's
capacity floor can re-enable a profile already showing current-run strict
startup noise, keeping `novelty-ws-real-user-editing` active despite
`pre_action_bootstrap_stall` dominance. The latest PR-split synthesis,
`20260516T132918Z`, says the 28-head split shape is stable, but filing remains
blocked because final-stack WS validation still fails before sync-cycle, first
fuzz action, and behavioral coverage.

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

The live health signal is not clean. The latest five current-output-dir samples
include duplicate shares `1`, `0`, `0.9333`, `0.8571`, and `0.8696`, with one
sample showing `18` summary startup failures and the latest showing `2`. The
plot uses `duplicateShareCurrent` and current summary startup failures for the
live health view; it does not use historical aggregate duplicate/noise as the
plotted live signal.

The latest duplicate/noise synthesis rejects treating the zero visible
likely-real count as enough. Its proposed smallest fix is to make the startup
noise capacity floor current-run-aware: do not re-enable groups whose profile is
at or above the startup-failure limit without enough current successes, honor
startup cooldowns, preserve pause entries, and allow an empty supervisor policy
when no clean floor exists. The latest non-empty feedback action
(`20260516T130451Z`) implemented the earlier capacity-floor/fanout mitigation,
but the newer synthesis says that floor still defeats the policy for the active
profile.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Current-run sysstat samples through `2026-05-16T13:30:00Z` average about
`60.3%` CPU utilization, peak around `84.9%`, and end near `69.6%`. Load average
shows similar pressure: 1/5/15-minute load averages average about `59.1`,
`59.2`, and `58.9` against `64` logical CPUs. The latest sampled load is
`61.81`, `58.79`, and `59.75`, so the immediate blocker is canary quality and
coverage depth rather than raw memory headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current novelty state is
much narrower: only `novelty-ws-real-user-editing` is currently enabled.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. The latest copied mix snapshot shows `25`
browser/e2e lanes across `25` groups and `1` transport-integration lane.

Live fuzzing remains concentrated in browser/e2e lanes. The only active
lower-level target in the latest snapshot is `transport-integration`; there are
no latest active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` fuzz-only assertion lanes.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `51,347` completed attempts:
`48,344` browser/e2e and `3,003` transport/integration. The latest 15-minute
bucket reports about `340` browser/e2e attempts/hour and `8`
transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels remain at `0` executions in this counter.

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
| `revision-persistence` | 3284 | 76 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2467 | 58 | 0 | 2.4% |
| `parser-serialization` | 1935 | 60 | 0 | 3.1% |
| `real-user-editing` | 4964 | 282 | 11 | 5.7% |
| `common-blocks` | 2970 | 254 | 6 | 8.6% |
| `parser-transform` | 3161 | 279 | 0 | 8.8% |
| `long-session-large-doc` | 2087 | 280 | 0 | 13.4% |
| `block-gauntlet` | 3788 | 541 | 7 | 14.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1939 | 346 | 7 | 17.8% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 282 | 500 |
| gauntlet block core/html next coverage tier | 355 | 500 |
| gauntlet block core/details next coverage tier | 403 | 500 |
| gauntlet block core/more next coverage tier | 408 | 500 |
| CDP coverage records next coverage tier | 4763 | 5000 |
| action ui-heading-shortcut next coverage tier | 490 | 500 |

Reload-post action coverage has moved out of the unmet set in this snapshot.
The remaining queue mixes completed-record depth for expensive profiles with
auto-ratcheted depth targets for CDP hashes, real-user actions, and gauntlet
blocks.

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `144`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T132918Z`, took `5.6` minutes.

The latest PR-split synthesis file, `20260516T132918Z`, says the split design is
not the blocker. It preserves the Cycle 134/142 explicit 28-head allow-list:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. The required WS diagnostics report is
still absent and its tmux session is still active. The expected artifact is
`/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T131309Z/jobs/outputs/rtc-final-stack-fuzz-ws-provider-sync-cycle-diagnostics-post-pr11-20260516T131309Z/report.md`.
The latest feedback-action file for `20260516T132918Z` is empty, so the latest
non-empty feedback action remains `20260516T131309Z`; it launched exactly that
bounded WS provider sync-cycle diagnostic and still deferred broad fuzz, extra
final-stack lanes, reload diagnostics, PR13 repair/import, PR6B/PR6C work, and
another split-review loop.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T13:26:50Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `6`. But the live health graph is not clean.
The current-output duplicate/noise sample is back near `0.87`, startup failures
are still present, and the enabled set is a single real-user editing group.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest synthesis says the current bottleneck is the novelty-monitor capacity
floor re-enabling startup-noise-dominated work. The earlier feedback action
reduced fanout, but the newer synthesis says the capacity floor must now respect
current-run startup-noise guards and allow no group when no clean group exists.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged on the explicit 28-head allow-list, but final-stack WS validation has
not reached collaboration readiness, mutual discovery, sync-cycle, first fuzz
action, or behavioral coverage. The active bounded WS diagnostic should finish
and classify harness/provider versus infra versus product behavior before any
filing or broad rerun.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still dominated by browser/e2e lanes, with only one active
transport-integration lower-level lane and zero executions for the other
lower-level buckets. The next narrow operational fixes are the current-run-aware
startup-noise capacity floor and the single WS sync-cycle diagnostic result.
