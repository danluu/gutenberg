# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T16:13:22Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T16:02:55.621Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1583` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T16:11:11Z`, coverage files grew from `272` to `33728`, a delta of
`33456`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The latest plotted current-output-dir sample is mixed on live duplicate/noise:
`duplicateShareCurrent` is `0.5`, summary startup failures are `0`, warnings
are `0`, free memory is `424.5G`, resource headroom is false, and quality issues
are `0`. The copied novelty state lists one enabled coverage-guided group,
`novelty-http-persistence-probe`. This report treats current-output-dir
duplicate/noise and startup-failure metrics as live status; historical aggregate
duplicate/noise is only context.

Persona-loop evidence rejects a graph-only "resolved" interpretation. The
latest duplicate/noise synthesis, `20260516T160140Z`, says the problem is
control-plane leakage rather than a proven product bug: strict pre-action
startup noise is separated in reporting, but can still affect scheduling and
analysis. It calls for novelty-monitor probation to use current-run evidence
and for live analysis to skip known-noise-only gate results. The latest
non-empty duplicate/noise feedback-action, `20260516T153431Z`, changed
novelty-monitor canary gating and reported `novelty-ws-lifecycle` running with
product evidence and no strict startup records, but also reported two strict
startup signatures from the HTTP probe and left triage-watcher/analysis-tier
suppression open. The refreshed live sample has `duplicateShareCurrent=0.5`, so
duplicate/noise containment is still not complete.

The latest PR-split synthesis, `20260516T160617Z`, says the explicit 28-head
split is only a known-fix prefix, not a complete filing split. Seed `1020002` is
product-confirmed WebSocket/Yjs divergence: page 0 falsely covers client
`353740376` through clock `820` as one deleted range while relay/page 1 retain
live marker-bearing structs. The latest non-empty PR-split feedback-action,
`20260516T155034Z`, applied the repeated Cycle 160 feedback that rejects the
"28-head final stack" interpretation. Filing remains blocked until a new narrow
post-PR15C sync-manager load/hydrate repair is validated on seed `1020002`, the
combined stack is rebuilt, and final-stack fuzz is rerun.

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

The latest current-output-dir sample is not clean on live duplicate share:
`duplicateShareCurrent=0.5` with `0` summary startup failures. The sample has
`0` quality issues and `0` warnings, while resource headroom is false.
The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis rejects treating zero visible likely-real
count or a clean summary startup-failure counter as enough. It calls for
current-run startup-noise probation and a live-analysis skip for known-noise-only
gate results. The latest non-empty feedback-action changed novelty-monitor
canary gating, but it did not change triage-watcher or analysis-tier
suppression. The refreshed graph shows current duplicate/noise is still live:
`duplicateShareCurrent=0.5`.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T16:10:00Z` show sustained CPU
pressure: the 12:30-16:10 samples range from `46.2%` to `86.2%` utilization and
the latest sample is `70.8%`. Load exceeded the logical CPU count in sampled
windows from 12:30 through 13:10, at 14:20, from 15:10 through 15:30, and again
at 16:10; the latest sampled 1/5/15-minute load is `81.03`, `64.39`, and
`61.64` against `64` logical CPUs.
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
duplicate/noise feedback-action is stricter than a
graph-only read: novelty scheduling was changed to gate on current startup
evidence, but browser admission remains under probation until current-output
duplicate/startup evidence stays clean over time and triage/analysis suppression
is applied. The refreshed state has the HTTP persistence probe enabled while
`duplicateShareCurrent=0.5`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `26` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The browser/e2e
lanes are `1` coverage-guided, `9` focused-shards, `6` gap-booster, and `10`
strict-expansion. The latest coverage-guided supervisor snapshot and copied
novelty state show one enabled browser/e2e group,
`novelty-http-persistence-probe`.

Live fuzzing is still dominated by browser/e2e lanes, but lower-level work is
active in `unit-property` and `coverage-guided-lower-level`. No active
`transport-integration`, `backend-api`, `protocol-server`, or standalone
`fuzz-assertion` fuzz-only assertion lanes appear in the latest level-mix
snapshot.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed level-specific execution units derived
from lane `events.ndjson` files: browser seed attempts, unit/property generated
cases, coverage-guided lower-level inputs, or protocol/backend cases. Rechecks
count as executions. This is more precise than supervisor launches or lane
counts, but it only covers fuzzers that emit these lane events.

The latest collected execution data has `56,660` completed execution units:
`52,057` browser/e2e, `3,006` transport/integration, `546` unit-property, and
`1,051` coverage-guided-lower-level. The latest 15-minute bucket reports about
`828` browser/e2e execution units/hour, `64` unit-property execution units/hour,
`144` coverage-guided-lower-level execution units/hour, and `0`
transport/integration execution units/hour. `backend-api`, `protocol-server`,
and standalone `fuzz-assertion` levels remain at `0` executions in this counter.

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
| `revision-persistence` | 3444 | 86 | 0 | 2.5% |
| `multi-reload-lifecycle` | 2603 | 66 | 0 | 2.5% |
| `parser-serialization` | 2127 | 68 | 0 | 3.2% |
| `real-user-editing` | 5185 | 286 | 0 | 5.5% |
| `common-blocks` | 3130 | 275 | 0 | 8.8% |
| `parser-transform` | 3327 | 308 | 0 | 9.3% |
| `long-session-large-doc` | 2159 | 295 | 0 | 13.7% |
| `block-gauntlet` | 3986 | 584 | 0 | 14.7% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2056 | 385 | 0 | 18.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 286 | 500 |
| gauntlet block core/html next coverage tier | 382 | 500 |
| gauntlet block core/details next coverage tier | 417 | 500 |
| gauntlet block core/more next coverage tier | 442 | 500 |
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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `162`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T160617Z`, took `5.1` minutes. The latest
non-empty PR-split feedback-action file, `20260516T155034Z`, applied the
repeated Cycle 160 feedback that the 28-head allow-list is only a known-fix
prefix.

The latest PR-split synthesis, `20260516T160617Z`, says the split design is not
filing-ready and preserves the explicit 28-head allow-list only as a
known-fix prefix:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
old/red PR13 heads, broad PR8/PR8A, former PR6B/PR6C, `shape/*`,
`finalize/*`, `deferred/*`, dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. Seed `1020002` is product-confirmed
WebSocket/Yjs marker divergence. The completed `153219Z` diagnostic narrows the
source boundary to `@wordpress/sync` manager load/hydrate replay after provider
state: page 0 falsely covers client `353740376` through clock `820` as one
deleted range while relay/page 1 retain live marker-bearing structs. The current
shape is "28-head known-fix prefix plus a required post-PR15C repair." The
requested next action is one bounded sync-manager load/hydrate repair job,
focused seed `1020002` validation, then a rebuilt combined stack. Do not start
broad final-stack fuzz, extra fuzz lanes, reload diagnostics, PR13 repair/import,
PR6B/PR6C replay, old PR16 replay, or another split-review loop before that
repair is validated.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T16:07:01Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live current-output sample has
no summary startup failures, but it is not clean on current duplicates:
`duplicateShareCurrent=0.5`. The latest monitor row has `0` quality issues and
`0` warnings, with resource headroom false.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest synthesis says this is control-plane leakage, not a proven product bug,
and asks for current-run startup probation plus known-noise-only live-analysis
skips. The latest non-empty feedback-action changed novelty canary gating, but
triage-watcher and analysis-tier suppression remain open. The graph should be
read as live duplicate/noise still present in the current output directory, not
as proof that startup-noise containment is complete.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
WebSocket/Yjs marker-propagation repair. The latest synthesis says the completed
diagnostic points to `@wordpress/sync` manager load/hydrate replay after
provider-synced state. The next gate is one bounded repair and focused seed
validation, not filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has `828` browser/e2e execution units/hour, `64` unit-property execution
units/hour, `144` coverage-guided-lower-level execution units/hour, `0`
transport/integration execution units/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions.
The next narrow operational checks are triage/analysis suppression for strict
startup noise and seed `1020002` peer-client store-transition repair evidence.
