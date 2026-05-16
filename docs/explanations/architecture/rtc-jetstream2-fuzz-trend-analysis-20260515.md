# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T13:59:12Z`

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
`1524` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T13:56:58Z`, coverage files grew from `272` to `32734`, a delta of
`32462`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `6` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, CDP coverage
records, and the heading shortcut action.

The active output directory is `run-20260516T134921Z`. Its latest live-health
sample is not clean: `duplicateShareCurrent` is `0.5238`, summary startup
failures are `4`, quality issues are `1`, warnings are `0`, free memory is
`426.7G`, and resource headroom is true. The current enabled group set contains
`9` coverage-guided groups after the output-dir reset. This report treats
current-output-dir duplicate/noise and startup-failure metrics as live status;
historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a clean graph-only interpretation. The
latest duplicate/noise synthesis, `20260516T133256Z`, identified a
current-run startup-noise capacity-floor bypass; its matching feedback action
patched the monitor to make that floor current-run/profile-aware and allow no
floor when no clean group is eligible. That is progress, but the refreshed graph
still ends with non-zero current duplicate share and startup failures. The
latest PR-split synthesis, `20260516T134728Z`, is not filing approval: the
28-head split shape is stable, but filing is still blocked on durable WebSocket
provider/bootstrap validation and seed `1020002` classification. Its feedback
action launched exactly that bounded follow-up job.

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

The live health signal is still unsettled. The latest current-output-dir sample
for `run-20260516T134921Z` has `duplicateShareCurrent=0.5238` and `4` summary
startup failures. Recent samples after the reset range from clean to clearly
duplicative, so this is live validation in progress rather than a resolved
state. The plot uses `duplicateShareCurrent` and current summary startup
failures for the live health view; it does not use historical aggregate
duplicate/noise as the plotted live signal.

The latest duplicate/noise synthesis rejects treating the zero visible
likely-real count as enough. Its feedback action implemented the requested
current-run/profile-aware startup-noise capacity-floor fix, preserved pause
entries, allowed no floor when no clean candidate exists, and restarted the
active novelty/supervisor/triage path. The feedback observed no new floor-enable
action after the fix, but the graph's latest current-output metrics still show
non-zero duplicate share and startup failures.

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
re-expanded to `9` coverage-guided groups after the output-dir reset: lifecycle,
HTTP persistence probe, real-user editing/rich-text, block gauntlet, common
blocks, media cross-entity, long-session large-doc, and persistence-no-title.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. Across the latest copied campaign
snapshots, the mix shows `34` browser/e2e lanes across `34` groups and no
lower-level lanes. The latest coverage-guided snapshot alone has `9`
browser/e2e lanes across `9` groups.

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

The latest collected execution data has `52,006` completed attempts:
`49,000` browser/e2e and `3,006` transport/integration. The latest 15-minute
bucket reports about `744` browser/e2e attempts/hour and `0`
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
| `revision-persistence` | 3312 | 76 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2477 | 58 | 0 | 2.3% |
| `parser-serialization` | 1953 | 60 | 0 | 3.1% |
| `real-user-editing` | 5020 | 282 | 0 | 5.6% |
| `common-blocks` | 2988 | 255 | 0 | 8.5% |
| `parser-transform` | 3184 | 284 | 3 | 8.9% |
| `long-session-large-doc` | 2097 | 281 | 0 | 13.4% |
| `block-gauntlet` | 3819 | 544 | 0 | 14.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1956 | 347 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 282 | 500 |
| gauntlet block core/html next coverage tier | 361 | 500 |
| gauntlet block core/details next coverage tier | 405 | 500 |
| gauntlet block core/more next coverage tier | 410 | 500 |
| CDP coverage records next coverage tier | 4787 | 5000 |
| action ui-heading-shortcut next coverage tier | 498 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `146`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T134728Z`, took `5.8` minutes.

The latest PR-split synthesis, `20260516T134728Z`, says the split design is not
the blocker. It preserves the Cycle 134/142 explicit 28-head allow-list:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. It says Cycle 142 diagnostics classified
the blocker as a durable fuzz-harness problem, not product behavior: the
WebSocket provider was absent in wp-env, and a job-local patch reached WS
bootstrap, sync-cycle, first action, and coverage before a later seed `1020002`
marker divergence. The `20260516T134728Z` feedback action launched one bounded
durable WS provider/bootstrap follow-up and no broader fuzz, split redesign, or
deferred PR work.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T13:48:40Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `6`. The latest live health graph sample is not
healthy enough to call recovery: the current-output duplicate/noise sample is
`0.5238`, current summary startup failures are `4`, and the enabled set has
re-expanded to `9` coverage-guided groups.

The duplicate/noise persona loop rejects a graph-only "resolved" read. Its
latest synthesis found the novelty-monitor capacity floor re-enabling
startup-noise-dominated work after the monitor had already paused it, and the
matching feedback action says that bypass is now patched and restarted. The
graph should be read as post-fix validation, not proof of recovery, until the
current-output duplicate share and startup-failure samples stay low.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged on the explicit 28-head allow-list, but the latest synthesis says the
next gate is the durable WS provider/bootstrap follow-up and seed `1020002`
classification, not filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is currently all browser/e2e in the latest mix snapshots, with no active
lower-level lane. Transport-integration still has historical completed
executions, but the latest execution bucket has `0` transport/integration
attempts/hour and the other lower-level buckets remain at `0` executions. The
next narrow operational checks are confirming the capacity-floor fix holds in
new health samples and classifying the durable WS provider/bootstrap follow-up.
