# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-15T21:42:40Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260515T202556Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`991` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-15T21:41:58Z`, coverage files grew from `272` to `10649`, a delta of
`10377`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces were enabled and ending at `4` in the last logged monitor pass. The
latest copied novelty state has `99` total goals and `4` unmet goals.

The run is currently broad but still completion-limited on some expensive UI and
cross-entity surfaces. The main remaining gaps are successful end-to-end records
for media/cross-entity, multi-reload lifecycle, parser serialization, and
real-user editing. Most block/action/fault/parser seed goals are already past
target.

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
the active validation stack, but the duplicate/noise share remains around `0.59`,
so the signal-to-noise ratio is still a major constraint. Free memory remained
high at the end of the snapshot, around `425G`, so the remaining bottleneck is
more about useful work selection and completion rate than raw RAM.

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The current enabled set is:

- `novelty-ws-structure`
- `novelty-ws-real-user-editing`
- `novelty-ws-media-cross-entity`
- `novelty-http-persistence-probe`
- `novelty-ws-common-blocks`
- `novelty-ws-block-gauntlet`
- `novelty-ws-parser-transform`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-long-session-large-doc`
- `novelty-ws-parser-serialization`
- `novelty-ws-multi-reload-lifecycle`

This covers the user-requested missing areas: same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, and long/large sessions.
The plot is now one row per group at first enable time; point size reflects
repeated enable log events, which are mostly restart/re-enable noise rather than
new coverage launches.

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
| `multi-reload-lifecycle` | 1198 | 20 | 824 | 1.7% |
| `revision-persistence` | 1341 | 31 | 882 | 2.3% |
| `media-cross-entity` | 37 | 1 | 0 | 2.7% |
| `real-user-editing` | 1746 | 69 | 825 | 4.0% |
| `parser-transform` | 1402 | 61 | 941 | 4.4% |
| `parser-serialization` | 556 | 26 | 333 | 4.7% |
| `common-blocks` | 597 | 40 | 376 | 6.7% |
| `block-gauntlet` | 1748 | 127 | 1140 | 7.3% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful media-cross-entity records | 1 | 25 |
| successful multi-reload-lifecycle records | 20 | 50 |
| successful parser-serialization records | 26 | 50 |
| successful real-user-editing records | 69 | 80 |

The chart is an unmet-work queue rather than a capped all-goals ratio plot. The
remaining work is now concentrated in completed-record depth for four expensive
profiles; the media/cross-entity block and upload goals have moved past target.

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
now has a small number of successful action records, but still far too few
completed end-to-end records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, completed
review cycles took roughly `3.8` to `6.7` minutes in this snapshot. Feedback
actions ran every two cycles and took roughly `2.0` to `12.9` minutes. The
cadence is now continuous enough for persona feedback to affect the PR split
promptly, rather than only hourly; the sample is still too small for trend
claims.

## Interpretation

The coverage data says the harness is now broad enough to exercise the major
surfaces requested earlier. The remaining weakness is depth and completion on a
small number of high-value expensive lanes:

- media/cross-entity needs more successful end-to-end records, not just launch
  attempts;
- multi-reload, parser-serialization, and real-user editing need completed-record
  boosting, with startup-stall reduction as one likely lever;
- duplicate/noise triage is still consuming a large share of observed failures;
- no visible likely-real failures appeared in this snapshot, so new PR work
  should stay gated on a fresh validation-stack fuzz run after branch rebase and
  PR13 restacking.

The next operational change should be to spend spare machine capacity on
completion-focused lanes for the unmet profiles, with the coverage-guidance loop
continuing to re-prioritize based on these same goal ratios.
