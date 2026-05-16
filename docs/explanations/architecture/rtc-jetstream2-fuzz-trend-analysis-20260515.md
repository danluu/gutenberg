# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T19:57:43Z`

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
`1676` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T19:56:52Z`, coverage files grew from `272` to `35742`, a delta of
`35470`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `8` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample remains below the live
duplicate/noise gate and is startup-clean: `duplicateShareCurrent` is `0.3056`
and current summary startup failures are `0`. The same sample has `1` quality
issue, `0` warnings, `428.3G` free memory, and the monitor headroom flag is
false. The copied novelty state has six enabled coverage-guided browser
groups after the latest output-dir reset. This report treats current-output-dir
duplicate/noise and startup-failure metrics as live status; historical aggregate
duplicate/noise is only context.

Persona-loop evidence changes the duplicate/noise interpretation from "startup
noise only" to "startup noise mostly contained, actionability propagation still
needs work." The latest duplicate/noise feedback-action file,
`20260516T194153Z`, is empty; the latest non-empty feedback-action,
`20260516T190835Z`, says novelty-monitor
accounting now splits raw from actionable triage signatures, excludes
known/non-actionable noise from productive duplicate-share policy, and keeps raw
noise visible. Its measured status was `112` raw signatures, `31` actionable
signatures, `81` non-actionable signatures, and `28` known-infra signatures,
with actionable top share at `0.4516`, below the binding `0.50` gate. The
latest synthesis, `20260516T194153Z`, rejects treating that as complete: strict
startup suppression is mostly gated, but
stale/capped/source-suppressed signatures still need to propagate into triage
source state and novelty yield accounting.

The latest PR-split synthesis, `20260516T195005Z`, says the split is still not
filing-ready and changes the next shape. The caller/base provenance diagnostic
now exists and says caller/base propagation is not the `1020002` owner. The
current `ready/rtc-*` PR01-PR15C prefix plus PR02A remains useful branch
hygiene, followed by a conditional PR16 malformed-save payload candidate after
restack/replay, then a separate PR17 seed `1020002` WebSocket/Yjs
merge/update-emission repair, rebuilt combined validation, focused seed gates,
and only then final-stack fuzz. The latest PR-split feedback-action,
`20260516T195005Z`, is empty; the synthesis rejects wait-only handling while the
`1020002` repair, malformed-save replay, and manifest audit lanes are available.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `8`
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

The latest current-output-dir sample is below the live duplicate/noise gate and
has no current startup failures: `duplicateShareCurrent=0.3056` and current
summary startup failures are `0`. The sample has `1` quality issue and `0`
warnings, with `428.3G` free memory and the monitor headroom flag false. The
plot uses `duplicateShareCurrent` and current summary startup failures for the
live health view; it does not use historical aggregate duplicate/noise as the
plotted live signal.

The latest non-empty duplicate/noise feedback-action says raw known-infra noise
remains visible, but duplicate-share policy now uses actionable current-run
signatures. That rejects the earlier graph interpretation that raw known-infra
volume should be treated as actionable duplicate/noise. The latest
duplicate/noise synthesis,
`20260516T194153Z`, rejects treating the fix as complete: strict/bootstrap
suppression is mostly gated, but `triage-watcher`, `analysis-tier`,
`deep-analysis-tier`, `live-analysis-monitor`, and `novelty-monitor` still need
one effective non-actionable state. The next remediation is source-state
reconciliation for `stale-source`, `family-capped`, and `source-suppressed`
signatures, not broader product-failure suppression.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T19:50:00Z` show sustained CPU
pressure: the 16:50-19:50 samples range from `64.9%` to `81.8%` utilization,
with the latest sample at `78.6%`. One-minute load exceeded the logical CPU
count in `16` of those `19` sampled windows, and the latest sampled
1/5/15-minute load is `65.6`, `73.3`, and `74.8` against `64` logical CPUs.
The immediate blockers are still coverage depth and PR-split repair decisions
rather than raw memory headroom; duplicate/noise is below the current gate but
still needs source-state reconciliation.

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
than a graph-only read: the latest feedback says known/non-actionable signatures
now stay visible as raw noise but no longer drive actionable duplicate-share
policy. The latest current-output sample has `duplicateShareCurrent=0.3056` and
`0` current summary startup failures. Startup pollution is currently clean in
the live sample, and the latest non-empty duplicate/noise feedback-action
reports actionable duplicate share below the binding gate. The latest
duplicate/noise synthesis still asks for actionability state propagation from
analysis/deep-analysis into triage and novelty before treating duplicate/noise
as resolved.

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

The latest collected execution data has about `1,443,150` completed test
executions: `73,420` browser/e2e, `3,006` transport/integration, `1,283,948`
unit-property, and `82,776` coverage-guided-lower-level. The latest 15-minute
bucket reports about `5,420` browser/e2e test executions/hour, `134,848`
unit-property test executions/hour, `25,088` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2759 | 81 | 0 | 2.9% |
| `revision-persistence` | 3677 | 111 | 0 | 3.0% |
| `parser-serialization` | 2349 | 83 | 0 | 3.5% |
| `real-user-editing` | 5458 | 336 | 0 | 6.2% |
| `parser-transform` | 3504 | 340 | 0 | 9.7% |
| `common-blocks` | 3365 | 341 | 0 | 10.1% |
| `long-session-large-doc` | 2228 | 319 | 0 | 14.3% |
| `block-gauntlet` | 4642 | 793 | 2 | 17.1% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2397 | 431 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 210 | 500 |
| real-user body save/reload next coverage tier | 269 | 500 |
| action reload-post-action next coverage tier | 593 | 1000 |
| action ui-heading-shortcut next coverage tier | 615 | 1000 |
| successful real-user-editing records next coverage tier | 336 | 500 |
| gauntlet block core/html next coverage tier | 436 | 500 |
| action ui-format-paragraph next coverage tier | 889 | 1000 |
| gauntlet block core/details next coverage tier | 498 | 500 |

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

With the live loop at `max_parallel=6`, `188`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T195005Z`, took `6.7` minutes, and the
latest completed feedback-action cycle is `184` at `3.2` minutes.

The latest PR-split synthesis, `20260516T195005Z`, says the split design is
blocked, not filing-ready. The current PR01-PR15C set plus PR02A is only a
known-fix prefix. The consensus shape is now the `ready/rtc-*` prefix, PR02A,
a conditional PR16 malformed-save payload candidate after restack/replay, a
separate PR17 seed `1020002` WebSocket/Yjs merge/update-emission repair,
rebuilt combined validation, focused seed gates, and only then final-stack fuzz.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. The `1020002` caller/base diagnostic has completed
and says caller/base propagation is not the owner, so the next bounded repair
must target CRDT/Yjs update emission after `mergeYBlocksStaleBaseSemanticInsert`.
Malformed-save remains an independent PR16 candidate lane that must restack on
`ready/rtc-pr15c-fallback-group-delete-green` and replay the malformed rows
before filing. The latest feedback-action file, `20260516T195005Z`, is empty;
the synthesis rejects wait-only handling while the `1020002` repair,
malformed-save replay, and manifest audit lanes are available.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T19:51:03Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `8`. The latest live
current-output sample has current duplicate share at
`duplicateShareCurrent=0.3056`, with latest current summary startup failures at
`0`. The latest monitor row has `1` quality issue and `0` warnings, with
`428.3G` free memory and the headroom flag false.

The duplicate/noise persona loop agrees that startup suppression is mostly
contained and that the novelty-monitor raw/actionable accounting fix improved
the live read. It rejects the older interpretation that raw known-infra volume
should drive actionable duplicate/noise policy. The latest
`20260516T194153Z` synthesis also rejects treating duplicate/noise as fully
resolved: stale-source reconciliation and analysis/deep-analysis non-actionable
states still need to become shared actionability state for triage launch gating
and novelty yield accounting. The current copied state has six enabled
coverage-guided browser groups; the live graph is below the duplicate gate but
the fix is not complete, and the remaining work is control-plane duplicate
actionability rather than broad product suppression.

The PR-split persona loop also rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate after
restack/replay, and a separate PR17 seed `1020002` WebSocket/Yjs
merge/update-emission repair. The latest synthesis, `20260516T195005Z`, says
the caller/base diagnostic completed without owning `1020002`; filing and
final-stack fuzz remain blocked, and wait-only handling is invalid while the
bounded `1020002` successor, malformed-save restack/replay, and manifest audit
lanes can run in parallel.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has about `5,420` browser/e2e test executions/hour, `134,848`
unit-property test executions/hour, `25,088` coverage-guided-lower-level test
executions/hour, `0` transport/integration test executions/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions.
The next narrow operational checks are current-root triage/live-analysis
source-state reconciliation, malformed-save restack/replay evidence, and seed
`1020002` Gutenberg-origin store-to-CRDT/Yjs repair evidence.
