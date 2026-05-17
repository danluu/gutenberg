# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T18:18:45Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T18:16:45Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2066` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T18:16:45Z`, coverage files grew from `272` to `47015`, a delta of
`46743`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample is not fully clean
on the live duplicate/startup inputs: `duplicateShareCurrent` is `0.6429`, while
current summary startup failures are `0`. The same monitor pass has `2` quality
issues, `1` warning, a false headroom flag, and `416.5G` free memory. This
report treats current-output-dir duplicate/noise and summary startup failure
metrics as live graph status; historical aggregate duplicate/noise is only
context. The latest historical aggregate duplicate share is `0.3462`, but it is
not used as the plotted live health signal.

Persona-loop evidence rejects a fully green duplicate/noise interpretation. The
newest duplicate/noise synthesis, `20260517T180225Z`, says strict no-product
`pre_action_bootstrap_stall` is mostly fixed in the consumer path, but the gate
is still red because product-evidence duplicate families can remain queued when
`live-analysis-monitor` skips durable `analysis-tier` reconciliation, paused
drain/no-analysis dirs still influence current scheduling, and a narrow
`insertMediaCrossEntityBlock` / `fuzz_helper_rest_endpoint_construction` harness
family remains noisy. The latest feedback-action file, `20260517T180225Z`, is
empty, so the last substantive feedback remains `20260517T172447Z`; the newer
synthesis supersedes a fully green read and calls for durable liveness-aware
family capping plus active-current-only scheduling, not broad product-evidence
suppression.

The newest PR-split synthesis, `20260517T180826Z`, rejects filing-ready,
push-ready, broad final-stack fuzzing, and stack-wide validation
interpretations. It says `PR01` is polluted when audited from `origin/trunk`
(`1048 files changed`), local publish rows are still from
`2026-05-17T17:12:18Z`, the `20260517T181000Z` finalization report is zero
bytes, and PR07 replay still lacks durable `report.md` /
`replay-classification.tsv`. It keeps `PR07B0 -> PR07B1`, keeps `PR06B` and
`PR07C` as sidecars, keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent, and says
seed `1020002` should block filing/final-stack fuzz only, not independent audit,
manifest, PR07-replay, PR05/PR11, or loop-repair work.

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
`duplicateShareCurrent=0.6429` and current summary startup failures of `0`. It
also has `2` quality issues, `1` warning, `416.5G` free memory, and a false
monitor headroom flag. The plot uses `duplicateShareCurrent` and current summary
startup failures for the live health view; it does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` as the
enabled group. The latest duplicate/noise synthesis says the remaining red gate
is not historical aggregate duplicate/noise: it is active current duplicate
concentration, stale drain/no-analysis policy input, skipped durable
family-capping reconciliation, and a narrow parser-serialization helper family.
With the refreshed current duplicate share at `0.6429`, startup failures at `0`,
warnings at `1`, quality issues at `2`, and headroom false, the live graph
sample is still not clean. The latest substantive feedback-action remains
`20260517T172447Z`, but the newer `20260517T180225Z` synthesis rejects treating
that as complete.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T18:10:02Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `39.9%` to `78.8%` utilization, with the latest sample at
`78.8%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `2` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `12`. The newest 1/5/15-minute load sample is `66.60`, `70.22`,
and `61.46` against `64` logical CPUs, so current one-minute and five-minute
load are above the core count while 15-minute load is just below it. Raw memory
remains ample, but the latest monitor headroom flag is false. Current duplicate
share is `0.6429`, current startup failures are `0`, and the latest monitor
sample has `1` warning and `2` quality issues.

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
live graph status comes from `duplicateShareCurrent=0.6429` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis shifts the remaining problem
to active-current policy scope, skipped durable product-evidence family capping,
and a narrow parser-serialization helper noise family. Startup failures are `0`
and memory is ample, but the current duplicate metric is high, headroom is
false, current one-minute and five-minute load exceed the core count, and the
latest monitor sample has one warning and two quality issues. The mixed-health
read comes from current-output-dir metrics and recent load/headroom pressure,
not from historical aggregate duplicate/noise.

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

The newest level-mix synthesis file, `20260517T180531Z`, is empty, so the latest
substantive synthesis remains `20260517T173200Z`. It rejects reading the graph
as a lower-level expansion signal. It says the mix should change through
browser/e2e materialization repair, not lower-level expansion:
reported/effective browser/e2e is about `1` live lane against the `24` floor. It
says to restart exact focused, strict, and gap browser supervisor/watchdog
sessions against existing current roots, keep `unit-property=1` and
`coverage-guided-lower-level=2` flat, and only add one audited
`protocol-server-http-polling` lane after browser stability is repaired. It
keeps `backend-api`, `protocol-server`, and standalone `fuzz-assertion` at `0`
until audited current-run-root, status, and event wiring are fresh. That rejects
a graph-only interpretation that the plotted `26` browser/e2e lanes mean live
materialization is already stable. The matching `20260517T173200Z`
feedback-action says browser/e2e was restored to two `26`-PID polls, the
query-array lower-level oracle/guidance was improved, and one audited
`protocol-server-http-polling` lane was launched. The committed
collector-visible graph still shows one `coverage-guided-lower-level` lane and
`0` protocol-server executions, so this report treats those persona outputs as
new evidence that has not yet landed in the plotted trend counters. The latest
execution bucket has current rate only for browser/e2e and `unit-property`;
`coverage-guided-lower-level` has a plotted lane and historical cumulative
executions but `0` current counted executions.

The latest native synthesis, `20260517T140513Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The latest native action
file, `20260517T140513Z`, is substantive and revalidated the rich-text CRDT
coverage-guided lower-level harness with direct and bounded tmux smoke event
accounting. The newest protocol-server synthesis file, `20260517T181043Z`, is
empty; the latest substantive protocol synthesis is `20260517T180232Z`, which
keeps the HTTP polling REST protocol/server harness as the first server target.
The `20260517T174810Z` protocol action implemented and validated that harness
with root and lane `events.ndjson` records. The refreshed graph still has `0`
counted `protocol-server` executions, even though the level-mix feedback-action
says its final context saw `4,260` protocol executions. This report therefore
keeps live protocol-server trend status at `0` until collector-visible counts
appear.
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

The latest collected execution data has about `5,320,370` completed test
executions: `108,965` browser/e2e, `3,006` transport/integration, `4,780,064`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `928` browser/e2e test executions/hour,
`1,152` unit-property executions/hour, and `0` for
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
`580` unique likely-real outputs over about `1,884.3` runner-hours, or `30.78`
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

Current unique bug-output candidate rates are: browser/e2e `5,229` candidates
over `1,884.3` runner-hours (`277.51` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `23.6` runner-hours
(`16.97` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,573.1` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,862.0` for unit/property.

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
| `parser-serialization` | 3321 | 174 | 5 | 5.2% |
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
review, `20260517T180826Z`, took `8.2` minutes from
`2026-05-17T18:08:26Z` to `2026-05-17T18:16:39Z`. The newest completed window
also includes `20260517T174423Z` and `20260517T175214Z`, so the loop is still
turning while final publication remains blocked.

The newest PR-split synthesis, `20260517T180826Z`, says the split is still
blocked and is not filing-ready, push-ready, or final-fuzz-ready. It says the
current `PR01` publication shape is polluted from `origin/trunk`, the latest
local publish rows are stale at `2026-05-17T17:12:18Z`, the
`20260517T181000Z` finalization report is zero bytes, and PR07 replay still
lacks durable `report.md` / `replay-classification.tsv`. It keeps
`PR07B0 -> PR07B1`, keeps `PR06B` and `PR07C` as sidecars after `PR07B1`, and
keeps `PR09` after active `PR07B1`. It rejects `PR07D`, `PR17`, `PR18`, and
`PR18x` until replay proves ownership. The latest substantive feedback-action
remains `20260517T175214Z`, which launched
`rtc-cycle290-active-manifest-refresh-after-180011-deferred-queue`; the newer
synthesis says that is not enough because clean-base PR01/topology audit,
fresh manifest validation, and PR07 replay repair are still missing. Broad
final-stack fuzzing, filing, pushing, another `1020002` job, and raw
reload-hydration promotion remain rejected.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T18:04:40Z`, has `14`
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
inputs: `duplicateShareCurrent` is `0.6429`, current summary startup failures
are `0`, the headroom flag is false, free memory is `416.5G`, warnings are `1`,
quality issues are `2`, and current one-minute and five-minute load exceed the
`64` logical CPU count. The copied novelty state currently lists
`novelty-ws-parser-serialization`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects a fully green read. The latest duplicate/noise
synthesis, `20260517T180225Z`, says strict no-product startup stalls are mostly
fixed in the consumer path, but the gate remains red because product-evidence
duplicate families are not durably capped when `live-analysis-monitor` skips
bounded `analysis-tier` reconciliation, paused drain/no-analysis dirs can still
feed current scheduling, and the active parser-serialization lane has narrow
helper-family harness noise around `fuzz_helper_rest_endpoint_construction`.
The latest feedback-action file is empty, so the last substantive feedback
remains `20260517T172447Z`; the newer synthesis says the next action should be
durable liveness-aware capping, active-current-only scheduling, and narrow
helper-family canonicalization, not broad product-evidence suppression.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T180826Z`, says `PR01` is polluted
from `origin/trunk`, local publish rows are stale, the latest finalization
report is zero bytes, and PR07 replay still lacks durable classification. It
keeps `PR07B0 -> PR07B1`, keeps `PR06B` and `PR07C` as sidecars, and keeps
`PR07D`, `PR17`, `PR18`, and `PR18x` absent until fresh replay proves ownership.
The prior feedback-action added a manifest/audit newer than the deferred queue,
but the newer synthesis rejects using it as filing authority. Final-stack
fuzzing, pushing, filing, another `1020002` job, and raw reload-hydration
promotion remain blocked, while independent clean-base audit, manifest repair,
PR07 replay repair, and PR05/PR11 shaping can proceed.

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
`928` browser/e2e test executions/hour, `1,152` unit-property executions/hour,
and `0` for transport, coverage-guided lower-level, protocol-server,
backend/API, and standalone fuzz-assertion. The next narrow operational checks
are active-current duplicate/noise policy, load/headroom, current-root browser
materialization/accounting, protocol and lower-level counts becoming
collector-visible, and PR split replay/local filing gates before any final-stack
fuzz or filing claim.
