# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T02:44:38Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T02:08:26.582Z`,
  `lastUpdatedAt=2026-05-17T02:42:44.236Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1808` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T02:42:44Z`, coverage files grew from `272` to `38422`, a delta of
`38150`. The monitor's visible likely-real count reached `1`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise sample is not clean:
`duplicateShareCurrent` is `1`, while current summary startup failures are `0`.
The same sample has `0` quality issues, `0` warnings, a false headroom flag, and
`425.1G` free memory. Because this is a current-output-dir signal, a high value
on a small current triage sample should trigger targeted duplicate/noise review,
not a historical conclusion about the whole project.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest duplicate/noise synthesis, `20260517T020802Z`, says the
strict current `pre_action_bootstrap_stall` consumer path is mostly sealed, but
duplicate/noise knowledge is still too local to current output dirs and
individual consumers. It calls for a conservative, product-evidence-aware
cross-run known-noise gate and better completed `likely_real` visibility. The
matching feedback-action patched the triage watcher, novelty monitor, analysis
tier, and deep-analysis tier so no-product duplicates are coalesced while
product-evidence `likely_real` results stay visible. The refreshed graph now
contradicts the feedback-action's immediately-after-restart clean read: current
startup noise is still clear, but the current output dir has one actionable
`collaboration_non_convergence` signature with visible likely-real status.

The newest PR-split synthesis, `20260517T023635Z`, still rejects a filing-ready
or final-stack-fuzz interpretation. It adopts the Cycle 222 PR6B replacement
split, keeps final-stack validation and filing blocked by PR17/seed `1020002`,
and says that seed must not block independent work. The latest feedback-action,
`20260517T021947Z`, applied the same direction: old polluted PR6B
`87e0ed20...` is do-not-file, minimal PR6B
`7b123e0ef2334a03b22e9a968d402de9da4c5379` is the replacement sidecar, and
`243411d461698180088b5280587b2fb7ad0ba8cd` is fetch-only validation evidence.
The feedback repaired stale deferred queue rows and completed the bounded loop
repair job; PR17/seed `1020002` and reload/post-save residuals remain open.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=1`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `425.1G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state currently reports `currentRunDirSource` as
`supervisor-active-run-dirs`: current triage has `1` root, `1` file, `1` raw
current signature, `1` actionable signature, `1` visible likely-real failure,
top duplicate family share `1`, and no health warnings. The current family is
`collaboration_non_convergence`, not strict startup noise. The copied
supervisor-active state has `novelty-ws-real-user-editing` enabled; the
real-user rich-text group is paused for strict startup noise. The live
startup sample is clear, but duplicate share is high on a one-signature current
sample. The latest duplicate/noise synthesis says the strict current
startup-noise path is mostly sealed while historical decisions and completed
analysis outcomes still need a shared, product-evidence-aware cross-run gate
across novelty, triage watcher, live analysis, analysis tier, and deep analysis
tier.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T02:40:00Z` show heavy CPU and load
pressure: the latest 25 CPU samples range from `44.3%` to `90.4%`
utilization, with the latest sample at `81.8%`. One-minute load exceeded the
logical CPU count in `10` of those `25` sampled windows, while the latest sampled
1/5/15-minute load is `100.64`, `84.44`, and `80.28` against `64` logical CPUs.
Raw memory remains ample, but the latest monitor headroom flag is false and the
15-minute load remains above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has `novelty-ws-real-user-editing`
enabled from supervisor-active run dirs. Four groups are paused after strict
pre-action discovery/startup failures:
`novelty-http-persistence-probe` and
`novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z`,
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`, and
`novelty-ws-real-user-rich-text` until `2026-05-17T08:12:27Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context. The current-output state now has `1` actionable
`collaboration_non_convergence` signature, top duplicate family share `1`, `1`
current root, `1` current file, `1` visible likely-real failure, and no health
warnings. The newest synthesis says no-product startup/discovery noise knowledge
is still too local to current output dirs and individual consumers, while the
feedback-action confirms product-evidence failures should remain visible rather
than being blanket-suppressed.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `26` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `1` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion. The freshest coverage-guided state has
`novelty-ws-real-user-editing` enabled, with two persistence groups, one
lifecycle group, and real-user rich text paused for startup/discovery noise.

Live fuzzing is still concentrated in browser/e2e lanes, but lower-level work is
active in `unit-property` and `coverage-guided-lower-level`, including rich-text
offset-space and rich-text CRDT lanes. No active `transport-integration`,
`backend-api`, `protocol-server`, or standalone fuzz-only assertion lanes appear
in the latest level-mix snapshot.

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

The latest collected execution data has about `3,029,549` completed test
executions: `95,112` browser/e2e, `3,006` transport/integration, `2,624,000`
unit-property, and `307,431` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `832` browser/e2e test executions/hour,
`173,376` unit-property test executions/hour, `27,656`
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
`230` unique likely-real outputs over about `1,626.5` runner-hours, or `14.14`
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
candidates still need follow-up before being treated as maintainer-ready bugs.

Current unique bug-output candidate rates are: browser/e2e `4,257` candidates
over `1,626.5` runner-hours (`261.73` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `14.7` runner-hours
(`13.62` per 100 runner-hours), and unit/property `1` over `11.0` runner-hours
(`9.11` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,794.2` for browser/e2e,
`4,537.5` for transport/integration, `1,082.8` for coverage-guided lower-level,
and `865.1` for unit/property.

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
| `multi-reload-lifecycle` | 2949 | 94 | 0 | 3.2% |
| `revision-persistence` | 3947 | 127 | 0 | 3.2% |
| `parser-serialization` | 2811 | 127 | 0 | 4.5% |
| `real-user-editing` | 5752 | 418 | 0 | 7.3% |
| `parser-transform` | 3739 | 362 | 0 | 9.7% |
| `common-blocks` | 3582 | 367 | 0 | 10.2% |
| `long-session-large-doc` | 2281 | 321 | 0 | 14.1% |
| `persistence-no-title` | 2750 | 449 | 0 | 16.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5594 | 1005 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 278 | 500 |
| real-user body save/reload next coverage tier | 337 | 500 |
| action ui-heading-shortcut next coverage tier | 706 | 1000 |
| action reload-post-action next coverage tier | 707 | 1000 |
| successful real-user-editing records next coverage tier | 418 | 500 |
| action ui-format-paragraph next coverage tier | 990 | 1000 |

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

With the live loop at `max_parallel=6`, `223` completed review cycles took
roughly `2.9` to `11.4` minutes in this snapshot; the latest completed review,
`20260517T023635Z`, took `6.2` minutes. The event log shows review cycle
`20260517T021947Z` finishing at `2026-05-17T02:27:24Z`, feedback action for
cycle 222 running from `2026-05-17T02:27:24Z` to `2026-05-17T02:36:30Z`, review
cycle `20260517T023635Z` starting at `2026-05-17T02:36:35Z` and finishing at
`2026-05-17T02:42:48Z`, and the next review cycle `20260517T024253Z` starting
at `2026-05-17T02:42:53Z`.

The newest PR-split synthesis, `20260517T023635Z`, says the split still needs
change before filing and final-stack validation remains blocked. It adopts Cycle
222's PR6B minimal replacement at
`7b123e0ef2334a03b22e9a968d402de9da4c5379`, treats
`validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at
`243411d461698180088b5280587b2fb7ad0ba8cd` as fetch-only validation evidence,
and marks old PR6B, old PR6B+PR15C validation, raw deferred malformed-save refs,
and the old PR16 tail historical. PR17/seed `1020002` blocks final-stack
validation, focused seed rerun, broad final-stack fuzz, and filing only.

The latest feedback-action file, `20260517T021947Z`, applied that direction. It
updated `current-pr-split.md`, repaired stale deferred queue rows so downscoped
malformed-save and HTTP rows cannot relaunch, wrote current-run PR6B audit and
push-manifest artifacts, and completed
`rtc-cycle222-loop-repair-20260517T023022Z` with rc `0`. PR17/seed `1020002`,
reload/post-save residuals starting with `5200005`, and any still-open `5300002`
classification remain separate work; no broad fuzz or duplicate PR6B conflict
job was launched.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T02:35:11Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`1`, and unmet goals are down from the initial `24` to `6`. Live health is
mixed: the latest plotted current-output-dir sample has
`duplicateShareCurrent=1`, current summary startup failures of `0`, `0` quality
issues, `0` warnings, false headroom, and `425.1G` free memory. The copied
novelty state shows `1` current root, `1` current file, `1` raw current
signature, `1` actionable signature, `1` visible likely-real failure, top
duplicate family share `1`, and no health warnings.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest duplicate/noise synthesis says the strict current startup-noise consumer
path is mostly sealed, but historical non-actionable decisions and completed
likely-real results are not consistently shared across the scheduler, triage
watcher, live analysis, analysis tier, and deep analysis tier. Its matching
feedback-action implemented conservative no-product duplicate coalescing and
likely-real visibility fixes, then reported a clean current run immediately
after restart. The refreshed graph is later and stricter: startup noise is still
clear, but current duplicate share is `1` because the only current signature is a
visible likely-real `collaboration_non_convergence` item. That rejects closure
and also rejects blanket suppression of product-evidence timeout, assertion, or
non-convergence failures.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The newest copied synthesis, `20260517T023635Z`, adopts
Cycle 222's minimal PR6B sidecar, treats the PR6B+PR15C sidecar as fetch-only
validation evidence, and says final-stack validation, broad final-stack fuzz,
and filing remain blocked by PR17/seed `1020002`. The latest feedback-action,
`20260517T021947Z`, applied that consensus by updating the split status,
repairing downscoped deferred queue rows, writing PR6B audit/manifest artifacts,
and completing the loop-repair job. Reload/post-save residuals remain separate
reduction work; broad fuzz and filing are still blocked.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest partial execution bucket has about `832` browser/e2e test
executions/hour, `173,376` unit-property test executions/hour, `27,656`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are durable no-product startup
noise suppression across novelty/supervisor/consumers, continued resource
headroom monitoring, completion of the bounded reload/post-save replay, PR6B
minimal conflict resolution, and a decision on seed `1020002` reclassification
versus one focused browser/provider diagnostic.
