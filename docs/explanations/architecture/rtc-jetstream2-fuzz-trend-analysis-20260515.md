# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T04:43:48Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T044219Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1259` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T04:43:16Z`, coverage files grew from `272` to `23883`, a delta of
`23611`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled and ending at `12` in the last
logged monitor pass. The latest copied novelty state has `120` total goals and
`12` unmet goals.

The run has broad historical coverage, and the current active budget has
re-expanded after duplicate/noise churn. The latest copied state has seven
active WS lanes: real-user editing, rich text, block-gauntlet, common blocks,
parser transform, async/server blocks, and media/cross-entity. No groups are
marked paused in that state, but the active output directory has not yet emitted
behavioral coverage files. The main remaining gaps are depth targets for
real-user editing, gauntlet blocks, CDP coverage records, and reload/save
actions. Previously weak media/cross-entity, parser-serialization, and
paragraph-formatting targets have improved enough that they are no longer in the
unmet-goal table, but their completion rates remain worth watching.

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
remained high at the end of the snapshot, around `432.7G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, and
completion rate than raw RAM.

Persona-loop feedback rejects reading the historical duplicate/noise share as a
current-run product-failure signal or as a reason to pause live browser groups.
The latest duplicate/noise synthesis instead identifies a control-plane leak:
strict pre-action startup stalls can reach summary history while current-run
startup counters stay empty, and watcher/analysis paths can still spend work on
known-noise variants. The copied state has `0` current-run signatures and `0`
current-run bootstrap stalls, while historical triage remains dominated by
`pre_action_bootstrap_stall`. The newest duplicate/noise feedback-action file
was empty, while the newest synthesis still recommends strict current-run
summary-level startup accounting plus triage-watcher and analysis-tier
backstops. Scheduling/backpressure changes remain disputed and should not be
inferred from graph history alone.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Sysstat samples from
`2026-05-15T01:21:42Z` through `2026-05-16T04:40:01Z` average about `58.1%`,
peak around `84.9%`, and end near `70.9%`. This says the machine is being used
more aggressively than the earlier memory view alone implied; spare RAM does not
necessarily mean spare browser/CPU capacity.

The two activity plots below are intentionally left unlabeled.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest copied state reports this current enabled set:

- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-block-gauntlet`
- `novelty-ws-common-blocks`
- `novelty-ws-parser-transform`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`

The latest copied state has no paused groups. It still reports a medium health
warning because the current active output directory has no behavioral coverage
files yet.

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
| `revision-persistence` | 2561 | 76 | 0 | 3.0% |
| `multi-reload-lifecycle` | 1923 | 58 | 0 | 3.0% |
| `parser-serialization` | 1268 | 60 | 0 | 4.7% |
| `real-user-editing` | 3511 | 231 | 0 | 6.6% |
| `common-blocks` | 2058 | 208 | 0 | 10.1% |
| `parser-transform` | 2488 | 259 | 0 | 10.4% |
| `block-gauntlet` | 2937 | 433 | 0 | 14.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 231 | 500 |
| gauntlet block core/html next coverage tier | 286 | 500 |
| action ui-heading-shortcut next coverage tier | 295 | 500 |
| gauntlet block core/more next coverage tier | 304 | 500 |
| gauntlet block core/details next coverage tier | 320 | 500 |
| action reload-post-action next coverage tier | 339 | 500 |
| CDP coverage records next coverage tier | 3675 | 5000 |
| gauntlet block core/gallery next coverage tier | 374 | 500 |
| real-user body save/reload next coverage tier | 153 | 200 |
| gauntlet block core/file next coverage tier | 447 | 500 |
| action ui-undo-redo-paragraph next coverage tier | 464 | 500 |
| real-user title save/reload next coverage tier | 94 | 100 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `84`
completed review cycles took roughly `2.9` to `8.0` minutes in this snapshot;
the latest included review took `4.0` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with completed events through Cycle `82`, which took `2.0` minutes. Cycle `84`
feedback had started but had not produced a non-empty action file in this copied
input set. The latest substantive PR-split synthesis is
`20260516T043923Z`.

## Interpretation

The coverage data says the harness is now broad enough to exercise the major
surfaces requested earlier. The current active fuzz has `0` visible likely-real
failures and `12` unmet goals, but the latest substantive PR-split synthesis
says this is stable and reviewable, not filing-ready and not final-stack
validation. That synthesis rejects the graph-only interpretation that broad
coverage or `0` visible likely-real failures is enough to promote deferred
browser-only families into PR claims. It keeps the split unchanged, keeps PR 13
limited to the repaired 13A/13B/13C heads, and says not to auto-launch more
Codex or fuzz work. The remaining weakness is depth and completion on a small
number of high-value expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth and reload/save actions still need more observations;
- CPU utilization has climbed substantially, so guarded top-off is a better fit
  than broad parallelism increases;
- duplicate/noise history should not pause live browser groups or be read as a
  current product-failure signal; the current copied state has empty current-run
  counters for the new output dir, while strict current-run summary accounting
  plus watcher/analysis backstops remain the next recommended control-plane fix
  and scheduling changes remain disputed;
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
