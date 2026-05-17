# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T02:19:11Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T02:08:26.582Z`,
  `lastUpdatedAt=2026-05-17T02:15:52.026Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1800` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T02:15:52Z`, coverage files grew from `272` to `38347`, a delta of
`38075`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `6` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise sample is currently clear:
`duplicateShareCurrent` is `0`, and current summary startup failures are `0`.
The same sample has `0` quality issues, `0` warnings, a true headroom flag, and
`434.6G` free memory. The copied novelty state is using
`supervisor-active-run-dirs`; current triage has `1` root, `1` file, `0` raw
signatures, `0` actionable signatures, no visible likely-real failures, top
duplicate family share `0`, and no health warnings.
This report treats current-output-dir duplicate/noise and summary startup
failure metrics as live graph status; historical aggregate duplicate/noise is
only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest duplicate/noise synthesis, `20260517T020802Z`, says the
strict current `pre_action_bootstrap_stall` consumer path is mostly sealed, but
duplicate/noise knowledge is still too local to current output dirs and
individual consumers. It calls for a conservative, product-evidence-aware
cross-run known-noise gate and better completed `likely_real` visibility. Its
matching feedback-action file is empty, so no new duplicate/noise action was
recorded in the copied persona inputs.

The newest PR-split synthesis file, `20260517T021354Z`, is zero bytes, so the
latest nonempty synthesis is `20260517T015400Z`. It rejects a filing-ready or
final-stack-fuzz interpretation, keeps PR6B as a PR06A sidecar, and says PR6B
must be reconciled against the smaller malformed-save candidate before filing.
The matching feedback-action applied that direction: it marked current PR6B
`87e0ed20ab8e` as not file-ready, promoted smaller candidate `4b2debfbf77` as
the PR6B replacement target pending restack onto PR06A, recorded the Cycle 220
update, completed a PR6B minimal-reconcile job, completed zero-feedback repair,
and left PR6B conflict resolution running. PR17/seed `1020002`, final-stack
validation, final-stack fuzz, and filing remain blocked; independent bounded
PR6B reconciliation and reload/post-save replay continue.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `434.6G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state currently reports `currentRunDirSource` as
`supervisor-active-run-dirs`: current triage has `1` root, `1` file, `0` raw
current signatures, `0` actionable signatures, no visible likely-real failures,
top duplicate family share `0`, and no health warnings. The copied
supervisor-active state has `novelty-ws-real-user-editing` enabled; the
real-user rich-text group is paused for strict startup noise. The live
duplicate/startup sample is clear, but this is not a closure signal. The latest
duplicate/noise synthesis says the strict current startup-noise path is mostly
sealed while historical decisions and completed analysis outcomes still need a
shared, product-evidence-aware cross-run gate across novelty, triage watcher,
live analysis, analysis tier, and deep analysis tier.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T02:10:00Z` show heavy CPU and load
pressure: the latest 25 CPU samples range from `32.8%` to `90.4%`
utilization, with the latest sample at `71.9%`. One-minute load exceeded the
logical CPU count in `9` of those `25` sampled windows, while the latest sampled
1/5/15-minute load is `41.37`, `68.83`, and `113.24` against `64` logical
CPUs. Raw memory remains ample and current monitor headroom is true, but the
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
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context. The current-output state now has `0` actionable signatures, top
duplicate family share `0`, `1` current root, `1` current file, and no health
warnings, while the newest synthesis says no-product startup/discovery noise
knowledge is still too local to current output dirs and individual consumers.
Product-evidence timeout, assertion, or non-convergence failures must remain
visible rather than being blanket-suppressed.

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

The latest collected execution data has about `2,934,355` completed test
executions: `94,720` browser/e2e, `3,006` transport/integration, `2,542,128`
unit-property, and `294,501` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `432` browser/e2e test executions/hour,
`52,976` unit-property test executions/hour, `8,448`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` levels remain
at `0` executions in this counter.

## Bug-Finding Effectiveness

![Likely-real bug-finding effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

Likely-real effectiveness counts non-duplicate triage results classified
`likely_real` per 100 runner-hours, deduped by canonical bug key and attributed
to the failure first-seen time. The compute proxy is summed runner wall-clock
`durationMs` from lane `events.ndjson`, reported as runner-hours. This is not
measured CPU time, so it is best interpreted as per-runner efficiency rather
than per-core efficiency.

On that confirmed metric, browser/e2e currently dominates: `202` unique
likely-real findings over about `1,615.6` runner-hours, or `12.50` likely-real
findings per 100 runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` all have `0` confirmed likely-real findings in the collected
triage rows so far. That does not prove the lower-level lanes are unproductive;
it means their current findings have not yet flowed through the same
non-duplicate likely-real triage path.

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `4,816.5` for browser/e2e,
`4,537.5` for transport/integration, `1,113.7` for coverage-guided lower-level,
and `857.8` for unit/property.

![Likely-real bug-finding effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest confirmed profiles by likely-real findings
per 100 runner-hours are `permissions-auth-locks` (`26.17`),
`session-lifecycle` (`25.74`), `three-user-late-join` (`18.39`),
`block-gauntlet` (`16.22`), and `persistence-no-title` (`14.54`). The
pre-triage failure-candidate view has similar but not identical pressure:
`permissions-auth-locks`, `async-server-blocks`, `three-user-late-join`,
`long-session-large-doc`, and `persistence-no-title` are the top current
browser/e2e sources. Lower-level and transport lanes should continue to be
judged partly by this candidate-rate graph until their triage pipeline is
producing comparable likely-real/non-duplicate findings.

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
| `revision-persistence` | 3934 | 126 | 0 | 3.2% |
| `parser-serialization` | 2793 | 124 | 0 | 4.4% |
| `real-user-editing` | 5736 | 403 | 0 | 7.0% |
| `parser-transform` | 3739 | 362 | 0 | 9.7% |
| `common-blocks` | 3582 | 367 | 0 | 10.2% |
| `long-session-large-doc` | 2281 | 321 | 0 | 14.1% |
| `persistence-no-title` | 2750 | 449 | 0 | 16.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5573 | 1001 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 263 | 500 |
| real-user body save/reload next coverage tier | 322 | 500 |
| action reload-post-action next coverage tier | 691 | 1000 |
| action ui-heading-shortcut next coverage tier | 691 | 1000 |
| successful real-user-editing records next coverage tier | 403 | 500 |
| action ui-format-paragraph next coverage tier | 974 | 1000 |

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

With the live loop at `max_parallel=6`, `220` completed review cycles took
roughly `2.9` to `11.4` minutes in this snapshot; the latest completed review,
`20260517T015400Z`, took `7.2` minutes. The event log shows review cycle
`20260517T015400Z` starting at `2026-05-17T01:54:00Z`, finishing at
`2026-05-17T02:01:13Z`, feedback action finishing at
`2026-05-17T02:13:49Z`, and the next review cycle, `20260517T021354Z`,
starting at `2026-05-17T02:13:54Z`.

The newest PR-split synthesis file, `20260517T021354Z`, is empty. The latest
nonempty synthesis, `20260517T015400Z`, says the split still needs change before
filing and final-stack fuzz remains blocked by PR17/seed `1020002`, though that
seed must not block independent work. It keeps the sidecar topology: PR6B sits
after PR06A, PR07A-PR15C stay as-is, PR6B+PR15C is validation-only, and PR17
remains a separate proof/reclassification or focused diagnostic gate before
final validation and fuzz. It rejects the old linear `PR6B -> PR07A-PR15C`
restack, the post-PR15C PR16 tail, broad fuzz, and final-stack fuzz.

The matching `20260517T015400Z` feedback-action applied that direction. It
marked current PR6B `87e0ed20ab8e` as not file-ready because it includes extra
`cc3d7bf663a` / `crdt-blocks.ts` work, promoted smaller candidate
`4b2debfbf77` as the PR6B replacement target pending restack onto PR06A, and
recorded the Cycle 220 update. It completed
`rtc-pr06b-minimal-reconcile-20260517T020421Z` with an `actions.js` conflict
recorded, completed `rtc-loop-zero-feedback-repair-20260517T020934Z`, and left
`rtc-pr06b-minimal-conflict-resolve-20260517T021111Z` running. No duplicate
reload/post-save replay, final-stack validation, final-stack fuzz, or filing was
launched.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T02:07:49Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down from the initial `24` to `6`. Live health is
mixed: the latest plotted current-output-dir sample has
`duplicateShareCurrent=0`, current summary startup failures of `0`, `0` quality
issues, `0` warnings, true headroom, and `434.6G` free memory. The copied
novelty state shows `1` current root, `1` current file, `0` raw current
signatures, `0` actionable signatures, no visible likely-real failures, top
duplicate family share `0`, and no health warnings.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest duplicate/noise synthesis says the strict current startup-noise consumer
path is mostly sealed, but historical non-actionable decisions and completed
likely-real results are not consistently shared across the scheduler, triage
watcher, live analysis, analysis tier, and deep analysis tier. Its matching
feedback-action file is empty. The refreshed graph says current duplicate noise
and summary startup failures are currently clear, but persona-loop evidence
still does not support broad expansion or blanket suppression of
product-evidence timeout, assertion, or non-convergence failures.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The latest nonempty synthesis keeps PR6B as a PR06A
sidecar, keeps PR07A-PR15C as-is, treats PR6B+PR15C as validation-only, and
keeps PR17/seed `1020002` as a separate proof/reclassification or focused
diagnostic gate before rebuilt final validation. The latest feedback action did
act on that consensus by marking current PR6B not file-ready, choosing the
smaller malformed-save candidate as the replacement target, completing bounded
PR6B reconcile and zero-feedback repair jobs, and leaving narrow PR6B conflict
resolution active. Final-stack validation, final-stack fuzz, filing, broad fuzz,
extra browser lanes, and a PR18x branch remain blocked.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active.
Transport-integration has historical completed executions but no latest-bucket
rate; the latest partial execution bucket has about `432` browser/e2e test
executions/hour, `52,976` unit-property test executions/hour, `8,448`
coverage-guided-lower-level test executions/hour, `0` transport/integration
test executions/hour, and `0` backend-api/protocol-server/fuzz-assertion
executions. The next narrow operational checks are durable no-product startup
noise suppression across novelty/supervisor/consumers, continued resource
headroom monitoring, completion of the bounded reload/post-save replay, PR6B
minimal conflict resolution, and a decision on seed `1020002` reclassification
versus one focused browser/provider diagnostic.
