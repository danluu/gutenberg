# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T10:23:08Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T102020Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1427` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T10:21:22Z`, coverage files grew from `272` to `29332`, a delta of
`29060`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `8` unmet goals.

The run has broad historical coverage, but the current active output directory
is `run-20260516T102020Z` and remains a live-health check, not a mature sample.
The latest copied state has three enabled groups:
`novelty-http-persistence-probe`, `novelty-ws-lifecycle`, and
`novelty-ws-persistence-no-title`. The latest current-output-dir health sample
is cleaner than the previous restart window: `duplicateShareCurrent` is `0`,
summary startup failures are `0`, quality issues are `1`, warnings are `1`, and
resource headroom is true. That is a latest-sample improvement, not proof the
duplicate/noise canary is fixed. The main remaining coverage gaps are depth
targets for real-user editing, gauntlet blocks, CDP coverage records,
reload-post actions, and the heading shortcut action.
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
remained high at the end of the snapshot, around `424.5G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, and
completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-output duplicate/noise share `0`,
`0` summary startup failures, `1` quality issue, `1` warning, and the resource
headroom flag true. That current-output-dir series, not historical aggregate
duplicate/noise, is the live health signal for the current output directory.
Recent current-output samples moved from `0.7143` duplicate share with `8`
summary startup failures at `2026-05-16T10:08:56Z`, to `0.7333`/`6` at
`2026-05-16T10:10:55Z`, `0.6667`/`0` at `2026-05-16T10:12:55Z`, `0`/`0` at
`2026-05-16T10:15:21Z`, `0.4`/`1` at `2026-05-16T10:19:41Z`, and `0`/`0` at
`2026-05-16T10:21:22Z`. The current output directory is still too young and
restart-heavy to treat the latest clean point as a resolved-health signal.

The latest duplicate/noise synthesis, `20260516T101325Z`, says the remaining
problem is a harness policy issue, not a product-failure family. The novelty
monitor can let strict zero-product-evidence startup/setup failures drive
scheduling before the current run proves it can produce successful completed
records, and the triage watcher can still split the same strict startup stall
into multiple signatures because canonicalization happens too late. The latest
duplicate/noise feedback action, `20260516T101325Z`, is empty; the latest
nonempty action, `20260516T094506Z`, changed the novelty monitor and restarted
the active loop, but explicitly did not fix triage-watcher duplicate ingestion.
The persona evidence therefore rejects any graph-only interpretation that the
duplicate/noise canary is clean or that more browser fuzzing is the fix.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T10:20:00Z` average about
`59.3%`, peak around `84.9%`, and end near `68.3%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `58.6`, `58.7`, and `58.3`, against `64` logical CPUs. The latest sampled
load is `80.80`, `67.30`, and `65.19` for 1/5/15 minutes respectively. All
three latest samples are above the core-count reference line, so the current
machine state is CPU-queued despite high free memory.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. They show `27` browser/e2e lanes and
`1` transport/integration lane. The current coverage-guided output directory is
narrower than that cross-campaign latest mix: it has
`novelty-http-persistence-probe`, `novelty-ws-lifecycle`, and
`novelty-ws-persistence-no-title`. Live fuzzing is still concentrated in
browser/e2e lanes, with one lower-level transport-integration lane active in the
latest cross-campaign snapshot. There are no latest active `unit-property`,
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

The latest collected execution data has `47,132` completed attempts:
`44,201` browser/e2e and `2,931` transport/integration. The latest 15-minute
bucket is running at about `632` browser/e2e attempts/hour and `12`
transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels are still at `0` executions in this counter.

The latest copied state reports this current enabled set:

- `novelty-http-persistence-probe`
- `novelty-ws-lifecycle`
- `novelty-ws-persistence-no-title`

The current active output directory is very young, so this enabled set is a live
scheduling snapshot rather than proof that the active output directory has
useful depth. The duplicate/noise feedback action held high-noise
recommendations immediately after restart, and the latest state is narrow again,
but the persona synthesis still rejects reading the scheduler hold as proven
effective before watcher/analysis suppression is fixed.

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
| `revision-persistence` | 3038 | 76 | 0 | 2.5% |
| `multi-reload-lifecycle` | 2241 | 58 | 0 | 2.6% |
| `parser-serialization` | 1680 | 60 | 0 | 3.6% |
| `real-user-editing` | 4474 | 268 | 0 | 6.0% |
| `parser-transform` | 2880 | 267 | 0 | 9.3% |
| `common-blocks` | 2695 | 252 | 0 | 9.4% |
| `long-session-large-doc` | 1915 | 280 | 0 | 14.6% |
| `block-gauntlet` | 3494 | 517 | 0 | 14.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1770 | 346 | 0 | 19.5% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 268 | 500 |
| gauntlet block core/html next coverage tier | 339 | 500 |
| gauntlet block core/details next coverage tier | 375 | 500 |
| gauntlet block core/more next coverage tier | 381 | 500 |
| action ui-heading-shortcut next coverage tier | 438 | 500 |
| action reload-post-action next coverage tier | 451 | 500 |
| CDP coverage records next coverage tier | 4564 | 5000 |
| gauntlet block core/gallery next coverage tier | 495 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `122`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review took `7.0` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action in the duration data taking `7.4`
minutes. The newest PR-split synthesis file, `20260516T101712Z`, is empty, so
the latest nonempty synthesis remains `20260516T100238Z`. It still rejects a
whole-stack filing-ready interpretation. It keeps the Cycle 120
PR13A/B0/B1/B2/B3 plus PR14 and PR15A/B/C direction, and it keeps the required
replacement split for aggregate `PR 11`: PR11A stale-base append, PR11B
stale-base delete, PR11C middle insert, PR11D top-level move/reorder, and PR11E
delete-plus-insert anchor. It also says the earlier PR6B replay produced a
nonempty report but no product oracle because the collaboration fuzz spec was
missing and no tests ran. The latest feedback-action file, `20260516T100238Z`,
applied the two-run consensus, updated `current-pr-split.md` with a Cycle 122
note, marked aggregate `PR 11` as source material only, and launched exactly one
corrected PR6B replay job:
`rtc-pr06b-corrected-ws-parser-transform-replay-5500001-5500002-5500006-20260516T101224Z`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T10:13:51Z`, has `18`
suggested rows totaling `8491` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 6` (`732`). The latest nonempty PR-split persona synthesis supersedes the graph-only
branch-shape read, including the parsed `PR 13B` and `PR 13C` rows: do not file
the old aggregate or stale/misordered `PR 13B`/`PR 13C` heads, or red Cycle 110
`PR13B1`/`PR13B2`/`PR13B3` heads. Replace them
with `final/rtc-pr13a-observed-delete-provenance-green`,
`final/rtc-pr13b0-identity-provenance-guard`,
`final/rtc-pr13b1-direct-source-retirement-green`,
`final/rtc-pr13b2-current-only-source-retirement-green`, and
`final/rtc-pr13b3-explicit-base-source-retirement-green`, then use green PR14
and PR15A/B/C after PR13B3. The accepted prior split changes remain
`PR 5A`/`PR 5B`/`PR 5C`, `PR 7A` -> `PR 7B`, and `PR 15A` -> `PR 15B` ->
`PR 15C`; the latest synthesis adds that aggregate `PR 11` must become
PR11A-E. Broad `PR 8` remains blocked, with the narrower
`origin/try/rtc-title-reload-pr` path now the intended next shape, and `PR 6B`
remains blocked pending the launched focused replay. The persona files reject filing
`shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, wildcard `final/rtc-pr*`,
old aggregate `PR 11`, old aggregate `PR 15`, `try/rtc-fix-stack-validation`,
`PR 1A`, and deferred
reload-hydration, pre-save, broad rich-text, malformed-save, or HTTP
room-isolation evidence. The LOC chart remains size telemetry from the parsed
status snapshots, not filing authority for split shape.

## Interpretation

The coverage data says the harness is broad enough to exercise the major
surfaces requested earlier, but the current live output directory is too young
and restart-heavy to treat as a mature health sample. The active fuzz has `0`
visible likely-real failures, `8` unmet goals, current-output duplicate share
`0`, `0` summary startup failures in the latest plotted pass, `1` quality
issue, `1` warning, and the resource headroom flag true. The current-output
duplicate/share and startup-failure metrics are the live health signal; the
historical duplicate/noise aggregate is reporting context only. The latest graph
shows a clean point, but the prior current-output samples in the same refresh
were noisy, so it does not prove the duplicate/noise canary is resolved.

The duplicate/noise persona evidence rejects the graph-only interpretation that
duplicate share alone is product evidence or that more browser fuzzing is the
fix. The consensus problem is strict zero-product-evidence startup/setup noise
being allowed to influence scheduling and signature queues before the current
run has enough successful completed records. The next remediation is still
narrow: hold broad WS expansion during startup-noise probation and canonicalize
or suppress only zero-user/no-action/no-product-evidence setup noise before
triage hashing or analysis queuing. The latest nonempty feedback action changed
the novelty monitor, but explicitly left triage-watcher duplicate ingestion
unresolved.

The PR-split persona evidence also rejects a graph-only filing-ready read. PR13
now has a green identity-first sequence and PR14/PR15 are reattached, but the
stack is still not whole-stack filing-ready until the allow-listed refs are on
the intended base and pass final combined validation. The latest nonempty
synthesis also rejects keeping aggregate `PR 11`, and the latest feedback action
applied that split decision while launching one corrected PR6B replay. Do not
file the old aggregate `PR 13B`, old `PR13C` wording/head, red Cycle 110 PR13B
heads, aggregate `PR 11`, `shape/*`, `finalize/*`, `deferred/*`, dirty
worktrees, old aggregate `PR 15`, `PR 1A`, wildcard `final/rtc-pr*`,
`try/rtc-fix-stack-validation`, broad `PR 8`, or `PR 6B`.

The remaining fuzzing weakness is depth and completion, not missing high-level
surface labels. Real-user editing is the largest explicit unmet depth target;
gauntlet block depth, CDP coverage, heading shortcut, and reload-post actions
still need more observations. Live fuzzing remains concentrated in `27`
browser/e2e lanes, with only one transport-integration lower-level lane active
and no active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` lane in the latest snapshot.

The next operational change should stay narrow. Let the corrected PR6B replay
answer seeds `5500001`, `5500002`, and `5500006`; drop PR6B if it fails. After
PR6B is classified, run one bounded PR11A-E split-shaping/check job. Broad
final-stack fuzz waits until the rebased combined validation stack exists and
the trunk port/rebase base is explicit. For coverage-guided fuzzing, spend
capacity on completion-focused lanes for the unmet profiles only after the
duplicate/noise canary has more than a single clean latest point; the latest
1/5/15-minute load samples are all above the 64-core reference, so extra browser
capacity needs a stronger reason than spare RAM.
