# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T19:20:41Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T18:51:08.549Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1663` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T19:19:59Z`, coverage files grew from `272` to `35444`, a delta of
`35172`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `9` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is clean on startup but not on the
live duplicate signal: `duplicateShareCurrent` is `0.3026` and current summary
startup failures are `0`. The same sample has `0` quality issues, `0` warnings,
`422.1G` free memory, and the monitor headroom flag is false. The copied novelty
state has six enabled coverage-guided browser groups after the latest
output-dir reset. This report treats current-output-dir
duplicate/noise and startup-failure metrics as live status; historical aggregate
duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only "resolved" interpretation. The
newest duplicate/noise synthesis, `20260516T190835Z`, says the remaining live
duplicate/noise problem is novelty-monitor actionability accounting: known and
non-actionable signatures, especially persisted-preferences
`rest_meta_database_error`, still count as ordinary current-run duplicate/noise.
The same synthesis says the next smallest safe fix is to split raw noise volume
from actionable triage yield. The newest duplicate/noise feedback-action file,
`20260516T190835Z`, is empty; the latest non-empty feedback-action remains
`20260516T183238Z`, which implemented active-run scoping, stale-session cleanup,
family-capped analysis, and suppressed-startup metric accounting. The refreshed
graph agrees on startup cleanup but has latest
`duplicateShareCurrent=0.3026`, so the persona-loop evidence still treats
duplicate/noise containment as probationary, not resolved.

The latest PR-split synthesis, `20260516T191336Z`, says the split is still
blocked. The current PR01-PR15C stack is only a known-fix prefix; the filing
shape is the `ready/rtc-*` prefix from the `20260516T181934Z` finalization,
PR02A as an HTTP room-isolation sidecar, then a narrow post-PR15C seed
`1020002` WebSocket/Yjs repair. The latest feedback-action file,
`20260516T190541Z`, updated the current split notes and launched no duplicate
work because the bounded caller/base provenance diagnostic is still active and
reportless. Filing and final-stack fuzz stay blocked until that diagnostic is
consumed and seed `1020002` has a passing focused repair or an evidence-backed
reclassification.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `9`
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

The latest current-output-dir sample is clean on startup but not on the live
duplicate signal: `duplicateShareCurrent=0.3026` and current summary startup
failures are `0`. The sample has `0` quality issues and `0` warnings, with
`422.1G` free memory and the monitor headroom flag false. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest usable duplicate/noise synthesis is the operative persona evidence.
It rejects treating zero visible likely-real count as enough. It says strict
current `pre_action_bootstrap_stall` suppression is mostly working, but
novelty-monitor summary and policy code still treats known/non-actionable
current-run signatures as actionable triage yield. The current dominating
example is the known persisted-preferences `rest_meta_database_error` pattern.
The newest feedback-action file is empty; the latest non-empty feedback-action
implemented active-supervisor run-dir scoping, family-capped first-tier
analysis, stale analysis/deep-analysis cleanup, non-actionable family gates, and
suppressed-startup accounting. The newer synthesis says raw, actionable, and
suppressed known-noise counts still need to be split, with duplicate-share
policy based only on actionable current-run signatures. The refreshed graph's
latest sample is consistent on startup cleanup, but `duplicateShareCurrent=0.3026`;
the persona evidence therefore rejects a graph-only resolved read.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T19:20:00Z` show sustained CPU
pressure: the 16:40-19:20 samples range from `64.9%` to `81.9%` utilization,
with the latest sample at `78.9%`. Load exceeded the logical CPU count in
`13` of those `17` sampled windows, and the latest sampled 1/5/15-minute load
is `73.0`, `74.5`, and `75.2` against `64` logical CPUs.
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
state has six enabled coverage-guided browser groups: real-user-editing,
real-user-rich-text, async-server-blocks, long-session-large-doc,
block-gauntlet, and lifecycle. The duplicate/noise persona loop is stricter
than a graph-only read: the latest synthesis says the startup classifier should
stay narrow, but known/non-actionable signatures must be removed from actionable
duplicate-share accounting instead of retained as live triage signatures. The
latest non-empty feedback-action implemented active-run novelty scoping,
analysis caps, stale-session cleanup, and suppressed-noise accounting. The
latest current-output sample has `duplicateShareCurrent=0.3026` and `0` current
summary startup failures. Startup pollution is improved, but current
duplicate/noise is not clean in the latest sample, so the enabled browser groups
remain probationary until current-root consumer ownership and actionable-noise
accounting stay stable across future roots.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `31` browser/e2e lanes across `31` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The browser/e2e
lanes are `6` coverage-guided, `9` focused-shards, `6` gap-booster, and `10`
strict-expansion.

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

The latest collected execution data has about `1,321,494` completed test
executions: `69,372` browser/e2e, `3,006` transport/integration, `1,185,220`
unit-property, and `63,896` coverage-guided-lower-level. The latest 15-minute
bucket reports about `2,408` browser/e2e test executions/hour, `57,792`
unit-property test executions/hour, `11,008` coverage-guided-lower-level test
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
| `revision-persistence` | 3636 | 106 | 0 | 2.9% |
| `multi-reload-lifecycle` | 2743 | 81 | 0 | 3.0% |
| `parser-serialization` | 2303 | 77 | 0 | 3.3% |
| `real-user-editing` | 5412 | 319 | 0 | 5.9% |
| `parser-transform` | 3479 | 337 | 0 | 9.7% |
| `common-blocks` | 3343 | 338 | 2 | 10.1% |
| `long-session-large-doc` | 2217 | 319 | 0 | 14.4% |
| `block-gauntlet` | 4519 | 748 | 0 | 16.6% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2340 | 431 | 0 | 18.4% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 193 | 500 |
| real-user body save/reload next coverage tier | 252 | 500 |
| action reload-post-action next coverage tier | 571 | 1000 |
| action ui-heading-shortcut next coverage tier | 591 | 1000 |
| successful real-user-editing records next coverage tier | 319 | 500 |
| gauntlet block core/html next coverage tier | 428 | 500 |
| action ui-format-paragraph next coverage tier | 870 | 1000 |
| gauntlet block core/details next coverage tier | 482 | 500 |
| real-user title save/reload next coverage tier | 193 | 200 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
completed-record depth for real-user editing, and gauntlet block ratchets.

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

After the loop was corrected to `max_parallel=6` and `interval=0s`, `185`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T191336Z`, took `6.1` minutes, and the
latest completed feedback-action cycle is `184` at `3.2` minutes.

The latest PR-split synthesis, `20260516T191336Z`, says the split design is
blocked, not filing-ready. The current PR01-PR15C set is only a known-fix
prefix. The consensus shape is the `ready/rtc-*` split from the `20260516T181934Z`
finalization, PR02A as an HTTP room-isolation regression sidecar after PR02, a
new narrow post-PR15C seed `1020002` WebSocket/Yjs repair PR, a rebuilt
combined validation stack, a focused seed `1020002` gate, and only then
final-stack fuzz.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Seed `1020002` is product-confirmed WebSocket/Yjs
marker divergence: one synced peer loses marker
`async-server-1020002-0-1-589451` while another peer and the relay retain it.
Do not file broad PR8, PR06B/PR06C, broad malformed-save work, aggregate PR11,
aggregate PR13B/PR13C, aggregate PR15, wildcard `final/rtc-pr*`, deferred or
validation refs, or final-stack fuzz before the `1020002` repair is consumed and
focused-gated. The latest synthesis says the caller/base provenance diagnostic
report is still missing and its tmux session is active. The latest
feedback-action file is non-empty: it updated `current-pr-split.md`, left that
existing diagnostic running, launched no duplicate jobs, and deferred final fuzz
plus adjacent PR work behind the seed `1020002` blocker.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T19:11:26Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `9`. The latest live
current-output sample has current duplicate share at `duplicateShareCurrent=0.3026`,
with latest current summary startup failures at `0`. The latest monitor row has
`0` quality issues and `0` warnings, with `422.1G` free memory and the headroom
flag false.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest usable synthesis says strict current startup suppression is mostly
working, but the main unresolved issue is actionable accounting: exact known
infra/noise such as persisted-preferences `rest_meta_database_error` is still
counted by novelty-monitor duplicate-share policy. The newest duplicate/noise
feedback-action file is empty; the latest non-empty feedback-action file,
`20260516T183238Z`, implemented active supervisor run-dir scoping,
stale-session cleanup, family-capped analysis, and zero strict zero-evidence
startup signatures queued on the active consumer path. The newer synthesis
still asks for raw/actionable/suppressed known-noise counts and duplicate-share
policy based on actionable signatures only. The current copied state has six
enabled coverage-guided browser groups. The refreshed graph shows latest
`summary_startup_failures=0` but latest `duplicateShareCurrent=0.3026`; the
correct live read is startup cleanup improved, while duplicate/noise
containment is still probationary.

The PR-split persona loop also rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix,
PR02A as an HTTP room-isolation sidecar, and a required narrow post-PR15C seed
`1020002` WebSocket/Yjs marker-propagation repair. The latest synthesis,
`20260516T191336Z`, says filing and final-stack fuzz remain blocked and the
caller/base provenance diagnostic report is still missing. The latest
feedback-action updated the split notes, launched no duplicate jobs, and left
the existing caller/base provenance diagnostic running because seed `1020002`
still blocks the focused gate. The next gate is consuming that diagnostic and
obtaining a passing focused repair or explicit reclassification, not filing or
broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has about `2,408` browser/e2e test executions/hour, `57,792`
unit-property test executions/hour, `11,008` coverage-guided-lower-level test
executions/hour, `0` transport/integration test executions/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions.
The next narrow operational checks are current-root triage/live-analysis
ownership follow-ups and seed `1020002` Gutenberg-origin store-to-CRDT/Yjs
repair evidence.
