# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T09:39:00Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T09:23:15.864Z`,
  `lastUpdatedAt=2026-05-17T09:38:26.357Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1922` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T09:38:26Z`, coverage files grew from `272` to `42505`, a delta of
`42233`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is not
clean on live duplicate/noise: `duplicateShareCurrent` is `0.5`, while current
summary startup failures are `0`. The same monitor pass has `0` quality issues,
`0` warnings, a true headroom flag, and `443.5G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context. The latest
historical aggregate duplicate share is `0.3535`, but it is not used as the
plotted live health signal.

Persona-loop evidence rejects a graph-only closure read. The latest
duplicate/noise synthesis, `20260517T091228Z`, says the leak was control-plane
source truth rather than product code: runner-classified
`pre-action-bootstrap-stall` attempts could gain retry coverage with
users/actions, triage then treated them as product evidence, paused
`no-analysis` dirs were missing from current-run accounting, and source-fragile
family selection could relabel late product-evidence stalls. The matching
feedback action applied source-gated startup suppression, active-plus-drain
accounting, and live-analysis drain-dir fixes. It reports current strict
startup noise is clean, but the live actionable duplicate share remains `0.5`
across product-evidence `timeout` / `unknown`, which it explicitly does not
suppress.

The newest PR-split synthesis, `20260517T092129Z`, rejects a filing-ready or
final-stack-fuzz interpretation. It keeps the Cycle 252 no-PR03B main spine,
with PR03B, PR06B, and PR07C as sidecars, and says the validation-only head is
still blocked by a PR06B merge conflict in
`packages/core-data/src/test/actions.js`. The prior feedback action moved PR03B
out of the main spine and launched the PR03B sidecar audit, runtime-unblock
replays, owner comparison, and PR07C conflict repair; final-stack fuzz, filing,
rebuilt combined validation, and seed `1020002` remain deferred.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
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
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `443.5G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state lists two enabled groups:
`novelty-ws-real-user-rich-text` and `novelty-http-persistence-probe`. The
latest duplicate/noise synthesis rejects broad suppression and the matching
feedback action applied source-authoritative strict startup handling. Current
strict startup noise is clean, but the remaining live duplicate share is
product-evidence `timeout` / `unknown`, so it stays analyzable rather than
being hidden as startup noise.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T09:30:00Z` show bursty CPU and severe
load pressure. The latest 25 CPU samples range from `30.1%` to `81.0%`
utilization, with the latest sample at `70.3%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `5` of those `25` sampled
windows, and at least one of the three load windows exceeded it in `16` of
`25`. The latest sampled 1/5/15-minute load is `29.00`, `143.96`, and `172.96`
against `64` logical CPUs. Raw memory remains ample, and the latest monitor
headroom flag is true.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-real-user-rich-text` and `novelty-http-persistence-probe`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0.5` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest synthesis/action made strict
runner/source startup classification authoritative only for no-product startup
noise, added active-plus-drain current-run accounting, and kept product-evidence
plus visible `likely_real` signatures analyzable.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `27` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes, with
counted lower-level activity in `unit-property` and one
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T092744Z`, rejects treating the plotted focused capacity as fully
materialized live work: it says audited browser/e2e is underweight against the
lane floor, focused shards need repair first, and no additional lower-level
capacity should be added now. It keeps `unit-property` capped at one, keeps the
query-array CRDT lower-level lane at one, and counts `fuzz-assertion` and
`backend-api` as zero until audited wiring exists.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; live plotted capacity is still concentrated in
browser/e2e lanes. `transport-integration` has historical activity but no
current counted rate. The native-harness persona loop labels the lower-level
work honestly as Node/Jest plus V8 coverage rather than AFL/libFuzzer. The
latest native-harness synthesis, `20260517T092531Z`, still picks rich-text CRDT
merge as the first ready isolated lower-level target and keeps parser/serializer
as the second profile; the latest native action validated root/lane events for
the rich-text CRDT harness but did not override the production hold. The latest
protocol-server synthesis, `20260517T093000Z`, keeps HTTP polling REST as the
first protocol target, and the `20260517T091535Z` action says a bounded smoke
emitted root and lane `events.ndjson` with `fuzzLevel: "protocol-server"`. The
refreshed execution graph still has `0` counted `protocol-server` executions,
so this is an accounting or production pickup gap rather than evidence the
harness plan is absent. `backend-api` remains blocked/`0`, and standalone
`fuzz-assertion` remains live but unaudited in persona-loop feedback and still
not a clean counted lane in these graphs. The latest nonempty fuzz-only
assertion apply, `20260517T081354Z`, added browser sync-manager and HTTP
polling diagnostics and restarted affected browser loops; that is
browser-facing assertion hardening, not a separate counted `fuzz-assertion` lane
here.

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

The latest collected execution data has about `4,679,152` completed test
executions: `100,751` browser/e2e, `3,006` transport/integration, `4,147,060`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T09:30:00Z`, reports about `44` browser/e2e test
executions/hour, `154,112` unit-property executions/hour, and `0` for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone fuzz-assertion. `backend-api`,
`protocol-server`, and standalone
`fuzz-assertion` levels remain at `0` cumulative executions in this counter.
The summary still flags approximate execution rows somewhere in the history, so
lower-level totals reconstructed from batch metadata or legacy batch-count
fields should be read as approximate.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

This graph has been relabeled because it is not a total bug-finding graph. It
counts only non-duplicate `.triage-watcher/**/result.json` rows classified
`likely_real` per 100 runner-hours, deduped by canonical bug key and attributed
to the failure first-seen time. The compute proxy is summed runner wall-clock
`durationMs` from lane `events.ndjson`, reported as runner-hours. This is best
interpreted as per-runner triage-output efficiency, not per-core efficiency and
not all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates:
`468` unique likely-real outputs over about `1,754.8` runner-hours, or `26.67`
likely-real outputs per 100 runner-hours. `transport-integration`,
`unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` still have `0` triaged
likely-real outputs in the collected triage rows. That does not prove the
lower-level lanes are unproductive; it means their findings have not yet flowed
through the same non-duplicate likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The two unique bug-output candidate plots are the broader effectiveness view.
They dedupe by canonical output key and include non-infra likely-real/uncertain
triage rows, untriaged raw browser or transport failure signatures, and
lower-level assertion failures. Obvious infra, harness, and no-product-output
classifications are excluded from the candidate count. This is intentionally
broader than confirmed bugs and narrower than raw failed attempts; untriaged
candidates are not confirmed bugs and still need follow-up before being treated
as maintainer-ready bugs.

Current unique bug-output candidate rates are: browser/e2e `4,747` candidates
over `1,754.8` runner-hours (`270.52` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `17.7` runner-hours
(`11.30` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within-level candidate output is still dominated by browser/e2e raw signatures,
with transport/integration also producing a visible raw-signature stream. The
lower-level lanes now show nonzero assertion-output candidates, but the counts
are small because those lanes are much newer and still lack the same mature
promotion path into `.triage-watcher` likely-real results.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `4,613.0` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `649.9` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, cumulative likely-real triage output now spans multiple
profiles, led by session lifecycle, three-user late join, and
permissions/auth/locks. The broader unique-output candidate view is led by
three-user late join, session lifecycle, and real-user editing, with
coverage-guided lower-level and unit/property each showing small nonzero
candidate totals. Lower-level and transport lanes should continue to be judged
partly by the unique-output candidate graphs until their triage pipeline is
producing comparable likely-real and non-duplicate results.

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
| `multi-reload-lifecycle` | 3170 | 102 | 0 | 3.2% |
| `revision-persistence` | 4320 | 154 | 0 | 3.6% |
| `parser-serialization` | 3099 | 148 | 0 | 4.8% |
| `real-user-editing` | 6295 | 448 | 0 | 7.1% |
| `parser-transform` | 4051 | 398 | 0 | 9.8% |
| `common-blocks` | 3852 | 381 | 0 | 9.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5972 | 1078 | 0 | 18.1% |
| `long-session-large-doc` | 2499 | 453 | 0 | 18.1% |
| `persistence-no-title` | 3037 | 671 | 1 | 22.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 318 | 500 |
| real-user body save/reload next coverage tier | 377 | 500 |
| action ui-heading-shortcut next coverage tier | 785 | 1000 |
| action reload-post-action next coverage tier | 799 | 1000 |
| successful real-user-editing records next coverage tier | 448 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
and completed-record depth for real-user editing.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, action-pair, real-user,
history, operation-ledger, payload-size, block-depth, and other
observations. Raw volume is still heavy in history, operation-ledger, invariant,
and action-pair observations. That is the right shape for RTC data-loss work
because the harness observes both semantic state transitions and low-level
block/action combinations. The plot separates breadth (`keys`) from repeated
observations (`total_count`) so broad coverage is not hidden inside raw event
volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

With the live loop at `max_parallel=6`, the last 20 completed review cycles
took roughly `6.7` to `14.3` minutes in this snapshot; the latest completed
review, `20260517T092129Z`, took `10.0` minutes. The newest completed window
shows review cycle `20260517T075636Z` running from `2026-05-17T07:56:36Z` to
`2026-05-17T08:03:52Z`, review cycle `20260517T081558Z` running from
`2026-05-17T08:15:58Z` to `2026-05-17T08:24:48Z`, review cycle
`20260517T082453Z` running from `2026-05-17T08:24:53Z` to
`2026-05-17T08:39:12Z`, review cycle `20260517T084549Z` running from
`2026-05-17T08:45:49Z` to `2026-05-17T08:53:34Z`, and review cycle
`20260517T085339Z` running from `2026-05-17T08:53:39Z` to
`2026-05-17T09:02:33Z`; the newest cycle `20260517T092129Z` ran from
`2026-05-17T09:21:29Z` to `2026-05-17T09:31:31Z`.

The newest PR-split synthesis, `20260517T092129Z`, says the split still needs
validation repair before filing or broad validation. It keeps PR03B out of the
main spine, with PR03B, PR06B, and PR07C as sidecars, and says the
validation-only head is blocked by a PR06B merge conflict in
`packages/core-data/src/test/actions.js`. It also keeps `9f4dcc759070`
classified as sync undo/history-owned rather than PR05B/PR05C or PR18x.
Final-stack fuzz, filing, rebuilt combined validation, and seed `1020002`
remain deferred until the no-PR03B sidecar topology, PR06B validation conflict,
PR07C sidecar repair, and runtime replay gates are resolved.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T09:32:12Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `5`. Live duplicate and
startup status is mixed on the required current-output-dir metrics: the latest
plotted sample has `duplicateShareCurrent=0.5` and current summary startup
failures of `0`. The same sample has `0` quality issues, `0` warnings, a true
headroom flag, and `443.5G` free memory. The copied novelty state has two
enabled coverage-guided browser groups: `novelty-ws-real-user-rich-text` and
`novelty-http-persistence-probe`.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
Its latest synthesis framed the leak as control-plane source truth, and the
matching feedback action applied strict source-gated startup suppression,
active-plus-drain accounting, and live-analysis drain fixes. The post-action
status says strict startup noise is currently clean, but the remaining
`duplicateShareCurrent=0.5` is product-evidence `timeout` / `unknown`, so it
must remain visible until analysis classifies it.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T092129Z`, keeps the no-PR03B main
spine and treats PR03B, PR06B, and PR07C as sidecars. It says PR07C sidecar
repair has produced a nonempty report, but the validation-only head is still
blocked by a PR06B merge conflict in
`packages/core-data/src/test/actions.js`; final-stack fuzz and filing remain
deferred behind sidecar repair, PR03B runtime replay, rebuilt combined
validation, and seed `1020002` only if the rebuilt stack still needs it.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e, with
unit-property and coverage-guided-lower-level active as lower-level targets.
The latest level-mix synthesis contradicts a simple "27 browser lanes are live"
read: it says focused browser/e2e is under-materialized and should be recovered,
while no new lower-level capacity should be added. Backend/API remains inactive,
transport-integration has historical but no current counted rate, and standalone
fuzz-assertion is not a clean graph lane until audited status/events wiring
exists. The latest native-harness synthesis keeps rich-text CRDT merge as the
first ready lower-level target; the latest protocol-server synthesis/action says
the HTTP polling REST harness passed a bounded smoke and emitted root/lane
events, but the refreshed execution graph still has `0` counted
`protocol-server`, `backend-api`, and standalone `fuzz-assertion` executions.
The latest execution bucket has about `44` browser/e2e test executions/hour,
`154,112` unit-property executions/hour, and
`0` for transport, coverage-guided lower-level, protocol-server, backend/API,
and standalone fuzz-assertion. The next narrow operational checks are allowing
product-evidence duplicate analysis to drain, recovering focused browser/e2e
materialization, keeping level-mix accounting fail-closed, resolving protocol
execution continuity, and completing the PR split sidecar/runtime gates before
any final-stack fuzz or filing claim.
