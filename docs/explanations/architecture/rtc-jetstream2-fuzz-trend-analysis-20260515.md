# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T06:24:18Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T061254Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1312` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T06:23:11Z`, coverage files grew from `272` to `24954`, a delta of
`24682`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `11` unmet goals.

The run has broad historical coverage, but the current active output directory
was just restarted at `2026-05-16T06:13:03Z` and is still a live-health check,
not a mature sample. The latest copied state has eight active lanes:
`novelty-http-persistence-probe`,
`novelty-ws-common-blocks`, `novelty-ws-long-session-large-doc`,
`novelty-ws-async-server-blocks`, `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-media-cross-entity`, and
`novelty-ws-block-gauntlet`. The only paused group in the copied state is
`novelty-ws-lifecycle`, held by a pre-action startup cooldown. The main
remaining coverage gaps are depth targets for real-user editing, gauntlet
blocks, CDP coverage records, and reload/save actions.
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
the active coverage run, but it is not final-stack validation. Free memory
remained high at the end of the snapshot, around `426.5G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, and
completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-run duplicate/noise share `0` and
`0` summary startup failures; the copied state has `0` current-run triage
signatures, no current-run summary startup failure counters, and no health
warnings.
Historical triage remains duplicate/noise dominated, with historical top
duplicate family share `0.5976`, but persona-loop feedback continues to reject
reading that historical aggregate as a current product-failure signal. The
latest duplicate/noise synthesis still recommends fixing live-analysis startup
and adding strict pre-action startup gates in both the watcher and analysis tier.
The latest duplicate/noise feedback action applied only the novelty-monitor
scheduling/counter side and restarted the active run, so the watcher,
analysis-tier, and live-analysis fixes remain outside that edit pass.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T06:20:00Z` average about
`58.5%`, peak around `84.9%`, and end near `59.8%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `57.7`, `57.9`, and `57.6`, against `64` logical CPUs. The latest sampled
load is `47.21`, `49.78`, and `52.05` for 1/5/15 minutes respectively, below
the core-count reference line, while short spikes exceeded it earlier.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest copied state reports this current enabled set:

- `novelty-ws-common-blocks`
- `novelty-ws-long-session-large-doc`
- `novelty-ws-async-server-blocks`
- `novelty-http-persistence-probe`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-media-cross-entity`
- `novelty-ws-block-gauntlet`

The latest copied state has one paused group: `novelty-ws-lifecycle`. The
current active output directory is very young, so this enabled set is a live
scheduling snapshot rather than proof that the active output directory has
useful depth.

The historical enabled set covers the user-requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current state is narrower
than the full historical set, though real-user and media/cross-entity lanes are
active again after the duplicate/noise restart churn. The plot is one row per
group at first enable time; point size
reflects repeated enable log events, which are mostly
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
| `revision-persistence` | 2692 | 76 | 0 | 2.8% |
| `multi-reload-lifecycle` | 1974 | 58 | 0 | 2.9% |
| `parser-serialization` | 1396 | 60 | 0 | 4.3% |
| `real-user-editing` | 3736 | 233 | 1 | 6.2% |
| `common-blocks` | 2294 | 211 | 1 | 9.2% |
| `parser-transform` | 2577 | 267 | 0 | 10.4% |
| `block-gauntlet` | 3028 | 451 | 0 | 14.9% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 233 | 500 |
| gauntlet block core/html next coverage tier | 287 | 500 |
| gauntlet block core/more next coverage tier | 313 | 500 |
| gauntlet block core/details next coverage tier | 326 | 500 |
| action ui-heading-shortcut next coverage tier | 331 | 500 |
| action reload-post-action next coverage tier | 352 | 500 |
| CDP coverage records next coverage tier | 3878 | 5000 |
| gauntlet block core/gallery next coverage tier | 398 | 500 |
| real-user body save/reload next coverage tier | 161 | 200 |
| gauntlet block core/file next coverage tier | 466 | 500 |
| action ui-undo-redo-paragraph next coverage tier | 498 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `98`
completed review cycles took roughly `2.9` to `8.0` minutes in this snapshot;
the latest included review took `5.6` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action taking `4.1` minutes. The copied
input set includes PR-split syntheses through `20260516T061642Z`, an empty
PR-split feedback-action file at `20260516T061642Z`, the latest nonempty
PR-split feedback action at `20260516T060039Z`, duplicate/noise syntheses
through `20260516T061214Z`, and duplicate/noise feedback actions through
`20260516T055200Z`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T06:19:33Z`, has `21`
suggested rows totaling `11801` net LOC. The largest current rows by net LOC are
`PR 13B`, `PR 5`, `PR 12`, `PR 7A`, and `PR 11`, which matches the review
concern that the CRDT and parser normalization slices need the most careful
branch hygiene and range-diff review. The latest PR-split persona synthesis
supersedes the graph-only branch-shape read: it says the
`20260516T053947Z` finalization repaired the prior `PR 7A/7B`, `PR 14`, and
`PR 15A/15B/15C` blockers into usable `final/rtc-pr*` heads, while `PR 8`, ref
hygiene/import/push/rebase, and final combined-stack validation remain
blocking. It also says the now-nonempty deferred pre-save and rich-text reports
should be included in the next review cycle, but not promoted without consensus.

## Interpretation

The coverage data says the harness is broad enough to exercise the major
surfaces requested earlier, but the current live output directory is too young to
treat as a mature health sample. The active fuzz has `0` visible likely-real
failures, `11` unmet goals, current-run duplicate share `0`, `0` summary startup
failures, and no health warnings. The latest PR-split synthesis says the split
design is still intact and the `20260516T053947Z` finalization repaired the
prior branch-shape blockers for `PR 7A/7B`, `PR 14`, and `PR 15A/15B/15C` into
usable `final/rtc-pr*` heads, but it is explicit that the split is not
filing-ready. It rejects the graph-only interpretation that broad coverage or
`0` visible likely-real failures is enough to file/promote deferred browser-only
families into PR claims. The latest duplicate/noise evidence also rejects
treating historical aggregate duplicate/noise as a current product failure
signal; live status is the current-output-dir duplicate share and summary
startup-failure count. The remaining weakness is depth and completion on a small
number of high-value expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth and reload/save actions still need more observations;
- current-run duplicate/noise is the live health metric: the latest current-run
  duplicate share is `0`, summary startup failures are `0`, and current health
  warnings are empty; historical duplicate/noise remains reporting context only;
- the duplicate/noise persona consensus wanted triage-watcher and analysis-tier
  strict startup gates plus live-analysis startup repair; the latest feedback
  action applied the novelty-monitor side, while watcher/analysis-tier and
  live-analysis fixes remain unapplied in this loop;
- review only repaired `final/rtc-pr*` heads; do not file/review `shape/*`,
  `finalize/*`, `deferred/*`, dirty worktrees, old aggregate `PR 15`, `PR 1A`,
  or `PR 6B`;
- `PR 8` remains blocked pending comparison with `try/rtc-title-reload-pr`, and
  must not claim reload-hydration empty-live-editor coverage;
- reload-hydration empty-live-editor, pre-save search/live-collapse, and the
  new deferred rich-text evidence remain evidence-only until the next review
  cycle accepts them;
- no visible likely-real failures appeared in this snapshot, so new PR claims
  should stay gated on importing/rebasing the final refs and a fresh combined
  validation-stack fuzz run.

The next operational change should be conservative: keep existing coverage fuzz
running, avoid automatic new broad fuzz or duplicate split-review launches,
import/rebase the repaired final refs, and do only bounded `PR 8` comparison
work after preserving review-cycle order. For coverage-guided fuzzing, spend
capacity on completion-focused lanes for the unmet profiles while the loop
continues to re-prioritize based on these same goal ratios.
