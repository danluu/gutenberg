# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T23:17:31Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T23:05:11.885Z`,
  `lastUpdatedAt=2026-05-16T23:14:53.951Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1746` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T23:14:54Z`, coverage files grew from `272` to `36798`, a delta of
`36526`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `7` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and gauntlet block targets.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and startup-clean: `duplicateShareCurrent` is `0` and current summary
startup failures are `0`. The same sample has `1` quality issue, `1` warning,
`436.3G` free memory, and the monitor headroom flag is true. The copied
novelty state scopes current-run triage to one output-dir root,
`run-20260516T230503Z`, and five enabled groups:
`novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, `novelty-ws-real-user-editing`, and
`novelty-ws-real-user-rich-text`. It still reports no current-run behavioral
files or signatures.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a graph-only clean-live-status conclusion. The
latest duplicate/noise synthesis, `20260516T230450Z`, says the remaining problem
is a fuzzing control-plane leak: stale current roots, stale or bad live-analysis
current-output pointers, product-free startup/infra records, cooldown resets,
and over-specific family capping can still spend browser and Codex capacity on
known noise. The latest duplicate/noise feedback-action, `20260516T223603Z`, is
nonempty and applied a bounded guard pass across triage, analysis tiers, live
analysis, and novelty monitoring. Syntax checks and gate-only validation passed:
sampled noisy roots queued `0` strict startup and `0` no-product infra
signatures while preserving product-evidence queues, and current output had `0`
current triage signatures and `0` actionable signatures. `wp-env` was still
uninitialized because MySQL exited during compose startup, and
focused-shards/gap-booster live-analysis monitors still need restart if active.
The clean current-output duplicate/startup graph sample is therefore improvement
evidence, not closure.

The latest PR-split synthesis, `20260516T230411Z`, rejects a filing-ready or
final-validation interpretation. The `ready/rtc-*` PR01-PR15C prefix plus PR02A
remains useful, but it is only a known-fix prefix. PR16 is held pending seed
`950109` pass/drop localization. PR17 remains separate seed `1020002`
follower-side Yjs update-application repair or proof-based reclassification.
Strict-expansion seed `5700084` now has a nonempty focused result pointing at a
`core/verse` linebreak divergence, so the next comparison is against PR5C and
the ready prefix before any PR18x naming. The graph's `0` visible likely-real
failures is not filing approval.

The latest PR-split feedback-action, `20260516T225001Z`, is nonempty and
applied the Cycle 204 feedback. It refreshed the push manifest with `33` rows
(`29` ready refs and `4` deferred candidates), found `0` branch-audit failures,
verified the loop/prompt hard-progress invariants, and deliberately did not
duplicate the active `5700084` replay or launch `1020002`, PR16 publication,
rebuilt validation, final-stack fuzz, or filing.

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
are `0`. The sample has `1` quality issue and `1` warning, with `436.3G` free
memory and the monitor headroom flag true. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise feedback-action says the bounded control-plane fix
landed across the RTC fuzzer control plane: no-product startup and infra/setup
failures are gated out of actionable analysis, analysis tiers have stale-source
protection, duplicate/noise capping uses semantic family keys, and novelty
known-noise pauses are tied to the current run. Gate-only validation queued `0`
strict startup and `0` no-product infra signatures for sampled noisy roots while
preserving product-evidence queues. The latest synthesis still says the policy
must remain run-local, product-evidence-aware, and shared across producer,
triage, scheduler, and analysis consumers; it specifically warns against broad
suppression of failures with user actions, reload/save/revision/fault evidence,
operation witnesses, persistence/content/title divergence, or visible
likely-real status. Fresh browser coverage was still blocked because `wp-env`
was uninitialized and MySQL exited during compose startup; the refreshed current
root has no current behavioral files yet, and focused-shards/gap-booster
live-analysis monitors still need restart if active. Persona-loop feedback
therefore rejects treating the clean current duplicate/startup graph state as
proof that duplicate/noise leakage is fully fixed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T23:10:01Z` show sustained CPU
pressure with a late spike and then partial easing: the latest 25 samples range
from `32.8%` to `91.8%` utilization, with the latest sample at `52.4%`.
One-minute load exceeded the logical CPU count in `12` of those `25` sampled
windows, while the latest sampled 1/5/15-minute load is `47.6`, `39.4`, and
`37.8` against `64` logical CPUs. Raw memory remains ample, but the recent load
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
rejects that as closure because the latest duplicate/noise action only proves a
bounded guard pass: gate-only validation is clean and product-evidence queues
are preserved, but fresh browser coverage was blocked by `wp-env`/MySQL startup
and the refreshed current root still has no current behavioral files.
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
`run-20260516T230503Z`, is browser/e2e-only, with five enabled groups.

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

The latest collected execution data has about `2,269,654` completed test
executions: `90,278` browser/e2e, `3,006` transport/integration, `1,979,860`
unit-property, and `196,510` coverage-guided-lower-level. Some historical rows
include approximate lower-level counts reconstructed from batch metadata or
legacy batch-count fields. The latest 15-minute bucket reports about `272`
browser/e2e test executions/hour, `28,896` unit-property test executions/hour,
`4,864` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2854 | 84 | 0 | 2.9% |
| `revision-persistence` | 3816 | 118 | 0 | 3.1% |
| `parser-serialization` | 2558 | 100 | 0 | 3.9% |
| `real-user-editing` | 5582 | 346 | 0 | 6.2% |
| `parser-transform` | 3617 | 349 | 0 | 9.6% |
| `common-blocks` | 3464 | 351 | 0 | 10.1% |
| `long-session-large-doc` | 2247 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2656 | 435 | 0 | 16.4% |
| `block-gauntlet` | 5195 | 911 | 0 | 17.5% |
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
| action ui-heading-shortcut next coverage tier | 644 | 1000 |
| successful real-user-editing records next coverage tier | 346 | 500 |
| action ui-format-paragraph next coverage tier | 922 | 1000 |
| gauntlet block core/html next coverage tier | 478 | 500 |

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

With the live loop at `max_parallel=6`, `205`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T230411Z`, took `9.7` minutes. The event
log then shows a new review cycle, `20260516T231356Z`, starting.

The newest completed PR-split synthesis, `20260516T230411Z`, says the split
design still needs change and remains blocked for filing and final validation.
The current PR01-PR15C set plus PR02A is only a known-fix prefix. The consensus
tail is PR16 malformed-save pass/drop after seed `950109` diagnostics, separate
PR17 seed `1020002` WebSocket/Yjs follower-side update-application repair or
proof-based reclassification, strict-expansion source reduction before any PR18x
naming, rebuilt combined validation, focused seed gates, and only then
final-stack fuzz and filing.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Filing and final-stack fuzz remain blocked because
PR16's latest seed `950109` replay still failed and needs product-vs-infra
localization, PR17 still needs a repair branch or proof-based reclassification,
and seed `5700084` should be classified against PR5C and the ready prefix before
any late PR18 is named. The latest feedback-action, from cycle `204`, applied
the replacement tail to `current-pr-split.md`, refreshed the push manifest with
`33` rows (`29` ready refs and `4` deferred candidates), found `0` branch-audit
failures, and verified the loop/prompt hard-progress invariants. It
deliberately did not duplicate the active `5700084` replay, launch `1020002`,
publish PR16, name PR18A, rebuild validation, start final-stack fuzz, or file.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T23:05:25Z`, has `27`
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
the latest monitor row has `1` quality issue and `1` warning, with `436.3G`
free memory and the headroom flag true. The copied novelty state scopes
current-run triage to one output-dir root and five enabled groups, but the root
has no current behavioral files or signatures. The live health read comes from
`duplicateShareCurrent` and current summary startup failures rather than
historical aggregate duplicate/noise.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only clean-live-status conclusion. The latest
duplicate/noise synthesis, `20260516T230450Z`, says the root cause is still
fragmented duplicate/noise control across producer, triage, scheduler, and
analysis consumers: stale roots, bad current-output pointers, no-product or
provisional records, cooldown resets, and over-specific family capping can still
leak work. The latest feedback-action is nonempty and reports that strict
no-product startup gating, novelty current-run scope, stale-source analysis
protection, semantic-family caps, and run-local known-noise pauses were patched,
with gate-only validation preserving product-evidence signatures. It also says
`wp-env` was still uninitialized because MySQL exited during compose startup;
the refreshed current root is now active, but duplicate/noise validation is
still not closure while it has no current behavioral files and some live-analysis
monitors may still need restart.
Historical aggregate duplicate/noise remains context, while current-output-dir
duplicate share and summary startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has
moved from the PR01-PR15C 28-head list to a `ready/rtc-*` known-fix prefix with
PR02A, a conditional independent PR16 malformed-save candidate, a separate PR17
seed `1020002` WebSocket/Yjs follower-side update repair, and a
strict-expansion residual source-reduction gate before rebuilt validation and
final-stack fuzz. The latest completed synthesis, `20260516T230411Z`, says PR16
is still held pending corrected seed `950109` pass/drop localization; PR17
remains separate and must produce a follower-side Yjs update repair or
proof-based reclassification; and strict-expansion seed `5700084` should be
compared against PR5C and the ready prefix before PR18x is named. Final-stack
fuzz, filing, and extra broad fuzz remain blocked. The latest feedback-action
applied the Cycle 204 split guidance, refreshed a clean 33-row push manifest,
and verified loop hygiene, but did not publish PR16, name PR18A, launch broad
fuzz, rebuild validation, duplicate the active `5700084` replay, or duplicate
`1020002` work.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `272` browser/e2e test
executions/hour, `28,896` unit-property test executions/hour, `4,864`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are `wp-env`/MySQL recovery,
duplicate/noise validation on the fresh root, artifact writability, PR16 seed
`950109` malformed-save localization, strict-expansion seed `5700084`
PR5C/ready-prefix comparison, and seed `1020002` WebSocket/Yjs follower-update
application evidence.
