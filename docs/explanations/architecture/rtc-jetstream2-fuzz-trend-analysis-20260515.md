# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T01:23:18Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T01:17:01.366Z`,
  `lastUpdatedAt=2026-05-17T01:21:43.948Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1786` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T01:21:44Z`, coverage files grew from `272` to `37810`, a delta of
`37538`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise sample is not a startup
stall: `duplicateShareCurrent` is `1`, while current summary startup failures
are `0`. The same sample has `0` quality issues, `0` warnings, a true headroom
flag, and `430.2G` free memory. The copied novelty state is currently using
`supervisor-active-run-dirs` for `run-20260517T011652Z`; current triage has `5`
roots, `5` files, `1` raw signature, `1` actionable signature, no visible
likely-real failures, top duplicate family share `1`, and no health warnings.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest duplicate/noise synthesis, `20260517T010156Z`, says the
remaining duplicate/noise problem is primarily control-plane leakage: novelty
pause state, supervisor pause state, and analysis-family gating can diverge
across output-dir rollover and stale source states. The latest duplicate/noise
feedback-action is still `20260517T003444Z`; it applied active-supervisor
scoping, marked inactive generation source signatures stale, propagated
supervisor guards to live consumers, passed `node --check`, ran one
live-analysis reconciliation, and restarted novelty/live-analysis.

The latest PR-split synthesis, `20260517T005833Z`, rejects a filing-ready or
final-validation interpretation. It keeps the Cycle 214/216 topology: ready
PR01-PR06A, concrete PR6B
(`ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8e`) as a PR06A
sidecar, the existing PR07A-PR15C chain still based on PR06A, and a
validation-only PR6B+PR15C integration head before PR17 proof or
reclassification. It says the PR17 audit now has a nonempty report pointing away
from product-owned Yjs apply behavior, so waiting for active PR17 is stale as
the only action. The matching `20260517T005833Z` feedback-action applied the
Cycle 216 update and launched the bounded
`rtc-prsplit-cycle216-manifest-reload-20260517T010930Z` job, which wrote a
nonempty branch audit, push manifest, loop-gate verification, and reload replay
handoff. Final-stack fuzzing, filing, and rebuilt full-stack validation remain
blocked on PR17/seed `1020002` disposition.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=1`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `430.2G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state currently reports `currentRunDirSource` as
`supervisor-active-run-dirs` for `run-20260517T011652Z`: current triage has `5`
roots, `5` files, `1` raw current signature, `1` actionable signature, no
visible likely-real failures, top duplicate family share `1`, and no health
warnings. The live startup signal is clean, but the current duplicate/noise
signal is concentrated in one current assertion-family signature. The latest
duplicate/noise synthesis still rejects graph-only closure and broad expansion
until pause preservation, supervisor sync, and family-gating validation show no
strict startup jobs queued while preserving product-evidence representatives.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T01:20:03Z` show sustained CPU and
load pressure: the latest 25 CPU samples range from `32.8%` to `86.8%`
utilization, with the latest sample at `55.0%`. One-minute load exceeded the
logical CPU count in `6` of those `25` sampled windows, while the latest sampled
1/5/15-minute load is `46.78`, `45.17`, and `69.95` against `64` logical CPUs.
Raw memory remains ample and current monitor headroom is true, but the
15-minute load still remains above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has five enabled groups:
`novelty-ws-real-user-editing`, `novelty-ws-real-user-rich-text`,
`novelty-ws-lifecycle`, `novelty-http-persistence-probe`, and
`novelty-ws-persistence-no-title`, all under `run-20260517T011652Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context. The current-output state now has `1` actionable assertion-family
signature, top duplicate family share `1`, and no health warnings, while the
newest synthesis says novelty/supervisor pause state and analysis-family caps
still need bounded validation. Product-evidence timeout or non-convergence
failures must remain visible rather than being blanket-suppressed.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `30` browser/e2e lanes across `30` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `5` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion. The freshest coverage-guided root is
browser/e2e-only, with five enabled groups.

Live fuzzing is still concentrated in browser/e2e lanes, but lower-level work is
active in `unit-property` and `coverage-guided-lower-level`, including rich-text
offset-space and rich-text CRDT lanes. No active `transport-integration`,
`backend-api`, `protocol-server`, or standalone fuzz-only assertion lanes appear
in the latest level-mix snapshot.

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

The latest collected execution data has about `2,754,992` completed test
executions: `93,522` browser/e2e, `3,006` transport/integration, `2,392,832`
unit-property, and `265,632` coverage-guided-lower-level. The latest 15-minute
bucket reports about `428` browser/e2e test executions/hour, `110,768`
unit-property test executions/hour, `17,920` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2915 | 89 | 0 | 3.1% |
| `revision-persistence` | 3891 | 122 | 0 | 3.1% |
| `parser-serialization` | 2735 | 120 | 0 | 4.4% |
| `real-user-editing` | 5686 | 380 | 0 | 6.7% |
| `parser-transform` | 3700 | 357 | 0 | 9.6% |
| `common-blocks` | 3551 | 362 | 0 | 10.2% |
| `long-session-large-doc` | 2267 | 319 | 0 | 14.1% |
| `persistence-no-title` | 2714 | 443 | 0 | 16.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5493 | 986 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 246 | 500 |
| real-user body save/reload next coverage tier | 305 | 500 |
| action reload-post-action next coverage tier | 660 | 1000 |
| action ui-heading-shortcut next coverage tier | 674 | 1000 |
| successful real-user-editing records next coverage tier | 380 | 500 |
| action ui-format-paragraph next coverage tier | 956 | 1000 |

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

With the live loop at `max_parallel=6`, `216` completed review cycles took
roughly `2.9` to `11.4` minutes in this snapshot; the latest completed review,
`20260517T005833Z`, took `8.3` minutes. The event log shows review cycle
`20260517T005833Z` starting at `2026-05-17T00:58:33Z`, finishing at
`2026-05-17T01:06:53Z`, and feedback action for cycle `216` starting at the
same timestamp. The collected `20260517T005833Z-feedback-action.md` file is
nonempty and says Cycle 216 feedback was applied.

The newest PR-split synthesis, `20260517T005833Z`, says the split remains
blocked for filing and final-stack fuzz. It keeps Cycle 214/216 topology and
rejects the stale linear `PR6B -> PR07A -> ... -> PR15C` tail and stale
PR16/candidate malformed-save branches. The current known-fix prefix is ready
PR01-PR06A,
followed by concrete PR6B, `ready/rtc-pr06b-malformed-save-request-payload` at
`87e0ed20ab8e`, as an explicit PR06A sidecar. The existing PR07A-PR15C chain
should remain based on PR06A after the PR07A-over-PR6B conflict, and
`validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at `0662b838...`
is validation proof only, not a product PR.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. PR17/seed `1020002` remains the final gate before
rebuilt combined validation, focused final gate, final fuzz, and filing. The
latest audit report is now nonempty and points away from product-owned Yjs apply
behavior, so waiting for active PR17 is stale as the only action; the next
decision is whether to reclassify from that evidence or run one focused
browser/provider ownership diagnostic. The synthesis also calls for one bounded
manifest/import refresh and reload-hydration replay job, while broad fuzz,
final-stack fuzz, extra browser lanes, and open-ended coverage jobs remain
blocked.

The matching PR-split feedback-action, `20260517T005833Z`, applied Cycle 216 by
recording the PR6B sidecar topology, keeping PR17/seed `1020002` as separate
proof/reclassification work, tightening the progress gate for `report.tmp`
placeholders, and launching
`rtc-prsplit-cycle216-manifest-reload-20260517T010930Z`. That bounded job wrote
a nonempty branch audit, push manifest, loop-gate verification, and reload
replay handoff. No broad final-stack fuzz, filing, or rebuilt combined
validation was launched.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T01:09:54Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `6`. The live startup
read is clean, but the current duplicate/noise read is concentrated: the latest
plotted current-output-dir sample has `duplicateShareCurrent=1`, current summary
startup failures of `0`, `0` quality issues, `0` warnings, true headroom, and
`430.2G` free memory. The copied novelty state shows `5` current roots, `5`
current files, `1` raw current signature, `1` current actionable signature, no
visible likely-real failures, top duplicate family share `1`, and no health
warnings. Historical aggregate duplicate/noise remains context; the live graph
status comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest duplicate/noise synthesis says the remaining issue is control-plane
leakage across novelty output-dir rollover, supervisor pause sync, stale
source/actionability checks, and duplicate-family caps. The latest feedback
action applied active-supervisor current-run scoping, inactive triage-source
cleanup, and live-consumer guards; the newer synthesis still calls for bounded
pause-preservation, supervisor-sync, and family-gating fixes before broad
expansion. The refreshed graph says startup noise is not the immediate live
blocker, but it does not support graph-only duplicate/noise closure; the persona
loop still rejects broad suppression of product-evidence timeout or
non-convergence failures.

The PR-split persona loop rejects a filing-ready read. The split shape is ready
PR01-PR06A, concrete PR6B at `87e0ed20ab8e` as a PR06A sidecar, the existing
PR07A-PR15C chain still based on PR06A after the PR07A-over-PR6B conflict,
explicit integration validation proving both PR6B and PR15C ancestry, and
separate PR17/seed `1020002` proof, reclassification, or repair before rebuilt
final validation. The latest synthesis rejects the older linear-restack and
normal-PR16 reads, notes that PR6B+PR15C ancestry evidence exists at
`0662b838...`, and says the nonempty PR17 audit points away from product-owned
Yjs apply behavior. Final-stack fuzz, filing, rebuilt combined validation,
duplicate PR6B/PR16 work, broad fuzz, and extra browser lanes remain blocked;
the latest feedback-action completed the bounded manifest/import refresh plus
reload-hydration replay handoff. The remaining decision is whether the PR17
audit is enough for reclassification or whether one focused PR17 browser/provider
ownership diagnostic is still needed.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `428` browser/e2e test
executions/hour, `110,768` unit-property test executions/hour, `17,920`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are continued validation that
current startup noise stays suppressed under active supervisor scoping,
completion of the duplicate/noise control-plane fixes from the newest synthesis,
and a decision on seed `1020002` reclassification versus focused
browser/provider diagnostics.
