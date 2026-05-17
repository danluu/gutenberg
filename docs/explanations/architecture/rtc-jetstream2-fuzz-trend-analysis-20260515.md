# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T00:26:11Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T00:19:25.627Z`,
  `lastUpdatedAt=2026-05-17T00:24:29.216Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1770` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T00:24:29Z`, coverage files grew from `272` to `37177`, a delta of
`36905`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `6` unmet goals. The remaining
goals are mostly real-user lifecycle/action depth and completed-record depth.

The latest plotted current-output-dir sample is below the 0.50 duplicate-share
gate and has no current summary startup failures: `duplicateShareCurrent` is `0`
and current summary startup failures are `0`. The same sample has `1` quality
issue, `1` warning, `426.5G` free memory, and the monitor headroom flag is true.
The copied novelty state scopes current-run triage to `run-20260517T001915Z`
plus supervisor active run dirs, and five enabled groups:
`novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, `novelty-ws-real-user-editing`, and
`novelty-ws-real-user-rich-text`. It reports `5` current-run files, no current
signatures, and one health warning: no behavioral coverage files were found
under the current novelty output dir.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a graph-only closure conclusion. The
latest duplicate/noise synthesis, `20260516T235736Z`, says the dominant issue is
still control-plane leakage rather than a missing product fix. The latest
duplicate/noise feedback-action file, `20260516T235736Z`, hardened the
live-analysis monitor to fail closed on missing or stale current-output
pointers, cleaned stale analysis sessions, restarted strict expansion with an
explicit current-root pointer, and started a bounded coverage-guided
live-analysis tmux loop. It also reports `npm run wp-env status` still failing
with `Environment not initialized`, and says the launcher shell scripts were not
made durable because they were outside that pass's edit whitelist. The
current-output duplicate/startup graph sample is therefore live status for the
current root, not closure; the refreshed graph row now has `5` current files, no
current signatures, no current summary startup failures, and one current-output
health warning.

The latest PR-split synthesis, `20260517T001709Z`, rejects a filing-ready or
final-validation interpretation. The ready PR01-PR06A heads should be followed
by concrete PR6B, `ready/rtc-pr06b-malformed-save-request-payload` at
`87e0ed20ab8`, then PR07A-PR15C with PR02A as a PR02 sidecar. Late PR16 is
superseded unless PR6B import, restack, or combined validation fails. PR17/seed
`1020002` remains separate follower-side Yjs/WebSocketProvider update-application
repair or proof reclassification, and it still blocks rebuilt combined
validation, focused `1020002` gating, final-stack fuzz, and filing. The graph's
`0` visible likely-real failures is not filing approval. The latest PR-split
feedback-action file, `20260517T001709Z`, is empty; the latest usable action
evidence remains `20260516T235827Z`, which applied Cycle 210, refreshed a
32-row manifest with `0` audit failures, and left broad fuzz, final-stack fuzz,
duplicate PR6B/PR16 work, and duplicate `1020002` work blocked while the active
PR6B resolver continued.

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
has no current summary startup failures: `duplicateShareCurrent=0` and current
summary startup failures are `0`. The sample has `1` quality issue and `1`
warning, with `426.5G` free memory and the monitor headroom flag true. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The latest duplicate/noise synthesis says the safe control-plane work is still
current-output-pointer-aware live analysis, fail-closed stale pointer handling,
stale session cleanup, and no broader `userCount > 0` product-evidence change
until targeted evidence settles that disagreement. The latest feedback-action
partly implements that pass: it hardened the live-analysis monitor, killed stale
child sessions, restarted strict expansion with an explicit current-root
pointer, and started bounded coverage-guided live analysis. It still reports
`wp-env` as uninitialized and says the coverage launcher scripts were not made
durable in that action pass. Persona-loop evidence therefore rejects treating
the low current duplicate-share and zero-summary-startup graph state as proof
that duplicate/noise leakage is fully fixed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T00:20:00Z` show sustained CPU
pressure with a late spike and then partial easing: the latest 25 samples range
from `32.8%` to `91.8%` utilization, with the latest sample at `62.6%`.
One-minute load exceeded the logical CPU count in `8` of those `25` sampled
windows, while the latest sampled 1/5/15-minute load is `70.7`, `56.1`, and
`46.0` against `64` logical CPUs. Raw memory remains ample, but the recent load
history still shows pressure; fresh `wp-env` recovery, current-output
duplicate/noise validation, durable coverage live-analysis launch wiring, and
PR-split repair decisions remain live blockers.

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
failures, so the plotted duplicate/startup live signal is clean. Persona-loop
evidence still rejects that as closure because the latest duplicate/noise
synthesis says control-plane admission remains the main risk, and the latest
feedback-action says `wp-env` is still uninitialized and launcher-level durable
coverage live-analysis wiring was not made in that pass. That feedback did
harden stale-pointer handling, clean stale child sessions, and start a bounded
coverage live-analysis tmux loop. The refreshed current root
`run-20260517T001915Z` has `5` current files, no current signatures, and one
current-output health warning about missing behavioral coverage files under the
novelty output dir.
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
`run-20260517T001915Z`, is browser/e2e-only, with five enabled groups.

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

The latest collected execution data has about `2,575,660` completed test
executions: `92,620` browser/e2e, `3,006` transport/integration, `2,244,740`
unit-property, and `235,294` coverage-guided-lower-level. Some historical rows
include approximate lower-level counts reconstructed from batch metadata or
legacy batch-count fields. The latest 15-minute bucket reports about `660`
browser/e2e test executions/hour, `158,928` unit-property test executions/hour,
`21,760` coverage-guided-lower-level test
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
| `multi-reload-lifecycle` | 2887 | 87 | 0 | 3.0% |
| `revision-persistence` | 3854 | 119 | 0 | 3.1% |
| `parser-serialization` | 2656 | 110 | 0 | 4.1% |
| `real-user-editing` | 5621 | 349 | 0 | 6.2% |
| `parser-transform` | 3665 | 353 | 0 | 9.6% |
| `common-blocks` | 3510 | 358 | 0 | 10.2% |
| `long-session-large-doc` | 2247 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2666 | 437 | 0 | 16.4% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5392 | 962 | 0 | 17.8% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 227 | 500 |
| real-user body save/reload next coverage tier | 286 | 500 |
| action reload-post-action next coverage tier | 619 | 1000 |
| action ui-heading-shortcut next coverage tier | 655 | 1000 |
| successful real-user-editing records next coverage tier | 349 | 500 |
| action ui-format-paragraph next coverage tier | 932 | 1000 |

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

With the live loop at `max_parallel=6`, `212`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260517T001709Z`, took `7.3` minutes. The event
log also shows feedback for cycle `210` finishing after `4.8` minutes, then
reviews `20260517T000906Z` and `20260517T001709Z`; feedback for cycle `212`
started but had no completed action in this snapshot.

The newest PR-split synthesis, `20260517T001709Z`, says the split design still
needs change and remains blocked for filing and final validation. The current
known-fix prefix is ready PR01-PR06A, followed by concrete PR6B,
`ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8`, then
PR07A-PR15C with PR02A as the PR02 sidecar. Review consensus prefers a linear
restack of PR07A-PR15C over PR6B for final validation; PR6B as a PR06A sidecar
needs explicit proof if that path is chosen. Late PR16 is superseded unless
PR6B import, restack, or combined validation fails.

The same synthesis rejects treating the graph's `0` visible likely-real
failures as filing approval. Seed `1020002` remains follower-side Yjs
WebSocketProvider update-application work or proof-based reclassification. Seed
`5700084` stays PR5C-covered plus strict oracle `\n` versus `<br>` equivalence,
so speculative PR18x stays dropped unless a reduced uncovered product bug
appears. Reload hydration, pre-save search/live-collapse, rich-text suffix, and
HTTP residuals remain deferred/diagnostic unless separately promoted. Broad
fuzz, final-stack fuzz, filing, duplicate `1020002`, and duplicate PR6B/PR16
replay remain blocked.

The latest PR-split feedback-action file, `20260517T001709Z`, is empty. The
latest usable feedback-action remains `20260516T235827Z`: it applied Cycle 210
by preserving the prior replacement tail, marking both malformed-save deferred
heads as evidence only, keeping PR17 as follower-side Yjs update-application
work, dropping `5700084` from PR18x, and filling the previously empty
feedback-action file. It launched a manifest-refresh job that completed with 32
rows and `0` audit failures. It did not launch duplicate PR6B/PR16 resolution
because the Cycle 208 PR6B resolver was still active, and it did not launch
broad fuzz, final-stack fuzz, or duplicate seed `1020002` work.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T00:18:42Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `6`. The latest live
current-output duplicate/startup sample is clean on the plotted live signal:
current duplicate share is `duplicateShareCurrent=0`, latest current summary
startup failures are `0`, and the latest monitor row has `1` quality issue and
`1` warning, with `426.5G` free memory and the headroom flag true. The copied
novelty state scopes current-run triage to `run-20260517T001915Z` plus active
supervisor roots and five enabled groups, with `5` current files, no current
signatures, and one current-output health warning about missing behavioral
coverage files. The live health read comes from `duplicateShareCurrent` and
current summary startup failures rather than historical aggregate
duplicate/noise.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only closure conclusion. The latest
duplicate/noise synthesis, `20260516T235736Z`, says the root cause is still a
control-plane/admission leak. The latest duplicate/noise feedback-action,
`20260516T235736Z`, hardened the live-analysis monitor to fail closed on missing
or stale current-output pointers, removed stale managed child sessions,
restarted strict expansion with an explicit current-root pointer, and started
bounded coverage-guided live analysis. It still reports `wp-env` as
uninitialized and says the coverage launcher scripts were not durably updated in
that pass. The synthesis therefore still recommends `wp-env`/MySQL recovery,
durable current-output-pointer-aware live analysis, fail-closed stale
current-output handling, stale session cleanup, and watcher/analysis family caps
before Codex launch.
Historical aggregate duplicate/noise remains context, while current-output-dir
duplicate share and summary startup failures are the live graph status.

The PR-split persona loop rejects a filing-ready read. The split shape has moved
from the PR01-PR15C 28-head list to a ready PR01-PR06A prefix, concrete PR6B
malformed-save branch at `87e0ed20ab8` immediately after PR6A, PR07A-PR15C with
PR02A as a sidecar, a separate seed `1020002` follower-side Yjs
update-application repair or proof-based reclassification, and rebuilt
validation before final-stack fuzz. The latest synthesis, `20260517T001709Z`,
says late PR16 is superseded unless PR6B import, restack, or combined validation
fails; `5700084` remains PR5C-covered plus strict oracle `\n` versus `<br>`
equivalence; and reload hydration, pre-save search/live-collapse, rich-text
suffix, HTTP residuals, and post-save settlement residuals stay deferred unless
separately promoted with clean source evidence. Final-stack fuzz, filing,
duplicate `1020002`, and duplicate PR6B/PR16 replay remain blocked. The latest
PR-split feedback-action file, `20260517T001709Z`, is empty; the latest usable
feedback-action, `20260516T235827Z`, applied Cycle 210, marked both
malformed-save deferred heads as evidence only, completed a bounded 32-row
manifest refresh with `0` audit failures, and left PR6B conflict resolution
active. It did not launch broad fuzz, final-stack fuzz, duplicate PR6B/PR16
resolution, or duplicate `1020002` work.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `660` browser/e2e test
executions/hour, `158,928` unit-property test executions/hour, `21,760`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are `wp-env`/MySQL recovery,
duplicate/noise validation on the fresh root, durable coverage live-analysis
launcher wiring, artifact writability, a clean malformed-save PR6B restack or
sidecar proof, and seed `1020002` WebSocket/Yjs follower-update application
evidence.
