# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T03:26:34Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T03:10:47.043Z`,
  `lastUpdatedAt=2026-05-17T03:22:32.167Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1818` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T03:22:32Z`, coverage files grew from `272` to `39101`, a delta of
`38829`. The monitor's visible likely-real count reached `1`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean: `duplicateShareCurrent` is `0`, and current summary startup failures are
`0`. The same sample has `0` quality issues, `0` warnings, a false headroom
flag, and `418.4G` free memory. Because this is a current-output-dir signal, it
describes live duplicate/noise and startup status only; historical aggregate
duplicate/noise remains context.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest duplicate/noise synthesis, `20260517T024456Z`, says the
duplicate/noise issue is a control-plane policy leak: current-run no-product
noise knowledge is too local and does not consistently gate active producers,
sibling run dirs, or downstream consumers. It allows a narrow current-run gate
for no-product or already non-actionable signatures, but explicitly rejects
suppressing product-evidence classes such as `collaboration_non_convergence`.
The latest duplicate/noise feedback-action file, `20260517T024456Z`, applied
that direction: it added a current-run duplicate/noise hold for matching active
producer run dirs only when likely-real/product-evidence signatures are absent,
and made missing or invalid supervisor state a wait state in live analysis.
The refreshed graph supports clean current-output-dir duplicate/noise and
startup status with no current health warnings, but the persona loop still
rejects treating the duplicate/noise problem as fully closed until a fresh
recurrence exercises the new producer hold while product-evidence failures
remain visible.

The newest PR-split synthesis, `20260517T031103Z`, rejects a filing-ready,
final-stack-fuzz, or wait-only interpretation. Cycle 224 remains the
authoritative split shape, old PR6B/PR16 stays dropped, minimal PR6B remains the
PR06A sidecar, and PR14 now has a conditional `7110017` coverage gate before
PR15A. `5200005` and `1060015` are evidence-only until deterministic reducers
prove ownership. The matching feedback-action applied Cycle 226 feedback,
updated `current-pr-split.md`, and launched bounded jobs for PR14/`7110017`,
`5200005`, and `1060015`. PR17/seed `1020002` plus the residual gates still
block rebuilt validation, focused final seed rerun, final-stack fuzz, and
filing; no broad fuzz or final-stack fuzz was launched.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `418.4G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state currently reports `currentRunDirSource` as
`supervisor-active-run-dirs`: current triage has `1` root, `1` file, `0` raw
current signatures, `0` actionable signatures, `0` visible likely-real
failures, and top duplicate family share `0`. It has no current health
warnings. The copied state has an active real-user-editing run dir but an empty
`enabledGroups` array, with real-user editing, real-user rich text, lifecycle,
and persistence groups paused for strict startup/discovery noise. The latest
duplicate/noise synthesis still rejects broad suppression of `timeout`,
`unknown`, `late_session_awareness_stall`, or
`collaboration_non_convergence` families. The latest action implemented a
conservative producer hold, but product-evidence and likely-real signatures
must remain analyzable.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T03:20:00Z` show heavy CPU and load
pressure, but the latest CPU sample is below the previous spike: the latest 25
CPU samples range from `46.1%` to `90.5%` utilization, with the latest sample
at `66.9%`. One-minute load exceeded the logical CPU count in `13` of those
`25` sampled windows, while the latest sampled 1/5/15-minute load is `69.95`,
`59.8`, and `95.48` against `64` logical CPUs. Raw memory remains ample, but
the latest monitor headroom flag is false and the 1- and 15-minute load remain
above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has an active
`novelty-ws-real-user-editing` run dir from supervisor-active run dirs, but its
`enabledGroups` array is empty. Five groups are paused after strict pre-action
discovery/startup failures:
`novelty-http-persistence-probe` and
`novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z`,
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`,
`novelty-ws-real-user-rich-text` until `2026-05-17T08:12:27Z`, and
`novelty-ws-real-user-editing` until `2026-05-17T09:22:26Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context. The current-output state now has `0` actionable signatures, top
duplicate family share `0`, `1` current root, `1` current file, `0` visible
likely-real failures, and no health warnings. The newest synthesis says
no-product startup/discovery noise knowledge must be shared across producers
and consumers, while the feedback-action confirms product-evidence failures
should remain visible rather than being blanket-suppressed.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `25` browser/e2e lanes across `25` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `9` focused-shards, `6` gap-booster, and `10`
strict-expansion. The freshest coverage-guided state has one active
real-user-editing run dir, but the copied novelty state lists no enabled groups
and has real-user editing, real-user rich text, lifecycle, and persistence
groups paused for startup/discovery noise.

Live fuzzing is still concentrated in browser/e2e lanes. Lower-level work is
also active in `unit-property` and `coverage-guided-lower-level`: the latest
lower-level rows are rich-text offset-space and rich-text CRDT merge lanes. The
latest level-mix persona synthesis rejects adding more browser capacity and
says the first fix is accounting/materialization repair, followed by exactly
one deterministic parser/serialization lower-level lane. The latest protocol
persona output specifies a `protocol-server` HTTP polling harness shape, but
the refreshed level-mix and execution counters still show `protocol-server` at
`0`; it has not yet appeared as live counted graph activity. No active
`transport-integration`, `backend-api`, or standalone `fuzz-assertion` lane
appears in the latest level-mix snapshot.

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

The latest collected execution data has about `3,188,983` completed test
executions: `96,298` browser/e2e, `3,006` transport/integration, `2,761,256`
unit-property, and `328,423` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `952` browser/e2e test executions/hour,
`149,296` unit-property test executions/hour, `21,760`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` levels remain
at `0` executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

This graph has been relabeled because it is not a total bug-finding graph. It
counts only non-duplicate `.triage-watcher/**/result.json` rows classified
`likely_real` per 100 runner-hours, deduped by canonical bug key and attributed
to the failure first-seen time. The compute proxy is summed runner wall-clock
`durationMs` from lane `events.ndjson`, reported as runner-hours. This is best
interpreted as per-runner triage-output efficiency, not per-core efficiency and
not all bugs found by fuzzing.

On that confirmed triage-output metric, browser/e2e currently dominates:
`250` unique likely-real outputs over about `1,644.4` runner-hours, or `15.20`
likely-real outputs per 100 runner-hours. `transport-integration`,
`unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` still have `0` confirmed
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

Current unique bug-output candidate rates are: browser/e2e `4,297` candidates
over `1,644.4` runner-hours (`261.31` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `15.4` runner-hours
(`13.01` per 100 runner-hours), and unit/property `1` over `11.6` runner-hours
(`8.59` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within-level candidate output is still dominated by browser/e2e raw signatures,
with transport/integration also producing a visible raw-signature stream. The
lower-level lanes now show nonzero assertion-output candidates, but the counts
are small because those lanes are much newer and still lack the same mature
promotion path into confirmed `.triage-watcher` likely-real results.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `4,794.6` for browser/e2e,
`4,537.5` for transport/integration, `1,034.0` for coverage-guided lower-level,
and `850.5` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest confirmed profiles by likely-real triage
output per 100 runner-hours are session lifecycle, permissions/auth/locks,
persistence-no-title, three-user late-join, and block-gauntlet. The pre-triage
failure-candidate view has similar but not identical pressure:
`permissions-auth-locks`, `async-server-blocks`, `three-user-late-join`,
`long-session-large-doc`, and `persistence-no-title` are the top current
browser/e2e sources. Lower-level and transport lanes should continue to be
judged partly by the new unique-output candidate graphs until their triage
pipeline is producing comparable likely-real/non-duplicate results.

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
| `multi-reload-lifecycle` | 2984 | 95 | 0 | 3.2% |
| `revision-persistence` | 4014 | 136 | 0 | 3.4% |
| `parser-serialization` | 2870 | 133 | 0 | 4.6% |
| `real-user-editing` | 5826 | 434 | 2 | 7.4% |
| `parser-transform` | 3787 | 368 | 0 | 9.7% |
| `common-blocks` | 3614 | 368 | 0 | 10.2% |
| `long-session-large-doc` | 2313 | 348 | 0 | 15.0% |
| `persistence-no-title` | 2781 | 451 | 0 | 16.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5681 | 1024 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 295 | 500 |
| real-user body save/reload next coverage tier | 354 | 500 |
| action ui-heading-shortcut next coverage tier | 729 | 1000 |
| action reload-post-action next coverage tier | 736 | 1000 |
| successful real-user-editing records next coverage tier | 434 | 500 |

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

With the live loop at `max_parallel=6`, completed review cycles took roughly
`2.9` to `11.4` minutes in this snapshot; the latest completed review,
`20260517T031103Z`, took `6.7` minutes. The event log shows review cycle
`20260517T024253Z` running from `2026-05-17T02:42:53Z` to
`2026-05-17T02:52:06Z`, feedback action for cycle 224 running from
`2026-05-17T02:52:06Z` to `2026-05-17T03:00:58Z`, review cycle
`20260517T030103Z` running from `2026-05-17T03:01:03Z` to
`2026-05-17T03:10:58Z`, review cycle `20260517T031103Z` running from
`2026-05-17T03:11:03Z` to `2026-05-17T03:17:43Z`, and feedback action for
cycle 226 running from `2026-05-17T03:17:43Z` to `2026-05-17T03:25:12Z`.

The newest PR-split synthesis, `20260517T031103Z`, says the split still needs
change before filing and final-stack validation remains blocked. It keeps Cycle
224 as authoritative: old PR6B/PR16 is dead, PR6B minimal at
`7b123e0ef2334a03b22e9a968d402de9da4c5379` remains the PR06A sidecar,
`validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` remains
fetch-only validation evidence, and PR14 now has a conditional seed `7110017`
gate before PR15A. `5200005` and `1060015` are not ready PRs; they remain
residual evidence gates until reducers prove ownership. PR17/seed `1020002`
plus those residual gates block rebuilt validation, focused seed rerun,
final-stack fuzz, and filing.

The matching feedback-action file, `20260517T031103Z`, applied Cycle 226
feedback. It updated `current-pr-split.md`, recorded the PR14/`7110017` gate
and the `5200005`/`1060015` evidence-only status, and launched bounded jobs
`rtc-cycle226-pr14-7110017`, `rtc-cycle226-5200005-reduce`, and
`rtc-cycle226-1060015-repro`. It explicitly deferred final-stack fuzz, filing,
rebuilt combined validation, and focused `1020002` until the gates are settled;
no broad fuzz or final-stack fuzz was launched.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T03:18:34Z`, has `29`
suggested rows totaling `11427` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), `PR 5B` (`883`), and
`PR 13B3` (`758`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`1`, and unmet goals are down from the initial `24` to `5`. Live health is
clean on the current-output-dir duplicate/noise and startup metrics: the latest
plotted sample has `duplicateShareCurrent=0` and current summary startup
failures of `0`. The same sample has `0` quality issues, `0` warnings, a false
headroom flag, and `418.4G` free memory. The copied novelty state shows `1`
current root, `1` current file, `0` raw current signatures, `0` actionable
signatures, `0` visible likely-real failures, top duplicate family share `0`,
and no current health warnings.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest duplicate/noise synthesis says no-product startup/noise records can still
leak because duplicate/noise knowledge is too local to each run, generation, or
consumer. It supports a narrow current-run gate for no-product or already
non-actionable signatures, and rejects blanket suppression of product-evidence
timeout, assertion, or non-convergence failures. The latest duplicate/noise
feedback-action, `20260517T024456Z`, implemented a conservative current-run
producer hold and live-analysis wait state for missing/invalid supervisor
state. The refreshed graph supports clean duplicate/noise startup status, but
the persona loop still rejects calling the duplicate/noise problem closed until
a fresh recurrence proves active producers, sibling run dirs, and root readiness
are gated consistently while product-evidence failures remain visible.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The newest synthesis, `20260517T031103Z`, keeps Cycle 224
as authoritative, leaves old PR6B/PR16 dropped, keeps minimal PR6B as the PR06A
sidecar, adds the PR14/`7110017` gate before PR15A, and says PR17/seed
`1020002`, `5200005`, and `1060015` must be settled before rebuilt validation,
focused `1020002`, final-stack fuzz, or filing. The latest feedback-action
applied that Cycle 226 update and launched bounded PR14/`7110017`, `5200005`,
and `1060015` jobs. No broad fuzz or final-stack fuzz was launched.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active. The latest
level-mix persona synthesis says accounting/materialization must be fixed
before trusting the mix, and the next actual target should be one
parser/serialization lower-level lane, not more browser capacity. The latest
protocol persona output defines a `protocol-server` HTTP polling harness shape,
and fuzz-only assertion feedback restarted affected browser loops, but the
refreshed graph still has `0` counted `protocol-server`, `backend-api`, and
standalone `fuzz-assertion` executions. Transport-integration has historical
completed executions but no latest-bucket rate; the latest partial execution
bucket has about `952` browser/e2e test executions/hour, `149,296`
unit-property test executions/hour, `21,760` coverage-guided-lower-level test
executions/hour, and `0` transport/integration test executions/hour. The next
narrow operational checks are exercising the new no-product producer hold,
repairing mix telemetry, settling the PR14/`7110017`, `5200005`, `1060015`,
and PR17/`1020002` gates, and then rebuilding validation before any final-stack
fuzz or filing claim.
