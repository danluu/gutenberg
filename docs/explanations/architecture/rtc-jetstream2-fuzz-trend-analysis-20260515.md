# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T15:18:54Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T15:11:56.024Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1559` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T15:17:24Z`, coverage files grew from `272` to `33247`, a delta of
`32975`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The latest plotted current-output-dir sample is clean on duplicate/startup
status but not fully clean operationally: `duplicateShareCurrent` is `0`,
summary startup failures are `0`, warnings are `1`, free memory is `415.2G`,
resource headroom is false, and quality issues are `1`. The copied novelty
state lists two enabled coverage-guided groups, `novelty-http-persistence-probe`
and `novelty-ws-lifecycle`. This report treats current-output-dir
duplicate/noise and startup-failure metrics as live status; historical aggregate
duplicate/noise is only context.

Persona-loop evidence rejects a clean graph-only interpretation. The newest
duplicate/noise synthesis, `20260516T145914Z`, says the duplicate/noise problem
is an admission-control failure: strict pre-action startup stalls are not
classified consistently early enough across triage, analysis, scheduling, and
same-seed intake. The latest duplicate/noise feedback-action,
`20260516T145914Z`, is empty; the latest non-empty feedback-action,
`20260516T143459Z`, applied a watchdog threshold patch and briefly observed a
clean current run, but it also says the triage-watcher and analysis-tier gates
remain open. The refreshed graph now shows `duplicateShareCurrent=0` with
`0` current summary startup failures, so the latest current-output sample is
clean on duplicate/startup counters while the admission-control fix remains
under probation.

The latest PR-split synthesis, `20260516T150637Z`, says the explicit 28-head
split is only the known-fix prefix, not a complete filing split. Seed `1020002`
is classified as `product-marker-divergence`, so final-stack validation is
blocked on the active product repair/evidence report, not split design. The
latest feedback-action file, `20260516T145529Z`, records that the split text was
updated to block filing/final-stack fuzz, that no new job was launched, and that
the existing bounded repair job was still active with no report yet.

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

The live duplicate/startup signal is clean in the latest current-output-dir
sample: `duplicateShareCurrent=0` with `0` summary startup failures. The sample
still has `1` quality issue, `1` warning, and resource headroom false. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis rejects treating zero visible likely-real
count or one clean latest duplicate/startup sample as enough. It calls for one
strict pre-action startup predicate in triage, an analysis-tier backstop, and
same-seed attempt/final dedupe before Codex analysis. The latest
duplicate/noise feedback-action is empty; the latest non-empty feedback reports
that the watchdog now floors stale detection and startup grace for the active
coverage-guided novelty watchdog, but triage-watcher and analysis-tier
suppression was not applied in that pass. Because the graph is clean only at the
latest current-output sample, queued or analysis-state startup-noise leakage
remains the live risk.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T15:10:00Z` show sustained CPU
pressure, but below the 13:00 spike: the 13:00-15:10 samples range from `46.2%`
to `78.3%` utilization and the latest sample is `71.5%`. Load exceeded the
logical CPU count at 13:00 and 14:20 and is again above it on the latest
1-minute and 5-minute samples: the latest sampled 1/5/15-minute load is
`69.45`, `68.63`, and `59.62` against `64` logical CPUs.
The immediate blocker is still validation quality, current-output health, and
coverage depth rather than raw memory headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current novelty state has
`2` enabled coverage-guided groups after the latest output-dir reset:
`novelty-http-persistence-probe` and `novelty-ws-lifecycle`. The
duplicate/noise feedback-action is stricter than a graph-only read: the watchdog
change may reduce restart churn, but browser admission remains under bounded
probation until current-output duplicate/startup evidence stays clean.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. Across the latest copied campaign
snapshots, the mix shows `27` browser/e2e lanes across `27` groups and no
lower-level lanes. The latest coverage-guided supervisor snapshot has two
browser/e2e groups, `novelty-http-persistence-probe` and
`novelty-ws-lifecycle`.

Live fuzzing is currently concentrated entirely in browser/e2e lanes, including
the current HTTP/persistence-named probe as classified by the snapshot. The
latest coverage-guided timestamp has `2` browser/e2e lanes and no active
`transport-integration`, `unit-property`, `coverage-guided-lower-level`,
`backend-api`, `protocol-server`, or standalone `fuzz-assertion` fuzz-only
assertion lanes.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `53,654` completed attempts:
`50,648` browser/e2e and `3,006` transport/integration. The latest 15-minute
bucket reports about `104` browser/e2e attempts/hour and `0`
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
| `revision-persistence` | 3397 | 78 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2537 | 62 | 0 | 2.4% |
| `parser-serialization` | 2070 | 66 | 0 | 3.2% |
| `real-user-editing` | 5128 | 284 | 0 | 5.5% |
| `common-blocks` | 3083 | 268 | 0 | 8.7% |
| `parser-transform` | 3272 | 299 | 0 | 9.1% |
| `long-session-large-doc` | 2146 | 283 | 0 | 13.2% |
| `block-gauntlet` | 3919 | 561 | 0 | 14.3% |
| `persistence-no-title` | 2002 | 348 | 0 | 17.4% |
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
| gauntlet block core/html next coverage tier | 369 | 500 |
| gauntlet block core/details next coverage tier | 409 | 500 |
| gauntlet block core/more next coverage tier | 425 | 500 |
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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `155`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T150637Z`, took `6.4` minutes. The
following feedback action after cycle 154 took `4.8` minutes, and the event log
then completed review cycle `20260516T150637Z` and started
`20260516T151306Z`.

The latest PR-split synthesis, `20260516T150637Z`, says the split design is not
filing-ready and preserves the explicit 28-head allow-list only as the
known-fix prefix:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. Seed `1020002` is now classified as
`product-marker-divergence`, so the current shape is "28-head allow-list plus a
required repair slot after PR15C." That slot should become a narrow PR16 unless
the active repair proves the fix belongs in an existing head. The required
repair report was still missing in the latest synthesis; the latest
feedback-action confirmed the existing repair session and launched no new jobs.
Do not start broad final-stack fuzz, extra lanes, reload diagnostics, PR13 work,
PR6B/PR6C/PR16 work, or duplicate repair until that repair/evidence report
exists.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T15:14:34Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live duplicate/startup sample
is clean (`duplicateShareCurrent=0`, `0` summary startup failures), but it still
has `1` quality issue, `1` warning, and resource headroom is false in the latest
monitor row.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest duplicate/noise synthesis says strict no-user/no-action startup stalls
are still an admission-control problem spanning triage, analysis, scheduling,
and same-seed intake. The latest duplicate/noise feedback-action is empty; the
latest non-empty feedback applied a watchdog threshold change and briefly saw
clean current-run status, but it also left triage and analysis suppression open.
Because the refreshed graph is clean only in the latest current-output sample,
the graph should be read as probationary validation for the startup-noise gate,
not as proof that duplicate/noise is fixed.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
product-divergence repair slot. The next gate is the bounded
product-divergence repair/evidence report, not filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is currently all browser/e2e in the latest mix snapshots, with the
coverage-guided snapshot showing two enabled groups and no active lower-level
lane. Transport-integration still has historical completed executions, but the
latest execution bucket has `104` browser/e2e attempts/hour, `0`
transport/integration attempts/hour, and the other lower-level buckets remain
at `0` executions. The next narrow operational
checks are triage/analysis suppression for strict startup noise and seed
`1020002` product-divergence repair/evidence.
