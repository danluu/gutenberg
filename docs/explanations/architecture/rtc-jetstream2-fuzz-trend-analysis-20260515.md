# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T08:10:26Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T07:56:38.729Z`,
  `lastUpdatedAt=2026-05-17T08:05:57.638Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1893` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T08:05:57Z`, coverage files grew from `272` to `42120`, a delta of
`41848`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
mixed: `duplicateShareCurrent` is `1`, while current summary startup failures
are `0`. The same monitor pass has `0` quality issues, `0` warnings, a true
headroom flag, and `428.1G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context. The latest
historical aggregate duplicate share is `0.3519`, but it is not used as the
plotted live health signal.

Persona-loop evidence supports the clean startup snapshot but rejects duplicate
closure. The latest duplicate/noise synthesis, `20260517T075352Z`, treats the
issue as control-plane gating/state: strict no-product startup noise is mostly
blocked, but stale/current-run state, high thresholds, missing `no-analysis.json`
files, or consumers launching before stale/no-analysis checks can still leak
known noise. Its matching feedback-action file is empty, so no newer action
supersedes that synthesis. Broad suppression of product-evidence failures should
be rejected.

The newest PR-split synthesis, `20260517T075636Z`, and latest non-empty
feedback-action, `20260517T072937Z`, reject a filing-ready or final-stack-fuzz
interpretation. They also reject the older read that PR07C is still the restack
blocker: newer finalization evidence has PR03B-based `ready-pr03b/*` refs and a
validation-only sidecar head. Filing is still blocked by seed `1020002`, rebuilt
validation, focused gates, final-stack fuzz, and fresh audit/manifest work.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=1` and
current summary startup failures of `0`. It also has `0` quality issues, `0`
warnings, `428.1G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs` and lists two enabled groups:
`novelty-ws-lifecycle` and `novelty-ws-persistence-no-title`. Its paused groups
include startup-noise cooldowns for real-user editing, HTTP persistence, and
real-user rich text. The latest duplicate/noise synthesis treats current
startup handling as mostly suppressed, but not closed; it calls for narrow
current-run hardening around no-product known-noise thresholds,
`no-analysis.json`, stale-root checks, and consumer backstops, while keeping
product-evidence failures visible. The graph's current duplicate share therefore
overrides a clean-closure read even though current summary startup failures are
zero.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T08:00:00Z` still show bursty CPU and
load pressure. The latest 25 CPU samples range from `37.5%` to `96.5%`
utilization, with the latest sample at `71.4%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `10` of those `25` sampled
windows, and at least one of the three load windows exceeded it in `18` of
`25`. The latest sampled 1/5/15-minute load is `46.31`, `56.16`, and `60.49`
against `64` logical CPUs. Raw memory remains ample, and the latest monitor
headroom flag is true.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state is in `supervisor-active-run-dirs`
mode and has two enabled groups: `novelty-ws-lifecycle` and
`novelty-ws-persistence-no-title`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest synthesis says the current
strict no-product startup family is mostly blocked in normal triage and
analysis, but it still rejects treating that as full closure because stale
old-root state, thresholding, missing no-analysis state, and consumer launch
backstops can leak known no-product noise into current scheduling. The latest
feedback-action file is empty; prior consumer-gate work remains context, but the
current synthesis is the live persona-loop evidence. The remaining risk is
current-root actionability/accounting consistency, not historical aggregate
duplicate/noise as a live health signal.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `27` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
lower-level activity in `unit-property` and one plotted
`coverage-guided-lower-level` lane. The latest level-mix synthesis,
`20260517T075154Z`, rejects adding capacity before accounting is fixed. It says
the useful current mix is browser-heavy plus one trustworthy lower-level lane,
one unit/property lane, and one protocol lane, while fake `/tmp` review roots,
duplicate lower-level event copies, fuzz-assertion misclassification, and the
protocol marker/live-root mismatch are corrected. Its matching feedback-action
file is empty. This report treats the graph as a concentration signal, not as
authority to add browser, backend/API, or fuzz-assertion lanes; it also records
the persona-loop contradiction that protocol-server is active in gate context
even though the plotted mix CSV still lacks a protocol-server row.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; live fuzzing is still concentrated in
browser/e2e lanes. The native-harness persona loop labels the lower-level work
honestly as Node/Jest plus V8 coverage rather than AFL/libFuzzer. The latest
native-harness synthesis, `20260517T075619Z`, keeps rich-text CRDT merge as the
first isolated lower-level target and parser/serialization second; its matching
action file is empty. `transport-integration` has historical activity but no
current counted rate. The latest protocol-server synthesis,
`20260517T075818Z`, and latest action, `20260517T074407Z`, keep the HTTP
polling REST harness as the ready server target and validate it with direct
runner smoke plus launcher smoke, both passing one seed and `13` protocol cases.
The refreshed execution graph still has `0` counted `protocol-server`
executions, so this is an accounting or continuity gap rather than evidence the
harness is absent.
`backend-api` and standalone `fuzz-assertion` remain `blocked`/`0` in the graph.
The latest fuzz-only assertion apply added browser sync-manager and HTTP polling
diagnostics and restarted affected browser loops, but this is browser-facing
assertion hardening, not a separate counted `fuzz-assertion` lane in these
graphs.

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

The latest collected execution data has about `4,316,457` completed test
executions: `100,460` browser/e2e, `3,006` transport/integration, `3,784,656`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket, `2026-05-17T08:00:00Z`, reports about `884` browser/e2e test
executions/hour, `139,664` unit-property executions/hour, and `0` for
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
`430` unique likely-real outputs over about `1,746.1` runner-hours, or `24.63`
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

Current unique bug-output candidate rates are: browser/e2e `4,664` candidates
over `1,746.1` runner-hours (`267.10` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `16.2` runner-hours
(`12.33` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,626.4` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `703.0` for unit/property.

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
| `multi-reload-lifecycle` | 3151 | 102 | 0 | 3.2% |
| `revision-persistence` | 4277 | 150 | 0 | 3.5% |
| `parser-serialization` | 3062 | 144 | 0 | 4.7% |
| `real-user-editing` | 6206 | 437 | 0 | 7.0% |
| `parser-transform` | 4022 | 393 | 0 | 9.8% |
| `common-blocks` | 3828 | 380 | 0 | 9.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5947 | 1072 | 0 | 18.0% |
| `long-session-large-doc` | 2486 | 449 | 0 | 18.1% |
| `persistence-no-title` | 2999 | 648 | 0 | 21.6% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 305 | 500 |
| real-user body save/reload next coverage tier | 364 | 500 |
| action ui-heading-shortcut next coverage tier | 762 | 1000 |
| action reload-post-action next coverage tier | 784 | 1000 |
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
review, `20260517T075636Z`, took `7.3` minutes. The newest completed window
shows review cycle `20260517T072937Z` running from `2026-05-17T07:29:37Z` to
`2026-05-17T07:36:32Z`, review cycle `20260517T074713Z` running from
`2026-05-17T07:47:13Z` to `2026-05-17T07:56:31Z`, and review cycle
`20260517T075636Z` running from `2026-05-17T07:56:36Z` to
`2026-05-17T08:03:52Z`.

The newest PR-split synthesis, `20260517T075636Z`, says the split still needs
an update but is not in the older "PR07C restack conflict blocks everything"
state. It treats the `20260517T074254Z` finalization report as authoritative:
PR03B stays between PR03 and PR04, PR17/PR18/PR18x are not product slots, seed
`1020002` is final-stack-only, corrected `ready-pr03b/*` refs exist, and old
downstream `ready/*` heads are topology-stale. Filing still waits on seed
`1020002`, rebuilt validation, focused gates, final fuzz, fresh audit/manifest
work, and finalization-context assimilation.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T07:58:10Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `5`. Live health is
mixed on the required current-output-dir duplicate/noise and startup metrics:
the latest plotted sample has `duplicateShareCurrent=1` but current summary
startup failures of `0`. The same sample has `0` quality issues, `0` warnings,
a true headroom flag, and `428.1G` free memory. The copied novelty state is in
`supervisor-active-run-dirs` mode with two enabled coverage-guided browser
groups, `novelty-ws-lifecycle` and `novelty-ws-persistence-no-title`.
Historical aggregate duplicate/noise
remains context; the live graph status comes from current-output-dir duplicate
share and current summary startup failures.

The duplicate/noise persona loop rejects raw historical duplicate/noise as a
live health signal. Its latest synthesis says current strict no-product startup
noise is mostly blocked in the normal path but still calls for narrow
current-run hardening: lower no-product known-noise thresholds, strict immediate
`pre_action_bootstrap_stall` handling, reliable `no-analysis.json`, stale-root
and no-analysis consumer backstops, and reset of current-run scheduler state on
output-root rotation. Its latest feedback-action file is empty. That supports
the clean startup graph but rejects a duplicate-closure read, especially with
the latest `duplicateShareCurrent=1`. Product-evidence failures must stay
actionable.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T075636Z`, says newer finalization
evidence has corrected PR03B-based `ready-pr03b/*` refs and a validation-only
sidecar head, so the older "PR07C conflict blocks restack" read is stale.
Filing still waits on seed `1020002`, rebuilt validation, focused gates, final
fuzz, fresh audit/manifest work, and finalization-context assimilation.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix synthesis rejects capacity expansion and says the useful current lanes
are browser/e2e plus one lower-level lane, unit-property, and protocol-server
while telemetry is being repaired; its latest feedback-action file is empty.
Backend/API remains inactive, and standalone fuzz-assertion is not a clean zero
until the unaudited/misclassified sessions are reconciled. The native-harness
evidence keeps rich-text CRDT merge as the first lower-level target, and the
protocol-server action validated an HTTP polling REST harness with direct smoke
and launcher smoke. The refreshed graph still has `0` counted `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` executions, so protocol-server
remains an accounting or continuity gap in this report. The latest execution
bucket has about `884` browser/e2e test executions/hour, `139,664`
unit-property executions/hour, and `0` for transport,
coverage-guided lower-level, protocol-server, backend/API, and standalone
fuzz-assertion. The next narrow operational checks are watching the shared
duplicate/noise gating work, verifying level-mix active-lane accounting,
resolving protocol execution continuity, continuing PR split owner gates, and
rebuilding validation before any final-stack fuzz or filing claim.
