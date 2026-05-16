# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T23:23:57Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T23:17:26.373Z`,
  `lastUpdatedAt=2026-05-16T23:21:43.387Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1748` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T23:21:43Z`, coverage files grew from `272` to `36824`, a delta of
`36552`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `7` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and startup-clean: `duplicateShareCurrent` is `0` and current summary
startup failures are `0`. The same sample has `1` quality issue, `1` warning,
`436.8G` free memory, and the monitor headroom flag is true. The copied
novelty state scopes current-run triage to one output-dir root,
`run-20260516T231717Z`, and five enabled groups:
`novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, `novelty-ws-real-user-editing`, and
`novelty-ws-real-user-rich-text`. It still reports no current-run behavioral
files or signatures.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a graph-only clean-live-status conclusion. The
latest duplicate/noise synthesis, `20260516T231459Z`, says the remaining problem
is still a fuzzing control-plane leak: current-run triage is empty or missing,
historical no-product startup/bootstrap noise dominates, and suppression remains
split across runner, triage, analysis, deep analysis, live monitor, and
supervisor behavior. The paired feedback-action file is empty, so no new edits
were reported in that pass. The clean current-output duplicate/startup graph
sample is therefore live status for the current root, not closure.

The latest PR-split synthesis, `20260516T231356Z`, rejects a filing-ready or
final-validation interpretation. The `ready/rtc-*` PR01-PR15C prefix plus PR02A
remains useful, but it is only a known-fix prefix. PR16 is still conditional on
corrected seed `950109` pass/drop localization. PR17 remains separate seed
`1020002` follower-side Yjs update-application repair or proof-based
reclassification, not merge-update emission. Strict-expansion seed `5700084`
must be compared against PR5C and the ready prefix before any PR18x naming. The
graph's `0` visible likely-real failures is not filing approval.

The latest PR-split feedback-action, `20260516T231356Z`, is empty. The synthesis
still calls for bounded work only: run the `5700084` PR5C comparison, rerun the
corrected `950109` single-seed diagnostic, refresh the current manifest/audit,
and avoid broad fuzz, final-stack fuzz, duplicate `1020002` work, or premature
PR16/PR18 publication.

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
are `0`. The sample has `1` quality issue and `1` warning, with `436.8G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis says the safe next fix is a conservative
shared no-product startup/noise gate at every consumer boundary before queueing
or launching work, stale-current-output fail-closed behavior, and
scheduler/supervisor cooldown when current output has zero useful coverage while
`wp-env`/startup infra is failing. It explicitly preserves failures with product
evidence: joined users, real actions, reload/save/autosave, revision restore,
fault injection, operation witnesses, persistence/content/title drift, or
likely-real/uncertain analysis. Persona-loop evidence therefore rejects treating
the clean current duplicate/startup graph state as proof that duplicate/noise
leakage is fully fixed; the latest feedback-action file is empty and reports no
new applied patch.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T23:20:00Z` show sustained CPU
pressure with a late spike and then partial easing: the latest 25 samples range
from `32.8%` to `91.8%` utilization, with the latest sample at `52.3%`.
One-minute load exceeded the logical CPU count in `11` of those `25` sampled
windows, while the latest sampled 1/5/15-minute load is `29.9`, `37.9`, and
`38.1` against `64` logical CPUs. Raw memory remains ample, but the recent load
history still shows pressure; fresh `wp-env` recovery, current-output
duplicate/noise validation, and PR-split repair decisions remain live blockers.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, persistence, and long/large sessions. The current
copied novelty state has five enabled groups:
`novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, `novelty-ws-real-user-editing`, and
`novelty-ws-real-user-rich-text`. The duplicate/noise persona loop is stricter
than a graph-only read:
raw/non-actionable signatures stay visible, but the live health read uses
current-output-dir duplicate/noise and summary startup failures. The latest
current sample has `duplicateShareCurrent=0` and `0` current summary startup
failures, so the latest duplicate/startup live health is clean even though the
same row has `1` quality issue and `1` warning. Persona-loop evidence still
rejects that as closure because the latest duplicate/noise synthesis says
current-run triage is empty or missing while historical no-product
startup/bootstrap noise still dominates. The paired feedback-action file is
empty, and the refreshed current root still has no current behavioral files.
Historical `pre_action_bootstrap_stall` remains context, while live graph status
comes from current-output-dir duplicate/noise and current summary startup
failures. Product-evidence failures must remain visible while product-free
startup/infra noise is gated before expensive analysis.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `30` browser/e2e lanes across `30` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `5` coverage-guided, `9` focused-shards, `6` gap-booster,
and `10` strict-expansion. The freshest coverage-guided root,
`run-20260516T231717Z`, is browser/e2e-only, with five enabled groups.

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

The latest collected execution data has about `2,297,720` completed test
executions: `90,488` browser/e2e, `3,006` transport/integration, `2,003,940`
unit-property, and `200,286` coverage-guided-lower-level. Some historical rows
include approximate lower-level counts reconstructed from batch metadata or
legacy batch-count fields. The latest 15-minute bucket reports about `1,112`
browser/e2e test executions/hour, `125,216` unit-property test executions/hour,
`19,968` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2857 | 84 | 0 | 2.9% |
| `revision-persistence` | 3818 | 118 | 0 | 3.1% |
| `parser-serialization` | 2566 | 101 | 0 | 3.9% |
| `real-user-editing` | 5587 | 346 | 0 | 6.2% |
| `parser-transform` | 3620 | 349 | 0 | 9.6% |
| `common-blocks` | 3470 | 351 | 0 | 10.1% |
| `long-session-large-doc` | 2247 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2656 | 435 | 0 | 16.4% |
| `block-gauntlet` | 5216 | 915 | 0 | 17.5% |
| `structure` | 536 | 95 | 0 | 17.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 225 | 500 |
| real-user body save/reload next coverage tier | 284 | 500 |
| action reload-post-action next coverage tier | 613 | 1000 |
| action ui-heading-shortcut next coverage tier | 646 | 1000 |
| successful real-user-editing records next coverage tier | 346 | 500 |
| action ui-format-paragraph next coverage tier | 922 | 1000 |
| gauntlet block core/html next coverage tier | 481 | 500 |

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

With the live loop at `max_parallel=6`, `206`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T231356Z`, took `6.7` minutes. The event
log then shows feedback action after cycle `206` starting.

The newest completed PR-split synthesis, `20260516T231356Z`, says the split
design still needs change and remains blocked for filing and final validation.
The current PR01-PR15C set plus PR02A is only a known-fix prefix. The consensus
tail is PR16 malformed-save pass/drop after corrected seed `950109` diagnostics,
separate PR17 seed `1020002` follower-side Yjs update-application repair or
proof-based reclassification, strict-expansion source comparison before any
PR18x naming, rebuilt combined validation, focused seed gates, and only then
final-stack fuzz and filing.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. PR16 remains conditional; PR17 should no longer be
described as merge-update emission because the update reaches relay/page 1 and
page 0 applies the remote range as deleted; and seed `5700084` should be
compared against PR5C and the ready prefix before any late PR18 is named. The
latest feedback-action file is empty, so this refresh records no new applied
PR-split edits from that action.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T23:14:27Z`, has `27`
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
the latest monitor row has `1` quality issue and `1` warning, with `436.8G`
free memory and the headroom flag true. The copied novelty state scopes
current-run triage to `run-20260516T231717Z` and five enabled groups, but the root
has no current behavioral files or signatures. The live health read comes from
`duplicateShareCurrent` and current summary startup failures rather than
historical aggregate duplicate/noise.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only clean-live-status conclusion. The latest
duplicate/noise synthesis, `20260516T231459Z`, says the root cause is still a
fragmented control-plane leak: current-run triage is empty or missing while
historical no-product startup/bootstrap noise dominates, and stale or
summary-only startup failures can still cross runner, triage, scheduler,
analysis, deep analysis, and live-monitor boundaries. The latest feedback-action
file is empty, so there is no new applied patch in this evidence set. The
synthesis recommends the conservative next pass: one shared no-product startup
predicate, fail-closed stale current-output handling, and supervisor cooldown
when current output has zero useful coverage during `wp-env`/startup failures.
Historical aggregate duplicate/noise remains context, while current-output-dir
duplicate share and summary startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate, a separate PR17
seed `1020002` WebSocket/Yjs follower-side update repair, and a
strict-expansion residual source-reduction gate before rebuilt validation and
final-stack fuzz. The latest completed synthesis, `20260516T231356Z`, says PR16
is still held pending corrected seed `950109` pass/drop localization; PR17
remains separate and must produce follower-side Yjs update repair or proof-based
reclassification; and strict-expansion seed `5700084` should be compared against
PR5C and the ready prefix before PR18x is named. It also corrects PR17 wording:
the update reaches relay/page 1, while page 0 applies the remote range as
deleted. Final-stack fuzz, filing, and extra broad fuzz remain blocked. The
latest feedback-action file is empty, so no new PR-split edits were applied in
this evidence set.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `1,112` browser/e2e test
executions/hour, `125,216` unit-property test executions/hour, `19,968`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are `wp-env`/MySQL recovery,
duplicate/noise validation on the fresh root, artifact writability, PR16 seed
`950109` malformed-save localization, strict-expansion seed `5700084`
PR5C/ready-prefix comparison, and seed `1020002` WebSocket/Yjs follower-update
application evidence.
