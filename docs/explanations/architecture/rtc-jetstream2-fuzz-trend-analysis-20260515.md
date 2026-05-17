# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T07:12:40Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T06:51:09.557Z`,
  `lastUpdatedAt=2026-05-17T07:07:34.099Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1878` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T07:07:34Z`, coverage files grew from `272` to `41306`, a delta of
`41034`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean on duplicate/startup: `duplicateShareCurrent` is `0`, while current
summary startup failures are `0`. The same monitor pass has `0` quality issues,
`0` warnings, a false headroom flag, and `426.5G` free memory. This report
treats current-output-dir duplicate/noise and summary startup failure metrics as
live graph status; historical aggregate duplicate/noise is only context. The
latest historical aggregate duplicate share is `0.3522`, but it is not used as
the plotted live health signal.

Persona-loop evidence no longer says the duplicate/noise graph is unsupported,
but it still rejects a broad closure claim. The latest timestamped
duplicate/noise synthesis, `20260517T070123Z`, is empty; the latest nonempty
synthesis, `20260517T063152Z`, identified an over-broad product-evidence gate
that let fault metadata promote pre-action startup failures. The matching
feedback-action applied the stricter gate, restarted the active control plane,
and measured no current signatures afterward. It explicitly leaves broader
cross-generation duplicate-family capping as follow-up and keeps real
product-evidence failures analyzable.

The newest PR-split synthesis, `20260517T065712Z`, rejects a filing-ready or
final-stack-fuzz interpretation. It keeps the PR01 through
`PR15C-on-PR14B` spine, but changes the tail by inserting `PR03B` for browser
restoreRevision CRDT invalidation after PR03 and before PR04. It says seed
`1020002` remains final-stack validation/fuzz/filing only, `ee0d01a82e12`
belongs in the PR03 family rather than PR07C or PR18x, and broad final-stack
fuzz remains blocked. The latest nonempty PR-split feedback-action,
`20260517T063739Z`, predates that synthesis; it applied the prior Cycle 242
tail update, refreshed the manifest, launched bounded owner jobs, and still
deferred final-stack fuzz, rebuilt combined validation, and filing.

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
current summary startup failures of `0`. It also has `0` quality issues, `0`
warnings, `426.5G` free memory, and a false monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs` and lists one enabled group:
`novelty-ws-lifecycle`. Its top-level startup-noise pause list is empty, while
the action log still records recent startup-noise cooldown reasons. The latest
nonempty duplicate/noise feedback-action fixed the fault-only product-evidence
leak and restarted the active control plane, but it did not claim the broader
semantic-family cap was complete.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T07:10:00Z` still show bursty CPU and
load pressure. The latest 25 CPU samples range from `37.5%` to `96.5%`
utilization, with the latest sample at `76.2%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `11` of those `25`
sampled windows, and at least one of the three load windows exceeded it in
`20` of `25`. The latest sampled 1/5/15-minute load is `76.21`, `72.26`, and
`62.77` against `64` logical CPUs. Raw memory remains ample, but the latest
monitor headroom flag is false.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state is in `supervisor-active-run-dirs`
mode and has one enabled group: `novelty-ws-lifecycle`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest nonempty duplicate/noise
feedback-action reports the stricter product-evidence gate was applied across
the supervisor, triage watcher, analysis tiers, live monitor, and novelty
monitor, and restarted the active coverage-guided control plane. The remaining
risk is the broader semantic-family cap and sparse-root accounting, not a
historical aggregate duplicate/noise health signal.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `26` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `1` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
lower-level activity in `unit-property` and one plotted
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T064327Z`, rejects expanding capacity and says the immediate action is
controller/accounting restart or regeneration, not more browser/backend/protocol
lanes. It also says the current mix snapshot should not be trusted until
telemetry defects are fixed or regenerated cleanly. The latest timestamped
level-mix feedback-action is empty, while the latest nonempty action reports
unit/property and parser accounting fixes, a clean final context, and
backend/API plus fuzz-assertion explicitly blocked. This report treats the graph
as a concentration signal, not as authority to add browser, protocol,
backend/API, or fuzz-assertion lanes.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; live fuzzing is still concentrated in
browser/e2e lanes. The native-harness persona loop labels the lower-level work
honestly as Node/Jest plus V8 coverage rather than AFL/libFuzzer. The latest
native-harness synthesis keeps the rich-text CRDT merge harness as the first
isolated lower-level target and the parser/serialization harness second; the
latest action tightened and smoke-validated the lower-level coverage-guided
harness while reporting the parser lane active and the primary rich-text CRDT
production lane held by the level-mix controller. The refreshed graph's latest
`coverage-guided-lower-level` group is labeled rich-text CRDT, so the persona
output and graph remain contradictory evidence to reconcile.
`transport-integration` has historical activity but no current counted rate. The
protocol-server action validated an HTTP polling REST harness with event
accounting, direct smoke, launcher smoke, and storage regression evidence, and
the later protocol-server synthesis keeps that as the ready server target; the
refreshed graph still has `0` counted
`protocol-server` executions. `backend-api` and standalone `fuzz-assertion`
remain `blocked`/`0` in the graph. The latest fuzz-only assertion apply added
core-data hydration, query-array, and WebSocket diagnostic gates and restarted
affected browser loops, but this is browser/lower-level gate hardening, not a
separate counted `fuzz-assertion` lane in these graphs.

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

The latest collected execution data has about `4,081,413` completed test
executions: `98,992` browser/e2e, `3,006` transport/integration, `3,551,080`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `660` browser/e2e test executions/hour,
`173,376` unit-property test executions/hour, `0`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour. `backend-api`, `protocol-server`,
and standalone `fuzz-assertion` levels remain at `0` executions in this
counter. The summary still flags approximate execution rows somewhere in the
history, so lower-level totals reconstructed from batch metadata or legacy
batch-count fields should be read as approximate.

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
`398` unique likely-real outputs over about `1,724.5` runner-hours, or `23.08`
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

Current unique bug-output candidate rates are: browser/e2e `4,594` candidates
over `1,724.5` runner-hours (`266.39` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `15.3` runner-hours
(`13.11` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,634.4` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `747.1` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest profiles by likely-real triage output per 100
runner-hours are session lifecycle, permissions/auth/locks, three-user
late-join, parser serialization, and persistence-no-title. The broader
unique-output rate view includes one short media-cross-entity bucket, then
session lifecycle, multi-reload lifecycle, block gauntlet, parser
serialization, and common blocks. Lower-level and
transport lanes should continue to be judged partly by the new unique-output
candidate graphs until their triage pipeline is producing comparable
likely-real and non-duplicate results.

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
| `multi-reload-lifecycle` | 3120 | 102 | 0 | 3.3% |
| `revision-persistence` | 4210 | 148 | 0 | 3.5% |
| `parser-serialization` | 3029 | 143 | 0 | 4.7% |
| `real-user-editing` | 6112 | 437 | 0 | 7.1% |
| `parser-transform` | 3989 | 392 | 0 | 9.8% |
| `common-blocks` | 3790 | 380 | 0 | 10.0% |
| `long-session-large-doc` | 2451 | 423 | 0 | 17.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5905 | 1064 | 0 | 18.0% |
| `persistence-no-title` | 2927 | 581 | 0 | 19.8% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 303 | 500 |
| real-user body save/reload next coverage tier | 362 | 500 |
| action ui-heading-shortcut next coverage tier | 759 | 1000 |
| action reload-post-action next coverage tier | 773 | 1000 |
| successful real-user-editing records next coverage tier | 437 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
and completed-record depth for real-user editing.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is now led by code coverage, action-pair, real-user,
operation-ledger, history, payload-size, block-depth, and invariant
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
took roughly `6.7` to `12.2` minutes in this snapshot; the latest completed
review, `20260517T065712Z`, took `7.7` minutes. The newest completed window
shows review cycle `20260517T062723Z` running from `2026-05-17T06:27:23Z` to
`2026-05-17T06:37:34Z`, review cycle `20260517T063739Z` running from
`2026-05-17T06:37:39Z` to `2026-05-17T06:47:57Z`, and review cycle
`20260517T065712Z` running from `2026-05-17T06:57:12Z` to
`2026-05-17T07:04:54Z`.

The newest PR-split synthesis, `20260517T065712Z`, says the split still needs
split changes before filing or final-stack fuzz. It keeps the PR01 through
`PR15C-on-PR14B` spine, but inserts `PR03B` after PR03 for browser
restoreRevision CRDT invalidation before PR04. It says `ee0d01a82e12` should be
handled as a PR03-family product slot, not PR07C or PR18x, and keeps seed
`1020002` out of product PR slots as a final-stack validation/fuzz/filing
blocker. The latest nonempty feedback-action, `20260517T063739Z`, applied the
previous Cycle 242 decisions, refreshed the manifest, launched bounded owner
jobs, and still deferred final-stack fuzz, rebuilt validation, filing, and
product code edits.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T07:02:34Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `5`. Live health is
clean on the required current-output-dir duplicate/noise and startup metrics:
the latest plotted sample has `duplicateShareCurrent=0` and current summary
startup failures of `0`. The same sample has `0` quality issues, `0`
warnings, a false headroom flag, and `426.5G` free memory. The copied novelty
state is in `supervisor-active-run-dirs` mode with one enabled coverage-guided
browser group, `novelty-ws-lifecycle`. Historical aggregate duplicate/noise
remains context; the live graph status comes from current-output-dir duplicate
share and current summary startup failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal, but its latest nonempty feedback-action reports a real
mitigation: fault-only metadata no longer counts as product evidence for
startup/no-analysis gates, the active control plane was restarted, and the
post-restart current root had no current signatures. That supports the clean
current duplicate/startup graph without proving closure. The same feedback file
keeps broader cross-generation duplicate-family capping as follow-up and
preserves analysis for real product-evidence failures.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T065712Z`, keeps the stack through
`PR15C-on-PR14B` but inserts `PR03B` after PR03 for browser restoreRevision
CRDT invalidation. It says `ee0d01a82e12` is PR03-family work, keeps seed
`1020002` final-stack-only, rejects generic PR18x planning, and leaves rebuilt
validation, filing, product-code edits, and broad/final-stack fuzz deferred.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix synthesis rejects capacity expansion and says the mix snapshot should
not drive lane-count decisions until controller/accounting state is regenerated
cleanly. The native-harness action smoke-validated the lower-level
coverage-guided harness, but reports the parser lane active and the primary
rich-text CRDT lane held, while the graph's current lower-level label is
rich-text CRDT. The protocol-server action validated an HTTP polling REST
harness with direct smoke, launcher smoke, and a storage regression, but the
refreshed graph still has `0` counted `protocol-server`, `backend-api`, and
standalone `fuzz-assertion` executions. Protocol-server therefore remains an
accounting or continuity gap in this report. The latest execution bucket has
about `660` browser/e2e and `173,376` unit-property test executions/hour, with
`0`
coverage-guided-lower-level and `0` transport/integration in that bucket. The
next narrow operational checks are watching the stricter duplicate/noise gating
work, regenerating the level-mix controller view, resolving protocol
accounting/continuity, continuing PR split owner gates, and rebuilding
validation before any final-stack fuzz or filing claim.
