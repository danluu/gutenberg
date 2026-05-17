# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T04:08:09Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T03:54:47.240Z`,
  `lastUpdatedAt=2026-05-17T04:05:14.089Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1829` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T04:05:14Z`, coverage files grew from `272` to `39624`, a delta of
`39352`. The monitor's visible likely-real count reached `1`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean on the live signal: `duplicateShareCurrent` is `0`, and current summary
startup failures are `0`. The same monitor pass has `1` quality issue, `1`
warning, a false headroom flag, and `418.8G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest duplicate/noise synthesis, `20260517T034648Z`, says
strict no-product `pre_action_bootstrap_stall` is already suppressed before
downstream triage and analysis, but the novelty monitor still lets suppressed,
stale, or historical startup noise drive scheduling. The latest feedback-action,
`20260517T032001Z`, added a bounded no-product known-noise gate across novelty,
triage, live analysis, first-tier analysis, and deep analysis, bumped the
run-local policy to `9`, and left product-evidence failures visible; the newer
synthesis says a monitor-only scheduling/accounting fix is still required.

The newest PR-split synthesis, `20260517T035643Z`, rejects a filing-ready,
final-stack-fuzz, or wait-only interpretation. It keeps the Cycle 228 topology:
PR14B is mandatory after PR14 because seed `7110017` proved PR14 alone is
incomplete; PR15A/B/C must be reattached after PR14B; PR17/seed `1020002`,
`5200005`, and `1060015` still block rebuilt validation, focused final seed
rerun, final-stack fuzz, and filing. The `20260517T033440Z` feedback-action
applied the PR14B-required split change, wrote PR14B audit/manifest artifacts,
and launched bounded PR14B, loop-repair, and wp-env replay jobs. The collected
event log shows review cycle `20260517T035643Z` finishing at
`2026-05-17T04:04:09Z`; the next review cycle `20260517T040415Z` had started
but had no collected finish event yet.

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
`1` warning, `418.8G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`output-dir-fallback-no-active-supervisor-run-dirs`. Current triage has `1`
root, `0` files, `0` raw current signatures, `0` actionable signatures, `0`
visible likely-real failures, top duplicate family share `0`, and `0`
suppressed strict startup records across `0` identities. The state has an empty
`enabledGroups` array and a health warning that no behavioral coverage files
were found under the latest novelty output dir
`run-20260517T035431Z`. Real-user editing, real-user rich text, lifecycle, and
persistence groups remain paused or cooled for strict startup/discovery noise.
The latest duplicate/noise synthesis says the no-product gate stopped the
downstream leak, but novelty scheduling/accounting still needs to stop treating
historical or fallback startup noise as launch guidance. Product-evidence
`timeout`, `unknown`, `late_session_awareness_stall`, assertion, or
`collaboration_non_convergence` failures remain visible and are not
suppressible by family name alone.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T04:00:00Z` show heavy CPU and load
pressure. The latest 25 CPU samples range from `46.1%` to `96.5%` utilization,
with the latest sample at `96.5%`. One-minute load exceeded the logical CPU
count in `17` of those `25` sampled windows, while the latest sampled
1/5/15-minute load is `103.89`, `268.10`, and `246.15` against `64` logical
CPUs. Raw memory remains ample, but the latest monitor headroom flag is false
and all three load windows remain above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state falls back to no active supervisor
run dirs, with an empty `enabledGroups` array and no current raw/actionable
signatures.
Five groups are paused after strict pre-action discovery/startup failures:
`novelty-http-persistence-probe` and
`novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z`,
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`,
`novelty-ws-real-user-rich-text` until `2026-05-17T08:12:27Z`, and
`novelty-ws-real-user-editing` until `2026-05-17T09:22:26Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context. The current-output state now has `0` actionable signatures, top
duplicate family share `0`, `1` current root, `0` current files, `0` visible
likely-real failures, and `0` suppressed strict startup records. The newest
synthesis rejects closure because novelty scheduling still uses fallback,
stale, or historical startup-noise evidence after downstream consumers suppress
strict no-product noise. Product-evidence failures should remain visible rather
than being blanket-suppressed.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `25` browser/e2e lanes across `25` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `9` focused-shards, `6` gap-booster, and `10`
strict-expansion. The freshest novelty state has no enabled coverage-guided
groups and no active supervisor run dirs.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
lower-level activity in `unit-property` and `coverage-guided-lower-level`. The
latest level-mix persona synthesis rejects that graph interpretation as
overstated and stale: it says useful live work is closer to focused/strict
browser lanes, `0` effective gap-booster, `1` coverage-guided lower-level lane,
`1` protocol lane, and a live but low-diversity unit/property lane. It rejects
adding browser capacity and asks for accounting/materialization repair before
capacity tuning.

The lower-level persona outputs are not fully aligned. The level-mix synthesis
recommends one new parser/serialization coverage-guided lower-level lane, while
the native-harness action promoted and started the rich-text CRDT merge
coverage-guided lower-level lane first, with parser/serialization validated as
the second profile. The protocol-server action implemented and smoke-validated
the HTTP polling REST protocol harness with `fuzzLevel: "protocol-server"`
events, but the refreshed level-mix and execution counters still show
`protocol-server`, `backend-api`, and standalone `fuzz-assertion` at `0`
counted graph activity. `transport-integration` has historical executions but
no current rate in the latest bucket. Fuzz-only assertion work is active as
browser/lower-level gate hardening, not as a separate counted
`fuzz-assertion` lane in these graphs.

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

The latest collected execution data has about `3,318,338` completed test
executions: `96,923` browser/e2e, `3,006` transport/integration, `2,868,412`
unit-property, and `349,997` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `528` browser/e2e test executions/hour, `91,504`
unit-property test executions/hour, `20,040` coverage-guided-lower-level test
executions/hour, and `0` transport/integration test executions/hour.
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
`278` unique likely-real outputs over about `1,665.5` runner-hours, or `16.69`
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

Current unique bug-output candidate rates are: browser/e2e `4,348` candidates
over `1,665.5` runner-hours (`261.06` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `16.3` runner-hours
(`12.30` per 100 runner-hours), and unit/property `1` over `12.3` runner-hours
(`8.12` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,750.2` for browser/e2e,
`4,537.5` for transport/integration, `977.7` for coverage-guided lower-level,
and `836.8` for unit/property.

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
| `multi-reload-lifecycle` | 3025 | 97 | 0 | 3.2% |
| `revision-persistence` | 4057 | 138 | 0 | 3.4% |
| `parser-serialization` | 2910 | 135 | 0 | 4.6% |
| `real-user-editing` | 5885 | 435 | 0 | 7.4% |
| `parser-transform` | 3854 | 374 | 0 | 9.7% |
| `common-blocks` | 3662 | 370 | 0 | 10.1% |
| `long-session-large-doc` | 2339 | 368 | 0 | 15.7% |
| `persistence-no-title` | 2807 | 477 | 0 | 17.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5761 | 1034 | 0 | 17.9% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 296 | 500 |
| real-user body save/reload next coverage tier | 355 | 500 |
| action ui-heading-shortcut next coverage tier | 739 | 1000 |
| action reload-post-action next coverage tier | 743 | 1000 |
| successful real-user-editing records next coverage tier | 435 | 500 |

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
took roughly `5.8` to `11.2` minutes in this snapshot; the latest completed
review, `20260517T035643Z`, took `7.4` minutes. The newest event window shows
review cycle `20260517T032517Z` running from `2026-05-17T03:25:17Z` to
`2026-05-17T03:34:34Z`, review cycle `20260517T033440Z` running from
`2026-05-17T03:34:40Z` to `2026-05-17T03:41:52Z`, feedback action for cycle
228 running from `2026-05-17T03:41:52Z` to `2026-05-17T03:56:38Z`, and review
cycle `20260517T035643Z` running from `2026-05-17T03:56:43Z` to
`2026-05-17T04:04:09Z`. Review cycle `20260517T040415Z` started at
`2026-05-17T04:04:15Z`; the collected event log has no finish event for that
next review yet.

The newest PR-split synthesis, `20260517T035643Z`, says the split still needs
change before filing and final-stack validation remains blocked. It uses the
Cycle 228 topology with required PR14B after PR14, reattached PR15A/B/C after
PR14B, only the minimal PR6B sidecar, old PR6B/PR16/final wildcard heads
retired, and PR17/seed `1020002`, `5200005`, and `1060015` still as blockers
before rebuilt validation, focused seed rerun, final-stack fuzz, or filing. The
`20260517T033440Z` feedback-action applied the PR14B-required status to
`current-pr-split.md`, wrote PR14B audit/manifest artifacts, and launched
bounded `rtc-cycle228-pr14b-finalize`, `rtc-cycle228-loop-repair`, and
`rtc-cycle228-wpenv-replay` jobs. The newer synthesis adds that the PR14B job
still lacked a final nonempty `report.md`, the wp-env replay job needed real
replay/reduction evidence, and the loop-output patch needed a safe controller
restart before wait-only cycles can count as progress.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T03:48:19Z`, has `27`
suggested rows totaling `11359` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`1`, and unmet goals are down from the initial `24` to `5`. Live health is
clean on the current-output-dir duplicate/noise and startup metrics: the latest
plotted sample has `duplicateShareCurrent=0` and current summary startup
failures of `0`. The same sample has `1` quality issue, `1` warning, a false
headroom flag, and `418.8G` free memory. The copied novelty state shows `1`
current root, `0` current files, `0` raw current signatures, `0` actionable
signatures, `0` visible likely-real failures, top duplicate family share `0`,
and `0` suppressed strict startup records across `0` identities.
Historical aggregate duplicate/noise remains context; the live graph status
comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest duplicate/noise synthesis says strict no-product startup noise is no
longer leaking into downstream triage/analysis, but novelty-monitor scheduling
still uses fallback, stale, or historical startup-noise evidence. The latest
feedback-action added a bounded no-product known-noise gate across novelty,
triage, live analysis, first-tier analysis, and deep analysis, with
`runLocalNoisePolicyVersion=9`. The graph now supports clean live
duplicate/noise and startup status, but the persona loop still rejects blanket
family suppression and requires a novelty-monitor scheduling/accounting fix
before calling the loop closed.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The newest synthesis, `20260517T035643Z`, keeps PR14B
mandatory after PR14 because `7110017` proves PR14 alone is incomplete, requires
PR15A/B/C to be reattached after PR14B, retires old PR6B/PR16/final wildcard
heads, and leaves PR17/seed `1020002`, `5200005`, and `1060015` as blockers
before rebuilt validation, focused `1020002`, final-stack fuzz, or filing. The
latest feedback-action applied the PR14B-required report change, wrote local
audit and manifest artifacts, and launched bounded follow-up jobs; the newer
synthesis still says PR14B finalization, wp-env replay evidence, and loop
progress accounting are not finished.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix persona synthesis rejects trusting that graph at face value: it says
browser/gap/protocol accounting is stale and must fail closed before capacity
tuning. It recommends no more browser capacity. The native-harness synthesis
promoted rich-text CRDT merge first, while the level-mix synthesis still wants
accounting fixed before adding one parser/serialization lane. The latest
protocol action validates an HTTP polling REST protocol harness, but the
refreshed graph still has `0` counted `protocol-server`, `backend-api`, and
standalone `fuzz-assertion` executions. Transport-integration has historical
completed executions but no latest-bucket rate; the latest partial execution
bucket has about `528` browser/e2e test executions/hour,
`91,504` unit-property test executions/hour, `20,040`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour. The next narrow operational checks
are exercising the new no-product gate, repairing mix telemetry, resolving the
remaining lower-level/protocol accounting gap, settling the PR14B/`7110017`,
`5200005`, `1060015`, and PR17/`1020002` gates, and then rebuilding validation
before any final-stack fuzz or filing claim.
