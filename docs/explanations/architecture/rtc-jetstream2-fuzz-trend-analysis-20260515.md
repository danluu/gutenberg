# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T18:10:19Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T18:06:18Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2063` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T18:06:18Z`, coverage files grew from `272` to `47006`, a delta of
`46734`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample is not fully clean
on the live duplicate/startup inputs: `duplicateShareCurrent` is `0.7000`, while
current summary startup failures are `0`. The same monitor pass has `2` quality
issues, `1` warning, a false headroom flag, and `411.0G` free memory. This
report treats current-output-dir duplicate/noise and summary startup failure
metrics as live graph status; historical aggregate duplicate/noise is only
context. The latest historical aggregate duplicate share is `0.3462`, but it is
not used as the plotted live health signal.

Persona-loop evidence rejects a fully green duplicate/noise interpretation. The
newest duplicate/noise synthesis, `20260517T175133Z`, says strict no-product
`pre_action_bootstrap_stall` is mostly suppressed before expensive analysis, but
the gate is still red because drain/no-analysis state can still leak into active
policy input and the active parser-serialization lane is producing
product-evidence harness noise around `fuzz_helper_rest_endpoint_construction`.
The latest feedback-action, `20260517T172447Z`, validated the earlier
startup-noise scheduler fix, but the newer synthesis says the next safe fix must
be active-current-only scheduling plus a narrow helper-family fix and
canonicalization, not broad product-evidence suppression.

The newest PR-split synthesis, `20260517T175214Z`, rejects filing-ready,
push-ready, broad final-stack fuzzing, and stack-wide validation
interpretations. It keeps the replacement PR07 topology as
`PR07A -> PR07B0 -> PR07B1`, keeps `PR06B` and `PR07C` as sidecars, and keeps
`PR07D`, `PR17`, `PR18`, and `PR18x` absent until replay evidence proves
ownership. The matching `20260517T175214Z` feedback-action applied the Cycle 290
consensus and launched a fresh bounded manifest/audit job, but it still treats
PR07 replay proof as missing and keeps final-stack fuzzing, filing, pushing, and
another `1020002` job blocked.

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
`duplicateShareCurrent=0.7000` and current summary startup failures of `0`. It
also has `2` quality issues, `1` warning, `411.0G` free memory, and a false
monitor headroom flag. The plot uses `duplicateShareCurrent` and current summary
startup failures for the live health view; it does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` as the
enabled group. The latest duplicate/noise synthesis says the remaining red gate
is not historical aggregate duplicate/noise: it is active current duplicate
concentration, stale drain/no-analysis policy input, and a narrow
parser-serialization helper family. With the refreshed current duplicate share
at `0.7000`, startup failures at `0`, warnings at `1`, quality issues at `2`,
and headroom false, the live graph sample is still not clean. The
`20260517T172447Z` feedback-action validated the prior scheduler hold fix, but
the newer `20260517T175133Z` synthesis rejects treating that as complete.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T18:00:00Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `39.9%` to `78.1%` utilization, with the latest sample at
`62.9%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `2` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `12`. The newest 1/5/15-minute load sample is `35.95`, `46.87`,
and `49.98` against `64` logical CPUs, so all three current load windows are
below the core count despite recent bursts above it. Raw memory remains ample,
but the latest monitor headroom flag is false. Current duplicate share is
`0.7000`, current startup failures are `0`, and the latest monitor sample has
`1` warning and `2` quality issues.

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
live graph status comes from `duplicateShareCurrent=0.7000` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis shifts the remaining problem
to active-current policy scope and a narrow parser-serialization helper noise
family. Startup failures are `0` and memory is ample, but the current duplicate
metric is high, headroom is false, and the latest monitor sample has one warning
and two quality issues. The mixed-health read comes from current-output-dir
metrics and recent load/headroom pressure, not from historical aggregate
duplicate/noise.

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
feedback-action says browser/e2e was restored to two `26`-PID polls, the
query-array lower-level oracle/guidance was improved, and one audited
`protocol-server-http-polling` lane was launched. The committed collector-visible
graph still shows one `coverage-guided-lower-level` lane and `0` protocol-server
executions, so this report treats those persona outputs as new evidence that has
not yet landed in the plotted trend counters. The latest execution bucket has
current rate only for browser/e2e and `unit-property`;
`coverage-guided-lower-level` has a plotted lane and historical cumulative
executions but `0` current counted executions.

The latest native synthesis, `20260517T140513Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The latest native action
file, `20260517T140513Z`, is empty, so the last substantive native action
remains `20260517T134230Z` with direct and bounded tmux smoke event accounting.
The newest protocol-server synthesis file, `20260517T180232Z`, is empty; the
latest substantive protocol synthesis and action are `20260517T174810Z`, which
implemented and validated a HTTP polling REST protocol/server harness with root
and lane `events.ndjson` records. The refreshed graph still has `0` counted
`protocol-server` executions, even though the level-mix feedback-action says its
final context saw `4,260` protocol executions. This report therefore keeps live
protocol-server trend status at `0` until collector-visible counts appear.
`backend-api` remains blocked/`0`. The latest fuzz-only assertion apply file,
`20260517T171831Z`, is empty; the last substantive apply file,
`20260517T155726Z`, added two gated assertions and restarted affected browser
loops, but standalone fuzz-only assertion work remains `0` in the graph because
it lacks audited current-run-root/status/events wiring.

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

The latest collected execution data has about `5,318,138` completed test
executions: `108,077` browser/e2e, `3,006` transport/integration, `4,778,720`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `3,412` browser/e2e test executions/hour,
`6,016` unit-property executions/hour, and `0` for
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
`580` unique likely-real outputs over about `1,880.3` runner-hours, or `30.85`
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

Current unique bug-output candidate rates are: browser/e2e `5,219` candidates
over `1,880.3` runner-hours (`277.56` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `23.5` runner-hours
(`17.02` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,536.5` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,829.5` for unit/property.

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
| `parser-serialization` | 3315 | 172 | 4 | 5.2% |
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
review, `20260517T175214Z`, took `10.1` minutes from
`2026-05-17T17:52:14Z` to `2026-05-17T18:02:22Z`. The newest completed window
also includes `20260517T172803Z` and `20260517T174423Z`, so the loop is still
turning while final publication remains blocked.

The newest PR-split synthesis, `20260517T175214Z`, says the split is still
blocked and is not filing-ready, push-ready, or final-fuzz-ready. It keeps the
replacement PR07 topology as `PR07A -> PR07B0 -> PR07B1`, keeps `PR06B` and
`PR07C` as sidecars after `PR07B1`, and keeps `PR09` after active `PR07B1`. It
rejects stale publication inputs and keeps `PR07D`, `PR17`, `PR18`, and `PR18x`
absent unless repaired replay proves ownership. The matching feedback-action
applied the Cycle 290 consensus and launched
`rtc-cycle290-active-manifest-refresh-after-180011-deferred-queue`, which
completed with nonempty manifest/audit artifacts. That feedback still leaves
PR07 replay proof missing, so broad final-stack fuzzing, filing, pushing,
another `1020002` job, and raw reload-hydration promotion remain rejected.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T18:01:12Z`, has `14`
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
inputs: `duplicateShareCurrent` is `0.7000`, current summary startup failures
are `0`, the headroom flag is false, free memory is `411.0G`, warnings are `1`,
and quality issues are `2`. The copied novelty state currently lists
`novelty-ws-parser-serialization`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects a fully green read. The latest duplicate/noise
synthesis, `20260517T175133Z`, says strict no-product startup stalls are mostly
blocked before expensive analysis, but the gate remains red because stale
drain/no-analysis state can still feed active policy and the active
parser-serialization lane is producing product-evidence helper noise around
`fuzz_helper_rest_endpoint_construction`. The `20260517T172447Z`
feedback-action validated the earlier startup-noise scheduler fix, but the newer
synthesis says that is not enough; the next action should be active-current-only
scheduling plus narrow helper-family canonicalization, not broad
product-evidence suppression.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T175214Z`, keeps
`PR07A -> PR07B0 -> PR07B1` as the replacement topology, keeps `PR06B` and
`PR07C` as sidecars, and keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent until
fresh replay proves ownership. The matching feedback-action added a fresh
manifest/audit newer than the deferred queue, but it still says PR07 replay
proof is missing and the local publish manifest rows remain stale. Final-stack
fuzzing, pushing, filing, another `1020002` job, and raw reload-hydration
promotion remain blocked.

The remaining fuzzing weakness is completion depth, live materialization, and
collector-visible level diversity. The graph's latest snapshots are still
concentrated in browser/e2e (`26` plotted lanes), with `unit-property` and one
`coverage-guided-lower-level` lane visible as lower-level targets. The latest
level-mix feedback-action says browser/e2e was restored to two `26`-PID polls
and one audited protocol-server HTTP polling lane was launched, but the
committed graph still shows `protocol-server=0` and only one
coverage-guided-lower-level lane. That contradiction is evidence to track, not a
reason to call protocol-server live in the graph yet.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest execution bucket has about
`3,412` browser/e2e test executions/hour, `6,016` unit-property executions/hour,
and `0` for transport, coverage-guided lower-level, protocol-server,
backend/API, and standalone fuzz-assertion. The next narrow operational checks
are active-current duplicate/noise policy, load/headroom, current-root browser
materialization/accounting, protocol and lower-level counts becoming
collector-visible, and PR split replay/local filing gates before any final-stack
fuzz or filing claim.
