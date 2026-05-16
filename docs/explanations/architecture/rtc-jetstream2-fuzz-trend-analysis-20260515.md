# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T03:11:20Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T025539Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1208` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T03:07:35Z`, coverage files grew from `272` to `22869`, a delta of
`22597`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled and ending at `13` in the last
logged monitor pass. The latest copied novelty state has `120` total goals and
`13` unmet goals.

The current run is broad and now budgeted at nine enabled coverage-guided groups.
The main remaining gaps are depth targets for real-user editing, gauntlet blocks,
CDP coverage records, and reload/save actions. Previously weak media/cross-entity
and parser-serialization surfaces have improved enough that they are no longer
in the unmet-goal table, but their completion rates remain worth watching.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The important trend is the bottom facet: unmet goals trended down materially,
then rose after the latest surface expansion. The top facet shows the coverage
file corpus growing steadily after restarts and expansions. Dense monitor-pass
points are intentionally small and partially transparent so repeated samples do
not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The current loop is not finding visible likely-real failures. That is good for
the active validation stack, but the duplicate/noise share remains around
`0.573`, so the signal-to-noise ratio is still a major constraint. Free memory
remained high at the end of the snapshot, around `424G`, so the remaining
bottleneck is more about useful work selection and completion rate than raw RAM.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Sysstat samples from
`2026-05-15T00:10:00Z` through `2026-05-16T03:10:01Z` average about `56.6%`,
peak around `84.9%`, and end near `77.0%`. This says the machine is being used
more aggressively than the earlier memory view alone implied; spare RAM does not
necessarily mean spare browser/CPU capacity.

The two unlabeled activity plots below use raw cumulative values and hourly
bucketed rates; they are no longer normalized.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The current enabled set is:

- `novelty-ws-real-user-editing`
- `novelty-ws-media-cross-entity`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-long-session-large-doc`
- `novelty-ws-common-blocks`
- `novelty-ws-parser-transform`
- `novelty-ws-block-gauntlet`
- `novelty-ws-lifecycle`

The historical enabled set covers the user-requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current budget focuses on
the nine groups above, with lifecycle re-enabled as the guarded top-off group.
The plot is one row per group at first enable time; point size reflects repeated
enable log events, which are mostly restart/re-enable noise rather than new
coverage launches.

The weakest newly-added area is not absence of launch coverage, but low
successful completion for the heaviest browser/UI and cross-entity profiles.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. The scatter now uses records seen on the x-axis, completion
rate on the y-axis, startup-failure rate as point size, and unmet success goals
as triangle markers. Startup failures are one diagnostic signal, not the whole
cause of low completion. Profiles with low success rates are the places to
target next:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 476 | 2.1% |
| `multi-reload-lifecycle` | 1872 | 58 | 29 | 3.1% |
| `revision-persistence` | 2420 | 76 | 33 | 3.1% |
| `parser-serialization` | 1156 | 60 | 36 | 5.2% |
| `real-user-editing` | 3304 | 227 | 38 | 6.9% |
| `parser-transform` | 2414 | 249 | 21 | 10.3% |
| `common-blocks` | 1824 | 205 | 31 | 11.2% |
| `block-gauntlet` | 2859 | 417 | 29 | 14.6% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 227 | 500 |
| action ui-heading-shortcut next coverage tier | 269 | 500 |
| gauntlet block core/html next coverage tier | 278 | 500 |
| gauntlet block core/more next coverage tier | 292 | 500 |
| gauntlet block core/details next coverage tier | 316 | 500 |
| action reload-post-action next coverage tier | 331 | 500 |
| gauntlet block core/gallery next coverage tier | 352 | 500 |
| CDP coverage records next coverage tier | 3521 | 5000 |
| real-user body save/reload next coverage tier | 147 | 200 |
| gauntlet block core/file next coverage tier | 420 | 500 |
| action ui-undo-redo-paragraph next coverage tier | 440 | 500 |
| real-user title save/reload next coverage tier | 88 | 100 |
| action ui-format-paragraph next coverage tier | 469 | 500 |

The chart is an unmet-work queue rather than a capped all-goals ratio plot. The
remaining work now mixes completed-record depth for expensive profiles with
auto-ratcheted depth targets for CDP hashes, real-user actions, and gauntlet
blocks.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because it means the harness is observing both
semantic state transitions and low-level block/action combinations. The plot
separates breadth (`keys`) from repeated observations (`total_count`) so broad
coverage is not hidden inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records. `media-cross-entity`
has moved out of the unmet-goal set in this snapshot; parser serialization and
real-user editing still need completed-record depth.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, completed
review cycles took roughly `2.9` to `8.0` minutes in this snapshot. Feedback
actions ran every two cycles and took roughly `1.8` to `13.8` minutes. The
cadence is now continuous enough for persona feedback to affect the PR split
promptly, rather than only hourly; the sample is still too small for trend
claims.

## Interpretation

The coverage data says the harness is now broad enough to exercise the major
surfaces requested earlier. The remaining weakness is depth and completion on a
small number of high-value expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth and reload/save actions still need more observations;
- CPU utilization has climbed substantially, so the guarded one-group top-off is
  a better fit than broad parallelism increases;
- duplicate/noise triage is still consuming a large share of observed failures;
- no visible likely-real failures appeared in this snapshot, so new PR work
  should stay gated on a fresh validation-stack fuzz run after branch rebase and
  PR13 restacking.

The next operational change should be to spend spare machine capacity on
completion-focused lanes for the unmet profiles, with the coverage-guidance loop
continuing to re-prioritize based on these same goal ratios.
