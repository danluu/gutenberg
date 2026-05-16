# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T05:36:12Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T053502Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1286` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T05:35:01Z`, coverage files grew from `272` to `24461`, a delta of
`24189`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled and ending at `12` in the last
logged monitor pass before dropping to `11` in the latest pass. The latest
copied novelty state has `120` total goals and `11` unmet goals.

The run has broad historical coverage, and the current active budget has
re-expanded after duplicate/noise churn. The latest copied state has seven
active lanes total: six WS lanes plus the HTTP persistence probe. It has three
paused groups, `novelty-ws-lifecycle`, `novelty-ws-long-session-large-doc`, and
`novelty-ws-async-server-blocks`, all due to current-run startup cooldowns. The
young active output directory has begun emitting records for block-gauntlet,
common-blocks, parser-transform, media/cross-entity, real-user editing,
async/server blocks, and HTTP persistence. The main remaining gaps are depth
targets for real-user editing, gauntlet blocks, CDP coverage records, and
reload/save actions.
Previously weak media/cross-entity, parser-serialization, and
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
remained high at the end of the snapshot, around `422.7G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, and
completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-run duplicate/noise share `0` and
`1` summary startup failure; the copied state has `0` current-run triage
signatures and one current-run summary startup failure counter for
`async-server-blocks`. Historical triage remains duplicate/noise dominated, with
historical top duplicate family share `0.5919`, but persona-loop feedback
continues to reject reading that historical aggregate as a current product
failure signal. The latest duplicate/noise synthesis still recommends narrow
triage-watcher and analysis-tier backstops for no-user/no-action startup stalls,
while deferring broader scheduling/backpressure changes.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Sysstat samples from
`2026-05-15T00:10:00Z` through `2026-05-16T05:30:00Z` average about `57.1%`,
peak around `84.9%`, and end near `63.1%`. This says the machine is being used
more aggressively than the earlier memory view alone implied; spare RAM does not
necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
window, the 1-minute, 5-minute, and 15-minute load averages each average about
`56`, against `64` logical CPUs. The latest sampled load is `50.12`, `51.19`,
and `52.06` for 1/5/15 minutes respectively, below the core-count reference
line, while short spikes exceeded it earlier.

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
- `novelty-ws-media-cross-entity`
- `novelty-http-persistence-probe`

The latest copied state has three paused groups:
`novelty-ws-lifecycle`, `novelty-ws-long-session-large-doc`, and
`novelty-ws-async-server-blocks`. The current active output directory is young,
but it has begun producing records in block-gauntlet, common-blocks,
parser-transform, media/cross-entity, real-user editing, async/server blocks,
and HTTP persistence.

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
| `revision-persistence` | 2634 | 76 | 0 | 2.9% |
| `multi-reload-lifecycle` | 1947 | 58 | 0 | 3.0% |
| `parser-serialization` | 1336 | 60 | 0 | 4.5% |
| `real-user-editing` | 3626 | 233 | 0 | 6.4% |
| `common-blocks` | 2182 | 208 | 0 | 9.5% |
| `parser-transform` | 2539 | 264 | 0 | 10.4% |
| `block-gauntlet` | 2986 | 444 | 0 | 14.9% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 233 | 500 |
| gauntlet block core/html next coverage tier | 286 | 500 |
| gauntlet block core/more next coverage tier | 307 | 500 |
| action ui-heading-shortcut next coverage tier | 312 | 500 |
| gauntlet block core/details next coverage tier | 325 | 500 |
| action reload-post-action next coverage tier | 348 | 500 |
| CDP coverage records next coverage tier | 3793 | 5000 |
| gauntlet block core/gallery next coverage tier | 386 | 500 |
| real-user body save/reload next coverage tier | 159 | 200 |
| gauntlet block core/file next coverage tier | 461 | 500 |
| action ui-undo-redo-paragraph next coverage tier | 481 | 500 |

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

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, `91`
completed review cycles took roughly `2.9` to `8.0` minutes in this snapshot;
the latest included review took `5.5` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action taking `6.7` minutes. The copied
input set includes PR-split syntheses through `20260516T053120Z` and
duplicate/noise syntheses through `20260516T052614Z`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot has `19` suggested rows totaling
`11801` net LOC. The largest current rows by net LOC are `PR 13B`, `PR 5`,
`PR 12`, `PR 7A`, and `PR 11`, which matches the review concern that the CRDT
and parser normalization slices need the most careful branch hygiene and
range-diff review.

## Interpretation

The coverage data says the harness is now broad enough to exercise the major
surfaces requested earlier. The current active fuzz has `0` visible likely-real
failures and `11` unmet goals, but the latest substantive PR-split synthesis
says this is stable and reviewable, not filing-ready and not final-stack
validation. That synthesis rejects the graph-only interpretation that broad
coverage or `0` visible likely-real failures is enough to promote deferred
browser-only families into PR claims. It keeps the split unchanged, keeps PR 13
limited to the repaired 13A/13B/13C heads, and says not to auto-launch more
Codex or fuzz work. The latest duplicate/noise evidence also rejects treating
historical aggregate duplicate/noise as a current product-failure signal. The
remaining weakness is depth and completion on a small number of high-value
expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth and reload/save actions still need more observations;
- CPU utilization has climbed substantially, so guarded top-off is a better fit
  than broad parallelism increases;
- current-run duplicate/noise is the live health metric: the latest current-run
  duplicate share is `0` and summary startup failures are visible separately;
  historical duplicate/noise remains reporting context only, and the synthesis
  still calls for triage-watcher/analysis-tier backstops;
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
