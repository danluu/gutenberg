# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T04:25:20Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T041738Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1248` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T04:24:12Z`, coverage files grew from `272` to `23655`, a delta of
`23383`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled and ending at `13` in the last
logged monitor pass. The latest copied novelty state has `120` total goals and
`13` unmet goals.

The run has broad historical coverage, and the current active budget has
re-expanded after duplicate/noise churn. The latest copied state lists HTTP
persistence probing plus WS lanes for real-user editing, rich text,
block-gauntlet, common blocks, parser transform, async/server blocks, and
media/cross-entity. The main remaining gaps are depth targets for real-user
editing, gauntlet blocks, CDP coverage records, and reload/save actions.
Previously weak media/cross-entity and parser-serialization surfaces have
improved enough that they are no longer in the unmet-goal table, but their
completion rates remain worth watching.

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
the active validation stack, but it is not final-stack validation. Free memory
remained high at the end of the snapshot, around `423.8G`, so the remaining
bottleneck is more about useful work selection and completion rate than raw RAM.

Persona-loop feedback rejects reading the historical duplicate/noise share as a
current-run product-failure signal. The latest duplicate/noise synthesis reports
`14531` historical signatures, `8420` pre-action bootstrap stalls, a `0.5795`
dominant duplicate share, `0` current-run triage signatures, and `0` visible
likely-real failures. That feedback rejects the graph-only interpretation that
historical duplicate dominance should pause live browser groups. The Cycle 6
feedback action applied the narrow monitor-side cleanup: historical known-noise
is now advisory/reporting only, current-run startup counters gate browser
groups, and the active status had `0` current-run signatures, `0` current-run
bootstrap stalls, and only browser-budget rotation pausing a WS group.
Triage-watcher and analysis-tier backstops remain recommended but were not part
of that applied action.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Sysstat samples from
`2026-05-15T01:21:42Z` through `2026-05-16T04:20:00Z` average about `58.0%`,
peak around `84.9%`, and end near `67.6%`. This says the machine is being used
more aggressively than the earlier memory view alone implied; spare RAM does not
necessarily mean spare browser/CPU capacity.

The two activity plots below are intentionally left unlabeled.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest copied state reports this current enabled set:

- `novelty-http-persistence-probe`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-block-gauntlet`
- `novelty-ws-common-blocks`
- `novelty-ws-parser-transform`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`

The historical enabled set covers the user-requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current state is narrower
than the full historical set, but no longer only HTTP persistence after the
duplicate/noise restart churn. The plot is one row per group at first enable
time; point size reflects repeated enable log events, which are mostly
restart/re-enable noise rather than new coverage launches.

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
| `full` | 840 | 18 | 0 | 2.1% |
| `revision-persistence` | 2537 | 76 | 0 | 3.0% |
| `multi-reload-lifecycle` | 1914 | 58 | 0 | 3.0% |
| `parser-serialization` | 1244 | 60 | 0 | 4.8% |
| `real-user-editing` | 3452 | 228 | 0 | 6.6% |
| `common-blocks` | 1999 | 207 | 0 | 10.4% |
| `parser-transform` | 2465 | 256 | 0 | 10.4% |
| `block-gauntlet` | 2912 | 426 | 0 | 14.6% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 228 | 500 |
| gauntlet block core/html next coverage tier | 280 | 500 |
| action ui-heading-shortcut next coverage tier | 285 | 500 |
| gauntlet block core/more next coverage tier | 300 | 500 |
| gauntlet block core/details next coverage tier | 317 | 500 |
| action reload-post-action next coverage tier | 334 | 500 |
| CDP coverage records next coverage tier | 3597 | 5000 |
| gauntlet block core/gallery next coverage tier | 365 | 500 |
| real-user body save/reload next coverage tier | 149 | 200 |
| gauntlet block core/file next coverage tier | 437 | 500 |
| real-user title save/reload next coverage tier | 90 | 100 |
| action ui-undo-redo-paragraph next coverage tier | 451 | 500 |
| action ui-format-paragraph next coverage tier | 494 | 500 |

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
has moved out of the unmet-goal set in this snapshot; parser-serialization has
also met its explicit completed-record goal, while real-user editing still needs
completed-record depth.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, `80`
completed review cycles took roughly `2.9` to `8.0` minutes in this snapshot;
the latest included review took `3.6` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with Cycle `78` taking `2.3` minutes. Cycle `80` feedback had started and its
persona action file applied the same consensus, but it was not yet a completed
duration row in the copied loop log.

## Interpretation

The coverage data says the harness is now broad enough to exercise the major
surfaces requested earlier. The current active fuzz has `0` visible likely-real
failures and `13` unmet goals, but the latest non-empty PR-split synthesis says
this is structurally on track and operationally blocked, not final-file-ready
and not final-stack validation. The latest `2026-05-16T04:19:14Z` PR-split
synthesis and Cycle `80` feedback reject a split redesign, reject promoting
deferred browser-only families into PR claims, and say not to auto-launch more
Codex or fuzz work. The remaining weakness is depth and completion on a small
number of high-value expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth and reload/save actions still need more observations;
- CPU utilization has climbed substantially, so guarded top-off is a better fit
  than broad parallelism increases;
- duplicate/noise history should not pause live browser groups or be read as a
  current product-failure signal; the applied monitor cleanup matches that
  feedback, while watcher/analysis backstops remain unlanded;
- PR 13 should be reviewed only through the repaired 13A/13B/13C heads;
- reload-hydration empty-live-editor remains product-evidence-inconclusive;
- no visible likely-real failures appeared in this snapshot, so new PR work
  should stay gated on a fresh validation-stack fuzz run after branch rebase and
  PR 13 restacking.

The next operational change should be conservative: keep existing fuzz running,
avoid automatic new fuzz or Codex review launches, and use the queued bounded
reload-hydration checkpoint diagnostics pass only when explicitly launched. For
coverage-guided fuzzing, spend capacity on completion-focused lanes for the
unmet profiles while the loop continues to re-prioritize based on these same
goal ratios.
