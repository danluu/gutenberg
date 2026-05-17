# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T00:09:52Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T00:07:23.301Z`,
  `lastUpdatedAt=2026-05-17T00:08:56.835Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1765` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T00:08:56Z`, coverage files grew from `272` to `37074`, a delta of
`36802`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `6` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and completed-record depth.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and startup-clean: `duplicateShareCurrent` is `0` and current summary
startup failures are `0`. The same sample has `1` quality issue, `1` warning,
`431.2G` free memory, and the monitor headroom flag is true. The copied
novelty state scopes current-run triage to one output-dir root,
`run-20260517T000714Z`, and five enabled groups:
`novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, `novelty-ws-real-user-editing`, and
`novelty-ws-real-user-rich-text`. It still reports no current-run behavioral
files or signatures, and the health warning is that no behavioral coverage files
were found under that novelty output dir.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a graph-only clean-live-status conclusion. The
latest duplicate/noise synthesis, `20260516T235736Z`, says the dominant issue is
still control-plane leakage: the current coverage-guided run is infra-stalled,
current-run triage is empty, coverage-guided starts do not yet reliably run the
live-analysis monitor with a current-output pointer, stale analysis sessions can
outlive old roots, and family caps are too local. The latest duplicate/noise
feedback-action file, `20260516T235736Z`, is empty, so the latest usable action
evidence remains `20260516T231459Z`: it applied the bounded gate/backoff patch
and restarted relevant sessions, but `wp-env` was still uninitialized. The clean
current-output duplicate/startup graph sample is therefore live status for the
current root, not closure.

The latest PR-split synthesis, `20260516T235827Z`, rejects a filing-ready or
final-validation interpretation. The ready PR01-PR15C heads plus PR02A remain
useful only as a known-fix prefix. The replacement tail is a clean
malformed-save restack from only `8340c5d794a` and `008b7258fe4`, preferably as
PR6B after PR6A if clean there, otherwise as a clean post-PR15C PR16; then a
separate PR17/seed `1020002` follower-side Yjs update-application repair or
proof reclassification; then rebuilt combined validation, focused `1020002`
gate, final-stack fuzz, and filing. The synthesis drops speculative PR18x for
`5700084`, classifying it as PR5C-covered plus strict oracle `\n` versus `<br>`
equivalence unless a reduced uncovered product bug appears. The graph's `0`
visible likely-real failures is not filing approval. The paired feedback-action
applied Cycle 210, kept contaminated malformed-save heads as evidence only,
refreshed a 32-row manifest with `0` audit failures, and left broad fuzz,
final-stack fuzz, duplicate PR6B/PR16 work, and duplicate `1020002` work
blocked while the active PR6B resolver continues.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `6`
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
are `0`. The sample has `1` quality issue and `1` warning, with `431.2G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis says the next safe control-plane pass is to
fix/restart `wp-env`, start bounded coverage-guided live analysis with
`RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER`, fail closed on missing or stale
current-output pointers, clean stale analysis/deep-analysis sessions, and avoid
broader suppression changes around `userCount > 0` until targeted evidence
settles that disagreement. The latest feedback-action file is empty; the latest
usable action evidence is still the Cycle 84 bounded gate/backoff patch and
restart, which measured the current root as empty because `wp-env start` was
still failing before productive runs began. Persona-loop evidence therefore
rejects treating the clean current duplicate/startup graph state as proof that
duplicate/noise leakage is fully fixed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T23:50:00Z` show sustained CPU
pressure with a late spike and then partial easing: the latest 25 samples range
from `32.8%` to `91.8%` utilization, with the latest sample at `46.1%`.
One-minute load exceeded the logical CPU count in `8` of those `25` sampled
windows, while the latest sampled 1/5/15-minute load is `33.5`, `33.0`, and
`34.4` against `64` logical CPUs. Raw memory remains ample, but the recent load
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
rejects that as closure because the latest duplicate/noise synthesis says the
control plane still admits repeated work through missing or stale current-output
pointers, absent live-analysis sidecar wiring, and fragmented family caps while
the active run is stuck in infra startup. The latest feedback-action file is
empty; the latest usable action evidence is still the shared gate/backoff patch
from `20260516T231459Z`, after which `wp-env` remained uninitialized. The
refreshed current root `run-20260517T000714Z` still has no current behavioral
files or signatures.
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
`run-20260517T000714Z`, is browser/e2e-only, with five enabled groups.

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

The latest collected execution data has about `2,505,293` completed test
executions: `91,977` browser/e2e, `3,006` transport/integration, `2,183,336`
unit-property, and `226,974` coverage-guided-lower-level. Some historical rows
include approximate lower-level counts reconstructed from batch metadata or
legacy batch-count fields. The latest 15-minute bucket reports about `1,116`
browser/e2e test executions/hour, `163,744` unit-property test executions/hour,
`21,504` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2881 | 87 | 0 | 3.0% |
| `revision-persistence` | 3845 | 119 | 0 | 3.1% |
| `parser-serialization` | 2647 | 110 | 0 | 4.2% |
| `real-user-editing` | 5604 | 347 | 0 | 6.2% |
| `parser-transform` | 3660 | 353 | 0 | 9.6% |
| `common-blocks` | 3502 | 358 | 0 | 10.2% |
| `long-session-large-doc` | 2247 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2656 | 435 | 0 | 16.4% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5371 | 955 | 0 | 17.8% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 226 | 500 |
| real-user body save/reload next coverage tier | 285 | 500 |
| action reload-post-action next coverage tier | 614 | 1000 |
| action ui-heading-shortcut next coverage tier | 652 | 1000 |
| successful real-user-editing records next coverage tier | 347 | 500 |
| action ui-format-paragraph next coverage tier | 931 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
and completed-record depth for real-user editing.

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

With the live loop at `max_parallel=6`, `210`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T235827Z`, took `5.8` minutes. The event
log also shows feedback for cycle `210` finishing after `4.8` minutes, followed
by review `20260517T000906Z` starting.

The newest PR-split synthesis, `20260516T235827Z`, says the split design still
needs change and remains blocked for filing and final validation. The current
PR01-PR15C heads plus PR02A are only a known-fix prefix. The replacement tail is
a clean malformed-save restack from only commits `8340c5d794a` and
`008b7258fe4`, preferably as PR6B after PR6A if it is clean there, otherwise as
clean PR16 after PR15C; separate PR17/seed `1020002` follower-side Yjs
update-application repair or proof-based reclassification; rebuilt combined
validation; focused `1020002` gate; and only then final-stack fuzz and filing.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Seed `1020002` should no longer be described as
merge-update emission work; the boundary is follower-side Yjs update
application. Seed `5700084` is PR5C-covered plus strict oracle `\n` versus
`<br>` equivalence, so speculative PR18x is dropped unless a reduced uncovered
product bug appears. Reload hydration, pre-save search/live-collapse, rich-text
suffix, HTTP residuals, and post-save settlement residuals remain
deferred/diagnostic unless separately promoted. Broad fuzz, final-stack fuzz,
filing, duplicate `1020002`, duplicate PR6B/PR16 replay, and PR18x naming
remain blocked.

The paired feedback-action applied Cycle 210 by preserving the Cycle 208
replacement tail, marking both malformed-save deferred heads as evidence only,
keeping PR17 as follower-side Yjs update-application work, dropping `5700084`
from PR18x, and filling the previously empty feedback-action file. It launched a
manifest-refresh job that completed with 32 rows and `0` audit failures. It did
not launch duplicate PR6B/PR16 resolution because the Cycle 208 PR6B resolver
was still active, and it did not launch broad fuzz, final-stack fuzz, or
duplicate seed `1020002` work.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T00:05:08Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `6`. The latest live
current-output duplicate/startup sample is clean: current duplicate share is
`duplicateShareCurrent=0`, latest current summary startup failures are `0`, and
the latest monitor row has `1` quality issue and `1` warning, with `431.2G`
free memory and the headroom flag true. The copied novelty state scopes
current-run triage to `run-20260517T000714Z` and five enabled groups, but the
root has no current behavioral files or signatures. The live health read comes
from `duplicateShareCurrent` and current summary startup failures rather than
historical aggregate duplicate/noise.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only clean-live-status conclusion. The latest
duplicate/noise synthesis, `20260516T235736Z`, says the root cause is still a
control-plane/admission leak: current-run triage is empty because the active run
is stuck in infra startup, coverage-guided starts do not yet reliably start the
bounded live-analysis monitor with a current-output pointer, stale sessions can
outlive old current roots, and family caps are too local. The latest
feedback-action file is empty; the latest usable action evidence remains
`20260516T231459Z`, which applied the bounded shared gate/backoff patch, passed
syntax/gate checks, restarted relevant sessions, and then measured the current
root as empty because `wp-env start` was still failing before productive runs
began. The synthesis therefore recommends `wp-env`/MySQL recovery,
current-output-pointer-aware live analysis, fail-closed stale current-output
handling, stale session cleanup, and watcher/analysis family caps before Codex
launch.
Historical aggregate duplicate/noise remains context, while current-output-dir
duplicate share and summary startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a malformed-save restack that must include only `8340c5d794a` and
`008b7258fe4`, a separate seed `1020002` follower-side Yjs update-application
repair or proof-based reclassification, and rebuilt validation before
final-stack fuzz. The latest synthesis, `20260516T235827Z`, says
malformed-save should be PR6B after PR6A if clean or PR16 after PR15C if not;
`5700084` should be dropped from product PR consideration as PR5C-covered plus
strict oracle `\n` versus `<br>` equivalence; and reload hydration, pre-save
search/live-collapse, rich-text suffix, HTTP room isolation, and post-save
settlement residuals stay deferred unless separately promoted with clean source
evidence. Final-stack fuzz, filing, duplicate `1020002`, duplicate PR6B/PR16
replay, and PR18x naming remain blocked. The latest PR-split feedback-action
applied those constraints, marked both malformed-save deferred heads as evidence
only, completed a bounded 32-row manifest refresh with `0` audit failures, and
left PR6B conflict resolution active. It did not launch broad fuzz,
final-stack fuzz, duplicate PR6B/PR16 resolution, or duplicate `1020002` work.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `1,116` browser/e2e test
executions/hour, `163,744` unit-property test executions/hour, `21,504`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are `wp-env`/MySQL recovery,
duplicate/noise validation on the fresh root, artifact writability, a clean
malformed-save restack, and seed `1020002` WebSocket/Yjs follower-update
application evidence.
