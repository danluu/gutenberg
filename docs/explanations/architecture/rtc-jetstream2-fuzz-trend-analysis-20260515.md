# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-15T20:46:21Z`

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
`943` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-15T20:41:52Z`, coverage files grew from `272` to `9219`, a delta of
`8947`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces were enabled and ending at `11` in the last logged monitor pass. The
latest copied novelty state, updated at `2026-05-15T20:43:05Z`, has `99` total
goals and `9` unmet goals. That difference is from the monitor log and state
snapshot being taken at slightly different points in the loop.

The run is currently broad but still completion-limited on some expensive UI and
cross-entity surfaces. The main remaining gaps are successful end-to-end records
for media/cross-entity, multi-reload lifecycle, parser serialization, and
real-user editing. Most block/action/fault/parser seed goals are already past
target.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The important trend is the bottom facet: unmet goals trended down materially,
then rose after the latest surface expansion. The top facet shows the coverage
file corpus growing steadily after restarts and expansions. The large processed
record spikes are monitor restart/intake effects, not individual seed runtime.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The current loop is not finding visible likely-real failures. That is good for
the active validation stack, but the duplicate/noise share remains around `0.60`,
so the signal-to-noise ratio is still a major constraint. Free memory remained
high at the end of the snapshot, around `425G`, so the remaining bottleneck is
more about useful work selection and completion rate than raw RAM.

## Enabled Surfaces

![Coverage-guided group enable events](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

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
The weakest newly-added area is not absence of launch coverage, but low
successful completion for the heaviest browser/UI and cross-entity profiles.

## Profile Completion

![Records seen vs successful records by profile](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. Profiles with low success rates are the places to target next:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `media-cross-entity` | 6 | 0 | 0 | 0.0% |
| `multi-reload-lifecycle` | 1145 | 14 | 808 | 1.2% |
| `real-user-editing` | 1535 | 32 | 801 | 2.1% |
| `revision-persistence` | 1284 | 29 | 851 | 2.3% |
| `parser-serialization` | 486 | 17 | 310 | 3.5% |
| `parser-transform` | 1320 | 47 | 923 | 3.6% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Lowest-progress coverage goals by surface](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful media-cross-entity records | 0 | 25 |
| successful multi-reload-lifecycle records | 14 | 50 |
| successful parser-serialization records | 17 | 50 |
| successful real-user-editing records | 32 | 80 |
| uploaded/cross-entity block `core/media-text` | 3 | 5 |
| uploaded/cross-entity block `core/block` | 4 | 5 |
| uploaded/cross-entity block `core/file` | 4 | 5 |
| uploaded/cross-entity block `core/gallery` | 4 | 5 |
| real media upload | 9 | 10 |

These are narrow enough that the recommended next change is focused: improve
media/cross-entity completion and reduce startup stalls in real-user,
multi-reload, and parser-serialization lanes before adding another large class
of fuzz actions.

## Feature Mix

![Feature-key coverage by category](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because it means the harness is observing both
semantic state transitions and low-level block/action combinations.

![Most common successful fuzz actions](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot confirms coverage for ordinary structural edits and
newer UI-heavy actions such as paste, link editing, table-cell editing, toolbar
formatting, cut/copy, composition, and undo/redo. The issue is that several of
those UI-heavy profiles still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, completed
review cycles took roughly `4.5` to `6.7` minutes. Feedback actions ran every
two cycles and took roughly `5.9` to `8.3` minutes. The cadence is now
continuous enough for persona feedback to affect the PR split promptly, rather
than only hourly.

## Interpretation

The coverage data says the harness is now broad enough to exercise the major
surfaces requested earlier. The remaining weakness is depth and completion on a
small number of high-value expensive lanes:

- media/cross-entity needs more successful end-to-end records, not just launch
  attempts;
- multi-reload, parser-serialization, and real-user editing need startup-stall
  reduction and completed-record boosting;
- duplicate/noise triage is still consuming a large share of observed failures;
- no visible likely-real failures appeared in this snapshot, so new PR work
  should stay gated on a fresh validation-stack fuzz run after branch rebase and
  PR13 restacking.

The next operational change should be to spend spare machine capacity on
completion-focused lanes for the unmet profiles, with the coverage-guidance loop
continuing to re-prioritize based on these same goal ratios.
