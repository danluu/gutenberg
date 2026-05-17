# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T18:00:58Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T17:59:13Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2061` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T17:59:13Z`, coverage files grew from `272` to `47000`, a delta of
`46728`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample is not fully clean
on the live duplicate/startup inputs: `duplicateShareCurrent` is `0.6667`, while
current summary startup failures are `0`. The same monitor pass has `1` quality
issue, `1` warning, a true headroom flag, and `419.9G` free memory. This
report treats current-output-dir duplicate/noise and summary startup failure
metrics as live graph status; historical aggregate duplicate/noise is only
context. The latest historical aggregate duplicate share is `0.3462`, but it is
not used as the plotted live health signal.

Persona-loop evidence rejects treating product-evidence as a reason to reopen
startup-noise paused producers. The newest duplicate/noise synthesis,
`20260517T172447Z`, says strict no-product `pre_action_bootstrap_stall` is
mostly blocked by triage and analysis consumers, but the scheduler can still
bypass a `startup-noise` pause when broad group-level product evidence exists.
It asks for hard startup-noise cooldowns in browser scheduling and for
coverage-guidance hold checks to include paused `no-analysis` current state.
The matching `20260517T172447Z` feedback-action says the fuzzer-side scheduler
fix was implemented and validated: strict startup noise is held out of
triage/analysis/deep/live startup and coverage-guidance scheduling, while
product-evidence signatures remain visible. The refreshed graph is still not
fully green because `duplicateShareCurrent` remains high and the latest sample
has one quality issue and one warning; the applied action also notes that active
product-evidence signatures still have duplicate concentration.

The newest PR-split synthesis, `20260517T174423Z`, rejects filing-ready,
GitHub-push-ready, broad final-stack fuzzing, and stack-wide validation
interpretations. It keeps the replacement PR07 shape as
`PR07A -> PR07B0 -> PR07B1`, keeps `PR06B` and `PR07C` as sidecars after
`PR07B1`, and says the active PR07 replay still lacks durable classification
artifacts. The latest nonempty PR feedback-action remains
`20260517T172803Z`: it applied the Cycle 288 split state and launched one
bounded non-`1020002` PR07 live replay job. The newer synthesis says to consume
or replace that replay if artifacts do not appear, run a fresh post-deferred
manifest/audit refresh, and keep GitHub push, broad final-stack fuzzing,
stack-wide validation, raw PR07D promotion, and any new `1020002` job blocked.

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

The latest plotted current-output-dir sample has
`duplicateShareCurrent=0.6667` and current summary startup failures of `0`. It
also has `1` quality issue, `1` warning, `419.9G` free memory, and a true
monitor headroom flag. The plot uses `duplicateShareCurrent` and current summary
startup failures for the live health view; it does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` as the
enabled group. The latest duplicate/noise synthesis rejects broad product-evidence
bypass of startup-noise cooldowns: product evidence should remain visible for
analysis, but it should not re-open a producer paused for no-product pre-action
startup noise. The matching feedback-action says that scheduler path was patched
and validated, and that paused `no-analysis` current dirs are now kept in scope
for coverage-guidance holds. With the refreshed current duplicate share at
`0.6667`, startup failures at `0`, warnings at `1`, quality issues at `1`, and
headroom true, the live graph sample is not clean on current-output-dir
counters; the mixed read comes from the live duplicate-current metric, residual
product-evidence duplicate concentration, and recent load pressure.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T17:50:00Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `39.9%` to `78.1%` utilization, with the latest sample at
`68.4%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `2` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `12`. The newest 1/5/15-minute load sample is `59.95`, `53.21`,
and `48.11` against `64` logical CPUs, so all three current load windows are
below the core count despite recent bursts above it. Raw memory remains ample,
and the latest monitor headroom flag is true. Current duplicate share is
`0.6667`, current startup failures are `0`, and the latest monitor sample has
`1` warning and `1` quality issue.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-parser-serialization`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0.6667` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis called the remaining problem a
scheduler/control-plane bug: a `startup-noise` pause could be bypassed when
broad group-level product evidence existed. The matching feedback-action says
that path is now patched and validated, including paused `no-analysis` current
state in coverage-guidance holds. Startup failures are `0` and memory/headroom
are healthy, but the current duplicate metric is high and the latest monitor
sample has one warning and one quality issue. The mixed-health read comes from
current-output-dir metrics, residual product-evidence duplicate concentration,
and recent load pressure, not from historical aggregate duplicate/noise.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `26` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes.
Lower-level targets visible in the graph are `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain `0` in the
committed graph counters.

The newest level-mix synthesis, `20260517T173200Z`, rejects reading the graph as
a lower-level expansion signal. It says the mix should change through
browser/e2e materialization repair, not lower-level expansion: reported/effective
browser/e2e is about `1` live lane against the `24` floor. It says to restart
exact focused, strict, and gap browser supervisor/watchdog sessions against
existing current roots, keep `unit-property=1` and
`coverage-guided-lower-level=2` flat, and only add one audited
`protocol-server-http-polling` lane after browser stability is repaired. It
keeps `backend-api`, `protocol-server`, and standalone `fuzz-assertion` at `0`
until audited current-run-root, status, and event wiring are fresh. That rejects
a graph-only interpretation that the plotted `26` browser/e2e lanes mean live
materialization is already stable. The matching `20260517T173200Z`
feedback-action file is empty, so no newer applied action supersedes the
previous browser/e2e repair action. The collector-visible graph still shows one
`coverage-guided-lower-level` lane, not the persona target of two, so this
report treats lower-level expansion as not yet collector-visible. The latest
execution bucket has current rate only for browser/e2e and `unit-property`;
`coverage-guided-lower-level` has a plotted lane and historical cumulative
executions but `0` current counted executions.

The latest native synthesis, `20260517T140513Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The `20260517T134230Z`
native action validated direct and bounded tmux smoke event accounting. The
newest protocol-server synthesis, `20260517T174810Z`, again prioritizes the
HTTP polling REST protocol/server harness over WebSocket relay/provider fuzzing
and requires root/lane `events.ndjson` records for trend collectors. The latest
protocol action file, `20260517T174810Z`, is empty, so no newer applied action
supersedes the `20260517T172948Z` harness validation. The refreshed graph still
has `0` counted `protocol-server` executions. This report therefore treats the
protocol work as harness evidence while leaving live protocol-server trend
status at `0` until collector-visible counts appear. `backend-api` remains
blocked/`0`. The latest fuzz-only assertion apply file, `20260517T155726Z`,
added two gated assertions and restarted affected browser loops, but standalone
fuzz-only assertion work remains `0` in the graph because it lacks audited
current-run-root/status/events wiring.

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

The latest collected execution data has about `5,315,815` completed test
executions: `107,226` browser/e2e, `3,006` transport/integration, `4,777,248`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `8` browser/e2e test executions/hour, `128`
unit-property executions/hour, and `0` for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone fuzz-assertion. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` levels remain at `0`
cumulative executions in this counter.
The summary still flags approximate execution rows somewhere in the history, so
lower-level totals reconstructed from batch metadata or legacy batch-count
fields should be read as approximate.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only, not total bug-finding
graphs. They count only non-duplicate `.triage-watcher/**/result.json` rows
classified `likely_real` per 100 runner-hours, deduped by canonical bug key and
attributed to the failure first-seen time. The compute proxy is summed runner
wall-clock `durationMs` from lane `events.ndjson`, reported as runner-hours.
This is best interpreted as per-runner triage-output efficiency, not per-core
efficiency and not all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates:
`580` unique likely-real outputs over about `1,877.0` runner-hours, or `30.90`
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

Current unique bug-output candidate rates are: browser/e2e `5,215` candidates
over `1,877.0` runner-hours (`277.83` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `23.4` runner-hours
(`17.07` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,499.9` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,801.4` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, cumulative likely-real triage output now spans multiple
profiles, led by session lifecycle, three-user late join, permissions/auth/locks,
and real-user editing. The broader unique-output candidate view is led by
three-user late join, session lifecycle, real-user editing, and
revision persistence, with coverage-guided lower-level and unit/property each
showing small nonzero candidate totals. Lower-level and transport lanes should
continue to be judged partly by the unique-output candidate graphs until their
triage pipeline is producing comparable likely-real and non-duplicate results.

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
| `multi-reload-lifecycle` | 3294 | 111 | 0 | 3.4% |
| `revision-persistence` | 4548 | 168 | 0 | 3.7% |
| `parser-serialization` | 3312 | 171 | 2 | 5.2% |
| `real-user-editing` | 7007 | 561 | 0 | 8.0% |
| `parser-transform` | 4221 | 429 | 0 | 10.2% |
| `common-blocks` | 4120 | 446 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6252 | 1163 | 0 | 18.6% |
| `long-session-large-doc` | 2904 | 577 | 0 | 19.9% |
| `persistence-no-title` | 3273 | 853 | 0 | 26.1% |
| `session-lifecycle` | 8179 | 2469 | 0 | 30.2% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 475 | 1000 |
| action reload-post-action next 2000 tier | 1019 | 2000 |
| real-user body save/reload next 1000 tier | 534 | 1000 |
| successful real-user-editing records next 1000 tier | 561 | 1000 |
| action ui-format-paragraph next 2000 tier | 1484 | 2000 |
| real-user title save/reload next 500 tier | 475 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, action pairs, real-user UI,
history, operation-ledger, payload-size, block-depth, invariant, block, action,
and transport observations. Raw volume is still heavy in history,
operation-ledger, invariant, action-pair, block-depth, block, action, other, and
transport observations. That is the right shape for RTC data-loss work because
the harness observes both semantic state transitions and low-level block/action
combinations. The plot separates breadth (`keys`) from repeated observations
(`total_count`) so broad coverage is not hidden inside raw event volume.

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
took roughly `6.9` to `12.3` minutes in this snapshot; the latest completed
review, `20260517T174423Z`, took `7.8` minutes from
`2026-05-17T17:44:23Z` to `2026-05-17T17:52:09Z`. The newest completed window
also includes `20260517T171947Z` and `20260517T172803Z`, so the loop is still
turning while final publication remains blocked.

The newest PR-split synthesis, `20260517T174423Z`, says the split is still
blocked and is not filing-ready, GitHub-push-ready, final-stack-fuzz-ready, or
stack-wide validation-ready. It keeps the replacement PR07 shape as
`PR07A -> PR07B0 -> PR07B1`: `PR07B0` is saved-response persisted-CRDT
hydration, and `PR07B1` is stale base-record/title filtering. It keeps `PR06B`
and `PR07C` as sidecars after `PR07B1`, rejects raw deferred refs as filing
refs, and keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent unless fresh replay
proves non-coverage and ownership. It says the active PR07 replay still has no
durable `report.md` or classification artifacts, so "wait only" is not enough:
consume or replace that replay, run a fresh non-Docker manifest/audit refresh
newer than the latest deferred queue, and keep pre-save/rich-text diagnostics
moving independently. Broad final-stack fuzzing, GitHub push, another
`1020002` job, and raw reload-hydration promotion remain rejected. The latest
nonempty feedback-action, `20260517T172803Z`, applied the Cycle 288 split state
and launched one bounded non-`1020002` PR07 live replay job, but the newer
synthesis says that replay still needs durable output evidence.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T17:52:57Z`, has `14`
suggested rows totaling `7626` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
`PR 6` (`732`), `PR 13C` (`294`), `PR 14` (`276`), and `PR 9` (`183`). These
charts remain size telemetry from parsed status snapshots, not filing authority
for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `6`. The latest plotted
current-output-dir duplicate/startup sample is mixed on those live health
inputs: `duplicateShareCurrent` is `0.6667`, current summary startup failures
are `0`, the headroom flag is true, free memory is `419.9G`, and warnings and
quality issues are both `1`. The copied novelty state currently lists
`novelty-ws-parser-serialization`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects product-evidence bypass of startup-noise
cooldowns. The latest duplicate/noise synthesis, `20260517T172447Z`, says strict
no-product startup stalls are mostly blocked in consumers, but the novelty
scheduler can still reopen a producer paused for no-product pre-action startup
noise when broad group-level product evidence exists. It also asks for
coverage-guidance hold checks to include paused `no-analysis` current state.
The matching feedback-action says the fuzzer-side scheduler fix landed and was
validated, with strict startup noise held out of triage/analysis/deep/live
startup and coverage-guidance scheduling. The refreshed graph agrees that
current startup failures, memory, and headroom are healthy, but the live
duplicate-current metric is high and the latest sample has one warning and one
quality issue. The persona evidence plus recent load pressure still reject a
fully green health read.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T174423Z`, says the active split is the
replacement `PR07A -> PR07B0 -> PR07B1` shape, but filing is blocked by stale
manifest/publish evidence and missing fresh PR07 replay proof. It keeps `PR06B`
and `PR07C` as sidecars after `PR07B1`, rejects raw deferred refs as filing
refs, and keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent from current
evidence unless fresh replay proves non-coverage and ownership. It says the
active PR07 replay has no durable classification artifacts yet; before any
final-stack fuzzing, pushing, another `1020002` job, or filing claim, consume or
replace that replay and regenerate a fresh manifest/audit newer than the latest
deferred queue. The latest nonempty feedback-action applied the Cycle 288 split
state and launched the bounded replay, but the newer synthesis says output
evidence is still missing.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e (`26` plotted
lanes), with `unit-property` and one `coverage-guided-lower-level` lane active
as lower-level targets. The newest level-mix synthesis rejects adding
lower-level capacity now and says the immediate change is browser/e2e
materialization and telemetry repair. It says reported/effective browser/e2e is
about `1` live lane against the `24` floor, while `unit-property=1` and
`coverage-guided-lower-level=2` should stay flat. It leaves `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` at `0` until audited
current-run-root/status/events wiring is fresh, and says the first non-browser
add after browser stability should be one audited protocol-server HTTP polling
lane. It rejects a graph-only read that the plotted `26` browser/e2e lanes prove
stable live materialization.
The collector-visible graph still shows one coverage-guided lower-level lane,
not the persona target of two; treat graph mix as supervisor-history telemetry,
not live expansion authority. Live mix decisions still need audited current-root
PID/accounting evidence instead of graph counts alone.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest native action validated the
V8/Node rich-text CRDT lower-level harness. The latest protocol synthesis,
`20260517T174810Z`, keeps HTTP polling REST as the first protocol/server target;
the latest protocol action file is empty, so it does not supersede the prior
`20260517T172948Z` harness validation. The graph still counts `0`
protocol-server executions, so the harness evidence has not yet become
collector-visible trend data. The latest execution bucket has about `8`
browser/e2e test executions/hour, `128` unit-property executions/hour, and `0`
for transport, coverage-guided
lower-level, protocol-server, backend/API, and standalone fuzz-assertion. The
next narrow operational checks are scheduler policy under the mixed current
duplicate/startup sample, load, current-root browser materialization/accounting,
lower-level and protocol lanes appearing in execution/output graphs, and PR
split fresh validation/local filing gates before any final-stack fuzz or filing
claim.
