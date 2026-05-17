# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T17:33:31Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T17:31:48Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`2052` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T17:31:48Z`, coverage files grew from `272` to `46969`, a delta of
`46697`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted current-output-dir duplicate/noise sample is not fully clean
on the live duplicate/startup inputs: `duplicateShareCurrent` is `1`, while
current summary startup failures are `0`. The same monitor pass has `0` quality
issues, `0` warnings, a true headroom flag, and `437.1G` free memory. This
report treats current-output-dir duplicate/noise and summary startup failure
metrics as live graph status; historical aggregate duplicate/noise is only
context. The latest historical aggregate duplicate share is `0.3462`, but it is
not used as the plotted live health signal.

Persona-loop evidence rejects treating product-evidence failures as infra
noise. The newest duplicate/noise synthesis, `20260517T171538Z`, says consumer
suppression of strict no-product startup noise is mostly working, but the
novelty/control-plane scheduler still has a drain-aware producer leak: once a
noisy group moves into paused `no-analysis` state, its startup-stall evidence can
drop out of the active policy view and let sibling browser producers or coverage
guidance re-enter the same startup-stall family. The latest substantive matching
feedback-action, `20260517T163139Z`, bumped the novelty policy to `19`, made
startup-noise cooldowns current-output-root scoped, removed stale
startup-noise pauses from old coverage roots, and validated that product-evidence
signatures remained visible while startup noise was gated. The refreshed graph
is clean on current startup, warning, and quality counters, but it is red on the
live duplicate-current metric. The persona-loop evidence also rejects a fully
green health interpretation because startup-noise holds are not yet drain-aware
at producer enable time and recent load pressure remains live.

The newest PR-split synthesis, `20260517T171947Z`, rejects filing-ready,
GitHub-push-ready, broad final-stack fuzzing, and stack-wide validation
interpretations. It keeps the replacement PR07 shape as
`PR07A -> PR07B0 -> PR07B1`, keeps `PR06B` and `PR07C` as sidecars after
`PR07B1`, and says reload/rejoin owner proof plus fresh publication evidence
are still missing. The latest feedback-action remains
`20260517T165450Z`, applied the Cycle 286 consensus, recorded strict seed
`5700084` as currently `covered-by-PR05C`, kept reload residuals
`still_diagnostic_resource_gated`, patched bounded-job prompt handling in the
review loop, and completed the bounded active-manifest refresh/deferred owner
harvest job with nonempty artifacts. It still explicitly deferred GitHub push,
broad final-stack fuzzing, stack-wide validation, PR07 live replay, and any new
`1020002` job.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=1` and
current summary startup failures of `0`. It also has `0` quality issues, `0`
warnings, `437.1G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` as the
enabled group. The latest duplicate/noise synthesis rejects broad
product-evidence suppression but says startup-noise holds must include paused
`no-analysis` current dirs, not just active dirs, before new browser producers,
fallback enables, recommendations, or coverage-guidance launches are allowed.
The latest substantive action patched earlier current-root cooldown handling and
validated visible product-evidence signatures, but the newest synthesis still
rejects a fully green interpretation until that drain-aware producer guard is in
place. With the refreshed current duplicate share at `1`, startup failures at
`0`, warnings at `0`, quality issues at `0`, and headroom true, the live graph
sample is not clean on current-output-dir counters; the mixed read now comes
from both the live duplicate-current metric and the persona-identified scheduler
leak under recent load pressure.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T17:30:03Z` show bursty CPU and
intermittent load pressure above the `64` logical CPU count. The latest 25 CPU
samples range from `40.8%` to `78.1%` utilization, with the latest sample at
`56.4%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `3` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `13`. The newest 1/5/15-minute load sample is `43.45`, `45.74`,
and `53.07` against `64` logical CPUs, so all three current load windows are
below the core count despite recent bursts above it. Raw memory remains ample,
and the latest monitor headroom flag is true. Current duplicate share is `1`,
current startup failures are `0`, and the latest monitor sample has `0` warnings
and `0` quality issues.

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
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis calls the remaining problem a
scheduler/control-plane bug: startup-stall evidence can drop out of active-only
policy scope after a noisy group is paused into `no-analysis`, allowing sibling
browser producers to restart the same no-product startup family. The matching
substantive feedback-action reports that the novelty-monitor policy was patched
and validated against stale startup-only and active product-evidence samples,
but the newest synthesis asks for a further active-plus-paused producer guard.
The refreshed startup, warning, and quality counters are clean, and
memory/headroom are healthy, but the live duplicate-current metric is not clean;
the remaining mixed-health read comes from that current-output-dir metric,
scheduler-policy residual risk, and recent load pressure, not from historical
aggregate duplicate/noise.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `28` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes.
Lower-level targets visible in the graph are `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain `0` in the
committed graph counters.

The newest level-mix synthesis, `20260517T172239Z`, rejects reading the graph as
a lower-level expansion signal. It says browser/e2e materialization is the
active failure, browser capacity must be repaired to at least `24` live
current-root PIDs first, and lower-level capacity should stay flat at
`unit-property=1` and `coverage-guided-lower-level=2`. It keeps `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` at `0` until audited
current-run-root, status, and event wiring are fresh. That rejects a graph-only
interpretation that the plotted `28` browser/e2e lanes mean live materialization
is already stable. The latest matching
feedback-action, `20260517T170457Z`, applied the browser/e2e repair instead of
launching protocol or fuzz-assertion capacity: it raised two focused browser
groups to two lanes, restarted only the exact focused-shards session, and
observed live browser PID polls of `28` then `24`. The collector-visible graph
still shows one `coverage-guided-lower-level` lane, not the persona target of
two, so this report treats lower-level expansion as not yet collector-visible.
The latest execution bucket has current rate only for browser/e2e and
`unit-property`; `coverage-guided-lower-level` has a plotted lane and historical
cumulative executions but `0` current counted executions.

The latest native synthesis, `20260517T140513Z`, keeps rich-text CRDT merge as
the first ready isolated lower-level target and labels the engine
`v8-node-coverage-guided-mutator`, not AFL/libFuzzer. The `20260517T134230Z`
native action validated direct and bounded tmux smoke event accounting. The
newest protocol-server synthesis, `20260517T172057Z`, again prioritizes the HTTP
polling REST protocol/server harness over WebSocket relay fuzzing and requires
root/lane `events.ndjson` accounting for trend collectors. Its matching action
implemented and validated the protocol/server harness, with syntax/style checks,
`git diff --check`, a bounded two-seed 13-case runner smoke, root/lane event
records, `supervisor-groups.json` with `fuzzLevel=protocol-server`, and a
storage regression. The refreshed graph still has `0` counted
`protocol-server` executions. This report therefore treats the protocol work as
harness evidence while leaving live protocol-server trend status at `0` until
collector-visible counts appear. `backend-api` remains blocked/`0`. The latest
fuzz-only assertion apply file, `20260517T155726Z`, added two gated assertions
and restarted affected browser loops, but standalone fuzz-only assertion work
remains `0` in the graph because it lacks audited current-run-root/status/events
wiring.

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

The latest collected execution data has about `5,310,147` completed test
executions: `106,262` browser/e2e, `3,006` transport/integration, `4,772,544`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `20` browser/e2e test executions/hour, `2,048`
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
`580` unique likely-real outputs over about `1,872.2` runner-hours, or `30.98`
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

Current unique bug-output candidate rates are: browser/e2e `5,198` candidates
over `1,872.2` runner-hours (`277.64` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `23.2` runner-hours
(`17.24` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,462.2` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `1,707.2` for unit/property.

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
| `parser-serialization` | 3292 | 164 | 0 | 5.0% |
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
review, `20260517T165450Z`, took `10.6` minutes. The newest completed window
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
`2026-05-17T16:46:36Z` to `2026-05-17T16:54:45Z`, and
`20260517T165450Z` from `2026-05-17T16:54:50Z` to
`2026-05-17T17:05:24Z`.

The newest PR-split synthesis, `20260517T171947Z`, says the split is still
blocked and is not filing-ready, GitHub-push-ready, final-stack-fuzz-ready, or
stack-wide validation-ready. It keeps the replacement PR07 shape as
`PR07A -> PR07B0 -> PR07B1`: `PR07B0` is saved-response persisted-CRDT
hydration, and `PR07B1` is stale base-record/title filtering. It keeps `PR06B`
and `PR07C` as sidecars after `PR07B1`, rejects raw deferred refs as filing
refs, and keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent unless fresh replay
proves non-coverage and ownership. It says the next split job should be exactly
one bounded PR07 live replay with the snapshot hook, while broad final-stack
fuzzing, GitHub push, another `1020002` job, and raw reload-hydration promotion
remain rejected. The latest feedback-action, `20260517T165450Z`, applied the
Cycle 286 consensus, recorded strict seed `5700084` as currently
`covered-by-PR05C`, kept reload residuals
`still_diagnostic_resource_gated`, patched bounded-job prompt handling in the
review loop, and completed
`rtc-cycle286-active-manifest-refresh-deferred-owner-harvest` with nonempty
manifest, branch-audit, push-manifest, and owner-replay-status artifacts. It
still deferred GitHub push work, broad final-stack fuzzing, stack-wide
validation, PR07 live replay, and any new `1020002` job.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T17:16:50Z`, has `14`
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
inputs: `duplicateShareCurrent` is `1`, current summary startup failures are
`0`, the headroom flag is true, free memory is `437.1G`, and warnings and
quality issues are both `0`. The copied novelty state currently lists
`novelty-ws-parser-serialization`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures, with quality/warning/headroom/load treated
separately.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
The latest duplicate/noise synthesis, `20260517T171538Z`, says strict no-product
startup stalls are mostly blocked in consumers, but the novelty scheduler can
still re-enable sibling browser producers because paused `no-analysis` current
dirs are not included in startup-noise hold decisions. The latest substantive
feedback-action patched current-root cooldown handling and validated active
product-evidence visibility, but the newest synthesis still asks for
active-plus-paused producer gating. The refreshed graph agrees that current
startup, warning, quality, memory, and headroom counters are healthy, but the
live duplicate-current metric is not healthy; the persona evidence plus recent
load pressure still reject a fully green health read.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T171947Z`, says the active split is the
replacement `PR07A -> PR07B0 -> PR07B1` shape, but filing is blocked by missing
reload/rejoin owner proof and stale publication evidence. It keeps `PR06B` and
`PR07C` as sidecars after `PR07B1`, rejects raw deferred refs as filing refs,
and keeps `PR07D`, `PR17`, `PR18`, and `PR18x` absent from current evidence
unless fresh replay proves non-coverage and ownership. It asks for exactly one
bounded PR07 live replay with snapshot instrumentation and keeps final-stack
fuzzing, pushing, and another `1020002` job blocked. The latest feedback-action
applied the Cycle 286 consensus, recorded strict seed `5700084`
as currently `covered-by-PR05C`, kept reload residuals
`still_diagnostic_resource_gated`, patched bounded-job prompt handling, and
completed the bounded active-manifest refresh/deferred owner harvest job with
nonempty manifest/audit artifacts. It still rejects final filing/push work until
validation and local filing gates are clean.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e (`28` plotted
lanes), with `unit-property` and one `coverage-guided-lower-level` lane active
as lower-level targets. The newest level-mix synthesis rejects adding
lower-level capacity now and says the immediate change is browser/e2e
materialization and telemetry repair. It says to repair browser/e2e to at least
`24` live current-root PIDs, keep `unit-property=1`, keep
`coverage-guided-lower-level=2`, and leave `backend-api`, `protocol-server`, and
standalone `fuzz-assertion` at `0` until audited current-run-root/status/events
wiring is fresh. It rejects a graph-only read that the plotted `28` browser/e2e
lanes prove stable live materialization. The matching feedback-action repaired
browser/e2e materialization by raising two focused browser groups and observing
live PID polls of `28` then `24`, without launching new protocol or
fuzz-assertion lanes.
The collector-visible graph still shows one coverage-guided lower-level lane,
not the persona target of two; treat graph mix as supervisor-history telemetry,
not live expansion authority. Live mix decisions still need audited current-root
PID/accounting evidence instead of graph counts alone.

Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, protocol-server remains `0`, and standalone
fuzz-assertion remains `0` in the graph. The latest native action validated the
V8/Node rich-text CRDT lower-level harness. The latest protocol synthesis,
`20260517T172057Z`, keeps HTTP polling REST as the first protocol/server target;
its matching action implemented and validated the harness, including syntax,
style, `git diff --check`, a two-seed 13-case runner smoke, root/lane event
records, `supervisor-groups.json`, and a storage regression. The graph still
counts `0` protocol-server executions, so the harness evidence has not yet
become collector-visible trend data. The latest execution bucket has about
`20` browser/e2e test executions/hour, `2,048` unit-property executions/hour,
and `0` for transport, coverage-guided lower-level, protocol-server,
backend/API, and standalone fuzz-assertion. The next narrow operational checks
are scheduler policy under the mixed current duplicate/startup sample, load,
current-root
browser materialization/accounting, lower-level and protocol lanes appearing in
execution/output graphs, and PR split fresh validation/local filing gates before
any final-stack fuzz or filing claim.
