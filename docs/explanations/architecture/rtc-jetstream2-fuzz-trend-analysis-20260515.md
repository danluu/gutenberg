# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T14:17:27Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T140633Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1531` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T14:12:35Z`, coverage files grew from `272` to `32872`, a delta of
`32600`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The active output directory is `run-20260516T140633Z`. Its latest live-health
sample is noisy: `duplicateShareCurrent` is `0.4444`, summary startup failures
are `7`, quality issues are `0`, warnings are `0`, free memory is `428.2G`, and
resource headroom is true. Two preceding samples were clean, but the latest
current-output sample has regressed, so the state is not proven clean. The
current enabled group set contains `6` coverage-guided groups after the latest
output-dir reset. This report treats current-output-dir duplicate/noise and
startup-failure metrics as live status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a clean graph-only interpretation. The latest
duplicate/noise synthesis file present, `20260516T140722Z`, is empty; the latest
non-empty duplicate/noise synthesis, `20260516T135555Z`, says strict
no-user/no-action startup stalls in `bootstrap`, `open`, and `join` phases can
still leak past the triage watcher into analysis, and asks for triage watcher
suppression, an analysis-tier skip, and novelty-monitor probation based on
startup-noise profiles. The latest PR-split synthesis, `20260516T140421Z`, is
also not filing approval: the 28-head split shape is stable, but filing remains
blocked on seed `1020002` marker-divergence classification. The matching
feedback-action file launched a bounded follow-up, but that wrapper exited with
`launcher-no-report` after Codex returned `429 Too Many Requests`, so the seed
remains unclassified.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting. The top facet shows continued
coverage-file growth. Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The live health signal is unsettled. The latest current-output-dir sample for
`run-20260516T140633Z` has `duplicateShareCurrent=0.4444` and `7` summary
startup failures after two clean samples. The plot uses `duplicateShareCurrent`
and current summary startup failures for the live health view; it does not use
historical aggregate duplicate/noise as the plotted live signal.

The latest non-empty duplicate/noise synthesis rejects treating zero visible
likely-real count as enough. The previous feedback action patched the novelty
monitor's startup-noise capacity-floor path, but the newer synthesis says
startup stalls can still enter analysis before that monitor decision. It asks
for stricter triage watcher suppression of strict pre-action bootstrap stalls, a
defensive analysis-tier skip, and startup-noise probation in the novelty monitor
before broad expansion.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T14:10:01Z` still show sustained CPU
pressure, but below the 13:00 spike: the 13:00-14:10 samples range from `46.2%`
to `78.3%` utilization and end near `59.7%`. Load average rebounded from the
14:00 sample but remains below the 13:00 peak: the latest sampled 1/5/15-minute
load is `62.90`, `51.28`, and `44.78` against `64` logical CPUs. The immediate
blocker is validation quality and coverage depth rather than raw memory
headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current novelty state has
re-expanded to `6` coverage-guided groups after the latest output-dir reset:
lifecycle, common blocks, media cross-entity, async/server-backed blocks,
parser transform, and long/large sessions.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. Across the latest copied campaign
snapshots, the mix shows `27` browser/e2e lanes across `27` groups and no
lower-level lanes. The latest coverage-guided supervisor snapshot alone has `2`
browser/e2e lanes across `2` groups.

Live fuzzing is currently concentrated entirely in browser/e2e lanes. The latest
mix snapshot has no active `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, or standalone
`fuzz-assertion` fuzz-only assertion lanes.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `52,152` completed attempts:
`49,237` browser/e2e and `3,006` transport/integration. The latest 15-minute
bucket reports about `60` browser/e2e attempts/hour and `0`
transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels remain at `0` executions in this counter.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. The scatter uses records seen on the x-axis, completion rate
on the y-axis, startup-failure rate as point size, and unmet success goals as
triangle markers. Low-completion profiles are the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `revision-persistence` | 3338 | 76 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2486 | 58 | 0 | 2.3% |
| `parser-serialization` | 1982 | 60 | 0 | 3.0% |
| `real-user-editing` | 5049 | 284 | 3 | 5.6% |
| `common-blocks` | 3021 | 258 | 0 | 8.5% |
| `parser-transform` | 3200 | 288 | 0 | 9.0% |
| `long-session-large-doc` | 2108 | 281 | 0 | 13.3% |
| `block-gauntlet` | 3854 | 551 | 5 | 14.3% |
| `persistence-no-title` | 1965 | 348 | 2 | 17.7% |
| `structure` | 536 | 95 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 284 | 500 |
| gauntlet block core/html next coverage tier | 364 | 500 |
| gauntlet block core/details next coverage tier | 406 | 500 |
| gauntlet block core/more next coverage tier | 410 | 500 |
| CDP coverage records next coverage tier | 4824 | 5000 |

Reload-post and heading-shortcut action coverage have moved out of the unmet set
in this snapshot. The remaining queue mixes completed-record depth for expensive
profiles with auto-ratcheted depth targets for CDP hashes and gauntlet blocks.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because the harness observes both semantic state
transitions and low-level block/action combinations. The plot separates breadth
(`keys`) from repeated observations (`total_count`) so broad coverage is not
hidden inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, `148`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T140421Z`, took `5.7` minutes.

The latest PR-split synthesis, `20260516T140421Z`, says the split design is not
the blocker. It preserves the Cycle 134/146 explicit 28-head allow-list:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. It says the blocker is durable
final-stack WS/fuzz validation, not product behavior or PR boundaries: the
WebSocket provider/bootstrap path must be credible in a throwaway clone and the
remaining seed `1020002` marker divergence must pass or be classified. The
`20260516T140421Z` feedback-action file incorporated the completed durable WS
bootstrap report, preserved seed `1020002` as
`post-first-action-marker-divergence-open`, and launched a bounded marker
divergence follow-up. That follow-up exited with `launcher-no-report` after
Codex returned `429 Too Many Requests`, so seed `1020002` remains unclassified.
Do not start broad final-stack fuzz, extra lanes, reload diagnostics, PR13 work,
PR6B/PR6C/PR16 work, or another split-review loop until that classification
report exists.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T14:06:06Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live health sample is noisy
(`duplicateShareCurrent=0.4444`, `7` summary startup failures) after two clean
current-output samples, so recovery is not durable.

The duplicate/noise persona loop rejects a graph-only "resolved" read. Its
latest non-empty synthesis says strict pre-action bootstrap stalls still need
to be suppressed at the triage watcher and skipped in the analysis tier, with
startup-noise probation in the novelty monitor. That means the graph should be
read as live validation after the earlier capacity-floor patch, not as proof
that duplicate/noise is fixed.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged on the explicit 28-head allow-list, but seed `1020002` remains
unclassified after the bounded marker-divergence follow-up exited with a
`429 Too Many Requests` launcher failure. The next gate is classification, not
filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is currently all browser/e2e in the latest mix snapshots, with no active
lower-level lane. Transport-integration still has historical completed
executions, but the latest execution bucket has `0` transport/integration
attempts/hour and the other lower-level buckets remain at `0` executions. The
next narrow operational checks are triage/analysis suppression for strict
startup noise and seed `1020002` marker-divergence classification.
