# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T10:50:13Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T104651Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1440` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T10:48:07Z`, coverage files grew from `272` to `29764`, a delta of
`29492`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `8` unmet goals.

The run has broad historical coverage, but the current active output directory
is `run-20260516T104651Z` and remains a live-health check, not a mature sample.
The latest copied state has two enabled groups:
`novelty-http-persistence-probe` and `novelty-ws-lifecycle`. The latest
current-output-dir health sample has `duplicateShareCurrent` `0`, summary
startup failures `0`, quality issues `1`, warnings `1`, and resource headroom
true. The live duplicate canary improved, but the current output directory also
reports no behavioral coverage files yet, and persona evidence still rejects
treating duplicate/noise as resolved because strict pre-action startup noise
can still reach triage and analysis queues. The main remaining coverage gaps
are depth targets for real-user editing, gauntlet blocks, CDP coverage records,
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
remained high at the end of the snapshot, around `424.2G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, CPU/load
pressure, and completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-output duplicate/noise share
`0`, `0` summary startup failures, `1` quality issue, `1` warning, and
the resource headroom flag true. That current-output-dir series, not
historical aggregate duplicate/noise, is the live health signal for the current
output directory.
Recent current-output samples moved from `0.4375` duplicate share with `1`
summary startup failure at `2026-05-16T10:30:14Z`, to `0.4`/`2` at
`2026-05-16T10:32:54Z`, `0.25`/`1` at `2026-05-16T10:35:03Z`, `0.2051`/`0` at
`2026-05-16T10:37:09Z`, `0.2381`/`1` at `2026-05-16T10:39:17Z`,
`0.2041`/`0` at `2026-05-16T10:41:28Z`, then `0.2222`/`1`, `0.2105`/`0`, and
`0`/`0` through `2026-05-16T10:48:07Z`. The current output directory is still
too young and restart-heavy to treat the improvement as resolved, especially
with the latest no-behavioral-coverage warning.

The latest duplicate/noise synthesis, `20260516T103851Z`, says the consensus
root cause is a policy-boundary bug: historical and external-live
`pre_action_bootstrap_stall` dominance can still influence current-run browser
scheduling, while strict no-user, no-action, no-product-evidence startup noise
is under-suppressed before watcher and analysis queues. The latest nonempty
duplicate/noise feedback action, `20260516T101325Z`, changed only the novelty
monitor and restarted that loop; triage-watcher and analysis-tier
canonicalization remain unresolved. The persona evidence therefore rejects any
graph-only interpretation that the duplicate/noise canary is clean or that more
browser fuzzing is the fix.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T10:40:00Z` average about
`60.5%`, peak around `84.9%`, and end near `71.1%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `60.0`, `60.0`, and `59.6`, against `64` logical CPUs. The latest sampled
load is `70.64`, `64.42`, and `63.40` for 1/5/15 minutes respectively. The
latest 1-minute value is above the core-count reference line and the 5/15-minute
values are near it, so the current machine state is still near saturation
despite high free memory.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. They show `26` browser/e2e lanes and
`1` transport/integration lane. The current coverage-guided output directory
has `novelty-http-persistence-probe` and `novelty-ws-lifecycle`; the broader
latest cross-campaign snapshots are still concentrated in browser/e2e lanes,
with one lower-level transport-integration lane active. There are no latest
active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` fuzz-only assertion lanes in
the committed snapshot.

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

The latest collected execution data has `47,720` completed attempts:
`44,779` browser/e2e and `2,941` transport/integration. The latest 15-minute
bucket is running at about `408` browser/e2e attempts/hour and `8`
transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels are still at `0` executions in this counter.

The latest copied state reports this current enabled set:

- `novelty-http-persistence-probe`
- `novelty-ws-lifecycle`

The current active output directory is very young, so this enabled set is a live
scheduling snapshot rather than proof that the active output directory has
useful depth. The latest duplicate/noise feedback action changed monitor
gating, but watcher/analysis canonicalization remains unresolved. The newer
duplicate/noise synthesis rejects reading the lower live duplicate share as a
clean canary until strict startup signatures are suppressed before triage and
analysis.

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
| `revision-persistence` | 3074 | 76 | 0 | 2.5% |
| `multi-reload-lifecycle` | 2263 | 58 | 0 | 2.6% |
| `parser-serialization` | 1716 | 60 | 0 | 3.5% |
| `real-user-editing` | 4547 | 268 | 0 | 5.9% |
| `parser-transform` | 2912 | 267 | 0 | 9.2% |
| `common-blocks` | 2739 | 252 | 0 | 9.2% |
| `long-session-large-doc` | 1942 | 280 | 0 | 14.4% |
| `block-gauntlet` | 3528 | 517 | 0 | 14.7% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1796 | 346 | 0 | 19.3% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 268 | 500 |
| gauntlet block core/html next coverage tier | 340 | 500 |
| gauntlet block core/details next coverage tier | 377 | 500 |
| gauntlet block core/more next coverage tier | 384 | 500 |
| action ui-heading-shortcut next coverage tier | 450 | 500 |
| action reload-post-action next coverage tier | 455 | 500 |
| CDP coverage records next coverage tier | 4578 | 5000 |
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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `126`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review took `4.9` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action in the duration data taking `3.5`
minutes. The newest PR-split synthesis file, `20260516T104057Z`, rejects a
whole-stack filing-ready interpretation and changes the filing plan: `PR 6B`
is now a drop, not a blocked-but-possible filing candidate. It keeps aggregate
`PR 11` out of filing and replaces it with PR11A stale-base append, PR11B
stale-base delete, PR11C middle insert, PR11D top-level move/reorder, and PR11E
delete-plus-insert anchor. It preserves PR5A/B/C, narrow PR8A, the green
PR13A/B0/B1/B2/B3 plus PR14 and PR15A/B/C direction, and says the next work is
one bounded PR11A-E shaping/check job. The latest completed feedback-action
file, `20260516T102401Z`, still recorded PR6B as the active gate and launched
no new jobs; the newer synthesis supersedes that because the corrected PR6B
replay report is now nonempty and reclassified PR6B as a drop.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T10:42:07Z`, has `20`
suggested rows totaling `8559` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), `PR 13B3` (`758`), and
`PR 6` (`732`). The latest PR-split persona synthesis supersedes the graph-only
branch-shape read: any parsed `PR 6B` telemetry is stale blocked-candidate data
and should be dropped from the filing path, aggregate `PR 11` must stay out of
filing until PR11A-E are shaped and checked, and the green PR13A/B0/B1/B2/B3 ->
PR14 -> PR15A/B/C continuation remains the intended sequence. The persona files
reject filing `shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, wildcard
`final/rtc-pr*`, old aggregate `PR 11`, old aggregate `PR 15`,
`try/rtc-fix-stack-validation`, `PR 1A`, `PR 6B`, `PR 6C`, broad `PR 8`, and
deferred reload-hydration, pre-save, broad rich-text, malformed-save, or HTTP
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
shows the live duplicate share improved after the `10:32Z` spike, but the
no-behavioral-coverage warning and persona-loop evidence still block reading it
as resolved startup-noise handling.

The duplicate/noise persona evidence rejects the graph-only interpretation that
the lower live duplicate share is a clean canary or that more browser fuzzing is
the fix. The consensus problem is scope leakage plus strict
zero-product-evidence startup/setup noise being allowed through inconsistent
triage and analysis gates. The next remediation is narrow: make current-run
browser scheduling authoritative, suppress only strict no-user/no-action
startup signatures before watcher/analysis queues, and keep the analysis-tier
backstop for stale queued startup noise.

The PR-split persona evidence also rejects a graph-only filing-ready read. PR13
now has a green identity-first sequence and PR14/PR15 are reattached, but the
stack is still not whole-stack filing-ready until the allow-listed refs are on
the intended base and pass final combined validation. The latest synthesis
drops `PR 6B`, tracks seed `5500002` as a separate revision-restore
marker-retention follow-up, keeps aggregate `PR 11` out of filing, and says to
launch one bounded PR11A-E shaping/check job. Do not file the old aggregate
`PR 13B`, old `PR13C` wording/head, red Cycle 110 PR13B heads, aggregate
`PR 11`, `shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, old aggregate
`PR 15`, `PR 1A`, wildcard `final/rtc-pr*`,
`try/rtc-fix-stack-validation`, broad `PR 8`, `PR 6B`, or `PR 6C`.

The remaining fuzzing weakness is depth and completion, not missing high-level
surface labels. Real-user editing is the largest explicit unmet depth target;
gauntlet block depth, CDP coverage, heading shortcut, and reload-post actions
still need more observations. Live fuzzing remains concentrated in `26`
browser/e2e lanes, with only one transport-integration lower-level lane active
and no active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` lane in the latest snapshot.
The execution counter shows the same skew: `44,779` browser/e2e completed seed
attempts versus `2,941` transport/integration attempts and `0` for the other
lower-level buckets.

The next operational change should stay narrow. Record PR6B as dropped, track
seed `5500002` as its own follow-up, and launch one bounded PR11A-E
split-shaping/check job. Broad final-stack fuzz waits until the rebased combined
validation stack exists and the trunk port/rebase base is explicit. For
coverage-guided fuzzing, spend capacity on completion-focused lanes for the
unmet profiles only after the duplicate/noise canary has a sustained clean
current-output trend; the latest 1/5/15-minute load samples are `70.64`,
`64.42`, and `63.40`, so extra browser capacity needs a stronger reason than
spare RAM.
