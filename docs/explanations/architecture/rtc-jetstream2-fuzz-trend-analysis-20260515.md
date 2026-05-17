# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T07:02:19Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T06:51:09.557Z`,
  `lastUpdatedAt=2026-05-17T06:56:55.696Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1875` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T06:56:55Z`, coverage files grew from `272` to `41156`, a delta of
`40884`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean on duplicate/startup: `duplicateShareCurrent` is `0`, while current
summary startup failures are `0`. The same monitor pass has `0` quality issues,
`0` warnings, a true headroom flag, and `426.7G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context. The latest
historical aggregate duplicate share is `0.3524`, but it is not used as the
plotted live health signal.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest copied duplicate/noise synthesis,
`20260517T063152Z`, says the control-plane gates use duplicated, overly broad
product-evidence predicates: injected fault metadata can make a pre-action
startup/discovery failure look actionable even without real user/editor
progress. It also says the active product-evidence signature `66397198fb9b` is
not noise and must remain analyzable. The matching feedback-action file is
empty, so no newer mitigation evidence accompanies that synthesis. This report
therefore treats the latest graph as current live status, not accepted closure.

The newest PR-split synthesis, `20260517T063739Z`, still rejects a filing-ready
or final-stack-fuzz interpretation. The `PR01` through `PR15C-on-PR14B` spine
remains usable, PR07C is accepted as a PR07B sidecar, PR17/seed `1020002` is
final-stack-only rather than product work, and generic PR18x slots should not
be created. It adds a PR03/PR07C owner gate for `ee0d01a82e12`, keeps
`a914c862c29e`/seed `5200005` owner-incomplete, and says the Cycle 240 manifest
is stale relative to the nonempty `20260517T062719Z` reload-hydration
diagnostic. The latest PR-split feedback-action, `20260517T063739Z`, applied
the Cycle 242 tail update, refreshed the manifest after that diagnostic, and
launched bounded owner jobs. It still deferred final-stack fuzz, rebuilt
combined validation, and filing.

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
warnings, `426.7G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs` and lists two enabled groups:
`novelty-ws-real-user-rich-text` and `novelty-ws-lifecycle`; the copied state
does not list current startup-noise pauses. The latest duplicate/noise
synthesis rejects treating clean-looking duplicate/startup signals as closure
because the gating predicates can still over-count injected fault metadata as
product evidence. Its matching feedback-action file is empty, so the next
claimed fix still needs evidence.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T07:00:00Z` still show bursty CPU and
load pressure. The latest 25 CPU samples range from `37.5%` to `96.5%`
utilization, with the latest sample at `76.2%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `12` of those `25`
sampled windows, and at least one of the three load windows exceeded it in
`20` of `25`. The latest sampled 1/5/15-minute load is `76.47`, `67.14`, and
`55.24` against `64` logical CPUs. Raw memory remains ample, and the latest
monitor headroom flag is true.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state is in `supervisor-active-run-dirs`
mode and has two enabled groups: `novelty-ws-real-user-rich-text` and
`novelty-ws-lifecycle`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest duplicate/noise synthesis says
the residual problem is broader than the latest clean sample: fault-only
startup/discovery failures can bypass strict suppression when injected fault
metadata is counted as product evidence. The latest duplicate/noise
feedback-action file is empty. The residual risk is control-plane classification
and sparse-root accounting, not a historical aggregate duplicate/noise health
signal.

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
`20260517T064327Z`, rejects expanding capacity and says the immediate action is
controller/accounting restart or regeneration, not more browser/backend/protocol
lanes. It also says the current mix snapshot should not be trusted until
telemetry defects are fixed: coverage-guided supervisor state is contradictory,
browser lanes may be counted from stale configured state, protocol throughput
can be undercounted, and zero-lane backend/API and fuzz-assertion status should
be held or blocked rather than `ok`. The matching feedback-action file is
empty, so this report treats the graph as a concentration signal, not as
authority to add browser, protocol, backend/API, or fuzz-assertion lanes.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; live fuzzing is still concentrated in
browser/e2e lanes. The native-harness persona loop labels the lower-level work
honestly as Node/Jest plus V8 coverage rather than AFL/libFuzzer. The latest
native-harness synthesis keeps the rich-text CRDT merge harness as the first
isolated lower-level target and the parser/serialization harness second; the
latest action tightened and smoke-validated the lower-level coverage-guided
harness while reporting the parser lane active and the primary rich-text CRDT
production lane held by the level-mix controller. That contradicts the graph's
single latest `coverage-guided-lower-level` group label, so this remains an
accounting view to check. `transport-integration` has historical activity but
no current counted rate. The protocol-server action validated an HTTP polling
REST harness with event accounting, direct smoke, launcher smoke, and storage
regression evidence, and the later protocol-server synthesis keeps that as the
ready server target; the refreshed graph still has `0` counted
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

The latest collected execution data has about `4,040,319` completed test
executions: `98,834` browser/e2e, `3,006` transport/integration, `3,510,144`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `28` browser/e2e test executions/hour,
`9,632` unit-property test executions/hour, `0`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour. `backend-api`, `protocol-server`,
and standalone `fuzz-assertion` levels remain at `0` executions in this
counter.

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
`387` unique likely-real outputs over about `1,720.6` runner-hours, or `22.49`
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

Current unique bug-output candidate rates are: browser/e2e `4,577` candidates
over `1,720.6` runner-hours (`266.01` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `15.1` runner-hours
(`13.25` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,642.4` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `755.4` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest profiles by likely-real triage output per 100
runner-hours are session lifecycle, permissions/auth/locks, three-user
late-join, persistence-no-title, and parser serialization. The broader
unique-output view ranks session lifecycle, multi-reload lifecycle, block
gauntlet, parser serialization, and common blocks highest. Lower-level and
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
| `multi-reload-lifecycle` | 3117 | 102 | 0 | 3.3% |
| `revision-persistence` | 4197 | 146 | 0 | 3.5% |
| `parser-serialization` | 3016 | 140 | 0 | 4.6% |
| `real-user-editing` | 6093 | 437 | 0 | 7.2% |
| `parser-transform` | 3982 | 391 | 0 | 9.8% |
| `common-blocks` | 3784 | 380 | 0 | 10.0% |
| `long-session-large-doc` | 2442 | 414 | 0 | 17.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5893 | 1061 | 0 | 18.0% |
| `persistence-no-title` | 2919 | 573 | 0 | 19.6% |

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
| action ui-heading-shortcut next coverage tier | 757 | 1000 |
| action reload-post-action next coverage tier | 773 | 1000 |
| successful real-user-editing records next coverage tier | 437 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
and completed-record depth for real-user editing.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because the harness observes both semantic state
transitions and low-level block/action combinations. The plot separates breadth
(`keys`) from repeated observations (`total_count`) so broad coverage is not
hidden inside raw event volume.

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
took roughly `6.2` to `12.2` minutes in this snapshot; the latest completed
review, `20260517T063739Z`, took `10.3` minutes. The newest completed window
shows review cycle `20260517T061137Z` running from `2026-05-17T06:11:37Z` to
`2026-05-17T06:20:03Z`, review cycle `20260517T062723Z` running from
`2026-05-17T06:27:23Z` to `2026-05-17T06:37:34Z`, and review cycle
`20260517T063739Z` running from `2026-05-17T06:37:39Z` to
`2026-05-17T06:47:57Z`.

The newest PR-split synthesis, `20260517T063739Z`, says the split still needs
split changes before filing or final-stack fuzz. It keeps the PR01 through
`PR15C-on-PR14B` spine, accepts PR07C as a PR07B sidecar, keeps PR6B as the
canonical minimal malformed-save sidecar, removes PR17/seed `1020002` as
product work, consumes `5700084` as PR05C-covered/downscoped, and rejects
generic PR18x planning. It adds a PR03/PR07C owner gate for `ee0d01a82e12` and
keeps `a914c862c29e`/seed `5200005` owner-incomplete with PR11C/PR12-first
red/green as the next check. The latest feedback-action, `20260517T063739Z`,
applied those Cycle 242 decisions, refreshed the manifest after the nonempty
`20260517T062719Z` reload-hydration diagnostic, launched bounded owner jobs,
and still deferred final-stack fuzz, rebuilt validation, filing, and product
code edits.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T06:48:52Z`, has `23`
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
warnings, a true headroom flag, and `426.7G` free memory. The copied novelty
state is in `supervisor-active-run-dirs` mode with two enabled
coverage-guided browser groups and no listed startup-noise pauses. Historical
aggregate duplicate/noise remains context; the live graph status comes from
current-output-dir duplicate share and current summary startup failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest copied duplicate/noise synthesis file, `20260517T063152Z`, says the
remaining problem is a duplicated, overly broad product-evidence predicate:
fault-only startup/discovery failures can bypass strict no-product suppression
when injected fault metadata is counted as product evidence. It also says the
active product-evidence signature `66397198fb9b` is not noise and should remain
analyzable. The matching feedback-action file is empty, so this report treats
the graph as current live status, not accepted closure.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T063739Z`, keeps the stack through
`PR15C-on-PR14B`, accepts PR07C as a sidecar, removes PR17/seed `1020002` as
product work, consumes `5700084`, adds an `ee0d01a82e12` PR03/PR07C owner gate,
and leaves `a914c862c29e` as owner-incomplete before rebuilt validation. The
latest completed feedback-action applied the Cycle 242 split-tail update,
refreshed the manifest after the nonempty reload-hydration diagnostic, and
launched bounded owner jobs. It still deferred rebuilt validation, filing,
product-code edits, and broad/final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix synthesis rejects capacity expansion and says the mix snapshot is not
reliable enough for lane-count decisions until controller/accounting state is
regenerated and telemetry defects are fixed. The native-harness action
smoke-validated the lower-level coverage-guided harness, but reports the
parser lane active and the primary rich-text CRDT lane held, which conflicts
with the graph's single current lower-level label. The protocol-server action
validated an HTTP polling REST harness with direct smoke, launcher smoke, and a
storage regression, but the refreshed graph still has `0` counted
`protocol-server`, `backend-api`, and standalone `fuzz-assertion` executions.
Protocol-server therefore remains an accounting or continuity gap in this
report. The latest execution bucket has about `28` browser/e2e and `9,632`
unit-property test executions/hour, with `0`
coverage-guided-lower-level and `0` transport/integration in that bucket. The
next narrow operational checks are watching the stricter duplicate/noise gating
work, regenerating the level-mix controller view, resolving protocol
accounting/continuity, continuing PR split owner gates, and rebuilding
validation before any final-stack fuzz or filing claim.
