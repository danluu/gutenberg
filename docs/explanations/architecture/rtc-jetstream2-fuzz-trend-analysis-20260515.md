# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T12:55:28Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T12:41:34.814Z`,
  `lastUpdatedAt=2026-05-17T12:52:47.525Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1977` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T12:52:47Z`, coverage files grew from `272` to `44332`, a delta of
`44060`. The monitor's visible likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth and action depth.

The latest plotted current-output-dir duplicate/noise sample is mixed:
`duplicateShareCurrent` is `0.5`, while current summary startup failures are
`0`. The same monitor pass has `0` quality issues, `0` warnings, a true headroom
flag, and `439.2G` free memory. This report treats current-output-dir
duplicate/noise and summary startup failure metrics as live graph status;
historical aggregate duplicate/noise is only context. The latest historical
aggregate duplicate share is `0.3511`, but it is not used as the plotted live
health signal.

Persona-loop evidence still rejects a product-bug interpretation of the
duplicate/noise control-plane issue. The newest duplicate/noise synthesis,
`20260517T121544Z`, says strict no-product startup stalls are mostly recognized
downstream, but the novelty scheduler can still burn browser capacity on groups
or profiles that recently emitted that startup-noise family. The matching
feedback-action patched the novelty monitor, restarted it, and reported
current/drain no-product raw signatures and bootstrap-stall signatures at `0`
while preserving product-evidence signatures. The graph's current duplicate
share is therefore not interpreted as renewed startup-noise leakage.

The newest PR-split synthesis, `20260517T123821Z`, rejects a filing-ready,
final-stack-fuzz, broad-fuzz, push, stale-`1020002`, or wait-only
interpretation. It says Cycle 266 is the active replacement topology, with PR05D
as the clean PR05C-adjacent split and PR03B, PR06B, and PR07C as sidecars. It
also says automation is still reviving stale lanes and serializing independent
work behind seed `1020002`. The matching `20260517T123821Z` feedback-action
keeps the Cycle 266 active-state fence, records old PR17/PR18x/PR07D and
wrong-base PR05D evidence as historical only, keeps `1020002` terminally
downscoped for product-branch purposes, and launches bounded executor
terminal-filter and isolated sync-undo replay jobs. Final-stack validation,
filing, and GitHub pushes remain deferred.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0.5`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `439.2G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state lists one enabled group:
`novelty-ws-real-user-rich-text`. The latest duplicate/noise synthesis rejects
a product-bug interpretation and broad product-evidence suppression. It
identifies control-plane leakage where current-run no-product startup holds were
mostly recognized downstream, but fallback/recommendation could still spend
capacity on startup-noise-prone browser producers. The matching feedback-action
reports the scheduler-side quarantine applied and the current/drain no-product
startup path clean; the remaining current duplicate share comes from
product-evidence/unknown current signatures, not no-product startup noise.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T12:50:00Z` show bursty CPU and severe
load pressure. The latest 25 CPU samples range from `30.1%` to `81.0%`
utilization, with the latest sample at `52.7%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `5` of those `25` sampled
windows, and at least one of the three load windows exceeded it in `15` of
`25`. The latest sampled 1/5/15-minute load is `27.94`, `40.15`, and `50.93`
against `64` logical CPUs. Raw memory remains ample, and the latest monitor
headroom flag is true. Current startup failures, warnings, and quality issues
are clean; the latest current duplicate share is `0.5`.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has one enabled group:
`novelty-ws-real-user-rich-text`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0.5` and current summary
startup failures of `0`; historical aggregate duplicate/noise remains context,
not the plotted live signal. The latest synthesis calls the remaining problem a
bounded novelty scheduler/control-plane issue, not a product bug and not a
reason for broad product-evidence suppression. The matching feedback-action
reports the current-run no-product startup quarantine applied. The refreshed
startup, warning, and quality-issue metrics are currently clean, while the live
duplicate share remains nonzero on product-evidence/unknown current signatures.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `27` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says plotted fuzzing is still concentrated in browser/e2e lanes, with
counted lower-level activity in `unit-property` and one
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T124019Z`, rejects the raw graph/context lane count as proof of live
capacity: live audits saw only `2-5` browser PIDs, below the `24` floor, after
the coverage root moved and focused/strict/gap controller sessions were absent.
It says to restore browser/e2e controllers against existing roots before adding
lower-level capacity, keeping `coverage-guided-lower-level=2`,
`unit-property=1`, `protocol-server=1`, `backend-api=0`, and standalone
`fuzz-assertion=0` until accounting is trustworthy. The matching feedback-action
file is empty, so this latest materialization rejection has no applied recovery
in the standard feedback evidence.

Live plotted fuzzing is still concentrated in browser/e2e lanes. Lower-level
targets are active in the plotted mix through `unit-property` and one
`coverage-guided-lower-level` lane, and the latest execution bucket has current
rate only for browser/e2e and `unit-property`; the current unit/property profile
is `rtc-rich-text-crdt-merge`. `transport-integration` has historical activity
but no current counted rate. The production lower-level graph still has `0`
current counted `coverage-guided-lower-level` executions. The latest
native-harness synthesis, `20260517T124624Z`, selects the rich-text CRDT merge
target as the first ready isolated V8/Node coverage-guided lower-level harness.
The latest protocol-server synthesis, `20260517T124603Z`, chooses the HTTP
polling REST path through `POST /wp-sync/v1/updates`, but the refreshed
execution graph still has `0` counted `protocol-server` executions.
`backend-api` remains blocked/`0`, and standalone fuzz-only assertion work
remains `0` in the graph even though fuzz-gated browser assertions can affect
browser/e2e output.

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

The latest collected execution data has about `5,260,612` completed test
executions: `102,839` browser/e2e, `3,006` transport/integration, `4,726,432`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T12:45:00Z`, reports about `244` browser/e2e test
executions/hour, `14,848` unit-property executions/hour, and `0` for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone fuzz-assertion. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` levels remain at `0`
cumulative executions in this counter.
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
`527` unique likely-real outputs over about `1,806.7` runner-hours, or `29.17`
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

Current unique bug-output candidate rates are: browser/e2e `4,926` candidates
over `1,806.7` runner-hours (`272.66` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `20.9` runner-hours
(`9.56` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,520.2` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `554.2` for unit/property.

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
| `multi-reload-lifecycle` | 3241 | 108 | 0 | 3.3% |
| `revision-persistence` | 4414 | 155 | 0 | 3.5% |
| `parser-serialization` | 3186 | 153 | 0 | 4.8% |
| `real-user-editing` | 6647 | 531 | 0 | 8.0% |
| `parser-transform` | 4146 | 412 | 0 | 9.9% |
| `common-blocks` | 3934 | 392 | 0 | 10.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6120 | 1127 | 0 | 18.4% |
| `long-session-large-doc` | 2647 | 514 | 0 | 19.4% |
| `persistence-no-title` | 3136 | 760 | 0 | 24.2% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 416 | 500 |
| real-user body save/reload next coverage tier | 475 | 500 |
| action ui-heading-shortcut next coverage tier | 903 | 1000 |
| action reload-post-action next coverage tier | 930 | 1000 |

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
review, `20260517T123821Z`, took `7.2` minutes. The newest completed window
shows review cycle `20260517T112431Z` running from
`2026-05-17T11:24:31Z` to `2026-05-17T11:36:40Z`, review cycle
`20260517T113645Z` running from `2026-05-17T11:36:45Z` to
`2026-05-17T11:45:21Z`, review cycle `20260517T115956Z` running from
`2026-05-17T11:59:56Z` to `2026-05-17T12:10:00Z`, and review cycle
`20260517T121005Z` running from `2026-05-17T12:10:05Z` to
`2026-05-17T12:19:51Z`, followed by review cycle `20260517T123002Z` running
from `2026-05-17T12:30:02Z` to `2026-05-17T12:38:16Z`, and review cycle
`20260517T123821Z` running from `2026-05-17T12:38:21Z` to
`2026-05-17T12:45:36Z`.

The newest PR-split synthesis, `20260517T123821Z`, says the split is blocked,
but not because the split itself is undecided. Cycle 266 is the active
replacement topology: PR05D is the clean PR05C-adjacent semicolonless
block-validation PR, PR03B, PR06B, and PR07C stay sidecars, and PR07D, PR17,
PR18, PR18x, stale `1020002`, and raw reload work remain rejected from current
evidence. It says the immediate blocker is automation debt: the executor is
still treating terminally downscoped or stale branches as runnable. The matching
`20260517T123821Z` feedback-action applied the active-state fence, kept
`1020002` terminal/downscoped for product-branch purposes, launched the bounded
executor terminal-filter repair, and launched the isolated sync undo/history
runtime replay. Final-stack validation/fuzzing, filing, and GitHub pushes remain
deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T12:47:21Z`, has `15`
suggested rows totaling `8022` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 6` (`732`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `4`. The latest plotted
current-output-dir sample is mixed on live duplicate/startup metrics:
`duplicateShareCurrent=0.5` and current summary startup failures of `0`. It has
`0` quality issues, `0` warnings, a true headroom flag, and `439.2G` free
memory. The copied novelty state has one enabled coverage-guided browser group:
`novelty-ws-real-user-rich-text`. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share and
current summary startup failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
The latest synthesis, `20260517T121544Z`, says the remaining issue is
control-plane leakage: current-run no-product startup stalls are mostly
recognized downstream, but producer/fallback scheduling can still spend browser
capacity on startup-noise-prone groups. It explicitly rejects a product-bug
interpretation and asks for a hard current-run startup-noise quarantine in the
novelty monitor. The matching feedback-action reports that scheduler fix
applied and current/drain no-product startup signatures at `0`. The refreshed
graph still has a nonzero live duplicate share, but the current startup path,
warnings, and quality issues are clean.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T123821Z`, says Cycle 266 is the
active replacement topology, PR05D is clean after PR05C, and PR03B, PR06B, and
PR07C remain sidecars. It rejects PR07D, PR17, PR18, PR18x, stale `1020002`
revival, raw reload work, filing, pushes, and broad/final-stack fuzz from
current evidence, and it says executor automation still needs to stop reviving
terminal/stale work. The newest feedback-action applied the split update,
kept `1020002` terminal/downscoped for product-branch purposes, and launched
bounded executor terminal-filter plus isolated sync undo/history replay jobs.

The remaining fuzzing weakness is completion depth and level diversity. The
graph's latest snapshots are still concentrated in browser/e2e, with
unit-property and coverage-guided-lower-level active as lower-level targets.
The latest level-mix synthesis rejects the raw graph/context lane count as proof
of live browser capacity, reports only `2-5` live browser PIDs in audit, and
asks to restore browser/e2e materialization before adding lower-level capacity.
Backend/API remains inactive, transport-integration has historical but no
current counted rate, `coverage-guided-lower-level` has a plotted lane but `0`
current counted executions, and standalone fuzz-assertion remains `0` in the
graph.
Native-harness evidence selects rich-text CRDT merge as the first ready isolated
lower-level target, and protocol-server evidence selects the HTTP polling REST
harness, but the graph still has `0` counted `protocol-server` executions. The
latest execution bucket has about `244` browser/e2e test executions/hour,
`14,848` unit-property executions/hour, and `0` for transport,
coverage-guided lower-level, protocol-server, backend/API, and standalone
fuzz-assertion. The next narrow operational checks are keeping duplicate
scheduler policy current-run scoped and fail-closed, watching browser
materialization stay above the floor, verifying protocol production execution
continuity, watching lower-level lanes appear in execution and output graphs,
and completing PR split sidecar/runtime gates before any final-stack fuzz or
filing claim.
