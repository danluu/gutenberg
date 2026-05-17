# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T11:41:00Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T11:38:59.627Z`,
  `lastUpdatedAt=2026-05-17T11:37:24.118Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1956` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T11:37:24Z`, coverage files grew from `272` to `43811`, a delta of
`43539`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth and action depth.

The latest plotted current-output-dir duplicate/noise and startup sample is not
yet clean on the required live duplicate/noise metric: `duplicateShareCurrent`
is `0.3333`, while current summary startup failures are `0`. The same monitor
pass has `0` quality issues, `0` warnings, a true headroom flag, and `443.2G`
free memory. This report treats current-output-dir duplicate/noise and summary
startup failure metrics as live graph status; historical aggregate
duplicate/noise is only context. The latest historical aggregate duplicate
share is `0.3519`, but it is not used as the plotted live health signal.

Persona-loop evidence rejects a product-bug interpretation of the duplicate/noise
regression. The latest duplicate/noise synthesis, `20260517T112710Z`, says
current active triage has `0` bootstrap stalls, `0` no-product raw signatures,
and one visible likely-real family; the large `pre_action_bootstrap_stall`
signal is historical/raw accounting. It rejects broad startup suppression and
asks for bounded consumer/control-plane hardening around stale gate refresh,
learned product-evidence duplicate family caps, and scoped live-analysis cleanup.
The latest feedback-action, `20260517T110401Z`, implemented the earlier bounded
consumer/control-plane fix, restarted only the novelty scheduler, and reported a
post-restart gate refresh with `0` strict startup and no-product known-noise
queued/running; the remaining actionable item was product-evidence timeout with
user/action/reload/fault evidence.

The newest PR-split synthesis, `20260517T112431Z`, rejects a filing-ready,
final-stack-fuzz, broad-fuzz, or push interpretation. It keeps the Cycle 262
no-PR03B topology and a real PR05D, but says PR05D is not reviewable in its
produced branch shape because its manifest is based on the fallback-group tail.
The latest feedback-action, `20260517T110409Z`, applied the prior split update,
recorded nonempty PR05B/PR05C owner-comparison evidence, launched PR05D and
reload-ownership follow-ups, and kept final-stack fuzz, filing, broad fuzz, and
focused seed `1020002` deferred. The newer synthesis supersedes that by asking
for exactly one clean-base PR05D restack/verify job before stack-wide validation.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `4`
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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0.3333`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `443.2G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state lists two enabled groups:
`novelty-ws-real-user-rich-text` and `novelty-ws-real-user-editing`. The latest
duplicate/noise synthesis rejects a product-bug interpretation and broad
product-evidence suppression. It says current active triage has no bootstrap
stall or no-product raw signatures, while historical/raw accounting still
reintroduces suppressed startup rows for reporting. That contradicts a simple
product-bug read of the graph: the latest plotted live duplicate share remains
nonzero at `0.3333`, but the feedback-action says strict startup and no-product
known-noise queued/running were `0` after the bounded consumer/control-plane
refresh.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T11:40:00Z` show bursty CPU and severe
load pressure. The latest 25 CPU samples range from `30.1%` to `81.0%`
utilization, with the latest sample at `45.4%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `6` of those `25` sampled
windows, and at least one of the three load windows exceeded it in `16` of
`25`. The latest sampled 1/5/15-minute load is `46.84`, `40.76`, and `52.47`
against `64` logical CPUs. Raw memory remains ample, and the latest monitor
headroom flag is true even though current duplicate share, startup, quality, and
warning counts are `0.3333`, `0`, `0`, and `0`.

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
live graph status comes from `duplicateShareCurrent=0.3333` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest synthesis calls the remaining
problem historical/raw accounting plus product-evidence timeout/unknown families
that can still consume analysis outside learned high-confidence caps, and it
rejects broad product-evidence suppression. The matching feedback-action applied
a bounded stale/no-source suppression recheck and gate-refresh path; live
duplicate/noise is improved from the prior plotted `1` sample but remains
nonzero in this snapshot.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `30` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `4` coverage-guided, `10` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes, with
counted lower-level activity in `unit-property` and one
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T112328Z`, rejects treating those plotted/requested browser lanes as
fully materialized live capacity. Its read-only live check says the supplied
context was stale, focused/strict/gap exact supervisor and watchdog sessions
were missing, and only `3` current browser runner PIDs were alive. It still says
not to add net capacity: recover browser materialization first, keep browser/e2e
at or above the `24`-lane floor, keep `unit-property` capped at `1`, and retarget
or demote the zero-yield unit lane after browser recovery.

The matching level-mix feedback-action remains `20260517T105643Z`; it fixed and
quarantined protocol accounting, added protocol root telemetry, and retargeted
the query-array coverage-guided lower-level lane after validation. The latest
graph has not yet converted those actions into a nonzero current
`coverage-guided-lower-level` or `protocol-server` execution rate. This is a
case where the persona-loop evidence contradicts a graph-only interpretation:
the supervisor snapshot says browser/e2e dominates requested lanes, while the
latest live PID evidence says browser materialization is below floor.

Live plotted fuzzing is still concentrated in browser/e2e lanes. Lower-level
targets are active in the plotted mix through `unit-property` and one
`coverage-guided-lower-level` lane, but the latest execution bucket has current
rate only for browser/e2e and `unit-property`. `transport-integration` has
historical activity but no current counted rate. The latest native-harness
synthesis and action, `20260517T112405Z`, choose and validate the rich-text CRDT
V8/Node coverage-guided lower-level harness with root/lane `events.ndjson`
records, but that smoke evidence has not become a current graph rate yet. The
latest protocol-server synthesis, `20260517T113044Z`, chooses the HTTP polling
REST path through `/wp-sync/v1/updates`; its matching action file is empty, and
the refreshed execution graph still has `0` counted `protocol-server`
executions. `backend-api` remains blocked/`0`, and standalone `fuzz-assertion`
remains unaudited and not a clean counted lane until it has audited run-root,
status, and `events.ndjson` wiring. The latest fuzz-assertion action added
fuzz-gated browser assertions and restarted affected loops, so those diagnostics
can affect browser/e2e output even though standalone `fuzz-assertion`
executions remain `0` in the graph.

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

The latest collected execution data has about `5,179,053` completed test
executions: `102,196` browser/e2e, `3,006` transport/integration, `4,645,516`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T11:30:00Z`, reports about `108` browser/e2e test
executions/hour, `183,008` unit-property executions/hour, and `0` for
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
`492` unique likely-real outputs over about `1,789.1` runner-hours, or `27.50`
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

Current unique bug-output candidate rates are: browser/e2e `4,847` candidates
over `1,789.1` runner-hours (`270.91` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `19.7` runner-hours
(`10.15` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,547.5` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `588.6` for unit/property.

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
| `multi-reload-lifecycle` | 3224 | 106 | 0 | 3.3% |
| `revision-persistence` | 4384 | 154 | 0 | 3.5% |
| `parser-serialization` | 3159 | 151 | 0 | 4.8% |
| `real-user-editing` | 6537 | 516 | 0 | 7.9% |
| `parser-transform` | 4113 | 405 | 0 | 9.8% |
| `common-blocks` | 3904 | 386 | 0 | 9.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6070 | 1114 | 0 | 18.4% |
| `long-session-large-doc` | 2562 | 499 | 0 | 19.5% |
| `persistence-no-title` | 3116 | 742 | 0 | 23.8% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 392 | 500 |
| real-user body save/reload next coverage tier | 451 | 500 |
| action ui-heading-shortcut next coverage tier | 870 | 1000 |
| action reload-post-action next coverage tier | 894 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth and action
depth.

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
review, `20260517T112431Z`, took `12.2` minutes. The newest completed window
shows review cycle `20260517T101629Z` running from `2026-05-17T10:16:29Z` to
`2026-05-17T10:27:16Z`, review cycle `20260517T103155Z` running from
`2026-05-17T10:31:55Z` to `2026-05-17T10:39:11Z`, review cycle
`20260517T103916Z` running from `2026-05-17T10:39:16Z` to
`2026-05-17T10:48:08Z`, review cycle `20260517T105433Z` running from
`2026-05-17T10:54:33Z` to `2026-05-17T11:04:04Z`, review cycle
`20260517T110409Z` running from `2026-05-17T11:04:09Z` to
`2026-05-17T11:14:26Z`, and review cycle `20260517T112431Z` running from
`2026-05-17T11:24:31Z` to `2026-05-17T11:36:40Z`.

The newest PR-split synthesis, `20260517T112431Z`, says the split needs change
and is still blocked, not fileable. It keeps the Cycle 262 no-PR03B main spine
with PR03B and PR07C as sidecars, keeps repaired PR06B after PR07B, and keeps a
real PR05D for semicolonless entity/reference block validation. It rejects
current PR17/PR18/PR18x slots, rejects PR07D from raw reload-hydration evidence,
and says PR05D must be rebuilt because the produced manifest is based on the
fallback-group tail instead of a clean PR05-prefix base. The latest
feedback-action, `20260517T110409Z`, applied the prior split update, recorded
nonempty PR05B/PR05C owner-comparison artifacts, launched PR05D and
reload-ownership follow-ups, and patched loop gates so stale or zero-byte
artifacts do not count as progress. The newer synthesis supersedes it by asking
for exactly one clean-base PR05D restack/verify job before stack-wide validation.
Final-stack fuzz, filing, broad fuzz, pushes, and focused seed `1020002` remain
deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T11:28:10Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `4`. Live duplicate and
startup status is mixed on the required current-output-dir metrics: the latest
plotted sample has `duplicateShareCurrent=0.3333` and current summary startup
failures of `0`. The same sample has `0` quality issues, `0` warnings, a true
headroom flag, and `443.2G` free memory. The copied novelty state has two
enabled coverage-guided browser groups: `novelty-ws-real-user-rich-text` and
`novelty-ws-real-user-editing`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share
and current summary startup failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
Its latest synthesis says current active triage has `0` bootstrap stalls, `0`
no-product raw signatures, `1` likely-real visible family, and that the large
`pre_action_bootstrap_stall` signal is historical/raw accounting. That feedback
rejects a product-bug interpretation of the live duplicate-share regression and
asks for bounded stale gate refresh, learned product-evidence family caps, and
scoped live-analysis cleanup. The latest feedback-action implemented a bounded
stale/no-source suppression recheck and current-run gate refresh, restarted only
the novelty scheduler, and reported `0` strict startup/no-product known-noise
queued/running after restart. That is validation evidence for the
consumer/control-plane fix, but the live graph still shows nonzero current
duplicate share.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T112431Z`, keeps the Cycle 262
no-PR03B main spine, PR03B and PR07C sidecars, PR06B-on-PR07B placement, and a
real PR05D, but says the produced PR05D branch/manifest is not reviewable until
it is restacked onto a clean PR05-prefix base. It rejects PR17, PR18, PR18x,
PR07D, filing, pushes, and broad/final-stack fuzz from current evidence. The
latest feedback-action applied the prior split update, accepted nonempty
PR05B/PR05C comparison artifacts, launched PR05D and reload-ownership jobs, and
still defers final-stack fuzz, filing, broad fuzz, pushes, and focused seed
`1020002`.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e, with
unit-property and coverage-guided-lower-level active as lower-level targets.
The latest level-mix synthesis contradicts a simple "30 browser lanes are live"
read: it says exact focused/strict/gap supervisors and watchdogs were missing
and only `3` current browser runner PIDs were alive, so browser materialization
recovery comes before lower-level expansion. Backend/API remains inactive,
transport-integration has historical but no current counted rate, and standalone
fuzz-assertion is not a clean graph lane until audited status/events wiring
exists. The level-mix feedback-action says protocol telemetry/accounting was
fixed and query-array lower-level was retargeted, while native-harness evidence
validated rich-text CRDT as a ready V8/Node coverage-guided lower-level harness.
The latest protocol synthesis selects the HTTP polling REST target, but its
action file is empty and the graph still has `0` counted `protocol-server`
executions. The latest execution bucket has about `108` browser/e2e test
executions/hour, `183,008` unit-property executions/hour, and `0` for transport,
coverage-guided lower-level, protocol-server, backend/API, and standalone
fuzz-assertion. The next narrow operational checks are keeping duplicate
consumer gating fail-closed, recovering browser materialization above the floor,
verifying protocol production execution continuity, watching for the retargeted
lower-level lane to appear in execution and output graphs, and completing the
PR05D clean-base restack plus PR split sidecar/runtime gates before any
final-stack fuzz or filing claim.
