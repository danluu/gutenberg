# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T07:12:21Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T064057Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1335` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T07:10:30Z`, coverage files grew from `272` to `25841`, a delta of
`25569`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `10` unmet goals.

The run has broad historical coverage, but the current active output directory
was just restarted at `2026-05-16T06:41:08Z` and is still a live-health check,
not a mature sample. The latest copied state has seven active lanes:
`novelty-ws-common-blocks`, `novelty-ws-long-session-large-doc`,
`novelty-ws-async-server-blocks`, `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-media-cross-entity`, and
`novelty-ws-block-gauntlet`. The copied state has no paused groups. The main
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
remained high at the end of the snapshot, around `420.2G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, and
completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-run duplicate/noise share `0`, `0`
summary startup failures, `0` quality issues, and no current health warnings.
Historical triage remains duplicate/noise dominated, with raw historical top
duplicate family share about `0.5976`; the copied monitor data now reports
actionable historical duplicate share near `0.3985` after known-noise
suppression. Persona-loop feedback continues to reject reading either historical
aggregate as a current product-failure signal. The latest duplicate/noise
synthesis keeps the narrow consensus: add one strict all-facts pre-action
startup-noise predicate before analysis, only for zero-user/no-action records
with no reload/save/fault/lifecycle/operation/success evidence and startup
timeout semantics in `seed`, `bootstrap`, `open`, or `join`. It also calls out
the observability/control split where coverage-guided live analysis is often
empty for the active output. It rejects broad timeout, unknown, assertion,
collaboration, or history-only suppression. The latest nonempty
duplicate/noise feedback action extended the novelty-monitor startup-failure
cooldown carryover, restarted only the active novelty monitor, and measured a
post-restart pass with no monitor crash. It also says the direct
triage-watcher/analysis-tier gates remain unapplied because those files were
outside that turn's edit allowlist.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T07:10:00Z` average about
`58.9%`, peak around `84.9%`, and end near `76.3%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `58.1`, `58.3`, and `57.8`, against `64` logical CPUs. The latest sampled
load is `79.68`, `77.86`, and `73.71` for 1/5/15 minutes respectively, with
all three latest samples above the core-count reference line.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest copied state reports this current enabled set:

- `novelty-ws-common-blocks`
- `novelty-ws-long-session-large-doc`
- `novelty-ws-async-server-blocks`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-media-cross-entity`
- `novelty-ws-block-gauntlet`

The latest copied state has no paused groups. The current active output
directory is very young, so this enabled set is a live scheduling snapshot
rather than proof that the active output directory has useful depth.

The historical enabled set covers the user-requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current state is narrower
than the full historical set, though real-user, media/cross-entity, async, and
gauntlet lanes are active again after the duplicate/noise restart churn. The
plot is one row per group at first enable time; point size
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
| `revision-persistence` | 2756 | 76 | 0 | 2.8% |
| `multi-reload-lifecycle` | 2019 | 58 | 0 | 2.9% |
| `parser-serialization` | 1447 | 60 | 0 | 4.1% |
| `real-user-editing` | 3889 | 239 | 0 | 6.1% |
| `common-blocks` | 2379 | 220 | 0 | 9.2% |
| `parser-transform` | 2636 | 267 | 0 | 10.1% |
| `block-gauntlet` | 3126 | 466 | 0 | 14.9% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 239 | 500 |
| gauntlet block core/html next coverage tier | 301 | 500 |
| gauntlet block core/more next coverage tier | 329 | 500 |
| gauntlet block core/details next coverage tier | 336 | 500 |
| action ui-heading-shortcut next coverage tier | 347 | 500 |
| action reload-post-action next coverage tier | 372 | 500 |
| CDP coverage records next coverage tier | 4055 | 5000 |
| gauntlet block core/gallery next coverage tier | 417 | 500 |
| real-user body save/reload next coverage tier | 169 | 200 |
| gauntlet block core/file next coverage tier | 496 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `102`
completed review cycles took roughly `2.9` to `8.0` minutes in this snapshot;
the latest included review took `6.7` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action taking `5.2` minutes. The copied
input set includes an empty PR-split synthesis at `20260516T070609Z`, the
latest nonempty PR-split synthesis and feedback action at `20260516T065416Z`,
and duplicate/noise synthesis and feedback action files through
`20260516T065434Z`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T07:02:07Z`, has `20`
suggested rows totaling `10189` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 11` (`1141`), and
`PR 13A` (`1126`), which matches the review concern that the CRDT and parser
normalization slices need the most careful branch hygiene and range-diff review.
The latest PR-split persona synthesis supersedes the graph-only branch-shape
read: it says the split remains structurally sound but not filing-ready,
repaired `final/rtc-pr*` heads from `pr-stack-20260516T061949Z` are the only
valid PR-head candidates, and those refs still need import into the fix-plan
repo, upstream rebase/recreation, focused checks, and final combined-stack
validation. It also keeps `PR 8` blocked on comparison with
`try/rtc-title-reload-pr`, rejects promoting deferred reload-hydration,
pre-save, rich-text, malformed-save, and HTTP room-isolation evidence, and says
not to file/review `shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, or
the old aggregate `PR 15`. The graph no longer carries a standalone `PR 5` row
in the latest parsed snapshot, but the latest persona synthesis still carries a
non-unanimous plausible `PR 5A/5B/5C` split override into the import/rebase job
for adjudication rather than treating the size chart alone as consensus. The
latest nonempty PR-split feedback action applied cycle-102 guidance to the split
notes and launched one bounded final-ref queue-audit job; final-stack fuzz still
waits on rebased final heads and a fresh combined validation stack.

## Interpretation

The coverage data says the harness is broad enough to exercise the major
surfaces requested earlier, but the current live output directory is too young to
treat as a mature health sample. The active fuzz has `0` visible likely-real
failures, `10` unmet goals, current-run duplicate share `0`, `0` summary startup
failures, `0` quality issues, and no health warnings. The latest PR-split
synthesis says the split design is still intact and repaired `final/rtc-pr*`
heads exist, but it is explicit that the split is not filing-ready until those
refs are imported, rebased, checked, and validated as a combined stack. It
rejects the graph-only interpretation that broad coverage or `0` visible
likely-real failures is enough to file/promote deferred browser-only families
into PR claims. The latest duplicate/noise evidence also rejects treating
historical aggregate duplicate/noise as a current product failure signal or
adding broad historical family suppression; live status is the current-output-dir
duplicate share and summary startup-failure count. The remaining weakness is
depth and completion on a small number of high-value expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth and reload/save actions still need more observations;
- current-run duplicate/noise is the live health metric: the latest current-run
  duplicate share is `0`, summary startup failures are `0`, and current health
  warnings are empty; historical duplicate/noise remains reporting context only;
- the duplicate/noise persona consensus wants one strict all-facts pre-action
  startup predicate in the watcher plus an analysis-tier backstop, with history
  used only as a scheduling prior after current strict proof and zero current
  successes; the latest nonempty feedback action extended only the
  novelty-monitor cooldown carryover and restarted that monitor, so the watcher
  and analysis-tier gates remain unapplied in this loop;
- review only repaired `final/rtc-pr*` heads; do not file/review `shape/*`,
  `finalize/*`, `deferred/*`, dirty worktrees, old aggregate `PR 15`, `PR 1A`,
  or `PR 6B`;
- `PR 8` remains blocked pending comparison with `try/rtc-title-reload-pr`, and
  must not claim reload-hydration empty-live-editor coverage;
- reload-hydration empty-live-editor, pre-save search/live-collapse, rich-text,
  malformed-save, and HTTP room-isolation evidence remain evidence-only until
  repeated review consensus accepts them;
- no visible likely-real failures appeared in this snapshot, so new PR claims
  should stay gated on importing/rebasing the final refs and a fresh combined
  validation-stack fuzz run.

The next operational change should be conservative: keep existing coverage fuzz
running, avoid new broad fuzz or duplicate split-review launches, and use the
one bounded final-ref queue-audit/import-rebase-check job already launched by
cycle 102 rather than starting parallel replacements. That job should include
the `PR 5A/5B/5C` override for adjudication, resolve `PR 8` against
`try/rtc-title-reload-pr`, rerun focused checks plus lint and diff-check, and
only then build a fresh final validation stack. For coverage-guided fuzzing,
spend capacity on completion-focused lanes for the unmet profiles while the loop
continues to re-prioritize based on these same goal ratios; the latest CPU/load
samples are already above the 64-core reference, so extra browser capacity would
need a stronger reason than spare RAM.
