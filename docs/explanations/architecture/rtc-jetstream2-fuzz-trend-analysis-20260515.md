# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T09:25:23Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T080053Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1400` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T09:24:18Z`, coverage files grew from `272` to `28332`, a delta of
`28060`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `8` unmet goals.

The run has broad historical coverage, but the current active output directory
is `run-20260516T080053Z` and is still a live-health check, not a mature
sample. The latest copied state has seven active groups:
`novelty-ws-common-blocks`, `novelty-ws-long-session-large-doc`,
`novelty-ws-async-server-blocks`, `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-media-cross-entity`, and
`novelty-ws-block-gauntlet`, with no paused groups in the copied state. The
main remaining coverage gaps are depth targets for real-user editing, gauntlet
blocks, CDP coverage records, reload-post actions, and the heading shortcut
action.
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
remained high at the end of the snapshot, around `420.9G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, and
completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-output duplicate/noise share
`0.7573`, `0` summary startup failures, `2` quality issues, and no current
health warnings, with the resource headroom flag false. That current-output-dir
series, not historical aggregate duplicate/noise, is the live health signal for
the current output directory.

The latest duplicate/noise synthesis, `20260516T091615Z`, says the problem is an
enforcement gap rather than one RTC product failure: strict pre-action startup
and bootstrap stalls are inconsistently classified across the runner, triage
watcher, supervisor, novelty monitor, and analysis tier. It rejects broad
suppression from duplicate share alone. The safe fix is one strict current-run
known-noise predicate for no-user, no-action, no-product-evidence startup
failures; product-evidence `unknown`, timeout, assertion,
collaboration-non-convergence, and late-session failures must remain visible.
The latest feedback-action file, `20260516T091615Z`, is empty in the copied
inputs. The last nonempty action, `20260516T084305Z`, made current-run gate-only
triage measurable and restarted the coverage-guided novelty/supervisor sessions,
but left the triage-watcher and analysis-tier admission fixes unapplied.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T09:20:00Z` average about
`60.0%`, peak around `84.9%`, and end near `81.4%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `59.7`, `59.6`, and `59.0`, against `64` logical CPUs. The latest sampled
load is `87.13`, `90.86`, and `87.73` for 1/5/15 minutes respectively. All
three latest samples are above the core-count reference line.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. They show `31` browser/e2e lanes and `1`
transport/integration lane. Live fuzzing is concentrated in browser/e2e lanes,
with one transport-integration lane active. There are no latest active
`unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, or standalone
`fuzz-assertion` fuzz-only assertion lanes in the committed snapshot.

This does not mean lower-level checks are useless; it means the current active
compute mix is still dominated by browser Playwright RTC fuzzing. The focused
gap loop should now treat that as an explicit control variable: when browser
lanes stall or only rediscover known failures, it should consider a bounded
lower-level target with a clear oracle instead of only adding or reshuffling
browser action profiles. For isolated lower-level code, that target should
include the option of a libFuzzer/AFL-style coverage-guided harness, or an
equivalent JS/PHP coverage-guided loop if native libFuzzer is not practical.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `45,818` completed attempts:
`42,845` browser/e2e and `2,973` transport/integration. The latest 15-minute
bucket is running at about `1052` browser/e2e attempts/hour and `12`
transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels are still at `0` executions in this counter.

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
permissions/auth/locks, and long/large sessions. The current coverage-guided
novelty state is narrower than the full historical set, but the broader latest
mix snapshots still include browser/e2e parser-transform, parser-serialization,
multi-reload lifecycle, revision-persistence, and session-lifecycle lanes. Those
are active as browser/e2e lanes, not lower-level harnesses. The plot is one row
per group at first enable time; point size reflects repeated enable log events,
which are mostly restart/re-enable noise rather than new coverage launches.

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
| `revision-persistence` | 2953 | 76 | 0 | 2.6% |
| `multi-reload-lifecycle` | 2166 | 58 | 0 | 2.7% |
| `parser-serialization` | 1614 | 60 | 0 | 3.7% |
| `real-user-editing` | 4293 | 265 | 0 | 6.2% |
| `parser-transform` | 2804 | 267 | 0 | 9.5% |
| `common-blocks` | 2620 | 252 | 0 | 9.6% |
| `block-gauntlet` | 3395 | 515 | 0 | 15.2% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 265 | 500 |
| gauntlet block core/html next coverage tier | 330 | 500 |
| gauntlet block core/details next coverage tier | 368 | 500 |
| gauntlet block core/more next coverage tier | 371 | 500 |
| action ui-heading-shortcut next coverage tier | 418 | 500 |
| action reload-post-action next coverage tier | 441 | 500 |
| CDP coverage records next coverage tier | 4548 | 5000 |
| gauntlet block core/gallery next coverage tier | 487 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `118`
completed review cycles took roughly `2.9` to `10.3` minutes in this snapshot;
the latest completed review took `6.5` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action in the duration data taking `3.7`
minutes. The latest PR-split synthesis, `20260516T091517Z`, says the current
split is stale around PR13 and rejects the graph-only read that the old aggregate
`PR13B` or red Cycle 110 `PR13B1`/`PR13B2`/`PR13B3` heads are filing-ready. It
selects a repaired green identity-first sequence: `PR13A` observed-delete
provenance, `PR13B0` identity/provenance guard, then direct, current-only, and
explicit-base source-retirement heads. Those refs are still in the PR13 job
clone, not the main fix-plan repo, so the next review-side action is exactly one
bounded PR13 finalization/import reconciliation job. The latest feedback-action
file, `20260516T091517Z`, is empty in the copied inputs; the last nonempty action
remains `20260516T085735Z`, which recorded the Cycle 116 rejection and launched
no duplicate PR13 job.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T09:16:05Z`, has `20`
suggested rows totaling `9282` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 7A` (`1331`), `PR 11` (`1141`), `PR 13A` (`1126`), and
`PR 5B` (`883`). No `PR13B` row remains in the latest parsed status snapshot.
The latest PR-split persona synthesis supersedes the older graph-only
branch-shape read: do not file the old aggregate `PR 13B`, old aggregate `PR13C`
wording/head, or red Cycle 110 `PR13B1`/`PR13B2`/`PR13B3` heads. Replace them
with `final/rtc-pr13a-observed-delete-provenance-green`,
`final/rtc-pr13b0-identity-provenance-guard`,
`final/rtc-pr13b1-direct-source-retirement-green`,
`final/rtc-pr13b2-current-only-source-retirement-green`, and
`final/rtc-pr13b3-explicit-base-source-retirement-green`, then reattach PR14/PR15
on the green PR13B3 stack. The accepted prior split changes remain
`PR 5A`/`PR 5B`/`PR 5C`, `PR 7A` -> `PR 7B`, and `PR 15A` -> `PR 15B` ->
`PR 15C`. Broad `PR 8` remains blocked, with the narrower
`origin/try/rtc-title-reload-pr` path now the intended next shape, and `PR 6B`
remains blocked pending focused replay. The persona files reject filing
`shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, wildcard `final/rtc-pr*`,
old aggregate `PR 15`, `try/rtc-fix-stack-validation`, `PR 1A`, and deferred
reload-hydration, pre-save, broad rich-text, malformed-save, or HTTP
room-isolation evidence. The LOC chart remains size telemetry from the parsed
status snapshots, not filing authority for split shape.

## Interpretation

The coverage data says the harness is broad enough to exercise the major
surfaces requested earlier, but the current live output directory is too young to
treat as a mature health sample. The active fuzz has `0` visible likely-real
failures, `8` unmet goals, current-output duplicate share `0.7573`, `0` summary
startup failures in the latest plotted pass, `2` quality issues, and no health
warnings, with the resource headroom flag false. The current-output
duplicate/share and startup-failure metrics are the live health signal.
Current-run gate-only triage is now measurable, but the latest duplicate/noise
synthesis still calls the problem an enforcement gap: strict startup-noise
classification, duplicate summary intake, and analysis-tier gating need the
recommended current-run-first admission work before current likely-real
visibility can be treated as complete. The latest PR-split persona evidence
rejects the graph-only interpretation that a stable LOC chart, broad coverage,
or the old PR13 heads make the refs filing-ready: the green identity-first PR13
sequence must be imported into the filing source of truth and PR14/PR15 must be
reattached before evidence is regenerated. Both persona evidence and graph data
reject the graph-only interpretation that broad coverage or `0` visible
likely-real failures is enough to file or promote deferred browser-only families
into PR claims. The latest duplicate/noise evidence also rejects treating
historical aggregate duplicate/noise as a current product signal or treating the
current duplicate share alone as classified product evidence. The remaining
weakness is depth and completion on a small number of high-value expensive lanes:

- real-user editing is the largest explicit unmet depth target;
- gauntlet block depth, CDP coverage, heading shortcut, and reload-post actions
  still need more observations;
- current-output duplicate/noise is the live health metric: the latest current
  duplicate share is `0.7573`, summary startup failures are `0`, quality issues
  are `2`, current health warnings are empty in the plotted pass, and the
  resource headroom flag is false; historical duplicate/noise remains reporting
  context only;
- the duplicate/noise persona consensus wants one strict current-run
  startup-noise predicate wired through triage, analysis, novelty counters, and
  scheduling, plus summary-row dedupe; the latest feedback-action file is empty,
  and the last nonempty action made gate-only triage measurable but left
  triage-watcher and analysis-tier admission fixes unapplied;
- PR13 now has a selected green repair sequence, but filing still needs import,
  PR14/PR15 reattachment, branch graph, containment, adjacent range-diff,
  diffstat/numstat, focused tests, lint, `git diff --check`, and validation
  stack proof from the filing repo; do not file the old aggregate `PR 13B`, old
  `PR13C` wording/head, red Cycle 110 PR13B heads, `shape/*`, `finalize/*`,
  `deferred/*`, dirty worktrees, old aggregate `PR 15`, `PR 1A`, wildcard
  `final/rtc-pr*`, `try/rtc-fix-stack-validation`, or `PR 6B`;
- broad `PR 8` remains blocked; the next PR 8 shape should use the narrow
  `origin/try/rtc-title-reload-pr` path and must not claim reload-hydration
  empty-live-editor coverage;
- reload-hydration empty-live-editor, pre-save search/live-collapse, rich-text,
  malformed-save, and HTTP room-isolation evidence remain evidence-only until
  repeated review consensus accepts them;
- no visible likely-real failures appeared in this snapshot, so new PR claims
  should stay gated on importing/rebasing the final refs and a fresh combined
  validation-stack fuzz run.

The next operational change should be conservative: keep existing coverage fuzz
running, avoid new broad fuzz or duplicate split-review launches, import/fetch
the green PR13 refs into the filing repo, reattach PR14/PR15 on green PR13B3, and
regenerate filing evidence from those actual refs. If the 40-commit validation
lineage is explicitly required, do one bounded rebuild using the green PR13
boundaries. After PR13 reconciliation, the next review-side action is exactly one
bounded `PR 6B` replay for parser-transform seeds `5500001`, `5500002`, and
`5500006`; drop `PR 6B` if it fails. Broad final-stack fuzz waits until the
rebased combined validation stack exists and the trunk port/rebase base is
explicit. For coverage-guided fuzzing, spend capacity on completion-focused lanes
for the unmet profiles while the loop continues to re-prioritize based on these
same goal ratios; the latest CPU/load samples are already above the 64-core
reference, so extra browser capacity would need a stronger reason than spare
RAM. For duplicate/noise, the next pass should wire the strict current-run
startup-noise predicate through triage, analysis, counters, and scheduling, then
prove it with a bounded canary before opening more browser fuzz or analysis load.
