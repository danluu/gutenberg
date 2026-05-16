# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T21:37:15Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T21:18:08.708Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1709` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T21:36:45Z`, coverage files grew from `272` to `36388`, a delta of
`36116`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `7` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and startup-clean: `duplicateShareCurrent` is `0` and current summary
startup failures are `0`. The same sample has `0` quality issues, `0` warnings,
`434.4G` free memory, and the monitor headroom flag is true. The copied novelty
state has two enabled groups in the fresh active root. This report treats
current-output-dir duplicate/noise and startup-failure metrics as live status;
historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only clean-live-status conclusion.
The newest duplicate/noise synthesis, `20260516T211828Z`, says the remaining
problem is a control-plane leak: cooldown state can be lost across output-dir
rotation, stale live-analysis sessions can remain pointed at old roots, and
some strict no-product startup crashes may miss the narrow classifier. The
latest non-empty feedback-action, `20260516T205241Z`, implemented a bounded
fuzzer-side fix and restarted monitoring, but the newer synthesis says that was
not enough to prove the leak closed. The graph now shows a clean current sample;
the persona-loop evidence treats that as partial validation, not proof.

The latest PR-split synthesis, `20260516T212100Z`, rejects a filing-ready
interpretation. The `ready/rtc-*` PR01-PR15C prefix plus PR02A remains useful,
but it is only a known-fix prefix. PR16 failed its malformed-save built-assets
replay with `1` pass and `7` failures and needs focused seed `950109`
localization before it can stay in the stack. PR17 remains a separate seed
`1020002` WebSocket/Yjs repair or proof-based reclassification. The required
tail is now PR16 pass/drop, PR17 decision, strict-expansion residual split
audit, PR18x only for source-reduced uncovered families, rebuilt validation,
focused seed gate, and only then final-stack fuzz and filing. The matching
feedback-action updated the split, patched the loop context to include
strict-expansion `likely_real` rows, and launched bounded PR16, strict-expansion
audit, and PR17 follower-update jobs. The synthesis still rejects reading the
graph's `0` likely-real failures as filing approval.

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
are `0`. The sample has `0` quality issues and `0` warnings, with `434.4G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis says the remaining issue is control-plane
state, not product failure evidence: cooldowns can be forgotten across root
rotation, live-analysis consumers can stay attached to stale roots, and strict
startup classifier coverage may still be too narrow. The previous feedback
mapped the HTTP persistence probe, tightened startup caps, and restarted the
monitor; the newer synthesis still calls for durable cooldowns, live-analysis
lifecycle cleanup, stale-root guards, and no-analysis sentinels. The refreshed
current-output sample is clean, but persona-loop feedback rejects treating that
single graph state as proof that duplicate/noise leakage is fixed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T21:30:00Z` show sustained CPU
pressure with a late spike and then easing: the latest 25 samples range from
`62.1%` to `91.8%` utilization, with the latest sample at `62.1%`. One-minute
load exceeded the logical CPU count in `21` of those `25` sampled windows, while
the latest sampled 1/5/15-minute load is `35.7`, `44.6`, and `55.4` against `64`
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
copied novelty state has two enabled groups:
`novelty-ws-real-user-editing` and `novelty-ws-real-user-rich-text`. The
duplicate/noise persona loop is stricter than a graph-only read:
raw/non-actionable signatures stay visible, but the live health read uses
current-output-dir duplicate/noise and startup failures. The latest current
sample has `duplicateShareCurrent=0` and `0` current summary startup failures,
so the latest plotted live health is clean. The latest duplicate/noise synthesis
still rejects that as closure because cooldown persistence, stale live-analysis
cleanup, and strict startup classification remain control-plane risks that must
continue preserving product-evidence failures.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `27` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6` gap-booster,
and `10` strict-expansion.

Live fuzzing is concentrated in browser/e2e lanes, but lower-level work is
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

The latest collected execution data has about `1,813,163` completed test
executions: `83,887` browser/e2e, `3,006` transport/integration, `1,593,376`
unit-property, and `132,894` coverage-guided-lower-level. The latest 15-minute
bucket reports about `3,220` browser/e2e test executions/hour, `101,136`
unit-property test executions/hour, `15,368` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2806 | 82 | 0 | 2.9% |
| `revision-persistence` | 3761 | 113 | 0 | 3.0% |
| `parser-serialization` | 2469 | 92 | 0 | 3.7% |
| `real-user-editing` | 5539 | 346 | 0 | 6.2% |
| `parser-transform` | 3560 | 345 | 0 | 9.7% |
| `common-blocks` | 3403 | 344 | 0 | 10.1% |
| `long-session-large-doc` | 2240 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2588 | 435 | 2 | 16.8% |
| `block-gauntlet` | 4961 | 863 | 2 | 17.4% |
| `structure` | 536 | 95 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 223 | 500 |
| real-user body save/reload next coverage tier | 282 | 500 |
| action reload-post-action next coverage tier | 610 | 1000 |
| action ui-heading-shortcut next coverage tier | 637 | 1000 |
| successful real-user-editing records next coverage tier | 346 | 500 |
| action ui-format-paragraph next coverage tier | 916 | 1000 |
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

With the live loop at `max_parallel=6`, `196`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T212100Z`, took `7.2` minutes. The
matching feedback-action applied cycle `196` feedback, updated
`current-pr-split.md`, patched the review-loop context to include
strict-expansion `likely_real` rows in the progress gate, and launched bounded
PR16, strict-expansion audit, and PR17 follower-update jobs.

The newest PR-split synthesis, `20260516T212100Z`, says the split design is
blocked for filing and final-stack fuzz, not blocked for all work. The current
PR01-PR15C set plus PR02A is only a known-fix prefix. The updated consensus
tail is PR16 malformed-save pass/drop after seed `950109` diagnostics, separate
PR17 seed `1020002` WebSocket/Yjs repair or proof-based reclassification, a
strict-expansion residual split-audit gate, PR18x source-reduced branches only
for confirmed uncovered families, rebuilt combined validation, focused seed
gates, and only then final-stack fuzz.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Filing and final-stack fuzz remain blocked because
PR16's malformed-save built-assets replay produced `1` pass and `7` failures,
with seed `950109` needing focused localization, and PR17 still needs a repair
branch or proof-based reclassification. The matching feedback-action launched
`rtc-pr16-950109-diagnostic-20260516T212950Z`,
`rtc-strict-expansion-split-audit-20260516T212950Z`, and
`rtc-pr17-1020002-follower-update-20260516T213345Z`, while avoiding broad
final-stack fuzz, GitHub publication, speculative PR18x branches, and duplicate
PR17 merge-emission diagnostics.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T21:25:58Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `7`. The latest live
current-output sample is clean: current duplicate share is
`duplicateShareCurrent=0`, latest current summary startup failures are `0`, and
the latest monitor row has `0` quality issues and `0` warnings, with `434.4G`
free memory and the headroom flag true.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only clean-live-status conclusion. The latest
synthesis says the leak is still in control-plane state: cooldowns can be lost
across output-dir rotation, live-analysis can point at stale roots, and strict
startup classification may miss narrow no-product crashes. The latest non-empty
feedback-action added the missing `novelty-http-persistence-probe` mapping,
strict startup caps, and stickier producer cooldown, then restarted monitoring;
the newer synthesis says that is still insufficient. Historical aggregate
duplicate/noise remains context, while current-output-dir duplicate share and
startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate, a separate PR17
seed `1020002` WebSocket/Yjs repair, and now a strict-expansion residual
split-audit gate before rebuilt validation and final-stack fuzz. The latest
synthesis, `20260516T212100Z`, says PR16 is blocked by a built-assets replay
with `1` pass and `7` failures and needs focused seed `950109` localization;
PR17 remains separate and must produce a repair branch, report, or proof-based
reclassification. The matching feedback-action updated the split and launched
the bounded PR16 diagnostic, strict-expansion split audit, and PR17
follower-update jobs.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `3,220` browser/e2e test
executions/hour, `101,136` unit-property test executions/hour, `15,368`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are duplicate/noise validation on
the fresh root, PR16 seed `950109` malformed-save localization, strict-expansion
residual split-audit evidence, and seed `1020002` WebSocket/Yjs
follower-update application evidence.
