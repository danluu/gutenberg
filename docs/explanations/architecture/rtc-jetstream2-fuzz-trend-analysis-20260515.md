# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T22:58:17Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T22:48:35.759Z`,
  `lastUpdatedAt=2026-05-16T22:55:22.664Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1738` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T22:55:22Z`, coverage files grew from `272` to `36693`, a delta of
`36421`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `7` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and startup-clean: `duplicateShareCurrent` is `0` and current summary
startup failures are `0`. The same sample has `1` quality issue, `1` warning,
`437.4G` free memory, and the monitor headroom flag is true. The copied
novelty state scopes current-run triage to one output-dir root and one enabled
group, `novelty-ws-persistence-no-title`, but still reports no current-run
behavioral records.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a graph-only clean-live-status conclusion. The
latest duplicate/noise synthesis, `20260516T223603Z`, says the remaining problem
is control-plane consistency: stale roots, stale pause state, provisional or
product-free records, and over-specific family capping can still spend browser
and Codex capacity on known noise. The latest duplicate/noise feedback-action,
`20260516T223603Z`, is empty; the latest nonempty feedback-action,
`20260516T220113Z`, applied a bounded control-plane fix and reported clean
current-run triage (`roots=1`, `signatures=0`, `likelyRealVisible=0`), but
`wp-env` was still uninitialized because MySQL exited during compose startup.
The clean current-output duplicate/startup graph sample is therefore partial
evidence only, not closure.

The latest PR-split synthesis, `20260516T225001Z`, rejects a filing-ready or
final-validation interpretation. The `ready/rtc-*` PR01-PR15C prefix plus PR02A
remains useful, but it is only a known-fix prefix. PR16 is held because seed
`950109` failed and needs product-vs-infra localization. PR17 remains a
separate seed `1020002` follower-side Yjs update-application repair or
proof-based reclassification. Strict-expansion residuals stay real split work,
starting with seed `5700084`; the active focused replay must produce a nonempty
report before PR18x is named. The graph's `0` visible likely-real failures is
not filing approval.

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
are `0`. The sample has `1` quality issue and `1` warning, with `437.4G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest nonempty duplicate/noise feedback-action says the bounded
control-plane fix landed: strict no-product startup gating was aligned, novelty
current-run scope includes the output root, stale live-analysis roots are
auto-detected, and gate-only validation removed the known strict-startup
leakage while preserving product-evidence signatures. The latest synthesis
still says the policy must be run-local, product-evidence-aware, and shared
across the producer, triage, scheduler, and analysis control path. Fresh browser
coverage was still blocked at the time of the last nonempty feedback-action
because `wp-env` was uninitialized and MySQL exited during compose startup.
Persona-loop feedback therefore rejects treating the clean current
duplicate/startup graph state as proof that duplicate/noise leakage is fully
fixed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T22:50:00Z` show sustained CPU
pressure with a late spike and then partial easing: the latest 25 samples range
from `32.8%` to `91.8%` utilization, with the latest sample at `45.9%`.
One-minute load exceeded the logical CPU count in `14` of those `25` sampled
windows, while the latest sampled 1/5/15-minute load is `31.8`, `32.1`, and
`34.0` against `64` logical CPUs. Raw memory remains ample, but the recent load
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
copied novelty state has one enabled group:
`novelty-ws-persistence-no-title`. The duplicate/noise persona loop is stricter
than a graph-only read:
raw/non-actionable signatures stay visible, but the live health read uses
current-output-dir duplicate/noise and summary startup failures. The latest
current sample has `duplicateShareCurrent=0` and `0` current summary startup
failures, so the latest duplicate/startup live health is clean even though the
same row has `1` quality issue and `1` warning. Persona-loop evidence still
rejects that as closure because fresh browser coverage was blocked by
`wp-env`/MySQL startup at the last nonempty feedback-action, and historical
`pre_action_bootstrap_stall` remains a hold reason until current-run noise
gating is validated. Product-evidence failures must remain visible while
product-free startup/infra noise is gated before expensive analysis.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `26` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `1` coverage-guided, `9` focused-shards, `6` gap-booster,
and `10` strict-expansion. The freshest coverage-guided root,
`run-20260516T224827Z`, is browser/e2e-only, with one enabled group.

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

The latest collected execution data has about `2,176,953` completed test
executions: `89,637` browser/e2e, `3,006` transport/integration, `1,899,192`
unit-property, and `185,118` coverage-guided-lower-level. Some historical rows
include approximate lower-level counts reconstructed from batch metadata or
legacy batch-count fields. The latest 15-minute bucket reports about `1,652`
browser/e2e test executions/hour, `197,456` unit-property test executions/hour,
`28,160` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2839 | 82 | 0 | 2.9% |
| `revision-persistence` | 3804 | 117 | 0 | 3.1% |
| `parser-serialization` | 2533 | 98 | 0 | 3.9% |
| `real-user-editing` | 5570 | 346 | 0 | 6.2% |
| `parser-transform` | 3601 | 347 | 0 | 9.6% |
| `common-blocks` | 3447 | 348 | 0 | 10.1% |
| `long-session-large-doc` | 2247 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2649 | 435 | 0 | 16.4% |
| `block-gauntlet` | 5136 | 894 | 0 | 17.4% |
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
| action ui-heading-shortcut next coverage tier | 641 | 1000 |
| successful real-user-editing records next coverage tier | 346 | 500 |
| action ui-format-paragraph next coverage tier | 922 | 1000 |
| gauntlet block core/html next coverage tier | 473 | 500 |

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

With the live loop at `max_parallel=6`, `204`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T225001Z`, took `6.8` minutes. The event
log then shows feedback after cycle `204` starting; the corresponding latest
feedback-action file is empty.

The newest completed PR-split synthesis, `20260516T225001Z`, says the split
design still needs change and remains blocked for filing and final validation.
The current PR01-PR15C set plus PR02A is only a known-fix prefix. The consensus
tail is PR16 malformed-save pass/drop after seed `950109` diagnostics, separate
PR17 seed `1020002` WebSocket/Yjs follower-side update-application repair or
proof-based reclassification, strict-expansion residual source reduction
starting with seed `5700084`, PR18x source-reduced branches only for confirmed
uncovered families, rebuilt combined validation, focused seed gates, and only
then final-stack fuzz and filing.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Filing and final-stack fuzz remain blocked because
PR16's latest seed `950109` replay still failed and needs product-vs-infra
localization, PR17 still needs a repair branch or proof-based reclassification,
and strict-expansion residuals need source reduction before PR18x is named. The
latest nonempty feedback-action, from cycle `202`, applied the prior split
guidance, recorded rootfs recovery, patched the loop so zero-byte reports count
as no progress and reports are written atomically, and launched one bounded
`5700084` focused replay. The `20260516T225001Z` synthesis says that replay is
already active and should not be duplicated; broad final-stack fuzz, filing,
rebuilt validation, duplicate `1020002` diagnostics, PR16 publication, and PR18A
naming remain deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T22:51:14Z`, has `27`
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
the latest monitor row has `1` quality issue and `1` warning, with `437.4G`
free memory and the headroom flag true. The copied novelty state scopes
current-run triage to one output-dir root; the live health read comes from
`duplicateShareCurrent` and current summary startup failures rather than
historical aggregate duplicate/noise.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only clean-live-status conclusion. The latest
duplicate/noise synthesis, `20260516T223603Z`, says the root cause is still
fragmented duplicate/noise control across producer, triage, scheduler, and
analysis consumers: stale roots, stale pause state, no-product or provisional
records, and over-specific family capping can still leak work. The latest
feedback-action is empty, and the latest nonempty feedback-action reports that
strict no-product startup gating, novelty current-run scope, and stale
live-root detection were patched, with gate-only validation preserving
product-evidence signatures. It also says `wp-env` was still uninitialized
because MySQL exited during compose startup, so fresh browser coverage and
duplicate/noise validation remained blocked.
Historical aggregate duplicate/noise remains context, while current-output-dir
duplicate share and summary startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate, a separate PR17
seed `1020002` WebSocket/Yjs follower-side update repair, and a
strict-expansion residual source-reduction gate before rebuilt validation and
final-stack fuzz. The latest completed synthesis, `20260516T225001Z`, says
PR16 is still held because seed `950109` failed and needs product-vs-infra
localization; PR17 remains separate and must produce a follower-side Yjs update
repair or proof-based reclassification; strict-expansion seed `5700084` must
produce a nonempty source-reduction report before PR18x is named; and
final-stack fuzz, filing, and extra broad fuzz remain blocked. The latest
feedback-action is empty. The latest nonempty feedback-action patched the
review loop's zero-byte/atomic-report handling and launched a bounded `5700084`
focused replay, but did not publish PR16, name PR18A, launch broad fuzz, or
duplicate `1020002` work.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `1,652` browser/e2e test
executions/hour, `197,456` unit-property test executions/hour, `28,160`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are `wp-env`/MySQL recovery,
duplicate/noise validation on the fresh root, artifact writability, PR16 seed
`950109` malformed-save localization, strict-expansion seed `5700084` source
reduction/replay, and seed `1020002` WebSocket/Yjs follower-update application
evidence.
