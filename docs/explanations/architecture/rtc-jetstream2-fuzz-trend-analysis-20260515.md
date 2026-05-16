# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T16:58:21Z`

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
`1603` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T16:56:27Z`, coverage files grew from `272` to `34336`, a delta of
`34064`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `5` unmet goals. The remaining
goals are depth targets for real-user editing, gauntlet blocks, and CDP coverage
records.

The latest plotted current-output-dir sample is not clean on live
duplicate/noise: `duplicateShareCurrent` is `1`, summary startup failures are
`2`, warnings are `1`, free memory is `435.3G`, the monitor headroom flag is
false, and quality issues are `2`. The copied novelty state currently lists
`2` enabled coverage-guided groups after the latest output-dir reset. This
report treats current-output-dir duplicate/noise and startup-failure metrics as
live status; historical aggregate duplicate/noise is only context.

Persona-loop evidence rejects a graph-only "resolved" interpretation. The
latest duplicate/noise synthesis, `20260516T162553Z`, says the novelty monitor
is mostly no longer the problem, but rejects full containment: stale or paused
dirs can leak through live analysis, deep analysis can consume stale first-tier
results, and strict/focused/gap sidecar runs still need consumer gates. The
matching duplicate/noise feedback-action patched those consumer gates in
live-analysis, triage, analysis/deep-analysis, and supervisor code, then
restarted the affected consumers. The refreshed graph is still stricter than a
"fixed" read: the latest current-output sample has
`duplicateShareCurrent=1`, `2` summary startup failures, and only two WS
coverage-guided groups enabled. That also supersedes the synthesis's older
"HTTP canary only" active-state detail, so containment remains on probation.

The latest PR-split synthesis file, `20260516T165317Z`, is empty, so this
report uses the latest non-empty synthesis, `20260516T164731Z`. It says the
explicit 28-head split is only a known-fix prefix, not a complete filing split.
Seed `1020002` remains product-confirmed WebSocket/Yjs divergence, so the
replacement shape is the prefix through `PR15C`, a narrow post-`PR15C` seed
`1020002` repair, a rebuilt combined stack, focused seed validation, and only
then final-stack fuzz. The latest PR-split feedback-action,
`20260516T163625Z`, applied that Cycle 166 consensus to the current split note,
launched no new jobs, and kept filing blocked because the active repair report
was still missing and its tmux session was active.

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

The latest current-output-dir sample is not clean on live duplicate/noise:
`duplicateShareCurrent=1` with `2` summary startup failures. The sample has
`2` quality issues and `1` warning, with `435.3G` free memory and the monitor
headroom flag false. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis rejects treating zero visible likely-real
count as enough. It says the active coverage-guided scheduler is mostly clean,
but stale downstream live/deep-analysis consumers and sidecar runs can still
leak duplicate/noise. The matching feedback-action patched the consumer-gating
path and restarted the affected sessions. The refreshed graph keeps the system
on probation because the latest live sample still has current duplicate share
at `1` and summary startup failures at `2`.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T16:50:03Z` show sustained CPU
pressure: the 12:50-16:50 samples range from `46.2%` to `86.2%` utilization,
with the latest sample at `64.9%`. Load exceeded the logical CPU count in
sampled windows from 12:50 through 13:10, at 14:20, from 15:10 through 15:50,
and again at 16:10; the latest sampled 1/5/15-minute load is `63.24`, `57.5`,
and `57.73` against `64` logical CPUs.
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
state has `2` enabled coverage-guided groups after the latest output-dir reset:
media cross-entity and long-session large-doc. The duplicate/noise
feedback-action is stricter than a graph-only read: consumer gating was patched,
but the latest current-output sample still has `duplicateShareCurrent=1` and
summary startup failures, so browser admission remains under probation until
current-output duplicate/startup evidence stays clean over time.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `27` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The browser/e2e
lanes are `2` coverage-guided, `9` focused-shards, `6` gap-booster, and `10`
strict-expansion. The latest coverage-guided supervisor snapshot and copied
novelty state show two enabled WS coverage-guided groups after the latest reset.

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

The latest collected execution data has about `857,556` completed test
executions: `53,944` browser/e2e, `3,006` transport/integration, `781,880`
unit-property, and `18,726` coverage-guided-lower-level. The latest 15-minute
bucket reports about `5,412` browser/e2e test executions/hour, `173,376`
unit-property test executions/hour, `2,240` coverage-guided-lower-level test
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
| `revision-persistence` | 3492 | 91 | 0 | 2.6% |
| `multi-reload-lifecycle` | 2678 | 79 | 0 | 2.9% |
| `parser-serialization` | 2153 | 72 | 0 | 3.3% |
| `real-user-editing` | 5240 | 287 | 4 | 5.5% |
| `common-blocks` | 3198 | 289 | 3 | 9.0% |
| `parser-transform` | 3359 | 311 | 3 | 9.3% |
| `long-session-large-doc` | 2187 | 319 | 0 | 14.6% |
| `block-gauntlet` | 4053 | 598 | 3 | 14.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2106 | 431 | 2 | 20.5% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 287 | 500 |
| gauntlet block core/html next coverage tier | 385 | 500 |
| gauntlet block core/details next coverage tier | 429 | 500 |
| gauntlet block core/more next coverage tier | 459 | 500 |
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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `166`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T164731Z`, took `5.7` minutes, and the
latest feedback-action cycle `166` took `3.5` minutes. The latest PR-split
synthesis file, `20260516T165317Z`, is empty. The latest non-empty synthesis,
`20260516T164731Z`, and latest feedback-action, `20260516T163625Z`, preserve the
Cycle 166 consensus that the 28-head allow-list is only a known-fix prefix,
record the active repair job's missing-report/running-session state, and launch
no new jobs.

The latest non-empty PR-split synthesis, `20260516T164731Z`, says the split
design is not filing-ready and preserves the explicit 28-head allow-list only
as a known-fix prefix:
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
latest synthesis says the active repair report is still missing while the tmux
session remains active, so the next step remains consuming that bounded job,
shaping or reclassifying the repair, running focused seed validation, and
rebuilding the combined stack. Do not start broad
final-stack fuzz, extra fuzz lanes, reload diagnostics, PR13 repair/import,
PR6B/PR6C replay, old PR16 replay, or another split-review loop before that
repair is validated.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T16:44:28Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `5`. The latest live current-output sample has
current duplicate share and startup failures: `duplicateShareCurrent=1` and `2`
summary startup failures. The latest monitor row has `2` quality issues and `1`
warning, with the headroom flag false.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest synthesis says the coverage-guided scheduler is mostly clean now, but
downstream consumers can still revive stale or known-noise work. The matching
feedback-action patched and restarted those consumer gates. The refreshed graph
still shows two WS coverage-guided groups enabled, `duplicateShareCurrent=1`,
and `2` summary startup failures, so it contradicts any interpretation that the
latest output directory is already clean.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
WebSocket/Yjs marker-propagation repair. The latest synthesis keeps that repair
as a new post-PR15C PR unless source ownership proves otherwise. The latest
feedback-action applied that consensus to the split note, launched no new jobs,
and says the active repair report is still missing while its tmux session
remains active. The next gate is one bounded repair and focused seed validation,
not filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has about `5,412` browser/e2e test executions/hour, `173,376`
unit-property test executions/hour, `2,240` coverage-guided-lower-level test
executions/hour, `0` transport/integration test executions/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions.
The next narrow operational checks are the remaining startup-noise control-plane
follow-ups and seed `1020002` peer-client store-transition repair evidence.
