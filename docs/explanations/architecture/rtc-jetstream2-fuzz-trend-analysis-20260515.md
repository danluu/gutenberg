# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T13:51:51Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T134921Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1521` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T13:50:31Z`, coverage files grew from `272` to `32681`, a delta of
`32409`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `6` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, CDP coverage
records, and the heading shortcut action.

The active output directory is `run-20260516T134921Z`. Its latest live-health
sample is clean but immature: `duplicateShareCurrent` is `0`, summary startup
failures are `0`, quality issues are `1`, warnings are `1`, free memory is
`433.4G`, and resource headroom is true. The current enabled group set contains
`10` coverage-guided groups after the output-dir reset. This report treats
current-output-dir duplicate/noise and startup-failure metrics as live status;
historical aggregate duplicate/noise is only context.

Persona-loop evidence rejects a clean graph-only interpretation. The latest
duplicate/noise synthesis, `20260516T133256Z`, says the novelty monitor is
pausing current-run `pre_action_bootstrap_stall` noise and then reviving the
same profile through `ensureStartupNoiseCapacityFloor()`. Its matching feedback
file is empty; the latest non-empty feedback action, `20260516T130451Z`,
implemented the one-group capacity floor that the newer synthesis identifies as
the bypass. The latest PR-split synthesis, `20260516T133729Z`, is not filing
approval: the 28-head split shape is stable, but filing is still blocked until
final-stack WS diagnostics produce a usable report and classify the sync-cycle
issue. The latest PR-split feedback action, `20260516T132918Z`, recorded the
Cycle 144 consensus and launched no new jobs because the WS diagnostic was
already active.

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

The live health signal improved in the latest sample, but it is not proven
healthy. The latest current-output-dir sample for `run-20260516T134921Z` has
`duplicateShareCurrent=0` and `0` summary startup failures. The immediately
preceding output-dir samples included `duplicateShareCurrent=1` and one sample
with `24` summary startup failures, and the current novelty state also reports
no behavioral coverage files under the new output dir. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis rejects treating the zero visible
likely-real count or the latest `0` duplicate share as enough. Its proposed
smallest fix is to make the startup-noise capacity floor current-run-aware: do
not re-enable groups whose profile is at or above the startup-failure limit
without enough current successes, honor startup cooldowns, preserve pause
entries, and allow an empty supervisor policy when no clean floor exists. The
`20260516T133256Z` feedback-action file is empty; the latest non-empty feedback
action (`20260516T130451Z`) implemented the earlier capacity-floor/fanout
mitigation, but the newer synthesis says that floor still defeats the policy
for the active profile.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T13:50:00Z` still show sustained CPU
pressure, but the last point eased: the 13:00-13:50 samples range from `46.2%`
to `78.3%` utilization and end near `46.2%`. Load average remains below the
earlier peak but still active: the latest sampled 1/5/15-minute load is
`32.63`, `34.49`, and `42.31` against `64` logical CPUs. The immediate blocker
is validation quality and coverage depth rather than raw memory headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current novelty state has
re-expanded to `10` coverage-guided groups after the output-dir reset:
lifecycle, HTTP persistence probe, real-user editing/rich-text, block gauntlet,
common blocks, parser transform, async server blocks, media cross-entity, and
long-session large-doc.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. Across the latest copied campaign
snapshots, the mix shows `35` browser/e2e lanes across `35` groups and no
lower-level lanes. The latest coverage-guided snapshot alone has `10`
browser/e2e lanes across `10` groups.

Live fuzzing is currently concentrated entirely in browser/e2e lanes. The latest
mix snapshot has no active `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, or standalone
`fuzz-assertion` fuzz-only assertion lanes.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `51,904` completed attempts:
`48,898` browser/e2e and `3,006` transport/integration. The latest 15-minute
bucket reports about `336` browser/e2e attempts/hour and `0`
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
| `revision-persistence` | 3304 | 76 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2474 | 58 | 0 | 2.3% |
| `parser-serialization` | 1945 | 60 | 0 | 3.1% |
| `real-user-editing` | 5007 | 282 | 0 | 5.6% |
| `common-blocks` | 2980 | 254 | 0 | 8.5% |
| `parser-transform` | 3176 | 283 | 0 | 8.9% |
| `long-session-large-doc` | 2097 | 281 | 0 | 13.4% |
| `block-gauntlet` | 3806 | 541 | 0 | 14.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1951 | 346 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 282 | 500 |
| gauntlet block core/html next coverage tier | 359 | 500 |
| gauntlet block core/details next coverage tier | 405 | 500 |
| gauntlet block core/more next coverage tier | 408 | 500 |
| CDP coverage records next coverage tier | 4774 | 5000 |
| action ui-heading-shortcut next coverage tier | 493 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `145`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T133729Z`, took `9.9` minutes.

The latest PR-split synthesis, `20260516T133729Z`, says the split design is not
the blocker. It preserves the Cycle 134/142 explicit 28-head allow-list:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. The required WS diagnostics report was
still absent and its tmux session was still active when the synthesis checked.
The expected artifact is
`/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T131309Z/jobs/outputs/rtc-final-stack-fuzz-ws-provider-sync-cycle-diagnostics-post-pr11-20260516T131309Z/report.md`.
The latest feedback-action file is still `20260516T132918Z`; it records the
Cycle 144 consensus, flags stale-ref and dirty-worktree contamination as the
main filing risk, launches no new jobs, and still defers reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text suffix corruption,
broader malformed save residuals, HTTP room-isolation/`PR1A`, seed `5500002`,
and former `PR6B`/`PR6C`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T13:39:01Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `6`. The latest live health graph sample is
better than the preceding noisy window: the current-output duplicate/noise
sample is `0`, current summary startup failures are `0`, and the enabled set
has re-expanded to `10` coverage-guided groups. It is still immature because the
current output dir has no behavioral coverage files yet.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest synthesis says the current bottleneck is the novelty-monitor capacity
floor re-enabling startup-noise-dominated work after the monitor has already
paused it. The graph now shows an output-dir reset and a clean latest
duplicate/noise sample, but the persona evidence still rejects treating that as
proof of recovery until the capacity floor respects current-run startup-noise
guards and can allow no group when no clean group exists.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged on the explicit 28-head allow-list, and the latest synthesis still
says final-stack WS validation has not reached collaboration readiness, mutual
discovery, sync-cycle, first fuzz action, or behavioral coverage. The active
bounded WS diagnostic should finish and classify harness/provider versus infra
versus product behavior before any filing or broad rerun.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is currently all browser/e2e in the latest mix snapshots, with no active
lower-level lane. Transport-integration still has historical completed
executions, but the latest execution bucket has `0` transport/integration
attempts/hour and the other lower-level buckets remain at `0` executions. The
next narrow operational fixes are the current-run-aware startup-noise capacity
floor and the single WS sync-cycle diagnostic result.
