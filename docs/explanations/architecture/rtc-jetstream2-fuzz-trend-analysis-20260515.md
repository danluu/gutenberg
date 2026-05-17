# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T00:33:34Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T00:19:25.627Z`,
  `lastUpdatedAt=2026-05-17T00:31:52.758Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1772` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T00:31:52Z`, coverage files grew from `272` to `37256`, a delta of
`36984`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir health sample is live but not clean:
`duplicateShareCurrent` is `0.5`, current summary startup failures are `0`,
the headroom flag is false, and the sample has `1` quality issue, `1` warning,
and `419.7G` free memory. The copied novelty state scopes current-run triage to
`run-20260517T001915Z` plus supervisor active run dirs, with `5` current files,
`8` current signatures, `8` actionable signatures, `4` family-capped
non-actionable signatures, no visible likely-real failures, and a health warning
that current triage yield is duplicate/noise dominated at top family share
`0.5`. This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence rejects a graph-only closure conclusion. The latest
duplicate/noise synthesis, `20260516T235736Z`, says the dominant issue is still
control-plane leakage rather than a missing product fix. The matching
feedback-action hardened stale/missing current-output pointer handling, killed
stale child analysis sessions, restarted strict expansion with an explicit
current-root pointer, and started bounded coverage-guided live analysis. It also
reports `npm run wp-env status` still failing with `Environment not initialized`
and says launcher shell scripts were not durably updated in that pass. That
feedback reported zero current coverage signatures at action time, but the
refreshed graph state now shows `8` current signatures and
`duplicateShareCurrent=0.5`, so the action report is not closure proof.

The latest PR-split synthesis, `20260517T001709Z`, rejects a filing-ready or
final-validation interpretation. The stack needs ready PR01-PR06A, then concrete
PR6B (`ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8`), then
ready PR07A-PR15C with PR02A as a PR02 sidecar. Late PR16 is superseded unless
PR6B import, restack, or combined validation fails. PR17/seed `1020002` remains
a separate follower-side Yjs/WebSocketProvider apply proof or repair gate. The
latest feedback-action, `20260517T001709Z`, applied that consensus and launched
`rtc-prsplit-cycle212-pr06b-linear-20260517T002555Z`; broad final-stack fuzz,
filing, rebuilt combined validation, and duplicate `1020002` work remain
deferred.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0.5`
and current summary startup failures of `0`. It also has `1` quality issue,
`1` warning, `419.7G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state explains why this is still a live blocker: current
triage has `5` files, `8` actionable signatures, no visible likely-real
failures, `4` family-capped non-actionable signatures, and a duplicate/noise
health warning with top family share `0.5`. The latest duplicate/noise persona
feedback partly implements the safe control-plane work, but it explicitly leaves
`wp-env` unhealthy and launcher-level durable live-analysis wiring undone.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T00:30:00Z` show sustained CPU and
load pressure: the latest 25 CPU samples range from `32.8%` to `84.6%`
utilization, with the latest sample at `74.7%`. One-minute load exceeded the
logical CPU count in `8` of those `25` sampled windows, while the latest sampled
1/5/15-minute load is `73.06`, `69.52`, and `57.34` against `64` logical CPUs.
Raw memory remains ample, but current headroom is false and the live
duplicate/noise status is not closed.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-real-user-editing` and `novelty-ws-real-user-rich-text`. Current-run
dirs also include active lifecycle, real-user editing, and real-user rich-text
children under `run-20260517T001915Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0.5` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context. Product-evidence failures must remain visible while product-free
startup/infra noise is gated before expensive analysis.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `27` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion. The freshest coverage-guided root is
browser/e2e-only, with two enabled groups.

Live fuzzing is still concentrated in browser/e2e lanes, but lower-level work is
active in `unit-property` and `coverage-guided-lower-level`, including rich-text
offset-space and CRDT lower-level lanes. No active `transport-integration`,
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

The latest collected execution data has about `2,596,601` completed test
executions: `92,737` browser/e2e, `3,006` transport/integration, `2,261,596`
unit-property, and `239,262` coverage-guided-lower-level. The latest 15-minute
bucket reports about `220` browser/e2e test executions/hour, `19,264`
unit-property test executions/hour, `6,912` coverage-guided-lower-level test
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
| `revision-persistence` | 3859 | 120 | 0 | 3.1% |
| `parser-serialization` | 2665 | 111 | 0 | 4.2% |
| `real-user-editing` | 5630 | 349 | 0 | 6.2% |
| `parser-transform` | 3669 | 354 | 0 | 9.6% |
| `common-blocks` | 3513 | 358 | 0 | 10.2% |
| `long-session-large-doc` | 2250 | 319 | 0 | 14.2% |
| `persistence-no-title` | 2677 | 437 | 3 | 16.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5400 | 965 | 0 | 17.9% |

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
| action ui-format-paragraph next coverage tier | 933 | 1000 |

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

With the live loop at `max_parallel=6`, `212` completed review cycles took
roughly `2.9` to `11.4` minutes in this snapshot; the latest completed review,
`20260517T001709Z`, took `7.3` minutes. The event log shows feedback for cycle
`212` finishing at `2026-05-17T00:29:19Z`, then review cycle
`20260517T002924Z` starting.

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
WebSocketProvider apply proof or repair work. Seed `5700084` stays PR5C-covered
plus strict oracle newline-versus-`<br>` equivalence, so speculative PR18x stays
dropped unless a reduced uncovered product bug appears. Reload hydration,
pre-save search/live-collapse, rich-text suffix, and HTTP residuals remain
deferred/diagnostic unless separately promoted. Broad fuzz, final-stack fuzz,
filing, duplicate `1020002`, and duplicate PR6B/PR16 replay remain blocked.

The latest PR-split feedback-action, `20260517T001709Z`, applied Cycle 212 by
promoting concrete PR6B after PR06A, dropping default late PR16 except as a
fallback, keeping PR17 as proof/reclassification rather than a product PR, and
launching `rtc-prsplit-cycle212-pr06b-linear-20260517T002555Z`. That job was
active in the feedback report and must restack PR07A-PR15C over PR6B or write
explicit sidecar proof with branch graph, containment, adjacent range-diff,
diffstat/numstat, branch audit, and push manifest artifacts. No broad
final-stack fuzz, filing, rebuilt combined validation, or duplicate `1020002`
job was launched.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T00:25:55Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `6`. The live health
read is no longer a clean closure signal: the latest plotted current-output-dir
sample has `duplicateShareCurrent=0.5`, current summary startup failures of
`0`, `1` quality issue, `1` warning, false headroom, and `419.7G` free memory.
The copied novelty state shows `5` current files, `8` current actionable
signatures, `4` family-capped non-actionable signatures, and a duplicate/noise
health warning. Historical aggregate duplicate/noise remains context; the live
graph status comes from current-output-dir duplicate share and current summary
startup failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and a graph-only closure conclusion. The latest synthesis
says the root cause is still a control-plane/admission leak. The latest
feedback-action hardened fail-closed current-output pointer handling, removed
stale managed child sessions, restarted strict expansion with an explicit
current-root pointer, and started bounded coverage-guided live analysis. It
also reports `wp-env` as uninitialized and says launcher shell scripts were not
durably updated in that pass. The refreshed graph's `duplicateShareCurrent=0.5`
and current duplicate/noise warning reinforce that this is still live work.

The PR-split persona loop rejects a filing-ready read. The split shape is ready
PR01-PR06A, concrete PR6B at `87e0ed20ab8`, PR07A-PR15C with PR02A as sidecar,
and separate PR17/seed `1020002` proof or repair before rebuilt combined
validation. The latest feedback-action launched the PR6B linear restack and
manifest job, but final-stack fuzz, filing, rebuilt combined validation,
duplicate `1020002`, and duplicate PR6B/PR16 work remain blocked.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest execution bucket has about `220` browser/e2e test
executions/hour, `19,264` unit-property test executions/hour, `6,912`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are `wp-env`/MySQL recovery,
duplicate/noise validation on the fresh root, durable coverage live-analysis
launcher wiring, artifact writability, a clean malformed-save PR6B restack or
sidecar proof, and seed `1020002` WebSocket/Yjs follower-update evidence.
