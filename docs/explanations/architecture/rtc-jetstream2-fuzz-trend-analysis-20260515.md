# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T03:18:11Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T03:10:47.043Z`,
  `lastUpdatedAt=2026-05-17T03:15:50.114Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1816` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T03:15:50Z`, coverage files grew from `272` to `39035`, a delta of
`38763`. The monitor's visible likely-real count reached `1`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean: `duplicateShareCurrent` is `0`, and current summary startup failures are
`0`. The same sample has `1` quality issue, `1` warning, a true headroom flag,
and `434.4G` free memory. Because this is a current-output-dir signal, it
describes live status only; historical aggregate duplicate/noise remains
context.
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
The latest duplicate/noise feedback-action file, `20260517T024456Z`, is empty;
the latest applied action remains `20260517T020802Z`, which coalesced
no-product duplicates while keeping product-evidence `likely_real` results
visible. The refreshed graph supports clean current-output-dir duplicate/noise
and startup status, but it also shows one fresh-output health warning; the
persona loop rejects treating the duplicate/noise problem as closed until the
control-plane gate and root-readiness checks are made durable.

The newest copied PR-split synthesis file, `20260517T031103Z`, is empty; the
latest non-empty synthesis, `20260517T024253Z`, still rejects a filing-ready or
final-stack-fuzz interpretation. It adopts the Cycle 222 PR6B replacement split,
keeps final-stack validation and filing blocked by PR17/seed `1020002`, and says
that seed must not block independent work. The latest feedback-action,
`20260517T024253Z`, applied Cycle 224 feedback: it reaffirmed minimal PR6B
`7b123e0ef2334a03b22e9a968d402de9da4c5379`, invalidated stale malformed-save
and HTTP deferred launches, restarted the hard-deny loop, wrote fresh PR6B audit
and manifest artifacts, and launched bounded reload/post-save and seed
`1060015` reduction. PR17/seed `1020002` still blocks rebuilt validation,
focused final seed rerun, final-stack fuzz, and filing; no broad fuzz or
final-stack fuzz was launched.

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
and current summary startup failures of `0`. It also has `1` quality issue,
`1` warning, `434.4G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state currently reports `currentRunDirSource` as
`supervisor-active-run-dirs`: current triage has `1` root, `1` file, `0` raw
current signatures, `0` actionable signatures, `0` visible likely-real
failures, and top duplicate family share `0`. It also has one health warning:
the fresh coverage-guided output dir has no behavioral coverage files yet. The
copied supervisor-active state has `novelty-ws-real-user-editing` enabled; the
real-user rich-text group is paused for strict startup noise. The live startup
and duplicate/noise sample is clear, but the fresh output-dir warning means
health is not yet fully settled. The latest duplicate/noise synthesis still says
historical/raw no-product noise can leak across control-plane accounting, and it
rejects broad suppression of `timeout`, `unknown`,
`late_session_awareness_stall`, or `collaboration_non_convergence` families.
Product-evidence and likely-real signatures must remain analyzable.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T03:10:03Z` show heavy CPU and load
pressure, but the latest sample is below the previous spike: the latest 25 CPU
samples range from `46.1%` to `90.5%` utilization, with the latest sample at
`72.4%`. One-minute load exceeded the logical CPU count in `12` of those `25`
sampled windows, while the latest sampled 1/5/15-minute load is `42.03`,
`73.09`, and `131.28` against `64` logical CPUs. Raw memory remains ample and
the latest monitor headroom flag is true, but the 5- and 15-minute load remain
above core count.

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
duplicate family share `0`, `1` current root, `1` current file, `0` visible
likely-real failures, and one fresh-output warning because behavioral coverage
files have not appeared yet under the new output dir. The newest synthesis says
no-product startup/discovery noise knowledge is still a current-run
control-plane problem, while the feedback-action confirms product-evidence
failures should remain visible rather than being blanket-suppressed.

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

Live fuzzing is still concentrated in browser/e2e lanes. Lower-level work is
also active in `unit-property` and `coverage-guided-lower-level`, including
rich-text offset-space and rich-text CRDT lanes. The latest protocol persona
output validated a `protocol-server` harness and event contract, but the
refreshed level-mix and execution counters still show `protocol-server` at `0`;
it has not yet appeared as live counted graph activity. No active
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

The latest collected execution data has about `3,158,461` completed test
executions: `96,168` browser/e2e, `3,006` transport/integration, `2,734,768`
unit-property, and `324,519` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `432` browser/e2e test executions/hour,
`43,344` unit-property test executions/hour, `6,144`
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
`244` unique likely-real outputs over about `1,640.8` runner-hours, or `14.87`
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

Current unique bug-output candidate rates are: browser/e2e `4,287` candidates
over `1,640.8` runner-hours (`261.27` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `15.3` runner-hours
(`13.11` per 100 runner-hours), and unit/property `1` over `11.5` runner-hours
(`8.68` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,801.7` for browser/e2e,
`4,537.5` for transport/integration, `1,042.5` for coverage-guided lower-level,
and `859.8` for unit/property.

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
| `multi-reload-lifecycle` | 2981 | 95 | 0 | 3.2% |
| `revision-persistence` | 4002 | 136 | 0 | 3.4% |
| `parser-serialization` | 2867 | 133 | 0 | 4.6% |
| `real-user-editing` | 5815 | 431 | 0 | 7.4% |
| `parser-transform` | 3778 | 367 | 0 | 9.7% |
| `common-blocks` | 3608 | 368 | 0 | 10.2% |
| `long-session-large-doc` | 2313 | 348 | 0 | 15.0% |
| `persistence-no-title` | 2779 | 450 | 0 | 16.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5668 | 1022 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 292 | 500 |
| real-user body save/reload next coverage tier | 351 | 500 |
| action ui-heading-shortcut next coverage tier | 725 | 1000 |
| action reload-post-action next coverage tier | 730 | 1000 |
| successful real-user-editing records next coverage tier | 431 | 500 |

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
`20260517T030103Z`, took `9.9` minutes. The event log shows review cycle
`20260517T023635Z` running from `2026-05-17T02:36:35Z` to
`2026-05-17T02:42:48Z`, review cycle `20260517T024253Z` running from
`2026-05-17T02:42:53Z` to `2026-05-17T02:52:06Z`, feedback action for cycle
224 running from `2026-05-17T02:52:06Z` to `2026-05-17T03:00:58Z`, review
cycle `20260517T030103Z` running from `2026-05-17T03:01:03Z` to
`2026-05-17T03:10:58Z`, and review cycle `20260517T031103Z` starting at
`2026-05-17T03:11:03Z`.

The newest copied PR-split synthesis file, `20260517T031103Z`, is empty, so the
latest non-empty synthesis remains `20260517T024253Z`. It says the split still
needs change before filing and final-stack validation remains blocked. It keeps
Cycle 222's PR6B minimal replacement at
`7b123e0ef2334a03b22e9a968d402de9da4c5379`, treats
`validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at
`243411d461698180088b5280587b2fb7ad0ba8cd` as fetch-only validation evidence,
and marks old PR6B, old PR6B+PR15C validation, raw deferred malformed-save refs,
and the old PR16 tail historical. PR17/seed `1020002` blocks final-stack
validation, focused seed rerun, broad final-stack fuzz, and filing only. The
synthesis also calls for hard-denying stale deferred rows before launch,
invalidating wrongly relaunched malformed-save and HTTP jobs, reducing
reload/post-save seed `5200005`, and replaying/reducing new seed `1060015`.

The latest feedback-action file, `20260517T024253Z`, applied that direction. It
updated `current-pr-split.md`, reaffirmed Cycle 222 minimal PR6B, patched and
restarted the deferred-work loop so downscoped malformed-save and HTTP rows stay
hard-denied, invalidated stale malformed-save and HTTP launches, and wrote fresh
Cycle 224 PR6B branch-audit and push-manifest artifacts.
`rtc-cycle224-deferred-hard-deny-reexec-and-manifest-verify-20260517T025409Z`
completed with rc `0`, while
`rtc-cycle224-reload-postsave-5200005-and-1060015-reduce-20260517T025409Z` was
still running in tmux in the copied feedback. PR17/seed `1020002` remains
separate and blocks PR17 settlement, rebuilt validation, focused seed rerun,
final-stack fuzz, and filing; no broad fuzz or final-stack fuzz was launched.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T02:53:36Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`1`, and unmet goals are down from the initial `24` to `5`. Live health is
clean on the current-output-dir duplicate/noise and startup metrics: the latest
plotted sample has `duplicateShareCurrent=0` and current summary startup
failures of `0`. The same sample has `1` quality issue, `1` warning, a true
headroom flag, and `434.4G` free memory. The copied novelty state shows `1`
current root, `1` current file, `0` raw current signatures, `0` actionable
signatures, `0` visible likely-real failures, top duplicate family share `0`,
and one warning because the fresh coverage-guided output dir has no behavioral
coverage files yet.
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
feedback-action file is empty, so the latest applied remediation remains the
`20260517T020802Z` conservative coalescing and likely-real visibility fix. The
refreshed graph supports a clean duplicate/noise startup status, but the persona
loop rejects calling the duplicate/noise problem closed until active producers,
sibling run dirs, and root readiness are gated consistently.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The newest copied synthesis file, `20260517T031103Z`, is
empty, so the latest non-empty synthesis remains `20260517T024253Z`: it adopts
Cycle 222's minimal PR6B sidecar, treats the PR6B+PR15C sidecar as fetch-only
validation evidence, and says final-stack validation, broad final-stack fuzz,
and filing remain blocked by PR17/seed `1020002`. It also says independent
deferred-queue hard-deny, reload/post-save reduction, and seed `1060015` replay
should continue. The latest applied feedback-action, `20260517T024253Z`, updated
the split status, repaired and restarted the deferred hard-deny loop, invalidated
stale malformed-save and HTTP launches, wrote fresh PR6B audit/manifest
artifacts, completed one bounded manifest/queue verification job with rc `0`,
and left the bounded reload/post-save plus seed `1060015` reducer running. No
cycle 224 broad fuzz or final-stack fuzz was launched.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the latest mix snapshots, but
unit-property and coverage-guided-lower-level lanes are active. The latest
protocol persona output says a `protocol-server` harness was implemented and
validated, and fuzz-only assertion feedback restarted affected browser loops,
but the refreshed graph still has `0` counted `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` executions. Transport-integration
has historical completed executions but no latest-bucket rate; the latest
partial execution bucket has about `432` browser/e2e test executions/hour,
`43,344` unit-property test executions/hour, `6,144`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour. The next narrow operational checks
are durable no-product startup noise suppression across
novelty/supervisor/consumers, confirmation that the fresh coverage output dir
starts producing behavioral coverage files, completion of the bounded
reload/post-save replay, PR6B minimal conflict resolution, and a decision on
seed `1020002` reclassification versus one focused browser/provider diagnostic.
