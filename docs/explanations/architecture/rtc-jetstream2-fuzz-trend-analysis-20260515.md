# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T17:23:17Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T16:37:45.491Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1613` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T17:21:14Z`, coverage files grew from `272` to `34419`, a delta of
`34147`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The latest plotted current-output-dir sample is still not clean on live
duplicate/noise: `duplicateShareCurrent` is `1`, summary startup failures are
now `0`, warnings are `1`, free memory is `427.4G`, the monitor headroom flag is
true, and quality issues are `2`. The copied novelty state currently lists
no enabled coverage-guided groups after the latest output-dir reset. This
report treats current-output-dir duplicate/noise and startup-failure metrics as
live status; historical aggregate duplicate/noise is only context.

Persona-loop evidence rejects a graph-only "resolved" interpretation. The
latest non-empty duplicate/noise synthesis, `20260516T170226Z`, identified the
remaining leak as novelty-monitor admission: current-run
`pre_action_bootstrap_stall` dominance was detected, but fresh profiles without
current evidence could still enter and reproduce the same zero-user/zero-action
bootstrap failure. The matching feedback-action, `20260516T170226Z`, says that
global admission hold was patched, validation passed, and novelty was
restarted; active `supervisor-groups.json` and `enabledGroups` were empty after
the restart. It still reports `duplicateShareCurrent=1`, so the graph and
persona-loop evidence agree that fan-out is contained on probation, not that the
underlying startup/bootstrap failure is fixed.

The latest PR-split synthesis file, `20260516T171930Z`, is empty, so this report
uses the latest non-empty synthesis, `20260516T170807Z`. It says the explicit
28-head split is only a known-fix prefix, not a complete filing split. Seed
`1020002` remains product-confirmed WebSocket/Yjs divergence, so the replacement
shape is the prefix through `PR15C`, a narrow post-`PR15C` seed `1020002`
repair, a rebuilt combined stack, focused seed validation, and only then
final-stack fuzz. The latest PR-split feedback-action, `20260516T170807Z`,
applied the Cycle 170 consensus to the current split note, launched no new jobs,
and kept filing blocked because the active repair report was still missing and
its tmux session was active.

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

The latest current-output-dir sample is still not clean on live
duplicate/noise: `duplicateShareCurrent=1`, while summary startup failures are
now `0`. The sample has `2` quality issues and `1` warning, with `427.4G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest non-empty duplicate/noise synthesis rejects treating zero visible
likely-real count, or the latest `0` startup-failure sample, as enough. It says
strict startup/bootstrap stalls are still the dominant duplicate/noise source
and calls out novelty-monitor admission as the remaining control-plane risk. The
matching feedback-action says that admission hole has now been patched by
holding every non-clean, non-floor profile during strict current-run startup
dominance, with the local policy version bumped to `16`, syntax checks passing,
gate-only triage showing `36` bootstrap-stall signatures and `0` queued/retry,
and novelty restarted. The refreshed graph keeps the system on probation because
the latest live sample still has current duplicate share at `1`; the persona
feedback says admission is stopped, not that the bootstrap failure disappeared.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T17:20:00Z` show sustained CPU
pressure: the 14:10-17:20 samples range from `47.4%` to `86.2%` utilization,
with the latest sample at `75.3%`. Load exceeded the logical CPU count in
multiple sampled windows, and the latest 15-minute load remains above the core
count; the latest sampled 1/5/15-minute load is `57.95`, `62.72`, and `65.13`
against `64` logical CPUs.
The immediate blocker is still duplicate/noise containment, coverage depth, and
the PR-split repair decision rather than raw memory headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current copied novelty
state has no enabled coverage-guided groups after the latest output-dir reset.
The duplicate/noise persona loop is stricter than a graph-only read: the newest
feedback-action says the global novelty-monitor startup-noise admission hold is
patched and novelty restarted, but the latest current-output sample still has
`duplicateShareCurrent=1`, so this remains containment rather than a clean bill
of health.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `25` browser/e2e lanes across `25` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The browser/e2e
lanes are `9` focused-shards, `6` gap-booster, and `10` strict-expansion. The
latest copied novelty state shows no enabled coverage-guided groups after the
latest reset.

The latest per-campaign mix is still concentrated in browser/e2e lanes, but
lower-level work is active in `unit-property` and
`coverage-guided-lower-level`, including the rich-text CRDT lower-level lane.
No active `transport-integration`, `backend-api`, `protocol-server`, or
standalone `fuzz-assertion` fuzz-only assertion lanes appear in the latest
level-mix snapshot.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit these
lane events. Lower-level counts reconstructed from batch metadata or legacy
batch-count fields are approximate.

The latest collected execution data has about `947,059` completed test
executions: `56,651` browser/e2e, `3,006` transport/integration, `867,364`
unit-property, and `20,038` coverage-guided-lower-level. The latest 15-minute
bucket reports about `3,528` browser/e2e test executions/hour, `110,768`
unit-property test executions/hour, `2,368` coverage-guided-lower-level test
executions/hour, and `0` transport/integration test executions/hour.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` levels remain
at `0` executions in this counter.

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
| `revision-persistence` | 3502 | 92 | 0 | 2.6% |
| `multi-reload-lifecycle` | 2678 | 79 | 0 | 2.9% |
| `parser-serialization` | 2166 | 72 | 0 | 3.3% |
| `real-user-editing` | 5252 | 287 | 4 | 5.5% |
| `common-blocks` | 3198 | 289 | 3 | 9.0% |
| `parser-transform` | 3359 | 311 | 3 | 9.3% |
| `long-session-large-doc` | 2190 | 319 | 3 | 14.6% |
| `block-gauntlet` | 4117 | 617 | 3 | 15.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2145 | 431 | 2 | 20.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 287 | 500 |
| gauntlet block core/html next coverage tier | 389 | 500 |
| gauntlet block core/details next coverage tier | 439 | 500 |
| gauntlet block core/more next coverage tier | 467 | 500 |
| CDP coverage records next coverage tier | 4887 | 5000 |

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `170`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T170807Z`, took `8.0` minutes, and the
latest feedback-action cycle `170` took `3.4` minutes. The latest PR-split
synthesis file, `20260516T171930Z`, is empty; the latest non-empty synthesis,
`20260516T170807Z`, preserves the consensus that the 28-head allow-list is only
a known-fix prefix. The latest feedback-action, `20260516T170807Z`, records the
active repair job's missing-report/running-session state and launches no new
jobs.

The latest non-empty PR-split synthesis says the split design is not
filing-ready and preserves the explicit 28-head allow-list only as a known-fix
prefix:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
aggregate PR13B, old/red PR13 heads, broad PR8, PR8A as filing material for
now, former PR6B, PR6C, PR1A, old PR16, reload hydration, pre-save collapse,
rich-text suffix, malformed-save residuals, HTTP room-isolation residuals,
dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. Seed `1020002` is product-confirmed
WebSocket/Yjs marker divergence: page 0 is synced but missing marker
`async-server-1020002-0-1-589451`, while page 1 and the relay retain it. The
current shape is "28-head known-fix prefix plus a required post-PR15C repair."
The latest non-empty synthesis says the active repair report is still missing
while the tmux session remains active. The next step remains consuming that
bounded job, shaping or reclassifying the repair, running focused seed
validation, and rebuilding the combined stack. Do not start broad final-stack
fuzz, extra fuzz lanes, reload diagnostics, PR13 repair/import, PR6B/PR6C
replay, old PR16 replay, or another split-review loop before that repair is
validated.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T17:16:50Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live current-output sample has
current duplicate share at `duplicateShareCurrent=1`; latest summary startup
failures are `0`. The latest monitor row has `2` quality issues and `1`
warning, with the headroom flag true.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest non-empty synthesis says strict pre-action startup/bootstrap stalls still
dominate the duplicate/noise problem and points to novelty-monitor scheduler
admission as the next smallest fix. The matching feedback-action says that fix
was applied, syntax checks and isolated gate-only triage passed, and novelty was
restarted with no enabled groups. The refreshed graph shows latest summary
startup failures at `0`, but the latest live monitor sample still has
`duplicateShareCurrent=1`, so it contradicts any interpretation that the latest
output directory is already clean. The correct live read is contained fan-out
with an unresolved startup/bootstrap source.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
WebSocket/Yjs marker-propagation repair. The latest synthesis file is empty, so
the latest non-empty synthesis, `20260516T170807Z`, keeps that repair as a new
post-PR15C PR unless source ownership proves otherwise. The latest
feedback-action applied that consensus to the split note, launched no new jobs,
and says the active repair report is still missing while its tmux session
remains active. The next gate is one bounded repair and focused seed validation,
not filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has about `3,528` browser/e2e test executions/hour, `110,768`
unit-property test executions/hour, `2,368` coverage-guided-lower-level test
executions/hour, `0` transport/integration test executions/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions.
The next narrow operational checks are the remaining startup-noise control-plane
follow-ups and seed `1020002` peer-client store-transition repair evidence.
