# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T17:00:33Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T16:57:03Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2041` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T16:57:03Z`, coverage files grew from `272` to `46648`, a delta of
`46376`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `7` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample is not fully clean:
`duplicateShareCurrent` is `1`, while current summary startup failures are `0`.
The same monitor pass has `0` quality issues, `0` warnings, a true headroom
flag, and `416.7G` free memory. This report treats current-output-dir
duplicate/noise and summary startup failure metrics as live graph status;
historical aggregate duplicate/noise is only context. The latest historical
aggregate duplicate share is `0.3459`, but it is not used as the plotted live
health signal.

Persona-loop evidence rejects treating product-evidence failures as infra
noise. The newest duplicate/noise synthesis, `20260517T163139Z`, says consumer
suppression of strict no-product startup noise is mostly working, but the
novelty/control-plane scheduler can still let suppressed startup noise,
no-product-only slices, or stale cooldowns steer producer scheduling even when
current product evidence exists. The matching feedback-action file is empty; the
latest substantive action remains `20260517T154741Z`, which implemented bounded
startup-noise suppression while preserving product-evidence records. The
refreshed graph still shows a live duplicate share of `1`, so the fix evidence
does not make the current health sample fully green.

The newest PR-split synthesis, `20260517T164636Z`, rejects filing-ready,
GitHub-push-ready, broad final-stack fuzzing, and stack-wide validation
interpretations. It keeps the Cycle 282/284 `PR07B0 -> PR07B1` topology active,
but says owner replays and fresh local filing evidence are still missing. The
latest matching feedback-action,
`20260517T162903Z`, applied the Cycle 284 consensus fence locally, recorded
named `PR07B0`/`PR07B1` finalization evidence, patched the deferred-work
promotion loop, and launched bounded owner-replay jobs. It still explicitly
deferred GitHub push, broad final-stack fuzzing, stack-wide validation, and any
new `1020002` job.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=1` and
current summary startup failures of `0`. It also has `0` quality issues, `0`
warnings, `416.7G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied novelty state lists one enabled group:
`novelty-ws-real-user-save-reload`. The latest duplicate/noise synthesis
rejects broad product-evidence suppression and says the remaining bug is
scheduler policy:
suppressed startup virtual signatures and stale startup-noise cooldowns should
not pause productive groups when current product evidence exists. With the
refreshed current duplicate share at `1`, startup failures at `0`, and
headroom true, live status remains mixed: startup/no-product noise is clean in
the latest sample, but duplicate share, scheduler policy, and recent load are
not.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T16:50:01Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `40.8%` to `78.1%` utilization, with the latest sample at
`71.3%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `3` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `13`. The newest 1/5/15-minute load sample is `56.81`, `67.26`,
and `57.55` against `64` logical CPUs; the prior `2026-05-17T16:40:05Z` sample
was `29.52`, `44.95`, and `48.20`. Raw memory remains ample, and the latest
monitor headroom flag is true. Current duplicate share is `1`, current startup
failures are `0`, and the latest monitor sample has `0` warnings and `0`
quality issues.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-real-user-save-reload`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis calls the remaining problem a
scheduler/control-plane bug: suppressed startup noise and stale cooldowns can
still steer producer scheduling even when current product evidence exists. The
matching feedback-action is empty; the prior substantive feedback-action reports
that bounded startup-noise suppression was implemented and validated. The
refreshed startup, warning, quality, memory, and headroom counters are clean, but
current duplicate share, scheduler policy, and recent load are not, so the graph
supports a mixed live-health read.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `33` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes.
Lower-level targets visible in the graph are `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain `0` in the
committed graph counters.

The newest level-mix synthesis, `20260517T161659Z`, rejects reading the graph as
a lower-level expansion signal. It says the immediate mix change is browser/e2e
realized-capacity and telemetry repair: keep `unit-property=1`, keep
`coverage-guided-lower-level=2` flat, do not count gap groups that are paused on
startup stalls, and restore or verify at least `24` live current-root browser
PIDs before trusting new mix decisions. That persona target contradicts the
collector-visible graph, which still shows one `coverage-guided-lower-level`
lane. Its latest matching feedback-action, `20260517T161659Z`, protected the
browser/e2e `24`-lane floor, capped coverage novelty while that floor was at
risk, raised the focused stale-tabs shard, improved the existing query-array
lower-level lane, and regenerated context with `24` live current-root browser
lanes and no telemetry invariant failure. The graph's `33` plotted browser/e2e
lanes are supervisor-history telemetry, so live mix decisions still need
current-root PID/accounting evidence. The latest execution bucket has current
rate only for browser/e2e and `unit-property`; `coverage-guided-lower-level` has
a plotted lane and historical cumulative executions but `0` current counted
executions.

The latest native synthesis, `20260517T140513Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The `20260517T134230Z`
native action validated direct and bounded tmux smoke event accounting. The
newest protocol-server synthesis, `20260517T164713Z`, continues to prioritize
the HTTP polling REST protocol/server harness over WebSocket relay fuzzing,
including root/lane `events.ndjson` accounting for trend collectors. Its latest
matching action implemented and documented the protocol/server harness,
validated syntax, style, `git diff --check`, a two-seed 13-case runner smoke,
root/lane event records, `supervisor-groups.json` with
`fuzzLevel=protocol-server`, and a storage regression. The refreshed graph still
has `0` counted `protocol-server` executions. This report therefore treats the
protocol work as
harness evidence while leaving live protocol-server trend status at `0` until
collector-visible counts appear. `backend-api` remains blocked/`0`. The latest
fuzz-only assertion apply file has no substantive content, and standalone
fuzz-only assertion work remains `0` in the graph.

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

The latest collected execution data has about `5,304,700` completed test
executions: `105,967` browser/e2e, `3,006` transport/integration, `4,767,392`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `684` browser/e2e test executions/hour, `8,704`
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
`580` unique likely-real outputs over about `1,865.5` runner-hours, or `31.09`
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

Current unique bug-output candidate rates are: browser/e2e `5,188` candidates
over `1,865.5` runner-hours (`278.11` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `22.9` runner-hours
(`17.44` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,472.6` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,573.8` for unit/property.

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
| `multi-reload-lifecycle` | 3284 | 110 | 0 | 3.3% |
| `revision-persistence` | 4532 | 165 | 0 | 3.6% |
| `parser-serialization` | 3280 | 162 | 0 | 4.9% |
| `real-user-editing` | 6958 | 561 | 0 | 8.1% |
| `parser-transform` | 4198 | 420 | 0 | 10.0% |
| `common-blocks` | 4106 | 446 | 0 | 10.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6233 | 1156 | 0 | 18.5% |
| `long-session-large-doc` | 2890 | 565 | 0 | 19.6% |
| `persistence-no-title` | 3256 | 842 | 0 | 25.9% |
| `session-lifecycle` | 8128 | 2449 | 0 | 30.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 475 | 1000 |
| action reload-post-action next 2000 tier | 1017 | 2000 |
| real-user body save/reload next 1000 tier | 534 | 1000 |
| successful real-user-editing records next 1000 tier | 561 | 1000 |
| action ui-format-paragraph next 2000 tier | 1475 | 2000 |
| real-user title save/reload next 500 tier | 475 | 500 |
| action ui-heading-shortcut next 1000 tier | 998 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, real-user UI,
payload-size, transport, profile, step-count, initial-content, and
media/cross-entity observations. Raw volume is still heavy in transport,
collaborator, payload-size, revision, autosave, fault, initial-content, reload,
save, and step-count observations. That is the right shape for RTC data-loss
work because the harness observes both semantic state transitions and
low-level block/action combinations. The plot separates breadth (`keys`) from
repeated observations (`total_count`) so broad coverage is not hidden inside raw
event volume.

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
review, `20260517T164636Z`, took `8.2` minutes. The newest completed window
includes `20260517T144650Z` from
`2026-05-17T14:46:50Z` to `2026-05-17T14:54:51Z`, `20260517T145456Z` from
`2026-05-17T14:54:56Z` to `2026-05-17T15:01:50Z`, `20260517T151727Z` from
`2026-05-17T15:17:27Z` to `2026-05-17T15:28:15Z`, `20260517T152820Z` from
`2026-05-17T15:28:20Z` to `2026-05-17T15:37:45Z`, and `20260517T154634Z` from
`2026-05-17T15:46:34Z` to `2026-05-17T15:58:52Z`, plus `20260517T155857Z` from
`2026-05-17T15:58:57Z` to `2026-05-17T16:08:04Z`, and `20260517T162021Z` from
`2026-05-17T16:20:21Z` to `2026-05-17T16:28:58Z`, and
`20260517T162903Z` from `2026-05-17T16:29:03Z` to
`2026-05-17T16:37:48Z`, and `20260517T164636Z` from
`2026-05-17T16:46:36Z` to `2026-05-17T16:54:45Z`.

The newest PR-split synthesis, `20260517T164636Z`, says the split is still
blocked and is not filing-ready, GitHub-push-ready, final-stack-fuzz-ready, or
stack-wide validation-ready. It keeps the Cycle 282/284 `PR07B0 -> PR07B1`
topology: `PR07B0` is saved CRDT response hydration, and `PR07B1` is stale
base-record/title filtering. It keeps `PR06B` and `PR07C` as sidecars after
`PR07B1`, rejects raw deferred refs as filing refs, and keeps `PR07D`, `PR17`,
`PR18`, and `PR18x` absent unless fresh replay proves non-coverage and ownership.
The latest matching feedback-action, `20260517T162903Z`, applied the Cycle 284
fence, recorded named `PR07B0`/`PR07B1` finalization evidence, patched the
deferred-promotion loop, and launched bounded reload/strict owner replays. It
still deferred GitHub push work, broad final-stack fuzzing, stack-wide
validation, and any new `1020002` job.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T16:39:02Z`, has `14`
suggested rows totaling `7626` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
`PR 6` (`732`), and `PR 13C` (`294`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `7`. The latest plotted
current-output-dir duplicate/startup sample is mixed on those live health
inputs: `duplicateShareCurrent` is `1`, current summary startup failures are
`0`, warnings and quality issues are `0`, the headroom flag is true, and free
memory is `416.7G`. The copied
novelty state has one enabled coverage-guided browser group:
`novelty-ws-real-user-save-reload`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
The latest duplicate/noise synthesis, `20260517T163139Z`, says strict no-product
startup stalls are mostly blocked in consumers, but the novelty scheduler can
still let suppressed startup noise and stale cooldowns pause/block productive
groups when current product evidence exists. The latest matching feedback-action
file is empty; the prior substantive action implemented bounded startup-noise
suppression while preserving product-evidence failures. The refreshed graph
agrees that current startup, warning, quality, memory, and headroom counters are
clean, but it does not support a fully green health read because current
duplicate share, scheduler policy, and recent load are not clean.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T164636Z`, says the active split
should stay on the Cycle 282/284 `PR07B0 -> PR07B1` topology, but filing is
blocked by missing owner replay classifications and fresh local filing evidence.
It keeps `PR06B` and `PR07C` as sidecars after `PR07B1`, rejects raw deferred
refs as filing refs, and keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent from
current evidence unless fresh replay proves non-coverage and ownership. The
matching feedback-action applied that shape, recorded fresh finalization
evidence, patched the promotion loop, and launched bounded owner replays, but it
still rejects final filing/push work until validation and local filing gates are
clean.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e (`33` plotted
lanes), with `unit-property` and one `coverage-guided-lower-level` lane active
as lower-level targets. The newest level-mix synthesis rejects adding
lower-level capacity now and says the immediate change is browser/e2e
materialization and telemetry repair at or above the `24` live current-root PID
floor. It also says `coverage-guided-lower-level` should stay flat at `2`, while
the collector-visible graph still shows one such lane; treat that as a
persona/graph discrepancy rather than a live expansion signal. Its latest
matching feedback-action protected the browser floor, capped coverage novelty
under pressure, improved the existing query-array lower-level lane, and observed
`24` live current-root browser lanes with no current telemetry invariant failure.
The graph's `33` plotted browser/e2e lanes remain supervisor-history telemetry,
so live mix decisions still need audited current-root PID/accounting evidence
instead of graph counts alone.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest native action validated the
V8/Node rich-text CRDT lower-level harness. The latest protocol synthesis keeps
HTTP polling REST as the first protocol/server target; the latest matching
action implemented and validated the harness, including syntax, style,
`git diff --check`, a two-seed 13-case runner smoke, root/lane event records,
`supervisor-groups.json`, and a storage regression. The graph still counts `0`
protocol-server executions, so the harness evidence has not yet become
collector-visible trend data. The latest execution bucket has about `684`
browser/e2e test executions/hour, `8,704` unit-property executions/hour, and `0`
for transport, coverage-guided lower-level, protocol-server, backend/API, and
standalone fuzz-assertion. The
next narrow operational checks are health under current duplicate share and
load, current-root browser
materialization/accounting, lower-level and protocol lanes appearing in
execution/output graphs, and PR split fresh validation/local filing gates before
any final-stack fuzz or filing claim.
