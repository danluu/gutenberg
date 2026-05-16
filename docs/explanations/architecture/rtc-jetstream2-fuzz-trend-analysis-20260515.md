# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T22:03:44Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T21:51:04.586Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1718` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T22:02:41Z`, coverage files grew from `272` to `36465`, a delta of
`36193`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `7` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and startup-clean: `duplicateShareCurrent` is `0` and current summary
startup failures are `0`. The same sample has `1` quality issue, `1` warning,
`440G` free memory, and the monitor headroom flag is true. The copied novelty
state has five enabled groups in the fresh active root. This report treats
current-output-dir duplicate/noise and startup-failure metrics as live status;
historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only clean-live-status conclusion.
The newest duplicate/noise synthesis, `20260516T215105Z`, says the remaining
problem is still control-plane gating, not RTC product evidence:
no-product-evidence startup/infra failures can reach browser or Codex work, and
strict `pre_action_bootstrap_stall` suppression can miss product-free
`save-stuck-or-failed` startup waits. The prior feedback-action,
`20260516T212846Z`, implemented no-analysis sentinels, stale-root live-analysis
exit behavior, cooldown persistence, and monitor restarts. The graph now shows
clean current-output duplicate/startup metrics, but the persona loop treats
that as partial validation only and asks for a narrow strict-startup/cooldown
pass before considering closure. Broad historical-family suppression remains a
disagreed follow-up, not the live graph signal.

The latest PR-split synthesis, `20260516T214201Z`, rejects a filing-ready or
final-validation interpretation and reports `/` as still full with about `68M`
free, making artifact writability an operational blocker. The `ready/rtc-*`
PR01-PR15C prefix plus PR02A remains useful, but it is only a known-fix prefix.
PR16 failed its malformed-save built-assets replay with `1` pass and `7`
failures and needs focused seed `950109` localization before it can stay in the
stack. PR17 remains a separate seed `1020002` WebSocket/Yjs follower-side update
repair or proof-based reclassification. Strict-expansion residuals are not
covered by PR16/PR17; the audit found `307` likely-real rows, `58` buckets, and
`9` split-relevant clusters. The `20260516T214201Z` feedback-action applied the
cycle 198 tail update and launched bounded PR16 recovery plus strict-expansion
seed `5700084` source-reduction work, but both were constrained by the full
filesystem: PR16 produced a disk-preflight-blocked report and strict-expansion
preserved compact source-boundary evidence while deferring browser replay. The
graph's `0` visible likely-real failures is not filing approval.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `7`
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

The latest current-output-dir sample is below the live duplicate-share gate and
startup-clean: `duplicateShareCurrent=0` and current summary startup failures
are `0`. The sample has `1` quality issue and `1` warning, with `440G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis says the remaining issue is control-plane
gating before expensive work, not product failure evidence. It specifically
flags product-free `save-stuck-or-failed` bootstrap stalls that can miss strict
startup suppression, stale producer cooldowns, and missing shared known-noise
gating. The latest feedback-action already added supervisor no-analysis
sentinels, a stale-root guard in live analysis, cooldown persistence across
output-dir rotation, and restarted monitoring on the fresh root. The refreshed
current-output duplicate/startup metrics are clean, but persona-loop feedback
rejects treating that single graph state as proof that duplicate/noise leakage
is fixed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T22:00:00Z` show sustained CPU
pressure with a late spike and then easing: the latest 25 samples range from
`53.0%` to `91.8%` utilization, with the latest sample at `53.0%`. One-minute
load exceeded the logical CPU count in `19` of those `25` sampled windows, while
the latest sampled 1/5/15-minute load is `30.6`, `34.5`, and `40.8` against `64`
logical CPUs. Raw memory remains ample, but the recent load history still shows
pressure; the current-output duplicate/noise validation window and PR-split
repair decisions remain live blockers.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, persistence, and long/large sessions. The current
copied novelty state has five enabled groups: `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, and `novelty-ws-persistence-no-title`. The
duplicate/noise persona loop is stricter than a graph-only read:
raw/non-actionable signatures stay visible, but the live health read uses
current-output-dir duplicate/noise and startup failures. The latest current
sample has `duplicateShareCurrent=0` and `0` current summary startup failures,
so the latest duplicate/startup live health is clean even though the same row has
`1` quality issue and `1` warning. The latest duplicate/noise synthesis still
rejects that as closure because strict-startup gating, cooldown propagation, and
shared known-noise handling still have control-plane leak paths. Product-evidence
failures must remain visible while product-free startup/infra noise is gated
before expensive analysis.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `30` browser/e2e lanes across `30` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `5` coverage-guided, `9` focused-shards, `6` gap-booster,
and `10` strict-expansion. The freshest coverage-guided root itself is
browser/e2e-only, with five enabled groups.

Live fuzzing is still concentrated in browser/e2e lanes, but lower-level work is
active in `unit-property` and `coverage-guided-lower-level`, including the
rich-text offset-space and CRDT lower-level lanes. No active
`transport-integration`, `backend-api`, `protocol-server`, or standalone
fuzz-only assertion lanes appear in the latest level-mix snapshot.

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

The latest collected execution data has about `1,932,569` completed test
executions: `86,977` browser/e2e, `3,006` transport/integration, `1,693,308`
unit-property, and `149,278` coverage-guided-lower-level. Some historical rows
include approximate lower-level counts reconstructed from batch metadata or
legacy batch-count fields. The latest 15-minute bucket reports about `1,284`
browser/e2e test executions/hour, `48,160` unit-property test executions/hour,
`7,680` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2821 | 82 | 0 | 2.9% |
| `revision-persistence` | 3769 | 114 | 0 | 3.0% |
| `parser-serialization` | 2481 | 92 | 0 | 3.7% |
| `real-user-editing` | 5546 | 346 | 0 | 6.2% |
| `parser-transform` | 3566 | 345 | 0 | 9.7% |
| `common-blocks` | 3422 | 346 | 0 | 10.1% |
| `long-session-large-doc` | 2240 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2629 | 435 | 0 | 16.5% |
| `block-gauntlet` | 5003 | 871 | 0 | 17.4% |
| `structure` | 536 | 95 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 224 | 500 |
| real-user body save/reload next coverage tier | 283 | 500 |
| action reload-post-action next coverage tier | 612 | 1000 |
| action ui-heading-shortcut next coverage tier | 639 | 1000 |
| successful real-user-editing records next coverage tier | 346 | 500 |
| action ui-format-paragraph next coverage tier | 917 | 1000 |
| gauntlet block core/html next coverage tier | 464 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
completed-record depth for real-user editing, and a gauntlet block ratchet.

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

With the live loop at `max_parallel=6`, `198`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T214201Z`, took `6.1` minutes. The latest
feedback-action for cycle `198` took `9.1` minutes, updated
`current-pr-split.md`, terminated the stuck PR16 diagnostic session that was
blocked on interactive `wp-env destroy`, and launched bounded PR16 recovery
plus strict-expansion source-reduction jobs.

The newest PR-split synthesis, `20260516T214201Z`, says the split design still
needs tail changes and remains blocked for filing and final validation. It also
reports `/` as full with about `68M` free, so artifact writability remains an
immediate blocker. The current PR01-PR15C set plus PR02A is only a known-fix
prefix. The updated consensus tail is PR16 malformed-save pass/drop after seed
`950109` diagnostics, separate PR17 seed `1020002` WebSocket/Yjs follower-side
update repair or proof-based reclassification, strict-expansion residual source
reduction, PR18x source-reduced branches only for confirmed uncovered families,
rebuilt combined validation, focused seed gates, and only then final-stack fuzz
and filing.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Filing and final-stack fuzz remain blocked because
PR16's malformed-save built-assets replay produced `1` pass and `7` failures,
with seed `950109` needing focused localization, PR17 still needs a repair
branch or proof-based reclassification, and strict-expansion residuals have
`307` likely-real rows across `58` buckets and `9` split-relevant clusters. The
latest feedback-action launched
`rtc-pr16-950109-diagnostic-noninteractive-destroy-20260516T215150Z` and
`rtc-strict-expansion-source-reduce-5700084-20260516T215150Z`, while avoiding
broad final-stack fuzz, GitHub publication, speculative PR18x branches, and
duplicate PR17 diagnostics. Both completed quickly because the filesystem was
effectively full. PR16 preserved a disk-preflight-blocked rerun path, and the
strict-expansion job wrote compact source-boundary evidence for seed `5700084`
while deferring browser replay until disk space is recovered.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T21:55:37Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `7`. The latest live
current-output duplicate/startup sample is clean: current duplicate share is
`duplicateShareCurrent=0`, latest current summary startup failures are `0`, and
the latest monitor row has `1` quality issue and `1` warning, with `440G`
free memory and the headroom flag true.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only clean-live-status conclusion. The latest
synthesis says the remaining leak is inconsistent product-free startup/infra
gating before browser or Codex work, especially strict
`save-stuck-or-failed` bootstrap stalls that miss startup suppression. The prior
feedback-action added supervisor no-analysis sentinels, stale-root
live-analysis exit behavior, cooldown persistence across output-dir rotation,
and restarted the live monitor on the fresh root. Historical aggregate
duplicate/noise remains context, while current-output-dir duplicate share and
startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate, a separate PR17
seed `1020002` WebSocket/Yjs follower-side update repair, and now a
strict-expansion residual source-reduction gate before rebuilt validation and
final-stack fuzz. The latest
synthesis, `20260516T214201Z`, says PR16 is blocked by a built-assets replay
with `1` pass and `7` failures and needs focused seed `950109` localization;
PR17 remains separate and must produce a repair branch, report, or proof-based
reclassification; strict-expansion residuals must be source-reduced before
PR18x is named; and disk/artifact writability is an immediate blocker. The
newest feedback-action applied the cycle `198` tail update and launched bounded
PR16 recovery plus seed `5700084` source-reduction work, but the full filesystem
turned PR16 into a disk-preflight-blocked rerun and deferred strict-expansion
browser replay.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `1,284` browser/e2e test
executions/hour, `48,160` unit-property test executions/hour, `7,680`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are duplicate/noise validation on
the fresh root, artifact writability, the narrow strict-startup/cooldown
duplicate-noise pass, PR16 seed `950109` malformed-save localization,
strict-expansion seed `5700084` source reduction/replay, and seed
`1020002` WebSocket/Yjs follower-update application evidence.
