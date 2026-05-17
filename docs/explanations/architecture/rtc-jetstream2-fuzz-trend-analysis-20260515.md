# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T19:56:07Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T19:53:10Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2093` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T19:53:10Z`, coverage
files grew from `272` to `47370`, a delta of `47098`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The live duplicate/noise gate is no longer clean. The latest current-output-dir
sample has `duplicateShareCurrent=1` and current summary startup failures of
`0`; the same pass has `0` quality issues, `0` warnings, `412.4G` free memory,
and a false monitor headroom flag. This report uses current-output-dir
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3455` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T193222Z`, rejects treating the graph sample
as green. It says strict no-product startup noise is mostly fixed, but
product-evidence duplicate families remain actionable because current-output
family-cap state is not materialized before the analysis tier. The matching
feedback-action file is empty, so this remains unresolved feedback. The refreshed
graph now agrees with that rejection on the live current-output duplicate gate:
startup failures are still `0`, but `duplicateShareCurrent=1`.

The PR-split persona loop also rejects a filing-ready interpretation. The
latest synthesis, `20260517T194638Z`, keeps the explicit
`finalized/cycle293/*` topology but says the stack is blocked, not fileable, and
not ready for final-stack fuzzing. The newest feedback-action remains
`20260517T191553Z`: it launched one bounded PR07 runtime-readiness replay and
patched the review-loop actionable-work gate. The later synthesis says that
Cycle296 PR07 output is setup evidence only because every PR07B0/PR07B1/PR07C
row was `runtime-readiness-blocked` with `collaborationEnabled=null`.

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

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=1`, current summary startup
failures `0`, quality issues `0`, warnings `0`, free memory `412.4G`, and
headroom false. The health graph does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-real-user-rich-text` as
the enabled group. The duplicate/noise persona-loop feedback rejects broad
product-evidence suppression and rejects a fully green graph-only read. It says
consumer-path caps improved enough that strict startup noise is no longer the
primary leak, but family-cap housekeeping and producer pause/rotation still need
work without hiding product-evidence signatures. The refreshed graph now
supports that rejection: startup noise is still clean, but the current-output
duplicate share is saturated.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T19:50:00Z` show bursty CPU and
intermittent load pressure. The latest 25 CPU samples range from `39.9%` to
`79.0%` utilization, with the latest sample at `68.2%`. Over those same 25
samples, one-minute, five-minute, and 15-minute load all exceeded the `64`
logical CPU count in `3` windows, and at least one load window exceeded it in
`12`. The newest 1/5/15-minute load sample is `65.58`, `57.15`, and `51.79`, so
the latest one-minute load point is just above the logical CPU count while the
five- and 15-minute load points are below it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-real-user-rich-text`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted mix shows `30`
browser/e2e lanes across `26` groups, plus `1` `unit-property` lane and `1`
`coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone fuzz-only assertion work remain
`0` in the committed graph counters.

The latest level-mix synthesis, `20260517T192940Z`, rejects adding more
lower-level allocation this cycle and says the immediate action is browser/e2e
materialization repair. It keeps the trusted mix at a `24` browser/e2e lane
floor, `2` coverage-guided lower-level lanes, `1` unit-property lane, and `0`
for protocol-server, backend-api, and standalone fuzz-assertion until audited
live events exist. It also rejects a graph/context-only `ok` read because
read-only checks found only `10/24` live browser PIDs across roots. A later
fuzz-only assertion action restarted focused, strict, and coverage-guided
browser loops, and the refreshed graph is browser-heavy again, but the graph is
still supervisor-lane evidence, not deduped live-PID proof. The matching
level-mix feedback-action file is empty, so this remains unresolved feedback.

The latest native harness synthesis and action, `20260517T140513Z`, keep rich
text CRDT merge as the first isolated lower-level target and label it as
V8/Node coverage-guided, not AFL/libFuzzer; the action says the harness and
bounded smoke validation passed. The latest protocol-server synthesis with
content, `20260517T193603Z`, selects the HTTP polling REST target around
`POST /wp-sync/v1/updates`; its matching action says the protocol/server harness
and two-seed smoke validation passed with `protocol-server` events. The latest
protocol synthesis file, `20260517T195025Z`, is empty, and the refreshed graph
still has `0` counted `protocol-server` executions, so that validation is not
yet visible as a live trend counter. The latest fuzz-only assertion apply file,
`20260517T184037Z`, says browser/core-data/sync assertion diagnostics were
added and affected browser loops restarted. That is active fuzz-only assertion
work, but the standalone `fuzz-assertion` execution counter remains `0` because
those diagnostics are running through browser/e2e lanes rather than a standalone
assertion harness.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit lane
events. Lower-level counts are approximate when reconstructed from batch
metadata or legacy batch-count fields.

The latest collected execution data has about `5,344,099` completed test
executions: `117,046` browser/e2e, `3,006` transport/integration, `4,795,712`
unit-property, and `428,335` coverage-guided-lower-level. The latest 15-minute
bucket reports about `4,480` browser/e2e test executions/hour, `7,296`
unit-property executions/hour, and `0` for transport/integration,
coverage-guided-lower-level, backend/API, protocol-server, and standalone
fuzz-assertion. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` cumulative executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `594` unique
likely-real findings over about `1,918.9` runner-hours, or `30.95` per 100
runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` triaged likely-real outputs in the collected
triage rows. That does not prove the lower-level lanes are unproductive; it
means their findings have not yet flowed through the same non-duplicate
likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The unique bug-output candidate graphs are broader. They dedupe non-infra
`likely_real` or `uncertain` triage rows, untriaged raw browser/transport failure
signatures, and lower-level assertion failures by canonical output key. These
graphs are intentionally broader than confirmed bugs and narrower than raw
failed attempts; untriaged candidates are not confirmed bugs.

Current unique bug-output candidate rates are: browser/e2e `5285` candidates
over `1,918.9` runner-hours (`275.41` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `24.4` runner-hours
(`16.40` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within browser/e2e, current cumulative likely-real triage output is led by
session lifecycle, permissions/auth/locks, real-user editing, and async/server
blocks. The broader unique-output candidate view is led by session lifecycle,
real-user editing, permissions/auth/locks, and async/server blocks, with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `4905.7` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2192.9` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Lower-level and transport lanes should continue to be judged partly by the
unique-output candidate graphs until their triage pipeline is producing
comparable likely-real and non-duplicate results.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 3298 | 111 | 0 | 3.4% |
| `revision-persistence` | 4594 | 169 | 0 | 3.7% |
| `parser-serialization` | 3347 | 176 | 0 | 5.3% |
| `real-user-editing` | 7170 | 576 | 1 | 8.0% |
| `parser-transform` | 4263 | 433 | 0 | 10.2% |
| `common-blocks` | 4145 | 446 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6287 | 1164 | 0 | 18.5% |
| `long-session-large-doc` | 2931 | 577 | 0 | 19.7% |
| `persistence-no-title` | 3278 | 855 | 0 | 26.1% |
| `session-lifecycle` | 8222 | 2471 | 0 | 30.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 494 | 1000 |
| action reload-post-action next 2000 tier | 1038 | 2000 |
| real-user body save/reload next 1000 tier | 553 | 1000 |
| successful real-user-editing records next 1000 tier | 576 | 1000 |
| action ui-format-paragraph next 2000 tier | 1553 | 2000 |
| real-user title save/reload next 500 tier | 494 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is led by code coverage, action pairs, real-user UI,
history, operation-ledger, payload-size, block-depth, invariant, block, action,
and transport observations. The plot separates breadth (`keys`) from repeated
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
took roughly `7.6` to `12.3` minutes in this snapshot. The newest completed
review, `20260517T194638Z`, took `8.5` minutes from
`2026-05-17T19:46:38Z` to `2026-05-17T19:55:09Z`. Its synthesis says the
Cycle293 explicit refs are still the accepted split shape, while filing and
final-stack fuzzing remain blocked by PR07 readiness and owner evidence. The
earlier feedback-action launched exactly one bounded PR07 runtime-readiness
replay and patched the review-loop actionable-work gate; the later synthesis
says that replay produced nonempty setup artifacts but no PR07 coverage because
all rows were `runtime-readiness-blocked`.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T19:48:11Z`, has `14`
suggested rows totaling `7626` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
`PR 6` (`732`), `PR 13C` (`294`), `PR 14` (`276`), and `PR 9` (`183`). These
charts remain size telemetry from parsed status snapshots, not filing authority
for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but the
latest live health gate is mixed. Startup failures are `0`, quality issues are
`0`, and warnings are `0`, but current-output duplicate share is `1` and the
headroom flag is false. Historical aggregate duplicate/noise is not the live
health signal.

The duplicate/noise persona loop rejects a fully green interpretation and also
rejects using historical aggregate duplicate/noise as the live gate. The latest
synthesis points to a live-analysis family-cap materialization gap first, then
producer pause/rotation for mixed product-evidence lanes while preserving
product-evidence signatures. The refreshed graph now agrees with the rejection
on duplicate/noise: it is clean for startup failures only, not for the
current-output duplicate signal, and it is not evidence that the duplicate/noise
control-plane leak is fixed.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
accepted direction is the Cycle293 explicit-ref topology, but the bounded PR07
runtime-readiness replay only produced setup-blocked evidence. Publication and
final validation still wait for PR07 collaboration-ready owner evidence.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence says the rich-text lower-level harness is
validated and the protocol-server harness now has a passing smoke action, but
protocol-server and standalone assertion outputs are not collector-visible as
live trend executions. The level-mix persona loop also rejects trusting the
supervisor lane graph as browser materialization proof until deduped live PIDs
meet the browser floor. The next narrow checks are live-analysis family-cap
housekeeping, producer pause/rotation, load/headroom, browser live-PID
accounting, protocol counts becoming collector-visible, and PR07 replay evidence
before any filing or final-stack claim.
