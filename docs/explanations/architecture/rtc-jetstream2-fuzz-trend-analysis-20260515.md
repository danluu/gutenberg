# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T13:20:06Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T130839Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1507` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T13:18:47Z`, coverage files grew from `272` to `32310`, a delta of
`32038`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `7` unmet goals.

The run has broad historical coverage, but the current active output directory
is `run-20260516T130839Z` and remains a live-health check, not a mature sample.
The copied novelty state now has an empty `enabledGroups` set after startup-noise
probation paused every current browser group. The latest current-output-dir
health sample has `duplicateShareCurrent` `1`, summary startup failures `4`,
quality issues `2`, warnings `1`, and resource headroom true. That is a failed
canary, not a clean one. Persona evidence agrees: the latest duplicate/noise
synthesis, `20260516T130451Z`, says strict pre-action startup stalls still leak
past triage and analysis, and that novelty policy needs a capacity floor so it
cannot pause all productive/canary groups. The newest duplicate/noise
feedback-action file is empty, so no newer action record supersedes that
synthesis. The main remaining coverage gaps are depth targets for real-user
editing, gauntlet blocks, CDP coverage records, reload-post actions, and the
heading shortcut action.

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

The current loop is not finding visible likely-real failures, but that is not
final-stack validation and it is not a clean live-health signal. Free memory
remained high at the end of the snapshot, around `425G`, so the immediate
bottleneck is useful work selection, fresh-output health, CPU/load pressure, and
completion rate rather than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-output duplicate/noise share `1`,
`4` summary startup failures, `2` quality issues, `1` warning, and resource
headroom true. The current-output-dir series, not historical aggregate
duplicate/noise, is the live health signal for the current output directory.
After the roll to `run-20260516T130839Z`, duplicate share briefly reached `0`,
then rose to `1` while startup failures remained visible; one pass reported
`32` summary startup failures. The copied novelty state also has no enabled
groups, so this is an active scheduling/triage failure, not a resolved canary.

The latest duplicate/noise synthesis, `20260516T130451Z`, says the consensus
root cause is inconsistent startup-noise gating: strict no-user/no-action
startup failures from `bootstrap`, `open`, `join`, and gate-only discovery can
remain queued and then enter expensive analysis. It also says novelty policy can
overreact and pause every browser group. The persona evidence rejects any
graph-only interpretation that duplicate/noise is resolved or that adding more
browser fuzzing is the fix. The smallest safe next action is one shared strict
pre-action startup predicate in triage and analysis, plus a novelty-monitor
floor that keeps one bounded productive/canary group enabled.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T13:10:02Z` average about
`61.3%`, peak around `84.9%`, and end near `71.0%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `60.4`, `60.5`, and `60.1`, against `64` logical CPUs. The latest sampled
load is `56.26`, `61.34`, and `69.40` for 1/5/15 minutes respectively. The
15-minute load is still above the `64`-core reference line, and the previous
sample was higher across all three load windows, so extra browser capacity
should be justified by a clean health canary and product coverage, not spare RAM
alone.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. The latest copied mix snapshot shows `24`
browser/e2e lanes across `24` groups and `1` transport-integration lane. That
broader active compute mix is still concentrated in browser/e2e lanes, with one
lower-level transport-integration lane active. There are no latest active
`unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` fuzz-only assertion lanes in
the committed snapshot.

The current coverage-guided novelty state is worse than just narrow: its
`enabledGroups` set is empty after startup-noise probation paused all current
groups. That makes the duplicate/noise fix and novelty capacity floor a
precondition for adding more browser work. Once the canary is healthy, the
focused gap loop should treat the browser/e2e skew as a control variable and
consider bounded lower-level targets with clear oracles instead of only adding
or reshuffling browser action profiles.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `51,081` completed attempts:
`48,084` browser/e2e and `2,997` transport/integration. The latest 15-minute
bucket in the committed counter reports about `320` browser/e2e attempts/hour
and `8` transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels are still at `0` executions in this counter.

The latest copied novelty state reports no current enabled groups. That is a
live scheduling snapshot, not a statement about historical coverage depth. The
latest duplicate/noise synthesis asks for triage-side strict startup
suppression, an analysis-tier backstop, and a novelty-monitor floor before
treating the canary as clean.

The historical enabled set covers the user-requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The broader latest mix
snapshots still include browser/e2e parser-transform, parser-serialization,
multi-reload lifecycle, revision-persistence, and session-lifecycle lanes, but
the current coverage-guided novelty state has no enabled group. Those historical
and cross-campaign lanes are browser/e2e lanes, not lower-level harnesses. The
plot is one row per group at first enable time; point size reflects repeated
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
| `full` | 840 | 18 | 0 | 2.1% |
| `revision-persistence` | 3272 | 76 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2444 | 58 | 0 | 2.4% |
| `parser-serialization` | 1912 | 60 | 0 | 3.1% |
| `real-user-editing` | 4943 | 281 | 14 | 5.7% |
| `common-blocks` | 2949 | 254 | 7 | 8.6% |
| `parser-transform` | 3145 | 279 | 6 | 8.9% |
| `long-session-large-doc` | 2078 | 280 | 5 | 13.5% |
| `block-gauntlet` | 3769 | 541 | 7 | 14.4% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1925 | 346 | 7 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 281 | 500 |
| gauntlet block core/html next coverage tier | 355 | 500 |
| gauntlet block core/details next coverage tier | 403 | 500 |
| gauntlet block core/more next coverage tier | 408 | 500 |
| CDP coverage records next coverage tier | 4763 | 5000 |
| action ui-heading-shortcut next coverage tier | 486 | 500 |
| action reload-post-action next coverage tier | 496 | 500 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `142`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review took `6.0` minutes. Feedback actions ran every two
cycles; the latest completed feedback action in the event data is cycle `140`,
and cycle `142` had started but not finished by the snapshot. The newest
PR-split synthesis, `20260516T131309Z`, says the split design is not the blocker:
the Cycle 134/138/140 explicit 28-head allow-list remains the right replacement
shape, but filing is blocked because final-stack fuzz against
`validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` /
`921f093cc47b46844bf8fb48552483686c55ef6b` is still invalid. WS smoke fails
before the first fuzz action at `waitForSyncCycle()`, and HTTP smoke reached one
action before `rest_crdt_document_stale`. It rejects treating `0` visible
likely-real failures from that final-stack run as approval. The latest copied
PR-split feedback-action file is empty, so no newer action record supersedes the
latest synthesis.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T13:03:07Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). The latest PR-split persona synthesis supersedes the graph-only
branch-shape read: the latest parsed size telemetry still carries aggregate
`PR 13B` and `PR 13C` rows, but the persona files require the green
PR13A/B0/B1/B2/B3 -> PR14 -> PR15A/B/C continuation and reject reviving old
aggregate/red PR13 heads as filing targets. Aggregate `PR 11` must stay out of
filing in favor of replacement PR11A-E, former `PR 6B` remains dropped, and
late malformed-save work is not consensus `PR 6C` without focused replay
evidence. The persona files reject filing
`shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, wildcard
`final/rtc-pr*`, old aggregate `PR 11`, old aggregate `PR 15`,
`try/rtc-fix-stack-validation`, `PR 1A`, `PR 6B`, `PR 6C`, broad `PR 8`, and
deferred reload-hydration, pre-save, broad rich-text, malformed-save, or HTTP
room-isolation evidence. The LOC chart remains size telemetry from the parsed
status snapshots, not filing authority for split shape. The latest synthesis
requires exactly one bounded WS provider sync-cycle diagnostic from the generated
follow-up script and rejects broad fuzz, extra final-stack lanes, reload
diagnostics, PR13 repair/import, PR6B/PR6C work, or another split-review loop
until WS smoke is valid.

## Interpretation

The coverage data says the harness has broad historical reach, but the current
live output directory is not healthy. The active monitor still has `0` visible
likely-real failures and `7` unmet goals, but the latest current-output live
health sample has duplicate share `1`, `4` summary startup failures, `2` quality
issues, `1` warning, and resource headroom true. The current-output duplicate
share and startup-failure metrics are the live health signal; the historical
duplicate/noise aggregate is context only. The copied novelty state has no
enabled groups, so the graph should be read as startup-noise and scheduling
failure, not a clean no-failure result.

The duplicate/noise persona evidence rejects the graph-only interpretation that
the duplicate/noise canary is resolved or that more browser fuzzing is the fix.
The latest synthesis, `20260516T130451Z`, says strict pre-action startup
variants still need one shared predicate before triage and analysis, while
preserving failures with product evidence. It also adds a novelty-monitor floor
so startup probation cannot pause every productive/canary group. There is no
blocking disagreement on that narrow fix. The latest duplicate/noise
feedback-action file is empty, so there is no newer recorded implementation
action.

The PR-split persona evidence also rejects a graph-only filing-ready read. The
latest PR-split synthesis, `20260516T131309Z`, says the split shape has
converged on the explicit 28-head allow-list, but final-stack validation has
not. PR5 is split as PR5A/B/C, former PR6B is dropped, broad PR8 is out, PR11 is
PR11A-E, PR13 is the green PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
sequence, and PR14/PR15A-C are reattached. The clean post-PR11 validation ref is
`validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` /
`921f093cc47b46844bf8fb48552483686c55ef6b`, but WS smoke still fails before
first fuzz action at sync-cycle and HTTP smoke hit `rest_crdt_document_stale`
after one action. Do not file PRs or rerun broad final-stack fuzz until one
bounded WS provider sync-cycle diagnostic classifies harness/provider versus
product behavior and proves WS can reach collaboration readiness, mutual
discovery, sync-cycle, first fuzz action, and behavioral coverage.

The remaining fuzzing weakness is depth and completion, not missing high-level
surface labels. Real-user editing is the largest explicit unmet depth target;
gauntlet block depth, CDP coverage, heading shortcut, and reload-post actions
still need more observations. The latest broader mix snapshot remains dominated
by `24` browser/e2e lanes with one transport-integration lower-level lane and no
active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` lane. The execution counter
shows the same skew: `48,084` browser/e2e completed seed attempts versus
`2,997` transport/integration attempts and `0` for the other lower-level
buckets.

The next operational change should stay narrow. For the PR stack, run exactly
the bounded WS provider sync-cycle diagnostic before filing or broad reruns. For
coverage-guided fuzzing, fix the strict startup-noise triage/analysis boundary
and add the novelty capacity floor before spending capacity on completion-focused
lanes. The latest 1/5/15-minute load samples are `56.26`, `61.34`, and `69.40`,
so the immediate blocker is canary quality and product coverage rather than raw
load headroom.
