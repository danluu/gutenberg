# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T15:38:10Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T15:31:51.604Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1568` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T15:37:29Z`, coverage files grew from `272` to `33351`, a delta of
`33079`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The latest plotted current-output-dir sample is clean on duplicate and startup
status: `duplicateShareCurrent` is `0`, summary startup failures are `0`,
warnings are `0`, free memory is `426.6G`, resource headroom is true, and
quality issues are `0`. The copied novelty state lists one enabled
coverage-guided group, `novelty-http-persistence-probe`. This report treats
current-output-dir duplicate/noise and startup-failure metrics as live status;
historical aggregate duplicate/noise is only context.

Persona-loop evidence rejects a graph-only "resolved" interpretation. The
newest duplicate/noise synthesis, `20260516T152629Z`, says strict pre-action
startup noise is recognized but not suppressed early enough: triage can leave
`pre-action-bootstrap-stall` and `pre-action-awareness-stall` signatures queued,
and the analysis tier can still spend Codex work on them. The latest
duplicate/noise feedback-action, `20260516T145914Z`, implemented
novelty-monitor gating and disabled the noisy `novelty-ws-lifecycle` producer,
but it explicitly left triage-watcher and analysis-tier unchanged. The refreshed
graph now shows `duplicateShareCurrent=0` with `0` current summary startup
failures, so current-output health is clean while queued/analysis-state
startup-noise suppression remains unfinished.

The latest PR-split synthesis, `20260516T152739Z`, says the explicit 28-head
split is only the known-fix prefix, not a complete filing split. Seed `1020002`
is product-confirmed WebSocket divergence: page 1 and relay materialize the
inserted `core/search` marker while page 0 stays connected/synced without it.
The latest feedback-action file, `20260516T151306Z`, launched the bounded
state-vector/diff diagnostic. The newer synthesis says that diagnostic report
was still absent and the tmux session was active, so filing remains blocked on
that result and the repair-slot decision.

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

The live duplicate and startup signals are clean in the latest
current-output-dir sample: `duplicateShareCurrent=0` with `0` summary startup
failures. The sample has `0` quality issues and `0` warnings, while resource
headroom is true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis rejects treating zero visible likely-real
count, zero current duplicate share, or a clean startup-failure counter as
enough. It calls for one strict pre-action startup predicate in triage and an
analysis-tier backstop before Codex analysis. The latest feedback-action moved
startup evidence earlier in novelty scheduling, removed the broad canary
exemption, disabled `novelty-ws-lifecycle`, and kept the active producer set to
groups with product evidence. Because triage-watcher and analysis-tier
suppression were not changed, queued or analysis-state startup-noise leakage
remains the live risk even though the current-output graph sample is clean.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T15:30:02Z` show sustained CPU
pressure: the 13:00-15:30 samples range from `46.2%` to `86.2%` utilization and
the latest sample is `65.3%`. Load exceeded the logical CPU count at 13:00,
14:20, 15:10, and 15:20; the latest sampled 1/5/15-minute load is `49.32`,
`76.64`, and `107.31` against `64` logical CPUs.
The immediate blocker is still duplicate/noise containment, coverage depth, and
the PR-split repair decision rather than raw memory headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current novelty state has
`1` enabled coverage-guided group after the latest output-dir reset:
`novelty-http-persistence-probe`. The
duplicate/noise feedback-action is stricter than a graph-only read: the novelty
producer now gates on current startup evidence, but browser admission remains
under probation until current-output duplicate/startup evidence stays clean over
time and triage/analysis suppression is applied.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. Across the latest copied campaign
snapshots, the mix shows `26` browser/e2e lanes across `26` groups and no
lower-level lanes: `1` coverage-guided, `9` focused-shards, `6` gap-booster,
and `10` strict-expansion. The latest coverage-guided supervisor snapshot and
copied novelty state both show one enabled browser/e2e group,
`novelty-http-persistence-probe`.

Live fuzzing is currently concentrated entirely in browser/e2e lanes. No active
`transport-integration`, `unit-property`, `coverage-guided-lower-level`,
`backend-api`, `protocol-server`, or standalone `fuzz-assertion` fuzz-only
assertion lanes appear in the latest level-mix snapshot.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `53,955` completed attempts:
`50,949` browser/e2e and `3,006` transport/integration. The latest 15-minute
bucket reports about `532` browser/e2e attempts/hour and `0`
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
| `revision-persistence` | 3404 | 78 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2557 | 63 | 0 | 2.5% |
| `parser-serialization` | 2099 | 66 | 0 | 3.1% |
| `real-user-editing` | 5144 | 284 | 0 | 5.5% |
| `common-blocks` | 3096 | 271 | 0 | 8.8% |
| `parser-transform` | 3301 | 302 | 0 | 9.1% |
| `long-session-large-doc` | 2146 | 283 | 0 | 13.2% |
| `block-gauntlet` | 3933 | 564 | 0 | 14.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2026 | 360 | 0 | 17.8% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 284 | 500 |
| gauntlet block core/html next coverage tier | 369 | 500 |
| gauntlet block core/details next coverage tier | 411 | 500 |
| gauntlet block core/more next coverage tier | 431 | 500 |
| CDP coverage records next coverage tier | 4874 | 5000 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `157`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T152739Z`, took `4.6` minutes. The latest
feedback-action file available to this report is `20260516T151306Z`; it applied
the seed `1020002` split feedback and launched the bounded diagnostic.

The latest PR-split synthesis, `20260516T152739Z`, says the split design is not
filing-ready and preserves the explicit 28-head allow-list only as the
known-fix prefix:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. Seed `1020002` is now product-confirmed
WebSocket marker divergence: page 1 and relay materialize the inserted
`core/search` marker, while page 0 stays connected/synced and lacks it in its
local post Y.Doc. The completed repair pass found no bounded fix, so the
current shape is "28-head allow-list plus a required post-PR15C repair
decision." The requested next action is to consume the already-running bounded
state-vector/diff diagnostic for seed `1020002`, rerunning it once only if it
exits without a usable report. Do not start broad final-stack fuzz, extra fuzz
lanes, reload diagnostics, PR13 repair/import, PR6B replay, PR16 replay, or
another split-review loop until that result is consumed.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T15:29:54Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live current-output sample is
clean on both startup and duplicate counters: `0` summary startup failures and
`duplicateShareCurrent=0`. The latest monitor row has `0` quality issues and
`0` warnings, with resource headroom true.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest duplicate/noise synthesis says strict no-user/no-action startup stalls
are recognized but not suppressed early enough in triage and analysis. The
latest feedback-action changed novelty scheduling and producer gating, but it
left triage and analysis suppression open. The graph should be read as clean
current-output health, not as proof that startup-noise containment is complete.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
WebSocket marker-propagation repair decision. The next gate is consuming the
already-running bounded state-vector/diff diagnostic, not filing or broad
final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is currently all browser/e2e in the latest mix snapshots, with no active
lower-level lane. Transport-integration still has historical completed
executions, but the latest execution bucket has `532` browser/e2e
attempts/hour, `0` transport/integration attempts/hour, and the other
lower-level buckets remain at `0` executions. The next narrow operational
checks are triage/analysis suppression for strict startup noise and seed
`1020002` state-vector/diff diagnosis.
