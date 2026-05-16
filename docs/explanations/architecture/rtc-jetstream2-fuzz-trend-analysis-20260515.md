# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T15:49:23Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T15:40:30.638Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1573` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T15:48:20Z`, coverage files grew from `272` to `33417`, a delta of
`33145`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The latest plotted current-output-dir sample regressed on duplicate status:
`duplicateShareCurrent` is `1`, summary startup failures are `0`, warnings are
`1`, free memory is `430.8G`, resource headroom is true, and quality issues are
`1`. The copied novelty state lists one enabled coverage-guided group,
`novelty-ws-lifecycle`. This report treats current-output-dir duplicate/noise
and startup-failure metrics as live status; historical aggregate duplicate/noise
is only context.

Persona-loop evidence rejects a graph-only "resolved" interpretation, and the
refreshed graph now agrees. The latest duplicate/noise synthesis,
`20260516T153431Z`, says strict zero-user pre-action bootstrap and awareness
stalls are recognized by parts of the pipeline but are not consistently
suppressed before triage and analysis. The latest non-empty duplicate/noise
feedback-action, `20260516T145914Z`, improved novelty-monitor gating and
reported disabling `novelty-ws-lifecycle`, but it explicitly left
triage-watcher and analysis-tier unchanged. The current copied state has
`novelty-ws-lifecycle` enabled again and `duplicateShareCurrent=1`, so startup
and duplicate containment remains unresolved even though summary startup
failures are `0`.

The latest usable PR-split synthesis, `20260516T153219Z`, says the explicit
28-head split is only a known-fix prefix, not a complete filing split. The newer
`20260516T154448Z` synthesis is empty, so it adds no contrary evidence. Seed
`1020002` is product-confirmed WebSocket/Yjs divergence. The state-vector
diagnostic has completed and reports that page 0 falsely covers client
`353740376` through clock `820` as one deleted range while relay/page 1 retain
live marker-bearing structs. The latest PR-split feedback-action,
`20260516T153219Z`, applied that feedback and launched the bounded
peer-client store-transition repair/evidence job. Filing remains blocked until
that repair report is consumed, focused seed `1020002` is rerun, and the stack
is rebuilt.

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

The live startup counter is clean but the duplicate signal is not in the latest
current-output-dir sample: `duplicateShareCurrent=1` with `0` summary startup
failures. The sample has `1` quality issue and `1` warning, while resource
headroom is true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest usable duplicate/noise synthesis rejects treating zero visible
likely-real count or a clean startup-failure counter as enough. It calls for
one strict pre-action startup predicate in triage and an analysis-tier backstop
before Codex analysis. The latest non-empty feedback-action moved startup
evidence earlier in novelty scheduling, removed the broad canary exemption, and
reported disabling `novelty-ws-lifecycle`, but triage-watcher and analysis-tier
suppression were not changed. The refreshed graph shows
`duplicateShareCurrent=1`, so queued or analysis-state startup-noise leakage is
not just residual risk; it is still visible in the current live duplicate/noise
status.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T15:40:00Z` show sustained CPU
pressure: the 12:30-15:40 samples range from `46.2%` to `86.2%` utilization and
the latest sample is `64.8%`. Load exceeded the logical CPU count in at least
one sampled window at 12:30, 12:40, 12:50, 13:00, 14:20, 15:10, 15:20, 15:30,
and 15:40; the latest sampled 1/5/15-minute load is `35.83`, `52.75`, and
`81.19` against `64` logical CPUs.
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
`novelty-ws-lifecycle`. The duplicate/noise feedback-action is stricter than a
graph-only read: novelty scheduling was changed to gate on current startup
evidence, but browser admission remains under probation until current-output
duplicate/startup evidence stays clean over time and triage/analysis suppression
is applied. The refreshed state shows the lifecycle producer enabled again while
`duplicateShareCurrent=1`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. Across the latest copied campaign
snapshots, the mix shows `26` browser/e2e lanes across `26` groups and no
lower-level lanes: `1` coverage-guided, `9` focused-shards, `6` gap-booster,
and `10` strict-expansion. The latest coverage-guided supervisor snapshot and
copied novelty state both show one enabled browser/e2e group,
`novelty-ws-lifecycle`.

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

The latest collected execution data has `54,682` completed attempts:
`51,676` browser/e2e and `3,006` transport/integration. The latest 15-minute
bucket reports about `400` browser/e2e attempts/hour and `0`
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
| `revision-persistence` | 3413 | 80 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2561 | 63 | 0 | 2.5% |
| `parser-serialization` | 2112 | 66 | 0 | 3.1% |
| `real-user-editing` | 5158 | 285 | 0 | 5.5% |
| `common-blocks` | 3101 | 273 | 0 | 8.8% |
| `parser-transform` | 3313 | 305 | 0 | 9.2% |
| `long-session-large-doc` | 2146 | 283 | 0 | 13.2% |
| `block-gauntlet` | 3939 | 564 | 0 | 14.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2035 | 366 | 2 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 285 | 500 |
| gauntlet block core/html next coverage tier | 372 | 500 |
| gauntlet block core/details next coverage tier | 411 | 500 |
| gauntlet block core/more next coverage tier | 432 | 500 |
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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `158`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T153219Z`, took `8.2` minutes. The latest
PR-split feedback-action file, `20260516T153219Z`, applied the seed `1020002`
split feedback and launched
`rtc-ws-seed-1020002-peer-client-store-transition-repair-20260516T153219Z`.

The latest usable PR-split synthesis, `20260516T153219Z`, says the split design
is not filing-ready and preserves the explicit 28-head allow-list only as a
known-fix prefix:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. Seed `1020002` is now product-confirmed
WebSocket/Yjs marker divergence. The completed state-vector diagnostic shows
page 0 falsely covers client `353740376` through clock `820` as one deleted
range while relay/page 1 retain live marker-bearing structs. The current shape
is "28-head known-fix prefix plus a required post-PR15C repair decision." The
requested next action is exactly one bounded peer-client store-transition
repair/evidence job, followed by a focused seed `1020002` rerun and stack
rebuild if repaired. Do not start broad final-stack fuzz, extra fuzz lanes,
reload diagnostics, PR13 repair/import, PR6B/PR6C replay, old PR16 replay, or
another split-review loop until that repair evidence exists.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T15:41:20Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live current-output sample is
clean on startup but not on duplicates: `0` summary startup failures and
`duplicateShareCurrent=1`. The latest monitor row has `1` quality issue and
`1` warning, with resource headroom true.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest usable duplicate/noise synthesis says strict no-user/no-action startup
stalls are recognized but not suppressed early enough in triage and analysis;
the latest feedback-action changed novelty scheduling and producer gating, but
it left triage and analysis suppression open. The graph should be read as
current-output duplicate/noise regression with a clean startup-failure counter,
not as proof that startup-noise containment is complete.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
WebSocket/Yjs marker-propagation repair decision. The latest synthesis says the
state-vector diagnostic is complete and points to page-local post Y.Doc store
corruption for peer client structs. The next gate is one bounded repair/evidence
job for that transition, now launched by the latest feedback-action, not filing
or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is currently all browser/e2e in the latest mix snapshots, with no active
lower-level lane. Transport-integration still has historical completed
executions, but the latest execution bucket has `400` browser/e2e
attempts/hour, `0` transport/integration attempts/hour, and the other
lower-level buckets remain at `0` executions. The next narrow operational
checks are triage/analysis suppression for strict startup noise and seed
`1020002` peer-client store-transition repair evidence.
