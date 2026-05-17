# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T09:10:59Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T09:06:02.508Z`,
  `lastUpdatedAt=2026-05-17T09:08:10.021Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1913` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T09:08:10Z`, coverage files grew from `272` to `42434`, a delta of
`42162`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clear on the live duplicate/startup metrics: `duplicateShareCurrent` is `0`,
and current summary startup failures are `0`. The same monitor pass has `1`
quality issue, `1` warning, a true headroom flag, and `436.0G` free memory. This
report treats current-output-dir duplicate/noise and summary startup failure
metrics as live graph status; historical aggregate duplicate/noise is only
context. The latest historical aggregate duplicate share is `0.3538`, but it is
not used as the plotted live health signal.

Persona-loop evidence still rejects a graph-only closure read: the latest
duplicate/noise synthesis, `20260517T082922Z`, treats duplicate/noise as a leaky
producer-to-consumer control-plane contract, not a product-code failure. It
calls for run-local `no-analysis.json` gating that suppresses only no-product
startup/known-noise work while preserving product-evidence signatures. The
matching feedback action hardened novelty scheduling and the supervisor,
updated triage/analysis/deep/live consumers to honor `no-analysis.json` as a
no-product gate, restarted coverage-guided novelty and supervisor, and reported
post-restart duplicate/noise clear but not yet a meaningful yield sample because
browser generation was blocked by `wp-env` REST health. The refreshed graph
sample has no current duplicate or startup signal, but the persona loop still
treats this as a live contract/watch item rather than a closed issue.
Product-evidence failures remain visible by design.

The newest PR-split synthesis, `20260517T085339Z`, rejects a filing-ready,
final-stack-fuzz, or PR03B-stable-spine interpretation. It says the current
`PR03 -> PR03B -> PR04` spine should be replaced because PR03B is still
browser/PHP-runtime gated, and PR03B should move to a PR03 sidecar or
validation-only sidecar until runtime replay passes. The latest nonempty
feedback action, `20260517T082453Z`, still kept PR03B in the spine while
launching bounded owner/reload replay jobs; the newer syntheses supersede that
read. Filing and broad validation remain blocked by the PR03B runtime gate,
corrected validation stack rebuild, owner/reload diagnostics, and progress-gate
rows that are still actionable.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0` and
current summary startup failures of `0`. It also has `1` quality issue, `1`
warning, `436.0G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The copied novelty state lists five enabled groups:
`novelty-ws-real-user-editing`, `novelty-ws-real-user-rich-text`,
`novelty-ws-lifecycle`, `novelty-http-persistence-probe`, and
`novelty-ws-persistence-no-title`. The latest duplicate/noise action implemented
the narrow no-product known-noise gates and consumer-side `no-analysis.json`
handling called for by the persona loop. The graph's current duplicate/startup
sample is clear, but the persona loop still rejects broad product-evidence
suppression and still calls the producer-to-consumer gate contract incomplete.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T09:00:01Z` still show bursty CPU and
load pressure, though the latest point is lower. The latest 25 CPU samples range
from `30.1%` to `79.9%` utilization, with the latest sample at `30.1%`.
One-minute, five-minute, and 15-minute load all exceeded the logical CPU count
in `5` of those `25` sampled windows, and at least one of the three load windows
exceeded it in `15` of `25`. The latest sampled 1/5/15-minute load is `20.26`,
`23.97`, and `51.86` against `64` logical CPUs. Raw memory remains ample, and
the latest monitor headroom flag is true.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has five enabled groups:
`novelty-ws-real-user-editing`, `novelty-ws-real-user-rich-text`,
`novelty-ws-lifecycle`, `novelty-http-persistence-probe`, and
`novelty-ws-persistence-no-title`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest synthesis says strict
no-product startup suppression must be an authoritative producer-to-consumer
contract: no-product-only runs must be gated early, live analysis must not start
sessions for gated runs, and stale cleanup must preserve product-evidence and
visible `likely_real` signatures. The matching action patched that path, but
the remaining risk is current-root actionability/accounting consistency, not
historical aggregate duplicate/noise as a closure signal.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `30` browser/e2e lanes across `30` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `5` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
counted lower-level activity in `unit-property` and one plotted
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T084618Z`, says browser/e2e is still the useful bug-yield source and
should be backfilled only enough to meet the active-lane floor, while
`unit-property`, parser lower-level, and protocol stay capped at one lane each.
Its feedback action added one bounded coverage-guided lower-level
table/query-array CRDT lane, kept unit/property capped, left browser fuzzing
running, and still marks `fuzz-assertion` as unaudited. This report treats the
graph as concentration telemetry: audited browser/e2e work is active and
dominant, but backend/API and standalone fuzz-assertion are not active counted
capacity.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; live plotted capacity is still concentrated in
browser/e2e lanes. `transport-integration` has historical activity but no
current counted rate. The native-harness persona loop labels the lower-level
work honestly as Node/Jest plus V8 coverage rather than AFL/libFuzzer. The
latest native-harness synthesis, `20260517T085819Z`, still picks the rich-text
CRDT merge harness as the first ready isolated lower-level target; the latest
native action, `20260517T084648Z`, validated that harness with root/lane events,
`seed-attempt-complete` telemetry, and direct plus bounded tmux smoke output,
but it did not override the production hold. The latest protocol-server
synthesis, `20260517T085413Z`, keeps HTTP polling REST as the first protocol
target; the matching action implemented and validated that harness with
root/lane `events.ndjson`, passing `seed-attempt-complete` records, and
`fuzzLevel: "protocol-server"` metadata. The refreshed execution graph still
has `0` counted `protocol-server` executions, so this is an accounting or
production-continuity gap rather than evidence the harness is absent.
`backend-api` remains blocked/`0`, and standalone `fuzz-assertion` remains live
but unaudited in persona-loop feedback and still not a clean counted lane in
these graphs. The latest nonempty fuzz-only assertion apply,
`20260517T081354Z`, added browser sync-manager and HTTP polling diagnostics and
restarted affected browser loops; that is browser-facing assertion hardening,
not a separate counted `fuzz-assertion` lane here.

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

The latest collected execution data has about `4,571,922` completed test
executions: `100,677` browser/e2e, `3,006` transport/integration, `4,039,904`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T09:00:00Z`, reports about `196` browser/e2e test
executions/hour, `149,296` unit-property executions/hour, and `0` for
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
`456` unique likely-real outputs over about `1,751.9` runner-hours, or `26.03`
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

Current unique bug-output candidate rates are: browser/e2e `4,717` candidates
over `1,751.9` runner-hours (`269.25` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `17.2` runner-hours
(`11.62` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,617.9` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `668.1` for unit/property.

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
| `multi-reload-lifecycle` | 3164 | 102 | 0 | 3.2% |
| `revision-persistence` | 4304 | 154 | 0 | 3.6% |
| `parser-serialization` | 3085 | 145 | 0 | 4.7% |
| `real-user-editing` | 6272 | 446 | 0 | 7.1% |
| `parser-transform` | 4042 | 396 | 0 | 9.8% |
| `common-blocks` | 3845 | 380 | 0 | 9.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5959 | 1074 | 0 | 18.0% |
| `long-session-large-doc` | 2499 | 453 | 0 | 18.1% |
| `persistence-no-title` | 3024 | 664 | 0 | 22.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 314 | 500 |
| real-user body save/reload next coverage tier | 373 | 500 |
| action ui-heading-shortcut next coverage tier | 780 | 1000 |
| action reload-post-action next coverage tier | 795 | 1000 |
| successful real-user-editing records next coverage tier | 446 | 500 |

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
review, `20260517T085339Z`, took `8.9` minutes. The newest completed window
shows review cycle `20260517T075636Z` running from `2026-05-17T07:56:36Z` to
`2026-05-17T08:03:52Z`, review cycle `20260517T081558Z` running from
`2026-05-17T08:15:58Z` to `2026-05-17T08:24:48Z`, review cycle
`20260517T082453Z` running from `2026-05-17T08:24:53Z` to
`2026-05-17T08:39:12Z`, review cycle `20260517T084549Z` running from
`2026-05-17T08:45:49Z` to `2026-05-17T08:53:34Z`, and review cycle
`20260517T085339Z` running from `2026-05-17T08:53:39Z` to
`2026-05-17T09:02:33Z`.

The newest PR-split synthesis, `20260517T085339Z`, says the split still needs a
topology change before filing or broad validation. It rejects PR03B as stable in
the main spine while browser/PHP runtime replay is blocked; PR03B should be a
PR03 sidecar or validation-only sidecar until that gate passes. The latest
nonempty feedback action, `20260517T082453Z`, updated `current-pr-split.md`,
verified fresh finalization artifacts from `20260517T082257Z`, launched bounded
`980007` owner replay and `5900001`/`5400002` reload-diagnostics replay jobs,
and deferred PR03B browser/PHP runtime replay because `wp-env` was unavailable.
The newer synthesis rejects that PR03B-spine interpretation, rejects PR18x, and
rejects "job launched" or wait-only status as progress while parallel
progress-gate rows remain.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T09:02:11Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `5`. Live duplicate and
startup status is currently clean on the required current-output-dir metrics:
the latest plotted sample has `duplicateShareCurrent=0` and current summary
startup failures of `0`. The same sample has `1` quality issue, `1` warning, a
true headroom flag, and `436.0G` free memory. The copied novelty state has five
enabled coverage-guided browser groups: `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, and `novelty-ws-persistence-no-title`.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal and rejects broad suppression of product-evidence failures.
Its latest synthesis says the remaining issue is an incomplete run-local
`no-analysis.json` contract: no-product startup/known-noise work should be
suppressed before Codex sessions launch, while product-evidence and visible
`likely_real` signatures remain analyzable. The matching action implemented the
gate across scheduling and consumers, but also reported post-restart browser
generation blocked on `wp-env` REST health. The latest current-output graph
sample has no duplicate/startup signal, but product-evidence failures must stay
actionable and live gating still needs another watch pass because the persona
loop rejects graph-only closure.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T085339Z`, also rejects the earlier
PR03B-spine interpretation: PR03B should move to a sidecar or validation-only
role until browser/PHP runtime replay passes. The latest nonempty feedback
action, `20260517T082453Z`, accepted fresh finalization artifacts and launched
bounded owner/reload replay jobs, but that action predates the sidecar
synthesis. Final-stack fuzz and filing remain deferred behind the PR03B runtime
gate, corrected validation-stack rebuild, owner/reload diagnostics, seed
`1020002` if still required, and loop-gate repair.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix synthesis calls for bounded browser/e2e backfill rather than broad
capacity expansion, and its feedback action added a bounded table/query-array
CRDT lower-level lane while keeping `fuzz-assertion` unaudited. Backend/API
remains inactive, and standalone fuzz-assertion is not a clean graph lane until
audited status/events wiring exists. The native-harness action validated the
rich-text CRDT merge lower-level target; the latest protocol-server action
implemented and validated an HTTP polling REST harness with `protocol-server`
events. The refreshed graph still has `0` counted `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` executions, so protocol-server
remains an accounting or production-continuity gap in this report. The latest
execution bucket has about `196` browser/e2e test executions/hour, `149,296`
unit-property executions/hour, and `0` for transport, coverage-guided
lower-level, protocol-server, backend/API, and standalone fuzz-assertion. The
next narrow operational checks are watching the shared duplicate/noise gating
work, keeping level-mix accounting fail-closed, resolving protocol execution
continuity, continuing PR split owner/reload gates, and rebuilding validation
before any final-stack fuzz or filing claim.
