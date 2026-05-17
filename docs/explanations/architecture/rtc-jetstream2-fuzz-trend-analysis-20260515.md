# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T10:28:59Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T10:12:44.876Z`,
  `lastUpdatedAt=2026-05-17T10:27:03.763Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1935` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T10:27:03Z`, coverage files grew from `272` to `42870`, a delta of
`42598`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean on those two live metrics: `duplicateShareCurrent` is `0`, while current
summary startup failures are `0`. The same monitor pass has `0` quality issues,
`0` warnings, a true headroom flag, and `427.5G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context. The latest
historical aggregate duplicate share is `0.3536`, but it is not used as the
plotted live health signal.

Persona-loop evidence rejects a graph-only closure read, although the latest
duplicate/noise feedback action, `20260517T094826Z`, implemented a bounded
control-plane remediation. It kept same-output startup-noise pauses active,
active-only throttled product-evidence `timeout` / `unknown` analysis by
transport/family, limited propagation to named harness-only mechanisms, and
mirrored the gates in live/deep analysis while preserving product-evidence
visibility. The remaining risk is that ambiguous product-evidence
`timeout` / `unknown` signatures still need first analysis before they can be
safely capped.

The newest PR-split synthesis, `20260517T101629Z`, rejects a filing-ready or
final-stack-fuzz interpretation. It keeps PR03B out of the main spine, but says
the Cycle256 validation head is blocked because `packages/core-data/src/actions.js`
declares `getComparableBlockTree()` twice after PR06B is combined with
PR07B/PR07C. It keeps PR02A, PR03B, PR06B, and PR07C as sidecars, says a
deduped PR06B-on-PR07B sidecar should be tried next, and says dependency-backed
JS checks plus runtime replay remain blocked. The latest feedback action,
`20260517T095247Z`, recorded the Cycle256 review update, launched a
dependency/runtime-readiness validation job, and kept final-stack fuzz, filing,
rebuilt combined validation, and seed `1020002` deferred.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `427.5G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state lists two enabled groups:
`novelty-ws-real-user-rich-text` and `novelty-ws-real-user-editing`. The latest
duplicate/noise synthesis rejected broad suppression and the matching feedback
action implemented a narrow representative-analysis cap plus source-gated
startup handling. Product-evidence `timeout` / `unknown` signatures remain
visible and analyzable; ambiguous cases are serialized rather than broadly
suppressed.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T10:20:00Z` show bursty CPU and severe
load pressure. The latest 25 CPU samples range from `30.1%` to `81.0%`
utilization, with the latest sample at `74.7%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `4` of those `25` sampled
windows, and at least one of the three load windows exceeded it in `16` of
`25`. The latest sampled 1/5/15-minute load is `60.48`, `62.56`, and `58.85`
against `64` logical CPUs. Raw memory remains ample, and the latest monitor
headroom flag is true because the current health sample carries no
duplicate/share, startup, quality, or warning issue.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-real-user-rich-text` and `novelty-ws-real-user-editing`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest feedback action applied a
bounded control-plane fix for duplicate product-evidence timeout/unknown
analysis, but it explicitly avoids broad raw-timeout suppression and keeps
visible `likely_real` plus product-evidence signatures analyzable.

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
`20260517T101323Z`, rejects treating those `27` plotted browser/e2e lanes as
fully materialized live work. It says audited browser/e2e active lane count is
`23`, still one below the `24` lane floor, and recommends exactly one focused
late-join browser backfill rather than expanding lower-level capacity. The
latest feedback action repaired focused, strict-expansion, and gap-booster
control-plane materialization, kept `unit-property` capped at one, and improved
the existing query-array `coverage-guided-lower-level` target.

Live fuzzing is still concentrated in browser/e2e lanes. Lower-level targets
are active through `unit-property` and a plotted `coverage-guided-lower-level`
lane, but the latest execution bucket has current rate only for
`unit-property`. `transport-integration` has historical activity but no current
counted rate. The latest nonempty native-harness synthesis,
`20260517T101056Z`, chose rich-text CRDT merge as the first ready RTC-specific
lower-level target, and the `20260517T095644Z` action validated that Node/Jest
plus V8-coverage harness without stopping browser fuzzing. The latest
protocol-server action, `20260517T101554Z`, validated a bounded HTTP polling
REST harness and wrote protocol-server events, but the refreshed execution
graph still has `0` counted `protocol-server` executions because it is not yet
continuous/current-root trend capacity. `backend-api` remains blocked/`0`, and
standalone `fuzz-assertion` remains unaudited and not a clean counted lane until
it has audited run-root, status, and `events.ndjson` wiring.

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

The latest collected execution data has about `4,886,697` completed test
executions: `101,208` browser/e2e, `3,006` transport/integration, `4,354,148`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T10:15:00Z`, reports about `788` browser/e2e test
executions/hour, `207,088` unit-property executions/hour, and `0` for
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
`489` unique likely-real outputs over about `1,766.2` runner-hours, or `27.69`
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

Current unique bug-output candidate rates are: browser/e2e `4,801` candidates
over `1,766.2` runner-hours (`271.83` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `18.5` runner-hours
(`10.80` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,592.0` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `621.3` for unit/property.

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
| `multi-reload-lifecycle` | 3185 | 104 | 0 | 3.3% |
| `revision-persistence` | 4345 | 154 | 0 | 3.5% |
| `parser-serialization` | 3117 | 148 | 0 | 4.7% |
| `real-user-editing` | 6362 | 462 | 0 | 7.3% |
| `parser-transform` | 4075 | 402 | 0 | 9.9% |
| `common-blocks` | 3869 | 382 | 0 | 9.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5997 | 1083 | 0 | 18.1% |
| `long-session-large-doc` | 2522 | 469 | 0 | 18.6% |
| `persistence-no-title` | 3069 | 696 | 0 | 22.7% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 334 | 500 |
| real-user body save/reload next coverage tier | 393 | 500 |
| action ui-heading-shortcut next coverage tier | 805 | 1000 |
| action reload-post-action next coverage tier | 821 | 1000 |
| successful real-user-editing records next coverage tier | 462 | 500 |

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
took roughly `6.9` to `14.3` minutes in this snapshot; the latest completed
review, `20260517T101629Z`, took `10.8` minutes. The newest completed window
shows review cycle `20260517T092129Z` running from `2026-05-17T09:21:29Z` to
`2026-05-17T09:31:31Z`, review cycle `20260517T093136Z` running from
`2026-05-17T09:31:36Z` to `2026-05-17T09:39:28Z`, review cycle
`20260517T094515Z` running from `2026-05-17T09:45:15Z` to
`2026-05-17T09:52:42Z`, review cycle `20260517T095247Z` running from
`2026-05-17T09:52:47Z` to `2026-05-17T10:01:47Z`, and review cycle
`20260517T100930Z` running from `2026-05-17T10:09:30Z` to
`2026-05-17T10:16:24Z`, and review cycle `20260517T101629Z` running from
`2026-05-17T10:16:29Z` to `2026-05-17T10:27:16Z`.

The newest PR-split synthesis, `20260517T101629Z`, says the split is still
blocked, not fileable. It supports the Cycle252/254 no-PR03B main product spine
and PR03B/PR07C sidecars, but rejects the current validation-only PR06B
composition because it duplicates `getComparableBlockTree()` in
`packages/core-data/src/actions.js` after combining PR06B with PR07B/PR07C.
The next suggested graph action is a deduped PR06B-on-PR07B sidecar rebuild,
plus a manifest refresh after the newer `20260517T100637Z` reload-hydration
candidate. The latest feedback action, `20260517T095247Z`, recorded the
Cycle256 topology update and launched the dependency/runtime-readiness
validation job; dependency-backed checks and runtime readiness still block
final-stack fuzz and filing.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T10:22:26Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `5`. Live duplicate and
startup status is clean on the required current-output-dir metrics: the latest
plotted sample has `duplicateShareCurrent=0` and current summary startup
failures of `0`. The same sample has `0` quality issues, `0` warnings, a true
headroom flag, and `427.5G` free memory. The copied novelty state has two
enabled coverage-guided browser groups: `novelty-ws-real-user-rich-text` and
`novelty-ws-real-user-editing`.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
Its latest synthesis says strict no-product startup noise is mostly suppressed,
but product-evidence timeout/unknown/harness noise needed a narrow cap. The
latest feedback action implemented that bounded fuzzer control-plane fix and
reported clean active run dirs at the time of action, while preserving
product-evidence visibility. The refreshed current output dir is not
duplicate/startup heavy, but the persona feedback still rejects treating
ambiguous product-evidence timeout/unknown cases as broadly suppressible before
representative analysis.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T101629Z`, keeps the no-PR03B main
spine and treats PR03B and PR07C as sidecars, but it rejects the current PR06B
composition because the validation head duplicates `getComparableBlockTree()` in
`actions.js`. It recommends a deduped PR06B-on-PR07B validation rebuild and a
manifest refresh for the newer `20260517T100637Z` reload-hydration candidate.
The latest feedback action launched the Cycle256 dependency/runtime-readiness
job, and final-stack fuzz and filing remain deferred until validation/runtime
readiness is proven.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e, with
unit-property and coverage-guided-lower-level active as lower-level targets.
The latest level-mix synthesis contradicts a simple "27 browser lanes are live"
read, says audited browser/e2e active lane count is `23`, and recommends one
focused browser backfill rather than lower-level expansion. Backend/API remains
inactive, transport-integration has historical but no current counted rate, and
standalone fuzz-assertion is not a clean graph lane until audited status/events
wiring exists. Native-harness and protocol-server work now has bounded
validated harnesses, but the refreshed execution graph still has `0` counted
`protocol-server`, `backend-api`, and standalone `fuzz-assertion` executions.
The latest execution bucket has about `788` browser/e2e test executions/hour,
`207,088` unit-property executions/hour, and `0` for transport,
coverage-guided lower-level, protocol-server, backend/API, and standalone
fuzz-assertion. The next narrow operational checks are keeping product-evidence
duplicate caps from relaunching same-mechanism work, recovering the last
browser/e2e lane, keeping level-mix accounting fail-closed, resolving protocol
execution continuity, and completing the PR split sidecar/runtime gates before
any final-stack fuzz or filing claim.
